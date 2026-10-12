/* =====================================================================
   Get Tinted: "Into the hex bay."
   One continuous 3D world: their shop at night under a hexagon LED
   ceiling, glossy reflective floor, red trim, the GET TINTED sign and a
   price board on the back wall. The visitor's vehicle (coupe / sedan /
   truck-SUV, or a storefront glass wall for homes & businesses) rolls in,
   and scroll drives the camera while film is laid on each pane top to
   bottom: carbon, then ceramic, then clear film on the windshield (rocks
   bounce off). It ends facing the price board, redrawn for their pick.
   Paint and glass reflect the bay itself (PMREM from the scene).
   Bundle: kit/build3d/build.sh gettinted313/src/bay.js gettinted313/assets/bay.js
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const FD = '"Saira", "Arial Narrow", sans-serif', FT = '"Manrope", system-ui, sans-serif';

// ---------- vehicle presets (profile in metres-ish, front at +x) ----------
const TYPES = {
  coupe: { L: 2.2, W: 1.56, BOT: .3, WR: .42, WX: 1.38, hoodY: .84, noseY: .6, cowlX: .9, roofFX: .05, roofRX: -.75, roofY: 1.3, deckX: -1.75, deckY: .98, cuts: [-.86], wsCtl: [.6, 1.06, .3, 1.28], rgCtl: [-1.2, 1.24, -1.55, 1.06] },
  sedan: { L: 2.3, W: 1.62, BOT: .34, WR: .44, WX: 1.45, hoodY: .9, noseY: .66, cowlX: .98, roofFX: .25, roofRX: -1.05, roofY: 1.42, deckX: -1.78, deckY: 1.0, cuts: [-.34, -1.24], wsCtl: [.7, 1.12, .45, 1.34], rgCtl: [-1.35, 1.32, -1.6, 1.12] },
  suv: { L: 2.42, W: 1.78, BOT: .44, WR: .5, WX: 1.52, hoodY: 1.18, noseY: .9, cowlX: 1.1, roofFX: .5, roofRX: -2.2, roofY: 1.92, deckX: -2.36, deckY: 1.22, cuts: [-.28, -1.36], wsCtl: [.92, 1.42, .66, 1.82], rgCtl: [-2.3, 1.84, -2.35, 1.5] },
};

function profile(t) {
  const { L, BOT, WR, WX, hoodY, noseY, cowlX, roofFX, roofRX, roofY, deckX, deckY, wsCtl, rgCtl } = t;
  const s = new THREE.Shape();
  s.moveTo(-L + .02, BOT);
  s.lineTo(-WX - WR - .06, BOT); s.absarc(-WX, BOT - .02, WR + .06, Math.PI, 0, true); s.lineTo(WX - WR - .06, BOT);
  s.absarc(WX, BOT - .02, WR + .06, Math.PI, 0, true); s.lineTo(L - .02, BOT);
  s.bezierCurveTo(L + .1, BOT + .04, L + .12, noseY - .1, L + .08, noseY);
  s.bezierCurveTo(L + .04, hoodY - .08, L - .12, hoodY - .02, L - .4, hoodY);
  s.lineTo(cowlX, hoodY + .07);
  s.bezierCurveTo(wsCtl[0], wsCtl[1], wsCtl[2], wsCtl[3], roofFX, roofY);
  s.bezierCurveTo(roofFX - .4, roofY + .04, roofRX + .4, roofY + .04, roofRX, roofY);
  s.bezierCurveTo(rgCtl[0], rgCtl[1], rgCtl[2], rgCtl[3], deckX, deckY);
  s.lineTo(-L + .1, deckY - .04);
  s.bezierCurveTo(-L - .04, deckY - .1, -L - .06, BOT + .3, -L - .02, BOT + .18);
  s.bezierCurveTo(-L, BOT + .06, -L + .01, BOT, -L + .02, BOT);
  return s;
}
// clip a polygon to x in [x0, x1]
function clipX(poly, x0, x1) {
  const clip = (pts, keep, edgeX) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = keep(a.x), ib = keep(b.x);
      if (ia) out.push(a);
      if (ia !== ib) { const t = (edgeX - a.x) / (b.x - a.x); out.push(new THREE.Vector2(edgeX, a.y + (b.y - a.y) * t)); }
    }
    return out;
  };
  return clip(clip(poly, x => x >= x0, x0), x => x <= x1, x1);
}
function sampleBezier(p0, c1, c2, p3, n) { const c = new THREE.CubicBezierCurve(p0, c1, c2, p3); return c.getPoints(n); }

// ---------- film shader for a pane ----------
// fy: 0 bottom → 1 top of the pane. Film 1 (carbon) then film 2 (ceramic) lay from the top down.
function paneMaterial(env) {
  const U = { uE1: { value: 1.2 }, uE2: { value: 1.2 }, uE3: { value: 1.2 }, uClear: { value: new THREE.Color(.26, .31, .37) }, uC1: { value: new THREE.Color(.018, .019, .022) }, uC2: { value: new THREE.Color(.006, .008, .014) } };
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 1, roughness: .06, metalness: 0, clearcoat: .6, clearcoatRoughness: .04, envMapIntensity: .55, side: THREE.DoubleSide, depthWrite: false });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float fy; varying float vFy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFy = fy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vFy; uniform float uE1, uE2, uE3; uniform vec3 uClear, uC1, uC2;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float f1 = smoothstep(uE1 - .015, uE1 + .015, vFy), f2 = smoothstep(uE2 - .015, uE2 + .015, vFy), f3 = smoothstep(uE3 - .015, uE3 + .015, vFy);
      vec3 col = mix(uClear, uC1, f1); col = mix(col, uC2, f2);
      diffuseColor.rgb = col;
      diffuseColor.a = mix(.42, .97, max(f1, f2)) + f3 * .06;
      float edge = max(max(1. - smoothstep(0., .02, abs(vFy - uE1)) , 1. - smoothstep(0., .02, abs(vFy - uE2))), 1. - smoothstep(0., .02, abs(vFy - uE3)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(.9, .95, 1.) * edge * 1.4 + vec3(.25, .3, .38) * f3 * .25 * (1. - f1);`);
  };
  m.userData.U = U;
  return m;
}
function paneGeo(points2D, z, flip) {
  // flat polygon at side z, with fy attribute normalised to its own height
  const shape = new THREE.Shape(points2D);
  const g = new THREE.ShapeGeometry(shape, 1);
  const pos = g.attributes.position; let y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < pos.count; i++) { y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); }
  const fy = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) fy[i] = (pos.getY(i) - y0) / (y1 - y0 || 1);
  g.setAttribute('fy', new THREE.BufferAttribute(fy, 1));
  g.translate(0, 0, z); if (flip) g.scale(1, 1, 1);
  return g;
}
function quadGeo(a, b, halfW, out) {
  // slanted glass from a (lower) to b (upper) across the width; fy from a→b
  let n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize(); if (n.y < 0) n.negate(); n.multiplyScalar(Math.abs(out));
  const A = new THREE.Vector3(a.x + n.x, a.y + n.y, 0), B = new THREE.Vector3(b.x + n.x, b.y + n.y, 0);
  const g = new THREE.BufferGeometry();
  const v = [A.x, A.y, -halfW, A.x, A.y, halfW, B.x, B.y, halfW, B.x, B.y, -halfW];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('fy', new THREE.Float32BufferAttribute([0, 0, 1, 1], 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
}

export async function mountBay(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const SMALL = matchMedia('(max-width: 820px)').matches || /low/.test(location.search);
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x07080a);
  scene.background = BG; scene.fog = new THREE.Fog(0x07080a, 22, 42);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);

  try { await Promise.race([Promise.all(['800 60px Saira', 'italic 800 60px Saira', '600 30px Manrope', '800 30px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}

  // ---------- the bay ----------
  const bay = new THREE.Group(); scene.add(bay);
  const RW = 9, RD = 8, RH = 4.4; // half width x, half depth z, height
  // hex LED ceiling
  const hexR = .95, edges = [], seen = new Set();
  const hw = Math.sqrt(3) * hexR;
  for (let row = -8; row <= 8; row++) for (let col = -9; col <= 9; col++) {
    const cx = col * hw + (row & 1 ? hw / 2 : 0), cz = row * hexR * 1.5;
    if (Math.abs(cx) > RW - 1.2 || Math.abs(cz) > RD - 1.2) continue;
    for (let k = 0; k < 6; k++) {
      const a0 = Math.PI / 6 + k * Math.PI / 3, a1 = a0 + Math.PI / 3;
      const p0 = [cx + Math.cos(a0) * hexR, cz + Math.sin(a0) * hexR], p1 = [cx + Math.cos(a1) * hexR, cz + Math.sin(a1) * hexR];
      const key = [p0, p1].map(p => p.map(v => v.toFixed(2)).join(',')).sort().join('|');
      if (seen.has(key)) continue; seen.add(key); edges.push([p0, p1]);
    }
  }
  const tube = new THREE.BoxGeometry(1, .045, .06);
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.62, 1.75), toneMapped: false });
  const hexes = new THREE.InstancedMesh(tube, tubeMat, edges.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), P = new THREE.Vector3();
  edges.forEach(([a, b], i) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) * .9;
    P.set((a[0] + b[0]) / 2, RH, (a[1] + b[1]) / 2); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(dz, dx)); Sc.set(len, 1, 1);
    hexes.setMatrixAt(i, M.compose(P, Q, Sc));
  });
  bay.add(hexes);
  // ceiling slab + perimeter LED frame
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RD * 2), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: .9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = RH + .05; bay.add(ceil);
  // walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: .8 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RH + .1), wallMat); back.position.set(0, RH / 2, -RD); back.receiveShadow = true; bay.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(RD * 2, RH + .1), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-RW, RH / 2, 0); bay.add(left);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = RW; bay.add(right);
  // red trim: a glowing band low on the walls (their shop is black + red)
  const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .08, .1), toneMapped: false });
  const bandB = new THREE.Mesh(new THREE.BoxGeometry(RW * 2, .08, .02), redMat); bandB.position.set(0, 1.05, -RD + .02); bay.add(bandB);
  [-1, 1].forEach(sx => { const b = new THREE.Mesh(new THREE.BoxGeometry(.02, .08, RD * 2), redMat); b.position.set(sx * (RW - .02), 1.05, 0); bay.add(b); });
  // floor: real mirror reflections under a dark glossy coat (desktop), plain gloss on phones
  if (!SMALL) {
    const mirror = new Reflector(new THREE.PlaneGeometry(RW * 2, RD * 2), { textureWidth: 1024, textureHeight: 1024, color: 0x6b6f78 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = -.002; bay.add(mirror);
  }
  const floorMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, roughness: .42, metalness: .1, clearcoat: .8, clearcoatRoughness: .25, transparent: !SMALL, opacity: SMALL ? 1 : .8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RD * 2), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; bay.add(floor);
  // red + black checker borders on the floor edges (like their tiles)
  const tileTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#b3141b'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#0d0e11'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 1); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  [-1, 1].forEach(sx => { const strip = new THREE.Mesh(new THREE.PlaneGeometry(RD * 2, .8), new THREE.MeshStandardMaterial({ map: tileTex, roughness: .5 })); strip.rotation.x = -Math.PI / 2; strip.rotation.z = Math.PI / 2; strip.position.set(sx * (RW - .4), .004, 0); bay.add(strip); });
  // GET TINTED sign (their logo) + price board
  const logoTex = await new Promise(r => new THREE.TextureLoader().load(A + 'logo.png', t => { t.colorSpace = THREE.SRGBColorSpace; r(t); }, undefined, () => r(null)));
  if (logoTex) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6 * 514 / 1920), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false, color: new THREE.Color(1.35, 1.35, 1.35) }));
    sign.position.set(-2.4, 2.9, -RD + .03); bay.add(sign);
  }
  const boardC = document.createElement('canvas'); boardC.width = 1024; boardC.height = 768;
  const boardTex = new THREE.CanvasTexture(boardC); boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 8;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.3), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, color: new THREE.Color(1.08, 1.08, 1.08) }));
  board.position.set(3.7, 2.2, -RD + .05); bay.add(board);
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.54, 3.44, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, .06, .08), toneMapped: false })); boardFrame.position.set(3.7, 2.2, -RD + .012); bay.add(boardFrame);
  function drawBoard(info) {
    const g = boardC.getContext('2d'), W = boardC.width, H = boardC.height;
    g.fillStyle = '#0d0e11'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e3262f'; g.fillRect(0, 0, W, 92);
    g.fillStyle = '#fff'; g.font = `italic 800 52px ${FD}`; g.textBaseline = 'middle'; g.fillText('PRICE BOARD', 40, 48);
    g.font = `700 26px ${FT}`; g.textAlign = 'right'; g.fillText(info.title, W - 40, 50); g.textAlign = 'left';
    if (info.rows) {
      g.font = `800 26px ${FD}`; g.fillStyle = '#8b9099';
      g.fillText('VEHICLE', 40, 140); g.textAlign = 'right'; g.fillText('CARBON', 760, 140); g.fillText('CERAMIC', W - 40, 140); g.textAlign = 'left';
      info.rows.forEach((r, i) => {
        const y = 200 + i * 78, hot = r.hot;
        if (hot) { g.fillStyle = 'rgba(227,38,47,.22)'; g.fillRect(20, y - 36, W - 40, 70); g.fillStyle = '#e3262f'; g.fillRect(20, y - 36, 8, 70); }
        g.fillStyle = hot ? '#fff' : '#c9ccd2'; g.font = `${hot ? 800 : 600} 36px ${FD}`; g.fillText(r.label, 48, y);
        g.textAlign = 'right'; g.font = `800 40px ${FD}`; g.fillStyle = hot ? '#fff' : '#c9ccd2'; g.fillText(r.carbon, 760, y); g.fillStyle = hot ? '#ff5a62' : '#e7e9ec'; g.fillText(r.ceramic, W - 40, y); g.textAlign = 'left';
        g.fillStyle = '#23262d'; g.fillRect(40, y + 38, W - 80, 2);
      });
    } else {
      g.fillStyle = '#fff'; g.font = `800 64px ${FD}`; g.fillText(info.big, 40, 230);
      g.font = `600 34px ${FT}`; g.fillStyle = '#c9ccd2'; (info.lines || []).forEach((l, i) => g.fillText(l, 40, 320 + i * 54));
    }
    g.fillStyle = '#e3262f'; g.fillRect(0, H - 86, W, 86);
    g.fillStyle = '#fff'; g.font = `800 30px ${FD}`; g.fillText('LIFETIME WARRANTY  ·  (313) 473-9009', 40, H - 42);
    g.textAlign = 'right'; g.font = `700 24px ${FT}`; g.fillText('M–F 10–6 · SAT 10–5', W - 40, H - 42); g.textAlign = 'left';
    boardTex.needsUpdate = true;
  }

  // lighting
  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x0a0a0c, .55));
  const top = new THREE.DirectionalLight(0xeef6ff, 1.6); top.position.set(1.5, 9, 3); top.castShadow = true;
  top.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); Object.assign(top.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 }); top.shadow.radius = 8; top.shadow.bias = -.0005;
  scene.add(top, top.target);
  const redRim = new THREE.PointLight(0xff2a30, 18, 14, 1.6); redRim.position.set(-5, 1.6, -5); scene.add(redRim);
  const coolRim = new THREE.PointLight(0x9fc4ff, 12, 14, 1.6); coolRim.position.set(6, 2.4, 4); scene.add(coolRim);

  // environment = the bay itself, so paint and glass reflect the hex ceiling
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(scene, .02).texture; scene.environmentIntensity = 1.0;

  // ---------- vehicle / glass wall ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x0a0b0d, metalness: .35, roughness: .22, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.25 });
  const trim = new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: .6, roughness: .35 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: .85 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2e33, metalness: .95, roughness: .25, clearcoat: .6 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x4c5058, roughness: .9 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.55, 1.65), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, .06, .07), toneMapped: false });
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  let subject = null; // { group, panes: {sides:[], ws, rg}, wheels:[], kind }
  function disposeSubject() { if (!subject) return; scene.remove(subject.group); subject.group.traverse(m => { if (m.geometry) m.geometry.dispose(); }); subject = null; }

  function buildCar(kind) {
    const t = TYPES[kind]; const g = new THREE.Group();
    const s = profile(t);
    const bev = .1, bt = .12;
    const geo = new THREE.ExtrudeGeometry(s, { depth: t.W, bevelEnabled: true, bevelThickness: bt, bevelSize: bev, bevelSegments: 8, curveSegments: 36 });
    geo.translate(0, 0, -t.W / 2);
    const body = cast(new THREE.Mesh(geo, paint)); g.add(body);
    // cabin (so untinted glass shows a lighter interior)
    const cy0 = t.hoodY - .05, cy1 = t.roofY - .14, cx0 = t.roofRX + .05, cx1 = t.roofFX - .05;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(cx1 - cx0, cy1 - cy0, t.W * .92), cabinMat);
    cab.position.set((cx0 + cx1) / 2, (cy0 + cy1) / 2, 0); g.add(cab);
    // greenhouse polygon on the side, inset from the outline
    const belt = Math.max(t.hoodY, t.deckY) + .1;
    const ws = sampleBezier(new THREE.Vector2(t.cowlX, t.hoodY + .07), new THREE.Vector2(t.wsCtl[0], t.wsCtl[1]), new THREE.Vector2(t.wsCtl[2], t.wsCtl[3]), new THREE.Vector2(t.roofFX, t.roofY), 12);
    const rg = sampleBezier(new THREE.Vector2(t.roofRX, t.roofY), new THREE.Vector2(t.rgCtl[0], t.rgCtl[1]), new THREE.Vector2(t.rgCtl[2], t.rgCtl[3]), new THREE.Vector2(t.deckX, t.deckY), 12);
    const inset = (pts, dx, dy) => pts.map(p => new THREE.Vector2(p.x + dx, p.y + dy));
    let gh = [
      ...inset(ws.filter(p => p.y >= belt - .02), -.12, -.07),
      new THREE.Vector2(t.roofFX - .12, t.roofY - .08),
      new THREE.Vector2(t.roofRX + .12, t.roofY - .08),
      ...inset(rg.filter(p => p.y >= belt - .02), .14, -.07),
    ];
    const backX = gh[gh.length - 1].x, frontX = gh[0].x;
    gh.push(new THREE.Vector2(backX, belt), new THREE.Vector2(frontX, belt));
    // split into panes at the pillars
    const xs = [frontX + .01, ...t.cuts.flatMap(c => [c + .05, c - .05]), backX - .01];
    const sides = [];
    for (let i = 0; i < xs.length; i += 2) {
      const poly = clipX(gh, Math.min(xs[i + 1], xs[i]), Math.max(xs[i + 1], xs[i]));
      if (poly.length < 3) continue;
      [1, -1].forEach(sz => {
        const mat = paneMaterial(); const m = new THREE.Mesh(paneGeo(poly, sz * (t.W / 2 + bt + .006)), mat);
        m.renderOrder = 3; g.add(m); sides.push({ m, idx: i / 2, side: sz });
      });
    }
    // windshield + rear glass, sitting just proud of the bevelled body
    const half = t.W / 2 - .03;
    const wsM = new THREE.Mesh(quadGeo(ws[1], ws[ws.length - 2], half, bev + .008), paneMaterial()); wsM.renderOrder = 3; g.add(wsM);
    [wsM].forEach(m => { m.material.envMapIntensity = .22; m.material.clearcoat = .3; });
    const rgM = new THREE.Mesh(quadGeo(rg[rg.length - 2], rg[1], half, bev + .008), paneMaterial()); rgM.renderOrder = 3; g.add(rgM);
    rgM.material.envMapIntensity = .22; rgM.material.clearcoat = .3;
    // wheels
    const wheels = [];
    const wheel = () => { const w = new THREE.Group(); const tire = cast(new THREE.Mesh(new THREE.CylinderGeometry(t.WR, t.WR, .32, 48), rubber)); tire.rotation.x = Math.PI / 2; w.add(tire);
      const face = cast(new THREE.Mesh(new THREE.CylinderGeometry(t.WR * .7, t.WR * .7, .34, 40), rimMat)); face.rotation.x = Math.PI / 2; w.add(face);
      const spokes = new THREE.Group(); for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.07, t.WR * .6, .05), trim); sp.rotation.z = k / 6 * Math.PI * 2; sp.position.set(Math.sin(-sp.rotation.z) * t.WR * .27, Math.cos(sp.rotation.z) * t.WR * .27, .18); spokes.add(sp); }
      w.add(spokes); w.userData.spin = w; return w; };
    [[t.WX, 1], [t.WX, -1], [-t.WX, 1], [-t.WX, -1]].forEach(([x, sd]) => { const w = wheel(); w.position.set(x, t.WR, sd * (t.W / 2 + .08)); if (sd < 0) w.rotation.y = Math.PI; g.add(w); wheels.push(w); });
    // lamps
    [1, -1].forEach(z => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(.08, .07, .5), lampMat); hl.position.set(t.L + .08, t.noseY + .08, z * t.W * .36); g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .55), tailMat); tl.position.set(-t.L - .04, t.deckY - .14, z * t.W * .34); g.add(tl);
    });
    return { group: g, sides, ws: wsM, rg: rgM, wheels, kind, len: t.L, height: t.roofY };
  }
  function buildWall(kind) {
    // storefront / home glass: aluminium frame with 2 x 3 panes, warm interior behind
    const g = new THREE.Group(); const W = 5.4, H = 3.0, cols = 3, rows = 2, f = .1;
    const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2c31, metalness: .9, roughness: .3 });
    const interior = new THREE.Mesh(new THREE.BoxGeometry(W, H, 1.6), new THREE.MeshStandardMaterial({ color: kind === 'home' ? 0x8a6a4a : 0x6f7480, roughness: .9, side: THREE.BackSide }));
    interior.position.set(0, H / 2 + .05, -.85); g.add(interior);
    const lamp = new THREE.PointLight(kind === 'home' ? 0xffc27a : 0xe8f0ff, 6, 5); lamp.position.set(0, 2.4, -.8); g.add(lamp);
    const sides = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const w = (W - f * (cols + 1)) / cols, h = (H - f * (rows + 1)) / rows;
      const x = -W / 2 + f + c * (w + f), y = .05 + f + r * (h + f);
      const poly = [new THREE.Vector2(x, y), new THREE.Vector2(x + w, y), new THREE.Vector2(x + w, y + h), new THREE.Vector2(x, y + h)];
      const m = new THREE.Mesh(paneGeo(poly, .02), paneMaterial()); m.renderOrder = 3; g.add(m); sides.push({ m, idx: c + (rows - 1 - r) * cols, side: 1 });
    }
    for (let c = 0; c <= cols; c++) { const b = cast(new THREE.Mesh(new THREE.BoxGeometry(f, H, .14), frameMat)); b.position.set(-W / 2 + f / 2 + c * ((W - f) / cols), H / 2 + .05, 0); g.add(b); }
    for (let r = 0; r <= rows; r++) { const b = cast(new THREE.Mesh(new THREE.BoxGeometry(W, f, .14), frameMat)); b.position.set(0, .05 + f / 2 + r * ((H - f) / rows), 0); g.add(b); }
    return { group: g, sides, ws: null, rg: null, wheels: [], kind, len: W / 2, height: H };
  }

  // rocks for the windshield-film beat
  const rocks = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.045 + Math.random() * .03, 0), new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: .9 })); m.visible = false; scene.add(m); return m; });

  // ---------- camera path keyed to scroll ----------
  let aspect = 1, p = 0, pGoal = 0, drift = { x: 0, y: 0, gx: 0, gy: 0 };
  const tgt = new THREE.Vector3(), camP = new THREE.Vector3();
  const KEYS = [ // p, azimuth, elevation, distance, target y, target x
    [0, .95, .02, 9.5, 2.3, -1.5],
    [.14, .62, .1, 8.2, 1.2, 0],
    [.3, .2, .1, 7.4, 1.0, 0],
    [.46, -.48, .13, 7.6, 1.05, -.3],
    [.6, -.12, .14, 7.8, 1.0, 0],
    [.72, 1.12, .34, 6.6, 1.1, .8],
    [.84, .3, .16, 8.6, 1.9, 1.4],
    [1, .16, .1, 8.4, 2.3, 2.6],
  ];
  function camAt(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = ease(clamp((p - a[0]) / (b[0] - a[0])));
    return a.map((v, k) => lerp(v, b[k], t));
  }
  function placeCamera() {
    const [, az, el, dist0, ty, tx] = camAt(p);
    const narrow = aspect < 1;
    const dist = dist0 * (narrow ? Math.min(1.9, 1.05 / Math.max(.45, aspect)) : 1) * (subject && subject.kind === 'suv' ? 1.08 : 1) * (subject && subject.wheels.length === 0 ? 1.12 : 1);
    const a = az + drift.x * .05, e = el + drift.y * .03;
    tgt.set(tx, ty, 0);
    camP.set(tgt.x + Math.sin(a) * Math.cos(e) * dist, tgt.y + Math.sin(e) * dist, tgt.z + Math.cos(a) * Math.cos(e) * dist);
    camP.y = Math.min(camP.y, RH - .4);
    camera.position.copy(camP); camera.lookAt(tgt);
  }

  // ---------- post ----------
  let composer = null;
  if (!SMALL) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .38, .45, .95));
    composer.addPass(new OutputPass());
  }
  function size() {
    const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); composer?.setSize(w, h); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); dirty = true; kick();
  }

  // ---------- timeline ----------
  const T = { roll: [0, .14], carbon: [.16, .4], ceramic: [.42, .6], ws: [.62, .76] };
  function applyFilm() {
    if (!subject) return;
    const n = Math.max(...subject.sides.map(s => s.idx)) + 1;
    const film = (span, i, count) => { const [a, b] = span, w = (b - a) / count; const t = clamp((p - (a + i * w * .8)) / (w * 1.4)); return lerp(1.08, -.08, t); };
    subject.sides.forEach(s => { const U = s.m.material.userData.U; U.uE1.value = film(T.carbon, s.idx, n); U.uE2.value = film(T.ceramic, s.idx, n); });
    if (subject.rg) { const U = subject.rg.material.userData.U; U.uE1.value = film(T.carbon, n - .5, n); U.uE2.value = film(T.ceramic, n - .5, n); }
    if (subject.ws) { const U = subject.ws.material.userData.U; U.uE3.value = film(T.ws, 0, 1.4); }
  }
  let rollX = 0;
  function poseSubject(dt) {
    if (!subject) return;
    const tr = ss(T.roll[0], T.roll[1], p);
    const startX = subject.wheels.length ? -13 : 0;
    const x = lerp(startX, 0, ease(tr));
    const dx = x - rollX; rollX = x;
    subject.group.position.x = x;
    subject.group.position.y = subject.wheels.length ? 0 : lerp(-3.4, 0, ease(tr));
    subject.group.position.z = subject.wheels.length ? 0 : -2;
    subject.wheels.forEach(w => { w.rotation.z -= dx / TYPES[subject.kind].WR * (w.position.z > 0 ? 1 : -1); });
  }
  function poseRocks() {
    const on = subject && subject.ws && p > T.ws[0] + .03 && p < T.ws[1] + .02;
    const t0 = (p - T.ws[0]) / (T.ws[1] - T.ws[0]);
    rocks.forEach((r, i) => {
      r.visible = on;
      if (!on) return;
      const tt = (t0 * 3 + i / rocks.length) % 1, t = TYPES[subject.kind];
      const hit = new THREE.Vector3(lerp(t.cowlX, t.roofFX, .4), lerp(t.hoodY, t.roofY, .4), (i / rocks.length - .5) * t.W * .8);
      if (tt < .5) { const k = tt / .5; r.position.set(hit.x + (1 - k) * 4.5, hit.y + (1 - k) * .3, hit.z); }
      else { const k = (tt - .5) / .5; r.position.set(hit.x + k * 1.6, hit.y + k * 1.2 - k * k * 1.8, hit.z + (i % 2 ? 1 : -1) * k * .5); }
      r.rotation.set(tt * 12, tt * 9, 0);
    });
  }

  // ---------- loop ----------
  let visible = true, raf = 0, last = performance.now(), dirty = true, clock = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    const k = 1 - Math.pow(.004, dt); p += (pGoal - p) * k; if (Math.abs(pGoal - p) < .0003) p = pGoal;
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    poseSubject(dt); applyFilm(); poseRocks(); placeCamera();
    if (composer) composer.render(); else renderer.render(scene, camera);
    const rocking = subject && subject.ws && p > T.ws[0] && p < T.ws[1] + .02;
    if (visible && !document.hidden && (p !== pGoal || dirty || Math.abs(drift.gx - drift.x) > .002 || rocking)) { dirty = false; raf = requestAnimationFrame(frame); }
  }

  const api = {
    renderer,
    setProgress(x, instant) { pGoal = clamp(x); if (instant) p = pGoal; kick(); },
    setSubject(kind) {
      disposeSubject();
      subject = kind === 'home' || kind === 'business' ? buildWall(kind) : buildCar(kind);
      scene.add(subject.group); rollX = subject.wheels.length ? -13 : 0; dirty = true; kick();
    },
    setBoard: info => { drawBoard(info); dirty = true; kick(); },
    // screen-space anchors for the HTML labels
    anchor(name) {
      if (!subject) return null; const v = new THREE.Vector3(); const t = TYPES[subject.kind];
      if (name === 'side') { const s = subject.sides.find(s => s.side === 1 && s.idx === 0); if (!s) return null; s.m.geometry.computeBoundingBox(); s.m.geometry.boundingBox.getCenter(v); }
      else if (name === 'ws' && t) v.set(lerp(t.cowlX, t.roofFX, .5), lerp(t.hoodY, t.roofY, .5) + .2, 0);
      else if (name === 'board') { v.copy(board.position); v.y += 1.6; return proj(v, true); }
      else return null;
      subject.group.localToWorld(v); return proj(v);
    },
    get progress() { return p; },
  };
  function proj(v, world) { const r = canvas.getBoundingClientRect(); v.project(camera); return { x: (v.x * .5 + .5) * r.width, y: (-v.y * .5 + .5) * r.height, on: v.z < 1 }; }
  size();
  return api;
}
