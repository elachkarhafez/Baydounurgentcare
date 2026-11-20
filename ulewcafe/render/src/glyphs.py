# traces the five Mayan glyphs along the top of their "At Ulew Cafe" card
import numpy as np, subprocess, re, json, sys, tempfile
from PIL import Image
from scipy import ndimage
a = np.array(Image.open(sys.argv[1]).convert('L'))[:260].astype(float)
ink = a < 128
cols = ink.any(0); xs = np.where(cols)[0]
groups = []; s = xs[0]; p = xs[0]
for x in xs[1:]:
    if x - p > 40: groups.append((s, p)); s = x
    p = x
groups.append((s, p))
tmp = tempfile.mkdtemp(); out = []
for x0, x1 in groups:
    m = np.zeros_like(ink); m[:, x0:x1 + 1] = ink[:, x0:x1 + 1]
    ys = np.where(m.any(1))[0]
    Image.fromarray(((~m) * 255).astype(np.uint8)).convert('1').save(tmp + '/m.pbm')
    subprocess.run(['potrace', tmp + '/m.pbm', '-b', 'svg', '-t', '4', '--flat', '-o', tmp + '/m.svg'], check=True)
    sv = open(tmp + '/m.svg').read()
    out.append({'t': re.search(r'<g transform="([^"]+)"', sv).group(1), 'd': ' '.join(re.findall(r' d="([^"]+)"', sv)), 'box': [int(x0), int(ys[0]), int(x1), int(ys[-1])]})
print(len(out), [o['box'] for o in out])
json.dump(out, open(sys.argv[2], 'w'))
