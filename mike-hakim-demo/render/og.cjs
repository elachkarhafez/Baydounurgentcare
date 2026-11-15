const { chromium } = require('playwright');
const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + path.join(__dirname, 'og.html')); await p.waitForTimeout(600);
await p.screenshot({ path: path.join(__dirname, '../public/og.jpg'), type: 'jpeg', quality: 86 });
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(`<body style="margin:0"><div style="width:180px;height:180px;background:#142238;display:grid;place-items:center"><svg viewBox="0 0 64 60" width="118" height="110" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.6"><path d="M6 30 L32 8 L58 30" stroke="#b08d57"/><path d="M14 52 V32 L23 44 L32 32 V52 M40 32 V52 M52 32 V52 M40 42 H52" stroke="#fbf8f2"/></svg></div></body>`);
await p.screenshot({ path: path.join(__dirname, '../public/apple-touch-icon.png') });
await b.close(); })();
