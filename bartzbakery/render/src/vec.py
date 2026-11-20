# traces the Bartz logo into grouped SVG paths: leaves (bottom-up per side), BARTZ, BAKERY, FINE BAKED GOODS, Since 1948
import numpy as np, subprocess, re, json, os, sys, tempfile
from PIL import Image
from scipy import ndimage
src = sys.argv[1]; out = sys.argv[2]
a = np.array(Image.open(src).convert('RGB').resize((1600, 1600), Image.LANCZOS)).astype(float)
ink = a.min(-1) < 200
lab, n = ndimage.label(ink); objs = ndimage.find_objects(lab)
tmp = tempfile.mkdtemp()
def trace(mask):
    Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '4', '-a', '1', '-O', '0.3', '--flat', '-o', tmp + '/m.svg'], check=True)
    s = open(tmp + '/m.svg').read()
    return {'t': re.search(r'<g transform="([^"]+)"', s).group(1), 'd': ' '.join(re.findall(r' d="([^"]+)"', s))}
G = {'bartz': [], 'bakery': [], 'fine': [], 'since': [], 'leafL': [], 'leafR': []}
col = {}
for i, o in enumerate(objs):
    m = lab[o] == i + 1
    if m.sum() < 40: continue
    y0, y1, x0, x1 = o[0].start / 2, o[0].stop / 2, o[1].start / 2, o[1].stop / 2
    cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
    if cy < 270 and 230 < cx < 570: k = 'bartz'
    elif 300 < cy < 485 and 120 < x0 and x1 < 690: k = 'bakery'
    elif 485 < cy < 530 and 180 < cx < 620: k = 'fine'
    elif 530 < cy < 625 and 300 < cx < 500: k = 'since'
    else: k = 'leafL' if cx < 400 else 'leafR'
    G[k].append((cx, cy, i + 1))
    col[k] = col.get(k, []) + [np.median(a[o][m], 0)]
res = {}
for k, v in G.items():
    if k in ('bartz', 'bakery'): v.sort()
    elif k.startswith('leaf'): v.sort(key=lambda t: -t[1])
    if k == 'since':
        big = max(v, key=lambda t: (lab == t[2]).sum())
        res['oval'] = [trace(lab == big[2])]
        res[k] = [trace(np.isin(lab, [t[2] for t in v if t is not big]))]
    elif k == 'fine':
        res[k] = [trace(np.isin(lab, [t[2] for t in v]))]
    else:
        res[k] = [trace(lab == t[2]) for t in v]
    print(k, len(v), np.median(np.array(col[k]), 0).astype(int))
json.dump(res, open(out, 'w'))
