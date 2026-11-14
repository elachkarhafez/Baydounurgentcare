/* Link preview card: renders a site's own 1200x630 card design to media/og.jpg, then rewrites the
   page's preview tags with ABSOLUTE urls (iMessage, WhatsApp, Instagram and Slack ignore relative og:image).
   Usage: node card.mjs <siteFolder> <liveUrl> [cardHtml=<siteFolder>/render/og.html]
   The card html is a normal page sized 1200x630 that may reference ../media/* files. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const [site, live, cardArg] = process.argv.slice(2);
if (!site || !live) { console.error('usage: node card.mjs <siteFolder> <https://name.vercel.app> [card.html]'); process.exit(1); }
const base = live.replace(/\/$/, '');
const card = path.resolve(cardArg || path.join(site, 'render/og.html'));
const png = path.join(site, 'render/og.png'), jpg = path.join(site, 'media/og.jpg'), touch = path.join(site, 'media/apple-touch-icon.png');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto('file://' + card, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
await p.screenshot({ path: png });
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', jpg]);
// a 180px home-screen icon from the site's favicon if there is one
const icon = path.join(site, 'media/icon.png');
if (fs.existsSync(icon)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', icon, '-vf', 'scale=180:180:flags=lanczos', touch]);

// rewrite the head: absolute og/twitter tags, canonical url
const idx = path.join(site, 'index.html');
let h = fs.readFileSync(idx, 'utf8');
const title = (h.match(/<meta property="og:title" content="([^"]*)"/) || h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const desc = (h.match(/<meta property="og:description" content="([^"]*)"/) || h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
h = h.replace(/\n?<meta (property|name)="(og:[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*">/g, '').replace(/\n?<link rel="(canonical|apple-touch-icon)"[^>]*>/g, '');
const v = Date.now().toString(36); // cache-buster: apps cache preview images by url
const tags = [
  `<link rel="canonical" href="${base}/">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:url" content="${base}/">`,
  `<meta property="og:title" content="${title}">`,
  `<meta property="og:description" content="${desc}">`,
  `<meta property="og:image" content="${base}/media/og.jpg?v=${v}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${title}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${title}">`,
  `<meta name="twitter:description" content="${desc}">`,
  `<meta name="twitter:image" content="${base}/media/og.jpg?v=${v}">`,
  fs.existsSync(touch) ? `<link rel="apple-touch-icon" href="${base}/media/apple-touch-icon.png">` : ''
].filter(Boolean).join('\n');
h = h.replace(/(<meta name="description"[^>]*>)/, `$1\n${tags}`);
fs.writeFileSync(idx, h);
console.log('card', jpg, (fs.statSync(jpg).size / 1024).toFixed(0) + ' KB', '| tags ->', base);
