"""Sip N' Coffee: builds index.html, favicon.svg, render/og.html and render/icon.html from tpl.html.
The logo is their own round badge (sip_n_logo_wood.png from sipncoffee.co), potraced by trace.py into slogo.json:
ring, arc, dotL/dotR, l0..l10 (SIP N' COFFEE), birds, women, cart, sign ("Coffee" script), wheelL/wheelR, florL/florR.
The steam over the left cup is two hairlines in the source, too faint to trace, so it is drawn here as two strokes
through points read off the original at 10x zoom.
Facts: sipncoffee.co (home page + its Google booking form) and the @sipncoffee.co Instagram bio the user sent.
Run: python3 render/src/build.py   (then node .claude/skills/ela-studio/kit/og/card.mjs sipncoffee <url>)"""
import os, re, json, html, math
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.normpath(D + '../..') + '/'
L = json.load(open(D + 'slogo.json'))
WH = L.pop('_wheels'); FAVD = L.pop('_fav'); L.pop('steam', None)

FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSc9nA5a8e0N0hO7ldNvkEMSPvnMj84iYbDYZlPa8NViYqbSIg/viewform'
EMAIL = 'sipncoffee.co@gmail.com'
PHONES = [('+17089725960', '(708) 972-5960'), ('+17083238414', '(708) 323-8414')]
IG, TT = 'https://www.instagram.com/sipncoffee.co/', 'https://www.tiktok.com/@sipncoffee.co'
# Google Form entry ids (from the form's public page) so the menu picks can prefill it
ENTRY = {'service': 1257254519, 'flavors': 2083206489, 'special': 2074354249, 'milk': 486629510, 'drizzle': 1887621630,
         'extras': 1457753813, 'event': 1989331199, 'guests': 2126665151, 'date': 2084063411, 'signature': 1622317009}

# ---------- steam: two interlaced curls (840 box) ----------
def catmull(pts):
    d = 'M%.1f %.1f' % pts[0]
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (c1 + c2 + p2)
    return d
def z(pts): return [(370 + x / 5, 270 + y / 5) for x, y in pts]
ST1 = catmull(z([(110, 545), (100, 500), (130, 455), (112, 415), (148, 375), (140, 330), (178, 298), (168, 250), (132, 205), (122, 160)]))
ST2 = catmull(z([(205, 495), (218, 445), (205, 400), (232, 345), (268, 312), (282, 270), (245, 240), (212, 205), (238, 165), (290, 150)]))

# ---------- geometry helpers ----------
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
def union(keys):
    b = [bbox(L[k]) for k in keys]
    return min(v[0] for v in b), min(v[1] for v in b), max(v[2] for v in b), max(v[3] for v in b)

LET = ['l%d' % i for i in range(11)]
FRAME = ['ring', 'arc', 'dotL', 'dotR']
CAR = ['cart', 'sign', 'women', 'wheelL', 'wheelR']
ALLK = FRAME + LET + ['birds', 'florL', 'florR'] + CAR

# one copy of every path, referenced everywhere with <use>
DEFS = ('<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'
        + ''.join('<path id="k-%s" d="%s" fill="currentColor"/>' % (k, L[k]) for k in ALLK)
        + '<path id="k-st1" d="%s" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' % ST1
        + '<path id="k-st2" d="%s" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' % ST2
        + '<radialGradient id="gwash" cx=".46" cy=".4" r=".62"><stop offset="0" stop-color="#ead4b6"/><stop offset=".7" stop-color="#d9b88f"/><stop offset="1" stop-color="#c9a275"/></radialGradient>'
        + '<g id="k-badge"><circle cx="420" cy="420" r="392" fill="url(#gwash)"/>' + ''.join('<use href="#k-%s"/>' % k for k in ALLK) + '<use href="#k-st1"/><use href="#k-st2"/></g>'
        + '</defs></svg>')
BADGE = '<svg viewBox="0 0 840 840" aria-hidden="true"><use href="#k-badge"/></svg>'

# ---------- the opening ----------
def lc(k):
    b = bbox(L[k]); return (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
lets = ''
for k in LET:
    cx, cy = lc(k); dx, dy = cx - 420, cy - 420; n = math.hypot(dx, dy)
    lets += '<use class="il" href="#k-%s" data-dx="%.3f" data-dy="%.3f"/>' % (k, dx / n, dy / n)
fl, fr = bbox(L['florL']), bbox(L['florR'])
INTRO = ('<svg id="isvg" viewBox="0 0 840 840" aria-hidden="true"><defs>'
         '<linearGradient id="gsw" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fffaf0" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
         '<clipPath id="csw"><circle cx="420" cy="420" r="392"/></clipPath></defs>'
         '<circle id="iwash" cx="420" cy="420" r="392" fill="url(#gwash)"/>'
         '<g id="iframe"><use class="dr" href="#k-ring"/><use class="dr" href="#k-arc"/></g>'
         '<use id="idotL" href="#k-dotL"/><use id="idotR" href="#k-dotR"/>'
         '<g id="iflL"><use class="dr" href="#k-florL"/></g><g id="iflR"><use class="dr" href="#k-florR"/></g>'
         '<g id="icar"><use class="dr" href="#k-cart"/><use id="iwomen" class="dr" href="#k-women"/><use id="isign" href="#k-sign"/>'
         '<g id="iwL"><use href="#k-wheelL"/></g><g id="iwR"><use href="#k-wheelR"/></g></g>'
         '<g id="isteam"><use id="ist1" href="#k-st1"/><use id="ist2" href="#k-st2"/></g>'
         '<use id="ibirds" href="#k-birds"/>'
         '<g id="iword">' + lets + '</g>'
         '<g clip-path="url(#csw)"><rect id="isweep" x="-300" y="0" width="210" height="840" fill="url(#gsw)" transform="skewX(-18)"/></g>'
         '</svg>')
O = {'O_WL': '%.1f %.1f' % tuple(WH['wheelL']), 'O_WR': '%.1f %.1f' % tuple(WH['wheelR']), 'WRAD': '%.1f' % WH['r'],
     'O_FL': '%.1f %.1f' % ((fl[0] + fl[2]) / 2, fl[3]), 'O_FR': '%.1f %.1f' % ((fr[0] + fr[2]) / 2, fr[3])}

# ---------- the cart on the skyline (women + cart + wheels, ink) ----------
cb = union(CAR)
CARW, CARH = cb[2] - cb[0], cb[3] - cb[1]
SKYCART = ('<g id="scar"><g id="scar-in" transform="scale(%.4f) translate(%.1f %.1f)">' % (118 / CARH, -cb[0], -cb[1])
           + '<use href="#k-cart"/><use href="#k-women"/><use href="#k-sign"/>'
           + '<g id="swL"><use href="#k-wheelL"/></g><g id="swR"><use href="#k-wheelR"/></g></g></g>')
SKY_CW = CARW * 118 / CARH

def skyline():
    """Chicago in their line style: ground line, Marina City, Willis, Aon, Trump, Hancock, the Water Tower, the Bean,
    the Centennial Wheel and the lake, plus state-line signs at both ends. Each piece draws itself as the cart passes."""
    G = 330; out = []
    def bld(x, d, extra=''):
        out.append('<path class="sk" data-x="%d" pathLength="1" d="%s"%s/>' % (x, d, extra))
    def win(x0, x1, y0, y1, step=14, gap=7):
        d = ''
        for y in range(int(y0), int(y1), step): d += 'M%d %dH%d' % (x0, y, x1)
        return d
    def box(x, w, top, wins=True):
        d = 'M%d %dV%dH%dV%d' % (x, G, top, x + w, G)
        if wins: d += win(x + 6, x + w - 6, top + 14, G - 10, 16)
        return d
    # Wisconsin sign
    bld(40, 'M60 %dV250M30 222h64v28h-64z' % G)
    out.append('<text x="62" y="241" class="skt">WI</text>')
    bld(120, 'M120 %dc0-40 10-60 22-60s22 20 22 60M142 %dV296' % (G, G))  # tree
    bld(200, box(200, 50, 250))
    # Marina City corncobs
    for x in (270, 318):
        d = 'M%d %dV120a20 20 0 0 1 40 0V%d' % (x, G, G)
        for y in range(130, 320, 12): d += 'M%d %dq20 7 40 0' % (x, y)
        bld(x, d)
    bld(370, box(370, 46, 190))
    # Willis Tower: stepped tubes and twin antennas
    bld(430, 'M430 %dV120H452V64H474V40H496V64H518V150H530V%d' % (G, G) + 'M478 40V4M492 40V10' + win(436, 524, 168, G - 10, 13) + 'M452 80V320M474 56V320M496 56V320')
    bld(548, box(548, 40, 220))
    # Aon Center
    bld(600, 'M600 %dV86H650V%d' % (G, G) + ''.join('M%d 92V%d' % (x, G - 6) for x in range(608, 650, 8)))
    # Trump Tower: setbacks and spire
    bld(672, 'M672 %dV150L680 150V110L690 110V76L700 76V52L708 52V76L718 76V110L728 110V150L736 150V%d' % (G, G) + 'M704 52V6' + win(678, 730, 166, G - 10, 15))
    bld(752, box(752, 34, 236))
    # John Hancock: tapered, X-braced, two antennas
    d = 'M800 %dL812 74H858L870 %d' % (G, G) + 'M822 74V30M848 74V30'
    for (ya, yb) in ((74, 138), (138, 202), (202, 266), (266, 330)):
        xa0 = 812 - (ya - 74) * 12 / 256; xa1 = 858 + (ya - 74) * 12 / 256; xb0 = 812 - (yb - 74) * 12 / 256; xb1 = 858 + (yb - 74) * 12 / 256
        d += 'M%.1f %dL%.1f %dM%.1f %dL%.1f %dM%.1f %dH%.1f' % (xa0, ya, xb1, yb, xa1, ya, xb0, yb, xb0, yb, xb1)
    bld(800, d)
    # the Water Tower
    bld(892, 'M892 %dV272H906V240L914 222L922 240V272H936V%d' % (G, G) + 'M906 272H922M914 222V206')
    bld(950, box(950, 54, 200))
    # Cloud Gate
    bld(1020, 'M1022 %dc4-30 26-38 46-38s42 8 46 38c-10-8-24-12-46-12s-36 4-46 12z' % G)
    bld(1130, box(1130, 44, 168))
    bld(1182, box(1182, 36, 214))
    bld(1226, box(1226, 48, 250))
    # Centennial Wheel on the pier
    cx, cy, r = 1360, 236, 74
    d = 'M%d %da%d %d 0 1 0 %d 0a%d %d 0 1 0 -%d 0' % (cx - r, cy, r, r, 2 * r, r, r, 2 * r)
    for k in range(12):
        a = k * math.pi / 6; d += 'M%d %dL%.1f %.1f' % (cx, cy, cx + r * math.cos(a), cy + r * math.sin(a))
    d += 'M%d %dL%d %dL%d %d' % (cx - 34, G, cx, cy, cx + 34, G)
    bld(1290, d)
    # the lake and the Indiana sign
    bld(1450, ''.join('M%d %dq9 -6 18 0t18 0' % (x, y) for x, y in ((1450, 312), (1490, 322), (1470, 300), (1515, 306))))
    bld(1540, 'M1562 %dV250M1532 222h64v28h-64z' % G)
    out.append('<text x="1564" y="241" class="skt">IN</text>')
    out.append('<text x="430" y="352" class="skl">Chicago</text>')
    ground = '<path class="gnd" d="M0 %dH1600" pathLength="1"/>' % G
    return ground + ''.join(out)
SKY = skyline()

# ---------- menu, word for word from their booking form ----------
FLAVORS = [('Brown Sugar', '#9a6a3c'), ('Vanilla', '#e8d6a8'), ('Caramel', '#c58a45'), ('Salted Caramel', '#b8783c'), ('Cookie Dough', '#d9b48a'),
           ('Hazelnut', '#8a5a34'), ('Butter pecan', '#c79a62'), ('Coconut', '#f2ebdc'), ('Lavender', '#b9a3cc')]
SPECIAL = [('Spanish Latte', '#d8b487'), ('Biscoff Latte', '#b5733c'), ('Strawberry Matcha', '#7fa35a')]
MILK = ['Whole Milk', 'Oat Milk', 'Almond Milk']
DRIZZLE = ['Caramel', 'Mocha', 'White Mocha']
EXTRAS = ['Custom logo cups', 'Cold foam', 'Strawberry Lemonade Refresher', 'Mint Lemonade']
SERVICE = [('Coffee', 'Coffee'), ('Matcha', 'Matcha'), ('Both (Additional Fee)', 'Both')]
def chip(group, val, label=None, dot=None, max_=0):
    return ('<button type="button" class="chip" data-g="%s" data-v="%s" aria-pressed="false">%s%s</button>'
            % (group, html.escape(val), '<i style="background:%s"></i>' % dot if dot else '', html.escape(label or val)))
CH_FLAV = ''.join(chip('flavors', n, dot=c) for n, c in FLAVORS)
CH_SPEC = ''.join(chip('special', n, dot=c) for n, c in SPECIAL)
CH_MILK = ''.join(chip('milk', n) for n in MILK)
CH_DRIZ = ''.join(chip('drizzle', n) for n in DRIZZLE)
CH_EXTR = ''.join(chip('extras', n) for n in EXTRAS)
CH_SERV = ''.join(chip('service', v, l) for v, l in SERVICE)

# ---------- events (their photos from sipncoffee.co) ----------
EVENTS = [('g-bride', 'Weddings', 'A bride stops at the cart for her drink.', 'A bride in red and gold being handed a latte at the Sip N\' Coffee cart'),
          ('g-couple', 'The couple\'s table', 'Bride and groom, each with a latte from the cart.', 'Bride and groom holding iced lattes at their table'),
          ('g-matcha', 'Matcha too', 'Iced matcha in our cup, out on the lawn.', 'Iced matcha in a Sip N\' Coffee cup between white flowers under a tree'),
          ('g-shop', 'Shop days', 'Two lattes and a wall of pink balloons.', 'Two iced lattes held up in front of pink balloons at a shop'),
          ('g-tree', 'Outdoors', 'Set up under a big tree with fresh flowers on the counter.', 'Espresso machine and syrups on the cart counter under a tree'),
          ('g-venue', 'Any venue', 'Our black cart, ready before the doors open.', 'The black Sip N\' Coffee cart with the round logo at a venue')]
GAL_IMGS = ''.join('<img src="media/%s.webp" alt="%s" width="800" height="800" loading="lazy" decoding="async"%s>' % (f, html.escape(a), ' class="on"' if i == 0 else '') for i, (f, t, c, a) in enumerate(EVENTS))
GAL_DOTS = ''.join('<button type="button" aria-label="Photo %d: %s"%s></button>' % (i + 1, html.escape(t), ' class="on"' if i == 0 else '') for i, (f, t, c, a) in enumerate(EVENTS))
GAL_DATA = json.dumps([{'src': 'media/%s.webp' % f, 't': t, 'c': c} for f, t, c, a in EVENTS], ensure_ascii=False)

# ---------- reviews, word for word from their site ----------
REVIEWS = ["Thank you sooo much for last night! I am the pickiest person when it comes to coffee but Wallah it's the best coffee I've ever had!!! You guys are the sweetest thank you for helping make it a perfect night you're amazing",
           "Thank you soooo much for being part of my day and making it incredible!!! We got s0000000 many compliments and thanks for the coffee!!! I was so busy i almost didn't get to try but aA i had my sisters and was shoooooook at how good it was like yall making the best coffee on the go I am massively impressed and will be sharing and posting and telling everyone!! I really appreciate yall coming and handling everything and being so seamless, genuinely took so much pressure off on this day and we're so incredible!! Appreciate you all so much!",
           "Thank you both so so much! It was absolutely perfect! Really appreciate y'all powering through, I know it got busy! Looking forward to booking you again in the future!"]
REV = ''.join('<figure class="rev rv"><svg class="q" viewBox="0 0 32 24" aria-hidden="true"><path d="M0 24V14C0 6 4 1 12 0l1 4C8 6 6 9 6 12h6v12zm19 0V14c0-8 4-13 12-14l1 4c-5 2-7 5-7 8h6v12z" fill="currentColor"/></svg><blockquote>%s</blockquote></figure>' % html.escape(r) for r in REVIEWS)
REV_DOTS = ''.join('<i%s></i>' % (' class="on"' if i == 0 else '') for i in range(len(REVIEWS)))

CRAFT = [('shots', 'Shots pulled fresh for every cup'), ('grinder', 'Beans ground right at the cart'), ('iced', 'Iced, in our 12 oz cups'), ('setup', 'Syrups, machine and grinder, all on the cart')]
CR = ''.join('<figure class="cr rv"><img src="media/%s.webp" alt="%s" width="600" height="600" loading="lazy" decoding="async"><figcaption>%s</figcaption></figure>' % (f, html.escape(c), html.escape(c)) for f, c in CRAFT)
CR_DOTS = ''.join('<i%s></i>' % (' class="on"' if i == 0 else '') for i in range(len(CRAFT)))

def ic(pth): return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % pth
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_MAIL': ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_TT': ic('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.3 4.3 5 4.5"/>'),
     'I_L': ic('<path d="m15 18-6-6 6-6"/>'), 'I_R': ic('<path d="m9 18 6-6-6-6"/>'),
     'I_ARROW': ic('<path d="M5 12h14M13 6l6 6-6 6"/>')}
ARC = '<svg class="arcdiv" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M60 14Q600 110 1140 14" pathLength="1"/><circle cx="60" cy="14" r="6"/><circle cx="1140" cy="14" r="6"/></svg>'

t = open(D + 'tpl.html').read()
R = dict(I, **O, DEFS=DEFS, BADGE=BADGE, INTRO=INTRO, SKY=SKY, SKYCART=SKYCART, SKY_CW='%.1f' % SKY_CW, ARC=ARC,
         CH_FLAV=CH_FLAV, CH_SPEC=CH_SPEC, CH_MILK=CH_MILK, CH_DRIZ=CH_DRIZ, CH_EXTR=CH_EXTR, CH_SERV=CH_SERV,
         ENTRY=json.dumps(ENTRY), GAL_IMGS=GAL_IMGS, GAL_DOTS=GAL_DOTS, GAL_DATA=GAL_DATA.replace('</', '<\\/'),
         GAL_T0=html.escape(EVENTS[0][1]), GAL_C0=html.escape(EVENTS[0][2]), REV=REV, REV_DOTS=REV_DOTS, CR=CR, CR_DOTS=CR_DOTS,
         FORM=FORM, EMAIL=EMAIL, P1=PHONES[0][0], P1H=PHONES[0][1], P2=PHONES[1][0], P2H=PHONES[1][1], IG=IG, TT=TT)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
# keep the link-preview tags card.mjs wrote last time
old = open(S + 'index.html').read() if os.path.exists(S + 'index.html') else ''
tags = re.findall(r'<(?:meta (?:property|name)="(?:og|twitter):[^>]*|link rel="(?:canonical|apple-touch-icon)"[^>]*)>', old)
if tags: t = re.sub(r'(<meta name="description"[^>]*>)', lambda m: m.group(1) + '\n' + '\n'.join(tags), t, count=1)
open(S + 'index.html', 'w').write(t)
print('index', len(t) // 1024, 'KB')

# favicon: the two of them on the cart, ink on a latte disc
FAV = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 840"><circle cx="420" cy="420" r="410" fill="#d9b88f"/>'
       '<circle cx="420" cy="420" r="380" fill="none" stroke="#16110e" stroke-width="22"/>'
       '<g transform="translate(420 440) scale(1.62) translate(-430 -460)"><path d="%s" fill="#16110e"/></g></svg>' % FAVD)
open(S + 'favicon.svg', 'w').write(FAV)
FULLSVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 840"><defs><radialGradient id="gw" cx=".46" cy=".4" r=".62"><stop offset="0" stop-color="#ead4b6"/><stop offset=".7" stop-color="#d9b88f"/><stop offset="1" stop-color="#c9a275"/></radialGradient></defs>'
           '<circle cx="420" cy="420" r="392" fill="url(#gw)"/><g fill="#16110e">' + ''.join('<path d="%s"/>' % L[k] for k in ALLK) + '</g>'
           '<g fill="none" stroke="#16110e" stroke-width="2" stroke-linecap="round"><path d="%s"/><path d="%s"/></g></svg>' % (ST1, ST2))
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#f4ede2;display:grid;place-items:center">'
                                    + FULLSVG.replace('<svg ', '<svg width="476" height="476" ', 1) + '</body>')
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Albert+Sans:wght@500;700&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#f4ede2 url(../media/oak.webp) center/cover;color:#16110e;font-family:"Albert Sans"}'
      '.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(244,237,226,.92) 0,rgba(244,237,226,.78) 52%,rgba(244,237,226,0) 70%)}'
      '.logo{position:absolute;left:56px;top:46px;width:252px;filter:drop-shadow(0 10px 22px rgba(60,35,15,.25))}.logo svg{width:100%;height:auto;display:block}'
      'h1{position:absolute;left:330px;top:70px;width:340px;font:700 50px/1.08 Cinzel;letter-spacing:.01em}'
      'p.s{position:absolute;left:330px;top:258px;width:330px;font:500 25px/1.35 "Albert Sans";color:#3b2a1e}'
      '.loc{position:absolute;left:58px;bottom:54px;display:flex;gap:16px;align-items:center;font:700 24px "Albert Sans"}'
      '.loc b{background:#16110e;color:#f4ede2;padding:10px 20px;border-radius:999px;font:700 24px Cinzel;letter-spacing:.08em}.loc span{color:#3b2a1e}'
      '.ph{position:absolute;overflow:hidden;border:6px solid #fff;box-shadow:0 18px 40px rgba(40,24,12,.3);border-radius:18px}'
      '.ph img{width:100%;height:100%;object-fit:cover;display:block}.a{left:706px;top:44px;width:236px;height:316px;transform:rotate(-3deg)}'
      '.b{left:930px;top:200px;width:230px;height:300px;transform:rotate(3deg)}.c{left:742px;top:380px;width:190px;height:190px;transform:rotate(2deg)}'
      '</style></head><body><div class="veil"></div><div class="logo">' + FULLSVG + '</div>'
      '<h1>Custom lattes at your event</h1><p class="s">A mobile coffee cart. Real espresso, your flavors, made fresh in front of your guests.</p>'
      '<div class="loc"><b>CHICAGO</b><span>Wisconsin and Indiana too</span></div>'
      '<div class="ph a"><img src="../media/duo.webp"></div><div class="ph b"><img src="../media/g-couple.webp"></div><div class="ph c"><img src="../media/g-bride.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
print('favicon', os.path.getsize(S + 'favicon.svg') // 1024, 'KB')
