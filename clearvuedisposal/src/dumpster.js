/* =====================================================================
   ClearVue Disposal: "Clear the driveway."
   Their orange roll-off drops onto the driveway, then the junk pile
   (boxes, mattress, chair, planks, tire, trash bags) gets tossed in piece
   by piece. Tap a piece to throw it yourself; api.clear() throws the rest,
   api.reset() brings the mess back.
   Materials from kit/library (ambientCG Cardboard001 / Planks001 / Fabric002, CC0).
   Bundle: kit/build3d/build.sh clearvuedisposal/src/dumpster.js clearvuedisposal/assets/dumpster.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 5; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export async function mountDumpster(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 80), world = new THREE.Group(); scene.add(world);

  const tl = new THREE.TextureLoader();
  const T = (n, rep = 1, srgb = true) => new Promise(res => tl.load(A0 + 'tex/' + n + '.webp', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
  const [env, boxT, boxN, woodT, woodN, fabT, fabN] = await Promise.all([
    new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', res, undefined, () => res(null))),
    T('box'), T('box_n', 1, false), T('wood', 1), T('wood_n', 1, false), null, T('fabric_n', 2, false)
  ]);
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .9; }

  const sun = new THREE.DirectionalLight(0xfff4e6, 2.6); sun.position.set(3, 6, 4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4, bottom: -4, near: .5, far: 16 });
  const sky = new THREE.HemisphereLight(0xdfeeff, 0x6b5a48, .6);
  const rim = new THREE.DirectionalLight(0xcfe3ff, .8); rim.position.set(-4, 3, -3);
  scene.add(sun, sky, rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .32 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- the roll-off (20-yard proportions: ~21 × 7.5 × 4 ft) ----
  const wear = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '40,40,40' : '200,200,200'},${Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 14, 1 + Math.random() * 2); } });
  wear.colorSpace = THREE.NoColorSpace; wear.wrapS = wear.wrapT = THREE.RepeatWrapping; wear.repeat.set(3, 1);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf04f17, roughness: .48, metalness: .25, clearcoat: .35, clearcoatRoughness: .5, bumpMap: wear, bumpScale: .6 });
  const paintIn = new THREE.MeshPhysicalMaterial({ color: 0xb53a10, roughness: .75, metalness: .2, bumpMap: wear, bumpScale: 1.2 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2c, roughness: .55, metalness: .8 });
  const L = 2.8, W = 1.0, H = .62, Y0 = .1;
  const dump = new THREE.Group(); world.add(dump);
  const prof = new THREE.Shape(); prof.moveTo(-L / 2, 0); prof.lineTo(L / 2 - .28, 0); prof.lineTo(L / 2, H); prof.lineTo(-L / 2, H); prof.closePath();
  for (const s of [-1, 1]) {
    const wall = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: .03, bevelEnabled: false }), [paint, paint])); wall.position.set(0, Y0, s * W / 2 - (s > 0 ? .03 : 0)); dump.add(wall);
    // inside face in a darker, worn tone
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(prof), paintIn); inner.position.set(0, Y0, s * (W / 2 - .032)); inner.rotation.y = s > 0 ? Math.PI : 0; inner.scale.x = s > 0 ? -1 : 1; dump.add(inner);
    // vertical ribs + bottom rub rail
    for (let i = 0; i < 8; i++) { const x = -L / 2 + .12 + i * (L - .5) / 7; const rib = sh(new THREE.Mesh(new THREE.BoxGeometry(.05, H - .02, .045), paint)); rib.position.set(x, Y0 + H / 2, s * (W / 2 + .02)); dump.add(rib); }
    const rub = sh(new THREE.Mesh(new THREE.BoxGeometry(L - .3, .07, .06), paint)); rub.position.set(-.14, Y0 + .06, s * (W / 2 + .025)); dump.add(rub);
    const top = sh(new THREE.Mesh(new THREE.BoxGeometry(L + .02, .07, .08), paint)); top.position.set(0, Y0 + H, s * (W / 2 + .01)); dump.add(top);
    const rail = sh(new THREE.Mesh(new THREE.BoxGeometry(L - .1, .1, .08), steel)); rail.position.set(-.05, .05, s * .32); dump.add(rail);
  }
  const floorD = sh(new THREE.Mesh(new THREE.BoxGeometry(L - .28, .04, W), paintIn)); floorD.position.set(-.14, Y0 + .02, 0); dump.add(floorD);
  const back = sh(new THREE.Mesh(new THREE.BoxGeometry(.05, H, W + .06), paint)); back.position.set(-L / 2 - .02, Y0 + H / 2, 0); dump.add(back);
  for (const z of [-.25, .25]) { const hinge = sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, H * .8, 10), steel)); hinge.position.set(-L / 2 - .06, Y0 + H / 2, z * 1.9); dump.add(hinge); }
  const slope = Math.atan2(.28, H), front = sh(new THREE.Mesh(new THREE.BoxGeometry(.05, Math.hypot(.28, H), W + .06), paint)); front.position.set(L / 2 - .14, Y0 + H / 2, 0); front.rotation.z = -slope; dump.add(front);
  const topF = sh(new THREE.Mesh(new THREE.BoxGeometry(.08, .07, W + .1), paint)); topF.position.set(L / 2, Y0 + H, 0); dump.add(topF);
  const topB = topF.clone(); topB.position.x = -L / 2 - .01; dump.add(topB);
  const hook = sh(new THREE.Mesh(new THREE.BoxGeometry(.12, .34, .12), steel)); hook.position.set(L / 2 - .1, .2, 0); dump.add(hook);
  for (const z of [-.32, .32]) { const roller = sh(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .12, 16).rotateX(Math.PI / 2), steel)); roller.position.set(-L / 2 + .1, .06, z); dump.add(roller); }
  // their side sign: ClearVue · clearvuedisposal.com · 586-234-1317
  const signT = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#f7f6f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e4511b'; g.textBaseline = 'alphabetic';
    const big = 'bold 210px Archivo, Arial, sans-serif', sm = 'bold 150px Archivo, Arial, sans-serif'; let x = 40;
    for (const [t, f] of [['C', big], ['LEAR', sm], ['V', big], ['UE', sm]]) { g.font = f; g.fillText(t, x, 220); x += g.measureText(t).width + 4; }
    g.fillStyle = '#2b2b2b'; g.font = '600 56px Archivo, Arial, sans-serif'; g.fillText('C L E A R V U E D I S P O S A L . C O M', 44, 300);
    g.font = '800 132px Archivo, Arial, sans-serif'; g.fillText('586-234-1317', 40, 440);
    g.fillStyle = '#e4511b'; g.font = '700 34px Archivo, Arial, sans-serif'; g.fillText('FAST · EZ · AFFORDABLE DUMPSTER SOLUTIONS', 46, 492);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.78, .39), new THREE.MeshPhysicalMaterial({ map: signT, roughness: .35, clearcoat: .6 }));
  sign.position.set(.55, Y0 + H * .52, W / 2 + .046); dump.add(sign);
  const yellow = new THREE.Mesh(new THREE.PlaneGeometry(.5, .05), new THREE.MeshStandardMaterial({ map: canvasTex(512, 52, (g, w, h) => { g.fillStyle = '#f5c518'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1b1b'; g.font = '800 34px Archivo, Arial'; g.fillText('MAXIMUM LOADING LEVEL', 40, 38); }) }));
  yellow.position.set(.62, Y0 + H - .08, W / 2 + .046); dump.add(yellow);

  // ---- the junk pile ----
  const boxMat = new THREE.MeshPhysicalMaterial({ map: boxT, normalMap: boxN, color: 0xd0a47c, roughness: .85 });
  const woodMat = new THREE.MeshPhysicalMaterial({ map: woodT, normalMap: woodN, roughness: .7 });
  const fabMat = new THREE.MeshPhysicalMaterial({ normalMap: fabN, color: 0xdfe6ee, roughness: .9, sheen: .5, sheenColor: new THREE.Color(0xffffff) });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1e, roughness: .8 });
  const bagMat = new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: .25, clearcoat: 1, clearcoatRoughness: .2 });
  const junk = [];
  const add = (mesh, start, end, rot = [0, 0, 0]) => { mesh.traverse(m => { if (m.isMesh) sh(m); }); mesh.userData = { start: new THREE.Vector3(...start), end: new THREE.Vector3(...end), r0: new THREE.Euler(...rot), r1: new THREE.Euler(rnd(-.4, .4), rnd(0, 6), rnd(-.4, .4)), t: -1 }; mesh.position.copy(mesh.userData.start); mesh.rotation.copy(mesh.userData.r0); world.add(mesh); junk.push(mesh); return mesh; };
  const bx = (w, h, d) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .012), boxMat);
  // pile sits on the driveway in front-right of the bin
  const PX = 1.05, PZ = 1.55;
  add(bx(.42, .32, .36), [PX - .3, .16, PZ], [-.7, .32, -.15], [0, .3, 0]);
  add(bx(.34, .28, .3), [PX + .15, .14, PZ + .15], [-.25, .3, .2], [0, -.4, 0]);
  add(bx(.3, .24, .28), [PX - .15, .44, PZ + .05], [.25, .34, -.2], [0, .9, 0]);
  add(bx(.26, .2, .24), [PX + .45, .1, PZ - .2], [-1.0, .52, .1], [0, .2, 0]);
  const matt = new THREE.Mesh(new RoundedBoxGeometry(1.0, .14, .6, 3, .05), fabMat);
  add(matt, [PX + .1, .58, PZ - .35], [-.4, .62, 0], [.5, .2, .35]);
  const chair = new THREE.Group(); { const seat = new THREE.Mesh(new THREE.BoxGeometry(.32, .035, .3), woodMat); seat.position.y = .3; chair.add(seat); for (const [x, z] of [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.03, .3, .03), woodMat); leg.position.set(x, .15, z); chair.add(leg); } const bk = new THREE.Mesh(new THREE.BoxGeometry(.32, .3, .03), woodMat); bk.position.set(0, .47, -.135); chair.add(bk); }
  add(chair, [PX + .75, 0, PZ + .35], [.65, .3, -.05], [0, -.8, 0]);
  for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.BoxGeometry(1.1, .035, .11), woodMat), [PX - .1 + i * .04, .03 + i * .036, PZ + .55 + i * .03], [.1 + i * .2, .45 + i * .04, .3 - i * .12], [0, .15 + i * .1, 0]);
  add(new THREE.Mesh(new THREE.TorusGeometry(.14, .065, 14, 30), rubber), [PX + .7, .065, PZ - .55], [1.05, .6, -.15], [Math.PI / 2, 0, 0]);
  const bag = () => { const geo = new THREE.SphereGeometry(.17, 28, 20), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + .08 * Math.sin(x * 30 + z * 20) * Math.cos(y * 25) + (y > .1 ? -.2 * (y - .1) / .07 : 0); p.setXYZ(i, x * k, y * (y < 0 ? .8 : 1), z * k); } geo.computeVertexNormals(); const g = new THREE.Group(); const m = new THREE.Mesh(geo, bagMat); m.position.y = .14; g.add(m); const knot = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), bagMat); knot.position.y = .33; knot.scale.set(1, 1.6, 1); g.add(knot); return g; };
  add(bag(), [PX - .55, 0, PZ + .45], [1.1, .3, .25]);
  add(bag(), [PX + 1.0, 0, PZ - .05], [-.05, .5, -.3]);
  add(bag(), [PX - .6, 0, PZ - .25], [.9, .55, .2]);

  // ---- toss sequencer ----
  let dropT = RM ? 1 : 0, shake = 0, queue = [], qT = 0, done = false;
  const P = new THREE.Vector3(), Qa = new THREE.Quaternion(), Qb = new THREE.Quaternion();
  function toss(m) { if (m.userData.t >= 0) return; m.userData.t = 0; }
  function clear() { queue = junk.filter(m => m.userData.t < 0); qT = 0; start(); }
  function reset() { queue = []; done = false; junk.forEach((m, i) => { m.userData.t = -1; m.userData.pop = 0; m.position.copy(m.userData.start); m.rotation.copy(m.userData.r0); m.scale.setScalar(.001); m.userData.popD = i * .04; }); start(); }
  function stepJunk(dt) {
    if (queue.length) { qT -= dt; if (qT <= 0) { toss(queue.shift()); qT = .2; } }
    let left = 0;
    junk.forEach(m => {
      const u = m.userData;
      if (u.pop !== undefined && u.pop < 1) { u.popD -= dt; if (u.popD <= 0) u.pop = Math.min(1, u.pop + dt / .35); m.scale.setScalar(Math.max(.001, easeOut(u.pop))); }
      if (u.t < 0) { left++; return; }
      if (u.t >= 1) return;
      u.t = Math.min(1, u.t + dt / .75); const k = u.t;
      P.lerpVectors(u.start, u.end, k); P.y += Math.sin(k * Math.PI) * (1.25 + u.start.distanceTo(u.end) * .15);
      m.position.copy(P);
      Qa.setFromEuler(u.r0); Qb.setFromEuler(u.r1); m.quaternion.slerpQuaternions(Qa, Qb, easeOut(k)); m.rotateX(Math.sin(k * Math.PI) * 1.2);
      if (u.t >= 1) shake = .1;
    });
    if (!left && !queue.length && junk.every(m => m.userData.t >= 1) && !done) { done = true; o.onCleared && o.onCleared(); }
  }

  // tap a piece to throw it
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(junk, true)[0]; if (!hit) return;
    let m = hit.object; while (m.parent && !junk.includes(m)) m = m.parent;
    toss(m); o.onToss && o.onToss(); start();
  });
  if (FINE) canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(junk, true)[0]; canvas.style.cursor = h ? 'pointer' : ''; });

  // ---- camera ----
  const target = new THREE.Vector3(.35, .3, .55);
  let az = 0, taz = 0, t0 = 0;
  const placeCam = () => { const D = SMALL ? 6.3 : 7.2, A = .5 + az, E = .4; camera.position.set(target.x + Math.sin(A) * Math.cos(E) * D, target.y + Math.sin(E) * D, target.z + Math.cos(A) * Math.cos(E) * D); camera.lookAt(target); };
  if (FINE) addEventListener('pointermove', e => { taz = (e.clientX / innerWidth - .5) * .25; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 42 : 30; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (dropT < 1) { dropT = Math.min(1, dropT + dt / 1.1); dump.position.y = (1 - bounce(dropT)) * 2.6; if (dropT >= 1) { shake = .18; o.onDelivered && o.onDelivered(); } }
    stepJunk(dt);
    if (shake > 0) { shake = Math.max(0, shake - dt); dump.position.y = Math.sin(t0 * 60) * shake * .03; dump.rotation.z = Math.sin(t0 * 47) * shake * .01; }
    az += (taz + (RM ? 0 : Math.sin(t0 * .25) * .04) - az) * .05; placeCam();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  if (RM) { dump.position.y = 0; }
  placeCam(); renderer.compile(scene, camera); start();
  return { clear, reset, toss, get done() { return done; }, renderer };
}
