"""Build ../index.html from page.html.
The traced logo (parts.json, from trace.py) goes into ONE hidden <svg><defs> as <path id="lp-<part>">; every logo on
the page (nav mark, nav wordmark, footer, intro + hero LED sign, favicon) is <use href="#lp-..."> so the 60 KB of
path data ships once. Placeholders in page.html:
  <!--DEFS-->            the shared defs (paths, gold gradient, gem facets, LED filters)
  <!--LOGO:full:cls-->   whole lockup in brand colours        <!--LOGO:mark:cls-->  ring + D + gem + ribbons
  <!--LOGO:word:cls-->   DEARBORN JEWELRY & GOLD FACTORY      <!--SIGN-->           the LED sign (layered)
Run card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'parts.json')))
META = P.pop('_meta')
W, H = META['w'], META['h']
cx, cy, r = META['ring']

def order():
    names = list(P)
    key = lambda n: (re.sub(r'\d+$', '', n), int(re.search(r'(\d+)$', n).group(1)) if re.search(r'\d+$', n) else 0)
    first = ['ring', 'gem', 'hook', 'd', 'ribL', 'ribR', 'arR', 'arL']
    rest = sorted([n for n in names if n not in first], key=lambda n: ('wjagf'.index(n[0]) if n[0] in 'wjagf' else 9, key(n)[1]))
    return [n for n in first if n in P] + rest
ORDER = order()
cls = lambda n: {'gold': 'g', 'ink': 'k', 'gem': 'm'}[P[n]['c']]

gx0, gy0, gx1, gy1 = P['gem']['box']
gw, gh = gx1 - gx0, gy1 - gy0
gird = gy0 + gh * .34
t0, t1 = gx0 + gw * .3, gx1 - gw * .3
mid = (gx0 + gx1) / 2
facets = (f'M{t0:.1f} {gy0:.1f}L{gx0:.1f} {gird:.1f}M{t1:.1f} {gy0:.1f}L{gx1:.1f} {gird:.1f}M{gx0:.1f} {gird:.1f}H{gx1:.1f}'
          f'M{t0:.1f} {gy0:.1f}L{mid - gw * .12:.1f} {gird:.1f}L{mid:.1f} {gy1:.1f}M{t1:.1f} {gy0:.1f}L{mid + gw * .12:.1f} {gird:.1f}L{mid:.1f} {gy1:.1f}'
          f'M{mid:.1f} {gy0:.1f}L{mid - gw * .12:.1f} {gird:.1f}M{mid:.1f} {gy0:.1f}L{mid + gw * .12:.1f} {gird:.1f}'
          f'M{gx0 + gw * .16:.1f} {gird:.1f}L{mid:.1f} {gy1:.1f}M{gx1 - gw * .16:.1f} {gird:.1f}L{mid:.1f} {gy1:.1f}')

defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
        '<linearGradient id="djGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4d192"/><stop offset=".38" stop-color="#c9a749"/>'
        '<stop offset=".62" stop-color="#ad8646"/><stop offset="1" stop-color="#d4b76a"/></linearGradient>'
        '<linearGradient id="djGem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset=".5" stop-color="#b9d3e6"/><stop offset="1" stop-color="#7f9db5"/></linearGradient>'
        '<filter id="djHalo" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>'
        '<filter id="djBloom" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>'
        '<linearGradient id="djShine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        + ''.join(f'<path id="lp-{n}" d="{P[n]["d"]}"/>' for n in ORDER)
        + f'<path id="lp-facets" d="{facets}"/>'
        + '<clipPath id="djClipGem"><use href="#lp-gem"/></clipPath>'
        + '<clipPath id="djClipAll">' + ''.join(f'<use href="#lp-{n}"/>' for n in ORDER) + '</clipPath>'
        + '</defs></svg>')

def uses(names):
    return ''.join(f'<use href="#lp-{n}" class="{cls(n)}" data-p="{n}"/>' for n in names)
GEMFACETS = '<use href="#lp-facets" class="fx" clip-path="url(#djClipGem)"/>'
MARK = [n for n in ORDER if n in ('ring', 'gem', 'hook', 'd', 'ribL', 'ribR')]
WORD = [n for n in ORDER if n[0] in 'wjgf' and n[1:].isdigit() or n == 'amp']
VB = {'full': f'0 0 {W} {H}', 'mark': '298 0 476 330', 'word': '318 326 446 150'}
LABEL = 'Dearborn Jewelry &amp; Gold Factory, مجوهرات ديربورن'

def logo(kind, klass):
    names = ORDER if kind == 'full' else MARK if kind == 'mark' else WORD
    fx = GEMFACETS if 'gem' in names else ''
    aria = f'role="img" aria-label="{LABEL}"' if kind != 'mark' else 'aria-hidden="true"'
    return f'<svg class="logo logo-{kind} {klass}" viewBox="{VB[kind]}" {aria}>{uses(names)}{fx}</svg>'

# the LED sign: unlit tubes, halo (wide blur), bloom (tight blur), core, gem facets, shine, sparks
def sign():
    core = ''.join(f'<use href="#lp-{n}" class="c {cls(n)}" data-p="{n}"/>' for n in ORDER)
    return (f'<svg class="sign" viewBox="-20 -30 {W + 40} {H + 50}" role="img" aria-label="{LABEL}">'
            f'<g class="unlit">{uses(ORDER)}</g>'
            f'<g class="halo" filter="url(#djHalo)">{uses(ORDER)}</g>'
            f'<g class="bloom" filter="url(#djBloom)">{uses(ORDER)}</g>'
            f'<g class="core">{core}{GEMFACETS}</g>'
            f'<circle class="draw" cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" pathLength="100"/>'
            f'<g class="shine" clip-path="url(#djClipAll)"><rect x="-200" y="-40" width="150" height="{H + 80}" fill="url(#djShine)"/></g>'
            f'<g class="sparks"></g>'
            f'<g transform="translate({gx1 - gw * .18:.1f} {gy0 + gh * .12:.1f})"><g class="glint"><path d="M0-34L5-5 34 0 5 5 0 34-5 5-34 0-5-5Z"/><circle r="4"/></g></g>'
            '</svg>')

h = open(os.path.join(HERE, 'page.html')).read()
h = h.replace('<!--DEFS-->', defs).replace('<!--SIGN-->', sign())
h = re.sub(r'<!--LOGO:(\w+):([\w -]*)-->', lambda m: logo(m.group(1), m.group(2)), h)
h = h.replace('/*RING*/', json.dumps({'cx': round(cx, 1), 'cy': round(cy, 1), 'r': round(r, 1), 'w': W, 'h': H}))
open(os.path.join(HERE, '..', 'index.html'), 'w').write(h)

# favicon: the mark alone, paths inlined (a favicon can't reach the page's defs)
fav = ''.join(f'<path d="{P[n]["d"]}" fill="{ {"gold": "url(#g)", "ink": "#0e0b09", "gem": "#cfe3f1"}[P[n]["c"]] }"/>' for n in MARK)
open(os.path.join(HERE, '..', 'favicon.svg'), 'w').write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="286 -78 500 500"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#e4d192"/><stop offset=".5" stop-color="#c9a749"/><stop offset="1" stop-color="#ad8646"/></linearGradient></defs>'
    '<rect x="286" y="-78" width="500" height="500" rx="96" fill="#fcfbf8"/>' + fav + '</svg>')
print('index.html', len(h) // 1024, 'KB')

# link-preview card source (card.mjs renders og.html → media/og.jpg)
og = open(os.path.join(HERE, 'og-src.html')).read().replace('<!--DEFS-->', defs).replace('<!--SIGN-->', sign())
open(os.path.join(HERE, 'og.html'), 'w').write(og)
