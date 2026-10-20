/* =====================================================================
   Luxury Cuts: the barber poles.
   Two wall-mounted barber poles flank the hero like the shop door: a gold
   lathe cap and finial, a clear glass tube, an inner drum striped in their
   black, gold and ivory, a gold base and a wall bracket. While the shop is
   open (their real hours, Loves Park time) the drums spin and glow; when it
   closes they wind down and dim. Kit method: studio HDRI, physical
   materials, lathe geometry, transparent canvas, pointer drift, render only
   while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh luxuryycuts/src/pole.js luxuryycuts/assets/pole.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function stripeTex() {
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#F4EEE2'; g.fillRect(0, 0, W, H);
  // three diagonal bands per turn: black, gold, ivory (the base)
  const band = (color, off, width) => { g.fillStyle = color; for (let k = -2; k < 6; k++) { const y0 = k * H / 3 + off; g.beginPath(); g.moveTo(0, y0); g.lineTo(W, y0 - H / 3); g.lineTo(W, y0 - H / 3 + width); g.lineTo(0, y0 + width); g.closePath(); g.fill(); } };
  band('#111111', 0, H / 9);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#9C7A2E'); gr.addColorStop(.5, '#F1D27E'); gr.addColorStop(1, '#B38C38');
  band(gr, H / 9 + 8, H / 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2);
  return t;
}

export async function mountPoles(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 1; }
  const key = new THREE.DirectionalLight(0xfff4e2, 2); key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(0xffe2a8, 1.2); rim.position.set(4, 2, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xfffaf0, 0x8a7a60, .5));

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xE2B957, metalness: 1, roughness: .2, clearcoat: .5 });
  const tex = stripeTex();
  const drumMat = new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: .25, roughness: .35, clearcoat: .6 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, metalness: 0, transparent: true, opacity: .16, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 });
  const lathe = (pts, mat, seg = 64) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);

  function pole() {
    const p = new THREE.Group();
    // base (bottom→top) and finial ball below
    p.add(lathe([[0, -1.32], [.1, -1.3], [.22, -1.24], [.27, -1.16], [.27, -1.1], [.23, -1.06], [.23, -1.02], [0, -1.02]], gold));
    const ballB = new THREE.Mesh(new THREE.SphereGeometry(.07, 24, 16), gold); ballB.position.y = -1.4; p.add(ballB);
    // glass tube + drum
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, 2.04, 48, 1, true), drumMat); p.add(drum); p.userData.drum = drum;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 2.04, 48, 1, true), glassMat); p.add(glass);
    for (const y of [-1.02, 1.02]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.225, .022, 12, 48), gold); r.rotation.x = Math.PI / 2; r.position.y = y; p.add(r); }
    // top cap dome + finial
    p.add(lathe([[0, 1.02], [.23, 1.02], [.25, 1.06], [.24, 1.12], [.18, 1.24], [.09, 1.31], [.04, 1.34], [0, 1.35]], gold));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 16), gold); ball.position.y = 1.45; p.add(ball);
    // wall bracket arms to the back
    for (const y of [-.8, .8]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 12), gold); arm.rotation.x = Math.PI / 2; arm.position.set(0, y, -.42); p.add(arm); const plate = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .03, 24), gold); plate.rotation.x = Math.PI / 2; plate.position.set(0, y, -.68); p.add(plate); }
    p.rotation.y = .35;
    return p;
  }
  const L = pole(), R = pole(); R.rotation.y = -.35; scene.add(L, R);

  let half = 3;
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov), dist = 3.3 / 2 / Math.tan(vf / 2) * 1.08;
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    half = dist * Math.tan(vf / 2) * camera.aspect;
    const narrow = w < 700, s = narrow ? .72 : 1;
    L.scale.setScalar(s); R.scale.setScalar(s);
    const x = Math.max(.35, half - (narrow ? .28 : Math.min(half * .22, 1.1)));
    L.position.x = -x; R.position.x = x;
    renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  let open = !!o.open, speed = open && !RM ? 1 : 0, glow = open ? 1 : 0, px = 0, tx = 0, time = 0;
  if (FINE && !RM) addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; }, { passive: true });

  let visible = true, raf = 0, last = performance.now();
  function loop(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    const k = 1 - Math.pow(.2, dt);
    speed += ((open && !RM ? 1 : 0) - speed) * k; glow += ((open ? 1 : 0) - glow) * k;
    L.userData.drum.rotation.y += dt * 1.6 * speed; R.userData.drum.rotation.y -= dt * 1.6 * speed;
    drumMat.emissiveIntensity = .05 + glow * .32 * (1 + (RM ? 0 : Math.sin(time * 2) * .06));
    px += (tx - px) * .05; L.rotation.y = .35 + px * .12; R.rotation.y = -.35 + px * .12;
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return { setOpen(v) { open = !!v; kick(); } };
}
