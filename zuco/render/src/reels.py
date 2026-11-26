"""Cut the three reel covers out of the user's screenshot of @zuco.jewelry, inpaint Instagram's overlay text
(view counts, 'Just watched'), upscale 2x and save. Boxes are in screenshot pixels (1290 wide)."""
import sys, numpy as np, cv2
S, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(S)
H, W = im.shape[:2]
# find the reel row: the grid starts below the tab bar; tiles are separated by ~4px light gaps
y0, y1 = 1932, 2694
tiles = {'showroom': (0, 428), 'owner': (432, 860), 'set': (864, W)}
# overlay boxes (tile-local): white text/icons to remove
over = {'showroom': [(30, 345, 400, 420), (20, 690, 200, 750)],
        'owner': [(20, 690, 200, 750)],
        'set': [(20, 690, 200, 750)]}
for name, (xa, xb) in tiles.items():
    t = im[y0:y1, xa:xb].copy()
    mask = np.zeros(t.shape[:2], np.uint8)
    for (bx0, by0, bx1, by1) in over[name]:
        reg = t[by0:by1, bx0:bx1]
        g = cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY)
        m = (g > 200).astype(np.uint8) * 255
        m = cv2.dilate(m, np.ones((7, 7), np.uint8), iterations=2)
        mask[by0:by1, bx0:bx1] = np.maximum(mask[by0:by1, bx0:bx1], m)
    # IG also darkens the bottom with a gradient under the count; leave it, it reads as shadow
    t = cv2.inpaint(t, mask, 9, cv2.INPAINT_TELEA)
    cv2.imwrite(f'{OUT}/{name}_mask.png', mask)
    big = cv2.resize(t, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(big, (0, 0), 1.4)
    big = cv2.addWeighted(big, 1.45, blur, -.45, 0)
    cv2.imwrite(f'{OUT}/{name}.png', big)
    print(name, t.shape)
