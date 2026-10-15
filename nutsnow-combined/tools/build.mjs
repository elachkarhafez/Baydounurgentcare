// Build the Nuts Now site: static HTML for every page, in English (/) and Arabic (/ar/), from data/catalog.json.
//   node tools/build.mjs
// Pages: / · /shop/ · /shop/<aisle>/ · /shop/<collection>/ · /product/<slug>/ · /stores/ · /about/ · /checkout/ · /credits/ · /404.html
// and the same under /ar/ (right-to-left). Shared assets: /css/site.css, /js/order-core.js, /js/site.js (+ /js/home.js, /js/checkout.js).
// Re-run after editing the catalog, reviews or text (tools/i18n.mjs).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { T, AR } from './i18n.mjs';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const N = require(path.join(ROOT, 'js/order-core.js'));
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8'));
const reviewsPath = path.join(ROOT, 'data/reviews.json');
const REV = fs.existsSync(reviewsPath) ? JSON.parse(fs.readFileSync(reviewsPath, 'utf8')) : null;
const SITE = 'https://nutsnow-combined.vercel.app';
const IG = 'https://www.instagram.com/nutsnow.co/', TT = 'https://www.tiktok.com/@nutsnowco', FB = 'https://www.facebook.com/Nutsnow.co/';

/* ---------- shared helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const V = { css: ver('css/site.css'), core: ver('js/order-core.js'), site: ver('js/site.js'), home: ver('js/home.js'), co: ver('js/checkout.js'), tx: ver('js/transition.js') };
const imgOk = new Set(fs.existsSync(path.join(ROOT, 'img/p')) ? fs.readdirSync(path.join(ROOT, 'img/p')).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)) : []);
const img = k => `/img/p/${imgOk.has(k) ? k : '_soon'}.webp`;
const P = cat.products, byId = Object.fromEntries(P.map(p => [p.id, p]));
const CATS = cat.categories, catById = Object.fromEntries(CATS.map(c => [c.id, c]));
const inCol = (p, c) => (p.tags || []).includes(c);
const S = cat.stores;
const nOrder = P.filter(p => p.orderable).length;
const count = f => P.filter(f).length;
const CAT_IMG = { 'nuts-seeds': 'cashews-seasoned', candy: 'gummy-mix', chocolate: 'chocolate-almonds', 'dried-fruit-dates': 'dried-mango', 'turkish-delight-sweets': 'turkish-delight', 'ice-cream': 'fruit-ice-cream', 'cakes-desserts': 'cheesecake-strawberry', snacks: 'vegetable-chips', spices: 'spice-sumac', pantry: 'sprinkles-rainbow', 'dubai-chocolate': 'dubai-chocolate', 'swedish-candy': 'swedish-skulls', 'sugar-free': 'wrapped-candy' };
const COLS = (cat.collections || []).map(c => ({ ...c, count: count(p => inCol(p, c.id)) }));
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const dirLink = s => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Nuts Now ' + s.address.join(' '))}`;
const DEL = cat.settings.delivery || {};
// unit words in Arabic ("$6.99 each" → "$6.99 للقطعة", "½ lb" → "½ رطل")
const AR_UNITS = [[/ \/ lb\b/g, ' / رطل'], [/\blb\b/g, 'رطل'], [/ each\b/g, ' للقطعة'], [/ \/ box\b/g, ' / علبة'], [/ \/ bag\b/g, ' / كيس'], [/ for (\d+)\b/g, ' لكل $1'], [/\bpieces\b/g, 'قطع'], [/\bpiece\b/g, 'قطعة'], [/\bboxes\b/g, 'علب'], [/\bbox\b/g, 'علبة'], [/\bbags\b/g, 'أكياس'], [/\bbag\b/g, 'كيس'], [/\bpacks of\b/g, 'عبوات من'], [/\bpack of\b/g, 'عبوة من']];

/* ---------- icons ---------- */
const I = {
  search: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bag: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2" stroke-linecap="round"/></svg>',
  menu: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  arrow: '<svg class="ico flip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  pin: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  phone: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
  ig: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  tt: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.2 1.8 3.7 4 4v3.1c-1.5 0-2.9-.4-4-1.2V15a6 6 0 11-6-6v3.2a2.8 2.8 0 102.8 2.8V3h3.2z"/></svg>',
  fb: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4.5h-3c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.6v-6.5h2.9l.5-3.5h-3.4V8.9c0-.6.3-.9.9-.9z"/></svg>',
  globe: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/></svg>',
  truck: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
  store: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/></svg>'
};

const out = {};
const write = (rel, html) => { out[rel] = html; };

/* ================= one language ================= */
function build(L) {
  const t = T[L], ar = L === 'ar', PF = ar ? '/ar' : '';
  const u = p => PF + p;                                    // internal link in this language
  const alt = p => (ar ? '' : '/ar') + p;                   // same page in the other language
  const loc = s => { if (!ar || !s) return s; let r = s; AR_UNITS.forEach(([a, b]) => { r = r.replace(a, b); }); return r; };
  const catName = c => ar && AR.cats[c.id] ? AR.cats[c.id][0] : c.name;
  const catDesc = c => ar && AR.cats[c.id] ? AR.cats[c.id][1] : c.description;
  const colName = c => ar && AR.cols[c.id] ? AR.cols[c.id][0] : c.name;
  const colDesc = c => ar && AR.cols[c.id] ? AR.cols[c.id][1] : c.description;
  const subName = s => ar && AR.subs[s] ? AR.subs[s] : s;
  const storeName = s => ar ? AR.stores[s.id] : s.name;
  const storeTag = s => ar ? (AR.tags[s.tag] || s.tag) : s.tag;
  const clock = tm => { const c = N.fmtClock(toMin(tm)); return ar ? c.replace(' AM', ' ص').replace(' PM', ' م') : c; };
  const money = c => N.fmtMoney(c);
  const moneyShort = c => N.fmtMoney(c).replace(/\.00$/, '');
  const unitTail = p => { const l = N.priceLabel(p); return l ? loc(l.replace(/^\S+\s?/, '')) : ''; };
  const hoursSummary = s => {
    const rows = [1, 2, 3, 4, 5, 6, 0].map(d => ({ d, h: s.hours[d] ? `${clock(s.hours[d].open)}–${clock(s.hours[d].close)}` : t.closed }));
    const groups = []; rows.forEach(r => { const g = groups[groups.length - 1]; if (g && g.h === r.h) g.to = r.d; else groups.push({ from: r.d, to: r.d, h: r.h }); });
    const ab = d => ar ? t.days[d] : t.days[d].slice(0, 3);
    return groups.length === 1 ? `${t.everyDay} ${groups[0].h}` : groups.map(g => `${ab(g.from)}${g.to !== g.from ? '–' + ab(g.to) : ''} ${g.h}`).join(' · ');
  };
  const nm = p => `<bdi>${esc(p.name)}</bdi>`;

  /* ---------- product card ---------- */
  const pjson = p => esc(JSON.stringify({ id: p.id, slug: p.slug, name: p.name, img: p.img, priceCents: p.priceCents, sellBy: p.sellBy, unit: p.unit, packSize: p.packSize, mixable: p.mixable }));
  const badge = p => { const g = p.tags || []; if (g.includes('dubai-chocolate')) return `<span class="badge lime">${t.badge.dubai}</span>`; if (g.includes('swedish-candy')) return `<span class="badge">${t.badge.swedish}</span>`; if (g.includes('sugar-free')) return `<span class="badge">${t.badge.sugar}</span>`; if (g.includes('spicy')) return `<span class="badge red">${t.badge.spicy}</span>`; return ''; };
  function card(p, opt = {}) {
    const url = u(`/product/${p.slug}/`);
    let buy;
    if (!p.orderable) buy = `<div class="buy each"><a class="add ask" href="${u('/stores/')}">${t.askInStore}</a></div>`;
    else if (p.sellBy === 'weight') buy = `<div class="buy"><div class="wts" role="group" aria-label="${t.amount}"><button type="button" data-u="1" aria-pressed="false">¼</button><button type="button" data-u="2" aria-pressed="true">½</button><button type="button" data-u="4" aria-pressed="false">${loc('1 lb')}</button></div><button type="button" class="add" data-add aria-label="${esc(t.addAria(p.name))}">${t.add}</button></div>`;
    else buy = `<div class="buy each"><button type="button" class="add" data-add aria-label="${esc(t.addAria(p.name))}">${t.addToBag}</button></div>`;
    const pr = p.priceCents != null ? `<span class="price">${moneyShort(p.priceCents)}</span><small>${esc(unitTail(p))}</small>` : `<span class="ask">${t.priceInStore}</span>`;
    return `<article class="card" data-p="${pjson(p)}" data-sub="${esc(opt.chip ? opt.chip(p) : p.sub)}" data-o="${p.order}"><a class="ph" href="${url}" tabindex="-1" aria-hidden="true">${badge(p)}<img src="${img(p.img)}" alt="" width="640" height="640" loading="${opt.eager ? 'eager' : 'lazy'}" decoding="async"></a><div class="bd"><span class="sub">${esc(opt.showCat ? catName(catById[p.category]) : subName(p.sub))}</span><a class="nm" href="${url}" dir="auto">${esc(p.name)}</a><div class="pr">${pr}</div>${buy}</div></article>`;
  }

  /* ---------- layout ---------- */
  const STORES_JS = JSON.stringify({ tz: cat.settings.pickup.timeZone, stores: S.map(s => ({ id: s.id, name: storeName(s), hours: s.hours, closures: s.closures || [] })) });
  const CLIENT_T = JSON.stringify(ar ? {
    lang: 'ar', cats: Object.fromEntries(Object.entries(AR.cats).map(([k, v]) => [k, v[0]])), subs: AR.subs, stores: AR.stores,
    added: 'أُضيف', addedOk: 'أُضيف ✓', empty: 'سلتك فارغة.', emptyP: 'اختر أي صنف من ربع رطل أو بالقطعة.', startShopping: 'ابدأ التسوق', remove: 'إزالة', inMix: 'في كيس الخلطة', less: 'أقل', more: 'أكثر',
    mixNote: 'اختر <b>في كيس الخلطة</b> لنزن هذه الأصناف معاً في كيس واحد. يبقى كل صنف بسعره.', loading: 'جارٍ تحميل المتجر…', loadFail: 'تعذّر تحميل المتجر. تحقق من الاتصال وحاول مجدداً.',
    match1: 'نتيجة واحدة', matches: '{0} نتيجة', noHits: 'لا يوجد صنف باسم “{0}” على الموقع بعد. في المحلات أصناف أكثر من الموقع، فاتصل بنا.', priceInStore: 'السعر في المحل',
    openUntil: 'مفتوح الآن · حتى {0}', opensToday: 'يفتح اليوم الساعة {0}', opensTomorrow: 'مغلق · يفتح غداً الساعة {0}', closedToday: 'مغلق اليوم', item: 'صنف', items: 'أصناف', storeSet: 'الاستلام من <b>{0}</b>',
    // checkout
    checkout: 'إتمام الطلب', coEmpty: 'سلتك فارغة', coEmptyP: 'أضف شيئاً أولاً ثم عُد إلى هنا.', mixedBag: 'كيس خلطة', chooseShop: 'اختر الفرع أولاً.', noTimes: 'لم تعد هناك أوقات استلام متاحة في هذا الفرع الآن. اختر الفرع الآخر أو اتصل بنا.',
    asap: 'بأسرع وقت', asapS: '{0} من الساعة {1} (نحتاج نحو {2} دقيقة)', today: 'اليوم', tomorrow: 'غداً', pickTime: 'اختر وقتاً', pickTimeS: 'اليوم أو غداً، حتى آخر موعد استلام', closedTag: ' · مغلق',
    hoursLine: 'مفتوح {0}–{1} · آخر استلام {2}', almost: 'بقي القليل:', needStoreTime: 'اختر الفرع ووقت الاستلام.', needStore: 'اختر الفرع الذي سنوصل منه.', needName: 'أضف الاسم على الطلب.', needPhone: 'أضف رقم موبايل نتصل به إذا نفد صنف ما.',
    needQuote: 'أدخل العنوان واختر سعر التوصيل.', checking: 'نتحقق من الأسعار والوقت…', place: 'أرسل الطلب', noReach: 'تعذّر الوصول إلى نظام المحل الآن. تحقق من الاتصال وحاول مجدداً، أو اتصل بالمحل.',
    fixFirst: 'يرجى إصلاح هذا أولاً:', priceChanged: 'تغيّرت الأسعار منذ أضفت هذه الأصناف. مجموعك الجديد {0}.', lastStep: 'الخطوة الأخيرة', sendTo: 'أرسل الطلب إلى فرع {0}',
    checkedP: 'تم التحقق من طلبك: الأسعار ووقت الاستلام ({0}) مؤكدة. الدفع أونلاين غير مفعّل بعد، فأرسل الطلب إلى المحل وادفع عند الاستلام.', checkedD: 'تم التحقق من طلبك وأسعاره. الدفع أونلاين غير مفعّل بعد، فأرسل الطلب إلى المحل: سيؤكد معك ويحجز المندوب ({0}). تدفع ثمن الطلب ورسوم التوصيل عند التأكيد.',
    call: 'اتصل بفرع {0} · {1}', copy: 'انسخ الطلب', copied: 'تم النسخ ✓', copyFail: 'حدّد النص أعلاه لنسخه', ig: 'أرسله على إنستغرام (الصقه)', nothingCharged: 'لا يُدفع أي مبلغ أونلاين. قد يختلف المخزون بين فرعينا، وسنتصل بك إذا نفد شيء.',
    loadErr: 'تعذّر تحميل المتجر. تحقق من الاتصال وأعد تحميل الصفحة.', getQuotes: 'اعرض أسعار التوصيل', gettingQuotes: 'نسأل DoorDash وUber…', delivFee: 'التوصيل', delivOff: '<b>التوصيل قيد الإعداد.</b> سيعمل DoorDash وUber هنا قريباً. اختر الاستلام الآن، أو اتصل بالمحل.',
    needAddr: 'أدخل الشارع والمدينة والرمز البريدي المكوّن من 5 أرقام ورقم موبايل أمريكي.', noQuotes: 'لم يُعطِ أي مندوب سعراً لهذا العنوان. تأكد من العنوان، أو اختر الاستلام.', eta: 'يصل نحو {0}', quoteNote: 'أسعار مباشرة من {0}. يؤكد المحل الطلب ويحجز المندوب قبل أن يُدفع أي شيء.',
    readyCourier: 'جاهز للمندوب من الساعة {0} اليوم', delivTo: 'التوصيل إلى', courier: 'المندوب',
    pickupErr: { missing: 'اختر الفرع ووقت الاستلام.', store: 'اختر أحد فرعينا.', invalid: 'وقت الاستلام غير صالح. اختره مجدداً.', closed: 'الفرع مغلق في ذلك اليوم. اختر يوماً آخر.', late: 'هذا بعد آخر موعد استلام. اختر وقتاً أبكر.', passed: 'مضى وقت الاستلام هذا. اختر وقتاً جديداً.', gone: 'لم يعد هذا الوقت متاحاً. اختر وقتاً آخر.', closedNow: 'لم يعد الفرع يستقبل طلبات توصيل اليوم. اختر الاستلام غداً، أو الفرع الآخر.' },
    itemErr: 'مشكلة في أحد الأصناف:'
  } : { lang: 'en' });
  function layout({ p: pth, title, desc, body, page = '', scripts = [], ld = null, intro = false, ogImg = '/img/p/cashews-seasoned.webp' }) {
    const url = SITE + u(pth);
    const nav = [['/shop/', t.nav.shop], ['/shop/dubai-chocolate/', t.nav.dubai, 'hot'], ['/shop/swedish-candy/', t.nav.swedish], ['/stores/', t.nav.stores], ['/about/', t.nav.about]];
    const cur = h => (h === '/shop/' ? pth === '/shop/' || (pth.startsWith('/shop/') && !nav.some(n => n[0] !== '/shop/' && pth.startsWith(n[0]))) || pth.startsWith('/product/') : pth.startsWith(h)) ? ' aria-current="page"' : '';
    return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noai, noimageai">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${SITE}${pth}"><link rel="alternate" hreflang="ar" href="${SITE}/ar${pth}">
<meta name="theme-color" content="#9bd40c">
<meta property="og:type" content="website"><meta property="og:site_name" content="Nuts Now"><meta property="og:locale" content="${ar ? 'ar_AR' : 'en_US'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}${ogImg}">
<link rel="icon" href="/img/logo-hd.webp" type="image/webp"><link rel="apple-touch-icon" href="/img/logo-hd.webp">
${ar ? '<link rel="preload" href="/assets/fonts/cairo-arabic.woff2" as="font" type="font/woff2" crossorigin>' : '<link rel="preload" href="/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>'}
<link rel="stylesheet" href="/css/site.css?v=${V.css}">
<script>try{var x=JSON.parse(sessionStorage.getItem('nn-tx'));if(x&&Date.now()-x.t<8000&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('nn-tx');var l=document.createElement('link');l.rel='preload';l.as='image';l.href='/img/tx/pieces.webp';document.head.appendChild(l)}}catch(e){}</script>
${intro ? `<script>try{if(!sessionStorage.getItem('nn-intro')&&!location.hash&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('nn-intro-on')}catch(e){}</script>` : ''}
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="${page}">
<a class="skip" href="#main">${t.skip}</a>
${intro ? `<div class="nn-intro" id="intro" aria-hidden="true"><div class="in-glow"></div><div class="in-logo"><img src="/img/logo-hd.webp" alt="" width="720" height="720"><i class="in-sheen"></i></div><button type="button" class="in-skip">${t.skipIntro}</button></div>` : ''}
<div class="topbar"><div class="wrap"><span class="tb-x">${t.topbar}</span><button type="button" class="store-switch" data-open="storeSheet">${I.store}<span>${ar ? 'الاستلام من' : 'Pickup at'} <b data-store-name>${esc(storeName(S[0]))}</b></span><span aria-hidden="true">▾</span></button><a class="lang" href="${alt(pth)}" hreflang="${t.other}" lang="${t.other}" aria-label="${esc(t.otherAria)}">${I.globe}<span>${t.otherLabel}</span></a></div></div>
<header class="hdr"><div class="wrap">
  <a class="logo" href="${u('/')}" aria-label="Nuts Now"><img src="/img/logo-hd.webp" alt="" width="46" height="46"><span><b>${ar ? 'نَتس ناو' : 'Nuts Now'}</b><small>${t.tagline}</small></span></a>
  <nav class="nav" aria-label="Main">${nav.map(([h, l, c]) => `<a href="${u(h)}"${c ? ` class="${c}"` : ''}${cur(h)}>${l}</a>`).join('')}</nav>
  <div class="hdr-act">
    <button type="button" class="icon-btn" data-open="searchSheet" aria-label="${t.search}">${I.search}</button>
    <button type="button" class="btn btn-lime bag-btn" data-open="bagSheet" aria-label="${t.openBag}">${I.bag}<span class="t">${t.bag}</span><b data-bag-count>0</b></button>
    <button type="button" class="icon-btn menu-btn" data-open="menuSheet" aria-label="${t.menu}">${I.menu}</button>
  </div>
</div></header>
<main id="main">
${body}
</main>
${footer()}
${sheets(pth)}
<div class="bagbar" aria-live="polite"><div class="bb-t"><small class="bb-n">0</small><b class="bb-c">$0.00</b></div><button type="button" class="btn btn-line btn-s" data-open="bagSheet" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)">${t.viewBag}</button><a class="btn btn-lime btn-s" href="${u('/checkout/')}">${t.checkout}</a></div>
<script>window.NN_STORES=${STORES_JS};window.NN_T=${CLIENT_T};window.NN_PF=${JSON.stringify(PF)}</script>
<script src="/js/order-core.js?v=${V.core}"></script>
<script src="/js/site.js?v=${V.site}"></script>
<script src="/js/transition.js?v=${V.tx}"></script>
${scripts.map(s => `<script src="/js/${s}.js?v=${V[s === 'checkout' ? 'co' : s]}"></script>`).join('\n')}
</body>
</html>
`;
  }
  function footer() {
    return `<footer class="ftr"><div class="wrap">
  <div class="cols">
    <div><div class="brand"><img src="/img/logo-hd.webp" alt="" width="56" height="56" loading="lazy"><span><b>${ar ? 'نَتس ناو' : 'Nuts Now'}</b><small>${t.taglineBang}</small></span></div>
      <p>${t.foot.about}</p>
      <div class="socials"><a href="${IG}" aria-label="Instagram" rel="noopener" target="_blank">${I.ig}</a><a href="${TT}" aria-label="TikTok" rel="noopener" target="_blank">${I.tt}</a><a href="${FB}" aria-label="Facebook" rel="noopener" target="_blank">${I.fb}</a></div></div>
    ${S.map(s => `<div><h4>${esc(storeName(s))}</h4><p dir="ltr" style="text-align:start">${s.address.map(esc).join('<br>')}</p><p>${esc(hoursSummary(s))}</p><p><a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phoneLabel)}</a> · <a href="${dirLink(s)}" rel="noopener" target="_blank">${t.visit.directions}</a></p></div>`).join('')}
    <div><h4>${t.foot.shop}</h4><ul>${CATS.slice(0, 6).map(c => `<li><a href="${u(`/shop/${c.id}/`)}">${esc(catName(c))}</a></li>`).join('')}<li><a href="${u('/shop/')}">${t.foot.everything}</a></li></ul></div>
  </div>
  <div class="legal"><span>© ${new Date().getFullYear()} ${ar ? 'نَتس ناو · ألن بارك وديربورن هايتس، ميشيغان' : 'Nuts Now · Allen Park &amp; Dearborn Heights, Michigan'} · ${t.foot.prices(t.month)}</span><span><a href="${u('/about/')}">${t.aboutContact}</a> · <a href="${u('/credits/')}">${t.foot.credits}</a> · <a href="${alt('/')}" lang="${t.other}">${t.otherLabel}</a></span></div>
</div></footer>`;
  }
  function sheets(pth) {
    const tiles = [...COLS.slice(0, 2).map(c => ({ href: u(`/shop/${c.id}/`), name: colName(c), k: CAT_IMG[c.id] })), ...CATS.map(c => ({ href: u(`/shop/${c.id}/`), name: catName(c), k: CAT_IMG[c.id] }))].slice(0, 12);
    return `<div class="sheet" id="menuSheet" aria-hidden="true" role="dialog" aria-label="${t.menu}"><div class="scrim"></div><div class="menu">
  <div class="m-top"><a class="logo" href="${u('/')}"><img src="/img/logo-hd.webp" alt="" width="42" height="42"><span><b>${ar ? 'نَتس ناو' : 'Nuts Now'}</b></span></a><button type="button" class="icon-btn" data-close aria-label="${t.close}">${I.x}</button></div>
  <div class="m-cats">${tiles.map(c => `<a href="${c.href}"><img src="${img(c.k)}" alt="" width="120" height="120" loading="lazy">${esc(c.name)}</a>`).join('')}</div>
  <div class="m-links"><a href="${u('/shop/')}">${t.shopEverything} ${I.arrow}</a><a href="${u('/stores/')}">${t.storesHours} ${I.arrow}</a><a href="${u('/about/')}">${t.aboutContact} ${I.arrow}</a><a href="${alt(pth)}" lang="${t.other}">${I.globe} ${t.otherLabel} ${I.arrow}</a></div>
  <div class="m-call">${S.map(s => `<a class="btn btn-line btn-s" href="tel:${esc(s.phone)}">${I.phone} ${esc(storeName(s))}</a>`).join('')}</div>
</div></div>
<div class="sheet" id="searchSheet" aria-hidden="true" role="dialog" aria-label="${t.search}"><div class="scrim"></div><div class="search">
  <div class="s-field">${I.search}<label class="sr" for="searchInput">${t.search}</label><input id="searchInput" type="search" placeholder="${esc(t.searchPh(P.length))}" autocomplete="off" enterkeyhint="search"><button type="button" class="icon-btn" data-close aria-label="${t.close}">${I.x}</button></div>
  <div class="s-res" id="searchRes"></div>
  <template id="searchHint"><p class="s-hint">${t.searchTry}</p><div class="s-chips">${t.searchHints.map(h => `<button type="button" class="chip" data-q="${esc(h)}" dir="auto">${esc(h)}</button>`).join('')}</div></template>
</div></div>
<div class="sheet" id="storeSheet" aria-hidden="true" role="dialog" aria-label="${ar ? 'اختر فرع الاستلام' : 'Choose your pickup shop'}"><div class="scrim"></div><div class="menu picker">
  <div class="m-top"><h2 class="h3">${ar ? 'من أي فرع تستلم؟' : 'Where will you pick up?'}</h2><button type="button" class="icon-btn" data-close aria-label="${t.close}">${I.x}</button></div>
  <div class="opts">${S.map(s => `<label class="opt"><input type="radio" name="pickstore" value="${s.id}"><span><b>${esc(storeName(s))}</b><small dir="ltr" style="display:block;text-align:start">${esc(s.address.join(', '))}</small><small data-status="${s.id}"><i class="dot"></i> <span data-st-text>${esc(hoursSummary(s))}</span></small></span></label>`).join('')}</div>
  <p class="muted" style="font-size:13.5px;margin-top:12px">${ar ? 'يمكنك تغيير الفرع، أو اختيار التوصيل، عند إتمام الطلب.' : 'You can change it, or choose delivery, at checkout.'}</p>
</div></div>
<div class="sheet" id="bagSheet" aria-hidden="true" role="dialog" aria-label="${t.yourBag}"><div class="scrim"></div><div class="drawer">
  <div class="d-h"><h2 class="h3">${t.yourBag}</h2><button type="button" class="icon-btn" data-close aria-label="${t.close}">${I.x}</button></div>
  <div class="d-b" id="bagBody"></div>
  <div class="d-f" id="bagFoot" hidden><button type="button" class="bag-store" data-open="storeSheet">${I.store}<span>${ar ? 'الاستلام من' : 'Pickup at'} <b data-store-name>${esc(storeName(S[0]))}</b></span><span class="muted">${ar ? 'تغيير' : 'Change'}</span></button><div class="sumrow"><span>${t.subtotal}</span><b id="bagTotal">$0.00</b></div><a class="btn btn-lime" href="${u('/checkout/')}">${t.checkoutPickup} ${I.arrow}</a><p class="fine">${t.bagFine}</p></div>
</div></div>`;
  }

  /* ---------- pieces ---------- */
  const storePill = s => `<a class="store-pill" href="${dirLink(s)}" target="_blank" rel="noopener" data-status="${s.id}">${I.pin}<b>${esc(storeName(s))}</b><i class="dot"></i><i data-st-text>${esc(hoursSummary(s))}</i></a>`;
  const storeCard = (s, big) => `<div class="store"><span class="tag">${esc(storeTag(s) || '')}</span><h3 class="h3">${esc(storeName(s))}</h3>
  <address dir="ltr" style="text-align:start">${s.address.map(esc).join('<br>')}</address>
  <div class="status" data-status="${s.id}"><i class="dot"></i><span data-st-text>${esc(hoursSummary(s))}</span></div>
  ${REV && REV.stores && REV.stores[s.id] ? `<a class="g-rate" href="${esc(REV.stores[s.id].url)}" target="_blank" rel="noopener"><span class="stars" aria-hidden="true">★★★★★</span> <b>${esc(REV.stores[s.id].rating)}</b> ${t.rev.on} · ${REV.stores[s.id].count.toLocaleString('en-US')} ${t.hero.reviews}</a>` : ''}
  ${big ? `<table class="hours">${[1, 2, 3, 4, 5, 6, 0].map(d => `<tr data-dow="${d}"><td>${t.days[d]}</td><td>${s.hours[d] ? `${clock(s.hours[d].open)} – ${clock(s.hours[d].close)}` : t.closed}</td></tr>`).join('')}</table>
  <p class="muted" style="font-size:14px">${t.lastPickup}: ${esc(clock(s.hours[1].lastPickup || s.hours[1].close))}${s.hours[0] && s.hours[0].lastPickup !== s.hours[1].lastPickup ? ` (${t.sunday} ${esc(clock(s.hours[0].lastPickup || s.hours[0].close))})` : ''}.</p>` : `<p class="muted" style="font-size:14.5px">${esc(hoursSummary(s))}</p>`}
  <div class="acts"><a class="btn btn-black btn-s" href="${dirLink(s)}" target="_blank" rel="noopener">${I.pin} ${t.visit.directions}</a><a class="btn btn-line btn-s" href="tel:${esc(s.phone)}" dir="ltr">${I.phone} ${esc(s.phoneLabel)}</a>
  ${['doordash', 'ubereats'].map(k => DEL[k] && DEL[k].storeUrls && DEL[k].storeUrls[s.id] ? `<a class="btn btn-line btn-s" href="${esc(DEL[k].storeUrls[s.id])}" target="_blank" rel="noopener">${k === 'doordash' ? 'DoorDash' : 'Uber Eats'}</a>` : '').join('')}</div></div>`;
  const aisleTiles = () => `<div class="aisles">${[...COLS.slice(0, 2).map(c => ({ href: u(`/shop/${c.id}/`), name: colName(c), n: c.count, k: CAT_IMG[c.id], tag: c.id === 'dubai-chocolate' ? t.aisles.viral : t.aisles.new })), ...CATS.map(c => ({ href: u(`/shop/${c.id}/`), name: catName(c), n: c.count, k: CAT_IMG[c.id] }))].map(c => `<a class="aisle" href="${c.href}"><span class="ph"><img src="${img(c.k)}" alt="" width="320" height="320" loading="lazy">${c.tag ? `<span class="tag">${c.tag}</span>` : ''}</span><b>${esc(c.name)}</b><small>${t.items(c.n)}</small></a>`).join('')}</div>`;
  // homepage: broad aisle tiles (photo grid) with shortcut chips into the busiest sub-aisles
  const DEPT_SIZE = { 'nuts-seeds': 'big', candy: 'wide', spices: 'wide', pantry: 'wide' };
  const deptTiles = () => `<div class="depts">${CATS.map(c => {
    const size = DEPT_SIZE[c.id] || '', subs = size ? [...P.filter(p => p.category === c.id).reduce((m, p) => m.set(p.sub, (m.get(p.sub) || 0) + 1), new Map())].sort((x, y) => y[1] - x[1]).slice(0, size === 'big' ? 4 : 3) : [];
    return `<div class="dept ${size}"><a class="dept-main" href="${u(`/shop/${c.id}/`)}"><img src="${img(CAT_IMG[c.id])}" alt="" width="640" height="640" loading="lazy"><span class="dept-tx"><b>${esc(catName(c))}</b><small>${t.items(c.count)}</small></span><span class="dept-go" aria-hidden="true">${I.arrow}</span></a>${subs.length ? `<div class="dept-subs">${subs.map(([sb, n]) => `<a href="${u(`/shop/${c.id}/`)}?type=${encodeURIComponent(sb)}">${esc(subName(sb))} <small>${n}</small></a>`).join('')}</div>` : ''}</div>`;
  }).join('')}</div>`;
  // homepage: four big shortcuts right under the hero
  const quickNav = () => `<nav class="qnav" aria-label="${esc(t.qs.label)}">${[
    [u('/shop/nuts-seeds/'), t.qn.nuts, t.qn.nutsS, img('cashews-seasoned')],
    [u('/shop/dubai-chocolate/'), t.qn.dubai, t.qn.dubaiS, img('dubai-chocolate')],
    [u('/shop/swedish-candy/'), t.qn.swedish, t.qn.swedishS, img('swedish-skulls')],
    [u('/stores/'), t.qn.stores, t.qn.storesS, null]
  ].map(([h, ti, sub, ph]) => `<a class="qn" href="${h}"><span class="qn-ph">${ph ? `<img src="${ph}" alt="" width="96" height="96" loading="lazy">` : I.pin}</span><span class="qn-tx"><b>${ti}</b><small>${sub}</small></span>${I.arrow}</a>`).join('')}</nav>`;
  // homepage: quick shop, one tab per aisle, eight things you can add right here
  const quickShop = feat => {
    const pick = items => { const seen = new Set(), a = [], b = []; items.forEach(p => (seen.has(p.img) ? b : (seen.add(p.img), a)).push(p)); return [...a, ...b].slice(0, 8); };
    const tabs = [{ id: 'popular', name: t.qs.popular, items: feat.slice(0, 8), href: u('/shop/'), n: nOrder, cname: t.shop.title }, ...CATS.map(c => ({ id: c.id, name: catName(c), items: pick(P.filter(p => p.category === c.id && p.orderable)), href: u(`/shop/${c.id}/`), n: c.count, cname: catName(c) }))].filter(x => x.items.length);
    return `<div class="qs-tabs chips" role="tablist" aria-label="${esc(t.qs.label)}">${tabs.map((x, i) => `<button type="button" class="chip" role="tab" id="qs-t-${x.id}" aria-controls="qs-p-${x.id}" aria-selected="${!i}" tabindex="${i ? -1 : 0}">${esc(x.name)}</button>`).join('')}</div>
  ${tabs.map((x, i) => `<div class="qs-panel" role="tabpanel" id="qs-p-${x.id}" aria-labelledby="qs-t-${x.id}"${i ? ' hidden' : ''}><div class="scroller">${x.items.map(p => card(p, { showCat: x.id === 'popular' })).join('')}</div><p class="qs-all"><a class="btn btn-black" href="${x.href}">${esc(t.qs.all(x.n, x.cname))} ${I.arrow}</a></p></div>`).join('')}`;
  };
  const ratingLine = () => REV && REV.rating ? `<span><span class="stars" aria-hidden="true">★★★★★</span> <b>${esc(REV.rating.value)}</b> ${t.hero.onGoogle} · ${esc(REV.rating.count)} ${t.hero.reviews}</span>` : '';
  const orgLd = () => ({ '@context': 'https://schema.org', '@graph': S.map(s => ({ '@type': 'Store', name: `Nuts Now ${s.name}`, image: SITE + '/img/logo-hd.webp', telephone: s.phoneLabel, url: SITE + '/stores/', address: { '@type': 'PostalAddress', streetAddress: s.address[0], addressLocality: s.address[1].split(',')[0], addressRegion: 'MI', postalCode: (s.address[1].match(/\d{5}/) || [''])[0], addressCountry: 'US' }, ...(REV && REV.stores && REV.stores[s.id] ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: REV.stores[s.id].rating, reviewCount: REV.stores[s.id].count } } : {}), openingHoursSpecification: [0, 1, 2, 3, 4, 5, 6].filter(d => s.hours[d]).map(d => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: T.en.days[d], opens: s.hours[d].open, closes: s.hours[d].close })) })) });
  const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([h, l], i) => h ? `<a href="${u(h)}">${esc(l)}</a>` : `<span>${esc(l)}</span>`).join('')}</nav>`;

  // HOME
  {
    const feat = cat.featured.map(id => byId[id]).filter(p => p && p.orderable);
    const dubai = P.filter(p => inCol(p, 'dubai-chocolate') && p.orderable).slice(0, 6);
    const nuts = ['nn-c0510', 'nn-c0599', 'nn-c0572', 'nn-c0513'].map(id => byId[id]).filter(Boolean);
    const cashewN = count(p => p.sub === 'Cashews'), almondN = count(p => p.sub === 'Almonds'), nutsN = count(p => p.category === 'nuts-seeds');
    const body = `
<section class="hero">
  <div class="atmo" id="atmo" aria-hidden="true"></div>
  <div class="rline" id="line" aria-hidden="true"></div>
  <div class="wrap">
    <div class="hcopy">
      <span class="script">${t.taglineBang}</span>
      <h1 class="h1">${t.hero.h1}</h1>
      <p class="lede">${t.hero.lede(nOrder, cashewN)}</p>
      <div class="cta"><a class="btn btn-lime" href="${u('/shop/')}">${t.hero.start} ${I.arrow}</a><a class="btn btn-black" href="${u('/stores/')}">${I.pin} ${t.hero.find}</a></div>
      <div class="proof">${ratingLine()}<span>${t.hero.roasted}</span><span>${t.hero.ready}</span><span>${I.truck} DoorDash · Uber</span></div>
      <a class="shopall" href="${u('/shop/')}"><span class="sa-ph" aria-hidden="true">${['cashews', 'gummy-bears', 'dubai-chocolate', 'dried-mango'].map(k => `<img src="${img(k)}" alt="" width="46" height="46">`).join('')}</span><span class="sa-tx"><b>${t.sa.h}</b><small>${t.sa.s(nOrder, CATS.length)}</small></span><span class="sa-go" aria-hidden="true">${I.arrow}</span></a>
    </div>
    <div class="stage" aria-label="${t.hero.stageAria}" role="img">
      <div class="rbox"><i class="at-warm" aria-hidden="true"></i><i class="occ"></i><video class="roaster" id="roastVid" muted loop playsinline preload="metadata" poster="/img/roaster-poster.webp" width="768" height="912" aria-hidden="true"><source src="/img/roaster.webm" type="video/webm"><source src="/img/roaster.mp4" type="video/mp4"></video></div>
      <p class="stage-cap"><b>${t.hero.roastingNow}</b> · ${esc(storeName(S[0]))}</p>
    </div>
  </div>
</section>

<div class="wrap qnav-wrap">${quickNav()}</div>

<section class="sec" style="padding-top:clamp(28px,3.4vw,44px)"><div class="wrap">
  <div class="sec-h"><div><h2 class="h2">${t.aisles.h}</h2></div><a class="more" href="${u('/shop/')}">${t.aisles.all}</a></div>
  ${deptTiles()}
</div></section>

<section class="sec qshop" style="padding-top:0"><div class="wrap">
  <div class="sec-h"><div><h2 class="h2">${t.qs.h}</h2><p class="muted" style="margin-top:6px">${t.qs.p}</p></div></div>
  ${quickShop(feat)}
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="spot rv"><div class="ph"><img src="${img('dubai-chocolate')}" alt="${esc(t.dubai.alt)}" width="640" height="640" loading="lazy"></div>
  <div class="tx"><h2 class="h2">${t.dubai.h}</h2>
  <p class="lede">${t.dubai.lede(COLS[0].count)}</p>
  <ul>${dubai.map(p => `<li><a href="${u(`/product/${p.slug}/`)}" dir="auto">${esc(p.name)}</a><b>${moneyShort(p.priceCents)} <small style="font:500 12px var(--body);color:#c9c7b8">${esc(unitTail(p))}</small></b></li>`).join('')}</ul>
  <a class="btn btn-lime" href="${u('/shop/dubai-chocolate/')}">${t.dubai.cta} ${I.arrow}</a></div></div>
</div></section>

<section class="band sec"><div class="wrap">
  <div class="sec-h"><div><h2 class="h2">${t.roast.h}</h2>
  <div class="stats"><div><b>${cashewN}</b><span>${t.roast.cashews}</span></div><div><b>${almondN}</b><span>${t.roast.almonds}</span></div><div><b>${nutsN}</b><span>${t.roast.nuts}</span></div></div></div>
  <a class="more" href="${u('/shop/nuts-seeds/')}">${t.roast.all}</a></div>
  <div class="grid">${nuts.map(p => card(p)).join('')}</div>
</div></section>

${REV && REV.quotes && REV.quotes.length ? `
<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="sec-h"><div><div class="rating"><span class="big">${esc(REV.rating.value)}</span><div><span class="stars" aria-label="${esc(REV.rating.value)}">★★★★★</span><p class="muted" style="margin:0">${ar ? `على غوغل · ${REV.stores.ap.count.toLocaleString('en-US')} تقييم في ألن بارك و${REV.stores.dh.count} في ديربورن هايتس` : esc(REV.rating.label)}</p></div></div></div>${REV.rating.url ? `<a class="more" href="${esc(REV.rating.url)}" target="_blank" rel="noopener">${t.rev.read}</a>` : ''}</div>
  <div class="quotes">${REV.quotes.map(q => `<figure class="quote" lang="en" dir="ltr"><span class="stars" aria-hidden="true">${'★'.repeat(q.stars || 5)}</span><p>“${esc(q.text)}”</p><footer><b>${esc(q.name)}</b><span>${esc(q.site)} · ${esc(q.store)}</span></footer></figure>`).join('')}</div>
</div></section>` : ''}
<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="sec-h"><div><h2 class="h2">${t.visit.h}</h2></div><a class="more" href="${u('/stores/')}">${t.visit.more}</a></div>
  <div class="store-cards">${S.map(s => storeCard(s, false)).join('')}</div>
</div></section>`;
    write(PF.slice(1) + (PF ? '/' : '') + 'index.html', layout({ p: '/', page: 'pg-home', intro: true, scripts: ['home'], ld: orgLd(), title: t.title.home, desc: t.desc.home(nOrder), body }));
  }

  // SHOP INDEX
  {
    const rails = CATS.map(c => { const items = P.filter(p => p.category === c.id && p.orderable); const subs = [...new Set(items.map(p => p.sub))]; const pick = []; for (let r = 0; pick.length < 8 && r < 8; r++) subs.forEach(s => { const x = items.filter(p => p.sub === s)[r]; if (x && pick.length < 8) pick.push(x); }); return `<div class="subhead" id="${c.id}"><h2 class="h3">${esc(catName(c))}</h2><small>${t.items(c.count)}</small><a class="more" href="${u(`/shop/${c.id}/`)}" style="margin-inline-start:auto">${t.shop.seeAll}</a></div><div class="scroller">${pick.map(p => card(p)).join('')}</div>`; }).join('');
    const body = `<div class="wrap page-h">${crumbs([['/', t.shop.home], [null, t.shop.title]])}
  <h1 class="h1">${t.shop.title}</h1><p class="lede">${t.shop.lede(P.length, CATS.length, nOrder)}</p>
  <p style="margin-top:18px"><button type="button" class="btn btn-line" data-open="searchSheet" style="min-width:min(100%,420px);justify-content:flex-start;color:var(--muted)">${I.search} ${t.shop.searchBtn}</button></p></div>
  <section class="wrap" style="padding-bottom:10px">${aisleTiles()}</section>
  <section class="wrap" style="padding-bottom:70px">${rails}</section>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}shop/index.html`, layout({ p: '/shop/', page: 'pg-shop', title: t.title.shop(P.length), desc: t.desc.shop(P.length, nOrder), body }));
  }

  // AISLE + COLLECTION PAGES
  function listPage({ id, name, description, items, chipsBy, chipLabel }) {
    const groups = [...new Set(items.map(chipsBy))];
    const sorted = [...items].sort((a, b) => (a.orderable === b.orderable ? a.order - b.order : a.orderable ? -1 : 1));
    const body = `<div class="wrap page-h">${crumbs([['/', t.shop.home], ['/shop/', t.shop.title], [null, name]])}
    <div class="cat-hero"><div><h1 class="h1">${esc(name)}</h1><p class="lede">${esc(description)}</p></div><div class="ph"><img src="${img(CAT_IMG[id])}" alt="" width="280" height="280"></div></div></div>
  <div class="toolbar"><div class="wrap"><div class="chips" role="group" aria-label="${t.list.filter}">${[['', t.list.all, items.length], ...groups.map(g => [g, chipLabel(g), items.filter(p => chipsBy(p) === g).length])].map(([v, l, n]) => `<button type="button" class="chip" data-sub="${esc(v)}" aria-pressed="${v === ''}">${esc(l)} <small>${n}</small></button>`).join('')}</div>
    <label class="sr" for="sort">${t.list.sort}</label><select class="sort" id="sort"><option value="o">${t.list.popular}</option><option value="price">${t.list.low}</option><option value="price-d">${t.list.high}</option><option value="name">${t.list.az}</option></select></div></div>
  <section class="wrap" style="padding-bottom:70px"><p class="count" id="pcount">${t.items(items.length)}</p><div class="grid five" id="plist">${sorted.map((p, i) => card(p, { eager: i < 4, showCat: chipsBy !== subOf, chip: chipsBy })).join('')}</div>
  ${items.some(p => !p.orderable) ? `<p class="muted" style="margin-top:22px;font-size:14px">${t.list.inStoreNote}</p>` : ''}</section>`;
    return layout({ p: `/shop/${id}/`, page: 'pg-list', title: `${name} | ${ar ? 'نَتس ناو' : 'Nuts Now · Allen Park & Dearborn Heights'}`, desc: description, body, ogImg: img(CAT_IMG[id]) });
  }
  const subOf = p => p.sub;
  CATS.forEach(c => write(`${PF.slice(1)}${PF ? '/' : ''}shop/${c.id}/index.html`, listPage({ id: c.id, name: catName(c), description: catDesc(c), items: P.filter(p => p.category === c.id), chipsBy: subOf, chipLabel: subName })));
  COLS.forEach(c => write(`${PF.slice(1)}${PF ? '/' : ''}shop/${c.id}/index.html`, listPage({ id: c.id, name: colName(c), description: colDesc(c), items: P.filter(p => inCol(p, c.id)), chipsBy: p => p.category, chipLabel: g => catName(catById[g]) })));

  // PRODUCT PAGES
  P.forEach(p => {
    const c = catById[p.category];
    const sib = P.filter(x => x.id !== p.id && x.sub === p.sub && x.orderable).slice(0, 8);
    const more = sib.length >= 4 ? sib : [...sib, ...P.filter(x => x.id !== p.id && x.category === p.category && x.sub !== p.sub && x.orderable).slice(0, 8 - sib.length)];
    const weight = p.sellBy === 'weight', start = weight ? 2 : 1;
    const qty = p.orderable ? `<div class="qty-box"><label>${weight ? t.pdp.howMuch : t.pdp.howMany}</label>
    ${weight ? `<div class="wts" role="group" aria-label="${t.pdp.quick}">${[[1, '¼ lb'], [2, '½ lb'], [4, '1 lb'], [8, '2 lb']].map(([n, l]) => `<button type="button" data-u="${n}" aria-pressed="${n === start}">${loc(l)}</button>`).join('')}</div>` : ''}
    <div class="stepper"><button type="button" data-q-step="-1" aria-label="${t.pdp.less}">−</button><output id="qtyOut" aria-live="polite">${esc(loc(N.fmtQty(p, start)))}</output><button type="button" data-q-step="1" aria-label="${t.pdp.more}">+</button><span hidden data-units="${start}"></span></div>
    <div class="total"><div><small>${weight ? t.pdp.weighed : t.pdp.youPay}</small>${esc(loc(N.priceLabel(p)))}</div><b id="qtyTotal">${money(N.lineCents(p, start))}</b></div>
    <button type="button" class="btn btn-lime addbig" data-add>${t.addToBag} ${I.bag}</button></div>`
      : `<div class="notice ok" style="margin-top:20px">${t.pdp.inStore}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${S.map(s => `<a class="btn btn-line btn-s" href="tel:${esc(s.phone)}">${I.phone} ${esc(storeName(s))}</a>`).join('')}</div>`;
    const facts = [p.orderable && t.pdp.f1(cat.settings.pickup.prepMinutes), weight && p.orderable && t.pdp.f2, p.mixable && p.orderable && t.pdp.f3, p.priceCents != null && t.pdp.f4(t.month), t.pdp.f5].filter(Boolean);
    const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: SITE + img(p.img), category: `${c.name} > ${p.sub}`, brand: { '@type': 'Brand', name: 'Nuts Now' }, ...(p.priceCents != null ? { offers: { '@type': 'Offer', priceCurrency: 'USD', price: (p.priceCents / 100).toFixed(2), availability: 'https://schema.org/InStoreOnly', url: `${SITE}${u(`/product/${p.slug}/`)}`, ...(weight ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: (p.priceCents / 100).toFixed(2), priceCurrency: 'USD', unitCode: 'LBR', unitText: 'lb' } } : {}) } } : {}) };
    const body = `<div class="wrap">${crumbs([['/shop/', t.shop.title], [`/shop/${c.id}/`, catName(c)], [`/shop/${c.id}/?type=${encodeURIComponent(p.sub)}`, subName(p.sub)]]).replace('<nav class="crumbs"', '<nav class="crumbs" style="margin-top:18px"')}
  <div class="pdp" data-pdp data-p="${pjson(p)}"><div class="gal">${badge(p)}<img src="${img(p.img)}" alt="${esc(p.name)}" width="640" height="640"></div>
  <div><p class="kicker">${esc(subName(p.sub))} · ${esc(catName(c))}</p><h1 class="h1" dir="auto">${esc(p.name)}</h1>
    <div class="pr-big">${p.priceCents != null ? `<span class="price">${money(p.priceCents)}</span><small>${esc(unitTail(p))}</small>` : `<span class="price" style="font-size:34px">${t.priceInStore}</span>`}</div>
    ${qty}
    <ul class="facts">${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>
  ${more.length ? `<section style="padding-bottom:70px"><div class="sec-h"><div><h2 class="h3">${esc(t.pdp.moreOf(subName(p.sub)))}</h2></div><a class="more" href="${u(`/shop/${c.id}/`)}">${esc(t.pdp.allOf(catName(c)))}</a></div><div class="scroller">${more.map(x => card(x)).join('')}</div></section>` : ''}</div>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}product/${p.slug}/index.html`, layout({ p: `/product/${p.slug}/`, page: 'pg-pdp', ld, ogImg: img(p.img), title: `${p.name}${p.priceCents != null ? ' · ' + loc(N.priceLabel(p)) : ''} | ${ar ? 'نَتس ناو' : 'Nuts Now'}`, desc: ar ? `${p.name} من نَتس ناو${p.priceCents != null ? `، ${loc(N.priceLabel(p))}` : ''}. ${subName(p.sub)}، ${catName(c)}. اطلب أونلاين للاستلام في ألن بارك أو ديربورن هايتس، أو للتوصيل.` : `${p.name} at Nuts Now${p.priceCents != null ? `, ${N.priceLabel(p)}` : ''}. ${p.sub}, ${c.name}. Order online for pickup in Allen Park or Dearborn Heights, or delivery.`, body }));
  });

  // STORES
  {
    const drinks = cat.drinks.map(d => `${esc(ar ? AR.drinks[d.name] || d.name : d.name)} ${moneyShort(d.priceCents)}`).join(' · ');
    const body = `<div class="wrap page-h">${crumbs([['/', t.shop.home], [null, t.nav.stores]])}<h1 class="h1">${t.stores.h}</h1><p class="lede">${t.stores.lede}</p></div>
  <section class="wrap" style="padding-bottom:30px"><div class="store-cards">${S.map(s => `<div>${storeCard(s, true)}<iframe class="map" style="margin-top:12px" title="${esc(t.stores.map(storeName(s)))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent('Nuts Now ' + s.address.join(' '))}&output=embed${ar ? '&hl=ar' : ''}"></iframe></div>`).join('')}</div></section>
  <section class="sec" style="padding-top:30px"><div class="wrap"><div class="sec-h"><div><h2 class="h2">${t.stores.goodH}</h2></div></div>
  <div class="steps"><div class="step"><div><b>${t.stores.b1}</b><p>${t.stores.b1p(cat.settings.pickup.prepMinutes)}</p></div></div>
  <div class="step"><div><b>${t.stores.b2}</b><p>${t.stores.b2p}</p></div></div>
  <div class="step"><div><b>${t.stores.b3}</b><p>${t.stores.b3p(drinks)}</p></div></div></div></div></section>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}stores/index.html`, layout({ p: '/stores/', page: 'pg-stores', ld: orgLd(), title: t.title.stores, desc: `${S.map(s => `${storeName(s)}: ${s.address.join(', ')}`).join(' · ')}`, body }));
  }

  // ABOUT
  {
    const email = cat.settings.contactEmail || null, a = t.about;
    const body = `<div class="wrap page-h">${crumbs([['/', t.shop.home], [null, t.nav.about]])}</div>
  <section class="wrap" style="padding-bottom:40px"><div class="about-grid"><div class="ph"><img src="/img/post1.jpg" alt="${esc(a.alt)}" width="800" height="1000" loading="lazy"></div>
  <div class="prose"><h1 class="h1" style="margin:0 0 18px">${a.h}</h1>
  <p>${a.p1}</p><p>${a.p2}</p><p>${a.p3}</p>
  <p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn btn-lime" href="${u('/shop/')}">${a.shop}</a><a class="btn btn-line" href="${u('/stores/')}">${a.find}</a></p></div></div></section>
  <section class="sec" style="padding-top:20px" id="contact"><div class="wrap"><div class="about-grid" style="align-items:start">
    <div><h2 class="h2" style="margin:0 0 14px">${a.ch}</h2><p class="lede">${a.cl}</p>
      <div style="display:grid;gap:10px;margin-top:20px;max-width:420px">${S.map(s => `<a class="btn btn-black" href="tel:${esc(s.phone)}">${I.phone} ${esc(storeName(s))} · <span dir="ltr">${esc(s.phoneLabel)}</span></a>`).join('')}<a class="btn btn-line" href="${IG}" target="_blank" rel="noopener">${I.ig} ${a.ig}</a></div></div>
    <form class="co-step" id="contactForm" style="margin:0" novalidate><h3 class="h3" style="margin-bottom:14px">${a.form}</h3>
      <div class="field"><label for="cfName">${a.name}</label><input id="cfName" required autocomplete="name"></div>
      <div class="field"><label for="cfPhone">${a.reach}</label><input id="cfPhone" required autocomplete="tel"></div>
      <div class="field"><label for="cfStore">${a.store}</label><select id="cfStore">${S.map(s => `<option value="${s.id}">${esc(storeName(s))}</option>`).join('')}</select></div>
      <div class="field"><label for="cfMsg">${a.msg}</label><textarea id="cfMsg" required></textarea></div>
      <button class="btn btn-lime" type="submit" style="width:100%">${a.send}</button><p class="muted" id="cfOut" style="font-size:13.5px;margin-top:10px"></p></form>
  </div></div></section>
  <script>(()=>{const f=document.getElementById('contactForm'),o=document.getElementById('cfOut'),E=${JSON.stringify(email)},AR=${ar},ST=${JSON.stringify(Object.fromEntries(S.map(s => [s.id, { name: storeName(s), phone: s.phone, label: s.phoneLabel }])))};f.addEventListener('submit',async e=>{e.preventDefault();const n=f.cfName.value.trim(),c=f.cfPhone.value.trim(),m=f.cfMsg.value.trim(),s=ST[f.cfStore.value];if(!n||!c||!m){o.textContent=AR?'اكتب اسمك وطريقة التواصل معك ورسالتك.':'Please fill in your name, how to reach you and your message.';return}const t='Message for Nuts Now '+s.name+'\\nFrom: '+n+' ('+c+')\\n\\n'+m;if(E){location.href='mailto:'+E+'?subject='+encodeURIComponent('Website message for '+s.name)+'&body='+encodeURIComponent(t);o.textContent=AR?'سيفتح تطبيق البريد والرسالة جاهزة للإرسال.':'Your email app should open with the message ready to send.';return}try{await navigator.clipboard.writeText(t);o.innerHTML=(AR?'نُسخت الرسالة. الصقها في رسالة إلى ':'Copied. Paste it into a message to ')+'<a href="${IG}" target="_blank" rel="noopener">@nutsnow.co</a>'+(AR?' على إنستغرام، أو اتصل بفرع ':' on Instagram, or call ')+s.name+' <a href="tel:'+s.phone+'" dir="ltr">'+s.label+'</a>.'}catch(x){o.innerHTML=(AR?'أرسلها إلى ':'Send it to ')+'<a href="${IG}" target="_blank" rel="noopener">@nutsnow.co</a>'+(AR?' على إنستغرام، أو اتصل بفرع ':' on Instagram, or call ')+s.name+' <a href="tel:'+s.phone+'" dir="ltr">'+s.label+'</a>.'}})})();</script>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}about/index.html`, layout({ p: '/about/', page: 'pg-about', title: t.title.about, desc: t.desc.about, body }));
  }

  // CHECKOUT
  {
    const c = t.co;
    const body = `<div class="wrap page-h">${crumbs([['/shop/', t.shop.title], [null, c.h]])}<h1 class="h1">${c.h}</h1><p class="lede">${c.lede}</p></div>
  <div class="wrap"><div class="co" id="checkout">
    <div>
      <div class="co-step"><h2 class="h3"><i>1</i>${c.how}</h2><div class="opts two">
        <label class="opt"><input type="radio" name="mode" value="pickup" checked><span><b>${I.store} ${c.pickup}</b><small>${c.pickupS}</small></span></label>
        <label class="opt"><input type="radio" name="mode" value="delivery"><span><b>${I.truck} ${c.delivery}</b><small>${c.deliveryS}</small></span></label></div></div>
      <div class="co-step"><h2 class="h3"><i>2</i><span id="coWhichH" data-p="${c.which}" data-d="${c.whichD}">${c.which}</span></h2><div class="opts" id="coStores"></div></div>
      <div class="co-step" id="coWhenStep"><h2 class="h3"><i>3</i>${c.when}</h2><div id="coTimes"></div></div>
      <div class="co-step" id="coAddrStep" hidden><h2 class="h3"><i>3</i>${c.where}</h2>
        <div class="field"><label for="adStreet">${c.street}</label><input id="adStreet" autocomplete="address-line1" dir="ltr"></div>
        <div class="field"><label for="adUnit">${c.unit}</label><input id="adUnit" autocomplete="address-line2" dir="ltr"></div>
        <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:10px"><div class="field"><label for="adCity">${c.city}</label><input id="adCity" autocomplete="address-level2" dir="ltr"></div><div class="field"><label for="adZip">${c.zip}</label><input id="adZip" autocomplete="postal-code" inputmode="numeric" dir="ltr"></div></div>
        <button type="button" class="btn btn-black" id="coQuote" style="width:100%">${I.truck} ${c.getQuotes}</button>
        <div id="coQuotes" aria-live="polite"></div></div>
      <div class="co-step"><h2 class="h3"><i>4</i>${c.details}</h2>
        <div class="field"><label for="coName">${c.name}</label><input id="coName" autocomplete="name" required></div>
        <div class="field"><label for="coPhone">${c.phone}</label><input id="coPhone" type="tel" autocomplete="tel" inputmode="tel" required dir="ltr"></div>
        <div class="field"><label for="coEmail">${c.email}</label><input id="coEmail" type="email" autocomplete="email" dir="ltr"></div>
        <div class="field"><label for="coNote">${c.note}</label><textarea id="coNote" placeholder="${esc(c.notePh)}"></textarea></div>
        <button class="btn btn-lime" type="button" id="coPlace" style="width:100%;min-height:56px;font-size:17px">${c.place}</button>
        <div id="coMsg" aria-live="polite"></div></div>
    </div>
    <aside class="summary"><div class="co-step"><h2 class="h3" style="margin-bottom:6px">${c.order}</h2><div id="coSum"></div>
      <div class="sumrow" style="margin:14px 0 0"><span>${t.subtotal}</span><b id="coTotal">$0.00</b></div><div id="coFees"></div><p class="muted" style="font-size:13px">${c.taxNote}</p>
      <p style="margin-top:10px"><button type="button" class="more" data-open="bagSheet" style="font-size:14px">${c.edit}</button></p></div></aside>
  </div></div>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}checkout/index.html`, layout({ p: '/checkout/', page: 'pg-co', scripts: ['checkout'], title: t.title.co, desc: c.lede, body }));
  }

  // CREDITS
  {
    const dir = path.join(ROOT, 'img/p/credits');
    const cr = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(c => imgOk.has(c.key)).sort((a, b) => a.key.localeCompare(b.key)) : [];
    const body = `<div class="wrap page-h"><h1 class="h1">${t.credits.h}</h1><p class="lede">${t.credits.lede}</p></div>
  <section class="wrap" style="padding-bottom:70px"><div class="grid five" dir="ltr">${cr.map(x => `<figure class="card"><span class="ph"><img src="/img/p/${esc(x.key)}.webp" alt="" width="640" height="640" loading="lazy"></span><figcaption class="bd" style="font-size:13px"><b>${esc(x.title || x.key)}</b><span>${x.creator_url ? `<a href="${esc(x.creator_url)}" rel="noopener" target="_blank">${esc(x.creator || 'Unknown')}</a>` : esc(x.creator || 'Unknown')}</span><span>${x.source_url ? `<a href="${esc(x.source_url)}" rel="noopener" target="_blank">${esc(x.provider || 'Source')}</a>` : esc(x.provider || '')} · ${x.license_url ? `<a href="${esc(x.license_url)}" rel="noopener" target="_blank">${esc(x.license)}</a>` : esc(x.license || '')}</span></figcaption></figure>`).join('')}</div>
  <p class="muted" style="margin-top:20px;font-size:14px">${t.credits.note}</p></section>`;
    write(`${PF.slice(1)}${PF ? '/' : ''}credits/index.html`, layout({ p: '/credits/', page: 'pg-credits', title: t.title.credits, desc: t.credits.h, body }));
  }

  // 404
  write(`${PF.slice(1)}${PF ? '/' : ''}404.html`, layout({ p: '/404.html', page: 'pg-404', title: t.title.nf, desc: t.nf.h, body: `<section class="sec"><div class="wrap" style="text-align:center"><p class="kicker">404</p><h1 class="h1" style="margin:12px 0">${t.nf.h}</h1><p class="lede" style="margin:0 auto 22px">${t.nf.p}</p><p style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-lime" href="${u('/shop/')}">${t.nf.shop}</a><button type="button" class="btn btn-line" data-open="searchSheet">${I.search} ${t.nf.search}</button></p></div></section>` }));
}

build('en');
build('ar');

/* ---------- write ---------- */
for (const d of ['shop', 'product', 'ar']) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
for (const [rel, html] of Object.entries(out)) { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }
const urls = Object.keys(out).filter(r => r.endsWith('index.html') && !r.includes('checkout')).map(r => SITE + '/' + r.replace(/index\.html$/, ''));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(x => `<url><loc>${x}</loc></url>`).join('\n')}\n</urlset>\n`);
const missing = [...new Set(P.map(p => p.img))].filter(k => !imgOk.has(k));
console.log(`${Object.keys(out).length} pages written (en + ar); ${imgOk.size} product photos; ${missing.length} photo keys still missing`);
