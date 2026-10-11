/* =====================================================================
   DBM (Ahmad Dakka): fight-night arena that runs behind the whole page.
   An eight-sided cage on a raised platform (chain-link fence from a canvas
   alpha map, padded posts and top rail, logo canvas), spotlit from a lighting
   rig with fake volumetric cones, drifting haze and a dark crowd with phone
   lights. The camera cuts between broadcast shots as the page scrolls.
   api.brand(name) paints a pitching brand's name onto the canvas and the
   fence pads, live, while they fill in the bout sheet.
   No promotion's marks are used anywhere: generic cage, DBM's own wordmark.
   Bundle: kit/build3d/build.sh mmadbm/src/arena.js mmadbm/assets/arena.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let seed = 11; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// camera shots, keyed by name (position, look-at, fov)
export const SHOTS = {
  open:   { p: [0, 14, .01], t: [0, 0, 0], f: 40 },
  hero:   { p: [10.4, 4.6, 10.8], t: [-1.6, .9, .4], f: 34 },
  tape:   { p: [6.4, 1.7, 4.2], t: [1.2, 1.3, -.6], f: 40 },
  inside: { p: [1.6, 1.35, 2.6], t: [-2.5, 1.5, -2.2], f: 46 },
  deals:  { p: [-3.4, 10.4, 3.6], t: [-3.4, .8, .5], f: 34 },
  out:    { p: [-9.5, 5.2, -7.5], t: [0, .7, 0], f: 32 }
};

export async function mountArena(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !SMALL, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060607); scene.fog = new THREE.FogExp2(0x060607, .028);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 120);
  const env = await new Promise(res => new RGBELoader().load(A0 + 'studio-512.hdr', res, undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .25; }

  const RED = 0xe1251b, N = 8, R = 4.2, H = 1.85, PLAT = .62;
  const corner = i => { const a = (i + .5) / N * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); };

  // ---- canvas (mat) texture: DBM centre logo, ring, brand panels ----
  const matC = document.createElement('canvas'); matC.width = matC.height = 2048;
  const matT = new THREE.CanvasTexture(matC); matT.colorSpace = THREE.SRGBColorSpace; matT.anisotropy = 8;
  let brandName = '';
  function paintMat() {
    const g = matC.getContext('2d'), w = 2048, c = w / 2; seed = 5;
    const base = g.createRadialGradient(c, c, 100, c, c, c); base.addColorStop(0, '#e9e6df'); base.addColorStop(1, '#cfcac0'); g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(80,70,60,${rnd(0, .05)})`; g.fillRect(rnd(0, w), rnd(0, w), rnd(1, 3), 1); }          // canvas weave
    for (let i = 0; i < 40; i++) { const x = rnd(200, 1850), y = rnd(200, 1850), r = rnd(20, 90); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,95,80,.08)'); gr.addColorStop(1, 'rgba(110,95,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } // scuffs
    // centre ring + logo
    g.strokeStyle = '#141414'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, 330, 0, 7); g.stroke();
    g.strokeStyle = '#e1251b'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, 300, 0, 7); g.stroke();
    g.fillStyle = '#141414'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 250px "Big Shoulders Display", "Arial Narrow", Arial, sans-serif'; g.fillText('DBM', c, c - 20);
    g.fillStyle = '#e1251b'; g.font = '700 54px "Inter Tight", Arial, sans-serif'; g.fillText('A H M A D   D A K K A', c, c + 140);
    // eight brand panels between ring and fence
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / 2; g.save(); g.translate(c + Math.cos(a) * 640, c + Math.sin(a) * 640); g.rotate(a - Math.PI / 2);
      const txt = brandName ? brandName.toUpperCase() : (i % 2 ? 'YOUR BRAND' : 'DBM');
      g.fillStyle = brandName ? '#141414' : (i % 2 ? 'rgba(20,20,20,.18)' : 'rgba(225,37,27,.85)');
      let fs = 110; g.font = `800 ${fs}px "Big Shoulders Display", "Arial Narrow", Arial, sans-serif`;
      while (g.measureText(txt).width > 560 && fs > 40) { fs -= 6; g.font = `800 ${fs}px "Big Shoulders Display", "Arial Narrow", Arial, sans-serif`; }
      g.fillText(txt, 0, 0); g.restore();
    }
    // the edge where canvas meets the fence
    g.strokeStyle = 'rgba(20,20,20,.5)'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= N; i++) { const a = (i + .5) / N * Math.PI * 2, x = c + Math.cos(a) * 1000, y = c + Math.sin(a) * 1000; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    matT.needsUpdate = true;
  }

  // ---- platform + canvas ----
  const world = new THREE.Group(); scene.add(world);
  const shp = new THREE.Shape(); for (let i = 0; i < N; i++) { const p = corner(i); i ? shp.lineTo(p.x * 1.08, p.z * 1.08) : shp.moveTo(p.x * 1.08, p.z * 1.08); }
  const plat = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: PLAT, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color: 0x0d0d0f, roughness: .6, metalness: .2 }));
  plat.rotation.x = -Math.PI / 2; plat.receiveShadow = true; world.add(plat);
  const matGeo = new THREE.CircleGeometry(R / Math.cos(Math.PI / N), N, Math.PI / N);
  { const p = matGeo.attributes.position, uv = matGeo.attributes.uv, k = R / Math.cos(Math.PI / N); for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getX(i) / (2 * k) + .5, p.getY(i) / (2 * k) + .5); }
  const mat = new THREE.Mesh(matGeo, new THREE.MeshPhysicalMaterial({ map: matT, roughness: .82, sheen: .3, sheenColor: new THREE.Color(0xffffff) }));
  mat.rotation.x = -Math.PI / 2; mat.rotation.z = Math.PI; mat.position.y = PLAT + .002; mat.receiveShadow = true; world.add(mat);
  // apron skirt panels (black, DBM / brand)
  const skirtC = document.createElement('canvas'); skirtC.width = 1024; skirtC.height = 128; const skirtT = new THREE.CanvasTexture(skirtC); skirtT.colorSpace = THREE.SRGBColorSpace;
  function paintSkirt() { const g = skirtC.getContext('2d'); g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#e1251b'; g.fillRect(0, 118, 1024, 10);
    g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 80px "Big Shoulders Display", "Arial Narrow", Arial'; g.fillText(brandName ? brandName.toUpperCase() : 'D B M', 512, 60); skirtT.needsUpdate = true; }
  for (let i = 0; i < N; i++) { const a = corner(i).multiplyScalar(1.08), b = corner(i + 1).multiplyScalar(1.08), m = a.clone().add(b).multiplyScalar(.5), len = a.distanceTo(b);
    const pnl = new THREE.Mesh(new THREE.PlaneGeometry(len * .92, PLAT * .8), new THREE.MeshStandardMaterial({ map: skirtT, roughness: .5 })); pnl.position.set(m.x * 1.002, PLAT / 2, m.z * 1.002); pnl.lookAt(m.x * 2, PLAT / 2, m.z * 2); world.add(pnl); }

  // ---- fence: chain-link alpha map on 8 panels ----
  const linkC = document.createElement('canvas'); linkC.width = linkC.height = 64; { const g = linkC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke(); }
  const linkT = new THREE.CanvasTexture(linkC); linkT.wrapS = linkT.wrapT = THREE.RepeatWrapping; linkT.anisotropy = 8;
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, metalness: .6, roughness: .45, alphaMap: linkT, transparent: false, alphaTest: .45, side: THREE.DoubleSide });
  const padMat = new THREE.MeshPhysicalMaterial({ color: 0x0e0e10, roughness: .35, clearcoat: .6, clearcoatRoughness: .3 });
  const padRed = new THREE.MeshPhysicalMaterial({ color: RED, roughness: .4, clearcoat: .6 });
  const postPadC = document.createElement('canvas'); postPadC.width = 256; postPadC.height = 512; const postPadT = new THREE.CanvasTexture(postPadC); postPadT.colorSpace = THREE.SRGBColorSpace;
  function paintPost() { const g = postPadC.getContext('2d'); g.fillStyle = '#0e0e10'; g.fillRect(0, 0, 256, 512); g.fillStyle = '#e1251b'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 494, 256, 18);
    g.save(); g.translate(128, 256); g.rotate(-Math.PI / 2); g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 120px "Big Shoulders Display", "Arial Narrow", Arial'; g.fillText(brandName ? brandName.toUpperCase().slice(0, 10) : 'DBM', 0, 0); g.restore(); postPadT.needsUpdate = true; }
  const postMat = new THREE.MeshPhysicalMaterial({ map: postPadT, roughness: .38, clearcoat: .6 });
  for (let i = 0; i < N; i++) {
    const a = corner(i), b = corner(i + 1), m = a.clone().add(b).multiplyScalar(.5), len = a.distanceTo(b);
    const panelGeo = new THREE.PlaneGeometry(len, H - .25); { const uv = panelGeo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len * 9, uv.getY(k) * (H - .25) * 9); }
    const fence = new THREE.Mesh(panelGeo, fenceMat); fence.position.set(m.x, PLAT + .1 + (H - .25) / 2, m.z); fence.lookAt(0, fence.position.y, 0); fence.castShadow = true; world.add(fence);
    // padded top rail
    const rail = new THREE.Mesh(new THREE.CapsuleGeometry(.075, len - .1, 6, 14), padMat); rail.position.set(m.x, PLAT + H, m.z); rail.lookAt(b.x, PLAT + H, b.z); rail.rotateX(Math.PI / 2); rail.castShadow = true; world.add(rail);
    // bottom rail
    const bot = new THREE.Mesh(new THREE.BoxGeometry(len, .12, .1), padMat); bot.position.set(m.x, PLAT + .06, m.z); bot.lookAt(0, PLAT + .06, 0); world.add(bot);
    // post with branded pad
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, H + .1, 24), postMat); post.position.set(a.x, PLAT + (H + .1) / 2, a.z); post.rotation.y = -Math.atan2(a.z, a.x) + Math.PI / 2; post.castShadow = true; world.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), padRed); cap.position.set(a.x, PLAT + H + .1, a.z); world.add(cap);
  }
  paintMat(); paintSkirt(); paintPost();

  // stairs to the gate
  for (let s = 0; s < 3; s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, .2, .4), padMat); const c0 = corner(0).add(corner(1)).multiplyScalar(.5 * 1.08); const dir = c0.clone().normalize(); st.position.copy(c0.clone().add(dir.clone().multiplyScalar(.25 + s * .38))); st.position.y = PLAT - .1 - s * .2; st.lookAt(0, st.position.y, 0); st.receiveShadow = true; world.add(st); }

  // ---- arena: floor, crowd with phone lights, lighting rig, cones, haze ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .35, metalness: .3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const crowdN = SMALL ? 900 : 2200, crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18, .35, 3, 6), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: .9 }), crowdN);
  const phoneP = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  for (let i = 0; i < crowdN; i++) { const row = Math.floor(rnd(0, 14)), a = rnd(0, Math.PI * 2), r = 9 + row * .9 + rnd(-.2, .2), y = row * .42 + .4;
    P.set(Math.cos(a) * r, y, Math.sin(a) * r); S.setScalar(rnd(.85, 1.15)); M.compose(P, Q, S); crowd.setMatrixAt(i, M); if (rnd() < .09) phoneP.push(P.x * .98, y + .45, P.z * .98); }
  scene.add(crowd);
  const dotT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const phoneGeo = new THREE.BufferGeometry(); phoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(phoneP, 3));
  const phones = new THREE.Points(phoneGeo, new THREE.PointsMaterial({ map: dotT, size: .22, color: 0xdfe8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(phones);
  // rig: a ring truss with lamps over the cage
  const rig = new THREE.Group(); scene.add(rig); rig.position.y = 7.6;
  rig.add(new THREE.Mesh(new THREE.TorusGeometry(5.2, .07, 8, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1a1d, metalness: .8, roughness: .4 })));
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });
  const coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: .08 }, uC: { value: new THREE.Color(0xfff1d8) } },
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(vN, vV)), 1.6); float a = uI * vY * vY * rim; gl_FragColor = vec4(uC * a, a); }' });
  const spots = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = Math.cos(a) * 5.2, z = Math.sin(a) * 5.2;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, .3, 16), lampMat); lamp.position.set(x, 0, z); rig.add(lamp);
    const len = 7.6, cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, len, 32, 1, true), coneMat.clone()); cone.position.set(x * .6, -len / 2, z * .6);
    cone.lookAt(new THREE.Vector3(x * .6, 0, z * .6).add(new THREE.Vector3(-x * .4, -len, -z * .4))); cone.rotateX(-Math.PI / 2); rig.add(cone); spots.push(cone); }
  const key = new THREE.SpotLight(0xfff2de, 120, 22, .6, .6, 1.6); key.position.set(0, 9, 1); key.target.position.set(0, PLAT, 0); key.castShadow = true; key.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); key.shadow.bias = -.0003; key.shadow.radius = 4; scene.add(key, key.target);
  const red1 = new THREE.PointLight(RED, 60, 18, 1.6); red1.position.set(-8, 3, -6); const red2 = new THREE.PointLight(0x4062ff, 26, 18, 1.6); red2.position.set(8, 3, 6);
  scene.add(red1, red2, new THREE.HemisphereLight(0x2a2a33, 0x050505, .4));
  // haze
  const hazeN = SMALL ? 160 : 320, hz = new Float32Array(hazeN * 3); for (let i = 0; i < hazeN; i++) { const a = rnd(0, 6.28), r = rnd(0, 9); hz[i * 3] = Math.cos(a) * r; hz[i * 3 + 1] = rnd(1, 7); hz[i * 3 + 2] = Math.sin(a) * r; }
  const hazeGeo = new THREE.BufferGeometry(); hazeGeo.setAttribute('position', new THREE.BufferAttribute(hz, 3));
  const haze = new THREE.Points(hazeGeo, new THREE.PointsMaterial({ map: dotT, size: 3.2, color: 0x8890a8, transparent: true, opacity: .045, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(haze);

  // ---- post: bloom on the lamps, cones and red accents ----
  let composer = null;
  if (!SMALL) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .38, .45, .93)); composer.addPass(new OutputPass()); }

  // ---- camera: blend between shots ----
  const cur = { p: new THREE.Vector3(...SHOTS.open.p), t: new THREE.Vector3(...SHOTS.open.t), f: SHOTS.open.f };
  const goal = { p: new THREE.Vector3(...SHOTS.hero.p), t: new THREE.Vector3(...SHOTS.hero.t), f: SHOTS.hero.f };
  let mixA = SHOTS.hero, mixB = SHOTS.hero, mixK = 0, drag = 0, dragV = 0, px = 0, py = 0, t0 = 0;
  function shot(a, b = a, k = 0) { mixA = SHOTS[a] || SHOTS.hero; mixB = SHOTS[b] || mixA; mixK = clamp(k); start(); }
  if (RM) { cur.p.set(...SHOTS.hero.p); cur.t.set(...SHOTS.hero.t); }
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; }, { passive: true });
  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (composer) composer.setSize(w, h); };
  addEventListener('resize', resize); resize();

  let raf = 0, last = performance.now(), visible = true;
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    const k = ease(mixK); A.fromArray(mixA.p).lerp(B.fromArray(mixB.p), k); goal.p.copy(A); A.fromArray(mixA.t).lerp(B.fromArray(mixB.t), k); goal.t.copy(A); goal.f = mixA.f + (mixB.f - mixA.f) * k;
    // slow orbit drift + pointer parallax, around the cage centre
    const sway = RM ? 0 : Math.sin(t0 * .12) * .06 + px * .08;
    const gp = goal.p.clone(); const ang = Math.atan2(gp.z, gp.x) + sway, rad = Math.hypot(gp.x, gp.z); gp.x = Math.cos(ang) * rad; gp.z = Math.sin(ang) * rad; gp.y += RM ? 0 : -py * .4;
    const f = RM ? 1 : 1 - Math.pow(.04, dt); cur.p.lerp(gp, f); cur.t.lerp(goal.t, f); cur.f += (goal.f - cur.f) * f;
    camera.position.copy(cur.p); camera.lookAt(cur.t); if (Math.abs(camera.fov - cur.f) > .01) { camera.fov = cur.f; camera.updateProjectionMatrix(); }
    // living arena
    if (!RM) { spots.forEach((s, i) => s.material.uniforms.uI.value = .07 + .03 * Math.sin(t0 * .8 + i * 1.3)); phones.material.opacity = .65 + .25 * Math.sin(t0 * 3.1); haze.rotation.y += dt * .02; red1.intensity = 55 + 10 * Math.sin(t0 * 1.7); }
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', start);
  start();
  return {
    shot,
    brand: name => { const n = String(name || '').trim().slice(0, 22); if (n === brandName) return; brandName = n; paintMat(); paintSkirt(); paintPost(); start(); },
    renderer
  };
}
