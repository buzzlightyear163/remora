// All copy and constants for the page live here, so a rebrand only touches this file (+ images).

export const BRAND = {
  name: 'Remora',
  ticker: '$REMORA',
  /** Paste the pump.fun CA here at launch. While empty, the CA pills are hidden. */
  ca: '',
  xHandle: 'RemoraOnHL',
  xUrl: 'https://x.com/RemoraOnHL',
  logo: '/images/remora-logo.svg',
};

/** pump.fun page for the coin (only shown once BRAND.ca is filled in). */
export const pumpFunUrl = (ca: string) => 'https://pump.fun/coin/' + encodeURIComponent(ca);

export const NAV_LINKS = [
  { href: '#pod', label: 'The hosts' },
  { href: '#mirror', label: 'Your remora' },
  { href: '#how', label: 'How it works' },
];

/** Wallets with a known public identity: real name + X handle (the reference shows X pictures for these). */
export const PUBLIC_PROFILES: Record<string, { name: string; x: string }> = {
  '0x020ca66c30bec2c4fe3861a94e4db4a498a35872': { name: 'Machi Big Brother', x: 'machibigbrother' },
  '0x880ac484a1743862989a441d6d867238c7aa311c': { name: 'Silk', x: 'SilkBtc' },
};

export const HOW_STEPS = [
  { title: 'Your coin trades', text: 'Your coin lives on pump.fun. Every buy and sell drops a creator fee into its treasury.' },
  { title: 'It latches on', text: "The SOL fees are bridged to USDC on Hyperliquid, into your coin's own trading account." },
  {
    title: 'The whale moves',
    text: 'When a whale you ride opens, adds or closes, your treasury moves with it, sized to your split and your leverage cap.',
  },
  { title: 'You feed on the wins', text: 'Closed profit is bridged back to Solana. 99% buys your coin on pump.fun, 1% buys $REMORA.' },
];

export const SEGMENTS = {
  lev: [
    { v: 1, label: '1x' },
    { v: 2, label: '2x' },
    { v: 3, label: '3x' },
    { v: 5, label: '5x' },
    { v: 10, label: '10x' },
  ],
  fee: [
    { v: 50, label: '50%' },
    { v: 80, label: '80%' },
    { v: 100, label: '100%' },
  ],
  dd: [
    { v: 20, label: '-20%' },
    { v: 35, label: '-35%' },
    { v: 50, label: '-50%' },
    { v: 0, label: 'Never' },
  ],
} as const;

export const LAUNCH_STAGES = [
  { label: 'Identity', title: 'Make it yours.', description: 'Give your coin a name and a ticker people can recognize.' },
  {
    label: 'Your whales',
    title: 'Pick who you ride.',
    description: 'Set the relative whale weights for your copy simulation. Deploying a token does not activate live trading.',
  },
  { label: 'Risk', title: 'Set your guardrails.', description: 'Tune the copy simulation. These risk settings are not enforced by the token contract.' },
  { label: 'Review', title: 'Review your launch.', description: 'Check your token details and simulation settings before connecting your devnet wallet.' },
  {
    label: 'Deploy',
    title: 'Make it on-chain.',
    description: 'Create a fixed-supply Token-2022 token on Solana devnet. Test tokens have no real monetary value.',
  },
];

export const DISCLAIMER =
  "Wallets, PnL and positions come from Hyperliquid's public leaderboard and API. Names are the traders' own Hyperliquid display names. $REMORA is a pump.fun coin on Solana. Remora isn't affiliated with pump.fun, Hyperliquid or any trader listed. Riding perp traders is extremely risky: whales get liquidated too, and leverage cuts both ways. Nothing here is financial advice.";
