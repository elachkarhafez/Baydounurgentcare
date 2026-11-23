"""Builds socotra/media/*.webp from their own photos (socotracoffeehouse.com + @socotracoffee_a2 posts).
Run:  python media.py <site-images-dir> <ig-images-dir>
Crops follow the mobile rules (4:3, 1:1 or 3:4). Spice drawings are their own illustrations from the Our Story page."""
import sys, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = D + '../../media/'
SITE, IG = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

def crop(src, out, ratio, w, fx=.5, fy=.5, q=76):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    if W / H > ratio: nw, nh = int(H * ratio), H
    else: nw, nh = W, int(W / ratio)
    x = int((W - nw) * fx); y = int((H - nh) * fy)
    im = im.crop((x, y, x + nw, y + nh)).resize((w, int(w / ratio)), Image.LANCZOS)
    im.save(OUT + out, 'WEBP', quality=q, method=6)
    print(out, im.size, os.path.getsize(OUT + out) // 1024, 'KB')

S = lambda n: os.path.join(SITE, n)
G = lambda n: os.path.join(IG, n)
# story: their room (lights, brass logo on the wall) with honeycomb bread and a latte
crop(S('9iqfooGoAOBDGOqLhiVD3BqFg.png'), 'room.webp', 3 / 4, 720, .5, .4)
# Adeni chai poured from the pot
crop(S('0RWRiStTH3nK2wMtpYH5GD3M.png'), 'adeni.webp', 4 / 3, 960, .45, .5)
# lattes and refreshers
crop(S('PBNDl8R2uPwbBrXEycNZY1bu1k.png'), 'socotra-latte.webp', 4 / 3, 800, .55, .5)
crop(G('ig-3.jpg'), 'pistachio.webp', 3 / 4, 600, .5, .5)
crop(S('WtNfk1kU0nDpo4bzd8YcaalMfE.png'), 'iced.webp', 4 / 3, 800, .5, .5)
crop(S('0N3YpU0wDwfCmbbv2yuO8E75Y.png'), 'refreshers.webp', 4 / 3, 800, .5, .5)
crop(S('BlyXNngbXwzQjWht7A7uz7mMFY.jpg'), 'breakfast.webp', 4 / 3, 800, .62, .5)
# bakery gallery (all 4:3, same size so the WebGL transition can swap textures)
for n, f, fx, fy in [('g-honey', 'snQAIIpTJkmGWyvyaQ8vUb8Ashk.png', .5, .5), ('g-cheesecake', 'evi9Uw9fOnZ6Zaebo3IEVQgsSk.png', .5, .5),
                     ('g-cakes', 'DPtcJ7PAP2xt4dC2oBv29wyo.jpg', .5, .55), ('g-tarts', 'JyG1WTXeNOlmRrvFdr64hC6Sh4c.png', .5, .45),
                     ('g-biscoff', 'yKecdtyTUPAlblGXf3pxVIKB9A.png', .5, .5), ('g-berry', 'BT3SjWZRV00Nbjzdvl87DzbNv2I.png', .5, .62),
                     ('g-top', 'T5FrJYXyHbp30UBInwFNI20.png', .5, .5)]:
    crop(S(f), n + '.webp', 4 / 3, 1000, fx, fy, 74)
# their coffee bags and the gold dallah from the Thanksgiving post (bottom of the flyer)
im = Image.open(G('ig-2.jpg')).convert('RGB'); W, H = im.size
im.crop((0, int(H * .46), W, int(H * .46) + int(W * .75))).resize((640, 480), Image.LANCZOS).save(OUT + 'bags.webp', 'WEBP', quality=78, method=6)
print('bags.webp')
# their spice drawings, trimmed, transparent
for n, f in [('sp-cardamom', 'wmMmFbrBrR7M75YABj2JKEGA.png'), ('sp-clove', 'Lt5YDv1ltbcV6sy3Cp0bjblNgSk.png'),
             ('sp-cinnamon', 'tgKKW62Gxr8JFeYWBS4Qo5nNhI.png'), ('sp-husk', 'wp97PqiBSi2owKTdGEfE22Xvqk.png'),
             ('sp-beans', 'QIaQcd0TrDy1WGGmYsW3D98lEs.png')]:
    im = Image.open(S(f)).convert('RGBA'); im = im.crop(im.getbbox())
    im.thumbnail((240, 240), Image.LANCZOS)
    im.save(OUT + n + '.webp', 'WEBP', quality=82, method=6)
    print(n, im.size)
