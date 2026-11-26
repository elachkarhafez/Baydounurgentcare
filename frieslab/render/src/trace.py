"""Traces The Fries Lab logo into SVG paths, one path per part, so the sign can power on piece by piece.
Source: the logo on their 'Beat The Heat' post (https://www.instagram.com/p/Bh6Syh9lrNI/), cropped to
srcimg/poster-logo.png (200x225 px of the 1080 px post, logo on their navy poster panel). It is the largest copy of
the logo we could find; the profile picture (post1.jpg) is the same artwork at 150 px.
Each pixel is classed to the nearest logo colour (sampled by k-means off the same crop), each class is upscaled,
smoothed and cut into connected parts, and each part goes through potrace.
Run:  python3 -I trace.py   (writes logo.json and logo-preview.svg next to this file)."""
import cv2, numpy as np, subprocess, re, json, os, tempfile
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()
src = cv2.imread(D + '../srcimg/poster-logo.png')
K = 8
lab = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)
# logo colours (RGB) sampled with k-means on the crop
C = {
    'bg': (20, 21, 34), 'black': (8, 8, 10), 'yellow': (237, 232, 27), 'shade': (177, 167, 21), 'green': (10, 185, 83),
    'red': (207, 33, 49), 'white': (239, 245, 245), 'brown': (113, 66, 48),
}
names = list(C)
cl = np.array([cv2.cvtColor(np.uint8([[c[::-1]]]), cv2.COLOR_BGR2LAB)[0, 0] for c in C.values()], np.float32)
d = ((lab[:, :, None, :] - cl[None, None]) ** 2).sum(-1)
# soft membership per colour at source resolution, then upsampled: smooth edges instead of stair-stepped classes
pr = np.exp(-(d - d.min(-1, keepdims=True)) / 900.0); pr /= pr.sum(-1, keepdims=True)
P = [cv2.resize(pr[:, :, i].astype(np.float32), None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC) for i in range(len(names))]
H, W = P[0].shape
yy, xx = np.mgrid[0:H, 0:W] / K


def m_of(*ks):
    return np.clip(sum(P[names.index(k)] for k in ks), 0, 1).astype(np.float32)


def smooth(m, s=2.2, t=.5):
    return (cv2.GaussianBlur(m, (0, 0), s) > t).astype(np.uint8)


def conv(dstr, Hh):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 / K if idx % 2 == 0 else (Hh - v * .1) / K
        else: v = v * .1 / K if idx % 2 == 0 else -v * .1 / K
        out.append('%.2f' % v); idx += 1
    s = ' '.join(out); s = re.sub(r' (?=-)', '', s)
    for c in 'MmCcLlZz': s = s.replace(' ' + c, c).replace(c + ' ', c)
    return s


def trace(mask, t=20):
    cv2.imwrite(tmp + '/m.pbm', ((1 - mask.astype(bool)) * 255).astype(np.uint8))
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', str(t), '-a', '1.1', '-O', '1.0', '--flat', '-o', tmp + '/m.svg'], check=True)
    return conv(' '.join(re.findall(r' d="([^"]+)"', open(tmp + '/m.svg').read())), mask.shape[0])


def comps(mask, amin):
    n, lb, st, cen = cv2.connectedComponentsWithStats(mask, 8)
    return [(lb == i, st[i], cen[i] / K) for i in range(1, n) if st[i][4] >= amin]


def bb(mask):
    ys, xs = np.nonzero(mask); return [round(xs.min() / K, 1), round(ys.min() / K, 1), round(xs.max() / K, 1), round(ys.max() / K, 1)]


parts = []
def clean(mask, hole=5):
    mask = mask.astype(np.uint8)
    inv = 1 - mask
    n, lb, st, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n):
        if st[i][4] < hole * K * K: mask[lb == i] = 1
    n, lb, st, _ = cv2.connectedComponentsWithStats(mask, 8)
    for i in range(1, n):
        if st[i][4] < hole * K * K: mask[lb == i] = 0
    return mask


def add(name, kind, color, mask, t=20, order=0, hole=5):
    mask = clean(mask, hole)
    sig = {'letter': 3.2, 'plate': 1, 'stick': 4.5, 'shade': 4, 'panel': 4.5, 'tube': 4}[kind]   # iron out the JPEG wobble
    mask = (cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sig) > .5).astype(np.uint8)
    if mask.sum() < 30: return
    parts.append({'id': name, 'kind': kind, 'color': color, 'd': trace(mask, t), 'bb': bb(mask), 'order': order})

# regions measured on the crop (source px)
banner_box = (xx > 50) & (xx < 150) & (yy > 134) & (yy < 170)
oval_box = (xx > 62) & (xx < 140) & (yy > 170) & (yy < 203)
tag_box = (xx > 28) & (xx < 86) & (yy > 98) & (yy < 142)
tube_box = (xx > 147) & (yy > 108) & (yy < 150) & ~((yy > 132) & (xx < 152))
flask_box = (xx < 50) & (yy > 65) & (yy < 128)
steam_box = (xx < 62) & (yy < 70)

yel = smooth(m_of('yellow'), 1.2)
shade = smooth(m_of('shade', 'yellow'), 1.2, .5)
red = smooth(m_of('red'), 1.2)
white = smooth(m_of('white'), 1.2)
green = smooth(m_of('green'), 1.5)

# --- steam (red wisps above the flask)
for i, (m, st, c) in enumerate(sorted(comps(red & steam_box, 200 * K), key=lambda x: x[2][0])):
    add('steam%d' % i, 'tube', 'red', m, order=0)
# --- flask on the left: red liquid + white glass
fl = red & flask_box
add('flaskLiquid', 'panel', 'red', fl, order=1)
fg = white & flask_box & ~tag_box
add('flaskGlass', 'tube', 'white', fg, order=1)
# --- fries: yellow sticks above the box rim (each stick its own part), plus the shaded sides
fry_zone = (yy < 105) & (xx > 40) & (xx < 165)
fr = comps(yel & fry_zone, 60 * K)
fr.sort(key=lambda x: x[2][0])
for i, (m, st, c) in enumerate(fr):
    add('fry%02d' % i, 'stick', 'yellow', m, 16, order=2)
add('fryShade', 'shade', 'shade', shade & fry_zone, 16, order=1.9)
# --- box: red stripes and white stripes outside the banner, oval, tag
boxz = (yy > 80) & ~((xx > 15) & (xx < 188) & (yy > 128) & (yy < 174)) & ~oval_box & ~tag_box & ~flask_box & ~tube_box
for i, (m, st, c) in enumerate(sorted(comps(red & boxz, 120 * K), key=lambda x: x[2][0])):
    add('boxRed%d' % i, 'panel', 'red', m, order=3)
for i, (m, st, c) in enumerate(sorted(comps(white & boxz, 120 * K), key=lambda x: x[2][0])):
    add('boxWhite%d' % i, 'panel', 'white', m, order=3)
# --- green banner (filled, with the FRIES letters cut out as holes so the letters read on their own)
gb = green & ((xx > 15) & (xx < 188) & (yy > 125) & (yy < 176))
gb = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
def filled(m):
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    f = np.zeros_like(m, np.uint8); cv2.drawContours(f, cs, -1, 1, -1); return f
add('banner', 'panel', 'green', filled(gb), order=4)   # solid board: the letters sit on top of it
# FRIES letters: yellow inside the banner
fl_letters = [c for c in comps(smooth(m_of('yellow', 'shade'), 1.4, .5) & banner_box, 40 * K) if c[1][3] > 15 * K]
fl_letters.sort(key=lambda x: x[2][0])
for i, (m, st, c) in enumerate(fl_letters):
    add('F%d' % i, 'letter', 'yellow', m, 14, order=5)
# THE letters: white inside the tag
th = [c for c in comps(white & tag_box & ~((xx < 38) & (yy < 108)), 12 * K) if c[1][2] < 22 * K and c[1][3] < 26 * K and c[2][0] > 30 and c[2][1] > 109]
th.sort(key=lambda x: x[2][0])
for i, (m, st, c) in enumerate(th):
    add('T%d' % i, 'letter', 'white', m, 14, order=6)
# THE tag plate: the rotated rectangle around the letters, padded
if th:
    allm = np.zeros_like(white)
    for m, _, _ in th: allm |= m.astype(np.uint8)
    pts = np.column_stack(np.nonzero(allm))[:, ::-1].astype(np.float32)
    (cx, cy), (w, h), a = cv2.minAreaRect(pts)
    pad = 4.5 * K
    box = cv2.boxPoints(((cx, cy), (w + 2 * pad, h + 2 * pad), a)).astype(np.int32)
    tag = np.zeros_like(white); cv2.fillPoly(tag, [box], 1)
    add('tag', 'plate', 'black', tag, order=5.9)
# LAB oval: yellow inside the oval box; letters are its holes
ov = yel & oval_box
ovf = ov.copy(); cnts, _ = cv2.findContours(ov, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
ovf = np.zeros_like(ov); cv2.drawContours(ovf, cnts, -1, 1, -1)
add('oval', 'panel', 'yellow', ovf, order=7)
cnt = max(cnts, key=cv2.contourArea); (ecx, ecy), (ew, eh), ea = cv2.fitEllipse(cnt)
inner = np.zeros_like(ov); cv2.ellipse(inner, ((101.5 * K, 187.5 * K), (65 * .88 * K, 23 * .78 * K), 0), 1, -1)   # the oval measured on the crop: 69-134 x 176-199
gray = cv2.GaussianBlur(cv2.resize(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC), (0, 0), 3)
holes = inner & (gray < 120).astype(np.uint8)
cv2.imwrite(tmp + '/holes.png', holes * 255); print('holes debug', tmp + '/holes.png', (ecx / K, ecy / K, ew / K, eh / K))
lab_l = comps(holes.astype(np.uint8), 15 * K)
lab_l.sort(key=lambda x: x[2][0])
for i, (m, st, c) in enumerate(lab_l):
    add('L%d' % i, 'letter', 'black', cv2.erode(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))), 14, order=7, hole=1.2)   # the photo's dark keyline makes them read ~1px bolder
# test tube on the right: yellow liquid + white glass
add('tubeLiquid', 'panel', 'yellow', yel & tube_box, order=8)
add('tubeGlass', 'tube', 'white', white & tube_box, order=8)

json.dump({'box': [0, 0, src.shape[1], src.shape[0]], 'parts': parts}, open(D + 'logo.json', 'w'))
COL = {'red': '#cf2131', 'white': '#eff5f5', 'yellow': '#ede81b', 'shade': '#b1a715', 'green': '#0ab953', 'black': '#08080a'}
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="800"><rect width="100%%" height="100%%" fill="#141522"/>' % (src.shape[1], src.shape[0])
for p in sorted(parts, key=lambda p: p['order']):
    svg += '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (p['d'], COL[p['color']])
open(D + 'logo-preview.svg', 'w').write(svg + '</svg>')
print(len(parts), 'parts:', ' '.join(p['id'] for p in parts))
