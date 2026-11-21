import os, re, json, math, random
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'alogo.json'))      # their logo, traced from the decal on their cart: script + umbrella cart
FL = 'translate(0 %d) scale(1 -1)' % L['H']
bx0, by0, bx1, by1 = L['bbox']
VB = (bx0 - 20, by0 - 20, bx1 - bx0 + 40, by1 - by0 + 40)
DM = 'https://ig.me/m/antojito.snackbar'
script = ''.join('<g transform="%s"><path d="%s"/></g>' % (FL, d) for _, _, d in L['script'])
cart = '<g transform="%s"><path d="%s"/></g>' % (FL, L['cart'])

def logo(fill='currentColor'):
    return '<svg viewBox="%d %d %d %d" fill="%s" aria-hidden="true">%s%s</svg>' % (VB + (fill, script, cart))

CX, CY, R = 1159, 560, 1180
random.seed(4)
def glitter(n=110, ids=True):
    out = []
    for i in range(n):
        if i < 60: a = random.random() * 2 * math.pi; rr = R + random.gauss(0, 18)
        elif i < 85: a = math.radians(random.uniform(195, 250)); rr = R + abs(random.gauss(0, 90)) + 10
        else: a = math.radians(random.uniform(15, 60)); rr = R + abs(random.gauss(0, 90)) + 10
        x, y = CX + math.cos(a) * rr, CY + math.sin(a) * rr
        frac = (a % (2 * math.pi)) / (2 * math.pi)
        out.append('<circle cx="%.0f" cy="%.0f" r="%.1f"%s/>' % (x, y, random.uniform(4, 13), ' data-a="%.3f"' % frac if ids else ''))
    return ''.join(out)

GOLD = '<linearGradient id="%s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a97f2b"/><stop offset=".35" stop-color="#e3c46c"/><stop offset=".6" stop-color="#b78f3a"/><stop offset="1" stop-color="#e8cf82"/></linearGradient>'
V = (CX - 1300, CY - 1300, 2600, 2600)
INTRO = ('<svg viewBox="%d %d %d %d">' % V
         + '<defs>' + GOLD % 'ig' + '<linearGradient id="ish" x1="0" x2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity="0"/><stop offset=".5" stop-color="#fff6d8"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient>'
         + '<mask id="iwm" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><rect id="iwrite" data-x0="%d" data-x1="%d" x="%d" y="-200" width="0" height="1600" fill="#fff"/></mask>' % (bx0 - 20, bx1 + 20, bx0 - 20)
         + '<mask id="ism" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><g fill="#fff">' + script + '</g></mask>'
         + '<clipPath id="ctop"><rect x="0" y="0" width="3000" height="650"/></clipPath><clipPath id="cbot"><rect x="0" y="650" width="3000" height="2000"/></clipPath>'
         + '<radialGradient id="ipg"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#e3c46c"/><stop offset="1" stop-color="#e3c46c" stop-opacity="0"/></radialGradient></defs>'
         + '<circle id="iring" cx="%d" cy="%d" r="%d" fill="none" stroke="url(#ig)" stroke-width="24" stroke-linecap="round" transform="rotate(-90 %d %d)"/>' % (CX, CY, R, CX, CY)
         + '<g id="iglit" fill="url(#ig)">' + glitter() + '</g>'
         + '<g id="ilogo" fill="#2b2622"><g mask="url(#iwm)">' + script + '</g>'
         + '<rect id="ishine" x="0" y="80" width="300" height="460" fill="url(#ish)" mask="url(#ism)"/>'
         + '<g id="icanopy" clip-path="url(#ctop)">' + cart + '</g><g id="ibody" clip-path="url(#cbot)">' + cart + '</g>'
         + '<circle id="ipen" cx="0" cy="300" r="40" fill="url(#ipg)"/><rect id="ilref" x="%d" y="%d" width="%d" height="%d" fill="none"/></g></svg>' % VB)
# the ring starts at 12 o'clock after the rotate, so shift each speck's fraction by a quarter turn
INTRO = re.sub(r'data-a="([0-9.]+)"', lambda m: 'data-a="%.3f"' % ((float(m.group(1)) + .25) % 1), INTRO)

RING_LOGO = ('<svg viewBox="%d %d %d %d" aria-hidden="true"><defs>' % V + GOLD % 'cg' + '</defs><circle cx="%d" cy="%d" r="%d" fill="none" stroke="url(#cg)" stroke-width="24"/>' % (CX, CY, R)
             + '<g fill="url(#cg)">' + glitter(70, False) + '</g><g fill="currentColor">' + script + cart + '</g></svg>')

def fringe():
    s = '<svg viewBox="0 0 400 46" preserveAspectRatio="none"><path d="M0 0h400v6' + ''.join('q-2.5 5-5 0' for _ in range(80)) + 'z" fill="#f6f1e8"/><g stroke="#e4d8c2" stroke-width="2" vector-effect="non-scaling-stroke">'
    s += ''.join('<line x1="%.1f" y1="4" x2="%.1f" y2="%d"/>' % (2.5 + i * 5, 2.5 + i * 5, 34 + (i % 3) * 4) for i in range(80))
    return s + '</g></svg>'

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_DM': ic('<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m21 3-11 10"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>')}

t = open(D + 'tpl.html').read()
VT = ('::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}'
      '::view-transition-new(root){animation:vt .65s cubic-bezier(.2,.8,.2,1)}'
      '@keyframes vt{from{clip-path:circle(0 at var(--vx,50%) var(--vy,50%))}to{clip-path:circle(150vmax at var(--vx,50%) var(--vy,50%))}}\n')
t = t.replace('@media (prefers-reduced-motion:reduce)', VT + '@media (prefers-reduced-motion:reduce)', 1)
R_ = dict(I, LOGO=logo(), INTRO_SVG=INTRO, RING_LOGO=RING_LOGO, FRINGE=fringe(), DM=DM)
for k in sorted(R_, key=len, reverse=True): t = t.replace('{{%s}}' % k, R_[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
# favicon: their cart inside the gold ring
cbx = L['cartbox']; ccx, ccy = (cbx[0] + cbx[2]) / 2, (cbx[1] + cbx[3]) / 2; half = 330
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d"><defs>' % (ccx - half, ccy - half, 2 * half, 2 * half) + GOLD % 'g' + '</defs>'
       + '<circle cx="%d" cy="%d" r="%d" fill="#f6f1e8"/><circle cx="%d" cy="%d" r="%d" fill="none" stroke="url(#g)" stroke-width="26"/><g fill="#2b2622">%s</g></svg>' % (ccx, ccy, half - 6, ccx, ccy, half - 26, cart))
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#f6f1e8">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')
print(len(t) // 1024, 'KB')
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Figtree:wght@600;700&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#f6f1e8;color:#2b2622;font-family:Figtree}'
      '.ring{position:absolute;left:40px;top:40px;width:300px;color:#2b2622}'
      'h1{position:absolute;left:60px;top:370px;width:600px;font:600 50px/1.08 Fraunces}h1 em{font-style:normal;color:#b38a35}'
      '.sub{position:absolute;left:62px;top:506px;font-size:25px;font-weight:600;color:#6d6258}'
      '.pill{position:absolute;left:60px;top:556px;font-size:22px;font-weight:700;color:#fffaf2;background:#2b2622;border-radius:999px;padding:8px 20px}'
      '.ph{position:absolute;top:30px;bottom:30px;border-radius:26px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover}'
      '</style></head><body><div class="ring">' + RING_LOGO + '</div>'
      '<h1>Your theme, your vibe, <em>our antojitos.</em></h1><div class="sub">Esquites and fruit cups for your party</div><div class="pill">OC · LA · IE · Se habla español</div>'
      '<div class="ph" style="left:690px;width:240px"><img src="../media/y2k-cup.webp" style="object-position:50% 60%"></div><div class="ph" style="left:946px;width:224px"><img src="../media/cart.webp" style="object-position:40% 50%"></div></body></html>')
open(D + '../og.html', 'w').write(og)
