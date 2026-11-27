"""Traces the ELEVYN logo into one SVG path per letter (plus the star) -> parts.json + logo-traced.svg.
Source: srcimg/logo-2560.jpg, the largest clean copy of the lockup, from their own site
(elevynfitness.com/wp-content/uploads/2026/08/Elevyn_page-0001-scaled-e1785953933253.jpg, 2560x768, black on white;
it is their og:image). Same lockup as the gold-on-black header logo, the IG avatar and the building sign.

Run: /usr/bin/python3 -I trace.py
1. Upscale 2x (Lanczos), threshold at 128.
2. Split the rows into the ELEVYN band and the WELLNESS * ELEVATED band, label connected components left to right
   (6 big letters; 16 small letters + the star in the middle).
3. Potrace each component on its own so every letter can light separately. Coordinates are source pixels,
   relative to the logo's bounding box (VB)."""
import os, json, subprocess, tempfile, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
K = 2
src = Image.open(D + 'srcimg/logo-2560.jpg').convert('L')
W0, H0 = src.size
a = np.asarray(src.resize((W0 * K, H0 * K), Image.LANCZOS)).astype(float)
ink = a < 128
rows = np.nonzero(ink.any(1))[0]
gap = np.nonzero(np.diff(rows) > 20 * K)[0][0]
bands = {'top': (rows[0] - 12, rows[gap] + 13), 'sub': (rows[gap + 1] - 12, rows[-1] + 13)}
tmp = tempfile.mkdtemp()


def trace(mask, oy, t=4):
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min() - 4, ys.max() + 5, xs.min() - 4, xs.max() + 5
    sub = mask[y0:y1, x0:x1]
    Image.fromarray(((~sub) * 255).astype(np.uint8)).save(tmp + '/c.pbm')
    subprocess.run(['potrace', tmp + '/c.pbm', '-s', '-a', '1.0', '-O', '0.3', '-t', str(t), '-o', tmp + '/c.svg'], check=True)
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
                    X, Y = (tx + sx * x + x0) / K, (ty + sy * y + y0 + oy) / K
                o.append('%.1f %.1f' % (X, Y)); pair = []
        out.append(' '.join(o))
    bb = [x0 / K, (y0 + oy) / K, x1 / K, (y1 + oy) / K]
    return ' '.join(out), bb


parts = []
names = {'top': 'ELEVYN', 'sub': 'WELLNESS*ELEVATED'}
for band, (y0, y1) in bands.items():
    m = ink[y0:y1]
    lab, n = nd.label(m)
    objs = [(o[1].start, i + 1) for i, o in enumerate(nd.find_objects(lab)) if (o[0].stop - o[0].start) * (o[1].stop - o[1].start) > 60 * K * K]
    objs.sort()
    assert len(objs) == len(names[band]), (band, len(objs))
    for (x, li), ch in zip(objs, names[band]):
        d, bb = trace(lab == li, y0)
        parts.append({'band': band, 'ch': ch, 'd': d, 'bb': [round(v, 1) for v in bb]})
xs0 = min(p['bb'][0] for p in parts); ys0 = min(p['bb'][1] for p in parts)
xs1 = max(p['bb'][2] for p in parts); ys1 = max(p['bb'][3] for p in parts)
pad = 6
VB = [round(xs0 - pad), round(ys0 - pad), round(xs1 - xs0 + 2 * pad), round(ys1 - ys0 + 2 * pad)]


def shift(d):
    out, tokens, cmd, pair = [], re.findall(r'[a-zA-Z]|-?[\d.]+', d), None, []
    for tok in tokens:
        if tok.isalpha():
            cmd = tok; out.append(tok); pair = []; continue
        pair.append(float(tok))
        if len(pair) == 2:
            x, y = pair
            if cmd.isupper():
                x -= VB[0]; y -= VB[1]
            out.append('%.1f %.1f' % (x, y)); pair = []
    return ' '.join(out).replace(' -', '-')


for p in parts:
    p['d'] = shift(p['d'])
    p['bb'] = [round(p['bb'][0] - VB[0], 1), round(p['bb'][1] - VB[1], 1), round(p['bb'][2] - VB[0], 1), round(p['bb'][3] - VB[1], 1)]
json.dump({'vb': [0, 0, VB[2], VB[3]], 'parts': parts}, open(D + 'parts.json', 'w'))
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d"><rect width="100%%" height="100%%" fill="#fff"/>' % (VB[2], VB[3])
for i, p in enumerate(parts):
    svg += '<path fill="%s" d="%s"/>' % ('#111' if i % 2 else '#7a5a2a', p['d'])
open(D + 'logo-traced.svg', 'w').write(svg + '</svg>')
print('parts', len(parts), 'vb', VB, 'bytes', sum(len(p['d']) for p in parts))
