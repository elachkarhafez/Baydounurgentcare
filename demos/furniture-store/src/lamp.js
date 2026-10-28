/* =====================================================================
   Lampwick Home (fictional concept): the lamp on its plinth.
   A turned ceramic table lamp with a brass neck and a linen drum shade is
   lowered onto a round walnut plinth, settles, then clicks on: the bulb
   warms up and the shade glows. Tap it and it switches off and back on
   with a small sway. Kit method: studio HDRI, physical materials, lathe
   geometry, shadow catcher on a transparent canvas, step sequencer,
   pointer drift, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh demos/furniture-store/src/lamp.js demos/furniture-store/assets/lamp.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const land = t => { t = clamp(t); if (t < .7) return easeInOut(t / .7); const k = (t - .7) / .3; return 1 + Math.sin(k * Math.PI) * .03 * (1 - k); };
const V2 = a => a.map(([x, y]) => new THREE.Vector2(x, y));

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...s) { q.push(...s); },
    get busy() { return !!(cur || q.length); },
    tick(dt) { for (let n = 0; n < 12; n++) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; else return; } },
  };
}

// walnut: long grain streaks on a warm brown
function woodTex(renderer) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#5a3520'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    const y = Math.random() * S, a = .05 + Math.random() * .12, w = .6 + Math.random() * 2.4;
    g.strokeStyle = Math.random() < .5 ? `rgba(30,14,6,${a})` : `rgba(150,96,58,${a})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin(x * .012 + i) * 6 + Math.sin(x * .05 + i * 3) * 1.5); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
// linen: a fine weave so the glow reads as fabric
function linenTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#efe6d4'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 2) { g.fillStyle = `rgba(120,96,60,${.04 + Math.random() * .06})`; g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2); return t;
}
function glowTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), h = S / 2;
  const rg = g.createRadialGradient(h, h, 0, h, h, h); rg.addColorStop(0, 'rgba(255,214,150,.9)'); rg.addColorStop(.35, 'rgba(255,190,110,.3)'); rg.addColorStop(1, 'rgba(255,180,100,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function mountLamp(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .9; }

  const key = new THREE.DirectionalLight(0xfff0d8, 2.2); key.position.set(-3.5, 8, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: .5, far: 20 }); key.shadow.radius = 6; key.shadow.bias = -.0006;
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.8); rim.position.set(4, 3.5, -5);
  const rim2 = new THREE.DirectionalLight(0x6fd0b0, .6); rim2.position.set(-5, 1.5, -3);
  const fill = new THREE.DirectionalLight(0xfff6ea, .45); fill.position.set(2, 1, 6);
  scene.add(key, key.target, rim, rim2, fill, new THREE.HemisphereLight(0xfff1dc, 0x0a1a14, .3));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .5, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ----- materials ----- */
  const wt = woodTex(renderer);
  const walnut = new THREE.MeshPhysicalMaterial({ map: wt, roughness: .42, clearcoat: .7, clearcoatRoughness: .25 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xe0b468, metalness: 1, roughness: .24, clearcoat: .5 });
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x1f5a4a, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, sheen: .3, sheenColor: new THREE.Color(0x9fe0c8) });
  const linen = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: linenTex(), roughness: .85, sheen: .6, sheenRoughness: .6, sheenColor: new THREE.Color(0xfff2dc), side: THREE.DoubleSide, emissive: new THREE.Color(0xffb062), emissiveIntensity: 0 });
  const bulbMat = new THREE.MeshPhysicalMaterial({ color: 0xfff6e6, roughness: .1, transmission: .6, thickness: .1, emissive: new THREE.Color(0xffc27a), emissiveIntensity: 0 });

  /* ----- the plinth: a turned walnut disc ----- */
  const plinth = new THREE.Group(); scene.add(plinth);
  const PR = 1.2, PH = .14;
  plinth.add(cast(new THREE.Mesh(new THREE.LatheGeometry(V2([[0, 0], [PR - .06, 0], [PR, .03], [PR + .01, PH - .05], [PR - .03, PH], [0, PH]]), 128), walnut)));

  /* ----- the lamp ----- */
  const lamp = new THREE.Group(), body = new THREE.Group(); lamp.add(body); scene.add(lamp);
  // brass foot ring, ceramic gourd body, brass neck and socket
  body.add(cast(new THREE.Mesh(new THREE.LatheGeometry(V2([[0, 0], [.36, 0], [.38, .03], [.36, .07], [.3, .08]]), 96), brass)));
  { const prof = new THREE.SplineCurve(V2([[.3, .08], [.42, .2], [.5, .38], [.52, .5], [.47, .66], [.34, .8], [.2, .9], [.13, .98], [.12, 1.04]])).getPoints(64); prof.push(new THREE.Vector2(0, 1.04));
    body.add(cast(new THREE.Mesh(new THREE.LatheGeometry(prof, 128), glaze))); }
  body.add(cast(new THREE.Mesh(new THREE.LatheGeometry(V2([[.15, 1.02], [.15, 1.08], [.05, 1.12], [.04, 1.4], [.07, 1.42], [.07, 1.52], [.05, 1.54]]), 64), brass)));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 20), bulbMat); bulb.scale.y = 1.15; bulb.position.y = 1.68; body.add(bulb);
  // harp: two thin brass bows up to the finial
  for (const s of [1, -1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(s * Math.sin(t * Math.PI) * .26, 1.46 + t * .5, 0)); }
    body.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .012, 6), brass)));
  }
  const fin = cast(new THREE.Mesh(new THREE.SphereGeometry(.045, 20, 14), brass)); fin.position.y = 2.0; body.add(fin);
  // drum shade, slightly tapered, with brass trim at both rims
  const SB = .78, ST = .62, SY0 = 1.4, SY1 = 2.0;
  const shade = cast(new THREE.Mesh(new THREE.LatheGeometry(V2([[SB, SY0], [ST, SY1]]), 128, 0, Math.PI * 2), linen)); body.add(shade);
  for (const [r, y] of [[SB, SY0], [ST, SY1]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .014, 8, 128), brass); t.rotation.x = Math.PI / 2; t.position.y = y; body.add(t); }
  // pull chain
  const chain = new THREE.Group(); chain.position.set(.09, 1.5, .05); body.add(chain);
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), brass); b.position.y = -i * .028; chain.add(b); }
  const pull = cast(new THREE.Mesh(new THREE.CylinderGeometry(.018, .026, .07, 16), brass)); pull.position.y = -.27; chain.add(pull);

  // the light itself: a warm point light inside the shade and a soft halo
  const bulbLight = new THREE.PointLight(0xffb468, 0, 6, 1.6); bulbLight.position.y = 1.68; body.add(bulbLight);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  halo.scale.set(3.6, 2.8, 1); halo.position.y = 1.7; body.add(halo);
  let glow = 0, glowT = 0;
  const setGlow = g => { glow = g; bulbLight.intensity = g * 7; linen.emissiveIntensity = g * .35; bulbMat.emissiveIntensity = g * 3; halo.material.opacity = g * .8; };

  /* ----- camera ----- */
  const target = new THREE.Vector3(0, 1.02, 0);
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const needW = 3.0, needH = 2.85;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const distH = needH / 2 / Math.tan(vf / 2), distW = needW / 2 / Math.tan(vf / 2) / aspect;
    const dist = Math.max(distH, distW) * 1.04, el = .22;
    camera.position.set(0, target.y + Math.sin(el) * dist, Math.cos(el) * dist);
    camera.lookAt(target); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  /* ----- motion ----- */
  const seq = sequencer();
  const REST = PH, HIGH = REST + 2.6;
  let spin = -.5, sway = 0, squish = 0, chainPull = 0;
  lamp.position.y = RM ? REST : HIGH;
  const click = d => ({ d, run: k => { chainPull = Math.sin(k * Math.PI) * .09; } });
  if (!RM) {
    seq.push(
      { d: .3 },
      { d: 1.2, run: k => { lamp.position.y = lerp(HIGH, REST, land(k)); squish = k > .62 ? Math.sin((k - .62) / .38 * Math.PI) : 0; spin = -.5 + easeOut(k) * .5; } },
      { run: () => { squish = 0; } },
      { d: .25 },
      click(.3),
      { d: .7, run: k => { setGlow(easeOut(k) * (1 - .25 * Math.sin(k * 18) * (1 - k))); } },
      { run: () => { setGlow(1); o.onLanded && o.onLanded(); } },
    );
  } else { setGlow(1); o.onLanded && o.onLanded(); }

  function toggle() {
    if (seq.busy || RM) return;
    seq.push(
      click(.28),
      { d: .25, run: k => { setGlow(1 - k); } },
      { d: .55, run: k => { sway = Math.sin(k * Math.PI * 2) * (1 - k) * .05; } },
      click(.28),
      { d: .6, run: k => { setGlow(easeOut(k)); } },
    );
  }
  canvas.addEventListener('click', toggle);

  let px = 0, py = 0, tx = 0, ty = 0;
  if (FINE && !RM) addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  let visible = true, last = performance.now(), raf = 0, time = 0;
  function loop(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    seq.tick(dt);
    px += (tx - px) * .05; py += (ty - py) * .05;
    lamp.rotation.y = spin + px * .25 + (RM ? 0 : Math.sin(time * .35) * .08);
    body.rotation.x = py * .03; body.rotation.z = sway - px * .02;
    chain.position.y = 1.5 - chainPull;
    plinth.scale.set(1, 1 - squish * .04, 1);
    if (glow > 0 && !seq.busy && !RM) { glowT += dt; bulbLight.intensity = glow * (7 + Math.sin(glowT * 2.1) * .15); }
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return { toggle };
}
