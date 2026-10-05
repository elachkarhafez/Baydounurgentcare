// Small shared helpers for the build3d kit. No three.js state lives here.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 2.2);
export const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// classic 3D gradient noise + fbm (deterministic)
const PERM = new Uint8Array(512); { const p = [...Array(256).keys()], r = rng(1234); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14) ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
export function noise(x, y, z) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const X = fx & 255, Y = fy & 255, Z = fz & 255; x -= fx; y -= fy; z -= fz;
  const u = fade(x), v = fade(y), w = fade(z), P = PERM;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
export const fbm = (x, y, z, o = 4) => { let a = 0, f = 1, s = .5; for (let i = 0; i < o; i++) { a += noise(x * f, y * f, z * f) * s; f *= 2.03; s *= .5; } return a; };

// let the browser breathe between heavy build steps
export const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 60 }) : setTimeout(r, 0)));

// Smooth normals across UV seams (box/sphere seams otherwise show creases)
export function smoothNormals(geo, tol = 1e-4) {
  const g2 = geo.clone(); for (const k of Object.keys(g2.attributes)) if (k !== 'position') g2.deleteAttribute(k);
  const m = mergeVertices(g2, tol); m.computeVertexNormals();
  const key = (x, y, z) => `${Math.round(x / tol)},${Math.round(y / tol)},${Math.round(z / tol)}`;
  const map = new Map(), mp = m.attributes.position, mn = m.attributes.normal;
  for (let i = 0; i < mp.count; i++) map.set(key(mp.getX(i), mp.getY(i), mp.getZ(i)), i);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const j = map.get(key(p.getX(i), p.getY(i), p.getZ(i))); if (j !== undefined) n.setXYZ(i, mn.getX(j), mn.getY(j), mn.getZ(j)); }
  n.needsUpdate = true;
}

// A grid mesh whose vertices get rewritten when something flows (sauce, pools, drips).
// flip=true: winding for grids where i runs outward/down and j around (blobs, caps, streams).
export function dynGrid(nu, nv, mat, flip = true) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(nu * nv * 3), idx = [];
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { const a = i * nv + j, b = a + nv; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nu * nv * 3), 3));
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData = { nu, nv, pos };
  return m;
}
export function commitGrid(m) { m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); }
