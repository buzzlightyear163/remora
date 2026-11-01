import { useStore } from '../hooks/useStore';
import { SEGMENTS } from '../data/site';
import { short, usd } from '../lib/format';
import { computeMirror } from '../lib/mirror';
import type { Settings } from '../lib/types';
import { CoinImg } from './CoinImg';

function MirrorPreview() {
  const s = useStore();
  const m = computeMirror(s.P, s.FOL, s.settings);
  return (
    <div className="panel prev">
      <h3>
        If your treasury held $10,000 right now <span id="pvS">{m.status}</span>
      </h3>
      <div id="pv" aria-live="polite" aria-atomic="true">
        {m.kind === 'empty' ? (
          <div className="empty">
            {m.message}
            <br />
            <a className="btn ghost" href="#pod">
              Pick your whales
            </a>
          </div>
        ) : (
          <>
            {m.example ? (
              <p className="preview-note">
                Live example based on {m.exampleName}. No whales selected. <a href="#pod">Pick your whales</a> to customize.
              </p>
            ) : m.incomplete ? (
              <p className="preview-note">
                Positions available for {m.available} of {m.selectedCount} selected whales. Missing allocations are not included; retrying automatically.
              </p>
            ) : null}
            {!m.rows.length && <p className="preview-note">Your selected whales have no net open exposure. The simulated treasury holds cash.</p>}
            <div className="sum">
              <div>
                Gross exposure<b>{usd(m.gross)}</b>
              </div>
              <div>
                Leverage<b>{(m.gross / 10000).toFixed(2)}x</b>
              </div>
              <div>
                Net
                <b className={m.net >= 0 ? 'up' : 'dn'}>
                  {m.net >= 0 ? 'long ' : 'short '}
                  {usd(Math.abs(m.net))}
                </b>
              </div>
              <div>
                Markets<b>{m.rows.length}</b>
              </div>
            </div>
            <div className="ex">
              {m.rows.slice(0, 12).map(([c, v]) => (
                <div className="exr" key={c}>
                  <span className="c">
                    <CoinImg coin={c} />
                    {c}
                  </span>
                  <span className="bar2">
                    <i className={v > 0 ? 'L' : 'S'} style={{ width: (Math.abs(v) / m.max) * 50 + '%' }} />
                  </span>
                  <span className={'n ' + (v > 0 ? 'up' : 'dn')} style={{ textAlign: 'right' }}>
                    {v > 0 ? 'L ' : 'S '}
                    {usd(Math.abs(v))}
                  </span>
                </div>
              ))}
            </div>
            {m.rows.length > 12 && <p className="preview-small">+{m.rows.length - 12} smaller positions</p>}
            {m.scale < 1 && (
              <p className="preview-small cap">
                Scaled down {Math.round((1 - m.scale) * 100)}% to stay under your {s.settings.lev}x cap.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Seg({ k }: { k: keyof Settings }) {
  const s = useStore();
  return (
    <div className="seg" data-g={k}>
      {SEGMENTS[k].map(o => (
        <button key={o.v} className={s.settings[k] === o.v ? 'on' : ''} type="button" data-v={o.v} onClick={() => s.setSetting(k, o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Following() {
  const s = useStore();
  const L = s.followed();
  if (!L.length)
    return (
      <div className="fw" id="fw">
        <div className="empty" style={{ margin: 0, padding: 22 }}>
          Hit <b style={{ color: 'var(--m)' }}>Attach</b> on a whale in the list.
        </div>
      </div>
    );
  const tot = L.reduce((sum, w) => sum + (s.FOL.get(w.a) ?? 0), 0);
  return (
    <div className="fw" id="fw">
      {L.map(w => (
        <div className="fwr" key={w.a}>
          <img src={w.img} alt="" />
          <div className="nm">
            {w.name}
            <small>{short(w.a)}</small>
          </div>
          <b>{Math.round(((s.FOL.get(w.a) ?? 0) / tot) * 100)}%</b>
          <button className="x" type="button" aria-label={'Let go of ' + w.name} onClick={() => s.unfollow(w.a)}>
            ✕
          </button>
          <input type="range" min={5} max={100} value={s.FOL.get(w.a) ?? 50} aria-label="weight" onChange={e => s.setWeight(w.a, +e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function MirrorBuilder() {
  const s = useStore();
  const n = s.FOL.size;
  return (
    <div className="panel bld">
      <div className="launch-notice">
        <span className="launch-badge">Devnet deployment available</span>
        <p>Configure your coin, review the cost, and deploy a real test token with your Solana wallet.</p>
      </div>
      <h3>
        Remora settings <span id="bS">{n + ' whale' + (n === 1 ? '' : 's')}</span>
      </h3>
      <div className="lab">
        Riding <span>drag to split</span>
      </div>
      <Following />
      <div className="lab">Leverage cap</div>
      <Seg k="lev" />
      <div className="lab">
        Fees sent to the treasury <span>pump.fun fees → USDC on Hyperliquid</span>
      </div>
      <Seg k="fee" />
      <div className="lab">
        Let go of a whale after <span>their drawdown</span>
      </div>
      <Seg k="dd" />
      <div className="lab">Profit</div>
      <div className="split">
        <i style={{ width: '82%', background: 'var(--m)', color: '#031426' }}>99% buys back your coin</i>
        <i style={{ width: '18%', background: '#17305A', color: 'var(--tx)' }}>1% $REMORA</i>
      </div>
      <div className="lab">Your coin</div>
      <div className="row2">
        <input className="in" aria-label="Coin name" id="fName" placeholder="Name" maxLength={32} value={s.coin.name} onChange={e => s.setCoin({ name: e.target.value })} />
        <input
          className="in mono"
          aria-label="Coin ticker"
          id="fTk"
          placeholder="TICKER"
          maxLength={10}
          style={{ textTransform: 'uppercase' }}
          value={s.coin.ticker}
          onChange={e => s.setCoin({ ticker: e.target.value })}
        />
      </div>
      <button className="btn m go" id="launchB" type="button" onClick={() => s.requestLaunch()}>
        Launch
      </button>
    </div>
  );
}

export function Mirror() {
  return (
    <section className="sec" id="mirror" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="hd rv">
          <div>
            <span className="k">02 · your remora</span>
            <h2>
              Build the coin
              <br />
              that <em>holds on.</em>
            </h2>
          </div>
          <p>
            Pick the whales, set how hard your coin holds on, and try the launch with a fixed-supply test token on Solana devnet. Test tokens do not activate a
            live trading treasury.
          </p>
        </div>
        <div className="mir">
          <MirrorPreview />
          <MirrorBuilder />
        </div>
      </div>
    </section>
  );
}
