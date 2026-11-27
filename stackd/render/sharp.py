# pick the sharpest frame in a time window for a crop box: sharp.py video t0 t1 x y w h out.jpg
import cv2, sys, numpy as np
v, t0, t1, x, y, w, h, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), *map(int, sys.argv[4:8]), sys.argv[8]
cap = cv2.VideoCapture(v)
fps = cap.get(cv2.CAP_PROP_FPS)
cap.set(cv2.CAP_PROP_POS_FRAMES, int(t0 * fps))
best, bi, bt = -1, None, 0
for i in range(int((t1 - t0) * fps)):
    ok, fr = cap.read()
    if not ok: break
    c = fr[y:y + h, x:x + w]
    s = cv2.Laplacian(cv2.cvtColor(c, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    if s > best: best, bi, bt = s, c.copy(), t0 + i / fps
cv2.imwrite(out, bi, [cv2.IMWRITE_JPEG_QUALITY, 95])
print(out, round(bt, 2), round(best))
