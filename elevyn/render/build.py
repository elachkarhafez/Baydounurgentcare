"""Builds elevyn/index.html from tpl.html + parts.json (the traced logo) and writes favicon.svg.
Run: /usr/bin/python3 -I build.py
- Every traced path is written ONCE into a hidden <defs> block (#p0..#p22) plus a #lockup symbol.
- The hero sign is one SVG of <use> layers: unlit tubes, a wide gold halo, a tight warm-white halo, the gold faces,
  a shine sweep masked by the letters, and a glint on the star. Each letter's uses carry class l<k> so the intro and
  the live sign can light letters one by one."""
import json, os, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
J = json.load(open(D + 'parts.json'))
P = J['parts']; VB = J['vb']; W, H = VB[2], VB[3]
paths = ''.join('<path id="p%d" d="%s"/>' % (i, p['d']) for i, p in enumerate(P))
uses = lambda cls='': ''.join('<use href="#p%d" class="l%d%s"/>' % (i, i, cls) for i in range(len(P)))
star = next(i for i, p in enumerate(P) if p['ch'] == '*')
sb = P[star]['bb']; scx, scy = (sb[0] + sb[2]) / 2, (sb[1] + sb[3]) / 2 + 2
top = [i for i, p in enumerate(P) if p['band'] == 'top']
sub = [i for i, p in enumerate(P) if p['band'] == 'sub' and i != star]
defs = (
    '<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' + paths +
    '<linearGradient id="gGold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="%d">'
    '<stop offset="0" stop-color="#F2DDA9"/><stop offset=".3" stop-color="#E6C48A"/><stop offset=".62" stop-color="#C49A5C"/>'
    '<stop offset=".86" stop-color="#B89555"/><stop offset="1" stop-color="#D19F4E"/></linearGradient>' % H +
    '<linearGradient id="gSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>'
    '<stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    '<filter id="fWide" filterUnits="userSpaceOnUse" x="-300" y="-300" width="%d" height="%d"><feGaussianBlur stdDeviation="46"/></filter>'
    '<filter id="fHalo" filterUnits="userSpaceOnUse" x="-200" y="-200" width="%d" height="%d"><feGaussianBlur stdDeviation="11"/></filter>'
    '<filter id="fGlint" filterUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800"><feGaussianBlur stdDeviation="3"/></filter>'
    % (W + 600, H + 600, W + 400, H + 400) +
    '<mask id="mLetters" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#000"/>'
    '<g fill="#fff">%s</g></mask>' % (W, H, W, H, uses()) +
    '</defs><symbol id="lockup" viewBox="0 0 %d %d">%s</symbol></svg>' % (W, H, uses())
)
sign = (
    '<svg class="sign" viewBox="0 0 %d %d" role="img" aria-label="ELEVYN Wellness Elevated sign">' % (W, H) +
    '<g class="unlit">%s</g>' % uses() +
    '<g class="hw" filter="url(#fWide)">%s</g>' % uses(' lit') +
    '<g class="hh" filter="url(#fHalo)">%s</g>' % uses(' lit') +
    '<g class="face">%s</g>' % uses(' lit') +
    '<g class="shine" mask="url(#mLetters)"><rect class="sweep" x="-420" y="-40" width="380" height="%d" fill="url(#gSweep)" transform="skewX(-18)"/></g>' % (H + 80) +
    '<g class="glint" transform="translate(%.1f %.1f)"><g class="gl" filter="url(#fGlint)">'
    '<ellipse rx="150" ry="5" fill="#fff"/><ellipse rx="5" ry="95" fill="#fff"/><circle r="16" fill="#FFF3D6"/></g></g>' % (scx, scy) +
    '</svg>'
)
meta = json.dumps({'top': top, 'sub': sub, 'star': star, 'n': len(P)})
tpl = open(D + 'tpl.html').read()
out = tpl.replace('<!--DEFS-->', defs).replace('<!--SIGN-->', sign).replace('/*SIGNMETA*/{}', meta)
open(D + '../index.html', 'w').write(out)
# favicon: the first E of the lockup, gold on their black
e = P[0]; x0, y0, x1, y1 = e['bb']; s = max(x1 - x0, y1 - y0) * 1.36
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.1f %.1f %.1f %.1f"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
       '<stop offset="0" stop-color="#E6C48A"/><stop offset="1" stop-color="#C49A5C"/></linearGradient></defs>'
       '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="#0B0B0C"/><path fill="url(#g)" d="%s"/></svg>'
       % (cx - s / 2, cy - s / 2, s, s, cx - s / 2, cy - s / 2, s, s, s * .18, e['d']))
open(D + '../favicon.svg', 'w').write(fav)
# lit logo for the link-preview card (render/og.html)
bare = ''.join('<path d="%s"/>' % p['d'] for p in P)
lit = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 %d %d"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="%d">'
       '<stop offset="0" stop-color="#F2DDA9"/><stop offset=".3" stop-color="#E6C48A"/><stop offset=".62" stop-color="#C49A5C"/><stop offset=".86" stop-color="#B89555"/><stop offset="1" stop-color="#D19F4E"/></linearGradient>'
       '<filter id="w" filterUnits="userSpaceOnUse" x="-60" y="-60" width="%d" height="%d"><feGaussianBlur stdDeviation="40"/></filter>'
       '<filter id="h" filterUnits="userSpaceOnUse" x="-60" y="-60" width="%d" height="%d"><feGaussianBlur stdDeviation="10"/></filter></defs>'
       '<g fill="#C49A5C" opacity=".75" filter="url(#w)">%s</g><g fill="#FFE9BC" opacity=".8" filter="url(#h)">%s</g><g fill="url(#g)">%s</g></svg>'
       % (W + 120, H + 120, H, W + 120, H + 120, W + 120, H + 120, bare, bare, bare))
open(D + 'logo-lit.svg', 'w').write(lit)
print('index.html', len(out), 'bytes; star', star, 'top', top)
