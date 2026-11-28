<script>
const LOGO=/*LOGO*/{};
/*DRAW*/
const TL={},CUES={};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const q=(p,a)=>$(`[data-a="${a}"]`,p);
function words(el){if(el.dataset.split)return $$('.w>span',el);el.dataset.split=1;el.innerHTML=el.innerHTML.split(/(\s+|<[^>]+>)/).map(t=>/^\s+$|^<|^$/.test(t)?t:`<span class="w"><span>${t}</span></span>`).join('');return $$('.w>span',el)}
const A={
  words:(tl,el,at=0,o={})=>tl.from(words(el),{yPercent:110,duration:.6,ease:'power4.out',stagger:.05,...o},at),
  rise:(tl,t,at=0,o={})=>tl.from(t,{y:50,opacity:0,duration:.6,ease:'power3.out',stagger:.08,...o},at),
  pop:(tl,t,at=0,o={})=>tl.from(t,{scale:.3,opacity:0,rotation:-8,duration:.55,ease:'back.out(2.2)',stagger:.07,...o},at),
  hold:(tl,total)=>tl.to({},{duration:Math.max(0,total-tl.duration())}),
};
// the traced badge, parts addressable for animation
const ORDER=['ring','arc','bed','stripe','truck','wheelR','wheelF','couch','item','dresser','good','riddance','rules','jrl','can'];
function badge(glow=true){let h=`<svg class="badge" viewBox="0 0 1254 1254"><circle cx="618.5" cy="624.5" r="616" fill="#050505"/>`;
  for(const g of ORDER)h+=`<g class="pt-${g}">`+LOGO[g].map((p,i)=>`<path class="lp ${g}-${i}" fill="${p.fill}" fill-rule="evenodd" d="${p.d}"/>`).join('')+'</g>';return h+'</svg>'}
function endCard(p,cta='Send us a photo for a <em>quote</em>'){const e=q(p,'end');e.innerHTML=badge()+`<div class="cta">${cta}</div><div class="hd">@goodriddancejunkremoval_</div><div class="em">goodriddancesupport@gmail.com</div>`;return e}
function endTL(tl,p,at){const e=q(p,'end');tl.fromTo(e,{clipPath:'circle(0% at 50% 50%)'},{clipPath:'circle(75% at 50% 50%)',duration:.6,ease:'power3.inOut'},at);
  tl.from($('.badge',e),{scale:.5,rotation:-20,duration:.7,ease:'back.out(1.8)'},at+.25);tl.from($$('.cta,.hd,.em',e),{y:40,opacity:0,duration:.5,stagger:.1,ease:'power3.out'},at+.5);
  return [[at,'whoosh',.5],[at+.35,'stamp',.45],[at+.9,'chime',.4]]}
// side-view dump truck, same style as the site
const BED={x:84,w:416,floor:318,top:158};BED.h=BED.floor-BED.top;
function truck(){return `<svg viewBox="0 60 760 370" style="width:100%;height:100%;overflow:visible">
 <ellipse cx="380" cy="408" rx="360" ry="14" fill="#000" opacity=".8"/>
 <g class="cab">${R(500,300,236,46,C.m,6)}<path d="M528 300V196C528 184 536 178 548 178H612C626 178 634 184 644 196L684 246H716C730 246 738 256 738 270V300Z" fill="${C.w}" stroke="${K}" stroke-width="4"/><path d="M548 194H610C618 194 622 196 628 204L660 246H548Z" fill="${C.d}" stroke="${K}" stroke-width="3"/>${R(552,262,20,7,C.s,2,2)}${R(704,258,34,20,C.o,4,3)}${R(732,300,10,46,C.d,3,3)}</g>
 <g class="bedG"><rect x="${BED.x}" y="${BED.top}" width="${BED.w}" height="${BED.h}" fill="#151515"/>${[0,1,2,3].map(i=>R(BED.x+10+i*(BED.w-20)/4,BED.top+16,(BED.w-20)/4-10,BED.h-30,'#1e1e1e',3,2)).join('')}
  <g class="load"></g>
  ${R(BED.x-12,BED.top-12,BED.w+24,16,C.m,3)}${[0,1,2,3,4].map(i=>R(BED.x-10+i*(BED.w+4)/4,BED.top,12,BED.h,C.m,2,2.5)).join('')}${R(BED.x-14,BED.floor,BED.w+30,28,'#0f0f0f',3)}
  <path d="M${BED.x-8} ${BED.floor+8}H${BED.x+BED.w+10}L${BED.x+BED.w+2} ${BED.floor+22}H${BED.x+60}Z" fill="${C.o}"/>
  <g class="fill" opacity="0"><line x1="${BED.x}" x2="${BED.x+BED.w}" y1="0" y2="0" stroke="${C.o}" stroke-width="4" stroke-dasharray="12 8"/></g></g>
 ${R(70,346,666,14,C.d,3)}${[150,420,640].map(x=>`<g class="wh"><circle cx="${x}" cy="370" r="36" fill="#141414" stroke="${K}" stroke-width="4"/><circle cx="${x}" cy="370" r="19" fill="${C.s}" stroke="${K}" stroke-width="3"/><g transform="translate(${x} 370)"><g class="hub">${[0,1,2,3,4].map(i=>`<circle cx="${Math.cos(i*1.2566)*10}" cy="${Math.sin(i*1.2566)*10}" r="2.6" fill="${C.d}"/>`).join('')}</g></g></g>`).join('')}
 ${[150,420].map(x=>`<path d="M${x-52} 346C${x-46} 318 ${x+46} 318 ${x+52} 346" fill="none" stroke="${C.m}" stroke-width="6"/>`).join('')}</svg>`}
const VOL={couch:.15,loveseat:.1,recliner:.07,mattress:.08,boxspring:.06,dresser:.07,table:.06,chairs:.04,desk:.07,fridge:.09,washer:.06,tv:.03,boxes:.06,bags:.05,yard:.12,tires:.05,grill:.04,carpet:.07,bike:.03,hottub:.5};
const AR={couch:2.2,loveseat:1.7,recliner:1.15,mattress:4.2,boxspring:4.4,dresser:1.15,table:1.9,chairs:1.2,desk:1.7,fridge:.55,washer:.92,tv:1.5,boxes:1.35,bags:1.6,yard:2.3,tires:1.3,grill:1.05,carpet:3.4,bike:1.6,hottub:2.3};
function packInto(svg,ids){const NS='http://www.w3.org/2000/svg',g=$('.load',svg),step=4,N=Math.ceil(BED.w/step),sky=new Array(N).fill(BED.floor),out=[];
  for(const id of ids){const A_=VOL[id]*BED.w*BED.h*.92;let w=Math.sqrt(A_*AR[id]),h=Math.sqrt(A_/AR[id]);if(w>BED.w){w=BED.w;h=A_/w}
    const n=Math.min(N,Math.ceil(w/step));let best=0,bt=-1e9;for(let s=0;s<=N-n;s++){let t=1e9;for(let k=s;k<s+n;k++)t=Math.min(t,sky[k]);if(t>bt+.5){bt=t;best=s}}
    const y=bt-h;for(let k=best;k<best+n;k++)sky[k]=y;const x=BED.x+best*step;
    const e=document.createElementNS(NS,'g');e.innerHTML=DRAW[id](w,h);e.setAttribute('transform',`translate(${x} ${y})`);g.appendChild(e);out.push({e,x,y,w,h,id})}
  return out}
const art=(id,w,h)=>`<svg viewBox="-6 -6 ${w+12} ${h+12}" style="width:100%;height:100%;overflow:visible">${DRAW[id](w,h)}</svg>`;
const SUM=ids=>ids.reduce((a,i)=>a+VOL[i],0);
const LV=f=>f<=.075?'Single item':f<=.13?'1/8 load':f<=.26?'1/4 load':f<=.51?'1/2 load':f<=.76?'3/4 load':'Full load';

