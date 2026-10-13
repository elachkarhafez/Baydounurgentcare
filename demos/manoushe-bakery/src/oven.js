/* =====================================================================
   Ovenrise Bakery (concept): "Breakfast starts at the oven."
   A wooden peel straight out of the oven: a za'atar manoushe (lathe-
   turned dough with a raised rim, blistered crust, za'atar, sesame and
   olive-oil sheen painted into a planar CanvasTexture), triangular
   spinach fatayer and open meat pies. They drop onto the peel one by one
   and settle (step sequencer); the peel turns slowly, drifts with the
   pointer, and the canvas is transparent over the page's orange.
   Bundle: kit/build3d/build.sh demos/manoushe-bakery/src/oven.js demos/manoushe-bakery/assets/oven.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
let seed = 11; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const c = (i, j) => hash(xi + i, yi + j); return lerp(lerp(c(0, 0), c(1, 0), u), lerp(c(0, 1), c(1, 1), u), v) * 2 - 1; }

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    play(steps) { q = steps.slice(); cur = null; },
    get busy() { return !!(cur || q.length); },
    tick(dt) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; },
  };
}
function canvasTex(size, draw, renderer, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t;
}
// dough: golden base, browned blisters, flour dust
function dough(g, S, opts = {}) {
  const grd = g.createRadialGradient(S / 2, S / 2, S * .1, S / 2, S / 2, S * .52);
  grd.addColorStop(0, opts.c0 || '#e9b46a'); grd.addColorStop(.75, opts.c1 || '#d9963f'); grd.addColorStop(1, opts.c2 || '#b8732a');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { const x = rnd(0, S), y = rnd(0, S), r = rnd(3, 18) * S / 1024; g.fillStyle = `rgba(${rnd(120, 160) | 0},${rnd(62, 84) | 0},${rnd(20, 34) | 0},${rnd(.15, .55)})`; g.beginPath(); g.ellipse(x, y, r, r * rnd(.6, 1), rnd(0, 3), 0, 7); g.fill(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,240,215,${rnd(.04, .14)})`; g.fillRect(rnd(0, S), rnd(0, S), 2, 2); }
}
function zaatar(g, S, R) {
  // oil-darkened za'atar paste with sesame, inside radius R (fraction of S)
  const cx = S / 2, cy = S / 2, r = S * R;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
  g.fillStyle = 'rgba(82,72,30,.82)'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * r; g.fillStyle = ['#4f5a22', '#6b6a2c', '#3c3f17', '#7a6a34', '#8c3f22'][i % 5]; g.globalAlpha = rnd(.4, 1); g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd(1.5, 4), rnd(1.5, 4)); }
  g.globalAlpha = 1;
  for (let i = 0; i < 520; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * r * .96; g.fillStyle = '#efe0bc'; g.save(); g.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); g.rotate(rnd(0, 3)); g.beginPath(); g.ellipse(0, 0, 4.5, 2.4, 0, 0, 7); g.fill(); g.restore(); }
  // a few dough bubbles poking through
  for (let i = 0; i < 26; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * r * .9; g.fillStyle = 'rgba(214,150,70,.85)'; g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd(8, 22), rnd(6, 14), rnd(0, 3), 0, 7); g.fill(); }
  g.restore();
}
function meat(g, S, R) {
  const cx = S / 2, cy = S / 2, r = S * R;
  g.save(); g.beginPath(); g.rect(cx - r, cy - r, r * 2, r * 2); g.clip();
  g.fillStyle = '#7d3b22'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) { g.fillStyle = ['#5e2a17', '#9a4a2a', '#b85a33', '#6b3a1e', '#c7362a'][i % 5]; g.globalAlpha = rnd(.5, 1); g.beginPath(); g.arc(rnd(cx - r, cx + r), rnd(cy - r, cy + r), rnd(2, 7), 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 40; i++) { g.fillStyle = '#f1e2c2'; g.save(); g.translate(rnd(cx - r, cx + r), rnd(cy - r, cy + r)); g.rotate(rnd(0, 3)); g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, 7); g.fill(); g.restore(); }
  g.restore();
}

export async function mountOven(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .7; }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-3, 8, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 20 }); key.shadow.radius = 6; key.shadow.bias = -.0005;
  const rim = new THREE.DirectionalLight(0xffd2a0, 1.2); rim.position.set(4, 3, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfff4e6, 0xd2793a, .65));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .28, color: 0x5a1f04 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const planarUV = (geo, span) => { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / span + .5; uv[i * 2 + 1] = .5 - p.getZ(i) / span; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); };
  const lumpy = (geo, amp, freq) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y > .01) p.setY(i, y + vnoise(x * freq + 3, z * freq) * amp * y * 6); } geo.computeVertexNormals(); };

  // ---------- the peel ----------
  const peel = new THREE.Group(); scene.add(peel);
  const woodTex = canvasTex(1024, (g, S) => {
    g.fillStyle = '#b07a46'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 2) { const n = vnoise(y * .02, 1) * 18 + vnoise(y * .11, 4) * 6; g.fillStyle = `rgba(${110 + n | 0},${70 + n * .6 | 0},${36},${.18 + Math.abs(vnoise(y * .05, 7)) * .25})`; g.fillRect(0, y, S, 2); }
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(70,40,20,.25)'; g.lineWidth = 2; g.beginPath(); g.ellipse(rnd(0, S), rnd(0, S), rnd(20, 60), rnd(6, 14), 0, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(40,20,10,.18)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(rnd(S * .2, S * .8), rnd(S * .2, S * .8), rnd(20, 60), 0, 7); g.fill(); } // oven scorch
  }, renderer);
  const board = cast(new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.6, .12, 96), [new THREE.MeshPhysicalMaterial({ color: 0x8a5a30, roughness: .8 }), new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .72, sheen: .3 }), new THREE.MeshPhysicalMaterial({ color: 0x8a5a30, roughness: .8 })]));
  board.position.y = .06; peel.add(board);
  const handle = cast(new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, .5), new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .72 })));
  handle.position.set(3.55, .05, 0); peel.add(handle);
  // flour dust on the peel
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 240 }, () => { const a = rnd(0, 7), d = Math.sqrt(rnd()) * 2.4; return [Math.cos(a) * d, .125, Math.sin(a) * d]; }).flat(), 3)), new THREE.PointsMaterial({ color: 0xfff6e6, size: .018, transparent: true, opacity: .7 }));
  peel.add(dust);

  // ---------- za'atar manoushe ----------
  const prof = []; const R = 1.42;
  [[0, .07], [.6, .075], [1.1, .08], [R - .2, .1], [R - .1, .15], [R - .02, .14], [R, .09], [R + .01, .03], [R - .02, 0], [0, 0]].forEach(([x, y]) => prof.push(new THREE.Vector2(x, y)));
  const mGeo = new THREE.LatheGeometry(prof.reverse(), 120); lumpy(mGeo, .006, 2.2); planarUV(mGeo, R * 2.1);
  const mTex = canvasTex(1024, (g, S) => { dough(g, S); zaatar(g, S, .4); }, renderer);
  const manoushe = cast(new THREE.Mesh(mGeo, new THREE.MeshPhysicalMaterial({ map: mTex, roughness: .55, clearcoat: .45, clearcoatRoughness: .35, sheen: .4, sheenColor: 0xffd29a })));
  manoushe.position.set(-.55, .12, .15);
  // ---------- spinach fatayer (triangles) ----------
  const triShape = new THREE.Shape(); const tr = .52;
  for (let i = 0; i < 3; i++) { const a0 = -Math.PI / 2 + i * 2 * Math.PI / 3, a1 = a0 + 2 * Math.PI / 3; const p0 = [Math.cos(a0) * tr, Math.sin(a0) * tr], p1 = [Math.cos(a1) * tr, Math.sin(a1) * tr]; if (i === 0) triShape.moveTo(p0[0] * .86 + p1[0] * .14, p0[1] * .86 + p1[1] * .14); triShape.quadraticCurveTo(p1[0] * 1.08, p1[1] * 1.08, p1[0] * .86 + Math.cos(a1 + 2 * Math.PI / 3) * tr * .14, p1[1] * .86 + Math.sin(a1 + 2 * Math.PI / 3) * tr * .14); }
  const fGeo = new THREE.ExtrudeGeometry(triShape, { depth: .08, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 8, curveSegments: 18 });
  fGeo.rotateX(-Math.PI / 2); fGeo.translate(0, .12, 0); planarUV(fGeo, 1.4);
  const fTex = canvasTex(512, (g, S) => { dough(g, S, { c0: '#eab872', c1: '#d8923c', c2: '#c27a30' }); g.strokeStyle = 'rgba(150,80,30,.55)'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 3; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + Math.cos(a) * S * .3, S / 2 - Math.sin(a) * S * .3); g.stroke(); } }, renderer);
  const fMat = new THREE.MeshPhysicalMaterial({ map: fTex, roughness: .6, clearcoat: .25, sheen: .5, sheenColor: 0xffd29a });
  const fatayer = [[1.25, .02, -.55, .4], [1.55, .02, .55, -.5], [.35, .02, 1.6, 1.4]].map(([x, y, z, r]) => { const m = cast(new THREE.Mesh(fGeo, fMat)); m.position.set(x, y + .12, z); m.rotation.y = r; return m; });
  // ---------- open meat pies (sfiha) ----------
  const sq = new THREE.Shape(); const s = .34, cr = .1; sq.moveTo(-s + cr, -s); sq.lineTo(s - cr, -s); sq.quadraticCurveTo(s, -s, s, -s + cr); sq.lineTo(s, s - cr); sq.quadraticCurveTo(s, s, s - cr, s); sq.lineTo(-s + cr, s); sq.quadraticCurveTo(-s, s, -s, s - cr); sq.lineTo(-s, -s + cr); sq.quadraticCurveTo(-s, -s, -s + cr, -s);
  const sGeo = new THREE.ExtrudeGeometry(sq, { depth: .03, bevelEnabled: true, bevelThickness: .07, bevelSize: .06, bevelSegments: 6, curveSegments: 10 });
  sGeo.rotateX(-Math.PI / 2); sGeo.translate(0, .08, 0); planarUV(sGeo, .95);
  const sTex = canvasTex(512, (g, S) => { dough(g, S); meat(g, S, .3); }, renderer);
  const sMat = new THREE.MeshPhysicalMaterial({ map: sTex, roughness: .5, clearcoat: .5, clearcoatRoughness: .3 });
  const sfiha = [[.05, -1.55, .2], [-1.55, -1.2, -.4], [-1.95, .9, .8]].map(([x, z, r]) => { const m = cast(new THREE.Mesh(sGeo, sMat)); m.position.set(x, .12, z); m.rotation.y = r; return m; });

  const pieces = [manoushe, ...fatayer, ...sfiha];
  pieces.forEach(p => { p.userData.rest = p.position.clone(); p.userData.restRot = p.rotation.y; peel.add(p); });

  // ---------- drop sequence ----------
  const seq = sequencer();
  const drop = (m, d = .5) => ({ d, run: k => { const r = m.userData.rest; m.visible = true; const fall = k < .7 ? 1 - Math.pow(k / .7, 2) : 0; const b = k >= .7 ? Math.sin((k - .7) / .3 * Math.PI) * .06 * (1 - k) : 0; m.position.set(r.x, r.y + fall * 3.2 + b, r.z); const sq = k > .66 && k < .8 ? 1 - Math.sin((k - .66) / .14 * Math.PI) * .18 : 1; m.scale.set(1 + (1 - sq) * .5, sq, 1 + (1 - sq) * .5); m.rotation.y = m.userData.restRot + (1 - easeOut(k)) * .8; } });
  if (RM) pieces.forEach(p => p.visible = true);
  else { pieces.forEach(p => p.visible = false); seq.play([{ d: .35 }, drop(manoushe, .6), ...fatayer.map(f => drop(f, .42)), ...sfiha.map(f => drop(f, .36))]); }

  // ---------- camera / loop ----------
  let aspect = 1, drift = { x: 0, y: 0, gx: 0, gy: 0 }, spin = 0;
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick(); }
  function place() { const dist = aspect < .9 ? 11.5 / Math.max(.55, aspect) * .62 : 9.6; const el = .78 + drift.y * .05, az = .25 + drift.x * .12; const t = new THREE.Vector3(.35, 0, 0); camera.position.set(t.x + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, t.z + Math.cos(az) * Math.cos(el) * dist); camera.lookAt(t); }
  let visible = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    seq.tick(dt);
    if (!RM) spin += dt * .07; peel.rotation.y = Math.sin(spin) * .35 - .2;
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    place(); renderer.render(scene, camera);
    if (visible && !document.hidden && !RM) raf = requestAnimationFrame(frame);
  }
  size(); await renderer.compileAsync?.(scene, camera); kick();
  return { renderer, get busy() { return seq.busy; } };
}
