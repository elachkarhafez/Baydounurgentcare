/* =====================================================================
   Brooklyn Pizza & Bar: a real 16" New York pie, built in three.js.
   The pie is eight lathe-turned wedges (blistered, leopard-spotted
   cornicione), each with its own sauce and cheese disc and its own
   instanced toppings, so any slice can be lifted out with stretching
   cheese. Two stages share this module:
     hero: the pie builds itself on a wooden peel (dough lands, sauce
           spreads, cheese, toppings rain in, oven flush), then a slice
           lifts out with a cheese pull now and then.
     menu: the pie sits on a raised aluminium tray and re-tops itself for
           whichever pizza is picked from the menu.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh thebrooklynpizza/src/pie.js thebrooklynpizza/assets/pie.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const c = (i, j) => hash(xi + i, yi + j); return lerp(lerp(c(0, 0), c(1, 0), u), lerp(c(0, 1), c(1, 1), u), v) * 2 - 1; }

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    play(steps) { q = steps.slice(); cur = null; },
    get busy() { return !!(cur || q.length); },
    tick(dt) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; },
  };
}

/* ---------- pie dimensions ---------- */
const GAP = .005, R = 2, IN = 1.74, TOP = .07, WEDGES = 8, SPAN = R * 2.04;
const SAUCE_Y = TOP + .004, CHEESE_Y = TOP + .012, TOP_Y = TOP + .03;

/* ---------- recipes (from their menu) ---------- */
// sauce: red | pesto | bbq | buffalo | coulis | none · cheese: mozz | light | none | cheddar | multi
// toppings: [type, count, half?]  half: 'a' or 'b' puts it on one half of the pie
export const RECIPES = {
  'Margherita': { sauce: 'none', cheese: 'light', top: [['tomato', 9], ['freshMozz', 9], ['basil', 10]] },
  'Brooklyn': { sauce: 'pesto', cheese: 'mozz', top: [['sundried', 14], ['garlic', 10], ['olive', 14], ['goat', 26], ['pine', 30]] },
  'Hell Boy': { sauce: 'red', cheese: 'light', top: [['freshMozz', 8], ['capocolla', 12], ['basil', 8], ['flakes', 70], ['honey', 1]] },
  'The Brussels': { sauce: 'coulis', cheese: 'mozz', top: [['brussels', 22], ['redPepper', 12], ['goat', 24], ['walnut', 16]] },
  'Prosciutto & Arugula': { sauce: 'none', cheese: 'mozz', top: [['tomato', 8], ['prosciutto', 9], ['arugula', 70]] },
  'Three Mushroom Three Cheese': { sauce: 'none', cheese: 'multi', top: [['mushroom', 12], ['shiitake', 10], ['portabella', 9], ['parm', 26]] },
  'Four Cheese': { sauce: 'none', cheese: 'multi', top: [['dollop', 12], ['mascarpone', 10], ['parm', 22]] },
  'Barbecued Chicken': { sauce: 'bbq', cheese: 'mozz', top: [['chicken', 22], ['onion', 12], ['gouda', 10]] },
  'Buffalo Chicken': { sauce: 'buffalo', cheese: 'mozz', top: [['chickenHot', 24], ['ranch', 1]] },
  'Spicy Mexican': { sauce: 'red', cheese: 'cheddar', top: [['beef', 60], ['tomato', 7], ['jalapeno', 16]] },
  'Primavera': { sauce: 'red', cheese: 'mozz', top: [['spinach', 16], ['mushroom', 10], ['broccoli', 12], ['onion', 8], ['redPepper', 8], ['greenPepper', 8], ['parm', 14]] },
  'Greek & Hawaiian': { sauce: 'red', cheese: 'mozz', top: [['spinach', 8, 'a'], ['olive', 9, 'a'], ['broccoli', 6, 'a'], ['feta', 16, 'a'], ['pineapple', 14, 'b'], ['ham', 10, 'b'], ['bacon', 12, 'b']] },
  'Cheese': { sauce: 'red', cheese: 'mozz', top: [] },
  'Pepperoni': { sauce: 'red', cheese: 'mozz', top: [['pep', 30]] },
  'Meat Lovers': { sauce: 'red', cheese: 'mozz', top: [['pep', 16], ['sausage', 18], ['beef', 30], ['ham', 8], ['bacon', 10]] },
  '16" half & half': { sauce: 'red', cheese: 'mozz', top: [['pep', 15, 'a'], ['freshMozz', 5, 'b'], ['basil', 6, 'b'], ['tomato', 4, 'b']] },
  'Build your own': { sauce: 'red', cheese: 'mozz', random: true, top: [] },
  'Sauces': { sauce: 'red', cheese: 'mozz', top: [['pep', 12], ['honey', 1]] },
};
const BYO = ['pep', 'sausage', 'mushroom', 'olive', 'onion', 'greenPepper', 'redPepper', 'jalapeno', 'pineapple', 'bacon', 'ham', 'spinach', 'broccoli', 'basil', 'chicken', 'garlic', 'tomato'];

/* ---------- textures ---------- */
function canvasTex(size, draw, renderer, alpha) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.userData = { canvas: c, g }; return t;
}
function blob(g, x, y, r, n = 9, j = .35) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + (hash(x + i, y) - .5) * j * 2); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath();
}
function drawDough(g, S) {
  const c = S / 2, grd = g.createRadialGradient(c, c, S * .1, c, c, S * .5);
  grd.addColorStop(0, '#e8c48a'); grd.addColorStop(.8, '#d9a35a'); grd.addColorStop(.9, '#c98a3e'); grd.addColorStop(1, '#a8682a');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  // flour + browning
  for (let i = 0; i < 420; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd(.6, 1)) * S * .5; g.fillStyle = `rgba(${rnd(120, 160) | 0},${rnd(60, 80) | 0},${rnd(20, 34) | 0},${rnd(.12, .5)})`; g.beginPath(); g.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, rnd(4, 16) * S / 1024, rnd(3, 10) * S / 1024, a, 0, 7); g.fill(); }
  // wood-fired leopard spots on the cornicione
  for (let i = 0; i < 150; i++) { const a = rnd(0, 7), d = rnd(.86, .99) * S * .5, r = rnd(2, 9) * S / 1024; g.fillStyle = `rgba(${rnd(30, 60) | 0},${rnd(18, 30) | 0},${rnd(10, 18) | 0},${rnd(.55, .9)})`; g.beginPath(); g.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, r * rnd(1, 2.2), r, a + 1.57, 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,244,222,${rnd(.04, .16)})`; g.fillRect(rnd(0, S), rnd(0, S), 2, 2); }
}
const SAUCES = { red: ['#a8261a', '#c23a22', '#7d1b12'], pesto: ['#9a3a1e', '#7f6a26', '#5c2416'], bbq: ['#6a2814', '#8a3a1c', '#4a1a0c'], buffalo: ['#c2501c', '#d8662a', '#93380f'], coulis: ['#bf3d1f', '#d65a2e', '#8e2a14'] };
function drawSauce(g, S, kind) {
  g.clearRect(0, 0, S, S); const c = S / 2, r = S / 2;
  const col = SAUCES[kind] || SAUCES.red;
  g.save(); g.beginPath(); blob(g, c, c, r * .985, 40, .02); g.clip();
  g.fillStyle = col[0]; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) { g.fillStyle = col[i % 3]; g.globalAlpha = rnd(.2, .6); blob(g, rnd(0, S), rnd(0, S), rnd(6, 26) * S / 1024, 7, .3); g.fill(); }
  g.globalAlpha = 1;
  if (kind === 'pesto') for (let i = 0; i < 260; i++) { g.fillStyle = ['#3f5a1a', '#5d7a22'][i % 2]; g.globalAlpha = rnd(.5, .9); blob(g, rnd(0, S), rnd(0, S), rnd(5, 14) * S / 1024, 6, .4); g.fill(); }
  // oregano flecks + oil
  for (let i = 0; i < 700; i++) { g.fillStyle = ['#3d4a1c', '#2b3312', '#5e5a22'][i % 3]; g.globalAlpha = rnd(.5, .9); g.fillRect(rnd(0, S), rnd(0, S), rnd(1.5, 3.5), rnd(1.5, 3.5)); }
  g.globalAlpha = 1; g.restore();
}
const CHEESES = { mozz: ['#f6dc9c', '#f0cd7e', '#f9e6b6'], light: ['#fbf0d4', '#f6e2b0'], multi: ['#f3d27e', '#eabd5e', '#f8e3a8'], cheddar: ['#f0b23e', '#f6d68a', '#e8a032'] };
function drawCheese(g, S, kind) {
  g.clearRect(0, 0, S, S); if (kind === 'none') return;
  const c = S / 2, R0 = S * .49, col = CHEESES[kind] || CHEESES.mozz, n = kind === 'light' ? 70 : 230;
  g.save(); g.beginPath(); g.arc(c, c, R0, 0, 7); g.clip();
  if (kind !== 'light') { g.save(); g.shadowColor = col[0]; g.shadowBlur = 24 * S / 1024; g.fillStyle = col[0]; g.globalAlpha = .96; blob(g, c, c, R0 * .8, 48, .08); g.fill(); g.restore(); g.globalAlpha = 1; }
  g.shadowBlur = 8 * S / 1024;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 7), d = Math.sqrt(rnd()) * R0 * .98, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, r = (kind === 'light' ? rnd(20, 46) : rnd(22, 58)) * S / 1024;
    g.fillStyle = g.shadowColor = col[i % col.length]; blob(g, x, y, r, 11, .28); g.fill();
  }
  g.shadowBlur = 0;
  // melted sheen and wood-fired browning
  for (let i = 0; i < 160; i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * R0 * .95; g.fillStyle = `rgba(226,${rnd(116, 146) | 0},38,${rnd(.22, .5)})`; blob(g, c + Math.cos(a) * d, c + Math.sin(a) * d, rnd(8, 22) * S / 1024, 9, .3); g.fill(); }
  for (let i = 0; i < (kind === 'light' ? 40 : 260); i++) { const a = rnd(0, 7), d = Math.sqrt(rnd()) * R0 * .95; g.fillStyle = `rgba(${rnd(170, 205) | 0},${rnd(110, 140) | 0},${rnd(40, 70) | 0},${rnd(.35, .75)})`; blob(g, c + Math.cos(a) * d, c + Math.sin(a) * d, rnd(5, 17) * S / 1024, 8, .4); g.fill(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,252,240,.55)'; const a = rnd(0, 7), d = Math.sqrt(rnd()) * R0; g.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, rnd(2, 6), rnd(1, 3)); }
  g.restore();
}

/* ---------- topping kit ---------- */
function bend(geo, f) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + f(p.getX(i), p.getZ(i))); geo.computeVertexNormals(); return geo; }
function flatTorus(r, t, arc = Math.PI * 2) { const g = new THREE.TorusGeometry(r, t, 8, 28, arc); g.rotateX(Math.PI / 2); g.scale(1, .7, 1); return g; }
function mushroomShape(s) {
  const sh = new THREE.Shape(); sh.moveTo(-.07 * s, 0); sh.lineTo(-.07 * s, .1 * s); sh.bezierCurveTo(-.2 * s, .1 * s, -.22 * s, .26 * s, 0, .27 * s); sh.bezierCurveTo(.22 * s, .26 * s, .2 * s, .1 * s, .07 * s, .1 * s); sh.lineTo(.07 * s, 0); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: .018, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, -.13 * s, 0); g.rotateX(-Math.PI / 2); return g;
}
function leaf(len, wid, curl = .02) { const g = new THREE.SphereGeometry(1, 14, 8); g.scale(wid, .08, len); return bend(g, (x, z) => -z * z * curl * 30 + Math.abs(x) * .1); }
const TOPS = {
  pep: { geo: () => { const pts = [[0, .0], [.16, .0], [.178, .024], [.172, .04], [.13, .034], [0, .014]].map(([x, y]) => new THREE.Vector2(x, y)); return new THREE.LatheGeometry(pts, 28); }, color: 0x9c2a17, var: .1, rough: .38, coat: .8, size: [.9, 1.08] },
  capocolla: { geo: () => bend(new THREE.CylinderGeometry(.21, .21, .012, 28, 1), (x, z) => Math.sin(x * 14) * .025 + Math.cos(z * 11) * .015), color: 0x8a2626, var: .1, rough: .5, coat: .5, size: [.85, 1.1] },
  prosciutto: { geo: () => { const g = new THREE.PlaneGeometry(.52, .15, 24, 3); g.rotateX(-Math.PI / 2); return bend(g, (x, z) => Math.sin(x * 16) * .035 + .04 + z * .1); }, color: 0xd9827c, var: .08, rough: .55, sheen: 1, side: THREE.DoubleSide, size: [.9, 1.15] },
  ham: { geo: () => new THREE.BoxGeometry(.17, .024, .15, 2, 1, 2), color: 0xe59c95, var: .06, rough: .6, size: [.8, 1.1] },
  bacon: { geo: () => bend(new THREE.BoxGeometry(.2, .026, .065, 8, 1, 1), x => Math.sin(x * 30) * .012), color: 0x8f3420, var: .12, rough: .5, coat: .4, size: [.8, 1.2] },
  sausage: { geo: () => { const g = new THREE.IcosahedronGeometry(.065, 1); g.scale(1, .7, 1); return g; }, color: 0x6e3a22, var: .12, rough: .7, size: [.8, 1.2], lift: .03 },
  beef: { geo: () => { const g = new THREE.IcosahedronGeometry(.04, 0); g.scale(1, .7, 1); return g; }, color: 0x5a3020, var: .15, rough: .8, size: [.7, 1.3], lift: .02 },
  chicken: { geo: () => { const g = new THREE.DodecahedronGeometry(.07, 0); g.scale(1.2, .7, .9); return g; }, color: 0xd9a86c, var: .1, rough: .6, coat: .3, size: [.8, 1.2], lift: .035 },
  chickenHot: { geo: () => { const g = new THREE.DodecahedronGeometry(.07, 0); g.scale(1.2, .7, .9); return g; }, color: 0xd1561e, var: .1, rough: .45, coat: .6, size: [.8, 1.2], lift: .035 },
  freshMozz: { geo: () => { const g = new THREE.SphereGeometry(.18, 28, 12); g.scale(1, .2, 1); return g; }, color: 0xf6e7c6, var: .04, rough: .35, coat: .5, sheen: .6, size: [.8, 1.15] },
  goat: { geo: () => new THREE.IcosahedronGeometry(.045, 1), color: 0xf7f2e6, var: .03, rough: .9, size: [.6, 1.3], lift: .02 },
  feta: { geo: () => new THREE.BoxGeometry(.085, .06, .075), color: 0xf8f5ec, var: .03, rough: .9, size: [.7, 1.3], lift: .02 },
  mascarpone: { geo: () => { const g = new THREE.SphereGeometry(.12, 24, 12); g.scale(1, .38, 1); return g; }, color: 0xfff3d8, var: .02, rough: .3, coat: .4, size: [.8, 1.2] },
  dollop: { geo: () => { const g = new THREE.SphereGeometry(.13, 24, 12); g.scale(1, .26, 1); return g; }, color: 0xb02a18, var: .06, rough: .35, coat: .6, size: [.8, 1.2] },
  gouda: { geo: () => { const g = new THREE.SphereGeometry(.15, 24, 12); g.scale(1, .2, 1); return g; }, color: 0xe2a442, var: .06, rough: .4, coat: .5, size: [.8, 1.2] },
  parm: { geo: () => bend(new THREE.BoxGeometry(.13, .006, .05, 6, 1, 1), x => x * x * 1.6), color: 0xf2e1aa, var: .05, rough: .7, size: [.6, 1.3], lift: .015 },
  tomato: { geo: () => new THREE.CylinderGeometry(.15, .15, .028, 28), color: 0xe2502f, var: .06, rough: .3, coat: .8, size: [.85, 1.1] },
  sundried: { geo: () => { const g = new THREE.SphereGeometry(.08, 14, 8); g.scale(1.3, .25, .8); return bend(g, x => Math.sin(x * 40) * .01); }, color: 0x7a1f14, var: .12, rough: .5, coat: .4, size: [.8, 1.2] },
  basil: { geo: () => leaf(.12, .06, .02), color: 0x2f7a2a, var: .1, rough: .4, coat: .3, sheen: .6, size: [.8, 1.3], lift: .02 },
  arugula: { geo: () => leaf(.1, .035, .03), color: 0x4b8a2c, var: .14, rough: .45, sheen: .6, side: THREE.DoubleSide, size: [.8, 1.3], pile: .07 },
  spinach: { geo: () => leaf(.1, .065, .01), color: 0x285a22, var: .1, rough: .45, sheen: .5, size: [.8, 1.2], lift: .015 },
  mushroom: { geo: () => mushroomShape(1), color: 0xd2bea4, var: .06, rough: .6, size: [.8, 1.15] },
  shiitake: { geo: () => mushroomShape(.85), color: 0x7a5236, var: .1, rough: .5, coat: .3, size: [.8, 1.15] },
  portabella: { geo: () => mushroomShape(1.15), color: 0x4e3a2c, var: .1, rough: .5, coat: .3, size: [.85, 1.1] },
  olive: { geo: () => flatTorus(.055, .026), color: 0x1d1a1a, var: .05, rough: .25, coat: 1, size: [.85, 1.1], lift: .01 },
  onion: { geo: () => flatTorus(.11, .011, Math.PI * 1.3), color: 0x9a4f86, var: .1, rough: .35, coat: .6, size: [.7, 1.2], lift: .01 },
  redPepper: { geo: () => flatTorus(.15, .02, Math.PI * .5), color: 0xc4281c, var: .08, rough: .3, coat: .8, size: [.8, 1.2], lift: .012 },
  greenPepper: { geo: () => flatTorus(.15, .02, Math.PI * .5), color: 0x3a8a2a, var: .08, rough: .3, coat: .8, size: [.8, 1.2], lift: .012 },
  jalapeno: { geo: () => flatTorus(.055, .022), color: 0x4a8a28, var: .08, rough: .3, coat: .8, size: [.8, 1.2], lift: .01 },
  brussels: { geo: () => { const g = new THREE.SphereGeometry(.065, 16, 8); g.scale(1, .45, 1); return g; }, color: 0x9fb256, var: .12, rough: .5, coat: .3, size: [.8, 1.2], lift: .01 },
  walnut: { geo: () => { const g = new THREE.IcosahedronGeometry(.045, 1); g.scale(1.2, .7, 1); return g; }, color: 0x8a5a2e, var: .12, rough: .7, size: [.8, 1.3], lift: .02 },
  pine: { geo: () => { const g = new THREE.SphereGeometry(.02, 10, 6); g.scale(1, .6, 1.8); return g; }, color: 0xead6a2, var: .06, rough: .5, size: [.8, 1.2], lift: .01 },
  garlic: { geo: () => { const g = new THREE.SphereGeometry(.05, 14, 8); g.scale(1, .6, .7); return g; }, color: 0xe9cf96, var: .08, rough: .4, coat: .4, size: [.8, 1.2], lift: .02 },
  pineapple: { geo: () => new THREE.BoxGeometry(.11, .06, .09), color: 0xf0c548, var: .06, rough: .35, coat: .6, size: [.8, 1.2], lift: .02 },
  broccoli: { geo: () => { const g = new THREE.IcosahedronGeometry(.06, 1); g.scale(1, .8, 1); return bend(g, (x, z) => vnoise(x * 60, z * 60) * .01); }, color: 0x3a6b25, var: .12, rough: .8, size: [.8, 1.2], lift: .035 },
  flakes: { geo: () => new THREE.BoxGeometry(.016, .006, .012), color: 0xb5281a, var: .15, rough: .6, size: [.6, 1.4], lift: .005 },
};
const DRIZZLE = { honey: { color: 0xd9951c, op: .82 }, ranch: { color: 0xf3eedf, op: .95 } };

/* ---------- module ---------- */
export async function mountPie(canvas, o = {}) {
  const A = o.assets || 'assets/', MODE = o.mode || 'hero';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = MODE === 'hero' ? 1.1 : 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = MODE === 'hero' ? .55 : .75; }

  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-3.5, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 24 }); key.shadow.radius = 5; key.shadow.bias = -.0004;
  const rim = new THREE.DirectionalLight(MODE === 'hero' ? 0xff9a50 : 0xc8d2ff, MODE === 'hero' ? 2.2 : 1.1); rim.position.set(4, 3, -6);
  const fill = new THREE.DirectionalLight(0xaab8ff, .35); fill.position.set(5, 4, 6);
  const oven = new THREE.PointLight(0xff7a2a, 0, 14, 1.6); oven.position.set(0, 2.2, -2.6);
  scene.add(key, key.target, rim, fill, oven, new THREE.HemisphereLight(0xfff4e6, 0x3a2a20, .5));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const planarUV = geo => { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / SPAN + .5; uv[i * 2 + 1] = .5 - p.getZ(i) / SPAN; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); };

  /* ----- base: wooden peel (hero) or raised aluminium tray (menu) ----- */
  const base = new THREE.Group(); scene.add(base);
  let pieY = 0;
  if (MODE === 'hero') {
    const woodTex = canvasTex(1024, (g, S) => {
      g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 2) { const n = vnoise(y * .02, 1) * 18 + vnoise(y * .11, 4) * 6; g.fillStyle = `rgba(${100 + n | 0},${62 + n * .6 | 0},${32},${.2 + Math.abs(vnoise(y * .05, 7)) * .3})`; g.fillRect(0, y, S, 2); }
      g.fillStyle = 'rgba(30,14,6,.12)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(rnd(S * .15, S * .85), rnd(S * .15, S * .85), rnd(20, 70), 0, 7); g.fill(); }
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,246,230,${rnd(.05, .2)})`; g.fillRect(rnd(0, S), rnd(0, S), 2, 2); }
    }, renderer);
    const wm = new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .75, sheen: .25, sheenColor: 0xffd2a0 });
    const edge = new THREE.MeshPhysicalMaterial({ color: 0x6e4524, roughness: .8 });
    const board = cast(new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.5, .1, 96), [edge, wm, edge])); board.position.y = .05; base.add(board);
    const handle = cast(new THREE.Mesh(new THREE.BoxGeometry(3.4, .09, .52), wm)); handle.position.set(4.1, .045, 0); base.add(handle);
    pieY = .1;
  } else {
    const al = new THREE.MeshPhysicalMaterial({ color: 0xd9dadc, metalness: 1, roughness: .32, clearcoat: .3 });
    const lip = [[0, .0], [2.25, 0], [2.32, .03], [2.36, .1], [2.38, .12], [2.4, .1], [2.34, .02], [2.3, .015], [0, .015]].map(([x, y]) => new THREE.Vector2(x, y));
    const tray = cast(new THREE.Mesh(new THREE.LatheGeometry(lip.reverse(), 128), al)); tray.material.side = THREE.DoubleSide;
    const stand = new THREE.Group();
    const ring = cast(new THREE.Mesh(new THREE.TorusGeometry(1.25, .03, 10, 64), al)); ring.rotation.x = Math.PI / 2; ring.position.y = .9; stand.add(ring);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + .3, leg = cast(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.05, 10), al)); leg.position.set(Math.cos(a) * 1.4, .45, Math.sin(a) * 1.4); leg.rotation.set(Math.sin(a) * .16, 0, -Math.cos(a) * .16); stand.add(leg); }
    base.add(stand); tray.position.y = .92; base.add(tray);
    pieY = .935;
  }

  /* ----- the pie: eight wedges ----- */
  const doughTex = canvasTex(1024, drawDough, renderer);
  const sauceTex = canvasTex(1024, (g, S) => drawSauce(g, S, 'red'), renderer);
  const cheeseTex = canvasTex(1024, (g, S) => drawCheese(g, S, 'mozz'), renderer);
  const doughMat = new THREE.MeshPhysicalMaterial({ map: doughTex, roughness: .62, sheen: .5, sheenColor: 0xffcf96, sheenRoughness: .6, clearcoat: .15, clearcoatRoughness: .6 });
  const crumbMat = new THREE.MeshPhysicalMaterial({ color: 0xf0d9ae, roughness: .9, side: THREE.DoubleSide });
  const sauceMat = new THREE.MeshPhysicalMaterial({ map: sauceTex, transparent: true, roughness: .38, clearcoat: .7, clearcoatRoughness: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const cheeseMat = new THREE.MeshPhysicalMaterial({ map: cheeseTex, transparent: true, alphaTest: .02, bumpMap: cheeseTex, bumpScale: 1.5, roughness: .42, clearcoat: .55, clearcoatRoughness: .35, sheen: .4, sheenColor: 0xfff0c8, polygonOffset: true, polygonOffsetFactor: -2 }); cheeseMat.color.setRGB(1, .9, .76);

  const prof = [[0, 0], [1.6, 0], [1.9, .005], [2, .03], [R + .03, .08], [R + .02, .15], [1.96, .2], [1.88, .21], [1.8, .17], [IN, .1], [IN - .04, TOP], [0, TOP]];
  const profV = prof.map(([x, y]) => new THREE.Vector2(x, y));
  const lumpy = geo => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z); if (r > IN - .05 && y > .02) { const n = vnoise(x * 2.4 + 3, z * 2.4) * .035 + vnoise(x * 7, z * 7) * .012; const k = clamp((r - IN + .05) / .2); p.setY(i, y + n * k * 1.4); p.setX(i, x * (1 + n * .18 * k)); p.setZ(i, z * (1 + n * .18 * k)); } } geo.computeVertexNormals(); };
  const cutShape = new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y)).concat([new THREE.Vector2(0, TOP + .02)]));
  const pie = new THREE.Group(); pie.position.y = pieY; scene.add(pie);
  const wedges = [];
  for (let i = 0; i < WEDGES; i++) {
    const p0 = i * Math.PI * 2 / WEDGES, pl = Math.PI * 2 / WEDGES, pm = p0 + pl / 2;
    const w = new THREE.Group(); w.userData = { p0, pl, pm, dir: new THREE.Vector3(Math.sin(pm), 0, Math.cos(pm)), lift: 0 };
    const lg = new THREE.LatheGeometry(profV, 18, p0, pl); lumpy(lg); planarUV(lg);
    w.add(cast(new THREE.Mesh(lg, doughMat)));
    for (const a of [p0, p0 + pl]) { const cg = new THREE.ShapeGeometry(cutShape); cg.rotateY(a - Math.PI / 2); const cm = new THREE.Mesh(cg, crumbMat); w.add(cm); }
    const sg = new THREE.CircleGeometry(IN - .02, 18, p0 - Math.PI / 2, pl); sg.rotateX(-Math.PI / 2); sg.translate(0, SAUCE_Y, 0); planarUV(sg);
    const s = new THREE.Mesh(sg, sauceMat); s.receiveShadow = true; w.add(s); w.userData.sauce = s;
    const chg = new THREE.CircleGeometry(IN + .01, 18, p0 - Math.PI / 2, pl); chg.rotateX(-Math.PI / 2); chg.translate(0, CHEESE_Y, 0); planarUV(chg);
    const ch = cast(new THREE.Mesh(chg, cheeseMat)); w.add(ch); w.userData.cheese = ch;
    w.userData.tops = new THREE.Group(); w.add(w.userData.tops);
    pie.add(w); wedges.push(w);
  }
  // the cuts: thin dark gaps drawn as lines on the cheese texture would rotate with recipes, so use real gaps
  wedges.forEach(w => w.position.copy(w.userData.dir).multiplyScalar(GAP));

  /* ----- toppings ----- */
  const geoCache = {}, matCache = {};
  const getGeo = t => geoCache[t] || (geoCache[t] = TOPS[t].geo());
  const getMat = t => { if (matCache[t]) return matCache[t]; const d = TOPS[t]; return (matCache[t] = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: d.rough ?? .5, clearcoat: d.coat || 0, clearcoatRoughness: .3, sheen: d.sheen || 0, sheenColor: new THREE.Color(d.color).lerp(new THREE.Color(0xffffff), .4), side: d.side || THREE.FrontSide })); };
  let instances = [];   // {mesh, i, x, z, y, rot, s, delay}
  let drizzles = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function wedgeOf(x, z) { let a = Math.atan2(x, z); if (a < 0) a += Math.PI * 2; return Math.min(WEDGES - 1, Math.floor(a / (Math.PI * 2 / WEDGES))); }
  function layout(recipe) {
    seed = 1000 + Object.keys(RECIPES).indexOf(recipe.name) * 97;
    const out = [];
    const placed = [];
    for (const [type, count, half] of recipe.top) {
      if (DRIZZLE[type]) { out.push({ type, drizzle: true }); continue; }
      const d = TOPS[type], sz = getGeo(type).boundingSphere || (getGeo(type).computeBoundingSphere(), getGeo(type).boundingSphere), minD = sz.radius * (d.pile ? .4 : 1.2);
      let made = 0, tries = 0;
      while (made < count && tries++ < count * 60) {
        const a = rnd(0, Math.PI * 2), r = Math.sqrt(rnd(.004, 1)) * (IN - .16 - sz.radius * .5);
        if (half === 'a' && Math.sin(a) < .06) continue; if (half === 'b' && Math.sin(a) > -.06) continue;
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (!d.pile && placed.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + minD) ** 2 * .5)) continue;
        placed.push({ x, z, r: minD }); made++;
        out.push({ type, x, z, rot: rnd(0, Math.PI * 2), s: rnd(d.size[0], d.size[1]), y: TOP_Y + (d.lift || 0) + (d.pile ? rnd(0, d.pile) : rnd(0, .006)), tilt: d.pile ? rnd(-.5, .5) : rnd(-.08, .08), c: rnd(-d.var, d.var) });
      }
    }
    return out;
  }
  function clearTops() {
    wedges.forEach(w => { const g = w.userData.tops; while (g.children.length) { const m = g.children.pop(); if (m.isInstancedMesh) m.dispose(); else if (m.geometry) m.geometry.dispose(); } });
    drizzles.forEach(m => { pie.remove(m); m.geometry.dispose(); m.material.dispose(); });
    instances = []; drizzles = [];
  }
  function buildTops(list) {
    clearTops();
    const byKey = {};
    list.forEach((t, idx) => {
      if (t.drizzle) { drizzles.push(makeDrizzle(t.type)); return; }
      const w = wedgeOf(t.x, t.z), k = t.type + '|' + w; (byKey[k] = byKey[k] || { type: t.type, w, items: [] }).items.push({ ...t, order: idx });
    });
    Object.values(byKey).forEach(b => {
      const mesh = new THREE.InstancedMesh(getGeo(b.type), getMat(b.type), b.items.length); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      const base = new THREE.Color(TOPS[b.type].color);
      b.items.forEach((t, i) => { const c = base.clone().offsetHSL(0, 0, t.c); mesh.setColorAt(i, c); instances.push({ mesh, i, t, w: wedges[b.w] }); });
      wedges[b.w].userData.tops.add(mesh);
    });
    // stagger by distance from a random sweep so they rain in like a hand topping the pie
    const sweep = rnd(0, Math.PI * 2);
    instances.forEach(ins => { const a = Math.atan2(ins.t.x, ins.t.z); ins.delay = (((a - sweep) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * .55 + rnd(0, .25); });
    // wedge-local coordinates (wedges are offset by their gap)
    instances.forEach(ins => { ins.lx = ins.t.x - ins.w.position.x; ins.lz = ins.t.z - ins.w.position.z; });
    setTops(0);
  }
  function makeDrizzle(type) {
    const pts = []; const turns = 3.2, n = 120, ph = rnd(0, 6);
    for (let i = 0; i <= n; i++) { const t = i / n, z = lerp(-IN + .3, IN - .3, t), w = Math.sqrt(Math.max(0, (IN - .2) ** 2 - z * z)), x = Math.sin(t * Math.PI * 7.5 + ph + Math.sin(t * 9) * .6) * w * (.75 + .2 * Math.sin(t * 13)); const p = new THREE.Vector3(x, TOP_Y + .03, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), ph); pts.push(p); }
    const curve = new THREE.CatmullRomCurve3(pts), d = DRIZZLE[type];
    const geo = new THREE.TubeGeometry(curve, 500, .012, 6, false);
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: d.color, roughness: .15, clearcoat: 1, transparent: true, opacity: d.op, transmission: type === 'honey' ? .3 : 0, thickness: .05 }));
    m.castShadow = true; geo.setDrawRange(0, 0); m.userData.total = geo.index.count;
    pie.add(m); return m;
  }
  // k: 0 → nothing on, 1 → everything settled. out: popping off instead of dropping in.
  function setTops(k, out = false) {
    for (const ins of instances) {
      const t = ins.t, d = clamp((k - ins.delay) / .3);
      let y = t.y, s = t.s, vis = 1;
      if (!out) { const fall = d < .72 ? 1 - Math.pow(d / .72, 2) : 0; y += fall * 2.2; if (d >= .72) { const b = (d - .72) / .28; s *= 1 + Math.sin(b * Math.PI) * .12 * (1 - b); } vis = d > 0 ? 1 : 0; }
      else { y += Math.sin(d * Math.PI) * .5 + d * .4; s *= 1 - easeOut(d); vis = d < 1 ? 1 : 0; }
      _e.set(t.tilt, t.rot, t.tilt * .6); _q.setFromEuler(_e); _v.set(ins.lx, y, ins.lz); _s.setScalar(Math.max(1e-4, s * vis));
      ins.mesh.setMatrixAt(ins.i, _m.compose(_v, _q, _s));
    }
    instances.forEach(ins => ins.mesh.instanceMatrix.needsUpdate = true);
    const dk = out ? 1 - clamp(k * 1.6) : clamp((k - .55) / .45);
    drizzles.forEach(m => m.geometry.setDrawRange(0, Math.floor(m.userData.total * easeInOut(dk) / 3) * 3));
  }
  function setBase(sauce, cheese) {
    const st = sauceTex.userData, ct = cheeseTex.userData;
    drawSauce(st.g, st.canvas.width, sauce === 'none' ? 'red' : sauce); sauceTex.needsUpdate = true;
    drawCheese(ct.g, ct.canvas.width, cheese); cheeseTex.needsUpdate = true;
    wedges.forEach(w => { w.userData.sauce.visible = sauce !== 'none'; });
  }
  function setSauce(k) { const s = Math.max(1e-3, easeOut(k)); wedges.forEach(w => { w.userData.sauce.scale.set(s, 1, s); w.userData.sauce.rotation.y = (1 - k) * .6; }); sauceMat.opacity = clamp(k * 3); }
  function setCheese(k) { const s = lerp(.55, 1, easeOut(k)); wedges.forEach(w => { w.userData.cheese.scale.set(s, 1, s); w.userData.cheese.visible = k > 0; }); cheeseMat.opacity = clamp(k * 1.5); cheeseMat.alphaTest = k < 1 ? 0 : .02; }

  /* ----- cheese pull ----- */
  const strandMat = new THREE.MeshPhysicalMaterial({ color: 0xfbeac0, roughness: .35, clearcoat: .6, sheen: .5, sheenColor: 0xffffff });
  const strandGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); strandGeo.translate(0, .5, 0); strandGeo.rotateX(Math.PI / 2);
  const strands = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(strandGeo, strandMat); m.visible = false; m.castShadow = true; pie.add(m); return m; });
  let pulled = null;
  function pull(w, k) {
    // lift by the crust: out along the bisector, up, crust tipped up so the point droops
    const u = w.userData, e = easeInOut(k);
    w.position.copy(u.dir).multiplyScalar(GAP + e * .5); w.position.y = e * .5;
    const axis = new THREE.Vector3().crossVectors(u.dir, new THREE.Vector3(0, 1, 0)).normalize();
    w.quaternion.setFromAxisAngle(axis, -e * .22);
    w.updateMatrix();
    const ends = [];
    for (const [a, r] of [[u.p0 + .02, .35], [u.p0 + .02, .7], [u.p0 + .02, 1.05], [u.p0 + .02, 1.38], [u.p0 + u.pl - .02, .35], [u.p0 + u.pl - .02, .7], [u.p0 + u.pl - .02, 1.05]]) ends.push(new THREE.Vector3(Math.sin(a) * r, CHEESE_Y + .01, Math.cos(a) * r));
    let si = 0;
    const show = k > .04 && k < .985;
    for (const p of ends) {
      const A = p.clone().applyMatrix4(w.matrix), B = p.clone().add(u.dir.clone().multiplyScalar(-.03));
      const len = A.distanceTo(B), M = A.clone().lerp(B, .5); M.y -= len * .22;
      const rad = .034 / (1 + len * 1.6);
      for (const [P, Q] of [[A, M], [M, B]]) {
        const s = strands[si++]; if (!s) break;
        s.visible = show && len > .05; if (!s.visible) continue;
        s.position.copy(P); s.lookAt(Q); s.scale.set(rad, rad, Math.max(.001, P.distanceTo(Q)));
      }
    }
    if (!show) strands.forEach(s => s.visible = false);
  }

  /* ----- sequences ----- */
  const seq = sequencer();
  let current = null, cheeseWarm = 0;
  function recipeOf(name) {
    const r = { name, ...(RECIPES[name] || RECIPES.Pepperoni) };
    if (r.random) { seed = (Date.now() % 9973) + 1; const pick = BYO.slice().sort(() => rnd() - .5).slice(0, 3); r.top = pick.map(t => [t, t === 'pep' ? 16 : 12]); }
    return r;
  }
  const dropPie = { d: .7, run: k => { pie.visible = true; const fall = k < .7 ? 1 - Math.pow(k / .7, 2) : 0; pie.position.y = pieY + fall * 3; const sq = k > .66 && k < .86 ? 1 - Math.sin((k - .66) / .2 * Math.PI) * .12 : 1; pie.scale.set(1 + (1 - sq) * .4, sq, 1 + (1 - sq) * .4); } };
  function bakeStep(d = 1.1) { return { d, run: k => { oven.intensity = Math.sin(k * Math.PI) * (MODE === 'hero' ? 26 : 10); cheeseWarm = k; cheeseMat.color.setRGB(1, lerp(.97, .9, k), lerp(.92, .76, k)); } }; }
  function build(name, first) {
    const r = recipeOf(name); current = r;
    if (!first) { pie.visible = true; pie.position.y = pieY; pie.scale.set(1, 1, 1); oven.intensity = 0; }
    const steps = [];
    if (!first && instances.length) steps.push({ d: .45, run: k => setTops(k * 1.2, true) });
    if (!first) steps.push({ d: .35, run: k => { setCheese(1 - k); setSauce(1 - k * .999); } });
    steps.push({ d: 0, run: () => { setBase(r.sauce, r.cheese); buildTops(layout(r)); cheeseMat.color.setRGB(1, .97, .92); } });
    if (first) steps.push({ d: .25 }, dropPie, { d: .15 });
    steps.push({ d: first ? .8 : .5, run: setSauce }, { d: first ? .7 : .45, run: setCheese }, { d: first ? 1.6 : 1.05, run: k => setTops(k) });
    steps.push(bakeStep(first ? 1.2 : .7));
    seq.play(steps);
    kick();
  }

  /* ----- camera / loop ----- */
  let aspect = 1, drift = { x: 0, y: 0, gx: 0, gy: 0 }, spin = 0, clock = 0, pullT = -1, nextPull = 3.2;
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick(); }
  function place() {
    let dist, el, tgt;
    if (MODE === 'hero') { el = .6 + drift.y * .04; dist = aspect > 2.2 ? 7.4 : aspect > 1.4 ? 8.6 : 10.5 / Math.max(.7, aspect) * 1.0; tgt = new THREE.Vector3(.35, aspect > 2.2 ? -.5 : .15, .1); }
    else { el = .82 + drift.y * .04; dist = aspect > 1.2 ? 8.6 : 10.6 / Math.max(.6, aspect); tgt = new THREE.Vector3(0, aspect > 1.2 ? .55 : .75, 0); }
    const az = (MODE === 'hero' ? .12 : 0) + drift.x * .1;
    camera.position.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist); camera.lookAt(tgt);
  }
  let visible = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    seq.tick(dt);
    const idle = !seq.busy;
    if (!RM && !(pulled && pullT >= 0)) spin += dt * (MODE === 'hero' ? .05 : .08);
    pie.rotation.y = spin; if (MODE === 'menu') base.rotation.y = spin;
    // the hero slice pull, now and then
    if (MODE === 'hero' && idle && !RM) {
      if (pullT < 0 && clock > nextPull) {
        // the wedge facing the camera
        const camA = Math.atan2(camera.position.x - .9, camera.position.z); let best = 0, bd = 9;
        wedges.forEach((w, i) => { let a = w.userData.pm + spin - camA - .95; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < bd) { bd = Math.abs(a); best = i; } });
        pulled = wedges[best]; pullT = 0;
      }
      if (pullT >= 0) {
        pullT += dt; const T = 4.4, k = pullT < 1.5 ? pullT / 1.5 : pullT < 2.9 ? 1 : 1 - (pullT - 2.9) / 1.5;
        pull(pulled, clamp(k));
        if (pullT > T) { pull(pulled, 0); pulled.position.copy(pulled.userData.dir).multiplyScalar(GAP); pulled.position.y = 0; pulled.quaternion.identity(); pullT = -1; pulled = null; nextPull = clock + 6.5; }
      }
    }
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    place(); renderer.render(scene, camera);
    const moving = !RM || seq.busy || Math.abs(drift.gx - drift.x) > .002 || Math.abs(drift.gy - drift.y) > .002;
    if (visible && !document.hidden && moving) raf = requestAnimationFrame(frame);
  }

  // start
  pie.visible = false;
  size();
  const first = o.recipe || (MODE === 'hero' ? 'Pepperoni' : 'Margherita');
  if (RM) { const r = recipeOf(first); current = r; setBase(r.sauce, r.cheese); buildTops(layout(r)); setSauce(1); setCheese(1); setTops(2); pie.visible = true; }
  else build(first, true);
  await renderer.compileAsync?.(scene, camera);
  kick();
  return {
    show(name) { if (current && current.name === name && !RECIPES[name]?.random) return; if (RM) { const r = recipeOf(name); current = r; setBase(r.sauce, r.cheese); buildTops(layout(r)); setSauce(1); setCheese(1); setTops(2); kick(); return; } build(name, false); },
    get busy() { return seq.busy; },
    has: name => !!RECIPES[name],
  };
}
