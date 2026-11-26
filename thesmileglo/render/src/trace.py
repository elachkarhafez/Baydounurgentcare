"""Traces The Smile Glo wordmark into SVG paths for the lit sign (writes logo.json next to this file).
Source: srcimg/logo-site-440.png, the 2x header logo of their own website (thesmileglo.com/_astro/smileglo-white...webp,
440x162, white on transparent). It is the cleanest public copy: the IG posts carry the same lockup but as JPEG
with the sparkles cropped, and the IG avatar is 150px.

Run with a PIL/numpy/scipy python:  /usr/bin/python3 -I trace.py
1. Upscale 8x (Lanczos) on the alpha*luma ink, blur a touch, threshold at half ink.
2. Label connected components and group them by position: THE, the three sparkles, Smile, Glo, TEETH WHITENING.
3. Potrace each component on its own so every piece can light separately.
Coordinates are in the 440x162 logo's pixel space."""
import os, json, subprocess, tempfile, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
K = 8
im = Image.open(D + '../srcimg/logo-site-440.png').convert('LA')
W, Hh = im.size
a = np.asarray(im).astype(float)
ink0 = a[..., 0] * a[..., 1] / 255.0
big = np.asarray(Image.fromarray(ink0.astype(np.uint8)).resize((W * K, Hh * K), Image.LANCZOS)).astype(float)
P = 8 * K  # pad so letters touching the edge (the S, the base of TEETH WHITENING) trace cleanly
big = np.pad(big, P)
ink = nd.gaussian_filter(big, K * .18) > 128
lab, n = nd.label(ink)
objs = nd.find_objects(lab)
tmp = tempfile.mkdtemp()


def trace(mask):
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min() - 4, ys.max() + 5, xs.min() - 4, xs.max() + 5
    sub = mask[y0:y1, x0:x1]
    Image.fromarray(((~sub) * 255).astype(np.uint8)).save(tmp + '/c.pbm')
    subprocess.run(['potrace', tmp + '/c.pbm', '-s', '-a', '1.0', '-O', '0.2', '-t', '4', '-o', tmp + '/c.svg'], check=True)
    s = open(tmp + '/c.svg').read()
    tx, ty, sx, sy = map(float, re.search(r'transform="translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)"', s).groups())
    out = []
    for d in re.findall(r'<path d="([^"]+)"', s):
        o, pair, cmd = [], [], None
        for t in re.findall(r'[a-zA-Z]|-?[\d.]+', d):
            if re.match(r'[a-zA-Z]', t):
                cmd = t; o.append(t); pair = []; continue
            pair.append(float(t))
            if len(pair) == 2:
                x, y = pair
                if cmd.islower(): X, Y = sx * x / K, sy * y / K
                else: X, Y = (tx + sx * x + x0 - P) / K, (ty + sy * y + y0 - P) / K
                o.append('%.2f %.2f' % (X, Y)); pair = []
        out.append(' '.join(o))
    return ' '.join(out), [(x0 - P) / K, (y0 - P) / K, (x1 - P) / K, (y1 - P) / K]


parts = []
for i, s in enumerate(objs):
    m = lab[s] == i + 1
    area = m.sum() / K / K
    if area < 2: continue
    y0, y1, x0, x1 = (s[0].start - P) / K, (s[0].stop - P) / K, (s[1].start - P) / K, (s[1].stop - P) / K
    parts.append({'i': i + 1, 'box': [x0, y0, x1, y1], 'area': area})


def group(p):
    x0, y0, x1, y1 = p['box']
    if y0 >= 140: return 'tw'
    if x0 >= 255 and y1 <= 60: return 'spark'
    if y1 <= 52: return 'the'
    if x0 >= 280: return 'glo'
    return 'smile'


for p in parts: p['g'] = group(p)
out = {'box': [0, 0, W, Hh], 'parts': []}
for g in ['the', 'smile', 'glo', 'spark', 'tw']:
    ps = sorted([p for p in parts if p['g'] == g], key=lambda p: (p['box'][0], p['box'][1]))
    if g == 'spark': ps = sorted(ps, key=lambda p: -p['area'])  # big star first
    for j, p in enumerate(ps):
        d, box = trace(lab == p['i'])
        out['parts'].append({'g': g, 'n': j, 'd': d, 'box': [round(v, 1) for v in box], 'area': round(p['area'], 1)})
    print(g, len(ps))
json.dump(out, open(D + 'logo.json', 'w'))
col = {'the': '#fff', 'smile': '#fff', 'glo': '#fff', 'spark': '#ffd', 'tw': '#ccc'}
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 460 182" width="1380" height="546"><rect x="-10" y="-10" width="460" height="182" fill="#000"/>' + ''.join(
    f'<path d="{p["d"]}" fill="{col[p["g"]]}" fill-rule="evenodd"/>' for p in out['parts']) + '</svg>'
open(D + '../logo-preview.svg', 'w').write(svg)
