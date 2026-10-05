// Composite shop goods for tiles (and stages): cups, jars, bars, slices. Each takes the tiles kit T
// (createTiles result) and returns a THREE.Group sitting on y = 0. Sizes in scene units (1 ≈ 13 cm).
import * as THREE from 'three';
import { SHAPES } from './shapes.js';
import { rng, noise } from './util.js';
const V2 = THREE.Vector2, C = c => new THREE.Color(c);
const phys = o => new THREE.MeshPhysicalMaterial(o);
export const GM = {
  glass: () => phys({ color: C('#ffffff'), roughness: .04, transparent: true, opacity: .2, clearcoat: 1, clearcoatRoughness: .02, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 }),
  choc: (c = '#3a1d0e') => phys({ color: C(c), roughness: .2, clearcoat: .9, clearcoatRoughness: .08, sheen: .3, sheenColor: C('#7a4426') }),
  pist: (c = '#8fb33a') => phys({ color: C(c), roughness: .6, sheen: .6, sheenColor: C('#d9f59a') }),
  paper: (c = '#f4efe4') => phys({ color: C(c), roughness: .78, sheen: .3, sheenColor: C('#ffffff') }),
  cake: (c = '#f3e2bd') => phys({ color: C(c), roughness: .72, sheen: .5, sheenColor: C('#fff3d6') }),
  syrup: (c = '#d08a35') => phys({ color: C(c), roughness: .28, clearcoat: 1, clearcoatRoughness: .1, sheen: .3, sheenColor: C('#ffd08a') }),
  berry: () => phys({ color: C('#ffffff'), vertexColors: true, roughness: .2, clearcoat: 1, clearcoatRoughness: .06, sheen: .3, sheenColor: C('#ff9a9a'), normalScale: new V2(.4, .4) }),
  foil: () => phys({ color: C('#ffffff'), metalness: .85, roughness: .32, envMapIntensity: 1.5, clearcoat: .4 }),
  candy: () => phys({ color: C('#ffffff'), roughness: .16, clearcoat: 1, clearcoatRoughness: .04, sheen: .4, sheenColor: C('#ffffff'), envMapIntensity: 1.3 }),
  gold: () => phys({ color: C('#e6bd6e'), metalness: 1, roughness: .3, envMapIntensity: 1.4 })
};
// open cup (lathe), sits on y=0
function cup(T, g, h = .085, r0 = .036, r1 = .05, m = GM.glass()) { const pts = [new V2(0, 0), new V2(r0, 0), new V2(r0 + .001, .002), new V2(r1, h), new V2(r1 - .0015, h)]; const x = T.mesh(g, new THREE.LatheGeometry(pts, 64), m); x.castShadow = false; x.renderOrder = 2; return x; }
const rIn = (y, h, r0, r1) => r0 + (r1 - r0) * (y / h) - .003;
// shredded kunafa + pistachio cream crumbs (Dubai chocolate)
function kunafa(T, g, at, R, n = 160, seed = 3, top = 0) { const geo = new THREE.CylinderGeometry(.0011, .0011, .012, 5); geo.rotateZ(Math.PI / 2); return T.pile(g, { geometry: geo, mat: GM.pist('#ffffff'), colors: ['#8fb33a', '#7ea02e', '#a9c45a', '#c9a24a', '#b48a3a'], count: n, radius: R, at, seed, flat: 1.4, rest: .5, stack: .25, lift: .2 + top }); }
// a smooth glossy chocolate cap filling a cup at height y
function cap(T, g, y, r, m = GM.choc()) { const geo = new THREE.SphereGeometry(r, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2); geo.scale(1, .12, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + .0012 * noise(p.getX(i) * 90, 0, p.getZ(i) * 90)); geo.computeVertexNormals(); return T.mesh(g, geo, m, [0, y, 0]); }

export const GOODS = {
  dubaiCup(T, { base = 'strawberry' } = {}) {
    const g = new THREE.Group(), H = .088, r0 = .034, r1 = .048; cup(T, g, H, r0, r1);
    const R = rng(5);
    if (base === 'strawberry') for (let i = 0; i < 12; i++) { const y = .004 + Math.floor(i / 6) * .026, a = i * 1.047 + (i > 5 ? .5 : 0), rr = rIn(y + .01, H, r0, r1) - .012; T.mesh(g, SHAPES.strawberry(1.05), GM.berry(), [Math.cos(a) * rr, y, Math.sin(a) * rr], [Math.PI + (R() - .5) * .5, R() * 6, (R() - .5) * .5]).position.y += .036; }
    else for (let i = 0; i < 12; i++) { const y = .004 + Math.floor(i / 5) * .02, a = i * 2.4, rr = rIn(y, H, r0, r1) - .016; T.mesh(g, SHAPES.block(1, .026, .02, .024), T.mat('crumbSide'), [Math.cos(a) * rr, y + .01, Math.sin(a) * rr], [R() * .4, R() * 6, R() * .4]); }
    cap(T, g, H * .74, rIn(H * .74, H, r0, r1));
    kunafa(T, g, [0, H * .74 + .004, 0], .026, 140, 9);
    if (base === 'strawberry') { const s = new THREE.Group(); T.mesh(s, SHAPES.strawberry(1.25), GM.berry()); T.mesh(s, SHAPES.calyx(1.3), T.mat('leaf', '#4f8f2a'), [0, .048, 0]); s.position.set(.006, H * .74 + .012, 0); s.rotation.set(.1, .5, -.5); g.add(s); }
    return g;
  },
  dubaiBar(T) {
    const g = new THREE.Group(), cols = 3, rows = 5, w = .028, d = .026, h = .009, mC = GM.choc('#4a2614');
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { if (i === 2 && j === 0) continue; const b = new THREE.BoxGeometry(w * .94, h, d * .94, 4, 2, 4); const p = b.attributes.position; for (let k = 0; k < p.count; k++) if (p.getY(k) > 0) { p.setX(k, p.getX(k) * .9); p.setZ(k, p.getZ(k) * .9); } b.computeVertexNormals(); T.mesh(g, b, mC, [(i - 1) * w, h / 2 + .003, (j - 2) * d]); }
    T.mesh(g, new THREE.BoxGeometry(w * cols, .004, d * rows), mC, [0, .002, 0]);
    // the broken piece, leaning on the bar, showing the pistachio-kunafa centre
    const pc = new THREE.Group(); T.mesh(pc, new THREE.BoxGeometry(w * .95, .004, d * .95), mC, [0, .002, 0]); T.mesh(pc, new THREE.BoxGeometry(w * .9, .007, d * .9), GM.pist('#93b53c'), [0, .0075, 0]); T.mesh(pc, new THREE.BoxGeometry(w * .95, .004, d * .95), mC, [0, .013, 0]);
    pc.position.set(w * 1.5 + .022, .006, -d * 2.2); pc.rotation.set(.35, -.5, .9); g.add(pc);
    kunafa(T, g, [w * 1.5 + .03, 0, -d * 2.4], .016, 50, 4);
    g.rotation.y = .5; return g;
  },
  dippedStrawberries(T) {
    const g = new THREE.Group(), R = rng(11);
    [[0, 0, 0], [.04, 0, .018], [-.036, 0, .026], [.006, 0, .046], [.03, 0, -.03]].forEach(([x, , z], i) => {
      const s = new THREE.Group(); T.mesh(s, SHAPES.strawberry(1.3, false, .62), GM.berry()); T.mesh(s, SHAPES.calyx(1.3), T.mat('leaf', '#4f8f2a'), [0, .049, 0]);
      kunafa(T, s, [0, .006, 0], .012, 30, i + 3, .5);
      s.position.set(x * 1.2, .018, z * 1.2); s.rotation.set(0, R() * 6, 0); s.children.forEach(c => c.rotation.x += 0); s.rotateX(Math.PI / 2 - .2); g.add(s);
    }); return g;
  },
  dates(T, { stuffed = false, coated = false } = {}) {
    const g = new THREE.Group(), R = rng(stuffed ? 2 : 6);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, d = .018 * Math.sqrt(i), x = Math.cos(a) * d * 1.6, z = Math.sin(a) * d * 1.6, y = .012 + (i < 3 ? .016 : 0);
      const m = T.mesh(g, SHAPES.date(1.5), coated ? GM.choc(i % 2 ? '#3a1d0e' : '#5a3018') : T.mat('nut', ['#4a2414', '#5a2d18', '#3e1d10'][i % 3]), [x, y, z], [0, R() * 6, R() * .3]);
      if (stuffed) T.mesh(g, SHAPES.almond(1.15), T.mat('nut', i % 2 ? '#b0703f' : '#d9c49e'), [x, y + .012, z], [0, m.rotation.y, 0]);
      if (coated) kunafa(T, g, [x, y + .009, z], .01, 26, i + 20);
    } return g;
  },
  slice(T, { kind = 'cheesecake' } = {}) {
    const g = new THREE.Group(), R = .085, A = .62, H = kind === 'cheesecake' ? .05 : .062;
    const wedge = (h, y, m, r = R) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, -A / 2, A / 2, false); sh.lineTo(0, 0); const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: .0012, bevelSize: .0012, bevelSegments: 2, curveSegments: 40 }); geo.rotateX(-Math.PI / 2); return T.mesh(g, geo, m, [0, y, 0]); };
    if (kind === 'cheesecake') { wedge(.012, 0, T.mat('bake', '#b07033')); wedge(H - .012, .012, GM.cake('#f4e6c4')); wedge(.004, H, GM.cake('#e2b56a')); }
    else { const L = [['#3a1f12', .016], ['#f0e2c8', .006], ['#3a1f12', .016], ['#f0e2c8', .006], ['#3a1f12', .016]]; let y = 0; for (const [c, h] of L) { wedge(h, y, c === '#3a1f12' ? T.mat('crumbSide') : GM.cake(c)); y += h; } wedge(.004, y, GM.choc()); }
    g.children.forEach(m => { m.position.x -= R * .5; }); g.rotation.y = -2.2; T.mesh(g, new THREE.CylinderGeometry(.075, .066, .005, 64), T.mat('porcelain'), [0, -.0025, 0]); g.position.y = .005;
    return g;
  },
  iceCream(T) {
    const g = new THREE.Group(), H = .05, r0 = .03, r1 = .042;
    const pts = [new V2(0, 0), new V2(r0, 0), new V2(r1, H), new V2(r1 + .002, H + .003), new V2(r1 - .002, H + .003)]; T.mesh(g, new THREE.LatheGeometry(pts, 48), GM.paper('#f1ece1'));
    T.mesh(g, new THREE.CylinderGeometry(r1 + .0005, r1 * .96, .014, 48, 1, true), phys({ color: C('#8cc63f'), roughness: .6, side: THREE.DoubleSide }), [0, H * .55, 0]);
    const s = new THREE.SphereGeometry(.038, 64, 40); const p = s.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .06 * noise(x * 60, y * 60, z * 60) + (y < -.015 ? .08 * Math.sin(Math.atan2(z, x) * 9) * ((-.015 - y) / .02) : 0); p.setXYZ(i, x * k, y * (y < 0 ? .5 : .95), z * k); } s.computeVertexNormals();
    T.mesh(g, s, T.mat('cream', '#6b3b22'), [0, H + .012, 0]);
    T.pile(g, { geometry: SHAPES.button(.4), mat: GM.choc('#ffffff'), colors: ['#2b160b', '#f3e7cd'], count: 22, radius: .02, at: [0, H + .046, 0], seed: 4, flat: 1, lift: .1, stack: .3 });
    return g;
  },
  jar(T, { fill = '#b0773a', label = '#8cc63f' } = {}) {
    const g = new THREE.Group(), H = .085, r = .036;
    T.mesh(g, new THREE.CylinderGeometry(r, r, H, 48, 1, true), GM.glass(), [0, H / 2, 0]).renderOrder = 2;
    T.mesh(g, new THREE.CylinderGeometry(r - .002, r - .002, H * .82, 48), T.mat('cream', fill, 2), [0, H * .41, 0]);
    const sw = new THREE.SphereGeometry(r * .9, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2); const p = sw.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z) / (r * .9); p.setY(i, p.getY(i) * .45 + .006 * Math.sin(a * 2 + rr * 9) * rr); } sw.computeVertexNormals(); T.mesh(g, sw, T.mat('cream', fill, 2), [0, H * .82, 0]);
    T.mesh(g, new THREE.CylinderGeometry(r + .0005, r + .0005, .03, 48, 1, true), phys({ color: C(label), roughness: .55, side: THREE.DoubleSide }), [0, H * .4, 0]);
    T.mesh(g, new THREE.CylinderGeometry(r + .002, r + .002, .014, 48), GM.gold(), [r * 2.1, .007, r * .6]);
    T.pile(g, { geometry: SHAPES.hazelnut(1.1), mat: 'nut', colors: ['#c99a5e', '#b98a52', '#d3a86c'], count: 14, radius: .03, at: [-r * 1.6, 0, r * 1.2], seed: 2 });
    return g;
  },
  spices(T) {
    const g = new THREE.Group(); [['#a3271f', -.04, 0], ['#7b8a3a', .04, -.008], ['#d99a1c', 0, .05], ['#5a2e1b', .012, -.06]].forEach(([c, x, z], i) => {
      const dish = T.mesh(g, new THREE.CylinderGeometry(.036, .03, .01, 40), T.mat('porcelain', '#efe9dc'), [x, .005, z]);
      const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new V2(.031 * (1 - u) + 1e-5, .03 * (1 - (1 - u) ** 1.8) )); } const m = new THREE.LatheGeometry(pts, 48); const p = m.attributes.position; for (let k = 0; k < p.count; k++) { const s2 = 1 + .06 * noise(p.getX(k) * 90, p.getY(k) * 90, p.getZ(k) * 90); p.setX(k, p.getX(k) * s2); p.setZ(k, p.getZ(k) * s2); } m.computeVertexNormals(); T.mesh(g, m, T.mat('powder', c), [x, .008, z]);
    }); return g;
  },
  nougat(T, { dipped = true } = {}) {
    const g = new THREE.Group(), R = rng(8);
    for (let i = 0; i < 7; i++) { const a = i * 2.2, d = i ? .03 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, b = new THREE.Group();
      T.mesh(b, SHAPES.block(1.2, .05, .024, .022), T.mat('powder', '#f4ecd8'));
      T.pile(b, { geometry: SHAPES.pistachio(.32), mat: GM.pist('#ffffff'), colors: ['#8fb33a', '#a9c45a', '#c9b06a'], count: 9, radius: .02, at: [0, .011, 0], seed: i, lift: .1, height: .05, filler: false });
      if (dipped) T.mesh(b, SHAPES.block(1.24, .026, .026, .024), GM.choc(), [.016, 0, 0]);
      b.position.set(x, .015 + (i ? 0 : .02), z); b.rotation.set(0, R() * 6, (R() - .5) * .3); g.add(b); }
    return g;
  },
  baklava(T) {
    const g = new THREE.Group(), R = rng(4);
    for (let i = 0; i < 7; i++) { const row = i < 4 ? 0 : 1, x = (i - (row ? 4 : 0) - (row ? 1 : 1.5)) * .04 + row * .02, z = row * .05 - .025, b = new THREE.Group();
      T.mesh(b, SHAPES.baklava(1.15), Object.assign(GM.syrup('#ffffff'), { vertexColors: true }));
      kunafa(T, b, [0, .011, 0], .006, 24, i + 1);
      b.position.set(x, .0115, z); b.rotation.set(0, (R() - .5) * .15, 0); g.add(b); }
    return g;
  }
};
