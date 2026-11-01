import { useEffect, type ReactNode } from 'react';
import { Nav } from '../components/Nav';
import { ConnectionStatus, Footer, Toast } from '../components/Sections';
import { LaunchDialog } from '../components/LaunchDialog';
import { store } from '../lib/store';

/** Shared chrome: fixed nav, footer, launch dialog, toast and the Hyperliquid connection bar. */
export function SiteLayout({ children }: { children: ReactNode }) {
  // the store lives for the whole app session; start() is idempotent (safe under StrictMode double effects)
  useEffect(() => store.start(), []);
  return (
    <>
      <Nav />
      {children}
      <Footer />
      <LaunchDialog />
      <Toast />
      <ConnectionStatus />
    </>
  );
}
