"""Trace The Family Doc logo (srcimg/logo-mederva-banner.png: the crispest copy on thefamilydocmi.com,
the Family Doc x Mederva banner on /services/health-coaching/, logo ~572px wide on white)
into per-part SVG paths for the LED intro and the nav lockup.
Usage: python3 -I trace.py <outdir>   (needs cv2, numpy and the potrace CLI)
Writes <outdir>/parts.json ({part: {color, d}}), <outdir>/logo.svg and debug.png."""
import sys, os, json, re, subprocess, tempfile
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE
SCALE = 4  # upsample before thresholding for smoother curves

img = cv2.imread(os.path.join(HERE, 'srcimg/logo-mederva-banner.png'))  # BGR, white background
img = img[44:262, 52:634]  # the lockup sits at x 57..629, y 48..258
img = cv2.resize(img, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)
f = img.astype(np.float32)
B, G, R = f[..., 0], f[..., 1], f[..., 2]
NAVY = np.array([74, 48, 26], np.float32)   # #1a304a (BGR)
SKY = np.array([229, 173, 40], np.float32)  # #28ade5
WHITE = np.full(3, 255, np.float32)
d = lambda c: np.sqrt(((f - c) ** 2).sum(-1))
dn, ds, dk = d(NAVY), d(SKY), d(WHITE)
# nearest-colour classification; anti-aliased edges split at half coverage
sky = (ds < dk) & (ds < dn) & ((B - R) > 70)  # navy-on-white edges are bluish grey: keep them out of the sky layer
navy = (dn < dk) & (dn <= ds)
H, W = sky.shape
yy, xx = np.mgrid[0:H, 0:W]
s = SCALE

def comps(m, min_area):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    out = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a >= min_area: out.append((i, x, y, w, h, a, lab == i))
    return out

parts = {}
def add(name, color, m):
    if name in parts: parts[name] = (color, parts[name][1] | m)
    else: parts[name] = (color, m)

# --- tagline row (y > 183 in crop px) ---
tag_y = 183 * s
# sky shapes: bracket + stethoscope + tagline sky words
for (i, x, y, w, h, a, m) in comps(sky, 6 * s * s):
    if y >= tag_y - 3 * s:
        add('tagA', 'sky', m)  # WHERE YOU ARE
    elif w > 200 * s or (x < 35 * s and h > 50 * s) or (x > 540 * s):
        add('frame', 'sky', m)
    else:
        add('steth', 'sky', m)
# navy shapes: per-glyph components for The / Family / Doc and FAMILY
glyphs = []
for (i, x, y, w, h, a, m) in comps(navy, 5 * s * s):
    if y >= tag_y - 3 * s:
        add('tagB', 'navy', m)
    elif x < 100 * s and y + h < 60 * s:
        add('ear', 'navy', m)  # the navy ear tubes of the stethoscope
    elif w > 200 * s:
        # "Famil" is one touching run of serifs: cut it into letters at the thinnest columns
        col = m.sum(0).astype(float)
        cuts = [x]
        for guess in (95, 140, 213, 240):
            lo, hi = (guess - 12) * s, (guess + 12) * s
            cuts.append(lo + int(np.argmin(col[lo:hi])))
        cuts.append(x + w + 1)
        for a0, a1 in zip(cuts, cuts[1:]):
            mm = m & (xx >= a0 - 3) & (xx < a1 + 3)  # overlap the cut so no hairline seam shows
            ys_, xs_ = np.where(mm)
            glyphs.append((int(xs_.min()), int(ys_.min()), int(xs_.max() - xs_.min()), int(ys_.max() - ys_.min()), mm))
    else:
        glyphs.append((x, y, w, h, m))
# group components into letters: dots (i) merge with the stem below
glyphs.sort(key=lambda g: (0 if g[1] + g[3] < 100 * s else 1, g[0]))
letters = []
for g in glyphs:
    x, y, w, h, m = g
    if letters and h < 20 * s and w < 20 * s:  # tiny piece: dot of i, attach to nearest letter by x
        best = min(range(len(letters)), key=lambda k: abs((letters[k][0] + letters[k][2] / 2) - (x + w / 2)))
        L = letters[best]; letters[best] = (L[0], L[1], L[2], L[3], L[4] | m, L[5]); continue
    row = 'the' if y + h < 100 * s else 'fd'
    letters.append((x, y, w, h, m, row))
li = {'the': 0, 'fd': 0}
for (x, y, w, h, m, row) in sorted(letters, key=lambda L: (L[5] != 'the', L[0])):
    add(f'{row}{li[row]}', 'navy', m); li[row] += 1

def trace(mask):
    with tempfile.TemporaryDirectory() as td:
        pbm = os.path.join(td, 'm.pbm'); svg = os.path.join(td, 'm.svg')
        cv2.imwrite(pbm, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', str(4 * s * s), '-a', '1.0', '-O', '0.4', '-o', svg, pbm], check=True)
        t = open(svg).read()
    tr = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', t)
    tx, ty, sx, sy = map(float, tr.groups())
    k = 1.0 / s  # back to source pixels
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
            else:
                nums.append(float(tk))
        flush()
        out.append(''.join(res))
    path = ''.join(out)
    return re.sub(r'(?<=\d)\.0(?=[ a-zA-Z-]|$)', '', path).replace(' -', '-')

res = {}
for name, (color, m) in parts.items():
    ys, xs = np.where(m)
    res[name] = {'color': color, 'd': trace(m), 'bbox': [int(xs.min() / s), int(ys.min() / s), int(xs.max() / s), int(ys.max() / s)]}
json.dump(res, open(os.path.join(OUT, 'parts.json'), 'w'))
COL = {'navy': '#1a304a', 'sky': '#28aae1'}
paths = ''.join(f'<path id="{n}" fill="{COL[p["color"]]}" d="{p["d"]}"/>' for n, p in res.items())
open(os.path.join(OUT, 'logo.svg'), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 582 218">{paths}</svg>')
dbg = np.zeros((H, W, 3), np.uint8)
rng = np.random.default_rng(3)
for n, (c, m) in parts.items():
    dbg[m] = rng.integers(60, 255, 3)
    ys, xs = np.where(m)
    cv2.putText(dbg, n, (int(xs.min()), int(ys.min()) + 30), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (255, 255, 255), 3)
cv2.imwrite(os.path.join(OUT, 'debug.png'), cv2.resize(dbg, None, fx=1 / s, fy=1 / s))
print({n: (p['color'], len(p['d']), p['bbox']) for n, p in res.items()})
print('total path bytes', sum(len(p['d']) for p in res.values()))
