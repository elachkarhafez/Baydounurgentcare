"""Sip N' Coffee media: crops their own photos from sipncoffee.co into webp, and paints the light-oak table (their badge and
cart top are light wood). Run with a PIL/numpy python:  python media.py <site-img-dir>"""
import sys, os
import numpy as np
from PIL import Image, ImageOps, ImageFilter
SRC = sys.argv[1]
D = os.path.dirname(os.path.abspath(__file__)) + '/../../media/'
def load(f): return ImageOps.exif_transpose(Image.open(os.path.join(SRC, f))).convert('RGB')
def save(f, out, w, h, cx=.5, cy=.5, q=74):
    ImageOps.fit(load(f), (w, h), Image.LANCZOS, centering=(cx, cy)).save(D + out, quality=q, method=6)
    print(out, os.path.getsize(D + out) // 1024, 'KB')
# events gallery (square, ripple stage)
save('ss1.JPG', 'g-bride.webp', 800, 800, .55, .45)
save('ss4.JPG', 'g-couple.webp', 800, 800, .5, .55)
save('ss3.JPG', 'g-matcha.webp', 800, 800, .5, .6)
save('ss5.JPG', 'g-shop.webp', 800, 800, .5, .5)
save('img8.JPG', 'g-tree.webp', 800, 800, .5, .62)
save('img7.JPG', 'g-venue.webp', 800, 800, .5, .6)
# the duo + the craft
save('img1.JPG', 'duo.webp', 720, 960, .5, .4)
save('ss7.JPG', 'lit-cart.webp', 900, 900, .5, .5)
save('img6.JPG', 'shots.webp', 600, 600, .5, .45)
save('img4.JPG', 'grinder.webp', 600, 600, .5, .4)
save('img2.JPG', 'iced.webp', 600, 600, .5, .45)
save('img3.JPG', 'setup.webp', 600, 600, .5, .55)
save('img5.JPG', 'outdoors.webp', 900, 675, .5, .55)
save('ss6.JPG', 'skyline.webp', 1000, 750, .5, .38)
save('img2.JPG', 'hero-fallback.webp', 720, 720, .5, .45)
# light oak table: long grain lines (1D noise across the board, gently warped along it)
H, W = 1000, 1600
rng = np.random.RandomState(7)
def n1(n, s):
    return np.interp(np.arange(n), np.arange(0, n + s, s), rng.rand(n // s + 2)[:len(np.arange(0, n + s, s))])
def n2(h, w, s):
    a = rng.rand(h // s + 2, w // s + 2)
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((w + 2 * s, h + 2 * s), Image.BICUBIC)).astype(float)[s:s + h, s:s + w] / 255
N = 4000
prof = .45 * n1(N, 3) + .3 * n1(N, 9) + .25 * n1(N, 31)
lines = (n1(N, 2) > .93) * .5
prof = np.clip(prof ** 1.6 + lines, 0, 1)
y = np.arange(H)[:, None] + 1500 + (n2(H, W, 400) - .5) * 90 + (n2(H, W, 120) - .5) * 14
t = np.interp(y, np.arange(N), prof)
t = .8 * t + .2 * n2(H, W, 2) * (n2(H, W, 60) * .6 + .4)
c1, c2 = np.array([226, 205, 176]), np.array([184, 148, 110])
img = c1 * (1 - t[..., None]) + c2 * t[..., None]
img *= (1 - .07 * n2(H, W, 350))[..., None]
im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
im.save(D + 'oak.webp', quality=72, method=6); print('oak', os.path.getsize(D + 'oak.webp') // 1024, 'KB')
