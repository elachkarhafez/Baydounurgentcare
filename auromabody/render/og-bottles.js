var uid=0;
function shade(hex,k){var c=hex.replace('#','');var r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);var f=function(x){return Math.max(0,Math.min(255,Math.round(k>0?x+(255-x)*k:x*(1+k))));};return 'rgb('+f(r)+','+f(g)+','+f(b)+')';}
function lum(hex){var c=hex.replace('#','');return (.3*parseInt(c.slice(0,2),16)+.59*parseInt(c.slice(2,4),16)+.11*parseInt(c.slice(4,6),16))/255;}
function roll(p,cls){var i=++uid,c=p.c,clear=lum(c)>.85;var nm=p.n.toUpperCase();var ink=lum(c)>.55?'#2a2218':'#1a1410';
  return '<svg class="'+(cls||'bt')+'" viewBox="0 0 64 230" role="img" aria-label="'+p.n+' roll-on"><defs><linearGradient id="l'+i+'" x1="0" x2="1"><stop offset="0" stop-color="'+shade(c,-.25)+'"/><stop offset=".45" stop-color="'+shade(c,.12)+'"/><stop offset="1" stop-color="'+shade(c,-.3)+'"/></linearGradient></defs>'+
  '<rect x="9" y="58" width="46" height="168" rx="9" fill="'+(clear?'rgba(255,255,255,.55)':'rgba(255,255,255,.25)')+'" stroke="rgba(120,110,95,.35)"/>'+
  '<rect x="13" y="80" width="38" height="140" rx="6" fill="url(#l'+i+')" opacity="'+(clear?.55:.95)+'"/>'+
  '<rect x="9" y="58" width="46" height="168" rx="9" fill="url(#glassH)"/>'+
  '<rect x="14" y="2" width="36" height="62" rx="5" fill="url(#cap)"/><rect x="14" y="58" width="36" height="6" fill="#111"/><rect x="18" y="6" width="5" height="54" rx="2" fill="#fff" opacity=".13"/>'+
  '<text transform="translate(37 214) rotate(-90)" font-family="Righteous, sans-serif" font-size="11.5" letter-spacing="1.6" fill="'+ink+'">'+nm+'</text>'+
  (p.ins?'<text transform="translate(47 214) rotate(-90)" font-family="Hanken Grotesk, sans-serif" font-size="5.2" letter-spacing=".6" fill="'+ink+'" opacity=".75">ELEVATE YOUR AURA W/ AUROMA BODY</text>':'')+
  '</svg>';}
function square(p,cls,noCap){var i=++uid,c=p.c,clear=lum(c)>.85;var nm=p.n.toUpperCase();var ink=lum(c)>.6||clear?'#2a2218':'#141010';var fs=nm.length>11?11:nm.length>8?13:15;
  return '<svg class="'+(cls||'bt')+'" viewBox="0 0 170 236" role="img" aria-label="'+p.n+' bottle"><defs><linearGradient id="q'+i+'" x1="0" x2="1"><stop offset="0" stop-color="'+shade(c,-.28)+'"/><stop offset=".42" stop-color="'+shade(c,.1)+'"/><stop offset="1" stop-color="'+shade(c,-.32)+'"/></linearGradient><linearGradient id="qv'+i+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'+
  '<rect x="8" y="78" width="154" height="154" rx="16" fill="'+(clear?'rgba(255,255,255,.6)':'rgba(255,255,255,.3)')+'" stroke="rgba(120,110,95,.4)"/>'+
  '<rect x="16" y="92" width="138" height="128" rx="9" fill="url(#q'+i+')" opacity="'+(clear?.45:.95)+'"/>'+
  '<rect x="16" y="92" width="138" height="128" rx="9" fill="url(#qv'+i+')"/>'+
  '<rect x="8" y="214" width="154" height="18" rx="6" fill="'+(clear?'rgba(255,255,255,.7)':shade(c,.25))+'" opacity=".55"/>'+
  '<rect x="8" y="78" width="154" height="154" rx="16" fill="url(#glassH)"/>'+
  '<rect x="16" y="122" width="138" height="44" fill="#fff" opacity=".55"/>'+
  '<text x="85" y="144" text-anchor="middle" font-family="Righteous, sans-serif" font-size="'+fs+'" letter-spacing="2.2" fill="'+ink+'">'+nm+'</text>'+
  (p.ins&&p.ins!=='Our signature'?'<text x="85" y="154" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="6.2" letter-spacing="1" fill="'+ink+'" opacity=".8">'+p.ins.toUpperCase()+'</text>':'')+
  '<text x="85" y="162" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="4.6" letter-spacing=".7" fill="'+ink+'" opacity=".7">ELEVATE YOUR AURA W/ AUROMA BODY</text>'+
  '<rect x="64" y="66" width="42" height="16" fill="#d9dcdf"/>'+
  (noCap?'':'<rect x="56" y="4" width="58" height="66" rx="5" fill="url(#silver)"/><ellipse cx="85" cy="6" rx="29" ry="4" fill="#f4f5f6"/><rect x="62" y="10" width="6" height="56" rx="3" fill="#fff" opacity=".6"/>')+
  '</svg>';}

var P={pg:{n:'Pistachio Gelato',ins:'Yum',t:'roll',c:'#c8d75a'},pa:{n:'Paris',ins:'',t:'square',c:'#2f6fd6'},br:{n:'Baccarat Rouge',ins:'MFK 540 Elixir',t:'square',c:'#d41f1f'},au:{n:'Aura',ins:'Our signature',t:'square',c:'#a9c94a'},pc:{n:'Peach Ciroc',ins:'',t:'roll',c:'#f46a2a'}};
document.body.insertAdjacentHTML('afterbegin','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>\n<linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3b0"/><stop offset=".4" stop-color="#c9a45c"/><stop offset=".6" stop-color="#f3dc9f"/><stop offset="1" stop-color="#a8843f"/></linearGradient>\n<linearGradient id="silver" x1="0" x2="1"><stop offset="0" stop-color="#8b8f94"/><stop offset=".18" stop-color="#e9ecef"/><stop offset=".35" stop-color="#b3b8bd"/><stop offset=".55" stop-color="#f7f8f9"/><stop offset=".8" stop-color="#9aa0a6"/><stop offset="1" stop-color="#d5d8db"/></linearGradient>\n<linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".3" stop-color="#2a2a2a"/><stop offset=".45" stop-color="#0d0d0d"/><stop offset="1" stop-color="#000"/></linearGradient>\n<linearGradient id="glassH" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".12" stop-color="#fff" stop-opacity=".55"/><stop offset=".22" stop-color="#fff" stop-opacity=".05"/><stop offset=".85" stop-color="#fff" stop-opacity=".0"/><stop offset=".93" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>\n</defs></svg>');
var st=document.getElementById('st');
st.innerHTML=[['pg',270],['pa',215],['br',240],['au',215]].map(function(x){var p=P[x[0]];var h=x[1];return '<div style="height:'+h+'px">'+(p.t==='roll'?roll(p,'x'):square(p,'x')).replace('<svg ','<svg style="height:100%;width:auto" ')+'</div>';}).join('');
