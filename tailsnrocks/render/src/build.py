import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'tlogo.json'))   # their logo, traced from the label on their drink jars
FL = 'translate(0 %d) scale(1 -1)' % L['H']
VB = '%d %d %d %d' % tuple(L['vb'])
BUR, LEM, STAR = '#6e1630', '#e7b98a', '#c58b4f'
DM = 'https://ig.me/m/tailsnrocks'
def p(d, cls='', fill=None):
    return '<g%s%s><g transform="%s"><path d="%s"/></g></g>' % (' class="%s"' % cls if cls else '', ' fill="%s"' % fill if fill else '', FL, d)
script = ''.join(p(d, 'sc') for _, d in L['script'])

def logo():
    return ('<svg viewBox="%s" aria-hidden="true">' % VB + p(L['lemon'], fill=LEM) + p(L['glass'], fill='currentColor')
            + p(L['star'], fill=STAR) + '<g fill="currentColor">' + script + '</g></svg>')

def intro():
    x0, y0, x1, y1 = L['gbox']
    wave = 'M0 0' + ''.join(' q55 -34 110 0 t110 0' for _ in range(12)) + ' V1700 H0 Z'
    cubes = ''.join('<rect class="cube" x="%d" y="%d" width="74" height="74" rx="14" fill="rgba(255,255,255,.75)" stroke="%s" stroke-width="7"/>' % (x, y, BUR) for x, y in ((850, 700), (930, 740), (1000, 690)))
    drops = ''.join('<circle class="drop" cx="935" cy="610" r="%d" fill="%s"/>' % (r, BUR) for r in (12, 9, 14, 8, 11, 10, 7))
    return ('<svg viewBox="%s">' % VB
            + '<defs><mask id="gm" maskUnits="userSpaceOnUse" x="-500" y="-1000" width="3500" height="4000"><path id="iwave" fill="#fff" d="%s" transform="translate(%d %d)"/></mask>' % (wave, x0 - 200, y1 + 20)
            + '<mask id="sm" maskUnits="userSpaceOnUse" x="-500" y="-1000" width="3500" height="4000"><g fill="#fff">' + script + '</g></mask>'
            + '<linearGradient id="shg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff3e8" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
            + '<rect id="istream" x="918" y="-700" width="30" height="0" rx="15" fill="%s"/>' % BUR
            + '<g mask="url(#gm)">' + p(L['glass'], fill=BUR) + '</g>'
            + '<g id="ilemon">' + p(L['lemon'], fill=LEM) + '</g>' + cubes + drops
            + '<g id="istar">' + p(L['star'], fill=STAR) + '</g>'
            + '<g id="iscript" fill="%s">' % BUR + script + '</g>'
            + '<rect id="ishine" x="-400" y="900" width="260" height="600" fill="url(#shg)" mask="url(#sm)" transform="skewX(-16)"/>'
            + '<rect id="iref" x="%d" y="%d" width="%d" height="%d" fill="none"/></svg>' % tuple(L['vb']))

LAYERS = [
 ('berry', '#b3264b', '#f8e3e8', 'holiday.webp', 'Berry margaritas with a sugar rim and a pink ribbon on every stem', 'Holiday parties get a sugar rim',
  "For a Christmas party we did berry margaritas, rims dipped in sugar, a little bow tied on each glass. 'Twas the night before Christmas, and the drinks were ready."),
 ('peach', '#f08c3e', '#fdeedd', 'new-year.webp', 'Layered peach and orange drinks with lime wheels and strawberries', 'We flew to Texas for this one',
  "A New Year's celebration in Texas, so we packed up and flew out to make the drinks. Peach into orange, a lime wheel and a strawberry on every glass."),
 ('blue', '#2a9fcf', '#e1f2f9', 'birthday.webp', 'Blue cocktails lined up under a Cheers sign at a surprise birthday party', 'Surprise birthdays',
  'Blue cocktails under the Cheers sign for a surprise birthday party. Planning one? Let us bring the drinks.'),
 ('sage', '#6f8c63', '#e9efe4', 'mocktail-table.webp', 'A mocktail table with layered cups, greenery and a draped sage cloth', 'A mocktail table for a 50th',
  "50 is a big deal, so the mocktail table got the same attention as the cocktails. Little cups in layers of colour, greenery, a draped table. Every detail gets its moment."),
 ('gold', '#b8862f', '#f6eedb', 'pouches.webp', 'Custom labeled drink pouches lined up on shelves for a 40th birthday', 'Custom pouches for smaller parties',
  'Intimate celebrations deserve cocktails too. We fill pouches and label them for your event, so your guests get the same great taste with less mess.'),
]
def layers():
    out = ''
    for i, (k, c, tint, img, alt, h, body) in enumerate(LAYERS):
        out += ('<section class="layer" data-i="%d" style="--c:%s;--t:%s"><div class="wrap lg">'
                '<figure class="lph rv"><img src="media/%s" width="720" height="960" loading="lazy" alt="%s"><span class="sw"></span></figure>'
                '<div class="ltx"><h2 class="rv">%s</h2><p class="rv">%s</p></div></div></section>') % (i, c, tint, img, alt, h, body)
    return out

def ic(d):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % d
I = {'I_DM': ic('<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m21 3-11 10"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>')}
BANDS = ''.join('<rect class="band" x="0" y="%d" width="100" height="10.4" fill="%s"/>' % (62 - (i + 1) * 10, c) for i, (_, c, *_r) in enumerate(LAYERS))

t = open(D + 'tpl.html').read()
R = dict(I, LOGO=logo(), INTRO=intro(), LAYERS=layers(), BANDS=BANDS, DM=DM)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="620 440 640 640"><rect x="620" y="440" width="640" height="640" rx="120" fill="#fbf6ef"/>'
       + p(L['lemon'], fill=LEM) + p(L['glass'], fill=BUR) + p(L['star'], fill=STAR) + '</svg>')
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Gloock&family=Jost:wght@500;600&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#fbf6ef;color:#6e1630;font-family:Jost}'
      '.lg{position:absolute;left:40px;top:40px;width:560px;color:#6e1630}.tag{position:absolute;left:150px;top:370px;font-size:20px;font-weight:600;letter-spacing:.34em}'
      'h1{position:absolute;left:50px;top:420px;width:580px;font:400 50px/1.08 Gloock}.pill{position:absolute;left:50px;bottom:40px;font-size:22px;font-weight:600;color:#fbf6ef;background:#6e1630;border-radius:999px;padding:8px 20px}'
      '.ph{position:absolute;top:30px;bottom:30px;border-radius:26px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover}'
      '</style></head><body><div class="lg">' + logo() + '</div><div class="tag">MIXOLOGY &amp; BARTENDING</div><h1>Who\'s handling the drinks? We are.</h1><div class="pill">Cocktails and mocktails · DMV</div>'
      '<div class="ph" style="left:660px;width:250px"><img src="../media/holiday.webp"></div><div class="ph" style="left:926px;width:244px"><img src="../media/new-year.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
print(len(t) // 1024, 'KB')
