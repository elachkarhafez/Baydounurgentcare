import os, re, json, html
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
M = json.load(open(D + 'mark.json'))  # their 5D mark (from their own pinned-tab SVG): D, 5, baby, baby's foot
BOOK = html.escape(open(D + 'book.txt').read().strip(), quote=True)
GOLD, INK = '#b8863b', '#2b2422'
e = html.escape

def mark(anim=False, ink=INK, gold=GOLD):
    c = (lambda n: ' class="%s"' % n) if anim else (lambda n: '')
    s = '<svg viewBox="40 300 1950 1390" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0,2000) scale(0.1,-0.1)">'
    s += '<path%s d="%s" fill="%s"/>' % (c('m5'), M[1], ink)
    s += '<path%s d="%s" fill="%s"/>' % (c('mD'), M[0], gold)
    s += '<g%s fill="%s"><path d="%s"/><path d="%s"/></g>' % (c('mB'), gold, M[2], M[3])
    return s + '</g></svg>'

def foot(flip=False):
    t = ' transform="translate(40 0) scale(-1 1)"' if flip else ''
    return ('<g%s><path d="M20 58c-9 0-13-8-12-18 1-9 6-14 6-22 0-7 4-11 9-11s9 5 9 12c0 8-3 13-3 21 0 11-2 18-9 18z"/>'
            '<circle cx="12" cy="4" r="3.4"/><circle cx="19" cy="2" r="3"/><circle cx="25" cy="3" r="2.6"/><circle cx="30" cy="6" r="2.2"/><circle cx="33" cy="10" r="1.9"/></g>') % t
FEET = '<svg class="feet" viewBox="0 -2 84 62" aria-hidden="true"><g fill="%s"><g class="f1">%s</g><g class="f2" transform="translate(44 0)">%s</g></g></svg>' % (GOLD, foot(True), foot())
def word(cls=''):
    return '<span class="wm %s"><span class="wl">PEEK</span> <span class="wl">A</span> <span class="wl">B</span>%s<span class="wl">TIQUE</span></span>' % (cls, FEET)

PACKS = [
    ('SneakPeek DNA', '$149', 'DNA gender from 6 weeks', ['Gender starting at 6 weeks', 'Results in 1 business day'], 'dna'),
    ('The Comfort Scan', '$75', '10 minute 2D ultrasound', ["Listen to baby's heartbeat", 'B&W printed images', '$10 off a future session'], '2d'),
    ('2D Peek A Bootique', '$95', '15 minute 2D ultrasound', ['Gender determination (16+ weeks)', "Listen to baby's heartbeat", 'All photos sent via Baby Stream Live', 'Printed images', '$10 off a future session'], '2d'),
    ('Peek A Bootique Special', '$135', '10 minute 4D/5D/HD ultrasound', ['Gender confirmation 16+ weeks (on request)', "Listen to baby's heartbeat", 'Printed images'], '5d'),
    ('Delux HD Peek A Bootique', '$165', '15 minute 4D/5D/HD ultrasound', ['Gender confirmation 16+ weeks (on request)', "Listen to baby's heartbeat", 'Printed images', 'All photos sent via Baby Stream Live'], '5d'),
    ('Ultra HD Peek A Bootique', '$200', '25 minute 4D/5D/HD ultrasound', ['Gender confirmation 16+ weeks (on request)', "Listen to baby's heartbeat", 'Photo folder with (2) 4x6 colored images', 'Printed B&W images', 'All photos sent via Baby Stream Live', 'Recorded video via Baby Stream Live'], '5d'),
]
PCARDS = ''.join('<article class="pk" data-k="%d"><span class="kind">%s</span><h3>%s</h3><div class="pr">%s</div><p class="len">%s</p><ul>%s</ul><a class="btn b-line" href="%s" target="_blank" rel="noopener">Book this</a></article>' % (
    i, {'dna': 'DNA', '2d': '2D', '5d': '4D · 5D · HD'}[k], e(n), p, e(l), ''.join('<li>%s</li>' % e(x) for x in li), BOOK) for i, (n, p, l, li, k) in enumerate(PACKS))
FAQ = [
    ('What is the difference between 3D and 4D/HD/5D?', '3D is a still image, while 4D/HD/5D adds motion, so it looks like a video. HD/5D uses software to change the focal points and lighting so you can see all the details of the baby.'),
    ('When is the best time to come in?', 'It depends on what you want to see. Many moms come in twice: at 15 to 26 weeks to see the baby as a whole, and again at 25 to 34 weeks for a more detailed face. Between 28 and 32 weeks babies get more fat and a more defined face. After 34 weeks it gets harder as baby runs out of room, but we have gotten great images up to 39 weeks.'),
    ('How do I get the best pictures?', 'Water. Drink plenty of it for at least 7 days before your appointment. About half an hour before, have a fruit juice so your baby is awake, unless your doctor has told you not to.'),
    ('Is it safe?', '3D and 4D/HD/5D ultrasound use the same frequency your doctor uses for a normal 2D ultrasound. According to the FDA, there have been no proven side effects from its proper use. We require that you are under prenatal care, and our technicians do not give medical advice or diagnoses.'),
    ('What if you cannot see the gender or get images?', 'If you are over 15 weeks and the gender cannot be seen, or we cannot get 3D/4D/HD/5D images because of the baby\'s position or other factors, we will rescan you for free within 14 days.'),
    ('Can family and kids come?', 'Yes. Bring your family and friends to share the moment. Children are welcome too, and becoming a big sister or brother is a big deal here.'),
    ('Do you take insurance?', 'No. This is an elective ultrasound, so we take major credit and debit cards and cash.'),
    ('When do I get my pictures and videos?', 'Right after your session.'),
]
FQ = ''.join('<details class="fq"><summary>%s</summary><p>%s</p></details>' % (e(q), e(a)) for q, a in FAQ)

def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_CAL': ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
     'I_MAIL': ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
     'I_HEART': ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>')}
t = open(D + 'tpl.html').read()
R = dict(I, MARK_ANIM=mark(True, '#f3e6d6', '#d8a75a'), MARK=mark(), MARK_LIGHT=mark(False, '#f3e6d6', '#d8a75a'), WORD_ANIM=word('anim'), WORD=word(), BOOK=BOOK, PCARDS=PCARDS, FQ=FQ, PACKS=json.dumps([[n, p, k] for n, p, _, _, k in PACKS]))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write(mark().replace('<svg ', '<svg width="64" height="64" ', 1))
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Allura&family=Mulish:wght@500;600&display=block" rel="stylesheet">'
CSSW = '.wm{font-family:Marcellus,serif;letter-spacing:.06em;white-space:nowrap;display:inline-flex;align-items:center;gap:.22em}.wm .feet{height:.78em;width:auto;margin:0 -.04em}'
og = ('<!doctype html><html><head><meta charset="utf-8">' + FONTS + '<style>' + CSSW +
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#fbf6f1;color:#2b2422;font-family:Mulish}'
      '.mk{position:absolute;left:66px;top:60px;width:150px}.w{position:absolute;left:62px;top:220px;font-size:50px}.sc{position:absolute;left:120px;top:282px;font:400 46px Allura;color:#b8863b}'
      'h1{position:absolute;left:64px;top:370px;width:520px;font:400 44px/1.15 Marcellus}'
      '.pill{position:absolute;left:64px;bottom:52px;display:flex;gap:14px;align-items:center;font-size:22px;color:#6b5e58}.pill b{font-weight:600;color:#fff;background:#b8863b;border-radius:999px;padding:10px 22px}'
      '.ph{position:absolute;top:28px;right:28px;bottom:28px;width:500px;border-radius:26px;overflow:hidden;background:#1c1411}.ph img{width:100%;height:100%;object-fit:cover}'
      '</style></head><body><div class="mk">' + mark() + '</div><div class="w">' + word() + '</div><div class="sc">5D Ultrasound Experience</div>'
      '<h1>Meet your baby on a 75 inch screen</h1><div class="pill"><b>Book now</b><span>Dearborn · Ann Arbor</span></div><div class="ph"><img src="../media/face6.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:180px;height:180px;background:#fbf6f1;display:grid;place-items:center"><div style="width:150px">' + mark() + '</div></body>')
print(len(t) // 1024, 'KB')
