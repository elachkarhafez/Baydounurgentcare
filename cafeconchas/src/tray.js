/* =====================================================================
   Café Conchas: the panadería tray.
   A sheet tray on parchment with a dozen conchas in pink, vanilla and
   chocolate, each a lathe-turned bun with a sugar-shell crust scored in the
   real shell pattern. Tap one: it hops, a bite comes out of it (the lathe is
   swapped for an open one with a crumb face) and sugar crumbs scatter, then
   that concha's card opens. Kit method: studio HDRI, physical materials,
   lathe geometry, shadow catcher on a transparent canvas, step sequencer,
   pointer drift, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh cafeconchas/src/tray.js cafeconchas/assets/tray.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
let seed = 33; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...s) { q.push(...s); },
    get busy() { return !!(cur || q.length); },
    tick(dt) { for (let n = 0; n < 12; n++) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; else return; } },
  };
}

// sugar-shell crust: base colour, the scored shell lines radiating from the crown, cracks and sugar sparkle
const SHELL = { pink: ['#f4b6c4', '#e98fa6'], vanilla: ['#f7e6b6', '#e8c98a'], choc: ['#7a4a2c', '#5a321c'] };
function shellTex(kind, renderer) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), cx = S / 2, [a, b] = SHELL[kind];
  const grd = g.createRadialGradient(cx, cx, 10, cx, cx, S / 2); grd.addColorStop(0, a); grd.addColorStop(.85, a); grd.addColorStop(1, b);
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.08, .35)})`; g.fillRect(rnd(0, S), rnd(0, S), rnd(1, 2.5), rnd(1, 2.5)); }
  // the shell: curved scored grooves fanning from one side, like the real conchas
  g.strokeStyle = kind === 'choc' ? 'rgba(35,16,6,.85)' : 'rgba(150,95,50,.55)'; g.lineWidth = 7; g.lineCap = 'round';
  const n = 9;
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, ang = lerp(-1.25, 1.25, t); g.beginPath(); g.moveTo(cx - S * .38, cx); g.quadraticCurveTo(cx + Math.sin(ang) * 20, cx + Math.sin(ang) * S * .42, cx + Math.cos(ang) * S * .44, cx + Math.sin(ang) * S * .44); g.stroke(); }
  // the bread showing through the grooves
  g.strokeStyle = kind === 'choc' ? 'rgba(232,180,120,.75)' : 'rgba(214,150,80,.55)'; g.lineWidth = 3;
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, ang = lerp(-1.25, 1.25, t); g.beginPath(); g.moveTo(cx - S * .38, cx); g.quadraticCurveTo(cx + Math.sin(ang) * 20, cx + Math.sin(ang) * S * .42, cx + Math.cos(ang) * S * .44, cx + Math.sin(ang) * S * .44); g.stroke(); }
  // bread edge below the crust
  g.save(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#d99a52'; g.fillRect(0, 0, S, S); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}

export async function mountTray(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .75; }
  const key = new THREE.DirectionalLight(0xfff1dc, 2.3); key.position.set(-3, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 24 }); key.shadow.radius = 5; key.shadow.bias = -.0005;
  const rim = new THREE.DirectionalLight(0xffd9b8, 1.1); rim.position.set(5, 4, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfff6ea, 0xb98a5e, .55));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .28, color: 0x4a2a14 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ----- sheet tray + parchment ----- */
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: .38 });
  const W = 5.2, D = 3.6;
  const base = cast(new THREE.Mesh(new RoundedBoxGeometry(W, .05, D, 3, .02), metal)); base.position.y = .025; scene.add(base);
  for (const [w, d, x, z] of [[W, .07, 0, D / 2], [W, .07, 0, -D / 2], [.07, D, W / 2, 0], [.07, D, -W / 2, 0]]) { const r = cast(new THREE.Mesh(new RoundedBoxGeometry(w, .14, d, 2, .03), metal)); r.position.set(x, .08, z); scene.add(r); }
  const paperTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#efe2c6'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(150,110,60,${rnd(.04, .1)})`; g.lineWidth = rnd(1, 3); g.beginPath(); const y = rnd(0, 512); g.moveTo(0, y); g.bezierCurveTo(170, y + rnd(-30, 30), 340, y + rnd(-30, 30), 512, y + rnd(-20, 20)); g.stroke(); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(200,140,60,${rnd(.05, .12)})`; g.beginPath(); g.arc(rnd(0, 512), rnd(0, 512), rnd(8, 30), 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const paperGeo = new THREE.PlaneGeometry(W - .22, D - .22, 30, 20); paperGeo.rotateX(-Math.PI / 2); { const p = paperGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, .06 + Math.abs(Math.sin(p.getX(i) * 2.3 + p.getZ(i) * 1.7)) * .01); paperGeo.computeVertexNormals(); }
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshPhysicalMaterial({ map: paperTex, roughness: .8, sheen: .4, sheenColor: 0xffffff })); paper.receiveShadow = true; scene.add(paper);

  /* ----- conchas ----- */
  const R = .55, H = .5;
  const prof = []; for (let i = 0; i <= 18; i++) { const t = i / 18, a = t * Math.PI / 2; prof.push(new THREE.Vector2(R * Math.cos(a) * (1 + .04 * Math.sin(t * Math.PI)), H * Math.sin(a) * (1 - .12 * t * t))); }
  prof.unshift(new THREE.Vector2(0, -.01), new THREE.Vector2(R * .96, -.01)); // close the bottom
  const planar = geo => { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / (R * 2.2) + .5; uv[i * 2 + 1] = .5 - p.getZ(i) / (R * 2.2); } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; };
  const lumpy = geo => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y > .05) { const n = Math.sin(x * 23) * Math.cos(z * 19) * .008; p.setY(i, y + n); } } geo.computeVertexNormals(); return geo; };
  const wholeGeo = lumpy(planar(new THREE.LatheGeometry(prof, 72)));
  const BITE = 1.5;
  const bitGeo = lumpy(planar(new THREE.LatheGeometry(prof, 64, BITE / 2, Math.PI * 2 - BITE)));
  // the crumb face where the bite came out: two half-profile shapes
  const crumbTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f2dcae'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd(170, 210) | 0},${rnd(130, 160) | 0},${rnd(80, 110) | 0},${rnd(.2, .6)})`; g.beginPath(); g.arc(rnd(0, 256), rnd(0, 256), rnd(1, 4), 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const crumbMat = new THREE.MeshPhysicalMaterial({ map: crumbTex, roughness: .9, side: THREE.DoubleSide });
  const half = new THREE.Shape(prof.map(v => new THREE.Vector2(v.x, v.y)));
  function faceAt(phi) { const g = new THREE.ShapeGeometry(half, 12); g.rotateY(phi - Math.PI / 2); return g; }
  // the arrangement: 4 x 3 with a little jitter, colours mixed like a real tray
  const kinds = ['pink', 'vanilla', 'choc', 'vanilla', 'choc', 'pink', 'pink', 'choc', 'vanilla', 'choc', 'vanilla', 'pink'];
  const mats = {}; Object.keys(SHELL).forEach(k => { mats[k] = new THREE.MeshPhysicalMaterial({ map: shellTex(k, renderer), roughness: .62, sheen: .6, sheenColor: 0xffffff, clearcoat: .15 }); });
  const conchas = [];
  for (let i = 0; i < 12; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const x = (col - 1.5) * 1.22 + rnd(-.06, .06), z = (row - 1) * 1.12 + rnd(-.06, .06);
    const g = new THREE.Group(); g.position.set(x, .07, z); g.rotation.y = rnd(0, Math.PI * 2); scene.add(g);
    const whole = cast(new THREE.Mesh(wholeGeo, mats[kinds[i]])); g.add(whole);
    const bit = new THREE.Group(); bit.visible = false; g.add(bit);
    bit.add(cast(new THREE.Mesh(bitGeo, mats[kinds[i]])));
    bit.add(new THREE.Mesh(faceAt(BITE / 2), crumbMat)); bit.add(new THREE.Mesh(faceAt(-BITE / 2), crumbMat));
    const s = rnd(.92, 1.06); g.scale.set(s, s * rnd(.95, 1.05), s);
    g.userData = { i, kind: kinds[i], rest: g.position.clone(), s, sy: g.scale.y };
    whole.userData.i = i; bit.children.forEach(m => m.userData.i = i);
    conchas.push({ g, whole, bit, kind: kinds[i], bitten: false });
  }

  // sugar crumbs (instanced)
  const N = 90, crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.025, 0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .6 }), N);
  crumbs.castShadow = true; crumbs.frustumCulled = false; scene.add(crumbs);
  const cv = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), C = new THREE.Color();
  for (let i = 0; i < N; i++) { crumbs.setMatrixAt(i, M.makeScale(0, 0, 0)); crumbs.setColorAt(i, C.set(0xffffff)); }
  function burst(c) {
    const cols = SHELL[c.kind]; const g = c.g; const dir = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
    cv.forEach((k, i) => { k.p.set(g.position.x + dir.x * .4, g.position.y + .35, g.position.z + dir.z * .4); k.v.set(dir.x * rnd(.5, 1.6) + rnd(-.8, .8), rnd(1.2, 2.6), dir.z * rnd(.5, 1.6) + rnd(-.8, .8)); k.life = 1; crumbs.setColorAt(i, C.set(i % 3 ? cols[0] : '#f2dcae')); });
    crumbs.instanceColor.needsUpdate = true;
  }

  /* ----- sequences ----- */
  const seq = sequencer(), onPick = o.onPick || (() => {});
  let sel = -1;
  function bite(i) {
    const c = conchas[i]; if (!c || seq.busy) return;
    sel = i;
    const g = c.g, r = g.userData.rest, s = g.userData.s, sy = g.userData.sy;
    g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z) + BITE * 0;
    if (c.bitten) { seq.push({ d: RM ? 0 : .45, run: k => { g.position.y = r.y + Math.sin(k * Math.PI) * .35; } }); onPick(i, c.kind); kick(); return; }
    seq.push(
      { d: RM ? 0 : .28, run: k => { const e = easeOut(k); g.position.y = r.y + e * .45; g.rotation.x = -e * .25; } },
      { d: 0, run: () => { c.whole.visible = false; c.bit.visible = true; c.bitten = true; if (!RM) burst(c); g.scale.set(s * 1.08, sy * .9, s * 1.08); } },
      { d: RM ? 0 : .45, run: k => { const e = easeOut(k); g.position.y = r.y + (1 - e) * .45; g.rotation.x = -.25 * (1 - e); const q = 1 + Math.sin(k * Math.PI) * .06; g.scale.set(s * (1.08 - .08 * e), sy * (.9 + .1 * e) * q, s * (1.08 - .08 * e)); } },
      { d: 0, run: () => onPick(i, c.kind) }
    );
    kick();
  }
  function reset() { conchas.forEach(c => { c.whole.visible = true; c.bit.visible = false; c.bitten = false; }); sel = -1; kick(); }
  // intro: conchas drop onto the tray row by row
  if (!RM) { conchas.forEach(c => { c.g.visible = false; }); seq.push({ d: .25 }, ...[0, 1, 2].map(row => ({ d: .5, run: k => { conchas.filter(c => Math.floor(c.g.userData.i / 4) === row).forEach((c, j) => { const kk = clamp(k * 1.3 - j * .08); c.g.visible = kk > 0; const fall = kk < .7 ? 1 - Math.pow(kk / .7, 2) : 0; c.g.position.y = c.g.userData.rest.y + fall * 2; const sq = kk > .66 && kk < .9 ? 1 - Math.sin((kk - .66) / .24 * Math.PI) * .12 : 1; c.g.scale.set(c.g.userData.s * (1 + (1 - sq) * .4), c.g.userData.sy * sq, c.g.userData.s * (1 + (1 - sq) * .4)); }); } }))); }

  /* ----- picking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), meshes = []; conchas.forEach(c => { meshes.push(c.whole, ...c.bit.children); });
  function pick(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(meshes, false).find(x => x.object.visible && x.object.parent.visible !== false); return h ? h.object.userData.i : -1; }
  let down = null, hover = -1;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => { if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (mv > 8) return; const i = pick(e); if (i >= 0) bite(i); });
  if (FINE) canvas.addEventListener('pointermove', e => { const i = pick(e); if (i !== hover) { hover = i; canvas.style.cursor = i >= 0 ? 'pointer' : ''; kick(); } });

  /* ----- loop ----- */
  let aspect = 1, drift = { x: 0, y: 0, gx: 0, gy: 0 };
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick(); }
  let visible = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    seq.tick(dt);
    let live = false;
    cv.forEach((k, i) => { if (k.life <= 0) return; live = true; k.life -= dt * .9; k.v.y -= 9 * dt; k.p.addScaledVector(k.v, dt); if (k.p.y < .08) { k.p.y = .08; k.v.multiplyScalar(.4); k.v.y = Math.abs(k.v.y) * .3; } const s = k.life > 0 ? 1 : 0; crumbs.setMatrixAt(i, M.compose(k.p, Q, Sc.setScalar(s * (k.life > .2 ? 1 : k.life * 5)))); });
    if (live) crumbs.instanceMatrix.needsUpdate = true;
    conchas.forEach((c, i) => { if (seq.busy) return; const r = c.g.userData.rest; const want = r.y + (i === hover && i !== sel ? .06 : 0); c.g.position.y += (want - c.g.position.y) * (1 - Math.pow(.002, dt)); });
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    const wide = innerWidth > 900, dist = wide ? 10.2 + Math.max(0, 1.6 - aspect) * 5 : Math.max(10, 9.6 / Math.max(.6, aspect)), el = (wide ? .86 : 1.0) + drift.y * .04, az = .18 + drift.x * .12;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist); const lx = wide ? .55 : 0; camera.position.x += lx; camera.lookAt(lx, 0, .1);
    renderer.render(scene, camera);
    if (visible && !document.hidden && (seq.busy || live || !RM)) raf = requestAnimationFrame(frame);
  }
  size(); await renderer.compileAsync?.(scene, camera); kick();
  return { bite, reset, get busy() { return seq.busy; }, kinds };
}
