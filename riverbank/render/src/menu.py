import json
import os
D = os.path.dirname(os.path.abspath(__file__)) + '/'
MENU = [
 ('Starters', [('Boardwalk Wings', '15', 'Eight wings, buffalo or garlic parm, ranch on the side.', 'wings2'),
               ('Mozzarella Sticks', '11', 'Hand-breaded, with marinara.', 'moz2')]),
 ('Pizza', [('Pepperoni', '17', 'Cup-and-char pepperoni, mozzarella, red sauce.', 'pepperoni'),
            ('Margherita', '16', 'Fresh mozzarella, basil, olive oil.', 'marg')]),
 ('Burgers', [('The River Bank Burger', '16', 'Half-pound patty, cheddar, bacon, house sauce, fries.', 'burger2'),
              ('Classic Cheeseburger', '14', 'American cheese, lettuce, tomato, pickles, fries.', 'burger3')]),
 ('Mains', [('Filet & Asparagus', '36', '8 oz filet, pan sauce, grilled asparagus.', 'steak2'),
            ('Sliced Strip Steak', '32', '12 oz strip, chimichurri, choice of side.', 'steak3'),
            ('Fish & Chips', '19', 'Beer-battered cod, fries, tartar, lemon.', 'fish')]),
 ('Salads', [('Caesar', '12', 'Romaine, parmesan, croutons. Add chicken $6.', 'caesar'),
             ('Chicken Caesar Bowl', '17', 'Grilled chicken, soft egg, croutons, parmesan.', 'caesar2')]),
 ('Drinks', [('Michigan Draft', '7', 'Rotating local taps.', 'beer'),
             ('River Bank Spritz', '12', 'House cocktail, ask what is pouring.', 'cocktail')]),
]
json.dump([{'c': c, 'items': [{'n': n, 'p': p, 'd': d, 'i': i} for n, p, d, i in it]} for c, it in MENU], open(D + 'menu.json', 'w'))

CSS = """
/* sample menu */
.menu{background:var(--paper)}
.menu .sh .cap{color:var(--goldD)}
.sample{display:inline-flex;align-items:center;gap:7px;margin-top:10px;font-size:.6875rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);background:#fff;border:2px dashed rgba(13,27,46,.35);border-radius:999px;padding:5px 11px}
.sample i{width:7px;height:7px;border-radius:50%;background:var(--red)}
.mtabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1*var(--pad)) 16px;padding:2px var(--pad) 6px}
.mtabs::-webkit-scrollbar{display:none}
.mtabs button{flex:none;height:38px;padding:0 15px;border-radius:999px;border:2.5px solid var(--navy);background:#fff;font-weight:700;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 3px 0 var(--navy);transition:background-color .2s,color .2s}
.mtabs button[aria-pressed=true]{background:var(--navy);color:var(--cream)}
.mlist{display:grid;gap:10px}
.mi{display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:center;background:#fff;border:2.5px solid var(--navy);border-radius:14px;padding:8px;box-shadow:0 4px 0 var(--navy)}
.mi img{width:84px;height:84px;border-radius:9px;object-fit:cover;background:var(--cream)}
.mi .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.mi h3{font-size:1rem;line-height:1.2}
.mi .pr{font-weight:800;font-size:.9375rem;white-space:nowrap}
.mi .pr::before{content:"$";font-size:.75em;vertical-align:.15em;margin-right:1px}
.mi p{font-size:.8125rem;color:var(--mute);margin-top:3px;line-height:1.4}
.mi .ct{display:block;font-size:.625rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);margin-bottom:2px}
.mnote{font-size:.75rem;color:var(--mute);margin-top:16px}
@media (min-width:700px){
  .mlist{grid-template-columns:repeat(2,1fr);gap:14px}
}
@media (min-width:1000px){
  .mlist{grid-template-columns:repeat(3,1fr);gap:18px}
  .mi{display:block;padding:0;overflow:hidden}
  .mi img{width:100%;height:auto;aspect-ratio:4/3;border-radius:0;border-bottom:2.5px solid var(--navy)}
  .mi .tx{padding:14px 16px 16px}
  .mi h3{font-size:1.125rem}
  .mi p{font-size:.875rem}
}
"""
SECTION = """
<section class="menu" id="menu">
  <div class="wrap">
    <div class="sh"><div><div class="cap">Sample menu</div><h2>A taste of what's coming</h2><span class="sample"><i></i>Preview only · real menu at opening</span></div><p>Pizza, burgers, steaks, salads and drinks on the river. Here's how the menu could look.</p></div>
    <div class="mtabs" id="mtabs" role="group" aria-label="Menu categories"></div>
    <div class="mlist" id="mlist" aria-live="polite"></div>
    <p class="mnote">Sample dishes, photos and prices for preview. The River Bank's real menu and prices will be posted before opening day.</p>
  </div>
</section>
"""
JS = """
/* ---------------- sample menu */
var MENU=%s,mt=$('#mtabs'),ml=$('#mlist'),cat=-1;
mt.innerHTML='<button type="button" aria-pressed="true" data-c="-1">All</button>'+MENU.map(function(c,i){return '<button type="button" aria-pressed="false" data-c="'+i+'">'+c.c+'</button>';}).join('');
function drawMenu(){var out='';MENU.forEach(function(c,ci){if(cat>=0&&ci!==cat)return;c.items.forEach(function(x){out+='<article class="mi"><img src="media/menu/'+x.i+'.webp" width="560" height="560" loading="lazy" alt="'+x.n+' (sample photo)"><div class="tx"><span class="ct">'+c.c+'</span><div class="top"><h3>'+x.n+'</h3><span class="pr">'+x.p+'</span></div><p>'+x.d+'</p></div></article>';});});
  ml.innerHTML=out;if(G&&!RM)G.from('#mlist .mi',{y:18,opacity:0,stagger:.05,duration:.45,ease:'power3.out'});}
$$('button',mt).forEach(function(b){b.addEventListener('click',function(){cat=+b.dataset.c;$$('button',mt).forEach(function(x){x.setAttribute('aria-pressed',x===b)});drawMenu();});});
drawMenu();
""" % json.dumps([{'c': c, 'items': [{'n': n, 'p': p, 'd': d, 'i': i} for n, p, d, i in it]} for c, it in MENU])

s = open(D + 'tpl3.html').read()
s = s.replace("/* intro: coin drop", CSS + "\n/* intro: coin drop", 1)
a = '<section class="visit" id="visit">'
assert a in s
s = s.replace(a, SECTION + a, 1)
a = "var digs=$$('.combo span');"
assert a in s
s = s.replace(a, a + JS, 1)
# nav + vault link to the menu
s = s.replace('<nav aria-label="Main"><a href="#vault">Menu</a>', '<nav aria-label="Main"><a href="#menu">Menu</a>', 1)
s = s.replace('<div class="links"><a href="#vault">Menu</a>', '<div class="links"><a href="#menu">Menu</a>', 1)
a = '<div class="it lock">Full menu<br>at opening</div>'
assert a in s
s = s.replace(a, '<a class="it lock" href="#menu">See the<br>sample menu</a>', 1)
s = s.replace('<p>Keep scrolling. Full menu and prices at opening.</p>', '<p>Keep scrolling to open it.</p>', 1)
open(D + 'tpl3.html', 'w').write(s)
print('ok')
