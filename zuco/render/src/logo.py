"""Clean up the traced Zu & Co logo (see trace.py) into the sign data the page uses.
Source: their logo card on their Google listing (photo ThvP952-o-u, fetched at 3000px through atly.com's public
listing image proxy), traced with potrace per connected component. The diamond is geometric, so its four facets
are rebuilt as exact polygons from the traced corners (the source is an upscale with soft edges); the letters
ZU & CO. keep their potrace outlines. Everything is shifted so the viewBox starts at 0,0.
usage: /usr/bin/python3 -I logo.py <traced logo.json> <out logo.json>"""
import sys, json, re
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
X0, Y0 = 934 - 20, 1069 - 20  # 20px margin round the lockup
W, H = 1133 + 40, 791 + 40
# diamond: |x-1500| + |y-1327| <= 258, cut by two horizontals and one diagonal pair (traced corners)
FACETS = {
    'f0': [(1406, 1163), (1500, 1069), (1594, 1163)],                 # top cap
    'f1': [(1369, 1200), (1616, 1200), (1346, 1430), (1242, 1327)],   # left band
    'f2': [(1758, 1327), (1652, 1223), (1383, 1452), (1633, 1452)],   # right band
    'f3': [(1406, 1491), (1594, 1491), (1500, 1585)],                 # bottom cap
}
def shift_path(p):
    toks = re.findall(r'[a-zA-Z]|-?[\d.]+', p); o = []; pair = []; cmd = None
    for t in toks:
        if t.isalpha(): cmd = t; o.append(t); pair = []; continue
        pair.append(float(t))
        if len(pair) == 2:
            x, y = pair
            if cmd.isupper(): x, y = x - X0, y - Y0
            o.append('%g %g' % (round(x, 1), round(y, 1))); pair = []
    return ' '.join(o)
parts = []
for k, pts in FACETS.items():
    pp = [(x - X0, y - Y0) for x, y in pts]
    xs = [p[0] for p in pp]; ys = [p[1] for p in pp]
    parts.append({'id': k, 'g': 'mark', 'd': 'M' + ' L'.join('%d %d' % p for p in pp) + ' Z', 'pts': pp,
                  'box': [min(xs), min(ys), max(xs), max(ys)]})
for p in d['parts']:
    if p['g'] != 'word': continue
    b = p['box']
    parts.append({'id': p['id'], 'g': 'word', 'd': shift_path(p['d']), 'box': [b[0] - X0, b[1] - Y0, b[2] - X0, b[3] - Y0]})
json.dump({'vb': [0, 0, W, H], 'parts': parts}, open(out, 'w'), separators=(',', ':'))
print(W, H, len(parts))
