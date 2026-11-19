# Cartoon illustrations for The River Bank: hero scene (bank on the river), cartoon vault, menu items, map.
import math, random
random.seed(4)
NV = '#0d1b2e'  # outline navy
OL = 'stroke="%s" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"' % NV

def wave(y, amp, length, w=1700, x0=-130):
    pts = ['M%.0f %.0f' % (x0, y)]
    x = x0
    while x < x0 + w:
        pts.append('q%.1f %.1f %.1f 0' % (length / 4, -amp, length / 2)); pts.append('t%.1f 0' % (length / 2)); x += length
    pts.append('V720H%.0fZ' % x0)
    return ' '.join(pts)

def hero():
    s = ['<svg class="scene" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'
         '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1b30"/><stop offset=".42" stop-color="#2f3458"/><stop offset=".74" stop-color="#9c6a72"/><stop offset="1" stop-color="#e2ae84"/></linearGradient>'
         '<radialGradient id="sunG"><stop offset="0" stop-color="#fff3cf"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="riv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a5784"/><stop offset="1" stop-color="#11294a"/></linearGradient>'
         '<radialGradient id="doorG" cx="50%" cy="70%"><stop offset="0" stop-color="#fff1c4"/><stop offset=".6" stop-color="#ffc861"/><stop offset="1" stop-color="#e3953a"/></radialGradient>'
         '<radialGradient id="spill" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>'
         '</defs><rect width="1440" height="720" fill="url(#sky)"/>']
    # stars that fade in at the top
    for i in range(26):
        x, y = random.uniform(20, 1420), random.uniform(16, 200)
        s.append('<circle class="star" cx="%.0f" cy="%.0f" r="%.1f" fill="#fff6dc" opacity="%.2f"/>' % (x, y, random.uniform(1, 2.2), random.uniform(.3, .8)))
    s.append('<g id="sun"><circle cx="300" cy="410" r="190" fill="url(#sunG)"/><circle cx="300" cy="410" r="58" fill="#ffe3b0"/></g>')
    # clouds
    def cloud(x, y, sc, cls):
        return ('<g class="%s" transform="translate(%d %d) scale(%.2f)"><path d="M0 40 q0 -28 30 -28 q8 -26 40 -24 q24 -22 52 0 q30 -6 36 22 q26 2 26 30 z" fill="#d9b3a6" fill-opacity=".85" %s/></g>' % (cls, x, y, sc, OL))
    s += [cloud(140, 120, 1.1, 'cl c1'), cloud(820, 70, .9, 'cl c2'), cloud(1150, 160, 1.25, 'cl c3'), cloud(520, 210, .7, 'cl c4')]
    # far shore: Walpole Island, low trees
    sh = ['M-20 452']
    x = -20
    while x < 1460:
        w = random.uniform(26, 58); h = random.uniform(10, 26)
        sh.append('q%.0f %.0f %.0f 0' % (w / 2, -h * 2, w)); x += w
    sh.append('V470H-20Z')
    s.append('<path d="%s" fill="#1a2c3a" %s/>' % (' '.join(sh), OL.replace('4', '3', 1)))
    # the freighter (a Great Lakes laker)
    s.append('<g id="ship"><g transform="translate(0 404)">'
             '<path d="M0 30 L330 30 L318 52 L14 52 Z" fill="#7e2a27" ' + OL + '/>'
             '<rect x="6" y="22" width="320" height="10" fill="#e9e3d6" ' + OL + '/>'
             '<rect x="248" y="-6" width="64" height="30" rx="3" fill="#f6ecd9" ' + OL + '/>'
             '<rect x="258" y="-22" width="40" height="18" rx="2" fill="#f6ecd9" ' + OL + '/>'
             '<rect x="296" y="-36" width="12" height="20" fill="#0d1b2e"/>'
             '<rect x="24" y="8" width="26" height="16" rx="2" fill="#f6ecd9" ' + OL + '/>'
             '<g fill="#7ab7ea"><rect x="256" y="2" width="9" height="8" rx="1"/><rect x="270" y="2" width="9" height="8" rx="1"/><rect x="284" y="2" width="9" height="8" rx="1"/><rect x="298" y="2" width="9" height="8" rx="1"/></g>'
             '</g></g>')
    # river with three rolling wave layers
    s.append('<rect y="460" width="1440" height="260" fill="url(#riv)"/>')
    s.append('<path class="w w1" d="%s" fill="#30608f" %s/>' % (wave(486, 9, 120), OL.replace('4', '3', 1)))
    s.append('<path class="w w2" d="%s" fill="#244d77" %s/>' % (wave(520, 11, 150), OL.replace('4', '3', 1)))
    # sun glitter on the water
    for i in range(16):
        x, y = 210 + random.uniform(-60, 60) + i * 2, 476 + i * 9
        s.append('<rect class="gl" x="%.0f" y="%.0f" width="%.0f" height="4" rx="2" fill="#ffe3a1" style="animation-delay:-%.1fs"/>' % (x + random.uniform(-40, 40), y, random.uniform(18, 46), random.uniform(0, 3)))
    # gulls
    for i, (x, y, sc) in enumerate([(560, 300, 1), (640, 270, .8), (1010, 240, .9)]):
        s.append('<g class="gull g%d" transform="translate(%d %d) scale(%.1f)"><path d="M-18 0 q9 -12 18 0 q9 -12 18 0" fill="none" stroke="%s" stroke-width="2.4" stroke-linecap="round"/></g>' % (i, x, y, sc, NV))
    # near bank: grass + boardwalk
    s.append('<path d="M-20 600 Q360 572 720 590 T1460 584 V740 H-20Z" fill="#22392f" ' + OL + '/>')
    s.append('<path d="M-20 636 Q360 612 720 628 T1460 622 V740 H-20Z" fill="#a88e68" ' + OL + '/>')
    # the bank building, centred so phones keep it
    B = ['<g class="shift"><g id="bankp"><g id="bank" transform="translate(720 600)">']
    B.append('<path d="M-250 0 h500 v-18 h-500 z" fill="#d8ccb4" ' + OL + '/>')       # steps
    B.append('<path d="M-232 -18 h464 v-14 h-464 z" fill="#e8ddc7" ' + OL + '/>')
    B.append('<rect x="-220" y="-232" width="440" height="200" fill="#f1e6cf" ' + OL + '/>')  # body
    # windows between columns, they light up
    for wx in (-176, -100, 64, 140):
        B.append('<rect class="win" x="%d" y="-196" width="38" height="70" rx="19" fill="#ffd27a" %s/>' % (wx, OL))
        B.append('<path d="M%d -161 h38 M%d -196 v70" stroke="%s" stroke-width="1.8"/>' % (wx, wx + 19, NV))
    # the door, glowing
    B.append('<path d="M-46 -32 v-110 a46 46 0 0 1 92 0 v110 z" fill="#3a2a17" ' + OL + '/>')
    B.append('<path class="door" d="M-38 -32 v-104 a38 38 0 0 1 76 0 v104 z" fill="url(#doorG)"/>')
    B.append('<path d="M-60 0 L-130 120 H130 L60 0 Z" fill="url(#spill)" class="spill"/>')
    # columns
    for cx in (-200, -126, 106, 180, -52, 32):
        if cx in (-52, 32): continue
        B.append('<rect x="%d" y="-226" width="22" height="194" fill="#fbf3e1" %s/><rect x="%d" y="-236" width="30" height="12" fill="#e8ddc7" %s/><rect x="%d" y="-42" width="30" height="10" fill="#e8ddc7" %s/>' % (cx, OL, cx - 4, OL, cx - 4, OL))
    # frieze with the sign
    B.append('<rect x="-240" y="-276" width="480" height="44" fill="#e8ddc7" ' + OL + '/>')
    B.append('<rect class="signbg" x="-170" y="-268" width="340" height="28" rx="4" fill="#0d1b2e"/>')
    B.append('<text class="signtx" x="0" y="-247" text-anchor="middle" font-family="Marcellus,serif" font-size="20" letter-spacing="5" fill="#ecd3a0">THE RIVER BANK</text>')
    B.append('<path d="M-256 -276 L0 -352 L256 -276 Z" fill="#f1e6cf" ' + OL + '/>')    # pediment
    B.append('<path d="M-200 -286 L0 -340 L200 -286 Z" fill="none" stroke="%s" stroke-width="1.5" opacity=".5"/>' % NV)
    B.append('<circle cx="0" cy="-306" r="15" fill="#d9b36c" ' + OL + '/><path d="M-8 -306 q4 -6 8 0 t8 0" fill="none" stroke="%s" stroke-width="3"/>' % NV)
    # flag on the roof
    B.append('<path d="M0 -352 V-410" stroke="%s" stroke-width="2.4"/><path class="flag" d="M2 -408 q20 -6 40 2 q-20 6 -40 18 z" fill="#b98b3e" %s/>' % (NV, OL))
    B.append('</g></g></g>')
    s += B
    # boardwalk railing in front
    rail = ['<g id="rail">', '<path d="M-20 664 H1460" stroke="%s" stroke-width="3"/>' % NV, '<path d="M-20 690 H1460" stroke="%s" stroke-width="2"/>' % NV]
    for x in range(0, 1460, 46): rail.append('<path d="M%d 664 V720" stroke="%s" stroke-width="2"/>' % (x, NV))
    for x in (120, 470, 1000, 1330):
        rail.append('<g class="lamp"><path d="M%d 664 V560" stroke="%s" stroke-width="3"/><rect x="%d" y="532" width="22" height="30" rx="4" fill="#ffd27a" %s/><path d="M%d 528 h30" stroke="%s" stroke-width="3" stroke-linecap="round"/></g>' % (x, NV, x - 11, OL, x - 15, NV))
    rail.append('</g>')
    s += rail
    s.append('</svg>')
    return ''.join(s)

def vault():
    v = ['<svg class="vsvg" viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'
         '<radialGradient id="vin"><stop offset="0" stop-color="#fff1c4"/><stop offset=".5" stop-color="#f5b54a"/><stop offset="1" stop-color="#8a5a1a"/></radialGradient></defs>']
    v.append('<circle cx="260" cy="260" r="232" fill="#1a2c46" %s/>' % OL)       # wall ring
    import interior
    v.append(interior.interior(item))
    v.append('</svg>')
    v.append('<div class="vdoorw" id="vdoorw"><svg class="vsvg" viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">')
    v.append('<g id="vdoor"><circle cx="260" cy="260" r="200" fill="#8d9cae" %s/>' % OL)
    v.append('<circle cx="260" cy="260" r="168" fill="#a9b6c5" %s/>' % OL)
    for i in range(12):
        a = math.radians(i * 30); x, y = 260 + 184 * math.cos(a), 260 + 184 * math.sin(a)
        v.append('<circle cx="%.1f" cy="%.1f" r="7" fill="#e2c27e" %s/>' % (x, y, OL.replace('4', '3', 1)))
    v.append('<g id="vwheel">')
    for a in (0, 120, 240):
        r = math.radians(a - 90); x, y = 260 + 118 * math.cos(r), 260 + 118 * math.sin(r)
        v.append('<path d="M260 260 L%.1f %.1f" stroke="%s" stroke-width="20" stroke-linecap="round"/><path d="M260 260 L%.1f %.1f" stroke="#e2c27e" stroke-width="11" stroke-linecap="round"/><circle cx="%.1f" cy="%.1f" r="17" fill="#e2c27e" %s/>' % (x, y, NV, x, y, x, y, OL))
    v.append('<circle cx="260" cy="260" r="78" fill="none" stroke="%s" stroke-width="18"/><circle cx="260" cy="260" r="78" fill="none" stroke="#e2c27e" stroke-width="10"/></g>' % NV)
    v.append('<g id="vdial"><circle cx="260" cy="260" r="56" fill="#0d1b2e" stroke="#e2c27e" stroke-width="6"/>')
    for n in range(10):
        r = math.radians(n * 36 - 90); x, y = 260 + 38 * math.cos(r), 260 + 38 * math.sin(r)
        v.append('<text x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central" font-family="Marcellus,serif" font-size="15" fill="#f6ecd9">%d</text>' % (x, y, n))
    v.append('<circle cx="260" cy="260" r="16" fill="#e2c27e" %s/></g>' % OL.replace('4', '3', 1))
    v.append('<path d="M260 196 l-9 -14 h18 z" fill="#ffd27a" %s/></g>' % OL.replace('4', '2', 1))
    v.append('</svg></div>')
    return ''.join(v)

def item(name):
    o = OL
    art = {
     'pizza': '<path d="M50 8 L8 88 Q50 100 92 88 Z" fill="#f2c45a" %s/><path d="M14 80 Q50 92 86 80" fill="none" stroke="#c9762d" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="44" r="7" fill="#c8402e" %s/><circle cx="38" cy="66" r="6" fill="#c8402e" %s/><circle cx="62" cy="68" r="6" fill="#c8402e" %s/>' % (o, o, o, o),
     'burger': '<path d="M12 50 Q12 16 50 16 Q88 16 88 50 Z" fill="#e5a14a" %s/><circle cx="36" cy="32" r="2.5" fill="#fff6dc"/><circle cx="52" cy="26" r="2.5" fill="#fff6dc"/><circle cx="64" cy="34" r="2.5" fill="#fff6dc"/><path d="M8 56 q10 -8 21 0 t21 0 t21 0 t21 0" fill="#6cbf5a" %s/><rect x="10" y="58" width="80" height="12" rx="6" fill="#7a3d24" %s/><path d="M12 74 h76 q0 14 -14 14 h-48 q-14 0 -14 -14 z" fill="#e5a14a" %s/>' % (o, o, o, o),
     'steak': '<path d="M20 30 Q30 10 62 14 Q92 20 88 50 Q84 78 56 80 Q40 82 30 90 Q12 92 12 72 Q10 48 20 30 Z" fill="#b5453a" %s/><path d="M28 44 l38 26 M34 32 l40 26 M24 58 l28 20" stroke="#6e221c" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="34" r="8" fill="#f6ecd9" %s/>' % (o, o),
     'salad': '<path d="M10 52 h80 q0 36 -40 36 q-40 0 -40 -36 z" fill="#f6ecd9" %s/><circle cx="30" cy="44" r="12" fill="#6cbf5a" %s/><circle cx="52" cy="38" r="14" fill="#4fa548" %s/><circle cx="72" cy="46" r="11" fill="#6cbf5a" %s/><circle cx="44" cy="50" r="6" fill="#e0453a" %s/><circle cx="64" cy="54" r="5" fill="#e0453a" %s/>' % (o, o, o, o, o, o),
     'drink': '<path d="M24 14 h52 l-8 76 h-36 z" fill="#ffcf5a" %s/><path d="M27 30 h46" stroke="#fff6dc" stroke-width="8"/><path d="M62 4 l-8 30" stroke="#e0453a" stroke-width="6" stroke-linecap="round"/><circle cx="74" cy="18" r="10" fill="#9fd36a" %s/>' % (o, o),
    }[name]
    return '<svg viewBox="0 0 100 100" aria-hidden="true">%s</svg>' % art
