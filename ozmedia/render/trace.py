"""Trace the Oz Media logo into separate SVG parts.
Usage: python3 -I trace.py   (cv2, numpy, potrace CLI). Writes parts.json + debug.png next to this file.

Sources (all public, theirs):
  src/oz-avatar-900.jpg   the OZ mark, 900px YouTube channel avatar (black on white), the largest clean copy
  src/oz-merch.png        the stacked OZ / MEDIA lockup printed on their store tee (ozmedia313.com/store), for MEDIA
Parts: O and Z (the mark split where the Z's bar crosses the O). MEDIA: media_trace.py.
The O and Z touch, so the O is rebuilt as the band between two fitted ellipses wherever the Z covers it,
and the Z inside the O band is rebuilt from straight edge lines fitted on the parts of its strokes outside the O.
Coordinates: mark in a 1000x1000 box (avatar 900 -> x1000/900).
"""
import os, re, json, subprocess, tempfile
import cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
S = 4  # supersample factor for tracing

def load_mask(path, up, thr=128, inv=True, blur=1.2):
    g = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if g.ndim == 3 and g.shape[2] == 4:
        a = g[:, :, 3:4] / 255.0
        g = (g[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    if g.ndim == 3: g = cv2.cvtColor(g, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    if blur: g = cv2.GaussianBlur(g, (0, 0), blur * up / 2)
    return (g < thr) if inv else (g > thr)

def trace(mask, k, turd=4, alpha='1.0', opt='0.3'):
    """potrace one boolean mask; k scales mask px -> output units."""
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(turd), '-a', alpha, '-O', opt, '-o', svg, pbm], check=True)
        t = open(svg).read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', t).groups())
    out = []
    for d in re.findall(r' d="([^"]+)"', t):
        toks = re.findall(r'[MmLlCcZz]|-?\d+(?:\.\d+)?', d)
        res, cmd, nums = [], None, []
        def flush():
            if cmd is None: return
            if cmd == 'M':
                pts = [f'{(tx + sx * nums[j]) * k:.1f} {(ty + sy * nums[j + 1]) * k:.1f}' for j in range(0, len(nums), 2)]
            else:
                pts = [f'{sx * nums[j] * k:.1f} {sy * nums[j + 1] * k:.1f}' for j in range(0, len(nums), 2)]
            res.append(cmd + ' '.join(pts))
        for tk in toks:
            if tk in 'MmLlCcZz':
                flush(); cmd, nums = tk, []
                if tk in 'Zz': res.append('z'); cmd = None
            else: nums.append(float(tk))
        flush()
        out.append(''.join(res))
    return re.sub(r'(?<=\d)\.0(?=[ a-zA-Z-]|$)', '', ''.join(out)).replace(' -', '-')

def largest(m, n=1):
    num, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    idx = np.argsort(-st[1:, cv2.CC_STAT_AREA])[:n] + 1
    return [lab == i for i in idx], st

# ---------------- the OZ mark ----------------
U = 1000 / 900 * S                       # avatar px -> supersampled mark px (mark box 1000 units, S px per unit)
mark = load_mask(os.path.join(HERE, 'src/oz-avatar-900.jpg'), U, blur=2.4)
H, W = mark.shape
mark = largest(mark)[0][0]
A = lambda v: v * U                      # avatar px -> mask px
yy, xx = np.mgrid[0:H, 0:W]

# Z zone: where the Z's strokes are (measured on the avatar). Bar y 345..392 from x 295 to 695, diagonal from the bar's
# right end down to the bottom bar's left end, bottom bar y 795..855.
cs, hier = cv2.findContours(mark.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
outer = max([c for i, c in enumerate(cs) if hier[0][i][3] < 0], key=cv2.contourArea)[:, 0, :].astype(float)
holes = [c[:, 0, :].astype(float) for i, c in enumerate(cs) if hier[0][i][3] >= 0]
# O outer edge: the union's outer contour above the Z bar or left of the Z's beak
po = outer[(outer[:, 1] < A(335)) | ((outer[:, 0] < A(260)) & (outer[:, 1] < A(540)))]
eo = cv2.fitEllipse(po.astype(np.float32))
# O inner edge: hole boundary above the bar, plus the lower-left hole edge left of the Z beak
hp = np.concatenate(holes)
pi = hp[(hp[:, 1] < A(338)) | ((hp[:, 0] < A(285)) & (hp[:, 1] < A(500)))]
ei = cv2.fitEllipse(pi.astype(np.float32))
def ell_mask(e, grow=0):
    m = np.zeros((H, W), np.uint8)
    (cx, cy), (w, h), ang = e
    cv2.ellipse(m, ((cx, cy), (w + 2 * grow, h + 2 * grow), ang), 1, -1)
    return m.astype(bool)
ring = ell_mask(eo) & ~ell_mask(ei)

# Z strokes as straight-edged polygons, fitted on the mask where each stroke stands alone (outside the O).
u = lambda v: v * S                      # mark units -> mask px
def fit(xs, ys):
    k_, b_ = np.polyfit(xs, ys, 1); return k_, b_
# bar: column scans. Top edge from columns inside the hole and right of the O; bottom edge only inside the hole
tops, bots = [], []
for x in list(range(int(u(400)), int(u(540)), S)) + list(range(int(u(665)), int(u(745)), S)):
    col = np.nonzero(mark[int(u(385)):int(u(455)), x])[0]
    if len(col):
        tops.append((x, col.min() + u(385)))
        if x < u(545): bots.append((x, col.max() + u(385)))
tops, bots = np.array(tops), np.array(bots)
bt = fit(tops[:, 0], tops[:, 1]); bb = fit(bots[:, 0], bots[:, 1])
# diagonal: row scans below the O, taking the run nearest the expected centre line
L, R = [], []
for y in range(int(u(620)), int(u(840)), S):
    row = mark[y].astype(np.int8); d = np.diff(np.r_[0, row, 0]); st_, en_ = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    c0 = u(575 + (y / S - 620) * (420 - 575) / 220)
    j = np.argmin(np.abs((st_ + en_) / 2 - c0)); L.append((y, st_[j])); R.append((y, en_[j]))
L, R = np.array(L), np.array(R)
dl = fit(L[:, 0], L[:, 1]); dr = fit(R[:, 0], R[:, 1])     # x as a function of y
bx = lambda line, x: line[0] * x + line[1]
dx = lambda line, y: line[0] * y + line[1]
bar = np.array([[u(280), bx(bt, u(280))], [u(800), bx(bt, u(800))], [u(800), bx(bb, u(800))], [u(280), bx(bb, u(280))]])
y0d = bx(bt, u(700))
diag = np.array([[dx(dl, y0d), y0d], [dx(dr, y0d), y0d], [dx(dr, u(960)), u(960)], [dx(dl, u(960)), u(960)]])
def poly_mask(p):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(p).astype(np.int32)], 1); return m.astype(bool)
zs = poly_mask(bar) | poly_mask(diag)
band = ell_mask(eo, u(4)) & ~ell_mask(ei, -u(4))
zone = cv2.dilate(zs.astype(np.uint8), np.ones((int(u(10)), int(u(10))), np.uint8)).astype(bool)
O = (mark & band & ~zone) | (ring & zone)
O = largest(O)[0][0]
Z = (mark & ~O) | (zs & mark) | (zs & ring)
k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(u(5)), int(u(5))))
Z = cv2.morphologyEx(Z.astype(np.uint8), cv2.MORPH_OPEN, k3).astype(bool)
Z = largest(Z)[0][0]
meta = {'eo': [float(v) for v in (*eo[0], *eo[1], eo[2])], 'ei': [float(v) for v in (*ei[0], *ei[1], ei[2])]}
print('bar lines', bt, bb, 'diag', dl, dr)
parts = {'O': O, 'Z': Z}

# MEDIA is hand-traced in media_trace.py (the only clean copy is ~110 px wide, too small for potrace)

res = {}
k = 1 / S
for n, m in parts.items():
    ys, xs = np.nonzero(m)
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 3) > .5
    res[n] = {'d': trace(m, k, turd=60, alpha='1.0', opt='0.8'), 'box': [round(xs.min() * k, 1), round(ys.min() * k, 1), round(xs.max() * k, 1), round(ys.max() * k, 1)]}
res['_meta'] = meta
json.dump(res, open(os.path.join(HERE, 'parts.json'), 'w'))
dbg = np.full((H, W, 3), 255, np.uint8)
dbg[O] = (200, 120, 40); dbg[Z] = (40, 40, 220); dbg[O & Z] = (160, 0, 160)
cv2.polylines(dbg, [np.round(bar).astype(np.int32), np.round(diag).astype(np.int32)], True, (0, 160, 0), 3)
cv2.ellipse(dbg, eo, (0,200,0), 2); cv2.ellipse(dbg, ei, (0,200,0), 2)
cv2.imwrite(os.path.join(HERE, 'debug.png'), cv2.resize(dbg, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA))
print({k2: len(v['d']) for k2, v in res.items() if k2 != '_meta'})
