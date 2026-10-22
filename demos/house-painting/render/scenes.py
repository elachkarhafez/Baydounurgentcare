# Ridgecoat concept: code-drawn scenes that stand in for job photos (rooms, a gable, a drywall corner, a door frame).
# usage: python3 scenes.py <media_dir>
import sys, os, random
OUT = sys.argv[1]
TEAL, TRIM, INK = '#127a6e', '#f7f5f0', '#13201e'

def tex(id_, freq='.9', alpha='.10', seed=3):
    """Wall texture: fine fractal noise multiplied over the paint."""
    return f'''<filter id="{id_}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="3" seed="{seed}" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 {alpha} 0" result="a"/><feComposite in="a" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>'''

def svg(w, h, body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{defs}</defs>{body}</svg>'

def room(name, wall, accent, kind):
    """One-point perspective room: back wall, side walls, tray ceiling, wood floor, trim, window light."""
    W, H = 1000, 718
    bx0, by0, bx1, by1 = 300, 210, 700, 520  # back wall
    d = tex('t', '.75', '.13') + f'''
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#b98252"/></linearGradient>
<linearGradient id="lw" x1="0" x2="1"><stop offset="0" stop-color="{wall}" stop-opacity="1"/><stop offset="1" stop-color="{wall}"/></linearGradient>
<radialGradient id="sun" cx=".3" cy=".55" r=".6"><stop offset="0" stop-color="#fff6dc" stop-opacity=".55"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
<linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="shadeR" x1="1" x2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>'''
    b = []
    # ceiling + tray
    b.append(f'<polygon points="0,0 {W},0 {bx1},{by0} {bx0},{by0}" fill="#efece6"/>')
    b.append(f'<polygon points="120,0 880,0 {bx1-40},{by0-40} {bx0+40},{by0-40}" fill="#e6e2da"/><polygon points="120,0 880,0 {bx1-40},{by0-40} {bx0+40},{by0-40}" fill="none" stroke="{TRIM}" stroke-width="6"/>')
    # walls
    b.append(f'<polygon points="0,0 {bx0},{by0} {bx0},{by1} 0,{H}" fill="{wall}" filter="url(#t)"/><polygon points="0,0 {bx0},{by0} {bx0},{by1} 0,{H}" fill="url(#shade)"/>')
    b.append(f'<polygon points="{W},0 {bx1},{by0} {bx1},{by1} {W},{H}" fill="{wall}" filter="url(#t)"/><polygon points="{W},0 {bx1},{by0} {bx1},{by1} {W},{H}" fill="url(#shadeR)"/>')
    b.append(f'<rect x="{bx0}" y="{by0}" width="{bx1-bx0}" height="{by1-by0}" fill="{wall}" filter="url(#t)"/>')
    # crown + baseboards
    b.append(f'<polyline points="0,6 {bx0},{by0} {bx1},{by0} {W},6" fill="none" stroke="{TRIM}" stroke-width="9"/>')
    b.append(f'<polygon points="0,{H-40} {bx0},{by1-12} {bx1},{by1-12} {W},{H-40} {W},{H} {bx1},{by1} {bx0},{by1} 0,{H}" fill="{TRIM}"/>')
    # floor planks
    b.append(f'<polygon points="0,{H} {bx0},{by1} {bx1},{by1} {W},{H}" fill="url(#fl)"/>')
    for i in range(-9, 10):
        x = 500 + i * 120
        b.append(f'<line x1="{500 + i*20}" y1="{by1}" x2="{x}" y2="{H}" stroke="#6e4426" stroke-opacity=".35" stroke-width="2"/>')
    if kind == 'living':
        # french doors on the back wall
        b.append(f'<rect x="405" y="300" width="190" height="210" fill="{TRIM}"/>')
        for x in (418, 504):
            b.append(f'<rect x="{x}" y="312" width="78" height="190" fill="#cfe3ea"/><rect x="{x}" y="312" width="78" height="190" fill="url(#sun)"/>')
            for yy in range(335, 500, 32): b.append(f'<line x1="{x}" y1="{yy}" x2="{x+78}" y2="{yy}" stroke="{TRIM}" stroke-width="4"/>')
        # left window with light spill on the floor
        b.append(f'<polygon points="90,170 210,214 210,400 90,420" fill="{TRIM}"/><polygon points="102,186 198,222 198,390 102,406" fill="#d8e9ee"/>')
        b.append(f'<polygon points="210,600 420,560 520,620 260,690" fill="#fff6dc" opacity=".35"/>')
        # side door on the right wall
        b.append(f'<polygon points="800,180 900,140 900,600 800,560" fill="{TRIM}"/><polygon points="812,196 888,166 888,588 812,550" fill="#d9d2c4"/>')
    else:
        # bath: vanity, mirror, sconces
        b.append(f'<rect x="360" y="290" width="280" height="110" rx="6" fill="#dde4e6" stroke="{TRIM}" stroke-width="8"/>')
        b.append(f'<rect x="350" y="410" width="300" height="20" fill="#e8e3da"/><rect x="360" y="430" width="280" height="86" fill="{accent}"/>')
        for x in (430, 570): b.append(f'<rect x="{x-6}" y="455" width="12" height="4" rx="2" fill="#c8b48a"/>')
        b.append('<line x1="500" y1="430" x2="500" y2="516" stroke="#000" stroke-opacity=".2" stroke-width="2"/>')
        for x in (335, 665): b.append(f'<circle cx="{x}" cy="300" r="13" fill="#fff4d6"/><circle cx="{x}" cy="300" r="40" fill="#fff4d6" opacity=".25"/>')
        b.append(f'<polygon points="90,170 210,214 210,400 90,420" fill="{TRIM}"/><polygon points="102,186 198,222 198,390 102,406" fill="#d8e9ee"/>')
    b.append(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')
    open(os.path.join(OUT, name), 'w').write(svg(W, H, ''.join(b), d))

def gable(name, siding, trim=TRIM, done=True):
    W, H = 460, 514
    d = tex('t', '.6', '.10', 7) + '''<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa0de"/><stop offset="1" stop-color="#b9dcf3"/></linearGradient>
<pattern id="brick" width="36" height="16" patternUnits="userSpaceOnUse"><rect width="36" height="16" fill="#a85a44"/><path d="M0 0H36M0 8H36M0 0V8M18 8V16" stroke="#d8c8b8" stroke-width="1.6"/></pattern>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#sky)"/>', '<ellipse cx="80" cy="130" rx="90" ry="70" fill="#2f6b34"/><ellipse cx="420" cy="110" rx="80" ry="80" fill="#2b5f30"/>']
    b.append(f'<rect y="430" width="{W}" height="84" fill="#5d9a3e"/>')
    # gable siding triangle with lap lines
    b.append(f'<polygon points="30,250 230,90 430,250" fill="{siding}" filter="url(#t)"/>')
    for y in range(110, 250, 13):
        x = (y - 90) / 160 * 200
        b.append(f'<line x1="{230-x:.0f}" y1="{y}" x2="{230+x:.0f}" y2="{y}" stroke="#000" stroke-opacity=".14" stroke-width="2"/>')
    b.append('<polyline points="-6,272 230,70 466,272" fill="none" stroke="#3c3f44" stroke-width="26" stroke-linejoin="round"/>')
    b.append(f'<polyline points="18,258 230,80 442,258" fill="none" stroke="{trim}" stroke-width="12" stroke-linejoin="round"/>')
    b.append(f'<path d="M210 140h40v40h-40z" transform="rotate(45 230 160)" fill="{trim}"/><path d="M216 146h28v28h-28z" transform="rotate(45 230 160)" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2"/>')
    # roof edge + brick base + column
    b.append(f'<rect x="40" y="256" width="380" height="14" fill="{trim}"/><rect x="50" y="270" width="270" height="170" fill="url(#brick)"/>')
    b.append(f'<rect x="350" y="270" width="26" height="170" fill="{trim}"/><rect x="344" y="268" width="38" height="10" fill="{trim}"/>')
    b.append('<rect x="320" y="270" width="140" height="170" fill="#000" opacity=".16"/>')
    # shrub
    b.append('<ellipse cx="250" cy="420" rx="70" ry="80" fill="#3d7f3a"/><ellipse cx="236" cy="395" rx="40" ry="44" fill="#4f9348"/>')
    if not done:
        b.append(f'<g stroke="#fff" stroke-opacity=".5" stroke-width="2">' + ''.join(f'<line x1="{x}" y1="{y}" x2="{x+14}" y2="{y+3}"/>' for x, y in [(120, 200), (300, 210), (180, 160), (260, 238), (330, 190)]) + '</g>')
    open(os.path.join(OUT, name), 'w').write(svg(W, H, ''.join(b), d))

def corner(name, wall, done):
    W, H = 460, 514
    random.seed(5)
    d = tex('t', '.55', '.22', 11) + '<linearGradient id="lt" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>'
    b = [f'<rect width="{W}" height="{H}" fill="#7c6247"/>']
    b.append(f'<polygon points="150,0 250,0 250,420 150,450" fill="{wall}" filter="url(#t)"/>')
    b.append(f'<polygon points="250,0 {W},0 {W},380 250,420" fill="{wall}" filter="url(#t)"/><polygon points="250,0 {W},0 {W},380 250,420" fill="url(#lt)"/>')
    b.append(f'<polygon points="0,0 150,0 150,450 0,470" fill="#5f6d74"/>')
    b.append(f'<polygon points="150,420 250,392 {W},352 {W},392 250,440 150,470" fill="{TRIM}"/>')
    if done:
        b.append('<polygon points="0,470 150,470 250,440 460,392 460,514 0,514" fill="#b8b2a8"/>')
    else:
        b.append('<polygon points="0,470 150,470 250,440 460,392 460,514 0,514" fill="#a07a52"/><polygon points="120,470 300,425 330,450 160,500" fill="#2f6fd0"/>')
        for x, y, r in [(236, 250, 14), (244, 300, 9), (238, 330, 18), (246, 190, 7)]:
            b.append(f'<ellipse cx="{x}" cy="{y}" rx="{r*.6:.0f}" ry="{r}" fill="#fff" opacity=".8"/><ellipse cx="{x+2}" cy="{y+2}" rx="{r*.4:.0f}" ry="{r*.7:.0f}" fill="#000" opacity=".12"/>')
        b.append('<path d="M300 300l6 40 4-38 5 30" stroke="#333" stroke-opacity=".5" stroke-width="2" fill="none"/>')
    open(os.path.join(OUT, name), 'w').write(svg(W, H, ''.join(b), d))

def door(name, wall, done):
    W, H = 460, 514
    d = tex('t', '.6', '.20', 13)
    b = [f'<rect width="{W}" height="{H}" fill="{wall}" filter="url(#t)"/>']
    b.append(f'<rect x="250" y="0" width="230" height="{H}" fill="{TRIM}"/><rect x="270" y="0" width="210" height="{H}" fill="#ece8e0"/>')
    b.append('<rect x="250" y="0" width="12" height="514" fill="#000" opacity=".08"/>')
    b.append('<circle cx="300" cy="290" r="14" fill="#c9b07a"/><rect x="288" y="285" width="44" height="10" rx="5" fill="#b89c63"/>')
    b.append('<text x="300" y="150" font-family="Arial" font-weight="700" font-size="22" fill="#555" opacity=".7">12B</text>')
    if not done:
        for x, y, r in [(205, 280, 22), (190, 330, 12), (220, 230, 9), (170, 300, 7)]:
            b.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/><circle cx="{x+2}" cy="{y+2}" r="{r*.65:.0f}" fill="#000" opacity=".18"/>')
        b.append('<path d="M150 260l40 25 25-10" stroke="#888" stroke-width="2" fill="none"/>')
    open(os.path.join(OUT, name), 'w').write(svg(W, H, ''.join(b), d))

os.makedirs(OUT, exist_ok=True)
room('room-living.svg', '#8d9a93', TEAL, 'living')
room('room-bath.svg', '#a7b7b2', '#2f4a52', 'bath')
gable('gable-before.svg', '#cdbb94', done=False)
gable('gable-after.svg', '#1f3d4a')
corner('corner-before.svg', '#d8ccb0', False)
corner('corner-after.svg', '#c9cdc6', True)
door('door-before.svg', '#d9d1bf', False)
door('door-after.svg', '#dcdcd4', True)
print('ok')
