// Render catalog tiles: node render.mjs <page url (serves a bundle that defines window.renderAll)> <outDir> [id,id,...]
// Pieces for 2D sprites: node render.mjs <url> <outDir> --pieces  (needs window.renderPieces)
// Writes <outDir>/<id>.webp (transparent) and <outDir>/sheet.jpg to look at.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const [url, out, only] = process.argv.slice(2), PIECES = only === '--pieces', MAX = +(process.env.TILE_MAX || 520);   // TILE_MAX=1000 for hero-size stills fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('console', m => m.type() === 'error' && console.log('console:', m.text())); p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(url); await p.waitForFunction(() => window.renderAll, null, { timeout: 30000 });
const res = PIECES ? await p.evaluate(() => window.renderPieces()) : await p.evaluate(o => window.renderAll(o), only ? only.split(',') : null);
for (const [id, d] of Object.entries(res)) { fs.writeFileSync(`${out}/${id}.png`, Buffer.from(d.split(',')[1], 'base64')); execSync(`convert '${out}/${id}.png' -trim +repage ${PIECES ? "-resize '96x96>' -gravity center -background none -extent 112x112" : `-resize '${MAX}x${MAX}>' -bordercolor none -border 12`} -quality 84 -define webp:alpha-quality=90 '${out}/${id}.webp'`); fs.unlinkSync(`${out}/${id}.png`); }
execSync(`montage -label '%t' -background '#2a2c24' -fill white -geometry 200x200+4+4 -tile 8x ${Object.keys(res).map(i => `'${out}/${i}.webp'`).join(' ')} '${out}/sheet.jpg'`);
console.log('rendered', Object.keys(res).length, '→', out); await b.close();
