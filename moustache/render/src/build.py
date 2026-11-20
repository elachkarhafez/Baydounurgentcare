import os, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
# drawn mark: a handlebar moustache (the shop has no published logo)
HALF = ('M100 34C106 26 118 20 132 22C146 24 154 34 164 40C172 45 182 44 186 36C189 29 186 22 180 20'
        'C184 26 182 32 176 33C168 34 160 28 150 30C140 32 132 44 120 50C112 54 104 52 100 46Z')
def stache(anim=False):
    s = '<svg viewBox="0 10 200 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    if anim:
        s += '<g fill="none" stroke="#111317" stroke-width="2.4" stroke-linejoin="round"><path class="st" d="%s"/><path class="st" d="%s" transform="translate(200 0) scale(-1 1)"/></g>' % (HALF, HALF)
        s += '<g class="sf" fill="#111317"><path d="%s"/><path d="%s" transform="translate(200 0) scale(-1 1)"/></g>' % (HALF, HALF)
    else:
        s += '<g fill="currentColor"><path d="%s"/><path d="%s" transform="translate(200 0) scale(-1 1)"/></g>' % (HALF, HALF)
    return s + '</svg>'
HAIR = '#2a2320'
HEAD = ('<svg viewBox="30 10 170 205" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Side view of a head showing the fade you picked">'
        '<defs><linearGradient id="fgrad" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="150" y2="112"><stop id="fstop0" offset="0" stop-color="%s" stop-opacity="0"/><stop offset="1" stop-color="#4a403a" stop-opacity=".92"/></linearGradient></defs>'
        '<path d="M150 214C150 200 152 190 156 182C180 186 196 200 200 214Z" fill="#fff"/><path d="M104 214C108 200 112 188 112 176C130 182 146 182 156 180C152 192 150 204 150 214Z" fill="#c9cdd3"/>'
        '<path d="M150 200C148 182 150 168 160 152C172 134 176 110 172 86C168 54 146 32 118 30C88 28 66 44 60 70C58 80 58 88 56 96C52 102 46 110 48 116C50 120 56 120 58 124C56 130 58 134 60 138C58 142 60 146 62 150C62 160 66 170 76 172C90 174 104 168 112 160C116 172 116 188 112 200Z" fill="#e8c2a2"/>'
        '<path d="M96 62C120 60 150 64 170 78C176 100 174 126 160 152C150 152 136 150 124 146C116 140 112 128 110 116C106 100 100 80 96 62Z" fill="url(#fgrad)"/>'
        '<ellipse cx="130" cy="116" rx="8" ry="13" fill="#dcae8c"/><path d="M128 108c4 4 4 12 0 16" fill="none" stroke="#c4936f" stroke-width="2"/>'
        '<g id="tophair"><path id="topfill" fill="%s"/><g fill="none" stroke="#5a4c44" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M76 52q14-12 32-14"/><path d="M92 44q16-10 34-8"/><path d="M118 40q18 0 32 10"/></g></g>'
        '<path id="beard" d="M112 118C114 136 114 150 112 160C104 168 90 174 76 172C66 170 62 160 62 150C66 150 70 146 72 140C80 146 94 146 102 136C106 130 108 124 112 118Z" fill="%s" opacity="1"/>'
        '<path id="bline" d="M112 118C114 136 114 150 112 160C104 168 90 174 76 172" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round" opacity="0"/>'
        '<path d="M66 86q8-5 18-2" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/><path d="M70 94q6-3 12 0" fill="none" stroke="#3b302b" stroke-width="2" stroke-linecap="round"/>'
        '<rect id="taperclip" width="0" height="0"/></svg>') % (HAIR, HAIR, HAIR, HAIR, HAIR)
def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_PHONE': ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_SCISSORS': ic('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>'),
     'I_FADE': ic('<path d="M4 6h16" stroke-opacity="1"/><path d="M4 10h16" stroke-opacity=".75"/><path d="M4 14h16" stroke-opacity=".45"/><path d="M4 18h16" stroke-opacity=".2"/>'),
     'I_BEARD': ic('<path d="M5 6c0 7 3 13 7 13s7-6 7-13"/><path d="M8 13c2 1 6 1 8 0"/>'),
     'I_LINE': ic('<path d="M4 18 18 4l2 2L6 20z"/><path d="M8 14l2 2M11 11l2 2M14 8l2 2"/>'),
     'I_RAZOR': ic('<path d="M3 10h12l2 2v2H5z"/><path d="M17 12h4"/>')}
t = open(D + 'tpl.html').read()
R = dict(I, STACHE=stache(), STACHE_ANIM=stache(True), HEAD=HEAD)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111317"/><g transform="translate(4 18) scale(.28)" fill="#fff"><path d="%s"/><path d="%s" transform="translate(200 0) scale(-1 1)"/></g></svg>' % (HALF, HALF))
og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@500;600&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(80% 100% at 20% 10%,#1d2f52,#111317 60%);color:#fff;font-family:Barlow}'
      '.mk{position:absolute;left:66px;top:70px;width:250px;color:#fff}.wd{position:absolute;left:62px;top:150px;font:400 112px/1 "Bebas Neue";letter-spacing:.05em}'
      '.sub{position:absolute;left:68px;top:262px;font:600 22px Barlow;letter-spacing:.3em;text-transform:uppercase;color:#8a929e}'
      'h1{position:absolute;left:64px;top:330px;width:560px;font:400 64px/1 "Bebas Neue";letter-spacing:.01em}h1 em{font-style:normal;color:#5b93f0}'
      '.pill{position:absolute;left:66px;bottom:56px;font-size:24px;color:#aeb4bd}.pill b{color:#fff;font-weight:600;margin-right:14px}'
      '.ph{position:absolute;top:0;right:0;bottom:0;width:500px}.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 30%}'
      '.pole{position:absolute;right:500px;top:0;bottom:0;width:8px;background:repeating-linear-gradient(-45deg,#fff 0 10px,#2f6fd6 10px 20px,#fff 20px 30px,#c8323b 30px 40px)}'
      '</style></head><body><div class="mk">' + stache() + '</div><div class="wd">MOUSTACHE</div><div class="sub">Hair salon · Dearborn</div><h1>Fades, beards and line ups on <em>Warren Ave</em></h1>'
      '<div class="pill"><b>(313) 624-1111</b>14939 W Warren Ave</div><div class="ph"><img src="../media/fade-beard.webp"></div><div class="pole"></div></body></html>')
open(D + '../og.html', 'w').write(og)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:180px;height:180px;background:#111317;display:grid;place-items:center;color:#fff"><div style="width:140px">' + stache() + '</div></body>')
print(len(t) // 1024, 'KB')
