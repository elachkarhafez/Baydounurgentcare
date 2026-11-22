import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.join(D, '..', '..') + '/'
L = json.load(open(D + 'nlogo.json'))   # their badge, traced from the NYC Ice Bun post (flame tip filled in from their profile picture)
W, H = L['W'], L['H']
CX, CY, RO, RI = L['ring_c']
FL = 'translate(0 %d) scale(1 -1)' % H
Y, WH, K = '#f5b700', '#ffffff', '#0d0d0d'
HALF = 1290
VB = (CX - HALF, CY - HALF - 40, 2 * HALF, 2 * HALF)
DD = 'https://www.doordash.com/search/store/NYC%20Over%20Rice/'

def g(d, fill, cls='', extra=''):
    return '<g%s%s><g transform="%s"><path fill="%s" d="%s"/></g></g>' % (' class="%s"' % cls if cls else '', extra, FL, fill, d)

def split_sub(d):
    # potrace writes each closed contour as its own "M..." subpath
    parts = ['M' + p for p in d.split('M') if p.strip()]
    return parts
speed = split_sub(L['speed'])
spl = [p for p in speed if float(re.match(r'M\s*([\d.]+)', p).group(1)) < W / 2]
spr = [p for p in speed if p not in spl]

def badge():
    s = '<svg viewBox="%.0f %.0f %.0f %.0f" aria-hidden="true">' % VB
    s += '<circle cx="%.0f" cy="%.0f" r="%.0f" fill="%s"/>' % (CX, CY, RO + 12, K)
    for k, f in (('ring', Y), ('arcw', WH), ('flame', Y), ('torch', WH), ('statue', WH), ('chick', Y), ('over', WH), ('rice', Y), ('speed', Y), ('bar', Y), ('tag', Y)):
        s += g(L[k], f)
    for d in L['nyc']: s += g(d, Y)
    return s + '</svg>'

def intro():
    rm = (RO + RI) / 2
    s = '<svg viewBox="%.0f %.0f %.0f %.0f">' % VB
    s += '<defs><mask id="mring" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="7000" height="7000"><circle id="imring" cx="%.0f" cy="%.0f" r="%.0f" fill="none" stroke="#fff" stroke-width="%.0f" transform="rotate(-120 %.0f %.0f)"/></mask>' % (CX, CY, rm, RO - RI + 60, CX, CY)
    s += '<mask id="marc" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="7000" height="7000"><circle id="imarc" cx="%.0f" cy="%.0f" r="1100" fill="none" stroke="#fff" stroke-width="240" transform="rotate(-210 %.0f %.0f)"/></mask>' % (CX, CY, CX, CY)
    s += '<clipPath id="ctag"><rect id="itagr" x="0" y="0" width="0" height="2800"/></clipPath>'
    s += '<mask id="mnyc" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="7000" height="7000"><g fill="#fff">' + ''.join('<g transform="%s"><path d="%s"/></g>' % (FL, d) for d in L['nyc']) + '</g></mask>'
    s += '<linearGradient id="gsh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff8d6" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
    s += '<defs><filter id="dglow" x="-30%%" y="-30%%" width="160%%" height="160%%"><feDropShadow dx="0" dy="0" stdDeviation="60" flood-color="#f5b700" flood-opacity=".35"/></filter></defs><circle id="idisc" cx="%.0f" cy="%.0f" r="%.0f" fill="%s" filter="url(#dglow)"/>' % (CX, CY, RO + 12, '#080808')
    s += '<g mask="url(#mring)">' + g(L['ring'], Y) + '</g><g mask="url(#marc)">' + g(L['arcw'], WH) + '</g>'
    s += g(L['torch'], WH, 'to') + g(L['flame'], Y, 'fl') + g(L['statue'], WH, 'st') + g(L['chick'], Y, 'ch')
    s += ''.join(g(d, Y, 'nl') for d in L['nyc'])
    s += '<rect id="ishine" x="-600" y="800" width="420" height="1200" fill="url(#gsh)" mask="url(#mnyc)" transform="skewX(-18)"/>'
    s += g(L['over'], WH, 'ov') + g(L['rice'], Y, 'ri')
    s += ''.join(g(d, Y, 'spl') for d in spl) + ''.join(g(d, Y, 'spr') for d in spr)
    s += g(L['bar'], Y, 'bar') + '<g clip-path="url(#ctag)">' + g(L['tag'], Y) + '</g>'
    s += '<rect id="iref" x="%.0f" y="%.0f" width="%.0f" height="%.0f" fill="none"/>' % VB
    return s + '</svg>'

BUN = '''<svg viewBox="0 0 400 400" aria-hidden="true"><defs>
<radialGradient id="bt" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#e9a65a"/><stop offset=".55" stop-color="#b8682b"/><stop offset="1" stop-color="#7a3d17"/></radialGradient>
<linearGradient id="bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d48a45"/><stop offset="1" stop-color="#8a4a1f"/></linearGradient>
<radialGradient id="ic" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f3e6cc"/><stop offset="1" stop-color="#dccaa6"/></radialGradient></defs>
<ellipse cx="200" cy="330" rx="150" ry="16" fill="#000" opacity=".5"/>
<path d="M62 268c0-14 10-22 24-22h228c14 0 24 8 24 22 0 34-60 56-138 56S62 302 62 268z" fill="url(#bb)"/>
<path d="M58 248c-6-40 40-70 70-62 16-30 64-38 90-22 30-14 74 0 84 30 30 4 46 34 36 60-8 18-30 22-50 18-20 14-60 16-80 6-26 12-64 10-84-4-30 6-62-4-66-26z" fill="url(#ic)"/>
<g fill="#e9dcc0" opacity=".8"><circle cx="120" cy="230" r="4"/><circle cx="250" cy="222" r="3"/><circle cx="300" cy="248" r="3.5"/><circle cx="180" cy="250" r="2.5"/></g>
<g data-t="car" style="transition:opacity .35s,transform .35s"><path d="M78 214c20 10 34-6 52 4s22 30 40 14 30-20 48-6 28 20 46 4 34-10 50 4" fill="none" stroke="#d98b1c" stroke-width="9" stroke-linecap="round"/><path d="M130 220c2 16 0 28 6 36M262 220c-2 14 4 22 2 34" fill="none" stroke="#d98b1c" stroke-width="7" stroke-linecap="round"/></g>
<g data-t="choc" style="transition:opacity .35s,transform .35s"><path d="M70 236c18-14 30 8 46-2s20-26 40-12 26 22 44 6 30-14 46 0 26 18 44 2 26-8 40 4" fill="none" stroke="#3b1f12" stroke-width="11" stroke-linecap="round"/><path d="M156 230c4 18-2 34 6 48M206 226c0 16 6 30 2 44M286 234c-4 16 2 24-2 36" fill="none" stroke="#3b1f12" stroke-width="8" stroke-linecap="round"/></g>
<g data-t="oreo" fill="#22201f" style="transition:opacity .35s,transform .35s"><path d="M96 222l10-6 6 9-9 6z"/><path d="M142 206l12-3 3 11-11 3z"/><path d="M188 214l9 4-4 10-9-4z"/><path d="M232 200l12 2-2 11-11-2z"/><path d="M270 228l10-4 4 10-10 4z"/><path d="M308 236l9 5-5 9-9-5z"/><path d="M118 252l8-3 3 8-8 3z"/><path d="M218 250l9-2 2 9-9 2z"/><circle cx="168" cy="236" r="4"/><circle cx="254" cy="246" r="4"/><circle cx="292" cy="214" r="3"/></g>
<g data-t="mm" style="transition:opacity .35s,transform .35s"><ellipse cx="112" cy="232" rx="11" ry="8" fill="#e23b2e"/><ellipse cx="160" cy="212" rx="11" ry="8" fill="#2f7fe0" transform="rotate(-15 160 212)"/><ellipse cx="204" cy="238" rx="11" ry="8" fill="#f2c218"/><ellipse cx="246" cy="214" rx="11" ry="8" fill="#3aa64a" transform="rotate(20 246 214)"/><ellipse cx="290" cy="240" rx="11" ry="8" fill="#e8742a"/><ellipse cx="146" cy="254" rx="10" ry="7" fill="#7a3d1f"/><ellipse cx="262" cy="258" rx="10" ry="7" fill="#e23b2e"/><g fill="#fff" opacity=".45"><ellipse cx="108" cy="229" rx="4" ry="2"/><ellipse cx="200" cy="235" rx="4" ry="2"/><ellipse cx="286" cy="237" rx="4" ry="2"/></g></g>
<path d="M72 176c-4-70 58-112 128-112s132 42 128 112c-40 14-88 18-128 18s-88-4-128-18z" fill="url(#bt)"/>
<path d="M110 110c24-24 60-34 96-30" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".25"/>
<g data-t="sugar" fill="#fff" style="transition:opacity .35s,transform .35s">''' + ''.join('<circle cx="%d" cy="%d" r="%.1f"/>' % (90 + (i * 37) % 220, 84 + (i * 53) % 86 - (30 if 120 < (90 + (i * 37) % 220) < 280 else 0), 1.4 + (i % 3) * .7) for i in range(70)) + '''</g>
</svg>'''

TICK = ''.join('<span>%s</span><i>&#9679;</i>' % x for x in ['Now on DoorDash', 'NYC Ice Bun just dropped', 'Beef Nacho Fries', 'New premium straight-cut fries', 'Bay Park Square Mall', 'Bigfoot approved'])
def ic(p):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % p
I = {'I_BAG': ic('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
     'I_PIN': ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
     'I_IG': ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>')}
t = open(D + 'tpl.html').read()
# transform origins the intro uses (svg units)
t = t.replace("G.set('#idisc',{scale:0,svgOrigin:'{{C}}'})", "G.set('#idisc',{scale:0,svgOrigin:'%.0f %.0f'})" % (CX, CY))
t = t.replace("{opacity:0,scale:.3,svgOrigin:'{{STO}}'}", "{opacity:0,scale:.3,transformOrigin:'50% 80%'}")
t = t.replace("{opacity:0,scale:2.2,svgOrigin:n.getAttribute('data-o')}", "{opacity:0,scale:2.2,transformOrigin:'50% 50%'}")
t = t.replace("{scaleX:0,svgOrigin:'{{SPLO}}'}", "{scaleX:0,transformOrigin:'100% 50%'}").replace("{scaleX:0,svgOrigin:'{{SPRO}}'}", "{scaleX:0,transformOrigin:'0% 50%'}")
t = t.replace("{opacity:1,scaleX:0,svgOrigin:'{{BARO}}'}", "{opacity:1,scaleX:0,transformOrigin:'50% 50%'}")
t = t.replace("{rotation:0,scale:1,opacity:1,duration:.7,ease:'power3.out',immediateRender:false},2.18)", "{rotation:0,scale:1,opacity:1,duration:.7,ease:'power3.out'},2.18)")
R = dict(I, BADGE=badge(), INTRO=intro(), BUN=BUN, TICK=TICK, DD=DD)
for k in sorted(R, key=len, reverse=True): t = t.replace('{{%s}}' % k, R[k])
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
open(S + 'index.html', 'w').write(t)
fav = badge().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1).replace(' aria-hidden="true"', '')
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><body style="margin:0;width:512px;height:512px;background:#0d0d0d">' + fav.replace('<svg ', '<svg width="512" height="512" ', 1) + '</body>')
print(len(t) // 1024, 'KB', len(spl), len(spr))

og = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Anton&family=Libre+Franklin:wght@600;800&family=Old+Standard+TT:ital@1&display=block" rel="stylesheet"><style>'
      '*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#f3efe6;color:#0d0d0d;font-family:"Libre Franklin"}'
      '.b{position:absolute;left:44px;top:40px;width:150px}.mn{position:absolute;left:214px;top:54px;font:400 64px/1 Anton;text-transform:uppercase}.mn span{background:#0d0d0d;color:#f5b700;padding:0 8px}'
      '.it{position:absolute;left:218px;top:128px;font:italic 22px "Old Standard TT"}.rule{position:absolute;left:44px;right:560px;top:205px;border-top:4px solid #0d0d0d;border-bottom:1px solid #0d0d0d;height:8px}'
      '.fl{position:absolute;left:44px;top:236px;background:#d81e1e;color:#fff;font:400 26px Anton;padding:2px 12px;transform:rotate(-2deg);text-transform:uppercase}'
      'h1{position:absolute;left:44px;top:290px;width:580px;font:400 74px/1 Anton;text-transform:uppercase}'
      '.loc{position:absolute;left:44px;bottom:40px;font-size:24px;font-weight:800}.loc b{background:#f5b700;padding:6px 12px;margin-right:12px}'
      '.ph{position:absolute;right:30px;top:30px;bottom:30px;width:500px;border:4px solid #0d0d0d;overflow:hidden;box-shadow:8px 8px 0 #f5b700}.ph img{width:100%;height:100%;object-fit:cover;object-position:60% 40%}'
      '</style></head><body><div class="b">' + badge() + '</div><div class="mn"><span>NYC</span> Over Rice</div><div class="it">Inspired by the Streets of NYC</div><div class="rule"></div>'
      '<div class="fl">Breaking news</div><h1>Bigfoot spotted in Green Bay</h1><div class="loc"><b>Bay Park Square Mall</b>Now on DoorDash</div>'
      '<div class="ph"><img src="../media/bigfoot.webp"></div></body></html>')
open(D + '../og.html', 'w').write(og)
