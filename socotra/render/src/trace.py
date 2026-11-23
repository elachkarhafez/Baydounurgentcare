"""Traces the Socotra Coffee House logo (their own files from socotracoffeehouse.com) into animatable parts.
Run with a PIL/scipy python:  python trace.py  (reads ../srcimg/, writes slogo.json next to this file)
Mark parts come from logo-mark.png (500 px, transparent), in a 1000 x 1000 box:
  canopy (fitted ellipse), branches (the light branch work inside the canopy), steamA/steamB, trunk strands,
  cup (arc + handle + saucer swoosh).
Wordmark parts come from logo-lockup.png (322 x 365), in a 966 x 1095 box (src x3):
  letters of 'Socotra' left to right (connected pieces), and COFFEE HOUSE letters."""
import numpy as np, subprocess, re, json, os, tempfile
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
tmp = tempfile.mkdtemp()

def conv(dstr, H, k):
    # potrace (unit 10, flipped) -> absolute-start, relative path in our box: x*0.1/k, y flipped
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); out = []; cmd = None; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; out.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 / k if idx % 2 == 0 else (H - v * .1) / k
        else: v = v * .1 / k if idx % 2 == 0 else -v * .1 / k
        out.append('%.1f' % v); idx += 1
    s = ' '.join(out)
    s = re.sub(r' (?=-)', '', s)
    for c in 'MmCcLlZz': s = s.replace(' ' + c, c).replace(c + ' ', c)
    return s

def trace(mask, k, t=4, a=1.0, O=0.8, sm=2.0):
    H = mask.shape[0]
    if sm: mask = nd.gaussian_filter(mask.astype(float), sm) > .5  # smooth the jaggies the source's dark outline leaves
    Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', str(t), '-a', str(a), '-O', str(O), '--flat', '-o', tmp + '/m.svg'], check=True)
    s = open(tmp + '/m.svg').read()
    return conv(' '.join(re.findall(r' d="([^"]+)"', s)), H, k)

res = {}
# ---------------- the mark ----------------
K = 4  # 500 px source -> 2000 px work grid; output box 1000 => divide by 2
a = np.asarray(Image.open(D + '../srcimg/logo-mark.png').convert('RGBA')).astype(float)
U = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((2000, 2000), Image.BICUBIC)).astype(float)
lum = U[..., 0] * .3 + U[..., 1] * .59 + U[..., 2] * .11; al = U[..., 3]
yy, xx = np.mgrid[0:2000, 0:2000]
shape = (al > 128) & (lum > 100)
# canopy ellipse: fit from the opaque rows between the steam and the trunk, left of the handle
op = al > 128
rows = range(620, 960)
w = []
for y in rows:
    xs = np.nonzero(op[y, :1700])[0]
    if len(xs): w.append((xs.max() - xs.min(), y, xs.min(), xs.max()))
wm, ymid, x0, x1 = max(w)
cx = (x0 + x1) / 2; rx = (x1 - x0) / 2
xq = int(cx - rx * .5)
ytop = np.nonzero(op[400:900, xq])[0].min() + 400
ry = (ymid - ytop) / np.sqrt(.75)
print('canopy', cx / 2, ymid / 2, rx / 2, ry / 2)
res['canopy'] = [round(cx / 2, 1), round(ymid / 2, 1), round(rx / 2, 1), round(ry / 2, 1)]
inE = ((xx - cx) / rx) ** 2 + ((yy - ymid) / ry) ** 2
canopy = inE < 1.0
br = (lum > 212) & (inE < .94) & (al > 128)
br = nd.binary_opening(br, iterations=1)
lab, n = nd.label(br); sz = nd.sum(br, lab, range(1, n + 1)); br = np.isin(lab, 1 + np.nonzero(sz >= 60)[0])
res['branches'] = trace(br, 2, sm=1.2)
# steam: two flames above the canopy
st = shape & (yy < ymid - ry * .92) & ~canopy
lab, n = nd.label(st); sz = nd.sum(st, lab, range(1, n + 1)); big = 1 + np.argsort(-sz)[:2]
fl = sorted(big, key=lambda k: np.nonzero(lab == k)[1].mean())
res['steam'] = [trace(nd.binary_fill_holes(nd.binary_closing(lab == k, iterations=3)), 2) for k in fl]  # flames are solid
# below the canopy: cup vs trunk by connected pieces of a strict mask, then grow to the full shape
strict = (al > 140) & (lum > 150) & ~canopy & (yy > ymid)
lab, n = nd.label(strict); sz = nd.sum(strict, lab, range(1, n + 1)); order = 1 + np.argsort(-sz)
cupk = order[0]
# the trunk zone: between the cup walls and above the cup's bottom arc (view coords x2 on the work grid)
vx, vy = xx / 2, yy / 2
tz = (vx > 285) & (vx < 625) & (vy > 505) & (vy < 802 - .00215 * (vx - 460) ** 2)
cupm = (lab == cupk) & ~tz
# handle + rim tip sit above the canopy centre line on the right
cupm |= shape & ~canopy & (xx > 1600) & (yy > ymid - 200)
trunk_seed = (np.isin(lab, order[1:6]) | ((lab > 0) & tz)) & ~cupm
seed = np.zeros(shape.shape, int); seed[cupm] = 1; seed[trunk_seed] = 2
dist, (iy, ix) = nd.distance_transform_edt(seed == 0, return_indices=True)
near = seed[iy, ix]
below = shape & ~canopy & (yy > ymid) & (dist < 10)
cupF = (below & (near == 1)) | (shape & ~canopy & (xx > 1600) & (yy > ymid - 200))
trF = below & (near == 2) & ~cupF
def fill_small(m, lim):
    h = nd.binary_fill_holes(m) & ~m; hl, hn = nd.label(h); hs = nd.sum(h, hl, range(1, hn + 1))
    return m | np.isin(hl, 1 + np.nonzero(hs < lim)[0])
cupF = fill_small(nd.binary_closing(cupF, iterations=3), 400)
lab, n = nd.label(cupF); sz = nd.sum(cupF, lab, range(1, n + 1)); cupF = np.isin(lab, 1 + np.nonzero(sz >= 200)[0])
# trunk strands: keep the dark grooves between them (stricter light threshold), close only pinholes
trF = trF & (lum > 172) & (lum > nd.gaussian_filter(lum, 7) - 18)
trF = nd.binary_opening(trF, iterations=1)
holes = nd.binary_fill_holes(trF) & ~trF; hl, hn = nd.label(holes); hs = nd.sum(holes, hl, range(1, hn + 1))
trF |= np.isin(hl, 1 + np.nonzero(hs < 40)[0])
res['cup'] = trace(cupF, 2)
lab, n = nd.label(trF); sz = nd.sum(trF, lab, range(1, n + 1))
keep = [k + 1 for k in range(n) if sz[k] >= 300]
keep.sort(key=lambda k: np.nonzero(lab == k)[1].mean())
res['trunk'] = [trace(lab == k, 2) for k in keep]
print('trunk pieces', len(keep), 'steam', len(res['steam']))
# the trunk where it meets the canopy (for the intro's growth origin)
ty = np.nonzero(trF.any(1))[0]; res['trunkTop'] = round(ty.min() / 2, 1); res['trunkBot'] = round(ty.max() / 2, 1)

# ---------------- the wordmark ----------------
b = np.asarray(Image.open(D + '../srcimg/logo-lockup.png').convert('RGBA')).astype(float)
S = 8
Wb = np.asarray(Image.fromarray(b.astype(np.uint8)).resize((b.shape[1] * S, b.shape[0] * S), Image.BICUBIC)).astype(float)
wl = Wb[..., 0] * .3 + Wb[..., 1] * .59 + Wb[..., 2] * .11; wa = Wb[..., 3]
wy, wx = np.mgrid[0:Wb.shape[0], 0:Wb.shape[1]]
wm = (wa > 110) & (wl > 70)
wm = nd.binary_closing(wm, iterations=1)
yS0, yS1, yC0 = 232 * S, 322 * S, 323 * S
script = wm & (wy > yS0) & (wy < yC0)
lab, n = nd.label(script)
for k in range(1, n + 1):  # drop the saucer swoosh that dips into this band
    if np.nonzero(lab == k)[0].max() < 262 * S: script[lab == k] = False
cuts = [0, 91, 127, 166, 201, 245, 272, 400]  # letter boundaries (src px) read off the column ink profile
res['script'] = []; res['scriptX'] = []
for i in range(len(cuts) - 1):
    mm = script & (wx >= cuts[i] * S) & (wx < cuts[i + 1] * S)
    res['script'].append(trace(mm, S / 3, t=6))
    res['scriptX'].append(round(np.nonzero(mm)[1].mean() / S * 3, 1))
res['scriptAll'] = trace(script, S / 3, t=6)
ks = res['script']
caps = wm & (wy >= yC0)
lab, n = nd.label(caps); sz = nd.sum(caps, lab, range(1, n + 1))
kc = [k + 1 for k in range(n) if sz[k] >= 150]
kc.sort(key=lambda k: np.nonzero(lab == k)[1].min())
res['caps'] = [trace(lab == k, S / 3, t=6) for k in kc]
print('script pieces', len(ks), 'caps', len(kc))
# bbox of the wordmark in the 966 box
ys, xs = np.nonzero(wm & (wy > yS0))
res['wordBox'] = [round(xs.min() / S * 3), round(ys.min() / S * 3), round(xs.max() / S * 3), round(ys.max() / S * 3)]
# where the mark sits in the lockup (966 box): opaque bbox above the script
ys, xs = np.nonzero((wa > 110) & (wy < yS0))
res['markBox'] = [round(xs.min() / S * 3), round(ys.min() / S * 3), round(xs.max() / S * 3), round(ys.max() / S * 3)]
ys, xs = np.nonzero(shape | canopy)
res['markSrc'] = [round(xs.min() / 2), round(ys.min() / 2), round(xs.max() / 2), round(ys.max() / 2)]
print(res['wordBox'], res['markBox'], res['markSrc'])
json.dump(res, open(D + 'slogo.json', 'w'))
print('bytes', os.path.getsize(D + 'slogo.json'))
