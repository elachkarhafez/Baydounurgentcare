/* =====================================================================
   Dushanbe Restaurant: the dastarkhan.
   A low table spread with a suzani cloth (drawn in canvas: red and indigo
   medallions on cream), and the dishes from their reels land on it one by
   one: tandoor non with its stamped centre, a lagan of plov with carrots,
   chickpeas and lamb, shashlik on a plank, kurutob, a teapot and piala bowls.
   Tap a dish to open its card. Kit method: studio HDRI, physical materials,
   lathe-turned bowls, pot and bread, shadow catcher on a transparent canvas,
   step sequencer, pointer drift, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh dushanbe/src/table.js dushanbe/assets/table.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
let seed = 21; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...s) { q.push(...s); },
    get busy() { return !!(cur || q.length); },
    tick(dt) { for (let n = 0; n < 12; n++) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; else return; } },
  };
}
function tex(w, h, draw, renderer, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t;
}
// a suzani: big red sun-medallions with indigo rings and green leaf scrolls on cream
function suzani(g, W, H) {
  g.fillStyle = '#f1e4c8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,90,50,${rnd(.02, .06)})`; g.fillRect(rnd(0, W), rnd(0, H), 1, rnd(2, 6)); }
  const border = 64;
  g.fillStyle = '#7b1f24'; g.fillRect(0, 0, W, border); g.fillRect(0, H - border, W, border); g.fillRect(0, 0, border, H); g.fillRect(W - border, 0, border, H);
  for (let x = border / 2; x < W; x += 56) for (const y of [border / 2, H - border / 2]) { g.fillStyle = '#e9b44c'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = '#26365e'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  for (let y = border / 2 + 56; y < H - border; y += 56) for (const x of [border / 2, W - border / 2]) { g.fillStyle = '#e9b44c'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = '#26365e'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  const med = (cx, cy, R) => {
    // leaf scrolls
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g.save(); g.translate(cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R * 1.35); g.rotate(a + 1.2); g.fillStyle = '#3f6b3a'; g.beginPath(); g.ellipse(0, 0, R * .32, R * .11, 0, 0, 7); g.fill(); g.restore(); }
    const rings = [[1, '#b3262d'], [.86, '#26365e'], [.78, '#b3262d'], [.62, '#e9b44c'], [.5, '#b3262d'], [.34, '#26365e'], [.2, '#f1e4c8'], [.1, '#b3262d']];
    rings.forEach(([f, c]) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, R * f, 0, 7); g.fill(); });
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; g.fillStyle = '#f1e4c8'; g.beginPath(); g.arc(cx + Math.cos(a) * R * .93, cy + Math.sin(a) * R * .93, R * .06, 0, 7); g.fill(); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#e9b44c'; g.save(); g.translate(cx + Math.cos(a) * R * .7, cy + Math.sin(a) * R * .7); g.rotate(a); g.beginPath(); g.ellipse(0, 0, R * .1, R * .05, 0, 0, 7); g.fill(); g.restore(); }
  };
  med(W * .25, H * .3, 150); med(W * .75, H * .3, 150); med(W * .25, H * .72, 150); med(W * .75, H * .72, 150); med(W * .5, H * .51, 110);
  for (let i = 0; i < 26; i++) { const x = rnd(border + 30, W - border - 30), y = rnd(border + 30, H - border - 30); g.fillStyle = ['#b3262d', '#26365e', '#e9b44c'][i % 3]; g.globalAlpha = .7; g.beginPath(); g.arc(x, y, rnd(6, 12), 0, 7); g.fill(); g.globalAlpha = 1; }
}

export async function mountTable(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .7; }
  const key = new THREE.DirectionalLight(0xffe7c4, 2.4); key.position.set(-3, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 24 }); key.shadow.radius = 5; key.shadow.bias = -.0005;
  const rim = new THREE.DirectionalLight(0xffc98a, 1.2); rim.position.set(5, 4, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfff2de, 0x7b3a1e, .55));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .32, color: 0x3a1408 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.42; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

  /* ----- the table + suzani ----- */
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x6b3a1e, roughness: .55, clearcoat: .5, clearcoatRoughness: .3 });
  const top = cast(new THREE.Mesh(new THREE.BoxGeometry(6.4, .12, 4.2), wood)); top.position.y = -.06; scene.add(top);
  for (const [x, z] of [[-2.9, -1.8], [2.9, -1.8], [-2.9, 1.8], [2.9, 1.8]]) { const l = cast(new THREE.Mesh(new THREE.CylinderGeometry(.09, .07, .3, 16), wood)); l.position.set(x, -.27, z); scene.add(l); }
  const suz = tex(1024, 704, suzani, renderer);
  const clothGeo = new THREE.PlaneGeometry(5.6, 3.85, 60, 40); clothGeo.rotateX(-Math.PI / 2);
  { const p = clothGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, .014 + Math.sin(p.getX(i) * 3.1) * Math.cos(p.getZ(i) * 2.3) * .006); clothGeo.computeVertexNormals(); }
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshPhysicalMaterial({ map: suz, roughness: .85, sheen: .8, sheenColor: 0xffe2b0, sheenRoughness: .5 })); cloth.receiveShadow = true; scene.add(cloth);

  /* ----- dishes ----- */
  const ceramic = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .25, clearcoat: .8, clearcoatRoughness: .15 });
  // pakhta (cotton) pattern for bowls: cobalt on white
  const pakhta = tex(512, 128, (g, W, H) => { g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 64) { g.fillStyle = '#1f3c8c'; g.beginPath(); g.arc(x + 32, H * .5, 22, 0, 7); g.fill(); g.fillStyle = '#f7f4ee'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .78; g.beginPath(); g.arc(x + 32 + Math.cos(a) * 11, H * .5 + Math.sin(a) * 11, 6, 0, 7); g.fill(); } g.fillStyle = '#c9a646'; g.fillRect(x, H * .12, 64, 6); g.fillRect(x, H * .82, 64, 6); } }, renderer, true);
  const bowlMat = new THREE.MeshPhysicalMaterial({ map: pakhta, roughness: .2, clearcoat: 1, side: THREE.DoubleSide });
  const dishes = [];
  function dish(id, group, rest, opts = {}) { group.position.copy(rest); group.userData.rest = rest.clone(); group.userData.id = id; group.visible = RM; scene.add(group); group.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.userData.id = id; } }); dishes.push({ id, group, label: opts.label }); return group; }

  // 1. non: tandoor bread with a stamped, seeded centre
  const nonTex = tex(512, 512, (g, W) => {
    const c = W / 2, grd = g.createRadialGradient(c, c, 20, c, c, W * .5); grd.addColorStop(0, '#e8c084'); grd.addColorStop(.42, '#d79a52'); grd.addColorStop(.62, '#a85f24'); grd.addColorStop(.9, '#c98443'); grd.addColorStop(1, '#8e4c1b');
    g.fillStyle = grd; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 8; k++) { g.strokeStyle = 'rgba(110,60,20,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, 30 + k * 13, 0, 7); g.stroke(); }
    for (let i = 0; i < 600; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * 128; g.fillStyle = ['#f6ead0', '#2a1a10'][i % 7 ? 0 : 1]; g.save(); g.translate(c + Math.cos(a) * d, c + Math.sin(a) * d); g.rotate(rnd(0, 3)); g.beginPath(); g.ellipse(0, 0, 3.4, 1.7, 0, 0, 7); g.fill(); g.restore(); }
    for (let i = 0; i < 160; i++) { const a = rnd(0, 7), d = rnd(150, 245); g.fillStyle = `rgba(70,35,10,${rnd(.2, .6)})`; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, rnd(2, 7), 0, 7); g.fill(); }
  }, renderer);
  const nonGeo = lathe([[0, .04], [.22, .045], [.3, .04], [.36, .07], [.43, .1], [.5, .08], [.53, .04], [.52, 0], [0, 0]].reverse());
  { const p = nonGeo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 1.08 + .5; uv[i * 2 + 1] = .5 - p.getZ(i) / 1.08; } nonGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  const nonMat = new THREE.MeshPhysicalMaterial({ map: nonTex, roughness: .6, sheen: .5, sheenColor: 0xffcf8a, clearcoat: .2 });
  const nonG = new THREE.Group();
  [[0, 0, 0], [.08, .085, .3], [-.05, .17, -.5]].forEach(([x, y, r]) => { const m = new THREE.Mesh(nonGeo, nonMat); m.position.set(x, y, 0); m.rotation.set(rnd(-.05, .05), r, rnd(-.05, .05)); nonG.add(m); });
  dish('non', nonG, new THREE.Vector3(-1.75, 0, -.75));

  // 2. plov on a lagan (big round platter): rice mound, carrot batons, chickpeas, lamb, garlic head
  const plovG = new THREE.Group();
  const lagan = new THREE.Mesh(lathe([[0, 0], [.7, 0], [.86, .05], [.96, .1], [.98, .1], [.9, .04], [0, .02]]), bowlMat); plovG.add(lagan);
  const riceTex = tex(512, 512, (g, W) => { g.fillStyle = '#e2b56a'; g.fillRect(0, 0, W, W); for (let i = 0; i < 9000; i++) { g.fillStyle = ['#f3d79c', '#d39a4a', '#eac27c', '#c47f2e'][i % 4]; g.save(); g.translate(rnd(0, W), rnd(0, W)); g.rotate(rnd(0, 3)); g.fillRect(-4, -1.4, 8, 2.8); g.restore(); } }, renderer, true);
  const mound = new THREE.Mesh(lathe([[0, .3], [.25, .28], [.5, .2], [.68, .1], [.76, .03], [0, .03]].reverse(), 48), new THREE.MeshPhysicalMaterial({ map: riceTex, roughness: .55, sheen: .4, clearcoat: .3 }));
  { const p = mound.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + Math.sin(x * 19) * Math.cos(z * 17) * .008); } mound.geometry.computeVertexNormals(); }
  plovG.add(mound);
  const carrotMat = new THREE.MeshPhysicalMaterial({ color: 0xe0782a, roughness: .35, clearcoat: .6 });
  const carrot = new THREE.BoxGeometry(.2, .025, .025);
  const carrots = new THREE.InstancedMesh(carrot, carrotMat, 70); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 70; i++) { const a = rnd(0, 7), r = Math.sqrt(rnd()) * .62, y = .3 - (r / .76) * .27 + .02; E.set(rnd(-.3, .3), rnd(0, 7), rnd(-.4, .4)); Q.setFromEuler(E); V.set(Math.cos(a) * r, y, Math.sin(a) * r); carrots.setMatrixAt(i, M.compose(V, Q, S)); } plovG.add(carrots);
  const chick = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.03, 1), new THREE.MeshPhysicalMaterial({ color: 0xd9b46a, roughness: .5 }), 40);
  for (let i = 0; i < 40; i++) { const a = rnd(0, 7), r = Math.sqrt(rnd()) * .6, y = .3 - (r / .76) * .27 + .025; V.set(Math.cos(a) * r, y, Math.sin(a) * r); chick.setMatrixAt(i, M.compose(V, Q.identity(), S)); } plovG.add(chick);
  const lambMat = new THREE.MeshPhysicalMaterial({ color: 0x6a3418, roughness: .45, clearcoat: .5 });
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.075, 0), lambMat); const a = i / 6 * Math.PI * 2; m.scale.set(1.2, .7, 1); m.position.set(Math.cos(a) * .16, .31, Math.sin(a) * .16); plovG.add(m); }
  const garlic = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xc89a5a, roughness: .5, clearcoat: .4 })); garlic.scale.y = .8; garlic.position.y = .36; plovG.add(garlic);
  dish('plov', plovG, new THREE.Vector3(0, 0, -.1));

  // 3. shashlik on a wooden plank, with onion rings
  const shG = new THREE.Group();
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.3, .06, .52), new THREE.MeshPhysicalMaterial({ color: 0x9a6438, roughness: .6, clearcoat: .2 })); plank.position.y = .03; shG.add(plank);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xc7c9cc, metalness: 1, roughness: .25 });
  const meat = new THREE.MeshPhysicalMaterial({ color: 0x7a3a16, roughness: .4, clearcoat: .6, clearcoatRoughness: .3 });
  [-.13, .13].forEach((z, j) => {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.4, 8), steel); sk.rotation.z = Math.PI / 2; sk.position.set(.05, .14, z); shG.add(sk);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.075, 1), meat); m.scale.set(1, .85, .95); m.rotation.set(rnd(0, 3), rnd(0, 3), 0); m.position.set(-.45 + i * .17, .14, z); shG.add(m); }
  });
  const onionMat = new THREE.MeshPhysicalMaterial({ color: 0xf1e3f0, roughness: .3, clearcoat: .6, transparent: true, opacity: .92 });
  for (let i = 0; i < 6; i++) { const o = new THREE.Mesh(new THREE.TorusGeometry(rnd(.04, .07), .009, 6, 20), onionMat); o.rotation.x = Math.PI / 2 + rnd(-.3, .3); o.position.set(rnd(-.5, .5), .075, rnd(-.2, .2)); shG.add(o); }
  shG.rotation.y = .25;
  dish('shashlik', shG, new THREE.Vector3(1.7, 0, -.85));

  // 4. kurutob: a wooden tabaq with torn bread under kurut sauce, topped with salad
  const kG = new THREE.Group();
  const tabaq = new THREE.Mesh(lathe([[0, 0], [.42, 0], [.5, .08], [.56, .14], [.53, .15], [.46, .06], [0, .05]]), new THREE.MeshPhysicalMaterial({ color: 0x8a5228, roughness: .45, clearcoat: .5 })); kG.add(tabaq);
  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(.47, .44, .05, 40), new THREE.MeshPhysicalMaterial({ color: 0xf2ece0, roughness: .3, clearcoat: .7 })); sauce.position.y = .08; kG.add(sauce);
  const greenMat = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .45, clearcoat: .4 });
  const salad = [[0xd23a2a, 18, .05], [0x6aa84f, 22, .045], [0xf4f0e6, 12, .04], [0x3f7a2a, 24, .03]];
  salad.forEach(([c, n, s]) => { for (let i = 0; i < n; i++) { const a = rnd(0, 7), r = Math.sqrt(rnd()) * .36; const m = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s * .6, s), greenMat(c)); m.position.set(Math.cos(a) * r, .12 + rnd(0, .05), Math.sin(a) * r); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); kG.add(m); } });
  dish('kurutob', kG, new THREE.Vector3(-1.55, 0, .95));

  // 5. tea: a choynak teapot and two piala bowls
  const tG = new THREE.Group();
  const potMat = bowlMat;
  const pot = new THREE.Mesh(lathe([[0, 0], [.16, 0], [.22, .08], [.24, .18], [.2, .27], [.12, .31], [.1, .33], [0, .33]], 40), potMat); tG.add(pot);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), ceramic(0x1f3c8c)); knob.position.y = .36; tG.add(knob);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.018, .035, .22, 12), potMat); spout.position.set(.27, .2, 0); spout.rotation.z = -.9; tG.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 8, 20, Math.PI * 1.2), potMat); handle.position.set(-.23, .18, 0); handle.rotation.z = Math.PI * .4; tG.add(handle);
  const pialaGeo = lathe([[0, 0], [.05, 0], [.06, .01], [.1, .06], [.115, .09], [.108, .09], [.093, .06], [.05, .012], [0, .012]], 40);
  const teaMat = new THREE.MeshPhysicalMaterial({ color: 0x8a4a12, roughness: .05, clearcoat: 1, transmission: 0 });
  [[.45, .15], [.4, -.2]].forEach(([x, z]) => { const p = new THREE.Mesh(pialaGeo, bowlMat); p.position.set(x, 0, z); tG.add(p); const t = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), teaMat); t.rotation.x = -Math.PI / 2; t.position.set(x, .07, z); tG.add(t); });
  dish('tea', tG, new THREE.Vector3(1.3, 0, .9));

  /* ----- landing sequence ----- */
  const seq = sequencer();
  const land = (d, delay = 0) => ({ d: .55, run: k => { const r = d.group.userData.rest; d.group.visible = true; const fall = k < .7 ? 1 - Math.pow(k / .7, 2) : 0; const sq = k > .66 && k < .86 ? 1 - Math.sin((k - .66) / .2 * Math.PI) * .1 : 1; d.group.position.set(r.x, r.y + fall * 2.4, r.z); d.group.scale.set(1 + (1 - sq) * .4, sq, 1 + (1 - sq) * .4); } });
  if (!RM) seq.push({ d: .3 }, ...['non', 'plov', 'shashlik', 'kurutob', 'tea'].map(id => land(dishes.find(x => x.id === id))));

  /* ----- picking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), meshes = []; dishes.forEach(d => d.group.traverse(m => { if (m.isMesh) meshes.push(m); }));
  let hover = null, sel = null, onPick = o.onPick || (() => {});
  function pick(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.object.userData.id : null; }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => { if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (mv > 8) return; const id = pick(e); select(id); if (id) onPick(id); });
  if (FINE) canvas.addEventListener('pointermove', e => { const id = pick(e); if (id !== hover) { hover = id; canvas.style.cursor = id ? 'pointer' : ''; kick(); } });
  function select(id) { sel = id; kick(); }

  /* ----- camera / loop ----- */
  let aspect = 1, drift = { x: 0, y: 0, gx: 0, gy: 0 }, clock = 0;
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick(); }
  let visible = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    seq.tick(dt);
    dishes.forEach(d => { const lift = (d.id === sel ? .14 : d.id === hover ? .06 : 0); const r = d.group.userData.rest; if (!seq.busy || d.group.position.y < .3) { d.group.position.y += (r.y + lift - d.group.position.y) * (1 - Math.pow(.001, dt)); } if (d.id === 'plov' && !RM) d.group.rotation.y += dt * .05; });
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    const wide = innerWidth > 900, dist = wide ? 10 + Math.max(0, 1.75 - aspect) * 7 : 8.6 / Math.max(.6, aspect), el = (wide ? .78 : .95) + drift.y * .04, az = drift.x * .12;
    const tgt = new THREE.Vector3(wide ? 1.35 : 0, 0, wide ? .1 : .05);
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist); camera.lookAt(tgt);
    renderer.render(scene, camera);
    const settled = dishes.every(d => Math.abs(d.group.position.y - (d.group.userData.rest.y + (d.id === sel ? .14 : d.id === hover ? .06 : 0))) < .001);
    const moving = seq.busy || !settled || (!RM && true) || Math.abs(drift.gx - drift.x) > .002;
    if (visible && !document.hidden && moving) raf = requestAnimationFrame(frame);
  }
  size(); await renderer.compileAsync?.(scene, camera); kick();
  return { select, get busy() { return seq.busy; }, ids: dishes.map(d => d.id) };
}
