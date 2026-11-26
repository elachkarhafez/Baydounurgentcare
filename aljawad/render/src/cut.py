"""Cuts their menu photos (srcimg/menu, the studio shots from the official Al Jawad Kinshasa menu) out of the
white seamless so a dish can sit on the counter, fly into the bag and stack in the order.
Run with the python that has rembg:  /usr/local/bin/python3 cut.py <outDir> [model] [names...]
Writes <outDir>/<name>.png (RGBA, trimmed with a small margin)."""
import os, sys
from PIL import Image
from rembg import new_session, remove
D = os.path.dirname(os.path.abspath(__file__)) + '/'
out = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else 'birefnet-general-lite'
names = sys.argv[3:] or sorted(os.listdir(D + '../srcimg/menu'))
os.makedirs(out, exist_ok=True)
s = new_session(model)
for n in names:
    im = Image.open(D + '../srcimg/menu/' + n).convert('RGB')
    if max(im.size) > 1200: im.thumbnail((1200, 1200), Image.LANCZOS)
    r = remove(im, session=s)
    bb = r.getbbox()
    if bb:
        m = 8; bb = (max(0, bb[0] - m), max(0, bb[1] - m), min(r.width, bb[2] + m), min(r.height, bb[3] + m)); r = r.crop(bb)
    r.save(os.path.join(out, os.path.splitext(n)[0] + '.png'))
    print(n, r.size, flush=True)
