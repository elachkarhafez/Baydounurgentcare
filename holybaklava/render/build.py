"""Build ../index.html and ../favicon.svg from page.html + parts.json (trace.py).
Every traced part becomes ONE <path id="p-<name>"> in a hidden <defs>. Logos on the page are <use> of symbols built from
those paths, and the canvas sign and the box lid build their Path2D objects from the same paths, so the data ships once.
Placeholders in page.html: <!--DEFS--> and /*META*/ (part boxes, the letter centrelines, the sampled colours).
Run kit/og/card.mjs AFTER this (it rewrites the head of index.html with the og tags).
Usage: /usr/bin/python3 -I build.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
P = json.load(open(os.path.join(HERE, 'parts.json')))
M = P.pop('_meta')

# their colours, sampled by trace.py from the logo post
PINK, PINKL, SKIN, SKINSH, LN, NAIL, PISTD, PIST, GOLD = '#fe99c3', '#fcbfdb', '#fcd8c2', '#f9a279', '#ae5b24', '#fe99c3', '#7f8616', '#d7ce31', '#eaac3a'
paths = ''.join(f'<path id="p-{n}" d="{v["d"]}"/>' for n, v in P.items())
u = lambda n, c=None: f'<use href="#p-{n}"' + (f' fill="{c}"' if c else '') + '/>'
pieces = sorted([n for n in P if re.fullmatch(r'p\d+', n)], key=lambda s: int(s[1:]))
nails = sorted([n for n in P if n.startswith('nail')])
hand = u('hand', SKIN) + u('handsh', SKINSH) + u('handln', LN) + ''.join(u(n, NAIL) for n in nails)
crumbs = u('pd', PISTD) + ''.join(u(n, PIST) for n in pieces)
holy = f'<g fill="{PINK}">' + ''.join(u(n) for n in ['h', 'o', 'l', 'swirl', 'y']) + '</g>' + u('swirlhi', PINKL)
bak = f'<g fill="{PINK}">' + ''.join(u(f'k{i}') for i in range(7)) + '</g>' + u('ruleL', GOLD) + u('ruleR', GOLD)
defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + paths +
        f'<symbol id="sb-logo" viewBox="0 0 828 795">{hand}{crumbs}{holy}{bak}</symbol>'
        f'<symbol id="sb-holy" viewBox="5 272 652 470">{holy}</symbol>'
        f'<symbol id="sb-hand" viewBox="215 5 615 290">{hand}{crumbs}</symbol>'
        '</defs></svg>')
meta = {'parts': {n: [v['c'], v['box']] for n, v in P.items()}, 'lines': M['lines'], 'colours': M['colours']}
page = open(os.path.join(HERE, 'page.html')).read()
out = page.replace('<!--DEFS-->', defs).replace('/*META*/', json.dumps(meta, separators=(',', ':')))
open(os.path.join(SITE, 'index.html'), 'w').write(out)

# favicon: the "holy" lockup on their blush tile (paths rounded to whole units)
def slim(d): return re.sub(r'(-?\d+\.\d)', lambda m: str(round(float(m.group(1)))), d)
fav_holy = ''.join(f'<path d="{P[n]["d"]}"/>' for n in ['h', 'o', 'l', 'swirl', 'y'])
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#feeefb"/>'
       f'<g fill="{PINK}" transform="translate(4 12) scale(.086) translate(-5 -272)">{fav_holy}</g></svg>')
open(os.path.join(SITE, 'favicon.svg'), 'w').write(fav)
open(os.path.join(HERE, 'icon.html'), 'w').write('<html><body style="margin:0">' + fav.replace('<svg ', '<svg width="512" height="512" ') + '</body></html>')
print('index.html', len(out) // 1024, 'KB; favicon', len(fav) // 1024, 'KB')
