// Render the lit sign on its wall (render/sign-lit.png, for the og card) and the 512px icon (media/icon.png, which
// kit/og/card.mjs turns into the apple-touch icon) from the built page.
// Needs the repo served: python3 -m http.server 8785 (repo root). Usage: node holybaklava/render/assets.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('hbIntro2', '1'); } catch (e) { } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8785/holybaklava/index.html', { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.hint{display:none!important}' });
await p.waitForTimeout(600);
await p.locator('#slot').screenshot({ path: path.join(HERE, 'sign-lit.png'), omitBackground: true });
const q = await b.newPage({ viewport: { width: 512, height: 512 } });
await q.goto('file://' + path.join(HERE, 'icon.html'));
await q.screenshot({ path: path.join(HERE, '../media/icon.png') });
await b.close();
console.log('sign-lit.png + media/icon.png');
