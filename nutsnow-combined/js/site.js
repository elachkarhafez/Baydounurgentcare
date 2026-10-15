/* Nuts Now: the script every page shares.
   - the bag (kept in this browser, localStorage 'nn-bag-v2'), the bag drawer and the phone bag bar
   - "Add" on product cards (weight chips ¼ / ½ / 1 lb, or pieces), with a little flight into the bag
   - search over all products (loads /data/catalog.json the first time it's opened)
   - the phone menu, store open/closed status, reveal-on-scroll
   Prices shown in the bag are worked out with the same code the server uses (js/order-core.js). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const N = window.NNOrder, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'nn-bag-v2';
  const NN = window.NN = window.NN || {};
  NN.$ = $; NN.$$ = $$; NN.esc = esc;
  // interface text: English is written in place, Arabic pages carry their strings in window.NN_T
  const L = window.NN_T || {}, AR = L.lang === 'ar', PF = window.NN_PF || '';
  const t = (k, en, ...v) => String(L[k] != null ? L[k] : en).replace(/\{(\d)\}/g, (_, i) => v[i]);
  const AR_UNITS = [[/ \/ lb\b/g, ' / رطل'], [/\blb\b/g, 'رطل'], [/ each\b/g, ' للقطعة'], [/ \/ box\b/g, ' / علبة'], [/ \/ bag\b/g, ' / كيس'], [/ \/ pack\b/g, ' / عبوة'], [/ for (\d+)\b/g, ' لكل $1'], [/\bpieces\b/g, 'قطع'], [/\bpiece\b/g, 'قطعة'], [/\bboxes\b/g, 'علب'], [/\bbox\b/g, 'علبة'], [/\bbags\b/g, 'أكياس'], [/\bbag\b/g, 'كيس'], [/\bpacks of\b/g, 'عبوات من'], [/\bpack of\b/g, 'عبوة من'], [/\bpacks\b/g, 'عبوات'], [/\bpack\b/g, 'عبوة'], [/\bAM\b/g, 'ص'], [/\bPM\b/g, 'م']];
  const loc = x => { if (!AR || x == null) return x; let r = String(x); AR_UNITS.forEach(([a, b]) => { r = r.replace(a, b); }); return r; };
  const qty = (p, u) => loc(N.fmtQty(p, u)), plabel = p => loc(N.priceLabel(p));
  const subName = x => (AR && L.subs && L.subs[x]) || x, catName = (id, en) => (AR && L.cats && L.cats[id]) || en;
  Object.assign(NN, { t, loc, qty, plabel, subName, catName, AR, PF, u: h => PF + h });

  /* ---------- catalog (loaded once, only when needed) ---------- */
  let catP = null;
  NN.catalog = () => catP || (catP = fetch('/data/catalog.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('catalog'); return r.json(); }).then(c => { NN.cat = c; NN.byId = N.index(c); return c; }));
  const img = k => `/img/p/${k}.webp`;
  NN.img = img;
  // a photo that hasn't been added yet shows the logo tile instead of a broken image
  document.addEventListener('error', e => { const t = e.target; if (t.tagName === 'IMG' && t.src.includes('/img/p/') && !t.src.endsWith('_soon.webp')) t.src = '/img/p/_soon.webp'; }, true);

  /* ---------- bag state ---------- */
  const load = () => { try { const b = JSON.parse(localStorage.getItem(KEY)); if (b && Array.isArray(b.lines)) return b; } catch (e) {} return { lines: [] }; };
  let bag = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {} paint(); };
  addEventListener('storage', e => { if (e.key === KEY) { bag = load(); paint(); } });
  const uid = () => Math.random().toString(36).slice(2, 9);
  // a light copy of what the card showed, so the bag can draw before the catalog arrives
  const snap = p => ({ name: p.name, img: p.img, priceCents: p.priceCents, sellBy: p.sellBy, unit: p.unit, packSize: p.packSize, slug: p.slug, mixable: p.mixable });
  NN.bag = () => bag;
  NN.add = (p, units, from) => {
    const ex = bag.lines.find(l => l.productId === p.id);
    if (ex) { ex.units = Math.min(ex.units + units, (N.rules(NN.cat || { settings: { weight: {}, eachMax: 40 } }, p).max) || 9999); ex.p = snap(p); }
    else bag.lines.push({ id: uid(), productId: p.id, units, mix: false, p: snap(p) });
    save(); fly(from, p); bump();
    toast(`${t('added', 'Added')} <b>${esc(qty(p, units))}</b> · <bdi>${esc(p.name)}</bdi>`);
  };
  const setUnits = (id, units) => { const l = bag.lines.find(x => x.id === id); if (!l) return; if (units <= 0) bag.lines = bag.lines.filter(x => x !== l); else l.units = units; save(); };
  NN.clearBag = () => { bag = { lines: [] }; save(); };
  // the basket as the server wants it: lines ticked "mix" become one mix line
  NN.serverLines = () => {
    const mixed = bag.lines.filter(l => l.mix && l.p && l.p.sellBy !== 'each'), out = bag.lines.filter(l => !mixed.includes(l)).map(l => ({ type: 'item', id: l.id, productId: l.productId, units: l.units }));
    if (mixed.length > 1) out.push({ type: 'mix', id: 'mix', name: 'Mixed bag', components: mixed.map(l => ({ productId: l.productId, units: l.units })) });
    else mixed.forEach(l => out.push({ type: 'item', id: l.id, productId: l.productId, units: l.units }));
    return out;
  };
  const lineP = l => (NN.byId && NN.byId[l.productId]) || (l.p && { id: l.productId, ...l.p, orderable: true });
  const totals = () => {
    let cents = 0, n = 0;
    bag.lines.forEach(l => { const p = lineP(l), c = p && N.lineCents(p, l.units); if (c != null) cents += c; n++; });
    return { cents, n };
  };
  NN.totals = totals;

  /* ---------- header bits ---------- */
  const hdr = $('.hdr');
  if (hdr) { const f = () => hdr.classList.toggle('stuck', scrollY > 4); addEventListener('scroll', f, { passive: true }); f(); }
  function bump() { $$('.bag-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }
  let tt; function toast(html) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = html; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }
  NN.toast = toast;
  function fly(from, p) {
    if (RM || !from) return;
    const to = $$('.bag-btn').find(b => b.offsetParent) || $('.bagbar'); if (!to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), f = document.createElement('i');
    f.className = 'flyer'; f.style.backgroundImage = `url(${img(p.img)})`; document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - 23, y0 = a.top + a.height / 2 - 23, x1 = b.left + b.width / 2 - 23, y1 = b.top + b.height / 2 - 23, my = Math.max(60, Math.min(y0, y1) - 120);
    f.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${(x0 + x1) / 2}px,${my}px) scale(1.1)`, opacity: 1, offset: .5 }, { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: .4 }], { duration: 750, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => f.remove();
  }

  /* ---------- paint: counts, bag bar, drawer ---------- */
  function paint() {
    const { cents, n } = totals();
    $$('[data-bag-count]').forEach(e => { e.textContent = n; });
    const bb = $('.bagbar');
    if (bb) { bb.classList.toggle('show', n > 0); document.body.classList.toggle('has-bag', n > 0); $('.bb-n', bb).textContent = AR ? `${n} ${n === 1 ? t('item', 'item') : t('items', 'items')}` : n + (n === 1 ? ' item' : ' items'); $('.bb-c', bb).textContent = N.fmtMoney(cents); }
    if ($('#bagSheet.open')) drawBag();
    document.dispatchEvent(new CustomEvent('nn:bag'));
  }

  /* ---------- sheets (menu / search / bag) ---------- */
  let lastFocus = null;
  function openSheet(id) {
    const s = $('#' + id); if (!s) return;
    lastFocus = document.activeElement; s.classList.add('open'); s.setAttribute('aria-hidden', 'false'); document.documentElement.style.overflow = 'hidden';
    const f = $('[autofocus], input, button', s); f && setTimeout(() => f.focus(), 30);
  }
  function closeSheet(s) { s = s || $('.sheet.open'); if (!s) return; s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); document.documentElement.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); }
  NN.openSheet = openSheet; NN.closeSheet = closeSheet;
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); if (o.dataset.open === 'bagSheet') drawBag(); if (o.dataset.open === 'searchSheet') NN.catalog().catch(() => {}); openSheet(o.dataset.open); return; }
    if (e.target.closest('[data-close]') || e.target.classList.contains('scrim')) { closeSheet(e.target.closest('.sheet')); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); NN.catalog().catch(() => {}); openSheet('searchSheet'); } });

  /* ---------- bag drawer ---------- */
  function drawBag() {
    const body = $('#bagBody'), foot = $('#bagFoot'); if (!body) return;
    if (!bag.lines.length) {
      body.innerHTML = `<div class="bag-empty"><img src="/img/logo-hd.webp" alt="" width="90" height="90"><p><b>${t('empty', 'Your bag is empty.')}</b></p><p class="muted">${t('emptyP', 'Pick anything by the ¼ lb or by the piece.')}</p><a class="btn btn-lime" href="${PF}/shop/" style="margin-top:16px">${t('startShopping', 'Start shopping')}</a></div>`;
      foot.hidden = true; return;
    }
    foot.hidden = false;
    const mixable = bag.lines.filter(l => { const p = lineP(l); return p && p.mixable && p.sellBy !== 'each'; });
    body.innerHTML = bag.lines.map(l => {
      const p = lineP(l); if (!p) return '';
      const c = N.lineCents(p, l.units), canMix = p.mixable && p.sellBy !== 'each' && mixable.length > 1;
      return `<div class="line" data-line="${l.id}"><img src="${img(p.img)}" alt="" width="64" height="64" loading="lazy">
        <div><a href="${PF}/product/${esc(p.slug)}/" style="text-decoration:none"><b dir="auto">${esc(p.name)}</b></a><small>${esc(plabel(p) || t('priceInStore', 'Price in store'))}</small>
          <div class="lc"><div class="mini-step"><button type="button" data-step="-1" aria-label="${t('less', 'Less')}">−</button><output>${esc(qty(p, l.units))}</output><button type="button" data-step="1" aria-label="${t('more', 'More')}">+</button></div>
          <button type="button" class="rm" data-rm>${t('remove', 'Remove')}</button>
          ${canMix ? `<label class="mixtog"><input type="checkbox" data-mix ${l.mix ? 'checked' : ''}> ${t('inMix', 'In my mix bag')}</label>` : ''}</div></div>
        <div class="lp">${c == null ? '—' : N.fmtMoney(c)}</div></div>`;
    }).join('') + (mixable.length > 1 ? `<p class="mixnote">${t('mixNote', 'Tick <b>In my mix bag</b> to have those weighed into one bag together. Each one is still priced at its own rate.')}</p>` : '');
    const { cents } = totals();
    $('#bagTotal').textContent = N.fmtMoney(cents);
  }
  document.addEventListener('click', e => {
    const ln = e.target.closest('[data-line]'); if (!ln) return;
    const l = bag.lines.find(x => x.id === ln.dataset.line); if (!l) return;
    const p = lineP(l);
    if (e.target.closest('[data-step]')) setUnits(l.id, N.stepQty(NN.cat || { settings: { weight: { stepUnits: 1, minUnitsPerProduct: 1, maxUnitsPerLine: 100 }, eachMax: 40 } }, p, l.units, +e.target.closest('[data-step]').dataset.step));
    if (e.target.closest('[data-rm]')) setUnits(l.id, 0);
  });
  document.addEventListener('change', e => { const m = e.target.closest('[data-mix]'); if (!m) return; const l = bag.lines.find(x => x.id === m.closest('[data-line]').dataset.line); if (l) { l.mix = m.checked; save(); } });

  /* ---------- product cards ---------- */
  // weight chips
  document.addEventListener('click', e => {
    const w = e.target.closest('.wts button'); if (!w) return;
    $$('button', w.parentElement).forEach(b => b.setAttribute('aria-pressed', b === w ? 'true' : 'false'));
    document.dispatchEvent(new CustomEvent('nn:qty', { detail: w }));
  });
  // add
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'); if (!a) return;
    const card = a.closest('[data-p]'); if (!card) return;
    const p = JSON.parse(card.dataset.p);
    let units = 1;
    const sel = $('.wts button[aria-pressed=true]', card); if (sel) units = +sel.dataset.u;
    const st = $('[data-units]', card); if (st) units = +st.dataset.units;
    NN.add(p, units, $('.ph img', card) || a);
    a.classList.add('done'); const was = a.textContent; a.textContent = t('addedOk', 'Added ✓'); setTimeout(() => { a.classList.remove('done'); a.textContent = was; }, 1300);
  });

  /* ---------- search ---------- */
  const sIn = $('#searchInput'), sRes = $('#searchRes');
  if (sIn) {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/za?atar/g, 'zaatar');
    let idx = null;
    const build = c => { const cats = Object.fromEntries(c.categories.map(x => [x.id, x.name])); idx = c.products.map(p => ({ p, t: norm(`${p.name} ${p.sub} ${cats[p.category]} ${(p.tags || []).join(' ')}${AR ? ` ${subName(p.sub)} ${catName(p.category, '')}` : ''}`), n: norm(p.name), cat: catName(p.category, cats[p.category]) })); };
    const hl = (name, terms) => { let h = esc(name); terms.forEach(t => { if (t.length > 1) h = h.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'); }); return h; };
    const run = () => {
      const q = norm(sIn.value.trim());
      if (!q) { sRes.innerHTML = $('#searchHint').innerHTML; return; }
      if (!idx) { sRes.innerHTML = `<p class="s-hint">${t('loading', 'Loading the shop…')}</p>`; NN.catalog().then(c => { build(c); run(); }).catch(() => { sRes.innerHTML = `<p class="s-hint">${t('loadFail', 'Couldn\'t load the shop. Check your connection and try again.')}</p>`; }); return; }
      const terms = q.split(/\s+/).map(t => t.replace(/s$/, ''));
      const hits = idx.filter(x => terms.every(t => x.t.includes(t))).map(x => ({ ...x, score: (x.n.startsWith(terms[0]) ? 0 : 1) + (x.p.orderable ? 0 : 2) + x.n.length / 100 })).sort((a, b) => a.score - b.score);
      sRes.innerHTML = hits.length ? `<p class="s-hint">${hits.length === 1 ? t('match1', '1 match') : t('matches', '{0} matches', hits.length)}</p>` + hits.slice(0, 40).map(({ p, cat }) => `<a class="s-row" href="${PF}/product/${esc(p.slug)}/"><img src="${img(p.img)}" alt="" width="56" height="56" loading="lazy"><span><b dir="auto">${hl(p.name, terms)}</b><small>${esc(cat)} · ${esc(subName(p.sub))}</small></span><span class="pr">${p.priceCents != null ? N.fmtMoney(p.priceCents).replace('.00', '') : `<small>${t('priceInStore', 'Price in store')}</small>`}${p.priceCents != null ? `<small>${esc(plabel(p).replace(/^\S+\s?/, ''))}</small>` : ''}</span></a>`).join('')
        : `<p class="s-hint">${t('noHits', 'Nothing called “{0}” online yet. The shops carry more than the website, so give us a call.', esc(sIn.value))}</p>`;
    };
    let st; sIn.addEventListener('input', () => { clearTimeout(st); st = setTimeout(run, 90); });
    document.addEventListener('click', e => { const c = e.target.closest('[data-q]'); if (c) { sIn.value = c.dataset.q; run(); sIn.focus(); } });
  }

  /* ---------- store status (open now / closed) ---------- */
  const S = window.NN_STORES;
  NN.status = id => {
    if (!S) return null;
    const s = S.stores.find(x => x.id === id), now = Date.now(), z = N.zoned(now, S.tz), cat = { settings: { pickup: { closures: [] } } };
    const h = N.dayHours(cat, s, z.date), m = z.h * 60 + z.mi;
    if (h && m >= h.open && m < h.close) return { open: true, text: t('openUntil', 'Open now · until {0}', loc(N.fmtClock(h.close))) };
    if (h && m < h.open) return { open: false, text: t('opensToday', 'Opens {0} today', loc(N.fmtClock(h.open))) };
    const nx = N.dayHours(cat, s, N.addDays(z.date, 1));
    return { open: false, text: nx ? t('opensTomorrow', 'Closed · opens {0} tomorrow', loc(N.fmtClock(nx.open))) : t('closedToday', 'Closed today') };
  };
  const status = () => $$('[data-status]').forEach(el => { const st = NN.status(el.dataset.status); if (!st) return; const d = $('.dot', el); d && d.classList.toggle('open', st.open); const t = $('[data-st-text]', el) || el; t.textContent = st.text; });
  status(); setInterval(status, 60000);

  /* ---------- pickup shop (chosen once, remembered in this browser, used at checkout) ---------- */
  const SK = 'nn-store', storeIds = S ? S.stores.map(x => x.id) : [];
  NN.store = () => { try { const v = localStorage.getItem(SK); if (storeIds.includes(v)) return v; } catch (e) {} return null; };
  NN.setStore = (id, quiet) => {
    if (!storeIds.includes(id)) return;
    try { localStorage.setItem(SK, id); } catch (e) {}
    paintStore();
    if (!quiet) toast(t('storeSet', 'Pickup set to <b>{0}</b>', esc(S.stores.find(x => x.id === id).name)));
    document.dispatchEvent(new CustomEvent('nn:store', { detail: id }));
  };
  function paintStore() {
    const id = NN.store() || storeIds[0], s = S && S.stores.find(x => x.id === id); if (!s) return;
    $$('[data-store-name]').forEach(e => { e.textContent = s.name; });
    $$('input[name=pickstore]').forEach(r => { r.checked = r.value === id; });
  }
  document.addEventListener('change', e => { if (e.target.name === 'pickstore') { NN.setStore(e.target.value); setTimeout(() => closeSheet($('#storeSheet')), 250); } });
  addEventListener('storage', e => { if (e.key === SK) paintStore(); });
  paintStore();

  /* ---------- reveal on scroll ---------- */
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(el => io.observe(el));
  } else $$('.rv').forEach(el => el.classList.add('in'));
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('nn-hidden', document.hidden));

  /* ---------- category pages: filter by sub-aisle, sort ---------- */
  const list = $('#plist');
  if (list) {
    const cards = $$('.card', list), chips = $$('[data-sub]'), sort = $('#sort'), cnt = $('#pcount');
    let sub = new URLSearchParams(location.search).get('type') || '';
    const apply = () => {
      let shown = 0;
      cards.forEach(c => { const on = !sub || c.dataset.sub === sub; c.hidden = !on; if (on) shown++; });
      chips.forEach(ch => ch.setAttribute('aria-pressed', ch.dataset.sub === sub ? 'true' : 'false'));
      if (cnt) cnt.textContent = AR ? `${shown} ${shown === 1 ? t('item', 'item') : t('items', 'items')}` : `${shown} ${shown === 1 ? 'item' : 'items'}`;
    };
    chips.forEach(ch => ch.addEventListener('click', () => { sub = ch.dataset.sub; const u = new URL(location); if (sub) u.searchParams.set('type', sub); else u.searchParams.delete('type'); history.replaceState(null, '', u); apply(); }));
    sort && sort.addEventListener('change', () => {
      const k = sort.value, val = c => { const p = JSON.parse(c.dataset.p); return k === 'price' ? (p.priceCents == null ? 1e9 : p.priceCents) : k === 'price-d' ? -(p.priceCents || 0) : k === 'name' ? p.name : +c.dataset.o; };
      cards.sort((a, b) => { const x = val(a), y = val(b); return x < y ? -1 : x > y ? 1 : 0; }).forEach(c => list.appendChild(c));
    });
    apply();
  }

  /* ---------- product page: quantity + live total ---------- */
  const pdp = $('[data-pdp]');
  if (pdp) {
    const p = JSON.parse(pdp.dataset.p), out = $('#qtyOut'), tot = $('#qtyTotal'), st = $('[data-units]', pdp);
    const R = N.rules({ settings: { weight: { minUnitsPerProduct: 1, stepUnits: 1, maxUnitsPerLine: 100 }, eachMax: 40 } }, p);
    const set = u => { u = Math.max(R.min, Math.min(R.max || 9999, u)); st.dataset.units = u; out.textContent = qty(p, u); tot.textContent = N.fmtMoney(N.lineCents(p, u)); $$('.wts button', pdp).forEach(b => b.setAttribute('aria-pressed', +b.dataset.u === u ? 'true' : 'false')); };
    $$('[data-q-step]', pdp).forEach(b => b.addEventListener('click', () => set(+st.dataset.units + R.step * +b.dataset.qStep)));
    document.addEventListener('nn:qty', e => { if (pdp.contains(e.detail)) set(+e.detail.dataset.u); });
    set(+st.dataset.units);
  }

  paint();
  // refresh bag snapshots against the live catalog when it's already cached or the bag has items
  if (bag.lines.length) NN.catalog().then(() => { bag.lines = bag.lines.filter(l => NN.byId[l.productId]); bag.lines.forEach(l => { l.p = snap(NN.byId[l.productId]); }); save(); }).catch(() => {});
})();
