"""Trace their favicon (srcimg/favicon-512.png, the stethoscope mark from thefamilydocmi.com) into ../favicon.svg"""
import os, re, subprocess, tempfile
import cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
im = cv2.imread(os.path.join(HERE, 'srcimg/favicon-512.png'), cv2.IMREAD_UNCHANGED)
if im.shape[2] == 4:
    a = im[..., 3:4].astype(np.float32) / 255
    im = (im[..., :3].astype(np.float32) * a + 255 * (1 - a)).astype(np.uint8)
im = cv2.resize(im, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
f = im.astype(np.float32); B, G, R = f[..., 0], f[..., 1], f[..., 2]
d = lambda c: np.sqrt(((f - np.array(c, np.float32)) ** 2).sum(-1))
dn, ds, dw = d([74, 48, 26]), d([229, 173, 40]), d([250, 250, 250])
sky = (ds < dw) & (ds < dn) & ((B - R) > 70)
navy = (dn < dw) & (dn <= ds)
def trace(mask):
    with tempfile.TemporaryDirectory() as td:
        p, s = os.path.join(td, 'm.pbm'), os.path.join(td, 'm.svg')
        cv2.imwrite(p, np.where(mask, 0, 255).astype(np.uint8))
        subprocess.run(['potrace', '-s', '-t', '40', '-a', '1.0', '-O', '0.4', '-o', s, p], check=True)
        t = open(s).read()
    g = re.search(r'<g transform="([^"]+)"', t).group(1)
    return g, ''.join(re.findall(r' d="([^"]+)"', t))
H = im.shape[0]
out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">' % (H, H),
       '<rect width="%d" height="%d" rx="%d" fill="#ffffff"/>' % (H, H, H // 5)]
for m, col in ((sky, '#28aae1'), (navy, '#1a304a')):
    g, dd = trace(m)
    out.append(f'<g transform="{g}" fill="{col}"><path d="{dd}"/></g>')
out.append('</svg>')
open(os.path.join(HERE, '..', 'favicon.svg'), 'w').write(''.join(out))
cv2.imwrite(os.path.join(HERE, '..', 'media', 'icon.png'), cv2.resize(im, (512, 512), interpolation=cv2.INTER_AREA))
print('ok')
