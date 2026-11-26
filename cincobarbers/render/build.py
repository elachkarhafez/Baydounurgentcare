"""Builds ../index.html from tpl.html + parts.json (the traced logo), and ../favicon.svg + ../media/icon.png source.
Run: /usr/bin/python3 -I build.py
Every logo part is defined once (<path id="p-..">) and reused with <use>: the unlit tubes, the lit layers
(halo + core, each layer sized to its own box so phones keep small GPU layers), the pole glass clip with the
spinning stripes, and the clip for the shine sweep."""
import os, json, re
D = os.path.dirname(os.path.abspath(__file__)) + '/'
P = json.load(open(D + 'parts.json'))
parts = P['parts']
x0, y0, x1, y1 = P['vb']
W, H = x1 - x0, y1 - y0


def rnd(d):  # integer coordinates: <0.2px at phone size, a third of the bytes
    return re.sub(r'-?\d+\.\d+', lambda m: str(int(round(float(m.group())))), d)


ORDER = ['rays', 'bevel', 'brass', 'glass', 'C1', 'I', 'N', 'C2', 'O'] + ['B%d' % i for i in range(7)] + ['rules', 'razor', 'est']
ORDER = [k for k in ORDER if k in parts]
LIT = {  # halo, core   (the logo's own colours pushed to how they read lit)
    'cream': ('#ffc98a', '#fff4e2'),
    'gold': ('#e0a050', '#f0c384'),
    'brass': ('#d99a58', '#e9c18c'),
    'glass': ('#ffe6c8', '#fffdf8'),
}
OFF = {'cream': '#3f3830', 'gold': '#382b1d', 'brass': '#352a1e', 'glass': '#262422'}

defs = ['<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>']
for k in ORDER:
    defs.append('<path id="p-%s" fill-rule="evenodd" d="%s"/>' % (k, rnd(parts[k]['d'])))
defs.append('<filter id="halo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="11"/></filter>')
defs.append('<filter id="halo-s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>')
defs.append('<filter id="tube" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.1"/></filter>')
defs.append('<clipPath id="clip-glass"><use href="#p-glass"/></clipPath>')
defs.append('<clipPath id="clip-all">' + ''.join('<use href="#p-%s"/>' % k for k in ORDER if k not in ('rays', 'bevel')) + '</clipPath>')
defs.append('<linearGradient id="shine-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')
defs.append('</defs></svg>')

# pole stripes (red, white, blue, white rising to the right like the logo), drawn inside the glass clip
gx0, gy0, gx1, gy1 = parts['glass']['box']
PER, BAND = 92, 23
slope = .55 * (gx1 - gx0 + 20)


def stripes(cols, cls):
    out = ['<g class="%s">' % cls]
    k = 0
    y = gy0 - 2 * PER - slope
    while y < gy1 + PER:
        c = cols[k % 4]
        if c:
            out.append('<polygon fill="%s" points="%d,%d %d,%d %d,%d %d,%d"/>' % (
                c, gx0 - 10, y + slope, gx1 + 10, y, gx1 + 10, y + BAND, gx0 - 10, y + BAND + slope))
        y += BAND; k += 1
    out.append('</g>')
    return ''.join(out)


vb = '%g %g %g %g' % (x0, y0, W, H)
off = ['<svg class="sg-off" viewBox="%s" aria-hidden="true">' % vb]
for k in ORDER:
    off.append('<use href="#p-%s" fill="%s"/>' % (k, OFF[parts[k]['col']]))
off.append('<g clip-path="url(#clip-glass)">' + stripes(['#3a1412', None, '#0f1f36', None], 'st-off') + '</g>')
off.append('</svg>')

PAD = 34
lay = []
for k in ORDER:
    bx0, by0, bx1, by1 = parts[k]['box']
    bx0 -= PAD; by0 -= PAD; bx1 += PAD; by1 += PAD
    st = 'left:%.3f%%;top:%.3f%%;width:%.3f%%;height:%.3f%%' % ((bx0 - x0) / W * 100, (by0 - y0) / H * 100, (bx1 - bx0) / W * 100, (by1 - by0) / H * 100)
    halo, core = LIT[parts[k]['col']]
    f = 'halo-s' if k in ('bevel', 'rays', 'rules', 'est') else 'halo'
    inner = '<use href="#p-%s" fill="%s" filter="url(#%s)" opacity="%s"/>' % (k, halo, f, '.55' if k == 'bevel' else '.95')
    if k == 'glass':
        inner += '<use href="#p-glass" fill="%s"/><g clip-path="url(#clip-glass)">%s</g>' % (core, stripes(['#e5392c', None, '#3377d6', None], 'st-lit'))
    elif k == 'bevel':
        inner += '<use href="#p-bevel" fill="#a37847"/>'
    else:
        inner += '<use href="#p-%s" fill="%s" filter="url(#tube)"/><use href="#p-%s" fill="%s" opacity=".85"/>' % (k, core, k, core)
    lay.append('<div class="lay" data-p="%s" style="%s"><svg viewBox="%g %g %g %g" aria-hidden="true">%s</svg></div>' % (k, st, bx0, by0, bx1 - bx0, by1 - by0, inner))

shine = '<svg class="sg-shine" viewBox="%s" aria-hidden="true"><g clip-path="url(#clip-all)"><rect class="sh-bar" x="%g" y="%g" width="%g" height="%g" fill="url(#shine-g)" transform="skewX(-18)"/></g></svg>' % (vb, x0 - 320 + .325 * (y0 + H / 2), y0 - 40, 260, H + 80)

sign = ''.join(off) + ''.join(lay) + shine
# nav mark: CINCO + BARBERS
cb = [parts[k]['box'] for k in ['C1', 'O', 'B0', 'B6']]
mx0, my0 = min(b[0] for b in cb) - 4, parts['C1']['box'][1] - 4
mx1, my1 = max(b[2] for b in cb) + 4, max(parts['B%d' % i]['box'][3] for i in range(7)) + 4
nav = '<svg class="mark" viewBox="%g %g %g %g" aria-hidden="true">%s%s</svg>' % (
    mx0, my0, mx1 - mx0, my1 - my0,
    ''.join('<use href="#p-%s" fill="#F2EADD"/>' % k for k in ['C1', 'I', 'N', 'C2', 'O']),
    ''.join('<use href="#p-B%d" fill="#B38B58"/>' % i for i in range(7)))

t = open(D + 'tpl.html').read()
t = t.replace('<!--DEFS-->', ''.join(defs)).replace('<!--SIGN-->', sign).replace('<!--NAVMARK-->', nav)
t = t.replace('{{ASPECT}}', '%g / %g' % (W, H))
# closer: the whole logo, lit colours, no filters (the glow is one CSS drop-shadow)
mini = ''.join('<use href="#p-%s" fill="%s"/>' % (k, {'cream': '#F2EADD', 'gold': '#C79E66', 'brass': '#C9A984', 'glass': '#F2ECE5'}[parts[k]['col']]) for k in ORDER)
mini += '<g clip-path="url(#clip-glass)">%s</g>' % stripes(['#c8322a', None, '#2a5fa8', None], 'st-lit')
t = t.replace('{{MINIVB}}', vb).replace('{{MINI}}', mini)
open(D + '../index.html', 'w').write(t)

# favicon: the traced pole on their black
px0, py0, px1, py1 = parts['brass']['box']
side = max(px1 - px0, py1 - py0) + 40
cx, cy = (px0 + px1) / 2, (py0 + py1) / 2
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%g %g %g %g"><defs><clipPath id="g"><path d="%s"/></clipPath></defs>'
       '<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="#040202"/><path fill="#AE8A5C" d="%s"/><path fill="#F2ECE5" d="%s"/>'
       '<g clip-path="url(#g)">%s</g></svg>') % (
    cx - side / 2, cy - side / 2, side, side, rnd(parts['glass']['d']), cx - side / 2, cy - side / 2, side, side, side * .2,
    rnd(parts['brass']['d']), rnd(parts['glass']['d']), stripes(['#9b2a1f', None, '#1d3a63', None], 's').replace('class="s"', ''))
open(D + '../favicon.svg', 'w').write(fav)
# standalone lit logo (link preview card): same paths, lit colours, stripes in the glass
LITC = {'cream': '#F7EEDF', 'gold': '#D2A468', 'brass': '#CFAA7A', 'glass': '#FBF7F1'}
lit = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s"><defs><clipPath id="g"><path d="%s"/></clipPath></defs>' % (vb, rnd(parts['glass']['d']))]
for k in ORDER:
    lit.append('<path fill-rule="evenodd" fill="%s" d="%s"/>' % ('#a37847' if k == 'bevel' else LITC[parts[k]['col']], rnd(parts[k]['d'])))
lit.append('<g clip-path="url(#g)">%s</g></svg>' % stripes(['#d23a2c', None, '#2f62ad', None], 'x').replace(' class="x"', ''))
open(D + 'logo-traced-lit.svg', 'w').write(''.join(lit))
print('index.html', len(t), 'bytes; favicon', len(fav))
