import { BRAND, pumpFunUrl } from '../data/site';
import { store } from '../lib/store';

/** "$REMORA CA <address> Copy" pill + "Buy on pump.fun" link. Hidden until the CA is filled in at launch. */
export function CaButton() {
  if (!BRAND.ca) return null; // hidden until the CA is filled in at launch
  const copy = () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(BRAND.ca).then(() => store.toast('CA copied'), () => store.toast(BRAND.ca));
    else store.toast(BRAND.ca);
  };
  return (
    <div className="ca-row">
      <button className="ca" type="button" data-ca={BRAND.ca} onClick={copy}>
        <span className="t">{BRAND.ticker} CA</span>
        <span>{BRAND.ca}</span>
        <span className="c">Copy</span>
      </button>
      <a className="btn g ca-pump" href={pumpFunUrl(BRAND.ca)} target="_blank" rel="noopener noreferrer">
        Buy on pump.fun <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
