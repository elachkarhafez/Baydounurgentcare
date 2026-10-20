/* =====================================================================
   Bluejay Bench Tavern (ElaSystems concept): "Flip the coasters."
   Four real 3D pulp-board beer coasters on the bar, printed risograph
   style (navy + sky blue, halftone, misregistered layers). Each front is a
   game-day item; tap one and it hops, flips and lands on its back:
   the price, in the house accent. A lathe-turned pint (glass, beer, foam)
   sits on the bar. Coasters are dealt onto the bar on load and the first
   one flips itself to teach the move.
   Transparent canvas + ShadowMaterial catcher, studio HDRI, renders only
   while something moves and only while visible.
   Bundle: kit/build3d/build.sh demos/college-bar/src/coasters.js demos/college-bar/assets/coasters.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const PAPER = '#f3eee2', NAVY = '#18306e', SKY = '#5aa9e6', RED = '#e8513f';
const FD = '"Archivo", "Arial Narrow", sans-serif', FM = '"Space Mono", ui-monospace, monospace';

/* ---------- riso print helpers (2D canvas) ---------- */
function dots(color, step = 9, r = 2.6, ang = 0) {
  const c = document.createElement('canvas'); c.width = c.height = step * 2;
  const g = c.getContext('2d'); g.fillStyle = color;
  [[step / 2, step / 2], [step * 1.5, step * 1.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  return c;
}
function textArc(g, str, cx, cy, rad, start, font, color, spacing = 1) {
  g.save(); g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const total = [...str].reduce((s, ch) => s + g.measureText(ch).width * spacing, 0);
  let a = start - total / rad / 2;
  for (const ch of str) { const w = g.measureText(ch).width * spacing; a += w / rad / 2; g.save(); g.translate(cx + Math.cos(a - Math.PI / 2) * rad, cy + Math.sin(a - Math.PI / 2) * rad); g.rotate(a); g.fillText(ch, 0, 0); g.restore(); a += w / rad / 2; }
  g.restore();
}
function bird(g, x, y, s, color) {
  // a perched bluejay: body, crest, tail, beak
  g.save(); g.fillStyle = color; g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-22, 6); g.quadraticCurveTo(-18, -16, 2, -14); g.lineTo(8, -30); g.lineTo(12, -13); g.quadraticCurveTo(22, -10, 24, -4); g.lineTo(34, -2); g.lineTo(23, 3);
  g.quadraticCurveTo(18, 18, -2, 18); g.lineTo(-30, 30); g.lineTo(-20, 12); g.closePath(); g.fill();
  g.restore();
}
// two-layer print: draw(layerCtx, inkColor, isSky) once per ink, sky offset for misregistration
function print(size, layers) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, size, size);
  // pulp fleck
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * .08})`; g.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5); }
  for (const [ink, off, fn] of layers) {
    const l = document.createElement('canvas'); l.width = l.height = size; const lg = l.getContext('2d');
    fn(lg, ink);
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .94; g.drawImage(l, off[0], off[1]); g.restore();
  }
  // ink wear: knock out specks
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { g.globalAlpha = Math.random() * .35; g.beginPath(); g.arc(Math.random() * size, Math.random() * size, Math.random() * 2.2, 0, 7); g.fill(); }
  g.restore(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = PAPER; g.fillRect(0, 0, size, size);
  return c;
}

/* ---------- food art, drawn per ink layer ---------- */
const ART = {
  pizza(g, ink, sky, C) {
    if (sky) { g.fillStyle = ink; g.beginPath(); g.arc(C, C, 210, 0, 7); g.fill(); g.fillStyle = g.createPattern(dots(ink, 10, 3.4), 'repeat'); g.beginPath(); g.arc(C, C, 238, 0, 7); g.fill(); return; }
    g.fillStyle = g.createPattern(dots(ink, 12, 3.2), 'repeat'); g.beginPath(); g.arc(C, C, 196, 0, 7); g.fill();
    g.strokeStyle = ink; g.lineWidth = 16; g.beginPath(); g.arc(C, C, 214, 0, 7); g.stroke();
    g.strokeStyle = PAPER; g.lineWidth = 9; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + .2; g.beginPath(); g.moveTo(C - Math.cos(a) * 214, C - Math.sin(a) * 214); g.lineTo(C + Math.cos(a) * 214, C + Math.sin(a) * 214); g.stroke(); }
    g.fillStyle = ink; [[-90, -40], [60, -100], [80, 70], [-50, 110], [-130, 50], [120, -20], [10, 20]].forEach(([x, y]) => { g.beginPath(); g.ellipse(C + x, C + y, 16, 11, x, 0, 7); g.fill(); });
  },
  wings(g, ink, sky, C) {
    const wing = (x, y, r, s) => { g.save(); g.translate(C + x, C + y); g.rotate(r); g.scale(s, s); g.beginPath(); g.moveTo(-95, -38); g.bezierCurveTo(-40, -90, 70, -70, 95, -18); g.bezierCurveTo(118, 20, 70, 62, 20, 50); g.bezierCurveTo(-30, 40, -70, 55, -100, 30); g.bezierCurveTo(-125, 8, -118, -22, -95, -38); g.fill(); g.restore(); };
    if (sky) { g.fillStyle = ink; wing(-60, -70, -.4, 1.05); wing(70, -10, .5, 1); wing(-30, 95, .1, 1.05); g.fillStyle = g.createPattern(dots(ink, 10, 3), 'repeat'); g.beginPath(); g.arc(C + 150, C + 120, 60, 0, 7); g.fill(); return; }
    g.fillStyle = g.createPattern(dots(ink, 9, 3.1), 'repeat'); wing(-66, -76, -.4, .95); wing(64, -16, .5, .9); wing(-36, 89, .1, .95);
    g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.arc(C + 150, C + 120, 60, 0, 7); g.stroke();
    g.fillStyle = ink; g.font = `800 30px ${FM}`; g.textAlign = 'center'; g.fillText('RANCH', C + 150, C + 130);
  },
  tenders(g, ink, sky, C) {
    const t = (x, y, r) => { g.save(); g.translate(C + x, C + y); g.rotate(r); g.beginPath(); g.roundRect(-150, -40, 300, 80, 40); g.fill(); g.restore(); };
    if (sky) { g.fillStyle = ink; t(-10, -95, -.25); t(15, 5, .12); t(-5, 105, -.08); return; }
    g.fillStyle = g.createPattern(dots(ink, 10, 3.6), 'repeat'); t(-16, -101, -.25); t(9, -1, .12); t(-11, 99, -.08);
    g.fillStyle = ink; for (let i = 0; i < 90; i++) { const a = Math.random() * 7, r = Math.random() * 200; g.fillRect(C + Math.cos(a) * r * 1.2, C + Math.sin(a) * r * .8, 5, 5); }
  },
  can(g, ink, sky, C) {
    const body = () => { g.beginPath(); g.roundRect(C - 110, C - 190, 220, 380, 34); g.fill(); };
    if (sky) { g.fillStyle = ink; body(); return; }
    g.fillStyle = g.createPattern(dots(ink, 10, 2.8), 'repeat'); body();
    g.fillStyle = ink; g.fillRect(C - 110, C - 60, 220, 120);
    g.fillStyle = PAPER; g.font = `900 64px ${FD}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('16 OZ', C, C + 4);
    g.strokeStyle = ink; g.lineWidth = 10; g.beginPath(); g.ellipse(C, C - 190, 100, 22, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(C + 30, C - 196, 30, 10, 0, 0, 7); g.stroke();
  },
};

function frontTex(item, size = 1024) {
  const C = size / 2;
  return print(size, [
    [SKY, [5, 4], (g, ink) => {
      g.fillStyle = ink; g.lineWidth = 26; g.strokeStyle = ink; g.beginPath(); g.arc(C, C, C - 40, 0, 7); g.stroke();
      g.save(); g.translate(0, 40); g.scale(.9, .9); g.translate(C * .11, C * .11); ART[item.art](g, ink, true, C); g.restore();
    }],
    [NAVY, [0, 0], (g, ink) => {
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.arc(C, C, C - 70, 0, 7); g.stroke();
      textArc(g, 'BLUEJAY BENCH · TAVERN ·', C, C, C - 118, 0, `800 54px ${FD}`, ink, 1.12);
      g.save(); g.translate(0, 40); g.scale(.9, .9); g.translate(C * .11, C * .11); ART[item.art](g, ink, false, C); g.restore();
      bird(g, C, 210, 1.6, ink);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = `900 72px ${FD}`; g.fillText((item.front || item.chip).toUpperCase(), C, size - 180);
      g.font = `700 26px ${FM}`; g.fillText('GAME DAY · FLIP ME', C, size - 128);
    }],
  ]);
}
function backTex(item, size = 1024) {
  const C = size / 2;
  return print(size, [
    [SKY, [-4, 5], (g, ink) => {
      g.fillStyle = ink; g.beginPath(); g.arc(C, C, C - 40, 0, 7); g.fill();
      g.fillStyle = g.createPattern(dots(PAPER, 14, 4.2), 'repeat'); g.beginPath(); g.arc(C, C, C - 40, 0, 7); g.fill();
    }],
    [NAVY, [0, 0], (g, ink) => {
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = `700 30px ${FM}`; g.fillText('SAMPLE · GAME DAY', C, 230);
      g.font = `900 330px ${FD}`; g.fillText(item.price, C, 540);
      { let fs = 64; g.font = `900 ${fs}px ${FD}`; while (g.measureText(item.name.toUpperCase()).width > 660 && fs > 30) { fs -= 2; g.font = `900 ${fs}px ${FD}`; } g.fillText(item.name.toUpperCase(), C, 630); }
      g.font = `italic 800 46px ${FD}`;
      const words = item.quip.split(' '); let line = '', y = 712; const lines = [];
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 640) { lines.push(line); line = w; } else line = t; } lines.push(line);
      lines.forEach(l => { g.fillText(l, C, y); y += 54; });
      g.font = `700 22px ${FM}`; g.fillText('WHILE SUPPLIES LAST', C, size - 120);
    }],
  ]);
}

export async function mountCoasters(canvas, o = {}) {
  const A = o.assets || 'assets/', items = o.items, onFlip = o.onFlip || (() => {});
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);

  const envP = new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  try { await Promise.race([Promise.all(['900 80px Archivo', '800 80px Archivo', 'italic 800 40px Archivo', '700 20px "Space Mono"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  const env = await envP;
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .75; }

  const key = new THREE.DirectionalLight(0xfff3e4, 2.3); key.position.set(-3, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 30 }); key.shadow.bias = -.0004; key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xdfeaff, .9); rim.position.set(5, 4, -6);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xffffff, 0xe8e0cf, .75));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ---------- coasters ----------
  const R = 1, T = .075, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const rimPts = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * i / 12; rimPts.push(new THREE.Vector2(R - T / 2 + Math.cos(a) * T / 2, Math.sin(a) * T / 2)); }
  const rimGeo = new THREE.LatheGeometry(rimPts, 128);
  const pulp = new THREE.MeshPhysicalMaterial({ color: 0xefe8d8, roughness: .92, sheen: .35, sheenColor: 0xffffff });
  const faceGeo = new THREE.CircleGeometry(R - T / 2 + .002, 128);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const coasters = items.map((it, i) => {
    const g = new THREE.Group(), flipG = new THREE.Group(); g.add(flipG);
    const rimM = new THREE.Mesh(rimGeo, pulp); rimM.castShadow = rimM.receiveShadow = true;
    const fm = new THREE.MeshPhysicalMaterial({ map: tex(frontTex(it)), roughness: .88, sheen: .3, sheenColor: 0xffffff });
    const bm = new THREE.MeshPhysicalMaterial({ map: tex(backTex(it)), roughness: .88, sheen: .3, sheenColor: 0xffffff });
    const f = new THREE.Mesh(faceGeo, fm); f.rotation.x = -Math.PI / 2; f.position.y = T / 2; f.receiveShadow = true; f.castShadow = true;
    const b = new THREE.Mesh(faceGeo, bm); b.rotation.x = Math.PI / 2; b.position.y = -T / 2; b.receiveShadow = true;
    flipG.add(rimM, f, b); scene.add(g);
    [rimM, f, b].forEach(m => m.userData.i = i);
    return { g, flipG, i, rx: 0, from: 0, to: 0, t: 1, dur: .9, yaw: 0, yawGoal: (i % 2 ? .25 : -.2) + i * .13, lift: 0, liftGoal: 0, wob: 0, drop: RM ? 1 : 0, dropDelay: .12 * i, base: new THREE.Vector3() };
  });

  // ---------- pint glass (lathe: glass, beer, foam) ----------
  const pint = new THREE.Group(); scene.add(pint);
  const gp = []; const H = 2.25;
  [[0, 0], [.4, 0], [.43, .03], [.44, .2], [.55, H * .82], [.6, H * .9], [.58, H], [.555, H], [.57, H * .9], [.52, H * .82], [.41, .22], [.38, .14], [0, .14]].forEach(([x, y]) => gp.push(new THREE.Vector2(x, y)));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(gp, 96), new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: .22, roughness: .03, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6, depthWrite: false }));
  glass.castShadow = false; glass.renderOrder = 2;
  const bp = [[0, .15], [.37, .15], [.4, .24], [.505, H * .8], [0, H * .8]].map(([x, y]) => new THREE.Vector2(x, y));
  const beer = new THREE.Mesh(new THREE.LatheGeometry(bp, 96), new THREE.MeshPhysicalMaterial({ color: 0xd8911f, roughness: .18, clearcoat: .6, clearcoatRoughness: .1, sheen: .6, sheenColor: 0xffd27a, emissive: 0x6a3605, emissiveIntensity: .35 }));
  beer.castShadow = true;
  const fp = []; for (let i = 0; i <= 10; i++) { const a = i / 10; fp.push(new THREE.Vector2(.515 + Math.sin(a * Math.PI) * .03 - a * .515 * Math.pow(a, 3), H * .8 + Math.sin(a * Math.PI / 2) * .26)); }
  fp.unshift(new THREE.Vector2(.5, H * .8 - .02));
  const foam = new THREE.Mesh(new THREE.LatheGeometry(fp, 96), new THREE.MeshPhysicalMaterial({ color: 0xfbf6ea, roughness: .75, sheen: 1, sheenColor: 0xffffff }));
  foam.castShadow = true;
  pint.add(beer, foam, glass);

  // ---------- layout ----------
  let aspect = 1, narrow = false;
  function layout() {
    narrow = aspect < 1.05;
    const P = narrow ? [[-1.12, -1.15], [1.12, -1.05], [-1.08, 1.12], [1.14, 1.2]] : [[-3.45, .2], [-1.15, -.15], [1.15, .2], [3.45, -.1]];
    coasters.forEach((c, i) => c.base.set(P[i][0], T / 2, P[i][1]));
    pint.visible = !narrow;
    pint.position.set(5.3, 0, -1.1); pint.scale.setScalar(.82);
  }
  function size() {
    const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); layout(); placeCamera(); kick();
  }
  let drift = { x: 0, y: 0, gx: 0, gy: 0 };
  function placeCamera() {
    const el = narrow ? 1.1 : .92, az = drift.x * .06;
    const dist = narrow ? Math.max(7.2, 5.4 / (.536 * Math.max(.35, aspect))) : Math.max(6.4, 13.2 / (.536 * aspect));
    const tgt = new THREE.Vector3(narrow ? 0 : .9, .25, narrow ? .05 : -.05);
    camera.position.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, Math.sin(el + drift.y * .03) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tgt);
  }

  // ---------- interaction ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hits = coasters.flatMap(c => c.flipG.children);
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.i : -1;
  }
  function flip(i) {
    const c = coasters[i]; if (!c || c.t < 1 || c.drop < 1) return;
    c.from = c.rx; c.to = c.rx + Math.PI; c.t = 0; c.spin = (Math.random() - .5) * .9; c.yaw0 = c.yaw; kick();
  }
  canvas.addEventListener('pointerdown', e => { const i = pick(e); if (i >= 0) { flip(i); e.preventDefault(); } });
  let hover = -1;
  if (FINE) {
    canvas.addEventListener('pointermove', e => { const i = pick(e); if (i !== hover) { hover = i; canvas.style.cursor = i >= 0 ? 'pointer' : ''; coasters.forEach(c => c.liftGoal = c.i === i ? .14 : 0); kick(); } });
    canvas.addEventListener('pointerleave', () => { hover = -1; coasters.forEach(c => c.liftGoal = 0); kick(); });
    addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  }

  // ---------- loop ----------
  let visible = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  let clock = 0;
  function frame(now) {
    raf = 0; const dt = Math.min(.12, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    let moving = false;
    for (const c of coasters) {
      // dealt onto the bar
      if (c.drop < 1) { c.dropDelay -= dt; if (c.dropDelay <= 0) c.drop = Math.min(1, c.drop + dt / .55); moving = true; }
      const d = c.drop, fall = d < .7 ? 1 - Math.pow(d / .7, 2) : Math.abs(Math.sin((d - .7) / .3 * Math.PI)) * .12 * (1 - d);
      // flip
      let hop = 0;
      if (c.t < 1) {
        c.t = Math.min(1, c.t + dt / c.dur); const e = ease(c.t);
        c.rx = lerp(c.from, c.to, e); hop = Math.sin(Math.PI * c.t) * 1.35; c.yaw = c.yaw0 + c.spin * Math.sin(Math.PI * c.t);
        if (c.t >= 1) { c.rx = c.to; c.wob = 1; onFlip(c.i, Math.round(c.rx / Math.PI) % 2); }
        moving = true;
      }
      if (c.wob > 0) { c.wob = Math.max(0, c.wob - dt * 1.6); moving = true; }
      c.lift += (c.liftGoal - c.lift) * (1 - Math.pow(.001, dt)); if (Math.abs(c.liftGoal - c.lift) > .001) moving = true;
      c.yaw += (c.yawGoal - c.yaw) * (c.t < 1 ? 0 : 1 - Math.pow(.2, dt));
      c.g.position.set(c.base.x, c.base.y + hop + c.lift + fall * 4.5, c.base.z);
      c.g.rotation.set(0, c.yaw, 0);
      const w = c.wob * Math.sin((1 - c.wob) * 26) * .07;
      c.flipG.rotation.set(c.rx + w, 0, w * .6 + (c.drop < 1 ? (1 - c.drop) * .5 : 0));
    }
    if (FINE) { drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt)); if (Math.abs(drift.gx - drift.x) > .002) moving = true; }
    placeCamera(); renderer.render(scene, camera);
    if (moving && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  size();
  await renderer.compileAsync?.(scene, camera);
  renderer.render(scene, camera); kick();

  return {
    renderer, flip,
    get sides() { return coasters.map(c => Math.round(c.to / Math.PI) % 2); },
    get busy() { return coasters.some(c => c.t < 1 || c.drop < 1); },
  };
}
