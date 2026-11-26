# Rebuild TIKIZ letter faces (close + fill), keep the other traced parts, bake everything to absolute paths.
import cv2, numpy as np, subprocess, re, json
from scipy import ndimage
D = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/'
im = cv2.imread(D + 'ig/img/post1.jpg').astype(np.float32)
S = 8
big = cv2.GaussianBlur(cv2.resize(im, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC), (0, 0), 2.2)
b, g, r = big[..., 0], big[..., 1], big[..., 2]
Lum = .299 * r + .587 * g + .114 * b
ink = (Lum < 105).astype(np.uint8)
n, cc, st, _ = cv2.connectedComponentsWithStats(ink)
# map components by the bbox list printed by trace2 (same thresholds => same labels order)
keep = [i for i in range(1, n) if st[i, 4] >= 120]
idx = {k: keep[k] for k in range(len(keep))}
def comp(*ks):
    m = np.zeros_like(ink)
    for k in ks: m[cc == idx[k]] = 1
    return m
def smooth(m, s=1.6):
    return (cv2.GaussianBlur(m.astype(np.float32), (0, 0), s) > .5).astype(np.uint8)
def solid(m):
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(__import__("os").environ.get("K", "37")),) * 2))
    m = ndimage.binary_fill_holes(m).astype(np.uint8)
    return smooth(m, 2.4)
def potrace(mask, name):
    cv2.imwrite(D + f'{name}.pbm', ((1 - mask) * 255).astype(np.uint8))
    subprocess.run(['potrace', D + f'{name}.pbm', '-s', '-o', D + f'{name}.svg', '-t', '40', '-a', '1.15', '-O', '0.5', '--flat'], check=True)
    s = open(D + f'{name}.svg').read()
    tr = re.search(r'<g transform="([^"]+)"', s).group(1)
    return bake(' '.join(x.replace('\n', ' ') for x in re.findall(r'<path d="([^"]+)"', s)), tr)
tok = re.compile(r'[MmCcLlZz]|-?\d*\.?\d+(?:e-?\d+)?')
def bake(d, tr):
    t = re.search(r'translate\(([-\d.]+),([-\d.]+)\)', tr); sc = re.search(r'scale\(([-\d.]+),([-\d.]+)\)', tr)
    tx, ty, sx, sy = float(t.group(1)), float(t.group(2)), float(sc.group(1)), float(sc.group(2))
    f = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')
    P = lambda x, y: f(tx + sx * x) + ' ' + f(ty + sy * y)
    toks = tok.findall(d); i = 0; cmd = None; cx = cy = 0; x0 = y0 = 0; out = []
    while i < len(toks):
        tk = toks[i]
        if tk.isalpha():
            cmd = tk; i += 1
            if cmd in 'Zz': out.append('Z'); cx, cy = x0, y0
            continue
        if cmd in 'Mm':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if cmd == 'm': x += cx; y += cy
            out.append('M' + P(x, y)); cx, cy = x0, y0 = x, y; cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Cc':
            v = [float(z) for z in toks[i:i + 6]]; i += 6
            if cmd == 'c': v = [v[0] + cx, v[1] + cy, v[2] + cx, v[3] + cy, v[4] + cx, v[5] + cy]
            out.append('C' + P(v[0], v[1]) + ' ' + P(v[2], v[3]) + ' ' + P(v[4], v[5])); cx, cy = v[4], v[5]
        elif cmd in 'Ll':
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if cmd == 'l': x += cx; y += cy
            out.append('L' + P(x, y)); cx, cy = x, y
    return ''.join(out)
parts = {}
parts['ring'] = potrace(smooth(comp(0)), 'z_ring')
parts['bun_top'] = potrace(smooth(comp(1)), 'z_b1')
parts['cheese'] = potrace(smooth(comp(2)), 'z_b2')
parts['patty'] = potrace(smooth(comp(3, 4)), 'z_b3')
parts['bun_bot'] = potrace(smooth(comp(5)), 'z_b5')
letters = {'T': (8, 13), 'I1': (6,), 'K': (10, 11, 14), 'I2': (7,), 'Z': (9, 12, 15)}
parts['letters'] = [potrace(solid(comp(*v)), 'z_' + k) for k, v in letters.items()]
parts['stars'] = [potrace(smooth(comp(16)), 'z_s1'), potrace(smooth(comp(17)), 'z_s2')]
parts['burgers'] = [potrace(smooth(comp(k), 1.2), f'z_g{k}') for k in (19, 25, 20, 21, 24, 22, 23)]  # B U R G E R S left to right
parts['banner'] = potrace(smooth(comp(18)), 'z_banner')
# disc
yel = ((r > 150) & (g > 130) & (b < 120)).astype(np.uint8)
n2, cc2, st2, _ = cv2.connectedComponentsWithStats(yel)
disc = (cc2 == (np.argmax(st2[1:, 4]) + 1)).astype(np.uint8)
disc = ndimage.binary_fill_holes(cv2.morphologyEx(disc | comp(0), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))).astype(np.uint8)
parts['disc'] = potrace(smooth(disc, 3), 'z_disc')
# brand colours sampled from the source
ys = im[(cv2.resize(disc, (150, 150), interpolation=cv2.INTER_NEAREST) > 0)]
yc = np.median(ys.reshape(-1, 3), axis=0)
ks = im[cv2.resize(ink, (150, 150), interpolation=cv2.INTER_AREA) > 0]
kc = np.percentile(ks.reshape(-1, 3), 20, axis=0)
parts['colors'] = {'yellow': '#%02x%02x%02x' % (int(yc[2]), int(yc[1]), int(yc[0])), 'ink': '#%02x%02x%02x' % (int(kc[2]), int(kc[1]), int(kc[0]))}
print(parts['colors'])
json.dump(parts, open(D + 'mark.json', 'w'), separators=(',', ':'))
print('ok', sum(len(json.dumps(v)) for v in parts.values()))
