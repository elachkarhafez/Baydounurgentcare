#!/usr/bin/env python3
"""Contact sheet of catalog thumbnails, so assets can be picked by eye.

usage: python3 peek.py out.jpg <find.py args…>
e.g.   python3 peek.py /tmp/metal.jpg metal --kind material -n 40
"""
import json, os, sys, subprocess, io, urllib.request, concurrent.futures as cf
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
out, args = sys.argv[1], sys.argv[2:]
rows = json.loads(subprocess.check_output([sys.executable, "-I", os.path.join(HERE, "find.py"), *args, "--json"]))


def thumb(x):
    try:
        b = urllib.request.urlopen(urllib.request.Request(x["thumb"], headers={"User-Agent": "ela-studio-library/1.0"}), timeout=40).read()
        im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((200, 200)); return im
    except Exception:
        return Image.new("RGB", (200, 200), "#ccc")


with cf.ThreadPoolExecutor(12) as ex:
    ims = list(ex.map(thumb, rows))
W = 8; cw, ch = 200, 222
sheet = Image.new("RGB", (W * cw, max(1, (len(ims) + W - 1) // W) * ch), "white"); d = ImageDraw.Draw(sheet)
for i, (im, x) in enumerate(zip(ims, rows)):
    X, Y = (i % W) * cw, (i // W) * ch
    sheet.paste(im, (X + (cw - im.width) // 2, Y)); d.text((X + 3, Y + 205), x["id"][:30], fill="black")
sheet.save(out, quality=82)
print(out, len(rows))
