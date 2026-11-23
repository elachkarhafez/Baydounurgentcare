"""Builds bravoshoes/media/*.webp from their own Instagram posts and reel frames (srcimg/, pulled from @bravo.shoes_).
Run with a PIL/numpy/opencv python:  python -I media.py
Crops follow the mobile rules (1:1, 3:4, 4:3). Hero photos also get a depth map (GrabCut subject mask, blurred, with a
floor ramp) packed into the alpha-free second file d-*.webp, which the WebGL hero uses for parallax and the spotlight."""
import os, subprocess
import numpy as np, cv2
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = D + '../srcimg/'
OUT = D + '../../media/'
os.makedirs(OUT, exist_ok=True)

def crop(name, ratio, cx=.5, cy=.5, zoom=1.0):
    im = Image.open(SRC + name).convert('RGB'); W, H = im.size
    if W / H > ratio: nh = H; nw = H * ratio
    else: nw = W; nh = W / ratio
    nw /= zoom; nh /= zoom
    x = min(max(cx * W - nw / 2, 0), W - nw); y = min(max(cy * H - nh / 2, 0), H - nh)
    return im.crop((int(x), int(y), int(x + nw), int(y + nh)))

def save(im, out, w, q=78):
    im = im.resize((w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(OUT + out, 'WEBP', quality=q, method=6)
    print(out, im.size, os.path.getsize(OUT + out) // 1024, 'KB')
    return im

def depth(im, rect, out, w=512):
    """subject near (white), room far (dark), floor rises toward the camera"""
    a = np.asarray(im.resize((w, w), Image.LANCZOS))[:, :, ::-1].copy()
    mask = np.zeros(a.shape[:2], np.uint8)
    r = tuple(int(v * w) for v in rect)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(a, mask, r, bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == 1) | (mask == 3), 1.0, 0.0)
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8))
    if n > 1:
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = (lab == k).astype(float)
    m = cv2.GaussianBlur(m, (0, 0), w * .018)
    yy = np.linspace(0, 1, w)[:, None] * np.ones((1, w))
    d = np.clip(.18 + .32 * yy ** 1.6 + .55 * m, 0, 1)
    Image.fromarray((d * 255).astype(np.uint8)).convert('RGB').save(OUT + out, 'WEBP', quality=82, method=6)
    print(out, os.path.getsize(OUT + out) // 1024, 'KB')

# ---- hero: three pairs, square, each with a depth map ----
h = save(crop('ankle.jpg', 1, .5, .56), 'h-ankle.webp', 900, 80); depth(h, (.2, .06, .62, .9), 'd-ankle.webp')
h = save(crop('knee.jpg', 1, .5, .5, 1.05), 'h-knee.webp', 900, 80); depth(h, (.12, .0, .8, .96), 'd-knee.webp')
h = save(crop('slipper-brown.jpg', 1, .5, .5), 'h-slipper.webp', 900, 80); depth(h, (.0, .06, 1.0, .9), 'd-slipper.webp')

# ---- the three takes from their clapperboard reel (same crop so the whip cut lines up) ----
for n, f in [('t1', 'v6_016.jpg'), ('t2', 'v6_020.jpg'), ('t3', 'v6_024.jpg')]:
    save(crop(f, 3 / 4, .5, .56), n + '.webp', 576, 80)
save(crop('v6_005.jpg', 3 / 4, .5, .52), 'clapper.webp', 540, 78)

# ---- the wall: every pair from the feed, 3:4 cards ----
for n, f, cx, cy, z in [('w-ankle', 'ankle.jpg', .5, .55, 1.0), ('w-knee', 'v2_009.jpg', .5, .55, 1.0),
                        ('w-knee2', 'v2_031.jpg', .5, .62, 1.0), ('w-brown', 'slipper-brown.jpg', .5, .5, 1.0),
                        ('w-sand', 'slipper-sand.jpg', .5, .6, 1.0), ('w-white', 'v4_018.jpg', .45, .5, 1.0),
                        ('w-black', 'v4_023.jpg', .5, .45, 1.0), ('w-matte', 'v6_039.jpg', .5, .45, 1.0),
                        ('w-suede', 'v6_031.jpg', .5, .5, 1.0), ('w-shiny', 'v6_042.jpg', .5, .5, 1.0)]:
    save(crop(f, 3 / 4, cx, cy, z), n + '.webp', 480, 76)

# ---- the bench they shoot on, and the four slippers lined up on it ----
save(crop('v4_001.jpg', 4 / 3, .5, .62), 'bench.webp', 720, 78)
save(crop('v4_007.jpg', 1, .5, .55), 'four.webp', 640, 78)
save(crop('v4_026.jpg', 1, .5, .55), 'fur.webp', 560, 76)
