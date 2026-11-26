"""Assemble zuco/index.html from tpl.html + app.js + logo.json, and write favicon.svg.
usage: /usr/bin/python3 -I build.py"""
import os, json
D = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(D, '..', '..'))
tpl = open(os.path.join(D, 'tpl.html'), encoding='utf-8').read()
app = open(os.path.join(D, 'app.js'), encoding='utf-8').read()
logo = json.load(open(os.path.join(D, 'logo.json')))
app = app.replace('/*__LOGO__*/null', json.dumps(logo, separators=(',', ':')))
out = tpl.replace('/*__APP__*/', app)
idx = os.path.join(SITE, 'index.html')
# card.mjs (run last, after every rebuild) adds the absolute og/twitter tags
open(idx, 'w', encoding='utf-8').write(out)
# favicon: the diamond mark, lit white on their black disc
facets = [p for p in logo['parts'] if p['g'] == 'mark']
d = ' '.join(p['d'] for p in facets)
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#0f0f0f"/>'
       '<g transform="translate(32 32) scale(.074) translate(-586 -278)"><path d="%s" fill="#f8f8f8"/></g></svg>') % d
open(os.path.join(SITE, 'favicon.svg'), 'w').write(fav)
print('index.html', len(out) // 1024, 'KB')
