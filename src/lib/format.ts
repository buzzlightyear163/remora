/** $ formatting used everywhere on the reference: $2.13B, $248.3M, $40.6k, $868 (optional +/- sign). */
export const usd = (v: number, sign?: boolean | number): string => {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : sign ? '+' : '';
  return (
    s +
    '$' +
    (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : a.toFixed(0))
  );
};

/** 0x393d…2109 */
export const short = (a: string): string => a.slice(0, 6) + '…' + a.slice(-4);

export const isAddress = (a: string): boolean => /^0x[0-9a-f]{40}$/.test(a);
