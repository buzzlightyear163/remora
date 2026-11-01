# Remora ($REMORA)

**Your coin rides with the whales.** Remoran hakar fast på valar och åker med. $REMORA är en pump.fun-coin (Solana) vars
creator fees bridgas till Hyperliquid och hakar på de största traders där: de öppnar, den öppnar; de stänger i vinst,
coinen köps tillbaka på pump.fun.

Byggd på Whaled-mallen (`C:\Clonade hemsidor\whaled`, orörd, kvar i grönt) med samma layout och funktioner, men med eget namn,
egen logga, egen copy och en blå färgpalett. Vite + React + TypeScript (strict) + react-router-dom.

## Starta

**Windows:** dubbelklicka `start.bat`.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b + vite build -> dist/
npm run preview    # produktionsbygget inkl. API-middleware på http://localhost:4173
```

## Deploy (Vercel)

Kopplat till GitHub: varje push till `main` deployar automatiskt. `vercel.json` sätter Vite-bygget och SPA-routing.
Hyperliquid-API:t körs som Vercel Functions (`api/hyperliquid/leaderboard|positions|icon.ts`) med samma kod som
dev-servern (`server/hl.ts`), så whale-tavlan är live även i produktion. Svaren cachas i Vercels CDN
(leaderboard 60 s, positioner 15 s, ikoner 7 dagar).

## Innan launch

1. Klistra in pump.fun-CA:n i `src/data/site.ts` → `BRAND.ca`. Då dyker CA-rutan, "Buy on pump.fun"-knappen
   (hero + slut-CTA) och pump.fun-länken i menyn upp automatiskt, länkade till `https://pump.fun/coin/<CA>`.
   Så länge fältet är tomt är allt det dolt.
2. Sätt rätt X-handle i `BRAND.xHandle` / `BRAND.xUrl` (just nu platshållaren `@RemoraOnHL`).
3. Se `BRANDING_TODO.md`.

## Sajten

| Sektion | Innehåll |
|--|--|
| Hero `#hero` | 3D-partikelval, "Your coin rides with the whales.", live-stats, tape med whales positioner |
| The hosts `#pod` | Featured whales + live-tabell (sortera, Attach, klistra in egen adress) |
| Your remora `#mirror` | $10k-treasury-simulering + inställningar (vikter, leverage, fees, "let go"-drawdown, namn/ticker) |
| How it works `#how` | Latch on → It latches on → The whale moves → You feed on the wins |
| Slut-CTA | "Never swim alone." |
| Launch-dialog | 5 steg: Identity → Your whales → Risk → Review → Deploy (devnet) |

Unknown routes → egen 404. `?at=pod` hoppar till en sektion.

## Data

Publik, read-only Hyperliquid-data, inga nycklar:

1. `server/hyperliquidApi.ts` (Vite-middleware): leaderboard (topp 100 all-time PnL + publika profiler), positioner, coin-ikoner.
2. Utan middleware: positioner direkt från `api.hyperliquid.xyz`.
3. Offline: snapshot i `public/api/` – statusraden visar då "offline demo data".

`TODO(backend)`: deploya middlewaren som serverless-route för live-data i produktion.

## Web3

Devnet-wallets (Phantom/Solflare/Backpack) ansluts och får saldo + kostnadsestimat. Demo wallet kör hela launch-flödet lokalt
utan att något skickas on-chain. `TODO(backend)`: riktig Token-2022-deploy (`src/lib/solana.ts`).

## Struktur

```
server/hl.ts               Hyperliquid-proxy (leaderboard, positions, icon), delas av dev-server och Vercel
api/hyperliquid/*.ts       Vercel Functions som anropar server/hl.ts
server/hyperliquidApi.ts   Vite-middleware för dev/preview
src/data/site.ts           namn, ticker, CA, X, nav, steg, disclaimer
src/components/            Nav, Hero, Pod, Mirror, LaunchDialog, Sections
src/lib/                   store, hyperliquid, mirror, sea (three.js), solana, format, avatar
src/styles/                fonts, base (färgtokens), sections, launch, responsive
public/images/             remora-logo.svg (partikelvalen från heron), remora-icon.svg, og.svg
scripts/gen-whale-logo.mjs genererar loggan från samma valgeometri som 3D-scenen (`npm run logo`)
```

## Grafik (X + pump.fun)

Färdiga bilder i `brand/out/`, renderade med kod från exakt samma three.js-val som på sajten:

| Fil | Storlek | Används till |
|--|--|--|
| `remora-coin-remora.png` | 1000×1000 | pump.fun coin-bild + X-profilbild (valen med remoran under) |
| `remora-coin.png` | 1000×1000 | alternativ: bara valen |
| `remora-banner.png` | 1500×500 | X-banner (valen + kölvatten med trades, "Never swim alone.") |
| `remora-launch.png` | 1600×900 | bild till launch-posten ("Live on pump.fun") |

Rendera om (t.ex. efter färgbyte): `npm run dev` i ett fönster, sedan `npm run brand` (kräver Playwright:
`npm i -D playwright && npx playwright install chromium`). Kompositionerna ligger i `brand/render.ts`.

## Ändra mer

- Färger: tokens överst i `src/styles/base.css` (`--m` accent, `--bg`, `--p1` …). Palett: djup navy (`#040b17`) med isblå accent (`#8fd0ff`). Long/short är medvetet kvar som grönt/rött. Valens partikelfärger ligger i `src/lib/sea.ts` – kör `npm run logo` efteråt så följer loggan med.
- Rubriker: `Hero.tsx`, `Pod.tsx`, `Mirror.tsx`, `Sections.tsx`.
