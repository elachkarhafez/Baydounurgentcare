# Turn the Cycles PNG frames into the site's film frames: flatten the sweep's light falloff to the page colour
# (so the frame edges vanish into --film), then write media/film/fNN.webp and the hero still media/cup.webp.
# usage: python3 frames2web.py <png_dir> <site_dir>
import sys, os, glob
import numpy as np
from PIL import Image

src, site = sys.argv[1], sys.argv[2]
PAGE = np.array([239, 231, 217], float)
files = sorted(glob.glob(os.path.join(src, 'f_*.png')))
os.makedirs(os.path.join(site, 'media/film'), exist_ok=True)

def flatten(a):
    """divide out the backdrop: for every row, a + b*x + c*x^2 fitted to the frame's outer strips (smoothed down the frame)."""
    h, w, _ = a.shape; x = np.arange(w) / w - .5
    side = np.abs(x) > .33                                    # the cup and the pour stay in the middle
    X = np.c_[np.ones(side.sum()), x[side], x[side] ** 2]; P = np.linalg.pinv(X)
    F = np.c_[np.ones(w), x, x * x]
    k = np.ones(21) / 21
    out = np.empty_like(a)
    for c in range(3):
        ch = a[..., c]
        co = ch[:, side] @ P.T                                  # (h, 3)
        co = np.stack([np.convolve(np.pad(co[:, j], 10, mode='edge'), k, 'valid') for j in range(3)], 1)
        bg = co @ F.T
        out[..., c] = ch * PAGE[c] / np.maximum(bg, 1)
    # feather the outer edge into the page colour so no seam shows where the canvas zooms the frame
    ey = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h * .07), 0, 1)
    ex = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * .07), 0, 1)
    m = (ey[:, None] * ex[None, :]) ** .5
    return out * m[..., None] + PAGE * (1 - m[..., None])

for i, f in enumerate(files):
    a = np.asarray(Image.open(f).convert('RGB')).astype(float)
    o = Image.fromarray(np.clip(flatten(a), 0, 255).round().astype(np.uint8))
    o.save(os.path.join(site, 'media/film/f%02d.webp' % i), 'WEBP', quality=84, method=6)
    if i == len(files) - 1:
        w, h = o.size; cw, ch = int(w * .62), int(w * .62 * 1.25)       # the hero still: cropped in on the cup, same 4:5 shape
        x0, y0 = (w - cw) // 2, int(h * .61 - ch / 2)
        o.crop((x0, y0, x0 + cw, y0 + ch)).save(os.path.join(site, 'media/cup.webp'), 'WEBP', quality=88, method=6)
print(len(files), 'frames')
