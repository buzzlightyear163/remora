import { useEffect, useState } from 'react';
import { BRAND, NAV_LINKS, pumpFunUrl } from '../data/site';
import { Logo } from './Logo';

/** Fixed top bar; gains a blurred background after 30px of scroll (nav.s). */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  return (
    <nav id="nav" className={scrolled ? 's' : ''}>
      <Logo />
      <div className="lk">
        {NAV_LINKS.map(l => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <div className="nav-actions">
        <a className="nav-x" href={BRAND.xUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit @${BRAND.xHandle} on X (opens in a new tab)`}>
          <span aria-hidden="true">X</span>
          <span className="x-handle">@{BRAND.xHandle}</span>
        </a>
        {BRAND.ca && (
          <a className="nav-x nav-pump" href={pumpFunUrl(BRAND.ca)} target="_blank" rel="noopener noreferrer">
            pump.fun
          </a>
        )}
        <a className="btn m sm" href="#mirror">
          Launch
        </a>
      </div>
    </nav>
  );
}
