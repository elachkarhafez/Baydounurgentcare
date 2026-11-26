# TIKIZ set in Kanit ExtraBold Italic outlines, fitted to the logo's TIKIZ box (1200-unit roundel space), merged into mark.json
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
D = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/'
f = TTFont(D + 'fonts/Kanit-ExtraBoldItalic.ttf'); gs = f.getGlyphSet(); cmap = f.getBestCmap()
box_l, box_r, top, base = 284, 972, 440, 628
capH = f['OS/2'].sCapHeight
k = (base - top) / capH
track = 14  # roundel units between letters
x = 0; letters = []
for ch in 'TIKIZ':
    gn = cmap[ord(ch)]; bp = BoundsPen(gs); gs[gn].draw(bp); xmin, ymin, xmax, ymax = bp.bounds
    letters.append((gn, x - xmin * k, xmin * k, xmax * k)); x += (xmax - xmin) * k + track
total = x - track; sx = (box_r - box_l) / total
out = []
for gn, ox, _, _ in letters:
    pen = SVGPathPen(gs)
    gs[gn].draw(TransformPen(pen, (k * sx, 0, 0, -k, box_l + ox * sx, base)))
    out.append(pen.getCommands())
m = json.load(open(D + 'mark.json')); m['letters'] = out; m['lettersFont'] = 'Kanit ExtraBold Italic (closest free match, fitted to the logo box)'
json.dump(m, open(D + 'mark.json', 'w'), separators=(',', ':'))
print('sx', round(sx, 3))
