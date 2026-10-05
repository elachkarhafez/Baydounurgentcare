/* Building blocks for build3d. Each returns a layer the stage animates.
   Common options: name, trigger (scroll progress it starts at), after (layer name it waits for; null = no wait,
   default = previous layer), at: [x, z], drop: { h, bounce, squash, shake } (falls in under gravity).
   Units: the plate is radius 1 (≈ 13 cm in real life). */
import * as THREE from 'three';
import { clamp, lerp, sstep, easeOut, easeInOut, rng, noise, fbm, smoothNormals, dynGrid, commitGrid } from './util.js';
import { dropState, fallT, G } from './engine.js';

const matOf = (st, m, ...a) => typeof m === 'string' ? st.mat(m, ...a) : m;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- plate: lowered in by an unseen hand, gold rim inscribes itself ---------------- */
export function plate(st, o = {}) {
  const R = o.r || 1, WELL = .034 * R;
  const top = r => (r /= R, (r < .56 ? .034 + .002 * (r / .56) ** 2 : r < .8 ? .036 + .05 * sstep(.56, .8, r) : .086 + .011 * (r - .8) / .175) * R);
  const g = new THREE.Group(); st.dish.add(g);
  const pts = [V(0, .016 * R)];
  for (let r = .04; r <= .44; r += .04) pts.push(new THREE.Vector2(r * R, (.016 - .004 * r) * R));
  pts[0] = new THREE.Vector2(0, .016 * R);
  pts.push(...[[.455, .012], [.468, .002], [.49, 0], [.515, .003], [.535, .016]].map(([a, b]) => new THREE.Vector2(a * R, b * R)));
  for (let r = .58; r <= .965; r += .025) pts.push(new THREE.Vector2(r * R, top(r * R) - .02 * R));
  const cx = .972 * R, cy = top(.975 * R) - .0095 * R;
  for (let a = -Math.PI / 2; a <= Math.PI / 2 + 1e-6; a += Math.PI / 10) pts.push(new THREE.Vector2(cx + Math.cos(a) * .0105 * R, cy + Math.sin(a) * .0105 * R));
  for (let r = .965; r > .006; r -= .012) pts.push(new THREE.Vector2(r * R, top(r * R)));
  pts.push(new THREE.Vector2(0, top(0)));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 160), matOf(st, o.mat || 'porcelain', o.color)); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
  const goldPts = []; for (let r = .948; r <= .972; r += .004) goldPts.push(new THREE.Vector2(r * R, top(r * R) + .0009 * R));
  for (let a = Math.PI / 2; a >= -.2; a -= Math.PI / 14) goldPts.push(new THREE.Vector2(cx + Math.cos(a) * .0114 * R, cy + Math.sin(a) * .0114 * R)); goldPts.reverse();
  const goldMat = o.rim === false ? null : matOf(st, o.rim || 'gold');
  const gold = goldMat ? new THREE.Mesh(new THREE.LatheGeometry(goldPts, 160), goldMat) : null; if (gold) g.add(gold);
  let arc = -1;
  const setGold = t => { if (!gold) return; t = clamp(t); if (Math.abs(t - arc) < 1e-3) return; arc = t; gold.visible = t > .002; if (!gold.visible) return; gold.geometry.dispose(); gold.geometry = new THREE.LatheGeometry(goldPts, Math.max(3, Math.round(160 * t)), -Math.PI / 2, Math.PI * 2 * t); };
  return st.add({ name: o.name || 'plate', kind: 'place', trigger: o.trigger ?? .045, after: o.after ?? null, obj: g, settle: 1, top, R, well: WELL,
    plan(st) { g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); st.hf.splat(mesh); },
    update(st, s) { const d = 1.15, k = easeOut(s.tau / d); const settle = s.tau > d ? .004 * Math.exp(-(s.tau - d) * 9) * Math.sin((s.tau - d) * 40) : 0;
      g.visible = s.tau > 0; g.position.y = lerp(.75, 0, k) + settle; const tilt = lerp(.18, 0, easeOut(s.tau / (d * .9))); g.rotation.set(tilt, lerp(-1.1, 0, k), tilt * .5); setGold((s.tau - .55) / 1.1);
      const imp = st.layers.find(l => l.impact && l.impactT >= 0); if (imp) g.position.y += -.006 * Math.exp(-imp.impactT * 14) * Math.cos(imp.impactT * 50); }
  });
}


/* ---------------- tray: a party tray with radial compartments + a centre bowl (gold by default) ---------------- */
export function tray(st, o = {}) {
  const R = o.r || .95, N = o.sections || 6, CR = o.center ?? .27, WH = o.wall || .07, FL = .014;
  const g = new THREE.Group(); st.dish.add(g);
  const mat = matOf(st, o.mat || 'gold', o.color); if (o.mat === undefined) { mat.roughness = .38; mat.envMapIntensity = 1.2; mat.normalMap = st.tex('ice_n.webp', false, 10); mat.normalScale = new THREE.Vector2(.35, .35); }
  const prof = [new THREE.Vector2(0, FL)];
  for (let r = .05; r < R - .05; r += .05) prof.push(new THREE.Vector2(r, FL));
  prof.push(new THREE.Vector2(R - .03, FL), new THREE.Vector2(R - .005, FL + WH * .6), new THREE.Vector2(R, WH), new THREE.Vector2(R + .012, WH + .006), new THREE.Vector2(R + .02, WH - .004), new THREE.Vector2(R + .006, WH * .5), new THREE.Vector2(R - .03, 0), new THREE.Vector2(0, 0));
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof.reverse(), 120), mat); base.castShadow = base.receiveShadow = true; g.add(base);
  const parts = [base];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + (o.offset || 0), len = R - .04 - CR, w = new THREE.Mesh(new THREE.BoxGeometry(len, WH * .8, .014), mat); w.position.set(Math.cos(a) * (CR + len / 2), FL + WH * .4, Math.sin(a) * (CR + len / 2)); w.rotation.y = -a; w.castShadow = w.receiveShadow = true; g.add(w); parts.push(w); }
  if (CR > 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(CR, .011, 10, 80), mat); ring.rotation.x = Math.PI / 2; ring.scale.z = 3.2; ring.position.y = FL + WH * .4; ring.castShadow = true; g.add(ring); parts.push(ring); }
  // where each compartment is, for scatter({ where, pile })
  const sec = i => { const a0 = i / N * Math.PI * 2 + (o.offset || 0), a1 = a0 + Math.PI * 2 / N, am = (a0 + a1) / 2, rm = (CR + R) / 2; return { a0, a1, x: Math.cos(am) * rm, z: Math.sin(am) * rm, r: (R - CR) / 2 }; };
  const inSec = (i, x, z, m = .03) => { if (i < 0) return Math.hypot(x, z) < CR - m; const s = sec(i), r = Math.hypot(x, z); let a = Math.atan2(z, x) - s.a0; a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return r > CR + m && r < R - m - .02 && a * r > m && (s.a1 - s.a0 - a) * r > m; };
  const pileIn = (i, h = .07) => (x, z) => { const s = i < 0 ? { x: 0, z: 0, r: CR } : sec(i), d = Math.hypot(x - s.x, z - s.z) / (s.r * 1.25); return h * Math.max(0, 1 - d * d); };
  const L = st.add({ name: o.name || 'tray', kind: 'place', trigger: o.trigger ?? .045, after: o.after ?? null, obj: g, settle: 1, sec, inSec, pileIn, sections: N,
    plan(st) { g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); parts.forEach(m => st.hf.splat(m)); },
    update(st, s) { const d = 1.15, k = easeOut(s.tau / d), settle = s.tau > d ? .004 * Math.exp(-(s.tau - d) * 9) * Math.sin((s.tau - d) * 40) : 0;
      g.visible = s.tau > 0; g.position.y = lerp(.75, 0, k) + settle; const tilt = lerp(.18, 0, easeOut(s.tau / (d * .9))); g.rotation.set(tilt, lerp(-1.1, 0, k), tilt * .5); }
  });
  return L;
}

/* ---------------- slab: brownie / cake slice / bread. Rounded, noisy box with crumb + crust materials ---------------- */
export function slab(st, o = {}) {
  const BW = o.w || .66, BD = o.d || .62, BH = o.h || .3, BR = o.round ?? .032, ROT = o.rot ?? .32, [AX, AZ] = o.at || [0, 0];
  const hx = BW / 2, hy = BH / 2, hz = BD / 2, nA = o.noise ?? 1;
  const topDisp = (x, z) => nA * (.009 * fbm(x * 3.2 + 4, 7.1, z * 3.2, 3) + .012 * (1 - .55 * (x / hx) ** 2 - .55 * (z / hz) ** 2) - .004);
  const sideDisp = (x, y, z) => nA * (.0085 * fbm(x * 5 + 1, y * 5, z * 5, 3) + .0035 * noise(x * 24, y * 24, z * 24));
  function surf(x, y, z) {
    const qx = clamp(x, -hx + BR, hx - BR), qy = clamp(y, -hy + BR, hy - BR), qz = clamp(z, -hz + BR, hz - BR);
    let dx = x - qx, dy = y - qy, dz = z - qz; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    let px = qx + dx * BR, py = qy + dy * BR, pz = qz + dz * BR;
    if (dy < -.7) return V(px, py, pz);
    const w = sstep(.25, .95, dy), bot = sstep(-hy, -hy + .05, py), d = lerp(sideDisp(px, py, pz), 0, w) * bot;
    px += dx * d; py += dy * d; pz += dz * d; py += w * topDisp(px, pz);
    return V(px, py, pz);
  }
  const g = new THREE.Group(); st.dish.add(g);
  const geo = new THREE.BoxGeometry(BW, BH, BD, 44, 22, 40), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const v = surf(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v.x, v.y, v.z); }
  for (const [gi, gr] of geo.groups.entries()) { const sv = gi < 2 ? BH / BD : gi > 3 ? BH / BW : 1, off = gi * .37, seen = new Set(); for (let k = gr.start; k < gr.start + gr.count; k++) { const vi = geo.index.getX(k); if (seen.has(vi)) continue; seen.add(vi); uv.setXY(vi, uv.getX(vi) + off, uv.getY(vi) * sv + off * .5); } }
  smoothNormals(geo);
  const side = matOf(st, o.side || 'crumbSide', o.sideTint), topM = matOf(st, o.top || 'crumbTop', o.topTint);
  const mesh = new THREE.Mesh(geo, [side, side, topM, side, side, side]); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
  // crumbs that jump off on impact
  const NC = o.crumbs === false ? 0 : 34;
  const cg = new THREE.IcosahedronGeometry(1, 1); { const cp = cg.attributes.position, r = rng(77); for (let i = 0; i < cp.count; i++) { const s = .7 + r() * .5; cp.setXYZ(i, cp.getX(i) * s, cp.getY(i) * s * .8, cp.getZ(i) * s); } cg.computeVertexNormals(); }
  const crumbs = new THREE.InstancedMesh(cg, matOf(st, 'matte', o.crumbColor || '#3a1f12', .8), Math.max(1, NC)); crumbs.castShadow = true; crumbs.frustumCulled = false; st.dish.add(crumbs);
  const cr = rng(9), cd = [...Array(NC)].map(() => { const a = cr() * Math.PI * 2, ex = Math.cos(a), ez = Math.sin(a), lx = clamp(ex * 1.3, -1, 1) * hx, lz = clamp(ez * 1.3, -1, 1) * hz; return { a, sp: .5 + cr() * 1.1, x0: AX + lx * Math.cos(ROT) + lz * Math.sin(ROT), z0: AZ - lx * Math.sin(ROT) + lz * Math.cos(ROT), vy: .8 + cr() * 1.3, s: .005 + cr() * .009, rx: cr() * 6, ry: cr() * 6, spin: 4 + cr() * 10 }; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), vv = V(), sc = V(), E = new THREE.Euler();
  let restY = 0, floorY = .04, lastKey = null;
  const L = st.add({ name: o.name || 'slab', kind: 'drop', trigger: o.trigger ?? .2, after: o.after, obj: g, drop: Object.assign({ h: 2.9, bounce: .012, squash: .07, shake: .05 }, o.drop), impact: true, impactT: -1,
    local: { hx, hy, hz, rot: ROT, at: [AX, AZ], topY: (x, z) => hy + topDisp(x, z) },
    plan(st) { floorY = st.hf.max(AX, AZ, Math.min(hx, hz) * .6); restY = floorY + hy - .003; g.position.set(AX, restY, AZ); g.rotation.set(0, ROT, 0); g.scale.set(1, 1, 1); st.hf.splat(mesh); },
    update(st, s) {
      g.visible = s.tau > 0; g.position.y = restY + s.y; g.scale.set(1 + (1 - s.s) * .6, s.s, 1 + (1 - s.s) * .6);
      const ft = fallT(L.drop.h), k = s.land < 0 ? 1 - s.tau / ft : 0; g.rotation.set(.22 * k, ROT + .5 * k, 0);
      L.impactT = s.land;
      const key = s.land < 0 ? -1 : Math.min(s.land, 2); if (key === lastKey || !NC) return; lastKey = key;
      for (let i = 0; i < NC; i++) { const c = cd[i]; if (s.land < 0) { m4.makeScale(0, 0, 0); crumbs.setMatrixAt(i, m4); continue; }
        const u = Math.min(s.land, 2), tHit = (c.vy + Math.sqrt(c.vy * c.vy + 2 * 9.8 * .02)) / 9.8, ut = Math.min(u, tHit), kk = 1 - Math.exp(-Math.max(0, u - tHit) * 6);
        let x = c.x0 + Math.cos(c.a) * c.sp * (ut * .55 + .06 * kk), z = c.z0 + Math.sin(c.a) * c.sp * (ut * .55 + .06 * kk); const rr = Math.hypot(x, z); if (rr > .82) { x *= .82 / rr; z *= .82 / rr; }
        const y = Math.max(st.hf.at(x, z) + c.s * .6, .02 + c.vy * ut - 4.9 * ut * ut);
        q.setFromEuler(E.set(c.rx + c.spin * ut, c.ry + c.spin * .7 * ut, 0)); m4.compose(vv.set(x, y, z), q, sc.set(c.s, c.s, c.s)); crumbs.setMatrixAt(i, m4); }
      crumbs.instanceMatrix.needsUpdate = true;
    }
  });
  return L;
}

/* ---------------- disc: buns, patties, pancakes, tomato, lettuce (ruffle), cookies ---------------- */
export function disc(st, o = {}) {
  const R = o.r || .42, Hh = o.h || .1, DOME = o.dome || 0, BEV = Math.min(o.bevel ?? .03, Hh * .45), [AX, AZ] = o.at || [0, 0], NA = o.noise ?? .006, RUF = o.ruffle || 0;
  const prof = [new THREE.Vector2(0, 0)];
  for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R - BEV + Math.cos(a) * BEV, BEV + Math.sin(a) * BEV)); }
  const sideTop = Hh - (DOME ? 0 : BEV);
  prof.push(new THREE.Vector2(R, sideTop));
  if (DOME) { for (let k = 1; k <= 24; k++) { const t = k / 24, a = t * Math.PI / 2; prof.push(new THREE.Vector2(R * Math.cos(a), sideTop + DOME * Math.sin(a))); } prof[prof.length - 1].x = 0; }
  else { for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R - BEV + Math.cos(a) * BEV, Hh - BEV + Math.sin(a) * BEV)); } prof.push(new THREE.Vector2(0, Hh)); }
  const geo = new THREE.LatheGeometry(prof, 96), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    const n = NA * fbm(x * 6 + 3, y * 6, z * 6, 3), k = r > 1e-4 ? (r + n) / r : 1;
    let yy = y + (y > Hh * .5 ? n * .6 : 0);
    if (RUF) yy += RUF * sstep(R * .8, R, r) * (Math.sin(a * 11 + 2 * noise(Math.cos(a) * 2, Math.sin(a) * 2, 1)) + .4 * noise(x * 14, 0, z * 14));
    p.setXYZ(i, x * k, Math.max(0, yy), z * k); }
  smoothNormals(geo, 1e-5);
  const g = new THREE.Group(); st.dish.add(g);
  const mesh = new THREE.Mesh(geo, matOf(st, o.mat || 'bake', o.color)); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
  let restY = 0;
  const L = st.add({ name: o.name || 'disc', kind: 'drop', trigger: o.trigger ?? .3, after: o.after, obj: g, drop: Object.assign({ h: 2.6, bounce: .02, squash: .12, shake: .025 }, o.drop),
    plan(st) { restY = st.hf.max(AX, AZ, R * .55) - (o.sink ?? .004); g.position.set(AX, restY, AZ); g.rotation.set(0, o.rot || 0, 0); g.scale.set(1, 1, 1); st.hf.splat(mesh); },
    update(st, s) { g.visible = s.tau > 0; g.position.y = restY + s.y; g.scale.set(1 + (1 - s.s) * .5, s.s, 1 + (1 - s.s) * .5); const ft = fallT(L.drop.h); g.rotation.set(s.land < 0 ? -.25 * (1 - s.tau / ft) : 0, (o.rot || 0) + (s.land < 0 ? .4 * (1 - s.tau / ft) : 0), 0); }
  });
  return L;
}

/* ---------------- sheet: a slice that melts/drapes over what's under it (cheese) ---------------- */
export function sheet(st, o = {}) {
  const S = o.size || .62, T = o.thick || .012, N = 44, [AX, AZ] = o.at || [0, 0], ROT = o.rot ?? .7, DROOP = o.droop ?? .07;
  const g = new THREE.Group(); st.dish.add(g);
  const top = dynGrid(N, N, matOf(st, o.mat || 'cheese', o.color), false); top.material.side = THREE.DoubleSide; g.add(top);
  let restY = 0;
  const L = st.add({ name: o.name || 'sheet', kind: 'drop', trigger: o.trigger ?? .4, after: o.after, obj: g, drop: Object.assign({ h: 2.2, bounce: .006, squash: .05, shake: .01 }, o.drop),
    plan(st) {
      const c = Math.cos(ROT), s = Math.sin(ROT), { pos } = top.userData, base = st.hf.max(AX, AZ, S * .3);
      restY = base;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const u = (i / (N - 1) - .5) * S, v = (j / (N - 1) - .5) * S, x = AX + u * c - v * s, z = AZ + u * s + v * c;
        const edge = Math.max(Math.abs(u), Math.abs(v)) / (S / 2), sag = DROOP * sstep(.45, 1, edge) ** 1.5 * (1 + .3 * noise(u * 9, v * 9, 3));
        const y = Math.max(st.hf.at(x, z) + T * .6, base + T - sag);
        const k = (i * N + j) * 3; pos[k] = x - AX; pos[k + 1] = y - base; pos[k + 2] = z - AZ;
      }
      commitGrid(top); g.position.set(AX, restY, AZ); st.hf.splat(top);
    },
    update(st, s) { g.visible = s.tau > 0; g.position.y = restY + s.y; g.scale.set(1, s.s, 1); }
  });
  return L;
}

/* ---------------- dome: a scoop (ice cream, frosting swirl base) with scraped ridges + lip ---------------- */
export function dome(st, o = {}) {
  const SR = o.r || .25, FLOOR = -.56, [AX, AZ] = o.at || [-.015, .02];
  const SRT = 96, SRP = 192, tab = new Float32Array((SRT + 1) * (SRP + 1)), tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(.62, .4, 0)), d = V(), t = V();
  for (let i = 0; i <= SRT; i++) for (let j = 0; j <= SRP; j++) {
    const th = i / SRT * Math.PI, ph = j / SRP * Math.PI * 2; d.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); t.copy(d).applyQuaternion(tiltQ);
    const th2 = Math.acos(clamp(t.y, -1, 1)), swirl = 2.6 * fbm(d.x * 1.2 + 3, d.y * 1.2, d.z * 1.2, 3), mask = clamp(.5 + 1.4 * noise(d.x * 1.6 + 7, d.y * 1.6, d.z * 1.6)) * sstep(-.7, .1, d.y);
    const ridge = (o.ridges === false ? 0 : .04) * (1 - Math.abs(Math.sin(th2 * 4.2 + swirl))) ** 4 * mask, crag = .03 * Math.abs(fbm(d.x * 4, d.y * 4, d.z * 4, 3)) * sstep(.3, -.6, d.y);
    tab[i * (SRP + 1) + j] = 1 + ridge + .045 * fbm(d.x * 2.1, d.y * 2.1 + 9, d.z * 2.1, 3) + .01 * noise(d.x * 9, d.y * 9, d.z * 9) + crag;
  }
  const srAt = (th, ph) => { ph = ((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); const fi = clamp(th / Math.PI) * SRT, fj = ph / (Math.PI * 2) * SRP, i = Math.min(SRT - 1, Math.floor(fi)), j = Math.min(SRP - 1, Math.floor(fj)), a = fi - i, b = fj - j, W = SRP + 1; return lerp(lerp(tab[i * W + j], tab[i * W + j + 1], b), lerp(tab[(i + 1) * W + j], tab[(i + 1) * W + j + 1], b), a); };
  function pt(th, ph, out = V()) {
    const r = srAt(th, ph), s = Math.sin(th); let x = s * Math.cos(ph) * r, y = Math.cos(th) * r, z = s * Math.sin(ph) * r;
    const lip = .13 * Math.exp(-(((y - (FLOOR + .1)) / .085) ** 2)) * (.75 + .5 * noise(Math.cos(ph) * 3.1, Math.sin(ph) * 3.1, 2.7) + .18 * noise(Math.cos(ph) * 11, Math.sin(ph) * 11, 5)); x *= 1 + lip; z *= 1 + lip;
    if (y < FLOOR + .06) { const tt = sstep(FLOOR + .06, FLOOR - .25, y); y = lerp(y, FLOOR, tt); const sh = lerp(1, .82, sstep(FLOOR, FLOOR - .5, Math.cos(th) * r)); x *= sh; z *= sh; y = Math.max(y, FLOOR); }
    return out.set(x, y, z);
  }
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); inner.scale.setScalar(SR); st.dish.add(g);
  const geo = new THREE.SphereGeometry(1, 144, 96), p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); pt(Math.acos(clamp(v.y, -1, 1)), Math.atan2(v.z, v.x), v); p.setXYZ(i, v.x, v.y, v.z); }
  smoothNormals(geo, 1e-5);
  const mesh = new THREE.Mesh(geo, matOf(st, o.mat || 'cream', o.color)); mesh.castShadow = mesh.receiveShadow = true; inner.add(mesh);
  const C = V();
  const L = st.add({ name: o.name || 'dome', kind: 'drop', trigger: o.trigger ?? .36, after: o.after, obj: g, drop: Object.assign({ h: 2.6, bounce: .03, squash: .2, shake: .02 }, o.drop),
    pt, inner, mesh, SR, center: C, FLOOR,
    plan(st) { L.under = st.hf.snapshot(); const base = st.hf.max(AX, AZ, SR * .5); C.set(AX, base - FLOOR * SR - .012, AZ); g.position.copy(C); g.rotation.set(0, 0, 0); inner.scale.setScalar(SR); st.hf.splat(mesh); },
    update(st, s) { g.visible = s.tau > 0; g.position.set(C.x, C.y + s.y, C.z); inner.scale.set(SR * (1 + (1 - s.s) * .7), SR * s.s, SR * (1 + (1 - s.s) * .7)); g.rotation.set(s.land < 0 ? -.3 * (1 - s.tau / fallT(L.drop.h)) : 0, 0, 0); }
  });
  return L;
}

/* ---------------- sauce: poured stream → cap over a dome → pool on top → drips over the edges → puddles ---------------- */
export function sauce(st, o = {}) {
  const mat = matOf(st, o.mat || 'sauce', o.color), from = o.from ?? .48, to = o.to ?? .68, [AX, AZ] = o.at || [0, 0];
  const RMAX = o.radius || .42, T = o.thick || .0105, NDR = o.drips ?? 9, r0 = rng(o.seed || 42);
  const over = o.over ? st.byName[o.over] : null;
  let H = null;   // surface the pool + drips follow
  const L = st.add({ name: o.name || 'sauce', kind: 'flow', from, to, rate: o.rate || .55, after: o.after, busy: false });
  // ---- cap over a dome (the hot-fudge look) ----
  let cap = null, DR = [];
  if (over) {
    cap = dynGrid(56, 241, mat); over.inner.add(cap);
    DR = [...Array(10)].map((_, i) => ({ ph: (i / 10) * Math.PI * 2 + (r0() - .5) * .45, w: .13 + r0() * .13, len: [.95, .3, .7, .45, 1, .2, .62, .85, .35, .55][i] * (.85 + r0() * .3), d: .05 + r0() * .3, bulb: .35 + r0() * .45 }));
  }
  const capV = V();
  function buildCap(F) {
    if (!cap) return; cap.visible = F > .003; if (!cap.visible) return;
    const { nu, nv, pos } = cap.userData;
    for (let j = 0; j < nv; j++) {
      const ph = j / (nv - 1) * Math.PI * 2, base = lerp(.08, 1.1, easeOut(F / .34)) + .11 * noise(Math.cos(ph) * 2.3, Math.sin(ph) * 2.3, 11) * sstep(0, .3, F);
      let E = base, tip = 0;
      for (const d of DR) { let dp = Math.abs(ph - d.ph); dp = Math.min(dp, Math.PI * 2 - dp); const x = dp / d.w; if (x >= 1) continue; const Ld = d.len * easeOut((F - d.d) / .5); if (Ld <= 0) continue; const pr = Math.pow(1 - x * x, .3), vv = base + Ld * pr; if (vv > E) { E = vv; tip = d.bulb * pr * sstep(.05, .3, Ld); } }
      E = Math.min(E, 2);
      for (let i = 0; i < nu; i++) { const s = i / (nu - 1); over.pt(s * E, ph, capV); const th = (.07 * (1 + (.7 + tip) * Math.exp(-(((s - .9) / .08) ** 2))) * Math.sqrt(clamp((1 - s) / .07)) + .006) * sstep(0, .06, F), len = capV.length(); capV.multiplyScalar((len + th) / len); const k = (i * nv + j) * 3; pos[k] = capV.x; pos[k + 1] = capV.y; pos[k + 2] = capV.z; }
    }
    commitGrid(cap);
  }
  // ---- pool draped over whatever is underneath (uses the height field) ----
  const pool = dynGrid(28, 221, mat); st.dish.add(pool);
  let lobes = [], drips = [], baseR = 0, cx = AX, cz = AZ;
  function buildPool(F2) {
    pool.visible = F2 > .001; if (!pool.visible) return;
    const { nu, nv, pos } = pool.userData;
    for (let j = 0; j < nv; j++) {
      const a = j / (nv - 1) * Math.PI * 2; let R = baseR + .07 * easeOut(F2) + .02 * noise(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 4);
      for (const lb of lobes) { let d = Math.abs(a - lb.a); d = Math.min(d, Math.PI * 2 - d); R += lb.r * Math.exp(-((d / .2) ** 2)) * easeOut((F2 - lb.d) / .55); }
      R = Math.min(R, RMAX);
      for (let i = 0; i < nu; i++) { const f = i / (nu - 1), r = f * R, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, pr = f < .8 ? 1 : Math.sqrt(clamp(1 - ((f - .8) / .2) ** 2)), h = T * pr * (1 + .35 * Math.exp(-(((f - .78) / .1) ** 2))) + .0015; const k = (i * nv + j) * 3; pos[k] = x; pos[k + 1] = H.at(x, z) + h; pos[k + 2] = z; }
    }
    commitGrid(pool);
  }
  // ---- drips over edges: found by marching out from the centre until the surface drops away ----
  const DM = 48, DJ = 13, tA = V(), tN = V();
  function buildDrip(dr, Lc) {
    const m = dr.mesh; m.visible = Lc > .004; if (!m.visible) return;
    const { nu, nv, pos } = m.userData, Wd = dr.w;
    for (let i = 0; i < nu; i++) {
      const u = i / (nu - 1) * Lc, f = clamp(u / dr.total) * (dr.pts.length - 1), k0 = Math.min(dr.pts.length - 2, Math.floor(f)), tt = f - k0;
      tA.lerpVectors(dr.pts[k0], dr.pts[k0 + 1], tt); tN.lerpVectors(dr.nrm[k0], dr.nrm[k0 + 1], tt).normalize();
      let w = Wd * (1 - .3 * sstep(0, Lc, u)) + Wd * .55 * Math.exp(-(((u - (Lc - Wd * 1.1)) / (Wd * .9)) ** 2)) * sstep(.03, .1, Lc);
      w *= Math.sqrt(clamp((Lc - u) / (Wd * 1.2))) * (1 + .12 * noise(u * 30, dr.a * 3, 1)); if (u < .05) w *= lerp(1.6, 1, u / .05);
      for (let j = 0; j < nv; j++) { const an = j / (nv - 1) * Math.PI, c = Math.cos(an), sn = Math.sin(an), kk = (i * nv + j) * 3;
        pos[kk] = tA.x + dr.side.x * c * w + tN.x * (sn * w * .62 + .0012); pos[kk + 1] = tA.y + dr.side.y * c * w + tN.y * (sn * w * .62 + .0012); pos[kk + 2] = tA.z + dr.side.z * c * w + tN.z * (sn * w * .62 + .0012); }
    }
    commitGrid(m);
  }
  const puddles = [];
  // ---- the pour ----
  const stream = o.stream === false ? null : dynGrid(90, 13, mat); if (stream) st.dish.add(stream);
  let topY = 0;
  function buildStream(F) {
    if (!stream) return; const top = lerp(topY + 3.5, topY + .02, easeInOut((F - .36) / .14)), bot = lerp(topY + 3.5, topY - .01, easeOut(F / .05));
    stream.visible = F > .002 && F < .5 && top > bot + .01; if (!stream.visible) return;
    const { nu, nv, pos } = stream.userData, t = st.time;
    for (let i = 0; i < nu; i++) { const f = i / (nu - 1), y = lerp(top, bot, f), x = cx + .012 * (1 - f) * Math.sin(t * 5 + y * 4) + .006 * noise(y * 3, t * .8, 3), z = cz + .008 * Math.cos(t * 4.2 + y * 3);
      let r = .021 * (1 - .25 * (1 - f)) * (1 + .08 * Math.sin(y * 18 - t * 14)); if (f > .96) r *= 1 + (f - .96) / .04 * .9; if (f < .03) r *= Math.sqrt(f / .03);
      for (let j = 0; j < nv; j++) { const a = j / (nv - 1) * Math.PI * 2, k = (i * nv + j) * 3; pos[k] = x + Math.cos(a) * r; pos[k + 1] = y; pos[k + 2] = z + Math.sin(a) * r; } }
    commitGrid(stream);
  }
  function setF(F) {
    const capPart = over ? F : 0; buildCap(capPart);
    const F2 = over ? clamp((F - .3) / .5) : clamp(F / .6);
    buildPool(F2);
    for (const dr of drips) { const gg = clamp((F - (over ? .5 : .35) - dr.d * .4) / .4), Lc = Math.min(dr.len * easeInOut(gg) + (gg > 0 ? .07 : 0) * sstep(0, .1, gg), dr.total + .01); buildDrip(dr, Lc);
      if (dr.puddle) { const reach = clamp((Lc - (dr.total - .015)) / .03); buildPoolBlob(dr.puddle, dr.end, (.02 + .035 * easeOut(reach)), reach > .01); } }
  }
  function buildPoolBlob(m, c, R, vis) { m.visible = vis; if (!vis) return; const { nu, nv, pos } = m.userData;
    for (let j = 0; j < nv; j++) { const a = j / (nv - 1) * Math.PI * 2, Rr = R * (1 + .18 * noise(Math.cos(a) * 2, Math.sin(a) * 2, c.x * 9)); for (let i = 0; i < nu; i++) { const f = i / (nu - 1), x = c.x + Math.cos(a) * f * Rr, z = c.z + Math.sin(a) * f * Rr, pr = f < .8 ? 1 : Math.sqrt(clamp(1 - ((f - .8) / .2) ** 2)); const k = (i * nv + j) * 3; pos[k] = x; pos[k + 1] = c.y + .007 * pr + .001; pos[k + 2] = z; } }
    commitGrid(m); }
  L.plan = st => {
    H = over ? over.under : st.hf.snapshot();   // freeze: layers planned later (a top bun) must not lift the sauce
    if (over) { cx = over.center.x; cz = over.center.z; baseR = over.SR * .98; topY = over.center.y + over.SR * 1.06; over.inner.updateWorldMatrix(true, true); }
    else { baseR = o.startR || .06; topY = st.hf.at(cx, cz); }
    // find the edges: march outward along candidate angles until the surface drops
    const sr = rng(o.seed || 5);
    for (let k = 0; k < NDR; k++) {
      const a = (k / NDR) * Math.PI * 2 + (sr() - .5) * .5; let prev = H.at(cx + Math.cos(a) * baseR, cz + Math.sin(a) * baseR), edge = null;
      for (let r = baseR; r < RMAX; r += .004) { const h = H.at(cx + Math.cos(a) * (r + .004), cz + Math.sin(a) * (r + .004)), h2 = H.at(cx + Math.cos(a) * (r + .045), cz + Math.sin(a) * (r + .045)); if (prev - h > .02 && prev - h2 > .04) { edge = r; break; } prev = h; }
      if (edge === null) continue;
      const ex = Math.cos(a), ez = Math.sin(a), yTop = H.at(cx + ex * (edge - .01), cz + ez * (edge - .01)), yBot = H.at(cx + ex * (edge + .05), cz + ez * (edge + .05));
      lobes.push({ a, r: Math.max(0, edge - baseR - .05) + .02, d: sr() * .4 });
      const pts = [], nrm = [], steps = 40, top = .06, drop = yTop - yBot, total = top + drop;
      for (let s = 0; s <= steps; s++) { const u = s / steps * total; let rr, y, n;
        if (u < top) { rr = edge - top + u; y = H.at(cx + ex * rr, cz + ez * rr) + .001; n = V(0, 1, 0); } else { rr = edge + .002; y = yTop - (u - top); n = V(ex, 0, ez); }
        pts.push(V(cx + ex * rr, y, cz + ez * rr)); nrm.push(n); }
      const dr = { a, pts, nrm, total, side: V(-ez, 0, ex), w: .016 + sr() * .012, len: (.35 + sr() * .65) * total, d: sr() * .25, mesh: dynGrid(DM, DJ, mat, false) };
      if (sr() < .5) dr.len = total + .02;
      st.dish.add(dr.mesh);
      if (dr.len > total - .01 && o.puddles !== false) { dr.end = V(cx + ex * (edge + .03), yBot, cz + ez * (edge + .03)); dr.puddle = dynGrid(10, 65, mat); st.dish.add(dr.puddle); puddles.push(dr.puddle); }
      drips.push(dr);
    }
    setF(1); [cap, pool, ...drips.map(d => d.mesh)].forEach(m => m && m.visible && st.hf.splat(m));
    L.capTop = over ? over.center.y : topY;
  };
  L.reset = st => setF(0);
  let lastKey = '';
  L.update = (st, s) => {
    const key = s.F.toFixed(4); L.busy = s.F > .002 && s.F < .5;
    if (key !== lastKey) { lastKey = key; setF(s.F); }
    buildStream(s.F);
  };
  L.objs = () => [cap, pool, stream, ...drips.map(d => d.mesh), ...puddles].filter(Boolean);
  return L;
}

/* ---------------- scatter: sprinkles, sesame seeds, nuts, chips. Released by scroll, each falls on its own clock ---------------- */
export function scatter(st, o = {}) {
  const N = o.count || (st.LOW ? 260 : 360), [AX, AZ] = o.at || [0, 0], RAD = o.radius || .31, SPILL = o.spill ?? .12;
  const shapes = { jimmy: () => new THREE.CapsuleGeometry(.0068, .04, 3, 8), seed: () => { const g = new THREE.SphereGeometry(.012, 10, 8); g.scale(1, .45, .62); return g; }, chip: () => new THREE.BoxGeometry(.03, .016, .026), nut: () => new THREE.IcosahedronGeometry(.016, 0) };
  const geo = o.geometry || (shapes[o.shape || 'jimmy'] || shapes.jimmy)(); if (o.scale) geo.scale(o.scale, o.scale, o.scale);
  const mat = o.mat ? matOf(st, o.mat, o.color) : new THREE.MeshPhysicalMaterial({ roughness: .38, clearcoat: .7, clearcoatRoughness: .2, sheen: .2 });
  const im = new THREE.InstancedMesh(geo, mat, N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; st.dish.add(im);
  const COLS = (o.colors || ['#f06f9b', '#f5c842', '#4fa6e8', '#6cc46b', '#f58a35', '#f3ece0', '#9b74db', '#e8484f']).map(c => new THREE.Color(c));
  let D = [], dirty = true;
  const m4 = new THREE.Matrix4(), qa = new THREE.Quaternion(), va = V(), one = V(1, 1, 1), up = V(0, 1, 0), yA = V(0, 1, 0), tmpQ = new THREE.Quaternion();
  const L = st.add({ name: o.name || 'scatter', kind: 'scatter', from: o.from ?? .66, to: o.to ?? .8, after: o.after, done: 0, obj: im,
    plan(st) {
      const r = rng(o.seed || 321), avoid = o.avoid ? o.avoid() : null; D = [];
      let guard = 0;
      while (D.length < N && guard++ < N * 20) {
        const spill = r() < SPILL, a = r() * Math.PI * 2, rad = spill ? RAD + .05 + r() * .45 : Math.sqrt(r()) * RAD, x = AX + Math.cos(a) * rad, z = AZ + Math.sin(a) * rad;
        if (Math.hypot(x, z) > .9) continue; if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoid.r) continue; if (o.where && !o.where(x, z)) continue;
        let y = st.hf.at(x, z), n = st.hf.normal(x, z); if (!spill && y < (o.minY ?? 0)) continue; if (n.y < .15) continue;
        if (o.pile) { const e = .01, pz = (a, b) => o.pile(a, b); y += pz(x, z) * (.55 + .45 * r()); n.set(-(pz(x + e, z) - pz(x - e, z)) / (2 * e), 1, -(pz(x, z + e) - pz(x, z - e)) / (2 * e)).normalize(); }
        const t = V(r() - .5, 0, r() - .5).cross(n).normalize(); if (t.lengthSq() < .1) continue;
        const q = (o.shape === 'jimmy' || !o.shape) && !o.geometry ? new THREE.Quaternion().setFromUnitVectors(up, t) : new THREE.Quaternion().setFromUnitVectors(up, n).multiply(tmpQ.setFromAxisAngle(up, r() * 6));
        D.push({ p: V(x, y, z).addScaledVector(n, .0045), q, q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), h: 2.2 + r() * 1.6, dx: (r() - .5) * .25, dz: (r() - .5) * .25, rel: spill ? .25 + r() * .75 : r(), spin: 6 + r() * 12, hop: r() < .3 ? .02 + r() * .04 : 0, tau: 0, st: -1 });
        im.setColorAt(D.length - 1, COLS[Math.floor(r() * COLS.length)]);
      }
      im.count = D.length; im.instanceColor && (im.instanceColor.needsUpdate = true);
    },
    update(st, s) {
      let landed = 0; L.busy = false;
      for (let i = 0; i < D.length; i++) {
        const d = D[i], on = s.rel > d.rel * .96, tf = fallT(d.h);
        d.tau = on ? Math.min(d.tau + s.dt, tf + .8) : Math.max(0, d.tau - s.dt * 3); if (st.settle) d.tau = on ? tf + .8 : 0;
        if (d.tau <= 0) { if (d.st !== 0) { d.st = 0; m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); dirty = true; } continue; }
        if (d.tau >= tf + .8) { landed++; if (d.st === 2) continue; d.st = 2; } else { d.st = 1; L.busy = true; }
        dirty = true; let pos;
        if (d.tau < tf) { const k = d.tau / tf; pos = va.set(d.p.x + d.dx * (1 - k), d.p.y + d.h - .5 * G * d.tau * d.tau, d.p.z + d.dz * (1 - k)); qa.copy(d.q0).multiply(tmpQ.setFromAxisAngle(yA, d.spin * d.tau)).slerp(d.q, sstep(.75, 1, k)); }
        else { const u = d.tau - tf; if (d.st === 1) landed++; pos = va.copy(d.p); pos.y += d.hop * Math.abs(Math.sin(u * 16)) * Math.exp(-u * 9); qa.copy(d.q); }
        m4.compose(pos, qa, one); im.setMatrixAt(i, m4);
      }
      if (dirty) { im.instanceMatrix.needsUpdate = true; dirty = false; }
      L.done = D.length ? landed / D.length : 1;
    }
  });
  return L;
}

/* ---------------- topper: cherry / berry with a springy stem, bounces on landing ---------------- */
export function topper(st, o = {}) {
  const CR = o.r || .072, g = new THREE.Group(), body = new THREE.Group(); g.add(body); st.dish.add(g);
  const geo = new THREE.SphereGeometry(1, 96, 64), p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const th = Math.acos(clamp(v.y, -1, 1)); const r = 1 - .2 * Math.exp(-((th / .38) ** 2)) - .06 * Math.exp(-(((Math.PI - th) / .3) ** 2)) + .015 * noise(v.x * 3, v.y * 3, v.z * 3); v.multiplyScalar(r); v.y *= .93; v.x *= 1.02; p.setXYZ(i, v.x, v.y + 1, v.z); }
  smoothNormals(geo, 1e-5);
  const mat = matOf(st, o.mat || 'candy', o.color || '#a50c19'); if (mat.emissive && !o.mat) { mat.emissive.set('#3a0207'); mat.emissiveIntensity = .35; }
  const m = new THREE.Mesh(geo, mat); m.scale.setScalar(CR); m.castShadow = m.receiveShadow = true; body.add(m);
  let stemPivot = null;
  if (o.stem !== false) { stemPivot = new THREE.Group(); stemPivot.position.y = CR * 1.78; body.add(stemPivot);
    const curve = new THREE.CatmullRomCurve3([V(0, -.01, 0), V(.008, .06, .002), V(.035, .13, .01), V(.085, .19, .02), V(.13, .215, .024)].map(q => q.multiplyScalar(CR / .072)));
    const sm = matOf(st, 'matte', o.stemColor || '#6f5a2a'), stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .0042 * CR / .072, 10, false), sm); stem.castShadow = true; stemPivot.add(stem);
    const end = new THREE.Mesh(new THREE.SphereGeometry(.0046 * CR / .072, 12, 8), sm); end.position.copy(curve.getPoint(1)); stemPivot.add(end); }
  const rest = V(), [AX, AZ] = o.at || [.01, -.015];
  const L = st.add({ name: o.name || 'topper', kind: 'drop', trigger: o.trigger ?? .835, after: o.after, obj: g, drop: Object.assign({ h: 2.4, bounce: .055, squash: .16, shake: .008 }, o.drop),
    avoid: () => ({ x: AX, z: AZ, r: CR * .9 }),
    plan(st) { rest.set(AX, st.hf.at(AX, AZ) - CR * .28, AZ); g.position.copy(rest); },
    update(st, s) { g.visible = s.tau > 0; g.position.set(rest.x, rest.y + s.y, rest.z); body.scale.set(1 + (1 - s.s) * .5, s.s, 1 + (1 - s.s) * .5); g.rotation.set(.12, .6 + (s.land < 0 ? s.tau * 3 : 0), -.1);
      if (stemPivot) { stemPivot.rotation.z = s.land < 0 ? -.25 : .35 * Math.exp(-s.land * 3.2) * Math.sin(s.land * 17); stemPivot.rotation.x = s.land < 0 ? 0 : .15 * Math.exp(-s.land * 3) * Math.sin(s.land * 13 + 1); } }
  });
  return L;
}
