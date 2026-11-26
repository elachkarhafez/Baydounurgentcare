"""Trace the Zu & Co logo (Google listing photo of their logo card, 3000px fetch) into SVG parts.
Each connected component is its own part: 4 diamond facets + Z U & C O . ; facets are refit as straight polygons
(the mark is geometric; the source is an upscale so its edges are soft). Output: logo.json + preview.svg"""
import sys, json, subprocess, tempfile, re, os
import numpy as np, cv2
SRC, OUT = sys.argv[1], sys.argv[2]
g = cv2.imread(SRC, cv2.IMREAD_GRAYSCALE).astype(np.float32)
g = cv2.GaussianBlur(g, (0, 0), 1.2)
ink = (g > 128).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(ink)
comps = [i for i in range(1, n) if st[i][4] > 300]
tmp = tempfile.mkdtemp()
def potrace(mask, x0, y0):
    Image = None
    h, w = mask.shape
    pbm = tmp + '/c.pbm'
    with open(pbm, 'wb') as f:
        f.write(b'P4\n%d %d\n' % (w, h))
        f.write(np.packbits(mask.astype(np.uint8), axis=1).tobytes())
    subprocess.run(['potrace', pbm, '-s', '-a', '1.0', '-O', '0.4', '-t', '20', '-o', tmp + '/c.svg'], check=True)
    s = open(tmp + '/c.svg').read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', s).groups())
    out = []
    for d in re.findall(r'<path d="([^"]+)"', s):
        toks = re.findall(r'[a-zA-Z]|-?[\d.]+', d); o = []; pair = []; cmd = None
        for t in toks:
            if t.isalpha(): cmd = t; o.append(t); pair = []; continue
            pair.append(float(t))
            if len(pair) == 2:
                x, y = pair
                if cmd.islower(): X, Y = sx * x, sy * y
                else: X, Y = tx + sx * x + x0, ty + sy * y + y0
                o.append('%.1f %.1f' % (X, Y)); pair = []
        out.append(' '.join(o))
    return ' '.join(out)
parts = []
for i in comps:
    x, y, w, h, a = st[i]
    parts.append({'i': i, 'box': [int(x), int(y), int(x + w), int(y + h)], 'area': int(a)})
# mark = parts above the text line
texttop = max(p['box'][1] for p in parts)  # the period is lowest-top? use biggest gap instead
ys = sorted(set(p['box'][1] for p in parts))
textY = min(p['box'][1] for p in parts if p['box'][3] - p['box'][1] > 150 and p['box'][3] > 0.6 * g.shape[0]) if False else None
cy = lambda p: (p['box'][1] + p['box'][3]) / 2
allc = sorted(parts, key=cy)
# split by the largest vertical gap between the mark and the letters
mark_bottom = None
letters = [p for p in parts if p['box'][1] > 1600]
mark = [p for p in parts if p['box'][3] <= 1600]
mark.sort(key=lambda p: (p['box'][1], p['box'][0]))
letters.sort(key=lambda p: p['box'][0])
print('mark', [p['box'] for p in mark]); print('letters', [p['box'] for p in letters])
res = {'parts': []}
names = ['top', 'left', 'right', 'bottom']
# facets: order by top then left
for k, p in enumerate(mark):
    m = (lab == p['i']).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    eps = 0.006 * cv2.arcLength(c, True)
    poly = cv2.approxPolyDP(c, eps, True)[:, 0, :]
    d = 'M' + ' L'.join('%.1f %.1f' % (px + .5, py + .5) for px, py in poly) + ' Z'
    res['parts'].append({'g': 'mark', 'id': 'f' + str(k), 'd': d, 'box': p['box'], 'pts': len(poly)})
for k, (p, ch) in enumerate(zip(letters, ['Z', 'U', 'amp', 'C', 'O', 'dot'])):
    x0, y0, x1, y1 = p['box']
    m = (lab[y0 - 4:y1 + 4, x0 - 4:x1 + 4] == p['i'])
    d = potrace(m, x0 - 4, y0 - 4)
    res['parts'].append({'g': 'word', 'id': ch, 'd': d, 'box': p['box']})
allb = np.array([p['box'] for p in res['parts']])
res['vb'] = [int(allb[:, 0].min()), int(allb[:, 1].min()), int(allb[:, 2].max() - allb[:, 0].min()), int(allb[:, 3].max() - allb[:, 1].min())]
json.dump(res, open(OUT + '/logo.json', 'w'))
vb = res['vb']
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="900"><rect x="%d" y="%d" width="%d" height="%d" fill="#111"/>' % (vb[0] - 40, vb[1] - 40, vb[2] + 80, vb[3] + 80, vb[0] - 40, vb[1] - 40, vb[2] + 80, vb[3] + 80)
svg += ''.join('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (p['d'], '#fff' if p['g'] == 'word' else ['#fff', '#f6d', '#6df', '#fd6'][int(p['id'][1])]) for p in res['parts']) + '</svg>'
open(OUT + '/preview.svg', 'w').write(svg)
print(res['vb'], [p.get('pts') for p in res['parts']])
