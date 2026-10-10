/* =====================================================================
   Iron Gator Trailers: a single-ski PWC trailer, built in real 3D.
   Intro (hero): the side rails weld up with sparks, crossmembers and the
   A-frame tongue tack on, the axle drops, wheels roll in, fenders and
   diamond-plate steps land, bunks and winch post go on, then the bare
   steel takes its paint and the decals go on.
   Builder: set({ frame, accent, steps, wheels, carpet, text }) repaints live.
   Bundle: kit/build3d/build.sh irongatortrailers/src/trailer.js irongatortrailers/assets/trailer.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const back = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// layout (metres-ish). x = toward the hitch, z = across, y = up
const R = .33, AX = -.3, RY = .44, RZ = .45, WZ = .95;

export const FINISHES = {
  gloss: { rough: .26, clear: 1 },
  matte: { rough: .72, clear: 0 }
};

function diamondCanvas() { // bump pattern for tread plate
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  const lug = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); const gr = g.createLinearGradient(-14, 0, 14, 0); gr.addColorStop(0, '#222'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, '#222'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { lug(x * 64 + 16, y * 64 + 16, .78); lug(x * 64 + 48, y * 64 + 48, -.78); }
  return c;
}

export async function mountTrailer(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 60);
  const world = new THREE.Group(); scene.add(world);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 1.2, 0); scene.environmentIntensity = .9; }
  try { await document.fonts.load('800 80px "Big Shoulders Display"'); } catch (e) {}

  // ---- lights ----
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 6, 4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3, bottom: -3, near: .5, far: 16 });
  const rim = new THREE.DirectionalLight(0xbfd8ff, 1.2); rim.position.set(-4, 3, -3);
  const fill = new THREE.DirectionalLight(0xffffff, .4); fill.position.set(-2, 1.5, 4);
  scene.add(key, rim, fill, new THREE.HemisphereLight(0xffffff, 0x1a1a1a, .35));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  // ---- materials ----
  const STEEL = new THREE.Color(0x8d939a);
  const paint = new THREE.MeshPhysicalMaterial({ color: STEEL.clone(), metalness: .85, roughness: .4, clearcoat: 0, clearcoatRoughness: .08 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x141414, metalness: .3, roughness: .5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: .88 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0x151515, metalness: .9, roughness: .28, clearcoat: .6, clearcoatRoughness: .15, envMapIntensity: .45 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: .12 });
  const dTex = new THREE.CanvasTexture(diamondCanvas()); dTex.wrapS = dTex.wrapT = THREE.RepeatWrapping; dTex.repeat.set(4, 4);
  const plate = new THREE.MeshPhysicalMaterial({ color: 0xc9cdd2, metalness: 1, roughness: .3, bumpMap: dTex, bumpScale: 2.2 });
  const carpet = new THREE.MeshPhysicalMaterial({ color: 0x1b1b1b, roughness: .95, sheen: 1, sheenRoughness: .8, sheenColor: new THREE.Color(0x444444) });
  const redLamp = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a1a, emissiveIntensity: 1.2 });

  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x, y, z, parent) => { const m = shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * .18), mat)); m.position.set(x, y, z); (parent || world).add(m); return m; };
  const cyl = (r, len, mat, seg = 24) => shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat));

  // every part is a group with a "home" transform; the sequencer animates in from an offset
  const parts = {};
  const part = (name) => { const g = new THREE.Group(); world.add(g); parts[name] = g; g.userData.p = 1; return g; };

  // frame rails: pivot at the rear so they can "weld" forward
  const rails = part('rails'); rails.position.x = -1.78;
  [-RZ, RZ].forEach(z => box(2.7, .12, .07, paint, 1.35, RY, z, rails));
  const tail = part('tail');
  [-RZ, RZ].forEach(z => { const l = box(.03, .05, .1, redLamp, -1.8, RY, z * 1.02, tail); l.castShadow = false; });
  box(.06, .08, .96, paint, -1.75, RY, 0, tail);

  const cross = part('cross');
  [-1.05, AX, .4].forEach(x => box(.07, .08, .9, paint, x, RY, 0, cross));
  box(.07, .08, .9, paint, .9, RY, 0, cross);

  const tongue = part('tongue');
  [-1, 1].forEach(s => { const len = Math.hypot(1.3, RZ), m = box(len, .1, .06, paint, .9 + .65, RY, s * RZ / 2, tongue); m.rotation.y = s * Math.atan2(RZ, 1.3); });
  box(1.55, .1, .07, paint, 1.65, RY, 0, tongue);
  const coupler = box(.26, .1, .11, chrome, 2.52, RY + .02, 0, tongue);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), chrome); ball.position.set(2.62, RY - .03, 0); tongue.add(ball);
  // jack stand
  const jack = cyl(.035, .42, black); jack.position.set(2.05, RY - .02, .11); tongue.add(jack);
  const jw = cyl(.06, .05, rubber); jw.rotation.x = Math.PI / 2; jw.position.set(2.05, .06, .11); tongue.add(jw);
  // safety chains (simple arcs)
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.TorusGeometry(.08, .008, 6, 20, Math.PI), chrome); c.position.set(2.45, RY - .06, s * .07); c.rotation.set(0, Math.PI / 2, Math.PI); tongue.add(c); });

  // axle + outriggers
  const axle = part('axle');
  const ax = cyl(.04, 2 * WZ, black); ax.rotation.x = Math.PI / 2; ax.position.set(AX, R, 0); axle.add(ax);
  [-1, 1].forEach(s => { const sp = box(.5, .05, .06, black, AX, R + .07, s * (RZ + .02), axle); sp.rotation.y = 0; });
  const outs = part('outriggers');
  [AX - .58, AX + .58].forEach(x => [-1, 1].forEach(s => box(.07, .07, WZ - RZ + .1, paint, x, RY - .04, s * (RZ + (WZ - RZ) / 2), outs)));

  // wheels
  function wheel() {
    const w = new THREE.Group();
    const prof = []; const tw = .2;
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * i / 12; prof.push(new THREE.Vector2(R - .05 + Math.cos(a) * .05, Math.sin(a) * tw / 2)); }
    prof.unshift(new THREE.Vector2(.205, -tw / 2)); prof.push(new THREE.Vector2(.205, tw / 2));
    const tire = shadowy(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), rubber)); tire.rotation.x = Math.PI / 2; w.add(tire);
    const lip = shadowy(new THREE.Mesh(new THREE.TorusGeometry(.2, .015, 10, 48), rimMat)); lip.position.z = tw / 2 - .02; w.add(lip);
    const barrel = cyl(.2, tw - .03, rimMat, 40); barrel.rotation.x = Math.PI / 2; w.add(barrel);
    const face = new THREE.Group(); face.position.z = tw / 2 - .015; w.add(face);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new RoundedBoxGeometry(.17, .045, .03, 2, .01), rimMat); sp.position.set(Math.cos(i * Math.PI / 3) * .1, Math.sin(i * Math.PI / 3) * .1, 0); sp.rotation.z = i * Math.PI / 3; face.add(sp); }
    const hub = cyl(.05, .05, chrome); hub.rotation.x = Math.PI / 2; hub.position.z = .01; face.add(hub);
    w.userData.face = face;
    return w;
  }
  const wheels = part('wheels'); const W = [];
  [-1, 1].forEach(s => { const w = wheel(); w.position.set(AX, R, s * WZ); if (s < 0) w.rotation.y = Math.PI; wheels.add(w); W.push(w); });

  // fenders: arc band + flat side walls that carry the lettering and chevrons
  const decalCanvases = [], decalTex = [];
  const fenderSide = [];
  function fender(s) {
    const g = new THREE.Group();
    const r0 = .38, r1 = .44, a0 = .2, a1 = Math.PI - .2, depth = .32, h0 = .1;
    const sh = new THREE.Shape(); sh.absarc(0, 0, r1, a0, a1, false); sh.absarc(0, 0, r0, a1, a0, true);
    // a skirt down to the step on each end makes the side wall read like their fenders
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, curveSegments: 48 });
    geo.translate(0, 0, -depth / 2);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; decalCanvases.push(c);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; decalTex.push(t);
    // shape coords span x ∈ [-r1, r1], y ∈ [0, r1]: map them onto the canvas
    t.repeat.set(1 / (2 * r1), 1 / r1); t.offset.set(.5, 0);
    const sideMat = paint.clone(); sideMat.map = t; fenderSide.push(sideMat);
    const m = shadowy(new THREE.Mesh(geo, [sideMat, paint])); g.add(m);
    // solid side wall below the arc (their fenders are full panels)
    const b0 = Math.asin(h0 / r1), wall = new THREE.Shape(); wall.moveTo(-Math.cos(b0) * r1, h0); wall.lineTo(Math.cos(b0) * r1, h0); wall.absarc(0, 0, r1, b0, Math.PI - b0, false);
    const wg = new THREE.ShapeGeometry(wall, 48); const wm = shadowy(new THREE.Mesh(wg, sideMat)); wm.position.z = s * (depth / 2 + .009); if (s < 0) wm.rotation.y = Math.PI; g.add(wm);
    g.position.set(AX, R, s * WZ);
    return g;
  }
  const fenders = part('fenders');
  [-1, 1].forEach(s => fenders.add(fender(s)));

  // steps: diamond plate fore and aft of each fender
  const steps = part('steps'); const stepMeshes = [];
  [AX - .58, AX + .58].forEach(x => [-1, 1].forEach(s => { const m = box(.36, .025, .32, plate, x, RY + .005, s * WZ, steps); stepMeshes.push(m); }));

  // bunks: carpeted boards angled in, on uprights
  const bunks = part('bunks');
  [-1, 1].forEach(s => {
    const b = box(2.15, .05, .12, carpet, -.55, RY + .2, s * .24, bunks); b.rotation.x = s * .32;
    [-1.35, .2].forEach(x => box(.04, .18, .04, paint, x, RY + .1, s * .24, bunks));
  });

  // winch post with bow roller and winch
  const winch = part('winch');
  box(.07, .62, .07, paint, 1.3, RY + .31, 0, winch);
  box(.32, .05, .06, paint, 1.18, RY + .58, 0, winch).rotation.z = -.5;
  const roller = cyl(.05, .16, black); roller.rotation.x = Math.PI / 2; roller.position.set(1.08, RY + .66, 0); winch.add(roller);
  const wb = box(.14, .12, .12, black, 1.4, RY + .38, 0, winch);
  const strap = box(.12, .01, .04, new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: .8 }), 1.32, RY + .43, 0, winch); strap.rotation.z = .2;

  // rail lettering, both sides
  const railC = document.createElement('canvas'); railC.width = 2048; railC.height = 96;
  const railTex = new THREE.CanvasTexture(railC); railTex.colorSpace = THREE.SRGBColorSpace; railTex.anisotropy = 8;
  const railMat = new THREE.MeshBasicMaterial({ map: railTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const decals = part('decals');
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .085), railMat); p.position.set(-.55, RY, s * (RZ + .036)); if (s < 0) p.rotation.y = Math.PI; decals.add(p); });

  // ---- look: paint, accent, lettering ----
  const look = { frame: '#121212', finish: 'gloss', accent: '#c6ff1a', steps: 'diamond', wheels: '#151515', carpet: '#1b1b1b', text: 'IRON GATOR' };
  const st = { paint: 0, decal: 0 };
  let fromCol = STEEL.clone(), toCol = new THREE.Color(look.frame);
  function drawDecals() {
    const fc = '#' + paint.color.getHexString();
    decalCanvases.forEach(c => {
      const g = c.getContext('2d'), w = c.width, h = c.height;
      g.fillStyle = fc; g.fillRect(0, 0, w, h); // the side wall is painted here, so decals sit on the real frame colour
      g.globalAlpha = st.decal;
      if (look.accent !== 'none') { // chevrons along the lower edge, like their neon builds
        g.fillStyle = look.accent; const ch = h * .09, y0 = h * (1 - .1 / .44) - ch - 6;
        for (let x = -60; x < w + 60; x += 56) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 22, y0); g.lineTo(x + 44, y0 + ch / 2); g.lineTo(x + 22, y0 + ch); g.lineTo(x, y0 + ch); g.lineTo(x + 22, y0 + ch / 2); g.closePath(); g.fill(); }
      }
      if (look.text) {
        g.font = '800 120px "Big Shoulders Display", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = look.accent !== 'none' ? look.accent : '#bfc3c7';
        let size = 120; while (g.measureText(look.text).width > w * .5 && size > 40) { size -= 6; g.font = `800 ${size}px "Big Shoulders Display", "Arial Narrow", sans-serif`; }
        g.fillText(look.text, w / 2, h * (1 - .29 / .44));
      }
      g.globalAlpha = 1;
    });
    fenderSide.forEach(m => { m.color.set(0xffffff); m.roughness = paint.roughness; m.metalness = paint.metalness; m.clearcoat = paint.clearcoat; });
    decalTex.forEach(t => t.needsUpdate = true);
    const g = railC.getContext('2d'); g.clearRect(0, 0, railC.width, railC.height);
    g.font = '800 64px "Big Shoulders Display", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.letterSpacing = '18px'; g.fillStyle = look.accent !== 'none' ? look.accent : '#c9cdd2';
    g.fillText('IRON GATOR TRAILERS', railC.width / 2, railC.height / 2 + 3);
    railTex.needsUpdate = true; railMat.opacity = st.decal * .95;
  }
  function applyPaint() {
    const f = FINISHES[look.finish] || FINISHES.gloss, t = st.paint;
    paint.color.copy(fromCol).lerp(toCol, t);
    paint.metalness = .85 + (.15 - .85) * Math.min(1, t * 1.4);
    paint.roughness = .4 + (f.rough - .4) * t;
    paint.clearcoat = f.clear * t;
    drawDecals();
  }
  function applyDetails() {
    rimMat.color.set(look.wheels); rimMat.metalness = look.wheels === '#d9dde2' ? 1 : .9; rimMat.roughness = look.wheels === '#d9dde2' ? .12 : .28;
    carpet.color.set(look.carpet); carpet.sheenColor.set(look.carpet).offsetHSL(0, 0, .15);
    stepMeshes.forEach(m => { m.material = look.steps === 'diamond' ? plate : paint; });
  }

  // ---- intro sequence ----
  const spark = (() => {
    const N = 260, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffc46b, size: .028, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; world.add(pts);
    const light = new THREE.PointLight(0xff9a3c, 0, 2.5, 1.6); world.add(light);
    let at = null, on = 0;
    for (let i = 0; i < N; i++) { life[i] = 0; pos[i * 3 + 1] = -9; }
    return {
      at(v) { at = v; }, on(x) { on = x; },
      step(dt, t) {
        let k = 0;
        for (let i = 0; i < N; i++) {
          if (life[i] <= 0) { if (on && at && k++ < 7) { pos.set([at.x, at.y, at.z], i * 3); vel[i * 3] = (Math.random() - .5) * 2.4; vel[i * 3 + 1] = Math.random() * 2.2; vel[i * 3 + 2] = (Math.random() - .5) * 2.4; life[i] = .3 + Math.random() * .5; } else { pos[i * 3 + 1] = -9; continue; } }
          life[i] -= dt; vel[i * 3 + 1] -= 6 * dt;
          pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
          if (pos[i * 3 + 1] < .005) { pos[i * 3 + 1] = .005; vel[i * 3 + 1] *= -.3; vel[i * 3] *= .6; vel[i * 3 + 2] *= .6; }
        }
        geo.attributes.position.needsUpdate = true;
        if (at) light.position.set(at.x, at.y + .05, at.z);
        light.intensity = on ? 5 + Math.sin(t * 70) * 2 + Math.random() * 2 : Math.max(0, light.intensity - dt * 40);
        m.opacity = .95;
      }
    };
  })();

  const order = ['rails', 'tail', 'cross', 'tongue', 'outriggers', 'axle', 'wheels', 'fenders', 'steps', 'bunks', 'winch', 'decals'];
  const home = {}; order.forEach(n => home[n] = parts[n].position.clone());
  function placePart(n, p) {
    const g = parts[n]; g.userData.p = p; g.visible = p > .001;
    const h = home[n];
    if (n === 'rails') { g.scale.set(Math.max(.001, p), 1, 1); g.position.copy(h); return; }
    if (n === 'wheels') { W.forEach((w, i) => { const s = i ? 1 : -1; w.position.z = s * (WZ + (1 - easeOut(p)) * 1.6); w.rotation.z = (1 - p) * 9 * s; }); return; }
    if (n === 'decals') return;
    const e = back(clamp(p)); g.position.set(h.x, h.y + (1 - e) * .9, h.z);
  }
  const st2 = { orbit: 0 };
  let steps2 = [], cur = null, curT = 0;
  const step = (d, fn, done, label) => ({ d, fn, done, label });
  const run = l => { steps2 = l; cur = null; };
  const tmp = new THREE.Vector3();
  const weld = (n, d, path, label) => step(d, (t) => { placePart(n, t); if (path) { path(t, tmp); spark.at(tmp); spark.on(t < .98); } }, () => spark.on(0), label);
  function intro() {
    order.forEach(n => placePart(n, 0)); st.paint = 0; st.decal = 0; fromCol = STEEL.clone(); applyPaint();
    run([
      step(.25, () => {}),
      weld('rails', 1.3, (t, v) => v.set(-1.78 + 2.7 * ease(t), RY, (Math.sin(t * 40) > 0 ? 1 : -1) * RZ), 'Welding the frame rails'),
      weld('tail', .3, (t, v) => v.set(-1.76, RY, (t - .5) * .9)),
      weld('cross', .55, (t, v) => v.set(-1.05 + 1.95 * t, RY + .03, RZ * (t < .5 ? 1 : -1))),
      weld('tongue', .7, (t, v) => v.set(.9 + 1.5 * t, RY, RZ * (1 - t) * (Math.sin(t * 30) > 0 ? 1 : -1)), 'Tongue + coupler'),
      weld('outriggers', .45, (t, v) => v.set(AX + (t < .5 ? -.58 : .58), RY - .04, (Math.sin(t * 20) > 0 ? 1 : -1) * (RZ + .05))),
      step(.4, t => placePart('axle', t), null, 'Axle + wheels'),
      step(.75, t => placePart('wheels', t)),
      step(.5, t => placePart('fenders', t), null, 'Fenders + tread plate'),
      step(.4, t => placePart('steps', t)),
      step(.45, t => placePart('bunks', t), null, 'Bunks + winch post'),
      step(.45, t => placePart('winch', t)),
      step(1.3, t => { st.paint = ease(t); applyPaint(); }, null, 'Paint'),
      step(.6, t => { st.decal = t; placePart('decals', 1); parts.decals.visible = true; drawDecals(); }, null, 'Lettering'),
      step(0, () => {}, null, 'Ready to haul')
    ]);
  }
  function finishNow() { order.forEach(n => placePart(n, 1)); W.forEach((w, i) => { w.position.z = (i ? 1 : -1) * WZ; w.rotation.z = 0; }); st.paint = 1; st.decal = 1; parts.decals.visible = true; applyPaint(); }

  // ---- builder ----
  function set(next) {
    Object.assign(look, next);
    applyDetails();
    if (next.frame || next.finish) { fromCol = paint.color.clone(); toCol = new THREE.Color(look.frame); st.paint = 0; if (RM) { st.paint = 1; applyPaint(); } else steps2.push(step(.6, t => { st.paint = ease(t); applyPaint(); })); }
    else drawDecals();
    start();
  }

  // ---- camera ----
  const target = new THREE.Vector3(.4, .4, 0);
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const A0 = o.angle ?? .62;
  const placeCam = () => {
    const D = (SMALL ? 7.6 : 6.4) * (o.zoom || 1), E = .3 + el, Az = A0 + az;
    camera.position.set(target.x + Math.sin(Az) * Math.cos(E) * D, target.y + Math.sin(E) * D, target.z + Math.cos(Az) * Math.cos(E) * D);
    camera.lookAt(target);
  };
  let drag = null;
  if (FINE) addEventListener('pointermove', e => { if (drag) return; const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .35; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.12; }, { passive: true });
  if (o.drag) { // turn the trailer by dragging (touch + mouse)
    canvas.style.touchAction = 'pan-y'; canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, a: taz }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', e => { if (!drag) return; taz = drag.a - (e.clientX - drag.x) / canvas.clientWidth * 3.2; start(); });
    const up = () => { drag = null; canvas.style.cursor = 'grab'; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  }
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 40 : 30; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  function advance(dt) {
    while (true) {
      if (!cur) { cur = steps2.shift(); curT = 0; if (!cur) break; if (cur.label && o.onStep) o.onStep(cur.label); }
      const d = RM ? 0 : cur.d; curT += dt;
      const p = d ? clamp(curT / d) : 1; cur.fn(p, dt);
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
  }
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .05); last = now; t0 += dt;
    advance(dt); spark.step(dt, t0);
    if (o.spin && !drag && !RM) taz = Math.sin(t0 * .18) * .45;
    az += (taz - az) * .06; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  applyDetails();
  if (o.intro && !RM) intro(); else finishNow();
  placeCam(); renderer.compile(scene, camera); start();
  return { set, look, replay() { if (!RM) intro(); start(); }, renderer };
}
