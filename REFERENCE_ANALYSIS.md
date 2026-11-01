# Referensanalys – whaled.app (mallen som Remora bygger på)

Analyserad 2026-10-29 via webbläsare (DOM, CSS, nätverk, publika klientscript).

## Teknik i referensen
- Next.js (Turbopack, genererad med v0.app) + Vercel Analytics.
- Statisk markup + `hyperpad-runtime.js` (vanilla ES-modul) som driver allt: three.js-scen, tabell, mirror, launch-dialog.
- En React-komponent (`HyperpadLive`) pollar `/api/hyperliquid/leaderboard` (SWR, 60 s) och skickar `hyperpad:leaderboard`-event.
- `window.whaleSolana` (wallet-standard + server-API `prepare/submit/status`) för devnet-deploy.

## Routes
- `/` – enda sidan. Ankare: `#hero`, `#pod`, `#mirror`, `#how`.
- API: `/api/hyperliquid/leaderboard`, `/api/hyperliquid/positions?address=`, `/api/hyperliquid/icon?coin=`.
- `/opengraph-image` (dynamisk OG).

## Layout (1280×800)
| Sektion | Top | Höjd |
|--|--|--|
| hero | 0 | 100svh (min 760) |
| pod | 800 | 1421 |
| mirror | 2221 | 1195 |
| how | 3415 | 600 |
| end | 4016 | 661 |
| footer | 4677 | 163 |

Klonen mäter 0–2 px avvikelse på alla sektioner (1280 och 390).

## Designsystem
- Färger: `--bg #04110f`, `--bg2 #061815`, `--p1 #0a1e1b`, `--p2 #0f2824`, `--tx #e6f4f0`, `--mu #86a39c`, `--dm #557069`,
  accent `--m #97fce4`, `--m2 #50d2c1`, `--long #1fc28f`, `--short #ed7088`, linjer `#97fce417` / `#97fce42e`.
- Typsnitt: Instrument Serif (rubriker, siffror), Geist (UI), Geist Mono (labels, tal).
- H1 `clamp(56px, 7.4vw, 124px)` / lh .92; H2 `clamp(44px, 5vw, 80px)`; end-H2 `clamp(56px, 8vw, 132px)`.
- Container `min(1320px, 100% - 48px)`; paneler radius 18px; knappar 46px (sm 38px) radius 10px.
- Easing `cubic-bezier(.2,.8,.2,1)`.

## Breakpoints
- ≤1000px: nav-länkar döljs, mirror 1 kolumn, how 2 kolumner, `.hide-m` döljs, summary 2×2.
- ≤900px: X-handle döljs (bara "X").
- ≤640px: mobil-typografi, kort 1 kolumn, tabell min-width 720 (horisontell scroll), how 1 kolumn.

## Komponenter
Nav (blur efter 30 px scroll) · Hero med WebGL-val + vinjett · CA-pill (kopiera) · hero-stats · tape-marquee ·
featured whale-kort (2 publika profiler + största boken) · pod-tabell (sortering, follow, klistra in adress) ·
mirror-preview ($10k treasury, exponering per marknad, cap-skalning) · mirror-builder (vikter, leverage, fees, drawdown, namn/ticker) ·
how-it-works (4 steg med gradientlinje) · slut-CTA · footer · launch-dialog (5 steg) · toast · statusrad.

## Animationer
- three.js-val: 24 000 punkter, additiv blending, svansvåg i vertex shader, 2 600 wake-partiklar, 900 plankton, pekarföljning (lerp .045).
- Tape: `translate(-50%)` 80 s linjärt oändligt.
- Eyebrow-prick: blink 1.6 s.
- `.rv` scroll-reveal: opacity + translateY(24px), .9 s, threshold .1.
- Toast: translateY 200% → 0, .45 s.
- `prefers-reduced-motion` stänger av allt rörligt.

## Funktioner
Live leaderboard (topp 100 all-time PnL + publika profiler), positioner per wallet (4 parallella, var 30:e s),
sortering, follow/unfollow, egen adress, vikter med procent, mirror-simulering, launch-wizard med validering,
devnet-wallet-flöde, kopiera CA, `?at=`-djuplänk.

## Externa integrationer
Hyperliquid (stats-data, info-API, coin-ikoner), Solana devnet RPC + wallet-standard, X-länk, Phantom-länk, Solana Explorer/Faucet.
