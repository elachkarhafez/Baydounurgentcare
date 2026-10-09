// Writes a copy of data/catalog.json with ILLUSTRATIVE test prices (never real ones) for tests/e2e.mjs.
// usage: node tests/make-test-catalog.js <out.json>
const fs = require('fs'), c = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../data/catalog.json'), 'utf8'));
const prices = { cashews: 1200, bbq: 1600, pistachios: 2000, hazelnuts: 1200, gummies: 799, delight: 1333, walnuts: 1400 };
c.products.forEach(p => { if (prices[p.id] != null) p.priceCents = prices[p.id]; if (p.id === 'zaatar') p.available = false; });
fs.writeFileSync(process.argv[2], JSON.stringify(c));
