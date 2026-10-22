# Ridgecoat concept: shift the path-traced roller's red paint to the brand teal (only saturated reds move;
# chrome, black handle and the soft wall shadow keep their colour).
# usage: python3 recolor.py <roll_dir> [target_hue_deg]
import sys, glob, colorsys
import numpy as np
from PIL import Image
D = sys.argv[1]; TARGET = (float(sys.argv[2]) if len(sys.argv) > 2 else 172) / 360
for f in sorted(glob.glob(D + '/r*.webp')):
    im = Image.open(f).convert('RGBA'); a = np.array(im).astype(np.float32) / 255
    rgb = a[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-6)
    hsv = np.array(Image.fromarray((rgb * 255).astype(np.uint8)).convert('HSV')).astype(np.float32) / 255
    h = hsv[..., 0]
    red = ((h < .07) | (h > .93)) & (sat > .3)
    w = np.clip((sat - .3) / .2, 0, 1) * red
    hsv2 = hsv.copy(); hsv2[..., 0] = np.where(red, TARGET, h); hsv2[..., 2] = np.where(red, hsv[..., 2] * .78, hsv[..., 2])
    rgb2 = np.array(Image.fromarray((hsv2 * 255).astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32) / 255
    out = rgb * (1 - w[..., None]) + rgb2 * w[..., None]
    res = np.dstack([out, a[..., 3]])
    Image.fromarray((res * 255).clip(0, 255).astype(np.uint8), 'RGBA').save(f, 'WEBP', quality=84, method=6)
print('ok')
