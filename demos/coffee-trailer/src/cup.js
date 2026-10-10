/* =====================================================================
   Sillbird (fictional concept by ElaSystems): the 3D cup for "Build your cup".
   three.js, studio HDRI, physical materials,
   lathe-turned geometry, a transparent shadow catcher so the card shows through.
   - iced: a clear tapered cup; the drink pours in layer by layer (clipping plane reveals a
     stacked colour column bottom → top), ice drops in, cold foam settles, lid + straw go on
   - hot: a paper cup with a kraft sleeve printed سلبرد sillbird, steam rising
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh demos/coffee-trailer/src/cup.js demos/coffee-trailer/assets/cup.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const back = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// iced cup profile (units: cup ≈ 1.25 tall)
const H = 1.22, R0 = .285, R1 = .405, WALL = .012, FLOOR = .03, TOPL = H - .07;
const rOut = y => R0 + (R1 - R0) * clamp(y / H);
const rIn = y => rOut(y) - WALL;

export async function mountCup(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .05, 50);
  const world = new THREE.Group(); scene.add(world);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 2.4, 0); scene.environmentIntensity = .95; }
  try { await Promise.all([document.fonts.load('80px Gloock'), document.fonts.load('700 60px Ruqaa')]); } catch (e) {}

  // ---- lights: warm key from the window side, cool rim ----
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-2.4, 4.4, 2.6);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 7; key.shadow.bias = -.0004; key.shadow.normalBias = .01;
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.6, bottom: -1.4, near: .5, far: 12 });
  const rim = new THREE.DirectionalLight(0xd9e8ff, 1.1); rim.position.set(2.8, 2.2, -2.4);
  const fill = new THREE.DirectionalLight(0xffd9b0, .45); fill.position.set(2.2, 1.2, 2.4);
  scene.add(key, rim, fill, new THREE.HemisphereLight(0xfff6ea, 0x3a2418, .4));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .32, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  /* ================= ICED ================= */
  const iced = new THREE.Group(); world.add(iced);
  // liquid column: one lathe at full height, vertical colour texture, clipped at the fill level
  const LC = document.createElement('canvas'); LC.width = 256; LC.height = 1024; const lx = LC.getContext('2d');
  const liqTex = new THREE.CanvasTexture(LC); liqTex.colorSpace = THREE.SRGBColorSpace; liqTex.wrapS = THREE.RepeatWrapping;
  const level = new THREE.Plane(new THREE.Vector3(0, -1, 0), FLOOR);
  const liqMat = new THREE.MeshPhysicalMaterial({ map: liqTex, roughness: .32, clearcoat: .4, clearcoatRoughness: .2, clippingPlanes: [level], side: THREE.FrontSide, transparent: true, opacity: .86 });
  const lp = [new THREE.Vector2(0, FLOOR)];
  for (let i = 0; i <= 40; i++) { const y = FLOOR + (TOPL - FLOOR) * i / 40; lp.push(new THREE.Vector2(rIn(y) - .006, y)); }
  const lg = new THREE.LatheGeometry(lp, 96);
  { const p = lg.attributes.position, uv = lg.attributes.uv; for (let i = 0; i < p.count; i++) { uv.setY(i, (p.getY(i) - FLOOR) / (TOPL - FLOOR)); } }
  const liquid = new THREE.Mesh(lg, liqMat); liquid.renderOrder = 1; iced.add(liquid);
  // the surface at the level (colour of whatever layer is on top)
  const surfMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .28, clearcoat: .6, transparent: true, opacity: .9 });
  const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), surfMat); surf.renderOrder = 1; iced.add(surf);
  // cold foam: a soft dome on top
  const foamMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf6ee, roughness: .9, sheen: .6, sheenColor: new THREE.Color(0xffffff) });
  const foamG = new THREE.LatheGeometry([[0, 0], [.95, 0], [1, .02], [.96, .08], [.7, .14], [.3, .17], [0, .175]].map(p => new THREE.Vector2(p[0], p[1])), 96);
  const foam = new THREE.Mesh(foamG, foamMat); foam.visible = false; foam.renderOrder = 2; iced.add(foam);
  // clear cup
  const plastic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .16, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const cp = [new THREE.Vector2(0, 0), new THREE.Vector2(R0 - .01, 0), new THREE.Vector2(R0, .01)];
  for (let i = 1; i <= 30; i++) { const y = H * i / 30; cp.push(new THREE.Vector2(rOut(y), y)); }
  cp.push(new THREE.Vector2(rOut(H) + .008, H + .004), new THREE.Vector2(rOut(H) + .004, H + .014), new THREE.Vector2(rIn(H), H + .006));
  for (let i = 30; i >= 0; i--) { const y = FLOOR * .6 + (H - FLOOR * .6) * i / 30; cp.push(new THREE.Vector2(rIn(y), y)); }
  cp.push(new THREE.Vector2(0, FLOOR * .6));
  const cupMesh = new THREE.Mesh(new THREE.LatheGeometry(cp, 128), plastic); cupMesh.renderOrder = 4; iced.add(cupMesh);
  const shadowProxy = new THREE.Mesh(new THREE.CylinderGeometry(R1 * .9, R0, H, 32), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  shadowProxy.position.y = H / 2; shadowProxy.castShadow = true; iced.add(shadowProxy);
  // printed logo on the front of the cup
  const FACE = -.35;
  const decalTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 150px Ruqaa, serif'; x.fillText('سلبرد', 512, 190);
    x.font = '150px Gloock, Georgia, serif'; x.fillText('sillbird', 512, 350);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  {
    const ya = .38, yb = .78, span = 1.15, nu = 40, nv = 12, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const y = ya + (yb - ya) * j / nv, a = FACE + (i / nu - .5) * span, r = rOut(y) + .0025; pos.push(r * Math.sin(a), y, r * Math.cos(a)); uv.push(i / nu, j / nv); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const decal = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: decalTex, transparent: true, roughness: .3, clearcoat: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.renderOrder = 5; iced.add(decal);
  }
  // flat lid + straw
  const lid = new THREE.Group(); iced.add(lid);
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .42, roughness: .08, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const lidG = new THREE.LatheGeometry([[0, .03], [R1 - .02, .03], [R1 + .012, .022], [R1 + .02, .0], [R1 + .012, -.02], [R1 - .004, -.02], [R1 - .004, .0]].map(p => new THREE.Vector2(p[0], p[1])), 96);
  const lidM = new THREE.Mesh(lidG, lidMat); lidM.renderOrder = 6; lid.add(lidM);
  const strawMat = new THREE.MeshPhysicalMaterial({ color: 0x15110f, roughness: .35, clearcoat: .6 });
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.62, 24, 1, true), strawMat); straw.castShadow = true;
  const strawG = new THREE.Group(); strawG.add(straw); straw.position.y = .81; strawG.rotation.z = -.16; strawG.rotation.x = .08; strawG.position.set(.07, .04, -.03); iced.add(strawG);
  // ice cubes
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xf2f8ff, transparent: true, opacity: .62, roughness: .08, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.8, depthWrite: false });
  const cubes = Array.from({ length: 7 }, (_, i) => { const s = .16 + (i % 3) * .025; const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 3, .035), iceMat); m.renderOrder = 3; iced.add(m); m.userData = { s, home: new THREE.Vector3(), rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3), t: 1 }; return m; });
  // fruit for refreshers
  const fruitMat = new THREE.MeshPhysicalMaterial({ color: 0xd23a52, roughness: .35, clearcoat: .6, transparent: true, opacity: .92 });
  const fruits = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .025, 28), fruitMat); m.renderOrder = 2; m.visible = false; iced.add(m); return m; });
  // the pour stream
  const streamMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, clearcoat: .8 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.028, .02, 1, 16, 1, true), streamMat); stream.visible = false; iced.add(stream);

  /* ================= HOT ================= */
  const hot = new THREE.Group(); hot.visible = false; world.add(hot);
  const paper = new THREE.MeshPhysicalMaterial({ color: 0xfbf7f0, roughness: .65, sheen: .3 });
  const HH = 1.05, h0 = .27, h1 = .39, hr = y => h0 + (h1 - h0) * clamp(y / HH);
  const pp = [new THREE.Vector2(0, 0), new THREE.Vector2(h0, 0)]; for (let i = 1; i <= 20; i++) { const y = HH * i / 20; pp.push(new THREE.Vector2(hr(y), y)); }
  pp.push(new THREE.Vector2(hr(HH) - .01, HH)); pp.push(new THREE.Vector2(0, HH));
  const pcup = new THREE.Mesh(new THREE.LatheGeometry(pp, 96), paper); pcup.castShadow = true; hot.add(pcup);
  const sleeveTex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#6b4a33'; x.fillRect(0, 0, 2048, 400);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${Math.random() > .5 ? '255,230,200' : '30,15,5'},${Math.random() * .05})`; x.fillRect(Math.random() * 2048, Math.random() * 400, 2, 2); }
    x.fillStyle = '#f4ede3'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '128px Gloock, Georgia, serif'; x.fillText('sillbird', 1550, 222);
    x.fillStyle = '#e3c587'; x.font = '700 120px Ruqaa, serif'; x.fillText('سلبرد', 1205, 210);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(hr(.66) + .006, hr(.34) + .006, .32, 96, 1, true), new THREE.MeshPhysicalMaterial({ map: sleeveTex, roughness: .85 }));
  sl.position.y = .5; sl.rotation.y = FACE + Math.PI / 2 + .25; hot.add(sl);
  const hlid = new THREE.Mesh(new THREE.LatheGeometry([[0, .07], [.2, .075], [.25, .06], [h1 - .02, .05], [h1 + .02, .03], [h1 + .025, 0], [h1 - .004, -.01]].map(p => new THREE.Vector2(p[0], p[1])), 96),
    new THREE.MeshPhysicalMaterial({ color: 0x1d1a18, roughness: .4, clearcoat: .5 }));
  hlid.position.y = HH; hlid.castShadow = true; hot.add(hlid);
  const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const steam = Array.from({ length: 8 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.ph = i / 8; hot.add(s); return s; });

  /* ================= state ================= */
  const st = { level: FLOOR, foam: 0, lidUp: 0, strawUp: 0, iceIn: 1, hotMix: 0, pour: 0 };
  let stack = [], topColor = new THREE.Color(0xffffff);
  function paintColumn(layers) {
    // layers: [{ c: [a, b], h }] bottom → top, h sums to 1
    const W = LC.width, Hc = LC.height; lx.clearRect(0, 0, W, Hc);
    let y = Hc; stack = [];
    layers.forEach((L, i) => {
      const h = L.h * Hc, g = lx.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, L.c[1]); g.addColorStop(1, L.c[0]);
      lx.fillStyle = g; lx.fillRect(0, y - h, W, h + 2); stack.push({ from: (Hc - y) / Hc, to: (Hc - y + h) / Hc, c: L.c[0] }); y -= h;
    });
    // soft swirls where layers meet (matcha bleeding into milk, fruit into ice)
    let yy = Hc;
    layers.forEach((L, i) => { yy -= L.h * Hc; if (i === layers.length - 1) return; const nc = layers[i + 1].c[0];
      for (let k = 0; k < 26; k++) { const x = Math.random() * W, w = 30 + Math.random() * 90, hh = 6 + Math.random() * 26; lx.globalAlpha = .25 + Math.random() * .35; lx.fillStyle = Math.random() > .5 ? nc : L.c[0]; lx.beginPath(); lx.ellipse(x, yy + (Math.random() - .5) * 26, w, hh, 0, 0, Math.PI * 2); lx.fill(); }
      lx.globalAlpha = 1; });
    liqTex.needsUpdate = true;
  }
  const colorAt = f => { for (const s of stack) if (f <= s.to + 1e-4) return s.c; return stack.length ? stack[stack.length - 1].c : '#ffffff'; };
  function placeIce() {
    const lvl = st.level;
    cubes.forEach((m, i) => {
      const u = m.userData, a = i / cubes.length * Math.PI * 2 + i * 1.7, rr = .1 + (i % 3) * .055;
      const restY = i < 4 ? Math.max(FLOOR + .1, lvl - u.s * .18) : Math.max(FLOOR + .1, lvl - .16 - (i % 3) * .09);
      u.home.set(Math.cos(a) * rr, restY, Math.sin(a) * rr);
      const t = u.t, drop = 1 - back(clamp(t));
      m.position.set(u.home.x, u.home.y + drop * 1.1, u.home.z);
      m.rotation.set(u.rot.x + drop * 2, u.rot.y + t * .4, u.rot.z);
      m.visible = st.iceIn > .02 && t > 0; m.scale.setScalar(Math.max(.001, st.iceIn));
    });
  }
  function apply() {
    const lv = clamp(st.level, FLOOR, TOPL);
    level.constant = lv;
    const f = (lv - FLOOR) / (TOPL - FLOOR);
    surf.visible = lv > FLOOR + .005; surf.position.y = lv; const r = rIn(lv) - .007; surf.scale.set(r, 1, r);
    surfMat.color.set(colorAt(f));
    foam.visible = st.foam > .01; foam.position.y = lv - .005; foam.scale.set(r * .99, st.foam * 1.1, r * .99);
    lid.position.y = H + .006 + st.lidUp * .55; lid.rotation.z = st.lidUp * .35; lid.position.x = st.lidUp * .35;
    strawG.position.y = .04 + st.strawUp * 1.2; strawG.visible = st.strawUp < .98;
    stream.visible = st.pour > .02; if (stream.visible) { const top = H + .7, len = top - lv; stream.scale.set(st.pour, len, st.pour); stream.position.set(-.04, lv + len / 2, .02); streamMat.color.set(colorAt(Math.min(1, f + .02))); }
    placeIce();
    iced.visible = st.hotMix < .999; hot.visible = st.hotMix > .001;
    const si = 1 - ease(st.hotMix), sh = ease(st.hotMix);
    iced.scale.setScalar(Math.max(.001, si)); iced.rotation.y = st.hotMix * 1.6;
    hot.scale.setScalar(Math.max(.001, back(sh))); hot.rotation.y = (1 - sh) * -1.6;
  }

  // fruit + ice config per drink
  function arrangeExtras(w) {
    fruits.forEach((m, i) => { m.visible = !!w.fruit; if (!w.fruit) return; fruitMat.color.set(w.fruit); const a = i * 1.26 + .4, rr = .08 + (i % 2) * .12; m.position.set(Math.cos(a + .6) * (rIn(FLOOR + .15 + i * .17) - .1), FLOOR + .15 + i * .17, Math.sin(a + .6) * (rIn(FLOOR + .15 + i * .17) - .1)); m.rotation.set(1.2 + i * .4, i, .3 * i); });
  }

  /* ================= sequencer ================= */
  let steps = [], cur = null, curT = 0;
  const run = list => { steps = list; cur = null; };
  const step = (d, fn, done) => ({ d, fn, done });
  const to = (k, v, e = ease) => { let from; return t => { if (from === undefined) from = st[k]; st[k] = from + (v - from) * e(t); }; };
  let want = null, first = true;
  function set(w) {
    // w: { layers: [{c:[a,b], h}], hot, foam, fruit }
    const prev = want; want = w;
    const L = [];
    if (w.hot) { L.push(step(.8, to('hotMix', 1, t => t))); run(L); return; }
    if (prev && prev.hot) L.push(step(.7, to('hotMix', 0, t => t)));
    const sameDrink = prev && !prev.hot && JSON.stringify(prev.layers) === JSON.stringify(w.layers) && prev.fruit === w.fruit;
    if (sameDrink && !first) {
      // only toppings changed: foam in/out
      L.push(step(.6, t => { cubes.forEach((c, i) => { c.userData.t = Math.max(c.userData.t, clamp(t * 1.6 - i * .09)); }); }), step(.7, to('foam', w.foam ? 1 : 0, w.foam ? back : ease)));
      run(L); return;
    }
    first = false;
    L.push(step(.45, t => { to('lidUp', 1)(t); to('strawUp', 1)(t); }),
      step(.5, t => { to('level', FLOOR)(t); to('foam', 0)(t); to('iceIn', 0)(t); }),
      step(0, () => { paintColumn(w.layers); arrangeExtras(w); cubes.forEach(c => c.userData.t = 0); st.iceIn = 1; streamMat.color.set(w.layers[0].c[0]); }),
      step(.25, to('pour', 1, easeOut)),
      step(1.5, (() => { const lv = to('level', TOPL - .05, t => t); return t => lv(t); })()),
      step(.25, to('pour', 0)),
      step(.9, t => { cubes.forEach((c, i) => { c.userData.t = clamp(t * 1.6 - i * .09); }); }),
      step(w.foam ? .7 : 0, to('foam', w.foam ? 1 : 0, back)),
      step(.45, t => { to('lidUp', 0, easeOut)(t); }),
      step(.55, to('strawUp', 0, back)));
    run(L);
  }

  /* ================= camera + loop ================= */
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const target = new THREE.Vector3(0, .72, 0);
  const placeCam = () => { const A0 = FACE + az + Math.sin(t0 * .35) * .12, E = .34 + el, D = SMALL ? 5.1 : 4.95; camera.position.set(Math.sin(A0) * Math.cos(E) * D, target.y + Math.sin(E) * D, Math.cos(A0) * Math.cos(E) * D); camera.lookAt(target); };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .5; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.18; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();
  function advance(dt) {
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; }
      const d = RM ? 0 : cur.d; curT += dt; const p = d ? clamp(curT / d) : 1; cur.fn(p, dt);
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
  }
  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .2); last = now; t0 += dt;
    advance(dt); apply();
    cubes.forEach((c, i) => { if (c.userData.t >= 1) c.position.y += Math.sin(t0 * 1.6 + i) * .006; });
    steam.forEach(s => { const ph = (t0 * .18 + s.userData.ph) % 1; s.position.set(Math.sin(ph * 9 + s.userData.ph * 20) * .08, HH + .12 + ph * .8, Math.cos(ph * 7 + s.userData.ph * 13) * .06); const sc = .22 + ph * .5; s.scale.set(sc, sc, 1); s.material.opacity = .32 * Math.sin(ph * Math.PI); });
    az += (taz - az) * .05; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  apply(); placeCam(); renderer.compile(scene, camera); renderer.render(scene, camera); start();
  // view(): aim the camera (used for the stills on the page); parts: for posed stills
  const view = (a = 0, e = 0) => { taz = az = a; tel = el = e; };
  return { set, state: st, renderer, view, parts: { lid, strawG, stream } };
}
