// Saves the lit LED sign exactly as the page draws it (canvas #sign) to render/sign.png, then renders
// render/icon.html (the sign on their navy) to media/icon.png for card.mjs's apple-touch-icon.
// usage: node grab-sign.mjs http://127.0.0.1:8773/frieslab/index.html
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await p.addInitScript(() => { try { localStorage.setItem('frieslab.lang', 'en'); } catch (e) {} }); await p.goto(url + '?qa', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const data = await p.evaluate(() => document.getElementById('sign').toDataURL('image/png'));
fs.writeFileSync(path.join(D, '../sign.png'), Buffer.from(data.split(',')[1], 'base64'));
await p.setViewportSize({ width: 512, height: 512 });
await p.goto('file://' + path.join(D, '../icon.html')); await p.waitForTimeout(300);
await p.screenshot({ path: path.join(D, '../../media/icon.png') });
await b.close();
console.log('sign.png + media/icon.png');
