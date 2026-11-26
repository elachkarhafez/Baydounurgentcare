"""Build ../index.html from page.html: injects the traced logo (parts.json) with integer coordinates."""
import json, re
P=json.load(open('parts.json'))
def rnd(d): return re.sub(r'-?\d+\.\d+', lambda m: str(round(float(m.group()))), d)
out={k:[dict(p, d=rnd(p['d'])) for p in v] for k,v in P.items()}
js=json.dumps(out,separators=(',',':'))
h=open('page.html').read().replace('/*LOGO*/{}',js)
open('../index.html','w').write(h)
print('index.html', len(h)//1024,'KB, logo',len(js)//1024,'KB')
