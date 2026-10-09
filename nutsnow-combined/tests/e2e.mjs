// Browser test of the ordering journeys (Playwright, already installed globally for site QA).
// Needs two local servers: node tests/serve.js 8790  (real catalog)  and
//   node tests/serve.js 8791 <priced test catalog> 2026-10-14T20:50:00Z   (server clock at the same store time as the test)
// usage: node tests/e2e.mjs <outDir>
import path from 'path'; import { execSync } from 'child_process';
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs'));
const OUT = process.argv[2] || '/tmp', results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
const b = await chromium.launch();
async function page(vp, port, mobile, time) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'], timezoneId: 'Asia/Tokyo' });
  if (time) await ctx.addInitScript(t => { const real = Date.now(); const off = t - real; const _now = Date.now; Date.now = () => _now() + off; const D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [_now() + off])); } static now() { return _now() + off; } }; }, time);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${port}/index.html?noopen`); await p.waitForTimeout(1200); return p;
}
const state = p => p.evaluate(() => ({ lines: JSON.parse(localStorage.getItem('nn-basket-v1') || '{}').lines || [], jar: window.__flow.jar && window.__flow.jar.state }));
const text = (p, s) => p.textContent(s);

for (const [tag, vp, mobile] of [['d', { width: 1440, height: 900 }, false], ['m', { width: 390, height: 844 }, true]]) {
  // a fixed store time: Wednesday 14 Oct 2026, 4:50 PM in Detroit (20:50 UTC); browser clock zone is Tokyo on purpose
  const T = Date.parse('2026-10-14T20:50:00Z');
  const p = await page(vp, 8791, mobile, T);
  // roast: choose pistachios, ¾ lb, hold to golden, pour
  await p.click('#roastNut [data-id="pistachios"]'); await p.click('#roastAmt [data-u="3"]');
  ok(`${tag} roast amount label`, (await text(p, '#toJar')) === 'Pour ¾ lb into the jar');
  await (await p.$('#holdBtn')).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const bb = await (await p.$('#holdBtn')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
  await p.waitForFunction(() => window.__flow.drum.roast >= .62, null, { timeout: 9000, polling: 16 }).catch(async e => { console.log('roast stuck at', await p.evaluate(() => [window.__flow.drum.roast, window.__flow.drum.busy, window.__flow.drum.done, document.querySelector('#verdict').textContent])); throw e; }); await p.mouse.up(); await p.waitForTimeout(200);
  await p.click('#toJar'); await p.waitForTimeout(2600);
  let s = await state(p);
  ok(`${tag} roast pours the chosen product + amount`, JSON.stringify(s.jar.comps) === '[{"productId":"pistachios","units":3}]', JSON.stringify(s.jar.comps));
  // mix: add cashews ½ lb (scoop ½), bbq ¼ lb, then edit with + / −
  await p.click('#sizes [data-u="2"]'); await p.click('.sw[data-id="cashews"]'); await p.click('#sizes [data-u="1"]'); await p.click('.sw[data-id="bbq"]'); await p.click('.sw[data-id="bbq"]');
  await p.click('#bagList li[data-id="bbq"] [data-act="less"]'); await p.waitForTimeout(400);
  s = await state(p);
  ok(`${tag} mix builder amounts`, JSON.stringify(s.jar.comps) === '[{"productId":"pistachios","units":3},{"productId":"cashews","units":2},{"productId":"bbq","units":1}]', JSON.stringify(s.jar.comps));
  ok(`${tag} mix subtotal (½ cashews $6 + ¼ bbq $4 + ¾ pistachios $15 = $25.00)`, (await text(p, '#bagSub')) === '$25.00', await text(p, '#bagSub'));
  ok(`${tag} mix weight`, (await text(p, '#bagTot')) === '1½ lb');
  await p.screenshot({ path: `${OUT}/${tag}-1-mix.png` });
  await p.click('#mixAdd'); await p.waitForTimeout(1900);
  s = await state(p);
  ok(`${tag} mix added as one basket line`, s.lines.length === 1 && s.lines[0].type === 'mix' && s.lines[0].name === 'Mix #1' && s.lines[0].components.length === 3);
  ok(`${tag} jar empties after adding`, s.jar.comps.length === 0);
  // a second, identical mix stays separate
  await p.click('.sw[data-id="cashews"]'); await p.click('.sw[data-id="cashews"]'); await p.click('#mixAdd'); await p.waitForTimeout(1900);
  s = await state(p); ok(`${tag} second mix stays separate`, s.lines.length === 2 && s.lines[1].name === 'Mix #2');
  // the shop: Candy → Gummies ×3 steps (¾ lb) to the basket; walnuts ¼ lb; za'atar unavailable
  await p.evaluate(() => document.querySelector('#order').scrollIntoView());
  await p.click('#oCats [data-id="candy"]');
  const g = '.pcard[data-id="gummies"]';
  await p.click(`${g} [data-act="more"]`); await p.click(`${g} [data-act="more"]`);
  ok(`${tag} card amount + subtotal ($7.99 × ¾ = $5.99)`, (await text(p, `${g} output`)) === '¾ lb' && (await text(p, `${g} .psub`)) === '$5.99', (await text(p, `${g} .psub`)));
  await p.click(`${g} [data-act="add"]`); await p.click(`${g} [data-act="add"]`);
  s = await state(p); const gl = s.lines.find(l => l.productId === 'gummies');
  ok(`${tag} same product twice merges into one line`, gl && gl.units === 6);
  await p.click('#oCats [data-id="nuts"]');
  ok(`${tag} unavailable product cannot be added`, (await p.$('.pcard[data-id="zaatar"] [data-act="add"]')) === null && /Not available/.test(await text(p, '.pcard[data-id="zaatar"]')));
  await p.click('.pcard[data-id="walnuts"] [data-act="add"]');
  await p.screenshot({ path: `${OUT}/${tag}-2-shop.png` });
  // basket
  await p.click('#bkOpen'); await p.waitForTimeout(500);
  ok(`${tag} basket lists 4 lines`, (await p.$$('#bkLines > li')).length === 4);
  const sub = await text(p, '#bkSum .tot b');
  ok(`${tag} basket subtotal ($25 + $6 + 1½ lb gummies $11.99 + ¼ walnuts $3.50 = $46.49)`, sub === '$46.49', sub);
  // edit gummies down one step in the basket
  const gid = gl.id; await p.click(`#bkLines li[data-id="${gid}"] [data-act="less"]`); await p.waitForTimeout(200);
  ok(`${tag} edit weight in basket updates total`, (await text(p, '#bkSum .tot b')) === '$44.49', await text(p, '#bkSum .tot b'));
  // pickup: Dearborn Heights, today. Times must end at 9 PM; nothing before 5:20 PM (4:50 + 30 min prep) → first is 5:30
  await p.click('label.pk-store:has(input[value="dh"])');
  const opts = await p.$$eval('#pkTime option', o => o.map(x => x.textContent).filter(t => /\d/.test(t)));
  ok(`${tag} first slot respects prep time`, opts[0] === '5:30 PM', opts[0]);
  ok(`${tag} last slot is 9 PM, nothing later`, opts[opts.length - 1] === '9 PM' && !opts.some(t => /9:(15|30|45) PM|10 PM/.test(t)), opts.slice(-3).join(','));
  await p.selectOption('#pkTime', { label: '9 PM' });
  ok(`${tag} pickup confirmation text`, /9 PM on Wednesday, October 14/.test(await text(p, '#pkChosen')), await text(p, '#pkChosen'));
  await p.screenshot({ path: `${OUT}/${tag}-3-basket.png` });
  // server check passes, payment button stays off, no paid confirmation anywhere
  await p.click('#ckBtn'); await p.waitForSelector('#ckResult.ok, #ckResult.no', { timeout: 5000 });
  const ck = await text(p, '#ckResult');
  ok(`${tag} server check OK with verified total`, /Everything checks out/.test(ck) && /\$44\.49/.test(ck), ck.slice(0, 120));
  ok(`${tag} pay button disabled and no paid wording`, await p.$eval('#payBtn', b => b.disabled) && !/\bpaid\b|confirmed/i.test(ck.replace('not paid', '')));
  await p.evaluate(() => document.querySelector('#ckResult').scrollIntoView()); await p.screenshot({ path: `${OUT}/${tag}-4-check.png` });
  // copy text says not paid
  await p.click('#bkCopy'); const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok(`${tag} order text itemises mixes and says not paid`, /not paid yet/.test(clip) && /Mix #1 \(1½ lb, \$25\.00\)/.test(clip) && /– ¾ lb Pistachios \(\$15\.00\)/.test(clip) && /Pickup: 9 PM on Wednesday, October 14 at Dearborn Heights/.test(clip), clip);
  // edit Mix #1 from the basket: remove bbq, save → total drops by $4
  const m1 = (await state(p)).lines.find(l => l.name === 'Mix #1').id;
  await p.click(`#bkLines li[data-id="${m1}"] [data-act="edit"]`); await p.waitForTimeout(900);
  ok(`${tag} editing mix loads it into the jar`, /Editing Mix #1/.test(await text(p, '#bagTitle')));
  await p.click('#bagList li[data-id="bbq"] [data-act="rm"]'); await p.waitForTimeout(300);
  await p.click('#mixSave'); await p.waitForTimeout(400);
  s = await state(p); const m1b = s.lines.find(l => l.id === m1);
  ok(`${tag} saved mix edit`, m1b.components.length === 2 && !m1b.components.some(c => c.productId === 'bbq'));
  // cancel an edit keeps the mix as it was
  await p.evaluate(id => window.__flow.jar.edit(id), m1); await p.click('.sw[data-id="cashews"]'); await p.click('#mixCancel'); await p.waitForTimeout(300);
  s = await state(p); ok(`${tag} cancel edit changes nothing`, JSON.stringify(s.lines.find(l => l.id === m1).components) === JSON.stringify(m1b.components));
  // persistence: reload keeps everything
  await p.reload(); await p.waitForTimeout(1500);
  s = await state(p); ok(`${tag} basket survives reload`, s.lines.length === 4);
  ok(`${tag} nav shows count`, (await text(p, '#bkCount')) === '4');
  // tampered basket in storage: negative + fractional units are flagged, check refuses
  await p.evaluate(() => { const k = JSON.parse(localStorage.getItem('nn-basket-v1')); k.lines.push({ type: 'item', id: 'bad', productId: 'cashews', units: -2 }, { type: 'item', id: 'bad2', productId: 'cashews', units: 1.5 }); localStorage.setItem('nn-basket-v1', JSON.stringify(k)); });
  await p.reload(); await p.waitForTimeout(1500); await p.click('#bkOpen'); await p.waitForTimeout(300);
  ok(`${tag} bad amounts flagged in plain English`, /more than zero/.test(await text(p, '#bkWarn')) && /\+ and − buttons/.test(await text(p, '#bkWarn')));
  await p.click('label.pk-store:has(input[value="dh"])'); await p.selectOption('#pkTime', { index: 1 }); await p.click('#ckBtn'); await p.waitForSelector('#ckResult.no', { timeout: 5000 });
  ok(`${tag} server refuses tampered basket`, /more than zero/.test(await text(p, '#ckResult')));
  ok(`${tag} no console errors`, !p.errs.length, p.errs.join(' | '));
  await p.context().close();

  // late evening: 8:45 PM store time → no same-day slot (30 min prep), tomorrow offered from 9 AM
  const late = await page(vp, 8791, mobile, Date.parse('2026-10-15T00:45:00Z'));
  await late.evaluate(() => { localStorage.setItem('nn-basket-v1', JSON.stringify({ lines: [{ type: 'item', id: 'a', productId: 'cashews', units: 1 }] })); }); await late.reload(); await late.waitForTimeout(1200);
  await late.click('#bkOpen'); await late.click('label.pk-store:has(input[value="dh"])'); await late.waitForTimeout(200);
  const days = await late.$$eval('.pk-day', d => d.map(x => [x.disabled, x.textContent]));
  ok(`${tag} 8:45 PM: today disabled, tomorrow selected from 9 AM`, days[0][0] === true && /No pickup times left/.test(days[0][1]) && (await late.$eval('#pkTime option:nth-child(2)', o => o.textContent)) === '9 AM', JSON.stringify(days));
  await late.screenshot({ path: `${OUT}/${tag}-5-late.png` });
  await late.context().close();

  // the real catalog: no prices online yet → honest "priced at the counter", check explains why it can't be paid online
  const real = await page(vp, 8790, mobile, T);
  await real.click('#oCats [data-id="nuts"]').catch(() => {}); await real.evaluate(() => document.querySelector('#order').scrollIntoView());
  await real.click('.pcard[data-id="cashews"] [data-act="add"]'); await real.click('#bkOpen'); await real.waitForTimeout(300);
  ok(`${tag} real catalog: no invented prices`, /Priced at the counter/.test(await text(real, '#bkSum')) && /Price coming soon/.test(await text(real, '.pcard[data-id="cashews"]')));
  await real.click('label.pk-store:has(input[value="ap"])'); await real.selectOption('#pkTime', { index: 1 }); await real.click('#ckBtn'); await real.waitForSelector('#ckResult.no', { timeout: 5000 });
  ok(`${tag} real catalog: check explains online payment not possible yet`, /don't have an online price yet/.test(await text(real, '#ckResult')) && /isn't switched on yet/.test(await text(real, '#payNote')) && await real.$eval('#payBtn', b => b.disabled));
  ok(`${tag} real catalog: no console errors`, !real.errs.length, real.errs.join(' | '));
  await real.close();
}
await b.close();
results.forEach(r => console.log(r[0], r[1], r[0] === 'FAIL' ? '→ ' + r[2] : ''));
console.log(`\n${results.filter(r => r[0] === 'PASS').length} passed, ${results.filter(r => r[0] === 'FAIL').length} failed`);
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
