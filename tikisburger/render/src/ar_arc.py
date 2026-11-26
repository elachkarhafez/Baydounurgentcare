"""Sets the logo's Arabic hashtag (#على_ذوقك_يا_طيّب) as real shaped outlines bent round the bottom of the roundel.

SVG textPath breaks Arabic in Chromium (each glyph is rotated on its own, so the joins split and letters collide),
so the line is shaped with HarfBuzz (Lemonada 700, the closest free match to the logo's Arabic), turned into outlines
with fontTools and every point is mapped onto a circle round the ring. The result goes into mark.json as `ar`.
Run: python3 ar_arc.py [R] [size]   then node build.mjs, then the card.mjs step.
"""
import json, math, sys, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

here = os.path.dirname(os.path.abspath(__file__))
TEXT = '#على_ذوقك_يا_طيّب'
CX, CY = 617, 510             # centre of the traced ring (bbox 109,0 1016x1021)
R = float(sys.argv[1]) if len(sys.argv) > 1 else 612   # baseline radius
SIZE = float(sys.argv[2]) if len(sys.argv) > 2 else 64

path = os.path.join(here, 'fonts', 'Lemonada700.ttf')
blob = hb.Blob.from_file_path(path); face = hb.Face(blob); font = hb.Font(face)
buf = hb.Buffer(); buf.add_str(TEXT); buf.guess_segment_properties()
hb.shape(font, buf, {})
tt = TTFont(path); gs = tt.getGlyphSet(); order = tt.getGlyphOrder(); upm = tt['head'].unitsPerEm
k = SIZE / upm

glyphs, x = [], 0
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):   # RTL buffers come back in visual (left-to-right) order
    glyphs.append((order[info.codepoint], x + pos.x_offset, pos.y_offset)); x += pos.x_advance
total = x * k

def warp(px, py):              # px along the line (font units, already offset), py up from baseline
    s = px * k - total / 2       # arc length from the bottom centre, + to the right
    r = R - py * k               # up = towards the centre
    a = math.pi / 2 - s / R
    return CX + r * math.cos(a), CY + r * math.sin(a)

def subdiv(p0, p1, n):
    return [(p0[0] + (p1[0] - p0[0]) * t / n, p0[1] + (p1[1] - p0[1]) * t / n) for t in range(1, n + 1)]

out = []
for name, gx, gy in glyphs:
    pen = DecomposingRecordingPen(gs); gs[name].draw(pen)
    cur = None
    for op, pts in pen.value:
        P = [(gx + p[0], gy + p[1]) for p in pts]
        if op == 'moveTo':
            cur = P[0]; out.append('M%.1f %.1f' % warp(*cur))
        elif op == 'lineTo':          # split long straight runs so they follow the curve
            n = max(1, int(abs(P[0][0] - cur[0]) / 120))
            for q in subdiv(cur, P[0], n): out.append('L%.1f %.1f' % warp(*q))
            cur = P[0]
        elif op == 'qCurveTo':        # TrueType: implied on-curve points between off-curve ones
            offs, end = P[:-1], P[-1]
            for i, c in enumerate(offs):
                e = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                out.append('Q%.1f %.1f %.1f %.1f' % (*warp(*c), *warp(*e)))
            cur = end
        elif op == 'curveTo':
            out.append('C%.1f %.1f %.1f %.1f %.1f %.1f' % (*warp(*P[0]), *warp(*P[1]), *warp(*P[2]))); cur = P[2]
        elif op in ('closePath', 'endPath'):
            out.append('Z')

mp = os.path.join(here, 'mark.json'); M = json.load(open(mp))
M['ar'] = ''.join(out)
json.dump(M, open(mp, 'w'))
print('glyphs', len(glyphs), 'arc span deg %.1f' % math.degrees(total / R), 'len', len(M['ar']))
