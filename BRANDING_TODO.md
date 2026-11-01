# Branding TODO – Remora

Rebrand gjord: namn, ticker, logga, favicon, OG-bild, all copy och knapptexter (Follow → Attach, pod → hosts, mirror → remora).

Kvar att fylla i:

- [ ] **CA** – `src/data/site.ts` → `BRAND.ca` (tom = CA-ruta, "Buy on pump.fun" och pump.fun-länken dolda).
- [ ] **X-konto** – `BRAND.xHandle` / `BRAND.xUrl` (platshållare `@RemoraOnHL`).
- [ ] **Domän** – inget i koden beror på den; lägg till `og:url` i `index.html` när den finns.
- [ ] **OG-bild** – `public/images/og.svg`; exportera gärna en 1200×630 PNG för bäst stöd på X.
- [ ] **Publika profiler** (Silk, Machi Big Brother) – `PUBLIC_PROFILES` i `src/data/site.ts`, behåll eller byt.
- [x] Live-leaderboard i produktion: Vercel Functions i `api/hyperliquid/`.
- [ ] `TODO(backend)` riktig devnet-deploy för anslutna wallets (`src/lib/solana.ts`).
