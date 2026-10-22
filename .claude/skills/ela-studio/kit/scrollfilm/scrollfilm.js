/* ScrollFilm: the house player for Apple-style scroll-driven render films. Inline it into each site (single-file rule).
   - frames: array of URLs in film order (render with Blender, encode webp q74–80, 1280×720)
   - pinned <section> (height = scroll length) containing a sticky stage with a <canvas>
   - scroll sets a target position; the picture glides to it (no snapping), frames are decoded ahead,
     the canvas repaints only when the frame changes, resolution is capped (DPR ≤ 1.5, width ≤ 1600)
   - focus: [[t, x0..1], ...] keeps the subject in frame when phones crop a 16:9 film to portrait
   - onProgress(p, t): drive captions / UI from the same progress (0..1) and film time
   Usage: ScrollFilm({ section, canvas, frames, focus, mobileStep: 2, onProgress }) */
function ScrollFilm(o) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, small = matchMedia('(max-width: 760px)').matches;
  const all = o.frames, step = small ? (o.mobileStep || 2) : 1, idx = all.map((_, i) => i).filter(i => i % step === 0 || i === all.length - 1);
  const cv = o.canvas, ctx = cv.getContext('2d', { alpha: false }), sec = o.section, N = all.length;
  const img = new Array(N).fill(null); let dirty = true, shown = -1;
  const load = i => { if (img[i] !== null) return; img[i] = false; const im = new Image(); im.src = all[i]; im.decode().then(() => { img[i] = im; dirty = true; }).catch(() => { img[i] = null; }); };
  // coarse first (every 8th), then finer: the film is watchable quickly and fills in
  const order = [...idx].sort((a, b) => ((a % 8 ? 1 : 0) - (b % 8 ? 1 : 0)) || ((a % 4 ? 1 : 0) - (b % 4 ? 1 : 0)) || a - b);
  let q = 0; (function pump() { for (let n = 0; n < 6 && q < order.length; n++) load(order[q++]); if (q < order.length) setTimeout(pump, 100); })();
  const size = () => { const d = Math.min(devicePixelRatio || 1, 1.5), w = Math.min(cv.clientWidth * d, 1600); cv.width = Math.round(w); cv.height = Math.round(w * cv.clientHeight / cv.clientWidth); dirty = true; };
  addEventListener('resize', size); size();
  const lerp = (a, b, t) => a + (b - a) * t;
  const focusAt = t => { const P = o.focus || [[0, .5], [1, .5]]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) return lerp(P[i - 1][1], P[i][1], (t - P[i - 1][0]) / ((P[i][0] - P[i - 1][0]) || 1)); return P[P.length - 1][1]; };
  function nearest(i) { if (img[i]) return i; for (let d = 1; d < N; d++) { if (img[i - d]) return i - d; if (img[i + d]) return i + d; } return -1; }
  function draw(t) {               // t = 0..1 film position
    const k = nearest(Math.round(t * (N - 1))); if (k < 0) return; if (k === shown && !dirty) return; shown = k; dirty = false;
    const A = img[k], W = cv.width, H = cv.height, s = Math.max(W / A.naturalWidth, H / A.naturalHeight), dw = A.naturalWidth * s, dh = A.naturalHeight * s;
    ctx.drawImage(A, Math.min(0, Math.max(W - dw, W / 2 - focusAt(t) * dw)), (H - dh) / 2, dw, dh);
  }
  const progress = () => { const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight; return Math.min(1, Math.max(0, -r.top / Math.max(1, span))); };
  let cur = progress(), prev = performance.now(), lastP = -1;
  (function tick(now) {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now; const p = progress();
    cur = RM ? p : cur + (p - cur) * (1 - Math.exp(-dt * 8)); if (Math.abs(p - cur) < .0004) cur = p;
    draw(cur);
    if (o.onProgress && Math.abs(p - lastP) > .0003) { lastP = p; o.onProgress(p, cur); }
    requestAnimationFrame(tick);
  })(prev);
  return { progress };
}
/* Apple-style helpers */
// scroll-linked scale-up: an element grows from `from` to 1 (and its corner radius eases) while it crosses the viewport
function ScrollGrow(el, from = .84) {
  const f = () => { const r = el.getBoundingClientRect(), k = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .9))); el.style.transform = `scale(${(from + (1 - from) * k).toFixed(4)})`; el.style.borderRadius = `${(28 * (1 - k) + 14).toFixed(1)}px`; };
  addEventListener('scroll', () => requestAnimationFrame(f), { passive: true }); f();
}
// statement text that lights up word by word as it scrolls through the middle of the screen
function ScrollWords(el) {
  const words = el.textContent.trim().split(/\s+/); el.innerHTML = words.map(w => `<span>${w}</span>`).join(' '); const spans = [...el.children];
  const f = () => { const r = el.getBoundingClientRect(), k = Math.min(1, Math.max(0, (innerHeight * .78 - r.top) / (r.height + innerHeight * .35))); const n = Math.round(k * spans.length); spans.forEach((s, i) => s.classList.toggle('lit', i < n)); };
  addEventListener('scroll', () => requestAnimationFrame(f), { passive: true }); f();
}
