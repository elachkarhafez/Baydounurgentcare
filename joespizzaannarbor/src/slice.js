/* =====================================================================
   Joe's Pizza Ann Arbor: "Fold it like a New Yorker."
   A whole NY cheese pie on an aluminum tray. One slice lifts out (cheese
   strands stretch and snap) and the tip flops, the way a real NY slice
   does. Press and hold to fold it lengthwise: the fold stiffens the slice,
   and holding on takes bites (scalloped, shader-discarded) until only the
   crust is left; then the next slice comes up.
   api.top('cheese' | 'pepperoni') repaints the pie.
   Bundle: kit/build3d/build.sh joespizzaannarbor/src/slice.js joespizzaannarbor/assets/slice.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let seed = 3; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

export async function mountSlice(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 60), world = new THREE.Group(); scene.add(world);
  const [env, pepImg] = await Promise.all([
    new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', res, undefined, () => res(null))),
    new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = A0 + 'tex/pep.png'; })
  ]);
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .8; scene.environmentRotation.set(0, .6, 0); }
  const key = new THREE.DirectionalLight(0xfff2e2, 2.4); key.position.set(2, 5, 3);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0004; key.shadow.normalBias = .015;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: .5, far: 12 });
  const warm = new THREE.PointLight(0xff9a50, 2.2, 7, 1.8); warm.position.set(-2, 1.2, 1.4);
  scene.add(key, warm, new THREE.HemisphereLight(0xfff6ee, 0x6a4a36, .5));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .28 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  // ---- textures: NY cheese (mozzarella, orange grease, sauce peeking, blisters) ----
  const R = 1, RIM = .1, N = 8, SECT = Math.PI * 2 / N;
  const cheeseCanvas = document.createElement('canvas'); cheeseCanvas.width = cheeseCanvas.height = 1024;
  const cheeseTex = new THREE.CanvasTexture(cheeseCanvas); cheeseTex.colorSpace = THREE.SRGBColorSpace; cheeseTex.anisotropy = 8;
  const bumpCanvas = document.createElement('canvas'); bumpCanvas.width = bumpCanvas.height = 512;
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  let pepSpots = [];
  function paint(topping) {
    const g = cheeseCanvas.getContext('2d'), w = 1024, c = w / 2; seed = 21;
    g.fillStyle = '#dd9a44'; g.fillRect(0, 0, w, w);                                   // melted mozzarella base
    { const gr = g.createRadialGradient(c, c, 400, c, c, 470); gr.addColorStop(0, 'rgba(200,60,30,0)'); gr.addColorStop(.55, 'rgba(196,58,28,.85)'); gr.addColorStop(1, 'rgba(170,45,20,.95)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }   // sauce ring at the edge
    for (let i = 0; i < 520; i++) { const a = rnd(0, 6.283), rr = Math.sqrt(rnd(0, 1)) * 440, x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr, r = rnd(24, 80); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${248 + rnd(-6, 5) | 0},${208 + rnd(-16, 10) | 0},${128 + rnd(-24, 16) | 0},.7)`); gr.addColorStop(.6, 'rgba(240,186,100,.35)'); gr.addColorStop(1, 'rgba(236,180,100,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 220; i++) { const x = rnd(0, w), y = rnd(0, w), r = rnd(8, 30); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(226,128,36,.45)'); gr.addColorStop(1, 'rgba(226,128,36,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * rnd(.5, 1), rnd(0, 3), 0, 7); g.fill(); }   // orange grease
    for (let i = 0; i < 140; i++) { const x = rnd(0, w), y = rnd(0, w), r = rnd(5, 18); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(140,72,26,.7)'); gr.addColorStop(1, 'rgba(190,120,50,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }   // browned blisters
    for (let i = 0; i < 18; i++) { const a = rnd(0, 6.283), rr = rnd(150, 420), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr; g.fillStyle = 'rgba(190,55,28,.5)'; g.beginPath(); g.ellipse(x, y, rnd(5, 14), rnd(3, 8), rnd(0, 3), 0, 7); g.fill(); } // sauce peeks
    for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(70,80,30,.45)'; g.fillRect(rnd(0, w), rnd(0, w), 2, 1.4); }   // oregano flecks
    pepSpots = [];
    if (topping === 'pepperoni' && pepImg) {
      for (let ring = 0; ring < 3; ring++) { const n = [6, 13, 19][ring], rr = [.2, .5, .76][ring]; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .4 + rnd(-.1, .1), r2 = rr * (c - 40) + rnd(-12, 12), x = c + Math.cos(a) * r2, y = c + Math.sin(a) * r2, s = rnd(54, 66);
        g.save(); g.translate(x, y); g.rotate(rnd(0, 6)); g.shadowColor = 'rgba(120,30,10,.5)'; g.shadowBlur = 6; g.filter = 'saturate(1.25) brightness(.92)'; g.drawImage(pepImg, -s / 2, -s / 2, s, s); g.restore(); g.filter = 'none';
        g.strokeStyle = 'rgba(110,25,10,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * .46, 0, 7); g.stroke(); pepSpots.push([x / w, y / w, s / w]); } }
    }
    cheeseTex.needsUpdate = true;
    const b = bumpCanvas.getContext('2d'); seed = 21; b.fillStyle = '#777'; b.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { const x = rnd(0, 512), y = rnd(0, 512), r = rnd(4, 20), v = rnd(110, 200) | 0; const gr = b.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${v},${v},${v},.7)`); gr.addColorStop(1, 'rgba(119,119,119,0)'); b.fillStyle = gr; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill(); }
    pepSpots.forEach(([x, y, s]) => { b.fillStyle = '#c8c8c8'; b.beginPath(); b.arc(x * 512, y * 512, s * 512 * .46, 0, 7); b.fill(); b.fillStyle = '#9a9a9a'; b.beginPath(); b.arc(x * 512, y * 512, s * 512 * .3, 0, 7); b.fill(); });
    bumpTex.needsUpdate = true;
  }
  paint(o.top || 'cheese');
  const crustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); seed = 8; g.fillStyle = '#c98a45'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 500; i++) { const x = rnd(0, 512), y = rnd(0, 512), r = rnd(4, 26); const gr = g.createRadialGradient(x, y, 0, x, y, r); const dark = rnd() < .3; gr.addColorStop(0, dark ? 'rgba(50,25,10,.85)' : 'rgba(150,85,35,.55)'); gr.addColorStop(1, 'rgba(200,140,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,240,200,${rnd(0, .25)})`; g.fillRect(rnd(0, 512), rnd(0, 512), 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();

  // ---- materials (bites are discarded in the shader using the undeformed position) ----
  const biteU = { uBites: { value: 0 }, uBite: { value: Array.from({ length: 6 }, () => new THREE.Vector3(9, 9, 0)) } };
  const withBites = (m, on) => { if (!on) return m; m.onBeforeCompile = sh => { Object.assign(sh.uniforms, biteU);
      sh.vertexShader = 'attribute vec3 base;\nvarying vec3 vBase;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBase = base;');
      sh.fragmentShader = 'uniform int uBites;\nuniform vec3 uBite[6];\nvarying vec3 vBase;\n' + sh.fragmentShader.replace('void main() {', `void main() {
        for (int i = 0; i < 6; i++) { if (i >= uBites) break; vec2 d = vBase.xz - uBite[i].xy; float a = atan(d.y, d.x); float rr = uBite[i].z * (1.0 + .07 * sin(a * 11.0)); if (length(d) < rr) discard; }`); };
    m.customProgramCacheKey = () => 'bites'; return m; };
  const mk = on => ({
    cheese: withBites(new THREE.MeshPhysicalMaterial({ map: cheeseTex, bumpMap: bumpTex, bumpScale: 2.2, roughness: .42, clearcoat: .55, clearcoatRoughness: .3, sheen: .4, sheenColor: new THREE.Color(0xfff0d0) }), on),
    crust: withBites(new THREE.MeshPhysicalMaterial({ map: crustTex, roughness: .78, bumpMap: crustTex, bumpScale: 1.2, sheen: .3, sheenColor: new THREE.Color(0xffe0b0) }), on),
    under: withBites(new THREE.MeshPhysicalMaterial({ map: crustTex, color: 0xf0cfa8, roughness: .9, side: THREE.DoubleSide }), on)
  });
  const matPie = mk(false), matSlice = mk(true);

  // ---- slice geometry: tip at origin, centreline along +x, crust at x = R ----
  const NR = 30, NA = 18, H = .028;
  function sliceGeometry() {
    const pos = [], uv = [], idx = [], kind = [];
    const add = (x, y, z, k) => { pos.push(x, y, z); uv.push(x / (2 * R) + .5, z / (2 * R) + .5); kind.push(k); return pos.length / 3 - 1; };
    const grid = (nr, na, f, k, flip) => { const s = pos.length / 3; for (let i = 0; i <= nr; i++) for (let j = 0; j <= na; j++) { const [x, y, z] = f(i / nr, j / na); add(x, y, z, k); } for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) { const a = s + i * (na + 1) + j, b = a + na + 1; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); } };
    const ang = v => (v - .5) * SECT;
    // cheese top
    grid(NR, NA, (u, v) => { const r = u * (R - RIM), a = ang(v), x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, H + .006 * Math.sin(x * 23) * Math.cos(z * 19), z]; }, 0, true);
    // crust rim: a rounded lip swept along the arc
    const prof = [[R - RIM, H], [R - RIM * .7, H + .03], [R - RIM * .35, H + .045], [R - .015, H + .03], [R, H * .4], [R - .01, 0]];
    grid(prof.length - 1, NA, (u, v) => { const k = u * (prof.length - 1), i0 = Math.floor(k), i1 = Math.min(prof.length - 1, i0 + 1), f = k - i0; const r = prof[i0][0] + (prof[i1][0] - prof[i0][0]) * f, y = prof[i0][1] + (prof[i1][1] - prof[i0][1]) * f, a = ang(v); return [Math.cos(a) * r, y, Math.sin(a) * r]; }, 1, true);
    // underside
    grid(NR, NA, (u, v) => { const r = u * R, a = ang(1 - v); return [Math.cos(a) * r, 0, Math.sin(a) * r]; }, 2);
    // the two cut faces
    for (const v of [0, 1]) grid(NR, 2, (u, w) => { const r = u * R, a = ang(v); return [Math.cos(a) * r, (v ? w : 1 - w) * H, Math.sin(a) * r]; }, 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.setAttribute('base', new THREE.Float32BufferAttribute(pos.slice(), 3));
    // split index by kind into material groups
    const tri = [[], [], []]; for (let i = 0; i < idx.length; i += 3) tri[kind[idx[i]]].push(idx[i], idx[i + 1], idx[i + 2]);
    g.setIndex([...tri[0], ...tri[1], ...tri[2]]); g.addGroup(0, tri[0].length, 0); g.addGroup(tri[0].length, tri[1].length, 1); g.addGroup(tri[0].length + tri[1].length, tri[2].length, 2);
    g.computeVertexNormals(); return g;
  }
  const baseGeo = sliceGeometry();
  // world-aligned UVs per slice position, so the whole pie reads as one continuous top
  const setUV = (geo, i) => { const th = -(i + .5) * SECT, c = Math.cos(th), sn = Math.sin(th), b = geo.attributes.base, uv = geo.attributes.uv;
    for (let k = 0; k < b.count; k++) { const x = b.getX(k), z = b.getZ(k), wx = x * c + z * sn, wz = -x * sn + z * c; uv.setXY(k, wx / (2 * R) + .5, wz / (2 * R) + .5); } uv.needsUpdate = true; return geo; };

  // ---- the pie: 7 resting slices + the active one, on an aluminium tray ----
  const pie = new THREE.Group(); world.add(pie);
  const tray = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [R + .14, 0], [R + .2, .03], [R + .22, .035], [R + .2, .02], [0, .012]].map(p => new THREE.Vector2(p[0], p[1])), 96), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d6, metalness: 1, roughness: .32 }));
  tray.receiveShadow = true; tray.castShadow = true; pie.add(tray);
  const restMats = [matPie.cheese, matPie.crust, matPie.under];
  const rest = [];
  for (let i = 0; i < N; i++) { const m = new THREE.Mesh(setUV(baseGeo.clone(), i), restMats); m.castShadow = m.receiveShadow = true; m.rotation.y = -(i + .5) * SECT; m.position.y = .013; m.scale.setScalar(.995); pie.add(m); rest.push(m); }
  let active = 0;
  const live = new THREE.Mesh(baseGeo.clone(), [matSlice.cheese, matSlice.crust, matSlice.under]); live.castShadow = live.receiveShadow = true; world.add(live);
  const posA = live.geometry.attributes.position, baseA = live.geometry.attributes.base;

  // cheese strands between the lifted slice and the pie
  const strandMat = new THREE.MeshPhysicalMaterial({ color: 0xf6e3b4, roughness: .4, sheen: .5, sheenColor: new THREE.Color(0xffffff) });
  const strands = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), 8, .008, 6), strandMat); m.visible = false; m.userData.r = .25 + i * .12; m.userData.side = i % 2 ? 1 : -1; m.userData.snap = rnd(.5, .85); world.add(m); return m; });

  // ---- state ----
  let lift = RM ? 1 : 0, fold = 0, hold = false, holdT = 0, bites = 0, introT = RM ? 1 : 0, t0 = 0, swapT = -1;
  const V = new THREE.Vector3(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), M4 = new THREE.Matrix4();
  // slice pose: in the pie → lifted, crust toward the back, tip toward the viewer and right
  function pose(k) {
    const a = -(active + .5) * SECT;
    const p0 = new THREE.Vector3(0, .013, 0), q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0));
    const p1 = new THREE.Vector3(-.5, 1.0 + fold * .05, 1.15), q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .25).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .55 - fold * .25)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.12 - fold * .1));
    const e = easeIO(k); P.lerpVectors(p0, p1, e); Q.slerpQuaternions(q0, q1, e); return [P, Q];
  }
  function deform() {
    const droop = lift * (1 - fold) * (1.1 + .12 * Math.sin(t0 * 2.2)) * (1 - bites * .14), phi = fold * 1.15;
    for (let i = 0; i < posA.count; i++) {
      let x = baseA.getX(i), y = baseA.getY(i), z = baseA.getZ(i);
      // fold: each half rotates up about the centreline
      if (phi > 0) { const s = Math.sign(z), az = Math.abs(z), soft = clamp(az / .05); const c = Math.cos(phi * soft), sn = Math.sin(phi * soft); const nz = az * c - y * sn, ny = az * sn + y * c; z = s * nz; y = ny; }
      // flop: the tip sags the further it is from the crust (held at the crust)
      const sDist = clamp((R - x) / R); y -= droop * sDist * sDist * .85; x += droop * sDist * sDist * .14;
      posA.setXYZ(i, x, y, z);
    }
    posA.needsUpdate = true; live.geometry.computeVertexNormals();
  }
  function placeStrands() {
    const k = lift; live.updateMatrixWorld();
    strands.forEach(s => { const u = s.userData; const show = k > .04 && k < u.snap && !RM; s.visible = show; if (!show) return;
      const a = -(active + .5) * SECT + u.side * SECT * .5; const pA = new THREE.Vector3(Math.cos(a) * u.r, .045, -Math.sin(a) * u.r);
      const pB = new THREE.Vector3(u.r, H, u.side * SECT * .5 * u.r).applyMatrix4(live.matrixWorld);
      const len = pA.distanceTo(pB), mid = pA.clone().lerp(pB, .5); mid.y -= len * .18;
      s.geometry.dispose(); const thin = .007 * (1 - k / u.snap) + .0015; s.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pA, mid, pB), 14, thin, 6); });
  }
  function nextSlice() { rest[active].visible = true; active = (active + 1) % N; rest[active].visible = false; setUV(live.geometry, active); bites = 0; biteU.uBites.value = 0; lift = 0; fold = 0; o.onSlice && o.onSlice(); }
  rest[active].visible = false; setUV(live.geometry, active);

  // ---- input: press & hold to fold, keep holding to bite ----
  const down = e => { if (e.button > 0) return; hold = true; holdT = 0; o.onHold && o.onHold(true); start(); };
  const up = () => { if (!hold) return; hold = false; o.onHold && o.onHold(false); };
  canvas.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', up);

  // ---- camera ----
  const target = new THREE.Vector3(.05, .42, .35);
  let az = 0;
  const placeCam = () => { const D = SMALL ? 4.9 : 4.2, A = .25 + az, El = .5; camera.position.set(target.x + Math.sin(A) * Math.cos(El) * D, target.y + Math.sin(El) * D, target.z + Math.cos(A) * Math.cos(El) * D); camera.lookAt(target); };
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .9 ? 38 : 30; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (introT < 1) { introT = Math.min(1, introT + dt / 1.0); pie.position.y = (1 - easeOut(introT)) * .5; pie.rotation.y = (1 - easeOut(introT)) * -.6; }
    if (introT >= 1 && lift < 1 && swapT < 0) lift = Math.min(1, lift + dt / 1.6);
    if (o.instant) { introT = 1; lift = 1; }
    const fTarget = hold ? 1 : 0; fold += (fTarget - fold) * (1 - Math.pow(hold ? .02 : .06, dt));
    if (hold && fold > .92) { holdT += dt; if (holdT > .55 && bites < 5) { holdT = 0; const b = bites; biteU.uBite.value[b].set(.04 + b * .17, rnd(-.02, .02), .16 + rnd(0, .03)); bites++; biteU.uBites.value = bites; o.onBite && o.onBite(bites); if (bites >= 5) swapT = 0; } }
    if (swapT >= 0) { swapT += dt; if (swapT > .9) { swapT = -1; nextSlice(); } }
    const [p, q] = pose(swapT >= 0 ? Math.max(0, 1 - swapT / .9) * lift : lift);
    live.position.copy(p); live.quaternion.copy(q); if (swapT >= 0) live.position.y += swapT * .8;
    live.visible = !(swapT > .85);
    deform(); placeStrands();
    warm.intensity = 2 + Math.sin(t0 * 7) * .15;
    az += ((RM ? 0 : Math.sin(t0 * .25) * .08) - az) * .04; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  placeCam(); renderer.compile(scene, camera); start();
  return { top: t => { paint(t); start(); }, hold: v => (v ? down({ button: 0 }) : up()), get bites() { return bites; }, _skip: () => { o.instant = true; start(); }, renderer };
}
