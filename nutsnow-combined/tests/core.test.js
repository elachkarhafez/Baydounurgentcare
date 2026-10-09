// Unit tests for js/order-core.js and api/quote.js. Run: node --test tests/
// Prices below are ILLUSTRATIVE test fixtures only, never real Nuts Now prices.
const test = require('node:test'), assert = require('node:assert/strict');
const core = require('../js/order-core.js');
const real = require('../data/catalog.json');

const fixture = (over = {}) => {
  const c = JSON.parse(JSON.stringify(real));
  const set = { cashews: 1200, bbq: 1600, pistachios: 2000, hazelnuts: 1200, gummies: 799, delight: 1333 };
  c.products.forEach(p => { if (set[p.id] != null) p.priceCents = set[p.id]; });
  c.products.push({ id: 'baklava-test', category: 'sweets', name: 'Baklava (test)', sellBy: 'each', priceCents: 250, available: true, mixable: false, images: [] });
  return Object.assign(c, over);
};
const C = fixture();
const item = (productId, units) => ({ type: 'item', id: 'x', productId, units });
const mix = (components, name = 'Mix #1') => ({ type: 'mix', id: 'm', name, components });

test('pricing: single products at ¼, ½, 1 lb', () => {
  assert.equal(core.priceBasket(C, [item('cashews', 1)]).subtotalCents, 300);
  assert.equal(core.priceBasket(C, [item('cashews', 2)]).subtotalCents, 600);
  assert.equal(core.priceBasket(C, [item('cashews', 4)]).subtotalCents, 1200);
});
test('pricing: two same-priced products', () => {
  const r = core.priceBasket(C, [mix([{ productId: 'cashews', units: 2 }, { productId: 'hazelnuts', units: 1 }])]);
  assert.equal(r.subtotalCents, 900); assert.equal(r.weightUnits, 3);
});
test('pricing: the worked example from the brief (A ½ lb @12, B ¼ lb @16, C ¾ lb @20)', () => {
  const r = core.priceBasket(C, [mix([{ productId: 'cashews', units: 2 }, { productId: 'bbq', units: 1 }, { productId: 'pistachios', units: 3 }])]);
  assert.deepEqual(r.lines[0].components.map(c => c.cents), [600, 400, 1500]);
  assert.equal(r.subtotalCents, 2500); assert.equal(r.weightUnits, 6); assert.equal(core.fmtWeight(r.weightUnits), '1½ lb');
  assert.equal(core.fmtMoney(r.subtotalCents), '$25.00');
});
test('pricing: each product priced at its own rate, never averaged', () => {
  const r = core.priceBasket(C, [mix([{ productId: 'cashews', units: 1 }, { productId: 'pistachios', units: 1 }])]);
  assert.equal(r.subtotalCents, 300 + 500);
});
test('pricing: removing or editing an item updates the total', () => {
  const full = core.priceBasket(C, [item('cashews', 4), item('bbq', 2)]).subtotalCents;
  assert.equal(full, 1200 + 800);
  assert.equal(core.priceBasket(C, [item('cashews', 4)]).subtotalCents, 1200);
  assert.equal(core.priceBasket(C, [item('cashews', 3), item('bbq', 2)]).subtotalCents, 900 + 800);
});
test('pricing: rounding is half-up per line, then summed', () => {
  // $7.99/lb × ¼ = 199.75 → 200; $13.33/lb × ¼ = 333.25 → 333; × ½ = 666.5 → 667
  assert.equal(core.lineCents(C.products.find(p => p.id === 'gummies'), 1), 200);
  assert.equal(core.lineCents(C.products.find(p => p.id === 'delight'), 1), 333);
  assert.equal(core.lineCents(C.products.find(p => p.id === 'delight'), 2), 667);
  assert.equal(core.priceBasket(C, [mix([{ productId: 'gummies', units: 1 }, { productId: 'delight', units: 1 }])]).subtotalCents, 533);
});
test('pricing: per-piece products', () => {
  assert.equal(core.priceBasket(C, [item('baklava-test', 3)]).subtotalCents, 750);
  assert.match(core.checkQty(C, C.products.find(p => p.id === 'baklava-test'), 1, true), /can't go in a mix/);
});
test('validation: invalid, negative, fractional and oversize amounts are rejected', () => {
  for (const u of [0, -1, 1.5, 0.25, NaN, '2', null]) assert.ok(core.priceBasket(C, [item('cashews', u)]).errors.length, `units ${u}`);
  assert.ok(core.priceBasket(C, [item('cashews', 401)]).errors.length);
  const strict = fixture(); strict.products.find(p => p.id === 'cashews').minUnits = 2; strict.products.find(p => p.id === 'cashews').stepUnits = 2;
  assert.match(core.priceBasket(strict, [item('cashews', 1)]).errors[0].msg, /smallest amount is ½ lb/);
  assert.match(core.priceBasket(strict, [item('cashews', 3)]).errors[0].msg, /steps of ½ lb/);
});
test('validation: unavailable, unknown and unpriced products', () => {
  const c = fixture(); c.products.find(p => p.id === 'bbq').available = false;
  assert.match(core.priceBasket(c, [item('bbq', 1)]).errors[0].msg, /isn't available/);
  assert.match(core.priceBasket(C, [item('nope', 1)]).errors[0].msg, /no longer on our menu/);
  const r = core.priceBasket(C, [item('walnuts', 1)]); // no price yet
  assert.equal(r.errors.length, 0); assert.equal(r.unpricedCount, 1); assert.equal(r.complete, false);
});
test('mixes stay separate and validate as a group', () => {
  const r = core.priceBasket(C, [mix([{ productId: 'cashews', units: 1 }], 'Mix #1'), mix([{ productId: 'cashews', units: 1 }], 'Mix #2')]);
  assert.equal(r.lines.length, 2); assert.equal(r.subtotalCents, 600);
  assert.match(core.priceBasket(C, [mix([])]).errors[0].msg, /empty/);
  assert.match(core.priceBasket(C, [mix([{ productId: 'cashews', units: 1 }, { productId: 'cashews', units: 1 }])]).errors[0].msg, /twice/);
  const c = fixture(); c.settings.mix.minTotalUnits = 4;
  assert.match(core.priceBasket(c, [mix([{ productId: 'cashews', units: 1 }])]).errors[0].msg, /at least 1 lb/);
});
test('stepQty: + and − respect min and step; below min removes', () => {
  const p = C.products.find(x => x.id === 'cashews');
  assert.equal(core.stepQty(C, p, 0, 1), 1); assert.equal(core.stepQty(C, p, 1, 1), 2); assert.equal(core.stepQty(C, p, 1, -1), 0);
});

/* ---------- pickup ---------- */
const DET = 'America/Detroit';
const at = (date, hhmm) => core.zonedToUtc(date, +hhmm.slice(0, 2) * 60 + +hhmm.slice(3), DET);
const iso = ms => new Date(ms).toISOString();
const DH = 'dh', DAY = '2026-10-14'; // a Wednesday: Dearborn Heights 9 AM – 10 PM, last pickup 9 PM

test('pickup: 8:45 and 9:00 PM are allowed with time to prepare', () => {
  const now = at(DAY, '12:00');
  assert.ok(core.checkPickup(C, { store: DH, at: iso(at(DAY, '20:45')) }, now).ok);
  assert.ok(core.checkPickup(C, { store: DH, at: iso(at(DAY, '21:00')) }, now).ok);
});
test('pickup: 9:15, 9:30 and 10:00 PM are rejected, and never offered', () => {
  const now = at(DAY, '12:00');
  for (const t of ['21:15', '21:30', '21:45', '22:00']) assert.equal(core.checkPickup(C, { store: DH, at: iso(at(DAY, t)) }, now).ok, false, t);
  const labels = core.pickupSlots(C, DH, DAY, now).map(s => s.label);
  assert.equal(labels[labels.length - 1], '9 PM'); assert.ok(!labels.some(l => /9:(15|30|45) PM|10 PM/.test(l)));
});
test('pickup: preparation time is enforced (8:45 PM order → no 9:00 PM slot with 30 min prep)', () => {
  const now = at(DAY, '20:45');
  assert.deepEqual(core.pickupSlots(C, DH, DAY, now), []);
  assert.equal(core.checkPickup(C, { store: DH, at: iso(at(DAY, '21:00')) }, now).ok, false);
  assert.deepEqual(core.pickupSlots(C, DH, DAY, at(DAY, '20:30')).map(s => s.label), ['9 PM']);
});
test('pickup: ordering after the cutoff (e.g. 9:30 PM) still allows a time tomorrow', () => {
  const now = at(DAY, '21:30'), days = core.pickupDays(C, DH, now);
  assert.equal(days[0].slots.length, 0); assert.equal(days[1].date, '2026-10-15'); assert.equal(days[1].slots[0].label, '9 AM');
});
test('pickup: Allen Park uses its own hours (Sunday last pickup 8 PM)', () => {
  const sun = '2026-10-18', s = core.pickupSlots(C, 'ap', sun, at(sun, '08:00'));
  assert.equal(s[0].label, '10 AM'); assert.equal(s[s.length - 1].label, '8 PM');
});
test('pickup: a time that has passed says so', () => {
  assert.match(core.checkPickup(C, { store: DH, at: iso(at(DAY, '12:00')) }, at(DAY, '15:00')).reason, /already passed/);
  assert.match(core.checkPickup(C, { store: DH, at: iso(at(DAY, '15:15')) }, at(DAY, '15:00')).reason, /too soon/);
});
test('pickup: closures and days too far ahead offer nothing', () => {
  const c = fixture(); c.settings.pickup.closures = [DAY];
  assert.deepEqual(core.pickupSlots(c, DH, DAY, at(DAY, '08:00')), []);
  assert.deepEqual(core.pickupSlots(C, DH, '2026-10-20', at(DAY, '08:00')), []);
});
test('time zone: slots are Detroit wall-clock times, whatever the server clock zone', () => {
  const s = core.pickupSlots(C, DH, DAY, at(DAY, '08:00'));
  assert.equal(s[0].at, '2026-10-14T13:00:00.000Z'); // 9 AM EDT = 13:00 UTC
  assert.equal(core.zoned(Date.parse(s[s.length - 1].at), DET).h, 21);
});
test('daylight saving: both change days give 9 AM–9 PM local, no shifted or invalid slots', () => {
  for (const [day, utc9] of [['2026-03-08', '13:00'], ['2026-11-01', '14:00']]) {
    const s = core.pickupSlots(C, DH, day, at(day, '00:30'));
    assert.equal(s.length, 49, day); // 9:00 → 21:00 every 15 min
    assert.equal(s[0].at, `${day}T${utc9}:00.000Z`);
    s.forEach(x => { const z = core.zoned(Date.parse(x.at), DET); assert.equal(z.date, day); assert.equal(z.h * 60 + z.mi, x.minutes); });
  }
});

/* ---------- server check ---------- */
test('server quote: totals come from the catalog, a tampered client total is flagged', () => {
  const now = at(DAY, '12:00'), pickup = { store: DH, at: iso(at(DAY, '18:00')) };
  const good = core.quote(C, { lines: [item('cashews', 2)], pickup, clientTotalCents: 600 }, now);
  assert.equal(good.ok, true); assert.equal(good.subtotalCents, 600);
  const bad = core.quote(C, { lines: [item('cashews', 2)], pickup, clientTotalCents: 1 }, now);
  assert.equal(bad.ok, false); assert.equal(bad.priceChanged, true); assert.equal(bad.subtotalCents, 600);
});
test('server quote: unavailable products and late pickups block the order', () => {
  const c = fixture(); c.products.find(p => p.id === 'cashews').available = false; const now = at(DAY, '12:00');
  assert.equal(core.quote(c, { lines: [item('cashews', 1)], pickup: { store: DH, at: iso(at(DAY, '18:00')) } }, now).ok, false);
  const late = core.quote(C, { lines: [item('bbq', 1)], pickup: { store: DH, at: iso(at(DAY, '21:15')) } }, now);
  assert.equal(late.ok, false); assert.match(late.pickup.reason, /last pickup .* is 9 PM/);
});
test('server quote: checkout stays off until a provider is configured', () => {
  const q = core.quote(C, { lines: [item('cashews', 1)] }, Date.now());
  assert.equal(q.checkout.available, false);
});
test('api/quote handler: rejects GET and bad bodies, prices from the real catalog', () => {
  const handler = require('../api/quote.js');
  const call = (method, body) => { const r = { code: 0, json: null, headers: {} }; handler({ method, body }, { setHeader: (k, v) => { r.headers[k] = v; }, status(c) { r.code = c; return this; }, json(j) { r.json = j; } }); return r; };
  assert.equal(call('GET').code, 405);
  assert.equal(call('POST', 'nope').code, 400);
  const r = call('POST', { lines: [{ type: 'item', productId: 'cashews', units: 2 }], clientTotalCents: 0 });
  assert.equal(r.code, 200); assert.equal(r.json.ok, false); // real catalog has no prices yet, and no pickup chosen
  assert.equal(r.json.unpricedCount, 1);
});
test('real catalog: every product is well-formed and has an image file', () => {
  const fs = require('fs'), path = require('path'), ids = new Set();
  real.products.forEach(p => {
    assert.ok(!ids.has(p.id), 'duplicate ' + p.id); ids.add(p.id);
    assert.ok(real.categories.some(c => c.id === p.category), p.id);
    assert.ok(p.priceCents === null || Number.isInteger(p.priceCents), p.id);
    p.images.forEach(im => assert.ok(fs.existsSync(path.join(__dirname, '..', im.src)), im.src));
  });
});
