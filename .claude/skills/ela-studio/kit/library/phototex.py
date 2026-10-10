#!/usr/bin/env python3
"""Turn a crop of a client's own photo into a tiling PBR texture set.

The fastest realism win for food: the real rice, char and breading from their
photos, made seamless, plus a normal map derived from the photo's detail.

usage: python3 phototex.py <photo> x0,y0,x1,y1 <out_prefix> [--size 512] [--h 512] [--rot] [--strength 2.5]
                           [--no-seam] [--sat 1.0] [--flatten 0.5]
writes <out_prefix>.webp (colour) and <out_prefix>_n.webp (OpenGL normal)
  --rot       rotate 90° (put a long horizontal strip along V, e.g. kofta down a lathe)
  --flatten   evens out large-scale lighting from the photo (0 = off, 1 = full)
"""
import argparse
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("box"); ap.add_argument("out")
ap.add_argument("--size", type=int, default=512); ap.add_argument("--h", type=int)
ap.add_argument("--rot", action="store_true"); ap.add_argument("--no-seam", action="store_true")
ap.add_argument("--strength", type=float, default=2.5); ap.add_argument("--sat", type=float, default=1.0)
ap.add_argument("--flatten", type=float, default=.5); ap.add_argument("--q", type=int, default=86)
a = ap.parse_args()

x0, y0, x1, y1 = map(int, a.box.split(","))
im = Image.open(a.src).convert("RGB").crop((x0, y0, x1, y1))
if a.rot: im = im.transpose(Image.Transpose.ROTATE_90)
W, H = a.size, a.h or a.size
im = im.resize((W, H), Image.LANCZOS)
c = np.asarray(im).astype(np.float32) / 255

# flatten low-frequency lighting so the tile doesn't show a bright corner repeating
if a.flatten > 0:
    lo = np.asarray(im.filter(ImageFilter.GaussianBlur(min(W, H) / 6))).astype(np.float32) / 255
    mean = c.reshape(-1, 3).mean(0)
    c = np.clip(c * (1 - a.flatten) + (c / np.maximum(lo, 1e-3) * mean) * a.flatten, 0, 1)

if a.sat != 1:
    g = c.mean(2, keepdims=True); c = np.clip(g + (c - g) * a.sat, 0, 1)

# seamless: blend with a half-offset copy, feathering toward the edges
if not a.no_seam:
    sh = np.roll(np.roll(c, H // 2, 0), W // 2, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.minimum(np.minimum(xx, W - 1 - xx) / (W * .25), np.minimum(yy, H - 1 - yy) / (H * .25))
    w = np.clip(d, 0, 1)[..., None]; w = w * w * (3 - 2 * w)
    c = c * w + sh * (1 - w)

Image.fromarray((c * 255).astype(np.uint8)).save(a.out + ".webp", quality=a.q)

# normal map from luminance high-pass (dark = low, as with char and crevices)
lum = Image.fromarray((c.mean(2) * 255).astype(np.uint8))
hp = np.asarray(lum).astype(np.float32) / 255 - np.asarray(lum.filter(ImageFilter.GaussianBlur(min(W, H) / 24))).astype(np.float32) / 255
hp = np.asarray(Image.fromarray(((hp + .5).clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))).astype(np.float32) / 255
dx = (np.roll(hp, -1, 1) - np.roll(hp, 1, 1)) * a.strength
dy = (np.roll(hp, -1, 0) - np.roll(hp, 1, 0)) * a.strength
n = np.dstack([-dx, dy, np.ones_like(hp)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8)).save(a.out + "_n.webp", quality=90)
print(a.out, W, H)
