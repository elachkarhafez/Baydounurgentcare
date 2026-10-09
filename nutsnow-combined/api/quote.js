// POST /api/quote: the server-side check of a basket and pickup time.
// Prices come only from data/catalog.json and the clock is the server's, so a basket edited in the
// browser (or a stale one from yesterday) can't set its own total or book a pickup after the cutoff.
// Nothing is stored and no payment is taken here; payment will be added as a separate checkout step.
const core = require('../js/order-core.js');
const catalog = require('../data/catalog.json');

const MAX_LINES = 100, MAX_COMPONENTS = 60;

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Use POST.' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object' || !Array.isArray(body.lines)) return res.status(400).json({ ok: false, error: 'Your basket could not be read. Please refresh the page and try again.' });
  if (body.lines.length > MAX_LINES || body.lines.some(l => l && Array.isArray(l.components) && l.components.length > MAX_COMPONENTS)) return res.status(400).json({ ok: false, error: 'That basket is too big to check online. Please call the shop.' });
  const lines = body.lines.map(l => l && l.type === 'mix'
    ? { type: 'mix', id: String(l.id || ''), name: String(l.name || 'Custom mix').slice(0, 40), components: (l.components || []).map(c => ({ productId: String(c && c.productId || ''), units: c && c.units })) }
    : { type: 'item', id: String(l && l.id || ''), productId: String(l && l.productId || ''), units: l && l.units });
  const pickup = body.pickup && typeof body.pickup === 'object' ? { store: String(body.pickup.store || ''), at: String(body.pickup.at || '') } : null;
  const clientTotalCents = Number.isInteger(body.clientTotalCents) ? body.clientTotalCents : null;
  res.status(200).json(core.quote(catalog, { lines, pickup, clientTotalCents }, Date.now()));
};
