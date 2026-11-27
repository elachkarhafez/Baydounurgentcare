"""Trace the StackD Bars logo into separate SVG parts for the LED sign, the nav lockup, the favicon and the og card.
Source: srcimg/thanksgiving-flyer-1080.jpg, their own Thanksgiving menu post (instagram.com/p/DfyEkQNhxCV, 1080x1182).
It is the largest COMPLETE copy public: the regular menu post (srcimg/menu-flyer-1080.jpg, DfXpfx5Ppjr) shows the logo a
little bigger but crops the tops of the S, k and d.
Usage: /usr/bin/python3 -I trace.py   (cv2, numpy, scikit-image and the potrace CLI). Writes parts.json + debug.png.
Coordinates are flyer pixels minus the logo box origin (X0, Y0), so the lockup viewBox is 0 0 730 252.
Parts:
  s0..s5      the script 'Stackd' (one letter each), plus 'drip' (the chocolate drip off the d) and, for each letter,
              a centreline (skeleton polylines) in meta.lines so the sign can write it in light stroke by stroke
  b0..b3      BARS letters (dark outline shape) and f0..f3 their caramel faces
  plate       the white sticker outline round script + BARS
  ic_*        the bar icon: base (outline/crust), choc (the two chocolate tops), cream (cheesecake), drizzle, spark0..2
  c0..c14     CHEESECAKE BARS letters, ruleL / ruleR
  tag         'Rich. Creamy. Irresistible.' (traced, it is their lockup)"""
import os, json, re, subprocess, tempfile
import cv2, numpy as np
from skimage.morphology import skeletonize

HERE = os.path.dirname(os.path.abspath(__file__))
X0, Y0, X1, Y1 = 230, 0, 960, 252
S = 4
src = cv2.imread(os.path.join(HERE, 'srcimg/thanksgiving-flyer-1080.jpg'))[Y0:Y1, X0:X1]
img = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
img = cv2.bilateralFilter(img, 9, 28, 9)
f = img.astype(np.float32)
B, G, R = f[..., 0], f[..., 1], f[..., 2]
lum = .299 * R + .587 * G + .114 * B
mx, mn = f.max(2), f.min(2)
sat = (mx - mn) / (mx + 1)
H, W = lum.shape
yy, xx = np.mgrid[0:H, 0:W]
o = lambda v: int(round(v * S))

dark = lum < 98
mid = (lum >= 98) & (lum < 178) & (R - B > 38)
ink = dark | mid
white = (lum > 230) & (sat < .12)

def box(x0, y0, x1, y1):
    return (xx >= o(x0)) & (xx < o(x1)) & (yy >= o(y0)) & (yy < o(y1))

def comps(m, min_area=30):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    return [dict(x=st[i][0] / S, y=st[i][1] / S, w=st[i][2] / S, h=st[i][3] / S, a=st[i][4] / S / S,
                 cx=cen[i][0] / S, cy=cen[i][1] / S, m=lab == i) for i in range(1, n) if st[i][4] >= min_area * S * S]

def fill_small_holes(m, max_area):
    inv = (~m).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 4)
    out = m.copy()
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < max_area * S * S and x > 0 and y > 0 and x + w < W and y + h < H:
            out[lab == i] = True
    return out

def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

def close(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(r)).astype(bool)
def dil(m, r): return cv2.dilate(m.astype(np.uint8), disk(r)).astype(bool)
def opn(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, disk(r)).astype(bool)

parts, meta = {}, {'lines': {}}

# --- regions (flyer px relative to X0,Y0), read off debug.png ---
ICON = (528, 0, 730, 196)
CAPS = (0, 188, 730, 215)
TAG = (60, 214, 560, 247)
LOGO_Y = 186          # script + BARS + drip live above this

# all logo ink above the caps line and left of the icon; the ribbon in the flyer's top-left corner is dropped
lg = ink & (yy < o(LOGO_Y)) & (xx < o(ICON[0]))
lg = fill_small_holes(close(lg, 2), 10)
lc = [c for c in comps(lg, 20) if not (c['x'] < 3 and c['y'] < 3 and c['w'] < 60)]
# BARS letters: components that start below the script baseline in the middle band
bl = sorted([c for c in lc if c['y'] > 112 and 170 < c['cx'] < 445 and c['a'] > 300], key=lambda c: c['x'])
print('BARS comps', [(round(c['x']), round(c['y']), round(c['w']), round(c['a'])) for c in bl])
bars_all = np.zeros_like(ink)
for i, c in enumerate(bl[:4]):
    parts[f'b{i}'] = ('brown', c['m'])
    face = opn(((R - B) > 88) & c['m'], 2)
    face = fill_small_holes(close(face, 4), 4) & cv2.erode(c['m'].astype(np.uint8), disk(o(1.2))).astype(bool)
    parts[f'f{i}'] = ('caramel', face)
    bars_all |= c['m']
sc = np.zeros_like(ink)
for c in lc:
    if not any(c['m'] is b['m'] for b in bl[:4]): sc |= c['m']

# split the joined script into letters: watershed on the distance map from one seed per letter,
# so the seams fall in the narrow joins between letters (how they'd be written)
from skimage.segmentation import watershed
seeds = {'S': [(70, 100), (95, 25)], 't': [(163, 80), (190, 22), (150, 52), (210, 50)], 'a': [(214, 84), (232, 108), (262, 96), (250, 60)], 'c': [(290, 75), (300, 108)],
         'k': [(368, 40), (380, 95), (402, 60)], 'd': [(435, 90), (482, 30), (452, 85)], 'drip': [(487, 165), (500, 120)]}
mk = np.zeros((H, W), np.int32)
names = list(seeds)
for i, n in enumerate(names):
    for (x, y) in seeds[n]:
        cv2.circle(mk, (o(x), o(y)), o(2.5), i + 1, -1)
mk[~sc] = 0
_d = np.dstack([sc * 200] * 3).astype(np.uint8)
for n in seeds:
    for (x, y) in seeds[n]: cv2.circle(_d, (o(x), o(y)), 10, (0, 0, 255), -1)
for gx in range(0, 730, 10): cv2.line(_d, (o(gx), 0), (o(gx), H), (255, 0, 0) if gx % 50 else (0, 160, 0), 1)
for gy in range(0, 252, 10): cv2.line(_d, (0, o(gy)), (W, o(gy)), (255, 0, 0) if gy % 50 else (0, 160, 0), 1)
cv2.imwrite('/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/stackd/raw/crop/seeds.png', cv2.resize(_d[:o(190), :o(540)], None, fx=.5, fy=.5))
dt = cv2.distanceTransform(sc.astype(np.uint8), cv2.DIST_L2, 5)
lab = watershed(-dt, mk, mask=sc)
_c = np.array([(0,0,0),(200,80,80),(80,200,80),(80,80,220),(220,200,60),(200,60,200),(60,200,200),(120,120,120)], np.uint8)
cv2.imwrite('/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/stackd/raw/crop/ws.png', cv2.resize(_c[lab][:o(190), :o(540)], None, fx=.5, fy=.5))
for n in seeds:
    print(n, [bool(sc[o(y), o(x)]) for (x, y) in seeds[n]])
for i, n in enumerate(names):
    m = lab == i + 1
    print('letter', n, int(m.sum()) // (S * S))
    if n == 'drip':
        parts['drip'] = ('brown', m)
    else:
        parts[f's{"Stackd".index(n)}'] = ('brown', m)

# --- plate: white sticker border round script + BARS + drip ---
logo = sc | bars_all
near = dil(logo, o(9))
plate = logo | (white & near) | dil(logo, o(4.2))
plate = close(plate, o(2.5))
plate = fill_small_holes(plate, 2600)
plate = opn(plate, o(1))
parts['plate'] = ('white', plate)

# --- icon: the dark outline is continuous, so its filled outline is the silhouette ---
ib = box(*ICON)
ic_dark = close(dark & ib, 1)
dc = sorted(comps(ic_dark, 3), key=lambda c: -c['a'])
bg = ((lum > 222) & (sat < .2)) | white
fg = close(~bg & ib, o(.8))
fc = sorted(comps(fg, 40), key=lambda c: -c['a'])
sil = fill_small_holes(opn(fc[0]['m'], o(.8)), 30000)
outline = ic_dark & sil
sparks = sorted([c for c in dc[1:] if c['a'] > 8 and not (dil(sil, o(2)) & c['m']).any()], key=lambda c: c['x'])
print('icon outline', round(dc[0]['a']), 'sparks', [(round(c['x']), round(c['y']), round(c['a'])) for c in sparks])
for i, c in enumerate(sparks[:4]): parts[f'ic_spark{i}'] = ('brown', c['m'])
inner = sil & ~outline
for c in dc[1:]:
    if (c['m'] & sil).any(): inner &= ~c['m']   # dark crumbs inside stay dark
parts['ic_base'] = ('dark', sil)
choc = opn(mid & inner & (lum < 165), 1)
choc = fill_small_holes(close(choc, 2), 40) & inner
light = inner & ~choc
drz = light & (sat > .36) & (lum > 150)
drz = opn(close(drz, 1), 1)
cream = opn(light & ~drz, 1)
parts['ic_choc'] = ('choc', choc)
parts['ic_cream'] = ('cream', cream)
parts['ic_drizzle'] = ('drizzle', drz)

# --- CHEESECAKE BARS + rules ---
caps = close(dark & box(*CAPS), 1)
cl = sorted(comps(caps, 4), key=lambda c: c['x'])
k = 0
for c in cl:
    if c['w'] > 40 and c['h'] < 5:
        parts['ruleL' if c['x'] < 100 else 'ruleR'] = ('brown', c['m'])
    elif c['h'] > 8:
        parts[f'c{k}'] = ('brown', c['m']); k += 1
print('caps letters', k)

# --- tagline ---
tg = close(dark & box(*TAG), 1)
tg = np.zeros_like(tg) | sum((c['m'] for c in comps(tg, 2)), np.zeros_like(tg))
parts['tag'] = ('brown', tg)

# --- centrelines for the script letters (skeleton -> polylines) ---
def polylines(m):
    sk = skeletonize(cv2.erode(m.astype(np.uint8), disk(1)).astype(bool))
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
    deg = {p: len(nb(p)) for p in pts}
    nodes = {p for p in pts if deg[p] != 2}
    seen = set(); lines = []
    def walk(a, b):
        line = [a, b]; seen.add(frozenset((a, b)))
        prev, cur = a, b
        while cur not in nodes:
            nxt = [q for q in nb(cur) if q != prev and frozenset((cur, q)) not in seen]
            if not nxt: break
            q = nxt[0]; seen.add(frozenset((cur, q))); prev, cur = cur, q; line.append(cur)
        return line
    for a in sorted(nodes, key=lambda p: (p[1], p[0])):
        for b in nb(a):
            if frozenset((a, b)) not in seen: lines.append(walk(a, b))
    # loops with no nodes
    rest = [p for p in pts if not any(frozenset((p, q)) in seen for q in nb(p))]
    while rest:
        p = rest[0]; q = nb(p)
        if not q: rest = rest[1:]; continue
        lines.append(walk(p, q[0]))
        rest = [p for p in pts if not any(frozenset((p, q)) in seen for q in nb(p))]
    dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    out = []
    for ln in lines:
        if len(ln) < 6 * S: continue
        arr = np.array([[p[1], p[0]] for p in ln], np.float32).reshape(-1, 1, 2)
        ap = cv2.approxPolyDP(arr, 0.6 * S, False).reshape(-1, 2)
        out.append([[round(float(x) / S, 1), round(float(y) / S, 1)] for x, y in ap])
    # order: start with the longest from the leftmost point, then by left edge (how a hand writes it)
    out.sort(key=lambda l: min(p[0] for p in l))
    width = float(np.percentile(dt[sk], 96)) / S * 2.3 + 2
    return out, round(width, 1)

for n in sorted(parts):
    if re.fullmatch(r's\d', n) or n == 'drip':
        ls, w = polylines(parts[n][1])
        meta['lines'][n] = {'w': w, 'p': ls}

def trace(mask, turd=2):
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(turd * S * S), '-a', '1.0', '-O', '0.4', '-o', svg, pbm], check=True)
        t = open(svg).read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', t).groups())
    k = 1.0 / S
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

res = {}
dbg = np.full((H, W, 3), 235, np.uint8)
pal = {'brown': (12, 24, 70), 'caramel': (20, 110, 200), 'white': (255, 255, 255), 'dark': (10, 15, 40),
       'choc': (30, 70, 140), 'cream': (190, 225, 245), 'drizzle': (110, 200, 245)}
order = ['plate'] + [n for n in parts if n != 'plate']
for name in order:
    col, m = parts[name]
    if m.sum() < 10: print('empty', name); continue
    ys, xs = np.nonzero(m)
    res[name] = {'c': col, 'd': trace(m, 1 if name in ('tag',) or name.startswith('c') or name.startswith('ic_') else 2),
                 'box': [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)]}
    dbg[m] = pal[col]
for name in parts:
    if name == 'plate': continue
    ys, xs = np.nonzero(parts[name][1])
    if len(xs): cv2.putText(dbg, name, (int(xs.min()), int(ys.min()) + 30), cv2.FONT_HERSHEY_SIMPLEX, .9, (0, 0, 255), 2)
for n, v in meta['lines'].items():
    for ln in v['p']:
        pts = (np.array(ln) * S).astype(np.int32)
        cv2.polylines(dbg, [pts], False, (0, 200, 0), 3)
orig = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
cols = {}
for name in ['s0', 's2', 'f1', 'b1', 'ic_choc', 'ic_cream', 'ic_drizzle', 'ic_base', 'tag']:
    m = parts[name][1]
    if name[0] == 'b': m = m & ~parts['f' + name[1]][1]
    m = cv2.erode(m.astype(np.uint8), disk(2)).astype(bool)
    b, g, r = np.median(orig[m], 0)
    cols[name] = '#%02x%02x%02x' % (int(r), int(g), int(b))
bgm = (lum > 200) & ~dil(parts['plate'][1], o(3)) & (yy < o(180)) & (xx < o(520))
b, g, r = np.median(orig[bgm], 0); cols['bg'] = '#%02x%02x%02x' % (int(r), int(g), int(b))
print('colours', cols)
meta['colours'] = cols
# small, simplified copies of the icon for the favicon (traced at 1/4 the resolution, speckles dropped)
fav = {}
for n in ('ic_base', 'ic_choc', 'ic_cream', 'ic_drizzle'):
    sm = cv2.resize(parts[n][1].astype(np.float32), None, fx=1 / 8, fy=1 / 8, interpolation=cv2.INTER_AREA)
    m = cv2.resize(cv2.GaussianBlur(sm, (3, 3), 0), (W, H), interpolation=cv2.INTER_CUBIC) > .5
    fav[n] = trace(m, 40)
meta['fav'] = fav
res['_meta'] = meta
json.dump(res, open(os.path.join(HERE, 'parts.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug.png'), cv2.resize(dbg, None, fx=.5, fy=.5, interpolation=cv2.INTER_AREA))
print(len(res) - 1, 'parts', sum(len(v['d']) for k, v in res.items() if k != '_meta') // 1024, 'KB')
