// Small-item geometries for scatter(): nuts, sweets, fruit. Sizes in scene units (plate radius 1 ≈ 13 cm).
// Use: scatter(st, { geometry: SHAPES.cashew(), mat: 'nut', colors: [...] })
import * as THREE from 'three';
import { noise } from './util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lumpy = (g, amt = .1, f = 40) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * noise(x * f, y * f, z * f); p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; };

export const SHAPES = {
  // kidney-shaped cashew: a fat tube bent around an arc
  cashew: (s = 1) => { const c = new THREE.CatmullRomCurve3([...Array(7)].map((_, i) => { const a = -1.15 + i / 6 * 2.3; return new THREE.Vector3(Math.sin(a) * .022, 0, -Math.cos(a) * .022); })); const g = new THREE.TubeGeometry(c, 24, .0105, 12, false); const p = g.attributes.position, fr = 24, rs = 12, P = new THREE.Vector3(), v = new THREE.Vector3(); for (let i = 0; i <= fr; i++) { const t = i / fr, k = Math.pow(Math.sin(Math.PI * (.02 + .96 * t)), .38) * (1 + .12 * Math.sin(Math.PI * t)); c.getPointAt(t, P); for (let j = 0; j <= rs; j++) { const q = i * (rs + 1) + j; v.set(p.getX(q), p.getY(q), p.getZ(q)).sub(P).multiplyScalar(k); p.setXYZ(q, P.x + v.x, P.y + v.y * .8, P.z + v.z); } } g.computeVertexNormals(); g.scale(s, s, s); return lumpy(g, .05, 60); },
  // pistachio in its cracked shell (shell colour from material, the green kernel is a second mesh merged by vertex colours)
  pistachio: (s = 1) => { const g = new THREE.SphereGeometry(.016, 14, 10); g.scale(1, .72, 1.45); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setZ(i, z + .004 * Math.sign(z) * (Math.abs(z) / .023) ** 3); } g.computeVertexNormals(); g.scale(s, s, s); return lumpy(g, .05, 70); },
  hazelnut: (s = 1) => { const g = new THREE.SphereGeometry(.015, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > .009) p.setY(i, y + (y - .009) * .9); } g.computeVertexNormals(); g.scale(s, s, s); return lumpy(g, .05, 60); },
  // pecan half: flat ellipse with ridged top
  pecan: (s = 1) => { const g = new THREE.SphereGeometry(.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(.62, .45, 1.25); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setY(i, y * (1 + .35 * Math.abs(Math.sin(z * 260))) + .003 * Math.cos(x * 400)); } g.computeVertexNormals(); g.scale(s, s, s); return g; },
  almond: (s = 1) => { const g = new THREE.SphereGeometry(.016, 14, 10); g.scale(.75, .42, 1.35); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0) { const k = 1 - .45 * (z / .0216); p.setX(i, p.getX(i) * k); } } g.computeVertexNormals(); g.scale(s, s, s); return lumpy(g, .04, 80); },
  // wrapped / disc chocolate
  chocolate: (s = 1) => { const g = new THREE.CylinderGeometry(.02, .021, .012, 24); g.scale(s, s, s); return g; },
  truffle: (s = 1) => lumpy(new THREE.SphereGeometry(.019 * s, 16, 12), .08, 40),
  // Turkish delight / nougat cube
  cube: (s = 1) => { const g = new THREE.BoxGeometry(.03, .026, .03, 3, 3, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const r = v.clone().clampLength(0, .018); v.lerp(r, .35); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); g.scale(s, s, s); return g; },
  date: (s = 1) => { const g = new THREE.SphereGeometry(.014, 14, 10); g.scale(1, .9, 2); g.scale(s, s, s); return lumpy(g, .12, 50); },
  seed: (s = 1) => { const g = new THREE.SphereGeometry(.009, 10, 8); g.scale(1, .4, 1.7); g.scale(s, s, s); return g; },
  slice: (s = 1) => { const g = new THREE.CylinderGeometry(.024, .024, .005, 20, 1, false, 0, Math.PI); g.scale(s, s, s * 1.4); return lumpy(g, .1, 50); }
};

// colour sets that read right under the studio lights
export const NUT_COLORS = {
  cashew: ['#e8c38a', '#dcb075', '#efcf9c', '#d9a868'],
  pistachio: ['#d9c49e', '#cdb48a', '#e3d1ad'],
  hazelnut: ['#9a5e33', '#8a522b', '#a8683a'],
  pecan: ['#7a4321', '#6b3a1c', '#874b26'],
  almond: ['#b0703f', '#a06535', '#bb7a47'],
  chocolate: ['#3b1f12', '#4a2716', '#2e170c'],
  wrapped: ['#d4af37', '#c0392b', '#2c6e49', '#1f4e79', '#e5e5e5'],
  delight: ['#f4c6d2', '#f7f1e8', '#d9ead3', '#fbe3b8'],
  date: ['#4a2414', '#5a2d18', '#3e1d10']
};

// ---- more single pieces (shop catalogs: candy, dried fruit, seeds, coffee, sweets) ----
const V3 = THREE.Vector3;
const disp = (g, f) => { const p = g.attributes.position, v = new V3(); for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
// sweep a circle (or any radius function) along a curve; rad(t, theta) lets you flute / twist it
const sweep = (pts, r, seg = 60, rs = 12, closed = false, rad) => { const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal'); const g = new THREE.TubeGeometry(c, seg, r, rs, closed); if (rad) { const p = g.attributes.position, fr = c.computeFrenetFrames(seg, closed), v = new V3(); for (let i = 0; i <= seg; i++) { const t = i / seg, P = c.getPointAt(t); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.set(p.getX(k), p.getY(k), p.getZ(k)).sub(P); const th = j / rs * Math.PI * 2; v.multiplyScalar(rad(t, th)); p.setXYZ(k, P.x + v.x, P.y + v.y, P.z + v.z); } } g.computeVertexNormals(); } return g; };
Object.assign(SHAPES, {
  // walnut half: a wrinkled dome with a centre groove
  walnut: (s = 1) => { const g = new THREE.SphereGeometry(.02, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, .62, 1.12); disp(g, v => { const w = .0028 * noise(v.x * 260, v.y * 260, v.z * 260) + .0016 * Math.sin(v.z * 520 + 3 * noise(v.x * 90, 0, v.z * 90)); const k = 1 - .55 * Math.exp(-((v.x / .0035) ** 2)); v.y = v.y * k + (v.y > .001 ? w : 0); }); g.scale(s, s, s); return g; },
  // gummy bear: head, ears, belly, four limbs merged
  bear: (s = 1) => { const parts = [[0, .006, 0, .0105, 1.05, .95, .8], [0, .023, 0, .0085, 1, .9, .85], [-.0062, .03, 0, .0035, 1, 1, .7], [.0062, .03, 0, .0035, 1, 1, .7], [-.0105, .01, 0, .0042, 1.3, .8, .8], [.0105, .01, 0, .0042, 1.3, .8, .8], [-.0065, -.006, 0, .0048, 1, 1.2, .85], [.0065, -.006, 0, .0048, 1, 1.2, .85]].map(([x, y, z, r, a, b, c]) => { const q = new THREE.SphereGeometry(r, 16, 12); q.scale(a, b, c); q.translate(x, y, z); return q; }); const g = mergeGeometries(parts); g.rotateX(-Math.PI / 2); g.scale(s, s, s); return g; },
  // Swedish fish: fat oval body + split tail
  fish: (s = 1) => { const b = new THREE.SphereGeometry(.012, 20, 14); b.scale(1.9, .72, .55); disp(b, v => { if (v.x > 0) v.y *= 1 - .25 * (v.x / .023); }); const t = new THREE.ConeGeometry(.009, .014, 3); t.rotateZ(Math.PI / 2); t.scale(1, 1, .45); t.translate(-.026, 0, 0); const g = mergeGeometries([b.toNonIndexed(), t.toNonIndexed()]); g.computeVertexNormals(); g.rotateX(-Math.PI / 2); g.scale(s, s, s); return g; },
  // sour worm / belt: a wavy sugared tube
  worm: (s = 1) => { const g = sweep([...Array(7)].map((_, i) => new V3(-.04 + i * .0135, 0, Math.sin(i * 1.3) * .008)), .0072, 40, 12, false, t => Math.pow(Math.sin(Math.PI * (.02 + .96 * t)), .25)); g.scale(s, s, s); return g; },
  // licorice twist: a fluted, twisted rod
  licorice: (s = 1) => { const g = sweep([new V3(-.04, 0, 0), new V3(0, 0, .002), new V3(.04, 0, 0)], .0068, 50, 30, false, (t, th) => (1 + .2 * Math.cos(6 * th + t * 26)) * (t < .02 || t > .98 ? .3 : 1)); g.scale(s, s, s); return g; },
  // pretzel: the classic knot
  pretzel: (s = 1) => { const P = [[0, -.026], [.016, -.022], [.026, -.006], [.024, .012], [.012, .022], [0, .012], [-.006, -.002], [-.014, -.016], [-.02, -.024], [.02, -.024], [.014, -.016], [.006, -.002], [0, .012], [-.012, .022], [-.024, .012], [-.026, -.006], [-.016, -.022]]; const g = sweep(P.map(([x, z], i) => new V3(x, (i === 7 || i === 8 ? .003 : i === 10 || i === 9 ? -.002 : 0), z)), .0042, 140, 10, true); g.scale(s, s, s); return g; },
  // strawberry: tip at y=0, shoulders up top. dried = shrivelled + flattened. dip = 0..1 chocolate line (vertex colours)
  strawberry: (s = 1, dried = false, dip = 0) => { const pts = []; for (let i = 0; i <= 22; i++) { const u = i / 22; let r = .0172 * Math.pow(u, .48) * (1 - .1 * u); if (u > .84) r *= Math.sqrt(Math.max(0, 1 - ((u - .84) / .16) ** 2)); pts.push(new THREE.Vector2(r + 1e-5, u * .038)); } const g = new THREE.LatheGeometry(pts, 28); const col = []; const red = new THREE.Color('#c0151f'), ch = new THREE.Color('#3a1d0e'), sd = new THREE.Color('#e9c75a'); disp(g, (v, i) => { const k = 1 + (dried ? .16 : .035) * noise(v.x * 160, v.y * 160, v.z * 160); v.x *= k; v.z *= k; const a = Math.atan2(v.z, v.x), seed = !dried && Math.sin(a * 13 + v.y * 260) * Math.sin(v.y * 820) > .86 && v.y > .003 && v.y < .033; const c = dip && v.y < dip * .038 + .002 * Math.sin(a * 3) ? ch : seed ? sd : red; col.push(c.r, c.g, c.b); }); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); if (dried) { g.rotateZ(1.5); g.scale(1, .55, 1); } g.scale(s, s, s); return g; },
  calyx: (s = 1) => { const g = new THREE.CircleGeometry(.014, 14); g.rotateX(-Math.PI / 2); disp(g, v => { const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), k = .55 + .45 * Math.abs(Math.cos(a * 3.5)); v.x *= k; v.z *= k; v.y = -r * .25; }); g.scale(s, s, s); return g; },
  // round slice with rings coloured by vertex (kiwi, pineapple, orange). colors: [centre, mid, seeds, outer, skin]
  ring: (s = 1, colors = ['#f2efc4', '#8dbb3a', '#2a2214', '#7fae2e', '#7b5a30'], hole = 0, h = .0042) => { const R = .022, r0 = R * hole + 1e-5, pts = [new THREE.Vector2(r0, -h / 2)]; pts.push(new THREE.Vector2(R, -h / 2), new THREE.Vector2(R, h / 2)); for (let i = 24; i >= 0; i--) pts.push(new THREE.Vector2(r0 + (R - r0) * i / 24, h / 2)); if (hole) pts.push(new THREE.Vector2(r0, -h / 2)); const g = new THREE.LatheGeometry(pts, 56); const p = g.attributes.position, col = [], c = new THREE.Color(), C = colors.map(x => new THREE.Color(x)); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / R, a = Math.atan2(z, x); const k = r > .95 ? 4 : r > .8 ? 3 : (r > .3 && r < .44 && Math.sin(a * 24) > .55) ? 2 : r > .22 ? 1 : 0; c.copy(C[k]); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); disp(g, v => { v.y += .0012 * noise(v.x * 120, 0, v.z * 120); }); g.scale(s, s, s); return g; },
  // dried mango strip: thin curled slab with ragged edges
  mango: (s = 1) => { const g = new THREE.BoxGeometry(.055, .0045, .026, 16, 1, 8); disp(g, v => { v.y += (v.x / .03) ** 2 * .006 + .0012 * noise(v.x * 90, 0, v.z * 90); v.z *= 1 + .18 * noise(v.x * 60, 3, 0); }); g.scale(s, s, s); return g; },
  // pineapple chunk: a ring wedge
  wedge: (s = 1) => { const g = new THREE.CylinderGeometry(.024, .024, .012, 10, 1, false, 0, Math.PI / 3.2); disp(g, v => { const r = Math.hypot(v.x, v.z); if (r < .008) { const k = .008 / Math.max(r, 1e-5); v.x *= k; v.z *= k; } v.y += .0012 * noise(v.x * 150, v.y * 150, v.z * 150); }); g.translate(-.01, 0, -.01); g.scale(s, s, s); return g; },
  // coffee bean: ellipsoid with a centre crease on the flat side
  bean: (s = 1) => { const g = new THREE.SphereGeometry(.0085, 18, 12); g.scale(1, .68, 1.38); disp(g, v => { if (v.y > 0) { v.y *= .72; v.y -= .0026 * Math.exp(-((v.x / .0014) ** 2)); } }); g.scale(s, s, s); return g; },
  // pumpkin / melon seed: flat teardrop with a rim
  flatseed: (s = 1, len = 1.7) => { const g = new THREE.SphereGeometry(.009, 18, 10); g.scale(1, .3, len); disp(g, v => { if (v.z > 0) v.x *= 1 - .55 * (v.z / (.009 * len)) ** 1.4; }); g.scale(s, s, s); return g; },
  // baklava diamond: layered pastry prism (pistachio crumb added by goods)
  baklava: (s = 1) => { const g = new THREE.CylinderGeometry(.03, .031, .02, 4, 16); g.scale(.62, 1, 1.4); const col = [], c = new THREE.Color(), L = new THREE.Color('#ecbd72'), D = new THREE.Color('#d39a4a'), T = new THREE.Color('#a85a1a'); disp(g, v => { const ly = Math.round((v.y + .01) / .0012); const top = v.y > .0099; c.copy(top ? T : ly % 2 ? L : D); col.push(c.r, c.g, c.b); v.y += .0005 * noise(v.x * 200, v.y * 200, v.z * 200); }); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.scale(s, s, s); return g; },
  // nougat / delight bar: a soft rounded block
  block: (s = 1, w = .036, h = .024, d = .02) => { const g = new THREE.BoxGeometry(w, h, d, 6, 4, 4); disp(g, v => { const r = v.clone().clampLength(0, Math.min(w, h, d) * .62); v.lerp(r, .22); v.addScaledVector(v.clone().normalize(), .0007 * noise(v.x * 160, v.y * 160, v.z * 160)); }); g.scale(s, s, s); return g; },
  // melting disc: thin domed chocolate button
  button: (s = 1) => { const g = new THREE.SphereGeometry(.013, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, .32, 1); g.scale(s, s, s); return g; },
  // wrapped bonbon: a round body with two pleated, twisted foil ends
  bonbon: (s = 1) => { const b = new THREE.SphereGeometry(.012, 20, 14); b.scale(1.25, .85, 1); const ends = [-1, 1].map(d => { const c = new THREE.ConeGeometry(.0095, .014, 12, 3, true); disp(c, v => { const a = Math.atan2(v.z, v.x), k = 1 + .25 * Math.cos(a * 6); v.x *= k; v.z *= k; }); c.rotateZ(d * Math.PI / 2); c.translate(d * .019, 0, 0); return c.toNonIndexed(); }); const g = mergeGeometries([b.toNonIndexed(), ...ends.map(e => { e.deleteAttribute('uv'); e.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(e.attributes.position.count * 2), 2)); return e; })]); g.computeVertexNormals(); g.scale(s, s, s); return g; },
  // foam candy (Swedish style): a fat two-lobed oval
  foam: (s = 1) => { const a = new THREE.SphereGeometry(.0105, 18, 12); a.scale(1, .7, 1.25); a.translate(0, 0, -.008); const b = new THREE.SphereGeometry(.0095, 18, 12); b.scale(1, .68, 1.1); b.translate(0, 0, .009); const g = mergeGeometries([a, b]); g.computeVertexNormals(); g.scale(s, s, s); return g; }
});
Object.assign(NUT_COLORS, {
  walnut: ['#b98a52', '#a97a45', '#c49a62', '#9c6c3a'],
  bbq: ['#b86a34', '#a65a2b', '#c57a3e', '#9a4f25'],
  zaatar: ['#c9b07a', '#bba26c', '#a99a5e', '#d2bc88'],
  gummy: ['#e8333c', '#f4a62a', '#f7d93a', '#3fae49', '#ef6aa7', '#f2f2f2'],
  sour: ['#3db8f5', '#f23d6e', '#9ce03a', '#fcd331', '#ff8a1f'],
  blue: ['#2f8ff0', '#59b3ff', '#f3f7ff'],
  fish: ['#d4141f', '#c80f1b', '#e02a2f'],
  licorice: ['#b5121b', '#1a1112'],
  pretzel: ['#7a3f16', '#86471a', '#6f3812'],
  strawberry: ['#b3141f', '#a8101b', '#c22028'],
  dried: ['#a51b26', '#8f1620', '#b8323a'],
  mango: ['#f2a124', '#eb9218', '#f6b23d'],
  pineapple: ['#f4cf4a', '#efc53c', '#f7d963'],
  coffee: ['#4a2a17', '#3e2212', '#56321c'],
  pumpkin: ['#efe7d0', '#e6dcc0', '#f5eedc'],
  melon: ['#f3ecda', '#ebe2cb', '#d9cfb6'],
  sunflower: ['#3d3a36', '#4a4640', '#d9d3c5'],
  baklava: ['#d99a43', '#cf8d36', '#e2a650'],
  nougat: ['#f4ecd8', '#efe4cc'],
  foam: ['#f25c8a', '#f7f0e6', '#7ac943', '#ffcf3d']
});
