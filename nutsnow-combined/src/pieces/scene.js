/* Nuts Now page transition: the pieces. Renders every nut and candy as a real 3D model (studio HDRI, physical
   materials) from a few angles onto transparent cells, for js/transition.js to drop across the screen.
   Run: see render.mjs. Output: a list of PNG data URLs on window.__sprites. */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SHAPES } from '../../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';
import { rng, noise } from '../../../.claude/skills/ela-studio/kit/build3d/src/util.js';

const SIZE = 200, ASSETS = '/.claude/skills/ela-studio/kit/build3d/assets/';
const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE, false); renderer.setClearColor(0, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const key = new THREE.DirectionalLight('#fff1dc', 2.7); key.position.set(-2, 3.2, 2.4);
const rim = new THREE.DirectionalLight('#e4ecff', 2.1); rim.position.set(2.6, 1.4, -2.2);
const fill = new THREE.HemisphereLight('#fff6ea', '#3a2a1c', .45);
scene.add(key, rim, fill);
const camera = new THREE.PerspectiveCamera(22, 1, .01, 50); camera.position.set(0, 0, 3); camera.lookAt(0, 0, 0);
const tl = new THREE.TextureLoader(), wait = [];
const tex = (n, rep) => { const t = tl.load(ASSETS + n); wait.push(new Promise(r => { const i = setInterval(() => { if (t.image && t.image.complete !== false) { clearInterval(i); r(); } }, 20); })); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t; };
const C = c => new THREE.Color(c), V2 = THREE.Vector2;
const nrm = tex('ice_n.webp', 6);

/* materials */
const M = {
  nut: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .5, normalMap: nrm, normalScale: new V2(.7, .7), clearcoat: .3, clearcoatRoughness: .4, sheen: .45, sheenColor: C('#ffe2b0') }),
  roast: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .36, normalMap: nrm, normalScale: new V2(.5, .5), clearcoat: .55, clearcoatRoughness: .25, sheen: .3, sheenColor: C('#ffd59a') }),
  // gummy: glossy, a little see-through looking (bright emissive core + clearcoat), no real transmission on a clear canvas
  gummy: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .22, clearcoat: 1, clearcoatRoughness: .12, sheen: .6, sheenColor: C(c).lerp(C('#ffffff'), .5), emissive: C(c), emissiveIntensity: .32, envMapIntensity: 1.2 }),
  // sour: sugar-sanded
  sour: () => new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), vertexColors: true, roughness: .7, normalMap: tex('ice_n.webp', 5), normalScale: new V2(2.2, 2.2), sheen: 1, sheenColor: C('#ffffff'), sheenRoughness: .5, emissive: C('#ffffff'), emissiveIntensity: .08 }),
  choc: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .24, clearcoat: .85, clearcoatRoughness: .1, sheen: .3, sheenColor: C('#7a4426') }),
  candy: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .12, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.35 }),
  yogurt: () => new THREE.MeshPhysicalMaterial({ color: C('#f6f1e6'), roughness: .42, clearcoat: .3, sheen: .7, sheenColor: C('#ffffff') }),
  dried: c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .34, normalMap: nrm, normalScale: new V2(.9, .9), clearcoat: .6, clearcoatRoughness: .3, emissive: C(c), emissiveIntensity: .12 })
};

/* a few extra shapes */
const V3 = THREE.Vector3;
const colorBy = (g, f) => { const p = g.attributes.position, col = [], v = new V3(); for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const c = f(v); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; };
const lentil = () => { const g = new THREE.SphereGeometry(.016, 32, 20); g.scale(1, .55, 1); return g; };
const truffle = () => { const g = new THREE.SphereGeometry(.017, 32, 22); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .05 * noise(x * 90, y * 90, z * 90); p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; };
const sourWorm = (a, b) => { const g = SHAPES.worm(1); g.computeBoundingBox(); const x0 = g.boundingBox.min.x, x1 = g.boundingBox.max.x; return colorBy(g, v => C((v.x - x0) / (x1 - x0) < .5 ? a : b)); };
const peachRing = () => { const g = new THREE.TorusGeometry(.017, .0075, 22, 56); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setZ(i, z * 1.15 + (z > 0 ? .0012 : 0)); } g.computeVertexNormals(); return colorBy(g, v => C(v.z > .0005 ? '#ff9f6a' : '#ffe08a')); };
const bear = () => { const g = SHAPES.bear(1.15); g.computeVertexNormals(); return g; };
const pistachioShell = () => {
  // two shell halves cracked open along one side, the green kernel showing in the gap
  const half = up => { const h = new THREE.SphereGeometry(.016, 28, 14, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2); h.scale(1, .72, 1.45); return h; };
  const lo = half(false), hi = half(true); hi.rotateZ(-.42); hi.translate(-.0035, .0032, 0);
  const k = new THREE.SphereGeometry(.0132, 24, 16); k.scale(1, .78, 1.38); k.translate(.0012, .0012, 0);
  const parts = [[lo, '#dcc69f'], [hi, '#e2cda8'], [k, '#86ad35']];
  const g = mergeGeometries(parts.map(([x, c]) => { const y = x.toNonIndexed(); y.deleteAttribute('uv'); const col = []; const cc = C(c); for (let i = 0; i < y.attributes.position.count; i++) col.push(cc.r, cc.g, cc.b); y.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return y; }));
  return g;
};

/* the cast: [name, geometry factory, material, display scale] */
const CAST = [
  ['cashew', () => SHAPES.cashew(1), M.roast('#d8a463'), 1],
  ['cashew2', () => SHAPES.cashew(1), M.roast('#c58640'), 1],
  ['almond', () => SHAPES.almond(1.1), M.nut('#a8683a'), .9],
  ['hazelnut', () => SHAPES.hazelnut(1.1), M.nut('#8f5530'), .78],
  ['walnut', () => SHAPES.walnut(1.05), M.nut('#c09159'), 1],
  ['pecan', () => SHAPES.pecan(1), M.nut('#7a4321'), .95],
  ['pistachio', pistachioShell, Object.assign(M.nut('#ffffff'), { vertexColors: true, side: THREE.DoubleSide }), .95],
  ['bear-red', bear, M.gummy('#e3222f'), 1],
  ['bear-orange', bear, M.gummy('#f58a1f'), 1],
  ['bear-yellow', bear, M.gummy('#f6cf2a'), 1],
  ['bear-green', bear, M.gummy('#46b24a'), 1],
  ['bear-white', bear, M.gummy('#f3e9d8'), 1],
  ['worm-pb', () => sourWorm('#ff4f8b', '#2fa8f5'), M.sour(), 1.5],
  ['worm-yo', () => sourWorm('#ffd12e', '#ff7a1f'), M.sour(), 1.5],
  ['ring', peachRing, M.sour(), 1.05],
  ['fish', () => SHAPES.fish(1.15), M.gummy('#d0101c'), 1.25],
  ['licorice', () => SHAPES.licorice(.85), M.gummy('#b5121b'), 1.5],
  ['truffle', truffle, M.choc('#3d2012'), .85],
  ['lentil-b', lentil, M.candy('#2a6fdb'), .7],
  ['lentil-r', lentil, M.candy('#e0262f'), .7],
  ['lentil-y', lentil, M.candy('#f4c21b'), .7],
  ['lentil-g', lentil, M.candy('#2ea34a'), .7],
  ['pretzel', () => SHAPES.pretzel(1), M.yogurt(), 1.15],
  ['mango', () => SHAPES.mango(.9), M.dried('#f2a124'), 1.25]
];
const ANGLES = 2;

async function run() {
  const env = await new RGBELoader().loadAsync(ASSETS + 'studio-512.hdr'); env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = env; scene.environmentRotation.set(0, 1.2, 0); scene.environmentIntensity = .75;
  await Promise.all(wait);
  const r = rng(42), out = [];
  for (const [name, geo, mat, scale] of CAST) {
    for (let a = 0; a < ANGLES; a++) {
      const g = geo(); g.center(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      // a lively 3/4 view: tip the piece so its shape reads, never edge-on
      // shapes are modelled lying flat (face up = +Y): turn the face to the camera, then a gentle tilt so it reads as 3D
      const tilt = name.startsWith('lentil') || name === 'truffle' ? .9 : .38;
      m.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 + (r() - .5) * tilt + (a ? tilt * .4 : -tilt * .4), (r() - .5) * tilt, r() * 6.28, 'ZYX'));
      scene.add(m);
      const R = g.boundingSphere.radius, d = R / Math.sin(camera.fov * Math.PI / 360) * 1.04;
      camera.position.set(0, 0, d); camera.near = d / 20; camera.far = d * 4; camera.updateProjectionMatrix();
      renderer.render(scene, camera); out.push({ name, scale, url: canvas.toDataURL('image/png') });
      scene.remove(m);
    }
  }
  window.__sprites = out; window.__ready = true;
}
run().catch(e => { console.error(e); window.__error = String(e); });
