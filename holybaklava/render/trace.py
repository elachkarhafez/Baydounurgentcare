"""Trace the Holy Baklava logo into separate SVG parts for the LED sign, the nav, the favicon and the og card.
Source: srcimg/logo-post-1008.jpg, their own new-logo post (instagram.com/p/DfcuIrnOjQc, 1008x1008, logo by
@jzsignsdesigns). It is the largest clean copy public (the menu post DfhfRuXRt5d has it smaller inside a circle).
Usage: /usr/bin/python3 -I trace.py   (cv2, numpy, scikit-image, potrace CLI). Writes parts.json + debug.png.
Coordinates are source pixels minus the crop origin (X0, Y0), so the lockup viewBox is 0 0 W0 H0 (printed).
Parts:
  h, o, l, y        the script letters of 'holy' (one each; the swirl that curls over the o and l is its own part)
  swirl, swirlhi    the pink swirl on top and its light-pink highlight bands
  hand, handsh, handln, nail0..1   the hand: skin fill, shadow tone, brown outline/linework, pink nails
  p0..pN            each pistachio crumb (dark green), pk the light highlights on them
  B,A,K,L,A2,V,A3   BAKLAVA letters (k0..k6), ruleL / ruleR the gold rules
  meta.lines        skeleton centrelines of h, o, l, y, swirl (for writing them in light stroke by stroke)"""
import os, json, re, subprocess, tempfile
import cv2, numpy as np
from skimage.morphology import skeletonize

HERE = os.path.dirname(os.path.abspath(__file__))
X0, Y0, X1, Y1 = 180, 90, 1008, 885
S = 3
src = cv2.imread(os.path.join(HERE, 'srcimg/logo-post-1008.jpg'))[Y0:Y1, X0:X1]
img = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
img = cv2.bilateralFilter(img, 9, 24, 9)
H, W = img.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
o = lambda v: int(round(v * S))

# nearest palette colour per pixel (palette = k-means centres of the logo, see the docstring run)
PAL = {'bg': '#feeefb', 'pink': '#fc9ac3', 'pinkl': '#fac1dc', 'skin': '#fbd7c1', 'skin2': '#f9c3a4', 'skinsh': '#f49e71',
       'ln': '#9a431b', 'ln2': '#cd6d29', 'ln3': '#c67e57', 'pist': '#666b11', 'pisthi': '#dfba33'}
names = list(PAL)
cols = np.array([[int(PAL[n][5:7], 16), int(PAL[n][3:5], 16), int(PAL[n][1:3], 16)] for n in names], np.float32)
lab_img = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
lab_pal = cv2.cvtColor(cols.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
d = ((lab_img[:, :, None, :] - lab_pal[None, None, :, :]) ** 2).sum(-1)
L = d.argmin(-1)
M = {n: L == i for i, n in enumerate(names)}

def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
def close(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(r)).astype(bool)
def opn(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, disk(r)).astype(bool)
def dil(m, r): return cv2.dilate(m.astype(np.uint8), disk(r)).astype(bool)
def box(x0, y0, x1, y1): return (xx >= o(x0)) & (xx < o(x1)) & (yy >= o(y0)) & (yy < o(y1))
def comps(m, min_area=20):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    return [dict(x=st[i][0] / S, y=st[i][1] / S, w=st[i][2] / S, h=st[i][3] / S, a=st[i][4] / S / S, cx=cen[i][0] / S, cy=cen[i][1] / S, m=lab == i)
            for i in range(1, n) if st[i][4] >= min_area * S * S]
def fill_holes(m, max_area):
    inv = (~m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 4); out = m.copy()
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < max_area * S * S and x > 0 and y > 0 and x + w < W and y + h < H: out[lab == i] = True
    return out

if os.environ.get('PROBE'):
    vis = np.zeros((H, W, 3), np.uint8)
    for i, n in enumerate(names): vis[L == i] = cols[i]
    for gx in range(0, X1 - X0, 20): cv2.line(vis, (o(gx), 0), (o(gx), H), (255, 0, 0) if gx % 100 else (0, 160, 0), 1)
    for gy in range(0, Y1 - Y0, 20): cv2.line(vis, (0, o(gy)), (W, o(gy)), (255, 0, 0) if gy % 100 else (0, 160, 0), 1)
    cv2.imwrite(os.environ['PROBE'], cv2.resize(vis, None, fx=1 / S, fy=1 / S, interpolation=cv2.INTER_AREA))
    raise SystemExit

parts, meta = {}, {'lines': {}}
pinkall = M['pink'] | M['pinkl']
HOLY = box(0, 270, 660, 745) & ~box(95, 684, 496, 745)          # holy + swirl, minus the BAKLAVA band
BAKB = box(95, 684, 496, 745)
handreg = box(200, 0, 828, 345)
# --- hand ---
skin = (M['skin'] | M['skin2'] | M['skinsh'] | M['ln'] | M['ln2'] | M['ln3']) & handreg
skin = fill_holes(close(skin, 2), 400)
nails = [c for c in comps(pinkall & box(200, 0, 520, 300), 30) if c['y'] < 260]
nails.sort(key=lambda c: c['x'])
print('nails', [(round(c['x']), round(c['y']), round(c['a'])) for c in nails])
nm = np.zeros_like(skin)
for i, c in enumerate(nails):
    m = fill_holes(close(c['m'], 1), 50); parts[f'nail{i}'] = ('nail', m); nm |= m
hand = fill_holes(close(skin | nm, 2), 3000) & ~opn(nm, 1)
hand = opn(hand, 1)
parts['hand'] = ('skin', hand)
parts['handsh'] = ('skinsh', opn((M['skinsh'] | M['skin2']) & hand, 1))
ln = (M['ln'] | M['ln2'] | M['ln3']) & dil(hand | nm, 2)
parts['handln'] = ('ln', ln)
# --- pistachio ---
pr = box(290, 250, 480, 340)
pm = fill_holes(close((M['pist'] | M['pisthi']) & pr, 1), 20)
# the crumbs are light green-gold pieces with a dark olive edge: the dark edge is one part (pd), each light piece its own
parts['pd'] = ('pist', pm)
pc = sorted(comps(opn(M['pisthi'] & pm, 1), 3), key=lambda c: c['x'])
print('pistachio crumbs', len(pc))
for i, c in enumerate(pc): parts[f'p{i}'] = ('pisthi', fill_holes(c['m'], 10))
# --- gold rules ---
gr = sorted(comps(close(M['pisthi'] & box(0, 755, 828, 795), 2), 30), key=lambda c: c['x'])
parts['ruleL'], parts['ruleR'] = ('gold', gr[0]['m']), ('gold', gr[-1]['m'])
# --- BAKLAVA ---
bk = fill_holes(close(pinkall & BAKB, 1), 30)
bc = sorted([c for c in comps(bk, 30) if c['h'] > 25], key=lambda c: c['x'])
print('BAKLAVA comps', [(round(c['x']), round(c['w'])) for c in bc])
for i, c in enumerate(bc): parts[f'k{i}'] = ('pink', c['m'])
# --- holy + swirl: watershed from seeds so the seams fall at the narrow joins ---
hm = fill_holes(close(pinkall & HOLY, 1), 30)
hi = opn(M['pinkl'] & hm, 1)                                   # light-pink highlight bands of the swirl
from skimage.segmentation import watershed
seeds = {'h': [(75, 450), (90, 600), (205, 610), (150, 520)], 'o': [(250, 585), (380, 585), (315, 515), (315, 655)],
         'l': [(430, 640), (430, 540)], 'y': [(520, 525), (625, 525), (610, 650), (540, 728), (575, 600)],
         'swirl': [(300, 345), (480, 380), (250, 420), (340, 425), (545, 370), (300, 450), (400, 330)]}
mk = np.zeros((H, W), np.int32)
sn = list(seeds)
for i, n in enumerate(sn):
    for (x, y) in seeds[n]: cv2.circle(mk, (o(x), o(y)), o(3), i + 1, -1)
mk[~hm] = 0
for n in seeds: print('seed', n, [bool(hm[o(y), o(x)]) for (x, y) in seeds[n]])
dt = cv2.distanceTransform(hm.astype(np.uint8), cv2.DIST_L2, 5)
lab = watershed(-dt, mk, mask=hm)
for i, n in enumerate(sn):
    m = lab == i + 1
    print('letter', n, int(m.sum()) // (S * S))
    parts[n] = ('pink', m)
parts['swirlhi'] = ('pinkl', hi & (lab == sn.index('swirl') + 1))
orph = hm & (lab == 0)
if orph.sum(): print('orphans', int(orph.sum()) // (S * S))

def polylines(m, minlen=8):
    sk = skeletonize(cv2.erode(m.astype(np.uint8), disk(1)).astype(bool))
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
    deg = {p: len(nb(p)) for p in pts}; nodes = {p for p in pts if deg[p] != 2}
    seen = set(); lines = []
    def walk(a, b):
        line = [a, b]; seen.add(frozenset((a, b))); prev, cur = a, b
        while cur not in nodes:
            nxt = [q for q in nb(cur) if q != prev and frozenset((cur, q)) not in seen]
            if not nxt: break
            q = nxt[0]; seen.add(frozenset((cur, q))); prev, cur = cur, q; line.append(cur)
        return line
    for a in sorted(nodes, key=lambda p: (p[1], p[0])):
        for b in nb(a):
            if frozenset((a, b)) not in seen: lines.append(walk(a, b))
    rest = [p for p in pts if not any(frozenset((p, q)) in seen for q in nb(p))]
    while rest:
        p = rest[0]; q = nb(p)
        if not q: rest = rest[1:]; continue
        lines.append(walk(p, q[0])); rest = [p for p in pts if not any(frozenset((p, q)) in seen for q in nb(p))]
    dtm = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    out = []
    for ln_ in lines:
        if len(ln_) < minlen * S: continue
        arr = np.array([[p[1], p[0]] for p in ln_], np.float32).reshape(-1, 1, 2)
        ap = cv2.approxPolyDP(arr, 0.7 * S, False).reshape(-1, 2)
        out.append([[round(float(x) / S, 1), round(float(y) / S, 1)] for x, y in ap])
    out.sort(key=lambda l: -len(l))
    width = float(np.percentile(dtm[sk], 90)) / S * 2 if sk.any() else 4
    return out, round(width, 1)

for n in ['h', 'o', 'l', 'y', 'swirl']:
    ls, w = polylines(parts[n][1]); meta['lines'][n] = {'w': w, 'p': ls}
    print('lines', n, len(ls), 'w', w)
ls, w = polylines(dil(parts['handln'][1], 1), 5); meta['lines']['hand'] = {'w': w, 'p': ls}
print('hand lines', len(ls))

def trace(mask, turd=2):
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(turd * S * S), '-a', '1.0', '-O', '0.4', '-o', svg, pbm], check=True)
        t = open(svg).read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', t).groups())
    k = 1.0 / S; out = []
    for dd in re.findall(r' d="([^"]+)"', t):
        toks = re.findall(r'[MmLlCcZz]|-?\d+(?:\.\d+)?', dd); res_, cmd, nums = [], None, []
        def flush():
            if cmd is None: return
            if cmd == 'M': pts = [f'{(tx + sx * nums[j]) * k:.1f} {(ty + sy * nums[j + 1]) * k:.1f}' for j in range(0, len(nums), 2)]
            else: pts = [f'{sx * nums[j] * k:.1f} {sy * nums[j + 1] * k:.1f}' for j in range(0, len(nums), 2)]
            res_.append(cmd + ' '.join(pts))
        for tk in toks:
            if tk in 'MmLlCcZz':
                flush(); cmd, nums = tk, []
                if tk in 'Zz': res_.append('z'); cmd = None
            else: nums.append(float(tk))
        flush(); out.append(''.join(res_))
    return re.sub(r'(?<=\d)\.0(?=[ a-zA-Z-]|$)', '', ''.join(out)).replace(' -', '-')

res = {}
dbg = np.full((H, W, 3), 238, np.uint8)
pc_ = {'pink': (195, 154, 252), 'pinkl': (220, 193, 250), 'skin': (193, 215, 251), 'skinsh': (113, 158, 244), 'ln': (27, 67, 154),
       'nail': (180, 100, 250), 'pist': (17, 107, 102), 'pisthi': (51, 186, 223), 'gold': (57, 170, 232)}
order = ['hand', 'handsh', 'handln'] + [n for n in parts if n not in ('hand', 'handsh', 'handln')]
for n in order:
    col, m = parts[n]
    if m.sum() < 10: print('empty', n); continue
    ys, xs = np.nonzero(m)
    res[n] = {'c': col, 'd': trace(m, 1 if n[0] in 'pk' or n == 'handln' else 2),
              'box': [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)]}
    dbg[m] = pc_[col]
for n, v in meta['lines'].items():
    for ln_ in v['p']: cv2.polylines(dbg, [(np.array(ln_) * S).astype(np.int32)], False, (0, 180, 0) if n != 'hand' else (255, 0, 0), 2)
for n in ['h', 'o', 'l', 'y', 'swirl', 'k0', 'hand']:
    ys, xs = np.nonzero(parts[n][1]); cv2.putText(dbg, n, (int(xs.min()), int(ys.min()) + 30), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
orig = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
cs = {}
for n, m in [('pink', parts['h'][1]), ('pinkl', parts['swirlhi'][1]), ('bak', parts['k0'][1]), ('skin', parts['hand'][1] & ~parts['handsh'][1] & ~parts['handln'][1]),
             ('skinsh', parts['handsh'][1]), ('ln', parts['handln'][1]), ('nail', parts['nail0'][1]), ('pist', parts['p0'][1]), ('gold', parts['ruleL'][1])]:
    m = cv2.erode(m.astype(np.uint8), disk(1)).astype(bool)
    if not m.any(): continue
    b, g, r = np.median(orig[m], 0); cs[n] = '#%02x%02x%02x' % (int(r), int(g), int(b))
bgm = box(20, 20, 180, 200); b, g, r = np.median(orig[bgm], 0); cs['bg'] = '#%02x%02x%02x' % (int(r), int(g), int(b))
print('colours', cs); meta['colours'] = cs; meta['size'] = [X1 - X0, Y1 - Y0]
res['_meta'] = meta
json.dump(res, open(os.path.join(HERE, 'parts.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug.png'), cv2.resize(dbg, None, fx=1 / S, fy=1 / S, interpolation=cv2.INTER_AREA))
print(len(res) - 1, 'parts', sum(len(v['d']) for k, v in res.items() if k != '_meta') // 1024, 'KB')
