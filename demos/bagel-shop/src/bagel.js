/* =====================================================================
   Ringbright Bagels (concept): "Rolled. Boiled. Baked."
   A lathe-turned, kettle-boiled bagel with a baked procedural crust,
   seeds placed on the real surface as instances (they rain down and
   settle when you pick a topping), and a scroll story that slices it,
   schmears it, stacks egg, cheese and tomato, and closes it up.
   The page owns the shared state object `S` (split, tilt, schmear, egg,
   cheese, tomato, close, spin, x, y, hop) and scrubs it with GSAP; this
   module only reads it.
   Bundle: kit/build3d/build.sh demos/bagel-shop/src/bagel.js demos/bagel-shop/assets/bagel.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// small 3D value noise (smooth, deterministic) for the dough's lumps
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}

// tiny step sequencer: [{ d: seconds, run(k) }] played in order
function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    play(steps) { q = steps.slice(); cur = null; },
    get busy() { return !!(cur || q.length); },
    tick(dt) {
      if (!cur) { cur = q.shift(); t = 0; if (!cur) return; cur.start && cur.start(); }
      t += dt; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k);
      if (k >= 1) { cur.end && cur.end(); cur = null; }
    }
  };
}

// ---------------- the bagel's shape ----------------
const R = 1, T = .46, FT = .84, FB = .6;   // ring radius, tube radius, top / bottom flattening
const SEG = 160, NP = 44;                   // lathe segments, profile points per half
// surface point for angle a around the ring and th along the cross-section (0 = outer cut edge, PI = inner cut edge)
function surf(a, th, half, out = new THREE.Vector3()) {
  const s = Math.sin(th), c = Math.cos(th);
  const band = smooth(0, .42, s);                                        // keep the cut line clean
  const px = Math.cos(a) * 1.7, pz = Math.sin(a) * 1.7;
  let d = vnoise(px * 1.6, th * 1.3 + half * 5, pz * 1.6) * .045         // big lumps from hand rolling
        + vnoise(px * 4.2, th * 3.1 + half * 9, pz * 4.2) * .016
        + vnoise(px * 11, th * 8 + half * 3, pz * 11) * .005;
  d += .028 * Math.sin(a * 2 + .7) * (half > 0 ? 1 : .4);               // a little uneven rise around the ring
  d *= band;
  const tube = T * (half > 0 ? 1 + .05 * s : 1);
  const r = R + (tube + d) * c * (1 + .035 * s);                         // the belly bulges a touch
  const y = half * (tube + d) * s * (half > 0 ? FT : FB);
  return out.set(Math.sin(a) * r, y, Math.cos(a) * r);                  // same axes as LatheGeometry
}
function halfGeometry(half) {
  // lathe-turn the clean cross-section, then push each vertex by the noise for its angle
  const pts = [];
  for (let j = 0; j < NP; j++) { const th = half > 0 ? j / (NP - 1) * Math.PI : (1 - j / (NP - 1)) * Math.PI; const p = surf(0, th, half); pts.push(new THREE.Vector2(p.z, p.y)); }
  const g = new THREE.LatheGeometry(pts, SEG);
  const pos = g.attributes.position, V = new THREE.Vector3();
  for (let i = 0; i <= SEG; i++) for (let j = 0; j < NP; j++) {
    const a = i / SEG * Math.PI * 2, th = half > 0 ? j / (NP - 1) * Math.PI : (1 - j / (NP - 1)) * Math.PI;
    surf(a, th, half, V); pos.setXYZ(i * NP + j, V.x, V.y, V.z);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal;                                         // weld the lathe seam's normals
  for (let j = 0; j < NP; j++) { const a = j, b = SEG * NP + j; const x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2; n.setXYZ(a, x, y, z); n.setXYZ(b, x, y, z); }
  n.needsUpdate = true;
  return g;
}

// ---------------- baked textures (all drawn in code) ----------------
function canvasTex(w, h, draw, srgb = true, wrap = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const lerpC = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ramp = (stops, v) => { for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [v0, c0] = stops[i - 1], [v1, c1] = stops[i]; return lerpC(c0, c1, (v - v0) / (v1 - v0)); } return stops[stops.length - 1][1]; };
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
// draw a blob that wraps around the texture's left/right seam
const wrapDot = (g, w, x, y, fn) => { fn(x); if (x < 60) fn(x + w); if (x > w - 60) fn(x - w); };

// crust: x = around the ring, y = along the cross-section (canvas top = profile end)
function crustMaps(half) {
  seed = half > 0 ? 11 : 29;
  const top = [[0, [214, 168, 104]], [.06, [196, 138, 74]], [.18, [168, 100, 44]], [.36, [134, 72, 28]], [.55, [118, 60, 22]], [.72, [140, 78, 32]], [.88, [182, 120, 60]], [1, [220, 180, 122]]];
  const bot = [[0, [214, 172, 112]], [.12, [190, 136, 76]], [.5, [178, 124, 66]], [.88, [196, 146, 84]], [1, [224, 186, 130]]];
  const stops = half > 0 ? top : bot;
  const blobs = [];
  for (let i = 0; i < (half > 0 ? 260 : 160); i++) blobs.push([rnd(0, 1), rnd(.05, .95), rnd(.003, .011), rnd()]);
  const map = canvasTex(1024, 512, (g, w, h) => {
    for (let y = 0; y < h; y++) { const v = 1 - y / h; g.fillStyle = rgb(ramp(stops, v)); g.fillRect(0, y, w, 1); }
    // mottled browning
    for (let i = 0; i < 260; i++) { const x = rnd(0, w), v = rnd(.15, .85), y = (1 - v) * h, r = rnd(20, 70); const dark = half > 0 ? smooth(.15, .45, v) * smooth(.95, .6, v) : .4;
      wrapDot(g, w, x, y, xx => { const gr = g.createRadialGradient(xx, y, 0, xx, y, r); gr.addColorStop(0, `rgba(${rnd() < .5 ? '96,48,18' : '210,150,80'},${.18 * (.4 + dark)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(xx - r, y - r, r * 2, r * 2); }); }
    // blisters: tiny glossy bubbles from the boil, darker rims
    for (const [u, v, s, k] of blobs) { if (half > 0 && (v < .12 || v > .9)) continue; const x = u * w, y = (1 - v) * h, r = s * w * .45;
      wrapDot(g, w, x, y, xx => { g.fillStyle = `rgba(80,38,12,${.12 + k * .16})`; g.beginPath(); g.ellipse(xx, y, r * 1.4, r, 0, 0, 7); g.fill(); g.fillStyle = `rgba(240,190,120,${.1 + k * .15})`; g.beginPath(); g.ellipse(xx - r * .3, y - r * .3, r * .6, r * .4, 0, 0, 7); g.fill(); }); }
    if (half > 0) { // pale stretch lines on the belly where the dough opened in the oven
      for (let i = 0; i < 70; i++) { const x = rnd(0, w), v = rnd(.03, .16), y = (1 - v) * h, L = rnd(30, 110);
        g.strokeStyle = `rgba(240,212,160,${rnd(.12, .3)})`; g.lineWidth = rnd(1, 3); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L / 2, y + rnd(-6, 6), x + L, y + rnd(-4, 4)); g.stroke(); }
    } else { // board marks + cornmeal on the bottom
      for (let i = 0; i < 40; i++) { const x = rnd(0, w), y = (1 - rnd(.3, .7)) * h, r = rnd(18, 50); wrapDot(g, w, x, y, xx => { const gr = g.createRadialGradient(xx, y, 0, xx, y, r); gr.addColorStop(0, 'rgba(110,62,24,.32)'); gr.addColorStop(1, 'rgba(110,62,24,0)'); g.fillStyle = gr; g.fillRect(xx - r, y - r, r * 2, r * 2); }); }
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '244,206,96' : '252,232,170'},${rnd(.4, .9)})`; g.fillRect(rnd(0, w), (1 - rnd(.2, .8)) * h, rnd(1.5, 3.5), rnd(1.5, 3)); }
    }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,236,200,${rnd(0, .12)})`; g.fillRect(rnd(0, w), rnd(0, h), 1.4, 1.4); }
  });
  seed = half > 0 ? 11 : 29;
  const bump = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const x = rnd(0, w), y = rnd(0, h), r = rnd(3, 18), v = rnd(90, 180) | 0; wrapDot(g, w, x, y, xx => { const gr = g.createRadialGradient(xx, y, 0, xx, y, r); gr.addColorStop(0, `rgba(${v},${v},${v},.6)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(xx - r, y - r, r * 2, r * 2); }); }
    for (const [u, v, s] of blobs) { const r = s * w * .45; g.fillStyle = '#a0a0a0'; g.beginPath(); g.ellipse(u * w, (1 - v) * h, r * 1.4, r, 0, 0, 7); g.fill(); }
  }, false);
  return { map, bump };
}

// crumb on the cut face: planar UVs, outer edge at the texture edge
function crumbMaps() {
  seed = 41;
  const inner = (R - T) / (R + T);
  const holes = [];
  for (let i = 0; i < 1500; i++) { const a = rnd(0, 6.283), rr = inner + .03 + Math.sqrt(rnd()) * (1 - inner - .06); holes.push([a, rr, rnd(1.5, 7), rnd()]); }
  const draw = (bumpMode) => (g, w) => {
    const c = w / 2, ro = c, ri = c * inner;
    g.fillStyle = bumpMode ? '#808080' : '#8a5426'; g.fillRect(0, 0, w, w);
    // crumb body, slightly darker towards the crust
    const gr = g.createRadialGradient(c, c, ri, c, c, ro);
    if (bumpMode) { gr.addColorStop(0, '#999'); gr.addColorStop(.5, '#9a9a9a'); gr.addColorStop(1, '#999'); }
    else { gr.addColorStop(0, '#e8d3a8'); gr.addColorStop(.12, '#f5e7c8'); gr.addColorStop(.5, '#f8ecd2'); gr.addColorStop(.88, '#f2e1bd'); gr.addColorStop(1, '#e2c58f'); }
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, ro - 7, 0, 7); g.arc(c, c, ri + 7, 0, 7, true); g.fill('evenodd');
    // air holes, stretched along the ring
    for (const [a, rr, s, k] of holes) { const x = c + Math.cos(a) * rr * c, y = c + Math.sin(a) * rr * c;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.fillStyle = bumpMode ? `rgba(40,40,40,${.5 + k * .4})` : `rgba(196,164,112,${.45 + k * .35})`; g.beginPath(); g.ellipse(0, 0, s * 1.8, s, 0, 0, 7); g.fill();
      if (!bumpMode) { g.fillStyle = 'rgba(255,250,236,.5)'; g.beginPath(); g.ellipse(-s * .5, -s * .3, s * .8, s * .35, 0, 0, 7); g.fill(); }
      g.restore(); }
    // thin crust lines at the outer and inner edge
    g.lineWidth = 10; g.strokeStyle = bumpMode ? '#c0c0c0' : '#a8642a'; g.beginPath(); g.arc(c, c, ro - 4, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, ri + 4, 0, 7); g.stroke();
    if (!bumpMode) { g.lineWidth = 5; g.strokeStyle = 'rgba(214,160,92,.8)'; g.beginPath(); g.arc(c, c, ro - 11, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, ri + 11, 0, 7); g.stroke(); }
  };
  return { map: canvasTex(1024, 1024, draw(false), true, false), bump: canvasTex(512, 512, (g, w) => draw(true)(g, w), false, false) };
}

function tomatoTex() {
  seed = 53;
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#b8160f'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#d93a26'; g.beginPath(); g.arc(c, c, c - 14, 0, 7); g.fill();
    const n = 5;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + .3; g.save(); g.translate(c + Math.cos(a) * c * .5, c + Math.sin(a) * c * .5); g.rotate(a);
      g.fillStyle = '#f0783f'; g.beginPath(); g.ellipse(0, 0, c * .3, c * .2, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,170,90,.55)'; g.beginPath(); g.ellipse(0, 0, c * .24, c * .14, 0, 0, 7); g.fill();
      for (let k = 0; k < 9; k++) { g.fillStyle = '#f6d58a'; g.beginPath(); g.ellipse(rnd(-c * .17, c * .17), rnd(-c * .08, c * .08), 7, 4, rnd(0, 3), 0, 7); g.fill(); }
      g.restore(); }
    g.fillStyle = '#e04a2e'; g.beginPath(); g.arc(c, c, c * .16, 0, 7); g.fill();
  }, true, false);
}

function eggTex() {
  seed = 61;
  return canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#f3c53e'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 160; i++) { const x = rnd(0, w), y = rnd(0, w), r = rnd(14, 60); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < .6 ? 'rgba(252,230,150,.55)' : 'rgba(214,150,40,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  }, true, false);
}

// ---------------- mount ----------------
export async function mountBagel(canvas, o = {}) {
  const S = o.state;
  const A0 = o.assets || 'assets/';
  const RM = !!o.reduced;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const CAM = 7, EL = .42;
  camera.position.set(0, CAM * Math.sin(EL), CAM * Math.cos(EL)); camera.lookAt(0, .1, 0);

  const env = await new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', res, undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .75; scene.environmentRotation.set(0, -.8, 0); }

  // soft key (casts the shadow), cool rim from behind, warm low fill
  const key = new THREE.DirectionalLight(0xfff1de, 2.3);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 20 });
  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.5);
  const fill = new THREE.PointLight(0xffc28a, 1.6, 12, 1.6);
  scene.add(key, key.target, rim, rim.target, fill, new THREE.HemisphereLight(0xfff6e8, 0x8a6a48, .45));

  // ---- materials ----
  const cT = crustMaps(1), cB = crustMaps(-1), crumb = crumbMaps();
  const crustTop = new THREE.MeshPhysicalMaterial({ map: cT.map, bumpMap: cT.bump, bumpScale: 1.4, roughness: .48, clearcoat: .36, clearcoatRoughness: .45, sheen: .45, sheenRoughness: .6, sheenColor: new THREE.Color(0xffd9a0) });
  const crustBot = new THREE.MeshPhysicalMaterial({ map: cB.map, bumpMap: cB.bump, bumpScale: 2, roughness: .78, sheen: .3, sheenColor: new THREE.Color(0xffe2b8) });
  const crumbMat = new THREE.MeshPhysicalMaterial({ map: crumb.map, bumpMap: crumb.bump, bumpScale: 3, roughness: .92, sheen: .7, sheenRoughness: .8, sheenColor: new THREE.Color(0xfff4dc) });

  // ---- the halves: crust shell + crumb face, meeting at y = 0 ----
  const root = new THREE.Group(), spinner = new THREE.Group(), top = new THREE.Group(), bottom = new THREE.Group(), stack = new THREE.Group();
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const faceGeo = new THREE.RingGeometry(R - T, R + T, 160, 4); faceGeo.rotateX(-Math.PI / 2);
  { const p = faceGeo.attributes.position, uv = faceGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * (R + T)) + .5, -p.getZ(i) / (2 * (R + T)) + .5); }
  bottom.add(shadowy(new THREE.Mesh(halfGeometry(-1), crustBot)));
  const faceB = shadowy(new THREE.Mesh(faceGeo, crumbMat)); faceB.position.y = .001; bottom.add(faceB);
  top.add(shadowy(new THREE.Mesh(halfGeometry(1), crustTop)));
  const faceT = shadowy(new THREE.Mesh(faceGeo, crumbMat)); faceT.rotation.x = Math.PI; faceT.position.y = -.001; top.add(faceT);
  spinner.add(bottom, stack, top); root.add(spinner); scene.add(root);

  // ---- fillings ----
  const wob = (geo, amt, freq) => { const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const k = 1 + (Math.sin(a * freq) * .5 + Math.sin(a * freq * 2.3 + 1.7) * .5) * amt; if (r > .01) { p.setX(i, x * k); p.setZ(i, z * k); } }
    geo.computeVertexNormals(); return geo; };
  const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  // cream cheese: profile runs outer edge → up → across the top → down the hole (this order faces the normals out)
  const schmearGeo = lathe([[1.44, 0], [1.48, .07], [1.44, .15], [1.32, .2], [.62, .19], [.54, .14], [.5, .06], [.56, 0]], 160);
  { const p = schmearGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (y > .04) { const lump = (Math.sin(a * 5 + r * 6) * .5 + .5) * (Math.sin(a * 3 - r * 9 + 1.3) * .5 + .5); const knife = Math.sin(r * 26 + a * 2.5) * .013 + vnoise(x * 6, y * 6, z * 6) * .012; p.setY(i, y + lump * .085 + knife); } }
    schmearGeo.computeVertexNormals(); }
  const schmear = shadowy(new THREE.Mesh(wob(schmearGeo, .028, 5), new THREE.MeshPhysicalMaterial({ color: 0xfbf8f1, roughness: .36, clearcoat: .35, clearcoatRoughness: .3, sheen: .6, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .5 })));
  const egg = shadowy(new THREE.Mesh(wob(lathe([[0, 0], [1.22, 0], [1.3, .08], [1.2, .17], [0, .17]]), .05, 5),
    new THREE.MeshPhysicalMaterial({ map: eggTex(), roughness: .6, sheen: .35, sheenColor: new THREE.Color(0xfff2c0) })));
  const cheeseGeo = new THREE.BoxGeometry(2.1, .045, 2.1, 30, 1, 30);
  { const p = cheeseGeo.attributes.position; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)); if (d > 1) p.setY(i, p.getY(i) - (d - 1) * (d - 1) * .55); } cheeseGeo.computeVertexNormals(); }
  const cheese = shadowy(new THREE.Mesh(cheeseGeo, new THREE.MeshPhysicalMaterial({ color: 0xf29418, roughness: .32, clearcoat: .5, clearcoatRoughness: .25, sheen: .3, sheenColor: new THREE.Color(0xffd080) })));
  cheese.rotation.y = Math.PI / 4;
  const tomato = new THREE.Group();
  { const tt = tomatoTex(), skin = new THREE.MeshPhysicalMaterial({ color: 0xb8160f, roughness: .25, clearcoat: .8, clearcoatRoughness: .15 }), face = new THREE.MeshPhysicalMaterial({ map: tt, roughness: .22, clearcoat: .9, clearcoatRoughness: .1 });
    [[-.48, .2, .3], [.5, -.12, 1.4], [.02, .62, 2.2]].forEach(([x, z, r]) => { const t = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .09, 48), [skin, face, face])); t.position.set(x, 0, z); t.rotation.y = r; tomato.add(t); }); }
  const LAYERS = [[schmear, 0, 'schmear'], [egg, .2, 'egg'], [cheese, .38, 'cheese'], [tomato, .43, 'tomato']];
  LAYERS.forEach(([m, y]) => { m.position.y = y; m.visible = false; stack.add(m); });
  const STACK_TOP = .52;

  // ---- seeds: instances placed on the real top surface ----
  const g1 = new THREE.SphereGeometry(1, 12, 8);
  { const p = g1.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setX(i, p.getX(i) * (1 - .35 * Math.max(0, z))); } g1.computeVertexNormals(); } // teardrop sesame
  const SEEDS = {
    sesame: { geo: g1, mat: new THREE.MeshPhysicalMaterial({ roughness: .45, sheen: .5, sheenColor: new THREE.Color(0xfff4d8), clearcoat: .2 }), s: [.024, .009, .038] },
    poppy: { geo: new THREE.SphereGeometry(1, 8, 6), mat: new THREE.MeshPhysicalMaterial({ roughness: .5, clearcoat: .3 }), s: [.012, .01, .012] },
    flake: { geo: new THREE.CylinderGeometry(1, 1, 1, 5), mat: new THREE.MeshPhysicalMaterial({ roughness: .55, sheen: .4, sheenColor: new THREE.Color(0xffe0a0) }), s: [.03, .006, .02] },
    salt: { geo: new THREE.IcosahedronGeometry(1, 0), mat: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .12, clearcoat: 1, transmission: 0 }), s: [.013, .011, .013] }
  };
  const MIX = {
    plain: [],
    sesame: [['sesame', 720, [0xf1dfb2, 0xe8cf98, 0xf6e8c4]]],
    poppy: [['poppy', 1500, [0x262a35, 0x30343f, 0x3a3e4a]]],
    everything: [['sesame', 300, [0xf1dfb2, 0xe8cf98, 0x2c2a2a]], ['poppy', 560, [0x262a35, 0x30343f]], ['flake', 110, [0xa9702f, 0x8f5a22, 0xc08a44]], ['flake', 70, [0xf2e6c6, 0xe8d8b0]], ['salt', 80, [0xffffff, 0xf4f4f0]]]
  };
  let seedMeshes = [], drops = null, dropT = 0;
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), N = new THREE.Vector3(), Q = new THREE.Quaternion(), Qt = new THREE.Quaternion(), col = new THREE.Color();
  function setSeeds(kind, animate = !RM) {
    seedMeshes.forEach(m => { top.remove(m); m.dispose(); }); seedMeshes = []; drops = null;
    seed = 97;
    const all = [];
    for (const [type, count, cols] of (MIX[kind] || [])) {
      const D = SEEDS[type], mesh = new THREE.InstancedMesh(D.geo, D.mat, count); mesh.castShadow = true;
      const rec = [];
      for (let i = 0; i < count; i++) {
        let a, th, tries = 0;
        do { a = rnd(0, Math.PI * 2); th = rnd(.32, Math.PI - .38); tries++; } while (rnd() > (R + T * Math.cos(th)) / (R + T) * (.55 + .45 * Math.sin(th)) && tries < 20);
        surf(a, th, 1, P);
        N.set(Math.sin(a) * Math.cos(th), Math.sin(th) / FT, Math.cos(a) * Math.cos(th)).normalize();   // ellipse normal of the cross-section
        const j = rnd(.75, 1.2), sc = [D.s[0] * j, D.s[1] * j, D.s[2] * j];
        const pos = P.clone().addScaledVector(N, sc[1] * .5);
        Q.setFromUnitVectors(up, N); Qt.setFromAxisAngle(up, rnd(0, Math.PI * 2)); Q.multiply(Qt);
        rec.push({ pos, q: Q.clone(), s: sc, delay: rnd(0, .75), h: rnd(1.1, 1.8), spin: rnd(-6, 6) });
        mesh.setColorAt(i, col.setHex(cols[(rnd() * cols.length) | 0]).multiplyScalar(rnd(.88, 1.06)));
      }
      top.add(mesh); seedMeshes.push(mesh); all.push([mesh, rec]);
    }
    drops = all; dropT = animate ? 0 : 9; placeSeeds(); wake();
  }
  // drop → bounce → settle, per seed
  function placeSeeds() {
    if (!drops) return;
    for (const [mesh, rec] of drops) {
      for (let i = 0; i < rec.length; i++) { const r = rec[i], t = dropT - r.delay; let y = 0, s = 1, tw = 0;
        if (t < 0) { s = 0; } else if (t < .45) { const k = t / .45; y = r.h * (1 - k * k); s = Math.min(1, .3 + k * 2); tw = (1 - k) * r.spin; }
        else if (t < .75) { const k = (t - .45) / .3; y = Math.sin(k * Math.PI) * .05 * (1 - k * .5); }
        dummy.position.copy(r.pos); dummy.position.y += y; dummy.quaternion.copy(r.q);
        if (tw) dummy.quaternion.multiply(Qt.setFromAxisAngle(up, tw));
        dummy.scale.set(r.s[0] * s, r.s[1] * s, r.s[2] * s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- shadow catcher (transparent, so the page shows through) + a soft contact shadow ----
  const ground = new THREE.Group(); scene.add(ground);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: 0x1b2a4a, opacity: .2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; ground.add(floor);
  const blob = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    gr.addColorStop(0, 'rgba(27,42,74,.5)'); gr.addColorStop(.6, 'rgba(27,42,74,.18)'); gr.addColorStop(1, 'rgba(27,42,74,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); })();
  blob.rotation.x = -Math.PI / 2; blob.position.y = .004; ground.add(blob);
  const BOTTOM = T * FB + .02;

  // ---- layout ----
  let baseX = 0, baseY = 0, baseS = 1;
  const size = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    const halfW = Math.tan(THREE.MathUtils.degToRad(15)) * CAM * camera.aspect;
    if (camera.aspect >= 1) { baseS = Math.min(1.05, halfW * .27); baseX = halfW * .46; baseY = -.15; }
    else { baseS = Math.min(.62, halfW * .44); baseX = 0; baseY = 1.08; }
    wake();
  };
  addEventListener('resize', size);

  // ---- drag to spin (fine pointers only, so touch scrolling stays normal) ----
  let rotY = -.5, rotX = 0, velY = 0, dragging = false, lx = 0, ly = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(R + T, R + T, 1.2, 24), new THREE.MeshBasicMaterial({ visible: false })); root.add(proxy);
  const overBagel = e => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.intersectObject(proxy).length > 0; };
  if (FINE) {
    addEventListener('pointerdown', e => { if (!S.visible || e.button > 0 || e.target.closest('a, button, input, textarea')) return; if (overBagel(e)) { dragging = true; lx = e.clientX; ly = e.clientY; document.body.style.cursor = 'grabbing'; wake(); } });
    addEventListener('pointermove', e => {
      if (dragging) { velY = (e.clientX - lx) * .012; rotY += velY; rotX = clamp(rotX + (e.clientY - ly) * .006, -.5, .6); lx = e.clientX; ly = e.clientY; }
      else document.body.style.cursor = S.visible && !e.target.closest('a, button') && overBagel(e) ? 'grab' : '';
    });
    addEventListener('pointerup', () => { if (dragging) { dragging = false; document.body.style.cursor = ''; } });
  }

  // ---- intro: drop in → squash → settle, then the seeds rain on ----
  const seq = sequencer(); let introY = RM ? 0 : 3, squash = 0;
  const intro = () => {
    if (RM) { introY = 0; setSeeds(o.seeds || 'everything', false); return; }
    seq.play([
      { d: .6, run: k => { introY = 3 * (1 - k * k); } },
      { d: .16, run: k => { introY = 0; squash = Math.sin(k * Math.PI * .5); } },
      { d: .55, run: k => { squash = Math.cos(k * Math.PI * 2.5) * (1 - k) * (1 - k); } , end: () => { squash = 0; } },
      { d: 0, run: () => setSeeds(o.seeds || 'everything') }
    ]); wake();
  };

  let t = 0, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = Math.min((now - last) / 1000, .1); last = now;
    if (!S.visible || document.hidden) return;
    if (!RM) t += dt;
    seq.tick(dt);
    if (drops && dropT < 2) { dropT += dt; placeSeeds(); }
    if (!dragging) { velY *= .95; rotY += velY + (RM ? 0 : dt * .25); rotX *= .96; }
    const gx = baseX + S.x, gy = baseY + S.y;
    const drop = camera.aspect < 1 ? S.split * (1 - S.close) * .55 : 0;   // on tall screens, lower the stack so the lifted top stays in frame
    root.position.set(gx, gy - drop + introY + S.hop * .25 + Math.sin(t * 1.4) * .03, 0);
    root.scale.set(baseS * (1 + squash * .06), baseS * (1 - squash * .12), baseS * (1 + squash * .06));
    spinner.rotation.y = rotY + S.spin;
    spinner.rotation.x = rotX * .5 + .1;
    // slicing + stacking
    const lift = S.split * (1 - S.close);
    top.position.y = lift * 1.0 + S.close * STACK_TOP;
    top.rotation.x = -S.tilt * (1 - S.close) * .55;
    top.position.z = S.tilt * (1 - S.close) * .35;
    bottom.position.y = -S.split * .15 * (1 - S.close);
    stack.position.y = bottom.position.y;
    LAYERS.forEach(([m, y, k]) => { const v = S[k]; m.visible = v > .001; m.position.y = y + (1 - v) * 2.6; m.scale.set(1, .6 + .4 * Math.min(1, v * 1.2), 1); });
    // ground stays put under the bagel; the contact shadow fades as it lifts away
    ground.position.set(gx, gy - drop - BOTTOM * baseS - .02 - S.split * .15 * baseS, 0); ground.scale.setScalar(baseS);
    const air = Math.max(0, introY + S.hop * .25);
    blob.material.opacity = clamp(1 - air * .6) * .9; blob.scale.setScalar(1 + air * .25);
    key.position.set(gx - 2.4, gy + 6, 3.4); key.target.position.set(gx, gy, 0);
    rim.position.set(gx + 3, gy + 2.5, -4); rim.target.position.set(gx, gy, 0);
    fill.position.set(gx - 3, gy + .4, 2.6);
    renderer.render(scene, camera);
    start();
  };
  function start() { if (!raf && S.visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function wake() { start(); }
  document.addEventListener('visibilitychange', start);

  size();
  renderer.compile(scene, camera);
  start();
  return { seeds: k => setSeeds(k), intro, wake, renderer, get dropping() { return !!drops && dropT < 2; }, get settled() { return !!drops && dropT >= 2 && !seq.busy; } };
}
