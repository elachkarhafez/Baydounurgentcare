"""Builds rawansweets/media/*.webp from their own Instagram posts and reel frames (srcimg/, pulled from @rawansweets1).
Run with a PIL/opencv python:  python3 -I media.py
Trays: the three trays on their cart, flattened to a top view with a homography off each tray's corners so they can lie
on the drawn cart top. Everything else is a straight crop. Nothing here is invented or generated."""
import os, cv2, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = D + '../srcimg/'
OUT = D + '../../media/'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'): os.remove(OUT + f)

def save(im, out, w, q=80):
    if isinstance(im, np.ndarray): im = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
    w = min(w, im.size[0])
    im = im.resize((w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(OUT + out, 'WEBP', quality=q, method=6)
    print(out, im.size, os.path.getsize(OUT + out) // 1024, 'KB')

def flat(name, quad, W, H, ext=(0, 0, 0, 0)):
    im = cv2.imread(SRC + name)
    M = cv2.getPerspectiveTransform(np.float32(quad), np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
    l, t, r, b = ext
    T = np.float32([[1, 0, l], [0, 1, t], [0, 0, 1]])
    return cv2.warpPerspective(im, T @ M, (W + l + r, H + t + b), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

# tiramisu: their Fordson reel at 12 s, cocoa top with the TIRAMISU stencil (far corner + two tray edges)
t = flat('tray-tiramisu-src.jpg', [[495, 620], [715, 690], [194, 912], [45, 812]], 500, 600, (60, 30, 560, 500))
save(t[190:680, 30:900], 'tray-tiramisu.webp', 760)
# chocolate caramel: the cake-cart reel at 14 s, the whole tray seen from the end, cut into squares
c = flat('tray-choc-src.jpg', [[108, 662], [470, 624], [585, 1040], [-5, 1095]], 420, 640)
c = cv2.rotate(c, cv2.ROTATE_90_COUNTERCLOCKWISE)[12:-12, 14:-14]
save(c, 'tray-choc.webp', 760)
# berry cake: the cake-cart reel at 18 s, strawberries, blueberries and blackberries on cream (camera already looks down)
b = cv2.imread(SRC + 'tray-berry-src.jpg')[890:1280, 0:720]
save(b, 'tray-berry.webp', 760)

def crop(name, box, out, w, q=80):
    im = Image.open(SRC + name).convert('RGB').crop(box); save(im, out, w, q)
crop('cart-fordson.jpg', (0, 300, 816, 1388), 'p-cart.webp', 720)          # the cart set up at Fordson High
crop('bites.jpg', (0, 330, 1080, 1080), 'p-bites.webp', 720)               # Tiramisu Bites post
crop('cake.jpg', (0, 0, 1080, 1440), 'p-cake.webp', 720)                   # Baby Mohammad's first birthday cake
crop('cake-close.jpg', (0, 100, 576, 868), 'p-cake2.webp', 576)
crop('cup-tiramisu.jpg', (160, 360, 680, 880), 'p-cup.webp', 520)           # a cup of tiramisu, scooped
crop('cup-choc.jpg', (285, 345, 645, 705), 'p-cupc.webp', 360)              # a cup of chocolate caramel
crop('scoop.jpg', (60, 650, 700, 1130), 'p-scoop.webp', 640)                # the gold spoon going into the tiramisu
crop('cups.jpg', (280, 0, 720, 587), 'p-cups.webp', 440)                    # their cups with the RS sticker
crop('stand.jpg', (300, 380, 720, 940), 'p-stand.webp', 420)                # Rawan sweets / Let's connect us stand
crop('cart-front.jpg', (100, 560, 720, 1180), 'p-front.webp', 620)          # the gold RS sign on the cart

# the birthday cake cut out of its post (rembg isnet-general-use, run once into srcimg/cake-cut-rembg.png), glass stand
# and soft shadow removed, so it can stand on the drawn cart
im = Image.open(SRC + 'cake-cut-rembg.png').convert('RGBA')
a = np.asarray(im).copy(); al = a[..., 3].astype(float)
al[al < 170] = 0; al[1150:] = 0
a[..., 3] = al.astype(np.uint8)
im = Image.fromarray(a); im = im.crop(im.getbbox())
w = 420; im = im.resize((w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
im.save(OUT + 'cut-cake.webp', 'WEBP', quality=82, method=6); print('cut-cake.webp', im.size, os.path.getsize(OUT + 'cut-cake.webp') // 1024, 'KB')
