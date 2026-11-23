"""La Plazita Events: builds index.html, favicon.svg, render/og.html and render/icon.html.
The logo is their own (the cart-and-umbrella mark from their site), potraced into parts in plogo.json:
roof, pole, counter, wl/wr/axle (wheels), s0..s9 (La Plazita letters), e0..e5 (EVENTS), spark (gold).
Facts: laplazitaevents.com (home, /ourservices, /faqs, /requestaquote) + @laplazitaevents on Instagram.
Run: python3 render/src/build.py  (then node .claude/skills/ela-studio/kit/og/card.mjs laplazita <url>)"""
import os, re, json, html
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.normpath(D + '../..') + '/'
L = json.load(open(D + 'plogo.json'))
ROSE, GOLD = '#c48a7b', '#cfa968'
QUOTE = 'https://www.laplazitaevents.com/requestaquote'
PHONE, PHONE_H = '+17143811104', '714-381-1104'
EMAIL = 'laplazitaevents@gmail.com'
IG, TT = 'https://www.instagram.com/laplazitaevents/', 'https://www.tiktok.com/@laplazitaevents'

def bbox(d):
    xs, ys = [], []; x = y = 0
    for cmd, args in re.findall(r'([MmCcLlZz])([^MmCcLlZz]*)', d):
        n = [float(v) for v in re.findall(r'-?\d+\.?\d*', args)]
        if cmd == 'M': x, y = n[0], n[1]; xs.append(x); ys.append(y)
        elif cmd == 'm': x += n[0]; y += n[1]; xs.append(x); ys.append(y)
        elif cmd == 'c':
            for k in range(0, len(n), 6):
                for j in (0, 2, 4): xs.append(x + n[k + j]); ys.append(y + n[k + j + 1])
                x += n[k + 4]; y += n[k + 5]
        elif cmd == 'l':
            for k in range(0, len(n), 2): x += n[k]; y += n[k + 1]; xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)

def union(keys, pad=6):
    b = [bbox(L[k]) for k in keys]
    return (min(v[0] for v in b) - pad, min(v[1] for v in b) - pad, max(v[2] for v in b) + pad, max(v[3] for v in b) + pad)

UM = ['roof', 'pole', 'counter']; WORD = ['s%d' % i for i in range(10)]; EV = ['e%d' % i for i in range(6)]; WH = ['wl', 'axle', 'wr']
B = {'um': union(UM), 'word': union(WORD), 'ev': union(EV), 'sp': union(['spark'], 14), 'wh': union(WH)}
ALL = union(UM + WORD + EV + WH + ['spark'], 10)
def vb(b): return '%.1f %.1f %.1f %.1f' % (b[0], b[1], b[2] - b[0], b[3] - b[1])
def place(b):  # css box of a part inside the full-logo box, in %
    W, H = ALL[2] - ALL[0], ALL[3] - ALL[1]
    return 'left:%.3f%%;top:%.3f%%;width:%.3f%%;height:%.3f%%' % ((b[0] - ALL[0]) / W * 100, (b[1] - ALL[1]) / H * 100, (b[2] - b[0]) / W * 100, (b[3] - b[1]) / H * 100)
def p(k, fill=ROSE, cls='', extra=''):
    return '<path%s d="%s" fill="%s"%s/>' % (' class="%s"' % cls if cls else '', L[k], fill, extra)
def c(k):
    b = bbox(L[k]); return '%.1f %.1f' % ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

# nav brand (umbrella cart + script wordmark)
NAV = ('<svg class="nm" viewBox="%s" aria-hidden="true">%s</svg><svg class="nw" viewBox="%s" aria-hidden="true">%s</svg>'
       % (vb(B['um']), ''.join(p(k, 'currentColor') for k in UM), vb(B['word']), ''.join(p(k, 'currentColor') for k in WORD)))
FULL = '<svg viewBox="%s" aria-hidden="true">%s%s</svg>' % (vb(ALL), ''.join(p(k, 'currentColor') for k in UM + WORD + EV + WH), p('spark', GOLD))

# opening: each part is its own svg so the umbrella and the wordmark can fly to their nav spots
def isvg(id_, b, inner, defs=''):
    return '<svg id="%s" class="ip" viewBox="%s" style="%s" aria-hidden="true">%s%s</svg>' % (id_, vb(b), place(b), defs, inner)
INTRO = (
    isvg('i-wh', B['wh'], '<g id="iwl">%s</g><g id="iaxle">%s</g><g id="iwr">%s</g>' % (p('wl'), p('axle'), p('wr')))
    + isvg('i-um', B['um'], p('counter', ROSE, 'ic') + p('pole', ROSE, 'ipo') + p('roof', ROSE, 'iro'))
    + isvg('i-word', B['word'], ''.join(p(k, ROSE, 'il') for k in WORD)
           + '<rect id="isweep" x="%.0f" y="%.0f" width="140" height="%.0f" fill="url(#gsw)" clip-path="url(#cw)" transform="skewX(-20)"/>' % (B['word'][0] - 300, B['word'][1] - 20, B['word'][3] - B['word'][1] + 40),
           '<defs><clipPath id="cw">%s</clipPath><linearGradient id="gsw" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff6e0" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' % ''.join('<path d="%s"/>' % L[k] for k in WORD))
    + isvg('i-ev', B['ev'], ''.join(p(k, ROSE, 'ie') for k in EV))
    + isvg('i-sp', B['sp'], p('spark', GOLD, 'isp'))
)
ORIG = {'roof': '%.1f %.1f' % ((bbox(L['roof'])[0] + bbox(L['roof'])[2]) / 2, bbox(L['roof'])[1]), 'pole': '%.1f %.1f' % ((bbox(L['pole'])[0] + bbox(L['pole'])[2]) / 2, bbox(L['pole'])[3]),
        'wl': c('wl'), 'wr': c('wr'), 'axle': c('axle'), 'spark': c('spark')}

# favicon: the cart on its wheels (wheels tucked under the counter), on a cream tile
cb = bbox(L['counter']); wb = union(WH, 0); dy = cb[3] + 26 - wb[1]
fb = (min(B['um'][0], wb[0]) - 40, B['um'][1] - 40, max(B['um'][2], wb[2]) + 40, wb[3] + dy + 40)
side = max(fb[2] - fb[0], fb[3] - fb[1]); cx, cy = (fb[0] + fb[2]) / 2, (fb[1] + fb[3]) / 2
FAV = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.0f %.0f %.0f %.0f"><rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="%.0f" fill="#fbf4ea"/>%s<g transform="translate(0 %.1f)">%s</g></svg>'
       % (cx - side / 2, cy - side / 2, side, side, cx - side / 2, cy - side / 2, side, side, side * .22, ''.join(p(k, '#b8786a') for k in UM), dy, ''.join(p(k, '#b8786a') for k in WH)))

# their services, word for word from laplazitaevents.com/ourservices (photo order matches their page)
BARS = [
  ('Slushy Bar', '2 servings per guest, 8 oz custom cups, straws and napkins', 'Fresh fruit, gummies and candies, flowers, rim dip', 'Pick 2: strawberry lemonade, blueberry, mango, pineapple, grape, lime, peach, watermelon, lemonade, strawberry, fruit punch, raspberry lemonade', ''),
  ('Esquites', '1 serving per guest, plates, forks or spoons and napkins', 'Mayo, lime, cotija, butter, chili powder, Valentina, Tapatío, crushed Hot Cheetos', '', ''),
  ('Nacho Bar', '1 serving per guest, plates, forks or spoons and napkins', 'Tortilla chips, nacho cheese, cotija, jalapeños, sour cream, pico de gallo', '', 'Other chips can be requested.'),
  ('Aguas Frescas', 'Up to 2 servings per guest, cups, straws and rim dip', '', 'Pick 3: horchata, pineapple, watermelon, lime with chia seeds, cucumber lime, jamaica, mango, strawberry', ''),
  ('Waffle Pops', '1 waffle pop per guest, plates, napkins and forks', 'Strawberries, banana, mini marshmallows, sprinkles, crushed Oreos, shredded coconut, Fruity Pebbles, condensed milk, Nutella, maple syrup', '', ''),
  ('Michelada Bar', '24 oz cups and michelada mix', 'Celery and cucumber sticks, saladitos, tamarindo sticks, olives, Japanese peanuts', '', "We don't serve beer, but you're welcome to provide it."),
  ('Coffee Bar', '1 serving per guest, cups, straws, whole or oat milk', '', 'Pick 3: Vanilla Matcha, El Churrito, Mazapán Latte (contains peanuts), La Galletita Latte, Café de Olla Latte, El Mexicano, Americano', 'Served iced, hot on request.'),
  ('Paleta Bar', '1 serving per guest, plates and napkins', 'Fresh fruit, gummies and candies, chamoy, Tajín, lechera', 'Milk based: strawberry, mango, coconut. Water based: strawberry, lime, pineapple', ''),
  ('Tostilocos', '1 serving per guest, plates, forks or spoons and napkins', 'Mango, cucumber, jícama, Japanese peanuts, cueritos, chamoy, lime, hot sauce, Chaca Chacas, Tajín', '', ''),
  ('Maruchan Bar', '1 serving per guest, plates, forks or spoons and napkins', 'Lime, hot sauce, chamoy, jalapeños, cilantro, onion, cheese Doritos, Takis, Hot Cheetos', '', ''),
  ('Dubai Strawberry Cups', '1 serving per guest, 8 oz custom cups, straws and napkins', 'Kataifi pistachio mix, melted milk chocolate', '', ''),
  ('Bionicos', '1 serving per guest, cups, forks or spoons and napkins', 'Sweet cream, shredded coconut, granola', 'Fruit: strawberry, banana, apple, pineapple, melon', ''),
  ('Acai Bar', '1 serving per guest in 12 oz deli cups', 'Strawberry, banana, blueberries, chia seeds, granola, shredded coconut, peanut butter and honey drizzles', '', ''),
  ('Mini Pancakes', '8 mini pancakes per guest, plates, forks and napkins', 'Strawberries, banana, Nutella, condensed milk, whipped cream, mini marshmallows, Fruity Pebbles, crushed Oreos, maple syrup, shredded coconut', '', ''),
  ('Snack Bar', '1 serving per guest, plates, forks or spoons and napkins', '3 kinds of chips, watermelon, jícama, cucumber, gummies and candies, lemon, chamoy, Tajín, Valentina', '', ''),
  ('Fresas con Crema', '1 serving per guest, plates, forks or spoons and napkins', 'Whipped cream, granola, chocolate chips, shredded coconut', '', ''),
  ('Soft Serve', '1 serving per guest, cups, spoons and napkins', 'Mini marshmallows, sprinkles, fresh strawberries, crushed Oreos, shredded coconut, Fruity Pebbles, chocolate, strawberry and caramel drizzle', 'Pick 1: vanilla, chocolate, strawberry, salted caramel, pineapple, mango', "More flavors are extra. Don't see yours? Ask."),
  ('Churros', '2 mini churros per serving, served warm', 'Mini marshmallows, sprinkles, fresh strawberries, crushed Oreos, shredded coconut, Fruity Pebbles, chocolate, strawberry and caramel drizzle', '', 'Churro sundaes add 2 ice cream flavors.'),
  ('Crepes', '1 crepe per guest, plates, napkins and forks', 'Strawberries, banana, mini marshmallows, sprinkles, crushed Oreos, shredded coconut, Fruity Pebbles, condensed milk, Nutella, maple syrup', '', ''),
]
ALT = ['Slushy cart with a pink fringe umbrella', 'Esquites cup with lime and crushed Hot Cheetos', 'Nacho cup held up at the nacho bar', 'Agua fresca with a chamoy rim',
       'Waffle pop with whipped cream at the Waffle Pop Bar', 'Michelada with a tamarindo straw', 'Iced coffee from the coffee bar', 'Paleta dressed with fruit and chamoy in front of the paleta menu',
       'Tostilocos cup over the topping trays', 'Maruchan bar toppings laid out at a night event', 'Dubai strawberry cup with chocolate and kataifi pistachio', 'Bionico cup with sweet cream and coconut',
       'Acai bowl at the Rizos Curls and Ulta Beauty acai bar', 'Mini pancakes on the griddle', 'Snack bar cup in front of the La Plazita cart', 'Fresas con crema with whipped cream',
       'Soft serve cup with drizzle and sprinkles', 'Mini churros in paper boats', 'Crepe with chocolate drizzle at the crepe cart']
DATA = [{'n': b[0], 'inc': b[1], 'top': b[2], 'fl': b[3], 'note': b[4], 'alt': ALT[i]} for i, b in enumerate(BARS)]
CHIPS = ''.join('<button class="chip" data-i="%d" aria-pressed="%s">%s</button>' % (i, 'true' if i == 0 else 'false', html.escape(b[0])) for i, b in enumerate(BARS))

REELS = [('quince', 'Crepe cart at a quince', 'Fresh crepes for the quinceañera and her court.'),
         ('wedding', 'Maruchan Bar', 'Late-night cups for the wedding crowd, loaded with Takis and Hot Cheetos.'),
         ('ulta', 'Acai Bar for Rizos Curls x Ulta Beauty', 'They had us back again for their in-store event.'),
         ('pancakes', 'Mini Pancake Cart', 'Straight off the griddle, topped however you want.'),
         ('bionico', 'Biónico Cart', 'Toppings going in before the doors open.')]
REEL = ''.join('<figure class="reel rv"><div class="arch"><video muted loop playsinline preload="none" poster="media/r-%s.webp" data-src="media/r-%s.mp4" aria-label="%s"></video></div><figcaption><b>%s</b><span>%s</span></figcaption></figure>'
               % (k, k, html.escape(t), html.escape(t), html.escape(d)) for k, t, d in REELS)
REEL_DOTS = ''.join('<i></i>' for _ in REELS)

def ic(pth): return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % pth
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_MAIL': ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_TT': ic('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.3 4.3 5 4.5"/>'),
     'I_PLUS': ic('<path d="M12 5v14M5 12h14"/>'),
     'I_L': ic('<path d="m15 18-6-6 6-6"/>'), 'I_R': ic('<path d="m9 18 6-6-6-6"/>'),
     'I_SPARK': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 5 2.4 8.2 8 10-5.6 1.8-7.4 5-8 10-.6-5-2.4-8.2-8-10 5.6-1.8 7.4-5 8-10z" fill="currentColor"/></svg>'}

# string of bulbs for the closer (svg, glow is a radial gradient so nothing animates a filter)
def garland(w=1200, n=22, sag=46):
    pts = [(w * i / (n - 1), 14 + sag * 4 * (i / (n - 1)) * (1 - i / (n - 1))) for i in range(n)]
    d = 'M' + ' '.join('%.1f %.1f' % q for q in [(w * t / 60, 8 + sag * 4 * (t / 60) * (1 - t / 60)) for t in range(61)])
    b = ''.join('<g class="bulb" style="--d:%.2fs"><circle cx="%.1f" cy="%.1f" r="22" fill="url(#bg)"/><circle cx="%.1f" cy="%.1f" r="4.2" fill="#fff1d6"/></g>' % (i * .09, x, y + 9, x, y + 9) for i, (x, y) in enumerate(pts))
    return ('<svg class="garland" viewBox="0 0 %d 90" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="bg"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".85"/><stop offset=".35" stop-color="#ff9e5a" stop-opacity=".28"/><stop offset="1" stop-color="#ff9e5a" stop-opacity="0"/></radialGradient></defs><path d="%s" fill="none" stroke="#6a4a4a" stroke-width="1.5"/>%s</svg>' % (w, d, b))

t = open(D + 'tpl.html').read()
R = dict(I, NAV=NAV, FULL=FULL, INTRO=INTRO, CHIPS=CHIPS, DATA=json.dumps(DATA, ensure_ascii=False).replace('</', '<\\/'), REEL=REEL, REEL_DOTS=REEL_DOTS,
         GARLAND=garland(), LOGO_AR='%.1f / %.1f' % (ALL[2] - ALL[0], ALL[3] - ALL[1]), QUOTE=QUOTE, PHONE=PHONE, PHONE_H=PHONE_H, EMAIL=EMAIL, IG=IG, TT=TT, N=str(len(BARS)),
         O_ROOF=ORIG['roof'], O_POLE=ORIG['pole'], O_WL=ORIG['wl'], O_WR=ORIG['wr'], O_AXLE=ORIG['axle'], O_SP=ORIG['spark'],
         BAR0_INC=html.escape(BARS[0][1]), BAR0_TOP=html.escape(BARS[0][2]), BAR0_FL=html.escape(BARS[0][3]), BAR0_ALT=html.escape(ALT[0]))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
# keep the link-preview tags card.mjs wrote last time
old = open(S + 'index.html').read() if os.path.exists(S + 'index.html') else ''
tags = re.findall(r'<(?:meta (?:property|name)="(?:og|twitter):[^>]*|link rel="(?:canonical|apple-touch-icon)"[^>]*)>', old)
if tags: t = re.sub(r'(<meta name="description"[^>]*>)', lambda m: m.group(1) + '\n' + '\n'.join(tags), t, count=1)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write(FAV)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#fbf4ea">' + FAV.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')
print('index', len(t) // 1024, 'KB')

og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500;1,600&family=Karla:wght@500;700&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#fbf4ea;color:#3b2226;font-family:Karla}'
      '.glow{position:absolute;left:-120px;top:-160px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,#f3d6cb 0,rgba(243,214,203,0) 68%)}'
      '.logo{position:absolute;left:62px;top:40px;width:330px;color:#c48a7b}.logo svg{width:100%;height:auto;display:block}'
      'h1{position:absolute;left:64px;top:392px;width:560px;font:italic 600 46px/1.08 "Playfair Display";color:#3b2226}'
      '.loc{position:absolute;left:64px;bottom:46px;display:flex;gap:14px;align-items:center;font:700 24px Karla;letter-spacing:.06em}'
      '.loc b{background:#3b2226;color:#fbf4ea;padding:8px 16px;border-radius:999px;font-weight:700}.loc span{color:#9a5f52}'
      '.ph{position:absolute;top:34px;width:300px;height:562px;border-radius:150px 150px 22px 22px;overflow:hidden;border:5px solid #fff;box-shadow:0 18px 40px rgba(59,34,38,.22)}'
      '.ph img{width:100%;height:100%;object-fit:cover}.a{left:640px}.b{left:868px;top:70px;height:526px}'
      '.sp{position:absolute;color:#cfa968;width:34px}.sp svg{width:100%}'
      '</style></head><body><div class="glow"></div><div class="logo">' + FULL + '</div>'
      '<h1>Luxury snack and dessert carts for your next party</h1><div class="loc"><b>OC · LA · IE</b><span>Latina-owned, sister-run</span></div>'
      '<div class="ph a"><img src="../media/carts-tall.webp"></div><div class="ph b"><img src="../media/c/18.webp"></div>'
      '<div class="sp" style="left:600px;top:60px">' + I['I_SPARK'] + '</div></body></html>')
open(D + '../og.html', 'w').write(og)
