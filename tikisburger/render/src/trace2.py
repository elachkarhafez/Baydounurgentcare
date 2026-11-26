import cv2, numpy as np, subprocess, re, json, sys
D = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/'
im = cv2.imread(D + 'ig/img/post1.jpg').astype(np.float32)
S = 8
big = cv2.resize(im, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
big = cv2.GaussianBlur(big, (0, 0), 2.2)
b, g, r = big[..., 0], big[..., 1], big[..., 2]
L = .299 * r + .587 * g + .114 * b
ink = (L < 105).astype(np.uint8)
yel = ((r > 150) & (g > 130) & (b < 120)).astype(np.uint8)
H, W = ink.shape
cv2.imwrite(D + 't_ink.png', ink * 255); cv2.imwrite(D + 't_yel.png', yel * 255)
# yellow components: the disc is the big one, the Arabic line is the rest below it
n, cc, st, cen = cv2.connectedComponentsWithStats(yel)
order = np.argsort(-st[1:, cv2.CC_STAT_AREA]) + 1
disc = (cc == order[0]).astype(np.uint8)
arab = np.zeros_like(yel)
for i in order[1:]:
    x, y, w, h, a = st[i]
    if a > 400 and y > H * 0.6: arab[cc == i] = 1
def potrace(mask, name):
    cv2.imwrite(D + f'{name}.pbm', ((1 - mask) * 255).astype(np.uint8))
    subprocess.run(['potrace', D + f'{name}.pbm', '-s', '-o', D + f'{name}.svg', '-t', '30', '-a', '1.0', '-O', '0.4', '--flat'], check=True)
    s = open(D + f'{name}.svg').read()
    tr = re.search(r'<g transform="([^"]+)"', s).group(1)
    return {'transform': tr, 'd': ' '.join(x.replace('\n', ' ') for x in re.findall(r'<path d="([^"]+)"', s))}
out = {'w': W, 'h': H, 'parts': []}
# ink components (inside the disc area), each traced on its own
n, cc, st, cen = cv2.connectedComponentsWithStats(ink)
k = 0
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a < 120: continue
    m = (cc == i).astype(np.uint8)
    p = potrace(m, f'c_{k}')
    out['parts'].append({'kind': 'ink', 'bbox': [int(x), int(y), int(w), int(h)], 'area': int(a), **p}); k += 1
out['disc'] = potrace(disc, 'c_disc')
out['arab'] = potrace(arab, 'c_arab')
json.dump(out, open(D + 'roundel.json', 'w'))
vis = np.full((H, W, 3), 255, np.uint8); vis[disc > 0] = (0, 220, 245); vis[arab > 0] = (40, 170, 190)
rng = np.random.default_rng(3)
for j, pt in enumerate(out['parts']):
    x, y, w, h = pt['bbox']; col = tuple(int(c) for c in rng.integers(0, 200, 3))
    cv2.rectangle(vis, (x, y), (x + w, y + h), col, 2); cv2.putText(vis, str(j), (x, y + 18), cv2.FONT_HERSHEY_SIMPLEX, .6, col, 2)
vis[ink > 0] = (20, 20, 20)
for j, pt in enumerate(out['parts']):
    x, y, w, h = pt['bbox']; cv2.putText(vis, str(j), (x, max(14, y - 2)), cv2.FONT_HERSHEY_SIMPLEX, .55, (0, 0, 255), 2)
cv2.imwrite(D + 't_vis.png', vis)
print(len(out['parts']), [(j, p['bbox'], p['area']) for j, p in enumerate(out['parts'])])
