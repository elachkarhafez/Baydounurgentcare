"""Build ../index.html and ../favicon.svg from page.html + the traced paths (sign.json, badge.json from trace.py).

Every traced path is written ONCE into a hidden <svg><defs> (<path id="sl-<letter>"> for the sign letters,
<path id="bd-<ink>"> for the Tommy Platinum badge layers); every logo on the page is <use> of those.
Placeholders in page.html:
  <!--DEFS-->          shared defs (letters, badge layers, coin, filters, gradients, shine clips)
  <!--SIGN-->          the live LED sign, twice: .sign-wide (the fascia as it is on Ford Road) and .sign-stack
                       (phones: GARDEN CITY over JEWELRY & COIN, the stacked lockup their website header uses)
  <!--LOCKUP:cls-->    the stacked lockup, flat, fill currentColor (nav, footer)
  <!--BADGE:cls-->     the Tommy Platinum badge
  /*ORDER*/            the ignition order of the letters, as JSON
Run kit/og/card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SIGN = json.load(open(os.path.join(HERE, 'sign.json')))
BADGE = json.load(open(os.path.join(HERE, 'badge.json')))
L = {l['id']: l for l in SIGN['letters']}
GARDEN = [f'g{i}' for i in range(6)]
CITY = [f'c{i}' for i in range(4)]
BIG = [f'j{i}' for i in range(7)] + ['amp'] + [f'k{i}' for i in range(4)]
ORDER = GARDEN + CITY + BIG
assert all(n in L for n in ORDER), sorted(L)

# --- layouts: per-letter transform (no <g> inside clipPaths, so every <use> carries its own) ---
gx0 = min(L[n]['box'][0] for n in GARDEN); gy0 = min(L[n]['box'][1] for n in GARDEN)
gx1 = max(L[n]['box'][2] for n in GARDEN)
cx0 = min(L[n]['box'][0] for n in CITY); cy0 = min(L[n]['box'][1] for n in CITY)
cx1 = max(L[n]['box'][2] for n in CITY)
bx0 = min(L[n]['box'][0] for n in BIG); bx1 = max(L[n]['box'][2] for n in BIG)
by0 = min(L[n]['box'][1] for n in BIG); by1 = max(L[n]['box'][3] for n in BIG)
gh = max(L[n]['box'][3] for n in GARDEN) - gy0
GAP = 52
line1w = (gx1 - gx0) + GAP + (cx1 - cx0)
s1 = (bx1 - bx0) / line1w
line1h = gh * s1
LINE2Y = line1h + 58


def tf_wide(n):
    return ''


def tf_stack(n):
    if n in GARDEN:
        return f'matrix({s1:.4f} 0 0 {s1:.4f} {bx0 - gx0 * s1:.2f} {-gy0 * s1:.2f})'
    if n in CITY:
        dx = (gx1 - gx0) + GAP - (cx0 - gx0)
        return f'matrix({s1:.4f} 0 0 {s1:.4f} {bx0 + (dx - gx0) * s1:.2f} {-cy0 * s1:.2f})'
    return f'translate(0 {LINE2Y - by0:.2f})'


VB = {'wide': (gx0 - 40, 0, bx1 - gx0 + 80, SIGN['h']),
      'stack': (bx0 - 40, -40, bx1 - bx0 + 80, LINE2Y + (by1 - by0) + 80)}
TF = {'wide': tf_wide, 'stack': tf_stack}


def box_of(n, kind):
    x0, y0, x1, y1 = L[n]['box']
    if kind == 'wide':
        return x0, y0, x1, y1
    t = tf_stack(n)
    if t.startswith('matrix'):
        a, _, _, d, e, f = map(float, t[7:-1].split())
        return a * x0 + e, d * y0 + f, a * x1 + e, d * y1 + f
    dy = float(t.split()[1][:-1])
    return x0, y0 + dy, x1, y1 + dy


def uses(kind, cls=''):
    out = []
    for n in ORDER:
        t = TF[kind](n)
        out.append(f'<use href="#sl-{n}" data-l="{n}"' + (f' transform="{t}"' if t else '') + (f' class="{cls}"' if cls else '') + '/>')
    return ''.join(out)


STAR = 'M0-72C5-19 19-5 72 0C19 5 5 19 0 72C-5 19-19 5-72 0C-19-5-5-19 0-72Z'


def sign(kind):
    x, y, w, h = VB[kind]
    # two diamond glints: over the ampersand and on the O of COIN
    ax0, ay0, ax1, ay1 = box_of('amp', kind)
    ox0, oy0, ox1, oy1 = box_of('k1', kind)
    glints = (f'<g class="glint" transform="translate({ax1 - (ax1 - ax0) * .18:.0f} {ay0 + 12:.0f})"><path d="{STAR}"/></g>'
              f'<g class="glint" transform="translate({ox1 - (ox1 - ox0) * .16:.0f} {oy0 + (oy1 - oy0) * .16:.0f})"><path d="{STAR}"/></g>')
    return (f'<svg class="sign sign-{kind}" viewBox="{x:.0f} {y:.0f} {w:.0f} {h:.0f}" role="img" aria-label="Garden City Jewelry &amp; Coin">'
            f'<g class="unlit">{uses(kind)}</g>'
            f'<g class="halo" filter="url(#gcHalo)">{uses(kind)}</g>'
            f'<g class="bloom" filter="url(#gcBloom)">{uses(kind)}</g>'
            f'<g class="core">{uses(kind)}</g>'
            f'<g class="shine" clip-path="url(#gcClip-{kind})"><rect x="{x - 400:.0f}" y="{y:.0f}" width="360" height="{h:.0f}" fill="url(#gcShine)"/></g>'
            f'<g class="glints">{glints}</g>'
            '</svg>')


def lockup(klass):
    x, y, w, h = VB['stack']
    return (f'<svg class="lockup {klass}" viewBox="{x + 20:.0f} {y + 20:.0f} {w - 40:.0f} {h - 40:.0f}" role="img" aria-label="Garden City Jewelry &amp; Coin">'
            f'{uses("stack")}</svg>')


def badge(klass):
    return (f'<svg class="badge {klass}" viewBox="0 0 320 320" role="img" aria-label="Tommy Platinum, Garden City Pawn: fast cash, friendly service">'
            '<circle cx="160" cy="160" r="159" fill="#fdfefe"/>' + ''.join(f'<use href="#bd-{l["id"]}" fill="{l["fill"]}"/>' for l in BADGE['layers']) + '</svg>')


COIN = ('<symbol id="gcCoin" viewBox="-50 -50 100 100">'
        '<circle r="48" fill="url(#gcCoinG)"/><circle r="48" fill="none" stroke="#8a6512" stroke-width="2.5"/>'
        '<circle r="47" fill="none" stroke="#fff3c4" stroke-width="2" stroke-dasharray="1.4 2.2" opacity=".55"/>'
        '<circle r="38" fill="none" stroke="#a87a17" stroke-width="2.4"/><circle r="36.4" fill="none" stroke="#fff1b8" stroke-width="1.2" opacity=".7"/>'
        # the diamond from their Jewelry & Coin badge, embossed
        '<path d="M-17-6L-9-16H9L17-6 0 18Z" fill="#e9b93a" stroke="#8a6512" stroke-width="2.4" stroke-linejoin="round"/>'
        '<path d="M-17-6H17M-9-16-4-6 0 18M9-16 4-6 0 18M-4-6 0-16 4-6" fill="none" stroke="#8a6512" stroke-width="1.8" stroke-linejoin="round"/>'
        '<ellipse cx="-14" cy="-22" rx="18" ry="7" fill="#fff" opacity=".35" transform="rotate(-28 -14 -22)"/>'
        '</symbol>')

defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
        '<filter id="gcHalo" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>'
        '<filter id="gcBloom" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="4.5"/></filter>'
        '<linearGradient id="gcShine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff8dc" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        '<radialGradient id="gcCoinG" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#f8cf46"/><stop offset=".75" stop-color="#d9a22b"/><stop offset="1" stop-color="#a87a17"/></radialGradient>'
        + ''.join(f'<path id="sl-{n}" d="{L[n]["d"]}"/>' for n in ORDER)
        + ''.join(f'<path id="bd-{l["id"]}" d="{l["d"]}"/>' for l in BADGE['layers'])
        + ''.join(f'<clipPath id="gcClip-{k}">{uses(k)}</clipPath>' for k in ('wide', 'stack'))
        + COIN + '</defs></svg>')

h = open(os.path.join(HERE, 'page.html')).read()
h = h.replace('<!--DEFS-->', defs).replace('<!--SIGN-->', sign('wide') + sign('stack'))
h = re.sub(r'<!--LOCKUP:([\w -]*)-->', lambda m: lockup(m.group(1)), h)
h = re.sub(r'<!--BADGE:([\w -]*)-->', lambda m: badge(m.group(1)), h)
h = h.replace('/*ORDER*/', json.dumps(ORDER))
open(os.path.join(HERE, '..', 'index.html'), 'w').write(h)

# the link-preview card (render/og.html, rendered by kit/og/card.mjs)
o = open(os.path.join(HERE, 'og-src.html')).read()
o = o.replace('<!--DEFS-->', defs).replace('<!--SIGN-->', sign('wide') + sign('stack'))
o = re.sub(r'<!--BADGE:([\w -]*)-->', lambda m: badge(m.group(1)), o)
open(os.path.join(HERE, 'og.html'), 'w').write(o)

# favicon: the traced G and C of the sign, white on the fascia navy
g, c = L['g0'], L['c0']
fx0 = g['box'][0]; fy0 = g['box'][1]
fw = (g['box'][2] - g['box'][0]) + 10 + (c['box'][2] - c['box'][0])
fh = g['box'][3] - g['box'][1]
sc = 50 / fw
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0b1a2c"/>'
       f'<g fill="#fff" transform="translate({7 - fx0 * sc:.2f} {32 - fh * sc / 2 - fy0 * sc:.2f}) scale({sc:.4f})"><path d="{g["d"]}"/>'
       f'<path transform="translate({g["box"][2] + 10 - c["box"][0]:.1f} {fy0 - c["box"][1]:.1f})" d="{c["d"]}"/></g>'
       '<rect x="7" y="50" width="50" height="3" rx="1.5" fill="#f8cf46"/></svg>')
open(os.path.join(HERE, '..', 'favicon.svg'), 'w').write(fav)
print('index.html', len(h) // 1024, 'KB; stack scale', round(s1, 3), 'line2y', round(LINE2Y))
