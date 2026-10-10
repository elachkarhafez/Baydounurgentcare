/* =====================================================================
   Batter Up Chicken Co.: their own neon logo, hung as a real sign.
   The logo is split into light layers (ring, rooster, jaw, flame, banner,
   Chicken Co.) that add back up to the exact artwork, each on its own
   circuit, over a dim "unlit glass" copy, on smoked acrylic on brick.
   Sequence: dark → each circuit buzzes on → the rooster's lower beak
   drops open and shut "BAT · TER · UP!" while a neon bubble says it.
   api.talk() makes him say it again; api.glitch() stutters a circuit.
   Bundle: kit/build3d/build.sh batterupchickenco/src/neon.js batterupchickenco/assets/neon.js
   ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const V = (x, y) => new THREE.Vector3(x, y, 0);
const SIZE = 2.4;               // logo plane size; the 600px artwork maps onto this
const PX = SIZE / 600;           // one logo pixel in scene units

export async function mountNeon(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  try { await document.fonts.load('400 120px "Lilita One"'); } catch (e) {}

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0710);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
  const sign = new THREE.Group(); scene.add(sign);

  // ---- wall: dark painted brick ----
  const wallC = document.createElement('canvas'); wallC.width = 1024; wallC.height = 1024;
  { const g = wallC.getContext('2d'); g.fillStyle = '#1a121c'; g.fillRect(0, 0, 1024, 1024);
    const bw = 128, bh = 52;
    for (let r = 0; r * bh < 1024; r++) for (let c = -1; c * bw < 1024; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, s = 26 + Math.random() * 12;
      g.fillStyle = `rgb(${s + 6},${s},${s + 8})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .035})`; g.fillRect(x + 3 + Math.random() * (bw - 8), y + 3 + Math.random() * (bh - 8), 2, 2); }
    } }
  const wallT = new THREE.CanvasTexture(wallC); wallT.colorSpace = THREE.SRGBColorSpace; wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(3, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: wallT, roughness: .95 }));
  wall.position.z = -.32; scene.add(wall);
  scene.add(new THREE.AmbientLight(0xffffff, .5), new THREE.HemisphereLight(0x9a90b0, 0x100810, .5));
  const glassKey = new THREE.DirectionalLight(0xffffff, .9); glassKey.position.set(-2, 3, 4); scene.add(glassKey);

  // ---- backboard: smoked acrylic on standoffs ----
  const board = new THREE.Mesh(new RoundedBoxGeometry(2.62, 2.62, .035, 3, .1), new THREE.MeshPhysicalMaterial({ color: 0x050407, roughness: .4, clearcoat: .35, clearcoatRoughness: .3, metalness: 0 }));
  board.position.set(0, 0, -.06); sign.add(board);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: .3 });
  [[-1.16, 1.16], [1.16, 1.16], [-1.16, -1.16], [1.16, -1.16]].forEach(([x, y]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .2, 16), steel); s.rotation.x = Math.PI / 2; s.position.set(x, y, -.16); sign.add(s); });

  // ---- their logo, as light layers ----
  const loader = new THREE.TextureLoader();
  const load = n => new Promise(res => loader.load(`${A}img/sign/${n}.webp`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
  const names = ['off', 'ring', 'rooster', 'jaw', 'flame', 'banner', 'co'];
  const tex = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n)])));
  const circuits = {};
  const layer = (n, z) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex[n], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0x000000 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat); m.position.z = z; sign.add(m);
    circuits[n] = { mats: [mat], level: 0, flick: 0, gain: 1.05 };
    return m;
  };
  layer('off', -.03); circuits.off.level = 1; circuits.off.gain = 1;
  ['ring', 'rooster', 'flame', 'banner', 'co'].forEach((n, i) => layer(n, -.02 + i * .001));
  const jaw = layer('jaw', -.012);
  // a dim red glow inside the mouth, only seen when the beak opens
  const mouthC = document.createElement('canvas'); mouthC.width = 128; mouthC.height = 64;
  { const g = mouthC.getContext('2d'), gr = g.createRadialGradient(64, 32, 2, 64, 32, 60); gr.addColorStop(0, 'rgba(255,60,80,1)'); gr.addColorStop(1, 'rgba(255,60,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); }
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.17, .085), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mouthC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
  mouth.position.set((299 - 300) * PX, (300 - 279) * PX, -.015); sign.add(mouth);

  // ---- speech bubble: neon tube outline + lettering ----
  const glassOff = new THREE.Color(0x6a6474);
  const bubMat = new THREE.MeshStandardMaterial({ color: glassOff.clone(), emissive: new THREE.Color(0x3be8ff), emissiveIntensity: 0, roughness: .22, metalness: .1 });
  circuits.bubble = { mats: [], tube: bubMat, level: 0, flick: 0 };
  const tube = (pts, closed, r, parent) => { const c = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', .2); const m = new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 14, r, 10, closed), bubMat); parent.add(m); return m; };
  const rr = (w, h, r) => { const p = [], k = 6, arc = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + i / k * Math.PI / 2; p.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } };
    arc(w / 2 - r, h / 2 - r, 0); arc(-w / 2 + r, h / 2 - r, Math.PI / 2); arc(-w / 2 + r, -h / 2 + r, Math.PI); arc(w / 2 - r, -h / 2 + r, Math.PI * 1.5); return p; };
  const bubble = new THREE.Group(); sign.add(bubble);
  const bw = 1.12, bh = .44;
  bubble.position.set(SMALL ? .62 : 1.32, SMALL ? 1.42 : .98, .06);
  tube(rr(bw, bh, .14), true, .016, bubble);
  tube(SMALL ? [V(-.3, -bh / 2), V(-.48, -.44), V(-.14, -bh / 2)] : [V(-bw / 2 + .1, -bh / 2 + .03), V(-bw / 2 - .22, -.42), V(-bw / 2 + .32, -bh / 2)], false, .016, bubble);
  function glowText(text, color, size = 160) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${size}px "Lilita One", Impact, sans-serif`;
    while (g.measureText(text).width > 470 && size > 30) { size -= 6; g.font = `${size}px "Lilita One", Impact, sans-serif`; }
    g.shadowColor = color; [[30, .55], [14, .85], [5, 1]].forEach(([b, a]) => { g.shadowBlur = b; g.globalAlpha = a; g.fillStyle = color; g.fillText(text, 256, 140); });
    g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(text, 256, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const word = (text, color, w, x, name) => {
    const mat = new THREE.MeshBasicMaterial({ map: glowText(text, color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0x000000 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), mat); m.position.set(x, 0, .01); bubble.add(m);
    circuits[name] = { mats: [mat], level: 0, flick: 0, gain: 1.1 };
  };
  word('BATTER', '#3be8ff', .64, -.17, 'say1');
  word('UP!', '#ff2a4a', .44, .33, 'say2');

  // wall wash from the sign
  const washPink = new THREE.PointLight(0xff2f9e, 0, 6, 1.6); washPink.position.set(-1.6, -1.4, .9); scene.add(washPink);
  const washCyan = new THREE.PointLight(0x3be8ff, 0, 6, 1.6); washCyan.position.set(1.6, 1.5, .9); scene.add(washCyan);

  // ---- state ----
  let jawOpen = 0;
  const lit = new THREE.Color(0x3be8ff);
  function apply(t) {
    // the jaw is on the rooster's circuit
    circuits.jaw.level = circuits.rooster.level; circuits.jaw.flick = circuits.rooster.flick;
    for (const k in circuits) {
      const c = circuits[k]; let L = c.level;
      if (c.flick > 0) L *= (Math.random() < .5 ? .05 : 1) * (.6 + Math.random() * .4);
      c.mats.forEach(m => m.color.setScalar(L * (c.gain || 1)));
      if (c.tube) { c.tube.emissiveIntensity = L * 1.7; c.tube.color.copy(glassOff).lerp(lit, L * .5); }
    }
    washPink.intensity = (circuits.ring.level * .5 + circuits.banner.level * .5) * 1.4;
    washCyan.intensity = (circuits.rooster.level * .6 + circuits.ring.level * .4) * 1.1;
    jaw.position.y = -jawOpen * 22 * PX;
    mouth.material.opacity = jawOpen * .75 * circuits.rooster.level; mouth.scale.set(1, .4 + jawOpen * 1.5, 1);
    sign.position.y = Math.sin(t * .8) * .004;
  }

  // ---- sequencer ----
  let steps = [], cur = null, curT = 0, t0 = 0;
  const step = (d, fn, done) => ({ d, fn, done });
  const run = l => { steps = l; cur = null; };
  const queue = l => { steps.push(...l); };
  const powerUp = (ns, d = .9) => step(d, t => { ns.forEach(n => { const c = circuits[n]; c.flick = t < .82 ? 1 : 0; c.level = t < .82 ? (Math.random() < t * 1.15 ? 1 : .08) : 1; }); }, () => ns.forEach(n => { circuits[n].flick = 0; circuits[n].level = 1; }));
  const jawTo = (v, d) => { let from; return step(d, t => { if (from === undefined) from = jawOpen; jawOpen = from + (v - from) * (1 - Math.pow(1 - t, 2)); }); };
  const set = (n, v) => step(0, () => { circuits[n].level = v; });
  function talk() {
    queue([
      set('say1', 0), set('say2', 0), set('bubble', 1),
      jawTo(1, .1), set('say1', 1), jawTo(.1, .1),
      jawTo(.85, .1), jawTo(.05, .12), step(.12, () => {}),
      jawTo(1, .12), set('say2', 1), step(.34, () => {}), jawTo(0, .18),
      step(1.8, () => {}),
      step(.45, t => { circuits.say1.level = circuits.say2.level = circuits.bubble.level = 1 - t; })
    ]);
    start();
  }
  function glitch(n) {
    n = n || ['ring', 'rooster', 'banner', 'flame', 'co'][Math.random() * 5 | 0];
    queue([step(.45, () => { circuits[n].flick = 1; }, () => { circuits[n].flick = 0; })]); start();
  }
  function intro() {
    run([
      step(.6, () => {}),
      powerUp(['ring'], 1.1),
      powerUp(['rooster'], 1),
      powerUp(['banner'], .8),
      powerUp(['co'], .5),
      powerUp(['flame'], .5),
      step(.35, () => {})
    ]);
    talk();
  }

  // ---- camera + bloom ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .4, .62); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let tx = 0, ty = 0, rx = 0, ry = 0;
  const offX = o.offsetX ?? (SMALL ? 0 : -1.7);
  const placeCam = () => {
    const D = (SMALL ? 4.9 : 7.4) * (o.zoom || 1);
    camera.position.set(offX + rx * .5, (SMALL ? .12 : 0) + ry * .3, D); camera.lookAt(offX * .55, SMALL ? .15 : 0, 0);
  };
  if (FINE) addEventListener('pointermove', e => { if (canvas.getBoundingClientRect().bottom < 0) return; tx = e.clientX / innerWidth - .5; ty = -(e.clientY / innerHeight - .5); }, { passive: true });
  const resize = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w / 2, h / 2); camera.aspect = w / h; camera.fov = w / h < 1 ? 44 : 32; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- loop ----
  let visible = true, last = performance.now(), raf = 0, nextGlitch = 6, nextTalk = 10;
  function advance(dt) {
    while (true) {
      if (!cur) { cur = steps.shift(); curT = 0; if (!cur) break; }
      const d = RM ? 0 : cur.d; curT += dt;
      const p = d ? clamp(curT / d) : 1; cur.fn(p, dt);
      if (p >= 1) { cur.done && cur.done(); cur = null; if (RM || !d) continue; }
      break;
    }
  }
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .1); last = now; t0 += dt;
    advance(dt);
    if (!RM && !cur && !steps.length) {
      nextGlitch -= dt; nextTalk -= dt;
      if (nextGlitch <= 0) { nextGlitch = 5 + Math.random() * 6; glitch(); }
      if (nextTalk <= 0) { nextTalk = 12; talk(); }
    }
    apply(t0);
    rx += (tx - rx) * .05; ry += (ty - ry) * .05; sign.rotation.y = rx * .12; sign.rotation.x = -ry * .06; placeCam();
    composer.render();
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('click', () => { if (!steps.length) talk(); });

  if (RM) { for (const k in circuits) circuits[k].level = 1; } else intro();
  placeCam(); start();
  return { talk, glitch, renderer, circuits };
}
