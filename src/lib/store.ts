import { avatar } from './avatar';
import { short, usd } from './format';
import { fetchLeaderboard, fetchPositions } from './hyperliquid';
import type { Connection, Leaderboard, Position, Settings, SortKey, Trader } from './types';
import { PUBLIC_PROFILES } from '../data/site';

type Listener = () => void;

/**
 * Single source of truth for the page (port of the reference's hyperpad runtime):
 * traders (P), followed whales + weights (FOL), sort, mirror settings and toast.
 * Components subscribe through useStore() and re-render on `version` bumps.
 */
export class RemoraStore {
  P: Trader[] = [];
  FOL = new Map<string, number>();
  sort: SortKey = 'at';
  settings: Settings = { lev: 3, fee: 80, dd: 35 };
  coin = { name: '', ticker: '' };
  connection: Connection = { state: 'connecting', count: 0, updatedAt: null };
  toastMsg = '';
  toastOn = false;
  version = 0;

  private listeners = new Set<Listener>();
  private raf = 0;
  private toastTimer = 0;
  private refreshing = false;
  private timers: number[] = [];
  private started = false;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;

  /** batch many small updates (101 wallets loading) into one render per frame */
  bump = () => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.version++;
      this.listeners.forEach(l => l());
    });
  };

  /** synchronous notify for user input (controlled inputs must update in the same tick) */
  emit = () => {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.version++;
    this.listeners.forEach(l => l());
  };

  toast = (m: string) => {
    this.toastMsg = m;
    this.toastOn = true;
    this.bump();
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastOn = false;
      this.bump();
    }, 2400);
  };

  find = (a: string) => this.P.find(w => w.a === a);

  /* ---------- follow / weights ---------- */
  toggleFollow = (a: string) => {
    if (this.FOL.has(a)) this.FOL.delete(a);
    else {
      this.FOL.set(a, 50);
      this.toast('Attached to ' + (this.find(a)?.name ?? short(a)));
    }
    this.emit();
  };
  setWeight = (a: string, v: number) => {
    this.FOL.set(a, v);
    this.emit();
  };
  unfollow = (a: string) => {
    this.FOL.delete(a);
    this.emit();
  };
  setSort = (s: SortKey) => {
    this.sort = s;
    this.emit();
  };
  setSetting = (k: keyof Settings, v: number) => {
    this.settings = { ...this.settings, [k]: v };
    this.emit();
  };
  setCoin = (patch: Partial<{ name: string; ticker: string }>) => {
    this.coin = { ...this.coin, ...patch };
    this.emit();
  };

  /* ---------- launch dialog bridge ---------- */
  launchNonce = 0;
  requestLaunch = () => {
    if (!this.FOL.size) {
      this.toast('Pick at least one whale for your launch setup');
      location.hash = '#pod';
      return;
    }
    this.launchNonce++;
    this.emit();
  };

  addAddress = async (raw: string): Promise<boolean> => {
    const a = raw.trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(a)) {
      this.toast("That isn't a Hyperliquid address");
      return false;
    }
    let w = this.find(a);
    if (!w) {
      w = { a, n: '', x: null, at: null, mo: null, i: this.P.length, name: 'Custom ' + short(a), img: avatar(a), pos: null, acct: null, ntl: 0, error: false };
      this.P.unshift(w);
      this.bump();
      await this.load(w);
    }
    this.FOL.set(a, 50);
    this.bump();
    this.toast('Added and attached to ' + short(a));
    return true;
  };

  /* ---------- derived ---------- */
  sorted = (): Trader[] => {
    const k = this.sort;
    return [...this.P].sort((a, b) => ((b[k] as number | null) ?? -1e18) - ((a[k] as number | null) ?? -1e18));
  };

  featured = (): Trader[] => {
    const named = this.P.filter(w => w.x);
    const biggest = [...this.P].filter(w => !w.x).sort((a, b) => b.ntl - a.ntl || (b.acct ?? 0) - (a.acct ?? 0));
    return [...named, ...biggest].slice(0, 3);
  };

  followed = (): Trader[] => [...this.FOL.keys()].map(a => this.find(a)).filter((w): w is Trader => !!w);

  stats = () => {
    const live = this.P.filter(w => w.pos && w.pos.length);
    let big: { w: Trader; p: Position } | null = null;
    live.forEach(w => w.pos!.forEach(p => { if (!big || Math.abs(p.v) > Math.abs(big.p.v)) big = { w, p }; }));
    const b = big as { w: Trader; p: Position } | null;
    return {
      count: this.P.length,
      open: this.P.some(w => w.pos) ? usd(live.reduce((s, w) => s + w.ntl, 0)) : '—',
      biggest: b ? `${usd(Math.abs(b.p.v))} ${b.p.c} ${b.p.v > 0 ? 'long' : 'short'}` : '—',
      tape: live.slice(0, 24),
    };
  };

  /* ---------- live data ---------- */
  private async load(target: Trader) {
    let w = target;
    try {
      const s = await fetchPositions(target.a);
      // the leaderboard may have been re-applied while we were waiting: write into the live object
      w = this.find(target.a) ?? target;
      if (s.acct != null) w.acct = s.acct;
      w.pos = s.pos;
      w.ntl = w.pos.reduce((sum, p) => sum + Math.abs(p.v), 0);
      w.error = false;
    } catch {
      w = this.find(target.a) ?? target;
      w.error = true;
    }
    this.bump();
  }

  private async loadAll() {
    const q = [...this.P].sort((a, b) => Number(!!b.x) - Number(!!a.x));
    await Promise.all(
      [0, 1, 2, 3].map(async () => {
        while (q.length) await this.load(q.shift()!);
      }),
    );
    this.bump();
  }

  refreshPositions = async () => {
    if (this.refreshing || document.hidden) return;
    this.refreshing = true;
    try {
      await this.loadAll();
    } finally {
      this.refreshing = false;
    }
  };

  private applyLeaderboard(data: Leaderboard) {
    if (!data?.traders?.length) return;
    const old = new Map(this.P.map(w => [w.a, w]));
    const next: Trader[] = data.traders.map((w, i) => {
      const prev = old.get(w.a);
      const profile = PUBLIC_PROFILES[w.a];
      return {
        ...w,
        i,
        name: profile?.name || w.n || 'Whale ' + short(w.a),
        x: profile?.x || null,
        img: avatar(w.a),
        pos: prev?.pos || null,
        error: prev?.error || false,
        ntl: prev?.ntl || 0,
      };
    });
    for (const w of this.P) if (this.FOL.has(w.a) && !next.some(n => n.a === w.a)) next.push(w);
    this.P.splice(0, this.P.length, ...next);
    this.connection = { state: data.snapshot ? 'snapshot' : 'live', count: data.traders.length, updatedAt: data.updatedAt };
    this.bump();
    void this.refreshPositions();
  }

  private async pollLeaderboard() {
    try {
      this.applyLeaderboard(await fetchLeaderboard());
      this.timers.push(window.setTimeout(() => this.pollLeaderboard(), 60000));
    } catch {
      if (!this.P.length) this.connection = { ...this.connection, state: 'error' };
      this.bump();
      this.timers.push(window.setTimeout(() => this.pollLeaderboard(), 30000));
    }
  }

  retry = () => {
    this.connection = { ...this.connection, state: 'connecting' };
    this.bump();
    void this.pollLeaderboard();
  };

  start() {
    if (this.started) return;
    this.started = true;
    void this.pollLeaderboard();
    this.timers.push(window.setInterval(() => void this.refreshPositions(), 30000));
  }

  stop() {
    this.timers.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    this.timers = [];
    this.started = false;
  }
}

export const store = new RemoraStore();

if (import.meta.env.DEV) (window as unknown as { __remora: RemoraStore }).__remora = store;
