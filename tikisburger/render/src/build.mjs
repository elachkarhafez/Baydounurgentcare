// Builds tikisburger/index.html from page.html + mark.json (the potraced Tikiz roundel: ring, burger icon, BURGERS, banner, disc,
// with TIKIZ as fitted Kanit ExtraBold Italic outlines) and writes favicon.svg + render/src/mark.js (for render/og.html).
// After every rebuild, re-run the link-preview step: node .claude/skills/ela-studio/kit/og/card.mjs tikisburger https://tikisburger.vercel.app
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), site = path.resolve(here, '../..');
const mark = JSON.parse(fs.readFileSync(path.join(here, 'mark.json'), 'utf8'));
let html = fs.readFileSync(path.join(here, 'page.html'), 'utf8');
html = html.replace('/*MARK*/null', JSON.stringify(mark));
// keep the og tags that card.mjs wrote last time, if any
const idx = path.join(site, 'index.html');
if (fs.existsSync(idx)) {
  const old = fs.readFileSync(idx, 'utf8');
  const tags = old.match(/\n?<(?:link rel="(?:canonical|apple-touch-icon)"|meta (?:property|name)="(?:og:|twitter:))[^>]*>/g) || [];
  if (tags.some(t => t.includes('og:image'))) {
    html = html.replace(/\n?<meta (property|name)="(og:[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*">/g, '');
    html = html.replace('</head>', tags.join('') + '\n</head>');
  }
}
fs.writeFileSync(idx, html);
fs.writeFileSync(path.join(here, 'mark.js'), 'window.MARK=' + JSON.stringify(mark) + ';');
const Y = mark.colors.yellow, K = mark.colors.ink, L = mark.letters.join(' ');
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 -10 1036 1040"><path fill="${Y}" d="${mark.disc}"/><g fill="${K}"><path d="${mark.ring}"/><path d="${mark.bun_top}"/><path d="${mark.cheese}"/><path d="${mark.patty}"/><path d="${mark.bun_bot}"/>${mark.burgers.map(d => `<path d="${d}"/>`).join('')}<path d="${mark.banner}"/></g><path d="${L}" fill="${K}" transform="translate(-9 10)"/><path d="${L}" fill="${Y}" stroke="${K}" stroke-width="7"/></svg>`;
fs.writeFileSync(path.join(site, 'favicon.svg'), fav);
console.log('built', (html.length / 1024).toFixed(0) + 'KB');
