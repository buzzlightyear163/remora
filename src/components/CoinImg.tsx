import { useState } from 'react';
import { coinFallbacks } from '../lib/avatar';

/** Coin icon with the reference's fallback behaviour (proxy → Hyperliquid CDN → letter mark). */
export function CoinImg({ coin }: { coin: string }) {
  const [step, setStep] = useState(0);
  const srcs = coinFallbacks(coin);
  return <img src={srcs[Math.min(step, srcs.length - 1)]} alt="" loading="lazy" onError={() => setStep(s => (s < srcs.length - 1 ? s + 1 : s))} />;
}
