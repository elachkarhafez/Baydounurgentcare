// Render the redrawn Nuts Now logo (logo.html, fonts from Google Fonts) to a transparent PNG:
//   node render.mjs $PWD/logo.html out-1200.png   then scale to 600 px -> img/logo-hd.webp
import path from 'path'; import { execSync } from 'child_process';
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs'));
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 1200 } })).newPage();
await p.goto('file://' + process.argv[2]); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
console.log(await p.evaluate(() => ['Anton', 'Kaushan Script'].map(f => f + ':' + document.fonts.check(`12px "${f}"`)).join(' ')));
await p.screenshot({ path: process.argv[3], omitBackground: true, clip: { x: 0, y: 0, width: 1200, height: 1200 } });
await b.close();
