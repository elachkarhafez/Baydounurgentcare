/* Latte art as a tiny fluid sim on the drink's surface (texture space, 0..1).
   Milk enters at the pour point P: it injects white foam and pushes everything
   outward (2D source flow). Wiggling P while backing up stacks the ripples into a
   rosetta; a quick pull-through drags them into leaves. Semi-Lagrangian advection
   plus a little anti-diffusion keeps the edges crisp. */
export function makeLatte(N = 320) {
  const D = new Float32Array(N * N), T = new Float32Array(N * N), M = new Float32Array(N * N), inside = new Uint8Array(N * N);
  // crema mottling + radial darkening, fixed per cup
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + .5) / N - .5, y = (j + .5) / N - .5, r = Math.hypot(x, y) * 2, k = j * N + i;
    inside[k] = r < 1.02 ? 1 : 0;
    const tiger = Math.sin(i * .21 + Math.sin(j * .09) * 3.1) * Math.cos(j * .17 + Math.sin(i * .07) * 2.3);
    M[k] = .55 + .45 * (1 - r * r) + .12 * tiger + (Math.random() - .5) * .1;
  }
  const sample = (A, x, y) => {
    // bilinear, x/y in cell units
    if (x < 0) x = 0; if (y < 0) y = 0; if (x > N - 1.001) x = N - 1.001; if (y > N - 1.001) y = N - 1.001;
    const i = x | 0, j = y | 0, a = x - i, b = y - j, k = j * N + i;
    return (A[k] * (1 - a) + A[k + 1] * a) * (1 - b) + (A[k + N] * (1 - a) + A[k + N + 1] * a) * b;
  };
  const S = {
    D, N,
    clear() { D.fill(0); },
    fade(k) { for (let i = 0; i < D.length; i++) D[i] *= k; },
    // one sim step. p: { x, y, Q (source strength), inj (foam/s), ri (radius), vx, vy (pour-point velocity for drag), drag }
    step(dt, p) {
      const r0 = .018, ri2 = p.ri * p.ri, dg = .028 * .028;
      for (let j = 0; j < N; j++) {
        const y = (j + .5) / N;
        for (let i = 0; i < N; i++) {
          const k = j * N + i; if (!inside[k]) { T[k] = 0; continue; }
          const x = (i + .5) / N, dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy;
          let u = p.Q * dx / (r2 + r0 * r0), v = p.Q * dy / (r2 + r0 * r0);
          if (p.drag) { const w = p.drag * Math.exp(-r2 / dg); u += p.vx * w; v += p.vy * w; }
          // the cup wall stops outward flow
          const cx = x - .5, cy = y - .5, rr = Math.hypot(cx, cy) * 2;
          if (rr > .9) { const s = Math.max(0, (1 - rr) / .1); const dot = (u * cx + v * cy) / (Math.hypot(cx, cy) || 1); if (dot > 0) { u -= (1 - s) * dot * cx / (Math.hypot(cx, cy) || 1); v -= (1 - s) * dot * cy / (Math.hypot(cx, cy) || 1); } }
          let d = sample(D, (x - u * dt) * N - .5, (y - v * dt) * N - .5);
          if (p.c !== undefined) { const g = Math.exp(-r2 / ri2); d += (p.c - d) * (1 - Math.exp(-dt * 45)) * g; }
          else if (p.inj) d += p.inj * dt * Math.exp(-r2 / ri2);
          // anti-diffusion: microfoam holds a crisp edge against the crema
          d += 2.2 * dt * (d - .42) * d * (1.15 - d);
          T[k] = d < 0 ? 0 : d > 1.15 ? 1.15 : d;
        }
      }
      D.set(T);
    },
    // paint into an ImageData of size N×N
    render(img) {
      const o = img.data;
      for (let k = 0; k < N * N; k++) {
        const d = D[k], m = M[k];
        const f = d <= .34 ? 0 : d >= .56 ? 1 : ((d - .34) / .22) * ((d - .34) / .22) * (3 - 2 * (d - .34) / .22);
        const halo = (d > .06 && d < .45) ? Math.sin((d - .06) / .39 * Math.PI) : 0;
        // crema: deep hazelnut with tiger mottling, darker ring hugging the foam
        let cr = 88 + 70 * m, cg = 46 + 40 * m, cb = 20 + 18 * m;
        const h = 1 - .32 * halo; cr *= h; cg *= h; cb *= h;
        // foam: warm white, faintly tan at its edge
        const fr = 250 - 22 * (1 - f), fg = 244 - 30 * (1 - f), fb = 232 - 40 * (1 - f);
        o[k * 4] = cr + (fr - cr) * f; o[k * 4 + 1] = cg + (fg - cg) * f; o[k * 4 + 2] = cb + (fb - cb) * f; o[k * 4 + 3] = 255;
      }
    }
  };
  return S;
}

// The pour choreography, shared by the 3D cup and the test bench.
// phase 'base' (pour from high, no foam), 'art' (low pour + wiggle while backing up), 'pull' (lift + pull through)
export function pourAt(phase, t, leaves) {
  if (phase === 'base') return { x: .5, y: .5, Q: .004, inj: 0, ri: .02 };
  if (phase === 'art') {
    // the stream wiggles; milk surfaces white as it crosses the middle and dives (stays brown) at the swing ends
    const a = t, ph = Math.PI * 2 * leaves * a, A = .026 + .065 * a, w = Math.sin(ph);
    return { x: .5 + A * w, y: .4 + .34 * a, Q: .03 + .012 * a, c: a < .05 ? .2 : (Math.abs(w) < .55 ? 1 : 0), ri: .034 };
  }
  // pull-through: from the near edge across to the far edge
  return { x: .5, y: .84 - .72 * t, Q: .002, inj: 2.2, ri: .011, drag: 1, vx: 0, vy: -.72 / .45 };
}
