/* Checkout: pickup at either shop or delivery from either shop, then your details. The server (/api/quote)
   re-prices the bag from the catalog and re-checks the pickup time (or that the shop can still send a delivery
   today) before anything is final. Delivery prices come live from DoorDash Drive / Uber Direct (/api/delivery)
   once the shop's keys are set. Online payment isn't switched on yet, so the last step hands the order to the
   shop (call, Instagram, or copy) and says plainly that it isn't paid. */
(() => {
  'use strict';
  const NN = window.NN, N = window.NNOrder, { $, $$, esc, t, loc, qty } = NN;
  const root = $('#checkout'); if (!root) return;
  const L = window.NN_T || {}, AR = NN.AR, PF = NN.PF;
  const st = { mode: 'pickup', store: null, date: null, at: null, asap: true, addr: {}, quotes: null, pick: null };
  try { Object.assign(st, JSON.parse(sessionStorage.getItem('nn-co') || '{}'), { quotes: null, pick: null }); } catch (e) {}
  if (NN.store()) st.store = NN.store();
  const keep = () => { try { sessionStorage.setItem('nn-co', JSON.stringify({ ...st, quotes: null, pick: null })); } catch (e) {} };
  const form = { name: $('#coName'), phone: $('#coPhone'), email: $('#coEmail'), note: $('#coNote') };
  const ad = { street: $('#adStreet'), unit: $('#adUnit'), city: $('#adCity'), zip: $('#adZip') };
  try { const d = JSON.parse(localStorage.getItem('nn-me') || '{}'); Object.keys(form).forEach(k => { if (d[k] && form[k] && k !== 'note') form[k].value = d[k]; }); Object.keys(ad).forEach(k => { if (d.addr && d.addr[k]) ad[k].value = d.addr[k]; }); } catch (e) {}
  const sName = s => (AR && L.stores && L.stores[s.id]) || s.name;
  const PROV = { doordash: 'DoorDash', uber: 'Uber' };
  const dayName = (date, i) => {
    const [y, m, d] = date.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1, d));
    if (!AR) return (i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : '') + dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
    return (i === 0 ? t('today', 'Today') + '، ' : i === 1 ? t('tomorrow', 'Tomorrow') + '، ' : '') + dt.toLocaleDateString('ar-u-nu-latn', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  };
  const clock = iso => new Date(iso).toLocaleTimeString(AR ? 'ar-u-nu-latn' : 'en-US', { timeZone: 'America/Detroit', hour: 'numeric', minute: '2-digit' });
  const warn = (head, list) => `<div class="notice warn"><b>${head}</b><ul>${list.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  let prov = null; // which couriers are switched on
  const provP = fetch('/api/delivery', { cache: 'no-store' }).then(r => r.json()).then(j => { prov = j.providers || {}; }).catch(() => { prov = {}; });
  const delivOn = () => prov && (prov.doordash || prov.uber);

  NN.catalog().then(cat => {
    if (!st.store) st.store = cat.stores[0].id; // the shop the header shows
    const draw = () => {
      const lines = NN.serverLines(), priced = N.priceBasket(cat, lines);
      if (!NN.bag().lines.length) { root.innerHTML = `<div class="co-step done-card"><p class="kicker">${t('checkout', 'Checkout')}</p><h2 class="h2">${t('coEmpty', 'Your bag is empty')}</h2><p class="muted">${t('coEmptyP', 'Add something first, then come back here.')}</p><p style="margin-top:18px"><a class="btn btn-lime" href="${PF}/shop/">${t('startShopping', 'Start shopping')}</a></p></div>`; return; }
      // summary + fees
      const byId = NN.byId;
      $('#coSum').innerHTML = priced.lines.map(l => l.type === 'mix'
        ? `<div class="line"><img src="/img/logo-hd.webp" alt="" width="48" height="48"><div><b>${t('mixedBag', esc(l.name))} · ${esc(loc(l.weight))}</b><small dir="auto">${l.components.map(c => `${esc(loc(c.qty))} ${esc(c.name)}`).join(', ')}</small></div><div class="lp">${l.cents == null ? '—' : N.fmtMoney(l.cents)}</div></div>`
        : `<div class="line"><img src="${NN.img(byId[l.productId].img)}" alt="" width="48" height="48"><div><b dir="auto">${esc(l.name)}</b><small>${esc(loc(l.qty))}</small></div><div class="lp">${l.cents == null ? '—' : N.fmtMoney(l.cents)}</div></div>`).join('');
      $('#coTotal').textContent = N.fmtMoney(priced.subtotalCents);
      const q = st.mode === 'delivery' && st.pick;
      $('#coFees').innerHTML = q ? `<div class="sumrow" style="margin:8px 0 0"><span>${t('delivFee', 'Delivery')} · ${PROV[q.provider]}</span><b>${N.fmtMoney(q.feeCents)}</b></div><div class="sumrow grand" style="margin:8px 0 0"><span>${AR ? 'المجموع الكلي' : 'Total'}</span><b>${N.fmtMoney(priced.subtotalCents + q.feeCents)}</b></div>` : '';
      // mode
      $$('input[name=mode]').forEach(r => { r.checked = r.value === st.mode; });
      const wh = $('#coWhichH'); wh.textContent = st.mode === 'delivery' ? wh.dataset.d : wh.dataset.p;
      $('#coWhenStep').hidden = st.mode !== 'pickup'; $('#coAddrStep').hidden = st.mode !== 'delivery';
      // stores
      $('#coStores').innerHTML = cat.stores.map(s => { const x = NN.status(s.id) || { text: '' }; return `<label class="opt"><input type="radio" name="store" value="${s.id}" ${st.store === s.id ? 'checked' : ''}><span><b>${esc(sName(s))}</b><small dir="ltr" style="display:block;text-align:start">${esc(s.address.join(', '))}</small><small><i class="dot ${x.open ? 'open' : ''}" style="display:inline-block;vertical-align:1px;margin-inline-end:6px"></i>${esc(x.text)}</small></span></label>`; }).join('');
      if (st.mode === 'delivery') drawQuotes(); else drawTimes();
      keep();
    };
    const drawTimes = () => {
      const el = $('#coTimes');
      if (!st.store) { el.innerHTML = `<p class="muted">${t('chooseShop', 'Choose a shop first.')}</p>`; return; }
      const days = N.pickupDays(cat, st.store, Date.now()), first = days.flatMap(d => d.slots)[0];
      if (!first) { el.innerHTML = `<p class="muted">${t('noTimes', 'No pickup times are left at this shop right now. Please choose the other shop, or call us.')}</p>`; st.at = null; return; }
      if (!days.some(d => d.date === st.date && d.slots.length)) st.date = first.date;
      const day = days.find(d => d.date === st.date);
      if (st.asap) st.at = first.at;
      if (!st.asap && !day.slots.some(s => s.at === st.at)) st.at = day.slots[0].at;
      const firstDay = first.date === days[0].date ? t('today', 'Today') : t('tomorrow', 'Tomorrow');
      el.innerHTML = `<div class="opts"><label class="opt"><input type="radio" name="when" value="asap" ${st.asap ? 'checked' : ''}><span><b>${t('asap', "As soon as it's ready")}</b><small>${t('asapS', '{0} from {1} (we need about {2} minutes)', firstDay, esc(loc(first.label)), cat.settings.pickup.prepMinutes)}</small></span></label>
        <label class="opt"><input type="radio" name="when" value="later" ${st.asap ? '' : 'checked'}><span><b>${t('pickTime', 'Choose a time')}</b><small>${t('pickTimeS', 'Today or tomorrow, until the last pickup time')}</small></span></label></div>
        ${st.asap ? '' : `<div class="chips" style="margin-top:12px">${days.map((d, i) => `<button type="button" class="chip" data-day="${d.date}" aria-pressed="${d.date === st.date}" ${d.slots.length ? '' : 'disabled'}>${esc(dayName(d.date, i).split(AR ? '،' : ',')[0])}${d.hours ? '' : t('closedTag', ' · closed')}</button>`).join('')}</div>
        <div class="slots">${day.slots.map(s => `<button type="button" class="chip" data-at="${s.at}" aria-pressed="${s.at === st.at}">${esc(loc(s.label))}</button>`).join('')}</div>
        <p class="muted" style="font-size:13.5px;margin-top:10px">${day.hours ? t('hoursLine', 'Open {0}–{1} · last pickup {2}', esc(loc(day.hours.open)), esc(loc(day.hours.close)), esc(loc(day.hours.lastPickup))) : ''}</p>`}`;
    };
    const drawQuotes = () => {
      const el = $('#coQuotes'), btn = $('#coQuote');
      if (prov && !delivOn()) { btn.disabled = true; el.innerHTML = `<div class="notice ok" style="margin-top:12px">${t('delivOff', '<b>Delivery is being set up.</b> DoorDash and Uber couriers will be bookable here soon. Choose pickup for now, or call the shop.')}</div>`; return; }
      btn.disabled = false;
      if (!st.quotes) { el.innerHTML = ''; return; }
      el.innerHTML = `<div class="opts" style="margin-top:12px">${st.quotes.map(q => `<label class="opt"><input type="radio" name="courier" value="${q.provider}" ${st.pick && st.pick.provider === q.provider ? 'checked' : ''}><span><b>${PROV[q.provider]} · ${N.fmtMoney(q.feeCents)}</b><small>${q.eta ? t('eta', 'Arrives around {0}', esc(clock(q.eta))) : ''}</small></span></label>`).join('')}</div>
        <p class="muted" style="font-size:13px;margin-top:8px">${t('quoteNote', 'Live prices from {0}. The shop confirms your order and books the courier before anything is paid.', st.quotes.map(q => PROV[q.provider]).join(AR ? ' و ' : ' and '))}</p>`;
    };
    root.addEventListener('change', e => {
      const n = e.target.name;
      if (n === 'mode') { st.mode = e.target.value; st.quotes = null; st.pick = null; $('#coMsg').innerHTML = ''; draw(); }
      if (n === 'store') { st.store = e.target.value; st.at = null; st.quotes = null; st.pick = null; NN.setStore(st.store, true); draw(); }
      if (n === 'when') { st.asap = e.target.value === 'asap'; draw(); }
      if (n === 'courier') { st.pick = st.quotes.find(q => q.provider === e.target.value) || null; draw(); }
    });
    Object.values(ad).forEach(i => i.addEventListener('input', () => { if (st.quotes) { st.quotes = null; st.pick = null; draw(); } }));
    root.addEventListener('click', e => {
      const d = e.target.closest('[data-day]'); if (d) { st.date = d.dataset.day; st.at = null; draw(); }
      const a = e.target.closest('[data-at]'); if (a) { st.at = a.dataset.at; draw(); }
    });
    document.addEventListener('nn:bag', () => { st.quotes = null; st.pick = null; draw(); });
    provP.then(draw);
    draw();

    // delivery prices
    $('#coQuote').addEventListener('click', async () => {
      const el = $('#coQuotes'), btn = $('#coQuote'), msg = [];
      if (!st.store) msg.push(t('needStore', 'Choose the shop to deliver from.'));
      const addr = { street: ad.street.value.trim(), unit: ad.unit.value.trim(), city: ad.city.value.trim(), zip: ad.zip.value.trim() };
      if (addr.street.length < 4 || !addr.city || !/^\d{5}$/.test(addr.zip) || !/^\+?[\d\s().-]{10,}$/.test(form.phone.value.trim())) msg.push(t('needAddr', 'Add the street, city, 5-digit ZIP, and your mobile number below.'));
      if (msg.length) { el.innerHTML = warn(t('almost', 'Almost there:'), msg.map(esc)); return; }
      btn.disabled = true; el.innerHTML = `<p class="muted" style="margin-top:12px">${t('gettingQuotes', 'Asking DoorDash and Uber…')}</p>`;
      try {
        const r = await fetch('/api/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store: st.store, address: addr, name: form.name.value.trim(), phone: form.phone.value.trim(), lines: NN.serverLines() }) });
        const j = await r.json();
        if (j.code === 'off') { prov = j.providers || {}; drawQuotes(); return; }
        if (!j.ok) { st.quotes = null; el.innerHTML = `<div class="notice warn" style="margin-top:12px">${j.code === 'fields' ? t('needAddr', 'Add the street, city, 5-digit ZIP, and your mobile number below.') : t('noQuotes', "No courier could price that address. Check it, or choose pickup.")}</div>`; return; }
        st.quotes = j.quotes; st.pick = j.quotes[0]; st.dropoff = j.dropoff; draw();
      } catch (e) { el.innerHTML = `<div class="notice warn" style="margin-top:12px">${t('noReach', "We couldn't reach the shop's system just now. Check your connection and try again, or call the shop.")}</div>`; }
      finally { btn.disabled = !delivOn(); }
    });

    // place: server check, then hand the order to the shop
    $('#coPlace').addEventListener('click', async () => {
      const msg = $('#coMsg'), btn = $('#coPlace'), del = st.mode === 'delivery';
      const errs = [];
      if (!del && (!st.store || !st.at)) errs.push(t('needStoreTime', 'Choose a shop and a pickup time.'));
      if (del && !st.store) errs.push(t('needStore', 'Choose the shop to deliver from.'));
      if (del && !st.pick) errs.push(t('needQuote', 'Add your address and choose a delivery price.'));
      if (!form.name.value.trim()) errs.push(t('needName', 'Add the name for the order.'));
      if (!/^\+?[\d\s().-]{10,}$/.test(form.phone.value.trim())) errs.push(t('needPhone', 'Add a mobile number we can call if something is out of stock.'));
      if (errs.length) { msg.innerHTML = warn(t('almost', 'Almost there:'), errs.map(esc)); return; }
      const addr = { street: ad.street.value.trim(), unit: ad.unit.value.trim(), city: ad.city.value.trim(), zip: ad.zip.value.trim() };
      try { localStorage.setItem('nn-me', JSON.stringify({ name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(), addr: del ? addr : undefined })); } catch (e) {}
      btn.disabled = true; btn.textContent = t('checking', 'Checking prices and time…');
      const lines = NN.serverLines(), local = N.priceBasket(cat, lines);
      let q;
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, ...(del ? { delivery: { store: st.store } } : { pickup: { store: st.store, at: st.at } }), clientTotalCents: local.subtotalCents }) });
        q = await r.json(); if (!r.ok && !q.lines) throw new Error(q.error || 'check');
      } catch (e) { btn.disabled = false; btn.textContent = t('place', 'Place order'); msg.innerHTML = `<div class="notice warn">${t('noReach', "We couldn't reach the shop's system just now. Check your connection and try again, or call the shop.")}</div>`; return; }
      btn.disabled = false; btn.textContent = t('place', 'Place order');
      const problems = [...(q.errors || []).map(x => AR ? `${t('itemErr', 'Problem with an item:')} <bdi>${esc(x.msg)}</bdi>` : esc(x.msg))];
      if (!q.pickup.ok) problems.push(esc(AR && L.pickupErr && L.pickupErr[q.pickup.code] || q.pickup.reason));
      if (q.priceChanged) problems.push(t('priceChanged', 'Prices changed since you added these. Your new total is {0}.', N.fmtMoney(q.subtotalCents)));
      if (problems.length) { msg.innerHTML = warn(t('fixFirst', 'Please fix this first:'), problems); draw(); return; }
      const s = cat.stores.find(x => x.id === st.store), fee = del ? st.pick.feeCents : 0;
      const whenAr = del ? null : `${clock(q.pickup.at)} ${(() => { const days = N.pickupDays(cat, st.store, Date.now()), i = days.findIndex(d => d.slots.some(x => x.at === q.pickup.at)); return i >= 0 ? dayName(days[i].date, i) : ''; })()}`;
      const label = AR ? whenAr : q.pickup.label;
      const text = [del ? 'Nuts Now DELIVERY order' : 'Nuts Now pickup order', `Name: ${form.name.value.trim()}`, `Phone: ${form.phone.value.trim()}`, form.email.value.trim() ? `Email: ${form.email.value.trim()}` : '',
        del ? `Deliver from: ${s.name} (${q.pickup.label})` : `Pickup: ${s.name}, ${q.pickup.label}`,
        del ? `Deliver to: ${st.dropoff || [addr.street, addr.unit, addr.city, 'MI ' + addr.zip].filter(Boolean).join(', ')}` : '',
        del ? `Courier: ${PROV[st.pick.provider]} quote ${N.fmtMoney(fee)}${st.pick.id ? ` (ref ${st.pick.id})` : ''}` : '', '',
        ...q.lines.map(l => l.type === 'mix' ? `• ${l.name} (${l.weight}): ${l.components.map(c => `${c.qty} ${c.name}`).join(', ')} = ${N.fmtMoney(l.cents)}` : `• ${l.qty} ${l.name} = ${N.fmtMoney(l.cents)}`),
        '', `Subtotal: ${N.fmtMoney(q.subtotalCents)} (+ tax where it applies)`, del ? `Delivery: ${N.fmtMoney(fee)} · Total: ${N.fmtMoney(q.subtotalCents + fee)}` : '',
        form.note.value.trim() ? `Note: ${form.note.value.trim()}` : '', AR ? 'Ordered on the Arabic site.' : '',
        del ? 'Not paid yet: please confirm with me and book the courier.' : 'Not paid yet: I will pay at pickup.'].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
      try { localStorage.setItem('nn-last-order', JSON.stringify({ text, at: Date.now() })); } catch (e) {}
      root.innerHTML = `<div class="co-step done-card"><p class="kicker">${t('lastStep', 'Last step')}</p><h2 class="h2">${t('sendTo', 'Send it to {0}', esc(sName(s)))}</h2>
        <p class="lede" style="margin:0 auto">${del ? t('checkedD', 'Your order and prices are checked. Online payment isn\'t switched on yet, so send it to the shop: they\'ll confirm with you and book the courier ({0}). You pay for the order and delivery when they confirm.', PROV[st.pick.provider]) : t('checkedP', 'Your order is checked: prices and the pickup time ({0}) are confirmed. Online payment isn\'t switched on yet, so send it to the shop and pay when you pick up.', esc(label))}</p>
        <pre class="order" dir="ltr">${esc(text)}</pre>
        <div style="display:grid;gap:10px;max-width:420px;margin:0 auto">
          <a class="btn btn-lime" href="tel:${esc(s.phone)}">${t('call', 'Call {0} · {1}', esc(sName(s)), `<span dir="ltr">${esc(s.phoneLabel)}</span>`)}</a>
          <button class="btn btn-black" type="button" id="coCopy">${t('copy', 'Copy order')}</button>
          <a class="btn btn-line" href="https://ig.me/m/nutsnow.co" target="_blank" rel="noopener">${t('ig', 'Send on Instagram (paste it)')}</a>
        </div>
        <p class="muted" style="font-size:13.5px;margin-top:16px">${t('nothingCharged', "Nothing is charged online. Stock can differ between our two shops; we'll call you if anything is out.")}</p></div>`;
      $('#coCopy').addEventListener('click', async e => { try { await navigator.clipboard.writeText(text); e.target.textContent = t('copied', 'Copied ✓'); } catch (x) { e.target.textContent = t('copyFail', 'Select the text above to copy'); } });
      scrollTo({ top: 0, behavior: 'smooth' });
    });
  }).catch(() => { root.innerHTML = `<div class="notice warn">${t('loadErr', "The shop couldn't load. Check your connection and refresh.")}</div>`; });
})();
