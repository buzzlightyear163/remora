import { useStore } from '../hooks/useStore';
import { usd } from '../lib/format';
import { CaButton } from './CaButton';
import { SeaCanvas } from './SeaCanvas';

function Tape() {
  const { tape } = useStore().stats();
  // rendered twice so the 80s translate(-50%) loop is seamless
  const items = (copy: string) =>
    tape.map(w => {
      const p = w.pos![0];
      return (
        <span key={copy + w.a} aria-hidden={copy === 'b' || undefined}>
          <img src={w.img} alt="" />
          <b>{w.name}</b> <span className={p.v > 0 ? 'L' : 'S'}>{p.v > 0 ? 'LONG' : 'SHORT'}</span> {p.c} {usd(Math.abs(p.v))}
        </span>
      );
    });
  return (
    <div className="tape">
      <div className="tr" id="tape">
        {items('a')}
        {items('b')}
      </div>
    </div>
  );
}

function HeroStats() {
  const s = useStore().stats();
  return (
    <div className="hs">
      <div>
        Whales tracked<b id="h1n">{s.count || '—'}</b>
      </div>
      <div>
        Open right now<b id="h2n">{s.open}</b>
      </div>
      <div>
        Biggest position<b id="h3n">{s.biggest}</b>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <header id="hero">
      <SeaCanvas />
      <div className="vg" />
      <div className="hc">
        <div className="wrap">
          <span className="eyebrow">
            <i />
            ON PUMP.FUN · LIVE FROM HYPERLIQUID
          </span>
          <h1>
            Your coin rides
            <br />
            with the <em>whales.</em>
          </h1>
          <p className="sub">
            A pump.fun coin that latches onto the biggest traders on Hyperliquid. Its creator fees open what they open and close what they close. When they
            win, your coin gets bought back.
          </p>
          <div className="cta">
            <a className="btn m" href="#pod">
              Pick your whales
            </a>
            <a className="btn g" href="#how">
              How it works
            </a>
          </div>
          <CaButton />
          <HeroStats />
        </div>
      </div>
      <Tape />
    </header>
  );
}
