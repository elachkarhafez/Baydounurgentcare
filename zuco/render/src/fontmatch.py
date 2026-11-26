"""Score candidate fonts against the ZU & CO. lettering of the logo.
Per-glyph IoU after scaling each rendered glyph to the logo glyph's bbox height and aligning centres."""
import sys, glob, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
SRC, FONTDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
g = cv2.imread(SRC, cv2.IMREAD_GRAYSCALE)
H, W = g.shape
# text band: lower part of logo, find rows with ink below the diamond
bw = (g > 128).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(bw)
comps = [(i, st[i]) for i in range(1, n) if st[i][4] > 200]
# the text line: components whose top is below the bottom of the diamond (largest comps)
ys = sorted(comps, key=lambda c: -c[1][4])
diam_bottom = max(c[1][1] + c[1][3] for c in ys[:4])
text = [c for c in comps if c[1][1] > diam_bottom]
text.sort(key=lambda c: c[1][0])
print('text comps', [(int(c[1][0]), int(c[1][3])) for c in text])
chars = list('ZU&CO.')
glyphs = []
for (i, s), ch in zip(text, chars):
    x, y, w, h, a = s
    m = (lab[y:y+h, x:x+w] == i).astype(np.uint8)
    glyphs.append((ch, m, s))
capH = max(s[3] for ch, m, s in glyphs if ch in 'ZUCO')
def render(fontpath, ch, size=400, var=None):
    f = ImageFont.truetype(fontpath, size)
    if var is not None:
        try: f.set_variation_by_axes(var)
        except Exception: pass
    im = Image.new('L', (size * 2, size * 2), 0)
    ImageDraw.Draw(im).text((size // 2, size // 3), ch, font=f, fill=255)
    a = np.asarray(im) > 128
    yy, xx = np.nonzero(a)
    if len(xx) == 0: return None, None
    a = a[yy.min():yy.max()+1, xx.min():xx.max()+1]
    # cap height for scale reference
    im2 = Image.new('L', (size * 2, size * 2), 0)
    ImageDraw.Draw(im2).text((size // 2, size // 3), 'H', font=f, fill=255)
    b = np.asarray(im2) > 128; yy2, _ = np.nonzero(b)
    return a, yy2.max() - yy2.min() + 1
def iou(ref, cand, scale):
    h, w = ref.shape
    ch, cw = int(round(cand.shape[0] * scale)), int(round(cand.shape[1] * scale))
    if ch < 2 or cw < 2: return 0
    c = cv2.resize(cand.astype(np.uint8) * 255, (cw, ch), interpolation=cv2.INTER_AREA) > 127
    S = max(h, ch) + 20, max(w, cw) + 20
    A = np.zeros(S, bool); B = np.zeros(S, bool)
    A[(S[0]-h)//2:(S[0]-h)//2+h, (S[1]-w)//2:(S[1]-w)//2+w] = ref
    B[(S[0]-ch)//2:(S[0]-ch)//2+ch, (S[1]-cw)//2:(S[1]-cw)//2+cw] = c
    return (A & B).sum() / max(1, (A | B).sum())
res = []
for fp in sorted(glob.glob(FONTDIR + '/*.ttf')):
    name = os.path.basename(fp)[:-4]
    vars_ = [None]
    try:
        f = ImageFont.truetype(fp, 100); axes = f.get_variation_axes()
        wa = [a for a in axes if a.get('name') in (b'Weight', 'Weight')] or axes
        vars_ = []
        for wgt in (300, 400, 500, 600):
            v = []
            for a in axes:
                nm = a.get('name')
                if nm in (b'Weight', 'Weight'): v.append(min(max(wgt, a['minimum']), a['maximum']))
                else: v.append(a['default'])
            vars_.append(v)
    except Exception:
        vars_ = [None]
    for var in vars_:
        scores = []
        ok = True
        Href = None
        for ch, m, s in glyphs:
            r, capR = render(fp, ch, var=var)
            if r is None: ok = False; break
            sc = capH / capR  # uniform scale from cap height
            scores.append(iou(m.astype(bool), r, sc))
        if ok:
            tag = name + ('' if var is None else '@' + '/'.join(str(int(x)) for x in var))
            res.append((np.mean(scores), tag, [round(x, 2) for x in scores], fp, var))
res.sort(key=lambda r: -r[0])
for r in res[:20]: print(round(r[0], 3), r[1], r[2])
# overlay sheet for top 6: logo text in white, candidate in red
rows = []
x0 = min(s[0] for _, _, s in glyphs); x1 = max(s[0] + s[2] for _, _, s in glyphs)
y0 = min(s[1] for _, _, s in glyphs); y1 = max(s[1] + s[3] for _, _, s in glyphs)
crop = g[y0-10:y1+10, x0-10:x1+10]
for sc_, tag, per, fp, var in res[:8]:
    canvas = np.zeros(crop.shape + (3,), np.uint8)
    canvas[..., 1] = crop  # logo in green
    for ch, m, s in glyphs:
        r, capR = render(fp, ch, var=var)
        k = capH / capR
        ch_, cw_ = int(round(r.shape[0] * k)), int(round(r.shape[1] * k))
        c = cv2.resize(r.astype(np.uint8) * 255, (cw_, ch_), interpolation=cv2.INTER_AREA)
        cx, cy = s[0] + s[2] // 2 - x0 + 10, s[1] + s[3] // 2 - y0 + 10
        ys_, xs_ = cy - ch_ // 2, cx - cw_ // 2
        ya, xa = max(0, ys_), max(0, xs_)
        yb, xb = min(canvas.shape[0], ys_ + ch_), min(canvas.shape[1], xs_ + cw_)
        canvas[ya:yb, xa:xb, 2] = np.maximum(canvas[ya:yb, xa:xb, 2], c[ya-ys_:yb-ys_, xa-xs_:xb-xs_])
    cv2.putText(canvas, '%s %.3f' % (tag, sc_), (8, 28), cv2.FONT_HERSHEY_SIMPLEX, .8, (255, 255, 255), 2)
    rows.append(canvas)
cv2.imwrite(OUT, np.vstack(rows))
