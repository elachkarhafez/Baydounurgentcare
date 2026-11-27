"""Build ../index.html and ../favicon.svg from page.html + parts.json (trace.py) + media.json (media_trace.py).
Every traced part is ONE <path id="p-*"> in a hidden <defs>; every logo on the page is <use> of those paths, so the
path data ships once. Placeholders in page.html: <!--DEFS-->.
Lockup geometry (measured on their own lockups, see facts.md):
  stacked  = store tee print: MEDIA under the mark, translate(21.2 1029.7) scale(7.69) in mark units
  header   = ozmedia313.com header (Frame-1.png): MEDIA right of the mark, translate(897.6 252.4) scale(14.2)
Run ../../.claude/skills/ela-studio/kit/og/card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE)
P = json.load(open(os.path.join(HERE, 'parts.json')))
M = json.load(open(os.path.join(HERE, 'media.json')))['letters']
paths = (f'<path id="p-O" pathLength="1000" d="{P["O"]["d"]}"/><path id="p-Z" pathLength="1000" d="{P["Z"]["d"]}"/>'
         + ''.join(f'<path id="p-{c}" d="{d}"/>' for c, d in M.items()))
word = ''.join(f'<use href="#p-{c}"/>' for c in 'MEDIA')
defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + paths +
        '<symbol id="oz-mark" viewBox="60 15 752 952"><use href="#p-O"/><use href="#p-Z"/></symbol>'
        f'<symbol id="oz-h" viewBox="60 15 2440 952"><use href="#p-O"/><use href="#p-Z"/><g transform="translate(897.6 252.4) scale(14.2)">{word}</g></symbol>'
        f'<symbol id="oz-s" viewBox="35 15 870 1235"><use href="#p-O"/><use href="#p-Z"/><g transform="translate(21.2 1029.7) scale(7.69)">{word}</g></symbol>'
        '<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="38" result="a"/>'
        '<feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b"/><feMerge><feMergeNode in="a"/><feMergeNode in="b"/></feMerge></filter>'
        '</defs></svg>')
page = open(os.path.join(HERE, 'page.html')).read()
html = page.replace('<!--DEFS-->', defs)
open(os.path.join(SITE, 'index.html'), 'w').write(html)
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" rx="180" fill="#091e32"/>'
       f'<g transform="translate(500 500) scale(.86) translate(-436 -491)" fill="#5bc5ff"><path d="{P["O"]["d"]}"/><path d="{P["Z"]["d"]}"/></g></svg>')
open(os.path.join(SITE, 'favicon.svg'), 'w').write(fav)
og = open(os.path.join(HERE, 'og.src.html')).read().replace('<!--DEFS-->', defs)
open(os.path.join(HERE, 'og.html'), 'w').write(og)
icon = ('<!doctype html><body style="margin:0">' + defs + '<div style="width:512px;height:512px;background:#091e32;display:grid;place-items:center">'
        '<svg viewBox="35 15 870 1235" style="height:420px;fill:#5bc5ff;filter:drop-shadow(0 0 14px rgba(91,197,255,.7))"><use href="#oz-s"/></svg></div></body>')
open(os.path.join(HERE, 'icon.html'), 'w').write(icon)
print('index.html', len(html) // 1024, 'KB; defs', len(defs) // 1024, 'KB')
