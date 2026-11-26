"""Builds aljawad/media/*.webp from their own photos.
Run with a PIL python:  /usr/bin/python3 -I media.py [cutDir]
- srcimg/menu: the studio shots from their official Al Jawad Kinshasa menu (menu.omegasoftware.ca/aljawadkinshasa).
  -> media/m/<id>.webp  720x540 (4:3, item sheet and desktop cards)  and  media/m/<id>-t.webp 240x240 (rows)
  The few shot on a grey sweep are lifted to white with a curve so every dish sits on the same white.
- cutDir (from cut.py): rembg cutouts -> media/c/<id>.webp 260px wide with alpha (fly-to-bag, the stack, the counter)
- srcimg/reels: frames from their reels and posts (@aljawadrestaurant, @aljawadtogo, @aljawaddining)
  -> media/r/<name>.webp 600x800 (3:4), cropped under the burned-in captions."""
import os, sys
import numpy as np
from PIL import Image, ImageOps
D = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = D + '../../media/'
for d in ['m', 'c', 'r']: os.makedirs(OUT + d, exist_ok=True)
ITEMS = {
 'sh-chicken-sand': 'shawarma-djej-sandjpgcrdownload.jpeg', 'sh-beef-sand': 'shawarma-lhami-sandjpgcrdownload.jpeg',
 'sh-chicken-markouk': 'markouk-djejjpgcrdownload.jpeg', 'sh-beef-markouk': 'markouk-lahmejpgcrdownload.jpeg',
 'sh-chicken-plate': 'shawarma-djej-platejpgcrdownload.jpeg', 'sh-beef-plate': 'shawarma-lahmi-platejpgcrdownload.jpeg',
 'sh-mix-plate': 'shawarma-mix-platejpgcrdownload.jpeg',
 'gr-chicken': 'farrouj-3al-fahemjpgcrdownload.jpeg', 'gr-half': 'nos-farrouj-3al-fahemjpgcrdownload.jpeg',
 'gr-mix': 'mix-platejpgcrdownload.jpeg', 'gr-kafta': 'kafta-platejpgcrdownload.jpeg', 'gr-tawouk': 'tawouk-platejpgcrdownload.jpeg',
 'gr-tawouk-red': 'tawook-rouge.jpg', 'gr-beef': 'lahmi-platejpgcrdownload.jpeg', 'gr-arayes': 'arayessjpgcrdownload.jpeg',
 'gr-lamb': 'lamb-chops_1.jpg', 'gr-kilo': '1kg-mashewejpgcrdownload.jpeg', 'gr-half-kilo': 'mix-grill.jpg', 'gr-wings': 'jwaneh-wajbijpgcrdownload.jpeg',
 'br-family': 'family-mealjpgcrdownload.jpeg', 'br-combo': 'mixe-mealjpgcrdownload.jpeg', 'br-family-spicy': 'family-mealjpgcrdownload_1.jpeg',
 'mz-hummus': 'hummusjpgcrdownload.jpeg', 'mz-moutabal': 'mtabal-batenjanjpgcrdownload.jpeg', 'mz-warak': 'wara2-3enabjpgcrdownload.jpeg',
 'mz-mouhammara': 'mohamarajpgcrdownload.jpeg', 'mz-kibbeh-nayyeh': 'kibbeh-nayyijpgcrdownload.jpeg', 'mz-pesto': 'pesto-hummusjpgcrdownload.jpeg',
 'mz-hummus-meat': 'hummus-ma3-lahmi-wsnoubarjpgcrdownload.jpeg', 'mz-fatteh': 'hummus-fattehjpgcrdownload.jpeg', 'mz-fatteh-meat': 'beef-fattehjpgcrdownload.jpeg',
 'mz-rakakat': 'r2aye2-sa7enjpgcrdownload.jpeg', 'mz-sambousek': 'sambosek-viande.jpeg', 'mz-makanek': 'makanekjpgcrdownload.jpeg',
 'mz-sujuk': 'sujukjpgcrdownload.jpeg', 'mz-pastries': 'mix-mo3janat.jpg', 'mz-fries': 'fries.jpeg', 'mz-kibbeh-laban': 'kibbeh-blabanjpgcrdownload.jpeg',
 'sa-fattoush': 'fattoushjpgcrdownload.jpeg', 'sa-tabbouleh': 'tabboulehjpgcrdownload.jpeg', 'sa-rocca': 'rocca-plainjpgcrdownload.jpeg',
 'sa-caesar': 'caesar-saladjpgcrdownload.jpeg', 'sa-quinoa': 'kael-wquinoajpgcrdownload.jpeg', 'sa-parmigiano': 'rocca-with-parmesanjpgcrdownload.jpeg',
 'sa-veg': 'vegetables-plates.jpg',
 'sw-burger': 'lebanse-c-burgerjpgcrdownload_1.jpeg', 'sw-twister': 'twisterjpgcrdownload.jpeg', 'sw-crispy': 'crispy-sandjpgcrdownload.jpeg',
 'sw-hawsa': 'hawsajpgcrdownload.jpeg', 'sw-fajita': 'fajita-sandjpgcrdownload.jpeg',
}
GREY = {'tawook-rouge.jpg', 'lamb-chops_1.jpg', 'mix-grill.jpg', 'sambosek-viande.jpeg', 'mix-mo3janat.jpg', 'fries.jpeg', 'vegetables-plates.jpg'}

def whiten(im):
    """Lift the backdrop to white: sample the border, then scale each channel so the backdrop maps to 255."""
    a = np.asarray(im).astype(float)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.percentile(border, 60, axis=0)
    a = np.clip(a * (252 / bg), 0, 255)
    # soft gamma so the food doesn't go flat
    a = 255 * (a / 255) ** 1.06
    return Image.fromarray(a.astype(np.uint8))

def crop_ratio(im, r, cy=.5):
    w, h = im.size
    if w / h > r: nw = int(h * r); x = (w - nw) // 2; return im.crop((x, 0, x + nw, h))
    nh = int(w / r); y = int((h - nh) * cy); return im.crop((0, y, w, y + nh))

for k, f in ITEMS.items():
    im = Image.open(D + '../srcimg/menu/' + f).convert('RGB')
    if f in GREY: im = whiten(im)
    a = crop_ratio(im, 4 / 3, .55).resize((720, 540), Image.LANCZOS)
    a.save(OUT + f'm/{k}.webp', quality=80, method=6)
    t = crop_ratio(im, 1, .55)
    # zoom in a touch on the square thumb: the dishes sit small in the frame
    w, h = t.size; z = .12; t = t.crop((int(w * z), int(h * z), int(w * (1 - z)), int(h * (1 - z))))
    t.resize((240, 240), Image.LANCZOS).save(OUT + f'm/{k}-t.webp', quality=78, method=6)
    if len(sys.argv) > 1:
        cp = os.path.join(sys.argv[1], os.path.splitext(f)[0] + '.png')
        if os.path.exists(cp):
            c = Image.open(cp).convert('RGBA'); c.thumbnail((300, 300), Image.LANCZOS)
            c.save(OUT + f'c/{k}.webp', quality=82, method=6)

REELS = {  # name: (file, crop top y in the 720x1280 frame, height)
 'stack': ('stack.jpg', 270, 960), 'hummus-meat': ('hummus-meat.jpg', 250, 960), 'fattoush-bowl': ('fattoush-bowl.jpg', 280, 960),
 'chicken-bowl': ('chicken-bowl.jpg', 300, 960), 'fruit-pour': ('fruit-pour.jpg', 60, 960), 'mashawi-dining': ('mashawi-dining.jpg', 140, 960),
 'dining-room': ('dining-room.jpg', 50, 960), 'cocktails': ('cocktails.jpg', 300, 960), 'lotus': ('lotus.jpg', 300, 960),
}
for k, (f, y, h) in REELS.items():
    im = Image.open(D + '../srcimg/reels/' + f).convert('RGB')
    s = im.width / 720
    im = im.crop((0, int(y * s), im.width, int((y + h) * s))).resize((600, 800), Image.LANCZOS)
    im.save(OUT + f'r/{k}.webp', quality=80, method=6)
# post7 (1080x1920 cover of the salad reel): the mint bowl close-up, under the caption
im = Image.open(D + '../srcimg/reels/post7.jpg').convert('RGB').crop((0, 480, 1080, 1920)).resize((600, 800), Image.LANCZOS)
im.save(OUT + 'r/mint-bowl.webp', quality=80, method=6)
# meat textures for the kilo grill, cut from their own plate photos (kafta, lahme, red tawook, and the plate their menu
# files as tawook-rouge.jpg, which actually shows the white tawook)
os.makedirs(OUT + 'k', exist_ok=True)
for k, (f, box) in {'kafta': ('kafta-platejpgcrdownload.jpeg', (605, 800, 675, 860)), 'lahme': ('lahmi-platejpgcrdownload.jpeg', (500, 820, 580, 880)),
                    'red': ('tawouk-platejpgcrdownload.jpeg', (500, 800, 590, 870)), 'white': ('tawook-rouge.jpg', (200, 390, 270, 450))}.items():
    Image.open(D + '../srcimg/menu/' + f).convert('RGB').crop(box).save(OUT + f'k/{k}.webp', quality=82)
print('ok', len(ITEMS))
