"""Traces the Cinco Barbers logo into per-part SVG paths for the LED sign -> parts.json (+ logo-traced.svg preview).
Source: srcimg/logo-square-1983.jpg, the full-format logo from their own Square Appointments brand assets
(seller-brand-assets-f.squarecdn.com/MLB1AA6FYFB8A/a98f1163...jpeg, 1983x1004). It is the same lockup as their
IG avatar, the end card of their grand-opening reel and the decal on their barber mat (post Dej0aRKCZUp).

Run: /usr/bin/python3 -I trace.py
1. Upscale 2x (Lanczos), split the pixels by colour: cream (CINCO, razor, EST. 2026), gold (rays, BARBERS,
   rules, brass, letter bevel), and the pole glass (red/white/blue between the brass rings).
2. Label connected components and group them by position: rays, brass, glass, the 5 CINCO letters, the
   gold bevel under them, the 7 BARBERS letters, rules + diamond, razor, EST. 2026.
3. Potrace each part on its own so every piece can light separately. Coordinates are in source pixels,
   cropped to the logo's bounding box (VB below)."""
import os, json, subprocess, tempfile, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
K = 2
src = Image.open(D + 'srcimg/logo-square-1983.jpg').convert('RGB')
W0, H0 = src.size
a = np.asarray(src.resize((W0 * K, H0 * K), Image.LANCZOS)).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
L = a.mean(-1); mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
H, W = L.shape
yy, xx = np.mgrid[0:H, 0:W] / K           # source-pixel coordinates
inbox = (xx > 330) & (xx < 1595)
cream = (L > 140) & (sat < .25) & inbox
gold = (sat >= .2) & (r > 85) & (r > b * 1.25) & (g > b * 1.02) & (L > 50) & inbox
# the pole: glass between the rings, brass above/below
POLE = (895, 1040)
pole_x = (xx > POLE[0]) & (xx < POLE[1])
glass_rect = pole_x & (yy > 112) & (yy < 345) & (xx > 912) & (xx < 1022)
glass = glass_rect & (L > 28)
glass = nd.binary_closing(glass, iterations=3 * K)
glass = nd.binary_fill_holes(glass)  # the glass is one solid tube
glass = nd.binary_opening(glass, iterations=2 * K)
brass = (gold | cream) & pole_x & (yy < 400) & ~glass_rect & (L > 70)
brass = nd.binary_closing(brass, iterations=K)
tmp = tempfile.mkdtemp()


def fill_small(m, max_area=120):
    """fill texture pin-holes but keep real counters (O, C, the razor handle) open"""
    holes = nd.binary_fill_holes(m) & ~m
    lab, n = nd.label(holes)
    if not n:
        return m
    sizes = nd.sum(holes, lab, range(1, n + 1)) / K / K
    small = np.isin(lab, np.nonzero(sizes < max_area)[0] + 1)
    return m | small


def trace(mask, t=6):
    ys, xs = np.nonzero(mask)
    if not len(ys):
        return ''
    y0, y1, x0, x1 = ys.min() - 4, ys.max() + 5, xs.min() - 4, xs.max() + 5
    sub = mask[y0:y1, x0:x1]
    Image.fromarray(((~sub) * 255).astype(np.uint8)).save(tmp + '/c.pbm')
    subprocess.run(['potrace', tmp + '/c.pbm', '-s', '-a', '1.1', '-O', '0.4', '-t', str(t), '-o', tmp + '/c.svg'], check=True)
    s = open(tmp + '/c.svg').read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', s).groups())
    out = []
    for d in re.findall(r'<path d="([^"]+)"', s):
        o, pair, cmd = [], [], None
        for tok in re.findall(r'[a-zA-Z]|-?[\d.]+', d):
            if tok.isalpha():
                cmd = tok; o.append(tok); pair = []; continue
            pair.append(float(tok))
            if len(pair) == 2:
                x, y = pair
                if cmd.islower():
                    X, Y = sx * x / K, sy * y / K
                else:
                    X, Y = (tx + sx * x + x0) / K, (ty + sy * y + y0) / K
                o.append('%.1f %.1f' % (X, Y)); pair = []
        out.append(' '.join(o))
    return ' '.join(out)


def comps(mask, min_area=6):
    lab, n = nd.label(mask)
    res = []
    for i, sl in enumerate(nd.find_objects(lab)):
        m = lab == i + 1
        area = m.sum() / K / K
        if area < min_area:
            continue
        y0, y1, x0, x1 = sl[0].start / K, sl[0].stop / K, sl[1].start / K, sl[1].stop / K
        res.append({'m': m, 'box': [x0, y0, x1, y1], 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'area': area})
    return res


parts = {}
def add(name, mask, col, t=6):
    d = trace(mask, t)
    ys, xs = np.nonzero(mask)
    parts[name] = {'d': d, 'col': col, 'box': [round(xs.min() / K, 1), round(ys.min() / K, 1), round(xs.max() / K, 1), round(ys.max() / K, 1)]}

# --- CINCO letters (cream, 380-690), cleaned for a neon read
cband = cream & (yy > 370) & (yy < 700) & ~pole_x | (cream & (yy > 395) & (yy < 700) & pole_x)
cband = nd.binary_closing(cband, iterations=2 * K)
cband = fill_small(cband)
big = [c for c in comps(cband, 400)]
big.sort(key=lambda c: c['cx'])
letters = big[:5] if len(big) >= 5 else big
names = ['C1', 'I', 'N', 'C2', 'O']
lmask = {n: np.zeros_like(cband) for n in names}
for n, c in zip(names, letters):
    lmask[n] |= c['m']
# small specks -> nearest letter
for c in comps(cband, 2):
    if c['area'] >= 400:
        continue
    j = int(np.argmin([abs(c['cx'] - l['cx']) for l in letters]))
    lmask[names[j]] |= c['m']
for n in names:
    m = nd.binary_opening(lmask[n], iterations=1)
    add(n, m, 'cream', 8)
# bevel/shadow: gold inside the CINCO band
bev = gold & (yy > 375) & (yy < 700) & ~((yy < 400) & pole_x)
bev = bev & ~nd.binary_dilation(cband, iterations=0) if False else bev
bev = nd.binary_closing(bev, iterations=K)
add('bevel', bev, 'gold', 10)

# --- rays: gold above the letters, outside the pole
rays = gold & (yy < 390) & (yy > 60) & ~((xx > 890) & (xx < 1045))
rays = nd.binary_closing(rays, iterations=1)
add('rays', rays, 'gold', 8)

# --- pole
add('brass', brass, 'brass', 8)
add('glass', glass, 'glass', 10)

# --- BARBERS (gold, 670-770): letters are tall comps, rules are flat ones
bb = gold & (yy > 655) & (yy < 775)
bb = nd.binary_closing(bb, iterations=K)
cs = comps(bb, 30)
letters_b = [c for c in cs if (c['box'][3] - c['box'][1]) > 40 and (c['box'][2] - c['box'][0]) < 90]
letters_b.sort(key=lambda c: c['cx'])
rules = np.zeros_like(bb)
for c in cs:
    if not any(c is l for l in letters_b):
        rules |= c['m']
for i, c in enumerate(letters_b[:7]):
    add('B%d' % i, c['m'], 'gold', 6)
# rules + diamond below
low = gold & (yy >= 775) & (yy < 960)
low = nd.binary_closing(low, iterations=K)
rules |= low
add('rules', rules, 'gold', 6)

# --- razor (cream 740-860) and EST. 2026 (cream > 860)
raz = cream & (yy > 740) & (yy < 860)
raz = nd.binary_closing(raz, iterations=K)
raz = fill_small(raz, 40)
add('razor', raz, 'cream', 8)
est = cream & (yy >= 860) & (yy < 920)
add('est', est, 'cream', 4)

allb = np.array([p['box'] for p in parts.values()])
VB = [float(allb[:, 0].min() - 20), float(allb[:, 1].min() - 20), float(allb[:, 2].max() + 20), float(allb[:, 3].max() + 20)]
json.dump({'vb': VB, 'parts': parts, 'nB': len(letters_b)}, open(D + 'parts.json', 'w'))
COL = {'cream': '#F2EADD', 'gold': '#B38B58', 'brass': '#AE8A5C', 'glass': '#e9e4dc'}
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%g %g %g %g"><rect x="%g" y="%g" width="%g" height="%g" fill="#000"/>' % (VB[0], VB[1], VB[2] - VB[0], VB[3] - VB[1], VB[0], VB[1], VB[2] - VB[0], VB[3] - VB[1])]
order = ['rays', 'bevel', 'brass', 'glass', 'C1', 'I', 'N', 'C2', 'O'] + ['B%d' % i for i in range(7)] + ['rules', 'razor', 'est']
for k in order:
    if k in parts:
        svg.append('<path fill="%s" fill-rule="evenodd" d="%s"/>' % (COL[parts[k]['col']], parts[k]['d']))
svg.append('</svg>')
open(D + 'logo-traced.svg', 'w').write('\n'.join(svg))
print('VB', VB, 'B letters', len(letters_b), {k: len(v['d']) for k, v in parts.items()})
