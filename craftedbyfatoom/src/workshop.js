/* =====================================================================
   Crafted by Fatoom: the workshop and the lantern.
   mountWorkshop: one piece at a time lies on the linen (a black tee, a
   baby onesie, a wooden hexagon magnet with a raised rim, a round canvas,
   a mug). Pick a line and it gets made in front of you: the needle from
   their logo stitches the calligraphy into fabric from right to left, a
   laser burns it into the wood row by row with smoke and a hot edge, a
   print bar lays ink on the canvas and the mug.
   mountLantern: a pierced brass lantern hangs over the Muharram drop; the
   flame's point light throws its star pattern on the wall, and setGlow()
   turns it up as you go through the designs.
   Kit method: studio HDRI, physical materials, lathe/extrude geometry,
   shadow catcher on a transparent canvas, step sequencer, pointer drift,
   render only while visible, drawn fallback in the page.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh craftedbyfatoom/src/workshop.js craftedbyfatoom/assets/workshop.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...s) { q.push(...s); },
    clear() { q = []; cur = null; },
    get busy() { return !!(cur || q.length); },
    tick(dt) { for (let n = 0; n < 12; n++) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; else return; } },
  };
}

async function baseRenderer(canvas, A, { alpha = true, exposure = 1.05, envI = .8 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = envI; }
  return { renderer, scene };
}

function loopWhileVisible(canvas, step) {
  let visible = true, raf = 0, last = performance.now();
  const loop = now => { raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt); if (visible && !document.hidden) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return kick;
}

function glowTex(inner = 'rgba(255,240,210,1)', mid = 'rgba(255,150,60,.5)') {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); r.addColorStop(0, inner); r.addColorStop(.25, mid); r.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function smokeTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  for (let i = 0; i < 6; i++) { const x = S / 2 + rnd(-14, 14), y = S / 2 + rnd(-14, 14), r = rnd(22, 40); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(200,190,180,.35)'); gr.addColorStop(1, 'rgba(200,190,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- calligraphy art ---------- */
// phrase: { lines: [{ t, accent }], en }
// style: thread | burn | ink | inkLight
function drawArt(phrase, W, H, style, box) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const main = { thread: '#EFE4CC', burn: '#3A1E0E', ink: '#151312', inkLight: '#EFE4CC' }[style];
  const accent = { thread: '#C2362B', burn: '#3A1E0E', ink: '#A3221C', inkLight: '#C2362B' }[style];
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const [bx, by, bw, bh] = box.map((v, i) => v * (i % 2 ? H : W));
  const n = phrase.lines.length, hasEn = !!phrase.en && style !== 'burn';
  // fit: each line as large as fits the box width, all lines share the box height
  const enH = hasEn ? bh * .09 : 0, gap = bh * .02;
  const lineH = (bh - enH - (hasEn ? bh * .06 : 0)) / n;
  let y = by;
  const sizes = phrase.lines.map(l => {
    g.font = `700 100px "Aref Ruqaa"`; const w = g.measureText(l.t).width || 1;
    return Math.min(lineH * 1.05 * (l.scale || 1), 100 * bw / w);
  });
  const metrics = { left: W, right: 0, top: H, bottom: 0 };
  phrase.lines.forEach((l, i) => {
    const s = sizes[i]; g.font = `700 ${s}px "Aref Ruqaa"`;
    const base = y + lineH * .78; y += lineH;
    g.fillStyle = l.accent ? accent : main;
    g.fillText(l.t, bx + bw / 2, base);
    const w = g.measureText(l.t).width; metrics.left = Math.min(metrics.left, bx + bw / 2 - w / 2); metrics.right = Math.max(metrics.right, bx + bw / 2 + w / 2);
  });
  metrics.top = by; metrics.bottom = y;
  if (hasEn) {
    g.direction = 'ltr'; const s = Math.min(enH * .62, bw / (phrase.en.length * .9));
    g.font = `500 ${s}px Jost, sans-serif`; g.fillStyle = main; g.globalAlpha = .85;
    if ('letterSpacing' in g) g.letterSpacing = `${s * .22}px`;
    g.fillText(phrase.en.toUpperCase(), bx + bw / 2, y + bh * .06 + s); g.globalAlpha = 1;
    const ew = g.measureText(phrase.en.toUpperCase()).width; metrics.left = Math.min(metrics.left, bx + bw / 2 - ew / 2); metrics.right = Math.max(metrics.right, bx + bw / 2 + ew / 2);
    metrics.bottom = y + bh * .06 + s * 1.3;
  }
  if (style === 'thread') {
    // satin-stitch look: slanted thread lines and a slight highlight on the letters only
    g.globalCompositeOperation = 'source-atop';
    g.lineWidth = Math.max(1, W / 700);
    for (let x = -H; x < W; x += W / 260) { g.strokeStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * .35, H); g.stroke(); }
    for (let x = -H + W / 520; x < W; x += W / 260) { g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * .35, H); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
  }
  if (style === 'burn') {
    // scorched halo around the burn
    const h = document.createElement('canvas'); h.width = W; h.height = H; const hg = h.getContext('2d');
    hg.filter = `blur(${W / 300}px)`; hg.globalAlpha = .3; hg.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'destination-over'; g.drawImage(h, 0, 0); g.globalCompositeOperation = 'source-over';
  }
  return { canvas: c, box: [Math.max(0, metrics.left - W * .01), metrics.top, Math.min(W, metrics.right + W * .01), metrics.bottom] };
}

/* ---------- surfaces ---------- */
function fabricBase(W, H, shapeFn, color = '#151515') {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, W, H);
  const d = g.getImageData(0, 0, W, H), p = d.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, n = ((x + y) % 3 === 0 ? 6 : 0) + ((x * 7 + y * 3) % 5 === 0 ? -4 : 0) + (Math.random() - .5) * 10; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(d, 0, 0);
  // seams and rib collar
  g.save(); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = W / 220; g.setLineDash([W / 160, W / 260]);
  shapeFn(g, W, H, true); g.restore();
  return c;
}
function teePath(g, W, H, seams) {
  const P = (x, y) => [x * W, y * H];
  g.beginPath();
  g.moveTo(...P(.37, .07));
  g.quadraticCurveTo(...P(.5, .19), ...P(.63, .07));
  g.lineTo(...P(.8, .12)); g.lineTo(...P(.97, .33)); g.lineTo(...P(.84, .43)); g.lineTo(...P(.765, .36));
  g.quadraticCurveTo(...P(.77, .66), ...P(.76, .95)); g.lineTo(...P(.24, .95));
  g.quadraticCurveTo(...P(.23, .66), ...P(.235, .36)); g.lineTo(...P(.16, .43)); g.lineTo(...P(.03, .33)); g.lineTo(...P(.2, .12)); g.closePath();
  if (!seams) return;
  g.stroke();
  g.beginPath(); g.moveTo(...P(.4, .085)); g.quadraticCurveTo(...P(.5, .21), ...P(.6, .085)); g.stroke(); // collar rib
  g.beginPath(); g.moveTo(...P(.07, .36)); g.lineTo(...P(.17, .45)); g.moveTo(...P(.93, .36)); g.lineTo(...P(.83, .45)); g.stroke(); // sleeve hems
  g.beginPath(); g.moveTo(...P(.245, .92)); g.lineTo(...P(.755, .92)); g.stroke(); // bottom hem
}
function onesiePath(g, W, H, seams) {
  const P = (x, y) => [x * W, y * H];
  g.beginPath();
  g.moveTo(...P(.36, .06)); g.quadraticCurveTo(...P(.5, .17), ...P(.64, .06));
  g.lineTo(...P(.8, .12)); g.lineTo(...P(.95, .3)); g.lineTo(...P(.83, .38)); g.lineTo(...P(.75, .32));
  g.quadraticCurveTo(...P(.76, .62), ...P(.8, .78)); g.quadraticCurveTo(...P(.7, .8), ...P(.6, .95)); g.lineTo(...P(.4, .95));
  g.quadraticCurveTo(...P(.3, .8), ...P(.2, .78)); g.quadraticCurveTo(...P(.24, .62), ...P(.25, .32));
  g.lineTo(...P(.17, .38)); g.lineTo(...P(.05, .3)); g.lineTo(...P(.2, .12)); g.closePath();
  if (!seams) return;
  g.stroke();
  g.beginPath(); g.moveTo(...P(.39, .075)); g.quadraticCurveTo(...P(.5, .19), ...P(.61, .075)); g.stroke();
  g.beginPath(); g.moveTo(...P(.42, .92)); g.lineTo(...P(.58, .92)); g.stroke();
  g.setLineDash([]); g.fillStyle = 'rgba(200,200,200,.35)'; for (const x of [.45, .5, .55]) { g.beginPath(); g.arc(x * W, .935 * H, W / 140, 0, 7); g.fill(); } // snaps
}
function woodTex(W, H, light = '#d9b384', dark = '#b48654', grain = 46) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = light; g.fillRect(0, 0, W, H);
  for (let i = 0; i < grain; i++) {
    const y0 = rnd(0, H); g.strokeStyle = dark; g.globalAlpha = rnd(.08, .28); g.lineWidth = rnd(1, W / 160);
    g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= W; x += W / 24) g.lineTo(x, y0 + Math.sin(x / W * 6 + i) * H * .015 + Math.sin(x / W * 17 + i * 2) * H * .004); g.stroke();
  }
  g.globalAlpha = 1;
  const d = g.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - .5) * 12; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0);
  return c;
}
function paperBase(W, H, color = '#F7F4EE') {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, W, H);
  const d = g.getImageData(0, 0, W, H), p = d.data; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, n = ((x % 4 === 0) || (y % 4 === 0) ? -5 : 0) + (Math.random() - .5) * 6; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0);
  return c;
}

/* =================================================================== */
export async function mountWorkshop(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const { renderer, scene } = await baseRenderer(canvas, A, { exposure: 1.05, envI: .75 });
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2); key.position.set(-3, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 24 }); key.shadow.radius = 6; key.shadow.bias = -.0004;
  const rim = new THREE.DirectionalLight(0xffe2c4, .9); rim.position.set(4, 4, -5);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfffaf2, 0xb8a58a, .6));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .22, color: 0x2a2016 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* each piece: { group, tex canvas+texture, base canvas, artBox (uv box), style, size, toWorld(cx,cy), cam } */
  const pieces = {};
  const TS = 1024;
  const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

  // flat garments: a dense plane with an alpha silhouette and soft folds
  function garment(id, pathFn, w, h, box, folds) {
    const alphaC = document.createElement('canvas'); alphaC.width = alphaC.height = 512; const ag = alphaC.getContext('2d');
    ag.fillStyle = '#000'; ag.fillRect(0, 0, 512, 512); ag.fillStyle = '#fff'; pathFn(ag, 512, 512, false); ag.fill();
    const alphaMap = new THREE.CanvasTexture(alphaC);
    const base = fabricBase(TS, TS, pathFn);
    const texC = document.createElement('canvas'); texC.width = texC.height = TS; texC.getContext('2d').drawImage(base, 0, 0);
    const tex = mkTex(texC);
    const geo = new THREE.PlaneGeometry(w, h, 140, 150); geo.rotateX(-Math.PI / 2);
    const disp = (x, z) => .012 + folds * (Math.sin(x * 2.6 + z * 1.9) * .5 + .5) * .05 + folds * Math.sin(z * 6.1 - x * 2.2) * .012 + Math.max(0, Math.abs(x) - w * .3) * .05;
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, disp(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, alphaMap, alphaTest: .5, roughness: .92, sheen: .7, sheenRoughness: .6, sheenColor: new THREE.Color(0x5a5a5a), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap, alphaTest: .5 });
    const group = new THREE.Group(); group.add(mesh);
    pieces[id] = { group, texC, tex, base, box, style: 'thread', method: 'stitch', W: TS, H: TS,
      toWorld: (u, v) => { const x = (u - .5) * w, z = (v - .5) * h; return new THREE.Vector3(x, disp(x, z), z); },
      cam: { el: 1.12, fitW: w * 1.12, fitH: h * 1.08, ty: 0 } };
  }
  garment('tee', teePath, 2.7, 2.9, [.3, .22, .4, .4], 1);
  garment('onesie', onesiePath, 2.1, 2.5, [.31, .2, .38, .38], .8);

  // hexagon magnet: wooden tray with a raised rim, engraved centre
  {
    const R = 1.05, hex = r => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };
    const rimShape = hex(R); rimShape.holes.push(hex(R * .86));
    const sideWood = mkTex(woodTex(512, 512, '#c99a64', '#9c6c3c', 30));
    const capWood = mkTex(woodTex(512, 512, '#d8b07c', '#b0824e', 40)); capWood.repeat.set(1 / (2 * R), 1 / (2 * R)); capWood.offset.set(.5, .5); capWood.wrapS = capWood.wrapT = THREE.RepeatWrapping;
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: .2, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 3, curveSegments: 1 }); rimGeo.rotateX(-Math.PI / 2);
    const rimMesh = cast(new THREE.Mesh(rimGeo, [new THREE.MeshPhysicalMaterial({ map: capWood, roughness: .7, clearcoat: .15 }), new THREE.MeshPhysicalMaterial({ map: sideWood, roughness: .75 })]));
    const inR = R * .87;
    const base = woodTex(TS, TS, '#e2bf8f', '#be915c', 60);
    const texC = document.createElement('canvas'); texC.width = texC.height = TS; texC.getContext('2d').drawImage(base, 0, 0);
    const tex = mkTex(texC); tex.repeat.set(1 / (2 * inR), 1 / (2 * inR)); tex.offset.set(.5, .5);
    const capGeo = new THREE.ExtrudeGeometry(hex(inR), { depth: .1, bevelEnabled: false, curveSegments: 1 }); capGeo.rotateX(-Math.PI / 2);
    const capMesh = cast(new THREE.Mesh(capGeo, [new THREE.MeshPhysicalMaterial({ map: tex, roughness: .8 }), new THREE.MeshPhysicalMaterial({ map: sideWood, roughness: .75 })]));
    const group = new THREE.Group(); group.add(rimMesh, capMesh);
    pieces.hex = { group, texC, tex, base, box: [.17, .2, .66, .6], style: 'burn', method: 'laser', W: TS, H: TS,
      toWorld: (u, v) => new THREE.Vector3((u - .5) * 2 * inR, .1, (v - .5) * 2 * inR),
      cam: { el: 1.0, fitW: 2.5, fitH: 2.4, ty: .05 } };
  }
  // round canvas: white disc on a thin wooden edge
  {
    const R = 1.12;
    const edge = cast(new THREE.Mesh(new THREE.CylinderGeometry(R, R, .07, 96), new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: .9 }))); edge.position.y = .035;
    const base = paperBase(TS, TS);
    const texC = document.createElement('canvas'); texC.width = texC.height = TS; texC.getContext('2d').drawImage(base, 0, 0);
    const tex = mkTex(texC);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R * .995, 96), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .88, sheen: .2, sheenColor: new THREE.Color(0xffffff) }));
    face.rotation.x = -Math.PI / 2; face.position.y = .0705; face.receiveShadow = true;
    const group = new THREE.Group(); group.add(edge, face);
    pieces.canvas = { group, texC, tex, base, box: [.18, .24, .64, .5], style: 'ink', method: 'print', W: TS, H: TS,
      toWorld: (u, v) => new THREE.Vector3((u - .5) * 2 * R, .075, (v - .5) * 2 * R),
      cam: { el: 1.05, fitW: 2.6, fitH: 2.5, ty: .05 } };
  }
  // mug: lathe ceramic with a wrapped print, handle on the right
  {
    const r = .6, h = 1.25;
    const prof = [[0, 0], [r * .82, 0], [r * .95, .01], [r, .06], [r, h - .02], [r * .985, h], [r * .93, h], [r * .93, .08], [0, .08]].map(([x, y]) => new THREE.Vector2(x, y));
    const outer = new THREE.LatheGeometry(prof.slice(0, 6), 128, Math.PI);
    const innerG = new THREE.LatheGeometry(prof.slice(5), 128, Math.PI);
    const TW = 2048, THh = 640;
    const base = paperBase(TW, THh, '#FBFAF7');
    const texC = document.createElement('canvas'); texC.width = TW; texC.height = THh; texC.getContext('2d').drawImage(base, 0, 0);
    const tex = mkTex(texC);
    // lathe v runs along the profile length; keep the art on the straight wall by mapping v ≈ height
    const uv = outer.attributes.uv, pos = outer.attributes.position; for (let i = 0; i < uv.count; i++) uv.setY(i, clamp(pos.getY(i) / h));
    const ceramic = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .18, clearcoat: 1, clearcoatRoughness: .08 });
    const mugMesh = cast(new THREE.Mesh(outer, ceramic));
    const inMesh = new THREE.Mesh(innerG, new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: .2, clearcoat: 1, side: THREE.DoubleSide }));
    const handle = cast(new THREE.Mesh(new THREE.TorusGeometry(.27, .065, 20, 48, Math.PI * 1.25), new THREE.MeshPhysicalMaterial({ color: 0xfbfaf7, roughness: .18, clearcoat: 1 })));
    handle.rotation.z = -Math.PI * .625; handle.position.set(r + .12, h * .52, 0); handle.scale.set(1, 1.15, 1);
    const group = new THREE.Group(); group.add(mugMesh, inMesh, handle);
    pieces.mug = { group, texC, tex, base, box: [.36, .2, .28, .6], style: 'ink', method: 'wrap', W: TW, H: THh,
      toWorld: (u, v) => { const phi = Math.PI + u * Math.PI * 2; return new THREE.Vector3(Math.sin(phi) * (r + .015), (1 - v) * h, Math.cos(phi) * (r + .015)); },
      cam: { el: .32, fitW: 2.1, fitH: 2.0, ty: .62 } };
  }
  Object.values(pieces).forEach(p => { p.group.visible = false; scene.add(p.group); });

  /* ---------- tools ---------- */
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xdedede, metalness: 1, roughness: .12 });
  const needle = new THREE.Group();
  {
    const prof = [[0, 0], [.008, .03], [.014, .1], [.016, .3], [.016, .62], [.013, .68], [0, .7]].map(([x, y]) => new THREE.Vector2(x, y));
    const shaft = cast(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), chrome)); needle.add(shaft);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.012, .004, 8, 20), chrome); eye.scale.set(.6, 1.6, 1); eye.position.y = .63; eye.rotation.y = Math.PI / 2; needle.add(eye);
    const pts = [[0, .63, 0], [.05, .72, .02], [.1, .82, -.02], [.06, .95, -.08], [-.06, 1.02, -.05], [-.12, .92, .04], [-.04, .82, .1], [.14, .78, .16], [.32, .84, .12]].map(a => new THREE.Vector3(...a));
    const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, .006, 6), new THREE.MeshStandardMaterial({ color: 0xefe4cc, roughness: .8 })); thread.castShadow = true;
    needle.add(thread); needle.userData.thread = thread;
    needle.rotation.z = .5; needle.rotation.x = -.25; needle.visible = false; scene.add(needle);
  }
  const hot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  hot.scale.setScalar(.22); hot.visible = false; scene.add(hot);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.visible = false; scene.add(beam);
  const laserLight = new THREE.PointLight(0xff8a3a, 0, 1.6, 2); scene.add(laserLight);
  const head = new THREE.Group();
  {
    const body = cast(new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .2, 32), new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, metalness: .7, roughness: .3, clearcoat: .6 }))); body.position.y = .95; head.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.057, .008, 8, 32), new THREE.MeshPhysicalMaterial({ color: 0xc9a25a, metalness: 1, roughness: .25 })); band.rotation.x = Math.PI / 2; band.position.y = .9; head.add(band);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.012, .04, .07, 24), chrome); nozzle.position.y = .815; head.add(nozzle);
  }
  head.visible = false; scene.add(head);
  const st = smokeTex(); const smoke = Array.from({ length: 22 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 })); s.userData.life = -1; scene.add(s); return s; });
  let smokeI = 0;
  const bar = new THREE.Group();
  {
    const rail = cast(new THREE.Mesh(new THREE.BoxGeometry(2.5, .06, .1), new THREE.MeshPhysicalMaterial({ color: 0x1d1d1d, metalness: .5, roughness: .3 }))); rail.position.y = .2; bar.add(rail);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.4, .008, .02), new THREE.MeshBasicMaterial({ color: 0xb02a22 })); strip.position.set(0, .165, .03); bar.add(strip);
  }
  bar.visible = false; scene.add(bar);
  const roller = new THREE.Group();
  {
    const rod = cast(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.0, 24), new THREE.MeshPhysicalMaterial({ color: 0x1d1d1d, roughness: .35, metalness: .4 }))); roller.add(rod);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(.02, .9), new THREE.MeshBasicMaterial({ color: 0xb02a22, transparent: true, opacity: .7 })); glow.position.z = .06; roller.add(glow);
  }
  roller.visible = false; scene.add(roller);

  /* ---------- state ---------- */
  let cur = null, phrase = null, art = null, prog = 1, crafting = false, dur = 3, t = 0;
  const seq = sequencer();
  const camT = { el: 1.1, fitW: 3, fitH: 3, ty: 0 }, camC = { ...camT };
  const target = new THREE.Vector3();

  function redraw(p) {
    const P = pieces[cur]; if (!P || !art) return;
    const g = P.texC.getContext('2d'), W = P.W, H = P.H;
    g.globalCompositeOperation = 'source-over'; g.drawImage(P.base, 0, 0);
    const [x0, y0, x1, y1] = art.box; let hx = x0, hy = y0;
    g.save(); g.beginPath();
    if (P.method === 'stitch' || P.method === 'wrap') {
      const x = lerp(x1, x0, p); g.rect(x, 0, W - x, H); hx = x; hy = lerp(y0, y1, .5 + .35 * Math.sin(p * 90));
    } else if (P.method === 'laser') {
      const rows = 30, rh = (y1 - y0) / rows, f = p * rows, done = Math.floor(f), part = f - done;
      g.rect(0, 0, W, y0 + done * rh);
      const cx = lerp(x1, x0, part); if (done < rows) g.rect(cx, y0 + done * rh, W - cx, rh);
      hx = cx; hy = y0 + (done + .5) * rh;
    } else {
      const y = lerp(y0, y1, p); g.rect(0, 0, W, y); hy = y; hx = (x0 + x1) / 2;
    }
    g.clip(); g.drawImage(art.canvas, 0, 0); g.restore();
    if (P.method === 'laser' && p > 0 && p < 1) { // hot glowing edge on the fresh burn
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(hx, hy, 0, hx, hy, W * .035); gr.addColorStop(0, 'rgba(255,170,80,.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(hx - W * .04, hy - W * .04, W * .08, W * .08); g.restore();
    }
    P.tex.needsUpdate = true;
    return [hx / W, hy / H];
  }
  function setArt() {
    const P = pieces[cur]; if (!P || !phrase) return;
    art = drawArt(phrase, P.W, P.H, P.style, P.box);
  }
  const DUR = { stitch: 3.4, laser: 4.2, print: 2.4, wrap: 2.8 };
  function startCraft() {
    if (!pieces[cur] || !phrase) return;
    setArt(); crafting = true; t = 0; dur = DUR[pieces[cur].method]; prog = 0; redraw(0);
    o.onStart && o.onStart(pieces[cur].method);
    if (RM) { crafting = false; prog = 1; redraw(1); o.onDone && o.onDone(); }
  }
  function show(id, instant) {
    const prev = cur ? pieces[cur] : null, next = pieces[id];
    if (!next || id === cur) return;
    seq.clear(); crafting = false; hideTools();
    if (prev) {
      const g0 = prev.group;
      seq.push({ d: instant || RM ? 0 : .32, run: k => { g0.position.y = easeOut(k) * .5; g0.scale.setScalar(1 - .15 * k); if (k >= 1) g0.visible = false; } });
    }
    seq.push({ run: () => { cur = id; Object.assign(camT, next.cam); next.group.visible = true; next.group.position.y = instant || RM ? 0 : .9; next.group.scale.setScalar(1); next.group.rotation.y = 0; } });
    if (!instant && !RM) seq.push({ d: .6, run: k => { next.group.position.y = lerp(.9, 0, easeOut(k)); next.group.rotation.y = (1 - easeOut(k)) * -.5; } });
    seq.push({ run: () => startCraft() });
  }
  function hideTools() { needle.visible = hot.visible = beam.visible = head.visible = bar.visible = roller.visible = false; laserLight.intensity = 0; }

  /* ---------- camera ---------- */
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max(camC.fitH / 2 / Math.tan(vf / 2), camC.fitW / 2 / Math.tan(vf / 2) / camera.aspect) * 1.02;
    target.set(0, camC.ty, 0);
    camera.position.set(0, camC.ty + Math.sin(camC.el) * dist, Math.cos(camC.el) * dist);
    camera.lookAt(target); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(() => frame()).observe(canvas);

  let px = 0, py = 0, tx = 0, ty = 0, time = 0;
  if (FINE && !RM) canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; });
  canvas.addEventListener('pointerleave', () => { tx = ty = 0; });

  const kick = loopWhileVisible(canvas, dt => {
    time += dt; seq.tick(dt);
    for (const k of ['el', 'fitW', 'fitH', 'ty']) camC[k] += (camT[k] - camC[k]) * (1 - Math.pow(.02, dt));
    frame();
    px += (tx - px) * .06; py += (ty - py) * .06;
    const P = cur && pieces[cur];
    if (P && !seq.busy) { P.group.rotation.y = px * .12 + (cur === 'mug' && !crafting ? Math.sin(time * .5) * .25 : 0); P.group.rotation.x = py * .05; }
    if (P && crafting) {
      t += dt; const k = clamp(t / dur); prog = P.method === 'laser' ? k : easeInOut(k);
      const [u, v] = redraw(prog), w = P.toWorld(u, v); P.group.localToWorld(w);
      hideTools();
      if (P.method === 'stitch') {
        needle.visible = true; const bob = Math.abs(Math.sin(time * 26)) * .07;
        needle.position.set(w.x + .02, w.y + bob - .005, w.z); 
      } else if (P.method === 'laser') {
        head.visible = hot.visible = beam.visible = true; head.position.set(w.x, w.y, w.z); hot.position.copy(w); hot.position.y += .01;
        hot.scale.setScalar(.16 + Math.random() * .08); beam.position.set(w.x, w.y + .42, w.z); beam.scale.y = .5;
        laserLight.position.set(w.x, w.y + .08, w.z); laserLight.intensity = 1.2 + Math.random() * .6;
        if (Math.random() < .5) { const s = smoke[smokeI++ % smoke.length]; s.userData.life = 0; s.position.copy(w); s.userData.vx = rnd(-.05, .05); }
      } else if (P.method === 'print') {
        bar.visible = true; bar.position.set(0, w.y, w.z);
      } else {
        roller.visible = true; roller.position.set(w.x, w.y + .05, w.z + .07); roller.position.y = .62;
      }
      if (k >= 1) { crafting = false; prog = 1; redraw(1); hideTools(); o.onDone && o.onDone(); }
    }
    smoke.forEach(s => { if (s.userData.life < 0) return; s.userData.life += dt; const l = s.userData.life / 1.6; if (l >= 1) { s.userData.life = -1; s.material.opacity = 0; return; } s.position.y += dt * .35; s.position.x += (s.userData.vx || 0) * dt; s.scale.setScalar(.12 + l * .5); s.material.opacity = Math.sin(l * Math.PI) * .28; });
    renderer.render(scene, camera);
  });

  return {
    setItem(id) { show(id); kick(); },
    setPhrase(p) { phrase = p; if (cur && !seq.busy) startCraft(); kick(); },
    start(id, p) { phrase = p; show(id, false); kick(); },
    replay() { if (!seq.busy) startCraft(); kick(); },
    get crafting() { return crafting || seq.busy; },
  };
}

/* =================================================================== */
export async function mountLantern(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const { renderer, scene } = await baseRenderer(canvas, A, { alpha: true, exposure: 1.0, envI: .35 });
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  scene.add(new THREE.HemisphereLight(0x5a4030, 0x0a0606, .25));
  const moon = new THREE.DirectionalLight(0x8090b0, .25); moon.position.set(3, 5, 6); scene.add(moon);

  // the wall the lantern throws its stars on (matches the section's colour, fades out at the edges)
  const wallC = document.createElement('canvas'); wallC.width = wallC.height = 256; { const g = wallC.getContext('2d'); const gr = g.createRadialGradient(128, 110, 10, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(.7, '#999'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0x6a5242, roughness: .95, transparent: true, alphaMap: new THREE.CanvasTexture(wallC) }));
  wall.position.set(0, 0, -1.6); wall.receiveShadow = true; scene.add(wall);

  // pierced brass: eight-point stars cut out of a band
  const pierceC = document.createElement('canvas'); pierceC.width = 1024; pierceC.height = 256;
  {
    const g = pierceC.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#000';
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * .62 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) { const x = (i + (row % 2 ? .5 : 0)) / 12 * 1024, y = 48 + row * 80; star(x, y, row === 1 ? 26 : 18); }
    for (let i = 0; i < 24; i++) { g.beginPath(); g.arc((i + .25) / 24 * 1024, 8, 4, 0, 7); g.fill(); g.beginPath(); g.arc((i + .25) / 24 * 1024, 248, 4, 0, 7); g.fill(); }
  }
  const pierce = new THREE.CanvasTexture(pierceC);
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc89b4a, metalness: 1, roughness: .32, side: THREE.DoubleSide });
  const brassCut = new THREE.MeshPhysicalMaterial({ color: 0xc89b4a, metalness: 1, roughness: .3, alphaMap: pierce, alphaTest: .5, side: THREE.DoubleSide });
  const L = new THREE.Group(); scene.add(L);
  const lathe = (pts, mat, seg = 64) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };
  // base, pierced body, dome, finial (all bottom→top)
  L.add(lathe([[0, -.95], [.12, -.95], [.18, -.9], [.3, -.84], [.36, -.78], [.36, -.72]], brass));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .9, 64, 1, true), brassCut); body.position.y = -.27; body.castShadow = true;
  body.customDistanceMaterial = new THREE.MeshDistanceMaterial({ alphaMap: pierce, alphaTest: .5 });
  L.add(body);
  L.add(lathe([[.36, .18], [.4, .2], [.4, .25], [.34, .3], [.3, .42], [.22, .55], [.12, .66], [.05, .74], [.04, .8]], brassCut));
  L.children[L.children.length - 1].customDistanceMaterial = new THREE.MeshDistanceMaterial({ alphaMap: pierce, alphaTest: .5 });
  L.add(lathe([[.04, .8], [.07, .84], [.05, .9], [.03, .96], [.0, 1.0]], brass, 32));
  for (const y of [-.72, .18]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.365, .018, 10, 64), brass); r.rotation.x = Math.PI / 2; r.position.y = y; r.castShadow = true; L.add(r); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .014, 10, 32), brass); ring.position.y = 1.07; ring.castShadow = true; L.add(ring);
  // the chain up out of frame
  const chain = new THREE.Group(); for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(.045, .011, 8, 20), brass); l.scale.y = 1.6; l.position.y = 1.2 + i * .13; l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); } L.add(chain);
  // glass + flame
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .86, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9e2a1c, emissive: 0x7a1a10, emissiveIntensity: .2, transparent: true, opacity: .35, roughness: .2, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = -.27; L.add(glass);
  const flameS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,248,225,1)', 'rgba(255,170,70,.55)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flameS.position.y = -.35; L.add(flameS);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,190,110,.5)', 'rgba(255,120,50,.18)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = -.3; L.add(halo);
  const light = new THREE.PointLight(0xffa04a, 4, 0, 1.4); light.position.y = -.35; light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -.002; light.shadow.radius = 2; light.shadow.camera.near = .03; light.shadow.camera.far = 12; L.add(light);
  L.position.set(0, .55, 0);

  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max(3.1 / 2 / Math.tan(vf / 2), 1.6 / 2 / Math.tan(vf / 2) / camera.aspect);
    camera.position.set(0, .45, dist); camera.lookAt(0, .35, 0); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(frame).observe(canvas); frame();

  let glow = o.glow ?? .15, glowC = glow, time = 0, flare = 0;
  loopWhileVisible(canvas, dt => {
    time += dt; glowC += (glow - glowC) * (1 - Math.pow(.05, dt)); flare = Math.max(0, flare - dt * 1.2);
    const fl = RM ? 1 : 1 + Math.sin(time * 11) * .04 + Math.sin(time * 17.3) * .03 + (Math.random() - .5) * .04;
    const g = glowC + flare * .25;
    light.intensity = (3 + g * 26) * fl; light.distance = 0;
    flameS.scale.setScalar((.16 + g * .16) * fl); halo.scale.setScalar(.7 + g * 1.4);
    halo.material.opacity = .35 + g * .65; glass.material.emissiveIntensity = .15 + g * .9;
    L.rotation.z = RM ? 0 : Math.sin(time * .7) * .035; L.rotation.y = RM ? 0 : Math.sin(time * .23) * .3;
    renderer.render(scene, camera);
  });
  return { setGlow(v) { glow = clamp(v); flare = 1; } };
}
