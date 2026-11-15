import { json, env, sign, verify, safeEq, letterLink, siteUrl, fmtSlot } from './_lib.js';
import { listRequests, readRequest, saveRequest, del } from './_store.js';
// Mike's private dashboard. Served only at /<DASHBOARD_SLUG> (set in env, not in the repo)
// and only after the password in DASHBOARD_PASSWORD.
const COOKIE = 'mh_desk';
const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
const slugOk = s => env('DASHBOARD_SLUG') && safeEq(s || '', env('DASHBOARD_SLUG'));
const authed = req => { const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mh_desk=([^;]+)/); return !!(m && verify(decodeURIComponent(m[1]))?.desk); };

export async function GET(req) {
  const u = new URL(req.url);
  if (!slugOk(u.searchParams.get('slug'))) return notFound();
  return new Response(PAGE.replace('__SLUG__', env('DASHBOARD_SLUG')), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY' } });
}

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (!slugOk(b.slug)) return notFound();
  if (b.action === 'login') {
    const pw = env('DASHBOARD_PASSWORD');
    await new Promise(r => setTimeout(r, 400));
    if (!pw || !safeEq(String(b.password || ''), pw)) return json({ error: 'Wrong password.' }, 401);
    const tok = sign({ desk: 1, exp: Date.now() + 12 * 36e5 });
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=${encodeURIComponent(tok)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` });
  }
  if (b.action === 'logout') return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  if (!authed(req)) return json({ error: 'login' }, 401);
  const origin = siteUrl(req);
  const view = r => ({
    id: r.id, createdAt: r.createdAt, status: r.status, statusNote: r.statusNote || '', name: r.name, phone: r.phone, email: r.email, message: r.message,
    property: r.property, slots: r.slots.map(s => ({ ...s, label: fmtSlot(s) })),
    letter: r.letter ? { name: r.letter.name, size: r.letter.size, deleted: !!r.letter.deleted, deleteAfter: r.letter.deleteAfter, link: r.letter.deleted ? null : letterLink(origin, r.letter.pathname, 1 / 24) } : null,
    notify: r.notify
  });
  if (b.action === 'list') return json({ requests: (await listRequests()).map(view) });
  if (b.action === 'status') {
    const r = await readRequest(String(b.id || ''));
    if (!r) return json({ error: 'not found' }, 404);
    if (!['new', 'confirmed', 'rescheduled', 'closed'].includes(b.status)) return json({ error: 'bad status' }, 400);
    r.status = b.status; r.statusNote = String(b.note || '').slice(0, 300); r.updatedAt = new Date().toISOString();
    await saveRequest(r);
    return json({ request: view(r) });
  }
  if (b.action === 'delete') {
    const r = await readRequest(String(b.id || ''));
    if (!r) return json({ error: 'not found' }, 404);
    await del([`requests/${r.id}.json`, ...(r.letter && !r.letter.deleted ? [r.letter.pathname] : [])]);
    return json({ ok: true });
  }
  return json({ error: 'unknown action' }, 400);
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Showing requests</title>
<style>
:root{--ink:#0c1522;--navy:#13253d;--paper:#f6f3ec;--paper2:#ece6d9;--white:#fffdf9;--gold:#c49a45;--muted:#687080;--line:rgba(12,21,34,.12);--brick:#a5452f;--lawn:#4f8c3c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:500 15px/1.5 Manrope,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--navy);color:var(--white);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
header b{font:600 18px Georgia,serif}header small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e6c47c}
.wrap{max-width:900px;margin:0 auto;padding:16px}
.btn{height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--navy);background:none;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}
.btn.solid{background:var(--navy);color:var(--white)}.btn.l{border-color:rgba(255,253,249,.4);color:var(--white)}
.login{max-width:360px;margin:12vh auto 0;background:var(--white);border-radius:20px;padding:24px;box-shadow:0 0 0 1px var(--line)}
.login h1{margin:0 0 6px;font:600 24px Georgia,serif}.login p{margin:0 0 16px;color:var(--muted);font-size:14px}
input,textarea,select{width:100%;height:46px;border-radius:12px;border:0;box-shadow:inset 0 0 0 1.5px var(--line);background:var(--paper);padding:0 14px;font-size:16px}
textarea{height:64px;padding:10px 14px;resize:vertical}
.err{color:var(--brick);font-size:14px;min-height:1.4em;margin:8px 0 0}
.tabs{display:flex;gap:6px;overflow-x:auto;margin:0 0 14px;scrollbar-width:none}
.tabs button{flex:none;height:34px;padding:0 13px;border-radius:999px;border:0;box-shadow:inset 0 0 0 1.5px var(--line);background:none;font-weight:700;font-size:13px;cursor:pointer}
.tabs button[aria-pressed=true]{background:var(--navy);color:var(--white);box-shadow:none}
.req{background:var(--white);border-radius:18px;padding:16px;margin:0 0 12px;box-shadow:0 0 0 1px var(--line)}
.top{display:flex;justify-content:space-between;gap:10px;align-items:start}
.req h2{margin:0;font:600 17px/1.25 Georgia,serif}.req .who{margin:4px 0 0;font-size:14px;color:var(--muted)}
.pill{flex:none;padding:5px 10px;border-radius:999px;font:800 11px/1 Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;background:var(--paper2)}
.pill.new{background:var(--gold);color:var(--ink)}.pill.confirmed{background:var(--lawn);color:#fff}.pill.rescheduled{background:var(--navy);color:#fff}
.slots{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 0}.slots div{background:var(--paper);border-radius:12px;padding:9px 11px;font-size:14px}.slots small{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-weight:700}
.links{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}.links a{display:inline-flex;align-items:center;height:36px;padding:0 13px;border-radius:999px;background:var(--paper);font-weight:700;font-size:13.5px;color:var(--navy);text-decoration:none}
.links a.letter{background:var(--navy);color:var(--white)}
.msg{margin:10px 0 0;font-size:14px;white-space:pre-wrap}
.acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 0}
.acts .note{grid-column:1/-1}
.meta{margin:10px 0 0;font-size:12px;color:var(--muted)}
.empty{text-align:center;color:var(--muted);padding:40px 0}
@media(min-width:720px){.wrap{padding:24px}.acts{grid-template-columns:1fr 1fr 1fr}.acts .note{grid-column:auto}}
</style></head><body>
<div id="app"></div>
<script>
const SLUG='__SLUG__';const app=document.getElementById('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=a=>fetch('/api/desk',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:SLUG,...a})}).then(async r=>({s:r.status,j:await r.json().catch(()=>({}))}));
let all=[],filter='new';
function login(msg){app.innerHTML='<form class="login"><h1>Showing requests</h1><p>Mike Hakim · private dashboard</p><input type="password" name="pw" autocomplete="current-password" placeholder="Password" required aria-label="Password"><p class="err">'+esc(msg||'')+'</p><button class="btn solid" style="width:100%;height:48px">Sign in</button></form>';
app.querySelector('form').onsubmit=async e=>{e.preventDefault();const r=await api({action:'login',password:e.target.pw.value});r.s===200?load():login(r.j.error||'Try again.')};}
async function load(){const r=await api({action:'list'});if(r.s===401)return login();all=r.j.requests||[];render();}
function card(q){const p=q.property,l=q.letter;const tel=q.phone.replace(/[^\\d+]/g,'');
return '<article class="req" data-id="'+q.id+'"><div class="top"><div><h2>'+esc(p.address)+'</h2><p class="who">'+esc(q.name)+(p.price?' · $'+Number(p.price).toLocaleString():'')+'</p></div><span class="pill '+q.status+'">'+q.status+'</span></div>'
+'<div class="slots"><div><small>1st choice</small>'+esc(q.slots[0]?.label)+'</div><div><small>2nd choice</small>'+esc(q.slots[1]?.label)+'</div></div>'
+(q.message?'<p class="msg">'+esc(q.message)+'</p>':'')
+'<div class="links"><a href="tel:'+esc(tel)+'">Call</a><a href="sms:'+esc(tel)+'">Text</a><a href="mailto:'+esc(q.email)+'">Email</a>'+(l?(l.link?'<a class="letter" href="'+esc(l.link)+'" target="_blank" rel="noopener noreferrer">Pre-approval letter</a>':'<a aria-disabled="true">Letter deleted (90 days)</a>'):'<a aria-disabled="true">No letter</a>')+'</div>'
+'<div class="acts"><input class="note" placeholder="Note, e.g. moved to Sat 2pm" value="'+esc(q.statusNote)+'" aria-label="Note"><button class="btn solid" data-s="confirmed">Confirmed</button><button class="btn" data-s="rescheduled">Rescheduled</button></div>'
+'<p class="meta">'+esc(q.email)+' · '+esc(q.phone)+' · sent '+new Date(q.createdAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+(q.notify?' · email '+esc(q.notify.email?.status||'?')+' · FUB '+esc(q.notify.fub?.status||'?'):'')+(q.status!=='new'?' · <a href="#" data-s="new">mark as new</a>':'')+' · <a href="#" data-del>delete</a></p></article>';}
function render(){const n=s=>all.filter(q=>s==='all'||q.status===s).length;const list=all.filter(q=>filter==='all'||q.status===filter);
app.innerHTML='<header><div><b>Showing requests</b><small>Mike Hakim · REALTOR®</small></div><button class="btn l" id="out">Sign out</button></header><main class="wrap"><div class="tabs" role="group" aria-label="Filter">'+['new','confirmed','rescheduled','all'].map(s=>'<button data-f="'+s+'" aria-pressed="'+(filter===s)+'">'+s[0].toUpperCase()+s.slice(1)+' ('+n(s)+')</button>').join('')+'</div>'+(list.length?list.map(card).join(''):'<p class="empty">Nothing here yet.</p>')+'</main>';
app.querySelector('#out').onclick=async()=>{await api({action:'logout'});login();};
app.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;render();});
app.querySelectorAll('[data-del]').forEach(b=>b.onclick=async e=>{e.preventDefault();if(!confirm('Delete this request and its letter for good?'))return;const id=b.closest('.req').dataset.id;const r=await api({action:'delete',id});if(r.s===401)return login();if(r.j.ok){all=all.filter(q=>q.id!==id);render();}});
app.querySelectorAll('[data-s]').forEach(b=>b.onclick=async e=>{e.preventDefault();const el=b.closest('.req');b.disabled=true;const r=await api({action:'status',id:el.dataset.id,status:b.dataset.s,note:el.querySelector('.note').value});if(r.s===401)return login();if(r.j.request){all=all.map(q=>q.id===r.j.request.id?r.j.request:q);render();}else{b.disabled=false;alert(r.j.error||'Could not save');}});}
load();
</script></body></html>`;
