"""Traces the Al Jawad logo into SVG paths for the LED sign (writes logo.json next to this file).
Source: srcimg/logo-kinshasa-app-icon-512.png, the 512px app icon of their official Al Jawad Kinshasa menu
(menu.omegasoftware.ca/aljawadkinshasa), the cleanest copy of the logo public online (the IG avatar is 150px).
It is the same lockup as the one printed on their mint to-go bowls and the end cards of their reels.

Run with a PIL/numpy/scipy python:  /usr/bin/python3 -I trace.py
1. Upscale 8x (Lanczos), threshold at half ink (the ink is #1c4d5c on white).
2. Label connected components and group them: the arch-shaped mark (arch ring, the upper and lower strokes
   of the jeem, the diamond dot), AL, JAWAD (5 letters), the Arabic word, EST 1992.
3. Potrace each component on its own (alphamax 1.0, opttolerance 0.2) so every piece can light separately.
Coordinates are in the 512 icon's pixel space."""
import os, json, subprocess, tempfile, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
K = 8
im = Image.open(D + '../srcimg/logo-kinshasa-app-icon-512.png').convert('L')
big = np.asarray(im.resize((512 * K, 512 * K), Image.LANCZOS)).astype(float)
ink = nd.gaussian_filter(big, K * .2) < 165
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
    tr = re.search(r'transform="translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)"', s)
    tx, ty, sx, sy = map(float, tr.groups())
    paths = re.findall(r'<path d="([^"]+)"', s)
    # potrace coords: x' = tx + sx*x, y' = ty + sy*y, in sub pixels -> add offset, divide by K
    out = []
    for d in paths:
        toks = re.findall(r'[a-zA-Z]|-?[\d.]+', d)
        res, i, cmd, rel = [], 0, None, False
        nums = []
        for t in toks:
            if re.match(r'[a-zA-Z]', t):
                res.append(t); cmd = t
            else:
                res.append(t)
        # rescale numbers pairwise; relative commands get scale only, absolute get translate
        o, pair, cmd = [], [], None
        for t in res:
            if re.match(r'[a-zA-Z]', t):
                cmd = t; o.append(t); pair = []
                continue
            pair.append(float(t))
            if len(pair) == 2:
                x, y = pair
                if cmd.islower():
                    X, Y = sx * x / K, sy * y / K
                else:
                    X, Y = (tx + sx * x + x0) / K, (ty + sy * y + y0) / K
                o.append('%.2f %.2f' % (X, Y)); pair = []
        out.append(' '.join(o).replace(' -', ' -'))
    return ' '.join(out), [x0 / K, y0 / K, x1 / K, y1 / K]

parts = []
for i, s in enumerate(objs):
    m = lab[s] == i + 1
    area = m.sum() / K / K
    if area < 3: continue
    y0, y1, x0, x1 = s[0].start / K, s[0].stop / K, s[1].start / K, s[1].stop / K
    parts.append({'i': i + 1, 'box': [x0, y0, x1, y1], 'area': area})
H = lambda p: p['box'][3] - p['box'][1]
for p in parts:
    x0, y0, x1, y1 = p['box']; cy = (y0 + y1) / 2
    if cy < 250: g = 'mark'
    elif cy < 315: g = 'jawad'
    elif cy < 395: g = 'ar'
    else: g = 'est'
    p['g'] = g
mh = max(H(p) for p in parts if p['g'] == 'jawad')
for p in parts:
    if p['g'] == 'jawad' and H(p) < .6 * mh: p['g'] = 'al'
out = {'box': [0, 0, 512, 512], 'parts': []}
for g in ['mark', 'al', 'jawad', 'ar', 'est']:
    ps = sorted([p for p in parts if p['g'] == g], key=lambda p: p['box'][0])
    if g == 'ar': ps = ps[::-1]  # right to left
    for j, p in enumerate(ps):
        d, box = trace(lab == p['i'])
        out['parts'].append({'g': g, 'n': j, 'd': d, 'box': [round(v, 1) for v in box], 'area': round(p['area'], 1)})
    print(g, len(ps), [round(p['area']) for p in ps])
json.dump(out, open(D + 'logo.json', 'w'))
# preview
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 80 312 340" width="936" height="1020"><rect x="0" y="0" width="512" height="512" fill="#033246"/>' + ''.join(
    f'<path d="{p["d"]}" fill="{ {"mark":"#81d6a9","al":"#fff","jawad":"#fff","ar":"#e58089","est":"#81d6a9"}[p["g"]] }" fill-rule="evenodd"/>' for p in out['parts']) + '</svg>'
open(D + '../logo-preview.svg', 'w').write(svg)
