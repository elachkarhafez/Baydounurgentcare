/* Aisle transition. Tapping an aisle (or the shop) drops a mix of nuts and candy across the screen: the
   pieces pile up from the bottom around the Nuts Now logo until the page is covered, then the next page
   opens and the pile falls away through the bottom of the screen. The pieces are real 3D renders
   (src/pieces/scene.js) packed into img/tx/pieces.webp. Skipped for reduced motion. */
(() => {
  'use strict';
  const KEY = 'nn-tx', ATLAS = '/img/tx/pieces.webp', CELL = 160, COLS = 8;
  // display scale per piece type (two renders of each, in atlas order)
  const SCALE = [1, 1, .9, .78, 1, .95, .95, 1, 1, 1, 1, 1, 1.5, 1.5, 1.05, 1.25, 1.5, .85, .62, .62, .62, .62, 1.15, 1.25];
  const N = SCALE.length * 2, BG = '#12130e';
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.remove('nn-tx'); return; }
  const isAisle = u => u.origin === location.origin && /^(\/ar)?\/shop\/([a-z0-9-]+\/)?$/.test(u.pathname);

  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let atlas = null;
  const loadAtlas = () => atlas || (atlas = new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = ATLAS; }));

  // the pile: a jittered grid of pieces that covers the whole screen, bottom rows first
  function layout(seed, w, h) {
    const r = rng(seed), U = Math.max(54, Math.min(104, Math.sqrt(w * h) / 12.5)), sp = U * .64;
    const cols = Math.ceil(w / sp) + 1, rows = Math.ceil(h / sp) + 1, P = [];
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
      const k = Math.floor(r() * N), s = U * SCALE[k >> 1] * (.86 + r() * .3);
      const x = (c + (row % 2) * .5 - .25) * sp + (r() - .5) * sp * .7, y = h - (row + .3) * sp + (r() - .5) * sp * .6;
      const up = row / rows; // 0 = bottom row
      P.push({ k, s, x, y, a: r() * 6.283, spin: (r() - .5) * 9, land: 90 + up * 470 + r() * 110, drop: up * 230 + r() * 90, vx: (r() - .5) * .22, vy: -r() * .25 });
    }
    return P.sort((a, b) => a.land - b.land);
  }

  function overlay() {
    const o = document.createElement('div'); o.className = 'tx'; o.setAttribute('aria-hidden', 'true');
    o.innerHTML = '<canvas></canvas><div class="tx-logo"><img src="/img/logo-hd.webp" alt="" width="160" height="160"></div>';
    document.body.appendChild(o);
    const cv = o.firstChild, dpr = Math.min(devicePixelRatio || 1, 1.75), w = innerWidth, h = innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
    return { o, ctx, w, h, dpr };
  }
  const piece = (ctx, dpr, img, p, x, y, a, sc = 1) => {
    const s = p.s * sc, c = Math.cos(a) * dpr, n = Math.sin(a) * dpr;
    ctx.setTransform(c, n, -n, c, x * dpr, y * dpr);
    ctx.drawImage(img, (p.k % COLS) * CELL, Math.floor(p.k / COLS) * CELL, CELL, CELL, -s / 2, -s / 2, s, s);
  };
  const ease = t => t * t, clamp = t => t < 0 ? 0 : t > 1 ? 1 : t;

  /* leaving: pour the pile, then go */
  let busy = false;
  async function leave(href) {
    busy = true;
    const seed = (Math.random() * 1e9) | 0, img = await Promise.race([loadAtlas(), new Promise(r => setTimeout(() => r(null), 900))]).catch(() => null);
    if (!img) { location.assign(href); return; }
    const pre = document.createElement('link'); pre.rel = 'prefetch'; pre.href = href; document.head.appendChild(pre);
    const { o, ctx, w, h, dpr } = overlay(), P = layout(seed, w, h), T0 = performance.now(), FALL = 290, END = 780;
    try { sessionStorage.setItem(KEY, JSON.stringify({ seed, w, h, t: Date.now() })); } catch (e) {}
    o.classList.add('in');
    const frame = now => {
      const t = now - T0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = clamp(t / 360); ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      for (const p of P) {
        const s0 = p.land - FALL; if (t < s0) break;
        const q = clamp((t - s0) / FALL), y0 = -p.s - (p.y + p.s) * .15;
        let y = y0 + (p.y - y0) * ease(q), sc = 1;
        if (q >= 1) { const b = clamp((t - p.land) / 170); y = p.y - Math.sin(Math.PI * b) * p.s * .1 * (1 - b); sc = 1 + .05 * Math.sin(Math.PI * b) * (1 - b); }
        piece(ctx, dpr, img, p, p.x, y, p.a + p.spin * (1 - q) * .3, sc);
      }
      if (t < END) requestAnimationFrame(frame); else location.assign(href);
    };
    requestAnimationFrame(frame);
    setTimeout(() => { o.remove(); busy = false; }, 6000); // never leave the page covered if the next page doesn't load
  }

  /* arriving: start covered, let the pile fall away */
  async function arrive() {
    let st = null; try { st = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (e) {}
    const done = () => root.classList.remove('nn-tx');
    if (!st || Date.now() - st.t > 8000) return done();
    const img = await Promise.race([loadAtlas(), new Promise(r => setTimeout(() => r(null), 700))]).catch(() => null);
    if (!img) { root.classList.add('nn-tx-out'); setTimeout(() => { done(); root.classList.remove('nn-tx-out'); }, 400); return; }
    const { o, ctx, w, h, dpr } = overlay(), P = layout(st.seed, w, h), T0 = performance.now() + 60, END = 1100;
    o.classList.add('in', 'out'); done();
    const G = .0098;
    const frame = now => {
      const t = Math.max(0, now - T0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1 - clamp((t - 90) / 340); ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      for (const p of P) {
        const u = Math.max(0, t - p.drop), y = p.y + p.vy * u + .5 * G * u * u;
        if (y - p.s > h) continue;
        piece(ctx, dpr, img, p, p.x + p.vx * u, y, p.a + p.spin * u / 1000);
      }
      if (t < END) requestAnimationFrame(frame); else o.remove();
    };
    requestAnimationFrame(frame);
  }

  document.addEventListener('click', e => {
    if (busy || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href); if (!isAisle(u) || (u.pathname === location.pathname && u.search === location.search)) return;
    e.preventDefault(); leave(u.href);
  });
  // warm the pieces once the page is idle, so the first tap is instant
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => loadAtlas().catch(() => {}));
  addEventListener('pageshow', e => { if (e.persisted) { document.querySelectorAll('.tx').forEach(x => x.remove()); busy = false; root.classList.remove('nn-tx'); } });
  if (root.classList.contains('nn-tx')) arrive();
})();
