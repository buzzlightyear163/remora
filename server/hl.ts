/**
 * Hyperliquid proxy, shared by the Vite dev/preview middleware (server/hyperliquidApi.ts)
 * and the Vercel Functions in api/hyperliquid/*.ts.
 *
 *   GET /api/hyperliquid/leaderboard          top 100 traders by all-time PnL + public profiles
 *   GET /api/hyperliquid/positions?address=…   clearinghouseState for one wallet
 *   GET /api/hyperliquid/icon?coin=…           coin icon proxy (svg)
 *
 * Only public, read-only Hyperliquid endpoints are used. No keys.
 * Responses carry CDN cache headers, so on Vercel the heavy leaderboard build runs about once a minute at most.
 */

const STATS_URL = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard';
const INFO_URL = 'https://api.hyperliquid.xyz/info';
const ICON_URL = (coin: string) => `https://app.hyperliquid.xyz/coins/${encodeURIComponent(coin)}.svg`;
const PUBLIC_PROFILES = ['0x020ca66c30bec2c4fe3861a94e4db4a498a35872', '0x880ac484a1743862989a441d6d867238c7aa311c'];
const TOP = 100;
const LEADERBOARD_TTL = 60_000;

type Trader = { a: string; n: string | null; acct: number; at: number; mo: number };
type Row = {
  ethAddress: string;
  accountValue: string;
  displayName: string | null;
  windowPerformances: [string, { pnl: string }][];
};

// warm-instance caches (dev server, or a reused serverless instance)
let cache: { at: number; body: string } | null = null;
let inflight: Promise<string> | null = null;
const iconCache = new Map<string, { type: string; body: ArrayBuffer }>();

async function buildLeaderboard(): Promise<string> {
  const r = await fetch(STATS_URL, { signal: AbortSignal.timeout(45_000) });
  if (!r.ok) throw new Error('Hyperliquid leaderboard unavailable');
  const data = (await r.json()) as { leaderboardRows: Row[] };
  const rows = data.leaderboardRows;
  const perf = (row: Row, key: string) => +(row.windowPerformances.find(([k]) => k === key)?.[1].pnl ?? 0);
  const toTrader = (row: Row): Trader => ({
    a: row.ethAddress.toLowerCase(),
    acct: +row.accountValue,
    at: perf(row, 'allTime'),
    mo: perf(row, 'month'),
    n: row.displayName,
  });
  const sorted = rows.map(toTrader).sort((a, b) => b.at - a.at);
  const traders = sorted.slice(0, TOP);
  for (const address of PUBLIC_PROFILES) {
    if (!traders.some(t => t.a === address)) {
      const found = sorted.find(t => t.a === address);
      if (found) traders.push(found);
    }
  }
  return JSON.stringify({ traders, updatedAt: new Date().toISOString(), totalTraders: rows.length });
}

/** browser max-age + CDN s-maxage (+ stale-while-revalidate so visitors never wait on a rebuild) */
const cached = (browser: number, cdn: number, swr: number) => `public, max-age=${browser}, s-maxage=${cdn}, stale-while-revalidate=${swr}`;

const json = (status: number, body: string, cacheControl = 'no-store') =>
  new Response(body, { status, headers: { 'content-type': 'application/json', 'cache-control': cacheControl } });

const fallbackIcon = (coin: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#16294a"/><text x="16" y="20.5" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#8FD0FF">${coin
    .slice(0, 3)
    .replace(/[^A-Za-z0-9]/g, '')}</text></svg>`;

export async function handleHyperliquid(request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/hyperliquid/leaderboard') {
      if (!cache || Date.now() - cache.at >= LEADERBOARD_TTL) {
        inflight ??= buildLeaderboard().finally(() => (inflight = null));
        cache = { at: Date.now(), body: await inflight };
      }
      return json(200, cache.body, cached(30, 60, 600));
    }

    if (url.pathname === '/api/hyperliquid/positions') {
      const address = (url.searchParams.get('address') || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(address)) return json(400, JSON.stringify({ error: 'A valid Hyperliquid address is required' }));
      const r = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'clearinghouseState', user: address }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error('Positions unavailable');
      return json(200, await r.text(), cached(10, 15, 60));
    }

    if (url.pathname === '/api/hyperliquid/icon') {
      const coin = (url.searchParams.get('coin') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
      if (!coin) return new Response('coin required', { status: 400 });
      let hit = iconCache.get(coin);
      if (!hit) {
        try {
          const r = await fetch(ICON_URL(coin), { signal: AbortSignal.timeout(8_000) });
          if (!r.ok) throw new Error(String(r.status));
          hit = { type: r.headers.get('content-type') || 'image/svg+xml', body: await r.arrayBuffer() };
          iconCache.set(coin, hit);
        } catch {
          return new Response(fallbackIcon(coin), { headers: { 'content-type': 'image/svg+xml', 'cache-control': cached(600, 3600, 86400) } });
        }
      }
      return new Response(hit.body, { headers: { 'content-type': hit.type, 'cache-control': cached(86400, 604800, 604800) } });
    }

    return json(404, JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    return json(503, JSON.stringify({ error: (error as Error).message || 'Hyperliquid is temporarily unavailable' }));
  }
}
