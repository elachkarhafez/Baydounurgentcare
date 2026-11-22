# Builds midnightsmokehouse/index.html (+ favicon.svg, render/icon.html, render/og.html) from tpl.html and the traced logo.
#   python3 render/src/build.py
# Then, for the link preview: node .claude/skills/ela-studio/kit/og/card.mjs midnightsmokehouse https://midnightsmokehouse.vercel.app
# (card.mjs rewrites the og/twitter tags in index.html; this script keeps whatever tags are there on the next build).
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.normpath(os.path.join(D, '..', '..')) + '/'
L = json.load(open(D + 'mlogo.json'))   # potrace paths traced from their logo (render/logo-source-flyer.jpg)
W, H = L['W'], L['H']
FL = 'translate(0 %d) scale(1 -1)' % H   # potrace coordinates are y-up
BULL = L['bull']
MID = [e[4] for e in L['mid']]       # M I D N I G H T
SMK = [e[4] for e in L['smoke']]     # S M O K E H O U S E
BVB = '1224 30 1815 1629'            # bull box (+20 for the ember stroke)
WVB = '170 1735 3890 870'            # wordmark box
NIGHT, SMOKE, EMBER = '#0c0b0a', '#ece6dc', '#ff6a2b'


def p(d, attrs=''):
    return '<g transform="%s"><path %s d="%s"/></g>' % (FL, attrs, d)


def nav_bull():
    return '<svg class="nb" viewBox="%s" aria-hidden="true"><g transform="%s"><path fill="currentColor" d="%s"/></g></svg>' % (BVB, FL, BULL)


def nav_word():
    s = '<svg class="nw" viewBox="%s" role="img" aria-label="Midnight Smokehouse"><g fill="currentColor">' % WVB
    return s + ''.join(p(d) for d in MID + SMK) + '</g></svg>'


def intro_bull():
    return ('<svg id="ibull" viewBox="%s"><g transform="%s">'
            '<path class="bf" fill="%s" d="%s"/>'
            '<path class="bs" fill="none" stroke="%s" stroke-width="18" stroke-linejoin="round" stroke-linecap="round" pathLength="1" d="%s"/>'
            '</g></svg>') % (BVB, FL, NIGHT, BULL, EMBER, BULL)


def intro_word():
    s = '<svg id="iword" viewBox="150 1700 3930 940" aria-hidden="true"><defs>'
    # each line rises out of its own slot; the slot is open above so the exit can drift up
    s += '<clipPath id="cmid" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="4200" height="2150"/></clipPath>'
    s += '<clipPath id="csmk" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="4200" height="2642"/></clipPath>'
    # silver like their flyer type (bbox gradient runs bottom->top because the glyphs are y-flipped)
    s += '<linearGradient id="gsil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8a29a"/><stop offset=".55" stop-color="#e4ded5"/><stop offset="1" stop-color="#ffffff"/></linearGradient>'
    s += '<linearGradient id="gsh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff6e6" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    s += '<mask id="mword" maskUnits="userSpaceOnUse" x="0" y="1500" width="4300" height="1300"><g fill="#fff">' + ''.join(p(d) for d in MID + SMK) + '</g></mask></defs>'
    s += '<g clip-path="url(#cmid)">' + ''.join('<g class="lm">%s</g>' % p(d, 'fill="url(#gsil)"') for d in MID) + '</g>'
    s += '<g clip-path="url(#csmk)">' + ''.join('<g class="ls">%s</g>' % p(d, 'fill="url(#gsil)"') for d in SMK) + '</g>'
    s += '<g mask="url(#mword)"><rect id="ishine" x="-300" y="1700" width="620" height="940" fill="url(#gsh)" transform="skewX(-20)"/></g>'
    return s + '</svg>'


def og_tags():
    """keep the absolute preview tags card.mjs wrote last time; fall back to title/description it can read"""
    try:
        old = open(S + 'index.html').read()
    except OSError:
        old = ''
    tags = re.findall(r'<(?:meta (?:property|name)="(?:og|twitter):[^"]+" content="[^"]*"|link rel="(?:canonical|apple-touch-icon)" href="[^"]*")>', old)
    if not any('og:url' in t for t in tags):
        tags = ['<meta property="og:title" content="Midnight Smokehouse · Waxahachie, TX">',
                '<meta property="og:description" content="Texas BBQ cooked while Waxahachie sleeps. Order by DM, pick up only.">']
    return '\n'.join('  ' + t for t in tags)


t = open(D + 'tpl.html').read()
R = dict(OGTAGS=og_tags(), NB=nav_bull(), NW=nav_word(), IBULL=intro_bull(), IWORD=intro_word())
for k in sorted(R, key=len, reverse=True):
    t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)

# favicon: their bull in smoke white on the night square
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="1031 -255 2200 2200"><rect x="1031" y="-255" width="2200" height="2200" rx="420" fill="%s"/>'
       '<g transform="%s"><path fill="%s" d="%s"/></g></svg>') % (NIGHT, FL, SMOKE, BULL)
open(S + 'favicon.svg', 'w').write(fav)

# home-screen icon (rendered to media/icon.png by render/shot-icon.js): black bull on their smoke halo, like their avatar
icon = ('<!doctype html><body style="margin:0;width:512px;height:512px;overflow:hidden;background:radial-gradient(circle at 50%% 46%%,#e8e4de 0,#b9b4ad 24%%,#5d5955 44%%,#1b1917 62%%,%s 74%%)">'
        '<svg viewBox="1031 -255 2200 2200" width="512" height="512" style="display:block"><g transform="%s"><path fill="%s" d="%s"/></g></svg></body>') % (NIGHT, FL, NIGHT, BULL)
open(D + '../icon.html', 'w').write(icon)

# link preview card (1200x630), rendered by card.mjs
word = '<svg viewBox="%s" width="420" height="94"><g fill="url(#og)">' % WVB
word = word.replace('<g', '<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3ada4"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><g', 1)
word += ''.join(p(d) for d in MID + SMK) + '</g></svg>'
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Figtree:wght@600;800&family=Ultra&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;color:%s;font-family:Figtree,sans-serif;'
      'background:radial-gradient(70%% 55%% at 30%% 112%%,rgba(255,106,43,.45),rgba(255,106,43,0) 70%%),radial-gradient(40%% 60%% at 0%% 30%%,rgba(200,194,186,.10),rgba(0,0,0,0) 70%%),%s}'
      '.halo{position:absolute;left:30px;top:26px;width:230px;height:230px;border-radius:50%%;background:radial-gradient(circle,#e9e5df 0,#bdb8b1 26%%,#6a6661 48%%,rgba(40,38,35,.6) 64%%,rgba(12,11,10,0) 72%%)}'
      '.bull{position:absolute;left:52px;top:42px;width:186px}'
      '.word{position:absolute;left:276px;top:96px}'
      'h1{position:absolute;left:58px;top:282px;width:560px;font:400 50px/1.12 Ultra,Georgia,serif}h1 span{color:%s}'
      '.loc{position:absolute;left:58px;bottom:50px;display:flex;gap:12px;font-size:24px;font-weight:800}.loc b{background:%s;color:#1a0b03;padding:8px 16px;border-radius:999px}.loc i{font-style:normal;padding:8px 0;color:#d8d0c4}'
      '.ph{position:absolute;overflow:hidden;border-radius:20px;box-shadow:0 24px 50px -16px rgba(0,0,0,.8)}.ph img{width:100%%;height:100%%;object-fit:cover;display:block}'
      '.p1{right:44px;top:36px;width:380px;height:480px;transform:rotate(2.5deg);border:6px solid #1c1714}'
      '.p2{right:340px;top:330px;width:250px;height:250px;transform:rotate(-4deg);border:6px solid #1c1714}'
      '.tag{position:absolute;right:62px;top:470px;transform:rotate(4deg);background:%s;color:#1a0b03;font:400 24px/1 Ultra,serif;padding:10px 16px;border-radius:10px}'
      '</style></head><body><div class="halo"></div>'
      '<svg class="bull" viewBox="%s"><g transform="%s"><path fill="%s" d="%s"/></g></svg>'
      '<div class="word">%s</div>'
      '<h1>Texas BBQ, cooked while <span>Waxahachie sleeps.</span></h1>'
      '<div class="loc"><b>Waxahachie, TX</b><i>Pickup only · order by DM</i></div>'
      '<div class="ph p1"><img src="../media/twinkies.webp"></div><div class="ph p2"><img src="../media/plate.webp"></div>'
      '<div class="tag">Twinkies $8</div></body></html>') % (SMOKE, NIGHT, EMBER, EMBER, EMBER, BVB, FL, NIGHT, BULL, word)
open(D + '../og.html', 'w').write(og)
print('index.html', len(t) // 1024, 'KB')
