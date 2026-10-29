# Composite the transparent film frames onto the page green (with a soft glow behind the cup) and encode webp.
# usage: python3 encode.py <in_dir> <out_dir> [size=900] [quality=78] [sheet.jpg]
import sys, os, glob
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
SIZE = int(sys.argv[3]) if len(sys.argv) > 3 else 900
Q = int(sys.argv[4]) if len(sys.argv) > 4 else 78
SHEET = sys.argv[5] if len(sys.argv) > 5 else None
BG, GLOW = (3, 39, 27), (16, 66, 46)   # --forest #03271b, glow #10422e
os.makedirs(dst, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, '*.png')))
cache = {}
def backdrop(w, h):
    if (w, h) in cache: return cache[(w, h)]
    im = Image.new('RGB', (w, h), BG)
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    d.ellipse((w * .14, h * .12, w * .86, h * .92), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(w * .16))
    im.paste(Image.new('RGB', (w, h), GLOW), (0, 0), m)
    cache[(w, h)] = im; return im
thumbs = []
for f in files:
    fr = Image.open(f).convert('RGBA')
    out = backdrop(*fr.size).copy(); out.paste(fr, (0, 0), fr)
    if out.size[0] != SIZE: out = out.resize((SIZE, SIZE), Image.LANCZOS)
    name = os.path.splitext(os.path.basename(f))[0] + '.webp'
    out.save(os.path.join(dst, name), 'WEBP', quality=Q, method=6)
    if SHEET: thumbs.append(out.resize((300, 300)))
if SHEET and thumbs:
    cols = min(6, len(thumbs)); rows = (len(thumbs) + cols - 1) // cols
    sh = Image.new('RGB', (cols * 300, rows * 300))
    for i, t in enumerate(thumbs): sh.paste(t, ((i % cols) * 300, (i // cols) * 300))
    sh.save(SHEET, quality=85)
tot = sum(os.path.getsize(os.path.join(dst, x)) for x in os.listdir(dst))
print(len(files), 'frames', tot // 1024, 'KB')
