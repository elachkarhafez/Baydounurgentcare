/* =====================================================================
   Abe's Barbershop: the logo, rebuilt as a real 3D emblem.
   Gold diamond frame, a pair of polished shears crossed in an X (black
   lacquer rings, gold pivot) and a black handlebar mustache, lit like a
   product film: studio HDRI that sweeps across the metal, warm key, cool rim,
   a soft shadow on a transparent catcher, dust in the light.
   - intro(): macro on the pivot → shears open → frame swings in → mustache
     drops and settles → camera pulls back (step sequencer)
   - snip(): the shears close and spring back open, a glint runs the blades
   - drag to turn (springs home), pointer drift on fine pointers
   - scroll(k): the emblem turns and drifts as the hero scrolls away
   Bundle: kit/build3d/build.sh abesbarbershop/src/emblem.js abesbarbershop/assets/emblem.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = t => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const OPEN = THREE.MathUtils.degToRad(33);   // half-angle of the X
const SHUT = THREE.MathUtils.degToRad(3);

export async function mountEmblem(canvas, o = {}) {
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
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 80);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .95; }

  // ---- lights ----
  const key = new THREE.SpotLight(0xffd9a0, 260, 40, .55, .6, 2); key.position.set(-4.5, 7, 7);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  const rim = new THREE.DirectionalLight(0xbfd4ff, 2.4); rim.position.set(5, 3, -6);
  const fill = new THREE.DirectionalLight(0xfff0dc, .5); fill.position.set(4, -1, 6);
  scene.add(key, key.target, rim, fill, new THREE.HemisphereLight(0xfff4e6, 0x1a1410, .25));

  // ---- materials ----
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd2a24a, metalness: 1, roughness: .24, clearcoat: .35, clearcoatRoughness: .2 });
  const goldBright = gold.clone(); goldBright.roughness = .16; goldBright.color.set(0xe2b65c);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: .1, clearcoat: .5, clearcoatRoughness: .05 });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, metalness: .25, roughness: .3, clearcoat: 1, clearcoatRoughness: .06 });
  const stache = new THREE.MeshPhysicalMaterial({ color: 0x040404, metalness: .1, roughness: .38, sheen: .25, sheenRoughness: .5, sheenColor: new THREE.Color(0x3a332c), clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: .35 });

  const emblem = new THREE.Group(); scene.add(emblem);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- frame: the diamond with clipped corners, as a bevelled outline ----
  const diamond = (R, c) => { const p = []; [[0, R], [R, 0], [0, -R], [-R, 0]].forEach(([x, y], i, a) => {
    const prev = a[(i + 3) % 4], next = a[(i + 1) % 4];
    const toPrev = new THREE.Vector2(prev[0] - x, prev[1] - y).normalize().multiplyScalar(c), toNext = new THREE.Vector2(next[0] - x, next[1] - y).normalize().multiplyScalar(c);
    p.push(new THREE.Vector2(x + toPrev.x, y + toPrev.y), new THREE.Vector2(x + toNext.x, y + toNext.y)); }); return p; };
  const fShape = new THREE.Shape(diamond(2.75, .42)); fShape.holes.push(new THREE.Path(diamond(2.6, .37).reverse()));
  const frame = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(fShape, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 3, curveSegments: 4 }), gold));
  frame.geometry.center();
  const frameG = new THREE.Group(); frameG.add(frame); frameG.position.set(0, .15, -.35); emblem.add(frameG);

  // ---- shears: two straight pieces through one pivot ----
  function half() {
    const g = new THREE.Group();
    // blade: straight cutting edge on x=0, curved back, sharp tip
    const b = new THREE.Shape(); b.moveTo(0, -.05); b.lineTo(0, 2.55); b.quadraticCurveTo(.04, 2.42, .1, 2.15);
    b.bezierCurveTo(.2, 1.6, .27, .9, .27, .35); b.quadraticCurveTo(.27, -.05, .12, -.18); b.lineTo(0, -.18);
    const blade = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(b, { depth: .05, bevelEnabled: true, bevelThickness: .018, bevelSize: .016, bevelSegments: 3, curveSegments: 24 }), steel));
    // shank down to the ring (same piece, on the far side of the pivot)
    const s = new THREE.Shape(); s.moveTo(-.02, -.1); s.lineTo(.2, -.1); s.bezierCurveTo(.2, -.5, .24, -.8, .3, -1.02); s.lineTo(.12, -1.08); s.bezierCurveTo(.06, -.8, -.02, -.5, -.02, -.1);
    const shank = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: true, bevelThickness: .02, bevelSize: .018, bevelSegments: 3, curveSegments: 16 }), lacquer));
    const ring = cast(new THREE.Mesh(new THREE.TorusGeometry(.34, .075, 20, 64), lacquer)); ring.position.set(.36, -1.42, .03); ring.scale.set(1, 1.12, 1);
    g.add(blade, shank, ring);
    return { g, blade };
  }
  const shears = new THREE.Group(); shears.position.set(0, .35, .05); emblem.add(shears);
  const A1 = half(), A2 = half();
  A1.g.position.z = .045; A2.g.position.z = -.045; A2.g.scale.x = -1;
  shears.add(A1.g, A2.g);
  const pivot = cast(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .26, 40), goldBright)); pivot.rotation.x = Math.PI / 2; shears.add(pivot);
  const screw = new THREE.Mesh(new THREE.BoxGeometry(.16, .025, .02), lacquer); screw.position.z = .135; shears.add(screw);
  let open = RM ? OPEN : SHUT;
  const setOpen = a => { open = a; A1.g.rotation.z = a; A2.g.rotation.z = -a; };
  setOpen(open);

  // ---- mustache: a handlebar, extruded soft ----
  const m = new THREE.Shape();
  m.moveTo(0, .1);
  m.bezierCurveTo(.22, .3, .6, .3, .84, .1);
  m.bezierCurveTo(.98, -.02, 1.1, -.03, 1.2, .12);
  m.bezierCurveTo(1.27, .25, 1.24, .37, 1.12, .4);
  m.bezierCurveTo(1.23, .24, 1.17, -.12, .97, -.17);
  m.bezierCurveTo(.68, -.24, .3, -.13, 0, -.07);
  m.lineTo(0, .1);
  const mOpts = { depth: .12, bevelEnabled: true, bevelThickness: .07, bevelSize: .055, bevelSegments: 5, curveSegments: 28 };
  const mGeo = new THREE.ExtrudeGeometry(m, mOpts);
  const must = new THREE.Group(); [1, -1].forEach(sx => { const h = cast(new THREE.Mesh(mGeo, stache)); h.scale.x = sx; must.add(h); }); // three flips culling for the mirrored half
  must.scale.setScalar(.95);
  const mustG = new THREE.Group(); mustG.add(must); mustG.position.set(0, -.3, .32); emblem.add(mustG);

  // ---- shadow catcher + dust in the key light ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .32, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.6; floor.receiveShadow = true; scene.add(floor);
  key.target.position.set(0, 0, 0);
  const dustN = SMALL ? 160 : 360, dp = new Float32Array(dustN * 3), ds = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = (Math.random() - .5) * 12; dp[i * 3 + 1] = (Math.random() - .5) * 9; dp[i * 3 + 2] = (Math.random() - .5) * 6 + 1; ds[i] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uA: { value: 0 } },
    vertexShader: 'attribute float aS; uniform float uT, uPR; varying float vA; void main(){ vec3 p = position; p.y += mod(uT * (.05 + aS * .08) + aS * 9., 9.) - 4.5 - position.y * 0.; p.x += sin(uT * .3 + aS * 30.) * .3; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (1.2 + aS * 2.6) * uPR * (10. / -mv.z); vA = .25 + .75 * aS; }',
    fragmentShader: 'uniform float uA; varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, 0., r); gl_FragColor = vec4(vec3(1., .86, .6) * a * vA * uA * .5, 0.); }' });
  const dust = new THREE.Points(dg, dustMat); scene.add(dust);

  // ---- glint: a thin bright bar that runs along a blade on snip ----
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const glints = [A1, A2].map(h => { const gm = new THREE.Mesh(new THREE.PlaneGeometry(.05, .5), glintMat); gm.position.set(.1, 0, .09); h.g.add(gm); return gm; });

  // ---- framing ----
  let viewW = 1, viewH = 1, baseZ = 13;
  const fit = () => { const r = canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // emblem ≈ 7.4 tall, 6 wide: fill ~74% of the height on desktop, ~84% of the width (and ≤ 56% of the height) on phones
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), narrow = camera.aspect < .9;
    baseZ = narrow ? Math.max(5.8 / .86 / camera.aspect / 2 / tv, 5.8 / .5 / 2 / tv) : Math.max(5.9 / .74 / 2 / tv, 5.8 / .44 / camera.aspect / 2 / tv);
    viewW = w; viewH = h; };
  new ResizeObserver(() => { fit(); kick(); }).observe(canvas); fit();

  // ---- state + step sequencer ----
  const st = { t: 0, intro: RM ? null : 0, introLen: 4.2, snip: -1, drag: { x: 0, y: 0, vx: 0, vy: 0, on: false }, par: { x: 0, y: 0, tx: 0, ty: 0 }, scroll: 0, done: RM };
  // starting pose for the intro (everything apart, macro on the pivot)
  const pose = { frameRot: RM ? 0 : 1.35, frameZ: RM ? -.35 : -4, frameS: RM ? 1 : .6, mustY: RM ? -.3 : 3.4, mustRot: RM ? 0 : -.6, camZ: RM ? 1 : .26, camX: RM ? 0 : .55, camY: RM ? 0 : .3, dust: RM ? 1 : 0, env: RM ? 2.2 : 0 };
  let onIntroDone = o.onIntroDone || null;
  const STEPS = [
    // [start, dur, fn(k)]  k is 0..1 inside the step
    [0, 1.6, k => { pose.env = easeInOut(k) * 2.2; }],
    [.9, 1.0, k => setOpen(lerp(SHUT, OPEN, backOut(k)))],
    [1.3, 1.4, k => { const e = easeOut(k); pose.frameRot = lerp(1.35, 0, e); pose.frameZ = lerp(-4, -.35, e); pose.frameS = lerp(.6, 1, e); }],
    [2.0, 1.0, k => { const e = k < .7 ? easeInOut(k / .7) : 1; pose.mustY = lerp(3.4, -.3, e) + (k > .7 ? Math.sin((k - .7) / .3 * Math.PI) * .07 * (1 - k) : 0); pose.mustRot = lerp(-.6, 0, e); }],
    [.4, 3.6, k => { const e = easeInOut(k); pose.camZ = lerp(.26, 1, e); pose.camX = lerp(.55, 0, e); pose.camY = lerp(.3, 0, e); }],
    [2.2, 1.8, k => { pose.dust = easeOut(k); }]
  ];
  function intro(cb) { if (cb) onIntroDone = cb; if (RM) { onIntroDone && onIntroDone(); return; } st.intro = 0; st.done = false; kick(); }
  function finishIntro() { STEPS.forEach(s => s[2](1)); st.intro = null; st.done = true; onIntroDone && onIntroDone(); onIntroDone = null; }
  function snip() { if (!st.done) return false; st.snip = 0; kick(); return true; }

  // ---- input: drag to turn, tap to snip ----
  let down = null;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; st.drag.on = true; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener('pointermove', e => {
    if (FINE) { const r = canvas.getBoundingClientRect(); st.par.tx = ((e.clientX - r.left) / r.width - .5) * 2; st.par.ty = ((e.clientY - r.top) / r.height - .5) * 2; kick(); }
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved = Math.max(down.moved, Math.hypot(dx, dy));
    st.drag.vx = dx * .012; st.drag.vy = dy * .006; st.drag.x += st.drag.vx; st.drag.y = clamp(st.drag.y + st.drag.vy, -.6, .6); down.x = e.clientX; down.y = e.clientY; o.onTouch && o.onTouch('drag'); kick();
  });
  const up = () => { if (!down) return; const tap = down.moved < 8 && performance.now() - down.t < 450; down = null; st.drag.on = false; if (tap && snip()) o.onSnip && o.onSnip(); kick(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (snip()) o.onSnip && o.onSnip(); } if (e.key === 'ArrowLeft') { st.drag.x -= .3; kick(); } if (e.key === 'ArrowRight') { st.drag.x += .3; kick(); } });

  // ---- loop: render only while visible and something moves ----
  let raf = 0, last = 0, visible = true, idleFrames = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  function kick() { idleFrames = 0; if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; const real = Math.max(0, Math.min(.25, (now - last) / 1000)), dt = Math.min(.05, real); last = now; st.t += dt;
    let moving = false;
    if (st.intro !== null && !RM) {
      st.intro += real; const T = st.intro; moving = true;
      STEPS.forEach(([s, d, fn]) => { if (T >= s) fn(clamp((T - s) / d)); });
      if (T >= st.introLen) finishIntro();
    }
    if (st.snip >= 0) { st.snip += real / .62; const k = st.snip; moving = true;
      const a = k < .28 ? lerp(OPEN, SHUT, easeInOut(k / .28)) : lerp(SHUT, OPEN, backOut((k - .28) / .72)); setOpen(a);
      glintMat.opacity = k < .2 ? 0 : Math.max(0, 1 - (k - .2) / .5); glints.forEach(g => { g.position.y = lerp(-.1, 2.4, clamp((k - .2) / .5)); });
      if (k >= 1) { st.snip = -1; setOpen(OPEN); glintMat.opacity = 0; } }
    // drag inertia + spring home
    if (!st.drag.on) { st.drag.x *= Math.pow(.06, dt); st.drag.y *= Math.pow(.06, dt); if (Math.abs(st.drag.x) > .002 || Math.abs(st.drag.y) > .002) moving = true; }
    st.par.x += (st.par.tx - st.par.x) * (1 - Math.pow(.04, dt)); st.par.y += (st.par.ty - st.par.y) * (1 - Math.pow(.04, dt));
    if (Math.abs(st.par.tx - st.par.x) > .002) moving = true;

    // pose
    frameG.rotation.y = pose.frameRot; frameG.position.z = pose.frameZ; frameG.scale.setScalar(pose.frameS);
    mustG.position.y = pose.mustY; mustG.rotation.z = pose.mustRot;
    const idle = RM ? 0 : Math.sin(st.t * .5) * .06;
    emblem.rotation.y = st.drag.x + idle + st.par.x * .18 + st.scroll * .9;
    emblem.rotation.x = st.drag.y + st.par.y * .1 - st.scroll * .15;
    emblem.position.y = (RM ? 0 : Math.sin(st.t * .8) * .06) + st.scroll * 1.2;
    if (env) scene.environmentRotation.set(0, pose.env + st.t * .05, 0);
    dustMat.uniforms.uT.value = st.t; dustMat.uniforms.uA.value = pose.dust;
    // camera: macro → hero framing
    const z = lerp(2.6, baseZ, pose.camZ);
    camera.position.set(pose.camX * 1.2 + st.par.x * .25, pose.camY * .8 + .2 - st.par.y * .2, z);
    camera.lookAt(lerp(0, 0, 1), lerp(.35, .1, pose.camZ), 0);
    const e = pose.camZ; camera.setViewOffset(viewW, viewH, -(o.shiftX || 0) * viewW * e, (o.shiftY || 0) * viewH * e, viewW, viewH);
    renderer.render(scene, camera);
    // idle frames keep the slow sway and the dust alive; settle to a cheaper cadence when nothing is touched
    if (!RM) moving = true;
    if (moving && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  kick();
  return { intro, snip, scroll: k => { st.scroll = clamp(k); kick(); }, skip: () => { if (st.intro !== null) finishIntro(); kick(); }, renderer, get done() { return st.done; } };
}
