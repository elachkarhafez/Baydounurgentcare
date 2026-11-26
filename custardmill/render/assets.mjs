// Render the apple-touch source icon (../media/icon.png from icon.html) and a transparent still of the lit sign
// (sign-lit.png, used by og.html). Needs the repo served on :8780 (python3 -m http.server 8780 from the repo root).
// Usage: node custardmill/render/assets.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.goto('file://' + path.join(HERE, 'icon.html'));
await p.screenshot({ path: path.join(HERE, '../media/icon.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });
const q = await b.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
await q.addInitScript(() => { sessionStorage.setItem('cmIntro1', '1'); });
await q.goto('http://127.0.0.1:8780/custardmill/index.html', { waitUntil: 'load' });
await q.waitForTimeout(1200);
await q.evaluate(() => { document.querySelector('.raysbox').style.display = 'none'; document.querySelector('.spill').style.display = 'none'; document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent'; document.querySelector('.hero').style.background = 'transparent'; });
await q.waitForTimeout(300);
await q.locator('#signwrap').screenshot({ path: path.join(HERE, 'sign-lit.png'), omitBackground: true });
await b.close();
console.log('icon.png + sign-lit.png');
