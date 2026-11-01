import { DISCLAIMER, HOW_STEPS } from '../data/site';
import { useStore } from '../hooks/useStore';
import { CaButton } from './CaButton';
import { Logo } from './Logo';

export function HowItWorks() {
  return (
    <section className="sec" id="how" style={{ paddingTop: 60 }}>
      <div className="wrap">
        <div className="hd rv">
          <div>
            <span className="k">03 · how it works</span>
            <h2>
              Latch on. Ride along.
              <br />
              <em>Feed</em> on the wins.
            </h2>
          </div>
        </div>
        <div className="how rv">
          {HOW_STEPS.map((st, i) => (
            <div className="st" key={st.title}>
              <div className="d">{i + 1}</div>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EndCta() {
  return (
    <section className="end">
      <div className="wrap">
        <h2>
          Never swim
          <br />
          <em>alone.</em>
        </h2>
        <p>Pick the whales, launch the coin, and let its fees ride along.</p>
        <a className="btn m" href="#pod">
          Pick your whales
        </a>
        <br />
        <CaButton />
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <Logo />
        <div>{DISCLAIMER}</div>
      </div>
    </footer>
  );
}

export function Toast() {
  const s = useStore();
  return (
    <div className={'toast' + (s.toastOn ? ' on' : '')} id="toast" role="status" aria-live="polite">
      {s.toastMsg}
    </div>
  );
}

export function ConnectionStatus() {
  const s = useStore();
  const c = s.connection;
  const time = c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="connection-status mono" role="status" aria-live="polite">
      <span className={'connection-dot' + (c.state === 'error' ? ' error' : c.state === 'snapshot' ? ' demo' : '')} />
      {c.state === 'error'
        ? 'Hyperliquid connection interrupted'
        : c.state === 'live'
          ? `Hyperliquid live · ${c.count} traders · updated ${time}`
          : c.state === 'snapshot'
            ? `Hyperliquid snapshot · ${c.count} traders · offline demo data from ${time}`
            : 'Connecting to Hyperliquid…'}
      {(c.state === 'error' || c.state === 'snapshot') && (
        <button type="button" onClick={s.retry}>
          Retry
        </button>
      )}
    </div>
  );
}
