"""Builds elevyn/media/*.webp from their own photos (elevynfitness.com uploads + frames of reels their homepage embeds).
Run: /usr/bin/python3 -I media.py <dir with the downloaded originals>
Each photo -> <name>.webp (1280 on the long side) and <name>-s.webp (720) for phones."""
import sys, os
from PIL import Image, ImageOps
SRC = sys.argv[1].rstrip('/') + '/'
OUT = os.path.dirname(os.path.abspath(__file__)) + '/../media/'
os.makedirs(OUT, exist_ok=True)
# name: (source file, optional crop box as fractions l,t,r,b)
M = {
    'aerial': ('extra/7fd281b7-802d-4c3f-bd5b-61a4cdc37882.webp', None),
    'facade': ('ig/Df2YT6Aobl4_0.jpg', None),
    'stair-sign': ('ig/DgK6RJlFMkT_0.jpg', None),
    'cardio-track': ('extra/DSC8074.jpg', None),
    'floor-lights': ('reelfull/floor.jpg', (0, .02, 1, .98)),
    'rig': ('reelfull/rig.jpg', (0, .1, 1, .9)),
    'strength': ('photos/DSC7848-3.jpg', None),
    'press': ('photos/DSC7990-1.jpg', None),
    'walk': ('photos/DSC6932.jpg', None),
    'glute': ('photos/DSC7946.jpg', None),
    'machines': ('extra/DSC7847.jpg', None),
    'track': ('photos/DSC8079.jpg', None),
    'posing': ('reelfull/posing.jpg', (0, .08, 1, .92)),
    'reformers': ('extra/DSC4107.jpg', None),
    'reformer': ('photos/Screen-Shot-2026-07-07-at-01.30.33.png', None),
    'studio': ('photos/DSC7830.jpg', None),
    'mat': ('photos/DSC8633.jpg', None),
    'spa': ('photos/IMG_5856-1536x1024-1.jpg', None),
    'tub': ('photos/IMG_9993-4.png', None),
    'lymph': ('reelfull/lymph2.jpg', (0, .12, 1, .95)),
    'pool': ('photos/IMG_5848-scaled-1-1.jpg', None),
    'pool-rail': ('photos/Serene-Indoor-Pool-with-Stainless-Rail.png', None),
    'pool-spa': ('photos/IMG_9993-3.png', None),
    'kids': ('photos/IMG_9993.png', None),
    'kids-house': ('photos/IMG_9993-1.png', None),
    'kids-lounge': ('photos/IMG_5818-1536x1024-1.jpg', None),
    'tennis': ('photos/DSC8190-1.jpg', None),
    'serve': ('photos/DSC8121.jpg', None),
    'racket': ('photos/DSC8091.jpg', None),
    'racket-floor': ('photos/DSC8158-1.jpg', None),
    'racquetball': ('photos/IMG_5916-2048x1365-1.jpg', None),
    'racquetball-net': ('photos/IMG_9993-5.png', None),
    'bar': ('photos/IMG_5922-1536x1024-1-1.jpg', None),
    'bar-counter': ('photos/IMG_5925-1024x683-1.jpg', None),
    'bar-fridge': ('photos/IMG_5928-1024x683-1.jpg', None),
    'hussein': ('photos/Trainer.1-1024x1024-1.webp', None),
    'linda': ('photos/Linda-Foess.webp', None),
    'coach': ('photos/DSC8607-4.png', None),
}
for name, (f, crop) in M.items():
    im = ImageOps.exif_transpose(Image.open(SRC + f)).convert('RGB')
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    for suf, L in (('', 1280), ('-s', 720)):
        c = im.copy(); c.thumbnail((L, L), Image.LANCZOS)
        c.save(OUT + name + suf + '.webp', 'WEBP', quality=74, method=6)
    print(name, im.size)
