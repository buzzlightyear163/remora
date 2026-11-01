import { useEffect, useRef, useState } from 'react';
import { LAUNCH_STAGES, SEGMENTS } from '../data/site';
import { useStore } from '../hooks/useStore';
import { short } from '../lib/format';
import { solana, type Quote } from '../lib/solana';
import { store } from '../lib/store';

type Draft = { name: string; ticker: string; supply: number; lev: number; fee: number; dd: number; whales: { address: string; weight: number }[] };
type Deployment = { owner: string | null; quote: Quote | null; signature: string | null; confirmed: boolean; failure: string | null; busy: boolean; message: string };

const sol = (lamports: number) => (lamports / 1e9).toFixed(6);
const explorer = (kind: 'tx' | 'address', value: string) => `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}?cluster=devnet`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Five-step launch setup (Identity → Your pod → Risk → Review → Deploy) in a native <dialog>, ported from the reference. */
export function LaunchDialog() {
  const s = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [, setTick] = useState(0);
  const render = () => setTick(t => t + 1);

  const step = useRef(0);
  const draft = useRef<Draft | null>(null);
  const d = useRef<Deployment>({ owner: null, quote: null, signature: null, confirmed: false, failure: null, busy: false, message: '' });
  const [status, setStatus] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [wallets, setWallets] = useState<string[] | null>(null);
  const lastNonce = useRef(s.launchNonce);

  const pod = () => {
    const D = draft.current!;
    const total = D.whales.reduce((sum, w) => sum + w.weight, 0);
    return D.whales.map(w => ({ ...w, name: store.find(w.address)?.name || short(w.address), percent: ((w.weight / total) * 100).toFixed(1) }));
  };

  const goTo = (n: number, focusTitle = true) => {
    step.current = n;
    setStatus('');
    setConfirmed(false);
    setConsent(false);
    if (dialog.current) dialog.current.scrollTop = 0;
    render();
    if (focusTitle) requestAnimationFrame(() => titleRef.current?.focus());
  };

  const applyDraft = () => {
    const D = draft.current!;
    store.coin = { name: D.name, ticker: D.ticker };
    D.whales.forEach(w => store.FOL.set(w.address, w.weight));
    store.settings = { lev: D.lev, fee: D.fee, dd: D.dd };
    store.emit();
  };

  /* open when the builder's Launch button bumps the nonce */
  useEffect(() => {
    if (s.launchNonce === lastNonce.current) return;
    lastNonce.current = s.launchNonce;
    const dlg = dialog.current!;
    if (d.current.signature || d.current.busy) {
      step.current = 4;
      render();
      if (!dlg.open) dlg.showModal();
      return;
    }
    d.current.quote = null;
    d.current.message = '';
    draft.current = {
      name: store.coin.name.trim(),
      ticker: store.coin.ticker.trim().toUpperCase(),
      supply: draft.current?.supply || 1_000_000_000,
      lev: store.settings.lev,
      fee: store.settings.fee,
      dd: store.settings.dd,
      whales: [...store.FOL.entries()].map(([address, weight]) => ({ address, weight })),
    };
    goTo(0, false);
    if (!dlg.open) dlg.showModal();
    requestAnimationFrame(() => document.getElementById('launchName')?.focus());
  }, [s.launchNonce]);

  /* wallet discovery on the deploy step */
  const onDeployStep = step.current === 4 && !d.current.owner;
  useEffect(() => {
    if (!onDeployStep || wallets !== null) return;
    let live = true;
    solana.wallets().then(w => live && setWallets(w), () => live && setWallets([]));
    return () => {
      live = false;
    };
  }, [onDeployStep, wallets]);

  /* ---------- deployment ---------- */
  async function prepareDeployment() {
    const D = d.current;
    if (D.busy || (D.signature && !D.failure)) return;
    Object.assign(D, { busy: true, quote: null, signature: null, failure: null, message: 'Fetching current devnet account rent, balance, and network fee…' });
    setConsent(false);
    render();
    try {
      const dr = draft.current!;
      D.quote = await solana.prepare({ name: dr.name, symbol: dr.ticker, supply: dr.supply });
      D.message = D.quote.balanceLamports < D.quote.totalLamports ? 'Add devnet SOL to this wallet, then refresh the estimate.' : 'Review the cost and approve the transaction below.';
    } catch (error) {
      D.message = (error as Error).message || 'Could not prepare the devnet transaction.';
    } finally {
      D.busy = false;
      render();
    }
  }

  async function checkDeployment(poll = false) {
    const D = d.current;
    for (let attempt = 0; attempt < (poll ? 8 : 1); attempt++) {
      const st = await solana.status(D.signature!);
      if (st.state === 'confirmed') {
        D.confirmed = true;
        D.message = D.quote?.demo
          ? `Demo complete: $${draft.current!.ticker} was created locally. Nothing was sent to Solana devnet.`
          : `$${draft.current!.ticker} is confirmed on Solana devnet. Your wallet received the token supply.`;
        applyDraft();
        return;
      }
      if (st.state === 'failed' || st.state === 'expired') {
        D.failure = st.state;
        D.message = st.message || 'This transaction expired without confirmation. You can prepare a new transaction.';
        return;
      }
      D.message = 'Transaction signed. Waiting for devnet confirmation. Use the explorer link to track it; do not start another launch.';
      render();
      if (poll && attempt < 7) await sleep(1500);
    }
  }

  async function deployToken() {
    const D = d.current;
    if (D.busy || D.confirmed) return;
    if (D.failure || !D.quote) return prepareDeployment();
    if (!D.signature && (!consent || D.quote.balanceLamports < D.quote.totalLamports)) return;
    D.busy = true;
    D.message = D.signature ? 'Checking the transaction on Solana devnet…' : 'Approve the devnet token creation transaction in your wallet…';
    render();
    try {
      if (!D.signature)
        await solana.deploy(D.quote, sig => {
          D.signature = sig;
          D.message = 'Transaction signed. Submitting to Solana devnet…';
          render();
        });
      await checkDeployment(true);
    } catch (error) {
      D.message =
        ((error as Error).message || 'Wallet approval or devnet request failed.') +
        (D.signature ? ' A transaction was signed; check its status before retrying.' : ' No transaction has been submitted.');
    } finally {
      D.busy = false;
      render();
    }
  }

  async function connectWallet(name: string) {
    const D = d.current;
    if (D.busy) return;
    D.busy = true;
    D.message = 'Approve the wallet connection. No transaction is signed yet.';
    render();
    try {
      D.owner = await solana.connect(name);
    } catch (error) {
      D.message = (error as Error).message || 'Wallet connection cancelled.';
    }
    D.busy = false;
    if (D.owner) await prepareDeployment();
    else render();
  }

  /* ---------- controls ---------- */
  const onPrev = () => {
    if (d.current.busy || d.current.signature) return;
    if (!step.current) return dialog.current?.close();
    goTo(step.current - 1);
  };

  const onNext = async () => {
    if (step.current === 4) return deployToken();
    for (const field of fieldsRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select') ?? []) if (!field.reportValidity()) return;
    const D = draft.current!;
    D.ticker = D.ticker.toUpperCase();
    if (!D.name || !D.ticker) return store.toast('Enter a coin name and ticker');
    if (new TextEncoder().encode(D.name).length > 32) return store.toast('Coin names must fit within 32 UTF-8 bytes');
    d.current.quote = null;
    goTo(step.current + 1);
  };

  const close = () => dialog.current?.close();
  const onDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== dialog.current) return;
    const r = dialog.current.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  };

  /* ---------- render ---------- */
  const n = step.current;
  const stage = LAUNCH_STAGES[n];
  const D = draft.current;
  const dep = d.current;
  const hasFunds = !!dep.quote && dep.quote.balanceLamports >= dep.quote.totalLamports;
  const set = (patch: Partial<Draft>) => {
    Object.assign(draft.current!, patch);
    render();
  };

  let fields: React.ReactNode = null;
  if (D && n === 0) {
    fields = (
      <>
        <label htmlFor="launchName">
          Coin name
          <input id="launchName" value={D.name} maxLength={32} required placeholder="Your coin name" autoComplete="off" onChange={e => set({ name: e.target.value })} onBlur={e => set({ name: e.target.value.trim() })} />
        </label>
        <label htmlFor="launchTicker">
          Ticker
          <input
            id="launchTicker"
            value={D.ticker}
            maxLength={10}
            pattern="[A-Za-z0-9]{1,10}"
            required
            placeholder="WAVE"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={e => set({ ticker: e.target.value.trim() })}
          />
          <small>1–10 letters or numbers. No dollar sign needed.</small>
        </label>
        <label htmlFor="launchSupply">
          Token supply
          <input id="launchSupply" type="number" min={1} max={1000000000} step={1} required value={D.supply} onChange={e => set({ supply: +e.target.value })} />
          <small>All tokens go to your wallet. Six decimals, no freeze authority, and minting is permanently disabled after this supply is created.</small>
        </label>
      </>
    );
  } else if (D && n === 1) {
    fields = (
      <>
        {pod().map((w, i) => (
          <div className="launch-whale" key={w.address}>
            <label htmlFor={'launchWeight' + i}>
              <span>
                {w.name}
                <small>{short(w.address)}</small>
              </span>
              <output htmlFor={'launchWeight' + i}>{w.percent}%</output>
            </label>
            <input
              id={'launchWeight' + i}
              type="range"
              min={5}
              max={100}
              step={1}
              value={w.weight}
              aria-label={w.name + ' relative allocation'}
              onChange={e => {
                D.whales[i].weight = +e.target.value;
                render();
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className="launch-edit-pod"
          id="launchEditPod"
          onClick={() => {
            applyDraft();
            close();
            location.hash = '#pod';
          }}
        >
          Change your whales
        </button>
      </>
    );
  } else if (D && n === 2) {
    const sel = (k: 'lev' | 'fee' | 'dd', id: string, label: string, hint?: string) => (
      <label htmlFor={id}>
        {label}
        <select id={id} value={D[k]} onChange={e => set({ [k]: +e.target.value } as Partial<Draft>)}>
          {SEGMENTS[k].map(o => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
        {hint && <small>{hint}</small>}
      </label>
    );
    fields = (
      <>
        {sel('lev', 'launchLev', 'Leverage cap', 'Limits gross exposure relative to the treasury.')}
        {sel('fee', 'launchFee', 'Fees allocated to the treasury')}
        {sel('dd', 'launchDd', 'Stop following after drawdown', 'A limit is not a guarantee against losses or execution slippage.')}
      </>
    );
  } else if (D && n === 3) {
    fields = (
      <>
        <section className="launch-summary" aria-label="Launch configuration">
          <h3>
            {D.name} <span>${D.ticker}</span>
          </h3>
          <p>{D.supply.toLocaleString()} tokens · 6 decimals · Solana devnet</p>
          <p>The settings below are for the copy simulation only. This deployment does not create a trading treasury, liquidity pool, or automatic buybacks.</p>
          <dl>
            <div>
              <dt>Leverage cap</dt>
              <dd>{D.lev}x</dd>
            </div>
            <div>
              <dt>Fees to treasury</dt>
              <dd>{D.fee}%</dd>
            </div>
            <div>
              <dt>Drawdown limit</dt>
              <dd>{D.dd ? '-' + D.dd + '%' : 'None'}</dd>
            </div>
            <div>
              <dt>Whales</dt>
              <dd>{D.whales.length}</dd>
            </div>
          </dl>
          <ul>
            {pod().map(w => (
              <li key={w.address}>
                <span>{w.name}</span>
                <b>{w.percent}%</b>
              </li>
            ))}
          </ul>
        </section>
        <label className="launch-confirm">
          <input id="launchConfirm" type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span>I have reviewed my whale allocations and risk settings.</span>
        </label>
      </>
    );
  } else if (D && n === 4) {
    if (!dep.owner) {
      fields = (
        <>
          <div className="deployment-network">
            <strong>Solana devnet</strong>
            <span>Test network · Token-2022</span>
          </div>
          <p className="launch-disclosure">Your wallet owns the token and receives its entire supply. No private keys or recovery phrases are requested.</p>
          {wallets === null ? (
            <p className="launch-disclosure">Discovering devnet-capable wallets…</p>
          ) : (
            <>
              {wallets.map(name => (
                <button key={name} type="button" className="btn deployment-wallet" disabled={dep.busy} onClick={() => void connectWallet(name)}>
                  Connect {name}
                </button>
              ))}
              {wallets.length <= 1 && (
                <>
                  <p className="launch-disclosure">No compatible wallet detected. Enable devnet in your wallet, or install a Solana wallet, then reload this page. The demo wallet walks through the flow without sending anything.</p>
                  <a className="btn deployment-wallet" href="https://phantom.com/download" target="_blank" rel="noopener noreferrer">
                    Get Phantom
                  </a>
                </>
              )}
            </>
          )}
        </>
      );
    } else {
      const q = dep.quote;
      fields = (
        <>
          <div className="deployment-network">
            <strong>{dep.confirmed ? (q?.demo ? 'Demo deployment complete' : 'Confirmed on devnet') : 'Solana devnet'}</strong>
            <span>
              Fixed supply · {D.supply.toLocaleString()} ${D.ticker}
            </span>
          </div>
          <div className="deployment-owner">
            <span>Token owner{q?.demo ? ' (demo wallet)' : ''}</span>
            <code>{dep.owner}</code>
          </div>
          {q && !dep.signature && (
            <>
              <section className="deployment-cost" aria-label="Devnet transaction cost">
                <dl>
                  <div>
                    <dt>Account rent</dt>
                    <dd>{sol(q.rentLamports)} SOL</dd>
                  </div>
                  <div>
                    <dt>Network fee</dt>
                    <dd>{sol(q.feeLamports)} SOL</dd>
                  </div>
                  <div>
                    <dt>Estimated total</dt>
                    <dd>{sol(q.totalLamports)} SOL</dd>
                  </div>
                  <div>
                    <dt>Your devnet balance</dt>
                    <dd>{sol(q.balanceLamports)} SOL</dd>
                  </div>
                </dl>
                <p>Devnet SOL only. No service fee. Mint authority is revoked; freeze authority is disabled. You retain metadata update authority.</p>
              </section>
              {hasFunds ? (
                <label className="launch-confirm">
                  <input type="checkbox" id="deploymentConsent" required checked={consent} onChange={e => setConsent(e.target.checked)} />
                  <span>I approve creating this fixed-supply test token and paying the displayed devnet SOL costs.</span>
                </label>
              ) : (
                <>
                  <p className="launch-disclosure">Your wallet needs more devnet SOL. Get test SOL from the faucet, then refresh the estimate.</p>
                  <a className="deployment-link" href={`https://faucet.solana.com/?address=${encodeURIComponent(dep.owner)}`} target="_blank" rel="noopener noreferrer">
                    Open Solana devnet faucet
                  </a>
                </>
              )}
            </>
          )}
          {dep.signature ? (
            <>
              <div className="deployment-receipt">
                {q?.demo ? <span>Demo transaction (not on-chain)</span> : <a href={explorer('tx', dep.signature)} target="_blank" rel="noopener noreferrer">View {dep.confirmed ? 'confirmed ' : ''}transaction</a>}
                <span>Token mint</span>
                <code>{q?.mint}</code>
                {!q?.demo && q && (
                  <a href={explorer('address', q.mint)} target="_blank" rel="noopener noreferrer">
                    View token on Solana Explorer
                  </a>
                )}
              </div>
              {dep.confirmed && (
                <>
                  <p className="launch-disclosure">
                    {q?.demo
                      ? 'Demo only: no token exists on-chain and nothing was added to a wallet. Connect a real devnet wallet once the launch backend is wired up.'
                      : 'Your fixed supply is in your wallet. This token has no live whale-copying treasury, liquidity pool, or automatic buybacks.'}
                  </p>
                  <button
                    type="button"
                    className="launch-edit-pod"
                    onClick={() => {
                      if (!dep.confirmed || dep.busy) return;
                      Object.assign(dep, { quote: null, signature: null, confirmed: false, failure: null, message: '' });
                      close();
                      store.requestLaunch();
                    }}
                  >
                    Create another test token
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="deployment-tools">
              <button type="button" className="launch-edit-pod" disabled={dep.busy} onClick={() => void prepareDeployment()}>
                Refresh cost estimate
              </button>
              <button
                type="button"
                className="launch-edit-pod"
                disabled={dep.busy}
                onClick={() => {
                  if (dep.busy || dep.signature) return;
                  Object.assign(dep, { owner: null, quote: null, message: '' });
                  setWallets(null);
                  render();
                }}
              >
                Change wallet
              </button>
            </div>
          )}
        </>
      );
    }
  }

  const nextLabel =
    n === 4
      ? dep.confirmed
        ? 'Token deployed'
        : dep.busy
          ? 'Working…'
          : dep.failure
            ? 'Prepare a new transaction'
            : dep.signature
              ? 'Check transaction'
              : dep.quote
                ? 'Deploy on devnet'
                : dep.owner
                  ? 'Get cost estimate'
                  : 'Deploy on devnet'
      : n === 3
        ? 'Continue to deployment'
        : n === 2
          ? 'Review setup'
          : 'Continue';
  const nextDisabled =
    n === 4 ? dep.busy || dep.confirmed || !dep.owner || (!dep.signature && !!dep.quote && (!hasFunds || !consent)) : n === 3 ? !confirmed : false;

  return (
    <dialog className="launch-dialog" id="launchPreview" aria-labelledby="launchTitle" aria-describedby="launchDescription" ref={dialog} onClick={onDialogClick}>
      <header className="launch-header">
        <span className="launch-badge">Launch setup</span>
        <button className="launch-close" type="button" aria-label="Close launch setup" onClick={close}>
          ×
        </button>
      </header>
      <ol className="launch-steps" id="launchSteps" aria-label="Launch setup progress">
        {LAUNCH_STAGES.map((item, i) => (
          <li key={item.label} aria-current={i === n ? 'step' : undefined} className={i < n ? 'complete' : ''}>
            <span>{i + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
      <h2 id="launchTitle" tabIndex={-1} ref={titleRef}>
        {stage.title}
      </h2>
      <p id="launchDescription">{stage.description}</p>
      <div className="launch-fields" id="launchStepFields" ref={fieldsRef}>
        {fields}
      </div>
      <p className="launch-status" id="launchStatus" role="status">
        {n === 4 ? dep.message : status}
      </p>
      <div className="launch-controls">
        <button className="btn" id="launchPrev" type="button" disabled={dep.busy || !!dep.signature} onClick={onPrev}>
          {n === 0 ? 'Cancel' : 'Back'}
        </button>
        <button className="btn m" id="launchNext" type="button" disabled={nextDisabled} onClick={() => void onNext()}>
          {nextLabel}
        </button>
      </div>
      <p className="launch-disclosure">Solana devnet only · test tokens, no real monetary value. Token creation does not enable live whale-copying or buybacks.</p>
    </dialog>
  );
}
