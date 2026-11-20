import os, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
# the SEN lotus emblem, redrawn as line work from their logo (circle, sun rays, side leaves, lotus petals)
LINES = [  # (d, width, class)
    ('M370 290L150 100', 12, 'ray'), ('M370 290L590 100', 12, 'ray'), ('M370 290L80 250', 10, 'ray'), ('M370 290L660 250', 10, 'ray'),
    ('M370 290L445 415', 12, 'ray'), ('M370 290L295 415', 12, 'ray'),
    ('M64 240C110 320 200 390 295 415', 22, 'leaf'), ('M676 240C630 320 540 390 445 415', 22, 'leaf'),
    ('M318 598C318 470 350 380 370 340C390 380 422 470 422 598', 12, 'pet'),
    ('M295 415C270 470 280 540 318 598', 12, 'pet'), ('M445 415C470 470 460 540 422 598', 12, 'pet'),
    ('M76 410C150 430 250 480 318 598', 12, 'pet'), ('M664 410C590 430 490 480 422 598', 12, 'pet'),
]
def emblem(p='e', anim=False):
    s = ('<svg viewBox="30 0 680 630" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="%sg" x1="0" y1="0" x2="1" y2="1">'
         '<stop offset="0" stop-color="#0f3d1c"/><stop offset=".45" stop-color="#2f8a43"/><stop offset=".6" stop-color="#5fb36a"/><stop offset="1" stop-color="#14492a"/></linearGradient></defs>') % p
    s += '<g fill="none" stroke="url(#%sg)" stroke-linecap="round" stroke-linejoin="round">' % p
    s += '<ellipse class="%s" cx="370" cy="315" rx="318" ry="290" stroke-width="16"/>' % ('ln ring' if anim else '')
    s += ''.join('<path class="%s" d="%s" stroke-width="%d"/>' % (('ln ' + c) if anim else '', d, w) for d, w, c in LINES)
    s += '</g><path class="%s" d="M343 30L397 30L370 288Z" fill="url(#%sg)"/></svg>' % ('wedge' if anim else '', p)
    return s

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_CAL': ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
     'I_GIFT': ic('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s4 1 6 1zM12 8c2-4 6-4 6-1s-4 1-6 1z"/>'),
     'I_HAND': ic('<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>'),
     'I_FOOT': ic('<path d="M8 21c-2 0-3-2-3-4 0-3 2-5 2-8s1-6 4-6 4 3 3 6-1 5 0 8-1 4-3 4z"/><circle cx="16.5" cy="4.5" r="1"/><circle cx="18.5" cy="7" r=".9"/>'),
     'I_SPARK': ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
     'I_BRUSH': ic('<path d="M14 4l6 6-8 8H6v-6z"/><path d="M6 18l-2 2"/>')}
BOOK = 'https://lk.macmarketing.us/SenNailLounge-Booking'
t = open(D + 'tpl.html').read()
R = dict(I, EMBLEM_ANIM=emblem('ia', True), EMBLEM=emblem('nv'), EMBLEM2=emblem('ft'), BOOK=BOOK)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write(emblem('fv').replace('<svg ', '<svg width="64" height="64" ', 1))
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:wght@500&family=Nunito+Sans:wght@400;600&display=block" rel="stylesheet">'
og = ('<!doctype html><html><head><meta charset="utf-8">' + FONTS + '<style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(90% 120% at 20% 20%,#fbf7ef,#efe5d4);color:#173d24;font-family:"Nunito Sans"}'
      '.em{position:absolute;left:96px;top:40px;width:190px}.sen{position:absolute;left:62px;top:228px;width:260px;text-align:center;font:600 92px/1 Cinzel;letter-spacing:.04em}'
      '.nl{position:absolute;left:62px;top:326px;width:260px;text-align:center;font:500 34px "Cormorant Garamond";letter-spacing:.12em;color:#3b3a33}'
      'h1{position:absolute;left:380px;top:120px;width:300px;font:500 54px/1.08 "Cormorant Garamond";color:#173d24}'
      '.pill{position:absolute;left:62px;bottom:56px;display:flex;gap:14px;align-items:center;font-size:22px;color:#5b5a52}.pill b{font-weight:600;color:#fff;background:#1d5c2e;border-radius:999px;padding:10px 22px}'
      '.ph{position:absolute;top:28px;right:28px;bottom:28px;width:470px;border-radius:24px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 30%}'
      '</style></head><body><div class="em">' + emblem('og') + '</div><div class="sen">SEN</div><div class="nl">Nail Lounge</div>'
      '<h1>Now open on Hixson Pike</h1><div class="pill"><b>Book now</b><span>5475 Hixson Pike, Hixson, TN</span></div><div class="ph"><img src="../media/chandeliers.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:180px;height:180px;background:#fbf7ef;display:grid;place-items:center"><div style="width:140px">' + emblem('ic') + '</div></body>')
print(len(t) // 1024, 'KB')
