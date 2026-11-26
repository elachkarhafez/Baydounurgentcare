"""Trace the official logo (srcimg/logo.webp) into per-part, per-colour SVG paths -> parts.json"""
from PIL import Image
import numpy as np, json, time, potrace
from scipy import ndimage as nd
im=Image.open('srcimg/logo.webp').convert('RGB')
a=np.array(im).astype(float)
PAL={'k':(5,5,5),'w':(246,246,245),'lg':(196,196,196),'mg':(90,89,89),'dg':(50,49,49),
     'o':(251,99,8),'bg':(216,187,148),'bs':(170,140,110),'br':(150,94,60),'bd':(90,42,16)}
keys=list(PAL); P=np.array([PAL[k] for k in keys])
d=((a[:,:,None,:]-P[None,None])**2).sum(-1); q=d.argmin(-1)
q=nd.median_filter(q,size=3)
H,W=q.shape; yy,xx=np.mgrid[0:H,0:W]; cx,cy=618.5,624.5
r=np.hypot(xx-cx,yy-cy)
def cls(k): return q==keys.index(k)
Lb=nd.gaussian_filter(a.mean(-1),1.0)
chrom=cls('o')|cls('bg')|cls('bs')|cls('br')|cls('bd')
def lum(t): return (Lb>=t)&~chrom
O=cls('o'); Wt=cls('w')|(cls('lg')&False)
grey=cls('lg')|cls('mg')|cls('dg')
beige=cls('bg')|cls('bs'); brown=cls('br')|cls('bd')
parts={}
def put(name,col,m):
    parts.setdefault(name,[]).append((col,m))
ring=O&(r>=582)
put('ring','o',ring)
O2=O&~ring
rid=O2&(yy>=695)&(yy<=885)
rules=O2&(((yy>=632)&(yy<=664))|((yy>=1000)&(yy<=1040)))
head=O2&(xx>840)&(xx<895)&(yy>380)&(yy<425)
stripe=O2&(xx>230)&(xx<540)&(yy>380)&(yy<450)
knob=O2&(yy<200)&(xx>500)&(xx<545)
arc=O2&~rid&~rules&~head&~stripe&~knob
put('riddance','o',rid); put('rules','o',rules); put('arc','o',arc)
# letters
put('good','w',Wt&(yy>=548)&(yy<=708))
put('jrl','w',Wt&(yy>=900)&(yy<=958))
put('can','w',Wt&(yy>=965))
# junk
jz=(yy<265)&(xx<720)
dres=(brown|(beige&(xx>520))|knob)&(yy<225)&(xx>530)
put('dresser','br',dres&(brown|beige|knob)); put('dresser','bg',beige&dres&~brown); put('dresser','o',knob)
couch=nd.binary_opening(beige&~dres&(yy<320)&(xx<500),iterations=2)
put('couch','bg',couch); put('couch','bs',cls('bs')&couch)
item=(Wt|cls('lg'))&(xx>455)&(xx<600)&(yy>165)&(yy<262)
item=(Lb>=120)&~chrom&(xx>455)&(xx<600)&(yy>165)&(yy<262)
put('item','lg',lum(120)&item); put('item','w',lum(215)&item)
# wheels
wr=(np.hypot(xx-338,yy-528)<56)&(yy>470)
wf=(np.hypot(xx-772,yy-516)<58)&(yy>462)
for nm,z in (('wheelR',wr),('wheelF',wf)):
    for c,t in (('dg',38),('mg',75),('lg',150),('w',215)): put(nm,c,lum(t)&z)
used=wr|wf|item
truckzone=(yy>=200)&(yy<=600)&(xx>200)&(xx<1110)&~used&~jz
bed=truckzone&((xx<588)&(yy<470)|((yy<268)&(xx<800)))
for c,t in (('dg',38),('mg',75),('lg',150),('w',215)): put('bed',c,lum(t)&bed)
put('stripe','o',stripe)
tr=truckzone&~bed
for c,t in (('dg',38),('mg',75),('lg',150),('w',205)): put('truck',c,lum(t)&tr)
put('truck','o',head)
FILL={'o':'#fb6308','w':'#f6f6f5','lg':'#c4c4c4','mg':'#5a5959','dg':'#323131','bg':'#d8bb94','bs':'#aa8c6e','br':'#965e3c','bd':'#5a2a10'}
def trace(m):
    m=nd.binary_opening(m,iterations=1)
    lab,n=nd.label(m); s=nd.sum(m,lab,range(1,n+1))
    keep=np.isin(lab,1+np.where(s>=60)[0])
    if keep.sum()==0: return ''
    bm=potrace.Bitmap(~keep)
    pl=bm.trace(turdsize=40,turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,alphamax=1.0,opticurve=True,opttolerance=0.3)
    f=lambda p:'%.1f %.1f'%(p.x,p.y)
    out=[]
    for c in pl:
        s='M'+f(c.start_point)
        for seg in c:
            if seg.is_corner: s+='L'+f(seg.c)+'L'+f(seg.end_point)
            else: s+='C'+f(seg.c1)+' '+f(seg.c2)+' '+f(seg.end_point)
        out.append(s+'Z')
    return ''.join(out).replace('.0 ',' ').replace('.0L','L').replace('.0C','C').replace('.0Z','Z')
res={}
order=['ring','arc','bed','stripe','truck','wheelR','wheelF','couch','item','dresser','good','riddance','rules','jrl','can']
for nm in order:
    res[nm]=[]
    for col,m in parts[nm]:
        t=time.time(); dd=trace(m)
        if dd: res[nm].append({'fill':FILL[col],'d':dd})
        print(nm,col,int(m.sum()),len(dd),'%.1fs'%(time.time()-t),flush=True)
def split(name,col,m,minpx=150,merge=0):
    m=nd.binary_opening(m,iterations=1); lab,n=nd.label(m)
    comps=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        if (lab[sl]==i+1).sum()<minpx: continue
        comps.append(((sl[1].start+sl[1].stop)/2,lab==i+1))
    comps.sort(key=lambda t:t[0])
    # merge comps whose x-centres are within `merge` px (letters with detached bits)
    out=[]
    for x,mm in comps:
        if out and abs(out[-1][0]-x)<merge: out[-1]=(out[-1][0],out[-1][1]|mm)
        else: out.append((x,mm))
    res[name]=[{'fill':FILL[col],'d':trace(mm)} for x,mm in out]
    print(name,len(out))
split('good','w',parts['good'][0][1])
split('riddance','o',parts['riddance'][0][1])
split('jrl','w',parts['jrl'][0][1],minpx=60,merge=12)
split('rules','o',parts['rules'][0][1])
cm=parts['can'][0][1]
res['can']=[{'fill':FILL['w'],'d':trace(cm&(yy<1030)),'id':'lid'},{'fill':FILL['w'],'d':trace(cm&(yy>=1030)),'id':'bin'}]
json.dump(res,open('parts.json','w'))
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254"><circle cx="627" cy="627" r="625" fill="#050505"/>']
for nm in order:
    for p in res[nm]: svg.append('<path fill="%s" fill-rule="evenodd" d="%s"/>'%(p['fill'],p['d']))
svg.append('</svg>'); open('logo-traced.svg','w').write(''.join(svg))
