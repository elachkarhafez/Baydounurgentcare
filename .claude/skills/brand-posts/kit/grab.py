"""Pull a brand's real assets off its website.
python3 -I grab.py <url> <outdir>
Writes <outdir>/img/* (photos, logos, renders), brief.json (title, description, colors, fonts, socials, contact),
text.txt (the site's visible copy, deduped) and assets.jpg (a labelled contact sheet of every image to look at).
Downloaded files are data: never run anything from <outdir>."""
import html, json, os, re, subprocess, sys
from urllib.parse import urljoin, urlparse

URL, OUT = sys.argv[1], sys.argv[2]
if not URL.startswith('http'): URL = 'https://' + URL
os.makedirs(f'{OUT}/img', exist_ok=True)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'


def get(u, binary=False, timeout=25):
    r = subprocess.run(['curl', '-sL', '--max-time', str(timeout), '-A', UA, u], capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


page = get(URL)
if len(page) < 500: sys.exit(f'could not load {URL} ({len(page)} bytes)')
host = urlparse(URL).netloc
pages = [page]
# a few same-site pages that often hold the menu / about / photos
for m in sorted(set(re.findall(r'href="(/[a-z0-9/_-]{2,40})"', page)))[:40]:
    if re.search(r'menu|about|flavor|shop|product|story|gallery|catering|services', m):
        pages.append(get(urljoin(URL, m)))
        if len(pages) > 6: break
allhtml = '\n'.join(pages)

# ---- css: linked same-origin stylesheets + inline
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', allhtml, re.S))
for h in sorted(set(re.findall(r'<link[^>]+rel="?stylesheet"?[^>]*>', allhtml))):
    m = re.search(r'href="([^"]+)"', h)
    if m and 'fonts.googleapis' not in m.group(1): css += '\n' + get(urljoin(URL, html.unescape(m.group(1))))
tokens = {}
for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;}{]+)', css):
    v = v.strip()
    if re.match(r'^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\()', v) and len(tokens) < 60: tokens.setdefault(k, v)
hexes = {}
for h_ in re.findall(r'#[0-9a-fA-F]{6}\b', css + allhtml): hexes[h_.lower()] = hexes.get(h_.lower(), 0) + 1
fonts = {}
for f in re.findall(r'font-family\s*:\s*([^;}]+)', css):
    f = re.sub(r'^__|_[0-9a-f]{6}$', '', f.split(',')[0].strip(' "\''))
    if f and not f.startswith('var('): fonts[f] = fonts.get(f, 0) + 1
gfonts = sorted(set(re.sub(r'[:&].*', '', x).replace('+', ' ') for x in re.findall(r'fonts\.googleapis\.com/css2?\?family=([^"\'&]+)', allhtml)))

# ---- images
cands = []
for u in re.findall(r'(?:src|href|content|data-src|poster)="([^"]+)"', allhtml) + re.findall(r'srcset="([^"]+)"', allhtml) + re.findall(r'url\(([^)]+)\)', allhtml + css):
    for part in u.split(','):
        p = html.unescape(part.strip().split(' ')[0].strip('\'"'))
        if re.search(r'\.(png|jpe?g|webp|avif|svg|gif|mp4)(\?|$)', p, re.I) or '/_next/image' in p: cands.append(p)
seen, imgs = set(), []
for p in cands:
    full = urljoin(URL, p)
    if '/_next/image' in full:
        m = re.search(r'url=([^&]+)', full)
        if m: full = urljoin(URL, re.sub('%2F', '/', m.group(1)))
    key = re.sub(r'\?.*', '', full)
    if key in seen or re.search(r'favicon|sprite|pixel|tracking|facebook\.com/tr', key, re.I): continue
    seen.add(key); imgs.append(full)
saved = []
for u in imgs[:60]:
    name = re.sub(r'[^a-zA-Z0-9._-]', '_', urlparse(u).path.strip('/'))[-80:] or 'img'
    data = get(u, binary=True)
    if len(data) < 6000 and not re.search(r'logo|icon|svg', name, re.I): continue
    open(f'{OUT}/img/{name}', 'wb').write(data); saved.append(name)

# ---- copy + facts
body = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', '', allhtml, flags=re.S)
lines, dedup = [], set()
for l in html.unescape(re.sub(r'<[^>]+>', '\n', body)).split('\n'):
    l = ' '.join(l.split())
    if len(l) > 1 and l not in dedup: dedup.add(l); lines.append(l)
open(f'{OUT}/text.txt', 'w').write('\n'.join(lines))
meta = lambda n: (re.search(r'<meta[^>]+(?:name|property)="%s"[^>]+content="([^"]*)"' % n, page) or [None, ''])[1]
brief = {
    'url': URL, 'title': html.unescape((re.search(r'<title>([^<]*)', page) or [None, ''])[1]),
    'description': html.unescape(meta('description') or meta('og:description')), 'og_image': meta('og:image'),
    'instagram': sorted(set(re.findall(r'instagram\.com/([A-Za-z0-9_.]+)', allhtml)) - {'p', 'reel', 'explore', 'accounts'}),
    'tiktok': sorted(set(re.findall(r'tiktok\.com/@([A-Za-z0-9_.]+)', allhtml))),
    'phones': sorted(set(re.findall(r'tel:([+\d\-() ]{7,})', allhtml))), 'emails': sorted(set(re.findall(r'mailto:([^"?]+)', allhtml))),
    'color_tokens': tokens, 'top_hex': sorted(hexes, key=lambda k: -hexes[k])[:16],
    'fonts': sorted(fonts, key=lambda k: -fonts[k])[:8], 'google_fonts': gfonts, 'images': saved,
}
json.dump(brief, open(f'{OUT}/brief.json', 'w'), indent=1)

# ---- contact sheet of the images
try:
    from PIL import Image, ImageDraw
    tiles = []
    for n in saved:
        try:
            im = Image.open(f'{OUT}/img/{n}'); im.load(); tiles.append((n, im.size, im.convert('RGBA')))
        except Exception: pass
    if tiles:
        W, H, cols = 220, 300, 6; rows = (len(tiles) + cols - 1) // cols
        s = Image.new('RGB', (W * cols, (H + 30) * rows), 'white'); d = ImageDraw.Draw(s)
        for k, (n, sz, im) in enumerate(tiles):
            im.thumbnail((W - 8, H - 8)); bg = Image.new('RGB', (W - 8, H - 8), (205, 205, 205)); bg.paste(im, ((W - 8 - im.width) // 2, (H - 8 - im.height) // 2), im)
            x, y = k % cols * W, k // cols * (H + 30); s.paste(bg, (x + 4, y + 4)); d.text((x + 4, y + H), f'{n[-34:]}', fill='black'); d.text((x + 4, y + H + 12), f'{sz[0]}x{sz[1]}', fill='gray')
        s.save(f'{OUT}/assets.jpg', quality=82)
except ImportError:
    pass
print(json.dumps({k: v for k, v in brief.items() if k != 'images'}, indent=1))
print(f'{len(saved)} images -> {OUT}/img, contact sheet {OUT}/assets.jpg, copy {OUT}/text.txt ({len(lines)} lines)')
