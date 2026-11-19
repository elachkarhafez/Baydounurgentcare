"""The inside of the vault: safe-deposit wall, light beam, a shelf of the menu, gold bars and coins."""
import random
random.seed(11)
NV = '#0d1b2e'

def interior(item):
    o = 'stroke="%s" stroke-width="1.8" stroke-linejoin="round"' % NV
    g = ['<defs><clipPath id="vclip"><circle cx="260" cy="260" r="194"/></clipPath>'
         '<radialGradient id="vbg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#5a3d1c"/><stop offset=".6" stop-color="#2c1d0e"/><stop offset="1" stop-color="#140d06"/></radialGradient>'
         '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a1" stop-opacity=".55"/><stop offset="1" stop-color="#ffe3a1" stop-opacity="0"/></linearGradient>'
         '<linearGradient id="drw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c89a4e"/><stop offset="1" stop-color="#8a6128"/></linearGradient>'
         '<linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#d99a2b"/></linearGradient>'
         '<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5b2c"/><stop offset="1" stop-color="#6a3a1a"/></linearGradient></defs>']
    g.append('<g id="vinside"><g clip-path="url(#vclip)">')
    g.append('<rect x="60" y="60" width="400" height="400" fill="url(#vbg)"/>')
    # back wall: rows of brass safe-deposit drawers
    for r, y in enumerate(range(78, 262, 34)):
        off = 0 if r % 2 == 0 else 0
        for x in range(76, 444, 52):
            g.append('<rect x="%d" y="%d" width="46" height="28" rx="3" fill="url(#drw)" %s/>' % (x + off, y, o))
            g.append('<circle cx="%d" cy="%d" r="3.2" fill="#3a2610"/>' % (x + off + 23, y + 16))
            g.append('<rect x="%d" y="%d" width="16" height="5" rx="1" fill="#f1d79c"/>' % (x + off + 15, y + 5))
    # light beam from the ceiling
    g.append('<path class="beam" d="M200 60 H320 L400 360 H120 Z" fill="url(#beam)"/>')
    # the shelf with the menu
    g.append('<rect x="70" y="300" width="380" height="16" rx="3" fill="url(#wood)" %s/>' % o)
    g.append('<rect x="70" y="316" width="380" height="8" fill="#3a1f0c"/>')
    for i, (k, x) in enumerate([('pizza', 104), ('burger', 170), ('steak', 236), ('salad', 302), ('drink', 368)]):
        sv = item(k).replace('<svg ', '<svg class="vit" x="%d" y="246" width="56" height="56" ' % x, 1)
        g.append(sv)
    # floor
    g.append('<rect x="60" y="324" width="400" height="140" fill="#1f140a"/>')
    g.append('<path d="M60 324 H460" stroke="%s" stroke-width="3"/>' % NV)
    # gold bars, stacked left and right
    def bars(cx, base, rows):
        for r in range(rows):
            n = rows - r
            for i in range(n):
                x = cx - n * 22 + i * 44 + 2; y = base - (r + 1) * 20
                g.append('<path d="M%d %d h36 l4 18 h-44 z" fill="url(#bar)" %s/>' % (x + 4, y, o))
                g.append('<path d="M%d %d h22" stroke="#fff3c4" stroke-width="2.5" stroke-linecap="round"/>' % (x + 11, y + 6))
    bars(160, 404, 3); bars(366, 398, 2)
    # coins
    for cx, cy in [(244, 392), (262, 398), (280, 390), (232, 404), (300, 404), (268, 384), (420, 400), (110, 404)]:
        g.append('<ellipse cx="%d" cy="%d" rx="11" ry="5" fill="#f2c45a" %s/>' % (cx, cy, o))
    # sparkles
    for x, y, s in [(150, 112, 1), (382, 150, .8), (300, 230, .7), (122, 352, .8), (408, 360, 1), (262, 362, .9)]:
        g.append('<path class="spk" d="M%d %d l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 z" fill="#fff6dc" transform="scale(%s)" style="transform-origin:%dpx %dpx"/>' % (x - 3, y - 3, s, x, y))
    g.append('</g><circle cx="260" cy="260" r="194" fill="none" %s/></g>' % o.replace('3', '4', 1))
    return ''.join(g)
