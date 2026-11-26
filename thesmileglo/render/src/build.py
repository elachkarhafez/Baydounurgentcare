"""Builds thesmileglo/index.html and favicon.svg from tpl.html + logo.json (their wordmark, traced by trace.py).
Run:  python3 -I build.py   then rerun the link-preview step (kit/og/card.mjs), since it rewrites the head.
On a rebuild the og/twitter tags card.mjs wrote last time are carried over."""
import os, json, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
SITE = D + '../../'
tpl = open(D + 'tpl.html').read()
logo = json.load(open(D + 'logo.json'))


def tight(d):  # 1 decimal is plenty: the logo is 440 units wide and never drawn much past 650px
    return re.sub(r'(-?\d+\.\d)\d+', r'\1', d)


parts = [{'g': p['g'], 'n': p['n'], 'd': tight(p['d']), 'box': p['box']} for p in logo['parts']]
alld = ' '.join(p['d'] for p in parts)
W, H = logo['box'][2], logo['box'][3]

# one copy of the wordmark as a symbol; nav, footer and the no-canvas fallback <use> it
symbol = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="wm" viewBox="-1 -1 %d %d">'
          '<path fill="currentColor" fill-rule="evenodd" d="%s"/></symbol></svg>' % (W + 2, H + 2, alld))
brand = '<svg viewBox="-1 -1 %d %d" role="img" aria-label="The Smile Glo, Teeth Whitening"><use href="#wm"/></svg>' % (W + 2, H + 2)
foot = brand
# no-canvas fallback: the wordmark lit with a CSS glow, in the sign's own viewBox
fallback = ('<svg class="fallback" viewBox="-30 -34 500 226" aria-hidden="true" style="filter:drop-shadow(0 0 4px rgba(236,242,255,.9)) drop-shadow(0 0 16px rgba(236,242,255,.45))">'
            '<use href="#wm" x="-1" y="-1" width="%d" height="%d" color="#fff"/></svg>' % (W + 2, H + 2))

out = tpl.replace('__LOGO__', json.dumps({'parts': parts}, separators=(',', ':')))
out = out.replace('<body>', '<body>\n' + symbol, 1)
out = out.replace('__BRANDSVG__', brand).replace('__FOOTSVG__', foot).replace('__FALLBACK__', fallback)
assert '__' not in re.sub(r'__(intro|qaPause)', '', out).replace('__proto__', ''), re.findall(r'__[A-Z]+__', out)

# favicon: the big sparkle, white on their black, like the favicon on thesmileglo.com
sp = [p for p in parts if p['g'] == 'spark' and p['n'] == 0][0]
x0, y0, x1, y1 = sp['box']
s = max(x1 - x0, y1 - y0)
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#000"/>'
       '<g transform="translate(32 32) scale(%.4f) translate(%.2f %.2f)"><path fill="#fff" d="%s"/></g></svg>' % (44 / s, -cx, -cy, sp['d']))
open(SITE + 'favicon.svg', 'w').write(fav)
# link-preview card source (rendered by kit/og/card.mjs) and the 512px home-screen icon source
open(D + '../og.html', 'w').write(open(D + 'og_tpl.html').read().replace('__WMPATH__', alld))
open(D + '../icon.html', 'w').write('<!doctype html><html><body style="margin:0;width:512px;height:512px;background:#000">'
    '<svg width="512" height="512" viewBox="0 0 64 64"><g transform="translate(32 32) scale(%.4f) translate(%.2f %.2f)"><path fill="#fff" d="%s"/></g></svg></body></html>' % (40 / s, -cx, -cy, sp['d']))

idx = SITE + 'index.html'
if os.path.exists(idx):
    old = open(idx).read()
    tags = re.findall(r'\n?<(?:link rel="(?:canonical|apple-touch-icon)"[^>]*|meta (?:property|name)="(?:og:[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*")>', old)
    # title and description always come fresh from tpl.html; the rest (urls, image, cache-buster) carry over
    tags = [t for t in tags if not re.search(r'"(og|twitter):(title|description)"', t)]
    if any('og:image' in t for t in tags):
        out = re.sub(r'\n?<meta (property|name)="(og:(?!title|description)[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*">', '', out)
        out = out.replace('<meta name="theme-color"', '\n'.join(t.strip('\n') for t in tags) + '\n<meta name="theme-color"', 1)
open(idx, 'w').write(out)
print('index.html', len(out) // 1024, 'KB')
