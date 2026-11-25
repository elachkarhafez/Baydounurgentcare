"""Traces the Rawan Sweets logo off the front of their dessert cart (the gold mirror acrylic sign: RS monogram with the
heart swash, RAWAN, SWEETS, the rules and the little heart).
Source: their reel https://www.instagram.com/p/DgJXFZoTRYn/ (Fordson High School Thanksgiving), 720x1280, 20.3-21.2 s.
The aligned keyframes were averaged and rectified with a homography off the panel's four brass standoffs
(srcimg/cart-sign-rect.png, 2170x1600, standoffs at y 300 / 1300).
The top half of the letters reflects dark olive and the bottom half bright gold, so the ink is the max of
 (a) red-minus-blue goldness, edge-sharpened by a guided filter on luminance, and
 (b) darkness against the local white of the acrylic.
Run with a PIL/numpy/opencv python:  python3 -I trace.py   (writes logo.json next to this file)."""
import cv2, numpy as np, subprocess, re, json, os, tempfile
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()
r = cv2.imread(D + '../srcimg/cart-sign-rect.png').astype(np.float32) / 255
lum = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY)
gold = np.clip((r[:, :, 2] - r[:, :, 0] - 0.12) / 0.25, 0, 1)
def gf(I, p, rad, eps):
    bf = lambda x: cv2.boxFilter(x, -1, (2 * rad + 1, 2 * rad + 1))
    mI, mp = bf(I), bf(p); a = (bf(I * p) - mI * mp) / (bf(I * I) - mI * mI + eps); b = mp - a * mI
    return bf(a) * I + bf(b)
q = gf(lum, gold, 6, 1e-3)
bg = cv2.GaussianBlur(cv2.dilate(lum, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))), (0, 0), 25)
dark = np.clip(((bg - lum) / np.maximum(bg, 1e-3) - 0.08) / 0.15, 0, 1)
score = np.maximum(q, dark)[255:1395, 40:2150]
K = 2
up = cv2.GaussianBlur(cv2.resize(score, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC), (0, 0), 2.6)
m = (up > 0.52).astype(np.uint8)
H, W = m.shape
yy, xx = np.mgrid[0:H, 0:W] / K           # rect-crop units
# cuts where the acrylic pieces touch or the blur bridged them (measured on the photo)
m[(yy > 466) & (yy < 483) & (xx > 880) & (xx < 1300)] = 0    # RS swash above the W serifs
m[(yy > 1123)] = 0                                            # panel border under the small heart
m[(xx < 60) | (xx > 2070)] = 0                                # standoffs
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
parts = []
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a < 1500: continue
    parts.append((i, x / K, y / K, w / K, h / K))
def comp_at(px, py):
    return lab == lab[int(py * K), int(px * K)]
# heart under SWEETS: rows above the border, plus its tip rebuilt as the two straight sides meeting at 1050,1141
hb = (lab > 0) & (xx > 960) & (xx < 1150) & (yy > 1000)
tri = np.zeros_like(m); pts = (np.array([[985, 1095], [1050, 1141], [1118, 1092], [1050, 1060]]) * K).astype(np.int32)
cv2.fillPoly(tri, [pts], 1)
heart = (hb | (tri > 0)) & (yy < 1142)
heart = cv2.erode(heart.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0   # the photo's dark edge bloats it ~2 px
mono = comp_at(1100, 300); mono = mono & ~((yy > 380) & (xx > 905) & (xx < 960 + (yy - 380) * 40 / 78))   # the shadow under the R's leg, left of its edge
mono_h = mono & (xx > 1290) & (yy < 405); mono_b = mono & ~mono_h
wp = [p for p in parts if 880 < p[1] + p[3] / 2 < 1200 and p[2] > 470 and p[4] > 250]; assert len(wp) == 1, wp
Wl = lab == wp[0][0]
row = np.isin(lab, [p[0] for p in parts if 440 < p[2] < 520 and p[4] > 250 and p[0] != wp[0][0]])
R = row & (xx < 560); A1 = row & (xx >= 560) & (xx < 1000); A2 = row & (xx >= 1000) & (xx < 1590); N = row & (xx >= 1590)
sweets = sorted([p for p in parts if 850 < p[2] + p[4] / 2 < 960 and p[4] > 100], key=lambda p: p[1])
rules = sorted([p for p in parts if p[4] < 40], key=lambda p: (p[2], p[1]))
assert len(sweets) == 6, sweets
assert len(rules) == 4, rules
allm = (lab > 0) & ~hb | heart
ys, xs = np.nonzero(allm)
OX, OY = xs.min() / K, ys.min() / K
BW, BH = (xs.max() - xs.min()) / K, (ys.max() - ys.min()) / K

def conv(dstr, Hh):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 / K - OX if idx % 2 == 0 else (Hh - v * .1) / K - OY
        else: v = v * .1 / K if idx % 2 == 0 else -v * .1 / K
        out.append('%.1f' % v); idx += 1
    s = ' '.join(out); s = re.sub(r' (?=-)', '', s)
    for c in 'MmCcLlZz': s = s.replace(' ' + c, c).replace(c + ' ', c)
    return s
def trace(mask):
    cv2.imwrite(tmp + '/m.pbm', ((~mask.astype(bool)) * 255).astype(np.uint8))
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '12', '-a', '1.2', '-O', '0.8', '--flat', '-o', tmp + '/m.svg'], check=True)
    return conv(' '.join(re.findall(r' d="([^"]+)"', open(tmp + '/m.svg').read())), mask.shape[0])
def bb(mask):
    ys, xs = np.nonzero(mask); return [round(xs.min() / K - OX), round(ys.min() / K - OY), round(xs.max() / K - OX), round(ys.max() / K - OY)]
res = {'box': [0, 0, round(BW), round(BH)], 'parts': {}}
named = [('mono', mono_b), ('heart1', mono_h), ('R', R), ('A1', A1), ('W', Wl), ('A2', A2), ('N', N)]
named += [('s%d' % k, lab == p[0]) for k, p in enumerate(sweets)]
named += [('rule%d' % k, lab == p[0]) for k, p in enumerate(rules)]
named += [('heart2', heart)]
E = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
def clean(mk, sym=False):
    mk = mk.astype(np.uint8)
    if sym:   # the small heart is cut symmetric: average it with its mirror about its own centre
        ys, xs = np.nonzero(mk); x0, x1 = xs.min(), xs.max()
        f = mk.astype(np.float32); f[:, x0:x1 + 1] = (f[:, x0:x1 + 1] + f[:, x0:x1 + 1][:, ::-1]) / 2
        mk = (cv2.GaussianBlur(f, (0, 0), 3) > .5).astype(np.uint8)
    mk = cv2.morphologyEx(cv2.morphologyEx(mk, cv2.MORPH_OPEN, E), cv2.MORPH_CLOSE, E)
    n, lb, st, _ = cv2.connectedComponentsWithStats(mk, 8)   # drop crumbs the opening leaves behind
    keep = [i for i in range(1, n) if st[i][4] > 600]
    mk = np.isin(lb, keep).astype(np.uint8)
    inv = 1 - mk; n, lb, st, _ = cv2.connectedComponentsWithStats(inv, 4)   # fill pin holes from the gold leaf texture
    for i in range(1, n):
        if st[i][4] < 1200: mk[lb == i] = 1
    return mk > 0
for k, mk in named:
    mk = clean(mk, k == 'heart2')
    res['parts'][k] = {'d': trace(mk), 'bb': bb(mk)}
# the little heart under SWEETS is a plain cut heart; the photo's edge is too soft to trace, so it is redrawn in its traced box
x0, y0, x1, y1 = res['parts']['heart2']['bb']; w, h = x1 - x0, y1 - y0; cx = (x0 + x1) / 2
res['parts']['heart2']['d'] = ('M%.1f %.1fC%.1f %.1f %.1f %.1f %.1f %.1fC%.1f %.1f %.1f %.1f %.1f %.1fC%.1f %.1f %.1f %.1f %.1f %.1fC%.1f %.1f %.1f %.1f %.1f %.1fZ' % (
    cx, y0 + h * .24, cx - w * .08, y0 - h * .02, x0 - w * .02, y0 + h * .02, x0, y0 + h * .3,
    x0 + w * .02, y0 + h * .56, cx - w * .3, y0 + h * .74, cx, y0 + h,
    cx + w * .3, y0 + h * .74, x1 - w * .02, y0 + h * .56, x1, y0 + h * .3,
    x1 + w * .02, y0 + h * .02, cx + w * .08, y0 - h * .02, cx, y0 + h * .24))
json.dump(res, open(D + 'logo.json', 'w'))
cv2.imwrite(tmp + '/all.png', allm.astype(np.uint8) * 255)
print(res['box'], {k: v['bb'] for k, v in res['parts'].items()}, os.path.getsize(D + 'logo.json'))
