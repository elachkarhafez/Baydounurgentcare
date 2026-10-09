// Local test server: serves the site folder and runs api/quote.js the way Vercel does.
// usage: node tests/serve.js [port] [catalog.json] [fake-start-time]
//   catalog.json swaps in a test catalog (e.g. one with prices); fake-start-time (ISO) runs the server clock from
//   that moment, so pickup tests can use a fixed store time. Test-only: production uses the real clock.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.argv[2] || 8790, alt = process.argv[3], fake = process.argv[4];
if (fake) { const off = Date.parse(fake) - Date.now(), real = Date.now; Date.now = () => real() + off; }
if (alt) { const resolved = require.resolve(path.join(root, 'data/catalog.json')); require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: JSON.parse(fs.readFileSync(alt, 'utf8')) }; }
const handler = require('../api/quote.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/quote') {
    let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
      let body = null; try { body = JSON.parse(b); } catch (e) {}
      const r = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return r; }, json(j) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(j)); } };
      handler({ method: req.method, body }, r);
    }); return;
  }
  let f = path.join(root, decodeURIComponent(url.pathname)); if (url.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (url.pathname === '/data/catalog.json' && alt) f = alt;
  if (!f.startsWith(root) && f !== alt) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('not found'); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); });
}).listen(port, () => console.log('serving on ' + port));
