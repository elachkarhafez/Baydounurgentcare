"""Build ../index.html from page.html: injects the traced logo (parts.json) as inline SVG wherever
<!--LOGO:class--> appears. Paths carry data-p (part name) and class n (navy) or s (sky).
Run card.mjs AFTER this (it rewrites the head of index.html with the og tags)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'parts.json')))
ORDER = [n for n in ['frame', 'steth', 'ear', 'the0', 'the1', 'the2'] + [f'fd{i}' for i in range(9)] + ['tagA', 'tagB'] if n in P]  # the stethoscope tube touches the frame, so it traces as one part
paths = ''.join(f'<path data-p="{n}" class="{"s" if P[n]["color"] == "sky" else "n"}" d="{P[n]["d"]}"/>' for n in ORDER)
def svg(cls):
    return (f'<svg class="logo {cls}" viewBox="0 0 582 218" role="img" aria-label="The Family Doc. Where you are family.">'
            f'{paths}</svg>')
h = open(os.path.join(HERE, 'page.html')).read()
h = re.sub(r'<!--LOGO:([\w-]*)-->', lambda m: svg(m.group(1)), h)
open(os.path.join(HERE, '..', 'index.html'), 'w').write(h)
og = re.sub(r'<!--LOGO:([\w-]*)-->', lambda m: svg(m.group(1)), open(os.path.join(HERE, 'og-src.html')).read())
open(os.path.join(HERE, 'og.html'), 'w').write(og)
print('index.html', len(h) // 1024, 'KB; logo paths', len(paths) // 1024, 'KB')
