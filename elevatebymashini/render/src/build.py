import json, os, re, html
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'logo.json'))

def grp(o, attrs='', cls=''):
    c = ' class="%s"' % cls if cls else ''
    return '<g transform="%s"><path%s d="%s"%s/></g>' % (o['t'], c, o['d'], attrs)

GOLD_STOPS = '<stop offset="0" stop-color="#8c6324"/><stop offset=".3" stop-color="#d4a955"/><stop offset=".5" stop-color="#f6e3a6"/><stop offset=".68" stop-color="#c5933f"/><stop offset="1" stop-color="#94692a"/>'
SILV_STOPS = '<stop offset="0" stop-color="#7d838c"/><stop offset=".35" stop-color="#d9dde2"/><stop offset=".55" stop-color="#f4f6f8"/><stop offset=".75" stop-color="#aab0b8"/><stop offset="1" stop-color="#6f757e"/>'
def defs(p):
    return ('<defs><linearGradient id="%sg" x1="0" y1="0" x2="1" y2="1">%s</linearGradient>'
            '<linearGradient id="%ss" x1="0" y1="0" x2="1" y2="1">%s</linearGradient>'
            '<linearGradient id="%sw" x1="0" y1="0" x2="1" y2="0">%s</linearGradient></defs>') % (p, GOLD_STOPS, p, SILV_STOPS, p, GOLD_STOPS)

# ---------- intro lockup: every part separate so it can draw, rise and shine
def intro_logo():
    p = 'ig'
    letters = ''.join('<g class="el-l">%s</g>' % grp(x, ' fill="url(#igw)"') for x in L['letters'])
    clip = ''.join(grp(x) for x in L['letters']) + grp(L['gold']) + grp(L['silver']) + grp(L['dental'])
    return ('<svg viewBox="270 105 980 735" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Elevate Dental">' + defs(p) +
            '<clipPath id="igclip">%s</clipPath>' % clip +
            '<g id="el-mark">'
            '<g id="el-ms" fill="none" stroke-linejoin="round">%s%s</g>' % (grp(L['gold'], ' stroke="#e3bf72" stroke-width="34"', 'el-st'), grp(L['silver'], ' stroke="#dfe3e8" stroke-width="34"', 'el-st')) +
            '<g id="el-mf">%s%s</g></g>' % (grp(L['gold'], ' fill="url(#igg)"'), grp(L['silver'], ' fill="url(#igs)"')) +
            '<g id="el-word">%s</g>' % letters +
            '<g id="el-dental">%s</g>' % grp(L['dental'], ' fill="url(#igw)"') +
            '<g id="el-tag">%s</g>' % grp(L['tag'], ' fill="#e9e2d4"') +
            '<g clip-path="url(#igclip)"><rect id="el-shine" x="0" y="100" width="140" height="760" fill="url(#igsh)" transform="skewX(-16)" opacity="0"/></g>'
            '<defs><linearGradient id="igsh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
            '</svg>')

# ---------- nav: mark + ELEVATE / DENTAL to the right
def nav_logo(p='nv'):
    # mark box: x 430..1100, y 115..510 ; letters: x 286..1233, y 548..648 ; dental: y 690..740
    s = .86
    return ('<svg viewBox="0 0 1560 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + defs(p) +
            '<g transform="translate(-430 -112)">%s%s</g>' % (grp(L['gold'], ' fill="url(#%sg)"' % p), grp(L['silver'], ' fill="url(#%ss)"' % p)) +
            '<g transform="translate(700 60) scale(%s) translate(-286 -548)" fill="#a87b34">%s%s</g>' % (s, ''.join(grp(x) for x in L['letters']), grp(L['dental'])) +
            '</svg>')

def mark(p):
    return ('<svg viewBox="430 112 670 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + defs(p) +
            grp(L['gold'], ' fill="url(#%sg)"' % p) + grp(L['silver'], ' fill="url(#%ss)"' % p) + '</svg>')

def full_logo(p, tag='#3a3f48'):
    return ('<svg viewBox="270 105 980 735" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Elevate Dental, family, cosmetic and implants">' + defs(p) +
            grp(L['gold'], ' fill="url(#%sg)"' % p) + grp(L['silver'], ' fill="url(#%ss)"' % p) +
            ''.join(grp(x, ' fill="url(#%sw)"' % p) for x in L['letters']) + grp(L['dental'], ' fill="url(#%sw)"' % p) + grp(L['tag'], ' fill="%s"' % tag) + '</svg>')

BOOK = 'https://www.zocdoc.com/booking-link/practice/elevate-by-mashini-dental-185944'
FLOORS = [
    {'n': 1, 'k': 'Family', 't': 'Family and preventive care', 'img': 'family', 'pos': '50% 40%',
     'p': "Checkups and cleanings for every age, from your kid's first visit on. Gentle with nervous little ones, and with nervous grown-ups too.",
     'li': ['Exams and cleanings', 'Digital X-rays', 'Fluoride and sealants', 'Oral cancer screening', "Kids' visits"]},
    {'n': 2, 'k': 'Cosmetic', 't': 'Cosmetic dentistry', 'img': 'smile', 'pos': '50% 30%',
     'p': 'Brighter, straighter-looking teeth without a mouthful of metal. Whitening, bonding and porcelain veneers, planned with you before anything starts.',
     'li': ['Zoom whitening', 'Porcelain veneers', 'Bonding', 'Smile makeovers']},
    {'n': 3, 'k': 'Implants', 't': 'Implants and restorative', 'img': 'implant', 'pos': '50% 30%',
     'p': 'Missing or broken teeth, put back so they look and work like your own. Dr. Mashini is trained in surgery and implants, so most of it happens right here.',
     'li': ['Dental implants', 'Crowns', 'Bridges', 'Full and partial dentures']},
    {'n': 4, 'k': 'Invisalign', 't': 'Invisalign clear aligners', 'img': 'invisalign', 'pos': '50% 22%',
     'p': 'Straighten your teeth with clear aligners you can take out to eat. We scan your teeth in 3D, so no goopy impression trays.',
     'li': ['Invisalign', 'Clear aligners', '3D digital scans']},
    {'n': 5, 'k': 'Root canals', 't': 'Root canals and oral surgery', 'img': 'rootcanal', 'pos': '50% 25%',
     'p': "The visit people dread, done gently. Dr. Mashini is known for numbing that doesn't hurt, and he'll talk you through every step.",
     'li': ['Root canal therapy', 'Extractions', 'Bone grafting']},
    {'n': 6, 'k': 'Emergency', 't': 'Emergencies and jaw pain', 'img': 'emergency', 'pos': '50% 40%',
     'p': 'Cracked tooth, swelling or a toothache that kept you up. Call and we will get you in as fast as we can.',
     'li': ['Emergency care', 'TMJ and TMD treatment', 'Broken or knocked-out teeth']},
]
OFFERS = [('Free', 'New patient exam and X-rays'), ('Free', 'Implant consultation'), ('$199', 'Zoom teeth whitening')]
REVIEWS = [('Gemma B.', "They were great with my 5 year old with some dental anxiety so we decided to switch the whole family over here. Dr is great, good at explaining things and all the staff is very friendly!"),
           ('Latisia E.', "Highly recommend Elevate by Mashini Dental. The office is spotless, the front desk team is so welcoming, and Dr. Mashini makes the whole visit stress free and pain free!"),
           ('Amanda M.', "Very happy with my experience at Elevate. Dr. Mashini took the time to explain the procedure before starting and made sure I was comfortable the whole way through. Pain management was handled very well, and I never felt anxious or rushed. I really trust him with my care."),
           ('Rere P.', "They took the time to explain every detail about my dental issues. The office staff is fantastic. They caught an issue before it got worse, saving me a lot of future hassle. I highly recommend!")]
INS = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Delta Dental', 'Guardian', 'Humana', 'MetLife', 'Healthy Michigan Plan', 'Healthy Michigan Kids Medicaid']

e = html.escape
def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_CAL': ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_MAIL': ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_STAR': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z"/></svg>'}

BTNS = ''.join('<button type="button" class="fb" data-f="%d" aria-pressed="false" aria-controls="floor"><span class="disc">%d</span><span class="fl">%s</span></button>' % (f['n'], f['n'], e(f['k'])) for f in FLOORS)
CARDS = ''.join('<a class="key rv" href="%s" target="_blank" rel="noopener" style="transition-delay:%dms"><span class="km">%s</span><span class="kb">Grand opening</span><b class="kv">%s</b><span class="kt">%s</span><span class="kf">New patients · Book now</span><i class="strip" aria-hidden="true"></i></a>' % (BOOK, i * 80, mark('k%d' % i), e(v), e(t)) for i, (v, t) in enumerate(OFFERS))
REV = ''.join('<figure class="rev"><div class="stars">%s</div><blockquote>%s</blockquote><figcaption>%s · Google review</figcaption></figure>' % (I['I_STAR'] * 5, e(q), e(n)) for n, q in REVIEWS)
INSL = ''.join('<li>%s</li>' % e(x) for x in INS)

t = open(D + 'tpl.html').read()
R = dict(I, LOGO_INTRO=intro_logo(), LOGO_NAV=nav_logo(), LOGO_FULL=full_logo('ft', '#c9c2b4'), BTNS=BTNS, CARDS=CARDS, REV=REV, INSL=INSL, BOOK=BOOK,
         FLOORS=json.dumps(FLOORS), DOTS_REV=''.join('<i></i>' for _ in REVIEWS), DOTS_KEY=''.join('<i></i>' for _ in OFFERS))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write(mark('fv').replace('<svg ', '<svg width="64" height="64" ', 1))
open(D + '../logo-full.svg', 'w').write(full_logo('lf'))
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Jost:wght@500&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(90% 120% at 20% 30%,#24395c,#13213a 60%,#0d1729);color:#f3eee3;font-family:Jost}'
      '.lg{position:absolute;left:70px;top:46px;width:330px}'
      'h1{position:absolute;left:72px;top:330px;width:560px;font:500 46px/1.12 "Bodoni Moda",serif}'
      '.pill{position:absolute;left:72px;bottom:56px;display:flex;gap:14px;align-items:center;font-size:22px;color:#c9cfda}'
      '.pill b{font-weight:500;color:#1b1408;background:linear-gradient(100deg,#8c6324,#d4a955 28%,#f6e3a6 46%,#c5933f 64%,#94692a);border-radius:999px;padding:10px 20px}'
      '.ph{position:absolute;top:0;right:0;width:470px;height:630px;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}'
      '.ph::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(#0000,#e2c487,#0000)}'
      '</style></head><body><div class="lg">' + full_logo('og', '#d9d2c4') + '</div><h1>Family, cosmetic and implant dentistry in Clinton Township</h1>'
      '<div class="pill"><b>Free new patient exam</b><span>586-434-3400</span></div><div class="ph"><img src="../media/dr-coat.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#13213a;display:grid;place-items:center">' + mark('ic').replace('<svg ', '<svg style="width:140px" ', 1) + '</body></html>')
print(len(t) // 1024, 'KB')
