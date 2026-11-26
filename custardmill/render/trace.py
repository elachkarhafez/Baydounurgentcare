"""Trace The Custard Mill logo into separate SVG parts for the LED sign (intro + live hero sign), the nav lockup,
the favicon and the builder's bowl.
Source: srcimg/logo-tiktok-avatar-1080.jpg, the 1080px profile picture of their TikTok @custardmill (the largest clean
copy public: the Instagram avatar is 150px, custardmill.com is a parked domain, and neither account has posts yet).
Usage: /usr/bin/python3 -I trace.py   (needs cv2, numpy and the potrace CLI). Writes parts.json + debug.png here.
Coordinates are in the 1080 avatar's pixels.
Parts: e0..e3 'EST.', y0..y3 '2026', t0..t2 'THE', w0..w10 'CUSTARD MILL', f0..f12 'FROZEN CUSTARD',
dL/dR diamonds, ruleL/ruleR, tower (mill body + cap), sail (ONE blade, upper right, rotated x4 around the hub in the
page so the sails can turn), sails0 (the four original blades, for static logos), bowl (navy engraving),
cream (custard line art), creamFill (custard silhouette). The two rings are fitted circles (meta.ringO / meta.ringI)."""
import os, json, re, subprocess, tempfile
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
S = 4
src = cv2.imread(os.path.join(HERE, 'srcimg/logo-tiktok-avatar-1080.jpg'))
img = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
img = cv2.bilateralFilter(img, 9, 30, 9)
f = img.astype(np.float32)
B, G, R = f[..., 0], f[..., 1], f[..., 2]
lum = .299 * R + .587 * G + .114 * B
H, W = lum.shape
yy, xx = np.mgrid[0:H, 0:W]
o = lambda v: v * S

navy = (B - R > 35) & (lum < 205)
taupe = (R - B > 10) & (lum < 222) & ~navy

def comps(m, min_area):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    return [(st[i][0], st[i][1], st[i][2], st[i][3], lab == i) for i in range(1, n) if st[i][4] >= min_area]

def box(y0, y1, x0=0, x1=1080):
    return (yy >= o(y0)) & (yy < o(y1)) & (xx >= o(x0)) & (xx < o(x1))

def fitcircle(m):
    ys, xs = np.nonzero(m)
    A = np.c_[2 * xs, 2 * ys, np.ones(len(xs))]
    cx, cy, c = np.linalg.lstsq(A, xs ** 2 + ys ** 2, rcond=None)[0]
    r = np.sqrt(c + cx ** 2 + cy ** 2)
    d = np.hypot(xs - cx, ys - cy)
    return cx, cy, r, d

parts, meta = {}, {}
def add(name, col, m):
    if m.sum() < 20: return
    parts[name] = (col, m)

# rings: the navy outer ring and the taupe inner ring are the only full circles
for name, m in (('ringO', navy), ('ringI', taupe)):
    big = max(comps(m, 2000), key=lambda t: t[2] * t[3])[4]
    cx, cy, r, d = fitcircle(big)
    w = np.percentile(d, 95) - np.percentile(d, 5)
    meta[name] = [round(cx / S, 2), round(cy / S, 2), round(r / S, 2), round(w / S, 2)]
    dist = np.hypot(xx - cx, yy - cy)
    if name == 'ringO': navy &= ~(np.abs(dist - r) < w * .9)
    else: taupe &= ~(np.abs(dist - r) < w * .9)
print('rings', meta)

# EST. and 2026 (navy, y 275..315)
add('est', 'navy', navy & box(272, 318, 200, 420))
add('yr', 'navy', navy & box(272, 318, 680, 880))
# the rules either side of the mill
add('ruleL', 'taupe', taupe & box(330, 345, 200, 410))
add('ruleR', 'taupe', taupe & box(330, 345, 670, 880))
# THE
for i, c in enumerate(sorted(comps(taupe & box(405, 455, 440, 640), 10 * S * S), key=lambda t: t[0])): add(f't{i}', 'taupe', c[4])
# CUSTARD MILL
for i, c in enumerate(sorted(comps(navy & box(478, 612, 120, 960), 40 * S * S), key=lambda t: t[0])): add(f'w{i}', 'navy', c[4])
# FROZEN CUSTARD + diamonds
fz = sorted(comps(taupe & box(638, 690, 200, 880), 10 * S * S), key=lambda t: t[0])
add('dL', 'taupe', fz[0][4]); add('dR', 'taupe', fz[-1][4])
for i, c in enumerate(fz[1:-1]): add(f'f{i}', 'taupe', c[4])

# windmill: hub, tower, sails
mill = taupe & box(110, 385, 420, 660)
hub = (538.5, 213.5)
meta['hub'] = list(hub)
hx, hy = o(hub[0]), o(hub[1])
ang = np.degrees(np.arctan2(yy - hy, xx - hx))
rad = np.hypot(xx - hx, yy - hy)
R0 = o(8)
# each blade = mill pixels in a band around its axis (stock + lattice), beyond the hub; the cap (an ellipse round the
# hub) stays with the tower so the static logo keeps its hood
blades = {'UR': -41, 'UL': -139, 'LL': 136, 'LR': 42}
cap = ((xx - o(538)) / o(37)) ** 2 + ((yy - o(223)) / o(28)) ** 2 < 1
bl, band = {}, {}
for k, a in blades.items():
    ux, uy = np.cos(np.radians(a)), np.sin(np.radians(a))
    along = (xx - hx) * ux + (yy - hy) * uy
    perp = np.abs(-(xx - hx) * uy + (yy - hy) * ux)
    band[k] = mill & (along > R0) & (perp < o(27))
    bl[k] = band[k] & ~cap
# the tower keeps everything else (body, cap, the arm stubs at the hub); the lower blades must not eat the tower body,
# so drop from sails0 anything inside the tower trapezoid (top 520..560 at y 243, bottom 486..604 at y 380)
# the body is separated from the lower blades by a thin white gap in the drawing: below the cap, erode a little, take
# the component under the door, grow it back inside the mill
below = mill & (yy > o(238))
er = cv2.erode(below.astype(np.uint8), np.ones((5, 5), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(er, 4)
body = lab == lab[o(330), o(540)]
body = cv2.dilate(body.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & below
tower_zone = body
for k in bl: bl[k] &= ~tower_zone
sails0 = bl['UR'] | bl['UL'] | bl['LL'] | bl['LR']
add('tower', 'taupe', mill & ~sails0)
add('sails0', 'taupe', sails0)
add('sail', 'taupe', band['UR'] & ~tower_zone)
# blade angle (UR) for the rotated copies: principal axis of the blade pixels
ys, xs = np.nonzero(bl['UR'])
meta['sailAngle'] = round(float(np.degrees(np.arctan2(ys.mean() - hy, xs.mean() - hx))), 2)
for k in ('UL', 'LL', 'LR'):
    ys, xs = np.nonzero(bl[k]); meta['angle' + k] = round(float(np.degrees(np.arctan2(ys.mean() - hy, xs.mean() - hx))), 2)

# bowl (navy, y > 700) and custard
add('bowl', 'navy', navy & box(700, 1000, 380, 700))
creamInk = (lum < 224) & (R - B > -2) & ~navy & box(700, 905, 380, 700)
creamInk = cv2.morphologyEx(creamInk.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
add('cream', 'taupe', creamInk)
# custard silhouette: near-white area above the bowl rim, bounded by the outline; flood the background from outside
reg = box(700, 905, 380, 700)
bg = ((lum > 246) & reg).astype(np.uint8)
ink = (creamInk | (navy & reg)).astype(np.uint8)
ink = cv2.dilate(ink, np.ones((7, 7), np.uint8))
free = ((1 - ink) & reg.astype(np.uint8)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(free, 4)
# the outside is the component touching the region's top-left corner
outside = lab == lab[o(702), o(385)]
inside = reg & ~outside & ~(navy & yy > o(800))
inside = cv2.morphologyEx(inside.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
cs = comps(inside.astype(bool), 400 * S * S)
fill = max(cs, key=lambda t: t[4].sum())[4]
fill = cv2.morphologyEx(fill.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)).astype(bool)
add('creamFill', 'cream', fill)
# the bowl's inside (the dark rim interior) as a fill so the bowl reads solid on a dark plate
bowlArea = navy & box(790, 1000, 380, 700)
bowlFill = cv2.morphologyEx(bowlArea.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
contours, _ = cv2.findContours(bowlFill, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
bf = np.zeros_like(bowlFill); cv2.drawContours(bf, [max(contours, key=cv2.contourArea)], -1, 1, -1)
add('bowlFill', 'paper', bf.astype(bool))

def trace(mask, turd=3):
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
dbg = np.full((H, W, 3), 255, np.uint8)
pal = {'navy': (118, 69, 22), 'taupe': (113, 133, 151), 'cream': (200, 230, 245), 'paper': (235, 225, 225)}
for name in sorted(parts, key=lambda n: ('creamFill' not in n and 'bowlFill' not in n, n)):
    col, m = parts[name]
    ys, xs = np.nonzero(m)
    res[name] = {'c': col, 'd': trace(m, 1 if name in ('cream', 'bowl') else 3),
                 'box': [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)]}
    dbg[m] = pal[col]
for name in parts:
    ys, xs = np.nonzero(parts[name][1])
    cv2.putText(dbg, name, (int(xs.min()), int(ys.min()) - 6), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 255), 2)
res['_meta'] = meta
json.dump(res, open(os.path.join(HERE, 'parts.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug.png'), cv2.resize(dbg, None, fx=.3, fy=.3, interpolation=cv2.INTER_AREA))
print(len(parts), 'parts', sum(len(v['d']) for k, v in res.items() if k != '_meta') // 1024, 'KB', meta)
