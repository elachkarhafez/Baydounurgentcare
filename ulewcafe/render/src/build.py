import json, os, re, html, base64
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'logo.json'))
GL = json.load(open(D + 'glyphs.json'))
NAVY, RUST = '#1f2f40', '#8f3f1e'
e = html.escape

def g(o, a='', cls=''):
    c = ' class="%s"' % cls if cls else ''
    return '<g%s transform="%s"><path d="%s"%s/></g>' % (c, o['t'], o['d'], a)

VB = '160 470 1285 760'
def logo(anim=False, aria=True, ink=NAVY, word=True):
    s = '<svg viewBox="%s" xmlns="http://www.w3.org/2000/svg"%s>' % (VB if word else '600 480 400 530', ' role="img" aria-label="Ulew Cafe"' if aria else ' aria-hidden="true"')
    if anim:
        s += '<defs><clipPath id="ridge"><rect x="560" y="420" width="480" height="300"/></clipPath></defs>'
        s += '<g id="u-steam" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round" opacity=".55">' % RUST
        s += '<path class="stm" d="M770 570c-18-24 18-40 0-64s18-40 0-64"/><path class="stm" d="M822 566c-16-22 16-36 0-58s16-36 0-58"/></g>'
        s += '<g id="u-arch">%s</g>' % g(L['arch'], ' fill="%s" stroke="%s" stroke-width="90" class="ap"' % (ink, ink))
        s += '<g clip-path="url(#ridge)"><g id="u-beans">%s</g></g>' % ''.join(g(o, ' fill="%s"' % RUST) for o in L['beans'])
    else:
        s += g(L['arch'], ' fill="%s"' % ink) + ''.join(g(o, ' fill="%s"' % RUST) for o in L['beans'])
    if word:
        s += '<g id="u-word">%s</g>' % ''.join(('<g class="ul">%s</g>' if anim else '%s') % g(o, ' fill="%s"' % ink) for o in L['word'])
    return s + '</svg>'

def glyph(i, cls=''):
    o = GL[i]; x0, y0, x1, y1 = o['box']
    return '<svg class="gl %s" viewBox="%d %d %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">%s</svg>' % (cls, x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12, g(o, ' fill="currentColor"'))

# a woven band like the border on their coffee bags
def weave():
    C = ['#d6263c', '#f2c230', '#b0287a', '#1aa39a', '#ef7d22', '#5b3b8c', '#3f8f3a']
    w, h = 84, 30
    s = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"><rect width="%d" height="%d" fill="#1f2f40"/>' % (w, h, w, h)
    rows = [(0, 3, C[0]), (3, 2, C[1]), (5, 3, C[2]), (24, 3, C[2]), (27, 2, C[1]), (29, 1, C[0])]
    for y, hh, c in rows: s += '<rect y="%d" width="%d" height="%d" fill="%s"/>' % (y, w, hh, c)
    for i in range(6):
        x = i * 14; c = C[(i + 3) % 7]
        s += '<path d="M%d 15l7-7 7 7-7 7z" fill="%s"/><path d="M%d 15l3-3 3 3-3 3z" fill="#f4ede3"/>' % (x, c, x + 4)
        s += '<rect x="%d" y="9" width="2" height="12" fill="%s" opacity=".9"/>' % (x + 13, C[(i + 5) % 7])
    return 'data:image/svg+xml;base64,' + base64.b64encode((s + '</svg>').encode()).decode()

MENU = [
 {'k': 'hot', 'n': 'Hot', 'items': [
   ['Espresso', '', 'Single-origin, rotating through one of five Latin American countries.', 3.00],
   ['Cappuccino', '8 oz', 'Espresso, steamed milk, velvety foam.', 4.00],
   ['Flat white', '8 oz', 'Espresso, microfoam milk.', 4.00],
   ['Americano', '10 oz', 'Espresso pulled over hot water.', 4.00],
   ['Latte', '10 oz', 'Espresso, steamed milk.', 4.50],
   ['Mocha', '10 oz', 'Espresso, dark chocolate, steamed milk.', 4.50],
   ['Black mocha', '10 oz', 'Espresso, dark chocolate and activated charcoal.', 6.00],
   ['Pour over', '10 oz', 'Hand-brewed, single-origin selection.', 6.00],
   ['Drip coffee', '10 oz', 'Daily rotating brew.', 3.00],
   ['Mayan hot chocolate', '10 oz', 'Mexican chocolate, cinnamon, cayenne, steamed milk.', 6.00]]},
 {'k': 'cold', 'n': 'Cold', 'items': [
   ['Iced coffee', '16 oz', 'Cold brew served over ice.', 5.00],
   ['Nitro cold brew', '16 oz', 'Nitrogen-infused cold brew.', 6.00],
   ['Iced Nutella latte', '16 oz', 'Espresso with chocolate hazelnut and milk, topped with house-made cold foam.', 9.50],
   ['Iced matcha pistachio', '16 oz', 'Ceremonial-grade matcha with pistachio syrup over ice, cold foam and ground pistachio.', 10.00],
   ['Strawberry matcha', '16 oz', 'Ceremonial-grade matcha, milk and strawberry purée over ice, topped with cold foam.', 10.00]]},
 {'k': 'tea', 'n': 'Tea', 'items': [
   ['Jasmine pearl', '', 'Green tea leaves with jasmine. Caffeinated.', 4.50],
   ['Earl grey', '', 'Black tea, bergamot oil and natural vanilla. Caffeinated.', 4.50],
   ['Pea flower blossom', '', 'Pea flowers, lemongrass, tea leaves, jasmine petals and elderberry. Caffeinated.', 4.50],
   ['White peach', '', 'Tea leaves, dried peach and rose petals. Caffeinated.', 4.50],
   ['Blood orange hibiscus', '', 'Hibiscus, orange peel, lemongrass, elderberries, apple and rooibos. Caffeine free.', 4.50],
   ['Crimson berry', '', 'Hibiscus, currant, rosehips, elderberry, cranberry and rooibos. Caffeine free.', 4.50],
   ['Mediterranean mint', '', 'Mint leaves. Caffeine free.', 4.50]]},
 {'k': 'food', 'n': 'Food', 'items': [
   ['Green garden toast', '', 'Three corn tostadas with smashed avocado, refried beans, house tomato salsa, red onion, parsley and cotija.', 11.00],
   ['Avocado toast', '', 'Sourdough, smashed avocado, sliced hard-boiled egg and black sesame.', 9.50],
   ['BLT sandwich', '', 'Bacon, lettuce and tomato on sourdough.', 12.00],
   ['Ulew breakfast croissant', '', 'Butter croissant, egg, gouda, bacon, tomato, arugula and balsamic glaze.', 13.25],
   ['Prosciutto sandwich', '', 'Artisan bread, fresh mozzarella, roasted red peppers, arugula, pesto and balsamic glaze.', 14.25],
   ['Grilled chicken pesto', '', 'Artisan bread, grilled chicken, pesto, cherry tomatoes, arugula and roasted red peppers.', 14.25],
   ['Crimson bliss chicken', '', 'Romaine, grilled chicken, strawberries, cherry tomatoes, red onion, candied walnuts and dried cranberries with strawberry dressing.', 14.00]]},
 {'k': 'bagels', 'n': 'Bagels', 'items': [
   ['Cream cheese bagel', '', 'Plain or everything, with cream cheese.', 4.50],
   ['Apollo bagel', '', 'Toasted, with cream cheese, fresh tomato and a pinch of mixed salt.', 5.00]]},
]

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_FB': ic('<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3h-3V7a1 1 0 0 1 1-1h2z"/>'),
     'I_CUP': ic('<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c-1 1.2 1 1.8 0 3M12 3c-1 1.2 1 1.8 0 3"/>'),
     'I_COPY': ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')}

TABS = ''.join('<button type="button" role="tab" class="tab" data-t="%s" aria-selected="%s">%s</button>' % (m['k'], 'true' if i == 0 else 'false', e(m['n'])) for i, m in enumerate(MENU))
GLY = ''.join(glyph(i) for i in range(len(GL)))
t = open(D + 'tpl.html').read()
R = dict(I, LOGO_INTRO=logo(True), LOGO_NAV=logo(False, False), LOGO_FOOT=logo(False), MARK=logo(False, False, word=False), TABS=TABS, MENU=json.dumps(MENU), WEAVE=weave(), GLY=GLY,
         G0=glyph(0), G1=glyph(1), G2=glyph(2), G3=glyph(3), G4=glyph(4))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write(logo(False, False, word=False).replace('<svg ', '<svg width="64" height="64" style="background:#f4ede3;border-radius:14px" ', 1))
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#efe6da;color:#1f2f40;font-family:Poppins}'
      '.lg{position:absolute;left:60px;top:46px;width:440px}.tag{position:absolute;left:66px;top:318px;font:600 24px Poppins;color:#8f3f1e;letter-spacing:.02em}'
      'h1{position:absolute;left:62px;top:372px;width:540px;font:700 46px/1.12 Poppins}'
      '.pill{position:absolute;left:62px;bottom:64px;font-size:22px;color:#4d5a69}'
      '.wv{position:absolute;left:0;right:0;bottom:0;height:30px;background:url(' + weave() + ') repeat-x}'
      '.ph{position:absolute;top:30px;right:30px;bottom:60px;width:500px;border-radius:24px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 55%}'
      '</style></head><body><div class="lg">' + logo(False) + '</div><div class="tag">Specialty Coffee &amp; More</div><h1>100% Guatemalan coffee on Main Street</h1>'
      '<div class="pill">622 Main St, Royersford, PA</div><div class="ph"><img src="../media/pourover.webp"></div><div class="wv"></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:180px;height:180px;background:#f4ede3;display:grid;place-items:center"><div style="width:120px">' + logo(False, False, word=False) + '</div></body>')
print(len(t) // 1024, 'KB')
