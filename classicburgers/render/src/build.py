import os, re, json, html
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
F = TTFont(D + 'fonts/oswald700.ttf'); GS = F.getGlyphSet(); CM = F.getBestCmap(); UPM = F['head'].unitsPerEm
def word(text, size, x, base, track=0):
    s = size / UPM; out = []
    for c in text:
        pen = SVGPathPen(GS); g = GS[CM[ord(c)]]; g.draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        out.append(pen.getCommands()); x += g.width * s + track
    return out, x
OR, OR2, BR, CR = '#f07c1f', '#d9620e', '#5a2e1e', '#fff4e3'
e = html.escape

# their logo, redrawn: stacked burger icon (orange bun, brown patty, orange bun), CLASSIC / BURGERS, swoosh underline
W1, x1 = word('CLASSIC', 66, 168, 92, 2)
W2, x2 = word('BURGERS', 66, 168, 160, 2)
WR = max(x1, x2)
def logo(anim=False, outline=False, aria=True):
    o = (' stroke="%s" stroke-width="10" stroke-linejoin="round" paint-order="stroke"' % CR) if outline else ''
    c = (lambda n: ' class="%s"' % n) if anim else (lambda n: '')
    s = '<svg viewBox="0 10 %d 190" xmlns="http://www.w3.org/2000/svg"%s>' % (int(WR) + 14, ' role="img" aria-label="Classic Burgers"' if aria else ' aria-hidden="true"')
    s += '<g%s%s>' % (c('ic'), o)
    s += '<path%s d="M18 92h134v20c0 16-8 28-24 28H42c-16 0-24-12-24-28z" fill="%s"/>' % (c('ib'), OR)
    s += '<path%s d="M10 74h150a8 8 0 0 1 0 16H10a8 8 0 0 1 0-16z" fill="%s"/>' % (c('ip'), BR)
    s += '<path%s d="M18 70V54c0-18 22-30 67-30s67 12 67 30v16z" fill="%s"/>' % (c('it'), OR)
    s += '</g>'
    if not outline:
        s += '<g%s fill="%s"><ellipse cx="60" cy="42" rx="5" ry="2.6"/><ellipse cx="86" cy="34" rx="5" ry="2.6"/><ellipse cx="112" cy="42" rx="5" ry="2.6"/><ellipse cx="74" cy="54" rx="5" ry="2.6"/><ellipse cx="100" cy="54" rx="5" ry="2.6"/></g>' % (c('ss'), CR)
    s += '<g fill="%s"%s>%s</g>' % (BR, o, ''.join('<path%s d="%s"/>' % (c('l1'), d) for d in W1))
    s += '<g fill="%s"%s>%s</g>' % (BR, o, ''.join('<path%s d="%s"/>' % (c('l2'), d) for d in W2))
    s += '<path%s d="M24 182C140 170 300 168 %d 176" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/>' % (c('swh'), int(WR) - 4, OR)
    return s + '</svg>'

# drawn burgers for the menu (flat, in the logo's colours)
def burger(kind='single'):
    L = []
    def layer(d, f): L.append('<path d="%s" fill="%s"/>' % (d, f))
    y = 96
    layer('M12 %d h96 v8 c0 9-6 14-16 14 H28 c-10 0-16-5-16-14z' % y, '#e8892c'); y -= 10
    patties = 2 if kind in ('double', 'lava', 'pastrami') else 1
    for i in range(patties):
        if kind == 'avocado' and i == 0:
            layer('M10 %d h100 l-6 8 h-88z' % (y + 2), '#7fae3e'); y -= 8
        layer('M8 %d h104 a6 6 0 0 1 0 12 H8 a6 6 0 0 1 0-12z' % (y - 4), '#5a2e1e')
        layer('M6 %d h108 l-10 8 -10-6 -10 8 -10-6 -10 8 -10-6 -10 8 -10-6 -10 8 -10-6z' % (y - 6), '#f6b81c' if kind != 'lava' else '#ff8a1e'); y -= 16
    if kind == 'lava':
        layer('M20 %d c0 14 6 18 8 6 c2 14 10 14 10 2 c2 10 8 12 8 0' % (y + 18), '#ff8a1e')
    if kind == 'avocado':
        layer('M12 %d c12-6 20 4 32-2 s20 4 32-2 s20 4 32-2 v6 c-12 6-20-4-32 2 s-20-4-32 2 s-20-4-32 2z' % (y + 2), '#c0502f'); y -= 8
    if kind == 'pastrami':
        layer('M10 %d c10-8 24 4 34-4 s24 6 34-2 s20 2 32-2 v8 H10z' % (y + 2), '#d6727a'); y -= 10
    layer('M8 %d c8-5 14 2 22-2 s14 3 22-1 s14 3 22-1 s14 3 22-1 s12 3 16 0 v4 H8z' % (y + 2), '#79b84a'); y -= 6
    layer('M14 %d h92 c0-24-20-36-46-36 S14 %d 14 %d z' % (y, y, y), '#f07c1f')
    seeds = ''.join('<ellipse cx="%d" cy="%d" rx="3.4" ry="1.8" fill="#fff4e3"/>' % (cx, y - dy) for cx, dy in ((40, 20), (58, 26), (76, 20), (50, 12), (68, 12)))
    return '<svg viewBox="0 %d 120 %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">%s%s</svg>' % (y - 40, 124 - (y - 40), ''.join(L), seeds)

BURGERS = [
    ('single', 'Single Classic Burger', '1/4 lb with lettuce, tomato, pickles and our secret sauce.', '$5.99', '#3 combo $11.99'),
    ('double', 'Double Classic Cheeseburger', 'Double the classic, with cheese.', '$10.49', '#2 combo $16.49'),
    ('avocado', 'Avocado Bacon Cheeseburger', 'Avocado and bacon on a cheeseburger.', '', '#1 combo $16.29'),
    ('lava', 'Lava Burger', '', '$10.49', '#4 combo $16.49'),
    ('pastrami', 'Pastrami Cheeseburger', 'Cheeseburger with pastrami piled on.', '$10.99', '#8 combo $16.99'),
    ('lava', 'Lava Crunch', '', '', 'Combo $16.99'),
]
BREAKFAST = [
    ('Croissants and muffins', 'Croissant / muffin', [('Egg and cheese', '$7.99 / $5.59'), ('Bacon, egg and cheese', '$10.99 / $5.99'), ('Sausage, egg and cheese', '$10.99 / $5.99'), ('Ham, egg and cheese', '$10.99 / $5.99'), ('Denver', '$10.99')]),
    ('Burritos', '', [('Bacon, egg and cheese', '$9.99'), ('Loaded', '$11.99'), ('Chili cheese', '$10.99'), ('Vegetarian', '$8.29'), ('Sausage', '$9.29'), ('Steak', '$10.99'), ('Egg', '$7.29'), ('Ham, egg and cheese', '$9.29'), ('Meat lovers', '$11.99')]),
    ('Sandwiches', '', [('BLT', '$8.99'), ('Breakfast sandwich', '$6.99'), ('Breakfast cheeseburger', '$8.99')]),
    ('Plates', '', [('Bacon and eggs', '$11.99'), ('Sausage and eggs', '$11.99'), ('Ham and eggs', '$11.99')]),
    ('Kids plate', '', [('Bacon and eggs', '$7.99'), ('Sausage and eggs', '$7.99'), ('Ham and eggs', '$7.99')]),
    ('Sides', '', [('Hash brown', '$4.49'), ('Scrambled eggs (5)', '$4.49'), ('Buttered Texas toast', '$1.59')]),
]
COFFEE = [
    ('Iced espresso', '12 / 16 / 20 oz', [('Iced latte', '$5.29 / $5.69 / $6.49'), ('Iced mocha', '$5.79 / $6.29 / $6.99'), ('Iced americano', '$4.19 / $4.49 / $5.59')]),
    ('Espresso shake', '16 / 20 / 32 oz', [('Vanilla, mocha, caramel, hazelnut, peanut butter or Oreo', '$5.99 / $6.99 / $8.49')]),
    ('Hot espresso', '12 oz', [('Latte', '$5.29'), ('Mocha', '$6.29'), ('Americano', '$4.29'), ('Hot chocolate', '$3.99')]),
    ('Affogato', '16 oz', [('Two espresso shots over vanilla soft serve', '$5.69')]),
]
def groups(G):
    return ''.join('<div class="grp"><h3>%s%s</h3><ul>%s</ul></div>' % (e(n), ('<span>%s</span>' % e(s)) if s else '', ''.join('<li>%s<span>%s</span></li>' % (e(a), e(b)) for a, b in items)) for n, s, items in G)
BCARDS = ''.join('<article class="bc">%s<div><h3>%s</h3><p>%s</p><div class="pr">%s<b>%s</b></div></div></article>' % (burger(k), e(n), e(d), ('<span>%s</span>' % p) if p else '', e(c)) for k, n, d, p, c in BURGERS)

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_BAG': ic('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
     'I_SUN': ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')}
ORDER = 'https://order.toasttab.com/online/classic-burger-apple-valley'
t = open(D + 'tpl.html').read()
R = dict(I, LOGO_INTRO=logo(True, True), LOGO_NAV=logo(False, False, False), LOGO_FOOT=logo(), BREAKFAST=groups(BREAKFAST), COFFEE=groups(COFFEE), BCARDS=BCARDS, ORDER=ORDER,
         B_SINGLE=burger('single'), B_DOUBLE=burger('double'))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#5a2e1e"/><g transform="translate(5 2) scale(.32)"><path d="M18 92h134v20c0 16-8 28-24 28H42c-16 0-24-12-24-28z" fill="#f07c1f"/><path d="M10 74h150a8 8 0 0 1 0 16H10a8 8 0 0 1 0-16z" fill="#fff4e3"/><path d="M18 70V54c0-18 22-30 67-30s67 12 67 30v16z" fill="#f07c1f"/></g></svg>')
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Work+Sans:wght@500;600&display=block" rel="stylesheet">'
og = ('<!doctype html><html><head><meta charset="utf-8">' + FONTS + '<style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#fff4e3;color:#5a2e1e;font-family:"Work Sans"}'
      '.lg{position:absolute;left:56px;top:46px;width:470px}h1{position:absolute;left:60px;top:290px;width:640px;font:700 58px/1.04 Oswald;text-transform:uppercase}h1 em{font-style:normal;color:#f07c1f}'
      '.pill{position:absolute;left:62px;bottom:54px;display:flex;gap:14px;align-items:center;font-size:24px;color:#7a5a4a}.pill b{font-weight:600;color:#fff;background:#f07c1f;border-radius:999px;padding:10px 22px}'
      '.side{position:absolute;top:0;right:0;bottom:0;width:470px;background:#fbe0b8}.side .b{position:absolute;left:50%;top:50%;width:340px;transform:translate(-50%,-50%)}'
      '.side .ph{position:absolute;right:26px;bottom:26px;width:170px;height:170px;border-radius:50%;overflow:hidden;border:6px solid #fff4e3}.side .ph img{width:100%;height:100%;object-fit:cover}'
      '</style></head><body><div class="lg">' + logo() + '</div><h1>Burgers all day, <em>breakfast from 6 am</em></h1><div class="pill"><b>Order online</b><span>21044 Bear Valley Rd, Apple Valley</span></div>'
      '<div class="side"><div class="b">' + burger('double') + '</div><div class="ph"><img src="../media/affogato-pour.webp"></div></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:180px;height:180px;background:#f07c1f;display:grid;place-items:center"><div style="width:150px">' + burger('single') + '</div></body>')
json.dump({'logo': logo(), 'logo_outline': logo(False, True), 'burgers': {k: burger(k) for k in ('single', 'double', 'avocado', 'lava', 'pastrami')}}, open(D + '../svgs.json', 'w'))
print(len(t) // 1024, 'KB')
