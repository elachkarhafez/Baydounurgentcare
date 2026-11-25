"""Builds rawansweets/index.html, favicon.svg, render/og.html and render/icon.html from tpl.html and logo.json.
Run from anywhere:  python3 build.py   (then node .claude/skills/ela-studio/kit/og/card.mjs rawansweets https://rawansweets.vercel.app)
logo.json is the gold RS / RAWAN / SWEETS sign on the front of their dessert cart, traced by trace.py. It is the logo in
the opening, the header, the cart front in the hero, the footer, the favicon and the link card."""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'logo.json'))
P = L['parts']
BW, BH = L['box'][2], L['box'][3]
LETTERS = ['R', 'A1', 'W', 'A2', 'N']
SWEETS = ['s%d' % i for i in range(6)]
RULES = ['rule0', 'rule1', 'rule2', 'rule3']
ALL = ['mono', 'heart1'] + LETTERS + SWEETS + RULES + ['heart2']
MARK = ['mono', 'heart1']
# the monogram's own box (RS + heart), for the favicon and the small marks
mx0 = min(P[k]['bb'][0] for k in MARK); my0 = min(P[k]['bb'][1] for k in MARK)
mx1 = max(P[k]['bb'][2] for k in MARK); my1 = max(P[k]['bb'][3] for k in MARK)

# gold sampled off the cart sign (k-means over the traced letters): the top half of each letter reflects a deep olive,
# the bottom half catches the LED light. Their profile picture gold #9b7742 sits between.
GOLD = ('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + str(BH) + '">'
        '<stop offset="0" stop-color="#997a37"/><stop offset=".38" stop-color="#9b7742"/><stop offset=".55" stop-color="#af904b"/>'
        '<stop offset=".8" stop-color="#c3a873"/><stop offset="1" stop-color="#af904b"/></linearGradient>')


def defs():
    s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + GOLD % 'gGold'
    s += GOLD.replace('#997a37', '#c3a873').replace('#9b7742', '#d9c08a').replace('#af904b', '#c8a75e') % 'gGoldLt'
    for k in ALL: s += '<path id="lg-%s" d="%s"/>' % (k, P[k]['d'])
    return s + '</defs></svg>'


def logo(cls, fill='url(#gGold)', parts=ALL, vb=None, label=None):
    vb = vb or '-8 -8 %d %d' % (BW + 16, BH + 16)
    a = ' role="img" aria-label="%s"' % label if label else ' aria-hidden="true"'
    return '<svg class="%s" viewBox="%s"%s><g fill="%s">%s</g></svg>' % (cls, vb, a, fill, ''.join('<use href="#lg-%s"/>' % k for k in parts))


def logo_inline(fill, parts=ALL, vb=None):
    vb = vb or '-8 -8 %d %d' % (BW + 16, BH + 16)
    return ('<svg viewBox="%s" style="width:100%%;height:auto;display:block"><defs>%s</defs><g fill="%s">%s</g></svg>'
            % (vb, GOLD % 'gG', fill, ''.join('<path d="%s"/>' % P[k]['d'] for k in parts)))


def intro():
    """the opening logo: every part is its own element so the timeline can draw, fill, raise and pop them"""
    s = '<svg id="ilogo" viewBox="-8 -8 %d %d" aria-hidden="true"><defs>' % (BW + 16, BH + 16)
    s += '<linearGradient id="gSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fffadc" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    s += '<mask id="mLogo" maskUnits="userSpaceOnUse" x="-8" y="-8" width="%d" height="%d"><g fill="#fff">%s</g></mask></defs>' % (BW + 16, BH + 16, ''.join('<use href="#lg-%s"/>' % k for k in ALL))
    # outlines that draw first (monogram + heart), then the filled parts
    s += '<g id="iol" fill="none" stroke="#997a37" stroke-width="5" stroke-linejoin="round">'
    for k in MARK: s += '<path class="iod" d="%s" pathLength="1"/>' % P[k]['d']
    s += '</g><g fill="url(#gGold)">'
    s += '<use id="i-mono" href="#lg-mono"/><g id="i-h1" style="transform-origin:%dpx %dpx"><use href="#lg-heart1"/></g>' % ((P['heart1']['bb'][0] + P['heart1']['bb'][2]) // 2, (P['heart1']['bb'][1] + P['heart1']['bb'][3]) // 2)
    for k in LETTERS: s += '<g class="il"><use href="#lg-%s"/></g>' % k
    for k in SWEETS: s += '<g class="is"><use href="#lg-%s"/></g>' % k
    for k in RULES:
        x0, y0, x1, y1 = P[k]['bb']; ox = x1 if x0 < BW / 2 else x0
        s += '<g class="ir" style="transform-origin:%dpx %dpx"><use href="#lg-%s"/></g>' % (ox, (y0 + y1) // 2, k)
    x0, y0, x1, y1 = P['heart2']['bb']
    s += '<g id="i-h2" style="transform-origin:%dpx %dpx"><use href="#lg-heart2"/></g>' % ((x0 + x1) // 2, (y0 + y1) // 2)
    s += '</g><g mask="url(#mLogo)"><rect id="isweep" x="-700" y="-20" width="520" height="%d" fill="url(#gSweep)" transform="skewX(-18)"/></g>' % (BH + 40)
    return s + '</svg>'


def ic(p, sw='1.8'):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (sw, p)


I = {'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>'),
     'I_BOX': ic('<path d="M3.5 8.5h17v11a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M2.5 5h19v3.5h-19z"/><path d="M12 5v16"/><path d="M12 5c-1-2.6-4.6-3.2-5-1.2-.3 1.6 2.6 1.2 5 1.2zM12 5c1-2.6 4.6-3.2 5-1.2.3 1.6-2.6 1.2-5 1.2z"/>'),
     'I_X': ic('<path d="M6 6l12 12M18 6L6 18"/>', '2'),
     'I_MINUS': ic('<path d="M6 12h12"/>', '2'), 'I_PLUS': ic('<path d="M12 6v12M6 12h12"/>', '2'),
     'I_CHECK': ic('<path d="M5 12.5l4.5 4.5L19 7"/>', '2.4'),
     'I_BACK': ic('<path d="M15 6l-6 6 6 6"/>', '2'), 'I_NEXT': ic('<path d="M9 6l6 6-6 6"/>', '2'),
     'I_CAL': ic('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_COPY': ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
     'I_SEND': ic('<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>'),
     'I_HEART': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.5s-7.5-4.6-9.3-9.3C1.5 8 3.4 4.5 6.9 4.5c2.1 0 3.5 1.2 5.1 3 1.6-1.8 3-3 5.1-3 3.5 0 5.4 3.5 4.2 6.7-1.8 4.7-9.3 9.3-9.3 9.3z"/></svg>'}

# their gold cordless lamp on the cart (drawn from the reel: fluted glass shade, gold cap, thin stem, round base)
LAMP = ('<svg class="lamp" viewBox="0 0 60 120" aria-hidden="true"><defs><linearGradient id="gL" x1="0" x2="1"><stop offset="0" stop-color="#997a37"/><stop offset=".45" stop-color="#e3cf9c"/><stop offset="1" stop-color="#997a37"/></linearGradient>'
        '<radialGradient id="gGlow"><stop offset="0" stop-color="#fffadc" stop-opacity=".95"/><stop offset="1" stop-color="#fffadc" stop-opacity="0"/></radialGradient></defs>'
        '<circle class="lglow" cx="30" cy="34" r="30" fill="url(#gGlow)"/>'
        '<path d="M14 50 L20 14 H40 L46 50 Z" fill="#fffdf3" stroke="#d9c08a" stroke-width="1"/>'
        '<path d="M20 14 L17 50 M25 14 L24 50 M30 14 V50 M35 14 L36 50 M40 14 L43 50" stroke="#e9dcc0" stroke-width="1.2"/>'
        '<path d="M19 10 h22 l-1 4 H20z" fill="url(#gL)"/><rect x="28.6" y="50" width="2.8" height="56" fill="url(#gL)"/>'
        '<ellipse cx="30" cy="110" rx="15" ry="4.5" fill="url(#gL)"/></svg>')

# the gold spoon they scoop with
SPOON = ('<svg class="spoon" id="spoon" viewBox="0 0 160 60" aria-hidden="true"><defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3cf9c"/><stop offset=".5" stop-color="#af904b"/><stop offset="1" stop-color="#7d6230"/></linearGradient></defs>'
         '<path d="M58 30 C80 27 120 25 156 24 a3 3 0 0 1 0 6 C120 31 80 33 58 32 Z" fill="url(#gS)"/>'
         '<ellipse cx="32" cy="31" rx="27" ry="17" fill="url(#gS)"/><ellipse cx="31" cy="28" rx="21" ry="11" fill="#c3a873" opacity=".55"/>'
         '<circle id="scoopBlob" cx="31" cy="24" r="17" fill="#be6f50" opacity="0"/></svg>')

t = open(D + 'tpl.html').read()
R = dict(I, DEFS=defs(), INTRO=intro(), LAMP=LAMP, SPOON=SPOON,
         NAVLOGO=logo('nlogo', label='Rawan Sweets'),
         FRONTLOGO=logo('flogo'),
         FOOTLOGO=logo('flg', 'url(#gGoldLt)', label='Rawan Sweets'),
         MARK=logo('mk', parts=MARK, vb='%d %d %d %d' % (mx0 - 10, my0 - 10, mx1 - mx0 + 20, my1 - my0 + 20)),
         LOGOBOX=json.dumps([BW + 16, BH + 16]))
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)

# favicon: the RS monogram with its heart, gold on their cream
side = max(mx1 - mx0, my1 - my0) * 1.24; cx, cy = (mx0 + mx1) / 2, (my0 + my1) / 2
fx, fy = cx - side / 2, cy - side / 2
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.0f %.0f %.0f %.0f"><defs>%s</defs><rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="%.0f" fill="#fbf7ee"/>'
       '<g fill="url(#gF)">%s</g></svg>') % (fx, fy, side, side, GOLD.replace('y2="%d"' % BH, 'y1="%d" y2="%d"' % (my0, my1)).replace('y1="0" ', '') % 'gF', fx, fy, side, side, side * .2,
                                            ''.join('<path d="%s"/>' % P[k]['d'] for k in MARK))
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#fbf7ee">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')

# link preview card (1200 x 630): the cart sign logo on white acrylic with the LED glow, their trays, cups and the cake
og = open(D + 'og.tpl.html').read().replace('{{OGLOGO}}', logo_inline('url(#gG)'))
open(D + '../og.html', 'w').write(og)
print('index', len(t) // 1024, 'KB')
