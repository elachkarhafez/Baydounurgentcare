/* =====================================================================
   Batter Up Chicken Co.: "Brined, battered & seasoned to order", in 3D.
   One hot chicken tender over Texas toast in a black clamshell:
     batter → the coat puffs up and crags (vertex displacement + crumb bump)
     fry    → pale to deep golden, oil bubbles rise, then steam
     season → Cajun/hot spice dusts on, flakes settle, the colour warms
     sauce  → a drizzle draws itself across, pickle chips drop on
   Hero: play() runs the whole order. "Your turn": set({ batter, fry, season, sauce }).
   Bundle: kit/build3d/build.sh batterupchickenco/src/tender.js batterupchickenco/assets/tender.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };

// cheap 3D value noise for the breading
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z) => vnoise(x, y, z) * .55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * .28 + vnoise(x * 4.3, y * 4.3, z * 4.3) * .17;

const C = { raw: new THREE.Color('#e3a593'), batter: new THREE.Color('#ead7ac'), fried: new THREE.Color('#94500f'), hot: new THREE.Color('#8a1e04') };
const ridged = (x, y, z) => 1 - Math.abs(vnoise(x, y, z) * 2 - 1);

export async function mountTender(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 40);
  const world = new THREE.Group(); scene.add(world);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 2.4, 0); scene.environmentIntensity = .75; }

  // warm key, neon-pink rim and cyan fill pick up the sign colours of their logo
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(1.6, 3.6, 2.2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .5, far: 9 });
  const rimPink = new THREE.DirectionalLight(0xff4fa3, .85); rimPink.position.set(-2.5, 1.6, -2.2);
  const rimCyan = new THREE.DirectionalLight(0x37e2ff, .9); rimCyan.position.set(2.6, .9, -2);
  scene.add(key, rimPink, rimCyan, new THREE.HemisphereLight(0xfff4e6, 0x1a0f12, .4));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- clamshell tray + deli paper ----
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x121212, roughness: .45, clearcoat: .6, clearcoatRoughness: .3 });
  const tray = sh(new THREE.Mesh(new RoundedBoxGeometry(2.1, .06, 1.35, 3, .03), shell)); tray.position.y = .03; world.add(tray);
  [[0, .66, 2.1, .04], [0, -.66, 2.1, .04], [1.03, 0, .04, 1.35], [-1.03, 0, .04, 1.35]].forEach(([x, z, w, d]) => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, .2, d, 2, .015), shell)); m.position.set(x, .1, z); world.add(m); });
  const paperC = document.createElement('canvas'); paperC.width = paperC.height = 256;
  { const g = paperC.getContext('2d'); g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '150,140,125'},${Math.random() * .12})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 8, 1); } }
  const paperT = new THREE.CanvasTexture(paperC); paperT.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.15, 24, 16), new THREE.MeshStandardMaterial({ map: paperT, roughness: .7, metalness: .25, side: THREE.DoubleSide }));
  { const p = paper.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (vnoise(p.getX(i) * 6, p.getY(i) * 6, 1) - .5) * .02); paper.geometry.computeVertexNormals(); }
  paper.rotation.set(-Math.PI / 2, 0, .08); paper.position.y = .07; paper.receiveShadow = true; paper.visible = false; world.add(paper);

  // ---- Texas toast ----
  const toastC = document.createElement('canvas'); toastC.width = toastC.height = 256;
  { const g = toastC.getContext('2d'); const gr = g.createRadialGradient(128, 128, 20, 128, 128, 170); gr.addColorStop(0, '#e8b35c'); gr.addColorStop(.7, '#c98a3d'); gr.addColorStop(1, '#8f5a22'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,236,190' : '110,60,20'},${Math.random() * .25})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.2, 0, 7); g.fill(); } }
  const toastT = new THREE.CanvasTexture(toastC); toastT.colorSpace = THREE.SRGBColorSpace;
  const crumb = new THREE.MeshPhysicalMaterial({ color: 0xe9d1a0, roughness: .85, sheen: .6, sheenColor: new THREE.Color(0xffe8c0) });
  const toastTop = new THREE.MeshPhysicalMaterial({ map: toastT, roughness: .6, clearcoat: .25, clearcoatRoughness: .5 });
  const toast = sh(new THREE.Mesh(new RoundedBoxGeometry(1.42, .2, .92, 4, .07), [crumb, crumb, toastTop, crumb, crumb, crumb]));
  toast.position.set(0, .16, 0); toast.rotation.y = -.06; world.add(toast);
  const TOP = .26;

  // ---- the tender ----
  const TL = 1.12, TR = .19;
  // capsule profile sampled densely along its length so the breading can crag everywhere
  const prof = [];
  for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * i / 16; prof.push(new THREE.Vector2(Math.max(.0001, Math.cos(a) * TR), -TL / 2 + Math.sin(a) * TR)); }
  for (let i = 1; i < 72; i++) prof.push(new THREE.Vector2(TR, -TL / 2 + TL * i / 72));
  for (let i = 0; i <= 16; i++) { const a = (Math.PI / 2) * i / 16; prof.push(new THREE.Vector2(Math.max(.0001, Math.cos(a) * TR), TL / 2 + Math.sin(a) * TR)); }
  const geo = new THREE.LatheGeometry(prof, 96); geo.rotateZ(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const bumpC = document.createElement('canvas'); bumpC.width = 256; bumpC.height = 320;
  { const g = bumpC.getContext('2d'); g.fillStyle = '#777'; g.fillRect(0, 0, 256, 320); for (let i = 0; i < 3400; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 320, .6 + Math.random() * 2.6, 0, 7); g.fill(); } }
  const bumpT = new THREE.CanvasTexture(bumpC); bumpT.wrapS = bumpT.wrapT = THREE.RepeatWrapping; bumpT.repeat.set(2, 2);
  const speckC = document.createElement('canvas'); speckC.width = 512; speckC.height = 640;
  const speckT = new THREE.CanvasTexture(speckC); speckT.colorSpace = THREE.SRGBColorSpace; speckT.wrapS = speckT.wrapT = THREE.RepeatWrapping;
  const speckDots = Array.from({ length: 1400 }, () => [Math.random() * 512, Math.random() * 640, .7 + Math.random() * 2, Math.random() < .7]);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  const meat = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: C.raw.clone(), map: speckT, roughness: .5, clearcoat: .2, clearcoatRoughness: .35, sheen: .35, sheenColor: new THREE.Color(0xffe2b8), bumpMap: bumpT, envMapIntensity: .7, bumpScale: 0 });
  const tender = sh(new THREE.Mesh(geo, meat));
  const tenderG = new THREE.Group(); tenderG.add(tender); world.add(tenderG);
  tender.scale.set(1, .62, .82); tender.rotation.y = .12;

  // ---- drizzle + pickles ----
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector3(-.58 + 1.16 * t, 0, (i % 2 ? 1 : -1) * .14)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .6);
  const sauceGeo = new THREE.TubeGeometry(curve, 260, .016, 8, false);
  const sauceMat = new THREE.MeshPhysicalMaterial({ color: 0xf6ecd8, roughness: .25, clearcoat: 1, clearcoatRoughness: .1, sheen: .3 });
  const sauce = new THREE.Mesh(sauceGeo, sauceMat); sauce.castShadow = true; tenderG.add(sauce);
  const sauceCount = sauceGeo.index.count;
  const pickleC = document.createElement('canvas'); pickleC.width = pickleC.height = 128;
  { const g = pickleC.getContext('2d'); const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, '#e6ec9a'); gr.addColorStop(.55, '#b8c95a'); gr.addColorStop(.85, '#6f8a2c'); gr.addColorStop(1, '#4a6a1c'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(240,245,190,.85)'; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.beginPath(); g.ellipse(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22, 6, 3.5, a, 0, 7); g.fill(); } }
  const pickleT = new THREE.CanvasTexture(pickleC); pickleT.colorSpace = THREE.SRGBColorSpace;
  const pickleMat = new THREE.MeshPhysicalMaterial({ map: pickleT, roughness: .3, clearcoat: .8, transmission: 0 });
  const pickleSide = new THREE.MeshPhysicalMaterial({ color: 0x4d6b1f, roughness: .4, clearcoat: .6 });
  const pickles = [[-.42, .05, .16, .3], [.02, .14, -.04, -.2], [.4, .06, .12, .5]].map(([x, z, tilt, r]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .022, 28), [pickleSide, pickleMat, pickleMat]); m.castShadow = true;
    m.userData.home = new THREE.Vector3(x, 0, z); m.rotation.set(tilt, r, tilt * .6); tenderG.add(m); return m;
  });

  // ---- particles: oil bubbles, spice, steam ----
  function particles(n, color, size, opacity = 1) {
    const pos = new Float32Array(n * 3).fill(-9), vel = new Float32Array(n * 3), life = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
    const p = new THREE.Points(g, m); p.frustumCulled = false; world.add(p);
    return { pos, vel, life, g, m, n };
  }
  const bub = particles(160, 0xfff6e0, .03, .85), spice = particles(220, 0xb22a10, .022), steamP = particles(70, 0xffffff, .09, .18);
  bub.m.blending = THREE.AdditiveBlending;

  // ---- state ----
  const st = { batter: 0, fry: 0, season: 0, sauce: 0, drop: 0, lift: 1, spin: 0 };
  let emitBub = 0, emitSpice = 0;
  function shapeTender() {
    const p = geo.attributes.position, col = geo.attributes.color, b = st.batter;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const len = Math.hypot(y, z) || 1;
      // a real tender: wider in the middle, tapered at one end, a little twisted and bent
      const u = (x + TL / 2 + TR) / (TL + 2 * TR), girth = (.82 + .3 * Math.sin(u * Math.PI) - .22 * u * u) * (1 + .12 * (vnoise(x * 3 + 7, 1, 1) - .5));
      const bend = -.09 * x * x + .03 * Math.sin(x * 4);
      const crag = ridged(x * 9 + 2, y * 11, z * 11) * .6 + fbm(x * 5, y * 6, z * 6) * .4, fine = vnoise(x * 26, y * 26, z * 26);
      const pole = clamp(len / (TR * .35)), d = b * (.006 + .085 * crag * crag + .02 * fine) * pole;
      p.setXYZ(i, x * (1 + b * .03), (y * girth) + (y / len) * d + bend, (z * girth) + (z / len) * d);
      const shade = 1 - b * .42 * (1 - crag) - b * .1 * (1 - fine);
      col.setXYZ(i, shade, shade * .97, shade * .93);
    }
    p.needsUpdate = true; col.needsUpdate = true; geo.computeVertexNormals();
    meat.bumpScale = b * 2.4;
  }
  function paintSpeck() {
    const g = speckC.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 640);
    const s = st.season;
    if (s > 0) speckDots.forEach(([x, y, r, red], i) => { if (i / speckDots.length > s) return; g.fillStyle = red ? 'rgba(150,30,10,.85)' : 'rgba(40,20,10,.8)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    speckT.needsUpdate = true;
  }
  let lastSeason = -1;
  function applyLook() {
    const c = C.raw.clone().lerp(C.batter, clamp(st.batter * 1.4));
    c.lerp(C.fried, ease(st.fry));
    c.lerp(C.hot, st.season * .55);
    meat.color.copy(c);
    meat.roughness = .7 - st.fry * .22; meat.clearcoat = .05 + st.fry * .4 + st.season * .25;
    meat.sheen = .35 * (1 - st.fry);
    if (Math.abs(st.season - lastSeason) > .02) { lastSeason = st.season; paintSpeck(); }
    sauceGeo.setDrawRange(0, Math.floor(sauceCount * clamp(st.sauce)) - (Math.floor(sauceCount * clamp(st.sauce)) % 3));
    sauce.visible = st.sauce > .01;
    pickles.forEach((m, i) => { const t = clamp(st.sauce * 1.6 - .5 - i * .12); m.visible = t > 0; m.position.set(m.userData.home.x, m.userData.home.y + TR * .82 + .02 + (1 - bounce(t)) * .9, m.userData.home.z); });
    // tender floats up while it's being made, then drops onto the toast
    const lift = st.lift, y = TOP + TR * .78 + lift * .55;
    tenderG.position.set(0, y + (lift > 0 ? Math.sin(t0 * 1.6) * .02 * lift : 0), 0);
    tenderG.rotation.set(0, st.spin, lift * .12);
    sauce.position.y = TR * .78 + .005;
  }

  function stepParticles(P, dt, spawn, emit, update) {
    let k = 0;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { if (emit > 0 && k < emit) { spawn(i); k++; } else { P.pos[i * 3 + 1] = -9; continue; } }
      P.life[i] -= dt; update(i, dt);
    }
    P.g.attributes.position.needsUpdate = true;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function tickParticles(dt) {
    const cy = tenderG.position.y;
    stepParticles(bub, dt, i => { bub.pos.set([rnd(-.6, .6), cy + rnd(-.18, .05), rnd(-.18, .18)], i * 3); bub.vel.set([rnd(-.1, .1), rnd(.25, .6), rnd(-.1, .1)], i * 3); bub.life[i] = rnd(.3, .8); }, Math.round(emitBub * 4),
      (i, dt) => { bub.pos[i * 3] += bub.vel[i * 3] * dt; bub.pos[i * 3 + 1] += bub.vel[i * 3 + 1] * dt; bub.pos[i * 3 + 2] += bub.vel[i * 3 + 2] * dt; });
    stepParticles(spice, dt, i => { spice.pos.set([rnd(-.6, .6), cy + rnd(.5, .8), rnd(-.2, .2)], i * 3); spice.vel.set([rnd(-.05, .05), rnd(-.6, -.3), rnd(-.05, .05)], i * 3); spice.life[i] = 1.2; }, Math.round(emitSpice * 5),
      (i, dt) => { spice.vel[i * 3 + 1] -= 2.5 * dt; spice.pos[i * 3] += spice.vel[i * 3] * dt; spice.pos[i * 3 + 1] += spice.vel[i * 3 + 1] * dt; spice.pos[i * 3 + 2] += spice.vel[i * 3 + 2] * dt; if (spice.pos[i * 3 + 1] < cy + TR * .5) spice.life[i] = 0; });
    const steamOn = st.fry > .7 ? 1 : 0;
    stepParticles(steamP, dt, i => { steamP.pos.set([rnd(-.5, .5), cy + .12, rnd(-.12, .12)], i * 3); steamP.vel.set([rnd(-.04, .04), rnd(.18, .32), rnd(-.04, .04)], i * 3); steamP.life[i] = rnd(1.2, 2.2); }, steamOn && Math.random() < .3 ? 1 : 0,
      (i, dt) => { steamP.pos[i * 3] += steamP.vel[i * 3] * dt; steamP.pos[i * 3 + 1] += steamP.vel[i * 3 + 1] * dt; steamP.pos[i * 3 + 2] += steamP.vel[i * 3 + 2] * dt; });
  }

  // ---- sequencer ----
  let steps = [], cur = null, curT = 0;
  const step = (d, fn, done, label) => ({ d, fn, done, label });
  const run = l => { steps = l; cur = null; };
  const to = (k, v, e = ease) => { let from; return t => { if (from === undefined) from = st[k]; st[k] = from + (v - from) * e(t); }; };
  function reset() { Object.assign(st, { batter: 0, fry: 0, season: 0, sauce: 0, lift: 1, spin: 0 }); emitBub = emitSpice = 0; lastSeason = -1; shapeTender(); applyLook(); }
  function play() {
    reset();
    run([
      step(.9, t => { st.spin = t * .6; }, null, 'Brined'),
      step(1.2, t => { to('batter', 1)(t); st.spin = .6 + t * .8; shapeTender(); }, null, 'Battered'),
      step(1.6, t => { to('fry', 1, t => t)(t); emitBub = Math.sin(t * Math.PI) * 1.2 + .2; st.spin = 1.4 + t; }, () => { emitBub = 0; }, 'Fried'),
      step(1.1, t => { to('season', 1)(t); emitSpice = t < .85 ? 1 : 0; st.spin = 2.4 + t * .6; }, () => { emitSpice = 0; }, 'Seasoned'),
      step(.7, t => { st.lift = 1 - bounce(t); st.spin = 3 + (Math.PI * 2 - 3) * ease(t); }, null, null),
      step(1.2, t => { st.sauce = t; }, null, 'Sauced'),
      step(0, () => {}, null, 'Order up!')
    ]);
  }
  // direct control for the "your turn" game
  function set(s) {
    Object.assign(st, s);
    if ('batter' in s) shapeTender();
    if ('bubbles' in s) emitBub = s.bubbles;
    if ('spice' in s) emitSpice = s.spice;
    start();
  }

  // ---- camera ----
  const target = new THREE.Vector3(0, .42, 0);
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const A0 = o.angle ?? .5;
  const placeCam = () => {
    const D = (SMALL ? 4.6 : 3.9) * (o.zoom || 1), E = .52 + el, Az = A0 + az;
    camera.position.set(Math.sin(Az) * Math.cos(E) * D, target.y + Math.sin(E) * D, Math.cos(Az) * Math.cos(E) * D);
    camera.lookAt(target);
  };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .4; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.12; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 38 : 30; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  function advance(dt) {
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; if (cur.label && o.onStep) o.onStep(cur.label); }
      const d = RM ? 0 : cur.d; curT += dt;
      const p = d ? clamp(curT / d) : 1; cur.fn(p, dt);
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
  }
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .05); last = now; t0 += dt;
    advance(dt); applyLook(); tickParticles(dt);
    az += (taz + (RM ? 0 : Math.sin(t0 * .3) * .08) - az) * .06; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  reset();
  if (o.done || RM) { Object.assign(st, { batter: 1, fry: 1, season: 1, sauce: 1, lift: 0, spin: Math.PI * 2 }); shapeTender(); applyLook(); if (o.onStep) o.onStep('Order up!'); }
  else if (o.auto) play();
  placeCam(); renderer.compile(scene, camera); start();
  return { play, reset: () => { reset(); start(); }, set, state: st, renderer };
}
