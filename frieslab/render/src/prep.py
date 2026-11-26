"""Makes srcimg/sign.png: their Antelias storefront sign, from the opening frames of their reel
https://www.instagram.com/p/Df0a58WBzGi/ ("ناطرينكن بفرعنا بانطلياس"), 720x1280, 0.0-0.3 s.
The four frames are aligned to the first (ECC, euclidean), averaged to cut video noise, then rotated so the
FRIES baseline is level. Input frames: srcimg/sign-f1..4.png.  Run: python3 -I prep.py"""
import cv2, numpy as np, os
D = os.path.dirname(os.path.abspath(__file__)) + '/'
fr = [cv2.imread(D + '../srcimg/sign-f%d.png' % i).astype(np.float32) for i in range(1, 5)]
x0, y0, x1, y1 = 180, 130, 650, 450
ref = cv2.cvtColor(fr[0], cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1]
acc = fr[0][y0:y1, x0:x1].copy()
for f in fr[1:]:
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1]
    w = np.eye(2, 3, dtype=np.float32)
    try:
        _, w = cv2.findTransformECC(ref, g, w, cv2.MOTION_EUCLIDEAN, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    except cv2.error:
        pass
    acc += cv2.warpAffine(f[y0:y1, x0:x1], w, (x1 - x0, y1 - y0), flags=cv2.INTER_CUBIC + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
avg = acc / len(fr)
# level the FRIES baseline: bottoms of the orange letters
hsv = cv2.cvtColor(avg.astype(np.uint8), cv2.COLOR_BGR2HSV)
org = ((hsv[:, :, 0] >= 7) & (hsv[:, :, 0] <= 24) & (hsv[:, :, 1] > 120) & (hsv[:, :, 2] > 150)).astype(np.uint8)
n, lb, st, cen = cv2.connectedComponentsWithStats(org, 8)
big = [i for i in range(1, n) if st[i][4] > 900 and st[i][3] > 40]
pts = np.array([[st[i][0] + st[i][2] / 2, st[i][1] + st[i][3]] for i in big], np.float32)
a = np.degrees(np.arctan2(*np.polyfit(pts[:, 0], pts[:, 1], 1)[::-1][:: -1][:1], 1)) if False else np.degrees(np.arctan(np.polyfit(pts[:, 0], pts[:, 1], 1)[0]))
print('letters', len(big), 'baseline tilt %.2f deg' % a)
H, W = avg.shape[:2]
M = cv2.getRotationMatrix2D((W / 2, H / 2), a, 1)
out = cv2.warpAffine(avg, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
cv2.imwrite(D + '../srcimg/sign.png', np.clip(out, 0, 255).astype(np.uint8))
