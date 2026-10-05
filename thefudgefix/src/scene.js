/* =====================================================================
   THE BUILD: a physically lit sundae assembled by scroll.
   plate -> brownie -> ice cream -> hot fudge -> sprinkles -> cherry
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const $ = s => document.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 820px)').matches;
const QS = new URLSearchParams(location.search);

/* ---------- maths ---------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PERM = new Uint8Array(512); { const p = [...Array(256).keys()], r = rng(1234); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14) ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
function noise(x, y, z) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const X = fx & 255, Y = fy & 255, Z = fz & 255; x -= fx; y -= fy; z -= fz;
  const u = fade(x), v = fade(y), w = fade(z), P = PERM;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
const fbm = (x, y, z, o = 4) => { let a = 0, f = 1, s = .5; for (let i = 0; i < o; i++) { a += noise(x * f, y * f, z * f) * s; f *= 2.03; s *= .5; } return a; };

/* ---------- renderer ---------- */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
} catch (e) { document.documentElement.classList.add('no-gl'); window.__ffReady && window.__ffReady(1); throw e; }

const LOW = MOBILE || QS.has('low');
let DPR = Math.min(devicePixelRatio || 1, LOW ? 1.5 : 1.75);
if (QS.has('dpr')) DPR = +QS.get('dpr');
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = .92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const BG = new THREE.Color('#0d0705');
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.Fog(BG, 3.8, 9.5);
const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);

/* ---------- loading ---------- */
const manager = new THREE.LoadingManager();
let loadedFrac = 0;
manager.onProgress = (u, l, t) => { loadedFrac = l / t; window.__ffProgress && window.__ffProgress(loadedFrac); };
const tl = new THREE.TextureLoader(manager);
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const tex = (url, srgb, rep = 1) => { const t = tl.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rep, rep); return t; };

new RGBELoader(manager).load('assets/studio-512.hdr', t => { t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = t; });
scene.environmentIntensity = 0.55;
scene.environmentRotation.set(0, QS.has('er') ? +QS.get('er') : 1.2, 0);

/* ---------- lights ---------- */
const key = new THREE.SpotLight(0xfff5ea, 0, 0, 0.42, 0.85, 2);
key.position.set(-2.6, 6.2, 3.2);
key.target.position.set(0, 0.2, 0);
key.castShadow = true;
key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
key.shadow.bias = -0.00015; key.shadow.normalBias = 0.012;
key.shadow.camera.near = 3; key.shadow.camera.far = 12;
key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.SpotLight(0xffc89a, 0, 0, 0.5, 0.9, 2);
rim.position.set(3.2, 2.6, -3.8); rim.target.position.set(0, 0.4, 0);
scene.add(rim, rim.target);
const kick = new THREE.PointLight(0xffe2c4, 0, 6, 2);
kick.position.set(.6, 1.9, 2.6);
scene.add(kick);
const KEY_I = 150, RIM_I = 80, KICK_I = 1.2, POOL_I = 300;
// a tight pool of light waiting on the empty table in the opening shot
const poolL = new THREE.SpotLight(0xffe6c8, POOL_I, 0, .2, 1, 2);
poolL.position.set(-.6, 7.5, .8); poolL.target.position.set(0, 0, 0);
scene.add(poolL, poolL.target);

/* ---------- the dish (everything that spins together) ---------- */
const dish = new THREE.Group();
scene.add(dish);

/* ---------- table ---------- */
const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({
  map: tex('assets/stone.webp', true, 5),
  color: new THREE.Color('#8f8078'), roughness: .62, envMapIntensity: .07
}));
table.rotation.set(-Math.PI / 2, 0, 0); table.receiveShadow = true;
scene.add(table);

/* ---------- helpers ---------- */
function smoothNormals(geo, tol = 1e-4) {
  const g2 = geo.clone(); for (const k of Object.keys(g2.attributes)) if (k !== 'position') g2.deleteAttribute(k);
  const m = mergeVertices(g2, tol); m.computeVertexNormals();
  const key = (x, y, z) => `${Math.round(x / tol)},${Math.round(y / tol)},${Math.round(z / tol)}`;
  const map = new Map(), mp = m.attributes.position, mn = m.attributes.normal;
  for (let i = 0; i < mp.count; i++) map.set(key(mp.getX(i), mp.getY(i), mp.getZ(i)), i);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const j = map.get(key(p.getX(i), p.getY(i), p.getZ(i))); if (j !== undefined) n.setXYZ(i, mn.getX(j), mn.getY(j), mn.getZ(j)); }
  n.needsUpdate = true;
}
// A grid mesh whose vertices we rewrite every frame (fudge, pools, drips)
function dynGrid(nu, nv, mat, flip = true) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(nu * nv * 3);
  const idx = [];
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { const a = i * nv + j, b = a + nv; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nu * nv * 3), 3));
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData = { nu, nv, pos };
  return m;
}

/* =========================== PLATE =========================== */
const PLATE_WELL = 0.034;
const plateTop = r => r < .56 ? PLATE_WELL + .002 * (r / .56) ** 2 : r < .8 ? PLATE_WELL + .002 + .05 * sstep(.56, .8, r) : .086 + .011 * (r - .8) / .175;
const plate = new THREE.Group(); dish.add(plate);
{
  const pts = [];
  pts.push(new THREE.Vector2(0, 0.016));
  for (let r = 0.04; r <= 0.44; r += 0.04) pts.push(new THREE.Vector2(r, 0.016 - 0.004 * r));
  pts.push(new THREE.Vector2(0.455, 0.012), new THREE.Vector2(0.468, 0.002), new THREE.Vector2(0.49, 0.0), new THREE.Vector2(0.515, 0.003), new THREE.Vector2(0.535, 0.016));
  for (let r = 0.58; r <= 0.965; r += 0.025) pts.push(new THREE.Vector2(r, plateTop(r) - 0.02));
  const cx = 0.972, cy = plateTop(0.975) - 0.0095;
  for (let a = -Math.PI / 2; a <= Math.PI / 2 + 1e-6; a += Math.PI / 10) pts.push(new THREE.Vector2(cx + Math.cos(a) * 0.0105, cy + Math.sin(a) * 0.0105));
  for (let r = 0.965; r > 0.006; r -= 0.012) pts.push(new THREE.Vector2(r, plateTop(r)));
  pts.push(new THREE.Vector2(0, plateTop(0)));
  const geo = new THREE.LatheGeometry(pts, 160);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xebebe8, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1 });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  plate.add(m);
}
// gold rim: drawn around the edge like a pen line
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe6bd6e, metalness: 1, roughness: .2, envMapIntensity: 1.6 });
const goldPts = (() => { const p = []; for (let r = .948; r <= .972; r += .004) p.push(new THREE.Vector2(r, plateTop(r) + .0009)); const cx = .972, cy = plateTop(.975) - .0095; for (let a = Math.PI / 2; a >= -.2; a -= Math.PI / 14) p.push(new THREE.Vector2(cx + Math.cos(a) * .0114, cy + Math.sin(a) * .0114)); return p.reverse(); })();
const gold = new THREE.Mesh(new THREE.LatheGeometry(goldPts, 160), goldMat);
plate.add(gold);
let goldArc = -1;
function setGold(t) {
  t = clamp(t); if (Math.abs(t - goldArc) < 1e-3) return; goldArc = t;
  gold.visible = t > 0.002;
  if (!gold.visible) return;
  gold.geometry.dispose(); gold.geometry = new THREE.LatheGeometry(goldPts, Math.max(3, Math.round(160 * t)), -Math.PI / 2, Math.PI * 2 * t);
}

/* =========================== BROWNIE =========================== */
const BW = 0.66, BD = 0.62, BH = 0.30, BR = 0.032, BROT = 0.32;
const hx = BW / 2, hy = BH / 2, hz = BD / 2;
const topDisp = (x, z) => 0.009 * fbm(x * 3.2 + 4, 7.1, z * 3.2, 3) + 0.012 * (1 - .55 * (x / hx) ** 2 - .55 * (z / hz) ** 2) - 0.004;
const sideDisp = (x, y, z) => 0.0085 * fbm(x * 5 + 1, y * 5, z * 5, 3) + 0.0035 * noise(x * 24, y * 24, z * 24);
// project a point on the box surface onto the rounded, displaced brownie surface (local coords, centred)
function browSurf(x, y, z, outN) {
  const qx = clamp(x, -hx + BR, hx - BR), qy = clamp(y, -hy + BR, hy - BR), qz = clamp(z, -hz + BR, hz - BR);
  let dx = x - qx, dy = y - qy, dz = z - qz; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  let px = qx + dx * BR, py = qy + dy * BR, pz = qz + dz * BR;
  if (dy < -.7) { if (outN) outN.set(dx, dy, dz); return new THREE.Vector3(px, py, pz); }
  const w = sstep(.25, .95, dy);
  const bot = sstep(-hy, -hy + .05, py);
  const d = lerp(sideDisp(px, py, pz), 0, w) * bot;
  px += dx * d; py += dy * d; pz += dz * d;
  py += w * topDisp(px, pz);
  if (outN) outN.set(dx, dy, dz);
  return new THREE.Vector3(px, py, pz);
}
const browTopY = (x, z) => hy + topDisp(x, z);   // local
const brownie = new THREE.Group(); dish.add(brownie);
const BROW_REST_Y = PLATE_WELL + hy - 0.003;
let browMesh;
{
  const geo = new THREE.BoxGeometry(BW, BH, BD, 56, 28, 52);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const v = browSurf(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v.x, v.y, v.z); }
  // square texels on the cut faces + different offsets per face
  for (const [gi, g] of geo.groups.entries()) {
    const sv = gi < 2 ? BH / BD : gi > 3 ? BH / BW : 1, off = gi * .37;
    const seen = new Set();
    for (let k = g.start; k < g.start + g.count; k++) { const vi = geo.index.getX(k); if (seen.has(vi)) continue; seen.add(vi); uv.setXY(vi, uv.getX(vi) + off, uv.getY(vi) * sv + off * .5); }
  }
  smoothNormals(geo);
  const side = new THREE.MeshPhysicalMaterial({ map: tex('assets/brownie_side.webp', true), normalMap: tex('assets/brownie_side_n.webp'), roughnessMap: tex('assets/brownie_side_r.webp'), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2), sheen: .35, sheenColor: new THREE.Color('#5a3322'), sheenRoughness: .5, color: new THREE.Color('#e9dcd6') });
  const top = new THREE.MeshPhysicalMaterial({ map: tex('assets/brownie_top.webp', true), normalMap: tex('assets/brownie_top_n.webp'), roughnessMap: tex('assets/brownie_top_r.webp'), roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1), clearcoat: .35, clearcoatRoughness: .32, color: new THREE.Color('#e4d6cf') });
  browMesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
  browMesh.castShadow = true; browMesh.receiveShadow = true;
  brownie.add(browMesh);
}
brownie.rotation.y = BROT;

// crumbs that jump off on impact
const CRUMBS = 34;
const crumbGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; const r = rng(77); for (let i = 0; i < p.count; i++) { const s = .7 + r() * .5; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * .8, p.getZ(i) * s); } g.computeVertexNormals(); return g; })();
const crumbs = new THREE.InstancedMesh(crumbGeo, new THREE.MeshStandardMaterial({ color: 0x3a1f12, roughness: .8 }), CRUMBS);
crumbs.castShadow = true; crumbs.frustumCulled = false; dish.add(crumbs);
const crumbData = (() => { const r = rng(9); return [...Array(CRUMBS)].map((_, i) => { const a = r() * Math.PI * 2, sp = .5 + r() * 1.1; const ex = Math.cos(a), ez = Math.sin(a); const lx = clamp(ex * 1.3, -1, 1) * hx, lz = clamp(ez * 1.3, -1, 1) * hz; return { a, sp, x0: lx * Math.cos(BROT) + lz * Math.sin(BROT), z0: -lx * Math.sin(BROT) + lz * Math.cos(BROT), vy: .8 + r() * 1.3, s: .005 + r() * .009, rx: r() * 6, ry: r() * 6, spin: 4 + r() * 10 }; }); })();

/* =========================== ICE CREAM =========================== */
const SR = 0.25;
const SCOOP_FLOOR = -0.56;
const SC_LOCAL = new THREE.Vector3(-0.015, 0, 0.02);            // scoop centre in brownie-local xz
const scoopRestY = () => BROW_REST_Y + browTopY(SC_LOCAL.x, SC_LOCAL.z) - SCOOP_FLOOR * SR - 0.012;
// scoop radius table (direction -> radius) so the fudge can follow it cheaply
const SRT = 96, SRP = 192, srTab = new Float32Array((SRT + 1) * (SRP + 1));
const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(.62, .4, 0));
{
  const d = new THREE.Vector3();
  for (let i = 0; i <= SRT; i++) for (let j = 0; j <= SRP; j++) {
    const th = i / SRT * Math.PI, ph = j / SRP * Math.PI * 2;
    d.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    const t = d.clone().applyQuaternion(tiltQ);
    const th2 = Math.acos(clamp(t.y, -1, 1));
    const swirl = 2.6 * fbm(d.x * 1.2 + 3, d.y * 1.2, d.z * 1.2, 3);
    const rmask = clamp(.5 + 1.4 * noise(d.x * 1.6 + 7, d.y * 1.6, d.z * 1.6)) * sstep(-.7, .1, d.y);
    const ridge = 0.04 * (1 - Math.abs(Math.sin(th2 * 4.2 + swirl))) ** 4 * rmask;
    const crag = 0.03 * Math.abs(fbm(d.x * 4, d.y * 4, d.z * 4, 3)) * sstep(.3, -.6, d.y);
    const lump = 0.045 * fbm(d.x * 2.1, d.y * 2.1 + 9, d.z * 2.1, 3) + 0.01 * noise(d.x * 9, d.y * 9, d.z * 9) + crag;
    srTab[i * (SRP + 1) + j] = 1 + ridge + lump;
  }
}
function srAt(th, ph) {
  ph = ((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const fi = clamp(th / Math.PI) * SRT, fj = ph / (Math.PI * 2) * SRP;
  const i = Math.min(SRT - 1, Math.floor(fi)), j = Math.min(SRP - 1, Math.floor(fj)), a = fi - i, b = fj - j, W = SRP + 1;
  return lerp(lerp(srTab[i * W + j], srTab[i * W + j + 1], b), lerp(srTab[(i + 1) * W + j], srTab[(i + 1) * W + j + 1], b), a);
}
// point on the scoop (unit scale, local)
function scoopPt(th, ph, out = new THREE.Vector3()) {
  const r = srAt(th, ph);
  const s = Math.sin(th);
  let x = s * Math.cos(ph) * r, y = Math.cos(th) * r, z = s * Math.sin(ph) * r;
  // the scraped lip where the scoop sits, then a flat bottom
  const lipC = SCOOP_FLOOR + .1;
  const lip = 0.13 * Math.exp(-(((y - lipC) / .085) ** 2)) * (.75 + .5 * noise(Math.cos(ph) * 3.1, Math.sin(ph) * 3.1, 2.7) + .18 * noise(Math.cos(ph) * 11, Math.sin(ph) * 11, 5));
  const k = 1 + lip;
  x *= k; z *= k;
  if (y < SCOOP_FLOOR + .06) { const t = sstep(SCOOP_FLOOR + .06, SCOOP_FLOOR - .25, y); y = lerp(y, SCOOP_FLOOR, t); const shrink = lerp(1, .82, sstep(SCOOP_FLOOR, SCOOP_FLOOR - .5, Math.cos(th) * r)); x *= shrink; z *= shrink; y = Math.max(y, SCOOP_FLOOR); }
  return out.set(x, y, z);
}
const scoop = new THREE.Group(); dish.add(scoop);
const scoopInner = new THREE.Group(); scoop.add(scoopInner); scoopInner.scale.setScalar(SR);
let scoopMesh;
{
  const geo = new THREE.SphereGeometry(1, 192, 120);
  const p = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const th = uv.getY(i) * -Math.PI + Math.PI, ph = uv.getX(i) * Math.PI * 2 + Math.PI; // three's sphere: phi from -x
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const T = Math.acos(clamp(v.y, -1, 1)), P = Math.atan2(v.z, v.x);
    scoopPt(T, P, v); p.setXYZ(i, v.x, v.y, v.z);
  }
  smoothNormals(geo, 1e-5);
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex('assets/ice.webp', true, 3), normalMap: tex('assets/ice_n.webp', false, 3),
    roughness: .5, normalScale: new THREE.Vector2(.55, .55), sheen: .6, sheenColor: new THREE.Color('#fff3df'), sheenRoughness: .6,
    clearcoat: .18, clearcoatRoughness: .45, emissive: new THREE.Color('#3b2a17'), emissiveIntensity: .12
  });
  scoopMesh = new THREE.Mesh(geo, mat); scoopMesh.castShadow = true; scoopMesh.receiveShadow = true;
  scoopInner.add(scoopMesh);
}

/* =========================== HOT FUDGE =========================== */
const fudgeMat = new THREE.MeshPhysicalMaterial({ color: 0x1e0c05, roughness: .16, clearcoat: 1, clearcoatRoughness: .05, ior: 1.47, envMapIntensity: 1.25, sheen: .2, sheenColor: new THREE.Color('#5a2a12') });
const meltMat = new THREE.MeshPhysicalMaterial({ color: 0xefe1c3, roughness: .32, clearcoat: .6, clearcoatRoughness: .2, emissive: new THREE.Color('#3b2a17'), emissiveIntensity: .1 });

// fudge cap over the scoop (child of the scoop so it squashes with it)
const CAP_S = 70, CAP_P = 288;
const cap = dynGrid(CAP_S, CAP_P + 1, fudgeMat); scoopInner.add(cap);
const fr = rng(42);
const DRIPS = [...Array(10)].map((_, i) => ({ ph: (i / 10) * Math.PI * 2 + (fr() - .5) * .45, w: .13 + fr() * .13, len: [.95, .3, .7, .45, 1.0, .2, .62, .85, .35, .55][i] * (.85 + fr() * .3), d: .05 + fr() * .3, bulb: .35 + fr() * .45 }));
const TH_MAX = 2.0;
function capExtent(ph, F) {
  const base = lerp(.08, 1.1, easeOut(F / .34)) + .11 * noise(Math.cos(ph) * 2.3, Math.sin(ph) * 2.3, 11) * sstep(0, .3, F);
  let e = base, tip = 0;
  for (const d of DRIPS) {
    let dp = Math.abs(ph - d.ph); dp = Math.min(dp, Math.PI * 2 - dp);
    const x = dp / d.w; if (x >= 1) continue;
    const L = d.len * easeOut((F - d.d) / .5);
    if (L <= 0) continue;
    const prof = Math.pow(1 - x * x, .3);
    const v = base + L * prof;
    if (v > e) { e = v; tip = d.bulb * prof * sstep(.05, .3, L); }
  }
  return [Math.min(e, TH_MAX), tip];
}
const capV = new THREE.Vector3();
function buildCap(F) {
  cap.visible = F > 0.003;
  if (!cap.visible) return;
  const { nu, nv, pos } = cap.userData;
  const T0 = 0.07;
  for (let j = 0; j < nv; j++) {
    const ph = j / (nv - 1) * Math.PI * 2;
    const [E, tip] = capExtent(ph, F);
    for (let i = 0; i < nu; i++) {
      const s = i / (nu - 1);
      const th = s * E;
      scoopPt(th, ph, capV);
      const edge = Math.sqrt(clamp((1 - s) / .07));
      const bead = 1 + (.7 + tip) * Math.exp(-(((s - .9) / .08) ** 2));
      const thick = (T0 * bead * edge + .006) * sstep(0, .06, F);
      const len = capV.length();
      capV.multiplyScalar((len + thick) / len);
      const k = (i * nv + j) * 3; pos[k] = capV.x; pos[k + 1] = capV.y; pos[k + 2] = capV.z;
    }
  }
  cap.geometry.attributes.position.needsUpdate = true;
  cap.geometry.computeVertexNormals();
}

// a flat blob that spreads over a surface (fudge pool on the brownie, melt, plate puddles)
function blob(rings, segs, mat, parent) { const m = dynGrid(rings, segs + 1, mat); parent.add(m); return m; }
function buildBlob(m, cx, cz, Rfn, Yfn, T, vis) {
  m.visible = vis; if (!vis) return;
  const { nu, nv, pos } = m.userData;
  for (let j = 0; j < nv; j++) {
    const a = j / (nv - 1) * Math.PI * 2, R = Rfn(a), ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < nu; i++) {
      const f = i / (nu - 1), r = f * R;
      const x = cx + ca * r, z = cz + sa * r;
      const prof = f < .8 ? 1 : Math.sqrt(clamp(1 - ((f - .8) / .2) ** 2));
      const h = T * prof * (1 + .35 * Math.exp(-(((f - .78) / .1) ** 2))) + .0015;
      const k = (i * nv + j) * 3; pos[k] = x; pos[k + 1] = Yfn(x, z) + h; pos[k + 2] = z;
    }
  }
  m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals();
}

// pools sit in brownie-local space
const browLocal = new THREE.Group(); brownie.add(browLocal);
const melt = blob(14, 160, meltMat, browLocal);
const pool = blob(18, 220, fudgeMat, browLocal);
const distToEdge = a => { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return Math.min(c > 1e-4 ? (hx - BR * .9) / c : 9, s > 1e-4 ? (hz - BR * .9) / s : 9); };

// side drips down the cut faces
const SIDE = (() => {
  const r = rng(5), out = [];
  const faces = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const plan = [[0, -.55], [0, .1], [0, .62], [1, -.3], [1, .45], [2, .0], [2, .55], [3, -.6], [3, .2]];
  for (const [f, u] of plan) {
    const [nx, nz] = faces[f];
    const half = nx ? hz : hx;
    const tx = -nz, tz = nx;                  // along the face
    const along = u * (half - .05);
    const pts = [], nrm = [], sides = [];
    const N = new THREE.Vector3();
    // walk: from 0.06 inside the top edge, over the rounded edge, down to the plate
    const steps = 90;
    const totalTop = .07, arc = BR * Math.PI / 2, drop = BH - BR;
    const total = totalTop + arc + drop;
    const edgeO = nx ? hx : hz;
    for (let k = 0; k <= steps; k++) {
      const s = k / steps * total;
      let ox, oy;
      if (s < totalTop) { ox = edgeO - BR - (totalTop - s); oy = hy; }
      else if (s < totalTop + arc) { const a = (s - totalTop) / BR; ox = edgeO - BR + Math.sin(a) * BR; oy = hy - BR + Math.cos(a) * BR; }
      else { ox = edgeO; oy = hy - BR - (s - totalTop - arc); }
      const x = nx * ox + tx * along, z = nz * ox + tz * along;
      const v = browSurf(x, oy, z, N);
      pts.push(v); nrm.push(N.clone()); sides.push(new THREE.Vector3(tx, 0, tz));
    }
    out.push({ f, pts, nrm, sides, total, ang: 0, ax: nx * edgeO + tx * along, az: nz * edgeO + tz * along,
      len: (.14 + r() * .32) * (out.length % 3 === 0 ? 1.25 : 1), w: .016 + r() * .012, d: r() * .25 });
  }
  for (const s of out) { s.ang = Math.atan2(s.az, s.ax); s.len = Math.min(s.len, s.total + .02); }
  return out;
})();
const DRIP_M = 56, DRIP_J = 13;
for (const s of SIDE) { s.mesh = dynGrid(DRIP_M, DRIP_J, fudgeMat, false); browLocal.add(s.mesh); }
const tmpA = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpS = new THREE.Vector3();
function pathAt(s, u) {
  const f = clamp(u / s.total) * (s.pts.length - 1), i = Math.min(s.pts.length - 2, Math.floor(f)), t = f - i;
  tmpA.lerpVectors(s.pts[i], s.pts[i + 1], t); tmpN.lerpVectors(s.nrm[i], s.nrm[i + 1], t).normalize(); tmpS.copy(s.sides[i]);
}
function buildDrip(s, L) {
  const m = s.mesh; m.visible = L > .004; if (!m.visible) return;
  const { nu, nv, pos } = m.userData, W = s.w;
  for (let i = 0; i < nu; i++) {
    const u = i / (nu - 1) * L;
    pathAt(s, u);
    let w = W * (1 - .3 * sstep(0, L, u)) + W * .55 * Math.exp(-(((u - (L - W * 1.1)) / (W * .9)) ** 2)) * sstep(.03, .1, L);
    w *= Math.sqrt(clamp((L - u) / (W * 1.2)));
    w *= 1 + .12 * noise(u * 30, s.f * 3, 1);
    if (u < .07) w *= lerp(1.6, 1, u / .07);
    for (let j = 0; j < nv; j++) {
      const a = j / (nv - 1) * Math.PI;
      const c = Math.cos(a), sn = Math.sin(a);
      const k = (i * nv + j) * 3;
      pos[k] = tmpA.x + tmpS.x * c * w + tmpN.x * (sn * w * .62 + .0012);
      pos[k + 1] = tmpA.y + tmpS.y * c * w + tmpN.y * (sn * w * .62 + .0012);
      pos[k + 2] = tmpA.z + tmpS.z * c * w + tmpN.z * (sn * w * .62 + .0012);
    }
  }
  m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals();
}
// puddles on the plate where long drips land (in brownie-local space, at plate height)
for (const s of SIDE) if (s.len > s.total - .01) { s.puddle = blob(10, 64, fudgeMat, browLocal); }

// the pour itself
const STREAM_SEG = 90, STREAM_R = 12;
const stream = dynGrid(STREAM_SEG, STREAM_R + 1, fudgeMat); stream.castShadow = true; dish.add(stream);
function buildStream(top, bot, F, t) {
  const on = F > .002 && F < .5 && top > bot + .01;
  stream.visible = on; if (!on) return;
  const { nu, nv, pos } = stream.userData;
  const sx = SC_W.x, sz = SC_W.z;
  for (let i = 0; i < nu; i++) {
    const f = i / (nu - 1);
    const y = lerp(top, bot, f);
    const wob = .012 * (1 - f) * Math.sin(t * 5 + y * 4) + .006 * noise(y * 3, t * .8, 3);
    const x = sx + wob, z = sz + .008 * Math.cos(t * 4.2 + y * 3);
    let r = .021 * (1 - .25 * (1 - f)) * (1 + .08 * Math.sin(y * 18 - t * 14));
    if (f > .96) r *= 1 + (f - .96) / .04 * .9;
    if (f < .03) r *= Math.sqrt(f / .03);
    for (let j = 0; j < nv; j++) {
      const a = j / (nv - 1) * Math.PI * 2, k = (i * nv + j) * 3;
      pos[k] = x + Math.cos(a) * r; pos[k + 1] = y; pos[k + 2] = z + Math.sin(a) * r;
    }
  }
  stream.geometry.attributes.position.needsUpdate = true; stream.geometry.computeVertexNormals();
}

/* =========================== SPRINKLES =========================== */
const SPR = LOW ? 300 : 420;
const sprGeo = new THREE.CapsuleGeometry(.0068, .04, 4, 10);
const sprMat = new THREE.MeshPhysicalMaterial({ roughness: .38, clearcoat: .7, clearcoatRoughness: .2, sheen: .2 });
const sprinkles = new THREE.InstancedMesh(sprGeo, sprMat, SPR);
sprinkles.castShadow = true; sprinkles.receiveShadow = true; sprinkles.frustumCulled = false;
dish.add(sprinkles);
const SPR_COLS = ['#f06f9b', '#f5c842', '#4fa6e8', '#6cc46b', '#f58a35', '#f3ece0', '#9b74db', '#e8484f'].map(c => new THREE.Color(c));
let SPRD = [];

/* =========================== CHERRY =========================== */
const CR = 0.072;
const cherry = new THREE.Group(); dish.add(cherry);
const cherryBody = new THREE.Group(); cherry.add(cherryBody);
{
  const g = new THREE.SphereGeometry(1, 96, 64), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const th = Math.acos(clamp(v.y, -1, 1));
    let r = 1 - .2 * Math.exp(-((th / .38) ** 2)) - .06 * Math.exp(-(((Math.PI - th) / .3) ** 2)) + .015 * noise(v.x * 3, v.y * 3, v.z * 3);
    v.multiplyScalar(r); v.y *= .93; v.x *= 1.02;
    p.setXYZ(i, v.x, v.y + 1, v.z);
  }
  smoothNormals(g, 1e-5);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xa50c19, roughness: .12, clearcoat: 1, clearcoatRoughness: .03, sheen: .3, sheenColor: new THREE.Color('#ff4d5a'), emissive: new THREE.Color('#3a0207'), emissiveIntensity: .35, envMapIntensity: 1.3 });
  const m = new THREE.Mesh(g, mat); m.scale.setScalar(CR); m.castShadow = true; m.receiveShadow = true; cherryBody.add(m);
  // stem
  const stemPivot = new THREE.Group(); stemPivot.position.y = CR * 1.78; cherryBody.add(stemPivot);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.01, 0), new THREE.Vector3(.008, .06, .002), new THREE.Vector3(.035, .13, .01), new THREE.Vector3(.085, .19, .02), new THREE.Vector3(.13, .215, .024)]);
  const sg = new THREE.TubeGeometry(curve, 48, .0042, 10, false);
  const sm = new THREE.MeshStandardMaterial({ color: 0x6f5a2a, roughness: .55 });
  const stem = new THREE.Mesh(sg, sm); stem.castShadow = true; stemPivot.add(stem);
  const end = new THREE.Mesh(new THREE.SphereGeometry(.0046, 12, 8), sm); end.position.copy(curve.getPoint(1)); stemPivot.add(end);
  cherry.userData.stem = stemPivot;
}

/* =========================== GOLD SPOON =========================== */
const spoon = new THREE.Group(); dish.add(spoon);
{
  const bowl = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bm = new THREE.Mesh(bowl, new THREE.MeshPhysicalMaterial({ color: 0xe6bd6e, metalness: 1, roughness: .16, side: THREE.DoubleSide, envMapIntensity: 1.6 }));
  bm.scale.set(.055, .022, .08); bm.position.y = .022; bm.castShadow = true;
  const sh = new THREE.Shape(); sh.moveTo(-.012, 0); sh.quadraticCurveTo(-.008, .14, -.016, .3); sh.quadraticCurveTo(0, .33, .016, .3); sh.quadraticCurveTo(.008, .14, .012, 0); sh.closePath();
  const hg = new THREE.ExtrudeGeometry(sh, { depth: .005, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 3, curveSegments: 24 });
  const hm = new THREE.Mesh(hg, bm.material); hm.rotation.x = -Math.PI / 2 + .2; hm.position.set(0, .026, -.075); hm.castShadow = true;
  spoon.add(bm, hm);
}

/* =========================== LAYOUT (rest positions) =========================== */
const SC_W = new THREE.Vector3();      // scoop centre, dish space (at rest)
function restPositions() {
  brownie.position.set(0, BROW_REST_Y, 0);
  const c = SC_LOCAL.clone(); c.applyAxisAngle(new THREE.Vector3(0, 1, 0), BROT);
  SC_W.set(c.x, scoopRestY(), c.z);
  scoop.position.copy(SC_W);
}
restPositions();

/* ---------- sprinkle + cherry targets (raycast onto the finished dessert) ---------- */
function planToppings() {
  // everything at rest for the raycasts
  plate.position.set(0, 0, 0); plate.rotation.set(0, 0, 0);
  brownie.position.set(0, BROW_REST_Y, 0); brownie.scale.set(1, 1, 1); brownie.rotation.set(0, BROT, 0);
  scoop.position.copy(SC_W); scoop.rotation.set(0, 0, 0); scoopInner.scale.setScalar(SR);
  buildCap(1); setPools(1);
  scene.updateMatrixWorld(true);
  const targets = [scoopMesh, cap, pool];
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  // the cherry sits on the highest point near the centre
  ray.set(new THREE.Vector3(SC_W.x + .01, 3, SC_W.z - .015), down);
  let hit = ray.intersectObjects(targets, false)[0];
  const cherryY = hit ? hit.point.y : SC_W.y + SR;
  cherry.userData.rest = new THREE.Vector3(SC_W.x + .01, cherryY - CR * .28, SC_W.z - .015);
  const r = rng(321), out = [];
  let guard = 0;
  while (out.length < SPR && guard++ < SPR * 20) {
    const spill = r() < .12;
    const a = r() * Math.PI * 2, rad = spill ? .3 + r() * .5 : Math.sqrt(r()) * SR * 1.25;
    const x = SC_W.x + Math.cos(a) * rad, z = SC_W.z + Math.sin(a) * rad;
    if (Math.hypot(x - cherry.userData.rest.x, z - cherry.userData.rest.z) < CR * .9) continue;
    ray.set(new THREE.Vector3(x, 3, z), down);
    hit = ray.intersectObjects(spill ? [...targets, browMesh, plate.children[0]] : targets, false)[0];
    if (!hit) continue;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    if (n.y < .15) continue;
    const t = new THREE.Vector3(r() - .5, 0, r() - .5).cross(n).normalize();
    if (t.lengthSq() < .1) continue;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
    const p = hit.point.clone().addScaledVector(n, .0045);
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    out.push({ p, q, q0, h: 2.2 + r() * 1.6, dx: (r() - .5) * .25, dz: (r() - .5) * .25, rel: spill ? .25 + r() * .75 : r(), spin: 6 + r() * 12, hop: r() < .3 ? .02 + r() * .04 : 0, tau: 0, st: -1 });
    sprinkles.setColorAt(out.length - 1, SPR_COLS[Math.floor(r() * SPR_COLS.length)]);
  }
  SPRD = out;
  sprinkles.count = out.length;
  sprinkles.instanceColor.needsUpdate = true;
  buildCap(0); setPools(0);
}

/* ---------- pools + drips as a function of fudge flow F ---------- */
const scoopBaseR = SR * 1.08;
function setPools(F, meltT = 1) {
  const cx = SC_LOCAL.x, cz = SC_LOCAL.z;
  // melted ice cream ring around the scoop
  buildBlob(melt, cx, cz, a => scoopBaseR * (.92 + .1 * meltT) + .012 * noise(Math.cos(a) * 2, Math.sin(a) * 2, 1), (x, z) => browTopY(x, z), .006, meltT > .01);
  // fudge on the brownie top
  const F2 = clamp((F - .3) / .5);
  buildBlob(pool, cx, cz, a => {
    let R = scoopBaseR * .9 + .07 * easeOut(F2) + .02 * noise(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 4);
    for (const s of SIDE) { let d = Math.abs(a - s.ang); d = Math.min(d, Math.PI * 2 - d); R += .28 * Math.exp(-((d / .2) ** 2)) * easeOut((F2 - s.d * .5) / .55); }
    return Math.min(R, distToEdge(a) + .005);
  }, (x, z) => browTopY(x, z), .0105, F2 > .001);
  // side drips start once the pool reaches the edge
  for (const s of SIDE) {
    const g = clamp((F - .5 - s.d * .4) / .4);
    const L = s.len * easeInOut(g) + (g > 0 ? .07 : 0) * sstep(0, .1, g);
    buildDrip(s, Math.min(L, s.total + .01));
    if (s.puddle) {
      const reach = clamp((L - (s.total - .015)) / .03);
      const px = s.ax * 1.03 + (s.ax / Math.hypot(s.ax, s.az)) * .028, pz = s.az * 1.03 + (s.az / Math.hypot(s.ax, s.az)) * .028;
      buildBlob(s.puddle, px, pz, a => (.02 + .035 * easeOut(reach)) * (1 + .18 * noise(Math.cos(a) * 2, Math.sin(a) * 2, s.f)), () => PLATE_WELL - BROW_REST_Y + .001, .007, reach > .01);
    }
  }
}

/* =========================== POST =========================== */
const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: LOW ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), .14, .45, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uVig;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 q=vUv-.5;float v=smoothstep(.95,.25,length(q*vec2(1.,.9)));
  c.rgb*=mix(1.,mix(.55,1.,v),uVig);c.rgb=mix(c.rgb,c.rgb*vec3(1.025,1.,.965),.6);
  c.rgb+=(h(vUv*1000.+uTime)-.5)*.018;gl_FragColor=c;}`
});
composer.addPass(grade);

/* =========================== CAMERA PATH =========================== */
// [progress, azimuth deg, elevation deg, distance, target y]
const CAM = [
  [0.00, -14, 50, 7.4, .0],
  [0.06, -10, 44, 6.2, .1],
  [0.13, 4, 36, 5.3, .1],
  [0.22, 12, 27, 4.4, .22],
  [0.29, 16, 20, 3.9, .26],
  [0.38, 0, 26, 3.8, .36],
  [0.45, -10, 22, 3.4, .44],
  [0.53, -22, 18, 2.75, .5],
  [0.62, -32, 13, 2.9, .36],
  [0.70, -18, 30, 3.2, .42],
  [0.78, -6, 52, 3.1, .45],
  [0.86, 6, 24, 3.25, .55],
  [0.93, 16, 19, 3.6, .5],
  [1.00, 24, 17, 4.15, .45]
];
function camAt(p) {
  let i = 0; while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
  const a = CAM[Math.max(0, i - 1)], b = CAM[i], c = CAM[i + 1], d = CAM[Math.min(CAM.length - 1, i + 2)];
  const t = clamp((p - b[0]) / (c[0] - b[0]));
  const cr = (k) => { const p0 = a[k], p1 = b[k], p2 = c[k], p3 = d[k], t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  return [cr(1), cr(2), cr(3), cr(4)];
}

/* =========================== STATE + LOOP =========================== */
const S = { p: QS.has('p') ? +QS.get('p') : 0, target: 0, F: 0, spin: 0, spinV: 0, drag: 0, shake: 0, time: 0 };
S.target = S.p;
const tau = { plate: 0, brownie: 0, scoop: 0, cherry: 0, spoon: 0 };
let sprDone = 0, sprDirty = true;
const TRIG = { plate: .045, brownie: .205, scoop: .36, cherry: .835, spoon: .93 };
const G = 19;                                      // gravity (scene units / s^2), tuned to look heavy
const DROP = { brownie: 2.9, scoop: 2.6, cherry: 2.4 };
const fallT = h => Math.sqrt(2 * h / G);

function plateState(t) {
  // lowered in by an unseen hand: eases down with a turn, then a tiny settle
  const d = 1.15;
  const k = easeOut(t / d);
  const settle = t > d ? .004 * Math.exp(-(t - d) * 9) * Math.sin((t - d) * 40) : 0;
  return { y: lerp(.75, 0, k) + settle, ry: lerp(-1.1, 0, k), tilt: lerp(.18, 0, easeOut(t / (d * .9))), vis: t > 0, gold: clamp((t - .55) / 1.1) };
}
function dropState(t, h, bounce, squashAmt) {
  const tf = fallT(h);
  if (t <= 0) return { y: h, s: 1, land: -1 };
  if (t < tf) return { y: h - .5 * G * t * t, s: 1, land: -1, v: G * t };
  const u = t - tf;
  // damped bounce + squash, all closed-form so scrolling back rewinds it exactly
  const y = bounce * Math.abs(Math.sin(u * 13)) * Math.exp(-u * 7.5);
  const s = 1 - squashAmt * Math.exp(-u * 9) * Math.cos(u * 26);
  return { y, s, land: u };
}

const yAxis = new THREE.Vector3(0, 1, 0), mtx = new THREE.Matrix4(), qa = new THREE.Quaternion(), va = new THREE.Vector3(), sc1 = new THREE.Vector3(1, 1, 1);
function apply(dt) {
  const p = S.p;
  // advance each element's own clock toward its trigger state
  // each layer waits for the one under it to land, however fast the scroll
  const ready = { plate: true, brownie: tau.plate > .9, scoop: tau.brownie > fallT(DROP.brownie) + .25, cherry: S.F > .97 && sprDone > .9, spoon: tau.cherry > .9 };
  for (const k in tau) { const on = p >= TRIG[k] && (ready[k] || tau[k] > 0); tau[k] = on ? Math.min(tau[k] + dt, 4) : Math.max(0, Math.min(tau[k], 4) - dt * 3); }
  // plate
  const ps = plateState(tau.plate);
  plate.visible = ps.vis; plate.position.y = ps.y; plate.rotation.set(ps.tilt, ps.ry, ps.tilt * .5);
  setGold(ps.gold);
  // brownie
  const bs = dropState(tau.brownie, DROP.brownie, .012, .07);
  brownie.visible = tau.brownie > 0;
  brownie.position.y = BROW_REST_Y + bs.y;
  brownie.scale.set(1 + (1 - bs.s) * .6, bs.s, 1 + (1 - bs.s) * .6);
  brownie.rotation.set(bs.land < 0 ? .22 * (1 - tau.brownie / fallT(DROP.brownie)) : 0, BROT + (bs.land < 0 ? .5 * (1 - tau.brownie / fallT(DROP.brownie)) : 0), 0);
  // impact: plate jolt + camera shake + crumbs
  let shake = 0;
  if (bs.land >= 0) {
    const u = bs.land;
    plate.position.y += -.006 * Math.exp(-u * 14) * Math.cos(u * 50);
    shake = Math.max(shake, .05 * Math.exp(-u * 7));
  }
  const crumbKey = bs.land < 0 ? -1 : Math.min(bs.land, 2);
  if (crumbKey !== S.crumbKey) { S.crumbKey = crumbKey;
  for (let i = 0; i < CRUMBS; i++) {
    const c = crumbData[i];
    if (bs.land < 0) { mtx.makeScale(0, 0, 0); crumbs.setMatrixAt(i, mtx); continue; }
    const u = Math.min(bs.land, 2);
    const fl = PLATE_WELL + c.s * .6;
    const vx = Math.cos(c.a) * c.sp, vz = Math.sin(c.a) * c.sp;
    const tHit = (c.vy + Math.sqrt(c.vy * c.vy + 2 * 9.8 * (.02))) / 9.8;
    const ut = Math.min(u, tHit);
    const slide = Math.max(0, u - tHit);
    const k = 1 - Math.exp(-slide * 6);
    let x = c.x0 + vx * ut * .55 + vx * .06 * k, z = c.z0 + vz * ut * .55 + vz * .06 * k;
    // keep crumbs on the plate
    const rr = Math.hypot(x, z); if (rr > .82) { x *= .82 / rr; z *= .82 / rr; }
    const y = Math.max(fl + plateTop(Math.min(rr, .82)) - PLATE_WELL, .02 + c.vy * ut - .5 * 9.8 * ut * ut);
    qa.setFromEuler(new THREE.Euler(c.rx + c.spin * ut, c.ry + c.spin * .7 * ut, 0));
    mtx.compose(va.set(x, y, z), qa, sc1.set(c.s, c.s, c.s)); crumbs.setMatrixAt(i, mtx);
  }
  crumbs.instanceMatrix.needsUpdate = true;
  }
  // ice cream
  const ss = dropState(tau.scoop, DROP.scoop, .03, .2);
  scoop.visible = tau.scoop > 0;
  scoop.position.set(SC_W.x, SC_W.y + ss.y, SC_W.z);
  scoopInner.scale.set(SR * (1 + (1 - ss.s) * .7), SR * ss.s, SR * (1 + (1 - ss.s) * .7));
  scoop.rotation.set(ss.land < 0 ? -.3 * (1 - tau.scoop / fallT(DROP.scoop)) : 0, 0, 0);
  if (ss.land >= 0) shake = Math.max(shake, .02 * Math.exp(-ss.land * 8));
  const meltT = ss.land >= 0 ? clamp(sstep(0, 2.5, ss.land) * .4 + sstep(.36, .6, p) * .6) : 0;
  // fudge flows at a capped rate so a fast flick still reads as a pour
  const Ft = tau.scoop > fallT(DROP.scoop) + .35 ? clamp((p - .48) / .2) : Math.min(S.F, clamp((p - .48) / .2));
  const dF = Ft - S.F, maxRate = Ft > S.F ? .55 : 2.5;
  S.F += Math.sign(dF) * Math.min(Math.abs(dF), maxRate * dt);
  if (QS.has('p') && S.settle && !QS.has('F')) S.F = Ft;
  const fk = Math.round(S.F * 4000) + ':' + Math.round(meltT * 400);
  if (fk !== S.fk) { S.fk = fk; buildCap(S.F); setPools(S.F, meltT); }
  const scoopTop = SC_W.y + SR * 1.06;
  const pourTop = lerp(scoopTop + 3.5, scoopTop + .02, easeInOut((S.F - .36) / .14));
  const pourBot = lerp(scoopTop + 3.5, scoopTop - .01, easeOut(S.F / .05));
  buildStream(pourTop, pourBot, S.F, S.time);
  // sprinkles: each one released by scroll, then falls on its own clock
  const rel = S.F > .85 ? clamp((p - .66) / .14) : 0;
  let landed = 0;
  for (let i = 0; i < SPRD.length; i++) {
    const s = SPRD[i];
    const on = rel > s.rel * .96;
    const tf = fallT(s.h);
    s.tau = on ? Math.min(s.tau + dt, tf + .8) : Math.max(0, s.tau - dt * 3);
    if (QS.has('p') && S.settle) s.tau = on ? tf + .8 : 0;
    if (s.tau <= 0) { if (s.st !== 0) { s.st = 0; mtx.makeScale(0, 0, 0); sprinkles.setMatrixAt(i, mtx); sprDirty = true; } continue; }
    if (s.tau >= tf + .8) { landed++; if (s.st === 2) continue; s.st = 2; }
    else s.st = 1;
    sprDirty = true;
    let pos, q;
    if (s.tau < tf) {
      const k = s.tau / tf, y = s.h - .5 * G * s.tau * s.tau;
      pos = va.set(s.p.x + s.dx * (1 - k), s.p.y + y, s.p.z + s.dz * (1 - k));
      qa.copy(s.q0).multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, s.spin * s.tau));
      q = qa.slerp(s.q, sstep(.75, 1, k));
    } else {
      const u = s.tau - tf; if (s.st === 1) landed++;
      pos = va.copy(s.p); pos.y += s.hop * Math.abs(Math.sin(u * 16)) * Math.exp(-u * 9);
      q = qa.copy(s.q);
    }
    mtx.compose(pos, q, sc1.set(1, 1, 1)); sprinkles.setMatrixAt(i, mtx);
  }
  if (sprDirty) { sprinkles.instanceMatrix.needsUpdate = true; sprDirty = false; }
  sprDone = SPRD.length ? landed / SPRD.length : 1;
  // cherry
  const cs = dropState(tau.cherry, DROP.cherry, .055, .16);
  cherry.visible = tau.cherry > 0 && !!cherry.userData.rest;
  if (cherry.userData.rest) {
    const R = cherry.userData.rest;
    cherry.position.set(R.x, R.y + cs.y, R.z);
    cherryBody.scale.set(1 + (1 - cs.s) * .5, cs.s, 1 + (1 - cs.s) * .5);
    cherry.rotation.set(.12, .6 + (cs.land < 0 ? tau.cherry * 3 : 0), -.1);
    const st = cherry.userData.stem;
    st.rotation.z = cs.land < 0 ? -.25 : .35 * Math.exp(-cs.land * 3.2) * Math.sin(cs.land * 17);
    st.rotation.x = cs.land < 0 ? 0 : .15 * Math.exp(-cs.land * 3) * Math.sin(cs.land * 13 + 1);
    if (cs.land >= 0) shake = Math.max(shake, .008 * Math.exp(-cs.land * 10));
  }
  // spoon slides in for the hero shot
  const sp = easeOut(tau.spoon / 1.1);
  spoon.visible = tau.spoon > 0;
  const SA = 1.2, sr = lerp(1.5, .57, sp);
  spoon.position.set(Math.sin(SA) * sr, plateTop(.57) + .001 + (1 - sp) * .06, Math.cos(SA) * sr);
  spoon.rotation.set(0, SA + Math.PI + (1 - sp) * .6, 0);
  // lights come up as the plate arrives
  const L = sstep(.0, .09, p);
  key.intensity = KEY_I * (.25 + .75 * L);
  poolL.intensity = POOL_I * (1 - sstep(.005, .05, p)); rim.intensity = RIM_I * L; kick.intensity = KICK_I * L;
  scene.environmentIntensity = .55 * (.25 + .75 * L);
  S.shake = shake;
}

/* ---------- sizing (subject sits right of the copy on desktop, above it on phones) ---------- */
let W = 1, H = 1;
function resize() {
  W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
  renderer.setSize(W, H, false); composer.setPixelRatio(DPR); composer.setSize(W, H);
  camera.aspect = W / H;
  const portrait = W / H < .9;
  if (portrait) camera.setViewOffset(W, H, 0, H * .1, W, H);
  else camera.setViewOffset(W, H, -W * .17, 0, W, H);
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => { resize(); busyUntil = performance.now() + 1000; });

const FREEZE = QS.has('freeze');
function frame(dt) {
  S.time += dt;
  apply(FREEZE ? 0 : dt);
  const [az, el, dist0, ty] = camAt(S.p);
  const aspect = W / H;
  const dist = dist0 * (aspect < 1 ? Math.min(1.9, 1 + (1 - aspect) * 1.25) : 1);
  // finale: drag to spin, then drift back
  if (!S.dragging) { S.spinV *= Math.pow(.05, dt); S.spin += S.spinV * dt; if (S.p > .97) S.spin += dt * .12; }
  dish.rotation.y = S.spin;
  const A = THREE.MathUtils.degToRad(az), E = THREE.MathUtils.degToRad(el);
  const sh = S.shake;
  const jx = sh * noise(S.time * 30, 1, 0), jy = sh * noise(S.time * 30, 2, 0);
  camera.position.set(Math.sin(A) * Math.cos(E) * dist + jx, Math.sin(E) * dist + ty + jy, Math.cos(A) * Math.cos(E) * dist);
  camera.lookAt(jx * .3, ty + jy * .3, 0);
  scene.fog.near = dist * .92; scene.fog.far = dist + 5.2;
  grade.uniforms.uTime.value = S.time % 10;
  composer.render(dt);
}

/* ---------- drag to spin (fine pointers and touch, only at the finale) ---------- */
let lastX = 0;
canvas.addEventListener('pointerdown', e => { if (S.p < .95) return; S.dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); $('#spinHint').style.opacity = 0; });
canvas.addEventListener('pointermove', e => { if (!S.dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; S.spin += dx * .008; S.spinV = dx * .5; });
const endDrag = () => { S.dragging = false; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

/* ---------- boot ---------- */
let running = false, visible = true, ready = false, last = performance.now();
manager.onLoad = () => {
  resize();
  planToppings();
  ready = true;
  window.__ffReady && window.__ffReady();
  if (RM) { S.p = S.target = 1; S.settle = true; for (const k in tau) tau[k] = 9; }
  if (QS.has('p')) { S.settle = true; for (const k in tau) tau[k] = S.p >= TRIG[k] ? 9 : 0; }
  for (const k in tau) if (QS.has('t_' + k)) tau[k] = +QS.get('t_' + k);
  if (QS.has('F')) S.F = +QS.get('F');
  start();
};
function start() { if (running || !ready) return; running = true; last = performance.now(); busyUntil = last + 4000; requestAnimationFrame(loop); }
// only render while something is moving; drop effects if the GPU can't keep up
let busyUntil = 0, lastP = -1, lastF = -1, perfN = 0, perfSum = 0, tier = 0;
function degrade() {
  tier++;
  if (tier === 1) { DPR = Math.min(DPR, 1.3); }
  if (tier === 2) { bloom.enabled = false; DPR = 1; key.shadow.mapSize.set(1024, 1024); key.shadow.map && key.shadow.map.dispose(); key.shadow.map = null; }
  resize(); perfN = 0; perfSum = 0;
}
function loop(now) {
  if (!visible || document.hidden) { running = false; return; }
  const raw = now - last, dt = clamp(raw / 1000, 0, .05); last = now;
  S.p += (S.target - S.p) * (1 - Math.pow(.0009, dt));
  if (Math.abs(S.target - S.p) < 1e-4) S.p = S.target;
  if (S.p !== lastP || S.F !== lastF || S.dragging || Math.abs(S.spinV) > .01 || S.p > .97 || stream.visible) busyUntil = now + 4000;
  lastP = S.p; lastF = S.F;
  if (now < busyUntil) {
    frame(dt);
    if (tier < 2 && raw > 0 && raw < 400 && !QS.has('dpr')) { perfN++; perfSum += raw; if (perfN === 60) { if (perfSum / perfN > 21) degrade(); else { perfN = 0; perfSum = 0; } } }
  }
  requestAnimationFrame(loop);
}
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe($('#stage'));
document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });

// hooks for the page script + QA
window.__ff = {
  setTarget: p => { if (!QS.has('p')) S.target = p; },
  get p() { return S.p; },
  jump: p => { S.p = S.target = p; S.settle = true; for (const k in tau) tau[k] = p >= TRIG[k] ? 9 : 0; S.F = clamp((p - .48) / .2); for (const s of SPRD) s.tau = 0; setTimeout(() => { S.settle = false; }, 50); },
  frame: n => { for (let i = 0; i < (n || 1); i++) frame(1 / 60); }
};
window.__ffd = { get SPRD() { return SPRD; }, scoopMesh, cap, pool, scene, tau, S, cherry };
window.dispatchEvent(new Event('ff:gl'));
