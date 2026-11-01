/** Tide-colored generated avatar for wallets without a public profile picture (same recipe as the reference). */
export const avatar = (a: string): string => {
  const h = parseInt(a.slice(2, 8), 16) % 360;
  const h2 = (h + 50) % 360;
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},55%,38%)"/><stop offset="1" stop-color="hsl(${h2},60%,18%)"/></linearGradient></defs><rect width="40" height="40" fill="url(#g)"/><path d="M8 ${22 + (h % 6)}q8-6 16 0t16 0" fill="none" stroke="#8FD0FF" stroke-opacity=".7" stroke-width="2.4"/><text x="20" y="17" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#E6EEF8">${a
        .slice(2, 4)
        .toUpperCase()}</text></svg>`,
    )
  );
};

/** Coin icon via the local /api/hyperliquid/icon proxy (Vite middleware). k-prefixed markets (kPEPE) map to the base coin. */
export const coinIcon = (c: string): string => '/api/hyperliquid/icon?coin=' + encodeURIComponent(c.replace(/^k(?=[A-Z])/, ''));

/** Fallback chain used by <CoinImg>: proxy → Hyperliquid CDN → generated letter mark. */
export const coinFallbacks = (c: string): string[] => {
  const base = c.replace(/^k(?=[A-Z])/, '');
  return [
    coinIcon(c),
    `https://app.hyperliquid.xyz/coins/${encodeURIComponent(base)}.svg`,
    'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#16294a"/><text x="16" y="20.5" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#8FD0FF">${base
          .slice(0, 3)
          .replace(/[^A-Za-z0-9]/g, '')}</text></svg>`,
      ),
  ];
};
