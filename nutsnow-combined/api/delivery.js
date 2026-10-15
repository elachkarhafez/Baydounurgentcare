// /api/delivery: live courier prices for delivery from either shop, from DoorDash Drive and Uber Direct.
//   GET  → which couriers are switched on (no secrets, just true/false)
//   POST { store, address:{street,unit,city,zip}, name, phone, lines } → { quotes:[{provider, feeCents, eta, ...}], errors }
// The keys live only in the Vercel project's environment variables, never in the browser:
//   DoorDash Drive: DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET
//   Uber Direct:    UBER_CLIENT_ID, UBER_CLIENT_SECRET, UBER_CUSTOMER_ID
// Only quotes are asked for here. No courier is booked and nothing is charged: the shop books the courier when it
// confirms the order (or this can call each provider's accept/create step once online payment is switched on).
const crypto = require('crypto');
const core = require('../js/order-core.js');
const catalog = require('../data/catalog.json');

const env = k => (process.env[k] || '').trim();
const has = {
  doordash: () => !!(env('DOORDASH_DEVELOPER_ID') && env('DOORDASH_KEY_ID') && env('DOORDASH_SIGNING_SECRET')),
  uber: () => !!(env('UBER_CLIENT_ID') && env('UBER_CLIENT_SECRET') && env('UBER_CUSTOMER_ID'))
};
const b64url = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const phoneE164 = s => { const d = String(s || '').replace(/\D/g, ''); return d.length === 10 ? '+1' + d : d.length === 11 && d[0] === '1' ? '+' + d : null; };
const storeParts = s => { const m = /^(.*),\s*([A-Z]{2})\s+(\d{5})/.exec(s.address[1] || ''); return { street: s.address[0], city: m ? m[1] : '', state: m ? m[2] : 'MI', zip: m ? m[3] : '' }; };
const oneLine = a => `${a.street}${a.unit ? ' ' + a.unit : ''}, ${a.city}, ${a.state} ${a.zip}`;

async function call(url, opt, ms = 9000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: ac.signal }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; }
  finally { clearTimeout(t); }
}

/* DoorDash Drive v2: a short-lived JWT signed with the base64 signing secret */
function ddToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', 'dd-ver': 'DD-JWT-V1' }));
  const body = b64url(JSON.stringify({ aud: 'doordash', iss: env('DOORDASH_DEVELOPER_ID'), kid: env('DOORDASH_KEY_ID'), iat: now, exp: now + 300 }));
  const sig = crypto.createHmac('sha256', Buffer.from(env('DOORDASH_SIGNING_SECRET'), 'base64')).update(`${head}.${body}`).digest('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${head}.${body}.${sig}`;
}
async function doordash(o) {
  const r = await call('https://openapi.doordash.com/drive/v2/quotes', {
    method: 'POST', headers: { Authorization: 'Bearer ' + ddToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      external_delivery_id: o.ref, pickup_address: oneLine(o.from), pickup_business_name: `Nuts Now ${o.store.name}`, pickup_phone_number: o.store.phone,
      dropoff_address: oneLine(o.to), dropoff_phone_number: o.phone, dropoff_contact_given_name: o.name, order_value: o.valueCents
    })
  });
  if (!r.ok) return { provider: 'doordash', ok: false, error: (r.j && (r.j.message || r.j.code)) || `DoorDash said ${r.status}` };
  return { provider: 'doordash', ok: true, id: r.j.external_delivery_id, feeCents: r.j.fee, currency: r.j.currency || 'USD', eta: r.j.dropoff_time_estimated || null, expires: null };
}

/* Uber Direct: OAuth client-credentials token (valid ~30 days), kept while this function stays warm */
let uberTok = null;
async function uberToken() {
  if (uberTok && uberTok.exp > Date.now() + 60000) return uberTok.v;
  const r = await call('https://auth.uber.com/oauth/v2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('UBER_CLIENT_ID'), client_secret: env('UBER_CLIENT_SECRET'), grant_type: 'client_credentials', scope: 'eats.deliveries' }).toString()
  });
  if (!r.ok || !r.j.access_token) throw new Error('Uber sign-in failed');
  uberTok = { v: r.j.access_token, exp: Date.now() + (r.j.expires_in || 3600) * 1000 };
  return uberTok.v;
}
async function uber(o) {
  const addr = a => JSON.stringify({ street_address: [a.street, a.unit].filter(Boolean), city: a.city, state: a.state, zip_code: a.zip, country: 'US' });
  const r = await call(`https://api.uber.com/v1/customers/${encodeURIComponent(env('UBER_CUSTOMER_ID'))}/delivery_quotes`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + await uberToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ pickup_address: addr(o.from), dropoff_address: addr(o.to), pickup_phone_number: o.store.phone, dropoff_phone_number: o.phone, manifest_total_value: o.valueCents, external_store_id: o.store.id })
  });
  if (!r.ok) return { provider: 'uber', ok: false, error: (r.j && (r.j.message || r.j.code)) || `Uber said ${r.status}` };
  return { provider: 'uber', ok: true, id: r.j.id, feeCents: r.j.fee, currency: (r.j.currency || 'usd').toUpperCase(), eta: r.j.dropoff_eta || null, minutes: r.j.duration || null, expires: r.j.expires || null };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const on = { doordash: has.doordash(), uber: has.uber() };
  if (req.method === 'GET') return res.status(200).json({ ok: true, providers: on });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ ok: false, error: 'Use GET or POST.' }); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, code: 'bad', error: 'The delivery request could not be read.' });
  if (!on.doordash && !on.uber) return res.status(200).json({ ok: false, code: 'off', providers: on, quotes: [], error: 'Delivery is still being set up. Please choose pickup, or call the shop.' });
  const store = core.store(catalog, String(b.store || ''));
  const a = b.address || {}, to = { street: String(a.street || '').trim().slice(0, 120), unit: String(a.unit || '').trim().slice(0, 30), city: String(a.city || '').trim().slice(0, 60), state: 'MI', zip: String(a.zip || '').trim().slice(0, 10) };
  const phone = phoneE164(b.phone), name = String(b.name || '').trim().slice(0, 60) || 'Customer';
  const miss = [];
  if (!store) miss.push('store');
  if (to.street.length < 4) miss.push('street');
  if (!to.city) miss.push('city');
  if (!/^\d{5}$/.test(to.zip)) miss.push('zip');
  if (!phone) miss.push('phone');
  if (miss.length) return res.status(400).json({ ok: false, code: 'fields', fields: miss, error: 'Please fill in the shop, street, city, 5-digit ZIP and a US mobile number.' });
  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 100) : [];
  const priced = core.priceBasket(catalog, lines);
  if (!priced.subtotalCents) return res.status(400).json({ ok: false, code: 'empty', error: 'Add something to your bag first.' });
  const o = { ref: 'nn-' + store.id + '-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), store: { ...store, phone: phoneE164(store.phone) || store.phone }, from: storeParts(store), to, phone, name, valueCents: priced.subtotalCents };
  const jobs = [];
  if (on.doordash) jobs.push(doordash(o).catch(e => ({ provider: 'doordash', ok: false, error: e.name === 'AbortError' ? 'DoorDash took too long to answer.' : 'DoorDash could not be reached.' })));
  if (on.uber) jobs.push(uber(o).catch(e => ({ provider: 'uber', ok: false, error: e.name === 'AbortError' ? 'Uber took too long to answer.' : e.message || 'Uber could not be reached.' })));
  const all = await Promise.all(jobs), quotes = all.filter(q => q.ok && Number.isInteger(q.feeCents)).sort((x, y) => x.feeCents - y.feeCents);
  res.status(200).json({ ok: quotes.length > 0, code: quotes.length ? null : 'none', providers: on, quotes, errors: all.filter(q => !q.ok).map(q => ({ provider: q.provider, error: q.error })), dropoff: oneLine(to), subtotalCents: priced.subtotalCents });
};
