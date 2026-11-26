"""Trace the Garden City Jewelry & Coin storefront sign (and the Tommy Platinum badge) into SVG paths.

Sign source: srcimg/storefront-site-1320.jpg, the storefront photo on gardencitycoin.com (1320x816, the largest clean
copy of the fascia sign: white channel letters 'GARDEN CITY  JEWELRY & COIN' on a navy fascia, 32555 Ford Rd).
The fascia is shot at an angle, so it is rectified with a homography (corners measured by eye on 3x crops) to
3450x300, where the O of COIN comes out as round as Montserrat's O. Each letter is one connected component,
traced with potrace on a 3x upscale. Writes sign.json: {letters:[{id,d,box}], w, h}.

Badge source: srcimg/tommy-badge-threads-320.jpg, the 320px profile picture served on their Threads profile
(the IG avatar is 150px). It is a flat cartoon badge, so it is k-means posterised into its flat inks and each ink
is traced as its own layer (stacked light to dark). Writes badge.json: {layers:[{fill,d}], w, h}.

Usage: /usr/local/bin/python3 -I trace.py   (cv2, numpy, potrace CLI). Also writes debug-sign.png / debug-badge.png."""
import os, json, re, subprocess, tempfile
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def potrace(mask, scale, turd=12, alpha=1.15):
    """mask True = ink. Returns path data in output units (pixels / scale)."""
    with tempfile.TemporaryDirectory() as td:
        pbm, svg = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(turd), '-a', str(alpha), '-O', '0.4', '-o', svg, pbm], check=True)
        t = open(svg).read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', t).groups())
    k = 1.0 / scale
    out = []
    for d in re.findall(r' d="([^"]+)"', t):
        toks = re.findall(r'[MmLlCcZz]|-?\d+(?:\.\d+)?', d)
        res, cmd, nums = [], None, []

        def flush():
            if cmd is None:
                return
            if cmd == 'M':
                pts = [f'{(tx + sx * nums[j]) * k:.1f} {(ty + sy * nums[j + 1]) * k:.1f}' for j in range(0, len(nums), 2)]
            else:
                pts = [f'{sx * nums[j] * k:.1f} {sy * nums[j + 1] * k:.1f}' for j in range(0, len(nums), 2)]
            res.append(cmd + ' '.join(pts))
        for tk in toks:
            if tk in 'MmLlCcZz':
                flush(); cmd, nums = tk, []
                if tk in 'Zz':
                    res.append('z'); cmd = None
            else:
                nums.append(float(tk))
        flush()
        out.append(''.join(res))
    return re.sub(r'(?<=\d)\.0(?=[ a-zA-Z-]|$)', '', ''.join(out)).replace(' -', '-')


# ---------------- sign ----------------
im = cv2.imread(os.path.join(HERE, 'srcimg/storefront-site-1320.jpg'))
SRC = np.float32([[33, 241], [1285, 319], [1286, 427], [33, 402]])
W, H = 3450, 300
M = cv2.getPerspectiveTransform(SRC, np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
S = 3
big = cv2.warpPerspective(im, M @ np.diag([1, 1, 1]), (W, H), flags=cv2.INTER_LANCZOS4)
big = cv2.resize(big, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
big = cv2.bilateralFilter(big, 9, 30, 9)
lum = cv2.GaussianBlur(big.astype(np.float32).mean(-1), (0, 0), 2.6)
face = (lum > 88).astype(np.uint8)  # letter faces read 140-185, the fascia 10-30
face = cv2.morphologyEx(face, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
# fill speckle holes (glare, JPEG) but keep real counters (A, R, D, O, &: all > 2500 px at this scale)
hn, hl, hs, _ = cv2.connectedComponentsWithStats(1 - face, 4)
for i in range(1, hn):
    if hs[i][4] < 1400:
        face[hl == i] = 1
n, lab, st, _ = cv2.connectedComponentsWithStats(face, 8)
comps = sorted([(st[i][0], st[i][1], st[i][2], st[i][3], i) for i in range(1, n) if st[i][4] > 900 * S * S // 9 and st[i][0] < 3400 * S], key=lambda t: t[0])
small = [c for c in comps if c[3] < 130 * S]
large = [c for c in comps if c[3] >= 130 * S]
top = sorted([c for c in small if c[1] < 120 * S], key=lambda t: t[0])
bot = sorted([c for c in small if c[1] >= 120 * S], key=lambda t: t[0])
print('GARDEN', len(top), 'CITY', len(bot), 'JEWELRY&COIN', len(large))
names = [f'g{i}' for i in range(len(top))] + [f'c{i}' for i in range(len(bot))]
lnames = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'amp', 'k0', 'k1', 'k2', 'k3'][:len(large)]
letters = []
dbg = cv2.cvtColor(np.where(face > 0, 255, 0).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for name, c in list(zip(names, top + bot)) + list(zip(lnames, large)):
    x, y, w, h, i = c
    m = lab == i
    # close pin-holes but keep counters (A, R, D, O, &)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
    letters.append({'id': name, 'd': potrace(m, S, turd=40, alpha=1.0), 'box': [round(x / S, 1), round(y / S, 1), round((x + w) / S, 1), round((y + h) / S, 1)]})
    cv2.putText(dbg, name, (x, y + 30), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
json.dump({'w': W, 'h': H, 'letters': letters}, open(os.path.join(HERE, 'sign.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug-sign.png'), cv2.resize(dbg, None, fx=.2, fy=.2, interpolation=cv2.INTER_AREA))
print('sign', len(letters), 'letters', sum(len(l['d']) for l in letters) // 1024, 'KB')

# ---------------- badge ----------------
a = cv2.imread(os.path.join(HERE, 'srcimg/tommy-badge-threads-320.jpg'))
BS = 5
A = cv2.resize(a, None, fx=BS, fy=BS, interpolation=cv2.INTER_CUBIC)
A = cv2.bilateralFilter(A, 9, 45, 9)
A = cv2.bilateralFilter(A, 9, 45, 9)
INKS = {  # flat inks of the badge (sampled by k-means on the 320px avatar), stacked in this order
    'white': (0xfd, 0xfe, 0xfe), 'rayl': (0xc3, 0xce, 0xdb), 'skin': (0xf3, 0xbb, 0x90), 'cash': (0x8f, 0xc9, 0x7a),
    'grey': (0x8e, 0x9c, 0xa5), 'blue': (0x3c, 0x58, 0x9b), 'green': (0x0d, 0x63, 0x3c), 'shirt': (0x35, 0x34, 0x3c),
    'black': (0x08, 0x08, 0x09)}
cols = np.array([v[::-1] for v in INKS.values()], np.float32)
f = A.astype(np.float32)
lab_img = cv2.cvtColor(A, cv2.COLOR_BGR2LAB).astype(np.float32)
cols_lab = cv2.cvtColor(cols.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
dist = ((lab_img[:, :, None, :] - cols_lab[None, None]) ** 2).sum(-1)
idx = dist.argmin(-1)
bh, bw = idx.shape
yy, xx = np.mgrid[0:bh, 0:bw]
inside = np.hypot(xx - bw / 2, yy - bh / 2) < bw * .49
# the cash ink only lives in the bills in his hand; elsewhere (his stubble) that match is the grey ink
order0 = list(INKS)
billbox = (xx > 180 * BS) & (xx < 228 * BS) & (yy > 80 * BS) & (yy < 128 * BS)
idx[(idx == order0.index('cash')) & ~billbox] = order0.index('grey')
# green is only the PAWN banner; a dark green match above it is his goatee shading
idx[(idx == order0.index('green')) & (yy < 215 * BS)] = order0.index('shirt')
# grey outside his face is only anti-aliasing between the black outlines and white: drop it, then a mode-ish
# median removes the 1px fringes left by JPEG edges
face_box = (xx > 120 * BS) & (xx < 190 * BS) & (yy > 40 * BS) & (yy < 118 * BS)
idx[(idx == order0.index('grey')) & ~face_box] = order0.index('white')
idx = cv2.medianBlur(idx.astype(np.uint8), 7).astype(np.int64)
layers = []
dbgb = np.zeros_like(A)
order = list(INKS)
for k, name in enumerate(order):
    if name == 'white':
        continue
    m = (idx == k) & inside
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    if name not in ('black',):
        m = cv2.dilate(m, np.ones((3, 3), np.uint8))  # tiny overlap so stacked layers leave no hairline gaps
    if m.sum() < 60:
        continue
    r, g, b = INKS[name]
    layers.append({'id': name, 'fill': '#%02x%02x%02x' % (r, g, b), 'd': potrace(m.astype(bool), BS, turd=30, alpha=1.0)})
    dbgb[m > 0] = cols[k]
json.dump({'w': 320, 'h': 320, 'layers': layers}, open(os.path.join(HERE, 'badge.json'), 'w'))
cv2.imwrite(os.path.join(HERE, 'debug-badge.png'), cv2.resize(dbgb, (640, 640), interpolation=cv2.INTER_AREA))
print('badge', len(layers), 'layers', sum(len(l['d']) for l in layers) // 1024, 'KB')
