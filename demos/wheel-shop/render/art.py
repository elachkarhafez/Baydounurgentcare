# Lugrow concept: code-drawn wheel faces, a lifted truck side view and the wall of wheels (stand-ins for shop photos).
# usage: python3 art.py <img_dir>
import sys, os, math
OUT = sys.argv[1]
CHROME = '''<linearGradient id="ch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#b9bdc4"/><stop offset=".5" stop-color="#5d6068"/><stop offset=".62" stop-color="#d7dadf"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<radialGradient id="dish" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#1b1c20"/><stop offset="1" stop-color="#3a3c42"/></radialGradient>'''

def wheel_svg(cx, cy, R, style, spokes, finish, idp=''):
    """One wheel: tire with tread blocks, lip, spokes, lug ring, cap. finish: chrome|black|machined|bronze"""
    fill = {'chrome': 'url(#ch)', 'black': '#3a3c43', 'machined': 'url(#ch)', 'bronze': '#8a6a3c'}[finish]
    lip = {'chrome': 'url(#ch)', 'black': '#2a2b30', 'machined': '#c9ccd2', 'bronze': '#a3824f'}[finish]
    o = []
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#141416"/>')
    for k in range(36):  # tread blocks
        a = k / 36 * 2 * math.pi; x = cx + math.cos(a) * R * .965; y = cy + math.sin(a) * R * .965
        o.append(f'<rect x="{x - R*.05:.1f}" y="{y - R*.03:.1f}" width="{R*.1:.1f}" height="{R*.06:.1f}" rx="{R*.01:.1f}" fill="#222327" transform="rotate({a*180/math.pi:.1f} {x:.1f} {y:.1f})"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{R*.88}" fill="#1c1d21"/><circle cx="{cx}" cy="{cy}" r="{R*.86}" fill="none" stroke="#2c2d32" stroke-width="{R*.015}"/>')
    rr = R * .66
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="{lip}"/><circle cx="{cx}" cy="{cy}" r="{rr*.9}" fill="url(#dish)"/>')
    for k in range(spokes):
        a = k / spokes * 360
        if style == 'split':
            for off in (-5, 5):
                o.append(f'<path d="M{cx} {cy-rr*.22} L{cx-rr*.07} {cy-rr*.88} L{cx+rr*.07} {cy-rr*.88} Z" fill="{fill}" transform="rotate({a+off} {cx} {cy})"/>')
        elif style == 'mesh':
            o.append(f'<path d="M{cx} {cy-rr*.2} L{cx-rr*.05} {cy-rr*.9} L{cx+rr*.05} {cy-rr*.9} Z" fill="{fill}" transform="rotate({a} {cx} {cy})"/>')
            o.append(f'<path d="M{cx} {cy-rr*.2} L{cx+rr*.35} {cy-rr*.82} L{cx+rr*.43} {cy-rr*.78} Z" fill="{fill}" opacity=".85" transform="rotate({a} {cx} {cy})"/>')
        else:  # five / six fat spokes
            o.append(f'<path d="M{cx-rr*.12} {cy-rr*.2} L{cx-rr*.2} {cy-rr*.9} L{cx+rr*.2} {cy-rr*.9} L{cx+rr*.12} {cy-rr*.2} Z" fill="{fill}" transform="rotate({a} {cx} {cy})"/>')
            if finish == 'machined':
                o.append(f'<path d="M{cx-rr*.06} {cy-rr*.25} L{cx-rr*.1} {cy-rr*.86} L{cx+rr*.1} {cy-rr*.86} L{cx+rr*.06} {cy-rr*.25} Z" fill="#2a2b30" transform="rotate({a} {cx} {cy})"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{rr*.3}" fill="{lip}"/>')
    for k in range(8 if style == 'split' else 6):
        a = k / (8 if style == 'split' else 6) * 2 * math.pi
        o.append(f'<circle cx="{cx + math.cos(a)*rr*.21:.1f}" cy="{cy + math.sin(a)*rr*.21:.1f}" r="{rr*.035:.1f}" fill="#d9dbe0" stroke="#55575d" stroke-width="1"/>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="{rr*.13}" fill="#0e0e10"/><circle cx="{cx}" cy="{cy}" r="{rr*.13}" fill="none" stroke="url(#ch)" stroke-width="{rr*.025}"/>')
    o.append(f'<ellipse cx="{cx - rr*.3}" cy="{cy - rr*.45}" rx="{rr*.5}" ry="{rr*.18}" fill="#fff" opacity=".07" transform="rotate(-30 {cx} {cy})"/>')
    return ''.join(o)

def save(name, w, h, body, bg=None):
    bgr = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    open(os.path.join(OUT, name), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{CHROME}<radialGradient id="spot" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2a2b31"/><stop offset="1" stop-color="#101012"/></radialGradient></defs>{bgr}{body}</svg>')

os.makedirs(OUT, exist_ok=True)
for name, style, n, fin in [('w-chrome.svg', 'mesh', 10, 'chrome'), ('w-black.svg', 'five', 6, 'black'), ('w-machined.svg', 'five', 5, 'machined'), ('w-bronze.svg', 'split', 6, 'bronze')]:
    save(name, 720, 720, '<rect width="720" height="720" fill="url(#spot)"/>' + wheel_svg(360, 360, 290, style, n, fin))

# lifted half-ton, side view
t = ['<rect width="1000" height="1000" fill="url(#spot)"/>', '<rect y="760" width="1000" height="240" fill="#16161a"/><ellipse cx="500" cy="770" rx="430" ry="24" fill="#000" opacity=".5"/>']
t.append('<path d="M110 600 L120 520 Q125 500 150 498 L370 490 L430 380 Q440 362 470 360 L650 358 Q690 358 700 380 L740 480 L880 488 Q905 490 905 515 L905 610 Q905 630 885 630 L130 630 Q110 630 110 600 Z" fill="#eceef1"/>')
t.append('<path d="M450 392 L640 390 Q660 390 668 408 L700 480 L430 486 Z" fill="#1d2833"/><line x1="560" y1="392" x2="560" y2="484" stroke="#eceef1" stroke-width="10"/>')
t.append('<path d="M110 580 L905 572" stroke="#c9ccd2" stroke-width="3"/><rect x="250" y="635" width="520" height="16" rx="6" fill="#2a2b30"/>')
t.append('<rect x="880" y="520" width="26" height="40" rx="4" fill="#d14b3b"/><rect x="104" y="525" width="18" height="34" rx="4" fill="#ffe7b0"/>')
t.append(wheel_svg(260, 660, 118, 'split', 6, 'chrome') + wheel_svg(760, 660, 118, 'split', 6, 'chrome'))
save('truck.svg', 1000, 1000, ''.join(t))
p = os.path.join(OUT, 'truck.svg'); s = open(p).read().replace('viewBox="0 0 1000 1000"', 'viewBox="60 240 880 760"'); open(p, 'w').write(s)  # frame the truck tighter

# wall of wheels (visit card art)
wall = ['<rect width="720" height="520" fill="#121215"/>']
for r in range(3):
    wall.append(f'<rect x="0" y="{40 + r*160 + 128}" width="720" height="10" fill="#26272c"/>')
    for c in range(5):
        st = [('mesh', 10, 'chrome'), ('five', 6, 'black'), ('split', 6, 'chrome'), ('five', 5, 'machined'), ('split', 6, 'bronze')][(r * 2 + c) % 5]
        wall.append(wheel_svg(80 + c*140, 100 + r*160, 62, *st))
save('wall.svg', 720, 520, ''.join(wall))
# favicon / logo mark: a lug nut
open(os.path.join(OUT, 'mark.svg'), 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>' + CHROME + '</defs><rect width="64" height="64" rx="14" fill="#0b0b0d"/><polygon points="32,10 51,21 51,43 32,54 13,43 13,21" fill="url(#ch)"/><circle cx="32" cy="32" r="10" fill="#0b0b0d"/><circle cx="32" cy="32" r="5" fill="#d8b45a"/></svg>')
print('ok')
