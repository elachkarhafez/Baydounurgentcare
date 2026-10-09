/* Nuts Now ordering core: pricing, basket validation and pickup times.
   One file, used by the page (window.NNOrder) and by the server check (api/quote.js), so the two can never
   disagree about a price or a pickup slot.

   Weights are whole numbers of UNITS. 1 unit = 1/4 lb, so 0.75 lb is 3 units and floats never pile up.
   Money is whole cents. Rounding policy: each line is priced on its own as pricePerLbCents × units ÷ 4,
   rounded half up to the cent; a mix's subtotal and the basket subtotal are sums of already-rounded lines.
   Products are never averaged or priced at another product's rate.

   Pickup times are worked out in the store's time zone (settings.pickup.timeZone), never the browser's. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NNOrder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const UNITS_PER_LB = 4;

  /* ---------- catalog ---------- */
  function index(catalog) {
    const byId = {};
    (catalog.products || []).forEach(p => { byId[p.id] = p; });
    return byId;
  }
  // a product's weight/quantity rules, falling back to the store-wide defaults in settings.weight
  function rules(catalog, p) {
    const w = (catalog.settings && catalog.settings.weight) || {};
    const each = p.sellBy === 'each';
    return {
      each,
      min: p.minUnits != null ? p.minUnits : each ? 1 : (w.minUnitsPerProduct != null ? w.minUnitsPerProduct : 1),
      step: p.stepUnits != null ? p.stepUnits : each ? 1 : (w.stepUnits != null ? w.stepUnits : 1),
      max: p.maxUnits != null ? p.maxUnits : (w.maxUnitsPerLine != null ? w.maxUnitsPerLine : null)
    };
  }
  const isWhole = n => typeof n === 'number' && Number.isInteger(n);

  /* ---------- formatting ---------- */
  function fmtWeight(units) {
    const n = Math.round(units), w = Math.floor(n / UNITS_PER_LB), f = ['', '¼', '½', '¾'][n % UNITS_PER_LB];
    return (w ? w + f : (f || '0')) + ' lb';
  }
  const fmtQty = (p, units) => p && p.sellBy === 'each' ? units + (units === 1 ? ' piece' : ' pieces') : fmtWeight(units);
  function fmtMoney(cents) {
    if (cents == null) return '';
    const neg = cents < 0, c = Math.abs(cents);
    return (neg ? '−' : '') + '$' + Math.floor(c / 100).toLocaleString('en-US') + '.' + String(c % 100).padStart(2, '0');
  }
  const priceLabel = p => p.priceCents == null ? null : fmtMoney(p.priceCents) + (p.sellBy === 'each' ? ' each' : ' / lb');

  /* ---------- pricing ---------- */
  // cents for one product at a quantity; null when the product has no price yet
  function lineCents(p, units) {
    if (!p || p.priceCents == null) return null;
    if (p.sellBy === 'each') return p.priceCents * units;
    return Math.floor((p.priceCents * units * 2 + UNITS_PER_LB) / (UNITS_PER_LB * 2)); // round half up
  }
  // check one product + quantity against its rules; returns an error string in plain English, or null
  function checkQty(catalog, p, units, inMix) {
    if (!p) return 'This item is no longer on our menu.';
    if (p.available === false) return `${p.name} isn't available right now.`;
    if (inMix && !p.mixable) return `${p.name} can't go in a mix.`;
    if (!isWhole(units)) return `${p.name}: please choose the amount with the + and − buttons.`;
    const r = rules(catalog, p);
    if (units <= 0) return `${p.name}: the amount has to be more than zero.`;
    if (units < r.min) return `${p.name}: the smallest amount is ${fmtQty(p, r.min)}.`;
    if (units % r.step) return `${p.name}: please choose the amount in steps of ${fmtQty(p, r.step)}.`;
    if (r.max != null && units > r.max) return `${p.name}: the most we can take online is ${fmtQty(p, r.max)}. Call the shop for bigger orders.`;
    return null;
  }
  // + / − one step, respecting the minimum (going below it means removing the item: 0)
  function stepQty(catalog, p, units, dir) {
    const r = rules(catalog, p);
    if (dir > 0) { const n = units <= 0 ? r.min : units + r.step; return r.max != null ? Math.min(r.max, n) : n; }
    const n = units - r.step; return n < r.min ? 0 : n;
  }

  /* Price a basket. lines: [{type:'item', id, productId, units} | {type:'mix', id, name, components:[{productId, units}]}]
     Returns every line priced from the catalog (never from the client), plus totals and plain-English errors. */
  function priceBasket(catalog, lines) {
    const byId = index(catalog), errors = [], out = [];
    let subtotal = 0, unpriced = 0, weightUnits = 0;
    const mixSet = (catalog.settings && catalog.settings.mix) || {};
    if (!Array.isArray(lines)) lines = [];
    lines.forEach((L, i) => {
      if (!L || typeof L !== 'object') { errors.push({ line: i, msg: 'One line in your basket is damaged. Please remove it.' }); return; }
      if (L.type === 'mix') {
        const comps = Array.isArray(L.components) ? L.components : [], seen = new Set(), items = [], lineErrs = [];
        let cents = 0, missing = 0, units = 0;
        comps.forEach(c => {
          const p = byId[c && c.productId], err = checkQty(catalog, p, c && c.units, true);
          if (err) lineErrs.push(err);
          if (p && seen.has(p.id)) lineErrs.push(`${p.name} is listed twice in ${L.name || 'this mix'}.`);
          if (p) seen.add(p.id);
          const lc = err ? null : lineCents(p, c.units);
          if (!err) { units += c.units; if (lc == null) missing++; else cents += lc; }
          items.push({ productId: c && c.productId, name: p ? p.name : 'Unknown item', units: c && c.units, qty: p && !err ? fmtQty(p, c.units) : '', unitPrice: p ? p.priceCents : null, cents: lc, error: err });
        });
        if (!comps.length) lineErrs.push(`${L.name || 'This mix'} is empty.`);
        else if (mixSet.minTotalUnits && units < mixSet.minTotalUnits) lineErrs.push(`${L.name || 'This mix'} needs at least ${fmtWeight(mixSet.minTotalUnits)} in total.`);
        if (mixSet.maxTotalUnits && units > mixSet.maxTotalUnits) lineErrs.push(`${L.name || 'This mix'} is over the ${fmtWeight(mixSet.maxTotalUnits)} limit for one mix.`);
        lineErrs.forEach(msg => errors.push({ line: i, msg }));
        weightUnits += units; unpriced += missing;
        const priced = !missing && !lineErrs.length;
        if (priced) subtotal += cents;
        out.push({ type: 'mix', id: L.id, name: L.name || 'Custom mix', units, weight: fmtWeight(units), components: items, cents: priced ? cents : null, pricedCents: cents, missingPrices: missing, errors: lineErrs });
      } else {
        const p = byId[L.productId], err = checkQty(catalog, p, L.units, false), lc = err ? null : lineCents(p, L.units);
        if (err) errors.push({ line: i, msg: err });
        if (!err && p.sellBy !== 'each') weightUnits += L.units;
        if (!err && lc == null) unpriced++;
        if (lc != null) subtotal += lc;
        out.push({ type: 'item', id: L.id, productId: L.productId, name: p ? p.name : 'Unknown item', units: L.units, qty: p && !err ? fmtQty(p, L.units) : '', unitPrice: p ? p.priceCents : null, cents: lc, errors: err ? [err] : [] });
      }
    });
    return { lines: out, subtotalCents: subtotal, unpricedCount: unpriced, complete: !unpriced && !errors.length && out.length > 0, weightUnits, errors };
  }

  /* ---------- store-local time ---------- */
  const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function zoned(ms, tz) {
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' })
      .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, dow: DOW[p.weekday], date: `${p.year}-${p.month}-${p.day}` };
  }
  const offset = (ms, tz) => { const z = zoned(ms, tz); return Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s) - Math.floor(ms / 1000) * 1000; };
  // local wall-clock time (date 'YYYY-MM-DD', minutes after midnight) in tz → UTC milliseconds (DST-safe)
  function zonedToUtc(date, minutes, tz) {
    const [y, m, d] = date.split('-').map(Number), guess = Date.UTC(y, m - 1, d, 0, minutes);
    let t = guess - offset(guess, tz); const o2 = offset(t, tz);
    if (guess - o2 !== t) t = guess - o2;
    return t;
  }
  const addDays = (date, n) => { const [y, m, d] = date.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
  const dowOf = date => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
  function fmtClock(min) { const h = Math.floor(min / 60) % 24, m = min % 60, ap = h >= 12 ? 'PM' : 'AM', hh = ((h + 11) % 12) + 1; return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`; }

  function store(catalog, id) { return (catalog.stores || []).find(s => s.id === id) || null; }
  // a store's hours on a local date: { open, close, lastPickup } in minutes, or null when closed
  function dayHours(catalog, s, date) {
    if (!s) return null;
    const closures = [].concat((catalog.settings.pickup && catalog.settings.pickup.closures) || [], s.closures || []);
    if (closures.includes(date)) return null;
    const h = s.hours && s.hours[String(dowOf(date))];
    if (!h) return null;
    const open = toMin(h.open), close = toMin(h.close), last = Math.min(close, toMin(h.lastPickup || h.close));
    return { open, close, lastPickup: last };
  }
  // every pickup time customers may choose on a date, given the time now
  function pickupSlots(catalog, storeId, date, nowMs) {
    const P = catalog.settings.pickup, tz = P.timeZone, s = store(catalog, storeId), hrs = dayHours(catalog, s, date);
    if (!hrs) return [];
    const today = zoned(nowMs, tz).date, ahead = P.daysAhead || 1;
    if (date < today || date > addDays(today, ahead - 1)) return [];
    const slot = P.slotMinutes || 15, prep = P.prepMinutes || 0, earliestMs = nowMs + prep * 60000, out = [];
    for (let m = hrs.open + (P.firstPickupAfterOpenMinutes || 0); m <= hrs.lastPickup; m += slot) {
      if (m % slot) continue;
      const at = zonedToUtc(date, m, tz);
      if (at < earliestMs) continue;
      out.push({ at: new Date(at).toISOString(), date, minutes: m, label: fmtClock(m) });
    }
    return out;
  }
  // the dates to offer (store-local), each with its hours and slots
  function pickupDays(catalog, storeId, nowMs) {
    const P = catalog.settings.pickup, today = zoned(nowMs, P.timeZone).date, s = store(catalog, storeId), out = [];
    for (let i = 0; i < (P.daysAhead || 1); i++) {
      const date = addDays(today, i), hrs = dayHours(catalog, s, date);
      const [y, m, d] = date.split('-').map(Number), name = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
      out.push({ date, label: (i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : '') + name, hours: hrs && { open: fmtClock(hrs.open), close: fmtClock(hrs.close), lastPickup: fmtClock(hrs.lastPickup) }, slots: pickupSlots(catalog, storeId, date, nowMs) });
    }
    return out;
  }
  // re-check a chosen time against the rules right now
  function checkPickup(catalog, pick, nowMs) {
    if (!pick || !pick.store || !pick.at) return { ok: false, reason: 'Please choose a pickup shop and time.' };
    const s = store(catalog, pick.store);
    if (!s) return { ok: false, reason: 'Please choose one of our two shops for pickup.' };
    const t = Date.parse(pick.at);
    if (!isFinite(t)) return { ok: false, reason: 'That pickup time is not valid. Please choose it again.' };
    const z = zoned(t, catalog.settings.pickup.timeZone), min = z.h * 60 + z.mi, hrs = dayHours(catalog, s, z.date);
    if (!hrs) return { ok: false, reason: `${s.name} is closed that day. Please choose another day.` };
    if (min > hrs.lastPickup) return { ok: false, reason: `The last pickup at ${s.name} is ${fmtClock(hrs.lastPickup)}. Please choose an earlier time.` };
    const ok = pickupSlots(catalog, s.id, z.date, nowMs).some(x => Date.parse(x.at) === t);
    if (!ok && t <= nowMs) return { ok: false, reason: 'That pickup time has already passed. Please choose a new one.' };
    if (!ok) return { ok: false, reason: t < nowMs + (catalog.settings.pickup.prepMinutes || 0) * 60000 ? 'That time is too soon for us to get your order ready. Please choose a later time.' : 'That pickup time is no longer available. Please choose another.' };
    return { ok: true, store: s.id, storeName: s.name, label: `${fmtClock(min)} on ${new Date(Date.UTC(z.y, z.m - 1, z.d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })}`, at: new Date(t).toISOString() };
  }

  /* The full check the server runs before anything can be paid for. clientTotalCents is only compared,
     never trusted: if it differs from the catalog total the customer is told prices changed. */
  function quote(catalog, req, nowMs) {
    const body = req || {}, priced = priceBasket(catalog, body.lines), pickup = checkPickup(catalog, body.pickup, nowMs);
    const priceChanged = body.clientTotalCents != null && body.clientTotalCents !== priced.subtotalCents;
    const co = catalog.settings.checkout || {};
    return {
      ok: priced.complete && pickup.ok && !priceChanged,
      ...priced, pickup, priceChanged,
      checkout: { available: !!co.provider && co.enabled === true, provider: co.provider || null, message: co.unavailableMessage || 'Online payment is not switched on yet.' }
    };
  }

  return { UNITS_PER_LB, index, rules, fmtWeight, fmtQty, fmtMoney, priceLabel, lineCents, checkQty, stepQty, priceBasket, zoned, zonedToUtc, addDays, fmtClock, dayHours, pickupSlots, pickupDays, checkPickup, quote, store };
});
