/* =====================================================================
   tiles: studio product shots for catalogs. Same light recipe as the build3d stage
   (studio HDRI, soft key + rim, Neutral tone mapping), transparent background with a
   soft contact shadow, auto-framed. Render dozens of items in one go, then save them
   as WebP (see kit/build3d/tiles/render.mjs).
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { rng } from './util.js';
import { MAT } from './materials.js';
export { THREE };

export async function createTiles(o = {}) {
  const SIZE = o.size || 640, ASSETS = o.assets || 'assets/';
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE, false); renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = o.exposure ?? 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const env = await new RGBELoader().loadAsync(ASSETS + (o.hdr || 'studio-512.hdr')); env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = env; scene.environmentRotation.set(0, o.envRotation ?? 1.2, 0); scene.environmentIntensity = o.envIntensity ?? .7;
  const key = new THREE.DirectionalLight('#fff4e6', o.key ?? 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.blurSamples = 20; key.shadow.bias = o.shadowBias ?? -.0004; key.shadow.normalBias = o.normalBias ?? .002; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#dfe9ff', o.rim ?? 1.8); scene.add(rim);
  const fill = new THREE.HemisphereLight('#fff6ea', '#3a2a1c', .35); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: o.shadow ?? .34 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(o.fov || 24, 1, .005, 20);
  const tl = new THREE.TextureLoader(), cache = {}, pending = [];
  const tex = (name, srgb, rep = 1) => { const k = name + srgb + rep; if (cache[k]) return cache[k]; const t = tl.load(ASSETS + name); pending.push(new Promise(r => { const i = setInterval(() => { if (t.image && t.image.complete !== false) { clearInterval(i); r(); } }, 20); })); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rep, rep); return cache[k] = t; };
  const st = { THREE, scene, tex, LOW: false };
  const mat = (name, color) => typeof name === 'string' ? MAT[name](st, color) : name;

  // a natural pile: a dome of pieces, each resting on the surface and tilted to it. Radius scales with count
  // so piles look equally full; a hidden filler dome stops the floor showing through the gaps.
  function pile(group, p) {
    const r = rng(p.seed || 7), N = p.count || 40, geo = p.geometry; geo.computeBoundingSphere();
    const pr = (p.rest || .62) * geo.boundingSphere.radius * (p.scale || 1), flat = p.flat ?? .35;
    const R = p.radius || pr * Math.sqrt(N / (p.density || 1.5)), Hm = R * (p.height ?? .5);
    const m = p.vertexColors ? Object.assign(mat(p.mat || 'nut', p.color), { vertexColors: true }) : mat(p.mat || 'nut', p.color);
    const im = new THREE.InstancedMesh(geo, m, N); im.castShadow = im.receiveShadow = true;
    const cols = (p.colors || ['#ffffff']).map(c => new THREE.Color(c)), M = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
    const [ox, oy, oz] = p.at || [0, 0, 0], H = d => Hm * Math.max(0, 1 - (d / R) ** 2);
    for (let i = 0; i < N; i++) {
      const a = r() * 6.283, d = R * Math.sqrt(r()) * (i < N * .08 ? .3 : 1), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const y = H(d) + pr * (p.lift ?? .35) - pr * .5 * r();
      n.set(x / R * 2 * Hm / R, 1, z / R * 2 * Hm / R).normalize();
      q.setFromUnitVectors(up, n).multiply(qt.setFromEuler(new THREE.Euler((r() - .5) * flat * 2, r() * 6.283, (r() - .5) * flat * 2)));
      const sc = (p.scale || 1) * (.88 + r() * .24);
      M.compose(new THREE.Vector3(x + ox, y + oy, z + oz), q, new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(i, M); im.setColorAt(i, cols[Math.floor(r() * cols.length)]);
    }
    group.add(im);
    if (p.filler !== false && Hm > pr) { const fg = new THREE.SphereGeometry(1, 32, 12, 0, 6.283, 0, Math.PI / 2); const avg = cols.reduce((a, c) => a.add(c), new THREE.Color(0, 0, 0)).multiplyScalar(.3 / cols.length); const f = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: avg, roughness: .9 })); f.scale.set(R * .8, Hm * .72, R * .8); f.position.set(ox, oy, oz); f.receiveShadow = true; group.add(f); }
    return im;
  }
  const mesh = (group, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = 1) => { const x = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); x.position.set(...pos); x.rotation.set(...rot); x.scale.setScalar(sc); x.castShadow = x.receiveShadow = true; group.add(x); return x; };

  // frame the object and render it; returns a PNG data URL
  async function shot(group, v = {}) {
    scene.add(group); await Promise.all(pending);
    const box = new THREE.Box3().setFromObject(group), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const R = Math.max(sz.x, sz.z, sz.y * 1.2) * .5 * (v.zoom || 1), el = (v.el ?? 34) * Math.PI / 180, az = (v.az ?? 28) * Math.PI / 180;
    const dist = R / Math.tan(camera.fov * Math.PI / 360) * 1.32;
    camera.position.set(c.x + Math.sin(az) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(az) * Math.cos(el) * dist); camera.near = dist / 50; camera.far = dist * 4; camera.updateProjectionMatrix();
    camera.lookAt(c.x, c.y - (v.drop ?? .08) * R, c.z);
    key.position.set(c.x - R * 3, c.y + R * 6, c.z + R * 2.4); key.target.position.copy(c); const sc = key.shadow.camera; sc.left = sc.bottom = -R * 2; sc.right = sc.top = R * 2; sc.near = R; sc.far = R * 14; sc.updateProjectionMatrix();
    rim.position.set(c.x + R * 4, c.y + R * 2.5, c.z - R * 4);
    renderer.render(scene, camera); const url = canvas.toDataURL('image/png'); scene.remove(group); return url;
  }
  return { THREE, st, scene, renderer, mat, pile, mesh, shot, tex };
}
