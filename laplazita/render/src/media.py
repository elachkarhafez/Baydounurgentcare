# media prep: crops their site photos into card shots + texture atlases, encodes reels. run with a PIL python:
#   python media.py <site-img-dir> <ig-vid-dir>
import sys, os, subprocess
from PIL import Image, ImageOps
SRC, VID = sys.argv[1], sys.argv[2]
D = os.path.dirname(os.path.abspath(__file__)) + '/../../media/'
CARDS = ['slushy_bar.webp', 'Esquite_Cart_(1).jpg', 'Nacho_Bar_(1).jpg', 'Aguas_Frescas_.jpg', 'IMG_4952.jpeg', 'IMG_2816.jpg', 'Coffee_Bar.jpg',
         'Paleta_Cart.jpg', 'Tostiloco_Bar_.jpg', 'Maruchan_Bar.jpg', 'IMG_7982.jpg', 'IMG_0817.jpg', 'Acai_Bar_(3).jpg', 'Mini_Pancake_Cart.jpg',
         'IMG_0816.jpg', 'IMG_9655.jpg', 'Soft_Serve_Cart.jpg', 'Churro_Bar.jpg', 'Crepe_Cart.jpg']
def card(f, w, h, cy=.5):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, f))).convert('RGB')
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(.5, cy))
for i, f in enumerate(CARDS):
    card(f, 480, 640).save(D + 'c/%02d.webp' % i, quality=74, method=6)
for name, (w, h, cols, rows) in {'atlas-s': (340, 453, 5, 4), 'atlas-l': (480, 640, 5, 4)}.items():
    A = Image.new('RGB', (w * cols, h * rows), '#e9cfc6')
    for i, f in enumerate(CARDS): A.paste(card(f, w, h), ((i % cols) * w, (i // cols) * h))
    A.save(D + name + '.webp', quality=80, method=6); print(name, A.size, os.path.getsize(D + name + '.webp') // 1024, 'KB')
def save(f, out, w, h, cy=.5, q=76):
    card(f, w, h, cy).save(D + out, quality=q, method=6)
save('Carts.jpg', 'carts.webp', 1200, 900, .45)
save('Carts.jpg', 'carts-tall.webp', 900, 1200, .5)
save('Cart.jpg', 'lawn.webp', 1200, 900, .55)
save('IMG_0031.jpg', 'slushy-cart.webp', 900, 1200, .5)
save('Coffe_Pancake_Cart.jpg', 'brand-coffee.webp', 900, 1200, .5)
save('Acai_Bar_(2).jpg', 'ulta-acai.webp', 900, 1200, .5)
REELS = {'quince': ('ig-2.mp4', 0.6), 'wedding': ('ig-4.mp4', 0.0), 'ulta': ('ig-5.mp4', 0.0), 'pancakes': ('ig-6.mp4', 2.0), 'bionico': ('ig-1.mp4', 8.0)}
for k, (f, t) in REELS.items():
    src = os.path.join(VID, f)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', src, '-t', '6', '-an', '-vf', 'scale=360:640:force_original_aspect_ratio=increase,crop=360:640,fps=30',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', D + 'r-%s.mp4' % k], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t + .4), '-i', src, '-frames:v', '1', '-vf', 'scale=360:640:force_original_aspect_ratio=increase,crop=360:640', '/tmp/p.png'], check=True)
    Image.open('/tmp/p.png').convert('RGB').save(D + 'r-%s.webp' % k, quality=70)
    print(k, os.path.getsize(D + 'r-%s.mp4' % k) // 1024, 'KB')
