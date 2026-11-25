"""Traces the BRAVO channel-letter sign over their shopfront (srcimg/storefront-reel.png: a phone screenshot of
their reel "Sale Season is ON", 1290 x 2796, sent by the user) into clean SVG paths.
Run with a PIL/numpy/scipy/opencv python:  python -I trace_sign.py   (writes sign.json next to this file and
srcimg/sign-corrected.png, the de-skewed photo the trace is checked against)

1. De-skew. The sign was filmed from below-left: the baseline slopes at 0.155 and the stems lean (R stem -0.103).
   An affine warp maps the baseline direction to x and the stem direction to y (3x upsample).
2. Perspective. After step 1 the letters still shrink to the right (cap height B 218, R 214, O ~204 px): the
   cap line (B and R flat tops) and baseline converge. A homography maps that trapezoid to a rectangle
   (cap height 215), stretching x by the same local scale.
3. Threshold at half the glow ramp: blue-white letters at luminance > 135 (facade ~50, letter core ~240), the red V
   at R > 150, G < 95, R - G > 100. The glow halo sits outside that, so stroke widths stay true.
4. Clean geometry where the video wobbles, keeping the measured proportions:
   B  sheared upright (its stem leaned 0.07 from lens distortion at the frame edge) and smoothed; the cut where
      the lower bowl meets the stem foot is kept, it is in the letter itself (glow on both sides);
   R  smoothed, stem left edge snapped straight;
   A, V  straight-edged polygons fitted to the outline (A keeps its flat apex, V its overshoot past the cap);
   O  outer and inner ellipses fitted to the outline and set upright, centred on the measured bowl.
5. Potrace each letter; paths in output px (cap height 215) in a box starting at the B.
6. Sample colours: white core, blue-white glow, red V, black facade, gold LED strips.
7. SHOES: the sign's small white letters right of the O are cut off by the frame ("SH" visible: cap height about
   0.28 of BRAVO's, on the same baseline, a small gap after the O). Set in Montserrat ExtraBold, the closest of
   eleven free geometric sans tested against the traced B, R, A, O (it is also the font of their reel captions),
   converted to outlines. Pass the Montserrat 800 TTF path as argv[1] to (re)build it."""
import os, re, json, subprocess, tempfile
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()
im = np.asarray(Image.open(D + '../srcimg/storefront-reel.png').convert('RGB'))
K = 3
# 1. affine de-skew (warped px = K * source-aligned px)
d = np.array([1, .155]); d /= np.linalg.norm(d)
s = np.array([-.103, 1]); s /= np.linalg.norm(s)
o = np.array([30, 260.])
A = np.array([[d[0] / K, s[0] / K, o[0]], [d[1] / K, s[1] / K, o[1]]], np.float32)
W, H = 1260 * K, 440 * K
wp = cv2.warpAffine(im, A, (W, H), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_CUBIC)
# 2. homography from the B and R (flat tops, stem feet): their cap and baseline, extended to the O, define a
#    trapezoid that maps to a rectangle with cap height 215; local x scale = local y scale.
def masks(img):
    img = img.astype(float); R, G, B = img[..., 0], img[..., 1], img[..., 2]
    red = (R > 150) & (G < 95) & (R - G > 100)
    return (.3 * R + .59 * G + .11 * B > 135) & ~nd.binary_dilation(red, iterations=6), red
def comps(m, keep, sig=2.5):
    m = nd.gaussian_filter(m.astype(float), sig) > .5
    lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1))
    return sorted([lab == k for k in 1 + np.argsort(-sz)[:keep]], key=lambda q: np.nonzero(q)[1].min())
def capbase(m):
    xs = np.nonzero(m.any(0))[0]; x0, x1 = xs.min(), xs.max()
    cols = range(x0 + int(.05 * (x1 - x0)), x0 + int(.25 * (x1 - x0)))  # the stem
    return (x0 + x1) / 2, np.median([np.nonzero(m[:, c])[0].min() for c in cols]), np.median([np.nonzero(m[:, c])[0].max() for c in cols])
lw = comps(masks(wp)[0], 4)
(bx, bc, bb), (rx, rc, rb) = capbase(lw[0]), capbase(lw[1])
ox = (np.nonzero(lw[3].any(0))[0].min() + np.nonzero(lw[3].any(0))[0].max()) / 2
cap = lambda x: bc + (rc - bc) * (x - bx) / (rx - bx); base = lambda x: bb + (rb - bb) * (x - bx) / (rx - bx)
HC = 215 * K
src = np.float32([[bx, cap(bx)], [bx, base(bx)], [ox, cap(ox)], [ox, base(ox)]])
xr = bx + sum(HC / (base(x) - cap(x)) for x in np.arange(bx, ox))
top = (cap(bx) + base(bx)) / 2 - HC / 2
dst = np.float32([[bx, top], [bx, top + HC], [xr, top], [xr, top + HC]])
Hm = cv2.getPerspectiveTransform(src, dst)
print('heights B %.1f R %.1f at O %.1f (1x)' % ((bb - bc) / K, (rb - rc) / K, (base(ox) - cap(ox)) / K))
wp = cv2.warpPerspective(wp, Hm, (W + 80 * K, H), flags=cv2.INTER_CUBIC).astype(float)
R, G, B = wp[..., 0], wp[..., 1], wp[..., 2]
L = .3 * R + .59 * G + .11 * B
red = (R > 150) & (G < 95) & (R - G > 100)
white = (L > 135) & ~nd.binary_dilation(red, iterations=6)

letters = comps(white, 4)
V = comps(red, 1)[0]
Bm, Rm, Am, Om = letters

def smooth(m, sig):
    return nd.gaussian_filter(m.astype(float), sig) > .5

def shear_upright(m):
    """Fit the stem's left edge (x = a*y + b) over the middle 70% of its height and shear it vertical about the baseline."""
    ys = np.nonzero(m.any(1))[0]; y0, y1 = ys.min(), ys.max()
    rows = np.arange(int(y0 + .15 * (y1 - y0)), int(y1 - .15 * (y1 - y0)))
    xl = np.array([np.nonzero(m[r])[0].min() for r in rows])
    a, b = np.polyfit(rows, xl, 1)
    M = np.float32([[1, -a, a * y1], [0, 1, 0]])
    return cv2.warpAffine(m.astype(np.uint8) * 255, M, (m.shape[1], m.shape[0]), flags=cv2.INTER_LINEAR) > 127, a

def snap_left(m):
    ys = np.nonzero(m.any(1))[0]; y0, y1 = ys.min(), ys.max()
    rows = np.arange(y0 + 12, y1 - 12)
    xl = int(round(np.median([np.nonzero(m[r])[0].min() for r in rows])))
    for r in range(y0, y1 + 1):
        on = np.nonzero(m[r])[0]
        if len(on) and on.min() < xl + 2 * K: m[r, :xl] = False; m[r, xl:on.min() + 1] = True
    return m

def snap_flat(m, tol=2 * K):
    """Flat tops and feet: columns whose top (bottom) edge sits within tol of the letter's cap (baseline) get the exact line."""
    m = m.copy()
    cols = np.nonzero(m.any(0))[0]
    tops = np.array([np.nonzero(m[:, c])[0].min() for c in cols]); bots = np.array([np.nonzero(m[:, c])[0].max() for c in cols])
    t, b = int(np.percentile(tops, 10)), int(np.percentile(bots, 90))
    for c, tp, bt in zip(cols, tops, bots):
        if abs(tp - t) < tol: m[:t, c] = False; m[t:tp + 1, c] = True
        if abs(bt - b) < tol: m[b + 1:, c] = False; m[bt:b + 1, c] = True
    return m

def poly(m, eps):
    """Straight-edged polygon: corners from approxPolyDP, then every edge refitted as a least-squares line through
    the middle 80% of the outline points between its corners, and the corners re-placed at the line intersections."""
    cs, hi = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = np.zeros(m.shape, np.uint8)
    def refit(c):
        c = c[:, 0, :].astype(float)
        ap = cv2.approxPolyDP(c.astype(np.int32)[:, None, :], eps, True)[:, 0, :]
        idx = sorted(int(np.argmin(((c - v) ** 2).sum(1))) for v in ap)
        lines = []
        for i in range(len(idx)):
            a0, a1 = idx[i], idx[(i + 1) % len(idx)]
            seg = c[a0:a1 + 1] if a1 > a0 else np.vstack([c[a0:], c[:a1 + 1]])
            k = max(1, len(seg) // 10); seg = seg[k:-k] if len(seg) > 4 * k else seg
            vx, vy, x0, y0 = cv2.fitLine(seg.astype(np.float32), cv2.DIST_HUBER, 0, .01, .01).ravel()
            lines.append((np.array([x0, y0]), np.array([vx, vy])))
        pts = []
        for i in range(len(lines)):
            (p1, d1), (p2, d2) = lines[i - 1], lines[i]
            M = np.array([d1, -d2]).T
            if abs(np.linalg.det(M)) < 1e-3: pts.append(c[idx[i]]); continue
            t = np.linalg.solve(M, p2 - p1); q = p1 + t[0] * d1
            pts.append(q if np.linalg.norm(q - c[idx[i]]) < 2 * eps else c[idx[i]])  # near-parallel edges: keep the corner
        return np.round(np.array(pts) * 16).astype(np.int32)
    for c, h in zip(cs, hi[0]):
        if h[3] < 0: cv2.fillPoly(out, [refit(c)], 1, cv2.LINE_8, 4)
    for c, h in zip(cs, hi[0]):
        if h[3] >= 0: cv2.fillPoly(out, [refit(c)], 0, cv2.LINE_8, 4)
    return out > 0

def ellipses(m):
    cs, hi = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    outer = max([c for c, h in zip(cs, hi[0]) if h[3] < 0], key=len)
    inner = max([c for c, h in zip(cs, hi[0]) if h[3] >= 0], key=len)
    out = np.zeros(m.shape, np.uint8)
    eo, ei = cv2.fitEllipse(outer), cv2.fitEllipse(inner)
    # upright: the bounding extents of the fitted (tilted) ellipse become the axes
    def upright(e):
        (cx, cy), (w, h), ang = e; t = np.radians(ang)
        ax = np.sqrt((w / 2 * np.cos(t)) ** 2 + (h / 2 * np.sin(t)) ** 2)
        ay = np.sqrt((w / 2 * np.sin(t)) ** 2 + (h / 2 * np.cos(t)) ** 2)
        return (cx, cy), (ax, ay)
    (cx, cy), (ax, ay) = upright(eo); (ix, iy), (bx, by) = upright(ei)
    sc = 1 / 16
    cv2.ellipse(out, (int(cx * 16), int(cy * 16)), (int(ax * 16), int(ay * 16)), 0, 0, 360, 1, -1, cv2.LINE_8, 4)
    cv2.ellipse(out, (int(ix * 16), int(iy * 16)), (int(bx * 16), int(by * 16)), 0, 0, 360, 0, -1, cv2.LINE_8, 4)
    return out > 0, (eo, ei)

Bm, lean = shear_upright(Bm)

Bm = smooth(snap_flat(snap_left(smooth(Bm, 9))), 2)
Rm = smooth(snap_flat(snap_left(smooth(Rm, 9))), 2)
Am = poly(smooth(Am, 4), 9)
V = poly(smooth(V, 4), 9)
Om, ofit = ellipses(Om)

def conv(dstr, Hh, x0, y0, sc):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = (v * .1 / K - x0) * sc if idx % 2 == 0 else ((Hh - v * .1) / K - y0) * sc
        else: v = v * .1 / K * sc if idx % 2 == 0 else -v * .1 / K * sc
        out.append('%.1f' % v); idx += 1
    st = ' '.join(out); st = re.sub(r' (?=-)', '', st)
    for c in 'MmCcLlZz': st = st.replace(' ' + c, c).replace(c + ' ', c)
    return st

def trace(m, x0, y0, a=1.0):
    Image.fromarray(((~m) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '40', '-a', str(a), '-O', '0.6', '--flat', '-o', tmp + '/m.svg'], check=True)
    return conv(' '.join(re.findall(r' d="([^"]+)"', open(tmp + '/m.svg').read())), m.shape[0], x0, y0, 1)

allm = Bm | Rm | Am | Om | V
ys, xs = np.nonzero(allm)
x0, y0 = xs.min() / K - 4, ys.min() / K - 4
res = {'box': [0, 0, round((xs.max() - xs.min()) / K + 8, 1), round((ys.max() - ys.min()) / K + 8, 1)]}
for nm, m, a in (('B', Bm, 1.1), ('R', Rm, 1.1), ('A', Am, .6), ('V', V, .6), ('O', Om, 1.3)):
    res[nm] = trace(m, x0, y0, a)
ry = np.nonzero(Rm)[0]
res['cap'] = round(ry.min() / K - y0, 1); res['base'] = round(ry.max() / K - y0, 1)
res['bbox'] = {nm: [round(np.nonzero(m)[1].min() / K - x0, 1), round(np.nonzero(m)[0].min() / K - y0, 1),
                    round(np.nonzero(m)[1].max() / K - x0, 1), round(np.nonzero(m)[0].max() / K - y0, 1)]
               for nm, m in (('B', Bm), ('R', Rm), ('A', Am), ('V', V), ('O', Om))}
res['notes'] = {'B_lean_removed': round(float(lean), 3), 'O_fit_outer': [round(v, 1) for v in (*ofit[0][0], *ofit[0][1], ofit[0][2])]}
# 6. colours (from the de-skewed photo; masks before cleanup)
def med(mask, img=wp):
    return '#%02x%02x%02x' % tuple(int(v) for v in np.median(img[mask].reshape(-1, 3), 0))
wl = np.any(letters, 0)
core = nd.binary_erosion(wl, iterations=10)
ring = nd.binary_dilation(wl, iterations=4) & ~wl
cap_y, base_y = (res['cap'] + y0) * K, (res['base'] + y0) * K
rowsel = (np.arange(wp.shape[0])[:, None] > cap_y) & (np.arange(wp.shape[0])[:, None] < base_y)
face = ~nd.binary_dilation(allm | wl | red, iterations=25) & rowsel & (L < 90)
res['colors'] = {'core': med(core), 'glow': med(ring), 'red': med(nd.binary_erosion(comps(red, 1)[0], iterations=8)), 'facade': med(face)}
# 7. SHOES in Montserrat ExtraBold outlines
import sys
if len(sys.argv) > 1:
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    ft = TTFont(sys.argv[1]); gs = ft.getGlyphSet(); cmap = ft.getBestCmap()
    capH = .28 * (res['base'] - res['cap']); sc = capH / ft['OS/2'].sCapHeight
    x = res['bbox']['O'][2] + .07 * (res['base'] - res['cap']); track = .04 * capH / sc
    res['SHOES'] = []
    for ch in 'SHOES':
        g = cmap[ord(ch)]; pen = SVGPathPen(gs, ntos=lambda v: '%.1f' % v)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, res['base'])))
        res['SHOES'].append(pen.getCommands()); x += (gs[g].width + track) * sc
    res['shoesW'] = round(x - track * sc, 1)
else:
    old = json.load(open(D + 'sign.json')); res['SHOES'] = old.get('SHOES'); res['shoesW'] = old.get('shoesW')
json.dump(res, open(D + 'sign.json', 'w'))
crop = Image.fromarray(wp.astype(np.uint8)).crop((int(x0 * K), int(y0 * K), int(x0 * K + res['box'][2] * K), int(y0 * K + res['box'][3] * K)))
crop.resize((int(res['box'][2]), int(res['box'][3])), Image.LANCZOS).save(D + '../srcimg/sign-corrected.png')
print(json.dumps({k: res[k] for k in ('box', 'cap', 'base', 'bbox', 'notes', 'colors')}))
