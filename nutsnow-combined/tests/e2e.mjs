// Browser test of the shopping journeys (Playwright, installed globally for site QA). Real catalog, real prices.
// Needs the local server with a fixed store clock (so pickup times are predictable) and the pretend couriers:
//   NN_FAKE_COURIERS=1 node tests/serve.js 8791 "" 2026-10-14T20:50:00Z      (Wednesday 4:50 PM in Detroit)
// usage: node tests/e2e.mjs <outDir> [port]
import path from 'path'; import { execSync } from 'child_process';
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs'));
const OUT = process.argv[2] || '/tmp', PORT = +process.argv[3] || 8791, BASE = `http://127.0.0.1:${PORT}`, results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
const T = Date.parse('2026-10-14T20:50:00Z');
const b = await chromium.launch();
async function page(vp, mobile) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'], timezoneId: 'Asia/Tokyo' });
  await ctx.addInitScript(t => { const _now = Date.now, off = t - _now(); Date.now = () => _now() + off; const D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [_now() + off])); } static now() { return _now() + off; } }; try { sessionStorage.setItem('nn-intro', '1'); } catch (e) {} }, T);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/favicon/.test(m.text()) && p.errs.push(m.text()));
  return p;
}
const go = async (p, u) => { await p.goto(BASE + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); };
const bag = p => p.evaluate(() => JSON.parse(localStorage.getItem('nn-bag-v2') || '{"lines":[]}').lines);
const N2 = (sub, add) => '$' + ((Math.round(parseFloat(sub.replace(/[^\d.]/g, '')) * 100) + add) / 100).toFixed(2);
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

for (const [tag, vp, mobile] of [['d', { width: 1440, height: 900 }, false], ['m', { width: 390, height: 844 }, true]]) {
  const p = await page(vp, mobile);
  // home
  await go(p, '/');
  ok(`${tag} home: order + find-a-store calls to action`, await p.$('.hero a[href="/shop/"]') && await p.$('.hero a[href="/stores/"]'));
  ok(`${tag} home: shop status shows open/closed`, /Open now|Opens|Closed/.test(await p.textContent('.store-cards')), (await p.textContent('.store-cards')).replace(/\s+/g, ' ').slice(0, 120));
  ok(`${tag} home: big shop-everything block in the hero`, (await p.getAttribute('.hero .shopall', 'href')) === '/shop/' && /707 items/.test(await p.textContent('.hero .shopall')));
  ok(`${tag} home: real Google rating shown`, /4\.9/.test(await p.textContent('.proof')));
  ok(`${tag} home: no horizontal scroll`, !(await overflow(p)));
  ok(`${tag} home: pickup shop defaults to Allen Park`, (await p.textContent('.store-switch [data-store-name]')).trim() === 'Allen Park');
  await p.click('.store-switch'); await p.waitForTimeout(250); await p.check('input[name=pickstore][value=dh]'); await p.waitForTimeout(500);
  ok(`${tag} store picker: Dearborn Heights saved and shown`, await p.evaluate(() => localStorage.getItem('nn-store')) === 'dh' && (await p.textContent('.store-switch [data-store-name]')).trim() === 'Dearborn Heights' && !(await p.isVisible('#storeSheet .picker')));
  // homepage navigation: quick links, aisle tiles with shortcut chips, quick shop tabs
  ok(`${tag} home: four quick links + ten aisle tiles + shortcut chips`, (await p.$$eval('.qnav .qn', x => x.length)) === 4 && (await p.$$eval('.depts .dept', x => x.length)) === 10 && (await p.getAttribute('.dept-subs a', 'href')).includes('?type='));
  await p.click('#qs-t-candy'); await p.waitForTimeout(250);
  ok(`${tag} home: quick shop tab switches aisle`, await p.isVisible('#qs-p-candy .card') && !(await p.isVisible('#qs-p-popular')) && (await p.getAttribute('#qs-t-candy', 'aria-selected')) === 'true');
  await p.locator('#qs-p-candy .card [data-add]').first().click(); await p.waitForTimeout(400);
  ok(`${tag} home: add from quick shop`, (await bag(p)).length === 1);
  await p.evaluate(() => localStorage.removeItem('nn-bag-v2')); await go(p, '/');
  // aisle transition: pieces cover the screen, the aisle opens, the overlay clears
  await p.evaluate(() => { sessionStorage.removeItem('nn-tx'); });
  const tile = p.locator('.aisle[href="/shop/candy/"], a[href="/shop/candy/"]').first(); await tile.scrollIntoViewIfNeeded();
  await tile.click(); await p.waitForTimeout(250);
  const covered = await p.evaluate(() => !!document.querySelector('.tx canvas') && !!document.querySelector('.tx-logo'));
  await p.waitForURL('**/shop/candy/'); await p.waitForTimeout(1600);
  ok(`${tag} aisle transition: logo + pieces, then the aisle opens clean`, covered && p.url().endsWith('/shop/candy/') && await p.$$eval('.tx', x => x.length) === 0 && !(await p.evaluate(() => document.documentElement.classList.contains('nn-tx'))));
  await go(p, '/');
  ok(`${tag} language link goes to the Arabic page`, (await p.getAttribute('.topbar .lang', 'href')) === '/ar/');
  // aisle page: filter + sort
  await go(p, '/shop/nuts-seeds/');
  const all = await p.$$eval('#plist .card:not([hidden])', x => x.length);
  await p.click('[data-sub="Cashews"]'); await p.waitForTimeout(200);
  const cash = await p.$$eval('#plist .card:not([hidden])', x => x.map(c => JSON.parse(c.dataset.p).name));
  ok(`${tag} aisle: Cashews chip filters (${all} → ${cash.length})`, cash.length > 20 && cash.length < all && cash.every(n => /cashew/i.test(n)));
  await p.selectOption('#sort', 'price'); await p.waitForTimeout(200);
  const prices = await p.$$eval('#plist .card:not([hidden])', x => x.map(c => JSON.parse(c.dataset.p).priceCents ?? 1e9));
  ok(`${tag} aisle: sort by price`, prices.every((v, i) => !i || v >= prices[i - 1]));
  ok(`${tag} aisle: filter kept in the URL`, p.url().includes('type=Cashews'));
  // add ½ lb Grilled Cashews from its card
  await p.click('[data-sub=""]');
  const card = p.locator('#plist .card', { hasText: 'Grilled Cashews' }).first();
  await card.locator('[data-add]').click(); await p.waitForTimeout(500);
  let L = await bag(p);
  ok(`${tag} card add: ½ lb Grilled Cashews in the bag`, L.length === 1 && L[0].productId === 'nn-c0510' && L[0].units === 2);
  ok(`${tag} bag count updates`, (await p.textContent('[data-bag-count]')).trim() === '1');
  if (mobile) ok('m bag bar shows $7.00', /\$7\.00/.test(await p.textContent('.bagbar')) && await p.isVisible('.bagbar'));
  // price-in-store items can't be added
  await go(p, '/shop/dried-fruit-dates/');
  const ask = p.locator('#plist .card', { hasText: 'Biscoff Stuffed Dates' }).first();
  ok(`${tag} unpriced item: "Price in store", no Add`, /Price in store/.test(await ask.textContent()) && await ask.locator('[data-add]').count() === 0);
  // product page: 1 lb Bubs skulls
  await go(p, '/product/bubs-sour-bubblegum-skulls/');
  await p.click('.qty-box .wts button[data-u="4"]'); await p.waitForTimeout(150);
  ok(`${tag} product page: 1 lb total $13.99`, (await p.textContent('#qtyTotal')).trim() === '$13.99');
  await p.click('[data-q-step="1"]'); await p.waitForTimeout(100);
  ok(`${tag} product page: + gives 1¼ lb $17.49`, (await p.textContent('#qtyOut')).includes('1¼') && (await p.textContent('#qtyTotal')).trim() === '$17.49');
  await p.click('.addbig'); await p.waitForTimeout(400);
  L = await bag(p);
  ok(`${tag} product page add: 1¼ lb skulls`, L.some(l => l.productId === 'nn-c0212' && l.units === 5));
  // each-priced product
  await go(p, '/product/zaki-dubai-chocolate-bar-220g/');
  await p.click('[data-q-step="1"]'); await p.click('.addbig'); await p.waitForTimeout(300);
  L = await bag(p);
  ok(`${tag} piece item: 2 Zaki bars`, L.some(l => l.productId === 'nn-c0324' && l.units === 2));
  // bag drawer: totals, step, mix
  await p.click('.hdr [data-open="bagSheet"]'); await p.waitForTimeout(300);
  const tot = (await p.textContent('#bagTotal')).trim();
  ok(`${tag} bag total $7.00 + $17.49 + $13.98 = $38.47`, tot === '$38.47', tot);
  await p.locator('[data-line]', { hasText: 'Grilled Cashews' }).locator('[data-step="1"]').click(); await p.waitForTimeout(150);
  ok(`${tag} bag +: cashews ¾ lb ($10.49)`, /¾ lb/.test(await p.locator('[data-line]', { hasText: 'Grilled Cashews' }).textContent()) && (await p.textContent('#bagTotal')).trim() === '$41.96');
  const mixes = p.locator('[data-mix]'); ok(`${tag} bag: mix option only on by-weight mixables`, await mixes.count() === 2);
  await mixes.nth(0).check(); await mixes.nth(1).check(); await p.waitForTimeout(150);
  const sl = await p.evaluate(() => window.NN.serverLines());
  ok(`${tag} bag: ticked items go as one mixed bag`, sl.some(l => l.type === 'mix' && l.components.length === 2));
  await p.click('#bagSheet [data-close]');
  // search
  await p.click('.hdr [data-open="searchSheet"]'); await p.fill('#searchInput', 'dubai'); await p.waitForTimeout(900);
  const hits = await p.$$eval('#searchRes .s-row', x => x.length);
  ok(`${tag} search: "dubai" finds Dubai items (${hits})`, hits >= 8);
  await p.fill('#searchInput', 'zaatar cashew'); await p.waitForTimeout(300);
  ok(`${tag} search: "zaatar cashew" finds Za'atar Cashews`, /Za'atar Cashews/.test(await p.textContent('#searchRes')));
  await p.click('#searchRes .s-row'); await p.waitForLoadState('networkidle');
  ok(`${tag} search: result opens the product page`, p.url().includes('/product/'));
  // menu (phone)
  if (mobile) { await p.click('.menu-btn'); await p.waitForTimeout(300); ok('m menu: aisles + stores + calls', await p.isVisible('#menuSheet .m-cats') && /Stores/.test(await p.textContent('#menuSheet')) && await p.$$eval('#menuSheet a[href^="tel:"]', x => x.length) === 2); await p.click('#menuSheet [data-close]'); }
  // checkout: missing details are caught, then a real order is checked by the server
  await go(p, '/checkout/');
  ok(`${tag} checkout: summary lists the bag`, (await p.$$eval('#coSum .line', x => x.length)) === 2, String(await p.$$eval('#coSum .line', x => x.length)));
  ok(`${tag} checkout: shop picked in the header is preselected`, await p.isChecked('input[name=store][value=dh]'));
  await p.check('input[name=store][value=dh]'); await p.waitForTimeout(200);
  ok(`${tag} checkout: ASAP is 5:30 PM at 4:50 PM (30 min prep)`, /5:30 PM/.test(await p.textContent('#coTimes')), (await p.textContent('#coTimes')).replace(/\s+/g, ' ').slice(0, 140));
  await p.click('#coPlace'); await p.waitForTimeout(200);
  ok(`${tag} checkout: asks for name and phone`, /name/.test(await p.textContent('#coMsg')) && /mobile/.test(await p.textContent('#coMsg')));
  await p.check('input[name=when][value=later]'); await p.waitForTimeout(150);
  const slots = await p.$$eval('[data-at]', x => x.map(s => s.textContent.trim()));
  ok(`${tag} checkout: Dearborn Heights times stop at the 9 PM last pickup`, slots[slots.length - 1] === '9 PM' && !slots.includes('9:15 PM'), slots.slice(-3).join(','));
  await p.click('[data-at]:last-child'); await p.fill('#coName', 'Test Customer'); await p.fill('#coPhone', '(313) 555-0100');
  await p.click('#coPlace'); await p.waitForTimeout(1500);
  const done = await p.textContent('#checkout');
  ok(`${tag} checkout: server-checked order ready to send`, /Send it to Dearborn Heights/.test(done) && /9 PM on Wednesday/.test(done) && /Not paid yet/.test(done), done.replace(/\s+/g, ' ').slice(0, 200));
  ok(`${tag} checkout: call link to the right shop`, await p.$('a[href="tel:+13133952684"]') !== null);
  await p.screenshot({ path: `${OUT}/e2e-${tag}-done.png` });
  // delivery: live courier prices, cheapest first, fee in the total
  await go(p, '/checkout/');
  await p.check('input[name=mode][value=delivery]'); await p.waitForTimeout(200);
  ok(`${tag} delivery: address step replaces pickup times`, await p.isVisible('#coAddrStep') && !(await p.isVisible('#coWhenStep')) && /Deliver from which shop/.test(await p.textContent('#coWhichH')));
  await p.click('#coQuote'); await p.waitForTimeout(200);
  ok(`${tag} delivery: asks for the address first`, /ZIP/.test(await p.textContent('#coQuotes')));
  await p.fill('#adStreet', '22000 Michigan Ave'); await p.fill('#adCity', 'Dearborn'); await p.fill('#adZip', '48124');
  await p.click('#coQuote'); await p.waitForTimeout(1200);
  const qs = await p.$$eval('input[name=courier]', x => x.map(i => [i.value, i.checked]));
  ok(`${tag} delivery: DoorDash and Uber prices, cheapest picked`, qs.length === 2 && qs[0][0] === 'uber' && qs[0][1] && /\$8\.49/.test(await p.textContent('#coQuotes')) && /\$9\.75/.test(await p.textContent('#coQuotes')), JSON.stringify(qs));
  const sub = await p.textContent('#coTotal');
  ok(`${tag} delivery: fee and total in the summary`, /\$8\.49/.test(await p.textContent('#coFees')) && (await p.textContent('#coFees')).includes(N2(sub, 849)), (await p.textContent('#coFees')).replace(/\s+/g, ' '));
  await p.check('input[name=courier][value=doordash]'); await p.waitForTimeout(150);
  await p.click('#coPlace'); await p.waitForTimeout(1500);
  const dd = await p.textContent('#checkout');
  ok(`${tag} delivery: order handed to the shop with courier, address and "Not paid yet"`, /DELIVERY order/.test(dd) && /Courier: DoorDash quote \$9\.75/.test(dd) && /Deliver to: 22000 Michigan Ave, Dearborn, MI 48124/.test(dd) && /Not paid yet/.test(dd), dd.replace(/\s+/g, ' ').slice(0, 240));
  // Arabic
  await go(p, '/ar/');
  ok(`${tag} arabic: right-to-left page with the shop still picked`, await p.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar') && (await p.textContent('.store-switch [data-store-name]')).trim() === 'ديربورن هايتس');
  ok(`${tag} arabic: no horizontal scroll`, !(await overflow(p)));
  await p.click('.hdr [data-open="searchSheet"]'); await p.fill('#searchInput', 'كاجو'); await p.waitForTimeout(900);
  ok(`${tag} arabic: search in Arabic finds cashews`, (await p.$$eval('#searchRes .s-row', x => x.length)) >= 10 && (await p.getAttribute('#searchRes .s-row', 'href')).startsWith('/ar/product/'));
  await p.click('#searchSheet [data-close]');
  await go(p, '/ar/checkout/');
  ok(`${tag} arabic checkout: remembers delivery was chosen`, await p.isChecked('input[name=mode][value=delivery]'));
  await p.check('input[name=mode][value=pickup]'); await p.waitForTimeout(200);
  ok(`${tag} arabic checkout: Arabic times`, /م/.test(await p.textContent('#coTimes')) && /بأسرع وقت/.test(await p.textContent('#coTimes')));
  ok(`${tag} arabic checkout: no horizontal scroll`, !(await overflow(p)));
  // stores page
  await go(p, '/stores/');
  ok(`${tag} stores: both shops, hours, directions`, (await p.$$eval('.store', x => x.length)) === 2 && (await p.$$eval('a[href*="google.com/maps/dir"]', x => x.length)) >= 2);
  ok(`${tag} no console errors`, !p.errs.length, p.errs.slice(0, 3).join(' | '));
  await p.context().close();
}
await b.close();
results.forEach(r => console.log(r[0], r[1], r[2] ? '→ ' + r[2] : ''));
const f = results.filter(r => r[0] === 'FAIL').length; console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
