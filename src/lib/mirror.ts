import type { Settings, Trader } from './types';

export const TREASURY = 10000;

export type MirrorResult =
  | { kind: 'empty'; status: string; message: string }
  | {
      kind: 'ok';
      status: string;
      example: boolean;
      exampleName?: string;
      incomplete: boolean;
      available: number;
      selectedCount: number;
      gross: number;
      net: number;
      rows: [string, number][];
      scale: number;
      max: number;
    };

/** "If your treasury held $10,000 right now" — same math as the reference's mirror(). */
export function computeMirror(P: Trader[], FOL: Map<string, number>, S: Settings): MirrorResult {
  const selected = [...FOL.keys()].map(a => P.find(w => w.a === a)).filter((w): w is Trader => !!w);
  const example = !selected.length;
  const candidates = example ? [...P].sort((a, b) => (b.at ?? -Infinity) - (a.at ?? -Infinity)) : selected;
  const available = candidates.filter(w => !w.error && Array.isArray(w.pos) && ((w.acct ?? 0) > 0 || !w.pos.length) && (!example || w.pos.length));
  const L = example ? available.slice(0, 1) : available;
  const T = TREASURY;

  if (!L.length) {
    const failed = candidates.length > 0 && candidates.every(w => w.error);
    const flat = example && candidates.some(w => !w.error && Array.isArray(w.pos));
    return {
      kind: 'empty',
      status: failed ? 'unavailable' : flat ? 'no open positions' : 'loading',
      message: failed
        ? 'Live positions are temporarily unavailable. Retrying automatically.'
        : flat
          ? 'No open positions available for a live example. Pick a whale to ride.'
          : example
            ? 'Loading a live treasury example from Hyperliquid…'
            : 'Loading positions for your selected whales…',
    };
  }

  const incomplete = !example && L.length < selected.length;
  const tot = example ? 1 : selected.reduce((s, w) => s + (FOL.get(w.a) ?? 0), 0);
  const ex: Record<string, number> = {};
  L.forEach(w =>
    w.pos!.forEach(p => {
      ex[p.c] = (ex[p.c] || 0) + ((example ? 1 : FOL.get(w.a) ?? 0) / tot) * (p.v / (w.acct as number)) * T;
    }),
  );
  let gross = Object.values(ex).reduce((s, v) => s + Math.abs(v), 0);
  const cap = S.lev * T;
  const k = gross > cap ? cap / gross : 1;
  Object.keys(ex).forEach(c => (ex[c] *= k));
  gross *= k;
  const rows = Object.entries(ex)
    .filter(([, v]) => Math.abs(v) >= 1)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const max = Math.max(...rows.map(r => Math.abs(r[1])), 1);
  const net = rows.reduce((s, r) => s + r[1], 0);
  return {
    kind: 'ok',
    status: example ? 'live example' : incomplete ? 'partial data' : 'live',
    example,
    exampleName: example ? L[0].name : undefined,
    incomplete,
    available: L.length,
    selectedCount: selected.length,
    gross,
    net,
    rows,
    scale: k,
    max,
  };
}
