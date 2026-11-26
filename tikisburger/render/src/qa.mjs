// QA for tikisburger. usage: node qa.mjs <url> <outDir> <mode: intro|pages|zoom> [w h ...]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [url, out, mode = 'pages', ...dims] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sizes = dims.length ? dims.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(+v) : a.push([+v]), a), []) : [[390, 844], [360, 740], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined, args: ['--ignore-certificate-errors'] });
const report = [];
for (const [w, h] of sizes) {
  const phone = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, deviceScaleFactor: mode === 'zoom' ? 2 : 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('requestfailed', r => errs.push('reqfail ' + r.url().slice(0, 120)));
  const tag = `${w}x${h}`;
  if (mode === 'intro') {
    await p.addInitScript(() => { window.__qaPause = true; });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForFunction(() => !!window.__intro, null, { timeout: 15000 });
    for (const t of [0.3, 0.7, 1.05, 1.35, 1.65, 1.95, 2.25, 2.7]) {
      await p.evaluate(t => { window.__intro.seek(t, false); }, t);
      await p.waitForTimeout(120);
      await p.screenshot({ path: `${out}/intro_${tag}_${t}.png` });
    }
    const dur = await p.evaluate(() => window.__intro.duration());
    report.push(`${tag} intro duration ${dur.toFixed(2)}s`);
  } else {
    await p.goto(url + (url.includes('?') ? '&' : '?') + 'nointro', { waitUntil: 'networkidle' });
    if (mode === 'zoom') await p.evaluate(() => document.documentElement.style.fontSize = '200%');
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${out}/${tag}_top.png` });
    // walk the page so reveals fire, then full page
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h * .6) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(140); }
    await p.waitForTimeout(700);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${tag}_full.png`, fullPage: true });
    const m = await p.evaluate(() => {
      const de = document.documentElement, over = de.scrollWidth - de.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > de.clientWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.rail,.gods,.bases,.sheet,.embers,.spill,.stage,#intro'); }).slice(0, 5).map(e => e.tagName + '.' + e.className);
      const fs = s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
      const imgs = [...document.querySelectorAll('main img')].map(i => i.getBoundingClientRect().height).filter(x => x > 0);
      const hero = document.querySelector('.hcopy .ctas').getBoundingClientRect();
      return { over, wide, h1: fs('h1'), h2: fs('h2'), body: fs('.lede'), btn: fs('.btn'), maxImg: Math.max(...imgs), vh: innerHeight, ctaBottom: Math.round(hero.bottom), pageH: de.scrollHeight };
    });
    report.push(`${tag} ${JSON.stringify(m)}`);
  }
  report.push(`${tag} errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
}
await b.close();
console.log(report.join('\n'));
