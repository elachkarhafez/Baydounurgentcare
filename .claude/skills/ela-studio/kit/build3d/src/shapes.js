// Small-item geometries for scatter(): nuts, sweets, fruit. Sizes in scene units (plate radius 1 ≈ 13 cm).
// Use: scatter(st, { geometry: SHAPES.cashew(), mat: 'nut', colors: [...] })
import * as THREE from 'three';
import { noise } from './util.js';

const lumpy = (g, amt = .1, f = 40) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * noise(x * f, y * f, z * f); p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; };

export const SHAPES = {
  // kidney-shaped cashew: a fat tube bent around an arc
  cashew: (s = 1) => { const c = new THREE.CatmullRomCurve3([...Array(7)].map((_, i) => { const a = -1.15 + i / 6 * 2.3; return new THREE.Vector3(Math.sin(a) * .022, 0, -Math.cos(a) * .022); })); const g = new THREE.TubeGeometry(c, 20, .0105, 10, false); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setY(i, p.getY(i) * .8); } g.computeVertexNormals(); g.scale(s, s, s); return lumpy(g, .06, 60); },
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
