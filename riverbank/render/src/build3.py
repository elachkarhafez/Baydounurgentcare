import json, re, sys
import os
D = os.path.dirname(os.path.abspath(__file__)) + '/'
sys.path.insert(0, D)
import scene
OUT = os.path.join(D, '..', '..', 'index.html')
t = open(D + 'tpl3.html').read(); L = json.load(open(D + 'logo.json'))
letters = [o for o in L['letters'] if not (o['row'] == 'kab' and o['h'] < 20)]
lt = ''.join('<g class="lt %s"><path transform="%s" fill="#f6ecd9" d="%s"/></g>' % (o['row'], o['t'], o['d']) for o in letters)
waves = '<g clip-path="url(#wclip)"><path transform="%s" fill="#2a6fc4" d="%s"/><path transform="%s" fill="#6fb3ea" d="%s"/></g>' % (L['waveD']['t'], L['waveD']['d'], L['waveL']['t'], L['waveL']['d'])
INTRO = ('<svg viewBox="50 30 1470 570" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="wclip"><rect x="785" y="300" width="0" height="260"/></clipPath></defs>'
         '<g id="lockpart">' + waves + lt + '</g></svg>')
SPLASH = ''.join('<i></i>' for _ in range(12))
NV = '#0d1b2e'
def ic(p): return '<svg viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (NV, p)
C1 = ic('<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>')
C2 = ic('<path d="M3 9 12 4l9 5"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/><path d="M3 20h18"/>')
C3 = ic('<path d="M12 3 6 13h4l-3 5h10l-3-5h4z"/><path d="M12 18v3"/>')
C4 = ic('<path d="M3 16h18l-2 4H5z"/><path d="M6 16V9h9l3 7"/><path d="M9 9V6h4"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>')
ITEMS = ''.join('<div class="it">%s<b>%s</b></div>' % (scene.item(k), n) for k, n in [('pizza', 'Pizza'), ('burger', 'Burgers'), ('steak', 'Steaks'), ('salad', 'Salads'), ('drink', 'Drinks')])
MAP = open(D + 'map.svg').read()
# a little ferry crossing the river on the map
MAP = MAP.replace('<path d="M226 128 C250 120 300 118 334 126"', '<g class="ferry"><path d="M228 118 h18 l-3 6 h-12 z" fill="#f6ecd9" stroke="#0d1b2e" stroke-width="1.5"/><rect x="233" y="112" width="8" height="6" fill="#d9b36c"/></g><path d="M226 128 C250 120 300 118 334 126"', 1)
I = {'I_IG': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
     'I_PIN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>'}
for k, v in dict(I, INTRO_SVG=INTRO, SPLASH=SPLASH, SCENE=scene.hero(), VAULT=scene.vault(), ITEMS=ITEMS, MAP=MAP, C1=C1, C2=C2, C3=C3, C4=C4).items(): t = t.replace('{{%s}}' % k, v)
assert '{{' not in t, re.findall(r'\{\{\w+\}\}', t)
t = t.replace('#isplash{position:absolute;left:50%;top:50%;', '#isplash{position:absolute;left:50%;top:73%;')
t = t.replace("getBoundingClientRect().height*.62;", "getBoundingClientRect().height*.73;")
open(OUT, 'w').write(t); print(len(t) // 1024, 'KB')
