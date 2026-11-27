"""Build ../index.html and ../favicon.svg (and icon.html for the 512px touch icon) from page.html + parts.json (trace.py).
Every traced part becomes ONE <path id="p-<name>"> in a hidden <defs>. Logos on the page are <use> of those paths, and the
canvas LED sign builds its Path2D objects from the same paths at runtime, so the path data ships once.
Placeholders in page.html:  <!--DEFS-->  and  /*META*/  (part boxes, the script centrelines, the sampled colours).
Run kit/og/card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
P = json.load(open(os.path.join(HERE, 'parts.json')))
M = P.pop('_meta')

# their colours (sampled by trace.py from the logo on the flyer)
CHOC, INK, CARAMEL = '#3e0c03', '#1f0c03', '#914304'
paths = ''.join(f'<path id="p-{n}" d="{v["d"]}"/>' for n, v in P.items())
script = ''.join(f'<use href="#p-s{i}"/>' for i in range(6)) + '<use href="#p-drip"/>'
bars_o = ''.join(f'<use href="#p-b{i}"/>' for i in range(4))
bars_f = ''.join(f'<use href="#p-f{i}"/>' for i in range(4))
caps = ''.join(f'<use href="#p-c{i}"/>' for i in range(14)) + '<use href="#p-ruleL"/><use href="#p-ruleR"/>'
icon = ('<use href="#p-ic_base" fill="#2a0c05"/><use href="#p-ic_choc" fill="#a8521a"/><use href="#p-ic_cream" fill="#fde5b2"/>'
        '<use href="#p-ic_drizzle" fill="#f9c981"/>' + ''.join(f'<use href="#p-ic_spark{i}" fill="{CHOC}"/>' for i in range(3)))
grad = ('<linearGradient id="g-bars" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8661c"/>'
        f'<stop offset=".55" stop-color="{CARAMEL}"/><stop offset="1" stop-color="#7a3503"/></linearGradient>')
word = (f'<use href="#p-plate" fill="#fff"/><g fill="{CHOC}">{script}</g><g fill="#4a1607">{bars_o}</g><g fill="url(#g-bars)">{bars_f}</g>')
lockup = word + icon + f'<g fill="{CHOC}">{caps}</g><use href="#p-tag" fill="{INK}"/>'
defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + grad + paths +
        f'<symbol id="sb-lockup" viewBox="0 0 730 252">{lockup}</symbol>'
        f'<symbol id="sb-word" viewBox="0 0 730 192">{word}{icon}</symbol>'
        f'<symbol id="sb-mark" viewBox="526 0 206 192">{icon}</symbol>'
        '</defs></svg>')

meta = {'parts': {n: [v['c'], v['box']] for n, v in P.items()}, 'lines': M['lines'], 'colours': M['colours']}
page = open(os.path.join(HERE, 'page.html')).read()
out = page.replace('<!--DEFS-->', defs).replace('/*META*/', json.dumps(meta, separators=(',', ':')))
open(os.path.join(SITE, 'index.html'), 'w').write(out)

# favicon: their bar icon on a cream tile (the script is unreadable at 16-32 px)
import re
def slim(d):
    # favicon only: integer coordinates, drop the tiny speckle sub-paths
    subs = [m for m in re.findall(r'M[^M]+', d) if len(m) > 90]
    return re.sub(r'(-?\d+\.\d)', lambda m: str(round(float(m.group(1)))), ''.join(subs))
ic = ''.join(f'<path d="{M["fav"][n]}" fill="{c}"/>' for n, c in
             [('ic_base', '#2a0c05'), ('ic_choc', '#a8521a'), ('ic_cream', '#fde5b2'), ('ic_drizzle', '#f9c981')])
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fbead7"/>'
       f'<g transform="translate(32 33) scale(.29) translate(-639 -103)">{ic}</g></svg>')
open(os.path.join(SITE, 'favicon.svg'), 'w').write(fav)
open(os.path.join(HERE, 'icon.html'), 'w').write('<html><body style="margin:0">' + fav.replace('<svg ', '<svg width="512" height="512" ') + '</body></html>')
print('index.html', len(out) // 1024, 'KB; favicon', len(fav) // 1024, 'KB')
