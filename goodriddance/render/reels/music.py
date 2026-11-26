"""Original action beat for the Good Riddance reels (made here from scratch, free to use). 140 BPM, E minor.
0-1.0 s riser + snare roll, 1.0 s impact drop, then 808 + kick + claps + hats + saw stabs."""
import numpy as np, sys
from scipy.io import wavfile
SR=44100; BPM=140; B=60/BPM; DUR=13.0; N=int(SR*DUR)
L=np.zeros(N); Rr=np.zeros(N)
rng=np.random.default_rng(7)
t_=lambda d:np.arange(int(SR*d))/SR
def add(sig,at,pan=0.0,g=1.0):
    i=int(at*SR)
    if i>=N: return
    j=min(N,i+len(sig)); s=sig[:j-i]*g
    L[i:j]+=s*(1-max(0,pan)); Rr[i:j]+=s*(1+min(0,pan))
def env(d,a=.002,r=None):
    t=t_(d); e=np.minimum(1,t/a); return e*np.exp(-t/(r or d/4))
def kick():
    t=t_(.42); f=48+130*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.tanh(2.2*np.sin(ph)*np.exp(-t*7))*1.0+0.25*rng.standard_normal(len(t))*np.exp(-t*300)
def clap():
    t=t_(.25); n=rng.standard_normal(len(t)); e=np.zeros(len(t))
    for o in (0,.009,.018): e+=np.exp(-np.clip(t-o,0,None)*60)*(t>=o)
    from scipy.signal import butter,lfilter
    b,a=butter(2,[900/(SR/2),6000/(SR/2)],'band'); return lfilter(b,a,n)*e*1.4
def hat(open_=False):
    d=.22 if open_ else .05; t=t_(d); n=rng.standard_normal(len(t))
    from scipy.signal import butter,lfilter
    b,a=butter(2,7000/(SR/2),'high'); return lfilter(b,a,n)*np.exp(-t*(14 if open_ else 90))*.5
def b808(freq,d):
    t=t_(d); f=freq*(1+.9*np.exp(-t*40)); ph=2*np.pi*np.cumsum(f)/SR
    return np.tanh(2.5*np.sin(ph))*np.minimum(1,t/.004)*np.exp(-t*1.1)*.8
def saw(freq,d,det=.006):
    t=t_(d); s=0
    for k in (-det,0,det): s=s+2*((t*freq*(1+k))%1)-1
    from scipy.signal import butter,lfilter
    b,a=butter(2,2600/(SR/2)); return lfilter(b,a,s/3)*np.minimum(1,t/.004)*np.exp(-t*6)
def boom():
    t=t_(1.6); f=35+90*np.exp(-t*6); ph=2*np.pi*np.cumsum(f)/SR
    return np.tanh(2*np.sin(ph))*np.exp(-t*2.2)+.6*rng.standard_normal(len(t))*np.exp(-t*5)
# intro: riser + snare roll into the drop at 1.0 s
DROP=1.0
t=t_(DROP); f=200+1800*(t/DROP)**2; ph=2*np.pi*np.cumsum(f)/SR
riser=(2*((ph/(2*np.pi))%1)-1)*.18*(t/DROP)**1.5+rng.standard_normal(len(t))*.12*(t/DROP)**2
add(riser,0)
k=0.0
while k<DROP-.02:
    add(clap()*.5,k,g=.35+.6*k/DROP); k+=max(.03,.16*(1-k/DROP))
add(boom(),DROP,g=1.0)
# the drop
E,G,A,B_,D=41.2,49.0,55.0,61.7,36.7
bass=[(0,E,1.5),(1.5,E,.5),(2,G,1),(3,D,.75),(3.75,E,.25)]
stab=[(0,[164.8,196,246.9]),(1.5,[164.8,196,246.9]),(2.5,[146.8,174.6,220]),(3.25,[196,246.9,293.7])]
bar=4*B; nb=int((DUR-DROP)/bar)+1
for b in range(nb):
    s=DROP+b*bar
    for beat in range(4):
        add(kick(),s+beat*B,g=.95)
        if beat in (1,3): add(clap(),s+beat*B,g=.8)
        for h in range(4): add(hat(),s+beat*B+h*B/4,pan=.3 if h%2 else -.3,g=.55 if h%2 else .35)
        add(hat(True),s+beat*B+B/2,g=.35)
    for at,fr,d in bass: add(b808(fr,d*B),s+at*B,g=.9)
    for at,ch in stab:
        for i,fr in enumerate(ch): add(saw(fr,.35),s+at*B,pan=(i-1)*.5,g=.22)
    if b%2==1: add(np.concatenate([clap()[:int(SR*.06)]]*1),s+3.5*B,g=.4)
# sidechain-ish pump on the musical parts is implicit; master: glue, soft clip, normalise
mix=np.stack([L,Rr],1)
mix=np.tanh(mix*1.6)/np.tanh(1.6)
mix/=np.max(np.abs(mix))*1.05
wavfile.write(sys.argv[1],SR,(mix*32767).astype(np.int16))
