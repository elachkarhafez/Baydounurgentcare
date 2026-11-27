"""MEDIA, hand-traced over the stacked lockup printed on their store tee (src/oz-merch.png, crop x795 y253).
The print is only ~110 px wide with 1 px hairlines, so pixel tracing (potrace) lost the hairlines or bloated the stems.
These outlines were drawn point by point over a 22x gridded enlargement of that crop (coordinates are crop pixels),
then checked as an overlay (media_check.html). Each letter is its own path.  Writes media.json."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
T, B = 4.55, 26.6          # cap top and baseline (serif outer edges)
t, b = 5.4, 25.7           # inner edges of the top / bottom serifs (hairline ~0.85)

def serif(x0, x1, top=False):
    """a hairline serif slab with soft bracketed ends"""
    y0, y1 = (T, t) if top else (b, B)
    return f'M{x0} {y0}H{x1}V{y1}H{x0}Z'

def bracket(xs, xe, side, top=False):
    """a small concave fillet between a stem edge (xs) and the serif, extending toward xe"""
    if top:
        return f'M{xs} {t}Q{xs} {t+1.3} {xs + (0.0)} {t+1.9}L{xs} {t}H{xe}Q{xs} {t} {xs} {t}Z' if False else \
            f'M{xs} {t}H{xe}Q{xs} {t+.15} {xs} {t+1.6}Z'
    return f'M{xs} {b}H{xe}Q{xs} {b-.15} {xs} {b-1.6}Z'

L = {}
# M: thin left stem, thick left diagonal, thin right diagonal, thick right stem
L['M'] = ''.join([
    serif(3.3, 10.1), bracket(6.3, 4.6, 'l'), bracket(7.3, 9.0, 'r'),
    f'M6.3 {t}H7.3V{b}H6.3Z',                                   # thin left stem
    f'M4.3 {T}H9.55L18.05 25.2L17.35 {B+.25}H16.55L6.3 {t}H4.3Z',   # top-left serif + thick diagonal down to the vertex
    f'M16.55 {B+.25}H17.35L26.3 7.4V{T}H25.75Z',                     # thin right diagonal
    f'M25.7 {T}H28.3V{B}H25.7Z',                               # thick right stem
    serif(23.4, 31.0, True), serif(23.2, 31.4),
    bracket(25.7, 24.1, 'l', True), bracket(28.3, 30.0, 'r', True), bracket(25.7, 23.9, 'l'), bracket(28.3, 30.2, 'r'),
])
# E
L['E'] = ''.join([
    f'M37.3 {T}H39.8V{B}H37.3Z',
    serif(34.4, 37.4, True), serif(34.2, 37.4), bracket(37.3, 35.6, 'l', True), bracket(37.3, 35.4, 'l'),
    f'M37.3 {T}H48.6Q49.4 {T} 49.6 5.6L50.15 8.9H49.2Q48.6 6.4 47.2 {t}H39.8Z',        # top arm + its beak
    'M39.8 14.95H46.55V15.95H39.8Z',                                              # middle arm
    'M46.45 15.45Q46.6 13.2 47.25 12.2H47.85V18.75H47.25Q46.6 17.7 46.45 15.45Z',  # middle arm serif
    f'M37.3 {b}H47.6Q49.6 {b} 50.6 22.4H52.55L51.2 {B}H37.3Z',                     # bottom arm + rising beak
])
# D: stem, hairline top and bottom running into a bowl that is thick on the right
L['D'] = ''.join([
    f'M57.6 {T}H59.9V{B}H57.6Z',
    serif(55.0, 57.7, True), serif(54.9, 57.7), bracket(57.6, 56.1, 'l', True), bracket(57.6, 56.0, 'l'),
    f'M57.6 {T}H65.6C73.4 {T} 78.15 9.4 78.15 15.55C78.15 22.0 73.3 {B} 65.4 {B}H57.6V{b}H65.4'
    f'C71.3 {b} 75.05 21.8 75.05 15.55C75.05 9.5 71.4 {t} 65.6 {t}H57.6Z',
])
# I
L['I'] = ''.join([
    f'M84.3 {T}H86.7V{B}H84.3Z', serif(81.3, 89.6, True), serif(81.1, 89.8),
    bracket(84.3, 82.6, 'l', True), bracket(86.7, 88.4, 'r', True), bracket(84.3, 82.5, 'l'), bracket(86.7, 88.5, 'r'),
])
# A: thin left diagonal, thick right diagonal, hairline crossbar
L['A'] = ''.join([
    f'M100.75 4.25H102.45L110.35 {b}H107.45L100.65 6.9Z',          # thick right stroke
    f'M100.75 4.25L101.3 6.3L93.65 {b}H92.55L100.1 5.6Z',          # thin left stroke
    'M96.35 17.05H104.75V17.95H96.05Z',                             # crossbar
    serif(90.8, 97.3), serif(104.8, 111.7),
])
json.dump({'box': [3.2, T, 111.8, B], 'letters': L}, open(os.path.join(HERE, 'media.json'), 'w'))
html = ('<body style="margin:0;background:#fff"><div style="position:relative;width:2530px;height:704px">'
        '<img src="src/oz-merch.png" style="position:absolute;left:-17490px;top:-5566px;width:23364px;image-rendering:auto;opacity:.55">'
        '<svg viewBox="0 0 115 32" width="2530" height="704" style="position:absolute;left:0;top:0">'
        + ''.join(f'<path d="{d}" fill="rgba(220,0,0,.45)"/>' for d in L.values()) + '</svg></div>'
        '<svg viewBox="0 0 115 32" width="1150" height="320">' + ''.join(f'<path d="{d}" fill="#091e32"/>' for d in L.values()) + '</svg>'
        '<svg viewBox="0 0 115 32" width="230" height="64">' + ''.join(f'<path d="{d}" fill="#091e32"/>' for d in L.values()) + '</svg></body>')
open(os.path.join(HERE, 'media_check.html'), 'w').write(html)
