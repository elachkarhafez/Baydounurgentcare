/* =====================================================================
   Med2Med: "Your lecture in. A full study pack out."
   A sneaker-drop unboxing in real 3D. A black pack box with a lime
   interior and a shoebox-style end label. Scroll (setProgress 0 → 1):
     the lid lifts and leans behind the box as a backdrop, then the four
     things in a pack rise out one by one and settle in a fan:
       Anki deck (fanned cards) · one-page summary · study guide · phone
       with the practice questions on screen.
   Paper/print surfaces are CanvasTextures drawn at boot with the page fonts.
   Transparent canvas + ShadowMaterial catcher, studio HDRI, pointer drift
   on fine pointers, renders only while visible.
   Bundle: kit/build3d/build.sh med2med/src/unbox.js med2med/assets/unbox.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => 1 - Math.pow(1 - t, 3);
const back = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const INK = '#121316', LIME = '#d4f53c', PAPER = '#fbfaf6', RED = '#e5483d', MUTED = '#6b6e76';
const F = { d: '"Unbounded", system-ui, sans-serif', t: '"Geist", system-ui, sans-serif', m: '"JetBrains Mono", ui-monospace, monospace' };

function tex(w, h, draw, renderer) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test; }
  if (line) g.fillText(line, x, y); return y + lh;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function lines(g, x, y, w, n, gap, col = '#d9d7d0') { g.fillStyle = col; for (let i = 0; i < n; i++) { const ww = w * (i % 3 === 2 ? .62 : .94); rr(g, x, y + i * gap, ww, gap * .32, gap * .16); g.fill(); } }

export async function mountUnbox(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 100);

  const envP = new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  try { await Promise.race([Promise.all(['800 40px Unbounded', '700 40px Geist', '600 40px Geist', '500 40px Geist', '500 20px "JetBrains Mono"', '600 20px "JetBrains Mono"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  const env = await envP;
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .8; }

  const key = new THREE.DirectionalLight(0xfff6ea, 2.4); key.position.set(3.5, 7, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: .5, far: 30 }); key.shadow.bias = -.0005; key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xe8f0ff, 1.1); rim.position.set(-4, 3.5, -5);
  const fill = new THREE.HemisphereLight(0xffffff, 0xe7e4dc, .7);
  scene.add(key, key.target, rim, fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const R = renderer;

  // ---------- printed surfaces ----------
  const lidTex = tex(1230, 830, (g, w, h) => {
    g.fillStyle = INK; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; for (let x = -h; x < w; x += 34) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
    g.fillStyle = LIME; g.font = `800 178px ${F.d}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MED2MED', w / 2, h * .46);
    g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `500 34px ${F.t}`; g.fillText('Built by a med student, for med students.', w / 2, h * .66);
    g.font = `500 24px ${F.m}`; g.fillStyle = 'rgba(255,255,255,.5)'; g.textAlign = 'left'; g.fillText('STUDY PACK', 54, 70); g.textAlign = 'right'; g.fillText('DROP 01', w - 54, 70);
  }, R);
  const labelTex = tex(900, 360, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    g.fillStyle = INK; g.font = `800 50px ${F.d}`; g.fillText('MED2MED', 34, 76);
    g.font = `500 22px ${F.m}`; g.fillStyle = MUTED;
    [['STYLE', 'STUDY PACK'], ['SIZE', '1 LECTURE'], ['INCL', 'DECK · SUMMARY · GUIDE · Qs'], ['ACCESS', '30 DAYS INCLUDED']].forEach(([k, v], i) => { g.fillStyle = MUTED; g.fillText(k, 34, 140 + i * 46); g.fillStyle = INK; g.fillText(v, 170, 140 + i * 46); });
    let x = 640; g.fillStyle = INK; for (let i = 0; i < 46; i++) { const bw = [2, 3, 5][(i * 7) % 3]; g.fillRect(x, 96, bw, 170); x += bw + 2 + (i % 4 === 0 ? 3 : 0); }
    g.font = `500 18px ${F.m}`; g.fillText('M2M-0001-SP', 652, 300);
    g.fillStyle = LIME; g.fillRect(w - 70, 0, 70, h);
  }, R);
  const cardFront = tex(800, 520, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = MUTED; g.font = `500 22px ${F.m}`; g.fillText('GLYCOLYSIS · CARD 14', 40, 56);
    g.fillStyle = LIME; rr(g, w - 170, 30, 130, 38, 19); g.fill(); g.fillStyle = INK; g.font = `600 20px ${F.m}`; g.textAlign = 'center'; g.fillText('ANKI', w - 105, 56);
    g.textAlign = 'center'; g.fillStyle = INK; g.font = `600 42px ${F.t}`;
    wrap(g, 'Which enzyme catalyzes the committed step of glycolysis?', w / 2, 200, w - 120, 56);
    g.setLineDash([10, 10]); g.strokeStyle = '#c9c7c0'; g.lineWidth = 3; g.beginPath(); g.moveTo(80, 380); g.lineTo(w - 80, 380); g.stroke(); g.setLineDash([]);
    g.fillStyle = MUTED; g.font = `500 26px ${F.t}`; g.fillText('Show answer', w / 2, 440);
  }, R);
  const cardBlank = tex(400, 260, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); lines(g, 60, 90, w - 120, 3, 34, '#e6e4de'); }, R);
  const onePager = tex(850, 1100, (g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    g.fillStyle = INK; g.fillRect(0, 0, w, 120); g.fillStyle = LIME; g.font = `800 34px ${F.d}`; g.fillText('ONE-PAGE SUMMARY', 44, 74);
    g.fillStyle = INK; g.font = `700 44px ${F.t}`; g.fillText('Carbohydrate Metabolism', 44, 200); g.fillText('Basics', 44, 252);
    const boxes = [['Regulated steps', 'PFK-1 = committed step'], ['Bypasses', 'F-1,6-BPase reverses PFK-1'], ['Fasting liver', 'Acetyl-CoA → pyruvate carboxylase'], ['High yield', 'F-2,6-BP turns PFK-1 on']];
    boxes.forEach(([t, s], i) => {
      const x = 44 + (i % 2) * 390, y = 310 + Math.floor(i / 2) * 330;
      g.strokeStyle = '#d9d6cf'; g.lineWidth = 3; rr(g, x, y, 370, 300, 16); g.stroke();
      g.fillStyle = INK; g.font = `700 28px ${F.t}`; g.fillText(t, x + 24, y + 52);
      g.fillStyle = 'rgba(212,245,60,.75)'; g.fillRect(x + 20, y + 76, Math.min(330, g.measureText(s).width * .82 + 30), 36);
      g.fillStyle = INK; g.font = `500 22px ${F.t}`; g.fillText(s, x + 24, y + 102);
      lines(g, x + 24, y + 140, 320, 4, 36);
    });
    g.fillStyle = MUTED; g.font = `500 20px ${F.m}`; g.fillText('MED2MED · SAMPLE', 44, h - 50);
  }, R);
  const guideCover = tex(800, 1100, (g, w, h) => {
    g.fillStyle = '#f2efe7'; g.fillRect(0, 0, w, h);
    g.fillStyle = LIME; g.fillRect(0, 0, w, 330);
    g.fillStyle = INK; g.font = `800 64px ${F.d}`; g.fillText('STUDY', 50, 150); g.fillText('GUIDE', 50, 232);
    g.font = `500 24px ${F.m}`; g.fillText('SLIDE BY SLIDE', 52, 296);
    g.font = `700 40px ${F.t}`; g.fillText('Carbohydrate', 50, 430); g.fillText('Metabolism Basics', 50, 482);
    for (let i = 0; i < 3; i++) {
      const y = 560 + i * 150; g.fillStyle = '#fff'; rr(g, 50, y, 200, 120, 10); g.fill(); g.strokeStyle = '#d9d6cf'; g.lineWidth = 2; g.stroke();
      g.fillStyle = MUTED; g.font = `500 18px ${F.m}`; g.fillText('SLIDE ' + (3 + i * 2), 66, y + 34);
      lines(g, 280, y + 14, 460, 3, 34);
    }
    g.fillStyle = INK; g.font = `800 26px ${F.d}`; g.fillText('MED2MED', 50, h - 50);
  }, R);
  const phoneTex = tex(500, 1020, (g, w, h) => {
    g.fillStyle = '#0d0e11'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 22px ${F.t}`; g.fillText('9:41', 46, 58);
    g.fillStyle = LIME; g.font = `600 20px ${F.m}`; g.fillText('TUTOR · Q1 OF 20', 40, 130);
    g.fillStyle = '#fff'; g.font = `600 30px ${F.t}`;
    let y = wrap(g, 'Which enzyme catalyzes the committed, rate-limiting step of glycolysis?', 40, 186, w - 80, 40);
    const opts = ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'G3P dehydrogenase', 'Aldolase'];
    y += 20;
    opts.forEach((t, i) => {
      const on = i === 1;
      g.fillStyle = on ? LIME : 'rgba(255,255,255,.07)'; rr(g, 34, y, w - 68, 76, 16); g.fill();
      g.fillStyle = on ? INK : 'rgba(255,255,255,.85)'; g.font = `600 22px ${F.m}`; g.fillText('ABCDE'[i], 58, y + 47);
      g.font = `500 24px ${F.t}`; g.fillText(t, 100, y + 47); if (on) { g.font = `700 28px ${F.t}`; g.fillText('✓', w - 80, y + 48); }
      y += 90;
    });
    g.fillStyle = 'rgba(255,255,255,.45)'; g.font = `500 20px ${F.t}`; g.fillText('From slide 3 · explanation below', 40, y + 30);
  }, R);
  phoneTex.anisotropy = 4;

  // ---------- materials ----------
  const boxMat = new THREE.MeshPhysicalMaterial({ color: 0x17181c, roughness: .62, sheen: .4, sheenColor: 0x444a55, clearcoat: .12, clearcoatRoughness: .5 });
  const limeMat = new THREE.MeshPhysicalMaterial({ color: 0xc8eb2e, roughness: .82, sheen: .5, sheenColor: 0xf4ffb0 });
  const lidTop = new THREE.MeshPhysicalMaterial({ map: lidTex, roughness: .58, clearcoat: .15, clearcoatRoughness: .45 });
  const paperMat = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: .9, sheen: .3 });
  const mapMat = (map, extra = {}) => new THREE.MeshPhysicalMaterial({ map, roughness: .78, sheen: .25, ...extra });

  // ---------- box (base: bottom + 4 walls, lime inside) ----------
  const W = 2.4, D = 1.6, H = .86, T = .045;
  const base = new THREE.Group(); scene.add(base);
  const slab = (w, h, d, mats) => cast(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .012), mats));
  // material order: +x, -x, +y, -y, +z, -z
  const wall = (w, h, d, inside) => { const m = [boxMat, boxMat, boxMat, boxMat, boxMat, boxMat]; m[inside] = limeMat; return slab(w, h, d, m); };
  const bottom = slab(W, T, D, [boxMat, boxMat, limeMat, boxMat, boxMat, boxMat]); bottom.position.y = T / 2; base.add(bottom);
  const wf = wall(W, H, T, 5); wf.position.set(0, H / 2, D / 2 - T / 2); base.add(wf);
  const wb = wall(W, H, T, 4); wb.position.set(0, H / 2, -D / 2 + T / 2); base.add(wb);
  const wl = wall(T, H, D - 2 * T, 0); wl.position.set(-W / 2 + T / 2, H / 2, 0); base.add(wl);
  const wr = wall(T, H, D - 2 * T, 1); wr.position.set(W / 2 - T / 2, H / 2, 0); base.add(wr);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .42), mapMat(labelTex, { roughness: .6 }));
  label.position.set(W / 2 - .66, H * .5, D / 2 + .002); base.add(label);

  // ---------- lid (top + skirts), pivot at its centre ----------
  const LW = W + .07, LD = D + .07, LS = .24;
  const lid = new THREE.Group(); scene.add(lid);
  const top = slab(LW, T, LD, [boxMat, boxMat, lidTop, limeMat, boxMat, boxMat]); lid.add(top);
  const sk = (w, d, x, z, inside) => { const m = wall(w, LS, d, inside); m.position.set(x, -LS / 2 + T / 2, z); lid.add(m); };
  sk(LW, T, 0, LD / 2 - T / 2, 5); sk(LW, T, 0, -LD / 2 + T / 2, 4); sk(T, LD - 2 * T, -LW / 2 + T / 2, 0, 0); sk(T, LD - 2 * T, LW / 2 - T / 2, 0, 1);

  // ---------- the four items ----------
  const items = [];
  // 1. Anki deck: fanned cards
  const deck = new THREE.Group(); const cards = [];
  for (let i = 0; i < 6; i++) {
    const front = i === 5 ? cardFront : cardBlank;
    const c = slab(1.0, .65, .012, [paperMat, paperMat, paperMat, paperMat, mapMat(front, { roughness: .55, clearcoat: .2 }), paperMat]);
    c.userData.i = i; deck.add(c); cards.push(c);
  }
  // 2. one-pager
  const sheet = slab(.85, 1.1, .01, [paperMat, paperMat, paperMat, paperMat, mapMat(onePager), paperMat]);
  const sheetG = new THREE.Group(); sheetG.add(sheet);
  // 3. study guide booklet
  const guide = slab(.8, 1.1, .07, [paperMat, limeMat, paperMat, paperMat, mapMat(guideCover), paperMat]);
  const guideG = new THREE.Group(); guideG.add(guide);
  // 4. phone
  const phoneG = new THREE.Group();
  const body = cast(new THREE.Mesh(new RoundedBoxGeometry(.52, 1.06, .06, 4, .05), new THREE.MeshPhysicalMaterial({ color: 0x2a2c31, metalness: .85, roughness: .28, clearcoat: 1, clearcoatRoughness: .08 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.47, .99), new THREE.MeshPhysicalMaterial({ map: phoneTex, emissive: 0xffffff, emissiveMap: phoneTex, emissiveIntensity: .55, roughness: .08, clearcoat: 1, clearcoatRoughness: .02 }));
  screen.position.z = .031; phoneG.add(body, screen);

  // start: lying flat inside the box (face up), stacked; end: fanned in front of the lid backdrop
  const UP = -Math.PI / 2;
  const defs = [
    { g: deck, name: 'deck', s: [.42, .30, .05, UP, 0, .12], e: [-1.62, 1.12, .62, -.08, .42, .05], win: [.24, .5], anchor: [0, .42, 0] },
    { g: sheetG, name: 'onepager', s: [-.5, .25, -.05, UP, 0, -.06], e: [-.6, 1.62, .06, -.04, .2, .06], win: [.36, .62], anchor: [0, .6, 0] },
    { g: guideG, name: 'guide', s: [.12, .18, .02, UP, 0, .04], e: [.48, 1.58, .02, -.04, -.08, -.05], win: [.48, .74], anchor: [0, .6, 0] },
    { g: phoneG, name: 'phone', s: [-.18, .1, .1, UP, 0, -.1], e: [1.55, 1.05, .7, -.06, -.3, -.04], win: [.6, .86], anchor: [0, .58, 0] },
  ];
  defs.forEach(d => { scene.add(d.g); d.g.traverse(m => { if (m.isMesh) cast(m); }); items.push(d); });

  // lid poses: on the box → lifted → leaning behind the box like a backdrop
  const LID0 = [0, H + T / 2 + .005, 0, 0], LID1 = [0, .9, -1.25, Math.PI / 2 - .1];

  // ---------- camera ----------
  const tgt = new THREE.Vector3();
  let aspect = 1, p = 0, pGoal = 0, drift = { x: 0, y: 0, gx: 0, gy: 0 };
  function size() {
    const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); dirty = true;
  }
  function placeCamera() {
    const narrow = aspect < 1.05;
    const fitW = narrow ? 5.2 / Math.max(.42, aspect) : 0;
    const d0 = narrow ? Math.max(10, fitW * 1.4) : 10.4, d1 = narrow ? Math.max(12.5, fitW * 2) : 13;
    const dist = lerp(d0, d1, ease(ss(.05, .7, p)));
    const el = lerp(.62, .22, ease(ss(0, .6, p))) + drift.y * .05;
    const az = lerp(.32, .12, ease(ss(.1, .8, p))) + drift.x * .12;
    tgt.set(0, lerp(.45, 1.15, ease(ss(.05, .7, p))), 0);
    camera.position.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tgt);
  }

  // ---------- pose for progress p ----------
  let clock = 0;
  function pose() {
    // lid
    const tl = ss(0, .26, p), swing = ease(ss(.3, 1, tl));
    lid.position.set(lerp(LID0[0], LID1[0], swing), lerp(LID0[1], LID1[1], swing) + Math.sin(Math.PI * clamp(tl * 1.1)) * 1.3 * (1 - swing * .3) , lerp(LID0[2], LID1[2], swing));
    lid.rotation.set(lerp(LID0[3], LID1[3], swing), 0, 0);
    // items
    for (const d of items) {
      const t = ss(d.win[0], d.win[1], p), ty = ease(ss(0, .55, t)), txz = back(ss(.2, 1, t)), tr = ease(ss(.15, 1, t));
      const s = d.s, e = d.e;
      const bob = t >= 1 ? Math.sin(clock * 1.2 + d.s[0] * 4) * .025 : 0;
      d.g.position.set(lerp(s[0], e[0], txz), lerp(s[1], e[1], ty) + Math.sin(Math.PI * t) * .35 + bob, lerp(s[2], e[2], txz));
      d.g.rotation.set(lerp(s[3], e[3], tr), lerp(s[4], e[4], tr) + (t >= 1 ? Math.sin(clock * .8 + s[1] * 9) * .03 : 0), lerp(s[5], e[5], tr));
    }
    // fan the cards as the deck arrives
    const tf = ease(ss(.4, .58, p));
    cards.forEach((c, i) => { const k = i - 2.5; c.position.set(k * .07 * tf, -Math.abs(k) * .02 * tf, i * .014); c.rotation.set(0, 0, -k * .13 * tf); });
  }

  // ---------- loop (only while visible) ----------
  let visible = true, dirty = true, last = performance.now(), raf = 0, settled = false;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  addEventListener('resize', () => { size(); kick(); });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    const k = 1 - Math.pow(.0015, dt);
    p += (pGoal - p) * k; if (Math.abs(pGoal - p) < .0004) p = pGoal;
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.02, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.02, dt));
    pose(); placeCamera(); renderer.render(scene, camera);
    const idle = p >= .86; // things bob once they've landed
    if (visible && !document.hidden && (p !== pGoal || idle || Math.abs(drift.gx - drift.x) > .002 || Math.abs(drift.gy - drift.y) > .002)) raf = requestAnimationFrame(frame);
  }

  size(); pose(); placeCamera();
  await renderer.compileAsync?.(scene, camera);
  renderer.render(scene, camera);
  kick();

  const v = new THREE.Vector3();
  return {
    renderer,
    setProgress(x, instant) { pGoal = clamp(x); if (instant) p = pGoal; kick(); },
    get progress() { return p; },
    // screen position (px, relative to the canvas) of each item's label anchor
    anchors() {
      const r = canvas.getBoundingClientRect();
      return items.map(d => { v.set(...d.anchor); d.g.localToWorld(v); v.project(camera); return { name: d.name, x: (v.x * .5 + .5) * r.width, y: (-v.y * .5 + .5) * r.height, t: ss(d.win[1] - .06, d.win[1] + .02, p) }; });
    },
  };
}
