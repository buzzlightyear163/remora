import { BRAND } from '../data/site';

export function Logo() {
  return (
    <a className="logo" href="#hero">
      <img className="brand-whale" src={BRAND.logo} width={110} height={32} alt="" aria-hidden="true" />
      {BRAND.name}
    </a>
  );
}
