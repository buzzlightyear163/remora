import type { Leaderboard, LeaderboardRow, Position } from './types';

/**
 * Data sources, in order:
 *  1. /api/hyperliquid/*      – local Vite middleware (server/hyperliquidApi.ts) proxying public Hyperliquid endpoints
 *  2. api.hyperliquid.xyz     – direct browser call (CORS-enabled) for positions, used when the middleware is absent (static hosting)
 *  3. /api/*.json snapshots   – bundled fixtures so the UI still demonstrates every state offline
 */

const INFO_URL = 'https://api.hyperliquid.xyz/info';

async function json<T>(input: string, init?: RequestInit & { timeout?: number }): Promise<T> {
  const r = await fetch(input, { ...init, signal: AbortSignal.timeout(init?.timeout ?? 18000) });
  const type = r.headers.get('content-type') || '';
  if (!type.includes('json')) throw new Error('Unexpected response');
  const body = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(body?.error || 'Hyperliquid is temporarily unavailable');
  return body;
}

type Snapshot = { updatedAt: string; totalTraders: number; rows: [string, string | null, number, number, number][] };

export async function fetchLeaderboard(): Promise<Leaderboard> {
  try {
    return await json<Leaderboard>('/api/hyperliquid/leaderboard', { timeout: 50000 });
  } catch {
    // TODO(backend): deploy server/hyperliquidApi.ts (or an equivalent serverless route) for a live leaderboard in production.
    const s = await json<Snapshot>('/api/leaderboard.json');
    const traders: LeaderboardRow[] = s.rows.map(([a, n, acct, at, mo]) => ({ a, n, acct, at, mo }));
    return { traders, updatedAt: s.updatedAt, totalTraders: s.totalTraders, snapshot: true };
  }
}

export type WalletState = { acct: number | null; pos: Position[]; snapshot?: boolean };

type ClearinghouseState = {
  marginSummary: { accountValue: string };
  assetPositions?: { position: { coin: string; szi: string; positionValue: string; unrealizedPnl: string; leverage?: { value: number } } }[];
};

const parse = (s: ClearinghouseState): WalletState => ({
  acct: +s.marginSummary.accountValue,
  pos: (s.assetPositions || [])
    .map(x => x.position)
    .filter(p => +p.szi !== 0)
    .map(p => ({ c: p.coin, v: +p.positionValue * Math.sign(+p.szi), lev: p.leverage?.value, pnl: +p.unrealizedPnl }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)),
});

type PositionsSnapshot = { wallets: Record<string, { acct: number; pos: [string, number, number | null, number][] }> };
let snapshotPromise: Promise<PositionsSnapshot> | null = null;
let middlewareDown = false;
let directDown = false;

export async function fetchPositions(address: string): Promise<WalletState> {
  if (!middlewareDown) {
    try {
      return parse(await json<ClearinghouseState>('/api/hyperliquid/positions?address=' + encodeURIComponent(address)));
    } catch (e) {
      if ((e as Error).message === 'Unexpected response') middlewareDown = true;
    }
  }
  if (!directDown) {
    try {
      return parse(
        await json<ClearinghouseState>(INFO_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'clearinghouseState', user: address }),
          timeout: 6000,
        }),
      );
    } catch (e) {
      // network/CORS failure or a hanging connection → stop trying direct calls for this session
      if (['TypeError', 'TimeoutError', 'AbortError'].includes((e as Error).name)) directDown = true;
    }
  }
  snapshotPromise ??= json<PositionsSnapshot>('/api/positions.json').catch(e => {
    snapshotPromise = null;
    throw e;
  });
  const snap = await snapshotPromise;
  const w = snap.wallets[address];
  if (!w) {
    // Hyperliquid reachable but this wallet failed → surface the error state ("retrying…") like the reference.
    if (!directDown) throw new Error('Positions unavailable');
    return { acct: null, pos: [], snapshot: true };
  }
  return { acct: w.acct, pos: w.pos.map(([c, v, lev, pnl]) => ({ c, v, lev, pnl })), snapshot: true };
}
