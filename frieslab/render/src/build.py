"""Builds frieslab/index.html and favicon.svg from tpl.html and logo.json (their Antelias sign, traced by trace.py),
and render/icon.html.  Run:  python3 -I build.py
then, LAST:  node .claude/skills/ela-studio/kit/og/card.mjs frieslab https://thefrieslab.vercel.app
(card.mjs rewrites the preview tags in index.html; build.py keeps the tags it finds, but rerun card.mjs after a rebuild.)"""
import os, re, json
D = os.path.dirname(os.path.abspath(__file__)) + '/'
S = os.path.normpath(D + '../..') + '/'
L = json.load(open(D + 'logo.json'))
W, H = L['box'][2], L['box'][3]
FLAT = {'panel': '#232025', 'orange': '#f87607', 'red': '#f30b1b', 'amber': '#e0932a'}
parts = sorted(L['parts'], key=lambda p: p['order'])
js = [[p['id'], p['kind'], p['color'], p['d'], [round(v, 1) for v in p['bb']]] for p in parts]
logo_json = json.dumps({'w': W, 'h': H, 'parts': js}, separators=(',', ':'))
path = lambda p: '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (p['d'], FLAT[p['color']])
full = ''.join(path(p) for p in parts)
mark = ''.join(path(p) for p in parts if p['kind'] in ('letter', 'bubble'))   # FRIES / LAB, flask, bubbles, dots
MARK_VB = '80 2 282 224'
defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
        '<symbol id="flSign" viewBox="0 0 %d %d">%s</symbol><symbol id="flMark" viewBox="%s">%s</symbol></defs></svg>') % (W, H, full, MARK_VB, mark)
def use(sym, vb, cls='', label=None, style=''):
    a = 'role="img" aria-label="%s"' % label if label else 'aria-hidden="true"'
    return '<svg %s%sviewBox="%s" %s><use href="#%s"/></svg>' % ('class="%s" ' % cls if cls else '', 'style="%s" ' % style if style else '', vb, a, sym)

t = open(D + 'tpl.html').read()
t = t.replace('{{LOGO_DEFS}}', defs).replace('{{LOGO_JSON}}', logo_json)
t = t.replace('{{LOGO_NAV}}', use('flMark', MARK_VB, label='Fries Lab'))
t = t.replace('{{LOGO_FALLBACK}}', use('flSign', '0 0 %d %d' % (W, H), 'fallback', 'Fries Lab sign'))
t = t.replace('{{LOGO_FOOT}}', use('flMark', MARK_VB, label='Fries Lab'))
t = t.replace('{{LOGO_TICKET}}', use('flMark', MARK_VB, style='height:48px;width:auto;display:block;margin-bottom:8px'))
assert not re.findall(r'\{\{[A-Z_]+\}\}', t), re.findall(r'\{\{[A-Z_]+\}\}', t)
old = open(S + 'index.html').read() if os.path.exists(S + 'index.html') else ''
tags = [x for x in re.findall(r'\n<(?:link rel="(?:canonical|apple-touch-icon)"|meta (?:property|name)="(?:og|twitter):)[^>]*>', old)
        if not re.search(r'(og|twitter):(title|description|image:alt)', x)]   # card.mjs refills these from <title>/description
if tags:
    t = re.sub(r'(<meta name="description"[^>]*>)', lambda m: m.group(1) + ''.join(tags), t, count=1)
open(S + 'index.html', 'w').write(t)
open(S + 'favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 -14 314 314"><rect x="64" y="-14" width="314" height="314" rx="60" fill="#141214"/>%s</svg>' % mark)
open(D + '../icon.html', 'w').write('<!doctype html><html><body style="margin:0;width:512px;height:512px;background:#141214;position:relative;overflow:hidden">'
                                    '<img src="sign.png" style="position:absolute;left:50%;top:50%;width:820px;height:auto;transform:translate(-50%,-46%)"></body></html>')
print('index.html', len(t) // 1024, 'KB  logo json', len(logo_json) // 1024, 'KB')
