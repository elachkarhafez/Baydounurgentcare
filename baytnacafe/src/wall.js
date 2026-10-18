/* =====================================================================
   Baytna Cafe: the slushie wall.
   A long granite counter with 18 slushie bowls (9 double machines),
   each churning its own colour, with a handwritten flavour card on top
   like the ones in the shop. Scroll slides the camera down the counter;
   tap a bowl and the cup rides over, the lever drops and a layer pours
   in (up to four). At the end of the counter the cup gets its dome lid
   and straw. Built with the kit method: studio HDRI, physical materials,
   lathe-turned cup and dome, shadow catcher on a transparent canvas,
   a small step sequencer, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh baytnacafe/src/wall.js baytnacafe/assets/wall.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
let seed = 5; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...steps) { q.push(...steps); },
    get busy() { return !!(cur || q.length); },
    tick(dt) {
      for (let n = 0; n < 12; n++) {
        if (!cur) { cur = q.shift(); t = 0; if (!cur) return; cur.start && cur.start(); }
        t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k);
        if (k >= 1) cur = null; else return;
      }
    },
  };
}

// bowl and spacing
const SPZ = .86, BW = .92, BH = 1.28, BD = 1.0, GAP = .16, PAIR = .42, BASE_H = .56;
export function bowlX(i) { const u = Math.floor(i / 2); return u * (2 * (BW + GAP) + PAIR) + (i % 2) * (BW + GAP); }

export async function mountWall(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const flavors = o.flavors;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const mobile = innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .85; }
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(-3, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 1024); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 4, bottom: -3, near: .5, far: 30 }); key.shadow.radius = 4; key.shadow.bias = -.0006;
  const rim = new THREE.DirectionalLight(0xffd9b0, 1.1); rim.position.set(4, 4, -6);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfffaf0, 0xc79a6a, .55));
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ----- counter: dark speckled granite, like theirs ----- */
  const LAST = bowlX(flavors.length - 1), END = LAST + 3.4, START = -2.2;
  const gran = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#2b2622'; g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 9000; i++) { g.fillStyle = ['#4a423b', '#1a1714', '#6b5f53', '#8a7b6b', '#3a332d'][i % 5]; g.globalAlpha = rnd(.3, .9); g.fillRect(rnd(0, 1024), rnd(0, 256), rnd(1, 3.5), rnd(1, 3.5)); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1); return t;
  })();
  const counterLen = END - START + 8;
  const counter = cast(new THREE.Mesh(new RoundedBoxGeometry(counterLen, .18, 3.2, 3, .04), new THREE.MeshPhysicalMaterial({ map: gran, roughness: .28, clearcoat: .8, clearcoatRoughness: .2 })));
  counter.position.set(START + counterLen / 2 - 3, -.09, .7); scene.add(counter);
  const front = new THREE.Mesh(new THREE.BoxGeometry(counterLen, 1.6, .1), new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: .7 }));
  front.position.set(counter.position.x, -.98, 2.3); scene.add(front);

  /* ----- shared materials ----- */
  const bandTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const y = i * 16 + rnd(-4, 4); const grd = g.createLinearGradient(0, y - 10, 0, y + 10); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, 'rgba(0,0,0,' + rnd(.08, .2) + ')'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.save(); g.translate(128, y); g.rotate(-.35); g.fillRect(-200, -10, 400, 20); g.restore(); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.15, .5)})`; g.fillRect(rnd(0, 256), rnd(0, 256), rnd(1, 2.5), rnd(1, 2.5)); } // ice crystals
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .06, metalness: 0, transmission: mobile ? 0 : .92, thickness: .08, transparent: true, opacity: mobile ? .22 : 1, ior: 1.45, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f4f0, roughness: .35, clearcoat: .6 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: .35, clearcoat: .5 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc0, metalness: 1, roughness: .3 });
  const bowlGeo = new RoundedBoxGeometry(BW, BH, BD, 4, .2);
  const slushGeo = new RoundedBoxGeometry(BW - .1, BH * .74, BD - .1, 4, .16);
  const baseGeo = new RoundedBoxGeometry(2 * BW + GAP + .12, BASE_H, BD + .12, 3, .06);
  const lidGeo = new RoundedBoxGeometry(BW + .02, .16, BD + .02, 3, .07);

  function sign(text, hex) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#fffdf8'; g.beginPath(); g.roundRect(8, 8, 368, 240, 36); g.fill();
    g.strokeStyle = '#e8461f'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#e8461f'; g.font = '600 30px Fredoka, Arial'; g.textAlign = 'center'; g.fillText('Baytna', 192, 62);
    g.fillStyle = hex; g.font = `600 ${text.length > 11 ? 50 : 62}px Fredoka, "Marker Felt", "Comic Sans MS", cursive`;
    const words = text.split(' '); if (words.length > 1 && text.length > 10) { g.fillText(words[0], 192, 140); g.fillText(words.slice(1).join(' '), 192, 200); } else g.fillText(text, 192, 168);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  /* ----- the machines ----- */
  const bowls = [];
  for (let i = 0; i < flavors.length; i++) {
    const f = flavors[i], x = bowlX(i), g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
    if (i % 2 === 0) { const b = cast(new THREE.Mesh(baseGeo, white)); b.position.set(x + (BW + GAP) / 2, BASE_H / 2, 0); scene.add(b); const tray = new THREE.Mesh(new THREE.BoxGeometry(2 * BW + GAP - .1, .05, .32), black); tray.position.set(x + (BW + GAP) / 2, BASE_H - .01, .58); scene.add(tray); }
    const col = new THREE.Color(f.c);
    const slushMat = new THREE.MeshPhysicalMaterial({ color: col, map: bandTex, roughness: .5, sheen: .6, sheenColor: col.clone().lerp(new THREE.Color(0xffffff), .5), emissive: col, emissiveIntensity: .06, clearcoat: .3 });
    const slush = new THREE.Mesh(slushGeo, slushMat); slush.position.y = BASE_H + .05 + BH * .74 / 2; g.add(slush);
    const bowl = new THREE.Mesh(bowlGeo, glass); bowl.position.y = BASE_H + BH / 2; bowl.renderOrder = 2; g.add(bowl);
    const lid = cast(new THREE.Mesh(lidGeo, white)); lid.position.y = BASE_H + BH + .06; g.add(lid);
    // auger collar
    const col2 = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .1, 20), steel); col2.rotation.x = Math.PI / 2; col2.position.set(0, BASE_H + .5, -BD / 2 - .02); g.add(col2);
    // spigot + lever
    const arm = cast(new THREE.Mesh(new RoundedBoxGeometry(.16, .12, .4, 2, .04), black)); arm.position.set(0, BASE_H + .16, BD / 2 + .12); g.add(arm);
    const spout = cast(new THREE.Mesh(new THREE.CylinderGeometry(.07, .055, .2, 16), black)); spout.position.set(0, BASE_H + .06, SPZ); g.add(spout);
    const lever = new THREE.Group(); lever.position.set(0, BASE_H + .22, SPZ + .06); g.add(lever);
    const lv = cast(new THREE.Mesh(new RoundedBoxGeometry(.12, .5, .1, 2, .04), black)); lv.position.y = .2; lever.add(lv);
    // the flavour card
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.74, .49), new THREE.MeshStandardMaterial({ map: sign(f.n, f.ink || f.c), roughness: .6 }));
    card.position.set(0, BASE_H + BH + .42, .1); card.rotation.x = -.12; g.add(card);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(.04, .3, .04), white); stand.position.set(0, BASE_H + BH + .2, .05); g.add(stand);
    bowl.userData.i = i; slush.userData.i = i; card.userData.i = i;
    bowls.push({ g, slush, slushMat, lever, x, f, hit: [bowl, slush, card], ph: rnd(0, 6) });
  }

  /* ----- the cup (lathe), its layers, dome lid and straw ----- */
  const CUP_H = .62, R0 = .15, R1 = .21;
  const cup = new THREE.Group(); scene.add(cup);
  const cupProf = []; for (let i = 0; i <= 12; i++) { const t = i / 12; cupProf.push(new THREE.Vector2(lerp(R0, R1, t), t * CUP_H)); }
  const cupWall = new THREE.Mesh(new THREE.LatheGeometry(cupProf, 48), glass); cupWall.renderOrder = 3; cup.add(cupWall);
  const cupBase = new THREE.Mesh(new THREE.CircleGeometry(R0, 32), glass); cupBase.rotation.x = -Math.PI / 2; cup.add(cupBase);
  const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(.26, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .25, depthWrite: false })); shadowBlob.rotation.x = -Math.PI / 2; shadowBlob.position.y = .003; cup.add(shadowBlob);
  const layers = [];
  const LAYER_H = (CUP_H - .06) / 4;
  function layerGeo(k) { const y0 = .01 + k * LAYER_H, y1 = y0 + LAYER_H, r = y => lerp(R0, R1, y / CUP_H) - .012; const gg = new THREE.CylinderGeometry(r(y1), r(y0), LAYER_H, 40); gg.translate(0, LAYER_H / 2, 0); return { gg, y0 }; }
  const dome = new THREE.Group(); cup.add(dome); dome.visible = false;
  const domeProf = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; domeProf.push(new THREE.Vector2(Math.cos(a) * (R1 + .015), Math.sin(a) * .2)); }
  const domeMesh = new THREE.Mesh(new THREE.LatheGeometry(domeProf.reverse().map(v => v), 40), glass); domeMesh.renderOrder = 4; dome.add(domeMesh);
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(R1 + .012, .012, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .6, roughness: .1 })); rimMesh.rotation.x = Math.PI / 2; dome.add(rimMesh);
  const strawTex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d'); for (let y = 0; y < 128; y += 16) { g.fillStyle = '#e8461f'; g.fillRect(0, y, 16, 8); g.fillStyle = '#fff6ea'; g.fillRect(0, y + 8, 16, 8); } const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const straw = cast(new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.0, 14), new THREE.MeshPhysicalMaterial({ map: strawTex, roughness: .35, clearcoat: .6 })));
  straw.position.set(.05, .65, 0); straw.rotation.z = -.14; straw.visible = false; cup.add(straw);

  // the stream
  const streamMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .4, sheen: .5, emissiveIntensity: .1 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, 1, 16), streamMat); stream.visible = false; scene.add(stream);

  /* ----- state ----- */
  const seq = sequencer(), pending = [];
  let prog = 0, camX = START, cupX = START + .6, pouring = false, finished = false, follow = true, cupZ = 1.7, onChange = o.onChange || (() => {});
  const CUP_Y = 0;
  const filled = () => layers.map(l => l.f);
  function addLayer(i) {
    const f = flavors[i], k = layers.length, { gg, y0 } = layerGeo(k);
    const col = new THREE.Color(f.c);
    const m = new THREE.Mesh(gg, new THREE.MeshPhysicalMaterial({ color: col, map: bandTex, roughness: .5, sheen: .6, sheenColor: col.clone().lerp(new THREE.Color(0xffffff), .5), emissive: col, emissiveIntensity: .05 }));
    m.position.y = y0; m.scale.y = .001; cup.add(m); const L = { m, f, i }; layers.push(L); return L;
  }
  function pour(i) {
    if (pouring || seq.busy) { if (layers.length + pending.length < 4 && pending.length < 3) { pending.push(i); return true; } return false; }
    if (layers.length >= 4) { onChange({ type: 'full', layers: filled() }); return false; }
    const b = bowls[i]; pouring = true; follow = false;
    if (finished) unfinish();
    const fromX = cupX, fromZ = cupZ, spoutZ = SPZ;
    let L;
    seq.push(
      { d: RM ? 0 : .42, run: k => { const e = easeInOut(k); cupX = lerp(fromX, b.x, e); cupZ = lerp(fromZ, spoutZ, e); } },
      { d: RM ? 0 : .16, run: k => { b.lever.rotation.x = -.7 * easeOut(k); } },
      { d: 0, start: () => { L = addLayer(i); streamMat.color.set(b.f.c); streamMat.emissive.set(b.f.c); stream.visible = true; } },
      { d: RM ? 0 : .9, run: k => {
        const top = BASE_H - .04, bot = CUP_Y + L.m.position.y + LAYER_H * easeOut(k);
        const h = Math.max(.01, top - bot); stream.scale.set(1, h, 1); stream.position.set(b.x, (top + bot) / 2, spoutZ);
        L.m.scale.y = Math.max(.001, easeOut(k));
      } },
      { d: RM ? 0 : .18, run: k => { stream.scale.x = stream.scale.z = 1 - k; b.lever.rotation.x = -.7 * (1 - easeOut(k)); }, start: () => {} },
      { d: 0, start: () => { stream.visible = false; stream.scale.x = stream.scale.z = 1; pouring = false; onChange({ type: 'pour', layers: filled() }); } },
      { d: RM ? 0 : .5, run: k => { cupZ = lerp(spoutZ, 1.7, easeInOut(k)); }, start: () => {} },
      { d: 0, start: () => { follow = true; } }
    );
    kick(); return true;
  }
  function reset() { pending.length = 0; layers.splice(0).forEach(l => { cup.remove(l.m); l.m.geometry.dispose(); l.m.material.dispose(); }); unfinish(); onChange({ type: 'reset', layers: [] }); kick(); }
  function finish() {
    if (finished || seq.busy) return; finished = true;
    dome.visible = true; straw.visible = true;
    seq.push(
      { d: RM ? 0 : .5, run: k => { const e = easeOut(k); dome.position.y = CUP_H + (1 - e) * .8; dome.rotation.y = (1 - e) * 1.2; } },
      { d: RM ? 0 : .45, run: k => { const e = easeOut(k); straw.position.y = .65 + (1 - e) * 1.1; } },
      { d: 0, start: () => onChange({ type: 'done', layers: filled() }) }
    );
    kick();
  }
  function unfinish() { finished = false; dome.visible = false; straw.visible = false; }

  /* ----- picking ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hits = bowls.flatMap(b => b.hit);
  function pick(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.i : -1; }
  let down = null, hover = -1;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => { if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (moved > 8) return; const i = pick(e); if (i >= 0) pour(i); });
  if (FINE) canvas.addEventListener('pointermove', e => { const i = pick(e); if (i !== hover) { if (hover >= 0) bowls[hover].slushMat.emissiveIntensity = .06; hover = i; if (i >= 0) bowls[i].slushMat.emissiveIntensity = .22; canvas.style.cursor = i >= 0 ? 'pointer' : ''; kick(); } });

  /* ----- camera + loop ----- */
  let aspect = 1;
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick(); }
  function camFor(p) { return lerp(aspect < 1 ? .46 : START + 2.6, END - (aspect < 1 ? 1.4 : 1.8), p); }
  let visible = true, raf = 0, last = performance.now(), clock = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    seq.tick(dt);
    if (!seq.busy && !pouring && pending.length) pour(pending.shift());
    if (prog > .93 && layers.length && !finished && !seq.busy) finish();
    const target = camFor(prog); camX += (target - camX) * (1 - Math.pow(.0008, dt));
    const near = aspect < 1;
    const dist = near ? 8.2 / Math.max(.55, aspect) * .62 : 10.4 - Math.min(2, (aspect - 1.3) * 1.2);
    camera.position.set(camX, near ? 2.2 : 2.35, dist); camera.lookAt(camX, near ? 1.05 : 1.15, 0);
    key.position.set(camX - 3, 8, 6); key.target.position.set(camX, 0, 0);
    // cup follows the camera, a little left of centre on desktop so it never covers the bowl you're aiming at
    if (follow) { const want = prog > .9 ? camX + (near ? 0 : .1) : camX + (near ? 0 : -.2); cupX += (want - cupX) * (1 - Math.pow(.002, dt)); }
    cup.position.set(cupX, CUP_Y, cupZ);
    // churn
    if (!RM) bandTex.offset.y -= dt * .18;
    bowls.forEach(b => { if (Math.abs(b.x - camX) < 9) b.slush.rotation.y = Math.sin(clock * .8 + b.ph) * .015; });
    renderer.render(scene, camera);
    const moving = !RM || seq.busy || (prog > .93 && layers.length && !finished) || Math.abs(target - camX) > .002;
    if (visible && !document.hidden && moving) raf = requestAnimationFrame(frame);
  }
  size(); await renderer.compileAsync?.(scene, camera); kick();
  return {
    setProgress(p) { prog = clamp(p); if (prog < .9 && finished) unfinish(); kick(); },
    pour, reset, finish,
    get layers() { return filled(); },
    get busy() { return seq.busy; },
    nearest() { let best = 0, bd = 1e9; bowls.forEach((b, i) => { const d = Math.abs(b.x - camX); if (d < bd) { bd = d; best = i; } }); return best; },
  };
}
