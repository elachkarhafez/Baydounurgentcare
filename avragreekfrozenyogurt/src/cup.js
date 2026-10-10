/* =====================================================================
   AVRA Greek Frozen Yogurt: "Avra means breeze."
   Their white cup (olive branch + AVRA print) in real 3D: the Greek yogurt
   pipes in as a ridged swirl, the pairing drops on (pistachio + honey,
   fig + honey, honeycomb + crunch) and honey drizzles down the swirl.
   An olive branch hangs over the cup and sways in a breeze you make by
   moving the pointer (or scrolling); strong gusts shake loose a few leaves.
   api.pair(name) swaps the toppings.
   Bundle: kit/build3d/build.sh avragreekfrozenyogurt/src/cup.js avragreekfrozenyogurt/assets/cup.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 9; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export const PAIRS = ['pistachio', 'fig', 'honeycomb'];

export async function mountCup(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .05, 60), world = new THREE.Group(); scene.add(world);
  const env = await new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', res, undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .85; scene.environmentRotation.set(0, 1.1, 0); }

  const key = new THREE.DirectionalLight(0xfff1df, 2.2); key.position.set(2.5, 5, 3.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -2, near: .5, far: 14 });
  const rim = new THREE.DirectionalLight(0xffe0b0, 1.1); rim.position.set(-3, 2.5, -2.5);
  scene.add(key, rim, new THREE.HemisphereLight(0xfff6ea, 0x8a7560, .45));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- the cup (their print: olive branch + AVRA + GREEK FROZEN YOGURT) ----
  const R0 = .4, R1 = .54, CH = .64;
  const print = canvasTex(2048, 512, (g, w, h) => {
    const pg = g.createLinearGradient(0, 0, 0, h); pg.addColorStop(0, '#fbf9f4'); pg.addColorStop(1, '#f1ece2'); g.fillStyle = pg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,80,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    const logo = cx => {
      g.save(); g.translate(cx, 0);
      // olive branch
      g.strokeStyle = '#5b4a33'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-72, 196); g.quadraticCurveTo(-4, 170, 70, 120); g.stroke();
      const leaf = (x, y, a, l, up) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = up ? '#6f7d4a' : '#55623a'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * .5, -l * .22, l, 0); g.quadraticCurveTo(l * .5, l * .22, 0, 0); g.fill(); g.restore(); };
      [[-48, 186, -2.2, 46, 1], [-30, 180, -.9, 44, 0], [-8, 172, -2.4, 48, 1], [10, 162, -.7, 46, 0], [30, 150, -2.5, 46, 1], [46, 138, -.6, 42, 0], [62, 126, -1.6, 40, 1]].forEach(a => leaf(...a));
      g.fillStyle = '#4a3627'; g.textAlign = 'center';
      g.font = '500 108px "Bodoni Moda", Didot, Georgia, serif'; g.fillText('A V R A', 0, 318);
      g.font = '600 30px "DM Sans", Arial, sans-serif'; g.fillText('G R E E K   F R O Z E N   Y O G U R T', 0, 368);
      g.restore();
    };
    logo(w * .25); logo(w * .75);
  });
  print.wrapS = THREE.RepeatWrapping;
  const paper = new THREE.MeshPhysicalMaterial({ map: print, roughness: .62, sheen: .3, sheenColor: new THREE.Color(0xffffff) });
  const paperIn = new THREE.MeshPhysicalMaterial({ color: 0xf3eee4, roughness: .7, side: THREE.BackSide });
  const cup = new THREE.Group(); world.add(cup);
  const wall = sh(new THREE.Mesh(new THREE.CylinderGeometry(R1, R0, CH, 128, 1, true), paper)); wall.position.y = CH / 2; wall.rotation.y = -Math.PI / 2 - .25; cup.add(wall);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(R1 - .008, R0 - .008, CH, 96, 1, true), paperIn); inner.position.y = CH / 2; cup.add(inner);
  const base = sh(new THREE.Mesh(new THREE.CircleGeometry(R0, 64).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xeee8dc, roughness: .7 }))); base.position.y = .01; cup.add(base);
  const lip = sh(new THREE.Mesh(new THREE.TorusGeometry(R1 + .004, .014, 12, 128).rotateX(Math.PI / 2), paper)); lip.position.y = CH; cup.add(lip);

  // ---- the swirl: ridged soft-serve tube on a conical spiral ----
  const yog = new THREE.MeshPhysicalMaterial({ color: 0xfbf6ea, roughness: .42, clearcoat: .25, clearcoatRoughness: .5, sheen: .5, sheenColor: new THREE.Color(0xffffff) });
  const turns = 3.3, steps = 560;
  class Spiral extends THREE.Curve { getPoint(t, v = new THREE.Vector3()) { const a = t * turns * Math.PI * 2, r = (R1 - .1) * (1 - t * .92), y = CH + .02 + t * .44 + Math.pow(t, 3) * .08; return v.set(Math.cos(a) * r, y, Math.sin(a) * r); } }
  const curve = new Spiral();
  const swirlGeo = new THREE.TubeGeometry(curve, steps, .1, 28, false);
  { const p = swirlGeo.attributes.position, N = swirlGeo.normals, B = swirlGeo.binormals, rs = 28 + 1, c = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) { const t = i / steps; curve.getPointAt(t, c); const R = .135 * (1 - .6 * Math.pow(t, 1.3)) * (t > .97 ? Math.max(.15, 1 - (t - .97) / .03 * .85) : 1);
      for (let j = 0; j <= 28; j++) { const v = j / 28 * Math.PI * 2, ridge = 1 + .09 * Math.cos(v * 8), k = i * rs + j, n = N[i], b = B[i]; const cx = -R * ridge * Math.cos(v), cy = R * ridge * Math.sin(v) * .82;
        p.setXYZ(k, c.x + cx * n.x + cy * b.x, c.y + cx * n.y + cy * b.y, c.z + cx * n.z + cy * b.z); } }
    swirlGeo.computeVertexNormals(); }
  const swirl = sh(new THREE.Mesh(swirlGeo, yog)); cup.add(swirl);
  const fill = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), yog)); fill.scale.set(R1 - .03, .09, R1 - .03); fill.position.y = CH - .04; cup.add(fill);
  const swirlIdx = swirlGeo.index.count;
  // swirl top point for toppings
  const topY = t => curve.getPointAt(Math.min(1, t)).y;

  // ---- toppings ----
  const honeyMat = new THREE.MeshPhysicalMaterial({ color: 0xf2b43a, roughness: .03, transmission: .72, thickness: .08, ior: 1.49, clearcoat: 1, clearcoatRoughness: .02, attenuationColor: new THREE.Color(0xd07a0a), attenuationDistance: .12, specularIntensity: 1 });
  const pistaMat = new THREE.MeshPhysicalMaterial({ color: 0x748a3a, roughness: .55, clearcoat: .2 });
  const pistaMat2 = new THREE.MeshPhysicalMaterial({ color: 0xa9a35c, roughness: .6 });
  const crumbMat = new THREE.MeshPhysicalMaterial({ color: 0xc58a3e, roughness: .7 });
  const skinT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#4a2440'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${70 + Math.random() * 40 | 0},${110 + Math.random() * 40 | 0},.25)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 6); } });
  const figIn = canvasTex(256, 256, (g, w, h) => { const c = w / 2; const gr = g.createRadialGradient(c, c * 1.05, 4, c, c, c); gr.addColorStop(0, '#f6e4c6'); gr.addColorStop(.35, '#e88a7c'); gr.addColorStop(.7, '#b8344a'); gr.addColorStop(.86, '#f2dcc0'); gr.addColorStop(1, '#5c2a46'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const a = Math.random() * 6.28, r = Math.random() * c * .62; g.fillStyle = 'rgba(250,220,150,.85)'; g.beginPath(); g.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r * 1.05, 2.2, 1.4, a, 0, 7); g.fill(); } });
  const combT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d99a1c'; g.fillRect(0, 0, w, h); const s = 22; g.strokeStyle = '#f6d27a'; g.lineWidth = 4; for (let y = -1; y < 14; y++) for (let x = -1; x < 14; x++) { const cx = x * s * 1.5, cy = y * s * 1.73 + (x % 2) * s * .86; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * s * .95, cy + Math.sin(a) * s * .95); } g.closePath(); g.fillStyle = 'rgba(160,90,10,.55)'; g.fill(); g.stroke(); } });
  const combMat = new THREE.MeshPhysicalMaterial({ map: combT, roughness: .15, clearcoat: 1, transmission: .2, thickness: .2 });

  const tops = new THREE.Group(); cup.add(tops);
  const surf = (t, out = .7) => { const p = curve.getPointAt(t), a = Math.atan2(p.z, p.x), k = .135 * (1 - .6 * Math.pow(t, 1.3)), rr = Math.hypot(p.x, p.z) + k * out * .9; return new THREE.Vector3(Math.cos(a) * rr, p.y + k * Math.sqrt(Math.max(0, 1 - out * out)) * .8 + .01, Math.sin(a) * rr); };
  function chunk(mat, s) { const g = new THREE.IcosahedronGeometry(s, 0), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rnd(.7, 1.3), p.getY(i) * rnd(.5, .9), p.getZ(i) * rnd(.7, 1.3)); g.computeVertexNormals(); return sh(new THREE.Mesh(g, mat)); }
  function honeyDrizzle() { // a ribbon that winds down the swirl, revealed over time
    const pts = []; for (let i = 0; i <= 60; i++) { const t = 1 - i / 60 * .8; const p = curve.getPointAt(t), a = Math.atan2(p.z, p.x) + Math.sin(i * .9) * .25, k = .135 * (1 - .6 * Math.pow(t, 1.3)), rr = Math.hypot(p.x, p.z) + k * .62; pts.push(new THREE.Vector3(Math.cos(a) * rr, p.y + k * .86, Math.sin(a) * rr)); }
    const hc = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(hc, 260, .02, 10, false);
    { const p = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3(), ph = rnd(0, 6); for (let i = 0; i <= 260; i++) { const u = i / 260; hc.getPointAt(u, c); const f = (.45 + .4 * Math.abs(Math.sin(u * 37 + ph)) + .25 * Math.sin(u * 91)) * (u > .92 ? Math.max(.2, 1 - (u - .92) / .08) : 1);
      for (let j = 0; j <= 10; j++) { const k = i * 11 + j; v.fromBufferAttribute(p, k).sub(c); v.y *= .6; v.multiplyScalar(f); p.setXYZ(k, c.x + v.x, c.y + v.y - .004, c.z + v.z); } } geo.computeVertexNormals(); }
    const m = new THREE.Mesh(geo, honeyMat); m.castShadow = true; m.userData.drip = geo.index.count; geo.setDrawRange(0, 0);
    // drips hanging off the lower rings
    const drips = new THREE.Group(); for (let i = 0; i < 5; i++) { const t = .3 + i * .13, p = surf(t, 1); const d = new THREE.Mesh(new THREE.CapsuleGeometry(.014, .05 + rnd(0, .05), 4, 8), honeyMat); d.position.copy(p).add(new THREE.Vector3(0, -.06, 0)); d.scale.setScalar(.001); d.userData.k = rnd(.6, 1); drips.add(d); }
    m.add(drips); m.userData.drips = drips; return m; }
  function build(name) {
    seed = 31 + PAIRS.indexOf(name) * 7;
    const g = new THREE.Group(), items = [];
    const put = (m, p, delay) => { m.userData.home = p.clone(); m.userData.delay = delay; if (!m.userData.keepRot) m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); g.add(m); items.push(m); };
    if (name === 'pistachio') {
      for (let i = 0; i < 70; i++) { const t = rnd(.25, .97); put(chunk(i % 3 ? pistaMat : pistaMat2, rnd(.012, .022)), surf(t, rnd(.1, .85)), rnd(0, .6)); }
    } else if (name === 'fig') {
      for (let i = 0; i < 4; i++) { const f = new THREE.Group(); const skin = sh(new THREE.Mesh(new THREE.SphereGeometry(.09, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: skinT, roughness: .5, sheen: .6, sheenColor: new THREE.Color(0x9a7ab0) }))); skin.scale.set(1, 1.35, .95); skin.rotation.x = -Math.PI / 2; f.add(skin); const face = new THREE.Mesh(new THREE.CircleGeometry(.09, 32), new THREE.MeshPhysicalMaterial({ map: figIn, roughness: .3, clearcoat: .8 })); face.scale.set(.95, 1.35, 1); face.position.z = .001; f.add(face); f.scale.setScalar(1.1);
        const t = [.62, .78, .42, .9][i], p = surf(t, .9); put(f, p, i * .12); f.userData.keepRot = true; const n = new THREE.Vector3(p.x, 0, p.z).normalize().multiplyScalar(.55).add(new THREE.Vector3(0, .7, .45)).normalize(); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); f.rotateZ(rnd(-.6, .6)); }
      for (let i = 0; i < 26; i++) put(chunk(pistaMat, rnd(.016, .026)), surf(rnd(.3, .95), rnd(.2, .8)), .3 + rnd(0, .4));
    } else {
      for (let i = 0; i < 3; i++) { const c = sh(new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .12, 1, 1, 1), combMat)); put(c, surf([.6, .82, .4][i], .9), i * .12); }
      for (let i = 0; i < 60; i++) put(chunk(crumbMat, rnd(.016, .03)), surf(rnd(.2, .96), rnd(.2, .9)), .2 + rnd(0, .5));
    }
    const honey = honeyDrizzle(); g.add(honey); g.userData.honey = honey; g.userData.items = items; g.userData.t = RM ? 1 : 0;
    return g;
  }
  let current = null, leaving = null, leaveT = 0, pairName = o.pair || 'pistachio';
  function pair(name) {
    if (!PAIRS.includes(name)) return; pairName = name;
    if (current) { leaving = current; leaveT = 0; }
    current = build(name); tops.add(current); start();
  }
  function placeTops(g) {
    const t = g.userData.t;
    g.userData.items.forEach(m => { const k = clamp((t - m.userData.delay) / .5); m.visible = k > 0; const h = m.userData.home; m.position.set(h.x, h.y + (1 - bounce(k)) * .8, h.z); if (!m.userData.keepRot) m.rotation.y += .0; });
    const hn = g.userData.honey, hk = clamp((t - .35) / .65); hn.geometry.setDrawRange(0, Math.floor(hn.userData.drip * easeIO(hk)) - (Math.floor(hn.userData.drip * easeIO(hk)) % 3));
    hn.userData.drips.children.forEach((d, i) => { const k = clamp((hk - .5 - i * .08) / .4); d.scale.set(Math.max(.001, k), Math.max(.001, k * d.userData.k), Math.max(.001, k)); });
  }

  // ---- olive branch over the cup, swaying in the breeze ----
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.05, .028, .16, 0); leafShape.quadraticCurveTo(.05, -.028, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 8); { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(y) * .4 + Math.sin(x / .16 * Math.PI) * .012); } leafGeo.computeVertexNormals(); }
  const leafTop = new THREE.MeshPhysicalMaterial({ color: 0x5f6e3c, roughness: .45, clearcoat: .4, side: THREE.DoubleSide });
  const leafAlt = new THREE.MeshPhysicalMaterial({ color: 0x7d8a5a, roughness: .55, sheen: .6, sheenColor: new THREE.Color(0xc8d0b0), side: THREE.DoubleSide });
  const branch = new THREE.Group(); world.add(branch);
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.25, 1.75, -.2), new THREE.Vector3(-.75, 1.68, 0), new THREE.Vector3(-.25, 1.55, .08), new THREE.Vector3(.2, 1.42, .1), new THREE.Vector3(.55, 1.3, .05)]);
  branch.add(sh(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 60, .011, 8, false), new THREE.MeshPhysicalMaterial({ color: 0x6b5a3e, roughness: .7 }))));
  const leaves = [];
  { seed = 4; for (let i = 0; i < 26; i++) { const t = .06 + i / 26 * .92, p = stemCurve.getPointAt(t), side = i % 2 ? 1 : -1; const l = sh(new THREE.Mesh(leafGeo, i % 3 ? leafTop : leafAlt)); const piv = new THREE.Group(); piv.position.copy(p); piv.add(l); l.scale.setScalar(rnd(.75, 1.15) * (1 - t * .25)); piv.rotation.set(rnd(-.3, .3), side * rnd(.5, 1.2) + .3, -rnd(.6, 1.3)); piv.userData = { base: piv.rotation.clone(), ph: rnd(0, 6), side }; branch.add(piv); leaves.push(piv); }
    for (let i = 0; i < 3; i++) { const olive = sh(new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x3e4a22, roughness: .25, clearcoat: 1 }))); olive.scale.y = 1.3; olive.position.copy(stemCurve.getPointAt(.35 + i * .2)).add(new THREE.Vector3(0, -.05, .03)); branch.add(olive); } }
  branch.position.set(.05, -.22, .1); branch.scale.setScalar(1.15);
  // loose leaves blown off by gusts
  const loose = Array.from({ length: 8 }, (_, i) => { const l = new THREE.Mesh(leafGeo, i % 2 ? leafTop : leafAlt); l.castShadow = true; l.visible = false; l.userData = { life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }; world.add(l); return l; });
  let wind = 0, gustCool = 0, lastX = null, lastY = null;
  const gust = v => { wind = clamp(wind + v, 0, 1.6); };
  addEventListener('pointermove', e => { if (lastX !== null) gust(Math.hypot(e.clientX - lastX, e.clientY - lastY) / 900); lastX = e.clientX; lastY = e.clientY; start(); }, { passive: true });
  let lastSY = scrollY; addEventListener('scroll', () => { gust(Math.abs(scrollY - lastSY) / 1400); lastSY = scrollY; }, { passive: true });
  canvas.addEventListener('pointerdown', () => { gust(.9); start(); });

  // ---- camera + loop ----
  const target = new THREE.Vector3(0, .78, 0);
  let t0 = 0, cupT = RM ? 1 : 0, swirlT = RM ? 1 : 0, az = 0;
  const placeCam = () => { const D = SMALL ? 4.7 : 4.3, A = .1 + az, E = .3; camera.position.set(Math.sin(A) * Math.cos(E) * D, target.y + Math.sin(E) * D, Math.cos(A) * Math.cos(E) * D); camera.lookAt(target); };
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .9 ? 34 : 28; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();
  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (cupT < 1) { cupT = Math.min(1, cupT + dt / .9); cup.position.y = (1 - easeOut(cupT)) * -.4; cup.rotation.y = (1 - easeOut(cupT)) * -1.2; }
    if (cupT > .6 && swirlT < 1) { swirlT = Math.min(1, swirlT + dt / 1.6); }
    const sk = easeIO(swirlT); swirl.geometry.setDrawRange(0, Math.floor(swirlIdx * sk / 3) * 3); fill.scale.y = Math.max(.001, .09 * clamp(sk * 4)); fill.visible = swirl.visible = sk > 0;
    if (swirlT >= 1 && current) { if (current.userData.t < 1) current.userData.t = Math.min(1, current.userData.t + dt / 2.4); placeTops(current); }
    if (leaving) { leaveT += dt / .4; const k = clamp(leaveT); leaving.position.y = k * .6; leaving.scale.setScalar(Math.max(.001, 1 - k)); if (k >= 1) { tops.remove(leaving); leaving.traverse(m => m.geometry && m.geometry !== leafGeo && m.geometry.dispose()); leaving = null; } }
    // breeze
    const base = RM ? 0 : .12 + Math.sin(t0 * .7) * .06; wind *= Math.pow(.35, dt); const w = base + wind;
    branch.rotation.z = Math.sin(t0 * 1.3) * .03 * w + w * .04; branch.rotation.x = Math.sin(t0 * 1.7 + 1) * .025 * w;
    leaves.forEach(l => { const u = l.userData; l.rotation.x = u.base.x + Math.sin(t0 * (3 + w * 5) + u.ph) * .25 * w; l.rotation.z = u.base.z + Math.sin(t0 * (2.4 + w * 4) + u.ph * 1.3) * .18 * w; });
    gustCool -= dt; if (wind > .55 && gustCool <= 0 && !RM) { const l = loose.find(x => !x.visible); if (l) { gustCool = .35; const s = leaves[(Math.random() * leaves.length) | 0]; s.getWorldPosition(l.position); l.visible = true; l.userData.life = 0; l.userData.v.set(1.2 + Math.random() * .8, .3 + Math.random() * .4, .2 + Math.random() * .3); l.userData.spin.set(Math.random() * 4, Math.random() * 4, Math.random() * 4); } }
    loose.forEach(l => { if (!l.visible) return; const u = l.userData; u.life += dt; u.v.y -= dt * .7; u.v.x *= .995; l.position.addScaledVector(u.v, dt); l.position.y += Math.sin(u.life * 6) * .004; l.rotation.x += u.spin.x * dt; l.rotation.y += u.spin.y * dt; l.rotation.z += u.spin.z * dt; if (u.life > 4 || l.position.y < -.2) l.visible = false; });
    az += ((RM ? 0 : Math.sin(t0 * .25) * .12) - az) * .04; placeCam();
    renderer.render(scene, camera);
    const busy = !RM || cupT < 1 || (current && current.userData.t < 1) || leaving;
    if (visible && !document.hidden && busy) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  pair(pairName); placeCam(); renderer.compile(scene, camera); start();
  return { pair, gust: v => { gust(v); start(); }, get pairName() { return pairName; }, renderer };
}
