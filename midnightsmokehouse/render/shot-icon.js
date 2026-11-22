// Renders render/icon.html (made by build.py) to media/icon.png; card.mjs turns that into the apple-touch-icon.
//   node midnightsmokehouse/render/shot-icon.js   (from the repo root; needs playwright)
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.goto('file://' + path.join(__dirname, 'icon.html'));
  await p.screenshot({ path: path.join(__dirname, '..', 'media', 'icon.png') });
  await b.close();
})();
