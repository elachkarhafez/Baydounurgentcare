/* =====================================================================
   Fire & Feast: "Feed the table". Their Mediterranean combo tray, built
   in real 3D and laid out for 3, 5, 7 or 10 people.
   Hammered silver tray → a bed of yellow rice spreads → beef + chicken
   kabob, chicken tikka, cream chop drop in rows → beef + chicken shawarma
   rain onto the front edge → stews, turshi and pita set down around it.
   api.build(size) re-lays the tray for a new head count.

   Realism pass:
   - every food surface is textured from their own photos (kit/library/phototex.py:
     crop → seamless tile → normal map), so the rice, char, breading and stews
     are the real thing
   - tray: ambientCG Metal051B hammered metal (CC0) normal + roughness
   - lighting: Poly Haven cowboy_town_saloon HDRI (CC0, downsized with hdrsize.py)
   - real geometry detail: instanced rice grains on the dome, parsley flecks,
     hand-pressed kofta, puffy pita, contact shadows
   - desktop: GTAO ambient occlusion through EffectComposer (alpha kept)
   Bundle: kit/build3d/build.sh fireandfeastcommerce/src/platter.js fireandfeastcommerce/assets/platter.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// how each head count fills the tray (tray half-width A, half-depth B)
export const SIZES = {
  3: { A: .74, B: .62, beef: 1, chicken: 1, tikka: 1, chop: 1, shawarma: 320, bowls: 2 },
  5: { A: .98, B: .68, beef: 2, chicken: 1, tikka: 1, chop: 1, shawarma: 480, bowls: 2 },
  7: { A: 1.18, B: .74, beef: 2, chicken: 2, tikka: 1, chop: 2, shawarma: 620, bowls: 3 },
  10: { A: 1.42, B: .8, beef: 3, chicken: 2, tikka: 2, chop: 2, shawarma: 800, bowls: 3 }
};

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); }
// planar UVs (x,z) for lathe parts that should read as a flat surface
function planarUV(geo, s = 1) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * s + .5, p.getZ(i) * s + .5); uv.needsUpdate = true; return geo; }

export async function mountPlatter(canvas, o = {}) {
  const A0 = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 60), world = new THREE.Group(); scene.add(world);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---- load: HDRI + photo textures, all before the first frame ----
  const tl = new THREE.TextureLoader();
  const T = (name, rep = [1, 1], srgb = true) => new Promise(res => tl.load(A0 + 'tex/' + name + '.webp', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
  const hdr = name => new Promise(res => new RGBELoader().load(A0 + name, t => res(t), undefined, () => res(null)));
  // side dishes generated from their photos (kit/library/i23d.py → TRELLIS); built versions are the fallback
  // (generated meshes ship without normals: compute smooth ones, or lighting + GTAO read them as black)
  const glb = name => new Promise(res => new GLTFLoader().load(A0 + 'models/' + name + '.glb', g => { g.scene.traverse(m => { if (m.isMesh && !m.geometry.attributes.normal) { m.geometry.computeVertexNormals(); m.material.flatShading = false; } }); res(g.scene); }, undefined, () => res(null)));
  const [env, tx, scans] = await Promise.all([
    hdr('saloon-512.hdr').then(e => e || hdr('studio-512.hdr')),
    Promise.all([
      T('metal_n', [4, 4], false), null,
      T('rice', [5, 5]), T('rice_n', [5, 5], false),
      T('beef', [2, 1]), T('beef_n', [2, 1], false), T('chick', [2, 1]), T('chick_n', [2, 1], false),
      T('tikka'), T('tikka_n', [1, 1], false), T('chop', [1.2, 1.2]), T('chop_n', [1.2, 1.2], false),
      T('shawb', [.35, .35]), T('shawb_n', [.35, .35], false), T('shawc', [.35, .35]), T('shawc_n', [.35, .35], false),
      T('pita', [1.4, 1.4]), T('pita_n', [1.4, 1.4], false),
      T('bean', [1, 1.6]), T('bean_n', [1, 1.6], false), T('curry', [1, 1.4]), T('curry_n', [1, 1.4], false),
      T('turshi', [1, 2]), T('turshi_n', [1, 2], false)
    ]).then(a => Object.fromEntries(['metalN', 'metalR', 'rice', 'riceN', 'beef', 'beefN', 'chick', 'chickN', 'tikka', 'tikkaN', 'chop', 'chopN', 'shawb', 'shawbN', 'shawc', 'shawcN', 'pita', 'pitaN', 'bean', 'beanN', 'curry', 'curryN', 'turshi', 'turshiN'].map((k, i) => [k, a[i]]))),
    // add 'turshi' / 'pita' here once those are generated (no 404s for models that don't exist)
    Promise.all((o.scans || ['bean', 'curry']).map(n => glb(n).then(m => [n, m]))).then(Object.fromEntries)
  ]);
  // normalise a scanned model: sit it on y=0, centre it, scale to a target width; generated GLBs
  // leave metallic unset (= 1 in glTF), so force a glaze-like dielectric
  const fit = (src, width) => { const g = src.clone(true), box = new THREE.Box3().setFromObject(g), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), k = width / Math.max(sz.x, sz.z);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; if (m.material) { m.material = m.material.clone(); m.material.envMapIntensity = .9; m.material.metalness = 0; m.material.roughness = .32; } } });
    const w = new THREE.Group(); g.position.set(-c.x, -box.min.y, -c.z); w.add(g); w.scale.setScalar(k); const o2 = new THREE.Group(); o2.add(w); return o2; };
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentRotation.set(0, 2.2, 0); scene.environmentIntensity = .75; }

  // warm pass light, a fire-orange glow from below-left, cool rim
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3); key.position.set(1.5, 5, 2.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0004; key.shadow.normalBias = .012;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12 });
  const fire = new THREE.PointLight(0xff6a1f, 4, 6, 1.6); fire.position.set(-2.2, .6, 1.2);
  const rim = new THREE.DirectionalLight(0xffe2c0, .8); rim.position.set(-3, 2.2, -3);
  scene.add(key, fire, rim, new THREE.HemisphereLight(0xfff3e4, 0x20140c, .25));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  // soft contact shadow under tray + bowls (the shadow map alone looks pasted on)
  const blobT = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const blobMat = new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false });
  const blob = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = .002; m.scale.set(s, s, 1); m.renderOrder = -1; return m; };
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- materials (photo-textured) ----
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd3dce6, metalness: 1, roughness: .3, normalMap: tx.metalN, normalScale: new THREE.Vector2(.55, .55), clearcoat: .4, clearcoatRoughness: .2 });
  const food = (map, nmap, o2 = {}) => new THREE.MeshPhysicalMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .55, ...o2 });
  const rice = food(tx.rice, tx.riceN, { roughness: .6, sheen: .35, sheenColor: new THREE.Color(0xffe2a0) });
  const beefMat = food(tx.beef, tx.beefN, { roughness: .5, clearcoat: .35, clearcoatRoughness: .45, normalScale: new THREE.Vector2(1.8, 1.8) });
  const chickMat = food(tx.chick, tx.chickN, { roughness: .5, clearcoat: .3, clearcoatRoughness: .45, normalScale: new THREE.Vector2(1.6, 1.6) });
  const tikkaMat = food(tx.tikka, tx.tikkaN, { color: new THREE.Color(1.35, 1.2, 1.1), roughness: .45, clearcoat: .45, clearcoatRoughness: .35, normalScale: new THREE.Vector2(1.6, 1.6) });
  const chopMat = food(tx.chop, tx.chopN, { color: 0xd8b48e, roughness: .75, normalScale: new THREE.Vector2(2.2, 2.2), sheen: .3, sheenColor: new THREE.Color(0xffc070) });
  const shawB = food(tx.shawb, tx.shawbN, { roughness: .5, clearcoat: .4, clearcoatRoughness: .4, side: THREE.DoubleSide });
  const shawC = food(tx.shawc, tx.shawcN, { roughness: .5, clearcoat: .4, clearcoatRoughness: .4, side: THREE.DoubleSide });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xf7f3ec, roughness: .16, clearcoat: 1, clearcoatRoughness: .05 });
  const stewBean = food(tx.bean, tx.beanN, { roughness: .22, clearcoat: 1, clearcoatRoughness: .04, normalScale: new THREE.Vector2(.6, .6) });
  const stewCurry = food(tx.curry, tx.curryN, { roughness: .22, clearcoat: 1, clearcoatRoughness: .04, normalScale: new THREE.Vector2(.6, .6) });
  const turshiMat = food(tx.turshi, tx.turshiN, { roughness: .3, clearcoat: .8, clearcoatRoughness: .15 });
  const pitaMat = food(tx.pita, tx.pitaN, { roughness: .82, sheen: .4, sheenColor: new THREE.Color(0xfff0d0), side: THREE.DoubleSide });
  const potatoMat = food(tx.curry, tx.curryN, { color: 0xffd9a0, roughness: .4, clearcoat: .7 });
  const parsleyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, side: THREE.DoubleSide });
  const grainMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .42, clearcoat: .3, clearcoatRoughness: .5 });

  // ---- tray (lathe, stretched to an oval per size) ----
  const tp = [[0, 0], [.86, 0], [.92, .02], [.97, .07], [1.02, .1], [1.04, .095], [1.0, .06], [.9, .025], [0, .025]].map(p => new THREE.Vector2(p[0], p[1]));
  const tray = sh(new THREE.Mesh(planarUV(new THREE.LatheGeometry(tp, 128), .5), silver)); world.add(tray);
  const trayBlob = blob(2.3); world.add(trayBlob);
  const trayS = { A: .74, B: .62 };

  // rice bed: a displaced dome inside the rim, with real instanced grains on it
  const domeN = (x, z) => Math.sin(x * 9) * Math.cos(z * 8) * .5 + Math.sin(x * 23 + z * 17) * .5;
  const riceGeo = new THREE.SphereGeometry(1, 128, 28, 0, Math.PI * 2, 0, Math.PI / 2);
  { const p = riceGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = domeN(x, z); p.setY(i, y * (1 + n * .12) + n * .01); } riceGeo.computeVertexNormals(); planarUV(riceGeo, .5); }
  const riceBed = sh(new THREE.Mesh(riceGeo, rice)); world.add(riceBed);
  const NG = SMALL ? 1800 : 3800;
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), grainMat, NG); grains.receiveShadow = true; world.add(grains);
  const gHome = [];
  { seed = 3; const cols = [0xe8a412, 0xdc960e, 0xf0b828, 0xf5cf62, 0xd28410]; const c = new THREE.Color();
    for (let i = 0; i < NG; i++) { const r = Math.sqrt(rnd(0, .93)), a = rnd(0, 6.283); gHome.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ry: rnd(0, 6.283), tilt: rnd(-.5, .5), s: rnd(.8, 1.2) }); c.setHex(cols[(rnd(0, 1) * cols.length) | 0]).offsetHSL(0, 0, rnd(-.05, .05)); grains.setColorAt(i, c); } }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E1 = new THREE.Euler();
  function placeGrains(sx, sy, sz) {
    if (sx < .01) { grains.visible = false; return; } grains.visible = true;
    gHome.forEach((h, i) => { const y = Math.sqrt(Math.max(0, 1 - h.x * h.x - h.z * h.z)), n = domeN(h.x, h.z); P.set(h.x * sx, .02 + (y * (1 + n * .12) + n * .01) * sy + .002, h.z * sz); E1.set(h.tilt * .4, h.ry, h.tilt); Q.setFromEuler(E1); S1.set(.006 * h.s, .005 * h.s, .019 * h.s); M.compose(P, Q, S1); grains.setMatrixAt(i, M); });
    grains.instanceMatrix.needsUpdate = true;
  }

  // parsley flecks: small jagged leaves, instanced per row
  const leafShape = new THREE.Shape(); { const n = 7; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = i % 2 ? .55 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r * .75; i ? leafShape.lineTo(x, y) : leafShape.moveTo(x, y); } }
  const leafGeo = new THREE.ShapeGeometry(leafShape); leafGeo.rotateX(-Math.PI / 2);
  const greens = [0x2f6b1c, 0x3d7d22, 0x24561a, 0x4d8a2a];
  function parsley(n, spot) { // spot(i) → [x, y, z]
    const im = new THREE.InstancedMesh(leafGeo, parsleyMat, n), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const [x, y, z] = spot(i); E1.set(rnd(-.5, .5), rnd(0, 6.28), rnd(-.5, .5)); Q.setFromEuler(E1); P.set(x, y, z); S1.setScalar(rnd(.005, .011)); M.compose(P, Q, S1); im.setMatrixAt(i, M); im.setColorAt(i, c.setHex(greens[i % 4])); }
    return im;
  }

  // ---- builders for each item ----
  function kofta(mat, len) { // hand-pressed: lumpy radius + finger ridges along the skewer
    const prof = [], R = .056;
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), -len / 2 + Math.sin(a) * R)); }
    for (let i = 1; i < 40; i++) prof.push(new THREE.Vector2(R * (1 + .07 * Math.sin(i * 1.9 + rnd(0, 3)) + .045 * Math.sin(i * 4.7)), -len / 2 + len * i / 40));
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * i / 8; prof.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * R), len / 2 + Math.sin(a) * R)); }
    const geo = new THREE.LatheGeometry(prof, 28), p = geo.attributes.position, ph = rnd(0, 6);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .05 * Math.sin(a * 3 + y * 31 + ph) + .03 * Math.sin(a * 7 - y * 57); p.setX(i, x * k); p.setZ(i, z * k); }
    geo.computeVertexNormals();
    const m = sh(new THREE.Mesh(geo, mat)); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, .82);
    return m;
  }
  function tikkaRow(len) {
    const g = new THREE.Group(), n = Math.max(3, Math.round(len / .085));
    for (let i = 0; i < n; i++) { const s = .07 + rnd(0, .025); const c = sh(new THREE.Mesh(new RoundedBoxGeometry(s * rnd(.85, 1.25), s * rnd(.6, .85), s * rnd(.8, 1.15), 3, .022), tikkaMat)); c.position.set(rnd(-.035, .035), s * .4, -len / 2 + (i + .5) * len / n); c.rotation.set(rnd(-.35, .35), rnd(0, 3), rnd(-.35, .35)); g.add(c); }
    g.add(parsley(14, () => [rnd(-.04, .04), .085, rnd(-len / 2, len / 2)]));
    return g;
  }
  function chopRow(len) { // breaded cutlets fanned along the row
    const g = new THREE.Group(), n = Math.max(2, Math.round(len / .19));
    for (let i = 0; i < n; i++) { const geo = new THREE.SphereGeometry(1, 40, 16), p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, p.getY(k) * (1 + .12 * Math.sin(x * 11 + z * 7))); } geo.computeVertexNormals();
      const c = sh(new THREE.Mesh(geo, chopMat)); c.scale.set(.17, .03, .085); c.position.set(rnd(-.02, .02), .025 + i * .006, -len / 2 + (i + .5) * len / n); c.rotation.set(-.15, rnd(-.35, .35), rnd(-.05, .05)); g.add(c); }
    return g;
  }
  function shawarma(n, mat, area) { // instanced curled strips
    const geo = new THREE.CylinderGeometry(.042, .042, .046, 10, 1, true, 0, 2.2);
    const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true;
    const homes = [];
    for (let i = 0; i < n; i++) { const x = rnd(area.x0, area.x1), z = rnd(area.z0, area.z1), mid = 1 - Math.abs((z - (area.z0 + area.z1) / 2) / ((area.z1 - area.z0) / 2)), y = .01 + rnd(0, .06) + mid * .12; homes.push({ p: new THREE.Vector3(x, y, z), r: new THREE.Euler(rnd(-1.2, 1.2), rnd(0, 6.28), rnd(-1.2, 1.2)), s: new THREE.Vector3(rnd(.7, 1.5), rnd(.6, 1.2), rnd(.6, 1.1)).multiplyScalar(rnd(.75, 1.15)), d: rnd(0, .5) }); }
    im.userData.homes = homes; return im;
  }
  function placeShawarma(im, t) {
    im.userData.homes.forEach((h, i) => { const k = clamp((t - h.d * .5) / .5); P.copy(h.p); P.y += (1 - bounce(k)) * .8; Q.setFromEuler(h.r); if (k > 0) S1.copy(h.s); else S1.setScalar(.0001); M.compose(P, Q, S1); im.setMatrixAt(i, M); });
    im.instanceMatrix.needsUpdate = true;
  }
  function bowl(fill) {
    const g = new THREE.Group();
    const bp = [[0, 0], [.07, 0], [.075, .006], [.12, .05], [.15, .11], [.156, .118], [.15, .12], [.142, .112], [.11, .05], [.065, .018], [0, .018]].map(p => new THREE.Vector2(p[0], p[1]));
    g.add(sh(new THREE.Mesh(new THREE.LatheGeometry(bp, 64), porcelain)));
    const b = blob(.42); b.position.y = .003; g.add(b);
    if (fill === 'turshi') {
      const mound = sh(new THREE.Mesh(planarUV(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), .5), turshiMat)); mound.scale.set(.13, .045, .13); mound.position.y = .075; g.add(mound);
      const cols = [0xf2c94c, 0xe9b43a, 0xe8772a, 0xf7e08a];
      for (let i = 0; i < 12; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .012, 12, 1, true, 0, 2.4), new THREE.MeshPhysicalMaterial({ color: cols[i % 4], roughness: .25, clearcoat: .8, side: THREE.DoubleSide }))); c.position.set(rnd(-.07, .07), .1 + rnd(0, .02), rnd(-.07, .07)); c.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); g.add(c); }
    } else {
      const s = new THREE.Mesh(planarUV(new THREE.CircleGeometry(.139, 48).rotateX(-Math.PI / 2), 3.4), fill === 'bean' ? stewBean : stewCurry); s.position.y = .1; s.receiveShadow = true; g.add(s);
      if (fill === 'curry') for (let i = 0; i < 6; i++) { const b2 = sh(new THREE.Mesh(new RoundedBoxGeometry(.045, .035, .04, 2, .012), potatoMat)); b2.position.set(rnd(-.08, .08), .097, rnd(-.08, .08)); b2.rotation.set(rnd(-.3, .3), rnd(0, 3), 0); g.add(b2); }
    }
    return g;
  }
  function pitaDisc() { // puffy wavy round with planar UVs
    const prof = []; for (let i = 0; i <= 14; i++) { const r = .17 * i / 14; prof.push(new THREE.Vector2(Math.max(.001, r), .006 * Math.sqrt(1 - Math.pow(i / 14, 4)))); }
    for (let i = 13; i >= 0; i--) { const r = .17 * i / 14; prof.push(new THREE.Vector2(Math.max(.001, r), -.004 * Math.sqrt(1 - Math.pow(i / 14, 4)))); }
    const geo = new THREE.LatheGeometry(prof, 48), p = geo.attributes.position, ph = rnd(0, 6);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / .17; p.setY(i, p.getY(i) + r * r * .02 * Math.sin(Math.atan2(z, x) * 3 + ph) + .004 * Math.sin(x * 40) * Math.cos(z * 37)); }
    geo.computeVertexNormals(); planarUV(geo, 2.9);
    return sh(new THREE.Mesh(geo, pitaMat));
  }
  function pitaStack() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const p = pitaDisc(); p.scale.z = .85; p.position.set(rnd(-.02, .02), .008 + i * .012, rnd(-.02, .02)); p.rotation.y = rnd(0, 3); g.add(p); }
    const lean = pitaDisc(); lean.rotation.set(-.9, .3, 0); lean.position.set(.02, .1, -.08); g.add(lean);
    const b = blob(.5); g.add(b);
    return g;
  }

  // ---- layout + sequencer ----
  let current = 0;
  const live = new THREE.Group(); world.add(live);
  function layout(size) {
    seed = 11 + size;
    const C = SIZES[size], A = C.A, B = C.B, len = B * 1.45;
    const cols = [];
    for (let i = 0; i < C.chop; i++) cols.push(['chop', chopRow(len * .9)]);
    for (let i = 0; i < C.tikka; i++) cols.push(['tikka', tikkaRow(len)]);
    const koftaRow = mat => { const g = new THREE.Group(), n = Math.max(2, Math.floor(len / .46)); for (let k = 0; k < n; k++) { const m = kofta(mat, .4); m.position.set(rnd(-.015, .015), .02, -len / 2 + (k + .5) * len / n); m.rotation.z = rnd(-.06, .06); g.add(m); } g.add(parsley(22, () => [rnd(-.032, .032), .068, rnd(-len / 2, len / 2)])); return g; };
    for (let i = 0; i < C.beef; i++) cols.push(['beef', koftaRow(beefMat)]);
    for (let i = 0; i < C.chicken; i++) cols.push(['chicken', koftaRow(chickMat)]);
    const x0 = -A * .78, x1 = A * .62, span = x1 - x0;
    const out = [];
    cols.forEach(([kind, g], i) => { const x = x0 + span * (cols.length === 1 ? .5 : i / (cols.length - 1)); g.userData.home = new THREE.Vector3(x, .15, -B * .12); g.userData.kind = kind; g.userData.delay = i * .09; out.push(g); });
    const sb = shawarma(Math.round(C.shawarma * .55), shawB, { x0: -A * .78, x1: A * .05, z0: B * .3, z1: B * .8 });
    const sc = shawarma(Math.round(C.shawarma * .45), shawC, { x0: A * .05, x1: A * .78, z0: B * .3, z1: B * .8 });
    sb.position.y = sc.position.y = .07; sb.userData.shaw = sc.userData.shaw = true;
    out.push(sb, sc);
    // a light scatter of parsley over the rice edges
    const rp = parsley(Math.round(40 * A), () => { const a = rnd(0, 6.28), r = rnd(.75, .92); return [Math.cos(a) * r * A * .86, .03 + .14 * Math.sqrt(Math.max(0, 1 - r * r)) * .9, Math.sin(a) * r * B * .84]; });
    rp.userData.home = new THREE.Vector3(0, 0, 0); rp.userData.delay = .5; out.push(rp);
    // bowls + pita around the back of the tray
    const sides = [];
    const fills = ['curry', 'bean', 'curry'].slice(0, C.bowls);
    const side = (name, width, make) => { if (scans[name]) { const g = fit(scans[name], width); const bl = blob(width * 1.35); bl.position.y = .003; g.add(bl); g.userData.stew = name !== 'pita' && name !== 'turshi'; return g; } return make(); };
    fills.forEach((f, i) => { const b = side(f === 'bean' ? 'bean' : 'curry', .33, () => bowl(f)); b.rotation.y = rnd(-.4, .4); b.userData.home = new THREE.Vector3(-A * .55 + i * A * .55, 0, -B - .3); b.userData.side = true; b.userData.delay = .1 + i * .08; sides.push(b); });
    const tu = side('turshi', .33, () => bowl('turshi')); tu.scale.multiplyScalar(.8); tu.userData.home = new THREE.Vector3(A * .98, 0, -B * .8 - .12); tu.userData.side = true; tu.userData.delay = .35; sides.push(tu);
    const pi = side('pita', .42, pitaStack); pi.userData.home = new THREE.Vector3(-A - .3, 0, -B * .2); pi.userData.side = true; pi.userData.delay = .42; sides.push(pi);
    return { A, B, parts: out, sides };
  }
  let lastRice = '';
  function placeAll(L, t) {
    // t: 0 → 1 across the whole lay-out
    const tr = clamp(t / .25), rc = clamp((t - .15) / .2), it = clamp((t - .3) / .45), sw = clamp((t - .55) / .35), sd = clamp((t - .6) / .4);
    const A = trayS.A + (L.A - trayS.A) * ease(tr), B = trayS.B + (L.B - trayS.B) * ease(tr);
    tray.scale.set(A, 1, B); trayBlob.scale.set(A * 2.35, B * 2.4, 1);
    const sx = A * .86 * ease(rc), sy = .14 * ease(rc) + .001, sz = B * .84 * ease(rc);
    riceBed.scale.set(sx, sy, sz); riceBed.position.y = .02; riceBed.visible = rc > 0;
    const key = `${sx.toFixed(4)}|${sz.toFixed(4)}`; if (key !== lastRice) { lastRice = key; placeGrains(rc > 0 ? sx : 0, sy, sz); }
    L.parts.forEach(g => {
      if (g.userData.shaw) { placeShawarma(g, sw); return; }
      const k = clamp((it - g.userData.delay) / .45); const h = g.userData.home;
      g.visible = k > 0; g.position.set(h.x, h.y + (1 - bounce(k)) * 1.1, h.z); g.rotation.y = (1 - k) * .4;
    });
    L.sides.forEach(g => { const k = clamp((sd - g.userData.delay) / .5); const h = g.userData.home; g.visible = k > 0; g.position.set(h.x, h.y + (1 - easeOut(k)) * .6, h.z + (1 - easeOut(k)) * -.6); });
    return { A, B };
  }
  let L = null, buildT = 1, D = 2.2, leaving = null, leaveT = 0;
  function build(size) {
    size = +size; if (!SIZES[size]) return;
    if (L) { leaving = L; leaveT = 0; }
    const next = layout(size);
    next.parts.forEach(g => live.add(g)); next.sides.forEach(g => live.add(g));
    if (L) { trayS.A = tray.scale.x; trayS.B = tray.scale.z; }
    L = next; current = size; buildT = RM ? 1 : 0; placeAll(L, buildT); start();
    if (o.onBuild) o.onBuild(size);
  }
  function clearLeaving(dt) {
    if (!leaving) return;
    leaveT += dt / .35; const k = clamp(leaveT);
    [...leaving.parts, ...leaving.sides].forEach(g => { g.position.y += dt * 3 * k; g.scale.setScalar(Math.max(.001, 1 - k)); });
    if (k >= 1) { [...leaving.parts, ...leaving.sides].forEach(g => { live.remove(g); g.traverse(m => m.geometry && m.geometry !== leafGeo && m.geometry.dispose()); }); leaving = null; }
  }

  // ---- post: GTAO contact occlusion on desktop (keeps the transparent canvas) ----
  let composer = null, gtao = null;
  if (!SMALL && renderer.capabilities.isWebGL2 && !o.noPost) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: .12, distanceExponent: 1.2, thickness: 1.2, scale: 1, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.blendIntensity = .9;
    const gr = gtao.render.bind(gtao); gtao.render = (...a) => { floor.visible = false; gr(...a); floor.visible = true; };
    composer.addPass(gtao); composer.addPass(new OutputPass());
  }

  // ---- camera ----
  let az = 0, el = 0, taz = 0, tel = 0, t0 = 0;
  const target = new THREE.Vector3(0, .1, -.1);
  const placeCam = () => {
    const span = Math.max(tray.scale.x + 1.1, (tray.scale.z + .55) * 1.4);
    D += ((SMALL ? 2.3 : 1.9) * span * (o.zoom || 1) + 1.1 - D) * .06;
    const E = .78 + el, Az = (o.angle ?? .35) + az;
    camera.position.set(target.x + Math.sin(Az) * Math.cos(E) * D, target.y + Math.sin(E) * D, target.z + Math.cos(Az) * Math.cos(E) * D); camera.lookAt(target);
  };
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; taz = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * .5; tel = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * -.14; }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 40 : 30; camera.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0;
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    if (L && buildT < 1) { buildT = clamp(buildT + dt / 2.4); placeAll(L, buildT); }
    clearLeaving(dt);
    fire.intensity = 3.4 + Math.sin(t0 * 9) * .4 + Math.sin(t0 * 23) * .25;
    az += (taz + (RM ? 0 : Math.sin(t0 * .2) * .06) - az) * .05; el += (tel - el) * .05; placeCam();
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);

  build(o.size || 5);
  placeCam(); renderer.compile(scene, camera); start();
  return { build, get size() { return current; }, renderer };
}
