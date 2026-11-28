"""Assemble batchN.html from the shared head/helpers and batchN.body.html (posts markup, <!--JS-->, timelines)."""
import json,re,sys
n=sys.argv[1] if len(sys.argv)>1 else '2'
body=open(f'batch{n}.body.html').read(); html,js=body.split('<!--JS-->')
P=json.load(open('../parts.json'))
rnd=lambda d:re.sub(r'-?\d+\.\d+',lambda m:str(round(float(m.group()))),d)
logo=json.dumps({k:[dict(p,d=rnd(p['d'])) for p in v] for k,v in P.items()},separators=(',',':'))
helpers=open('_helpers.js').read().replace('/*LOGO*/{}',logo).replace('/*DRAW*/',open('draw.js').read())
open(f'batch{n}.html','w').write(open('_head.html').read()+html+helpers+js+'\n</script>\n</body></html>')
print('ok')
