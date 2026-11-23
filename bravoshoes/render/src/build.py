"""Builds bravoshoes/index.html, favicon.svg and render/og.html (+ render/icon.html) from tpl.html + blogo.json.
Run from anywhere:  python3 build.py
blogo.json is their own BS monogram (from the @bravo.shoes_ profile picture) traced by trace.py into B, S, heel and
stars, in a box of about 1000 x 970. The pill under the mark is drawn at its measured place; its caps are set as type."""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'blogo.json'))
PX, PY, PW, PH = L['pill']
MARK_VB = '60 80 830 860'
LOCK_VB = '60 80 870 1070'
TEL = '+96170810021'
WA = 'https://wa.me/96170810021'
IG = 'https://www.instagram.com/bravo.shoes_/'
DM = 'https://ig.me/m/bravo.shoes_'
GOLD = ('<linearGradient id="%s" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="#ead7a4"/>'
        '<stop offset=".42" stop-color="#bb9a5c"/><stop offset=".78" stop-color="#9a7a42"/><stop offset="1" stop-color="#c7a96d"/></linearGradient>')

def defs():
    s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + GOLD % 'gGold'
    s += '<path id="lg-B" d="%s"/><path id="lg-S" d="%s"/><path id="lg-heel" d="%s"/>' % (L['B'], L['S'], L['heel'])
    for i, d in enumerate(L['stars']): s += '<path id="lg-st%d" d="%s"/>' % (i, d)
    s += '<path id="lg-all" d="%s"/>' % L['all']
    return s + '</defs></svg>'

def mark(cls, fill='url(#gGold)'):
    return ('<svg class="%s" viewBox="%s" aria-hidden="true"><g fill="%s"><use href="#lg-B"/><use href="#lg-S"/>'
            '<use href="#lg-heel"/><use href="#lg-st0"/><use href="#lg-st1"/></g></svg>') % (cls, MARK_VB, fill)

def pill(letters=True, cls='pl'):
    s = '<rect class="%s" x="%s" y="%s" width="%s" height="%s" rx="%s" fill="none" stroke="#b09154" stroke-width="7"/>' % (cls, PX, PY, PW, PH, PH / 2)
    if letters:
        word = 'BRAVO SHOES'; cx = PX + PW / 2; step = 46; x0 = cx - step * (len(word) - 1) / 2
        s += '<g class="pw" fill="#8f7440" font-family="Mulish,sans-serif" font-weight="700" font-size="58" text-anchor="middle">'
        for i, ch in enumerate(word):
            if ch != ' ': s += '<text class="ich" x="%.1f" y="%.1f">%s</text>' % (x0 + i * step, PY + PH / 2 + 21, ch)
        s += '</g>'
    return s

def lockup(cls):
    return '<svg class="%s" viewBox="%s" aria-hidden="true"><g fill="url(#gGold)"><use href="#lg-B"/><use href="#lg-S"/><use href="#lg-heel"/><use href="#lg-st0"/><use href="#lg-st1"/></g>%s</svg>' % (cls, LOCK_VB, pill())

def intro():
    s = '<svg id="ilogo" viewBox="%s" aria-hidden="true"><defs>' % LOCK_VB
    s += '<linearGradient id="gSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fffaf0" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    s += '<mask id="mlogo" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="1200"><use href="#lg-all" fill="#fff"/></mask></defs>'
    s += '<g id="imark">'
    s += '<use id="ist0" class="star" href="#lg-st0" fill="url(#gGold)"/><use id="ist1" class="star" href="#lg-st1" fill="url(#gGold)"/>'
    s += '<use id="iB" class="dr" href="#lg-B" fill="url(#gGold)"/><use id="iS" class="dr" href="#lg-S" fill="url(#gGold)"/><use id="iheel" class="dr" href="#lg-heel" fill="url(#gGold)"/>'
    hx, hy = L['heelTip']
    s += '</g><g id="ifx">'
    s += '<ellipse id="iring" cx="%s" cy="%s" rx="60" ry="16" fill="none" stroke="#a8884f" stroke-width="9" opacity="0"/>' % (hx, hy + 6)
    s += '<ellipse id="iring2" cx="%s" cy="%s" rx="60" ry="16" fill="none" stroke="#c9ae74" stroke-width="5" opacity="0"/>' % (hx, hy + 6)
    s += '<rect id="isweep" x="-500" y="0" width="320" height="1200" fill="url(#gSweep)" mask="url(#mlogo)" transform="skewX(-16)"/>'
    s += '</g><g id="ipill">%s</g>' % pill(cls='pl')
    return s + '</svg>'

def ic(p, sw='1.8'):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (sw, p)
STAR = 'M12 2.5c.6 4.6 2.3 7.2 9.5 9.5-7.2 2.3-8.9 4.9-9.5 9.5-.6-4.6-2.3-7.2-9.5-9.5 7.2-2.3 8.9-4.9 9.5-9.5z'
I = {'I_WA': ic('<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 18.8z"/><path d="M9.2 8.6c.2-.5.5-.6.9-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.1 1.4 1.9 2.5 2.5l.6-.5c.2-.2.4-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .4-.1.7-.6.9-1.8.8-6.6-2.9-7.2-5.5-.1-.6-.1-1.2 0-1.7z"/>'),
     'I_PHONE': ic('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_VAN': ic('<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
     'I_PREV': ic('<path d="M15 6l-6 6 6 6"/>', '2'), 'I_NEXT': ic('<path d="M9 6l6 6-6 6"/>', '2'),
     'I_STAR': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="%s"/></svg>' % STAR,
     'I_X': ic('<path d="M6 6l12 12M18 6L6 18"/>', '2')}

t = open(D + 'tpl.html').read()
R = dict(I, DEFS=defs(), INTRO=intro(), NAVMARK=mark('nb'), LOCKUP=lockup('lock'), DUSTMARK=mark('dmk'),
         TEL=TEL, WA=WA, IGURL=IG, DM=DM, ALLPATH=json.dumps(L['all']), MARKVB=json.dumps([60, 80, 830, 860]),
         HEELTIP=json.dumps(L['heelTip']))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)

# favicon: the gold mark on their cream, self-contained (no <use>)
paths = ''.join('<path d="%s"/>' % d for d in [L['B'], L['S'], L['heel']] + L['stars'])
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 50 890 890"><defs>' + GOLD % 'g' + '</defs>'
       '<rect x="30" y="50" width="890" height="890" rx="200" fill="#f6f1ea"/><g fill="url(#g)">' + paths + '</g></svg>')
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#f6f1ea">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')

# link preview card (1200 x 630): their monogram, two of their photos, name, hook, place
lock = ('<svg viewBox="%s" style="width:100%%;height:100%%"><defs>' % LOCK_VB) + GOLD % 'gGold' + '</defs><g fill="url(#gGold)">' + paths + '</g>' + pill() + '</svg>'
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,500&family=Mulish:wght@600;700;800&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#f6f1ea;color:#1b1714;font-family:Mulish}'
      'body:before{content:"";position:absolute;inset:0;background:radial-gradient(70% 90% at 22% 40%,#fffdf9 0%,rgba(255,253,249,0) 70%)}'
      '.lg{position:absolute;left:56px;top:36px;width:206px;height:253px}'
      'h1{position:absolute;left:60px;top:300px;font:500 76px/1 "Bodoni Moda";letter-spacing:-.01em}'
      '.hk{position:absolute;left:62px;top:392px;width:520px;font:italic 500 34px/1.22 "Bodoni Moda";color:#3a2a20}'
      '.pl{position:absolute;left:62px;bottom:52px;display:flex;gap:12px;align-items:center;font:700 24px Mulish;color:#3a2a20}'
      '.pl b{background:#1b1714;color:#f6f1ea;padding:9px 18px;border-radius:40px;font-weight:800;letter-spacing:.02em}'
      '.ph{position:absolute;overflow:hidden;border-radius:6px;box-shadow:0 30px 60px -20px rgba(58,42,32,.45)}.ph img{width:100%;height:100%;object-fit:cover;display:block}'
      '.p1{left:640px;top:0;width:330px;height:630px;border-radius:0}.p2{left:986px;top:0;width:214px;height:630px;border-radius:0}'
      '.tk{position:absolute;left:656px;bottom:24px;font:800 22px Mulish;letter-spacing:.16em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5)}'
      '.tk2{left:1002px}.st{position:absolute;left:600px;top:0;width:40px;height:630px;background:repeating-linear-gradient(180deg,#1b1714 0 26px,#f6f1ea 26px 40px)}'
      '</style></head><body><div class="lg">' + lock + '</div>'
      '<h1>Bravo Shoes</h1><div class="hk">Boots and fur slippers for this winter, sizes 36 till 40</div>'
      '<div class="pl"><b>Beirut, Lebanon</b>Order on 70/810021</div><div class="st"></div>'
      '<div class="ph p1"><img src="../media/w-ankle.webp" style="object-position:50% 50%"></div>'
      '<div class="ph p2"><img src="../media/w-brown.webp" style="object-position:50% 50%"></div>'
      '<div class="tk">TAKE 4</div><div class="tk tk2">TAKE 7</div></body></html>')
open(D + '../og.html', 'w').write(og)
print('index', len(t) // 1024, 'KB')
