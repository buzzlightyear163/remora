export type Position = {
  /** coin / market, e.g. ETH */
  c: string;
  /** signed notional in USD (negative = short) */
  v: number;
  lev?: number | null;
  pnl?: number;
};

export type Trader = {
  /** address (lowercase) */
  a: string;
  /** Hyperliquid display name */
  n: string | null;
  /** account value */
  acct: number | null;
  /** all-time PnL */
  at: number | null;
  /** 30d PnL */
  mo: number | null;
  i: number;
  name: string;
  /** X handle for publicly known wallets */
  x: string | null;
  img: string;
  pos: Position[] | null;
  ntl: number;
  error: boolean;
};

export type LeaderboardRow = { a: string; n: string | null; acct: number; at: number; mo: number };

export type Leaderboard = {
  traders: LeaderboardRow[];
  updatedAt: string;
  totalTraders: number;
  /** true when served from the bundled snapshot in public/api */
  snapshot?: boolean;
};

export type SortKey = 'at' | 'mo' | 'ntl';

export type Settings = { lev: number; fee: number; dd: number };

export type Connection = { state: 'connecting' | 'live' | 'snapshot' | 'error'; count: number; updatedAt: string | null };
