"""Builds bravoshoes/index.html, favicon.svg and render/og.html (+ render/icon.html) from tpl.html, sign.json and blogo.json.
Run from anywhere:  python3 build.py
sign.json is the BRAVO channel-letter sign over their shopfront, traced by trace_sign.py (B, R, A, O, the red V, and
SHOES in Montserrat ExtraBold outlines for the letters the photo cuts off). It is the logo in the opening, the header,
the footer, the favicon and the link card.
blogo.json is their BS monogram from the @bravo.shoes_ profile picture (trace.py); it still forms the gold dust in the
closing call to action."""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'blogo.json'))
SG = json.load(open(D + 'sign.json'))
SW, SH = SG['box'][2], SG['box'][3]      # BRAVO alone
LW = SG['shoesW'] + 4                    # BRAVO + SHOES
# sampled off the storefront photo (trace_sign.py): letter core, red V, night facade, gold LED strip core and halo
ICE, RED, FACADE, LED, LED2 = '#d5f4fe', '#ea3323', '#272a39', '#fbefbd', '#bfa16a'
PX, PY, PW, PH = L['pill']
MARK_VB = '60 80 830 860'
TEL = '+96170810021'
WA = 'https://wa.me/96170810021'
IG = 'https://www.instagram.com/bravo.shoes_/'
DM = 'https://ig.me/m/bravo.shoes_'
# their monogram gold, sampled off the profile picture: #c5b789 where it catches light, #a69461 in the body of the strokes
GOLD = ('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="120" y1="90" x2="640" y2="1000"><stop offset="0" stop-color="#c5b789"/>'
        '<stop offset=".45" stop-color="#a69461"/><stop offset=".8" stop-color="#94824f"/><stop offset="1" stop-color="#b3a26f"/></linearGradient>')

def defs():
    s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + GOLD % 'gGold'
    s += '<path id="lg-B" d="%s"/><path id="lg-S" d="%s"/><path id="lg-heel" d="%s"/>' % (L['B'], L['S'], L['heel'])
    for i, d in enumerate(L['stars']): s += '<path id="lg-st%d" d="%s"/>' % (i, d)
    s += '<path id="lg-all" d="%s"/>' % L['all']
    for k in 'BRAOV': s += '<path id="sg-%s" d="%s"/>' % (k, SG[k])
    for i, d in enumerate(SG['SHOES']): s += '<path id="sg-s%d" d="%s"/>' % (i, d)
    return s + '</defs></svg>'

def sign(cls, fg, shoes=False):
    """the sign logo; on white the letters go dark (fg) and the V stays red"""
    u = ''.join('<use href="#sg-%s"/>' % k for k in 'BRAO') + (''.join('<use href="#sg-s%d"/>' % i for i in range(5)) if shoes else '')
    return '<svg class="%s" viewBox="0 0 %s %s" aria-hidden="true"><g fill="%s">%s</g><use href="#sg-V" fill="%s"/></svg>' % (cls, LW if shoes else SW, SH, fg, u, RED)

def sign_inline(fg, shoes=True, glow=False):
    """self-contained (no <use>) for the link card"""
    p = ''.join('<path d="%s"/>' % SG[k] for k in 'BRAO') + (''.join('<path d="%s"/>' % d for d in SG['SHOES']) if shoes else '')
    s = '<svg viewBox="0 0 %s %s" style="width:100%%;height:auto;overflow:visible">' % (LW if shoes else SW, SH)
    if glow:
        s += ('<defs><filter id="ga" x="-20%%" y="-60%%" width="140%%" height="220%%"><feGaussianBlur stdDeviation="22"/></filter>'
              '<filter id="gb" x="-20%%" y="-60%%" width="140%%" height="220%%"><feGaussianBlur stdDeviation="7"/></filter></defs>'
              '<g fill="%s" filter="url(#ga)" opacity=".45">%s</g><g fill="%s" filter="url(#gb)" opacity=".9">%s</g>'
              '<path d="%s" fill="%s" filter="url(#gb)" opacity=".9"/>') % (ICE, p, ICE, p, SG['V'], RED)
    return s + '<g fill="%s">%s</g><path d="%s" fill="%s"/></svg>' % (fg, p, SG['V'], RED)

def mark(cls, fill='url(#gGold)'):
    return ('<svg class="%s" viewBox="%s" aria-hidden="true"><g fill="%s"><use href="#lg-all"/><use href="#lg-B"/><use href="#lg-S"/>'
            '<use href="#lg-heel"/><use href="#lg-st0"/><use href="#lg-st1"/></g></svg>') % (cls, MARK_VB, fill)

def intro():
    """the opening: their sign at night. Each letter has a drawn outline (.idr), a lit face (.ifc) and a blurred bloom
    (.ihl); a day layer (#iday, dark letters) takes over while the logo glides into the header."""
    s = '<svg id="ilogo" viewBox="0 0 %s %s" aria-hidden="true"><defs>' % (LW, SH)
    s += '<filter id="fBloom" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>'
    s += '<filter id="fWide" x="-40%" y="-90%" width="180%" height="280%"><feGaussianBlur stdDeviation="24"/></filter>'
    s += '<linearGradient id="gSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    s += '<mask id="mSign" maskUnits="userSpaceOnUse" x="0" y="0" width="%s" height="%s"><g fill="#fff">%s</g></mask></defs>' % (
        LW, SH, ''.join('<use href="#sg-%s"/>' % k for k in 'BRAOV') + ''.join('<use href="#sg-s%d"/>' % i for i in range(5)))
    s += '<g id="ibravo"><rect id="ibox" width="%s" height="%s" fill="none"/>' % (SW, SH)
    s += '<g id="iwide" filter="url(#fWide)" opacity="0"><g fill="%s">%s</g><use href="#sg-V" fill="%s"/></g>' % (ICE, ''.join('<use href="#sg-%s"/>' % k for k in 'BRAO'), RED)
    for k in 'BRAO':
        s += ('<g class="il" id="il%s"><use class="ihl" href="#sg-%s" fill="%s" filter="url(#fBloom)" opacity="0"/>'
              '<use class="ifc" href="#sg-%s" fill="%s" opacity="0"/><use class="idr" href="#sg-%s" fill="none" stroke="%s" stroke-width="6"/></g>') % (k, k, ICE, k, ICE, k, ICE)
    s += ('<g id="iv"><use class="ihl" href="#sg-V" fill="%s" filter="url(#fBloom)" opacity="0"/><use class="ifc" href="#sg-V" fill="%s" opacity="0"/></g>') % (RED, RED)
    s += '<g id="iday" opacity="0"><g fill="#17161b">%s</g><use href="#sg-V" fill="%s"/></g></g>' % (''.join('<use href="#sg-%s"/>' % k for k in 'BRAO'), RED)
    s += '<g id="ishoes" fill="%s">%s</g>' % (ICE, ''.join('<use class="ish" href="#sg-s%d"/>' % i for i in range(5)))
    s += '<g mask="url(#mSign)"><rect id="isweep" x="-400" y="-20" width="260" height="%s" fill="url(#gSweep)" opacity=".85"/></g>' % (SH + 40)  # mask on the parent so it stays put
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
     'I_X': ic('<path d="M6 6l12 12M18 6L6 18"/>', '2'),
     'I_BAG': ic('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
     'I_SEARCH': ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
     'I_FILTER': ic('<path d="M4 6h16M7 12h10M10 18h4"/>'),
     'I_SHOP': ic('<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3"/>'),
     'I_MINUS': ic('<path d="M6 12h12"/>', '2'), 'I_PLUS': ic('<path d="M12 6v12M6 12h12"/>', '2'),
     'I_CHECK': ic('<path d="M5 12.5l4.5 4.5L19 7"/>', '2.2'),
     'I_HEART': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.3C1.5 8 3.4 4.5 6.9 4.5c2.1 0 3.5 1.2 5.1 3 1.6-1.8 3-3 5.1-3 3.5 0 5.4 3.5 4.2 6.7-1.8 4.7-9.3 9.3-9.3 9.3z"/></svg>',
     'SWASH': '<svg class="swash" viewBox="0 0 200 16" aria-hidden="true"><path d="M2 12C40 2 80 2 118 8s58 6 80-4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'}

t = open(D + 'tpl.html').read()
H = I['I_HEART']
I['HB'] = H.replace('<svg ', '<svg class="h-b" ', 1); I['HK'] = H.replace('<svg ', '<svg class="h-k" ', 1); I['HW'] = H.replace('<svg ', '<svg class="h-w" ', 1)
R = dict(I, DEFS=defs(), INTRO=intro(), NAVSIGN=sign('sl', '#17161b'), FOOTSIGN=sign('fsl', ICE, True), DUSTMARK=mark('dmk'),
         SWEEPX='%d' % (LW + 520),
         TEL=TEL, WA=WA, IGURL=IG, DM=DM, ALLPATH=json.dumps(L['all']), MARKVB=json.dumps([60, 80, 830, 860]))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)

# favicon: the red V alone on the night facade (BRAVO is unreadable at 32 px; the V reads)
vx0, vy0, vx1, vy1 = SG['bbox']['V']; vc = ((vx0 + vx1) / 2, (vy0 + vy1) / 2); side = (vy1 - vy0) * 1.5
fx, fy = vc[0] - side / 2, vc[1] - side / 2
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.1f %.1f %.1f %.1f"><rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"/>'
       '<path d="%s" fill="%s"/></svg>') % (fx, fy, side, side, fx, fy, side, side, side * .22, FACADE, SG['V'], RED)
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:%s">' % FACADE + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')

# link preview card (1200 x 630): their sign lit up at night with the gold LED strips, one of their boots, name, hook, place
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Tinos:ital@0;1&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(90%% 90%% at 30%% 30%%,%s 0%%,#17161b 100%%);color:#fff;font-family:Montserrat}'
      '.led{position:absolute;top:0;bottom:0;width:4px;border-radius:2px;background:%s;box-shadow:0 0 10px 2px %s,0 0 34px 6px rgba(191,161,106,.45)}'
      '.lg{position:absolute;left:66px;top:92px;width:600px}'
      '.hk{position:absolute;left:68px;top:300px;width:560px;font:italic 400 38px/1.22 Tinos;color:%s}'
      '.pl{position:absolute;left:68px;bottom:60px;display:flex;align-items:center;gap:14px;font:700 26px Montserrat;color:#fff}'
      '.pl i{font-style:normal;color:%s}'
      '.seam{position:absolute;left:760px;top:0;width:440px;height:630px;background:linear-gradient(180deg,#fff 0%%,#f6f6f5 45%%,#efeeed 100%%)}'
      '.seam img{position:absolute;left:50%%;bottom:70px;height:440px;transform:translateX(-50%%);z-index:2}'
      '.seam i{position:absolute;left:50%%;bottom:54px;width:340px;height:40px;transform:translateX(-50%%);background:radial-gradient(50%% 50%% at 50%% 50%%,rgba(23,22,27,.34),rgba(23,22,27,0) 100%%)}'
      '</style></head><body><span class="led" style="left:22px"></span><span class="led" style="left:36px"></span><span class="led" style="left:724px"></span><span class="led" style="left:738px"></span>'
      "<div class=\"lg\">SIGNLOGO</div>"
      '<div class="hk">Boots, heels and fur slippers, sizes 36 till 40. Order on WhatsApp.</div>'
      '<div class="pl">Beirut, Lebanon <i>·</i> 70/810021</div>'
      '<div class="seam"><img src="../media/cut-ankle.webp"><i></i></div></body></html>') % (FACADE, LED, LED2, ICE, LED2)
og = og.replace("SIGNLOGO", sign_inline(ICE, True, True))
open(D + '../og.html', 'w').write(og)
print('index', len(t) // 1024, 'KB')
