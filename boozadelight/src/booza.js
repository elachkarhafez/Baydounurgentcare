/* =====================================================================
   Booza Delight: the stretch.
   A high-detail 3D scoop of booza (Arabic mastic ice cream) in a waffle
   cone, its base rolled in crushed pistachio. Grab it and pull: the scoop
   stretches like real booza, the top rides up with your pointer, the middle
   thins into a strand and leans the way you pull. Let go and it springs
   back with a wobble and a few pistachio crumbs tumble off. Nobody has to
   press anything: it pulls itself once on load to show how, then turns
   slowly and breathes. Kit method: studio HDRI, physical materials with
   generated normal maps, lathe geometry deformed per frame, shadow catcher
   on a transparent canvas, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh boozadelight/src/booza.js boozadelight/assets/booza.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
let seed = 21; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// value noise for the scooped surface
const P = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rnd(0, i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  const l = (a, b, t) => a + t * (b - a);
  return l(l(l(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), l(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    l(l(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), l(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}

/* ---------- generated textures (high-res) ---------- */
function normalFromHeight(hf, S, strength) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), d = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, l = hf[y * S + ((x - 1 + S) % S)], r = hf[y * S + ((x + 1) % S)], t = hf[((y - 1 + S) % S) * S + x], b = hf[((y + 1) % S) * S + x];
    let nx = (l - r) * strength, ny = (t - b) * strength, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    d.data[i * 4] = (nx * .5 + .5) * 255; d.data[i * 4 + 1] = (ny * .5 + .5) * 255; d.data[i * 4 + 2] = (nz * .5 + .5) * 255; d.data[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function creamNormal(S = 1024) {
  // fine dimples and folds of hand-pounded booza
  const hf = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * 8, v = y / S * 8;
    hf[y * S + x] = noise3(u, v, .5) * .6 + noise3(u * 3.1, v * 3.1, 2.1) * .3 + noise3(u * 9, v * 9, 7) * .12;
  }
  return normalFromHeight(hf, S, 2.2);
}
function waffleMaps(S = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const hf = new Float32Array(S * S), N = 14;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // diamond waffle grid
    const a = (x + y) / S * N, b = (x - y + S) / S * N;
    const fa = Math.abs(a - Math.round(a)), fb = Math.abs(b - Math.round(b));
    const ridge = Math.max(smooth(.38, .46, .5 - fa), smooth(.38, .46, .5 - fb));
    hf[y * S + x] = ridge + noise3(x / 40, y / 40, 3) * .08;
  }
  const d = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const h = hf[i], n = noise3((i % S) / 24, Math.floor(i / S) / 24, 9) * .5 + .5;
    d.data[i * 4] = 196 + h * 40 - n * 22; d.data[i * 4 + 1] = 138 + h * 34 - n * 20; d.data[i * 4 + 2] = 72 + h * 22 - n * 14; d.data[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, normalMap: normalFromHeight(hf, S, 3.2) };
}

export async function mountBooza(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .62; }
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(-1.6, 8, 3.2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -2, near: .5, far: 20 }); key.shadow.radius = 8; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  const rim = new THREE.DirectionalLight(0xe8f5d8, 1.6); rim.position.set(3, 3, -4);
  const fill = new THREE.DirectionalLight(0xffe6e2, .5); fill.position.set(3, 1, 4);
  scene.add(key, key.target, rim, fill, new THREE.HemisphereLight(0xfffbf2, 0xb9c49c, .55));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: .16, color: 0x3d4a2a }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const root = new THREE.Group(); scene.add(root);

  /* ---------- cone ---------- */
  const CONE_H = 1.55, CONE_R = .44;
  const wf = waffleMaps(1024);
  wf.map.repeat.set(3, 2); wf.normalMap.repeat.set(3, 2);
  const coneMat = new THREE.MeshPhysicalMaterial({ map: wf.map, normalMap: wf.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: .72, sheen: .3, sheenColor: new THREE.Color(0xffd9a0) });
  const coneProf = []; for (let i = 0; i <= 40; i++) { const t = i / 40; coneProf.push(new THREE.Vector2(.02 + (CONE_R - .02) * Math.pow(t, 1.02), t * CONE_H)); }
  const LIFT = .6; // the cone sits in a ceramic stand
  const cone = new THREE.Mesh(new THREE.LatheGeometry(coneProf, 128), coneMat); cone.castShadow = true; cone.receiveShadow = true; cone.position.y = LIFT; root.add(cone);
  // sage ceramic stand, like the shop's millwork: round foot, slim stem, cup (all bottom→top)
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0xa3b383, roughness: .28, clearcoat: 1, clearcoatRoughness: .12, sheen: .3, sheenColor: new THREE.Color(0xffffff) });
  const stand = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.5, 0], [.54, .012], [.55, .04], [.52, .07], [.3, .1], [.14, .14], [.075, .2], [.06, .3], [.06, .56], [.075, .6], [.1, .64], [.15, .72], [.18, .8], [.19, .86], [.17, .87], [.11, .8], [.07, .7]].map(([x, y]) => new THREE.Vector2(x, y)), 128), glaze);
  stand.castShadow = true; stand.receiveShadow = true; root.add(stand);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.182, .012, 16, 96), new THREE.MeshPhysicalMaterial({ color: 0xd8b56a, metalness: 1, roughness: .25 })); lip.rotation.x = Math.PI / 2; lip.position.y = .862; root.add(lip);
  // rolled rim of the cone
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(CONE_R + .012, .035, 24, 128), coneMat); rimRing.rotation.x = Math.PI / 2; rimRing.position.y = CONE_H + .005 + LIFT; rimRing.castShadow = true; root.add(rimRing);
  root.rotation.z = 0; root.position.y = .02;

  /* ---------- the scoop (deformable) ---------- */
  const SR = .7, BASE = CONE_H - .06 + LIFT;
  const SEG = 192, RINGS = 160;
  const prof = [];
  // booza mound: wider at the base (where it sits in the cone), soft rounded top with a slight peak
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS, a = t * Math.PI;
    let r = Math.sin(a) * SR * (1 + .06 * Math.sin(a * 2) - .1 * t * t);
    let y = (1 - Math.cos(a)) * .5 * SR * 1.62;
    if (t < .5) r = Math.max(r, smooth(0, .25, t) * SR * .92);
    prof.push(new THREE.Vector2(Math.max(r, 1e-4), y));
  }
  prof[0].set(1e-4, 0);
  const scoopGeo = new THREE.LatheGeometry(prof, SEG);
  const pos = scoopGeo.attributes.position, base = new Float32Array(pos.array);
  // bake in the scooped irregularity
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], r = Math.hypot(x, z);
    if (r < 1e-3) continue;
    const n = noise3(x * 2.2, y * 2.2, z * 2.2) * .07 + noise3(x * 5.5, y * 5.5, z * 5.5) * .018 + Math.max(0, noise3(x * 3.5 + 9, y * 1.2, z * 3.5)) * .05;
    const k = smooth(.05, .3, y); base[i * 3] += x / r * n * k; base[i * 3 + 2] += z / r * n * k; base[i * 3 + 1] += n * .4 * k;
  }
  pos.array.set(base); scoopGeo.computeVertexNormals();
  { const col = new Float32Array(pos.count * 3), cr = new THREE.Color(0xffffff), gr = new THREE.Color(0xb7c27a), tmpc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const f = smooth(.24, .1, base[i * 3 + 1] / (SR * 1.62)) * .8; tmpc.copy(cr).lerp(gr, f); col.set([tmpc.r, tmpc.g, tmpc.b], i * 3); }
    scoopGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const cream = creamNormal(1024); cream.repeat.set(4, 3);
  const creamMat = new THREE.MeshPhysicalMaterial({ color: o.color || 0xe9d9b8, roughness: .55, normalMap: cream, normalScale: new THREE.Vector2(.85, .85), sheen: .55, sheenRoughness: .5, sheenColor: new THREE.Color(0xfff6e4), clearcoat: .3, clearcoatRoughness: .4, emissive: 0x1c1408, emissiveIntensity: .35, vertexColors: true });
  const scoop = new THREE.Mesh(scoopGeo, creamMat); scoop.castShadow = true; scoop.receiveShadow = true; scoop.position.y = BASE; root.add(scoop);

  // chopped pistachio pressed into the base of the scoop: faceted chunks of
  // different sizes, mostly green, some yellow-green, a few with purple skin
  const crumbGeo = new THREE.IcosahedronGeometry(1, 0);
  const pistMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .5, clearcoat: .25, clearcoatRoughness: .5, sheen: .15, sheenColor: new THREE.Color(0xd8ef90), flatShading: true });
  const NC = 2800, crumbs = new THREE.InstancedMesh(crumbGeo, pistMat, NC); crumbs.castShadow = true; crumbs.receiveShadow = true;
  const crumbData = [], pc = new THREE.Color();
  for (let i = 0; i < NC; i++) {
    const a = rnd(0, Math.PI * 2);
    // a thick band at the base whose top edge wanders around the scoop
    const top = .22 + .14 * (noise3(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 4) + .5) + .05 * Math.sin(a * 3 + 1);
    const h = Math.pow(rnd(0, 1), 1.5) * top + .015;
    const big = rnd(0, 1) < .18, sz = big ? rnd(.03, .048) : rnd(.012, .028);
    crumbData.push({ a, h, sx: sz * rnd(.8, 1.3), sy: sz * rnd(.4, .75), sz: sz * rnd(.7, 1.2), rx: rnd(0, 6), ry: rnd(0, 6), sink: rnd(-.35, .15) * sz });
    const t = rnd(0, 1);
    if (t < .06) pc.setHSL(.96 + rnd(-.03, .03), .22, .26 + rnd(0, .06));        // papery purple-brown skin
    else if (t < .2) pc.setHSL(.17 + rnd(0, .03), .45, .46 + rnd(0, .08));        // pale yellow-green inner nut
    else pc.setHSL(.235 + rnd(-.02, .025), .62 + rnd(0, .14), .25 + rnd(0, .12)); // deep pistachio green
    crumbs.setColorAt(i, pc);
  }
  root.add(crumbs);
  // falling crumbs on release
  const fallers = new THREE.InstancedMesh(crumbGeo, pistMat, 40); fallers.castShadow = true; root.add(fallers);
  for (let i = 0; i < 40; i++) fallers.setColorAt(i, pc.setHSL(.22 + rnd(-.02, .03), .55, .36 + rnd(0, .14)));
  const fall = Array.from({ length: 40 }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: rnd(0, 6) }));

  /* ---------- deformation ---------- */
  const H = SR * 1.62;
  const st = { pull: 0, lean: 0, vel: 0, lvel: 0, target: null, targetLean: 0, wob: 0 };
  function deform() {
    const p = scoopGeo.attributes.position.array, s = st.pull, lean = st.lean, w = st.wob;
    for (let i = 0; i < pos.count; i++) {
      let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const h = clamp(y / H);
      // the top rides up, the middle thins into a strand, the base stays in the cone
      const lift = s * smooth(.18, .95, h);
      const k = clamp(s * .85);
      // a twisted strand forms in the middle, the top keeps a soft lump
      const neck = 1 - k * .82 * Math.exp(-Math.pow((h - .47) / .2, 2));
      const taper = 1 - k * .22 * smooth(.72, 1, h);
      const ang = Math.atan2(z, x);
      const fold = 1 + k * .13 * Math.sin(ang * 4 + h * 11) * Math.exp(-Math.pow((h - .47) / .26, 2)); // ropey folds, like pulled mastic
      const tw = k * 1.5 * smooth(.2, .85, h), ct = Math.cos(tw), stw = Math.sin(tw);
      { const x0 = x; x = x * ct - z * stw; z = x0 * stw + z * ct; }
      const sc = Math.max(.06, neck * taper * fold * (1 + w * .05 * Math.sin(h * 9 + w * 3)));
      x *= sc; z *= sc;
      x += lean * lift * .55 * h; // lean toward the pull
      y = y + lift + w * .03 * Math.sin(h * 6);
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    }
    scoopGeo.attributes.position.needsUpdate = true; scoopGeo.computeVertexNormals();
    // crumbs ride on the deformed surface near the base
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    crumbData.forEach((c, i) => {
      const t = c.h / (H * .9), a = c.a;
      // sample radius from the profile at this height
      const ri = Math.min(RINGS, Math.floor(clamp(c.h / H) * RINGS * .5 + 1));
      const r = prof[Math.max(1, Math.round(Math.acos(1 - 2 * clamp(c.h / H)) / Math.PI * RINGS))].x;
      const hh = clamp(c.h / H), neck = 1 - clamp(s * .85) * .82 * Math.exp(-Math.pow((hh - .47) / .2, 2));
      const lift = s * smooth(.18, .95, hh);
      const rr = r * neck + c.sink;
      v.set(Math.cos(a) * rr + lean * lift * .55 * hh, BASE + c.h + lift, Math.sin(a) * rr);
      e.set(c.rx, c.ry, a); q.setFromEuler(e); sv.set(c.sx, c.sy, c.sz); m.compose(v, q, sv); crumbs.setMatrixAt(i, m);
    });
    crumbs.instanceMatrix.needsUpdate = true;
  }
  deform();

  /* ---------- camera ---------- */
  const look = new THREE.Vector3(0, 2.15, 0);
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const needH = 5, needW = 2.6;
    const dist = Math.max(needH / 2 / Math.tan(vf / 2), needW / 2 / Math.tan(vf / 2) / camera.aspect);
    camera.position.set(0, look.y + dist * Math.sin(.12), dist * Math.cos(.12)); camera.lookAt(look); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  /* ---------- interaction: grab and pull ---------- */
  let dragging = false, sy = 0, sx = 0, intro = RM ? 1 : 0, autoT = RM ? -1 : 0, time = 0;
  const pxToWorld = () => 5 / (canvas.clientHeight || 1);
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => {
    // only grab when the pointer is on the scoop half of the canvas
    const r = canvas.getBoundingClientRect(); if (e.clientY - r.top > r.height * .75) return;
    dragging = true; sy = e.clientY; sx = e.clientX; autoT = -1; canvas.setPointerCapture(e.pointerId); o.onGrab && o.onGrab(); kick();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    st.target = clamp((sy - e.clientY) * pxToWorld() * 1.1, 0, 1.35);
    st.targetLean = clamp((e.clientX - sx) * pxToWorld() * .9, -.9, .9);
    if (e.pointerType === 'touch' && st.target > .05) e.preventDefault();
  });
  const release = () => { if (!dragging) return; dragging = false; letGo(); };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  function letGo() {
    const amount = st.pull; st.target = null; st.targetLean = 0;
    if (amount > .35) { // shake some crumbs loose
      let n = 0; fall.forEach(f => { if (f.on || n > 10 + amount * 8) return; n++; f.on = true; const a = rnd(0, 6.28); f.p.set(Math.cos(a) * .5 + st.lean * .3, BASE + rnd(.05, .4) + amount * .5, Math.sin(a) * .5); f.v.set(Math.cos(a) * rnd(.3, .8), rnd(.4, 1.4), Math.sin(a) * rnd(.3, .8)); });
    }
    o.onRelease && o.onRelease(amount);
  }

  /* ---------- loop ---------- */
  let visible = true, raf = 0, last = performance.now();
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sv4 = new THREE.Vector3(), e4 = new THREE.Euler();
  function loop(now) {
    raf = 0; const dt = Math.min(.04, (now - last) / 1000); last = now; time += dt;
    // intro: the scoop drops into the cone
    if (intro < 1) { intro = Math.min(1, intro + dt / 1.1); }
    const drop = 1 - easeOut(intro);
    scoop.position.y = BASE + drop * 1.6; crumbs.position.y = drop * 1.6;
    // the cone turns slowly
    root.rotation.y = Math.sin(time * .35) * .5;
    // auto demo pull once
    if (autoT >= 0) {
      autoT += dt; const k = autoT - 1.4;
      if (k > 0 && k < 1.4) { st.target = smooth(0, 1, k / 1.1) * 1.25; st.targetLean = Math.sin(k * 2) * .25; }
      else if (k >= 1.4) { autoT = -1; letGo(); o.onDemoDone && o.onDemoDone(); }
    }
    // spring
    const tgt = st.target !== null ? st.target : 0;
    const kS = st.target !== null ? 90 : 60, dS = st.target !== null ? 16 : 7;
    st.vel += ((tgt - st.pull) * kS - st.vel * dS) * dt; st.pull += st.vel * dt;
    st.lvel += ((st.targetLean - st.lean) * 60 - st.lvel * 9) * dt; st.lean += st.lvel * dt;
    st.wob = st.target === null ? clamp(-st.vel * .25, -1, 1) : 0;
    if (st.pull < 0) st.pull *= .5;
    // idle breathing
    const breathe = RM ? 0 : Math.sin(time * 1.6) * .012;
    scoop.scale.set(1 + breathe, 1 - breathe, 1 + breathe);
    deform();
    // falling crumbs
    let k = 0;
    fall.forEach((f, i) => {
      if (f.on) { f.v.y -= 4.5 * dt; f.p.addScaledVector(f.v, dt); f.r += dt * 6; if (f.p.y < .015) { f.p.y = .015; f.v.multiplyScalar(.4); f.v.y = Math.abs(f.v.y) * .3; if (f.v.length() < .05) f.on = false; } }
      e4.set(f.r, f.r * .7, 0); q4.setFromEuler(e4); sv4.setScalar(f.on ? .026 : 0); m4.compose(f.p, q4, sv4); fallers.setMatrixAt(i, m4); if (f.on) k++;
    });
    fallers.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return { setColor(c) { creamMat.color.set(c); }, pose(sv, lean = 0) { autoT = -1; intro = 1; st.target = sv; st.pull = sv; st.vel = 0; st.lean = st.targetLean = lean; kick(); } };
}
