/* =====================================================================
   Cedarloom Kitchen (fictional concept by ElaSystems): "Feed the table".
   A Mediterranean combo tray built in real 3D and laid out for 3, 5, 7
   or 10 people.
   Hammered silver tray → a bed of saffron rice spreads → beef + chicken
   kofta, chicken tikka and breaded cutlets drop in rows → shawarma rains
   onto the front edge → stews, pickles and pita set down around it.
   api.build(size) re-lays the tray for a new head count.

   Every food surface is generated in code: periodic value noise + cellular
   (Worley) noise paint seamless colour tiles (rice grains, grill marks,
   breadcrumb, pita blisters, beans in tomato sauce...) and the same height
   field becomes a normal map. No photos.
   - tray: ambientCG Metal051B hammered-metal normal map (CC0)
   - lighting: Poly Haven cowboy_town_saloon HDRI (CC0, downsized)
   - geometry detail: instanced rice grains, parsley flecks, hand-pressed
     kofta, puffy pita, beans + potato in the stews, contact shadows
   - desktop: GTAO ambient occlusion through EffectComposer (alpha kept)
   Bundle: kit/build3d/build.sh demos/catering-kitchen/src/platter.js demos/catering-kitchen/assets/platter.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// how each head count fills the tray (tray half-width A, half-depth B)
export const SIZES = {
  3: { A: .74, B: .62, beef: 1, chicken: 1, tikka: 1, chop: 1, shawarma: 320, bowls: 2 },
  5: { A: .98, B: .68, beef: 2, chicken: 1, tikka: 1, chop: 1, shawarma: 480, bowls: 2 },
  7: { A: 1.18, B: .74, beef: 2, chicken: 2, tikka: 1, chop: 2, shawarma: 620, bowls: 3 },
  10: { A: 1.42, B: .8, beef: 3, chicken: 2, tikka: 2, chop: 2, shawarma: 800, bowls: 3 }
};

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); }
// planar UVs (x,z) for lathe parts that should read as a flat surface
function planarUV(geo, s = 1) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * s + .5, p.getZ(i) * s + .5); uv.needsUpdate = true; return geo; }

/* ---------------- procedural food textures (all seamless) ---------------- */
const hash = (i, s) => { let h = Math.imul(i ^ 0x9e3779b9, 374761393) ^ Math.imul(s + 1, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wrap = (a, P) => ((a % P) + P) % P;
// periodic value noise with Pu x Pv cells per tile
function vnoise(Pu, Pv, s) {
  return (u, v) => {
    const x = u * Pu, y = v * Pv, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (a, b) => hash(wrap(a, Pu) + wrap(b, Pv) * Pu, s);
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
function fbm(Pu, Pv, s, oct = 4) { const ns = []; for (let i = 0; i < oct; i++) ns.push(vnoise(Pu << i, Pv << i, s + i * 31)); return (u, v) => { let t = 0, a = .5, n = 0; for (const f of ns) { t += f(u, v) * a; n += a; a *= .5; } return t / n; }; }
// periodic cellular noise → [d1, d2, cell id]; stretch > 1 gives elongated, randomly turned cells (rice, beans)
function worley(Pu, Pv, s, jit = .9, stretch = 1) {
  return (u, v) => {
    const x = u * Pu, y = v * Pv, xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j, k = wrap(cx, Pu) + wrap(cy, Pv) * Pu;
      let dx = cx + .5 + (hash(k, s) - .5) * jit - x, dy = cy + .5 + (hash(k, s + 7) - .5) * jit - y;
      if (stretch !== 1) { const a = hash(k, s + 3) * Math.PI, c = Math.cos(a), sn = Math.sin(a), lx = dx * c - dy * sn, ly = dx * sn + dy * c; dx = lx; dy = ly * stretch; }
      const d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; id = hash(k, s + 13); } else if (d < d2) d2 = d;
    }
    return [d1, d2, id];
  };
}
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hx = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// fn(u, v) → [r, g, b, height]; returns [colour map, normal map]
function gen(W, H, fn, strength = 3, rep = [1, 1], aniso = 1) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), hh = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = fn((x + .5) / W, (y + .5) / H), i = y * W + x;
    img.data[i * 4] = clamp(o[0]) * 255; img.data[i * 4 + 1] = clamp(o[1]) * 255; img.data[i * 4 + 2] = clamp(o[2]) * 255; img.data[i * 4 + 3] = 255; hh[i] = o[3];
  }
  g.putImageData(img, 0, 0);
  const n = document.createElement('canvas'); n.width = W; n.height = H; const gn = n.getContext('2d'), nd = gn.createImageData(W, H);
  const at = (x, y) => hh[wrap(y, H) * W + wrap(x, W)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; const i = (y * W + x) * 4;
    nd.data[i] = (nx * .5 + .5) * 255; nd.data[i + 1] = (ny * .5 + .5) * 255; nd.data[i + 2] = (nz * .5 + .5) * 255; nd.data[i + 3] = 255;
  }
  gn.putImageData(nd, 0, 0);
  const T = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return [T(c, true), T(n, false)];
}

function foodTextures(aniso, R) { // R = base resolution
  const tx = {};
  // saffron rice: elongated grains, a few paler ones, dark gaps between
  { const w = worley(16, 22, 101, .9, 2.6), n = fbm(4, 4, 7, 3); const deep = hx(0xc27a0c), gold = hx(0xf0b22a), pale = hx(0xf6e2a6), gap = hx(0x7a4a08);
    [tx.rice, tx.riceN] = gen(R, R, (u, v) => { const [d1, d2, id] = w(u, v), gr = 1 - ss(.22, .42, d1), e = ss(0, .1, d2 - d1), k = .88 + .24 * n(u, v); const base = id > .84 ? pale : mix(deep, gold, id / .84); return [...mul(mix(gap, base, gr * e * .9 + .1), k), gr * e * .85 + n(u, v) * .15]; }, 4, [5, 5], aniso); }
  // grilled kofta: browned mince, crusty speckle, dark grill bars across the length (v)
  const kofta = (s, lo, hi, charC, spice) => { const n = fbm(6, 6, s, 4), l = fbm(3, 3, s + 9, 3), cr = worley(30, 30, s + 4, 1); const A = hx(lo), B = hx(hi), C = hx(charC), S = hx(spice);
    return gen(R, R, (u, v) => { const nv = n(u, v), m = Math.abs(((v * 5 + nv * .5) % 1) - .5), bar = (1 - ss(.02, .08, m)) * ss(.3, .6, l(u, v) + .15), [d1] = cr(u, v), sp = 1 - ss(.08, .2, d1);
      let col = mix(A, B, nv); col = mix(col, S, sp * .35); col = mix(col, C, bar * .6); return [...col, l(u, v) * .55 + nv * .3 + sp * .1 - bar * .25]; }, 5, [2, 1], aniso); };
  [tx.beef, tx.beefN] = kofta(201, 0x4c2414, 0x7a3e20, 0x160904, 0x9a4a22);
  [tx.chick, tx.chickN] = kofta(301, 0xb06a2c, 0xd89848, 0x3a1a08, 0xc8501c);
  // chicken tikka: deep orange marinade with charred patches
  { const n = fbm(5, 5, 401, 4), p = fbm(3, 3, 405, 3); const A = hx(0xc4461a), B = hx(0xe87a2c), C = hx(0x24100a);
    [tx.tikka, tx.tikkaN] = gen(R, R, (u, v) => { const nv = n(u, v), ch = ss(.56, .7, p(u, v) + nv * .15); return [...mix(mix(A, B, nv), C, ch * .9), nv * .6 + ch * .3]; }, 4, [1, 1], aniso); }
  // breaded cutlet: golden crumb
  { const w = worley(44, 44, 501, 1), n = fbm(4, 4, 503, 3); const A = hx(0xa8642a), B = hx(0xeab066), G = hx(0x6a3a14);
    [tx.chop, tx.chopN] = gen(R, R, (u, v) => { const [d1, d2, id] = w(u, v), cr = 1 - ss(.15, .5, d1), e = ss(0, .14, d2 - d1); return [...mul(mix(G, mix(A, B, id * .7 + n(u, v) * .3), cr * e * .85 + .15), .95 + n(u, v) * .1), cr * e]; }, 6, [1.2, 1.2], aniso); }
  // shawarma: long fibres, seared edges, a little rendered fat
  const shaw = (s, lo, hi, sear, fat) => { const f = vnoise(64, 6, s), f2 = vnoise(24, 3, s + 2), n = fbm(4, 4, s + 5, 3); const A = hx(lo), B = hx(hi), C = hx(sear), F = hx(fat);
    return gen(R, R, (u, v) => { const fib = f(u, v) * .6 + f2(u, v) * .4, sr = ss(.6, .78, n(u, v)), ft = ss(.78, .9, f2(u, v)) * .6; let col = mix(A, B, fib); col = mix(col, F, ft); col = mix(col, C, sr * .85); return [...col, fib * .7 - sr * .2]; }, 4, [.35, .35], aniso); };
  [tx.shawb, tx.shawbN] = shaw(601, 0x5a2a14, 0x8e4a24, 0x1c0c06, 0xc08a5a);
  [tx.shawc, tx.shawcN] = shaw(701, 0xc0782c, 0xe2a650, 0x5a2a0c, 0xf0d080);
  // pita: pale bread, toasted blisters, flour dust
  { const w = worley(7, 7, 801, 1), n = fbm(5, 5, 803, 4), d = worley(60, 60, 805, 1); const A = hx(0xe2c088), B = hx(0xf0dbb0), T = hx(0xa8642a), D = hx(0x5a2e12), W = hx(0xfaf2e0);
    [tx.pita, tx.pitaN] = gen(R, R, (u, v) => { const nv = n(u, v), [d1] = w(u, v), bl = 1 - ss(.12, .34 + nv * .1, d1), core = 1 - ss(0, .14, d1), [e1] = d(u, v), fl = (1 - ss(.05, .15, e1)) * .5; let col = mix(A, B, nv); col = mix(col, T, bl * .75); col = mix(col, D, core * .6); col = mix(col, W, fl * (1 - bl)); return [...col, bl * .5 + nv * .4]; }, 4, [1.4, 1.4], aniso); }
  // white beans in tomato sauce
  { const w = worley(9, 14, 901, .9, 1.6), n = fbm(4, 6, 903, 3); const A = hx(0x9a2c14), B = hx(0xd0562a), Be = hx(0xf0e2c2), Bd = hx(0xc8a878);
    [tx.bean, tx.beanN] = gen(R, R, (u, v) => { const [d1] = w(u, v), b = 1 - ss(.26, .34, d1), sh = ss(0, .3, d1); let col = mix(A, B, n(u, v)); col = mix(col, mix(Be, Bd, sh), b); return [...col, b * (1 - sh * .6) + n(u, v) * .1]; }, 5, [1, 1.6], aniso); }
  // curry potato stew: turmeric sauce with potato + carrot pieces
  { const w = worley(6, 8, 1001, .9), n = fbm(4, 5, 1003, 3); const A = hx(0xc8801a), B = hx(0xe8ae3a), P = hx(0xf2d68e), Cr = hx(0xe2702a);
    [tx.curry, tx.curryN] = gen(R, R, (u, v) => { const [d1, , id] = w(u, v), c = 1 - ss(.22, .3, d1); let col = mix(A, B, n(u, v)); col = mix(col, id > .8 ? Cr : P, c * .9); return [...col, c * .7 + n(u, v) * .2]; }, 4, [1, 1.4], aniso); }
  // pickles: cauliflower, carrot, pink turnip, pepper in brine
  { const w = worley(6, 12, 1101, 1), n = fbm(4, 4, 1103, 3); const cols = [0xf2c94c, 0xe9b43a, 0xe8772a, 0xf7e08a, 0xd8607a].map(hx), G = hx(0x7a5a22);
    [tx.turshi, tx.turshiN] = gen(R, R, (u, v) => { const [d1, d2, id] = w(u, v), e = ss(0, .12, d2 - d1); return [...mul(mix(G, cols[(id * 5) | 0], e * .9 + .1), .9 + n(u, v) * .2), e]; }, 4, [1, 2], aniso); }
  return tx;
}

export async function mountPlatter(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 60), world = new THREE.Group(); scene.add(world);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---- load: HDRI + the CC0 hammered-metal normal; food textures are generated ----
  const hdr = name => new Promise(res => new RGBELoader().load(A0 + name, t => res(t), undefined, () => res(null)));
  const metalN = await new Promise(res => new THREE.TextureLoader().load(A0 + 'mat/hammered-n.webp', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = aniso; res(t); }, undefined, () => res(null)));
  const env = await hdr('saloon-512.hdr').then(e => e || hdr('studio-512.hdr'));
  const tx = foodTextures(aniso, SMALL ? 192 : 256); tx.metalN = metalN;
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 2.2, 0); scene.environmentIntensity = .75; }

  // warm pass light, a low orange glow from below-left (the grill), cool rim
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3); key.position.set(1.5, 5, 2.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0004; key.shadow.normalBias = .012;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12 });
  const glow = new THREE.PointLight(0xff6a1f, 4, 6, 1.6); glow.position.set(-2.2, .6, 1.2);
  const rim = new THREE.DirectionalLight(0xffe2c0, .8); rim.position.set(-3, 2.2, -3);
  scene.add(key, glow, rim, new THREE.HemisphereLight(0xfff3e4, 0x20140c, .25));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  // soft contact shadow under tray + bowls (the shadow map alone looks pasted on)
  const blobT = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const blobMat = new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false });
  const blob = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = .002; m.scale.set(s, s, 1); m.renderOrder = -1; return m; };
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- materials (procedural textures) ----
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd3dce6, metalness: 1, roughness: .3, normalMap: tx.metalN, normalScale: new THREE.Vector2(.55, .55), clearcoat: .4, clearcoatRoughness: .2 });
  const food = (map, nmap, o2 = {}) => new THREE.MeshPhysicalMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .55, ...o2 });
  const rice = food(tx.rice, tx.riceN, { roughness: .6, sheen: .35, sheenColor: new THREE.Color(0xffe2a0) });
  const beefMat = food(tx.beef, tx.beefN, { roughness: .5, clearcoat: .35, clearcoatRoughness: .45, normalScale: new THREE.Vector2(1.8, 1.8) });
  const chickMat = food(tx.chick, tx.chickN, { roughness: .5, clearcoat: .3, clearcoatRoughness: .45, normalScale: new THREE.Vector2(1.6, 1.6) });
  const tikkaMat = food(tx.tikka, tx.tikkaN, { roughness: .45, clearcoat: .45, clearcoatRoughness: .35, normalScale: new THREE.Vector2(1.6, 1.6) });
  const chopMat = food(tx.chop, tx.chopN, { roughness: .75, normalScale: new THREE.Vector2(2.2, 2.2), sheen: .3, sheenColor: new THREE.Color(0xffc070) });
  const shawB = food(tx.shawb, tx.shawbN, { roughness: .5, clearcoat: .4, clearcoatRoughness: .4, side: THREE.DoubleSide });
  const shawC = food(tx.shawc, tx.shawcN, { roughness: .5, clearcoat: .4, clearcoatRoughness: .4, side: THREE.DoubleSide });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xf7f3ec, roughness: .16, clearcoat: 1, clearcoatRoughness: .05 });
  const stewBean = food(tx.bean, tx.beanN, { roughness: .22, clearcoat: 1, clearcoatRoughness: .04, normalScale: new THREE.Vector2(.6, .6) });
  const stewCurry = food(tx.curry, tx.curryN, { roughness: .22, clearcoat: 1, clearcoatRoughness: .04, normalScale: new THREE.Vector2(.6, .6) });
  const turshiMat = food(tx.turshi, tx.turshiN, { roughness: .3, clearcoat: .8, clearcoatRoughness: .15 });
  const pitaMat = food(tx.pita, tx.pitaN, { roughness: .82, sheen: .4, sheenColor: new THREE.Color(0xfff0d0), side: THREE.DoubleSide });
  const potatoMat = food(tx.curry, tx.curryN, { color: 0xfff0c8, roughness: .4, clearcoat: .7 });
  const beanMat = new THREE.MeshPhysicalMaterial({ color: 0xf1e4c6, roughness: .35, clearcoat: .9, clearcoatRoughness: .1, sheen: .3, sheenColor: new THREE.Color(0xfff4dc) });
  const parsleyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, side: THREE.DoubleSide });
  const grainMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .42, clearcoat: .3, clearcoatRoughness: .5 });

  // ---- tray (lathe, stretched to an oval per size) ----
  const tp = [[0, 0], [.86, 0], [.92, .02], [.97, .07], [1.02, .1], [1.04, .095], [1.0, .06], [.9, .025], [0, .025]].map(p => new THREE.Vector2(p[0], p[1]));
  const tray = sh(new THREE.Mesh(planarUV(new THREE.LatheGeometry(tp, 128), .5), silver)); world.add(tray);
  const trayBlob = blob(2.3); world.add(trayBlob);
  const trayS = { A: .74, B: .62 };

  // rice bed: a displaced dome inside the rim, with real instanced grains on it
  const domeN = (x, z) => Math.sin(x * 9) * Math.cos(z * 8) * .5 + Math.sin(x * 23 + z * 17) * .5;
  const riceGeo = new THREE.SphereGeometry(1, 128, 28, 0, Math.PI * 2, 0, Math.PI / 2);
  { const p = riceGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = domeN(x, z); p.setY(i, y * (1 + n * .12) + n * .01); } riceGeo.computeVertexNormals(); planarUV(riceGeo, .5); }
  const riceBed = sh(new THREE.Mesh(riceGeo, rice)); world.add(riceBed);
  const NG = SMALL ? 1800 : 3800;
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), grainMat, NG); grains.receiveShadow = true; world.add(grains);
  const gHome = [];
  { seed = 3; const cols = [0xe8a412, 0xdc960e, 0xf0b828, 0xf5cf62, 0xd28410]; const c = new THREE.Color();
    for (let i = 0; i < NG; i++) { const r = Math.sqrt(rnd(0, .93)), a = rnd(0, 6.283); gHome.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ry: rnd(0, 6.283), tilt: rnd(-.5, .5), s: rnd(.8, 1.2) }); c.setHex(cols[(rnd(0, 1) * cols.length) | 0]).offsetHSL(0, 0, rnd(-.05, .05)); grains.setColorAt(i, c); } }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E1 = new THREE.Euler();
  function placeGrains(sx, sy, sz) {
    if (sx < .01) { grains.visible = false; return; } grains.visible = true;
    gHome.forEach((h, i) => { const y = Math.sqrt(Math.max(0, 1 - h.x * h.x - h.z * h.z)), n = domeN(h.x, h.z); P.set(h.x * sx, .02 + (y * (1 + n * .12) + n * .01) * sy + .002, h.z * sz); E1.set(h.tilt * .4, h.ry, h.tilt); Q.setFromEuler(E1); S1.set(.006 * h.s, .005 * h.s, .019 * h.s); M.compose(P, Q, S1); grains.setMatrixAt(i, M); });
    grains.instanceMatrix.needsUpdate = true;
  }

  // parsley flecks: small jagged leaves, instanced per row
  const leafShape = new THREE.Shape(); { const n = 7; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = i % 2 ? .55 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r * .75; i ? leafShape.lineTo(x, y) : leafShape.moveTo(x, y); } }
  const leafGeo = new THREE.ShapeGeometry(leafShape); leafGeo.rotateX(-Math.PI / 2);
  const greens = [0x2f6b1c, 0x3d7d22, 0x24561a, 0x4d8a2a];
  function parsley(n, spot) { // spot(i) → [x, y, z]
    const im = new THREE.InstancedMesh(leafGeo, parsleyMat, n), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const [x, y, z] = spot(i); E1.set(rnd(-.5, .5), rnd(0, 6.28), rnd(-.5, .5)); Q.setFromEuler(E1); P.set(x, y, z); S1.setScalar(rnd(.005, .011)); M.compose(P, Q, S1); im.setMatrixAt(i, M); im.setColorAt(i, c.setHex(greens[i % 4])); }
    return im;
  }

  // ---- builders for each item ----
  function kofta(mat, len) { // hand-pressed: lumpy radius + finger ridges along the skewer
    const prof = [], R = .056;
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), -len / 2 + Math.sin(a) * R)); }
    for (let i = 1; i < 40; i++) prof.push(new THREE.Vector2(R * (1 + .07 * Math.sin(i * 1.9 + rnd(0, 3)) + .045 * Math.sin(i * 4.7)), -len / 2 + len * i / 40));
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), len / 2 + Math.sin(a) * R)); }
    const geo = new THREE.LatheGeometry(prof, 28), p = geo.attributes.position, ph = rnd(0, 6);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .05 * Math.sin(a * 3 + y * 31 + ph) + .03 * Math.sin(a * 7 - y * 57); p.setX(i, x * k); p.setZ(i, z * k); }
    geo.computeVertexNormals();
    const m = sh(new THREE.Mesh(geo, mat)); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, .82);
    return m;
  }
  function tikkaRow(len) {
    const g = new THREE.Group(), n = Math.max(3, Math.round(len / .085));
    for (let i = 0; i < n; i++) { const s = .07 + rnd(0, .025); const c = sh(new THREE.Mesh(new RoundedBoxGeometry(s * rnd(.85, 1.25), s * rnd(.6, .85), s * rnd(.8, 1.15), 3, .022), tikkaMat)); c.position.set(rnd(-.035, .035), s * .4, -len / 2 + (i + .5) * len / n); c.rotation.set(rnd(-.35, .35), rnd(0, 3), rnd(-.35, .35)); g.add(c); }
    g.add(parsley(14, () => [rnd(-.04, .04), .085, rnd(-len / 2, len / 2)]));
    return g;
  }
  function chopRow(len) { // breaded cutlets fanned along the row
    const g = new THREE.Group(), n = Math.max(2, Math.round(len / .19));
    for (let i = 0; i < n; i++) { const geo = new THREE.SphereGeometry(1, 40, 16), p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, p.getY(k) * (1 + .12 * Math.sin(x * 11 + z * 7))); } geo.computeVertexNormals();
      const c = sh(new THREE.Mesh(geo, chopMat)); c.scale.set(.17, .03, .085); c.position.set(rnd(-.02, .02), .025 + i * .006, -len / 2 + (i + .5) * len / n); c.rotation.set(-.15, rnd(-.35, .35), rnd(-.05, .05)); g.add(c); }
    return g;
  }
  function shawarma(n, mat, area) { // instanced curled strips
    const geo = new THREE.CylinderGeometry(.042, .042, .046, 10, 1, true, 0, 2.2);
    const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true;
    const homes = [];
    for (let i = 0; i < n; i++) { const x = rnd(area.x0, area.x1), z = rnd(area.z0, area.z1), mid = 1 - Math.abs((z - (area.z0 + area.z1) / 2) / ((area.z1 - area.z0) / 2)), y = .01 + rnd(0, .06) + mid * .12; homes.push({ p: new THREE.Vector3(x, y, z), r: new THREE.Euler(rnd(-1.2, 1.2), rnd(0, 6.28), rnd(-1.2, 1.2)), s: new THREE.Vector3(rnd(.7, 1.5), rnd(.6, 1.2), rnd(.6, 1.1)).multiplyScalar(rnd(.75, 1.15)), d: rnd(0, .5) }); }
    im.userData.homes = homes; return im;
  }
  function placeShawarma(im, t) {
    im.userData.homes.forEach((h, i) => { const k = clamp((t - h.d * .5) / .5); P.copy(h.p); P.y += (1 - bounce(k)) * .8; Q.setFromEuler(h.r); if (k > 0) S1.copy(h.s); else S1.setScalar(.0001); M.compose(P, Q, S1); im.setMatrixAt(i, M); });
    im.instanceMatrix.needsUpdate = true;
  }
  function bowl(fill) {
    const g = new THREE.Group();
    const bp = [[0, 0], [.07, 0], [.075, .006], [.12, .05], [.15, .11], [.156, .118], [.15, .12], [.142, .112], [.11, .05], [.065, .018], [0, .018]].map(p => new THREE.Vector2(p[0], p[1]));
    g.add(sh(new THREE.Mesh(new THREE.LatheGeometry(bp, 64), porcelain)));
    const b = blob(.42); b.position.y = .003; g.add(b);
    if (fill === 'turshi') {
      const mound = sh(new THREE.Mesh(planarUV(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), .5), turshiMat)); mound.scale.set(.13, .045, .13); mound.position.y = .075; g.add(mound);
      const cols = [0xf2c94c, 0xe9b43a, 0xe8772a, 0xf7e08a];
      for (let i = 0; i < 12; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .012, 12, 1, true, 0, 2.4), new THREE.MeshPhysicalMaterial({ color: cols[i % 4], roughness: .25, clearcoat: .8, side: THREE.DoubleSide }))); c.position.set(rnd(-.07, .07), .1 + rnd(0, .02), rnd(-.07, .07)); c.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); g.add(c); }
    } else {
      const s = new THREE.Mesh(planarUV(new THREE.CircleGeometry(.139, 48).rotateX(-Math.PI / 2), 3.4), fill === 'bean' ? stewBean : stewCurry); s.position.y = .1; s.receiveShadow = true; g.add(s);
      if (fill === 'curry') for (let i = 0; i < 6; i++) { const b2 = sh(new THREE.Mesh(new RoundedBoxGeometry(.045, .035, .04, 2, .012), potatoMat)); b2.position.set(rnd(-.08, .08), .097, rnd(-.08, .08)); b2.rotation.set(rnd(-.3, .3), rnd(0, 3), 0); g.add(b2); }
      if (fill === 'bean') { const bn = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), beanMat, 16); bn.castShadow = bn.receiveShadow = true; for (let k = 0; k < 16; k++) { const a = rnd(0, 6.28), r = Math.sqrt(rnd(0, 1)) * .1; P.set(Math.cos(a) * r, .1, Math.sin(a) * r); E1.set(rnd(-.3, .3), rnd(0, 6.28), rnd(-.2, .2)); Q.setFromEuler(E1); S1.set(.013, .009, .02); M.compose(P, Q, S1); bn.setMatrixAt(k, M); } g.add(bn); }
    }
    return g;
  }
  function pitaDisc() { // puffy wavy round with planar UVs
    const prof = []; for (let i = 0; i <= 14; i++) { const r = .17 * i / 14; prof.push(new THREE.Vector2(Math.max(.001, r), .006 * Math.sqrt(1 - Math.pow(i / 14, 4)))); }
    for (let i = 13; i >= 0; i--) { const r = .17 * i / 14; prof.push(new THREE.Vector2(Math.max(.001, r), -.004 * Math.sqrt(1 - Math.pow(i / 14, 4)))); }
    const geo = new THREE.LatheGeometry(prof, 48), p = geo.attributes.position, ph = rnd(0, 6);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / .17; p.setY(i, p.getY(i) + r * r * .02 * Math.sin(Math.atan2(z, x) * 3 + ph) + .004 * Math.sin(x * 40) * Math.cos(z * 37)); }
    geo.computeVertexNormals(); planarUV(geo, 2.9);
    return sh(new THREE.Mesh(geo, pitaMat));
  }
  function pitaStack() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const p = pitaDisc(); p.scale.z = .85; p.position.set(rnd(-.02, .02), .008 + i * .012, rnd(-.02, .02)); p.rotation.y = rnd(0, 3); g.add(p); }
    const lean = pitaDisc(); lean.rotation.set(-.9, .3, 0); lean.position.set(.02, .1, -.08); g.add(lean);
    const b = blob(.5); g.add(b);
    return g;
  }

  // ---- layout + sequencer ----
  let current = 0;
  const live = new THREE.Group(); world.add(live);
  function layout(size) {
    seed = 11 + size;
    const C = SIZES[size], A = C.A, B = C.B, len = B * 1.45;
    const cols = [];
    for (let i = 0; i < C.chop; i++) cols.push(['chop', chopRow(len * .9)]);
    for (let i = 0; i < C.tikka; i++) cols.push(['tikka', tikkaRow(len)]);
    const koftaRow = mat => { const g = new THREE.Group(), n = Math.max(2, Math.floor(len / .46)); for (let k = 0; k < n; k++) { const m = kofta(mat, .4); m.position.set(rnd(-.015, .015), .02, -len / 2 + (k + .5) * len / n); m.rotation.z = rnd(-.06, .06); g.add(m); } g.add(parsley(22, () => [rnd(-.032, .032), .068, rnd(-len / 2, len / 2)])); return g; };
    for (let i = 0; i < C.beef; i++) cols.push(['beef', koftaRow(beefMat)]);
    for (let i = 0; i < C.chicken; i++) cols.push(['chicken', koftaRow(chickMat)]);
    const x0 = -A * .78, x1 = A * .62, span = x1 - x0;
    const out = [];
    cols.forEach(([kind, g], i) => { const x = x0 + span * (cols.length === 1 ? .5 : i / (cols.length - 1)); g.userData.home = new THREE.Vector3(x, .15, -B * .12); g.userData.kind = kind; g.userData.delay = i * .09; out.push(g); });
    const sb = shawarma(Math.round(C.shawarma * .55), shawB, { x0: -A * .78, x1: A * .05, z0: B * .3, z1: B * .8 });
    const sc = shawarma(Math.round(C.shawarma * .45), shawC, { x0: A * .05, x1: A * .78, z0: B * .3, z1: B * .8 });
    sb.position.y = sc.position.y = .07; sb.userData.shaw = sc.userData.shaw = true;
    out.push(sb, sc);
    // a light scatter of parsley over the rice edges
    const rp = parsley(Math.round(40 * A), () => { const a = rnd(0, 6.28), r = rnd(.75, .92); return [Math.cos(a) * r * A * .86, .03 + .14 * Math.sqrt(Math.max(0, 1 - r * r)) * .9, Math.sin(a) * r * B * .84]; });
    rp.userData.home = new THREE.Vector3(0, 0, 0); rp.userData.delay = .5; out.push(rp);
    // bowls + pita around the back of the tray
    const sides = [];
    const fills = ['curry', 'bean', 'curry'].slice(0, C.bowls);
    const side = (name, width, make) => make(); // every side dish is built in code
    fills.forEach((f, i) => { const b = side(f === 'bean' ? 'bean' : 'curry', .33, () => bowl(f)); b.rotation.y = rnd(-.4, .4); b.userData.home = new THREE.Vector3(-A * .55 + i * A * .55, 0, -B - .3); b.userData.side = true; b.userData.delay = .1 + i * .08; sides.push(b); });
    const tu = side('turshi', .33, () => bowl('turshi')); tu.scale.multiplyScalar(.8); tu.userData.home = new THREE.Vector3(A * .98, 0, -B * .8 - .12); tu.userData.side = true; tu.userData.delay = .35; sides.push(tu);
    const pi = side('pita', .42, pitaStack); pi.userData.home = new THREE.Vector3(-A - .3, 0, -B * .2); pi.userData.side = true; pi.userData.delay = .42; sides.push(pi);
    return { A, B, parts: out, sides };
  }
  let lastRice = '';
  function placeAll(L, t) {
    // t: 0 → 1 across the whole lay-out
    const tr = clamp(t / .25), rc = clamp((t - .15) / .2), it = clamp((t - .3) / .45), sw = clamp((t - .55) / .35), sd = clamp((t - .6) / .4);
    const A = trayS.A + (L.A - trayS.A) * ease(tr), B = trayS.B + (L.B - trayS.B) * ease(tr);
    tray.scale.set(A, 1, B); trayBlob.scale.set(A * 2.35, B * 2.4, 1);
    const sx = A * .86 * ease(rc), sy = .14 * ease(rc) + .001, sz = B * .84 * ease(rc);
    riceBed.scale.set(sx, sy, sz); riceBed.position.y = .02; riceBed.visible = rc > 0;
    const key = `${sx.toFixed(4)}|${sz.toFixed(4)}`; if (key !== lastRice) { lastRice = key; placeGrains(rc > 0 ? sx : 0, sy, sz); }
    L.parts.forEach(g => {
      if (g.userData.shaw) { placeShawarma(g, sw); return; }
      const k = clamp((it - g.userData.delay) / .45); const h = g.userData.home;
      g.visible = k > 0; g.position.set(h.x, h.y + (1 - bounce(k)) * 1.1, h.z); g.rotation.y = (1 - k) * .4;
    });
    L.sides.forEach(g => { const k = clamp((sd - g.userData.delay) / .5); const h = g.userData.home; g.visible = k > 0; g.position.set(h.x, h.y + (1 - easeOut(k)) * .6, h.z + (1 - easeOut(k)) * -.6); });
    return { A, B };
  }
  let L = null, buildT = 1, D = 2.2, leaving = null, leaveT = 0;
  function build(size) {
    size = +size; if (!SIZES[size]) return;
    if (L) { leaving = L; leaveT = 0; }
    const next = layout(size);
    next.parts.forEach(g => live.add(g)); next.sides.forEach(g => live.add(g));
    if (L) { trayS.A = tray.scale.x; trayS.B = tray.scale.z; }
    L = next; current = size; buildT = RM ? 1 : 0; placeAll(L, buildT); start();
    if (o.onBuild) o.onBuild(size);
  }
  function clearLeaving(dt) {
    if (!leaving) return;
    leaveT += dt / .35; const k = clamp(leaveT);
    [...leaving.parts, ...leaving.sides].forEach(g => { g.position.y += dt * 3 * k; g.scale.setScalar(Math.max(.001, 1 - k)); });
    if (k >= 1) { [...leaving.parts, ...leaving.sides].forEach(g => { live.remove(g); g.traverse(m => m.geometry && m.geometry !== leafGeo && m.geometry.dispose()); }); leaving = null; }
  }

  // ---- post: GTAO contact occlusion on desktop (keeps the transparent canvas) ----
  let composer = null, gtao = null;
  if (!SMALL && renderer.capabilities.isWebGL2 && !o.noPost) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: .12, distanceExponent: 1.2, thickness: 1.2, scale: 1, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.blendIntensity = .9;
    const gr = gtao.render.bind(gtao); gtao.render = (...a) => { floor.visible = false; gr(...a); floor.visible = true; };
    composer.addPass(gtao); composer.addPass(new OutputPass());
  }

  // ---- camera ----
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const target = new THREE.Vector3(0, .1, -.1);
  const placeCam = () => {
    const span = Math.max(tray.scale.x + 1.1, (tray.scale.z + .55) * 1.4);
    D += ((SMALL ? 2.3 : 1.9) * span * (o.zoom || 1) + 1.1 - D) * .06;
    const E = .78 + el, Az = (o.angle ?? .35) + az;
    camera.position.set(target.x + Math.sin(Az) * Math.cos(E) * D, target.y + Math.sin(E) * D, target.z + Math.cos(Az) * Math.cos(E) * D); camera.lookAt(target);
  };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .5; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.14; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 40 : 30; camera.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (L && buildT < 1) { buildT = clamp(buildT + dt / 2.4); placeAll(L, buildT); }
    clearLeaving(dt);
    glow.intensity = 3.4 + Math.sin(t0 * 9) * .4 + Math.sin(t0 * 23) * .25;
    az += (taz + (RM ? 0 : Math.sin(t0 * .2) * .06) - az) * .05; el += (tel - el) * .05; placeCam();
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  build(o.size || 5);
  placeCam(); renderer.compile(scene, camera); start();
  return { build, get size() { return current; }, renderer };
}
