"""Builds aljawad/index.html and favicon.svg from tpl.html + data.js + i18n.js + logo.json (the traced logo).
Run:  /usr/bin/python3 -I build.py   then rerun the link-preview step (kit/og/card.mjs), since it rewrites the head."""
import os, json, random, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
SITE = D + '../../'
tpl = open(D + 'tpl.html').read()
logo = json.load(open(D + 'logo.json'))

def tight(d):  # 1 decimal is plenty at these sizes
    return re.sub(r'(-?\d+\.\d)\d+', r'\1', d)
parts = [{'g': p['g'], 'n': p['n'], 'd': tight(p['d']), 'box': p['box']} for p in logo['parts']]
mark = [p for p in parts if p['g'] == 'mark']
word = [p for p in parts if p['g'] in ('al', 'jawad', 'ar')]

# nav brand: the arch mark, lit mint on the navy bar
mb = [200, 101, 311, 232]
brand = '<svg viewBox="%d %d %d %d" aria-hidden="true"><g fill="#81d6a9" fill-rule="evenodd" style="filter:drop-shadow(0 0 3px rgba(129,214,169,.55))">%s</g></svg>' % (
    mb[0] - 2, mb[1] - 2, mb[2] - mb[0] + 4, mb[3] - mb[1] + 4, ''.join('<path d="%s"/>' % p['d'] for p in mark))
# the wordmark printed on the packaging in the bag stack (group is scaled down in JS)
mini = '<g transform="translate(-133 -266)">' + ''.join('<path d="%s" fill-rule="evenodd"/>' % p['d'] for p in word) + '</g>'

ICONS = {
 '__WA__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2A9.7 9.7 0 0 0 3.7 16.9L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.2z"/></svg>',
 '__PHONE__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M6.6 3.5h3l1.5 4-2 1.3a10.5 10.5 0 0 0 6.1 6.1l1.3-2 4 1.5v3A2 2 0 0 1 18.3 19.6 15.6 15.6 0 0 1 4.4 5.7 2 2 0 0 1 6.6 3.5z"/></svg>',
 '__X__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
 '__PREV__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 '__NEXT__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 '__INFO__': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5M12 7.6v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 '__BAG__': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9h17l-1.6 9.2a2 2 0 0 1-2 1.8H7.1a2 2 0 0 1-2-1.8z" fill="currentColor"/></svg>',
}
# their counter: white terrazzo with black, grey and teal chips (the trays in their reels)
rnd = random.Random(7)
chips = []
for i in range(240):
    x, y, r = rnd.uniform(0, 240), rnd.uniform(0, 240), rnd.choice([.7, .9, 1.1, 1.4, 1.8, 2.4, 3.2])
    col = rnd.choice(['#2a2a2c', '#3a3a3c', '#8e9393', '#a9adac', '#c7cac8', '#c7cac8', '#1c4d5c'])
    n = rnd.randint(4, 6)
    pts = ' '.join('%.1f,%.1f' % (x + r * rnd.uniform(.6, 1.2) * __import__('math').cos(k / n * 6.283 + rnd.uniform(-.3, .3)),
                                  y + r * rnd.uniform(.6, 1.2) * __import__('math').sin(k / n * 6.283 + rnd.uniform(-.3, .3))) for k in range(n))
    chips.append('<polygon points="%s" fill="%s"/>' % (pts, col))
terr = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' + ''.join(chips) + '</svg>'
plaster = ('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/>'
           '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter><rect width="220" height="220" filter="url(#n)"/></svg>')
from urllib.parse import quote
vars_css = '<style>:root{--terrazzo:url("data:image/svg+xml,%s");--plaster:url("data:image/svg+xml,%s")}</style>\n' % (quote(terr), quote(plaster))

out = tpl.replace('</head>', vars_css + '</head>', 1)
out = out.replace('__DATA__', open(D + 'data.js').read()).replace('__I18N__', open(D + 'i18n.js').read())
out = out.replace('__LOGO__', json.dumps({'parts': parts}, separators=(',', ':')))
out = out.replace('__BRANDSVG__', brand).replace('__MINILOGO__', mini.replace("'", "\\'"))
for k, v in ICONS.items(): out = out.replace(k, v)
# keep the link-preview tags card.mjs wrote last time
idx = SITE + 'index.html'
if os.path.exists(idx):
    old = open(idx).read()
    tags = re.findall(r'\n?<(?:link rel="(?:canonical|apple-touch-icon)"[^>]*|meta (?:property|name)="(?:og:[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*")>', old)
    if any('og:image' in t for t in tags):
        out = re.sub(r'\n?<meta (property|name)="(og:[a-z:_]+|twitter:[a-z:_]+)" content="[^"]*">', '', out)
        out = out.replace('<link rel="icon"', ''.join(t if t.startswith('\n') else '\n' + t for t in tags).lstrip('\n') + '\n<link rel="icon"', 1)
open(idx, 'w').write(out)
fav = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#033246"/><g transform="translate(9.5 6) scale(.405) translate(-200 -101)" fill="#81d6a9" fill-rule="evenodd">%s</g></svg>' % ''.join('<path d="%s"/>' % p['d'] for p in mark)
open(SITE + 'favicon.svg', 'w').write(fav)
print('index.html', len(out))

# link-preview card (render/og.html, 1200x630) and the home-screen icon page (render/icon.html)
glow = lambda col, d: '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (d, col)
def sign_svg(scale_css):
    lay = []
    for blur, op in ((14, .55), (4, .9), (1.2, 1)):
        g = ''.join(glow({'mark': '#81d6a9', 'ar': '#e58089'}.get(p['g'], '#a9e8cc') if blur > 1.2 else {'mark': '#f1fff7', 'ar': '#fff0f1'}.get(p['g'], '#f6fffb'), p['d']) for p in parts if p['g'] != 'est')
        lay.append('<g style="filter:blur(%spx);opacity:%s">%s</g>' % (blur if blur > 1.2 else 0, op, g))
    return '<svg viewBox="126 94 260 326" style="%s">%s<text x="255.5" y="410.6" text-anchor="middle" fill="#eafff4" style="font:600 9.2px Exo 2;letter-spacing:.42em">EST 1992</text></svg>' % (scale_css, ''.join(lay))
og = """<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@500;600;700&family=Cairo:wght@700&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:'Exo 2';background:radial-gradient(90% 90% at 24% 40%,#0d5370,#033246 50%,#02202d);color:#fff;position:relative}
.wall{position:absolute;left:0;top:0;width:560px;height:630px;display:grid;place-items:center}
.plate{position:absolute;left:120px;top:44px;width:320px;height:362px;border-radius:22px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(155deg,rgba(255,255,255,.08),rgba(255,255,255,.02))}
.plate i{position:absolute;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f2f6f5,#8fa3a6 55%,#3d5257)}
.spill{position:absolute;left:-120px;top:-60px;width:800px;height:640px;border-radius:50%;background:radial-gradient(closest-side,rgba(129,214,169,.28),transparent)}
.txt{position:absolute;left:60px;bottom:40px;width:470px}
h1{font:700 44px/1.08 'Exo 2';letter-spacing:-.01em}h1 em{font-style:normal;color:#81d6a9}
p{font:500 22px/1.3 'Exo 2';color:rgba(255,255,255,.82);margin-top:10px}
.ph{position:absolute;top:40px;border-radius:22px;overflow:hidden;box-shadow:0 24px 50px -20px rgba(0,0,0,.6);border:3px solid rgba(255,255,255,.9)}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.p1{left:590px;width:290px;height:550px}.p2{left:900px;width:260px;height:262px;background:#fff}.p3{left:900px;top:326px;width:260px;height:264px}
.pill{position:absolute;left:900px;top:470px;display:none}
.ar{font:700 26px/1.2 'Cairo';color:#e58089;direction:rtl}
</style></head><body><div class="spill"></div>
<div class="plate"><i style="left:14px;top:14px"></i><i style="right:14px;top:14px"></i><i style="left:14px;bottom:14px"></i><i style="right:14px;bottom:14px"></i></div>
SIGN
<div class="txt"><h1>Order Al Jawad on <em>WhatsApp</em></h1><p>Shawarma, charcoal grills and mezza since 1992. Hamra and Tyre, delivery 1617.</p></div>
<div class="ph p1"><img src="../media/r/stack.webp"></div><div class="ph p2"><img src="../media/m/sh-chicken-plate.webp" style="object-fit:cover;transform:scale(1.15)"></div><div class="ph p3"><img src="../media/r/hummus-meat.webp"></div>
</body></html>""".replace('SIGN', sign_svg('position:absolute;left:150px;top:46px;width:260px;height:326px;overflow:visible'))
open(SITE + 'render/og.html', 'w').write(og)
icon = '<!doctype html><html><body style="margin:0;width:512px;height:512px;background:#033246;display:grid;place-items:center">%s</body></html>' % sign_svg('width:340px;height:426px;overflow:visible').replace('viewBox="126 94 260 326"', 'viewBox="196 97 120 140"').replace('<text', '<text display="none"')
open(SITE + 'render/icon.html', 'w').write(icon)
