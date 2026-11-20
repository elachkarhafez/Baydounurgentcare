# traces the Ulew Cafe mark (arch, sun rays, beans, mountains, waves) and the "Ulew Cafe" wordmark from their logo photo
import numpy as np, subprocess, re, json, sys, tempfile
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.array(im).astype(float) / 255
mx, mn = a.max(-1), a.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-6)
ink = (mx > .6) & (sat < .16)
H, W = ink.shape
tmp = tempfile.mkdtemp()
def trace(mask):
    Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '6', '-a', '1', '-O', '0.3', '--flat', '-o', tmp + '/m.svg'], check=True)
    s = open(tmp + '/m.svg').read()
    return {'t': re.search(r'<g transform="([^"]+)"', s).group(1), 'd': ' '.join(re.findall(r' d="([^"]+)"', s))}
yy, xx = np.mgrid[0:H, 0:W]
mark = ink & (xx > 560) & (xx < 1040) & (yy > 440) & (yy < 990)
mark = ndimage.binary_opening(mark, iterations=1)
lab, n = ndimage.label(mark); objs = ndimage.find_objects(lab)
parts = []
for i, o in enumerate(objs):
    m = lab == i + 1; s = m.sum()
    if s < 150: continue
    ys, xs = np.where(m); parts.append((s, xs.mean(), ys.mean(), xs.min(), xs.max(), ys.min(), ys.max(), i + 1))
parts.sort(reverse=True)
for p in parts: print([round(v) for v in p[:7]])
arch = parts[0]
res = {'arch': trace(lab == arch[-1]), 'rays': [], 'beans': [], 'mtn': [], 'waves': []}
ax0, ax1, ay0, ay1 = arch[3], arch[4], arch[5], arch[6]
for p in parts[1:]:
    s, cx, cy, x0, x1, y0, y1, k = p
    fy = (cy - ay0) / (ay1 - ay0); fx = (cx - ax0) / (ax1 - ax0)
    key = 'rays' if (fy < .3 and fx < .4) else 'beans' if fy < .45 else 'mtn' if fy < .78 else 'waves'
    res[key].append((cy, trace(lab == k)))
for k in ('rays', 'beans', 'mtn', 'waves'):
    res[k] = [t for _, t in sorted(res[k], key=lambda z: z[0])]
    print(k, len(res[k]))
ink2 = (mx > .58) & (sat < .3)
wm = ink2 & (yy > 975) & (yy < 1230) & (xx > 120) & (xx < 1480)
wm = ndimage.binary_opening(wm, iterations=1)
wm = ndimage.binary_closing(wm, iterations=3)
lab2, n2 = ndimage.label(wm); objs2 = ndimage.find_objects(lab2)
letters = []
for i, o in enumerate(objs2):
    m = lab2 == i + 1
    if m.sum() < 400: continue
    letters.append((o[1].start, trace(m)))
letters.sort(key=lambda z: z[0]); res['word'] = [t for _, t in letters]
print('letters', len(letters))
res['box'] = [int(ax0), int(ay0), int(ax1), int(ay1)]
json.dump(res, open(out, 'w'))
