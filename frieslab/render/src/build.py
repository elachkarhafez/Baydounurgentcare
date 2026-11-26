"""Builds frieslab/index.html and favicon.svg from tpl.html and logo.json (traced by trace.py), and render/icon.html.
Run:  python3 -I build.py   then, last:  node .claude/skills/ela-studio/kit/og/card.mjs frieslab https://<project>.vercel.app
(card.mjs rewrites the preview tags in index.html, so rerun it after every rebuild.)"""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.normpath(D + '../..') + '/'
L = json.load(open(D + 'logo.json'))
FLAT = {'red': '#cf2131', 'white': '#eff5f5', 'yellow': '#ede81b', 'shade': '#b1a715', 'green': '#0ab953', 'black': '#0b0b11'}


def r1(d):
    return re.sub(r'-?\d+\.\d+', lambda m: ('%.1f' % float(m.group())).rstrip('0').rstrip('.'), d)


parts = sorted(L['parts'], key=lambda p: p['order'])
js = [[p['id'], p['kind'], p['color'], r1(p['d']), [round(v, 1) for v in p['bb']]] for p in parts]
logo_json = json.dumps({'w': 200, 'h': 225, 'parts': js}, separators=(',', ':'))
inner = ''.join('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (r1(p['d']), FLAT[p['color']]) for p in parts)
defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><symbol id="flLogo" viewBox="4 3 192 220">%s</symbol></defs></svg>' % inner
use = lambda cls='', label=None: '<svg %sviewBox="4 3 192 220" %s><use href="#flLogo"/></svg>' % (
    'class="%s" ' % cls if cls else '', 'role="img" aria-label="%s"' % label if label else 'aria-hidden="true"')

t = open(D + 'tpl.html').read()
t = t.replace('{{LOGO_DEFS}}', defs).replace('{{LOGO_JSON}}', logo_json)
t = t.replace('{{LOGO_NAV}}', use(label='The Fries Lab'))
t = t.replace('{{LOGO_FALLBACK}}', use('fallback', 'The Fries Lab logo'))
t = t.replace('{{LOGO_FOOT}}', use(label='The Fries Lab'))
t = t.replace('{{LOGO_TICKET}}', use().replace('<svg ', '<svg style="height:56px;width:auto;display:block;margin-bottom:8px" '))
assert not re.findall(r'\{\{[A-Z_]+\}\}', t), re.findall(r'\{\{[A-Z_]+\}\}', t)
# keep the preview tags card.mjs wrote last time
old = open(S + 'index.html').read() if os.path.exists(S + 'index.html') else ''
tags = re.findall(r'\n<(?:link rel="(?:canonical|apple-touch-icon)"|meta (?:property|name)="(?:og|twitter):)[^>]*>', old)
if tags:
    t = re.sub(r'(<meta name="description"[^>]*>)', lambda m: m.group(1) + ''.join(tags), t, count=1)
open(S + 'index.html', 'w').write(t)
fav = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 3 192 220">%s</svg>' % inner
open(S + 'favicon.svg', 'w').write(fav)
open(D + '../icon.html', 'w').write('<!doctype html><html><body style="margin:0;width:512px;height:512px;background:radial-gradient(circle at 50% 45%,#232438,#141522 70%);display:grid;place-items:center">'
                                    '<img src="sign.png" style="width:470px;height:auto;margin-top:4px"></body></html>')
print('index.html', len(t) // 1024, 'KB  logo json', len(logo_json) // 1024, 'KB')
