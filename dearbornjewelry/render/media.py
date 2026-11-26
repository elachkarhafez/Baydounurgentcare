"""Cut the site's media from the shop's own posts (nothing generated).
Sources (kept out of the deploy, render/ is in .vercelignore):
  TikTok @dearborn_jewelry reels, pulled through TikTok's public player embed:
    7193916716735335722  'New arrivals daily'  (velvet counter, 21k sets, cuffs, chains)
    7406832302359104810  #21kgold twisted bangles unwrapped from red tissue in front of the bangle pillars
    7124846820571876650  'Gold scrap melting process at Dearborn Jewelry' (scrap box, crucible, pour, bar, scale)
    7224555246507347242  'Investing in gold?' (PAMP Suisse bars)
    7384214403299675434  'PRICES OF GOLD: 2000 VS 2024' (Ahmad at the counter with bangle trays)
  Google listing photos (via atly.com / steps.me): storefront, Movado case, mesh cuffs on their stamped tray.
Usage: /usr/bin/python3 media.py <dir with the reel mp4s> ; needs ffmpeg + cv2. Writes ../media/*.webp|mp4."""
import os, sys, subprocess, tempfile
import cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'media')
V = sys.argv[1]
R = {'velvet': '7193916716735335722', 'twist': '7406832302359104810', 'melt': '7124846820571876650',
     'pamp': '7224555246507347242', 'ahmad': '7384214403299675434'}
tmp = tempfile.mkdtemp()

def frame(reel, t):
    p = os.path.join(tmp, f'{reel}_{t}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', os.path.join(V, R[reel] + '.mp4'), '-frames:v', '1', p], check=True)
    return cv2.imread(p)

def save(img, box, name, w, q=80, sharpen=.35):
    x0, y0, x1, y1 = box
    c = img[y0:y1, x0:x1]
    h = round(w * c.shape[0] / c.shape[1])
    c = cv2.resize(c, (w, h), interpolation=cv2.INTER_LANCZOS4 if w > c.shape[1] else cv2.INTER_AREA)
    if sharpen:
        bl = cv2.GaussianBlur(c, (0, 0), 1.4)
        c = cv2.addWeighted(c, 1 + sharpen, bl, -sharpen, 0)
    cv2.imwrite(os.path.join(OUT, name + '.webp'), c, [cv2.IMWRITE_WEBP_QUALITY, q])
    print(name, w, h, os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024, 'KB')

v31 = frame('velvet', 31)
save(v31, (0, 250, 576, 1018), 'counter', 720)          # Ahmad laying the new arrivals on the velvet
save(v31, (130, 624, 430, 1024), 'p-bib', 600)          # bridal bib with medallion
save(v31, (336, 620, 576, 940), 'p-rope', 600)          # five-strand rope necklace
save(v31, (0, 700, 225, 1000), 'p-coins', 600)          # coin chain
save(v31, (290, 410, 540, 660), 'p-cuffs', 600)         # wide filigree cuffs on their tray
save(frame('velvet', 2), (330, 430, 576, 758), 'p-tassel', 600)
save(frame('velvet', 41), (330, 250, 576, 578), 'p-strands', 600)
save(frame('twist', 12.5), (60, 150, 576, 838), 'p-twist', 720)
save(frame('twist', 3.5), (0, 200, 480, 840), 'unwrap', 720)
save(frame('ahmad', 8), (0, 200, 576, 968), 'ahmad', 720)
save(frame('pamp', 34), (0, 300, 720, 1260), 'p-pamp', 720, sharpen=.2)
save(frame('melt', 36), (0, 120, 576, 888), 'crucible', 720)
save(frame('melt', 53), (0, 150, 576, 918), 'bar', 720)
save(frame('melt', 58.5), (0, 200, 576, 968), 'scale', 720)

def photo(name, box, out, w, sharpen=.15):
    img = cv2.imread(os.path.join(HERE, 'srcimg', name))
    save(img, box, out, w, 80, sharpen)
photo('google-storefront.jpg', (37, 0, 1162, 1500), 'storefront', 900)
photo('google-movado-case.jpg', (37, 0, 1162, 1500), 'p-movado', 720)
photo('google-mesh-bangles.jpg', (60, 120, 700, 973), 'p-mesh-ball', 600)
photo('google-mesh-bangles.jpg', (560, 400, 1200, 1253), 'p-mesh-nail', 600)
photo('google-mesh-bangles.jpg', (37, 0, 1162, 1500), 'tray', 720)

def clip(reel, ss, dur, box, name, w, speed=1.0):
    x0, y0, x1, y1 = box
    vf = f'crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={w}:-2,setpts=PTS/{speed},fps=30'
    o = os.path.join(OUT, name + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(dur * speed), '-i', os.path.join(V, R[reel] + '.mp4'), '-an', '-vf', vf,
                    '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', o], check=True)
    print(name, os.path.getsize(o) // 1024, 'KB')
clip('twist', 0.0, 9.5, (0, 128, 576, 896), 'unwrap', 480)
clip('melt', 49.0, 5.5, (0, 128, 576, 896), 'melt', 480)
