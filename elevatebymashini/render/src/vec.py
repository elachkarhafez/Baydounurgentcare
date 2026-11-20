from PIL import Image
import numpy as np, subprocess, re, json
from scipy import ndimage
im=Image.open('site/Elevate_Dental_Logo_Transparent.webp').convert('RGBA'); a=np.array(im).astype(float)
A=a[...,3]; rgb=a[...,:3]/255; mx=rgb.max(-1); mn=rgb.min(-1); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
H,W=A.shape
def trace(mask,name):
    Image.fromarray(((~mask)*255).astype(np.uint8)).convert('1').save(f'vec/{name}.pbm')
    subprocess.run(['potrace',f'vec/{name}.pbm','-b','svg','-t','6','-a','1','-O','0.3','--flat','-o',f'vec/{name}.svg'],check=True)
    s=open(f'vec/{name}.svg').read()
    tr=re.search(r'<g transform="([^"]+)"',s).group(1); ds=re.findall(r' d="([^"]+)"',s)
    return {'t':tr,'d':' '.join(ds)}
out={}
on=A>110
band=lambda y0,y1: (np.arange(H)[:,None]>=y0)&(np.arange(H)[:,None]<y1)
mark=on&band(100,520)
g0=mark&(sat>=.22)
g0=ndimage.binary_closing(g0,iterations=5)&mark
g0=ndimage.binary_fill_holes(g0)&mark
sl=mark&~ndimage.binary_dilation(g0,iterations=2)
lab2,n2=ndimage.label(sl); sz=ndimage.sum(sl,lab2,range(1,n2+1)); keep=np.isin(lab2,[i+1 for i,v in enumerate(sz) if v>500])
sl=ndimage.binary_closing(keep,iterations=4)&mark
sl=ndimage.binary_opening(sl,iterations=2)
g0=mark&~sl
lab3,n3=ndimage.label(g0); sz3=ndimage.sum(g0,lab3,range(1,n3+1)); g0=np.isin(lab3,[i+1 for i,v in enumerate(sz3) if v>300])
out['gold']=trace(g0,'gold')
out['silver']=trace(sl,'silver')
# letters
el=on&band(530,665); lab,n=ndimage.label(el); objs=ndimage.find_objects(lab)
comps=sorted([(o[1].start,i+1) for i,o in enumerate(objs) if (lab[o]==i+1).sum()>80])
out['letters']=[trace(lab==k,f'L{j}') for j,(x,k) in enumerate(comps)]
out['dental']=trace(on&band(670,760),'dental')
out['tag']=trace(on&band(765,830),'tag')
# colour samples
print('gold rgb', np.median(a[mark&(sat>=.28)][:,:3],0), 'silver', np.median(a[mark&(sat<.28)][:,:3],0), 'letters', np.median(a[el][:,:3],0))
for nm in ['gold','silver']:
    m=g0 if nm=='gold' else sl; ys,xs=np.where(m); print(nm,xs.min(),xs.max(),ys.min(),ys.max())
print(len(out['letters']),'letters')
json.dump(out,open('vec/logo.json','w'))
