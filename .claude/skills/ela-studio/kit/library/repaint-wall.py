#!/usr/bin/env python3
"""Repaint the outside wall of a scanned/generated bowl, cup or pot.

Image-to-3D can only texture what the photo showed; a wall hidden behind
another dish comes out dark. This paints every outward-facing, below-the-rim
triangle in a flat glaze colour (keeping a little of the original shading),
straight into the model's texture.

usage: python3 repaint-wall.py in.glb out.glb [--color 236,231,222] [--keep .25] [--rim .985] [--fill .55] [--wall .86]
  --rim   fraction of the height above which faces are left alone (the rim lip)
needs gltf-transform (see fetch.py); y must be up in mesh space.
"""
import argparse, json, os, struct, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
import sys; sys.path.insert(0, HERE)
from fetch import gt

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--color", default="236,231,222"); ap.add_argument("--keep", type=float, default=.25)
ap.add_argument("--rim", type=float, default=.985); ap.add_argument("--dot", type=float, default=.2)
ap.add_argument("--fill", type=float, default=.55, help="height fraction of the contents; above it only faces near the outer radius count")
ap.add_argument("--wall", type=float, default=.86, help="outer-radius fraction that counts as wall above --fill")
a = ap.parse_args()
col = np.array([int(v) for v in a.color.split(",")], np.float32)

with tempfile.TemporaryDirectory() as t:
    g = gt()
    subprocess.run([g, "copy", a.src, os.path.join(t, "m.gltf")], check=True, capture_output=True)
    J = json.load(open(os.path.join(t, "m.gltf")))
    bins = {i: open(os.path.join(t, b["uri"]), "rb").read() for i, b in enumerate(J["buffers"])}

    def acc(i):
        A = J["accessors"][i]; V = J["bufferViews"][A["bufferView"]]
        comp = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}[A["componentType"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[A["type"]]
        off = V.get("byteOffset", 0) + A.get("byteOffset", 0)
        dt = np.dtype({"f": np.float32, "I": np.uint32, "H": np.uint16, "B": np.uint8}[comp]); esz = dt.itemsize * n
        stride = V.get("byteStride") or esz
        raw = np.frombuffer(bins[V["buffer"]], dtype=np.uint8)
        sel = off + np.arange(A["count"])[:, None] * stride + np.arange(esz)[None, :]
        arr = raw[sel].copy().view(dt).reshape(A["count"], n)
        return arr if n > 1 else arr[:, 0]

    pr = J["meshes"][0]["primitives"][0]
    P = acc(pr["attributes"]["POSITION"]).astype(np.float64); UV = acc(pr["attributes"]["TEXCOORD_0"]).astype(np.float64)
    I = acc(pr["indices"]).reshape(-1, 3)
    img_i = J["materials"][pr["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    tx_ = J["textures"][img_i]; src_ = tx_.get("source", tx_.get("extensions", {}).get("EXT_texture_webp", {}).get("source"))
    img_uri = J["images"][src_]["uri"]
    tex = Image.open(os.path.join(t, img_uri)).convert("RGB"); W, H = tex.size

    lo, hi = P.min(0), P.max(0); cen = (lo + hi) / 2
    a0, b0, c0 = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]
    n = np.cross(b0 - a0, c0 - a0); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    cc = (a0 + b0 + c0) / 3; rad = cc - cen; rad[:, 1] = 0; rad /= np.linalg.norm(rad, axis=1, keepdims=True) + 1e-12
    outward = (n * rad).sum(1) > a.dot
    below = cc[:, 1] < lo[1] + (hi[1] - lo[1]) * a.rim
    r = np.hypot(cc[:, 0] - cen[0], cc[:, 2] - cen[2]); R = np.hypot(P[:, 0] - cen[0], P[:, 2] - cen[2]).max()
    low = cc[:, 1] < lo[1] + (hi[1] - lo[1]) * a.fill
    sel = np.where(outward & below & (low | (r > a.wall * R)))[0]

    mask = Image.new("L", (W, H), 0); d = ImageDraw.Draw(mask)
    for k in sel:
        pts = [(UV[v, 0] * W, UV[v, 1] * H) for v in I[k]]
        d.polygon(pts, fill=255, outline=255)
    m = np.asarray(mask).astype(np.float32)[..., None] / 255
    px = np.asarray(tex).astype(np.float32)
    lum = px.mean(2, keepdims=True) / 255
    glaze = col * (1 - a.keep) + col * lum * a.keep * 1.6
    out = px * (1 - m) + np.clip(glaze, 0, 255) * m
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(t, img_uri))
    subprocess.run([g, "copy", os.path.join(t, "m.gltf"), a.out], check=True, capture_output=True)
    print(f"repainted {len(sel)} of {len(I)} faces → {a.out}")
