"""Silver Dental waiting room TV preview (1080x1920, 30 fps) for sending from a phone.
c1 logo card -> their real waiting room with both TVs playing the ads (camera pushes in) -> through the screen
into a floating TV showcase with glitch cuts -> c2 end card. Everything is composited per frame so the screens stay sharp."""
import subprocess, sys, math, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = '/home/user/Baydounurgentcare/silverdental'
ADS = sys.argv[1]            # folder with s1..s11.mp4
OUT = sys.argv[2]            # silent mp4
PREVIEW = '--preview' in sys.argv
FPS = 30; W, H = 1080, 1920; AW, AH = 1280, 720
rng = np.random.default_rng(7)

class Reader:
    def __init__(self, path, start, w=AW, h=AH):
        self.w, self.h = w, h
        self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', '%.3f' % start, '-i', path, '-vf', 'scale=%d:%d:flags=lanczos' % (w, h), '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
        self.last = np.zeros((h, w, 3), np.uint8)
    def read(self):
        b = self.p.stdout.read(self.w * self.h * 3)
        if len(b) == self.w * self.h * 3: self.last = np.frombuffer(b, np.uint8).reshape(self.h, self.w, 3).copy()
        return self.last
    def close(self):
        try: self.p.kill()
        except Exception: pass

class Seq:
    """plays a list of (clip, start, dur) back to back"""
    def __init__(self, items): self.items = items; self.i = -1; self.r = None; self.t0 = 0; self.cut = []
    def frame(self, t):
        acc = 0
        for k, (c, s, d) in enumerate(self.items):
            if t < acc + d or k == len(self.items) - 1:
                if k != self.i:
                    if self.r: self.r.close()
                    self.r = Reader(os.path.join(ADS, c + '.mp4'), s + max(0, t - acc)); self.i = k
                return self.r.read(), k, t - acc
            acc += d
    def starts(self):
        acc, out = 0, []
        for c, s, d in self.items: out.append(acc); acc += d
        return out

def ease_io(x): x = min(1, max(0, x)); return .5 - .5 * math.cos(math.pi * x)
def ease_in3(x): x = min(1, max(0, x)); return x ** 3
def ease_out3(x): x = min(1, max(0, x)); return 1 - (1 - x) ** 3

# ---------- plate: their waiting room, upscaled, graded a touch darker and cooler so the screens glow
U = 2
plate = cv2.imread(os.path.join(HERE, 'waiting2.png'))
plate = cv2.resize(plate, (720 * U, 1280 * U), interpolation=cv2.INTER_LANCZOS4)
bl = cv2.GaussianBlur(plate, (0, 0), 2.2); plate = cv2.addWeighted(plate, 1.6, bl, -.6, 0)
pf = plate.astype(np.float32) / 255
pf = pf * np.array([1.0, .97, .92], np.float32) * .9
pf = np.clip((pf - .5) * 1.08 + .5, 0, 1)
plate = (pf * 255).astype(np.uint8)
# the screens in the photo (corner pins in the 720x1280 photo)
QC = np.float32([[260.5, 522], [516.5, 502], [518, 657.5], [261, 659]])
QL = np.float32([[-35, 413], [195, 525.5], [192.5, 661], [-35, 660]])
SRC = np.float32([[0, 0], [AW, 0], [AW, AH], [0, AH]])
HC = cv2.getPerspectiveTransform(SRC, QC); HL = cv2.getPerspectiveTransform(SRC, QL)

# glare on the glass, added to the screen image before it is pinned
yy, xx = np.mgrid[0:AH, 0:AW].astype(np.float32)
band = np.exp(-((xx * .55 + yy - AW * .42) / 160) ** 2) * .07 + np.clip(1 - yy / AH, 0, 1) * .04
GLARE = (band[..., None] * 255).astype(np.float32)
def screenize(img):
    f = img.astype(np.float32) * .94 + 8 + GLARE
    return np.clip(f, 0, 255).astype(np.uint8)

ONES = np.full((AH, AW), 255, np.uint8)
def pin(out, img, Hm, glow=0.0):
    sc = cv2.warpPerspective(img, Hm, (W, H), flags=cv2.INTER_LINEAR)
    m = cv2.warpPerspective(ONES, Hm, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32)[..., None] / 255
    o = out.astype(np.float32) * (1 - m) + sc.astype(np.float32) * m
    if glow:
        small = cv2.resize((sc.astype(np.float32) * m), (W // 6, H // 6), interpolation=cv2.INTER_AREA)
        g = cv2.GaussianBlur(small, (0, 0), 14)
        o += cv2.resize(g, (W, H)) * glow
    return np.clip(o, 0, 255)

def cam_affine(cx, cy, w):
    s = W / w; h = w * H / W
    return np.float32([[s, 0, -(cx - w / 2) * s], [0, s, -(cy - h / 2) * s], [0, 0, 1]])

# ---------- glitch for the cuts
def glitch(img, k):
    if k <= 0: return img
    out = img.copy(); dx = int(26 * k) + 1
    out[:, :, 2] = np.roll(img[:, :, 2], dx, axis=1); out[:, :, 0] = np.roll(img[:, :, 0], -dx, axis=1)
    for _ in range(int(7 * k) + 1):
        y = int(rng.integers(0, img.shape[0] - 60)); hh = int(rng.integers(6, 50))
        out[y:y + hh] = np.roll(out[y:y + hh], int(rng.integers(-90, 90)), axis=1)
    return cv2.addWeighted(out, 1, np.full_like(out, 255), .22 * k, 0)

# ---------- type and overlays
F = lambda n, s: ImageFont.truetype(os.path.join(HERE, n), s)
OSW, OSW6, URB = 'Oswald_wght_500.ttf', 'Oswald_wght_600.ttf', 'Urbanist_wght_700.ttf'
def text_layer(draws):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for (txt, font, y, fill, track) in draws:
        f = font; widths = [d.textlength(c, font=f) for c in txt]; tw = sum(widths) + track * (len(txt) - 1)
        x = (W - tw) / 2
        for c, cw in zip(txt, widths): d.text((x, y), c, font=f, fill=fill); x += cw + track
    return im
def to_bgra(im):
    a = np.array(im).astype(np.float32); return a[..., [2, 1, 0]], a[..., 3:] / 255
def over(o, rgb, a, alpha=1.0):
    return o * (1 - a * alpha) + rgb * (a * alpha)

logo = Image.open(os.path.join(HERE, 'logoH.png')).convert('RGBA'); lw = 330; logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
top = Image.new('RGBA', (W, H), (0, 0, 0, 0)); top.alpha_composite(logo, ((W - lw) // 2, 150))
top.alpha_composite(text_layer([('WAITING ROOM TV', F(OSW, 46), 300, (214, 222, 233, 255), 14)]))
TOP = to_bgra(top)
NAMES = [('02', 'NO INSURANCE? $99'), ('04', 'FLUORIDE'), ('05', 'BRUSH 2 MINUTES'), ('07', 'FLOSS ONCE A DAY'), ('09', 'WALK-INS WELCOME'), ('10', 'MEET THE TWINS'), ('11', 'THANKSGIVING GIVEAWAY')]
TICK = [to_bgra(text_layer([(n + '  /  11', F(OSW, 38), 1468, (156, 195, 255, 255), 10), (t, F(OSW6, 86), 1520, (244, 246, 249, 255), 6)])) for n, t in NAMES]
# hud brackets + scanlines for the showcase
hud = np.zeros((H, W, 4), np.float32)
for (x, y, sx, sy) in ((50, 50, 1, 1), (W - 50, 50, -1, 1), (50, H - 50, 1, -1), (W - 50, H - 50, -1, -1)):
    cv2.line(hud, (x, y), (x + 90 * sx, y), (225, 219, 214, 200), 3, cv2.LINE_AA); cv2.line(hud, (x, y), (x, y + 90 * sy), (225, 219, 214, 200), 3, cv2.LINE_AA)
HUD = (hud[..., :3], hud[..., 3:] / 255)
scan = np.ones((H, W, 1), np.float32); scan[::5] = .9; scan[1::5] = .9
grain = [rng.normal(0, 5.5, (H // 2, W // 2, 1)).astype(np.float32) for _ in range(6)]
def add_grain(o, i): return o + cv2.resize(grain[i % 6], (W, H))[..., None]

VP = (540, 1230)
def grid(o, t, a):
    lay = np.zeros((H, W, 3), np.float32)
    for j in range(-12, 13): cv2.line(lay, (540 + j * 170, H), VP, (255, 195, 156), 2, cv2.LINE_AA)
    ph = (t * .9) % 1
    for i in range(0, 24):
        d = i + 1 - ph
        y = int(VP[1] + (H - VP[1]) * 1.6 / (d * .55 + 1.6) * 1.0)
        if VP[1] < y < H: cv2.line(lay, (0, y), (W, y), (255, 195, 156), 2, cv2.LINE_AA)
    fade = np.clip((np.arange(H, dtype=np.float32) - VP[1]) / 420, 0, 1)[:, None, None]
    return o + lay * fade * a

def tv_quad(cx, cy, w, yaw, pitch, f=2600.0, pad=0.0):
    h = w * 9 / 16; pts = []
    for (X, Y) in ((-w / 2 - pad, -h / 2 - pad), (w / 2 + pad, -h / 2 - pad), (w / 2 + pad, h / 2 + pad), (-w / 2 - pad, h / 2 + pad)):
        x1 = X * math.cos(yaw); z1 = X * math.sin(yaw)
        y2 = Y * math.cos(pitch) - z1 * math.sin(pitch); z2 = Y * math.sin(pitch) + z1 * math.cos(pitch)
        k = f / (f + z2); pts.append([cx + x1 * k, cy + y2 * k])
    return np.float32(pts)

yv, xv = np.ogrid[0:H, 0:W]
VIG = (1 - .45 * (((xv - W / 2) / (W * .75)) ** 2 + ((yv - H / 2) / (H * .7)) ** 2)).clip(.35, 1).astype(np.float32)[..., None]
# ---------- the edit
C1 = Reader(os.path.join(HERE, 'cards', 'c1.mp4'), 0, W, H); C2 = None
T_ROOM = 3.0; ROOM_D = 8.4; PUSH_D = 1.4; T_SHOW = T_ROOM + ROOM_D + PUSH_D
CENTER = Seq([('s9', 0, 8.8), ('s2', 0, 6)])
LEFT = Seq([('s3', 0, 8.73), ('s4', 0, 6)])
SHOW_ITEMS = [('s2', ROOM_D + PUSH_D - 8.8, 2.3), ('s4', 1.2, 2.6), ('s5', .7, 2.3), ('s7', .9, 2.6), ('s9', 3.8, 2.1), ('s10', .9, 2.0), ('s11', .9, 2.4)]
SHOW = Seq(SHOW_ITEMS); SHOW_D = sum(d for _, _, d in SHOW_ITEMS); CUTS = SHOW.starts()[1:]
T_END = T_SHOW + SHOW_D - .4; END_D = 4.4; TOTAL = T_END + END_D
N = int(TOTAL * FPS)
print('total %.2fs, %d frames, cuts at' % (TOTAL, N), [round(T_SHOW + c, 2) for c in CUTS], 'end', round(T_END, 2))
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'veryfast' if PREVIEW else 'slow', '-crf', '28' if PREVIEW else '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
step = 6 if PREVIEW else 1
for fi in range(0, N, step):
    t = fi / FPS
    o = None
    # 1 · logo card
    if t < T_ROOM + .45:
        c1 = C1.read().astype(np.float32)
        if PREVIEW:
            for _ in range(step - 1): C1.read()
        o = c1
    # 2 · their waiting room, camera pushes towards the TV
    if T_ROOM <= t < T_SHOW + .02:
        tt = t - T_ROOM
        if tt < ROOM_D:
            e = ease_io(tt / ROOM_D); cx = 360 + (389 - 360) * e; cy = 640 + (585 - 640) * e; w = 720 + (470 - 720) * e
        else:
            e = ease_in3((tt - ROOM_D) / PUSH_D); cx = 389; cy = 585 + (580 - 585) * e; w = 470 + (232 - 470) * e
        A = cam_affine(cx, cy, w)
        Ap = A.copy(); Ap[0, 0] /= U; Ap[1, 1] /= U
        room = cv2.warpAffine(plate, Ap[:2], (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        a1, _, _ = CENTER.frame(tt); a2, _, _ = LEFT.frame(tt)
        room = pin(room, screenize(a2), A @ HL, glow=.5)
        room = pin(room, screenize(a1), A @ HC, glow=.8)
        room = room * VIG
        if tt > ROOM_D + PUSH_D - .25: room = room + 255 * ((tt - (ROOM_D + PUSH_D - .25)) / .25) * .55
        if o is None: o = room
        else:
            k = (t - T_ROOM) / .45; flash = math.sin(math.pi * min(1, k)) * 120
            o = o * (1 - k) + room * k + flash
    # 3 · floating TV showcase
    if t >= T_SHOW:
        ts = t - T_SHOW
        ad, idx, local = SHOW.frame(ts)
        k = 0
        for c in CUTS: k = max(k, 1 - abs(ts - c) / .2)
        ad = glitch(ad, k)
        bgsrc = ad[:, (AW - 405) // 2:(AW - 405) // 2 + 405]
        bg = cv2.resize(cv2.GaussianBlur(cv2.resize(bgsrc, (54, 96), interpolation=cv2.INTER_AREA), (0, 0), 3), (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32) * .32
        bg += np.array([30, 14, 6], np.float32)
        intro = ease_out3(ts / .9)
        o3 = grid(bg, ts, .22 * intro)
        wtv = 1120 + (960 - 1120) * intro; cyv = 960 + (860 - 960) * intro
        yaw = math.radians(7 * math.sin(ts * .9)) * intro; pitch = math.radians(-4 + 3 * math.sin(ts * .7 + 1)) * intro
        q = tv_quad(540, cyv, wtv, yaw, pitch); qb = tv_quad(540, cyv, wtv, yaw, pitch, pad=16)
        # reflection on the floor
        rq = q.copy(); bottom = (q[2, 1] + q[3, 1]) / 2
        rq[:, 1] = bottom + (bottom - q[:, 1]) * .55 + 40
        rq = rq[[3, 2, 1, 0]]
        refl = cv2.warpPerspective(ad, cv2.getPerspectiveTransform(SRC, rq), (W, H)).astype(np.float32)
        rmask = cv2.warpPerspective(ONES, cv2.getPerspectiveTransform(SRC, rq), (W, H)).astype(np.float32)[..., None] / 255
        fall = np.clip(1 - (np.arange(H, dtype=np.float32)[:, None, None] - bottom - 40) / 330, 0, 1)
        o3 = o3 * (1 - rmask * .2 * fall) + refl * rmask * .2 * fall
        # bezel, then the screen with glow
        bz = np.zeros((H, W, 3), np.uint8); cv2.fillConvexPoly(bz, qb.astype(np.int32), (24, 21, 18), cv2.LINE_AA)
        bm = np.zeros((H, W), np.uint8); cv2.fillConvexPoly(bm, qb.astype(np.int32), 255, cv2.LINE_AA)
        o3 = o3 * (1 - bm[..., None] / 255.) + bz * (bm[..., None] / 255.)
        mb = float(ad[::16, ::16].mean()); o3 = pin(o3, screenize(ad), cv2.getPerspectiveTransform(SRC, q), glow=float(np.clip(1.25 - mb / 140, .22, .9)))
        edge = np.zeros((H, W, 3), np.float32); cv2.polylines(edge, [qb.astype(np.int32)], True, (212, 205, 200), 2, cv2.LINE_AA); o3 = o3 + edge * .5
        # titles
        o3 = over(o3, TOP[0], TOP[1], intro)
        tk = TICK[idx]; ta = min(1, local / .25)
        o3 = over(o3, tk[0], tk[1], ta)
        # progress segments
        for si in range(7):
            x0 = 140 + si * 116; col = (255, 195, 156) if si < idx else ((255, 255, 255) if si == idx else (90, 80, 72))
            cv2.line(o3, (x0, 1680), (x0 + 100, 1680), col, 5, cv2.LINE_AA)
            if si == idx: cv2.line(o3, (x0, 1680), (x0 + int(100 * min(1, local / SHOW_ITEMS[idx][2])), 1680), (255, 195, 156), 5, cv2.LINE_AA)
        o3 = over(o3, HUD[0], HUD[1], intro)
        o3 = o3 * scan
        if ts < .25: o3 = o3 + 255 * (1 - ts / .25) * .55
        o3 = o3 + 140 * k * .3
        o = o3 if o is None or t >= T_SHOW + .02 else o3
    # 4 · end card
    if t >= T_END:
        if C2 is None: C2 = Reader(os.path.join(HERE, 'cards', 'c2.mp4'), 0, W, H)
        c2 = C2.read().astype(np.float32)
        if PREVIEW:
            for _ in range(step - 1): C2.read()
        k = min(1, (t - T_END) / .4)
        o = c2 if o is None else o * (1 - k) + c2 * k + math.sin(math.pi * k) * 90
    o = add_grain(o, fi)
    enc.stdin.write(np.clip(o, 0, 255).astype(np.uint8).tobytes())
    if fi % 150 == 0: print('frame', fi, '/', N, flush=True)
enc.stdin.close(); enc.wait()
print('done', OUT)
