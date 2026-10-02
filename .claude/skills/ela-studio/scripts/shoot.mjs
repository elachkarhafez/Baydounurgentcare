// QA harness for a single-file site.
// Usage: node shoot.mjs <path/to/index.html | https://url> <outDir> [stops=12] [waitMs=5000] [--via-curl]
//   Screenshots desktop (1440x900) and phone (390x844): intro, hero, then evenly spaced scroll stops.
//   Prints console/page errors and flags horizontal overflow.
//   --via-curl: fetch CDN scripts and Google Fonts with curl and serve them to the page
//               (for sandboxes where headless Chromium has no direct network access).
// Env: CHROMIUM_PATH to use a specific Chromium build; LOCAL_LIBS=<dir> to serve gsap.js, st.js,
//      lenis.js, three.js, matter.js from a local folder instead of the CDN.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(globalRoot, 'playwright', 'index.mjs')));
}

const args = process.argv.slice(2);
const VIA_CURL = args.includes('--via-curl');
const [target, out, stopsArg, waitArg] = args.filter(a => !a.startsWith('--'));
if (!target || !out) { console.error('Usage: node shoot.mjs <index.html|url> <outDir> [stops] [waitMs] [--via-curl]'); process.exit(1); }
const N = +(stopsArg || 12), WAIT = +(waitArg || 5000);
const LIB = process.env.LOCAL_LIBS ? path.resolve(process.env.LOCAL_LIBS) + '/' : null;
const url = /^https?:/.test(target) ? target : 'file://' + path.resolve(target);
fs.mkdirSync(out, { recursive: true });

const launch = { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
else if (fs.existsSync('/opt/pw-browsers/chromium')) launch.executablePath = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(launch);

const cache = {};
const curl = u => cache[u] || (cache[u] = execSync(`curl -sL -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36' '${u}'`, { maxBuffer: 5e7 }));
const LIBMAP = [['gsap.min', 'gsap.js'], ['ScrollTrigger', 'st.js'], ['lenis', 'lenis.js'], ['three.min', 'three.js'], ['matter', 'matter.js']];
let problems = 0;

for (const [w, h, name] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: name === 'm', isMobile: name === 'm' });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  if (LIB || VIA_CURL) await page.route('**/*', r => {
    const u = r.request().url();
    if (LIB) for (const [k, f] of LIBMAP) if (u.includes(k) && fs.existsSync(LIB + f)) return r.fulfill({ path: LIB + f, contentType: 'text/javascript' });
    if (VIA_CURL && /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com/.test(u)) {
      try { return r.fulfill({ body: curl(u), contentType: u.includes('googleapis') ? 'text/css' : u.endsWith('.js') ? 'text/javascript' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } }); }
      catch { return r.abort(); }
    }
    return r.continue();
  });
  await page.goto(url);
  await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}00-intro.png` });
  await page.waitForTimeout(WAIT); await page.screenshot({ path: `${out}/${name}01-hero.png` });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 1; i <= N; i++) {
    await page.evaluate(y => window.scrollTo(0, y), Math.round(i / N * (H - h)));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${name}${String(i + 1).padStart(2, '0')}.png` });
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const overflow = sw > w;
  if (overflow || errs.length) problems++;
  console.log(`${name === 'd' ? 'desktop' : 'phone  '} ${w}px  scrollWidth ${sw} ${overflow ? '<-- HORIZONTAL OVERFLOW' : 'ok'}  height ${H}  errors ${errs.length ? JSON.stringify(errs) : 'none'}`);
  await page.close();
}
await browser.close();
console.log(problems ? `\n${problems} viewport(s) need fixing. Screenshots in ${out}` : `\nClean. Now look at the screenshots in ${out}`);
