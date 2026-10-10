/* =====================================================================
   Fire & Feast: "Feed the table". Their Mediterranean combo tray, built
   in real 3D and laid out for 3, 5, 7 or 10 people.
   Hammered silver tray → a bed of yellow rice spreads → beef + chicken
   kabob, chicken tikka, cream chop drop in rows → beef + chicken shawarma
   rain onto the front edge → stews, turshi and pita set down around it.
   api.build(size) re-lays the tray for a new head count.
   Bundle: kit/build3d/build.sh fireandfeastcommerce/src/platter.js fireandfeastcommerce/assets/platter.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// how each head count fills the tray (tray half-width A, half-depth B)
export const SIZES = {
  3: { A: .74, B: .62, beef: 1, chicken: 1, tikka: 1, chop: 1, shawarma: 150, bowls: 2 },
  5: { A: .98, B: .68, beef: 2, chicken: 1, tikka: 1, chop: 1, shawarma: 230, bowls: 2 },
  7: { A: 1.18, B: .74, beef: 2, chicken: 2, tikka: 1, chop: 2, shawarma: 300, bowls: 3 },
  10: { A: 1.42, B: .8, beef: 3, chicken: 2, tikka: 2, chop: 2, shawarma: 400, bowls: 3 }
};

function tex(w, h, draw, srgb = true, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }

export async function mountPlatter(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 60), world = new THREE.Group(); scene.add(world);
  const env = await new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 1.4, 0); scene.environmentIntensity = .8; }

  // warm key like a pass light, a fire-orange glow from below-left, cool rim
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(1.5, 5, 2.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -.0004; key.shadow.normalBias = .015;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12 });
  const fire = new THREE.PointLight(0xff6a1f, 4, 6, 1.6); fire.position.set(-2.2, .6, 1.2);
  const rim = new THREE.DirectionalLight(0xbfd6ff, .7); rim.position.set(-3, 2, -3);
  scene.add(key, fire, rim, new THREE.HemisphereLight(0xfff3e4, 0x20140c, .45));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .45, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- materials ----
  const hammer = tex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 9, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#b0b0b0'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }, false, [3, 3]);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd8dce0, metalness: 1, roughness: .28, bumpMap: hammer, bumpScale: 1.2, clearcoat: .3 });
  const riceT = tex(512, 512, (g, w, h) => { g.fillStyle = '#e09f1f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5200; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI; const c = Math.random(); g.fillStyle = c < .12 ? '#fff3c9' : c < .22 ? '#d4801c' : c < .3 ? '#f7d36a' : `rgba(${235 + Math.random() * 20 | 0},${170 + Math.random() * 40 | 0},${40 + Math.random() * 30 | 0},.9)`; g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 4.5, 1.6, 0, 0, 7); g.fill(); g.restore(); } }, true, [6, 6]);
  const riceB = tex(256, 256, (g, w, h) => { g.fillStyle = '#777'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = Math.random() < .5 ? '#bbb' : '#444'; g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3); g.fillRect(-2, -.7, 4, 1.4); g.restore(); } }, false, [12, 12]);
  const rice = new THREE.MeshPhysicalMaterial({ map: riceT, bumpMap: riceB, bumpScale: 3.2, roughness: .55, sheen: .4, sheenColor: new THREE.Color(0xffe2a0) });
  const charT = (base, dark, lines = 5) => tex(128, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < .55 ? '40,18,8' : '255,215,160'},${Math.random() * .3})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .6 + Math.random() * 1.8, 0, 7); g.fill(); } g.fillStyle = dark; g.filter = 'blur(3px)'; for (let i = 0; i < lines; i++) { const y = (i + .5) * h / lines + (Math.random() - .5) * 14; g.globalAlpha = .38 + Math.random() * .2; g.beginPath(); g.ellipse(w * (.2 + Math.random() * .3), y, w * (.25 + Math.random() * .2), 3 + Math.random() * 4, 0, 0, 7); g.fill(); } g.filter = 'none'; g.globalAlpha = 1; });
  const beefMat = new THREE.MeshPhysicalMaterial({ map: charT('#56301a', '#140803', 3), roughness: .55, clearcoat: .35, clearcoatRoughness: .4 });
  const chickMat = new THREE.MeshPhysicalMaterial({ map: charT('#b9742f', '#3e1b08', 3), roughness: .5, clearcoat: .35, clearcoatRoughness: .4 });
  const tikkaMat = new THREE.MeshPhysicalMaterial({ map: charT('#b9481a', '#2e0f04', 3), roughness: .5, clearcoat: .4, clearcoatRoughness: .4 });
  const tikkaMat2 = new THREE.MeshPhysicalMaterial({ map: charT('#a33a14', '#220a02', 4), roughness: .55, clearcoat: .3, clearcoatRoughness: .4 });
  const crumbB = tex(256, 256, (g, w, h) => { g.fillStyle = '#777'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .8 + Math.random() * 2.2, 0, 7); g.fill(); } }, false, [2, 2]);
  const chopMat = new THREE.MeshPhysicalMaterial({ color: 0xb8692a, bumpMap: crumbB, bumpScale: 2.5, roughness: .7, sheen: .4, sheenColor: new THREE.Color(0xffc070) });
  const sauceMat = new THREE.MeshPhysicalMaterial({ color: 0xd9561e, roughness: .25, clearcoat: 1 });
  const shawB = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .5, clearcoat: .45, clearcoatRoughness: .35, side: THREE.DoubleSide, map: charT('#8a4a22', '#3a1a08', 2) });
  const shawC = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .45, clearcoat: .45, clearcoatRoughness: .35, side: THREE.DoubleSide, map: charT('#c8893c', '#7a3d12', 3) });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfaf6ef, roughness: .18, clearcoat: 1, clearcoatRoughness: .06 });
  const stewRed = new THREE.MeshPhysicalMaterial({ color: 0xc8461c, roughness: .2, clearcoat: 1, clearcoatRoughness: .05 });
  const stewOrange = new THREE.MeshPhysicalMaterial({ color: 0xd8742a, roughness: .22, clearcoat: 1, clearcoatRoughness: .05 });
  const pitaT = tex(256, 256, (g, w, h) => { g.fillStyle = '#ecd2a0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 16, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,90,30,.55)'); gr.addColorStop(1, 'rgba(150,90,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
  const pitaMat = new THREE.MeshPhysicalMaterial({ map: pitaT, roughness: .8, sheen: .5, sheenColor: new THREE.Color(0xfff0d0) });

  // ---- tray (lathe, stretched to an oval per size) ----
  const tp = [[0, 0], [.86, 0], [.92, .02], [.97, .07], [1.02, .1], [1.04, .095], [1.0, .06], [.9, .025], [0, .025]].map(p => new THREE.Vector2(p[0], p[1]));
  const tray = sh(new THREE.Mesh(new THREE.LatheGeometry(tp, 96), silver)); world.add(tray);
  const trayS = { A: .74, B: .62 };
  // rice bed: a displaced dome inside the rim
  const riceGeo = new THREE.SphereGeometry(1, 96, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  { const p = riceGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = Math.sin(x * 9) * Math.cos(z * 8) * .5 + Math.sin(x * 23 + z * 17) * .5; p.setY(i, y * (1 + n * .12) + n * .01); } riceGeo.computeVertexNormals(); }
  const riceBed = sh(new THREE.Mesh(riceGeo, rice)); world.add(riceBed);

  // ---- builders for each item ----
  function kofta(mat, len) {
    const prof = [], R = .056;
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), -len / 2 + Math.sin(a) * R)); }
    for (let i = 1; i < 30; i++) prof.push(new THREE.Vector2(R * (1 + .1 * Math.sin(i * 2.3) + .05 * Math.sin(i * 5.1)), -len / 2 + len * i / 30));
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), len / 2 + Math.sin(a) * R)); }
    const m = sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mat)); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, .85);
    return m;
  }
  function tikkaRow(len) {
    const g = new THREE.Group(), n = Math.max(3, Math.round(len / .1));
    for (let i = 0; i < n; i++) { const s = .07 + rnd(0, .025); const c = sh(new THREE.Mesh(new RoundedBoxGeometry(s * rnd(.85, 1.2), s * rnd(.6, .85), s * rnd(.8, 1.15), 2, .02), i % 3 ? tikkaMat : tikkaMat2)); c.position.set(rnd(-.03, .03), s * .4, -len / 2 + (i + .5) * len / n); c.rotation.set(rnd(-.3, .3), rnd(0, 3), rnd(-.3, .3)); g.add(c); }
    return g;
  }
  function chopRow(len) {
    const g = new THREE.Group(), n = Math.max(2, Math.round(len / .2));
    for (let i = 0; i < n; i++) { const c = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12), chopMat)); c.scale.set(.15, .032, .095); c.position.set(rnd(-.02, .02), .025 + i * .006, -len / 2 + (i + .5) * len / n); c.rotation.set(-.15, rnd(-.35, .35), rnd(-.05, .05)); g.add(c); if (i % 2) continue;
      const d = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-1, 1, -1, 1].map((s, k) => new THREE.Vector3(s * .06, .058 + i * .004, -len / 2 + (i + .5) * len / n - .07 + k * .045))), 40, .005, 6), sauceMat); g.add(d); }
    return g;
  }
  function shawarma(n, mat, area) { // instanced curled strips
    const geo = new THREE.CylinderGeometry(.034, .034, .038, 10, 1, true, 0, 2.1);
    const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true;
    const homes = [];
    for (let i = 0; i < n; i++) { const x = rnd(area.x0, area.x1), z = rnd(area.z0, area.z1), mid = 1 - Math.abs((z - (area.z0 + area.z1) / 2) / ((area.z1 - area.z0) / 2)), y = .01 + rnd(0, .05) + mid * .09; homes.push({ p: new THREE.Vector3(x, y, z), r: new THREE.Euler(rnd(-1.2, 1.2), rnd(0, 6.28), rnd(-1.2, 1.2)), s: rnd(.65, 1.25), d: rnd(0, .5) }); }
    im.userData.homes = homes; return im;
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  function placeShawarma(im, t) {
    im.userData.homes.forEach((h, i) => { const k = clamp((t - h.d * .5) / .5); P.copy(h.p); P.y += (1 - bounce(k)) * .8; Q.setFromEuler(h.r); S1.setScalar(k > 0 ? h.s : .0001); M.compose(P, Q, S1); im.setMatrixAt(i, M); });
    im.instanceMatrix.needsUpdate = true;
  }
  function bowl(fill) {
    const g = new THREE.Group();
    const bp = [[0, 0], [.07, 0], [.075, .006], [.12, .05], [.15, .11], [.156, .118], [.15, .12], [.142, .112], [.11, .05], [.065, .018], [0, .018]].map(p => new THREE.Vector2(p[0], p[1]));
    g.add(sh(new THREE.Mesh(new THREE.LatheGeometry(bp, 48), porcelain)));
    if (fill === 'turshi') { const cols = [0xf2c94c, 0xe85d75, 0x8cbf4a, 0xffe3a3]; for (let i = 0; i < 9; i++) { const c = sh(new THREE.Mesh(new RoundedBoxGeometry(.05, .03, .04, 2, .01), new THREE.MeshPhysicalMaterial({ color: cols[i % 4], roughness: .25, clearcoat: .8 }))); c.position.set(rnd(-.07, .07), .085 + rnd(0, .02), rnd(-.07, .07)); c.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(c); } }
    else { const s = new THREE.Mesh(new THREE.CircleGeometry(.138, 40), fill === 'bean' ? stewRed : stewOrange); s.rotation.x = -Math.PI / 2; s.position.y = .1; g.add(s);
      const bits = fill === 'bean' ? 0xf3ead8 : 0xf0c26a; for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(fill === 'bean' ? new THREE.SphereGeometry(.016, 10, 8) : new RoundedBoxGeometry(.035, .025, .035, 1, .008), new THREE.MeshPhysicalMaterial({ color: bits, roughness: .35, clearcoat: .6 })); b.scale.y = .7; b.position.set(rnd(-.09, .09), .102, rnd(-.09, .09)); g.add(b); } }
    return g;
  }
  function pitaStack() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .012, 40, 1), pitaMat)); p.scale.z = .8; p.position.set(rnd(-.02, .02), .006 + i * .013, rnd(-.02, .02)); p.rotation.y = rnd(0, 3); g.add(p); }
    // one folded half on top
    const half = sh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .012, 40, 1, false, 0, Math.PI), pitaMat)); half.rotation.set(.6, 0, 0); half.position.set(0, .08, .02); g.add(half);
    return g;
  }

  // ---- layout + sequencer ----
  let items = [], current = 0;
  const live = new THREE.Group(); world.add(live);
  const st = { tray: 1, rice: 0 };
  function layout(size) {
    seed = 11 + size;
    const C = SIZES[size], A = C.A, B = C.B, len = B * 1.45;
    const cols = [];
    for (let i = 0; i < C.chop; i++) cols.push(['chop', chopRow(len * .9)]);
    for (let i = 0; i < C.tikka; i++) cols.push(['tikka', tikkaRow(len)]);
    const koftaRow = mat => { const g = new THREE.Group(), n = Math.max(2, Math.floor(len / .46)); for (let k = 0; k < n; k++) { const m = kofta(mat, .4); m.position.set(rnd(-.015, .015), .02, -len / 2 + (k + .5) * len / n); m.rotation.z = rnd(-.06, .06); g.add(m); } return g; };
    for (let i = 0; i < C.beef; i++) cols.push(['beef', koftaRow(beefMat)]);
    for (let i = 0; i < C.chicken; i++) cols.push(['chicken', koftaRow(chickMat)]);
    const x0 = -A * .78, x1 = A * .62, span = x1 - x0;
    const out = [];
    cols.forEach(([kind, g], i) => { const x = x0 + span * (cols.length === 1 ? .5 : i / (cols.length - 1)); g.userData.home = new THREE.Vector3(x, .15, -B * .12); g.userData.kind = kind; g.userData.delay = i * .09; out.push(g); });
    const sb = shawarma(Math.round(C.shawarma * .55), shawB, { x0: -A * .74, x1: A * .05, z0: B * .4, z1: B * .7 });
    const sc = shawarma(Math.round(C.shawarma * .45), shawC, { x0: A * .05, x1: A * .74, z0: B * .4, z1: B * .7 });
    sb.position.y = sc.position.y = .07; sb.userData.shaw = sc.userData.shaw = true;
    out.push(sb, sc);
    // bowls + pita around the back of the tray
    const sides = [];
    const fills = ['curry', 'bean', 'curry'].slice(0, C.bowls);
    fills.forEach((f, i) => { const b = bowl(f); b.userData.home = new THREE.Vector3(-A * .55 + i * A * .55, 0, -B - .3); b.userData.side = true; b.userData.delay = .1 + i * .08; sides.push(b); });
    const tu = bowl('turshi'); tu.scale.setScalar(.8); tu.userData.home = new THREE.Vector3(A * .98, 0, -B * .8 - .12); tu.userData.side = true; tu.userData.delay = .35; sides.push(tu);
    const pi = pitaStack(); pi.userData.home = new THREE.Vector3(-A - .3, 0, -B * .2); pi.userData.side = true; pi.userData.delay = .42; sides.push(pi);
    return { A, B, parts: out, sides };
  }
  function placeAll(L, t) {
    // t: 0 → 1 across the whole lay-out
    const tr = clamp(t / .25), rc = clamp((t - .15) / .2), it = clamp((t - .3) / .45), sw = clamp((t - .55) / .35), sd = clamp((t - .6) / .4);
    const A = trayS.A + (L.A - trayS.A) * ease(tr), B = trayS.B + (L.B - trayS.B) * ease(tr);
    tray.scale.set(A, 1, B);
    riceBed.scale.set(A * .86 * ease(rc), .14 * ease(rc) + .001, B * .84 * ease(rc)); riceBed.position.y = .02;
    riceBed.visible = rc > 0;
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
    if (k >= 1) { [...leaving.parts, ...leaving.sides].forEach(g => { live.remove(g); g.traverse(m => m.geometry && m.geometry.dispose()); }); leaving = null; }
  }

  // steam over the stews + rice
  const steamT = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
  const steam = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamT, transparent: true, depthWrite: false, opacity: 0 })); s.userData.ph = i / 10; world.add(s); return s; });

  // ---- camera ----
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const target = new THREE.Vector3(0, .1, -.1);
  const placeCam = () => {
    const span = Math.max(tray.scale.x + 1.1, (tray.scale.z + .55) * 1.4);
    D += ((SMALL ? 2.35 : 2.05) * span * (o.zoom || 1) + 1.1 - D) * .06;
    const E = .78 + el, Az = (o.angle ?? .35) + az;
    camera.position.set(target.x + Math.sin(Az) * Math.cos(E) * D, target.y + Math.sin(E) * D, target.z + Math.cos(Az) * Math.cos(E) * D); camera.lookAt(target);
  };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .5; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.14; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 40 : 30; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (L && buildT < 1) { buildT = clamp(buildT + dt / 2.4); placeAll(L, buildT); }
    clearLeaving(dt);
    fire.intensity = 3.4 + Math.sin(t0 * 9) * .4 + Math.sin(t0 * 23) * .25;
    const sides = L ? L.sides.filter(g => g.visible && g.children.length > 2) : [];
    steam.forEach((s, i) => { const ph = (t0 * .18 + s.userData.ph) % 1, b = sides[i % Math.max(1, sides.length)]; if (!b || buildT < .95) { s.material.opacity = 0; return; } s.position.set(b.position.x + Math.sin(ph * 7 + i) * .05, .15 + ph * .6, b.position.z + Math.cos(ph * 5 + i) * .04); const k = .12 + ph * .28; s.scale.set(k, k, 1); s.material.opacity = Math.sin(ph * Math.PI) * .22; });
    az += (taz + (RM ? 0 : Math.sin(t0 * .2) * .06) - az) * .05; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  build(o.size || 5);
  placeCam(); renderer.compile(scene, camera); start();
  return { build, get size() { return current; }, renderer };
}
