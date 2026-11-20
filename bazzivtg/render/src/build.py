import re, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
F = TTFont(D + 'fonts/anton.ttf'); GS = F.getGlyphSet(); CM = F.getBestCmap(); UPM = F['head'].unitsPerEm

def word(text, size, cx, base, track=0):
    s = size / UPM
    ws = [GS[CM[ord(c)]].width * s for c in text]
    total = sum(ws) + track * (len(text) - 1)
    x = cx - total / 2; out = []
    for c, w in zip(text, ws):
        pen = SVGPathPen(GS); GS[CM[ord(c)]].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        out.append(pen.getCommands()); x += w + track
    return out

BONE, SUN, INK = '#111110', '#f0c24b', '#111110'
# wire hanger: hook at (260,18), shoulders to a bar at y=96
HANGER = ('<g id="lg-hanger"><path d="M260 58c0-10 14-12 14-26a14 14 0 0 0-28 0" fill="none" stroke="#111110" stroke-width="6" stroke-linecap="round"/>'
          '<path d="M260 58L92 104h336z" fill="none" stroke="#111110" stroke-width="6" stroke-linejoin="round"/></g>')
L = word('BAZZI', 150, 260, 250, 6)
VTG = word('VTG', 46, 260, 279, 4)
# distressed print: a static speckle mask so it reads like a worn screen print
DEFS = ('<defs><filter id="lgwear" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="n"/>'
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 2.05"/></filter>'
        '<mask id="lgm" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="320"><rect width="520" height="320" fill="#fff"/><rect width="520" height="320" filter="url(#lgwear)" fill="#000" opacity=".4"/></mask></defs>')
def logo(anim, mid=''):
    c = (lambda n: ' class="%s"' % n) if anim else (lambda n: '')
    letters = ''.join('<path%s d="%s"/>' % (c('lg-l'), d) for d in L)
    vtg = ('<g id="lg-vtg%s" transform="rotate(-6 260 262)"><rect x="196" y="236" width="128" height="54" rx="8" fill="%s"/>' % (mid, SUN) +
           ''.join('<path d="%s" fill="%s"/>' % (d, INK) for d in VTG) + '</g>')
    return ('<svg viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bazzi VTG">' + DEFS.replace('lgwear', 'lgwear' + mid).replace('lgm"', 'lgm%s"' % mid).replace('url(#lgwear)', 'url(#lgwear%s)' % mid) +
            HANGER.replace('id="lg-hanger"', 'id="lg-hanger%s"' % mid) + '<g mask="url(#lgm%s)"><g fill="%s">%s</g>%s</g></svg>' % (mid, BONE, letters, vtg))
LOGO_ANIM = logo(True)
# nav: wordmark without the hanger, one line
NW = word('BAZZI', 100, 150, 100, 4)
NV = word('VTG', 30, 335, 92, 3)
LOGO_NAV = ('<svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="%s">%s</g><g transform="rotate(-6 335 80)"><rect x="290" y="56" width="90" height="46" rx="7" fill="%s"/>%s</g></svg>'
            % (BONE, ''.join('<path d="%s"/>' % d for d in NW), SUN, ''.join('<path d="%s" fill="%s"/>' % (d, INK) for d in NV)))

def ic(p, w='2'):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (w, p)
I = {'I_LIVE': ic('<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
     'I_FLIP': ic('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>')}
HOOK = '<svg class="hook" viewBox="0 0 44 34" aria-hidden="true"><path d="M22 30V18c0-4 7-4 7-10a7 7 0 0 0-14 0"/></svg>'
ITEMS = [('pj', 'Pearl Jam', "Faded out. Best condition he's seen one in."),
         ('melvins', 'Melvins, Stoner Witch', 'Smoked out and sun-faded.'),
         ('bone', 'Bone Thugs-n-Harmony', "Two of the best Bone Thugs pieces you'll see."),
         ('rap', 'Rap tees', 'A pair of 90s rap prints, front and back.')]
RACK = ''.join('<div class="item drop" style="transition-delay:%dms"><div class="hang">%s<div class="tee" data-tee><div class="in"><div class="f ph"><img src="media/%s-front.webp" width="720" height="960" loading="lazy" alt="%s tee hanging from a tree, front"></div><div class="b ph"><img src="media/%s-back.webp" width="720" height="960" loading="lazy" alt="%s tee hanging from a tree, back"></div></div><span class="flipme">%sFlip</span></div></div><div class="cap"><h3>%s</h3><p>%s</p></div></div>' % (
    i * 90, '', k, n, k, n, I['I_FLIP'], n, p) for i, (k, n, p) in enumerate(ITEMS))

t = open(D + 'tpl2.html').read()
GN = [('pj','Pearl Jam','Faded'),('melvins','Melvins','Stoner Witch'),('bone','Bone Thugs','Two pieces'),('rap','Rap tees','Two pieces')]
NOTE = {'pj':"Best condition he's seen one in.",'melvins':'Smoked out.','bone':"Two of the best Bone Thugs pieces you'll see.",'rap':'90s rap prints.'}
GRID = ''.join('<div class="p rv" data-tee style="transition-delay:%dms"><div class="ph"><img class="fr" src="media/%s-front.webp" width="720" height="960" loading="lazy" alt="%s vintage tee on a hanger in the trees, front"><img class="bk" src="media/%s-back.webp" width="720" height="960" loading="lazy" alt="%s vintage tee on a hanger in the trees, back"></div><div class="meta"><b>%s</b><span>%s</span></div><p class="note">%s</p></div>' % (i*70,k,n,k,n,n,sub,NOTE[k]) for i,(k,n,sub) in enumerate(GN))
R = dict(I, LOGO_ANIM=LOGO_ANIM, LOGO_NAV=LOGO_NAV, GRID=GRID)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111110"/><path d="%s" fill="%s"/></svg>' % (word('B', 52, 32, 52)[0], SUN))
open(S + 'render/logo.svg', 'w').write(logo(False, 's').replace('<svg ', '<svg style="background:#efede8" ', 1))
print(len(t) // 1024, 'KB')
