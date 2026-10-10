/* =====================================================================
   The Gallery: "On View". Their arched G monogram built as a real object:
   a bronze double arch on a black-marble plinth, with their own footage
   playing inside it behind glass.
   Sequence: plinth rises → outer arch casts upward → inner arch traces
   down → the picture fades up behind the glass → a light sweep crosses it.
   Scroll pushes the camera toward the frame (setPush 0..1).
   Bundle: kit/build3d/build.sh thegallerymi/src/arch.js thegallerymi/assets/arch.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

// picture opening: 9:16 like the footage
const W = 1, H = 1.78, T = .085, GAP = .05, T2 = .022, BASE = .46;

function archPath(p, w, h, y0) { // rectangle with a semicircle top, counter-clockwise
  const r = w / 2, cy = y0 + h - r;
  p.moveTo(-r, y0); p.lineTo(r, y0); p.lineTo(r, cy);
  p.absarc(0, cy, r, 0, Math.PI, false);
  p.lineTo(-r, y0);
  return p;
}
function ring(wIn, hIn, yIn, t) { // arch-shaped frame of thickness t around an opening
  const s = archPath(new THREE.Shape(), wIn + 2 * t, hIn + 2 * t, yIn - t);
  s.holes.push(archPath(new THREE.Path(), wIn, hIn, yIn));
  return s;
}

function marble(w, h, seed = 7, label) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#121212'; g.fillRect(0, 0, w, h);
  // soft cloudy depth
  for (let i = 0; i < 60; i++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 180; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${40 + rnd() * 20|0},${38 + rnd() * 18|0},${36 + rnd() * 16|0},.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // veins: wandering strokes, a few bright, many faint
  const vein = (alpha, width, len) => {
    let x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < len; i++) { a += (rnd() - .5) * .5; x += Math.cos(a) * 9; y += Math.sin(a) * 5; g.lineTo(x, y); }
    g.strokeStyle = `rgba(232,226,214,${alpha})`; g.lineWidth = width; g.stroke();
  };
  g.filter = 'blur(1.4px)'; for (let i = 0; i < 26; i++) vein(.05 + rnd() * .08, 1 + rnd() * 3, 40 + rnd() * 90);
  g.filter = 'blur(.5px)'; for (let i = 0; i < 9; i++) vein(.25 + rnd() * .35, .6 + rnd() * 1.2, 50 + rnd() * 80);
  g.filter = 'none';
  // granite sparkle, like their bar top
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,250,240,${rnd() * .22})`; g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2); }
  if (label) label(g, w, h);
  return c;
}

export async function mountArch(canvas, o = {}) {
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
  const camera = new THREE.PerspectiveCamera(28, 1, .05, 60);
  const world = new THREE.Group(); scene.add(world);

  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, -.9, 0); scene.environmentIntensity = 1; }
  try { await document.fonts.load('500 64px Cinzel'); } catch (e) {}

  // ---- lights: warm key from upper left, cool rim from behind, low fill ----
  const key = new THREE.SpotLight(0xffe2bf, 46, 16, .5, .55, 1.6); key.position.set(-2.6, 5.2, 3.6); key.target.position.set(0, .9, 0);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -.0004; key.shadow.normalBias = .01;
  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.1); rim.position.set(2.5, 3, -3.5);
  const fill = new THREE.DirectionalLight(0xffd9b0, .35); fill.position.set(3, 1.2, 2.5);
  scene.add(key, key.target, rim, fill, new THREE.HemisphereLight(0xfff1e0, 0x1a1410, .25));

  // ---- shadow catcher ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: .55, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  // ---- plinth: black marble, bronze-inlaid name ----
  const PW = W + 2 * T + .62, PD = .62;
  const front = marble(1024, 256, 11, (g, w, h) => {
    g.font = '500 44px Cinzel, "Bodoni Moda", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.letterSpacing = '14px';
    const gr = g.createLinearGradient(0, h * .3, 0, h * .7); gr.addColorStop(0, '#e9cf9f'); gr.addColorStop(.5, '#b38a55'); gr.addColorStop(1, '#8a6436');
    g.fillStyle = gr; g.fillText('THE  GALLERY', w / 2, h * .46);
    g.font = '500 17px Cinzel, serif'; g.letterSpacing = '9px'; g.fillStyle = 'rgba(214,186,140,.75)';
    g.fillText('A CULINARY + LOUNGE EXPERIENCE', w / 2, h * .72);
  });
  const mtex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const stone = map => new THREE.MeshPhysicalMaterial({ map, roughness: .36, clearcoat: .35, clearcoatRoughness: .2, metalness: 0, envMapIntensity: .22 });
  const side = stone(mtex(marble(512, 256, 23))), top = stone(mtex(marble(512, 512, 5))), face = stone(mtex(front));
  top.color.setHex(0x8a8a8a); top.roughness = .5; top.clearcoat = .15; side.color.setHex(0xb0b0b0);
  const plinth = new THREE.Group(); world.add(plinth);
  const slabH = .07, blockH = BASE - slabH;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(PW + .2, slabH, PD + .16), [side, side, top, top, side, side]);
  slab.position.y = slabH / 2;
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW, blockH, PD), [side, side, top, top, face, side]);
  block.position.y = slabH + blockH / 2;
  [slab, block].forEach(m => { m.castShadow = m.receiveShadow = true; plinth.add(m); });

  const bronze = new THREE.MeshPhysicalMaterial({ color: 0xbf9f78, metalness: 1, roughness: .34, clearcoat: .35, clearcoatRoughness: .3, side: THREE.DoubleSide });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(PW + .012, .014, PD + .012), bronze); trim.position.y = BASE - .007; plinth.add(trim);

  // ---- the arch ----
  const arch = new THREE.Group(); world.add(arch);
  const LIFT = T + GAP + T2; // opening sits this far above the plinth top
  const upClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);   // reveals from the bottom up
  const downClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);  // reveals from the top down
  const bronzeUp = bronze.clone(); bronzeUp.clippingPlanes = [upClip];
  const bronzeDown = bronze.clone(); bronzeDown.clippingPlanes = [downClip]; bronzeDown.roughness = .24;
  const ext = (shape, depth, bev) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 5, curveSegments: 96 });
  const outerY = 0, inY = GAP + T2; // opening coordinates
  const outer = new THREE.Mesh(ext(ring(W + 2 * (GAP + T2), H + 2 * (GAP + T2), -(GAP + T2), T), .12, .022), bronzeUp);
  outer.position.z = -.06; outer.castShadow = true; arch.add(outer);
  const inner = new THREE.Mesh(ext(ring(W, H, 0, T2), .05, .01), bronzeDown);
  inner.position.z = -.02; inner.castShadow = true; arch.add(inner);
  // a dark mat behind everything so the opening reads as a recess
  const back = new THREE.Mesh(new THREE.ShapeGeometry(archPath(new THREE.Shape(), W + 2 * (GAP + T2) + .02, H + 2 * (GAP + T2) + .02, -(GAP + T2) - .01), 96), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .9, transparent: true, opacity: 0 }));
  back.position.z = -.061; arch.add(back);

  // ---- the picture: their footage, mapped into the arch opening ----
  let vtex = null;
  if (o.video) { vtex = new THREE.VideoTexture(o.video); vtex.colorSpace = THREE.SRGBColorSpace; vtex.generateMipmaps = false; vtex.minFilter = THREE.LinearFilter; }
  const picGeo = new THREE.ShapeGeometry(archPath(new THREE.Shape(), W, H, 0), 96);
  { const uv = picGeo.attributes.uv, pos = picGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / H); }
  const picMat = new THREE.MeshBasicMaterial({ map: vtex, color: vtex ? 0xffffff : 0x1a1714, toneMapped: false, transparent: true, opacity: 0 });
  const pic = new THREE.Mesh(picGeo, picMat); pic.position.z = -.03; arch.add(pic);
  // glass: faint reflection + a moving light sweep
  const glass = new THREE.Mesh(picGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .04, transparent: true, opacity: .07, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false }));
  glass.position.z = .005; arch.add(glass);
  const sweepC = document.createElement('canvas'); sweepC.width = 256; sweepC.height = 4;
  { const g = sweepC.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.42, 'rgba(255,244,226,0)'); gr.addColorStop(.5, 'rgba(255,244,226,.55)'); gr.addColorStop(.58, 'rgba(255,244,226,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 4); }
  const sweepTex = new THREE.CanvasTexture(sweepC); sweepTex.wrapS = THREE.ClampToEdgeWrapping;
  const sweepMat = new THREE.MeshBasicMaterial({ map: sweepTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .0, toneMapped: false });
  const sweep = new THREE.Mesh(picGeo, sweepMat); sweep.position.z = .01; arch.add(sweep);
  sweepTex.repeat.set(.5, 1);
  const setSweep = p => { sweepTex.offset.x = 1 - p * 1.6; sweepTex.repeat.set(.55, 1); sweepTex.rotation = -.35; sweepTex.center.set(.5, .5); };

  // ---- state + sequencer ----
  const st = { plinth: 0, outer: 0, inner: 0, pic: 0, sweep: 0, push: 0 };
  let steps = [], cur = null, curT = 0;
  const step = (d, fn, done) => ({ d, fn, done });
  const lerpOf = (k, to, e = ease) => { let from; return t => { if (from === undefined) from = st[k]; st[k] = from + (to - from) * e(t); }; };
  const run = list => { steps = list; cur = null; };
  const intro = () => run([
    step(.15, () => {}),
    step(.95, lerpOf('plinth', 1, easeOut)),
    step(1.25, lerpOf('outer', 1)),
    step(.85, lerpOf('inner', 1)),
    step(1.0, lerpOf('pic', 1)),
    step(1.3, t => { st.sweep = t; }, () => { st.sweep = 0; })
  ]);
  const ARCH_TOP = H + 2 * (GAP + T2 + T);
  function apply() {
    const p = st.plinth;
    plinth.position.y = (1 - p) * -BASE; plinth.scale.set(1, .001 + p * .999, 1);
    plinth.visible = p > .002;
    arch.position.y = plinth.position.y + BASE * plinth.scale.y + LIFT;
    // clip planes live in world space: track the arch base
    const base = arch.position.y - T - GAP - T2 - .03;
    upClip.constant = base + st.outer * (ARCH_TOP + .1);
    downClip.constant = -(base + ARCH_TOP + .06 - st.inner * (ARCH_TOP + .1));
    outer.visible = st.outer > .001; inner.visible = st.inner > .001;
    picMat.opacity = st.pic; glass.material.opacity = .07 * st.pic; back.material.opacity = clamp(st.outer * 3);
    sweepMat.opacity = st.sweep > 0 && st.sweep < 1 ? Math.sin(st.sweep * Math.PI) * .9 : 0;
    setSweep(st.sweep);
  }

  // ---- camera ----
  const target = new THREE.Vector3(0, BASE + LIFT + H * .4, 0);
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const placeCam = () => {
    const push = ease(st.push);
    const D0 = SMALL ? 6.3 : 7.0, D = D0 - push * (D0 - 2.6);
    const E = .1 + el - push * .08, A0 = -.32 + az + push * .32;
    const ty = target.y + push * .06;
    camera.position.set(Math.sin(A0) * Math.cos(E) * D, ty + Math.sin(E) * D, Math.cos(A0) * Math.cos(E) * D);
    camera.lookAt(0, ty, 0);
  };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .22; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.08; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 34 : 28; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0, nextSweep = 9;
  function advance(dt) {
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; }
      const d = RM ? 0 : cur.d; curT += dt;
      const p = d ? clamp(curT / d) : 1; cur.fn(p, dt);
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
  }
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    advance(dt);
    if (!RM && !cur && !steps.length && st.pic >= 1) { nextSweep -= dt; if (nextSweep <= 0) { nextSweep = 11; run([step(1.4, t => { st.sweep = t; }, () => { st.sweep = 0; })]); } }
    apply();
    az += (taz + (RM ? 0 : Math.sin(t0 * .22) * .05) - az) * .05; el += (tel - el) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  apply(); placeCam();
  renderer.compile(scene, camera);
  if (RM) Object.assign(st, { plinth: 1, outer: 1, inner: 1, pic: 1 }); else intro();
  start();
  return {
    state: st, renderer,
    setPush(p) { st.push = clamp(p); start(); },
    replay() { Object.assign(st, { plinth: 0, outer: 0, inner: 0, pic: 0 }); intro(); start(); }
  };
}
