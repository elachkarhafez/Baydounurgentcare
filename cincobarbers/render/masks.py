"""Debug: colour masks of the Cinco logo (srcimg/logo-square-1983.jpg, from their Square booking page brand assets).
Run: python3 -I masks.py <outdir>"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D = os.path.dirname(os.path.abspath(__file__)) + '/'
out = sys.argv[1]
im = Image.open(D + 'srcimg/logo-square-1983.jpg').convert('RGB')
a = np.asarray(im).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
L = a.mean(-1)
mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
masks = {
    'cream': (L > 150) & (sat < .22),
    'gold': (sat >= .22) & (r > 90) & (r > b * 1.25) & (g > b * 1.05) & (L > 55),
    'red': (r > 100) & (r > g * 1.8) & (r > b * 1.6),
    'blue': (b > 60) & (b > r * 1.4),
    'dark': (L > 30) & (L < 95) & (sat < .25),
}
for k, m in masks.items():
    Image.fromarray((m * 255).astype(np.uint8)).save(f'{out}/m_{k}.png')
    lab, n = nd.label(m)
    print(k, n)
