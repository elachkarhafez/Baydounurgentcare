// lists elements that stick out past the viewport and are not clipped by a scroll/overflow ancestor
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [url, w = 360, h = 740] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
const p = await b.newPage({ viewport: { width: +w, height: +h }, isMobile: true, hasTouch: true });
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(() => {
  const W = 360, out = [];
  const clipped = e => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX !== 'visible' && a !== document.body && a !== document.documentElement) return true; } return false; };
  for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > W + 1 && !clipped(e) && getComputedStyle(e).position !== 'fixed') out.push((e.id || e.tagName) + '.' + (typeof e.className === 'string' ? e.className : '') + ' ' + Math.round(r.right)); }
  return [document.documentElement.scrollWidth, W, out.slice(0, 15)];
})));
await b.close();
