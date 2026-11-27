"""Write preview.html: the traced parts coloured separately, over the source avatar, for checking the trace."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'parts.json')))
mb = [P['m' + c]['box'] for c in 'MEDIA']
x0, y0 = min(b[0] for b in mb), min(b[1] for b in mb); x1, y1 = max(b[2] for b in mb), max(b[3] for b in mb)
word = ''.join(f'<path d="{P["m"+c]["d"]}" fill="{col}"/>' for c, col in zip('MEDIA', ['#000', '#333', '#000', '#333', '#000']))
html = f'''<body style="margin:0;background:#fff;display:flex;gap:20px;flex-wrap:wrap">
<div style="position:relative;width:600px;height:600px"><img src="src/oz-avatar-900.jpg" style="width:600px;opacity:.35;position:absolute">
<svg viewBox="0 0 1000 1000" width="600" height="600" style="position:absolute"><path d="{P['O']['d']}" fill="rgba(0,90,255,.55)"/><path d="{P['Z']['d']}" fill="rgba(255,0,0,.5)"/></svg></div>
<svg viewBox="0 0 1000 1000" width="600" height="600"><path d="{P['O']['d']}" fill="#091e32"/><path d="{P['Z']['d']}" fill="#091e32"/></svg>
<svg viewBox="{x0-2} {y0-2} {x1-x0+4} {y1-y0+4}" width="1200" style="background:#fff">{word}</svg>
</body>'''
open(os.path.join(HERE, 'preview.html'), 'w').write(html)
