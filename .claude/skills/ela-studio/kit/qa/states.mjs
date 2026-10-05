// Render a build3d page at several scroll states and make one contact sheet.
// usage: node states.mjs <url> <outDir> [p1,p2,...] [--phone] [--extra=query]
// Needs the page served over http (python3 -m http.server). Uses ?p=<state>&qa jump hooks.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const [url, out, list = '0,0.13,0.29,0.45,0.6,0.78,1'] = pos;
const phone = flags.includes('--phone'), extra = (flags.find(f => f.startsWith('--extra=')) || '').slice(8);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const vp = phone ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const errs = [], shots = [];
for (const p of list.split(',')) {
  const page = await browser.newPage({ viewport: vp, isMobile: phone, hasTouch: phone });
  page.on('pageerror', e => errs.push(`[p=${p}] ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`[p=${p}] ${m.text().slice(0, 200)}`); });
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}p=${p}&qa${extra ? '&' + extra : ''}`);
  try { await page.waitForFunction(() => document.documentElement.classList.contains('gl-ready'), null, { timeout: 60000 }); } catch { errs.push(`[p=${p}] 3D never became ready`); }
  await page.evaluate(p => { const b = document.querySelector('#build'); if (b) scrollTo(0, b.offsetTop + p * (b.offsetHeight - innerHeight)); }, +p);
  await page.waitForTimeout(1800);
  const f = `${out}/${phone ? 'm' : 'd'}_${p}.png`; await page.screenshot({ path: f }); shots.push(f);
  await page.close();
}
await browser.close();
const sheet = `${out}/${phone ? 'm' : 'd'}_sheet.jpg`;
execSync(`montage -label '%t' -geometry ${phone ? '200x433' : '480x300'}+2+2 -tile ${phone ? 7 : 3}x ${shots.join(' ')} ${sheet}`);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors', '\nsheet:', sheet);
