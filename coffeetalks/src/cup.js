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

  // ---- the drink surface: a canvas we paint (crema, rosetta, foam, cocoa logo) ----
  const S = 1024, C = document.createElement('canvas'); C.width = C.height = S; const cx = C.getContext('2d');
  const surfTex = new THREE.CanvasTexture(C); surfTex.colorSpace = THREE.SRGBColorSpace; surfTex.anisotropy = 8;
  const sg = new THREE.CircleGeometry(1, 128); sg.rotateX(-Math.PI / 2);
  const base = sg.attributes.position.array.slice();
  const surface = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: surfTex, roughness: .62, envMapIntensity: .35 }));
  surface.rotation.y = FACE; surface.visible = false; surface.receiveShadow = true; cup.add(surface);
  const setDome = h => { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; p.setY(i, h * (1 - (x * x + z * z))); } p.needsUpdate = true; sg.computeVertexNormals(); };

  // crema mottling, made once
  const N = document.createElement('canvas'); N.width = N.height = 256; const nx = N.getContext('2d'); const nd = nx.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const x = i % 256, y = i / 256 | 0, v = 128 + 40 * Math.sin(x * .09 + Math.sin(y * .05) * 3) * Math.cos(y * .07 + Math.sin(x * .04) * 2) + (Math.random() - .5) * 60; nd.data[i * 4] = nd.data[i * 4 + 1] = nd.data[i * 4 + 2] = v; nd.data[i * 4 + 3] = 255; }
  nx.putImageData(nd, 0, 0);

  // cocoa logo: grain threshold per pixel so it "dusts" in
  let LW = 0, LH = 0, la = null, lnoise = null, L = null, lx = null, lid = null;
  if (letters) {
    LW = 640; LH = Math.round(LW * letters.height / letters.width);
    const t = document.createElement('canvas'); t.width = LW; t.height = LH; const tx = t.getContext('2d'); tx.drawImage(letters, 0, 0, LW, LH);
    la = tx.getImageData(0, 0, LW, LH).data; lnoise = new Float32Array(LW * LH); for (let i = 0; i < lnoise.length; i++) lnoise[i] = Math.random() * .85 + Math.random() * .15;
    L = document.createElement('canvas'); L.width = LW; L.height = LH; lx = L.getContext('2d'); lid = lx.createImageData(LW, LH);
  }
  const specks = Array.from({ length: 900 }, () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 380; return [S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, Math.random(), .8 + Math.random() * 1.8]; });

  const st = { level: 0, crema: 0, art: 0, leaves: 5, settle: 0, dust: 0 };
  function leaf(y, w, h, k) {
    // a rosetta leaf: a crescent between two half-ellipses
    cx.beginPath(); cx.ellipse(S / 2, y, w * k, h * k, 0, 0, Math.PI); cx.ellipse(S / 2, y - h * .5 * k, w * .9 * k, h * .78 * k, 0, Math.PI, 0, true); cx.closePath(); cx.fill();
  }
  function paint() {
    const R = S / 2;
    cx.clearRect(0, 0, S, S);
    // crema
    const g = cx.createRadialGradient(R, R * .96, 0, R, R, R);
    g.addColorStop(0, '#a86a34'); g.addColorStop(.5, '#84481f'); g.addColorStop(.84, '#55290f'); g.addColorStop(1, '#371a08');
    cx.fillStyle = g; cx.fillRect(0, 0, S, S);
    cx.globalAlpha = .22; cx.globalCompositeOperation = 'overlay'; cx.drawImage(N, 0, 0, S, S); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    // rosetta (white microfoam), poured bottom → top, then the pull-through
    if (st.art > 0) {
      const n = st.leaves, a = st.art * (n + 2);
      cx.save(); cx.filter = 'blur(1.5px)'; cx.fillStyle = '#fbf3e6'; cx.shadowColor = 'rgba(255,248,236,.6)'; cx.shadowBlur = 6;
      cx.globalAlpha = 1 - st.settle * .82;
      // base blob
      const b = clamp(a); if (b > 0) { cx.beginPath(); cx.ellipse(R, R + 250, 210 * easeOut(b), 120 * easeOut(b), 0, 0, Math.PI * 2); cx.fill(); }
      for (let i = 0; i < n; i++) { const k = clamp(a - 1 - i * .85); if (k <= 0) break; const f = i / Math.max(1, n - 1); leaf(R + 230 - f * 420, 300 - f * 175, 92 - f * 38, easeOut(k)); }
      const hk = clamp(a - n - .3); if (hk > 0) { cx.beginPath(); cx.ellipse(R, R - 230, 70 * easeOut(hk), 58 * easeOut(hk), 0, 0, Math.PI * 2); cx.fill(); }
      const pk = clamp((a - n - 1) * 1.3); if (pk > 0) { cx.strokeStyle = '#a4642f'; cx.lineWidth = 9; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(R, R - 290); cx.lineTo(R, R - 290 + 640 * pk); cx.stroke(); }
      cx.restore();
    }
    // the foam settles into a smooth white field for the stencil
    if (st.settle > 0) {
      const fg = cx.createRadialGradient(R, R, 0, R, R, 430);
      fg.addColorStop(0, 'rgba(252,246,236,1)'); fg.addColorStop(.8, 'rgba(250,242,229,.98)'); fg.addColorStop(1, 'rgba(240,226,206,0)');
      cx.globalAlpha = ease(st.settle) * .93; cx.fillStyle = fg; cx.beginPath(); cx.arc(R, R, 430 * (.6 + .4 * easeOut(st.settle)), 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
    }
    // cocoa dusting through her logo stencil
    if (st.dust > 0 && L) {
      const d = st.dust * 1.08, D = lid.data;
      for (let i = 0, n = LW * LH; i < n; i++) { const al = la[i * 4 + 3]; if (al > 8 && lnoise[i] < d) { D[i * 4] = 74 + (lnoise[i] * 40 | 0); D[i * 4 + 1] = 42 + (lnoise[i] * 22 | 0); D[i * 4 + 2] = 22 + (lnoise[i] * 12 | 0); D[i * 4 + 3] = al * (.72 + .28 * ((i * 2654435761 >>> 0) % 97) / 97); } else D[i * 4 + 3] = 0; }
      lx.putImageData(lid, 0, 0); cx.drawImage(L, R - LW / 2, R - LH / 2 - 8);
      cx.fillStyle = 'rgba(80,46,24,.55)'; for (const [x, y, p, s] of specks) if (p < st.dust * .5) { cx.beginPath(); cx.arc(x, y, s, 0, Math.PI * 2); cx.fill(); }
    }
    // dark rim where the drink meets the cup
    const rim = cx.createRadialGradient(R, R, R * .86, R, R, R); rim.addColorStop(0, 'rgba(60,30,12,0)'); rim.addColorStop(1, 'rgba(60,30,12,.55)');
    cx.fillStyle = rim; cx.fillRect(0, 0, S, S);
    surfTex.needsUpdate = true;
  }
  const placeSurface = () => {
    surface.visible = st.level > FLOOR + .004;
    const y = Math.max(FLOOR + .002, st.level), r = rIn(y) - .002;
    surface.position.y = y; surface.scale.set(r, 1, r);
  };

  // ---- pour stream + cocoa particles + steam ----
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.011, .015, 1, 16, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x3b2314, roughness: .15, clearcoat: 1 }));
  stream.visible = false; cup.add(stream);
  const setStream = (on, col, top = 2.4) => { stream.visible = on; if (!on) return; stream.material.color.set(col); const y0 = Math.max(st.level, FLOOR); stream.scale.y = top - y0; stream.position.set(-.06, (top + y0) / 2, .04); };

  const PN = 420, pp = new Float32Array(PN * 3), pv = new Float32Array(PN * 3), pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dustDot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const cocoa = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x5a3219, size: .022, map: dustDot, transparent: true, depthWrite: false, opacity: .9 }));
  cocoa.visible = false; cup.add(cocoa);
  const respawn = i => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * .34; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = .95 + Math.random() * .6; pp[i * 3 + 2] = Math.sin(a) * r; pv[i * 3 + 1] = -(.25 + Math.random() * .35); pv[i * 3] = (Math.random() - .5) * .05; pv[i * 3 + 2] = (Math.random() - .5) * .05; };
  for (let i = 0; i < PN; i++) respawn(i);

  const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const steam = Array.from({ length: 7 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff })); s.userData.ph = i / 7; cup.add(s); return s; });

  // ---- camera: slightly above, looking into the cup; drifts with the pointer ----
  let az = 0, el = 0, taz = 0, tel = 0;
  const target = new THREE.Vector3(0, .24, 0);
  const placeCam = () => { const A0 = FACE + az, E = .64 + el, D = SMALL ? 4.05 : 3.85; camera.position.set(Math.sin(A0) * Math.cos(E) * D, target.y + Math.sin(E) * D, Math.cos(A0) * Math.cos(E) * D); camera.lookAt(target); };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .12; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.1; }, { passive: true });

  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- sequencer: each change queues pour → art → settle → dust ----
  let steps = [], cur = null, curT = 0, dusting = false;
  const run = list => { steps = list; cur = null; };
  const step = (d, fn, done) => ({ d: RM ? 0 : d, fn, done });
  const tw = (key, to, d, e = ease) => { let from; return step(d, t => { if (from === undefined) from = st[key]; st[key] = from + (to - from) * e(t); }); };
  const par = (d, ...fs) => step(RM ? 0 : d, t => fs.forEach(f => f(t)));
  const lerpKey = (key, to, e = ease) => { let from; return t => { if (from === undefined) from = st[key]; st[key] = from + (to - from) * e(t); }; };
  const ESP = FLOOR + .16;
  let want = { base: false, size: 0, shots: 0 };
  function set(w) {
    const prev = want; want = { base: !!w.base, size: w.size || 0, shots: w.shots || 0 };
    const leaves = Math.min(9, 4 + want.shots);
    const L = [];
    if (!want.base) { L.push(par(.5, lerpKey('level', 0), lerpKey('art', 0), lerpKey('settle', 0), lerpKey('dust', 0)), step(0, () => { st.crema = 0; })); run(L); return; }
    if (st.crema < 1) L.push(step(0, () => setStream(true, 0x3b2314)), par(1.1, lerpKey('level', ESP), lerpKey('crema', 1)), step(0, () => setStream(false)));
    if (!want.size) { if (st.art > 0 || st.level > ESP + .01) L.push(par(.6, lerpKey('level', ESP), lerpKey('art', 0), lerpKey('settle', 0), lerpKey('dust', 0))); run(L); return; }
    const lvl = Math.min(TOP - .035, ESP + .1 + want.size * .32);
    const changed = leaves !== st.leaves || st.art < 1 || Math.abs(st.level - lvl) > .005;
    if (changed) {
      if (st.art > 0) L.push(par(.35, lerpKey('settle', 0), lerpKey('dust', 0), lerpKey('art', 0)));
      L.push(step(0, () => { st.leaves = leaves; setStream(true, 0xf4ebdd); }), par(1.7, lerpKey('level', lvl, easeOut), lerpKey('art', 1, t => t)), step(0, () => setStream(false)));
    }
    L.push(step(.35, () => {}), par(.7, lerpKey('settle', 1)), step(0, () => { dusting = true; cocoa.visible = true; }), par(1.6, lerpKey('dust', 1, t => t)), step(.8, () => {}, () => { dusting = false; }));
    run(L);
  }

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0, t0 = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1) * SPEED; last = now; t0 += dt;
    // sequencer
    let dirty = false;
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; }
      curT += dt; const p = cur.d ? clamp(curT / cur.d) : 1; cur.fn(p); dirty = true;
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM) continue; }
      break;
    }
    if (stream.visible) setStream(true, stream.material.color.getHex());
    if (dirty) { placeSurface(); setDome(.012 * st.settle + .006 * st.art); paint(); }
    // cocoa falling
    if (cocoa.visible) {
      let alive = 0;
      for (let i = 0; i < PN; i++) { pp[i * 3] += pv[i * 3] * dt; pp[i * 3 + 1] += pv[i * 3 + 1] * dt * 2.2; pp[i * 3 + 2] += pv[i * 3 + 2] * dt; if (pp[i * 3 + 1] < st.level) { if (dusting) respawn(i); else pp[i * 3 + 1] = -9; } if (pp[i * 3 + 1] > -1) alive++; }
      pg.attributes.position.needsUpdate = true; if (!alive && !dusting) { cocoa.visible = false; for (let i = 0; i < PN; i++) respawn(i); }
    }
    // steam
    const hot = st.level > FLOOR + .02 ? 1 : 0;
    steam.forEach(s => { const ph = (t0 * .16 + s.userData.ph) % 1; s.position.set(Math.sin(ph * 9 + s.userData.ph * 20) * .08, st.level + .05 + ph * .75, Math.cos(ph * 7 + s.userData.ph * 13) * .06); const sc = .22 + ph * .45; s.scale.set(sc, sc, 1); s.material.opacity = hot * .3 * Math.sin(ph * Math.PI); });
    // camera drift
    az += (taz + Math.sin(t0 * .25) * .03 - az) * .05; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  paint(); placeSurface(); placeCam();
  // compile + first frame before telling the page we're ready
  renderer.compile(scene, camera); renderer.render(scene, camera); start();
  return { set, state: st, renderer };
}
