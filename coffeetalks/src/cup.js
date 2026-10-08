/* =====================================================================
   Coffee Talks: the 3D cappuccino for "Build Your Package".
   A porcelain cup + saucer with her logo printed on the side.
   - pick a base      → espresso pours in, crema on top
   - pick how often   → steamed milk pours a rosetta (more leaves per add-on)
   - then the foam settles and cocoa dusts her logo on top
   Bundle: kit/build3d/build.sh coffeetalks/src/cup.js coffeetalks/assets/cup.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { makeLatte, pourAt } from './latte.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

// cup profile (units: cup ≈ 1 wide)
const FOOT = .04, TOP = .62, WALL = .024;
const rOut = y => { const t = clamp((y - FOOT) / (TOP - FOOT)); return .27 + .23 * Math.pow(t, .55); };
const rIn = y => Math.max(0, rOut(y) - WALL);
const FLOOR = .085;

export async function mountCup(canvas, o = {}) {
  const A = o.assets || 'assets/', IMG = o.img || 'img/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const SPEED = +(new URLSearchParams(location.search).get('cupspeed') || 1);
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, .05, 50);
  const world = new THREE.Group(); scene.add(world);
  const loader = new THREE.TextureLoader();
  const load = (u, srgb = true) => new Promise(res => loader.load(u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
  const loadImg = u => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });

  const [env, logoTex, letters] = await Promise.all([
    new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null))),
    load(IMG + 'logo.webp'),
    loadImg(IMG + 'logo-letters.webp')
  ]);
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 2.2, 0); scene.environmentIntensity = .85; }

  // ---- lights ----
  const key = new THREE.DirectionalLight(0xfff3e6, 2.1); key.position.set(-2.2, 4.2, 2.4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .01;
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .5, far: 10 });
  const fill = new THREE.DirectionalLight(0xffe4cc, .55); fill.position.set(2.6, 1.6, 1.8);
  scene.add(key, fill, new THREE.HemisphereLight(0xfff8f0, 0xd8c6b2, .35));

  // ---- shadow catcher (the page background shows through) ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .2, color: 0x2a1a10 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfbf8f3, roughness: .2, clearcoat: 1, clearcoatRoughness: .08, sheen: .2, sheenColor: new THREE.Color(0xfff6ea), side: THREE.DoubleSide });

  // ---- saucer ----
  const sp = [[0, 0], [.46, 0], [.5, .012], [.54, .03], [.93, .085], [.965, .105], [.955, .118], [.93, .112], [.6, .07], [.36, .052], [.34, .056], [0, .056]].map(p => new THREE.Vector2(p[0], p[1]));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(sp, 128), porcelain); saucer.castShadow = saucer.receiveShadow = true; world.add(saucer);

  // ---- cup ----
  const cup = new THREE.Group(); cup.position.y = .056; world.add(cup);
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(.2, 0), new THREE.Vector2(.235, .012), new THREE.Vector2(.25, FOOT * .7)];
  for (let i = 0; i <= 24; i++) { const y = FOOT + (TOP - FOOT) * i / 24; pts.push(new THREE.Vector2(rOut(y), y)); }
  pts.push(new THREE.Vector2(rOut(TOP) - .004, TOP + .008), new THREE.Vector2(rOut(TOP) - WALL * .5, TOP + .011), new THREE.Vector2(rIn(TOP) + .002, TOP + .006));
  for (let i = 24; i >= 0; i--) { const y = FLOOR + (TOP - FLOOR) * i / 24; pts.push(new THREE.Vector2(rIn(y), y)); }
  pts.push(new THREE.Vector2(rIn(FLOOR) * .6, FLOOR - .006), new THREE.Vector2(0, FLOOR - .008));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), porcelain); body.castShadow = true; body.receiveShadow = true; cup.add(body);
  // handle (on +x)
  const hc = new THREE.CatmullRomCurve3([[rOut(.5) - .02, .5, 0], [.66, .53, 0], [.77, .43, 0], [.71, .28, 0], [.55, .2, 0], [rOut(.17) - .02, .17, 0]].map(p => new THREE.Vector3(...p)));
  const handle = new THREE.Mesh(new THREE.TubeGeometry(hc, 64, .036, 20, false), porcelain); handle.scale.z = .85; handle.castShadow = true; cup.add(handle);
  // a thin espresso-brown band under the lip, like her merch
  const band = new THREE.Mesh(new THREE.CylinderGeometry(rOut(.585) + .0015, rOut(.565) + .0015, .02, 128, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x5e3b25, roughness: .25, clearcoat: 1 }));
  band.position.y = .575; cup.add(band);

  // logo printed on the side, facing the camera
  const FACE = -.42;      // radians around y the logo faces (camera azimuth)
  if (logoTex) {
    const ya = .2, yb = .5, span = .98, nu = 40, nv = 16, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const y = ya + (yb - ya) * j / nv, a = FACE + (i / nu - .5) * span, r = rOut(y) + .0022;
      pos.push(r * Math.sin(a), y, r * Math.cos(a)); uv.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const decal = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: logoTex, transparent: true, roughness: .22, clearcoat: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    cup.add(decal);
  }

  // ---- the drink surface: latte sim (crema + microfoam) painted into a canvas, then cocoa ----
  const S = 1024, C = document.createElement('canvas'); C.width = C.height = S; const cx = C.getContext('2d');
  const surfTex = new THREE.CanvasTexture(C); surfTex.colorSpace = THREE.SRGBColorSpace; surfTex.anisotropy = 8;
  const sg = new THREE.CircleGeometry(1, 128); sg.rotateX(-Math.PI / 2);
  const base = sg.attributes.position.array.slice();
  const surface = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: surfTex, roughness: .55, envMapIntensity: .4 }));
  surface.rotation.y = FACE; surface.visible = false; surface.receiveShadow = true; cup.add(surface);
  const setDome = h => { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; p.setY(i, h * (1 - (x * x + z * z))); } p.needsUpdate = true; sg.computeVertexNormals(); };

  const SN = SMALL ? 224 : 288, sim = makeLatte(SN);
  const F = document.createElement('canvas'); F.width = F.height = SN; const fx = F.getContext('2d'); const fimg = fx.createImageData(SN, SN);
  const drawSim = () => { sim.render(fimg); fx.putImageData(fimg, 0, 0); };
  drawSim();

  // cocoa logo: grain threshold per pixel so it "dusts" in
  let LW = 0, LH = 0, la = null, lnoise = null, L = null, lx = null, lid = null;
  if (letters) {
    LW = 640; LH = Math.round(LW * letters.height / letters.width);
    const t = document.createElement('canvas'); t.width = LW; t.height = LH; const tx = t.getContext('2d'); tx.drawImage(letters, 0, 0, LW, LH);
    la = tx.getImageData(0, 0, LW, LH).data; lnoise = new Float32Array(LW * LH); for (let i = 0; i < lnoise.length; i++) lnoise[i] = Math.random() * .85 + Math.random() * .15;
    L = document.createElement('canvas'); L.width = LW; L.height = LH; lx = L.getContext('2d'); lid = lx.createImageData(LW, LH);
  }
  const specks = Array.from({ length: 900 }, () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 380; return [S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, Math.random(), .8 + Math.random() * 1.8]; });

  const st = { level: 0, settle: 0, dust: 0, leaves: 5, art: 0 };
  function paint() {
    const R = S / 2;
    cx.imageSmoothingQuality = 'high'; cx.drawImage(F, 0, 0, S, S);
    if (st.settle > 0) {
      const fg = cx.createRadialGradient(R, R, 0, R, R, 430);
      fg.addColorStop(0, 'rgba(252,246,236,1)'); fg.addColorStop(.8, 'rgba(250,242,229,.98)'); fg.addColorStop(1, 'rgba(240,226,206,0)');
      cx.globalAlpha = ease(st.settle) * .94; cx.fillStyle = fg; cx.beginPath(); cx.arc(R, R, 430 * (.55 + .45 * easeOut(st.settle)), 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
    }
    if (st.dust > 0 && L) {
      const d = st.dust * 1.08, D = lid.data;
      for (let i = 0, n = LW * LH; i < n; i++) { const al = la[i * 4 + 3]; if (al > 8 && lnoise[i] < d) { D[i * 4] = 74 + (lnoise[i] * 40 | 0); D[i * 4 + 1] = 42 + (lnoise[i] * 22 | 0); D[i * 4 + 2] = 22 + (lnoise[i] * 12 | 0); D[i * 4 + 3] = al * (.72 + .28 * ((i * 2654435761 >>> 0) % 97) / 97); } else D[i * 4 + 3] = 0; }
      lx.putImageData(lid, 0, 0); cx.drawImage(L, R - LW / 2, R - LH / 2 - 8);
      cx.fillStyle = 'rgba(80,46,24,.55)'; for (const [x, y, p, s] of specks) if (p < st.dust * .5) { cx.beginPath(); cx.arc(x, y, s, 0, Math.PI * 2); cx.fill(); }
    }
    const rim = cx.createRadialGradient(R, R, R * .86, R, R, R); rim.addColorStop(0, 'rgba(60,30,12,0)'); rim.addColorStop(1, 'rgba(60,30,12,.5)');
    cx.fillStyle = rim; cx.fillRect(0, 0, S, S);
    surfTex.needsUpdate = true;
  }
  const placeSurface = () => {
    surface.visible = st.level > FLOOR + .004;
    const y = Math.max(FLOOR + .002, st.level), r = rIn(y) - .002;
    surface.position.y = y; surface.scale.set(r, 1, r);
  };

  // ---- the steel pitcher and its stream (rig shares the surface's frame: +z = toward camera, +x = screen right) ----
  const rig = new THREE.Group(); rig.rotation.y = FACE; cup.add(rig);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xdedfe2, metalness: 1, roughness: .2, clearcoat: .6, side: THREE.DoubleSide });
  const ppts = [[0, 0], [.15, 0], [.162, .012], [.165, .06], [.158, .22], [.142, .34], [.146, .42]].map(p => new THREE.Vector2(p[0], p[1]));
  const pgeo = new THREE.LatheGeometry(ppts, 64), ppos = pgeo.attributes.position;
  for (let i = 0; i < ppos.count; i++) {
    // pull a spout out of the rim on the -x side
    const x = ppos.getX(i), y = ppos.getY(i), z = ppos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(x, z), da = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
    const w = Math.exp(-((da / .42) ** 2)) * clamp((y - .26) / .16);
    const nr = r + .09 * w * w; ppos.setXYZ(i, Math.sin(a) * nr, y + .025 * w * w, Math.cos(a) * nr);
  }
  pgeo.computeVertexNormals();
  const pitcher = new THREE.Group(), pbody = new THREE.Mesh(pgeo, steel); pbody.castShadow = true; pitcher.add(pbody);
  const phc = new THREE.CatmullRomCurve3([[.15, .36, 0], [.27, .38, 0], [.3, .22, 0], [.2, .08, 0], [.16, .07, 0]].map(p => new THREE.Vector3(...p)));
  const ph = new THREE.Mesh(new THREE.TubeGeometry(phc, 40, .022, 12, false), steel); ph.castShadow = true; pitcher.add(ph);
  const TIP = new THREE.Vector3(-.245, .445, 0), PS = 1.25;
  pitcher.scale.setScalar(PS); pitcher.visible = false; rig.add(pitcher);
  const milkMat = new THREE.MeshPhysicalMaterial({ color: 0xf6efe4, roughness: .3, clearcoat: .8, sheen: .4 });
  const espMat = new THREE.MeshPhysicalMaterial({ color: 0x3a1f0e, roughness: .12, clearcoat: 1 });
  let streamMesh = null;
  const pose = { in: 0, tilt: 0, h: .55, px: .5, py: .5, flow: 0, mat: espMat, wob: 0 };
  const _q = new THREE.Vector3();
  function placePitcher() {
    pitcher.visible = pose.in > .001;
    if (streamMesh) { streamMesh.geometry.dispose(); rig.remove(streamMesh); streamMesh = null; }
    if (!pitcher.visible) return;
    const r = rIn(Math.max(st.level, FLOOR)) - .002, lv = Math.max(st.level, FLOOR);
    const ix = (pose.px - .5) * 2 * r, iz = (pose.py - .5) * 2 * r;
    // spout tip sits up and a little to the right of where the milk lands
    const T = new THREE.Vector3(ix + .06 + .05 * pose.tilt, lv + pose.h, iz);
    pitcher.rotation.set(0, 0, pose.tilt);
    _q.copy(TIP).multiplyScalar(PS).applyAxisAngle(new THREE.Vector3(0, 0, 1), pose.tilt);
    const off = (1 - easeOut(pose.in));
    pitcher.position.set(T.x - _q.x + off * 1.4, T.y - _q.y + off * .9, T.z - _q.z);
    if (pose.flow > .02 && pose.in > .98) {
      const a = T, d = new THREE.Vector3(ix, lv, iz), w = Math.sin(t0 * 31) * .006 * pose.wob;
      const curve = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x - .05, a.y - .015, a.z), new THREE.Vector3(d.x + w, d.y + Math.min(.18, pose.h * .5), d.z), d);
      const rad = (pose.mat === milkMat ? .007 + .011 * clamp((.4 - pose.h) / .3) : .0065) * pose.flow;
      streamMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, rad, 10, false), pose.mat); rig.add(streamMesh);
    }
  }

  // ---- cocoa particles + steam ----
  const PN = 420, pp = new Float32Array(PN * 3), pv = new Float32Array(PN * 3), pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dustDot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const cocoa = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x5a3219, size: .022, map: dustDot, transparent: true, depthWrite: false, opacity: .9 }));
  cocoa.visible = false; cup.add(cocoa);
  const respawn = i => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * .34; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = .95 + Math.random() * .6; pp[i * 3 + 2] = Math.sin(a) * r; pv[i * 3 + 1] = -(.25 + Math.random() * .35); pv[i * 3] = (Math.random() - .5) * .05; pv[i * 3 + 2] = (Math.random() - .5) * .05; };
  for (let i = 0; i < PN; i++) respawn(i);
  const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const steam = Array.from({ length: 7 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff })); s.userData.ph = i / 7; cup.add(s); return s; });

  // ---- camera: slightly above, looking into the cup; drifts a touch with the pointer ----
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const target = new THREE.Vector3(0, .34, 0);
  const placeCam = () => { const A0 = FACE + az, E = .66 + el, D = SMALL ? 4.55 : 4.35; camera.position.set(Math.sin(A0) * Math.cos(E) * D, target.y + Math.sin(E) * D, Math.cos(A0) * Math.cos(E) * D); camera.lookAt(target); };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .12; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.1; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- sequencer: each step gets (progress, dt). The latte sim runs inside the pour steps. ----
  let steps = [], cur = null, curT = 0, dusting = false, simDirty = false;
  const run = list => { steps = list; cur = null; };
  const step = (d, fn, done) => ({ d, fn, done });
  const lerpOf = (key, to, e = ease) => { let from; return t => { if (from === undefined) from = st[key]; st[key] = from + (to - from) * e(t); }; };
  const poseTo = (o, e = ease) => { let from; return t => { if (!from) from = { ...pose }; for (const k in o) if (typeof o[k] === 'number') pose[k] = from[k] + (o[k] - from[k]) * e(t); else pose[k] = o[k]; }; };
  const simRun = (phase, nominal) => { let last = 0; return (t, dt) => { const n = Math.max(1, Math.ceil(dt / (1 / 50))); for (let k = 1; k <= n; k++) { const tt = last + (t - last) * k / n; const p = pourAt(phase, tt, st.leaves); sim.step(Math.min(dt / n, 1 / 50) || nominal / 60, p); if (phase !== 'base') { pose.px = p.x; pose.py = p.y; } } last = t; simDirty = true; }; };
  const ESP = FLOOR + .16;
  let want = { base: false, size: 0, shots: 0 }, hasEsp = false;
  function set(w) {
    want = { base: !!w.base, size: w.size || 0, shots: w.shots || 0 };
    const leaves = Math.min(9, 4 + want.shots), L = [];
    const exit = step(.5, poseTo({ in: 0, tilt: 0, flow: 0 }));
    if (!want.base) { L.push(exit, step(.5, t => { lerpOf('level', 0)(t); st.settle = st.dust = 0; }, () => { sim.clear(); simDirty = true; hasEsp = false; })); run(L); return; }
    if (!hasEsp) {
      L.push(step(0, () => Object.assign(pose, { mat: espMat, h: .44, px: .5, py: .52, flow: 0, wob: .3 })),
        step(.55, poseTo({ in: 1, tilt: .75 })),
        step(1.3, (() => { const lv = lerpOf('level', ESP, t => t), fl = poseTo({ flow: 1, tilt: 1.05 }, easeOut); return t => { lv(t); fl(Math.min(1, t * 4)); if (t > .85) pose.flow = (1 - t) / .15; }; })()),
        step(0, () => { hasEsp = true; pose.flow = 0; }), exit);
    }
    if (!want.size) {
      if (st.level > ESP + .01) L.push(step(.6, t => { lerpOf('level', ESP)(t); sim.fade(.9); st.settle *= .9; st.dust *= .9; simDirty = true; }, () => { sim.clear(); st.settle = st.dust = 0; simDirty = true; }));
      run(L); return;
    }
    const lvl = Math.min(TOP - .04, ESP + .1 + want.size * .32);
    // a fresh pour every time the package changes: give the old art a stir first
    L.push(step(.4, () => { sim.fade(.86); st.settle *= .85; st.dust *= .8; simDirty = true; }, () => { sim.clear(); st.settle = st.dust = 0; st.leaves = leaves; simDirty = true; }),
      step(0, () => Object.assign(pose, { mat: milkMat, h: .42, px: .5, py: .5, flow: 0, wob: .5 })),
      step(.55, poseTo({ in: 1, tilt: .8 })),
      step(.8, (() => { const lv = lerpOf('level', lvl - .045, t => t), fl = poseTo({ flow: .75, tilt: 1.0 }, easeOut), sr = simRun('base', .8); return (t, dt) => { lv(t); fl(Math.min(1, t * 3)); sr(t, dt); }; })()),
      step(.3, (() => { const fl = poseTo({ h: .13, flow: 1, tilt: 1.12 }), sr = simRun('base', .3); return (t, dt) => { fl(t); sr(t, dt); }; })()),
      step(2.3, (() => { const lv = lerpOf('level', lvl, t => t), sr = simRun('art', 2.3); return (t, dt) => { lv(t); sr(t, dt); pose.tilt = 1.12 + .12 * t; }; })()),
      step(.45, (() => { const sr = simRun('pull', .45); return (t, dt) => { sr(t, dt); pose.h = .13 + .12 * t; pose.flow = 1 - .55 * t; }; })()),
      step(0, () => { pose.flow = 0; }), exit,
      step(1.3, () => {}),
      step(.8, lerpOf('settle', 1)), step(0, () => { dusting = true; cocoa.visible = true; }), step(1.6, lerpOf('dust', 1, t => t)), step(.8, () => {}, () => { dusting = false; }));
    run(L);
  }

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  function advance(dt) {
    let dirty = false;
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; }
      const d = RM ? 0 : cur.d; curT += dt;
      const p = d ? clamp(curT / d) : 1; cur.fn(p, RM ? cur.d : dt); dirty = true;
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
    return dirty;
  }
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1) * SPEED; last = now; t0 += dt;
    const dirty = advance(dt);
    if (simDirty) { drawSim(); simDirty = false; }
    if (dirty) { placeSurface(); setDome(.012 * st.settle); paint(); }
    placePitcher();
    if (cocoa.visible) {
      let alive = 0;
      for (let i = 0; i < PN; i++) { pp[i * 3] += pv[i * 3] * dt; pp[i * 3 + 1] += pv[i * 3 + 1] * dt * 2.2; pp[i * 3 + 2] += pv[i * 3 + 2] * dt; if (pp[i * 3 + 1] < st.level) { if (dusting) respawn(i); else pp[i * 3 + 1] = -9; } if (pp[i * 3 + 1] > -1) alive++; }
      pg.attributes.position.needsUpdate = true; if (!alive && !dusting) { cocoa.visible = false; for (let i = 0; i < PN; i++) respawn(i); }
    }
    const hot = st.level > FLOOR + .02 ? 1 : 0;
    steam.forEach(s => { const ph = (t0 * .16 + s.userData.ph) % 1; s.position.set(Math.sin(ph * 9 + s.userData.ph * 20) * .08, st.level + .05 + ph * .75, Math.cos(ph * 7 + s.userData.ph * 13) * .06); const sc = .22 + ph * .45; s.scale.set(sc, sc, 1); s.material.opacity = hot * .3 * Math.sin(ph * Math.PI) * (1 - pose.in * .8); });
    az += (taz + Math.sin(t0 * .25) * .03 - az) * .05; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  paint(); placeSurface(); placeCam();
  renderer.compile(scene, camera); renderer.render(scene, camera); start();
  return { set, state: st, pose, renderer };
}
