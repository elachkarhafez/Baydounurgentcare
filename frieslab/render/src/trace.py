"""Traces the Fries Lab sign (their Antelias storefront, srcimg/sign.png made by prep.py) into SVG paths, one per part,
so the page can power the sign on piece by piece: the black panel with the bubble bump, the neon doodles (red and amber),
the orange FRIES letters, the red L, flask and B of LAB, the flask's liquid line, the three bubbles and the two dots.
Each pixel gets a soft score per sign colour (HSV distance), the scores are upsampled x K and thresholded, each colour is
split into connected parts, every part is ironed with a small Gaussian and traced with potrace.
Run:  python3 -I trace.py   (writes logo.json and logo-preview.svg next to this file)"""
import cv2, numpy as np, subprocess, re, json, os, tempfile
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()
full = cv2.imread(D + '../srcimg/sign.png')
X0, Y0, X1, Y1 = 18, 20, 456, 300            # the panel and its bubble bump, in sign.png px
src = full[Y0:Y1, X0:X1]
K = 4
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV).astype(np.float32)
H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
def hue_d(h0):
    d = np.abs(H - h0); return np.minimum(d, 180 - d)
sat = np.clip((S - 95) / 60, 0, 1) * np.clip((V - 110) / 60, 0, 1)
score = {
    'orange': sat * np.clip(1 - (hue_d(13) - 3) / 5, 0, 1),
    'red': sat * np.clip(1 - (hue_d(178) - 4) / 5, 0, 1),
    'amber': sat * np.clip(1 - (hue_d(19) - 2.5) / 4, 0, 1),
    'dark': np.clip((95 - V) / 40, 0, 1),
    'oface': np.clip((S - 95) / 60, 0, 1) * np.clip((V - 205) / 25, 0, 1) * np.clip(1 - (hue_d(14) - 6) / 5, 0, 1),
    'rface': np.clip((S - 95) / 60, 0, 1) * np.clip((V - 195) / 25, 0, 1) * np.clip(1 - (hue_d(178) - 5) / 5, 0, 1),
}
up = {k: cv2.resize(v.astype(np.float32), None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC) for k, v in score.items()}
Hh, Ww = up['dark'].shape
yy, xx = np.mgrid[0:Hh, 0:Ww] / K
warm = cv2.resize(sat, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)


def conv(dstr, Hm):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 / K if idx % 2 == 0 else (Hm - v * .1) / K
        else: v = v * .1 / K if idx % 2 == 0 else -v * .1 / K
        out.append('%.1f' % v); idx += 1
    s = ' '.join(out); s = re.sub(r' (?=-)', '', s)
    for c in 'MmCcLlZz': s = s.replace(' ' + c, c).replace(c + ' ', c)
    return s


def trace(mask):
    cv2.imwrite(tmp + '/m.pbm', ((1 - mask.astype(bool)) * 255).astype(np.uint8))
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '10', '-a', '1.0', '-O', '0.8', '--flat', '-o', tmp + '/m.svg'], check=True)
    return conv(' '.join(re.findall(r' d="([^"]+)"', open(tmp + '/m.svg').read())), mask.shape[0])


def comps(mask, amin):
    n, lb, st, cen = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    return [(lb == i, st[i] / K, cen[i] / K) for i in range(1, n) if st[i][4] >= amin * K * K]


def bb(m):
    ys, xs = np.nonzero(m); return [round(xs.min() / K, 1), round(ys.min() / K, 1), round(xs.max() / K, 1), round(ys.max() / K, 1)]


def iron(m, s):
    return (cv2.GaussianBlur(m.astype(np.float32), (0, 0), s) > .5).astype(np.uint8)


def fill_holes(m, maxa):
    m = m.astype(np.uint8).copy(); n, lb, st, _ = cv2.connectedComponentsWithStats(1 - m, 4)
    for i in range(1, n):
        if st[i][4] < maxa * K * K and st[i][0] > 0 and st[i][1] > 0: m[lb == i] = 1
    return m


parts = []
def add(pid, kind, color, m, order, s=2.0):
    m = iron(m, s)
    if m.sum() < 20: return
    parts.append({'id': pid, 'kind': kind, 'color': color, 'd': trace(m), 'bb': bb(m), 'order': order})


# letter zones measured on sign.png (minus the crop offset)
fries_row = (yy > 95 - Y0) & (yy < 180 - Y0)
lab_row = (yy >= 172 - Y0) & (yy < 252 - Y0)
letters_x = (xx > 98 - X0) & (xx < 380 - X0)
bubbles_z = (yy < 104 - Y0) & (xx > 205 - X0) & (xx < 275 - X0)

orange = (up['orange'] > .45).astype(np.uint8)
red = (up['red'] > .45).astype(np.uint8)
amber = (up['amber'] > .5).astype(np.uint8)

# --- panel: a rounded rectangle on the measured edges, plus the bump that hugs the bubbles
panel = np.zeros((Hh, Ww), np.uint8)
cv2.rectangle(panel, (int(5 * K), int(41 * K)), (int(434 * K), int(274 * K)), 1, -1)
panel = iron(panel, 5 * K)
# --- bubbles (orange, above the I) and the two dots beside LAB
bub = comps(orange & bubbles_z, 30)
bump = np.zeros_like(panel)
for m, st, c in bub: bump |= m.astype(np.uint8)
bump = cv2.dilate(bump, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(17 * K), int(17 * K))))
bump = cv2.morphologyEx(bump, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(21 * K), int(21 * K))))
add('panel', 'plate', 'panel', iron(panel | bump, 3 * K), 0, 1)
for i, (m, st, c) in enumerate(sorted(bub, key=lambda b: -b[2][1])):    # bottom (largest) first
    add('bubble%d' % i, 'bubble', 'orange', fill_holes(m, 60), 3)
dots = sorted([c for c in comps(orange & lab_row, 40) if c[1][3] < 30 and 0.6 < c[1][2] / max(c[1][3], 1) < 1.6], key=lambda c: -c[1][4])[:2]
for i, (m, st, c) in enumerate(sorted(dots, key=lambda b: b[2][0])):
    add('dot%d' % i, 'bubble', 'orange', m, 6)

# --- FRIES (orange) letters, left to right; the I is the flask neck (red)
om = (up['oface'] > .5).astype(np.uint8) & fries_row & letters_x
cuts = [80, 138, 206, 236, 293.5, 362]          # F | R | (flask neck) | E | S, measured on the crop
fl = []
for a, b in zip(cuts[:-1], cuts[1:]):
    if a == 206: continue
    m = om & (xx >= a) & (xx < b)
    if m.sum(): fl.append((m, None, (a, 0)))
for i, (m, st, c) in enumerate(fl):
    add('F%d' % i, 'letter', 'orange', fill_holes(m, 12), 4, 1.6)

# --- LAB (red) and the flask: big red parts in the letter zone
rm = (up['rface'] > .5).astype(np.uint8) & letters_x & (yy > 95 - Y0) & (yy < 252 - Y0)
rm = sum(c[0].astype(np.uint8) for c in comps(rm, 150)).clip(0, 1).astype(np.uint8)
rl = [(rm & (xx < 197), None, (0, 0)), (rm & (xx >= 197) & (xx < 252), None, (1, 0)), (rm & (xx >= 252), None, (2, 0))]
for pid, (m, st, c) in zip(['labL', 'flask', 'labB'], rl):
    add(pid, 'letter', 'red', m, 5, 1.6)

# --- doodles: thin red and amber strokes on the panel, away from the letters
taken = np.zeros_like(red)
for p in fl + rl + bub + dots: taken |= p[0].astype(np.uint8)
taken |= (letters_x & (yy > 90 - Y0) & (yy < 256 - Y0)).astype(np.uint8)
taken = cv2.dilate(taken, np.ones((9, 9), np.uint8))
dz = panel.astype(bool) & ~taken.astype(bool)
for color, m0 in (('red', red), ('amber', amber & ~orange | amber & ~letters_x)):
    dd = [c for c in comps(m0 & dz, 14) if max(c[1][2], c[1][3]) > 9]
    dd.sort(key=lambda c: (c[2][0] - 220) ** 2 + (c[2][1] - 130) ** 2)     # centre outwards
    for i, (m, st, c) in enumerate(dd):
        add('d%s%d' % (color[0], i), 'tube', color, m, 2, 1.4)

json.dump({'box': [0, 0, src.shape[1], src.shape[0]], 'parts': parts}, open(D + 'logo.json', 'w'))
COL = {'panel': '#2a2629', 'orange': '#f87607', 'red': '#f30b1b', 'amber': '#e0932a'}
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="880"><rect width="100%%" height="100%%" fill="#8aa"/>' % (src.shape[1], src.shape[0])
for p in sorted(parts, key=lambda p: p['order']):
    svg += '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (p['d'], COL[p['color']])
open(D + 'logo-preview.svg', 'w').write(svg + '</svg>')
print(len(parts), 'parts:', ' '.join(p['id'] for p in parts))
