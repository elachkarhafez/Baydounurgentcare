/* =====================================================================
   Petals & Poetry: their drinks and sweets in real 3D.
   mountBloom: the Matcha In Bloom gets built like a Blender scene. The glass
     starts as an orange-wire model on a viewport grid, shades in, milk and
     matcha pour, ice drops, an icing swirl pipes on, then every buttercream
     petal is piped one at a time (wire first, then solid) while the camera
     zooms in close. Sugar pearls, then the camera pulls back to the hero shot.
     Everything is a pure function of the timeline, so pose(t) and replay() work.
   mountLineup: the menu on a round white-marble table you spin. The front
     item lifts, turns and the camera eases in on it.
   Kit method: studio HDRI, physical materials, lathe + swept geometry,
   ShadowMaterial floor on a transparent canvas, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh petalsnpoetry/src/bloom.js petalsnpoetry/assets/bloom.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = t => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const bounce = t => { t = clamp(t); const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 11; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// value noise
const P = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rnd(0, i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  const l = (a, b, t) => a + t * (b - a);
  return l(l(l(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), l(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    l(l(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), l(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}

/* ---------------- shared renderer setup ---------------- */
async function stage(canvas, o) {
  const A = o.assets || 'assets/';
  const SMALL = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 2 : 2.25));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const env = await new Promise(r => new RGBELoader().load(A + 'studio.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .85; }
  const key = new THREE.DirectionalLight(0xfff6ec, 2.3); key.position.set(4, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); key.shadow.radius = 6; key.shadow.bias = -.0003; key.shadow.normalBias = .015;
  const rim = new THREE.DirectionalLight(0xd8e6ff, 1.5); rim.position.set(-5, 4, -6);
  const fill = new THREE.DirectionalLight(0xffeef2, .45); fill.position.set(-4, 2, 5);
  scene.add(key, key.target, rim, fill, new THREE.HemisphereLight(0xffffff, 0xc9d6e8, .55));
  const tl = new THREE.TextureLoader();
  const tex = (f, srgb) => new Promise(r => tl.load(A + 'tex/' + f, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; r(t); }, undefined, () => r(null)));
  const [iceN, marble, marbleN] = await Promise.all([tex('ice_n.webp'), tex('marble.webp', true), tex('marble_n.webp')]);
  return { renderer, scene, key, SMALL, iceN, marble, marbleN };
}
function loopWhileVisible(canvas, tick) {
  let visible = true, raf = 0, last = performance.now(), want = true;
  function frame(now) { raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; want = tick(dt) !== false; if (visible && !document.hidden && want) raf = requestAnimationFrame(frame); }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { rootMargin: '80px' }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  return kick;
}

/* ---------------- textures made in code ---------------- */
function liquidTexture(stops, seedZ = 1) {
  // vertical gradient through colour stops, with marbled swirls where layers meet
  const W = 128, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), d = g.createImageData(W, H);
  const cols = stops.map(([p, h]) => [p, new THREE.Color(h)]), tmp = new THREE.Color();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 1 - y / H; const u = x / W;
    v += noise3(Math.cos(u * 6.283) * 1.4, Math.sin(u * 6.283) * 1.4 + seedZ, v * 7) * .05 + noise3(u * 9, v * 19, seedZ * 3) * .012;
    let k = 0; while (k < cols.length - 2 && v > cols[k + 1][0]) k++;
    const [p0, c0] = cols[k], [p1, c1] = cols[k + 1]; tmp.copy(c0).lerp(c1, smooth(p0, p1, v));
    const i = (y * W + x) * 4; d.data[i] = tmp.r * 255; d.data[i + 1] = tmp.g * 255; d.data[i + 2] = tmp.b * 255; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function speckTexture(base, speck, n = 260, rad = 2.2) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); g.fillStyle = speck;
  for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(rnd(0, 256), rnd(0, 256), rad * rnd(.6, 1.2), rad * rnd(.4, .8), rnd(0, 3), 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- materials ---------------- */
function glassMat(op = .12) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: op, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.9, side: THREE.DoubleSide, depthWrite: false });
  m.userData.op = op;
  m.onBeforeCompile = s => {
    // glass gets brighter and more solid at grazing angles (fresnel), like a real tumbler wall
    s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      float fres = pow(1.0 - abs(dot(normalize(-vViewPosition), normal)), 2.4);
      gl_FragColor.a = clamp(gl_FragColor.a * (1.0 + fres * 5.0) + fres * .22, 0.0, .9);
      gl_FragColor.rgb += fres * .07;`);
  };
  return m;
}
const icingMats = new Map();
function icing(hex) {
  if (icingMats.has(hex)) return icingMats.get(hex);
  const c = new THREE.Color(hex);
  const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: .66, specularIntensity: .35, sheen: 1, sheenRoughness: .6, sheenColor: new THREE.Color(0xffffff).lerp(c, .4), emissive: c.clone().multiplyScalar(.07), vertexColors: true, side: THREE.DoubleSide });
  icingMats.set(hex, m); return m;
}
const icingPlain = hex => new THREE.MeshPhysicalMaterial({ color: hex, roughness: .66, specularIntensity: .35, sheen: 1, sheenRoughness: .6, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(hex).multiplyScalar(.07) });

/* ---------------- geometry ---------------- */
// one piped buttercream petal (or leaf): a thick, closed shell with rounded edges, cupped and flaring,
// darker at the base like real shadowed icing
function petalGeo({ w = .1, h = .12, cup = .6, flare = .2, ruffle = .004, notch = 0, leaf = false, thick = .016, nu = 16, nv = 14 }) {
  const S = (u, v) => {
    const wid = leaf ? w * Math.pow(Math.sin(Math.PI * (v * .96 + .02)), 1.25) : w * Math.pow(Math.sin(Math.PI * (v * .86 + .07)), .55);
    const x = u * wid;
    let y = v * h;
    if (notch) y -= notch * h * Math.exp(-Math.pow(u / .22, 2)) * smooth(.7, 1, v);
    let z = cup * x * x / Math.max(w, .001) - flare * v * v * h + ruffle * Math.sin(u * 5 + v * 3) * v * v;
    if (leaf) z += .35 * Math.abs(x) * (1 - v * .5);
    return new THREE.Vector3(x, y, z);
  };
  const pos = [], col = [], idx = [], F = [], Bk = [], e = .002;
  const push = (p, ao) => { pos.push(p.x, p.y, p.z); col.push(ao, ao, ao); return pos.length / 3 - 1; };
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu * 2 - 1, v = j / nv, p = S(u, v);
    const du = S(Math.min(1, u + e), v).sub(S(Math.max(-1, u - e), v)), dv = S(u, Math.min(1, v + e)).sub(S(u, Math.max(0, v - e)));
    const n = new THREE.Vector3().crossVectors(du, dv).normalize();
    const t = thick * (1 - .5 * v) * (1 - .45 * u * u) + .0025;
    const ao = lerp(.6, 1, smooth(0, .55, v)) * lerp(.9, 1, 1 - Math.abs(u) * .4);
    F.push(push(p.clone().addScaledVector(n, t * .5), ao)); Bk.push(push(p.clone().addScaledVector(n, -t * .5), ao * .92));
  }
  const at = (i, j) => j * (nu + 1) + i;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    idx.push(F[a], F[b], F[c], F[b], F[d], F[c]); idx.push(Bk[a], Bk[c], Bk[b], Bk[b], Bk[c], Bk[d]);
  }
  // stitch the rim so the edge reads as soft, rounded icing
  const loop = [];
  for (let i = 0; i < nu; i++) loop.push(at(i, 0)); for (let j = 0; j < nv; j++) loop.push(at(nu, j));
  for (let i = nu; i > 0; i--) loop.push(at(i, nv)); for (let j = nv; j > 0; j--) loop.push(at(0, j));
  for (let k = 0; k < loop.length; k++) { const p0 = loop[k], p1 = loop[(k + 1) % loop.length]; idx.push(F[p0], Bk[p0], F[p1], F[p1], Bk[p0], Bk[p1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // Blender-style quad wire over the front surface: rows and columns, not triangles
  const lp = [], step = 2, fp = i => [pos[F[i] * 3], pos[F[i] * 3 + 1], pos[F[i] * 3 + 2]];
  for (let j = 0; j <= nv; j += step) for (let i = 0; i < nu; i++) lp.push(...fp(at(i, j)), ...fp(at(i + 1, j)));
  for (let i = 0; i <= nu; i += step) for (let j = 0; j < nv; j++) lp.push(...fp(at(i, j)), ...fp(at(i, j + 1)));
  const wire = new THREE.BufferGeometry(); wire.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  return { g, wire };
}
// a star-tip piped swirl swept along a conical spiral; drawRange grows it like a curve bevel in Blender
function pipeSweep({ turns = 2.5, r0 = .5, r1 = .04, y0 = 0, y1 = .4, t0 = .12, t1 = .06, ridges = 8, amp = .16, seg = 420, ring = 28, squash = .82, color = 0xfdfaf4 }) {
  const pos = [], idx = [], col = [];
  const C = s => { const a = s * turns * Math.PI * 2, r = lerp(r0, r1, Math.pow(s, .9)); return new THREE.Vector3(Math.cos(a) * r, lerp(y0, y1, Math.pow(s, .85)), Math.sin(a) * r); };
  for (let i = 0; i <= seg; i++) {
    const s = i / seg, p = C(s), T = C(Math.min(1, s + .002)).sub(C(Math.max(0, s - .002))).normalize();
    const radial = new THREE.Vector3(p.x, 0, p.z).normalize(), B = new THREE.Vector3().crossVectors(T, radial).normalize(), N = new THREE.Vector3().crossVectors(B, T).normalize();
    const taper = smooth(0, .03, s) * (1 - smooth(.9, 1, s) * .97);
    for (let j = 0; j < ring; j++) {
      const th = j / ring * Math.PI * 2, rad = lerp(t0, t1, s) * taper * (1 + amp * Math.cos(ridges * th + s * 40)) * (1 + noise3(s * 30, th, 1) * .05);
      const q = p.clone().addScaledVector(N, Math.cos(th) * rad).addScaledVector(B, Math.sin(th) * rad * squash);
      pos.push(q.x, q.y, q.z); const ao = lerp(.72, 1, (Math.cos(th) * .5 + .5)); col.push(ao, ao, ao);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, icing(color)); m.castShadow = m.receiveShadow = true;
  m.userData.count = idx.length;
  // top of the swirl at a given radius (to sit flowers on it)
  m.userData.topAt = r => { const s = clamp((r0 - r) / (r0 - r1)); return lerp(y0, y1, Math.pow(s, .85)) + lerp(t0, t1, s) * squash; };
  return m;
}

/* ---------------- flowers (lists of pieces, each grows on its own) ---------------- */
const COLORS = { blush: 0xf2a7b8, rose: 0xe8859d, blue: 0x86a6d6, white: 0xfffcf6, lilac: 0xc4a9e8, butter: 0xf3cf6e, leaf: 0x739c55 };
function basisFor(radialAngle, tilt) {
  const rx = Math.cos(radialAngle), rz = Math.sin(radialAngle);
  const up = new THREE.Vector3(0, 1, 0), radial = new THREE.Vector3(rx, 0, rz), inward = radial.clone().negate();
  const x = new THREE.Vector3(-rz, 0, rx);
  const y = up.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(radial, Math.sin(tilt));
  const z = inward.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(up, Math.sin(tilt));
  return new THREE.Matrix4().makeBasis(x, y, z);
}
function rose(color, s = 1) {
  const pieces = [];
  const rings = [{ n: 2, h: .07, w: .055, tilt: .08, r: .006, cup: 1.3, flare: 0 }, { n: 3, h: .085, w: .075, tilt: .32, r: .014, cup: .95, flare: .08 }, { n: 5, h: .1, w: .09, tilt: .7, r: .026, cup: .62, flare: .22 }, { n: 7, h: .108, w: .1, tilt: 1.05, r: .04, cup: .4, flare: .38 }];
  rings.forEach((R, ri) => {
    const geo = petalGeo({ w: R.w * s, h: R.h * s, cup: R.cup, flare: R.flare, ruffle: .006 * s });
    for (let k = 0; k < R.n; k++) {
      const a = k / R.n * Math.PI * 2 + ri * .7;
      pieces.push({ geo, color, at: new THREE.Vector3(Math.cos(a) * R.r * s, 0, Math.sin(a) * R.r * s), basis: basisFor(a, R.tilt), tilt: R.tilt, a });
    }
  });
  return pieces;
}
function blossom(color, s = 1) {
  const pieces = [], geo = petalGeo({ w: .07 * s, h: .085 * s, cup: .28, flare: -.05, notch: .16, ruffle: .004 * s });
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; pieces.push({ geo, color, at: new THREE.Vector3(Math.cos(a) * .008 * s, .004 * s, Math.sin(a) * .008 * s), basis: basisFor(a, 1.32), tilt: 1.32, a }); }
  pieces.push({ dots: true, s });
  return pieces;
}
function leafPiece(a, s = 1) { const geo = petalGeo({ w: .045 * s, h: .13 * s, cup: .2, flare: .12, leaf: true }); return { geo, color: COLORS.leaf, at: new THREE.Vector3(), basis: basisFor(a, 1.25), tilt: 1.25, a }; }

/* realise a piece list into meshes under a parent; returns runtime records */
function buildPieces(list, parent, withWire) {
  const recs = [];
  const dotGeo = new THREE.SphereGeometry(.009, 12, 8), dotMat = new THREE.MeshPhysicalMaterial({ color: COLORS.butter, roughness: .4, clearcoat: .4 });
  list.forEach(p => {
    const holder = new THREE.Group(); if (p.at) holder.position.copy(p.at); parent.add(holder);
    if (p.dots) {
      for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(dotGeo, dotMat); const a = i / 6 * 6.283, r = i ? .014 * p.s : 0; d.position.set(Math.cos(a) * r, .022 * p.s, Math.sin(a) * r); d.scale.setScalar(p.s); d.castShadow = true; holder.add(d); }
      recs.push({ holder, mesh: null, wire: null, dots: true }); return;
    }
    const pivot = new THREE.Group(); pivot.matrixAutoUpdate = false; holder.add(pivot);
    const mesh = new THREE.Mesh(p.geo.g, icing(p.color)); mesh.castShadow = mesh.receiveShadow = true; pivot.add(mesh);
    let wire = null;
    if (withWire) { wire = new THREE.LineSegments(p.geo.wire, new THREE.LineBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0, depthWrite: false })); wire.renderOrder = 6; pivot.add(wire); }
    recs.push({ holder, pivot, mesh, wire, tilt: p.tilt, a: p.a });
  });
  return recs;
}
// growth state 0→1 for one piece: unfurls from closed to its tilt and grows from its base
function setPiece(r, k) {
  if (r.dots) { const s = backOut(k); r.holder.scale.setScalar(Math.max(.0001, s)); r.holder.visible = k > 0; return; }
  const g = backOut(k), open = easeOut(k);
  const tilt = lerp(0, r.tilt, open);
  r.pivot.matrix.copy(basisFor(r.a, tilt)).multiply(new THREE.Matrix4().makeScale(lerp(.35, 1, g), Math.max(.0001, g), lerp(.35, 1, g)));
  r.pivot.matrixWorldNeedsUpdate = true;
  r.mesh.visible = k > 0;
  if (r.wire) { r.wire.visible = k > 0 && k < 1.6; r.wire.material.opacity = k <= 0 ? 0 : clamp(1.6 - k) * .9; }
}

/* place a flower list on a swirl, returns { pieces, recs } */
function bouquet(top, swirl, kind = 'bloom', withWire = false) {
  const group = new THREE.Group(); top.add(group);
  const sets = [];
  const at = (r, a, tiltOut) => { const y = swirl.userData.topAt(r) - (r < .12 ? .075 * (1 - r / .12) : 0); const g = new THREE.Group(); g.position.set(Math.cos(a) * r, y - .012, Math.sin(a) * r); g.quaternion.setFromAxisAngle(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), -tiltOut); group.add(g); return g; };
  if (kind === 'bloom') {
    sets.push([at(.03, .3, .04), rose(COLORS.rose, 1.65)]);
    sets.push([at(.33, 2.25, .42), rose(COLORS.blue, 1.32)]);
    sets.push([at(.37, 4.0, .5), blossom(COLORS.white, 1.7)]);
    sets.push([at(.35, 5.2, .48), blossom(COLORS.lilac, 1.6)]);
    sets.push([at(.39, .8, .55), blossom(COLORS.white, 1.55)]);
    sets.push([at(.42, 3.15, .58), blossom(COLORS.blush, 1.5)]);
    [[.26, 1.55], [.3, 3.6], [.27, 5.95], [.25, 4.62], [.33, .15], [.31, 2.85]].forEach(([r, a]) => sets.push([at(r, a, .42), [leafPiece(a + rnd(-.3, .3), 1.55)]]));
  } else { // cupcake topper: one blossom + leaves
    sets.push([at(.04, 0, .05), blossom(COLORS.white, 1.25)]);
    [[.1, 1], [.1, 3.3]].forEach(([r, a]) => sets.push([at(r, a, .3), [leafPiece(a, .9)]]));
  }
  const recs = []; sets.forEach(([g, list]) => recs.push(...buildPieces(list, g, withWire)));
  return { group, recs };
}
function pearls(parent, swirl, n, rmax) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(.018, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xfffaf2, roughness: .14, metalness: .25, clearcoat: 1, iridescence: .8, iridescenceIOR: 1.6 }), n);
  m.castShadow = true; const homes = [];
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), r = rnd(.12, rmax); homes.push(new THREE.Vector3(Math.cos(a) * r, swirl.userData.topAt(r) + .01, Math.sin(a) * r)); }
  parent.add(m); return { m, homes };
}

/* ---------------- the drink ---------------- */
const H = 2.1, BT = .16;
const ri = y => .5 + .1 * (y / H);
function cupGeo() {
  const pts = [[0, 0], [.47, 0], [.5, .014], [.513, .05]];
  for (let i = 0; i <= 40; i++) { const y = lerp(.08, H, i / 40); pts.push([ri(y) + .022, y]); }
  pts.push([ri(H) + .018, H + .01], [ri(H) + .006, H + .014], [ri(H) - .002, H + .006]);
  for (let i = 40; i >= 0; i--) { const y = lerp(BT + .03, H, i / 40); pts.push([ri(y), y]); }
  pts.push([ri(BT) - .025, BT], [0, BT]);
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 128);
}
function cupWire() {
  // sparse rings + meridians, like a mesh in edit mode
  const lp = [];
  const rings = [0, BT, .5, .9, 1.3, 1.7, H], M = 24;
  rings.forEach(y => { const r = y < .05 ? .5 : ri(y) + .022; for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283, b = (k + 1) / 48 * 6.283; lp.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } });
  for (let k = 0; k < M; k++) { const a = k / M * 6.283; for (let i = 0; i < 20; i++) { const y0 = i / 20 * H, y1 = (i + 1) / 20 * H, r0 = y0 < .05 ? .5 : ri(y0) + .022, r1 = ri(y1) + .022; lp.push(Math.cos(a) * r0, y0, Math.sin(a) * r0, Math.cos(a) * r1, y1, Math.sin(a) * r1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); return g;
}
/* spec: { stops, level, top: 'bloom'|'foam'|'open', ice, garnish } */
function makeDrink(spec, ctx, opts = {}) {
  const root = new THREE.Group();
  const LV = spec.level ?? .86, LEVEL = lerp(BT, H, LV);
  const clip = opts.clip ? new THREE.Plane(new THREE.Vector3(0, -1, 0), LEVEL) : null;
  // liquid
  const lp = [new THREE.Vector2(0, BT + .002)]; for (let i = 0; i <= 48; i++) { const y = lerp(BT + .002, LEVEL, i / 48); lp.push(new THREE.Vector2(ri(y) - .004, y)); }
  const lgeo = new THREE.LatheGeometry(lp, 96);
  { const uv = lgeo.attributes.uv, p = lgeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setY(i, (p.getY(i) - BT) / (H - BT)); }
  const liqMat = new THREE.MeshPhysicalMaterial({ map: liquidTexture(spec.stops, spec.seed || 1), roughness: .3, clearcoat: .5, clearcoatRoughness: .15, clippingPlanes: clip ? [clip] : null, transparent: !!spec.clear, opacity: spec.clear ? .9 : 1 });
  const liquid = new THREE.Mesh(lgeo, liqMat); liquid.renderOrder = 1; liquid.receiveShadow = true; root.add(liquid);
  // surface colour = colour at the level
  const surfCol = (() => { const t = spec.stops; return new THREE.Color(t[t.length - 1][1]); })();
  const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: surfCol, roughness: .2, clearcoat: .7, transparent: !!spec.clear, opacity: spec.clear ? .9 : 1 }));
  surf.renderOrder = 1; root.add(surf);
  const setLevel = y => { if (clip) clip.constant = y; surf.position.y = y; surf.scale.setScalar(ri(y) - .004); surf.visible = y > BT + .01; };
  setLevel(opts.clip ? BT : LEVEL);
  // ice: cubes pressed to the wall so their faces show through the drink, plus a few riding at the top
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xeef7fb, transparent: true, opacity: .4, roughness: .06, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 2.2, normalMap: ctx.iceN, normalScale: new THREE.Vector2(.6, .6), depthWrite: false });
  const ice = [];
  const nIce = spec.ice ?? 6;
  for (let i = 0; i < nIce; i++) {
    const s = rnd(.2, .27), a = i / nIce * 6.283 + rnd(-.3, .3);
    const top = i >= nIce - 2 && spec.top !== 'bloom';
    const y = top ? LEVEL - s * .25 : lerp(BT + .35, LEVEL - .35, rnd(0, 1));
    const r = top ? rnd(.08, .2) : ri(y) - s * .5 + .004;
    const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 3, .04), iceMat); m.renderOrder = 2;
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.set(rnd(-.2, .2) + (top ? rnd(-.5, .5) : 0), -a, rnd(-.2, .2));
    m.userData.home = m.position.clone(); root.add(m); ice.push(m);
  }
  // glass
  const glass = new THREE.Mesh(cupGeo(), glassMat(.12)); glass.renderOrder = 4; root.add(glass);
  const shadowProxy = new THREE.Mesh(new THREE.CylinderGeometry(.56, .5, H, 32), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  shadowProxy.position.y = H / 2; shadowProxy.castShadow = true; root.add(shadowProxy);
  const out = { root, liquid, liqMat, surf, ice, glass, LEVEL, setLevel };
  // top
  const topG = new THREE.Group(); root.add(topG); out.topG = topG;
  if (spec.top === 'bloom') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(ri(H) - .012, ri(LEVEL) - .02, H - LEVEL + .08, 64), icingPlain(0xfdfaf4)); base.position.y = (H + LEVEL - .06) / 2; base.receiveShadow = true; topG.add(base); out.base = base;
    const swirl = pipeSweep({ turns: 2.6, r0: ri(H) - .09, r1: .05, y0: H + .03, y1: H + .44, t0: .13, t1: .075, amp: .22, ridges: 7, ring: 40 }); topG.add(swirl); out.swirl = swirl;
    out.bouquet = bouquet(topG, swirl, 'bloom', !!opts.wire);
    out.pearls = pearls(topG, swirl, 16, .5);
  } else if (spec.top === 'foam') {
    const fg = new THREE.LatheGeometry([[0, 0], [ri(LEVEL) - .01, 0], [ri(LEVEL), .03], [ri(LEVEL) - .03, .12], [ri(LEVEL) * .65, .19], [ri(LEVEL) * .3, .22], [0, .225]].map(p => new THREE.Vector2(p[0], p[1])), 96);
    const foam = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ color: spec.foam || 0xfbf6ec, roughness: .85, sheen: .8, sheenColor: new THREE.Color(0xffffff) })); foam.position.y = LEVEL - .02; foam.castShadow = foam.receiveShadow = true; topG.add(foam); out.foamTop = LEVEL + .2;
  }
  garnish(spec, out, ctx);
  return out;
}
function garnish(spec, d, ctx) {
  const g = d.topG, L = d.LEVEL;
  const glossy = (c, extra = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: .28, clearcoat: .8, clearcoatRoughness: .2 }, extra));
  if (spec.garnish === 'raspberry') {
    const drupe = new THREE.SphereGeometry(.03, 12, 10), mat = glossy(0xb81f3d, { sheen: .4, sheenColor: new THREE.Color(0xff8fa6) });
    [[.12, .5, .0], [-.14, 2.4, .05], [.05, 4.2, -.02]].forEach(([r, a, dy], k) => {
      const berry = new THREE.InstancedMesh(drupe, mat, 46); const c = new THREE.Vector3(Math.cos(a) * Math.abs(r) * 2, L + .1 + dy, Math.sin(a) * Math.abs(r) * 2);
      for (let i = 0; i < 46; i++) { const phi = Math.acos(1 - 2 * (i + .5) / 46), th = Math.PI * (1 + Math.sqrt(5)) * i; const v = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi) * 1.15, Math.sin(phi) * Math.sin(th)).multiplyScalar(.075); berry.setMatrixAt(i, new THREE.Matrix4().compose(v, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(rnd(.85, 1.1)))); }
      berry.position.copy(c); berry.rotation.set(rnd(-.6, .6), rnd(0, 6), rnd(-.6, .6)); berry.castShadow = true; g.add(berry);
    });
  }
  if (spec.garnish === 'banana') {
    const tex = speckTexture('#f6e7b4', '#b08a4a', 40, 1.4);
    const coin = new THREE.CylinderGeometry(.1, .1, .03, 40), mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .45, sheen: .3 });
    [[.12, .4, .3], [.18, 2.7, -.4], [.05, 4.6, .2]].forEach(([r, a, t]) => { const m = new THREE.Mesh(coin, mat); m.position.set(Math.cos(a) * r, d.foamTop + .005 - r * .25, Math.sin(a) * r); m.rotation.set(t, a, t * .6); m.castShadow = true; g.add(m); });
  }
  if (spec.garnish === 'tropical') {
    const dragon = glossy(0xffffff, { map: speckTexture('#d0216b', '#1a0d12', 300, 1.6) }), mango = glossy(0xf4a01f, { sheen: .5, sheenColor: new THREE.Color(0xffd98a) });
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new RoundedBoxGeometry(.12, .12, .12, 2, .025), i % 2 ? dragon : mango); const a = i * 1.1, r = rnd(.08, .32); m.position.set(Math.cos(a) * r, L + rnd(-.02, .05), Math.sin(a) * r); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); m.castShadow = true; g.add(m); }
  }
  if (spec.garnish === 'lavender') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.008, .01, 1.05, 8), new THREE.MeshPhysicalMaterial({ color: 0x7f9a62, roughness: .6 }));
    const sprig = new THREE.Group(); stem.position.y = .52; sprig.add(stem);
    const bud = new THREE.InstancedMesh(new THREE.SphereGeometry(.022, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x8a6cc4, roughness: .55, sheen: .6, sheenColor: new THREE.Color(0xd9c8ff) }), 54);
    for (let i = 0; i < 54; i++) { const t = i / 54, a = i * 2.4, y = .62 + t * .42, r = .028 * (1 - t * .5); bud.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3(1, 1.5, 1).multiplyScalar(1 - t * .4))); }
    sprig.add(bud); sprig.position.set(.2, L - .6, -.05); sprig.rotation.z = -.32; sprig.rotation.x = .1; bud.castShadow = stem.castShadow = true; g.add(sprig);
  }
  if (spec.garnish === 'caramel') {
    const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120, x = lerp(-.42, .42, t), z = Math.sin(t * Math.PI * 7) * .3 * Math.sqrt(1 - Math.pow(x / .5, 2)); const r = Math.hypot(x, z), yy = d.foamTop - .02 - Math.pow(r / .55, 2) * .14; pts.push(new THREE.Vector3(x, yy + .015, z)); }
    const drizzle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, .014, 8), glossy(0xbb6f26, { roughness: .15, clearcoat: 1 })); drizzle.castShadow = true; g.add(drizzle);
  }
}

/* ---------------- sweets ---------------- */
function makeCupcake(ctx) {
  const root = new THREE.Group();
  const lp = []; for (let i = 0; i <= 20; i++) { const t = i / 20; lp.push(new THREE.Vector2(lerp(.42, .56, t), t * .55)); }
  lp.unshift(new THREE.Vector2(0, 0)); const liner = new THREE.LatheGeometry(lp, 192);
  { const p = liner.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r < .05) continue; const k = 1 + .035 * Math.abs(Math.sin(a * 16)); p.setX(i, x * k); p.setZ(i, z * k); } liner.computeVertexNormals(); }
  const lm = new THREE.MeshPhysicalMaterial({ color: 0x9cb7dc, roughness: .55, sheen: .5, sheenColor: new THREE.Color(0xffffff), clearcoat: .2, side: THREE.DoubleSide });
  const lmesh = new THREE.Mesh(liner, lm); lmesh.castShadow = lmesh.receiveShadow = true; root.add(lmesh);
  const cake = new THREE.Mesh(new THREE.SphereGeometry(.57, 64, 32, 0, 6.283, 0, 1.2), new THREE.MeshPhysicalMaterial({ color: 0xd59a55, roughness: .8 })); cake.scale.y = .45; cake.position.y = .48; root.add(cake);
  const swirl = pipeSweep({ turns: 3.1, r0: .46, r1: .03, y0: .62, y1: 1.28, t0: .17, t1: .08, amp: .22, ridges: 7, ring: 40, color: 0xfffaf3 }); root.add(swirl);
  const b = bouquet(root, swirl, 'cupcake'); b.recs.forEach(r => setPiece(r, 1));
  const p = pearls(root, swirl, 14, .38); p.homes.forEach((h, i) => p.m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(h.x, h.y, h.z)));
  return { root };
}
function makeMangoCake(ctx) {
  const root = new THREE.Group();
  // glass cake stand with a porcelain plate
  const stand = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.5, 0], [.52, .03], [.3, .07], [.09, .14], [.07, .5], [.12, .62], [.78, .66], [.8, .69], [0, .69]].map(p => new THREE.Vector2(p[0], p[1])), 96), glassMat(.16)); stand.renderOrder = 4; root.add(stand);
  const plate = new THREE.Mesh(new THREE.LatheGeometry([[0, .69], [.62, .69], [.74, .72], [.78, .75], [.76, .755], [.6, .715], [0, .71]].map(p => new THREE.Vector2(p[0], p[1])), 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .18, clearcoat: 1 })); plate.castShadow = plate.receiveShadow = true; root.add(plate);
  // the mango: a glossy egg with a gentle kidney bend, glazed red to orange to green like theirs
  const geo = new THREE.SphereGeometry(1, 128, 96), p = geo.attributes.position, col = [];
  const cR = new THREE.Color(0xd8332b), cO = new THREE.Color(0xf29a2a), cY = new THREE.Color(0xf3c84a), cG = new THREE.Color(0x6f9a31), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = x * .5 + y * .6 + noise3(x * 2, y * 2, z * 2) * .25;   // red top-left, green bottom-right
    if (k > .25) tmp.copy(cO).lerp(cR, smooth(.25, .8, k)); else if (k > -.25) tmp.copy(cY).lerp(cO, smooth(-.25, .25, k)); else tmp.copy(cG).lerp(cY, smooth(-.9, -.25, k));
    col.push(tmp.r, tmp.g, tmp.b);
    p.setXYZ(i, x * .46, y * .3 + .05 * (x * x - .35) * (1 - .3 * y) - .02 * x, z * .34 * (1 - .1 * x));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mango = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .16, clearcoat: 1, clearcoatRoughness: .05, sheen: .2 }));
  mango.position.set(0, .99, 0); mango.rotation.y = .5; mango.castShadow = true; root.add(mango);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, .05, 10), new THREE.MeshPhysicalMaterial({ color: 0x5b3b22, roughness: .7 })); stem.position.set(.42, 1.08, .0); stem.rotation.z = -.9; mango.add(stem); stem.position.set(.44, .12, 0);
  const lf = petalGeo({ w: .05, h: .2, cup: .2, flare: .1, leaf: true }); const leaf = new THREE.Mesh(lf.g, icing(0x5f8a3a)); leaf.position.set(.46, .14, 0); leaf.rotation.set(.3, 0, -1.2); leaf.castShadow = true; mango.add(leaf);
  return { root };
}

/* =====================================================================
   HERO: Matcha In Bloom, built like a Blender scene
   ===================================================================== */
export async function mountBloom(canvas, o = {}) {
  const ctx = await stage(canvas, o), { renderer, scene, key, SMALL } = ctx;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 80);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 4; key.shadow.camera.bottom = -1; key.shadow.camera.far = 30; key.target.position.set(0, 1, 0);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .2, color: 0x2a3d5c })); floor.receiveShadow = true; scene.add(floor);
  // viewport grid with red/green axes, like Blender
  const grid = new THREE.Group(); scene.add(grid);
  const gh = new THREE.GridHelper(12, 48, 0x8aa0bf, 0x8aa0bf); gh.material.transparent = true; gh.material.opacity = .35; gh.material.depthWrite = false; grid.add(gh);
  const ax = (c, a, b) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .8 })); grid.add(l); return l; };
  const axX = ax(0xe0566a, new THREE.Vector3(-6, .002, 0), new THREE.Vector3(6, .002, 0)), axY = ax(0x7fb34d, new THREE.Vector3(0, .002, -6), new THREE.Vector3(0, .002, 6));

  const spec = { stops: [[0, '#f4f1e8'], [.46, '#efede3'], [.6, '#9db866'], [1, '#7c9e47']], level: .9, top: 'bloom', ice: 6, seed: 2 };
  const d = makeDrink(spec, ctx, { clip: true, wire: true });
  scene.add(d.root);
  // cup wire for the modelling phase, revealed bottom to top
  const wireClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const cw = new THREE.LineSegments(cupWire(), new THREE.LineBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: .95, clippingPlanes: [wireClip], depthWrite: false })); cw.renderOrder = 7; d.root.add(cw);
  // a pour stream
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, 1, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xf2efe6, roughness: .2, clearcoat: .8 })); scene.add(stream);
  // piping bag
  const bag = new THREE.Group(); scene.add(bag);
  const bagBody = new THREE.Mesh(new THREE.LatheGeometry([[.025, 0], [.06, .1], [.15, .45], [.17, .62], [.16, .7], [.05, .78]].map(p => new THREE.Vector2(p[0], p[1])), 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .55, roughness: .25, clearcoat: .6, side: THREE.DoubleSide, depthWrite: false })); bagBody.renderOrder = 5;
  const bagFill = new THREE.Mesh(new THREE.LatheGeometry([[.02, .02], [.05, .1], [.13, .42], [.0, .5]].map(p => new THREE.Vector2(p[0], p[1])), 48), new THREE.MeshPhysicalMaterial({ color: COLORS.rose, roughness: .5, sheen: .5 }));
  const tip = new THREE.Mesh(new THREE.LatheGeometry([[.008, -.09], [.02, -.09], [.03, -.03], [.034, .0], [.03, .02], [.0, .02]].map(p => new THREE.Vector2(p[0], p[1])), 40), new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: .18 }));
  bag.add(bagBody, bagFill, tip); bag.visible = false; bag.traverse(m => { if (m.isMesh) m.castShadow = true; });

  // collect pieces + timing: roses centre-out, then blossoms, then leaves
  const recs = d.bouquet.recs; const P0 = 5.15, STEP = .058, DUR = .42;
  recs.forEach((r, i) => { r.t0 = P0 + i * STEP; r.world = new THREE.Vector3(); });
  const PEND = P0 + recs.length * STEP + DUR;
  const PR0 = PEND + .1, T_END = PR0 + 2.2;
  d.pearls.homes.forEach(() => {});
  const iceT = d.ice.map((m, i) => 2.75 + i * .12);
  const sw = d.swirl, swCount = sw.userData.count;
  const glassMats = [d.glass.material]; const pearlM = d.pearls.m;

  // camera keys: [t, azimuth, elevation, distance-scale, target y]
  const KEYS = [[0, -1.05, .34, 1.35, 1.15], [2.2, -.6, .22, 1.15, 1.1], [4.1, -.2, .2, 1.0, 1.35], [5.1, .15, .5, .62, 2.3], [7.4, .75, .66, .4, 2.42], [PEND, 1.4, .58, .44, 2.4], [T_END, .4, .36, .8, 1.74]];
  const cr = (p0, p1, p2, p3, t) => .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  function camKey(t) {
    t = clamp(t, 0, T_END); let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
    const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
    const u = easeInOut((t - k1[0]) / (k2[0] - k1[0]));
    return [1, 2, 3, 4].map(j => cr(k0[j], k1[j], k2[j], k3[j], u));
  }
  let baseDist = 8;
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    baseDist = Math.max(3.25 / 2 / Math.tan(vf / 2), 2.1 / 2 / Math.tan(vf / 2) / camera.aspect);
    renderer.setSize(w, h, false); camera.updateProjectionMatrix();
  }
  frame(); new ResizeObserver(() => { frame(); kick(); }).observe(canvas);

  let T = RM ? T_END : 0, idle = 0, spin = 0, px = 0, py = 0, tx = 0, ty2 = 0, doneFired = false, lastStep = '';
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty2 = e.clientY / innerHeight - .5; kick(); }, { passive: true });
  const v3 = new THREE.Vector3(), target = new THREE.Vector3();
  const steps = [[0, 'Modelling the glass'], [1.45, 'Shading'], [2.3, 'Pouring milk and matcha'], [2.75, 'Adding ice'], [4.15, 'Piping the icing swirl'], [P0, 'Piping petals'], [PEND, 'Sugar pearls'], [PR0 + .7, 'Matcha In Bloom']];

  function apply() {
    // modelling → shading
    wireClip.constant = lerp(0, H + .05, easeInOut(T / 1.3));
    cw.material.opacity = .95 * (1 - smooth(1.5, 2.2, T)); cw.visible = cw.material.opacity > .01;
    const shade = smooth(1.35, 2.2, T);
    glassMats.forEach(m => { m.opacity = m.userData.op * shade; m.visible = shade > .01; });
    const gOp = 1 - smooth(1.7, 2.6, T); gh.material.opacity = .35 * gOp; axX.material.opacity = axY.material.opacity = .8 * gOp; grid.visible = gOp > .01;
    floor.material.opacity = .2 * shade;
    // pour
    const pk = easeInOut((T - 2.3) / 1.85); const lvl = lerp(BT, d.LEVEL, pk); d.setLevel(lvl);
    stream.visible = T > 2.25 && T < 4.2;
    if (stream.visible) { const top = H + 7, x = .12; stream.position.set(x, (top + lvl) / 2, .05); stream.scale.set(1 - smooth(3.95, 4.2, T) * .8, top - lvl, 1 - smooth(3.95, 4.2, T) * .8); stream.material.color.set(lvl < lerp(BT, d.LEVEL, .5) ? 0xf2efe6 : 0x93b858); }
    // ice drops
    d.ice.forEach((m, i) => { const k = (T - iceT[i]) / .55; m.visible = k > 0; m.position.copy(m.userData.home); m.position.y += (1 - bounce(k)) * 2.4; });
    // icing base + swirl grows along its length
    d.base.visible = T > 4.1; d.base.scale.y = Math.max(.001, smooth(4.1, 4.3, T));
    const sk = easeInOut((T - 4.15) / .95); sw.visible = sk > 0; sw.geometry.setDrawRange(0, Math.floor(swCount * sk / 6) * 6);
    // petals
    let cur = null;
    recs.forEach(r => { const k = (T - r.t0) / DUR; setPiece(r, k); if (k > 0 && k < 1) cur = r; });
    // pearls drop in
    d.pearls.homes.forEach((hm, i) => { const k = (T - PR0 - i * .045) / .4; const s = k <= 0 ? 0 : 1; v3.copy(hm); v3.y += (1 - bounce(k)) * .7; pearlM.setMatrixAt(i, new THREE.Matrix4().compose(v3, new THREE.Quaternion(), new THREE.Vector3(s, s, s))); });
    pearlM.instanceMatrix.needsUpdate = true;
    // piping bag follows the petal being piped
    const bagOn = T > P0 - .5 && T < PEND + .6; bag.visible = bagOn;
    if (bagOn) {
      if (cur) { (cur.mesh || cur.holder).getWorldPosition(cur.world); target.copy(cur.world); bagFill.material.color.copy(cur.mesh ? cur.mesh.material.color : new THREE.Color(COLORS.butter)); }
      else target.set(0, H + .5, 0);
      const lift = (1 - smooth(P0 - .5, P0, T)) * 1.6 + smooth(PEND, PEND + .6, T) * 1.8;
      if (!bag.userData.p) bag.userData.p = target.clone();
      bag.userData.p.lerp(target, .22); bag.position.copy(bag.userData.p); bag.position.y += .16 + lift; bag.position.x += .04;
      bag.rotation.set(0, 0, -.42); const sq = cur ? 1 - Math.sin((T - cur.t0) / DUR * Math.PI) * .04 : 1; bagBody.scale.set(sq, 1, sq);
    }
    // step label
    let label = steps[0][1]; for (const [t, l] of steps) if (T >= t) label = l;
    if (label === 'Piping petals') { const n = recs.filter(r => T >= r.t0 && !r.dots).length, tot = recs.filter(r => !r.dots).length; label = `Piping petal ${n} of ${tot}`; }
    if (label !== lastStep) { lastStep = label; o.onStep && o.onStep(label, T / T_END); }
    if (T >= T_END && !doneFired) { doneFired = true; o.onDone && o.onDone(); }
  }
  function camera_() {
    const [az, el, ds, tyy] = camKey(T);
    px = lerp(px, tx, .05); py = lerp(py, ty2, .05);
    const A = az + spin + px * .35, E = el - py * .12, D = ds * baseDist;
    camera.position.set(Math.sin(A) * Math.cos(E) * D, tyy + Math.sin(E) * D, Math.cos(A) * Math.cos(E) * D);
    camera.lookAt(0, tyy, 0);
  }
  const kick = loopWhileVisible(canvas, dt => {
    if (T < T_END) T = Math.min(T_END, T + dt); else { idle += dt; spin += dt * .16; }
    apply(); camera_(); renderer.render(scene, camera);
    return true;
  });
  apply(); camera_(); renderer.render(scene, camera); kick();
  return {
    replay() { T = 0; doneFired = false; spin = 0; bag.userData.p = null; kick(); },
    pose(t, s = 0) { T = t; spin = s; bag.userData.p = null; apply(); camera_(); renderer.render(scene, camera); },
    get duration() { return T_END; },
  };
}

/* =====================================================================
   LINEUP: the menu on a round white-marble table you spin
   ===================================================================== */
export const MENU = [
  { key: 'bloom', spec: { stops: [[0, '#f4f1e8'], [.46, '#efede3'], [.6, '#9db866'], [1, '#7c9e47']], level: .9, top: 'bloom', ice: 6, seed: 2 } },
  { key: 'rasp', spec: { stops: [[0, '#cf3f63'], [.26, '#e47f95'], [.4, '#f3eee5'], [.6, '#9db866'], [1, '#7c9e47']], level: .8, top: 'open', ice: 7, garnish: 'raspberry', seed: 3 } },
  { key: 'banana', spec: { stops: [[0, '#f1d47c'], [.4, '#f4e7bb'], [.56, '#9db866'], [1, '#7c9e47']], level: .78, top: 'foam', ice: 6, garnish: 'banana', seed: 4 } },
  { key: 'mango', spec: { stops: [[0, '#c9246f'], [.45, '#e8566b'], [1, '#f7a53b']], level: .82, top: 'open', ice: 8, garnish: 'tropical', clear: true, seed: 5 } },
  { key: 'lavender', spec: { stops: [[0, '#a993d6'], [.55, '#c8b8ea'], [1, '#e4dbf5']], level: .82, top: 'open', ice: 8, garnish: 'lavender', clear: true, seed: 6 } },
  { key: 'caramel', spec: { stops: [[0, '#f3eadc'], [.44, '#efe0c9'], [.56, '#d7a160'], [.7, '#a26b3c'], [1, '#7d4f2c']], level: .78, top: 'foam', ice: 6, garnish: 'caramel', seed: 7 } },
  { key: 'cupcake' },
  { key: 'mangocake' },
];
export async function mountLineup(canvas, o = {}) {
  const ctx = await stage(canvas, o), { renderer, scene, key, SMALL } = ctx;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const N = MENU.length, R = 3.4, STEP = Math.PI * 2 / N;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.camera.far = 40; key.position.set(3, 10, 7);
  // table: a round white marble top with a soft bevel
  const table = new THREE.Group(); scene.add(table);
  if (ctx.marble) { ctx.marble.repeat.set(2.5, 2.5); ctx.marbleN.repeat.set(2.5, 2.5); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.05, R + 1.05, .14, 128), [
    new THREE.MeshPhysicalMaterial({ color: 0xf1f1ef, roughness: .3, clearcoat: .6 }),
    new THREE.MeshPhysicalMaterial({ map: ctx.marble, normalMap: ctx.marbleN, normalScale: new THREE.Vector2(.4, .4), roughness: .22, clearcoat: .8, clearcoatRoughness: .1 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff }),
  ]);
  top.position.y = -.07; top.receiveShadow = true; table.add(top);
  const items = MENU.map((m, i) => {
    let obj;
    if (m.key === 'cupcake') { obj = makeCupcake(ctx); obj.root.scale.setScalar(1.5); }
    else if (m.key === 'mangocake') { obj = makeMangoCake(ctx); obj.root.scale.setScalar(1.45); }
    else { obj = makeDrink(m.spec, ctx, {}); if (obj.bouquet) obj.bouquet.recs.forEach(r => setPiece(r, 1)); if (obj.pearls) obj.pearls.homes.forEach((h, k) => obj.pearls.m.setMatrixAt(k, new THREE.Matrix4().makeTranslation(h.x, h.y, h.z))); }
    const holder = new THREE.Group(); holder.add(obj.root); table.add(holder);
    const a = i * STEP; holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); holder.rotation.y = a;
    obj.root.traverse(c => { if (c.isMesh && !c.material.transparent) c.castShadow = true; });
    return { holder, root: obj.root, a };
  });

  let rot = 0, vel = 0, target = 0, dragging = false, lastX = 0, lastInteract = -99, clock = 0, idx = 0, punch = 0, autoT = 0;
  const wrapIdx = i => ((i % N) + N) % N;
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h; renderer.setSize(w, h, false); camera.updateProjectionMatrix();
  }
  frame(); new ResizeObserver(() => { frame(); kick(); }).observe(canvas);
  function go(i, user) { const cur = Math.round(-target / STEP); let dd = ((wrapIdx(i) - wrapIdx(cur)) % N + N) % N; if (dd > N / 2) dd -= N; target = -(cur + dd) * STEP; autoT = 0; if (user) lastInteract = clock; kick(); }
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; lastInteract = clock; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = (e.clientX - lastX) / (canvas.clientWidth || 1); lastX = e.clientX; rot += dx * 2.6; vel = dx * 2.6 / .016; lastInteract = clock; });
  const up = () => { if (!dragging) return; dragging = false; const proj = rot + vel * .25; target = Math.round(proj / STEP) * STEP; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  const kick = loopWhileVisible(canvas, dt => {
    clock += dt;
    if (!dragging) {
      autoT += dt; if (!RM && clock - lastInteract > 7 && autoT > 4.6) go(idx + 1);
      rot += (target - rot) * (1 - Math.exp(-dt * 5));
    }
    const ni = wrapIdx(Math.round(-rot / STEP));
    if (ni !== idx) { idx = ni; punch = 1; o.onChange && o.onChange(idx, MENU[idx].key); }
    punch = Math.max(0, punch - dt * 1.4);
    table.rotation.y = rot;
    items.forEach((it, i) => {
      const off = Math.abs(((i * STEP + rot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const front = 1 - smooth(0, STEP * .9, off);
      it.root.position.y = front * .12; const sc = Math.max(.001, smooth(1.75, 1.0, off)); it.holder.scale.setScalar(sc); it.holder.visible = sc > .01;
      it.root.rotation.y = (it.root.rotation.y + dt * .35 * front) % (Math.PI * 2);
    });
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, asp = w / h;
    const D = Math.max(8, 10.4 / Math.max(asp, .5)) * (1 - Math.sin(punch * Math.PI) * .035);
    camera.position.set(0, 2.7 + (asp < 1 ? .6 : 0), R + D * .92); camera.lookAt(0, 1.4, R - .4);
    renderer.render(scene, camera);
  });
  kick();
  return { go: i => go(i, true), next: () => go(idx + 1, true), prev: () => go(idx - 1, true), get index() { return idx; } };
}
