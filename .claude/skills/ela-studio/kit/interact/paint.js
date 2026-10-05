/* Paint(canvas): glossy black car paint under a honeycomb of hex shop lights, with swirl marks.
   From The Lab Atlanta. Use it for detailing, PPF, tint, wraps, ceramic coating: anything about paint.
   api.resize()                       size to the canvas box (call on load + resize)
   api.base()                         draw the clean paint + reflections
   api.swirl(amount, x0, x1)          swirl marks lit by the light band, inside an x-range (0..1 amount)
   api.lit(amount, lx, ly, radius)    swirl marks lit by a moving inspection light
   api.marks / api.mctx               a persistent layer for scratches and chips (draw into it, it's blitted by you)
   Typical frame: P.base(); P.swirl(1, 0, W/2); ctx.drawImage(P.marks...) — see thelab-atlanta/index.html for the
   full scratch test (heal on the film side, gravel chips) and the stage 1-3 correction story with a polisher pad. */
const clamp = window.clamp || ((v, a = 0, b = 1) => v < a ? a : v > b ? b : v);
function Paint(canvas, mode) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas'), swirlBand = document.createElement('canvas'), swirlRaw = document.createElement('canvas'), tmp = document.createElement('canvas'), marks = document.createElement('canvas');
  let W = 0, H = 0, D = 1, seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const api = { W: 0, H: 0, D: 1, ctx, marks, mctx: marks.getContext('2d') };
  // the hex light grid, bent around the curve of the panel
  function hexWarp(x, y, bandY) { const k = .34, bow = -H * .1 / ((W / 2) ** 2); return [x, bandY + y * k + bow * (x - W / 2) ** 2]; }
  function drawHex(g, bandY, R, lw, alphaFn) {
    const s3 = Math.sqrt(3), cols = Math.ceil(W / (R * 1.5)) + 3;
    for (let i = -2; i < cols; i++) for (let j = -4; j <= 4; j++) {
      const cx = i * R * 1.5, cy = j * R * s3 + (i & 1 ? R * s3 / 2 : 0);
      const a = alphaFn(cy); if (a <= .01) continue;
      g.beginPath();
      for (let k = 0; k <= 6; k++) { const ang = Math.PI / 3 * k; const [X, Y] = hexWarp(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, bandY); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = lw; g.stroke();
    }
  }
  function build() {
    const b = base.getContext('2d'); b.setTransform(D, 0, 0, D, 0, 0);
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1d2025'); g.addColorStop(.3, '#0a0b0d'); g.addColorStop(.58, '#0e1013'); g.addColorStop(.63, '#22252b'); g.addColorStop(.645, '#060708'); g.addColorStop(.85, '#0b0c0f'); g.addColorStop(1, '#020203');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // metallic flake
    for (let i = 0; i < W * H / 55; i++) { b.fillStyle = `rgba(255,255,255,${.02 + rnd() * .06})`; b.fillRect(rnd() * W, rnd() * H, 1, 1); }
    const bandY = H * .27, R = Math.max(20, W / 22);
    const fall = cy => Math.max(0, 1 - Math.abs(cy) / (R * 6.5));
    b.save(); b.filter = 'blur(7px)'; drawHex(b, bandY, R, R * .2, cy => fall(cy) * .5); b.restore();
    drawHex(b, bandY, R, Math.max(1.5, R * .085), cy => fall(cy) * .95);
    // soft box low on the panel, and the body line catching light
    const sb = b.createLinearGradient(0, H * .78, 0, H * .9); sb.addColorStop(0, 'rgba(255,255,255,0)'); sb.addColorStop(.5, 'rgba(255,255,255,.07)'); sb.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = sb; b.fillRect(0, H * .78, W, H * .12);
    b.beginPath(); b.moveTo(0, H * .632); b.quadraticCurveTo(W / 2, H * .61, W, H * .632); b.strokeStyle = 'rgba(255,255,255,.5)'; b.lineWidth = 1.4; b.stroke();
    const vg = b.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .2, W / 2, H * .5, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    b.fillStyle = vg; b.fillRect(0, 0, W, H);
    // swirl marks: concentric scratches that only show where light hits them
    const sr = swirlRaw.getContext('2d'); sr.setTransform(D, 0, 0, D, 0, 0); sr.clearRect(0, 0, W, H);
    const centers = [];
    for (let i = 0; i < 26; i++) centers.push([rnd() * W, rnd() * H]);
    for (let i = 0; i < W / (R * 1.5); i++) centers.push([i * R * 1.5 + rnd() * 10, bandY + (rnd() - .5) * R]);
    for (const [cx, cy] of centers) for (let k = 0; k < 22; k++) {
      const r = 6 + rnd() * R * 2.6, a0 = rnd() * Math.PI * 2;
      sr.beginPath(); sr.arc(cx, cy, r, a0, a0 + .35 + rnd() * 1.1);
      sr.strokeStyle = `rgba(255,255,255,${.2 + rnd() * .4})`; sr.lineWidth = .7 + rnd() * .6; sr.stroke();
    }
    for (let i = 0; i < 120; i++) { const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 10 + rnd() * 60; sr.beginPath(); sr.moveTo(x, y); sr.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .3); sr.strokeStyle = `rgba(255,255,255,${.06 + rnd() * .12})`; sr.lineWidth = .6; sr.stroke(); }
    const sb2 = swirlBand.getContext('2d'); sb2.setTransform(1, 0, 0, 1, 0, 0); sb2.clearRect(0, 0, swirlBand.width, swirlBand.height);
    sb2.drawImage(swirlRaw, 0, 0); sb2.globalCompositeOperation = 'destination-in';
    sb2.setTransform(D, 0, 0, D, 0, 0);
    const mk = sb2.createLinearGradient(0, bandY - R * 3, 0, bandY + R * 3); mk.addColorStop(0, 'rgba(0,0,0,.2)'); mk.addColorStop(.5, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,.2)');
    sb2.fillStyle = mk; sb2.fillRect(0, 0, W, H); sb2.globalCompositeOperation = 'source-over';
  }
  api.resize = () => {
    const r = canvas.getBoundingClientRect(); D = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    for (const c of [canvas, base, swirlBand, swirlRaw, tmp, marks]) { c.width = Math.max(1, Math.round(W * D)); c.height = Math.max(1, Math.round(H * D)); }
    api.W = W; api.H = H; api.D = D; seed = 9; build(); api.mctx.setTransform(D, 0, 0, D, 0, 0);
  };
  // draw swirls (band-lit) with amount a inside an x-range
  api.swirl = (a, x0 = 0, x1 = W) => { if (a <= .001) return; ctx.save(); ctx.beginPath(); ctx.rect(x0 * D, 0, (x1 - x0) * D, H * D); ctx.clip(); ctx.globalAlpha = a; ctx.drawImage(swirlBand, 0, 0); ctx.restore(); };
  // swirls lit by a moving inspection light
  api.lit = (a, lx, ly, rad, x0 = 0, x1 = W) => {
    if (a <= .001) return;
    const t = tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, tmp.width, tmp.height);
    t.drawImage(swirlRaw, 0, 0); t.globalCompositeOperation = 'destination-in'; t.setTransform(D, 0, 0, D, 0, 0);
    const gr = t.createRadialGradient(lx, ly, 0, lx, ly, rad); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = gr; t.fillRect(0, 0, W, H); t.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(x0 * D, 0, (x1 - x0) * D, H * D); ctx.clip(); ctx.globalAlpha = Math.min(1, a * 2); ctx.drawImage(tmp, 0, 0); if (a > .4) ctx.drawImage(tmp, 0, 0); ctx.restore();
  };
  api.base = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.setTransform(D, 0, 0, D, 0, 0); };
  return api;
}
window.Paint = Paint;
