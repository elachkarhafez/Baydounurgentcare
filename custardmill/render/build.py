"""Build ../index.html, ../favicon.svg and ../media/icon.png's source from page.html + parts.json (trace.py).
Every traced part becomes ONE <path id="p-<name>"> in a hidden <defs>; logos on the page are <use> of those paths, and
the canvas LED sign builds its Path2D objects from the same <defs> paths at runtime, so the path data ships once.
Placeholders in page.html:  <!--DEFS-->  and  /*META*/  (the ring circles, hub and part list for the sign).
Run card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
P = json.load(open(os.path.join(HERE, 'parts.json')))
M = P.pop('_meta')
NAVY, TAUPE = '#164576', '#978571'
ro, ri = M['ringO'], M['ringI']

paths = ''.join(f'<path id="p-{n}" d="{v["d"]}"/>' for n, v in P.items())
word = ''.join(f'<use href="#p-w{i}"/>' for i in range(11))
def colored(n):
    c = P[n]['c']
    fill = {'navy': NAVY, 'taupe': TAUPE, 'cream': '#fff', 'paper': '#fff'}[c]
    return f'<use href="#p-{n}" fill="{fill}"/>'
order = ['bowlFill', 'creamFill', 'cream', 'bowl', 'tower', 'sails0', 'est', 'yr', 'ruleL', 'ruleR', 't0', 't1', 't2'] + \
        [f'w{i}' for i in range(11)] + [f'f{i}' for i in range(13)] + ['dL', 'dR']
roundel = (f'<circle cx="{ro[0]}" cy="{ro[1]}" r="{ro[2]}" fill="none" stroke="{NAVY}" stroke-width="{ro[3]}"/>'
           f'<circle cx="{ri[0]}" cy="{ri[1]}" r="{ri[2]}" fill="none" stroke="{TAUPE}" stroke-width="{ri[3]}"/>'
           + ''.join(colored(n) for n in order))
# the shake glass, drawn in the same engraving language as their bowl (navy line work, white body), same coordinates
hatch = ''.join(f'<path d="M{455 + (y - 700) * .095 + 6:.1f} {y}h{16 - (y % 3)}M{625 - (y - 700) * .095 - 6:.1f} {y}h-{18 - (y % 4)}"/>' for y in range(716, 990, 13))
glass = ('<symbol id="cm-glass" viewBox="380 560 320 450" overflow="visible">'
         '<g class="gl-straw"><rect x="582" y="560" width="17" height="190" rx="5" transform="rotate(13 590 700)" fill="#fff" stroke="#164576" stroke-width="5"/>'
         '<path d="M586 590l14 10M584 622l14 10M581 654l14 10M578 686l14 10" transform="rotate(13 590 700)" stroke="#164576" stroke-width="6"/></g>'
         '<path d="M452 702H628L601 988Q599 1001 586 1001H494Q481 1001 479 988Z" fill="#fff" stroke="#164576" stroke-width="7" stroke-linejoin="round"/>'
         '<path class="gl-liquid" style="fill:var(--liq,#fff8ea)" d="M463 742H617L594 984H486Z"/>'
         f'<g stroke="#164576" stroke-width="3.2" stroke-linecap="round" fill="none">{hatch}</g>'
         '<path d="M462 742H618" stroke="#164576" stroke-width="3" opacity=".5"/>'
         '<g transform="translate(540 712) scale(.6) translate(-540 -872)"><use href="#p-creamFill" class="gl-cream" fill="#fff"/><use href="#p-cream" class="gl-lines" style="fill:var(--lin,#978571)"/></g>'
         '</symbol>')
defs = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + paths +
        '<symbol id="cm-mill" viewBox="418 108 250 282"><use href="#p-tower"/><use href="#p-sails0"/></symbol>'
        f'<symbol id="cm-word" viewBox="132 482 820 128">{word}</symbol>'
        f'<symbol id="cm-roundel" viewBox="40 40 1000 1000">{roundel}</symbol>'
        f'<symbol id="cm-bowl" viewBox="380 690 320 320">{colored("bowlFill")}<use href="#p-creamFill" class="b-cream" style="fill:var(--tint,#fff8ea)"/><use href="#p-cream" class="b-lines" style="fill:var(--line,#978571)"/>{colored("bowl")}</symbol>'
        + glass + '<clipPath id="cm-clip-cream"><use href="#p-creamFill"/></clipPath>'
        '</defs></svg>')

meta = {'ringO': ro, 'ringI': ri, 'hub': M['hub'], 'sailAngle': M['sailAngle'],
        'parts': {n: [v['c'], v['box']] for n, v in P.items()}}
page = open(os.path.join(HERE, 'page.html')).read()
out = page.replace('<!--DEFS-->', defs).replace('/*META*/', json.dumps(meta, separators=(',', ':')))
open(os.path.join(SITE, 'index.html'), 'w').write(out)

# favicon: their windmill in cream on a navy disc (the roundel's detail disappears at 16-32 px)
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">'
       f'<circle cx="32" cy="32" r="31" fill="{NAVY}"/><circle cx="32" cy="32" r="27.5" fill="none" stroke="{TAUPE}" stroke-width="1.6"/>'
       f'<g transform="translate(32 33.5) scale(.158) translate(-542 -249)" fill="#f6f5f1">'
       f'<path d="{P["tower"]["d"]}"/><path d="{P["sails0"]["d"]}"/></g></svg>')
open(os.path.join(SITE, 'favicon.svg'), 'w').write(fav)
# a 512 icon page for the apple-touch icon (rendered by the QA step into media/icon.png)
fav512 = fav.replace('<svg ', '<svg width="512" height="512" ')
open(os.path.join(HERE, 'icon.html'), 'w').write('<html><body style="margin:0;background:#f6f5f1">' + fav512 + '</body></html>')
print('index.html', len(out) // 1024, 'KB; favicon', len(fav) // 1024, 'KB')
