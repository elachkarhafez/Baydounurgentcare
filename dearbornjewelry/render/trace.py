"""Trace the Dearborn Jewelry & Gold Factory logo into per-part SVG paths for the LED sign intro, the live sign
and the nav lockup.
Source: srcimg/logo-tiktok-avatar-1080.jpg, the 1080px profile picture of their TikTok @dearborn_jewelry (the
largest clean copy public: the IG avatar is 150px and dearbornjewelry.com is a parked domain). The same mark is
stamped in gold on their mauve display trays (srcimg/google-mesh-bangles.jpg).
Usage: /usr/bin/python3 trace.py   (needs cv2, numpy and the potrace CLI). Writes parts.json + debug.png here.
Parts (coordinates in crop pixels; the crop is x 30..1060, y 230..705 of the 1080 avatar):
  ring (gold circle), gem (the diamond), hook (black ring wire), d (script D), ribL/ribR (gold flourishes),
  arL (ديربورن), arR (مجوهرات), w0..w7 DEARBORN, j0..j6 JEWELRY, amp (&), g0..g3 GOLD, f0..f6 FACTORY."""
import os, json, re, subprocess, tempfile
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
X0, Y0, X1, Y1 = 30, 230, 1060, 705
S = 4
src = cv2.imread(os.path.join(HERE, 'srcimg/logo-tiktok-avatar-1080.jpg'))[Y0:Y1, X0:X1]
img = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
img = cv2.bilateralFilter(img, 9, 40, 9)
f = img.astype(np.float32)
B, G, R = f[..., 0], f[..., 1], f[..., 2]
mx, mn = f.max(-1), f.min(-1)
lum = .299 * R + .587 * G + .114 * B
sat = (mx - mn) / (mx + 1)
H, W = lum.shape
yy, xx = np.mgrid[0:H, 0:W]
o = lambda v: v * S  # crop px -> big px

fg = (lum < 222) | ((sat > .22) & (lum < 242))
gold = fg & (R - B > 32) & (mx > 85)
ink = fg & ~gold
gemBox = (xx > o(590)) & (xx < o(655)) & (yy > o(45)) & (yy < o(105))
gem = gemBox & (lum < 246) & (lum > 92) & ~gold & ((B - R) > -6)
gem = cv2.morphologyEx(gem.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)).astype(bool)
ink &= ~gem

# ring: fit a circle to gold pixels in the mark area (the ring is the only big round gold shape)
cand = gold & (xx > o(340)) & (xx < o(700)) & (yy < o(250))
ys, xs = np.nonzero(cand)
A = np.c_[2 * xs, 2 * ys, np.ones(len(xs))]
cx, cy, c = np.linalg.lstsq(A, xs ** 2 + ys ** 2, rcond=None)[0]
rad = np.sqrt(c + cx ** 2 + cy ** 2)
dist = np.hypot(xx - cx, yy - cy)
ring = gold & (np.abs(dist - rad) < o(6.5))
print('ring centre', cx / S + X0, cy / S + Y0, 'r', rad / S)

parts = {}
def add(name, col, m):
    if m.sum() < 30: return
    parts[name] = (col, m)

def comps(m, min_area):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    return [(st[i][0], st[i][1], st[i][2], st[i][3], lab == i) for i in range(1, n) if st[i][4] >= min_area]

add('ring', 'gold', ring)
add('gem', 'gem', gem)
markX = (o(330), o(735))
rest = gold & ~ring
arL = rest & (xx < markX[0]) & (yy < o(260))
arR = rest & (xx > markX[1]) & (yy < o(260))
add('arL', 'gold', arL); add('arR', 'gold', arR)
rib = rest & (xx >= o(300)) & (xx <= o(770)) & (yy > o(200)) & (yy < o(325))
add('ribL', 'gold', rib & (xx < cx)); add('ribR', 'gold', rib & (xx >= cx))

# wordmark rows (crop y): DEARBORN 330..372, JEWELRY & 375..420, GOLD FACTORY 422..470
def letters(y0, y1):
    sub = fg & (yy >= o(y0)) & (yy < o(y1))
    sub = cv2.morphologyEx(sub.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    cs = sorted(comps(sub, 8 * S * S), key=lambda t: t[0])
    out = []
    for (x, y, w, h, mm) in cs:
        isg = np.median((R - B)[mm & fg]) > 28
        out.append(('gold' if isg else 'ink', mm))
    return out
row1, row2, row3 = letters(325, 374), letters(374, 422), letters(422, 475)
for i, (c, m) in enumerate(row1): add(f'w{i}', c, m)
for i, (c, m) in enumerate([r for r in row2 if r[0] == 'gold']): add(f'j{i}', 'gold', m)
for c, m in row2:
    if c == 'ink': add('amp', 'ink', m)
for i, (c, m) in enumerate([r for r in row3 if r[0] == 'gold']): add(f'g{i}', 'gold', m)
for i, (c, m) in enumerate([r for r in row3 if r[0] == 'ink']): add(f'f{i}', 'ink', m)
nW, nJ, nG, nF = len(row1), sum(r[0] == 'gold' for r in row2), sum(r[0] == 'gold' for r in row3), sum(r[0] == 'ink' for r in row3)
print('letters', nW, nJ, nG, nF)
# mark: hook wire (right of ring, top) and the D (inside)
markInk = ink & (yy < o(265)) & (xx > o(330)) & (xx < o(780))
hook = markInk & (xx > o(655)) & (yy < o(130))
add('hook', 'ink', hook)
add('d', 'ink', markInk & ~hook)

def trace(mask):
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(3 * S * S), '-a', '1.1', '-O', '0.4', '-o', svg, pbm], check=True)
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
pal = {'gold': (60, 160, 200), 'ink': (30, 30, 30), 'gem': (220, 170, 120)}
for name, (col, m) in parts.items():
    ys, xs = np.nonzero(m)
    res[name] = {'c': col, 'd': trace(m), 'box': [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)]}
    dbg[m] = pal[col]
    cv2.putText(dbg, name, (int(xs.min()), int(ys.min()) - 6), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
res['_meta'] = {'w': X1 - X0, 'h': Y1 - Y0, 'ring': [round(cx / S, 1), round(cy / S, 1), round(rad / S, 1)]}
json.dump(res, open(os.path.join(HERE, 'parts.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug.png'), cv2.resize(dbg, None, fx=.35, fy=.35, interpolation=cv2.INTER_AREA))
print(len(parts), 'parts', sum(len(v['d']) for k, v in res.items() if k != '_meta') // 1024, 'KB')
