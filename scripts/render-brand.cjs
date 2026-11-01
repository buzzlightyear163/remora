// Renders brand/out/*.png from brand/render.html. Needs the dev server running (npm run dev) and Playwright.
// Usage: node scripts/render-brand.cjs [baseUrl] [kinds...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [base = 'http://localhost:5173', ...kinds] = process.argv.slice(2);
  const list = kinds.length ? kinds : ['coin', 'coin-remora', 'banner', 'launch'];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(base + '/brand/render.html');
  await p.waitForFunction(() => typeof window.shot === 'function', null, { timeout: 60000 });
  for (const k of list) {
    const t = Date.now();
    const url = await p.evaluate(k => window.shot(k), k);
    const file = path.join(__dirname, '..', 'brand', 'out', `remora-${k}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', path.relative(process.cwd(), file), Date.now() - t + 'ms');
  }
  await b.close();
})();
