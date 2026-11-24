"""Builds bravoshoes/media/*.webp from their own Instagram posts and reel frames (srcimg/, pulled from @bravo.shoes_).
Run with a PIL python:  python -I media.py
Every product photo is 3:4 (600 x 800 or the source size if smaller) so the shelf wall, the cards and the product
gallery can share them. The six public posts show four models in nine colourways; nothing here is invented."""
import os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = D + '../srcimg/'
OUT = D + '../../media/'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'): os.remove(OUT + f)

def crop(name, ratio, cx=.5, cy=.5, zoom=1.0):
    im = Image.open(SRC + name).convert('RGB'); W, H = im.size
    if W / H > ratio: nh = H; nw = H * ratio
    else: nw = W; nh = W / ratio
    nw /= zoom; nh /= zoom
    x = min(max(cx * W - nw / 2, 0), W - nw); y = min(max(cy * H - nh / 2, 0), H - nh)
    return im.crop((int(x), int(y), int(x + nw), int(y + nh)))

def save(im, out, w, q=78):
    w = min(w, im.size[0]) if im.size[0] >= 480 else w
    im = im.resize((w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(OUT + out, 'WEBP', quality=q, method=6)
    print(out, im.size, os.path.getsize(OUT + out) // 1024, 'KB')

P = 3 / 4
# name, source, centre x, centre y, zoom
SHOTS = [
    # buckle heel ankle boot, black (their carousel post on the shop shelf) + the buckle up close
    ('p-ankle-1', 'ankle.jpg', .5, .55, 1), ('p-ankle-2', 'ankle.jpg', .56, .36, 1.9),
    # riding knee boot, black: on the bench, the reel cover, legs crossed, side
    ('p-knee-1', 'v2_009.jpg', .5, .55, 1), ('p-knee-2', 'knee.jpg', .5, .5, 1), ('p-knee-3', 'v2_001.jpg', .5, .55, 1), ('p-knee-4', 'v2_021.jpg', .5, .5, 1),
    # riding knee boot, brown
    ('p-kneebr-1', 'v2_031.jpg', .62, .62, 1.25), ('p-kneebr-2', 'v2_018.jpg', .4, .5, 1.1),
    # lace-up boot: matte black, black shiny, black suede (their 1, 2 or 3 reel + the Black Suede post)
    ('p-matte-1', 'v6_016.jpg', .5, .56, 1), ('p-matte-2', 'v6_039.jpg', .5, .45, 1), ('p-matte-3', 'v6_028.jpg', .5, .62, 1),
    ('p-shiny-1', 'v6_020.jpg', .5, .56, 1), ('p-shiny-2', 'v6_036.jpg', .45, .6, 1), ('p-shiny-3', 'v6_042.jpg', .5, .5, 1),
    ('p-suede-1', 'suede.jpg', .5, .5, 1), ('p-suede-2', 'v6_024.jpg', .5, .56, 1), ('p-suede-3', 'v6_031.jpg', .5, .5, 1),
    # fur slipper: chocolate with cream fur, black, sand with white fur
    ('p-choc-1', 'slipper-brown.jpg', .5, .5, 1), ('p-choc-2', 'v4_010.jpg', .5, .45, 1), ('p-choc-3', 'v4_026.jpg', .5, .55, 1),
    ('p-black-1', 'v4_023.jpg', .5, .45, 1), ('p-black-2', 'v4_024.jpg', .5, .45, 1),
    ('p-sand-1', 'v4_018.jpg', .45, .5, 1), ('p-sand-2', 'slipper-sand.jpg', .5, .6, 1), ('p-sand-3', 'v4_001.jpg', .5, .55, 1),
]
for n, f, cx, cy, z in SHOTS:
    save(crop(f, P, cx, cy, z), n + '.webp', 600, 76)
# the four slippers lined up on their bench (shop section), the clapperboard and the bench they shoot on
save(crop('v4_four.png', 1, .5, .62), 'four.webp', 576, 78)
for n, f in [('t1', 'v6_016.jpg'), ('t2', 'v6_020.jpg'), ('t3', 'v6_024.jpg')]:
    save(crop(f, P, .5, .56), n + '.webp', 576, 80)
save(crop('v6_005.jpg', P, .5, .52), 'clapper.webp', 540, 78)
save(crop('v4_001.jpg', 4 / 3, .5, .62), 'bench.webp', 576, 78)

# ---- v3: cutouts (rembg isnet-general-use, run outside the repo; only the pairs with no hand on them came out clean) ----
for n, f, w in [('cut-ankle', 'cut/ankle.png', 900), ('cut-knee', 'cut/knee-pair.png', 546), ('cut-suede', 'cut/suede.png', 329)]:
    im = Image.open(SRC + f).convert('RGBA'); im = im.crop(im.getbbox())
    im = im.resize((w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(OUT + n + '.webp', 'WEBP', quality=86, method=6)
    print(n, im.size, os.path.getsize(OUT + n + '.webp') // 1024, 'KB')

# ---- v3: the 1 / 2 / 3 reel as a scroll sequence: 3.5 s to 6.3 s at 24 fps, 3:4 crop under their own caption ----
import subprocess, glob
SEQ = OUT + 'seq/'
os.makedirs(SEQ, exist_ok=True)
for f in glob.glob(SEQ + '*'): os.remove(f)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '3.5', '-t', '2.8', '-i', SRC + 'reel-takes.mp4', '-vf', 'fps=24,crop=480:640:0:128',
                '-c:v', 'libwebp', '-quality', '72', '-compression_level', '6', SEQ + 'f%03d.webp'], check=True)
fs = sorted(glob.glob(SEQ + '*.webp'))
print('seq', len(fs), sum(os.path.getsize(f) for f in fs) // 1024, 'KB')
