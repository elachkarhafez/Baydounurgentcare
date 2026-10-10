#!/usr/bin/env python3
"""Downsize a Radiance .hdr (Poly Haven ships 1k minimum) for the web.

usage: python3 hdrsize.py in.hdr out.hdr [--width 512] [--exposure 0]
Reads RLE or flat RGBE, box-filters down, writes flat RGBE (three's RGBELoader reads both).
"""
import argparse, re
import numpy as np


def read_hdr(path):
    b = open(path, "rb").read()
    end = b.index(b"\n\n") + 2
    head = b[:end].decode("latin1")
    i = end; line_end = b.index(b"\n", i)
    m = re.match(r"-Y (\d+) \+X (\d+)", b[i:line_end].decode())
    H, W = int(m.group(1)), int(m.group(2)); i = line_end + 1
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        if W >= 8 and b[i] == 2 and b[i + 1] == 2 and b[i + 2] < 128:
            i += 4
            for c in range(4):
                x = 0
                while x < W:
                    n = b[i]; i += 1
                    if n > 128:
                        n -= 128; out[y, x:x + n, c] = b[i]; i += 1
                    else:
                        out[y, x:x + n, c] = np.frombuffer(b[i:i + n], np.uint8); i += n
                    x += n
        else:
            out[y] = np.frombuffer(b[i:i + W * 4], np.uint8).reshape(W, 4); i += W * 4
    e = out[..., 3].astype(np.int32)
    f = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return out[..., :3].astype(np.float32) * f[..., None]


def write_hdr(path, rgb):
    H, W, _ = rgb.shape
    mx = rgb.max(2)
    m, e = np.frexp(mx)
    sc = np.where(mx > 1e-32, m * 256.0 / np.maximum(mx, 1e-32), 0)
    rgbe = np.zeros((H, W, 4), np.uint8)
    rgbe[..., :3] = np.clip(rgb * sc[..., None], 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.where(mx > 1e-32, e + 128, 0).astype(np.uint8)
    with open(path, "wb") as f:
        f.write(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n" + f"-Y {H} +X {W}\n".encode() + rgbe.tobytes())


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--width", type=int, default=512); ap.add_argument("--exposure", type=float, default=0)
    a = ap.parse_args()
    img = read_hdr(a.src) * (2 ** a.exposure)
    k = img.shape[1] // a.width
    H, W = img.shape[0] // k, img.shape[1] // k
    img = img[:H * k, :W * k].reshape(H, k, W, k, 3).mean((1, 3))
    write_hdr(a.out, img)
    print(a.out, W, H, "max", float(img.max()))
