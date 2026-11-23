"""Traces the Sip N' Coffee badge (their own logo, sip_n_logo_wood.png from sipncoffee.co, 420 px) into animatable parts.
Run with a PIL/scipy python:  python trace.py <logo.png> <out.json>
Mask = absolute ink threshold OR darkness against the local wood (keeps the thin lines), on a 4x upscale.
Parts: ring, arc, dotL, dotR, l0..l10 (SIP N' COFFEE, left to right), birds, steam, women, cart, sign, wheelL, wheelR, florL, florR.
Coordinates are in a 840 x 840 box (the badge centre is 420,420)."""
import numpy as np, subprocess, re, json, sys, tempfile, math
from PIL import Image, ImageFilter
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGBA')).astype(float)
lum = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11; inside = a[..., 3] > 128
lum = np.where(inside, lum, 255)
bgv = nd.median_filter(np.where(inside, lum, 175), size=11)
d = np.where(inside, np.clip(bgv - lum, 0, 255), 0)
def up(x): return np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((1680, 1680), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.0))).astype(float)
U, Dk = up(lum), up(d * 2)
m = (U < 112) | (Dk > 64)
m = nd.binary_closing(m, iterations=1)
lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1)); m = np.isin(lab, 1 + np.nonzero(sz >= 50)[0])
# faint steam: lower threshold just above the left cup
yy, xx = np.mgrid[0:1680, 0:1680]
steamBox = (xx > 780) & (xx < 880) & (yy > 585) & (yy < 760)
steam = steamBox & ((U < 150) | (Dk > 40)) & ~nd.binary_dilation(m & ~steamBox, iterations=2)
lab, n = nd.label(m); objs = nd.find_objects(lab)
part = np.zeros(m.shape, dtype='<U8')
C = 840.0
WL, WR, WRAD = (665, 1170), (1060, 1165), 106
inWL = (xx - WL[0]) ** 2 + (yy - WL[1]) ** 2 < WRAD ** 2
inWR = (xx - WR[0]) ** 2 + (yy - WR[1]) ** 2 < WRAD ** 2
letters = []
for i, o in enumerate(objs):
    k = i + 1; mm = lab == k; s = mm.sum(); ys, xs = np.nonzero(mm); cx, cy = xs.mean(), ys.mean()
    w, h = o[1].stop - o[1].start, o[0].stop - o[0].start
    r = math.hypot(cx - C, cy - C)
    if o[0].start < 66: continue                                     # speck outside the badge
    if w > 1400 and h > 1400: part[mm] = 'ring'; continue
    if w > 1200 and o[0].start > 900: part[mm] = 'arc'; continue
    if r > 500 and cy < 1000 and s < 300: continue
    if r > 500 and cy < 1000: letters.append((math.atan2(cy - C, cx - C), k)); continue
    if 860 < cx < 1040 and 395 < cy < 470: part[mm] = 'birds'; continue
    if 780 < cx < 880 and 585 < cy < 760 and s < 900: part[mm] = 'steam'; continue
    if 735 < o[1].start and o[1].stop < 1012 and 995 < o[0].start and o[0].stop < 1118: part[mm] = 'sign'; continue
    part[mm] = 'ill'
ill = part == 'ill'
part[ill & inWL] = 'wheelL'; part[ill & inWR] = 'wheelR'
rest = ill & ~inWL & ~inWR
leafL = (xx < 640) & (yy > 1040) & (yy < 1110) & ~nd.binary_dilation(inWL, iterations=6)
leafR = (xx > 1088) & (yy > 1035) & (yy < 1105) & ~nd.binary_dilation(inWR, iterations=6)
part[rest & ((xx < 562) | leafL) & (yy > 840)] = 'florL'
part[rest & ((xx > 1168) | leafR) & (yy > 840)] = 'florR'
rest = part == 'ill'
part[rest & (yy < 962) & (xx > 588) & (xx < 1128)] = 'women'
part[part == 'ill'] = 'cart'
arc = part == 'arc'
for nm, (dx, dy) in (('dotL', (196, 953)), ('dotR', (1489, 953))):
    disk = (xx - dx) ** 2 + (yy - dy) ** 2 < 26 ** 2
    part[arc & disk] = nm
part[steam & (part == '')] = 'steam'
letters.sort()
for j, (_, k) in enumerate(letters): part[lab == k] = 'l%d' % j
print('letters', len(letters))
tmp = tempfile.mkdtemp()
def conv(dstr, H):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', dstr); outp = []; cmd = None; first = True; idx = 0
    for t in toks:
        if t.isalpha(): cmd = t; outp.append(t); idx = 0; continue
        v = float(t)
        if cmd == 'M': v = v * .1 if idx % 2 == 0 else H - v * .1
        else: v = v * .1 if idx % 2 == 0 else -v * .1
        outp.append('%.1f' % (v / 2)); idx += 1
    return re.sub(r' (?=-)', '', ' '.join(outp)).replace(' M', 'M').replace(' c', 'c').replace(' l', 'l').replace(' m', 'm').replace(' z', 'z').replace('M ', 'M').replace('c ', 'c').replace('l ', 'l').replace('m ', 'm')
def trace(mask):
    Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '3', '-a', '1', '-O', '0.6', '--flat', '-o', tmp + '/m.svg'], check=True)
    s = open(tmp + '/m.svg').read()
    return conv(' '.join(re.findall(r' d="([^"]+)"', s)), 1680)
res = {}
for nm in sorted(set(part[part != ''].ravel())):
    res[nm] = trace(part == nm); print(nm, int((part == nm).sum()), len(res[nm]))
res['_wheels'] = {'wheelL': [WL[0] / 2, WL[1] / 2], 'wheelR': [WR[0] / 2, WR[1] / 2], 'r': WRAD / 2}
json.dump(res, open(out, 'w'))
# a light favicon trace (women + cart + wheels + sign at 1/4 resolution, coarse curves)
small = Image.fromarray((np.isin(part, ['women', 'cart', 'wheelL', 'wheelR', 'sign']) * 255).astype(np.uint8)).resize((420, 420), Image.LANCZOS)
sm = np.asarray(small) > 110
Image.fromarray(((~sm) * 255).astype(np.uint8)).convert('1').save(tmp + '/f.pbm')
subprocess.run(['potrace', tmp + '/f.pbm', '-b', 'svg', '-t', '6', '-a', '1.1', '-O', '1', '--flat', '-o', tmp + '/f.svg'], check=True)
fs = open(tmp + '/f.svg').read()
res['_fav'] = conv(' '.join(re.findall(r' d="([^"]+)"', fs)), 420)
res['_fav'] = re.sub(r'-?\d+\.\d', lambda mm: '%.1f' % (float(mm.group(0)) * 4), res['_fav'])  # 420 box -> 840 box
json.dump(res, open(out, 'w'))
print('fav', len(res['_fav']))
