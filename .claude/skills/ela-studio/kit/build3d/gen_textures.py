import numpy as np
from PIL import Image
from scipy import ndimage
import sys, os

OUT = sys.argv[1]
N = 1024
rng = np.random.default_rng(11)

def fnoise(n, beta, seed):
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n))
    F = np.fft.fft2(w)
    fx = np.fft.fftfreq(n)[:, None]; fy = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx**2 + fy**2); f[0, 0] = 1
    F = F / f**(beta / 2); F[0, 0] = 0
    o = np.real(np.fft.ifft2(F))
    o = (o - o.mean()) / o.std()
    return o

def band(n, lo, hi, seed):
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n))
    F = np.fft.fft2(w)
    fx = np.fft.fftfreq(n)[:, None] * n; fy = np.fft.fftfreq(n)[None, :] * n
    f = np.sqrt(fx**2 + fy**2)
    m = np.exp(-((np.log(f + 1e-6) - np.log((lo * hi) ** .5)) ** 2) / (2 * (np.log(hi / lo) / 2.5) ** 2))
    o = np.real(np.fft.ifft2(F * m)); return (o - o.mean()) / o.std()

def voronoi(n, k, seed, jitter=None):
    r = np.random.default_rng(seed)
    pts = r.random((k, 2)) * n
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    if jitter is not None:
        xx = xx + jitter[0]; yy = yy + jitter[1]
    f1 = np.full((n, n), 1e9, np.float32); f2 = np.full((n, n), 1e9, np.float32); idx = np.zeros((n, n), np.int32)
    for i, (px, py) in enumerate(pts):
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d = np.sqrt((xx - px - ox) ** 2 + (yy - py - oy) ** 2)
                m = d < f1
                f2 = np.where(m, f1, np.minimum(f2, d))
                idx = np.where(m, i, idx)
                f1 = np.where(m, d, f1)
    return f1, f2, idx

def normal_from_h(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5
    nx = -gx * strength; ny = gy * strength; nz = np.ones_like(h)
    l = np.sqrt(nx**2 + ny**2 + nz**2)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return ((n * .5 + .5) * 255).clip(0, 255).astype(np.uint8)

def save(a, name, q=90):
    if a.dtype != np.uint8: a = (a.clip(0, 1) * 255).astype(np.uint8)
    Image.fromarray(a).save(os.path.join(OUT, name), quality=q, optimize=True)

def lerp(a, b, t): return a + (b - a) * t[..., None]

def col(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) / 255 for i in (0, 2, 4)])

def srgb(c): return c  # colours authored in sRGB already

# ---------- BROWNIE TOP: crackled shiny crust ----------
jx = band(N, 3, 14, 1) * 9; jy = band(N, 3, 14, 2) * 9
f1, f2, idx = voronoi(N, 46, 5, (jx, jy))
edge = f2 - f1
crack_w = 2.2 + 1.6 * (band(N, 4, 20, 3) * .5 + .5)
crack = np.exp(-(edge / crack_w) ** 2)                      # 1 inside crack
crack = crack * (band(N, 6, 30, 4) * .35 + .85).clip(0, 1)
# secondary hairline cracks
g1, g2, _ = voronoi(N, 160, 9, (band(N, 6, 30, 6) * 5, band(N, 6, 30, 7) * 5))
hair = np.exp(-((g2 - g1) / 1.1) ** 2) * (band(N, 3, 12, 8) > .25)
r = np.random.default_rng(3)
cell_h = r.random(46)[idx]
cell_tx = (r.random(46) - .5)[idx]; cell_ty = (r.random(46) - .5)[idx]
yy, xx = np.mgrid[0:N, 0:N] / N
plate = cell_h * .35 + (np.sin(xx * 6.283) * 0 + 0)
tilt = (f1 / 40.0).clip(0, 1)  # rises toward cell edge? crust plates curl up at edges
low = fnoise(N, 2.4, 12) * .5
mid = band(N, 20, 80, 13)
fine = band(N, 120, 380, 14)
bubbles = (band(N, 160, 300, 15) > 2.1).astype(float)
bubbles = ndimage.gaussian_filter(bubbles, 1.0)
H = low * .35 + plate + tilt * .25 + mid * .06 + fine * .02 - crack * 1.0 - hair * .25 - bubbles * .25
H = ndimage.gaussian_filter(H, .6)
# albedo
c_crust = col('3e2317'); c_crust2 = col('5b3626'); c_deep = col('1b0d07'); c_sheen = col('6e4532')
t = (mid * .5 + .5).clip(0, 1) * .55 + (low * .5 + .5).clip(0, 1) * .45
A = lerp(np.broadcast_to(c_crust, (N, N, 3)), np.broadcast_to(c_crust2, (N, N, 3)), t * .8)
A = lerp(A, np.broadcast_to(c_sheen, (N, N, 3)), ((tilt - .55) * 1.6).clip(0, 1) * .45)
A = lerp(A, np.broadcast_to(c_deep, (N, N, 3)), (crack * 1.1 + hair * .5 + bubbles * .6).clip(0, 1))
A = A * (1 + fine[..., None] * .035)
save(A, 'brownie_top.jpg')
R = .34 + mid * .03 + crack * .32 + hair * .1 - tilt * .06
save(np.repeat(R[..., None].clip(0, 1), 3, -1), 'brownie_top_r.jpg', 85)
save(normal_from_h(H, 7.0), 'brownie_top_n.jpg')

# ---------- BROWNIE SIDE: dense fudgy cut crumb ----------
low = fnoise(N, 2.2, 21)
lump = band(N, 18, 70, 22)
crumb = band(N, 60, 200, 23)
pores_src = band(N, 90, 260, 24)
pores = ((pores_src - 1.55) * 1.6).clip(0, 1)
pores2 = ((band(N, 30, 70, 25) - 2.0) * 1.2).clip(0, 1)     # occasional bigger holes
chunks = ((band(N, 10, 30, 26) - 1.75) * 2.2).clip(0, 1)     # chocolate chunk pockets
chunks = ndimage.gaussian_filter(chunks, 1.2)
# knife drag streaks (vertical-ish)
streak = ndimage.gaussian_filter(np.random.default_rng(27).standard_normal((N, N)), (40, 1.2), mode='wrap')
streak = streak / streak.std()
H = lump * .22 + crumb * .1 + streak * .05 - pores * .7 - pores2 * .9 + chunks * .35 + low * .15
H = ndimage.gaussian_filter(H, .5)
c_a = col('2a150c'); c_b = col('3d2216'); c_p = col('0f0603'); c_c = col('180b05')
t = ((lump * .5 + .5) * .6 + (crumb * .5 + .5) * .4).clip(0, 1)
A = lerp(np.broadcast_to(c_a, (N, N, 3)), np.broadcast_to(c_b, (N, N, 3)), t * .9)
A = lerp(A, np.broadcast_to(c_p, (N, N, 3)), (pores * .9 + pores2).clip(0, 1))
A = lerp(A, np.broadcast_to(c_c, (N, N, 3)), chunks * .85)
save(A, 'brownie_side.jpg')
R = .58 - chunks * .3 + pores * .2 - (crumb > 1.2) * .1 + streak * .02
save(np.repeat(R[..., None].clip(0, 1), 3, -1), 'brownie_side_r.jpg', 85)
save(normal_from_h(H, 6.0), 'brownie_side_n.jpg')

# ---------- ICE CREAM: vanilla with bean flecks + icy grain ----------
M = 512
low = fnoise(M, 2.6, 31)
grain = band(M, 60, 200, 32)
crys = ((band(M, 100, 240, 33) - 1.6) * 1.5).clip(0, 1)
specks = (np.random.default_rng(34).random((M, M)) > .9985).astype(float)
specks = ndimage.binary_dilation(specks, iterations=1).astype(float) * (np.random.default_rng(35).random((M, M)) > .4)
specks = ndimage.gaussian_filter(specks.astype(float), .6).clip(0, 1)
c_ice = col('f2e6cb'); c_ice2 = col('eadbb8'); c_bean = col('3a2617')
A = lerp(np.broadcast_to(c_ice, (M, M, 3)), np.broadcast_to(c_ice2, (M, M, 3)), (low * .5 + .5).clip(0, 1) * .8)
A = lerp(A, np.broadcast_to(c_bean, (M, M, 3)), specks * .85)
save(A, 'ice.jpg')
H = grain * .2 + crys * .35 + low * .2
save(normal_from_h(H, 3.5), 'ice_n.jpg')
R = .5 - crys * .15 + grain * .03
save(np.repeat(R[..., None].clip(0, 1), 3, -1), 'ice_r.jpg', 85)
print('done')
