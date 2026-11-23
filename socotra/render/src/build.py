"""Builds socotra/index.html, favicon.svg, render/og.html and render/icon.html from tpl.html + slogo.json.
Run from anywhere:  python3 build.py
slogo.json is their own logo (socotracoffeehouse.com files) traced by trace.py: mark parts in a 1000 box,
wordmark parts in the 966 x 1095 lockup box. The mark sits in the lockup at translate(111.2 1.8) scale(.831)."""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'slogo.json'))
CX, CY, RX, RY = L['canopy']
M = 'translate(111.2 1.8) scale(.831)'
TRUNK = ' '.join(L['trunk'])
LOCK_VB = '60 20 870 1030'
MARK_VB = '62 30 910 915'
MAPS = 'https://www.google.com/maps/dir/?api=1&destination=Socotra+Coffee+House%2C+3130+Packard+St%2C+Ann+Arbor%2C+MI+48108'
IG = 'https://www.instagram.com/socotracoffee_a2/'
TEL = '+17349295672'

# ---------- shared defs: every logo path once, referenced with <use> ----------
def defs():
    s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
    s += '<linearGradient id="gGold" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fbf0cc"/><stop offset=".38" stop-color="#e6c682"/><stop offset=".72" stop-color="#c99640"/><stop offset="1" stop-color="#9e6e26"/></linearGradient>'
    s += '<linearGradient id="gWord" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d58e"/><stop offset=".55" stop-color="#c8923a"/><stop offset="1" stop-color="#e0b25c"/></linearGradient>'
    s += '<linearGradient id="gCan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#075a43"/><stop offset=".45" stop-color="#2f7458"/><stop offset=".8" stop-color="#9fae78"/><stop offset="1" stop-color="#d9cf98"/></linearGradient>'
    s += '<path id="lg-cup" d="%s"/><path id="lg-trunk" d="%s"/><path id="lg-steam" d="%s"/><path id="lg-br" d="%s"/>' % (L['cup'], TRUNK, L['steam'][0], L['branches'])
    s += '<ellipse id="lg-can" cx="%s" cy="%s" rx="%s" ry="%s"/>' % (CX, CY, RX, RY)
    for i, d in enumerate(L['script']): s += '<path id="lg-s%d" d="%s"/>' % (i, d)
    s += '<path id="lg-sa" d="%s"/>' % L['scriptAll']
    for i, d in enumerate(L['caps']): s += '<path id="lg-c%d" d="%s"/>' % (i, d)
    return s + '</defs></svg>'

def mark_uses(prefix=''):
    return ('<use href="#lg-cup" fill="url(#gGold)"/><use href="#lg-trunk" fill="url(#gGold)"/>'
            '<use href="#lg-can" fill="url(#gCan)"/><use href="#lg-br" fill="#f4e5b8" opacity=".92"/><use href="#lg-steam" fill="url(#gGold)"/>')

def caps_uses():
    return ''.join('<use href="#lg-c%d"/>' % i for i in range(len(L['caps'])))

def lockup(cls=''):
    return ('<svg class="%s" viewBox="%s" aria-hidden="true"><g transform="%s">%s</g>'
            '<use href="#lg-sa" fill="url(#gWord)"/><g fill="#d6a24a">%s</g></svg>') % (cls, LOCK_VB, M, mark_uses(), caps_uses())

def navmark():
    return '<svg class="nb" viewBox="%s" aria-hidden="true">%s</svg>' % (MARK_VB, mark_uses())

def navword():
    x0, y0, x1, y1 = L['wordBox']
    # script only, cropped to the script letters
    return '<svg class="nw" viewBox="%d %d %d %d" aria-hidden="true"><use href="#lg-sa" fill="url(#gWord)"/></svg>' % (x0 - 4, y0 - 4, x1 - x0 + 8, 1006 - y0 + 8)

def intro():
    s = '<svg id="ilogo" viewBox="%s" aria-hidden="true"><defs>' % LOCK_VB
    s += '<clipPath id="ctrk" clipPathUnits="userSpaceOnUse"><rect id="ictr" x="0" y="%s" width="1000" height="0"/></clipPath>' % L['trunkBot']
    s += '<linearGradient id="gSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff6dc" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    s += '<mask id="mlogo" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1100"><g fill="#fff"><g transform="%s"><use href="#lg-cup"/><use href="#lg-trunk"/><use href="#lg-steam"/><use href="#lg-br"/></g><use href="#lg-sa"/>%s</g></mask>' % (M, caps_uses())
    s += '<filter id="iglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>'
    s += '<g id="imark" transform="%s">' % M
    s += '<ellipse id="ihalo" cx="%s" cy="%s" rx="%s" ry="%s" fill="#e0b25c" opacity="0" filter="url(#iglow)"/>' % (CX, CY + 120, RX * .8, RY * 2.2)
    s += '<use id="icup" class="dr" href="#lg-cup" fill="url(#gGold)"/>'
    s += '<g clip-path="url(#ctrk)"><use id="itrunk" href="#lg-trunk" fill="url(#gGold)"/></g>'
    s += '<use id="ican" href="#lg-can" fill="url(#gCan)"/>'
    s += '<use id="ibr" class="dr" href="#lg-br" fill="#f4e5b8"/>'
    s += '<use id="isteam" href="#lg-steam" fill="url(#gGold)"/>'
    s += '</g><g id="iword">'
    for i in range(len(L['script'])): s += '<use class="il" href="#lg-s%d" fill="url(#gWord)"/>' % i
    s += '</g><g id="icaps" fill="#d6a24a">'
    for i in range(len(L['caps'])): s += '<use class="ic" href="#lg-c%d"/>' % i
    s += '</g><rect id="isweep" x="-400" y="0" width="300" height="1100" fill="url(#gSweep)" mask="url(#mlogo)" transform="skewX(-14)"/>'
    return s + '</svg>'

# spice cup: the cup + trunk from the logo; the canopy becomes the drink (drawn on the canvas under it)
SPICE_VB = (50, 60, 920, 890)
def spicecup():
    return ('<svg class="cupart" viewBox="%d %d %d %d" aria-hidden="true"><use href="#lg-trunk" fill="url(#gGold)"/>'
            '<use href="#lg-cup" fill="url(#gGold)"/><use href="#lg-br" fill="#fff3d6" opacity=".16"/></svg>') % SPICE_VB

def visitcup():
    # the cup from the logo, holding a coffee where the canopy was, with steam coming off it
    s = '<svg class="vcup" viewBox="40 180 940 780" aria-hidden="true"><defs><radialGradient id="gCof" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#6b4224"/><stop offset=".55" stop-color="#3a2213"/><stop offset="1" stop-color="#1a0e07"/></radialGradient></defs>'
    for i, x0 in enumerate((380, 455, 530)):
        s += '<path class="stm" d="M%d 300c-28-40 26-60 0-100s22-58 4-96"/>' % x0
    s += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#gCof)" stroke="#e6c682" stroke-width="5"/>' % (CX, CY, RX, RY)
    s += '<ellipse class="swl" cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="rgba(255,236,200,.16)" stroke-width="4" stroke-dasharray="180 260"/>' % (CX, CY, RX * .62, RY * .55)
    s += '<use href="#lg-cup" fill="url(#gGold)"/></svg>'
    return s

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_PHONE': ic('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
     'I_MENU': ic('<path d="M6 3v18M6 3c3 0 4 2 4 5s-1 4-4 4M14 3v6a3 3 0 0 0 3 3v9M20 3v6a3 3 0 0 1-3 3"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_PREV': ic('<path d="M15 6l-6 6 6 6"/>'), 'I_NEXT': ic('<path d="M9 6l6 6-6 6"/>')}

t = open(D + 'tpl.html').read()
R = dict(I, DEFS=defs(), INTRO=intro(), NAVMARK=navmark(), NAVWORD=navword(), SPICECUP=spicecup(), VISITCUP=visitcup(),
         LOCKUP=lockup('lock'), MAPS=MAPS, IGURL=IG, TEL=TEL,
         CANOPY=json.dumps([CX - SPICE_VB[0], CY - SPICE_VB[1], RX, RY, SPICE_VB[2], SPICE_VB[3]]),
         ICANOPY=json.dumps([CX, CY, RX, RY]), TRUNKTOP=str(L['trunkTop']))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)

# favicon: the mark alone, self-contained (no <use>)
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"><defs>'
       '<linearGradient id="g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fbf0cc"/><stop offset=".5" stop-color="#ddb767"/><stop offset="1" stop-color="#a87628"/></linearGradient>'
       '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#075a43"/><stop offset=".55" stop-color="#3b7c5c"/><stop offset="1" stop-color="#cfc68c"/></linearGradient></defs>'
       '<rect x="62" y="30" width="910" height="915" rx="190" fill="#0f0b08"/>'
       '<path fill="url(#g)" d="%s"/><path fill="url(#g)" d="%s"/><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#c)"/><path fill="url(#g)" d="%s"/></svg>') % (
    MARK_VB, L['cup'], TRUNK, CX, CY, RX, RY, L['steam'][0])
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#0f0b08">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')

# link preview card (1200 x 630): logo, two of their photos, name, hook, place
full = ('<svg viewBox="%s" style="width:100%%;height:100%%"><defs>'
        '<linearGradient id="gGold" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fbf0cc"/><stop offset=".38" stop-color="#e6c682"/><stop offset=".72" stop-color="#c99640"/><stop offset="1" stop-color="#9e6e26"/></linearGradient>'
        '<linearGradient id="gWord" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d58e"/><stop offset=".55" stop-color="#c8923a"/><stop offset="1" stop-color="#e0b25c"/></linearGradient>'
        '<linearGradient id="gCan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#075a43"/><stop offset=".45" stop-color="#2f7458"/><stop offset=".8" stop-color="#9fae78"/><stop offset="1" stop-color="#d9cf98"/></linearGradient></defs>'
        '<g transform="%s"><path fill="url(#gGold)" d="%s"/><path fill="url(#gGold)" d="%s"/><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#gCan)"/><path fill="#f4e5b8" d="%s"/><path fill="url(#gGold)" d="%s"/></g>'
        '<path fill="url(#gWord)" d="%s"/><g fill="#d6a24a">%s</g></svg>') % (
    LOCK_VB, M, L['cup'], TRUNK, CX, CY, RX, RY, L['branches'], L['steam'][0], L['scriptAll'], ''.join('<path d="%s"/>' % d for d in L['caps']))
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,600;1,500&family=Figtree:wght@500;700&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(120% 90% at 20% 30%,#2a1d13 0%,#120d09 60%,#0b0806 100%);color:#f3e7cf;font-family:Figtree}'
      '.lg{position:absolute;left:58px;top:40px;width:250px;height:296px}'
      'h1{position:absolute;left:58px;top:352px;font:600 54px/1.02 Spectral;letter-spacing:-.01em}'
      '.hk{position:absolute;left:60px;top:430px;width:560px;font:italic 500 31px/1.25 Spectral;color:#e9cf93}'
      '.pl{position:absolute;left:60px;bottom:44px;font:700 25px Figtree;color:#f3e7cf}.pl b{display:inline-block;background:#0d5a45;color:#f6ecd2;padding:7px 14px;border-radius:40px;margin-right:12px;font-weight:700}'
      '.ph{position:absolute;border-radius:22px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.55);border:2px solid rgba(230,198,130,.45)}.ph img{width:100%;height:100%;object-fit:cover}'
      '.p1{left:640px;top:44px;width:520px;height:330px}.p2{left:812px;top:394px;width:348px;height:196px}'
      '.tree{position:absolute;left:338px;top:58px;width:250px;font:500 22px/1.35 Figtree;color:#cdb98f}'
      '</style></head><body><div class="lg">' + full + '</div>'
      '<div class="tree">Yemeni coffee, Adeni chai and cakes from the family bakery</div>'
      '<h1>Socotra Coffee House</h1><div class="hk">Qahwa from Ibb with cardamom, poured the way our family makes it</div>'
      '<div class="pl"><b>Ann Arbor, MI</b>3130 Packard St</div>'
      '<div class="ph p1"><img src="../media/adeni.webp"></div><div class="ph p2"><img src="../media/g-honey.webp" style="object-position:50% 40%"></div></body></html>')
open(D + '../og.html', 'w').write(og)
print('index', len(t) // 1024, 'KB')
