// Render the transition pieces and pack them into img/tx/pieces.webp + js frame list.
// From the repo root: python3 -m http.server 8765 &  then  node nutsnow-combined/src/pieces/render.mjs <outDir>
import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs'));
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); p.on('console', m => m.type() === 'error' && console.log('console:', m.text())); p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto('http://127.0.0.1:8765/nutsnow-combined/src/pieces/index.html'); await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 300000 });
const S = await p.evaluate(() => window.__sprites || window.__error);
if (typeof S === 'string') { console.log(S); process.exit(1); }
S.forEach((s, i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${s.name}.png`, Buffer.from(s.url.split(',')[1], 'base64')));
fs.writeFileSync(`${out}/meta.json`, JSON.stringify(S.map(s => ({ name: s.name, scale: s.scale }))));
console.log(S.length, 'sprites');
await b.close();
