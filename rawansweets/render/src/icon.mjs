// renders render/icon.html (their RS monogram on cream) to media/icon.png for card.mjs's apple-touch-icon
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path'; import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.goto('file://' + path.join(D, '../icon.html')); await p.screenshot({ path: path.join(D, '../../media/icon.png') }); await b.close();
