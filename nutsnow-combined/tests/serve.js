// Local test server: serves the site folder and runs api/quote.js and api/delivery.js the way Vercel does.
// NN_FAKE_COURIERS=1 switches on pretend DoorDash / Uber keys and answers their APIs locally (checks the requests).
// usage: node tests/serve.js [port] [catalog.json] [fake-start-time]
//   catalog.json swaps in a test catalog (e.g. one with prices); fake-start-time (ISO) runs the server clock from
//   that moment, so pickup tests can use a fixed store time. Test-only: production uses the real clock.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.argv[2] || 8790, alt = process.argv[3], fake = process.argv[4];
if (fake) { const off = Date.parse(fake) - Date.now(), real = Date.now; Date.now = () => real() + off; }
if (alt) { const resolved = require.resolve(path.join(root, 'data/catalog.json')); require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: JSON.parse(fs.readFileSync(alt, 'utf8')) }; }
const handler = require('../api/quote.js');
if (process.env.NN_FAKE_COURIERS) {
  Object.assign(process.env, { DOORDASH_DEVELOPER_ID: 'dev', DOORDASH_KEY_ID: 'kid', DOORDASH_SIGNING_SECRET: Buffer.from('secret').toString('base64'), UBER_CLIENT_ID: 'c', UBER_CLIENT_SECRET: 's', UBER_CUSTOMER_ID: 'cust' });
  const crypto = require('crypto'), real = global.fetch, J = (j, st = 200) => new Response(JSON.stringify(j), { status: st, headers: { 'Content-Type': 'application/json' } });
  global.fetch = async (u, o = {}) => {
    u = String(u);
    if (u === 'https://openapi.doordash.com/drive/v2/quotes') {
      const [h, b, sig] = o.headers.Authorization.slice(7).split('.'), want = crypto.createHmac('sha256', Buffer.from('secret')).update(`${h}.${b}`).digest('base64url');
      const head = JSON.parse(Buffer.from(h, 'base64url')), q = JSON.parse(o.body);
      if (sig !== want || head['dd-ver'] !== 'DD-JWT-V1' || !/^\+1\d{10}$/.test(q.dropoff_phone_number) || !q.order_value) return J({ code: 'validation_error', message: 'bad request' }, 400);
      return J({ external_delivery_id: q.external_delivery_id, fee: 975, currency: 'USD', dropoff_time_estimated: new Date(Date.now() + 55 * 60000).toISOString() });
    }
    if (u === 'https://auth.uber.com/oauth/v2/token') return J({ access_token: 'tok', expires_in: 2592000 });
    if (u.startsWith('https://api.uber.com/v1/customers/cust/delivery_quotes')) {
      const q = JSON.parse(o.body), d = JSON.parse(q.dropoff_address);
      if (o.headers.Authorization !== 'Bearer tok' || !d.zip_code) return J({ code: 'invalid_params', message: 'bad' }, 400);
      return J({ id: 'dqt_test', fee: 849, currency: 'usd', dropoff_eta: new Date(Date.now() + 48 * 60000).toISOString(), duration: 48, expires: new Date(Date.now() + 15 * 60000).toISOString() });
    }
    return real(u, o);
  };
}
const delivery = require('../api/delivery.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.png': 'image/png' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/quote' || url.pathname === '/api/delivery') {
    let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
      let body = null; try { body = JSON.parse(b); } catch (e) {}
      const r = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return r; }, json(j) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(j)); } };
      (url.pathname === '/api/quote' ? handler : delivery)({ method: req.method, body }, r);
    }); return;
  }
  let f = path.join(root, decodeURIComponent(url.pathname)); if (url.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (url.pathname === '/data/catalog.json' && alt) f = alt;
  if (!f.startsWith(root) && f !== alt) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('not found'); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); });
}).listen(port, () => console.log('serving on ' + port));
