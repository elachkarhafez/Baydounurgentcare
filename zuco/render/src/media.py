"""Make zuco/media from the sources.
 reels: the three reel covers cut from the user's screenshot of @zuco.jewelry (reels.py: overlay text inpainted, 2x)
 renders: pieces.py Cycles stills (900px)
usage: /usr/bin/python3 -I media.py <reels dir> <renders dir>"""
import os, sys, shutil, cv2, numpy as np
R, P = sys.argv[1], sys.argv[2]
D = os.path.dirname(os.path.abspath(__file__))
M = os.path.normpath(os.path.join(D, '..', '..', 'media')); os.makedirs(M, exist_ok=True)
def webp(img, name, q=82):
    cv2.imwrite(os.path.join(M, name), img, [cv2.IMWRITE_WEBP_QUALITY, q]); print(name, img.shape[1], img.shape[0], os.path.getsize(os.path.join(M, name)) // 1024, 'KB')
# the 21k set: 3:4, keep the tassels (the bracelet stand at the top is cropped)
s = cv2.imread(os.path.join(R, 'set.png')); h, w = s.shape[:2]
ch = int(w * 4 / 3); y0 = h - ch - 12
webp(s[y0:y0 + ch], 'set.webp')
# showroom: the black ceiling, LED strip and glass case (above the overlay text), 4:3
r = cv2.imread(os.path.join(R, 'showroom.png'))[16:, 16:-16]; w = r.shape[1]   # trim the tile's rounded corners
webp(r[0:int(w * .75)], 'showroom.webp')
# at the door: 3:4 from the top
o = cv2.imread(os.path.join(R, 'owner.png')); w = o.shape[1]
webp(o[60:60 + int(w * 4 / 3)], 'owner.webp')
CROP = {'ring': (.5, .44, .64), 'tennis': (.5, .5, .8)}  # centre x, centre y, size (fraction of the frame)
for n in ('cuban', 'rope', 'bangles', 'rosebangle', 'ring', 'tennis'):
    im = cv2.imread(os.path.join(P, n + '.png'))
    if n in CROP:
        cx, cy, f = CROP[n]; H, W_ = im.shape[:2]; sz = int(W_ * f)
        x0, y0 = int(W_ * cx - sz / 2), int(H * cy - sz / 2); im = im[y0:y0 + sz, x0:x0 + sz]
    webp(cv2.resize(im, (720, 720), interpolation=cv2.INTER_AREA), n + '.webp', 80)
# the bracelet card: a closer, mirrored crop of the same Cuban render
im = cv2.imread(os.path.join(P, 'cuban.png')); h, w = im.shape[:2]
c = cv2.flip(im[int(h * .3):int(h * .3) + int(w * .62), int(w * .19):int(w * .19) + int(w * .62)], 1)
webp(cv2.resize(c, (720, 720), interpolation=cv2.INTER_CUBIC), 'cuban-br.webp', 80)
