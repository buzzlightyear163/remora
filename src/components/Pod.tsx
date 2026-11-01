import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { short, usd } from '../lib/format';
import type { SortKey, Trader } from '../lib/types';
import { CoinImg } from './CoinImg';

function FollowButton({ w }: { w: Trader }) {
  const s = useStore();
  const on = s.FOL.has(w.a);
  return (
    <button className={'fol ' + (on ? 'on' : '')} data-a={w.a} type="button" onClick={() => s.toggleFollow(w.a)}>
      {on ? 'Attached' : 'Attach'}
    </button>
  );
}

function FeaturedCards() {
  const s = useStore();
  return (
    <div className="feat" id="feat">
      {s.featured().map(w => (
        <div className="fc" key={w.a}>
          <FollowButton w={w} />
          <div className="tp">
            <img src={w.img} alt="" />
            <div>
              <b>{w.name}</b>
              <span>{w.x ? '𝕏 @' + w.x : 'biggest book on the board'}</span>
            </div>
          </div>
          <div className="kv">
            <div>
              Account<b>{w.acct == null ? '—' : usd(w.acct)}</b>
            </div>
            <div>
              30d PnL<b className={(w.mo ?? 0) >= 0 ? 'up' : 'dn'}>{w.mo == null ? '—' : usd(w.mo, 1)}</b>
            </div>
          </div>
          <div className="ps">
            {!w.pos ? (
              <div style={{ color: 'var(--dm)' }}>loading live positions…</div>
            ) : (
              w.pos.slice(0, 3).map(p => (
                <div key={p.c}>
                  <CoinImg coin={p.c} />
                  {p.c} <span className={p.v > 0 ? 'up' : 'dn'}>{p.v > 0 ? 'LONG' : 'SHORT'}</span>
                  <span className="s">{usd(Math.abs(p.v))}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PosCell({ w }: { w: Trader }) {
  if (w.error)
    return (
      <span className="data-error" title="Hyperliquid positions temporarily unavailable; retrying automatically">
        retrying…
      </span>
    );
  if (!w.pos) return <span className="ld">loading…</span>;
  if (!w.pos.length) return <span className="ld">flat</span>;
  return (
    <>
      {w.pos.slice(0, 5).map(p => (
        <span className="pc" key={p.c} title={`${p.c} ${p.v > 0 ? 'long' : 'short'} ${usd(Math.abs(p.v))}`}>
          <CoinImg coin={p.c} />
          <i className={p.v > 0 ? 'L' : 'S'} />
        </span>
      ))}
      {w.pos.length > 5 && <span className="more">+{w.pos.length - 5}</span>}
    </>
  );
}

function Row({ w, k }: { w: Trader; k: number }) {
  const s = useStore();
  return (
    <tr id={'w-' + w.a} className={s.FOL.has(w.a) ? 'sel' : ''}>
      <td className="n" style={{ color: 'var(--dm)' }}>
        {k + 1}
      </td>
      <td>
        <div className="who">
          <img className="av" src={w.img} alt="" />
          <div>
            <b>
              {w.name}
              {w.x && <span className="xb">𝕏 @{w.x}</span>}
            </b>
            <span>{short(w.a)}</span>
          </div>
        </div>
      </td>
      <td className="r n">{w.acct == null ? '—' : usd(w.acct)}</td>
      <td className={'r n ' + ((w.at ?? 0) >= 0 ? 'up' : 'dn')}>{w.at == null ? '—' : usd(w.at, 1)}</td>
      <td className={'r n hide-m ' + ((w.mo ?? 0) >= 0 ? 'up' : 'dn')}>{w.mo == null ? '—' : usd(w.mo, 1)}</td>
      <td>
        <div className="pos">
          <PosCell w={w} />
        </div>
      </td>
      <td className="r n hide-m">{w.pos ? usd(w.ntl) : '—'}</td>
      <td className="r">
        <FollowButton w={w} />
      </td>
    </tr>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'at', label: 'All-time PnL' },
  { key: 'mo', label: '30d PnL' },
  { key: 'ntl', label: 'Open size' },
];

function PodTable() {
  const s = useStore();
  const [addr, setAddr] = useState('');
  const add = async () => {
    if (await s.addAddress(addr)) setAddr('');
  };
  const list = s.sorted();
  return (
    <div className="panel rv" style={{ marginTop: 14, overflow: 'hidden' }}>
      <div className="podbar">
        <div className="sorts" id="sorts">
          {SORTS.map(o => (
            <button key={o.key} className={s.sort === o.key ? 'on' : ''} data-s={o.key} type="button" onClick={() => s.setSort(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="paste">
          <input
            aria-label="Hyperliquid wallet address"
            id="padd"
            placeholder="Paste any Hyperliquid address · 0x…"
            spellCheck={false}
            value={addr}
            onChange={e => setAddr(e.target.value)}
            onKeyDown={e => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === 'Enter') void add();
            }}
          />
          <button className="btn g sm" id="paddB" type="button" onClick={() => void add()}>
            Add
          </button>
        </div>
      </div>
      <div className="scrl">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Whale</th>
              <th className="r">Account</th>
              <th className="r">All-time PnL</th>
              <th className="r hide-m">30d PnL</th>
              <th>Open now</th>
              <th className="r hide-m">Open size</th>
              <th />
            </tr>
          </thead>
          <tbody id="pod-b">
            {list.length ? (
              list.map((w, k) => <Row key={w.a} w={w} k={k} />)
            ) : (
              <tr className="loading-row">
                <td colSpan={8}>
                  {s.connection.state === 'error' ? 'Hyperliquid is temporarily unavailable. Reconnecting automatically…' : 'Connecting to Hyperliquid’s live leaderboard…'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pod() {
  return (
    <section className="sec" id="pod">
      <div className="wrap">
        <div className="hd rv">
          <div>
            <span className="k">01 · the hosts</span>
            <h2>
              The whales worth
              <br />
              <em>riding.</em>
            </h2>
          </div>
          <p>Every wallet here is public on Hyperliquid's leaderboard, with positions loaded live. Attach to one, attach to five, or paste any address you trust.</p>
        </div>
        <FeaturedCards />
        <PodTable />
      </div>
    </section>
  );
}
