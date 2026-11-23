"""Traces the Bravo Shoes monogram (their own Instagram profile picture, srcimg/profile.jpg, the sharpest copy public:
150 px, the gold BS is about 60 px of it) into animatable parts with potrace.
Run with a PIL/scipy python:  python -I trace.py   (writes blogo.json next to this file)
Parts, in a box of about 1000 x 970:
  B (stem, both bowls, the crescent swash under it), S (the big S), heel (the stiletto that drops off the top of the S),
  stars (the two sparkles left of the B), all (everything in one path, for the masked light sweep and strokes).
The pill and the tiny BRAVO SHOES caps under the mark are too small in the source to trace; the build draws the pill
at its measured place and sets the caps as type."""
import numpy as np, subprocess, re, json, os, tempfile
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()
K = 16                      # 16x work grid
BOX = (42, 36, 108, 100)    # crop of the 150 px profile picture around the mark
SC = 1.056                  # work px -> output units

def conv(dstr, H):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 / SC if idx % 2 == 0 else (H - v * .1) / SC
        else: v = v * .1 / SC if idx % 2 == 0 else -v * .1 / SC
        out.append('%.1f' % v); idx += 1
    s = ' '.join(out); s = re.sub(r' (?=-)', '', s)
    for c in 'MmCcLlZz': s = s.replace(' ' + c, c).replace(c + ' ', c)
    return s

def trace(mask, t=6, a=1.15, O=0.6):
    H = mask.shape[0]
    Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', str(t), '-a', str(a), '-O', str(O), '--flat', '-o', tmp + '/m.svg'], check=True)
    return conv(' '.join(re.findall(r' d="([^"]+)"', open(tmp + '/m.svg').read())), H)

src = Image.open(D + '../srcimg/profile.jpg').convert('RGB').crop(BOX)
w, h = src.size
U = np.asarray(src.resize((w * K, h * K), Image.BICUBIC)).astype(float)
ink = np.clip((248 - U[..., 2]) / (248 - 105), 0, 1)       # gold on white: the blue channel carries the ink
ink = nd.gaussian_filter(ink, K * .35)
m = ink > .56
m = nd.gaussian_filter(m.astype(float), K * .3) > .5
lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1))
order = 1 + np.argsort(-sz)
body = lab == order[0]
stars = [lab == k for k in order[1:3]]
stars.sort(key=lambda s: np.nonzero(s)[1].mean())

# split the body into B and S by growing two seed sets through the ink (view coords x2 = work grid)
yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
def box(x0, y0, x1, y1): return (xx >= x0 * 2) & (xx < x1 * 2) & (yy >= y0 * 2) & (yy < y1 * 2)
seedB = body & (box(122, 170, 150, 420) | box(66, 360, 100, 410) | box(160, 150, 200, 165))
seedS = body & (box(330, 220, 380, 260) | box(290, 50, 400, 80) | box(430, 350, 462, 400) | box(300, 456, 340, 472) | box(260, 120, 285, 170))
own = np.zeros(m.shape, np.uint8); own[seedB] = 1; own[seedS] = 2
st = nd.generate_binary_structure(2, 1)
for _ in range(900):
    free = body & (own == 0)
    if not free.any(): break
    gB = nd.binary_dilation(own == 1, st) & free
    gS = nd.binary_dilation(own == 2, st) & free & ~gB
    if not gB.any() and not gS.any(): break
    own[gB] = 1; own[gS] = 2
B = own == 1; S = own == 2
heel = S & box(392, 40, 470, 236)
S = S & ~heel
res = {'B': trace(B), 'S': trace(S), 'heel': trace(heel), 'stars': [trace(s) for s in stars], 'all': trace(m)}
ys, xs = np.nonzero(m)
res['box'] = [round(xs.min() / SC), round(ys.min() / SC), round(xs.max() / SC), round(ys.max() / SC)]
ys, xs = np.nonzero(heel)
res['heelTip'] = [round(xs[np.argmax(ys)] / SC), round(ys.max() / SC)]
# the pill under the mark in the profile picture spans x 51..102 px, y 104..110 px (measured off the source)
res["pill"] = [round((51 - BOX[0]) * K / SC), round((104 - BOX[1]) * K / SC), round(51 * K / SC), round(6.5 * K / SC)]
json.dump(res, open(D + 'blogo.json', 'w'))
print(res['box'], res['heelTip'], res['pill'], 'bytes', os.path.getsize(D + 'blogo.json'))
