// Render the roaster scene to PNG frames. Serve the repo root first (python3 -m http.server 8765), then:
//   node render.mjs <outDir> [frames, e.g. "0,45,120" for test stills; default = all]
import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs'));
const [out, only] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); p.on('console', m => m.type() === 'error' && console.log('console:', m.text())); p.on('pageerror', e => { console.log('pageerror:', e.message); process.exit(1); });
await p.goto('http://127.0.0.1:8765/nutsnow-combined/src/roaster/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const N = await p.evaluate(() => window.__frames), want = only ? new Set(only.split(',').map(Number)) : null, last = want ? Math.max(...want) : N - 1;
const t0 = Date.now();
for (let i = 0; i <= last; i++) {
  if (want && !want.has(i)) { await p.evaluate(i => { window.__step ? window.__step() : 0; }, i); }
  const d = await p.evaluate(([i, keep]) => keep ? window.__render(i) : (window.__render.skip ? window.__render.skip(i) : window.__render(i)), [i, !want || want.has(i)]);
  // three passes per frame: f = beauty, m = silhouette mask, s = floor shadow
  if (!want || want.has(i)) [].concat(d).forEach((u, k) => fs.writeFileSync(`${out}/${'fms'[k]}${String(i).padStart(4, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
  if (i % 10 === 0) console.log('frame', i, '/', last, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await b.close();
