# Boilerplate

## Folder layout

```
<repo>/
  <site-slug>/index.html      # one self-contained page per site
```

No build step. Vercel serves the folder as static files.

## Pinned CDN versions

Only include what the site uses.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>
<!-- only if needed -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
```

Three.js r128 is the last version with a classic global build (`THREE.*`), so there's no module or importmap hassle.

## Page skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Business Name | Short promise</title>
  <meta name="description" content="One sentence a customer would actually search for.">
  <meta name="theme-color" content="#0e0d0c">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0e0d0c; --bg-2: #171512; --ink: #efe6d6; --muted: #9a8f80;
      --line: rgba(239,230,214,.12); --accent: #b3261e; --accent-2: #c9a25f;
      --display: "Cormorant Garamond", Georgia, serif;
      --sans: "Manrope", system-ui, sans-serif;
      --mono: "JetBrains Mono", ui-monospace, monospace;
      --pad: clamp(16px, 4vw, 56px);
      --ease: cubic-bezier(.2,.7,.1,1);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    html.lenis, html.lenis body { height: auto; }
    .lenis.lenis-smooth { scroll-behavior: auto !important; }
    .lenis.lenis-stopped { overflow: hidden; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.55 var(--sans); overflow-x: clip; -webkit-font-smoothing: antialiased; }
    img, svg, canvas { display: block; max-width: 100%; }
    a { color: inherit; }
    :focus-visible { outline: 2px solid var(--accent-2); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
  </style>
</head>
<body>
  <!-- loader, header/nav, main > sections, footer (with the studio badge) -->

  <script> /* CDN tags above this */ </script>
  <script>
  const CONFIG = {
    name: 'Business Name',
    tagline: '...',
    phone: '(313) 555-0142',
    email: '',
    instagram: { handle: '@handle', url: 'https://www.instagram.com/handle/' },
    address: { street: '123 Main St', area: 'Downtown', city: 'Your City', mapsUrl: '' },
    // 24h "HH:MM" pairs, null = closed
    hours: { mon: ['09:00','19:00'], tue: ['09:00','19:00'], wed: ['09:00','19:00'], thu: ['09:00','20:00'], fri: ['09:00','20:00'], sat: ['08:00','17:00'], sun: null },
    currency: '$',
    services: [ { id: 'x', name: '...', price: 0, mins: 0, desc: '...' } ]
  };
  const STUDIO_URL = "https://www.instagram.com/ela.systems/";
  </script>
  <script>
  (() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HAS_G = !!(window.gsap && window.ScrollTrigger);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // Render everything from CONFIG first, so the page is complete without JS animation.
  // bindConfig(); renderServices(); renderHours(); ...

  // Smooth scroll, synced with ScrollTrigger
  let lenis = null;
  if (HAS_G) gsap.registerPlugin(ScrollTrigger);
  if (!RM && window.Lenis && HAS_G) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const t = id.length > 1 && $(id); if (!t) return;
    e.preventDefault(); lenis ? lenis.scrollTo(t, { offset: -10, duration: 1.4 }) : t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  }));

  // Responsive animation: desktop vs phone, and reduced motion
  if (HAS_G) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => { /* pinned scroll story */ });
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => { /* lighter version */ });
  }
  })();
  </script>
</body>
</html>
```

## Live open/closed status

```js
const KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmt = mins => { let h = Math.floor(mins / 60), m = mins % 60; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2,'0')} ${ap}` : `${h} ${ap}`; };
function statusNow(now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes(), today = CONFIG.hours[KEYS[now.getDay()]];
  if (today && t >= hm(today[0]) && t < hm(today[1])) return { open: true, text: `Open now · until ${fmt(hm(today[1]))}` };
  for (let i = 0; i < 7; i++) {
    const d = (now.getDay() + i) % 7, h = CONFIG.hours[KEYS[d]];
    if (h && (i > 0 || t < hm(h[0]))) return { open: false, text: `Closed · opens ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]} ${fmt(hm(h[0]))}` };
  }
  return { open: false, text: 'Closed' };
}
```

## WebGL with a fallback

```js
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { document.documentElement.classList.add('no-webgl'); return; }   // show the SVG/CSS fallback
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
let visible = true;
new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
(function loop() { requestAnimationFrame(loop); if (!visible || document.hidden) return; /* update + render */ })();
```

## ElaSystems badge

Put the badge in the page as a `.studio` element (a `<span>`, or an `<a>` when `STUDIO_URL` is set). This snippet goes just before `</body>`. It keeps the badge from ever covering content: on phones it moves into the footer, and on desktop it only shows between the first screen and the footer.

```html
<a class="studio" href="https://www.instagram.com/ela.systems/" target="_blank" rel="noopener" aria-label="Site by ElaSystems (opens in a new tab)"><i aria-hidden="true"></i><span>Site by <b>ElaSystems</b></span></a>
<style>
  .studio{position:fixed;right:16px;bottom:16px;z-index:50;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);color:#fff;font:500 12px/1 var(--sans);text-decoration:none;border:1px solid rgba(255,255,255,.14)}
  .studio i{width:10px;height:10px;border-radius:3px;background:conic-gradient(from 210deg,#ff5a1f,#ffb03b,#ff5a1f)}
  .eb-foot{position:static!important;display:flex!important;width:max-content;max-width:calc(100% - 32px);margin:18px auto 22px!important;transform:none!important;opacity:1!important}
  .eb-hide{opacity:0!important;pointer-events:none!important;transform:translateY(8px)!important}
  .eb-anim{transition:opacity .4s,transform .4s!important}
</style>
<script>
(function () {
  const place = () => {
    const b = document.querySelector('.studio'), f = document.querySelector('footer');
    if (!b || !f) return false;
    if (matchMedia('(max-width: 760px)').matches) { f.appendChild(b); b.classList.add('eb-foot'); return true; }
    b.classList.add('eb-anim');
    const sync = () => b.classList.toggle('eb-hide', scrollY < innerHeight * .6 || scrollY + innerHeight > document.documentElement.scrollHeight - 140);
    sync(); addEventListener('scroll', sync, { passive: true });
    return true;
  };
  if (!place()) addEventListener('load', place);
})();
</script>
```

For a real paying client, ask before adding the badge. Some clients want it, some don't.
