import json, os, re, html
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'logo.json'))
RED, BROWN = '#e5323d', '#3a1117'
e = html.escape

def g(o, a=''):
    return '<g transform="%s"><path d="%s"%s/></g>' % (o['t'], o['d'], a)

def logo(anim=False, aria=True):
    w = lambda cls, o, fill: ('<g class="%s">%s</g>' % (cls, g(o, ' fill="%s"' % fill))) if anim else g(o, ' fill="%s"' % fill)
    s = '<svg viewBox="40 360 1520 880" xmlns="http://www.w3.org/2000/svg"%s>' % (' role="img" aria-label="Bartz Bakery, fine baked goods, since 1948"' if aria else ' aria-hidden="true"')
    s += ''.join(w('lf lL', o, BROWN) for o in L['leafL']) + ''.join(w('lf lR', o, BROWN) for o in L['leafR'])
    s += '<g class="bz">%s</g>' % ''.join(w('bl', o, RED) for o in L['bartz'])
    s += '<g class="bk">%s</g>' % ''.join(w('kl', o, RED) for o in L['bakery'])
    s += w('fn', L['fine'][0], BROWN)
    if anim:
        s += '<g class="ov">%s</g>' % g(L['oval'][0], ' fill="%s" stroke="%s" stroke-width="10" class="ovp"' % (RED, RED))
    else:
        s += g(L['oval'][0], ' fill="%s"' % RED)
    s += w('sn', L['since'][0], RED)
    if anim:
        clip = ''.join(g(o) for o in L['bakery'] + L['bartz'])
        s += '<clipPath id="bkc">%s</clipPath><g clip-path="url(#bkc)"><rect id="shine" x="0" y="300" width="160" height="700" fill="url(#shg)" transform="skewX(-18)" opacity="0"/></g>' % clip
        s += '<defs><linearGradient id="shg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
    return s + '</svg>'

PH = '(313) 562-0986'
MENU = [
 {'k': 'donuts', 'n': 'Donuts & paczki', 'img': 'donuts', 'groups': [
   ['Donuts', '$1.50 each · $16.50 a dozen', [['Custard filled', ''], ['Glazed', ''], ['Honeycreame', ''], ['Jelly filled', ''], ['Sugar', ''], ['Apple fritter', ''], ['Cinnamon roll', '']]],
   ['Paczki', '$3 each · $33 a dozen', [['Apple', ''], ['Blueberry', ''], ['Cherry', ''], ['Chocolate', ''], ['Custard', ''], ['Lemon', ''], ['Raspberry', ''], ['Strawberry', '']]],
   ['Cream paczki', '$3.50 each · $38.50 a dozen', [['Buttercream', ''], ['Cannoli', ''], ['Cream cheese', ''], ['Prune', '']]]]},
 {'k': 'pastry', 'n': 'Pastry', 'img': 'turnovers', 'groups': [
   ['Danish', '$1.50 each · $16.50 a dozen', [['Apple almond', ''], ['Cheese', ''], ['Pineapple', ''], ['Raisin nut', ''], ['Raspberry', '']]],
   ['Coffee cake', '$8', [['Almond', ''], ['Apple', ''], ['Apricot', ''], ['Blueberry', ''], ['Cheese', ''], ['Pineapple', ''], ['Raisin nut', ''], ['Raspberry', '']]],
   ['Strudel', '$8', [['Apple', ''], ['Blueberry', ''], ['Cherry', '']]],
   ['Turnovers', '$2.50', [['Apple', ''], ['Cherry', '']]],
   ['Rolls & logs', '$9', [['Walnut', ''], ['Poppyseed', '']]],
   ['Variety', '', [['Apple nut burrito', '$3.50'], ['Apple cinnamon wheel', '$2'], ['Creme horns', '$3'], ['Elephant ears', '$3'], ['Raspberry almond bar', '$3'], ['Walnut crescent', '$1.50']]]]},
 {'k': 'pies', 'n': 'Pies', 'img': 'mini-pies', 'groups': [
   ['Pies', '', [['6 in / 8 in spinach', '$7 / $9'], ['9 in apple', '$9'], ['9 in cherry', '$9'], ['9 in blueberry', '$9'], ['9 in pumpkin', '$9'], ['Apple pie square', '$2.50'], ['Cherry pie square', '$2.50'], ['Pumpkin pie square', '$2.50']]],
   ['Deluxe', '', [['9 in lemon meringue', '$12'], ['9 in pecan', '$15'], ['Boston cream', '$20'], ['Carrot', '$20'], ['Pineapple upside-down', '$15']]]]},
 {'k': 'cookies', 'n': 'Cookies & kolachy', 'img': 'ck-pumpkin', 'groups': [
   ['Cookies', '', [['Chocolate chip', '$8 a pack'], ['German walnut', '$8 a pack'], ['Oatmeal raisin', '$8 a pack'], ['Peanut butter', '$8 a pack'], ['Apricot foldover', '$1.50'], ['Date foldover', '$1.50'], ['Raspberry foldover', '$1.50']]],
   ['Kolachy', '', [['Raspberry', '$10 a lb'], ['Apricot', '$10 a lb'], ['Walnut', '$10 a lb'], ['Angel wings', '$10 a half lb']]]]},
 {'k': 'cupcakes', 'n': 'Cupcakes & treats', 'img': 'cupcakes', 'groups': [
   ['Cupcakes', '', [['Vanilla', '$2'], ['Chocolate', '$2'], ['Marble', '$2'], ['Lemon', '$2.50'], ['Strawberry', '$2.50'], ['Cherry', '$2.50'], ['Bumpy', '$2.50'], ['German chocolate', '$2.50'], ['Carrot', '$2.50'], ['Red velvet', '$2.50'], ['Seasonal', '$3']]],
   ['Treats', '', [['Brownie', '$2.50'], ['Brownie bomb', '$3'], ['Assorted cannolis', '$3'], ['Carrot cake slice', '$3'], ['Eclairs', '$3'], ['Margarita cake', '$3.50'], ['Assorted mousse cups', '$3.50'], ['Napoleon', '$3'], ['Assorted tarts', '$3']]]]},
 {'k': 'bread', 'n': 'Bread & rolls', 'img': 'egg-raisin', 'groups': [
   ['Bread', '', [['White', '$3.50'], ['Whole wheat', '$4'], ['Marble', '$3.50'], ['Pumpernickel', '$3.50'], ['Rye', '$3.50'], ['Italian', '$3.50'], ['French', '$3.50'], ['Sourdough', '$4'], ['Potato', '$3.50'], ['Cheese onion', '$4'], ['Egg raisin', '$4'], ['Cinnamon', '$4'], ['Apple cinnamon', '$4'], ['Mixed fruit', '$4']]],
   ['Bread rolls', '30¢ each · $3.30 a dozen', [['Hamburger', ''], ['Hotdog', ''], ['Butterflake', ''], ['Hard sesame', ''], ['Sesame twist', ''], ['Onion', '35¢ · $4 a dozen']]]]},
]
COOKIES = [('ck-engage', 'Engagement'), ('ck-bday', 'Happy birthday'), ('ck-owls', 'Owls'), ('ck-smiley', 'Smiley faces'), ('ck-pumpkin', 'Pumpkins'), ('ck-witch', 'Witch hats')]
FLAVORS = 'Cherry chip, cherry nut, banana, banana nut, German chocolate, red velvet, carrot, Black Forest, strawberry short, Napoleon, bumpy, brownie and cannoli'.split(', ')

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_BAG': ic('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
     'I_ARW': ic('<path d="M5 12h14M13 6l6 6-6 6"/>')}

TABS = ''.join('<button type="button" role="tab" class="tab" data-t="%s" aria-selected="%s">%s</button>' % (m['k'], 'true' if i == 0 else 'false', e(m['n'])) for i, m in enumerate(MENU))
CK = ''.join('<figure class="ck"><img src="media/%s.webp" width="900" height="675" loading="lazy" alt="Custom %s butter cookies by Bartz Bakery"><figcaption>%s</figcaption></figure>' % (f, e(n.lower()), e(n)) for f, n in COOKIES)
FL = ''.join('<li>%s</li>' % e(x[0].upper() + x[1:]) for x in FLAVORS)

t = open(D + 'tpl.html').read()
R = dict(I, LOGO_INTRO=logo(True), LOGO_NAV=logo(False, False), LOGO_FOOT=logo(False), TABS=TABS, CK=CK, FL=FL, MENU=json.dumps(MENU), PH=PH,
         DOTS_CK=''.join('<i></i>' for _ in COOKIES))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e5323d"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="38" fill="#fffaf2">B</text></svg>')
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Questrial&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#fbf5ec;color:#2a1a17;font-family:Questrial}'
      '.lg{position:absolute;left:56px;top:40px;width:470px}'
      'h1{position:absolute;left:62px;top:340px;width:520px;font:400 50px/1.08 "DM Serif Display",serif}'
      '.pill{position:absolute;left:62px;bottom:52px;display:flex;gap:16px;align-items:center;font-size:24px;color:#6e5a52}.pill b{font-weight:400;background:#e5323d;color:#fff;border-radius:999px;padding:10px 22px}'
      '.ph{position:absolute;top:28px;right:28px;bottom:28px;width:560px;border-radius:26px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover}'
      '.ph2{position:absolute;right:452px;bottom:56px;width:190px;height:190px;border-radius:50%;overflow:hidden;border:8px solid #fbf5ec}.ph2 img{width:100%;height:100%;object-fit:cover}'
      '</style></head><body><div class="lg">' + logo(False) + '</div><h1>Dearborn\'s bakery since 1948</h1><div class="pill"><b>Paczki every Friday</b><span>1532 N Telegraph Rd</span></div>'
      '<div class="ph"><img src="../media/donuts.webp"></div><div class="ph2"><img src="../media/ck-bday.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
print(len(t) // 1024, 'KB')
