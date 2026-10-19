/* =====================================================================
   Furniture King: the crown on its cushion.
   A gold crown like the one in their logo (eight points, rubies on the
   band, pearls on the tips, red velvet cap, two arches with an orb and
   cross) is lowered onto a tufted red velvet cushion with gold tassels.
   It then turns slowly while the gems glint. Tap it and it lifts, spins
   once and settles back down. Kit method: studio HDRI, physical materials,
   lathe geometry, shadow catcher on a transparent canvas, step sequencer,
   pointer drift, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh furnitureking/src/crown.js furnitureking/assets/crown.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// lands, overshoots down a touch and settles (for the drop onto the cushion)
const land = t => { t = clamp(t); if (t < .7) return easeInOut(t / .7) * 1.0; const k = (t - .7) / .3; return 1 + Math.sin(k * Math.PI) * .035 * (1 - k); };

function sequencer() {
  let q = [], cur = null, t = 0;
  return {
    push(...s) { q.push(...s); },
    get busy() { return !!(cur || q.length); },
    tick(dt) { for (let n = 0; n < 12; n++) { if (!cur) { cur = q.shift(); t = 0; if (!cur) return; } t += dt; dt = 0; const k = cur.d ? clamp(t / cur.d) : 1; cur.run && cur.run(k); if (k >= 1) cur = null; else return; } },
  };
}

// four-point star sprite for the glints
function starTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), h = S / 2;
  const rg = g.createRadialGradient(h, h, 0, h, h, h); rg.addColorStop(0, 'rgba(255,250,225,1)'); rg.addColorStop(.12, 'rgba(255,230,160,.8)'); rg.addColorStop(.4, 'rgba(255,200,110,.12)'); rg.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  for (const [w, l] of [[3, h * .98], [2, h * .55]]) {
    g.save(); g.translate(h, h); if (l < h * .9) g.rotate(Math.PI / 4);
    for (let i = 0; i < 2; i++) { const lg = g.createLinearGradient(-l, 0, l, 0); lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(.5, 'rgba(255,250,235,.95)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = lg; g.fillRect(-l, -w / 2, l * 2, w); g.rotate(Math.PI / 2); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// velvet: fine noise so the sheen breaks up like pile
function velvetTex(renderer) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#7a0a10'; g.fillRect(0, 0, S, S);
  const d = g.getImageData(0, 0, S, S), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - .5) * 26; p[i] = clamp(p[i] + n, 0, 255); p[i + 1] = clamp(p[i + 1] + n * .25, 0, 255); p[i + 2] = clamp(p[i + 2] + n * .3, 0, 255); }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}

export async function mountCrown(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 1.05; }

  const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(-3.5, 8, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 20 }); key.shadow.radius = 6; key.shadow.bias = -.0006;
  const rim = new THREE.DirectionalLight(0xffc878, 2.2); rim.position.set(4, 3.5, -5);
  const rim2 = new THREE.DirectionalLight(0xff4a3a, .9); rim2.position.set(-5, 1.5, -3);
  const fill = new THREE.DirectionalLight(0xfff6ea, .5); fill.position.set(2, 1, 6);
  scene.add(key, key.target, rim, rim2, fill, new THREE.HemisphereLight(0xfff1dc, 0x2a0a08, .35));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .55, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ----- materials ----- */
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0c060, metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .15, side: THREE.DoubleSide });
  const goldSatin = new THREE.MeshPhysicalMaterial({ color: 0xd9a748, metalness: 1, roughness: .38, side: THREE.DoubleSide });
  const ruby = new THREE.MeshPhysicalMaterial({ color: 0xd0101e, metalness: 0, roughness: .04, transmission: .55, thickness: .4, ior: 1.77, clearcoat: 1, attenuationColor: new THREE.Color(0x8a0010), attenuationDistance: .25, specularIntensity: 1 });
  const diamond = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: .9, thickness: .2, ior: 2.4, clearcoat: 1, dispersion: 3 });
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf6efe2, roughness: .25, clearcoat: 1, clearcoatRoughness: .1, sheen: 1, sheenColor: new THREE.Color(0xffd8e8), iridescence: .6, iridescenceIOR: 1.5 });
  const vt = velvetTex(renderer);
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: vt, roughness: .9, sheen: .8, sheenRoughness: .45, sheenColor: new THREE.Color(0xd8343c) });
  const capVelvet = velvet.clone(); capVelvet.color = new THREE.Color(0xcfcfcf);

  /* ----- the cushion: a tufted superellipsoid pillow, corner tassels ----- */
  const cushion = new THREE.Group(); scene.add(cushion);
  const CW = 1.5, CH = .34;
  {
    const geo = new THREE.SphereGeometry(1, 96, 48), p = geo.attributes.position, v = new THREE.Vector3();
    const se = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let x = se(v.x, .32), z = se(v.z, .32), y = v.y;
      const r = Math.hypot(x, z);
      // puffy top and bottom, pulled in at the seam, a button dimple in the middle
      y = se(y, .7) * (1 - .18 * Math.pow(r, 6)) - (y > 0 ? .22 * Math.exp(-r * r * 9) : 0);
      p.setXYZ(i, x * CW, (y + 1) * CH * .5 + .02, z * CW);
    }
    geo.computeVertexNormals();
    cushion.add(cast(new THREE.Mesh(geo, velvet)));
    // gold cord piping around the seam
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pts.push(new THREE.Vector3(se(c, .32) * CW * .985, CH * .5 + .02, se(s, .32) * CW * .985)); }
    cushion.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, .022, 8, true), goldSatin)));
    // tassels at the four corners
    const corner = se(Math.SQRT1_2, .32) * CW * .985;
    // tassel skirt, bottom→top so the lathe faces point outward
    const tasselGeo = new THREE.LatheGeometry([[0, -.4], [.085, -.4], [.09, -.37], [.075, -.24], [.05, -.12], [.03, -.05], [.022, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const t = new THREE.Group(); t.position.set(sx * corner, CH * .5 + .02, sz * corner);
      const knot = cast(new THREE.Mesh(new THREE.SphereGeometry(.06, 20, 14), goldSatin)); t.add(knot);
      const skirt = cast(new THREE.Mesh(tasselGeo, goldSatin)); skirt.position.y = -.04; t.add(skirt);
      t.rotation.z = -sx * .12; t.rotation.x = sz * .12;
      cushion.add(t);
    }
  }
  cushion.rotation.y = Math.PI / 4;
  const CUSHION_TOP = CH + .02 - .22 * CH * .5 + .005; // the dimple in the middle, where the crown sits

  /* ----- the crown ----- */
  const crown = new THREE.Group(), body = new THREE.Group(); crown.add(body); scene.add(crown);
  const R = .78, BAND = .34, FLARE = .07;
  // band: closed lathe ring, outside goes up, inside comes back down
  {
    const P = [[R - .045, 0], [R, 0], [R + .03, .025], [R, .05], [R, BAND - .05], [R + .03, BAND - .025], [R, BAND], [R - .045, BAND], [R - .045, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    // the lathe needs y non-decreasing on the outside run; split into outer (up) and inner (down) runs
    body.add(cast(new THREE.Mesh(new THREE.LatheGeometry(P.slice(0, 7), 128), gold)));
    const inner = [new THREE.Vector2(R - .045, BAND), new THREE.Vector2(R - .045, 0)];
    body.add(new THREE.Mesh(new THREE.LatheGeometry(inner, 128), goldSatin));
    const topRing = new THREE.Mesh(new THREE.RingGeometry(R - .045, R, 128), goldSatin); topRing.rotation.x = -Math.PI / 2; topRing.position.y = BAND; body.add(topRing);
  }
  // eight points: a flared shell whose top edge rises into tall and short tips, alternating
  const N = 8, TALL = .62, SHORT = .34;
  const tipH = th => { const u = (th / (Math.PI * 2)) * N, k = Math.round(u), d = Math.abs(u - k) * 2; const h = (k % 2 === 0) ? TALL : SHORT; return h * Math.pow(clamp(1 - d), 1.7) + .05; };
  {
    const SEG = 384, VS = 14, pos = [], idx = [], nrm = [];
    for (let i = 0; i <= SEG; i++) {
      const th = i / SEG * Math.PI * 2, h = tipH(th);
      for (let j = 0; j <= VS; j++) { const v = j / VS, r = R - .01 + FLARE * v * v; pos.push(Math.cos(th) * r, BAND + h * v, -Math.sin(th) * r); }
    }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < VS; j++) { const a = i * (VS + 1) + j, b = a + VS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    body.add(cast(new THREE.Mesh(g, gold)));
    // beaded rim along the top edge
    const edge = []; for (let i = 0; i <= SEG; i++) { const th = i / SEG * Math.PI * 2; const r = R - .01 + FLARE; edge.push(new THREE.Vector3(Math.cos(th) * r, BAND + tipH(th), -Math.sin(th) * r)); }
    body.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 768, .016, 6, true), gold)));
  }
  const gems = []; // world-space glint anchors
  // pearls on the tips, rubies on the band under the tall tips, diamonds under the short ones, a small ruby on each tall tip
  for (let k = 0; k < N; k++) {
    const th = k / N * Math.PI * 2, c = Math.cos(th), s = -Math.sin(th), tall = k % 2 === 0;
    const rt = R - .01 + FLARE;
    const p = cast(new THREE.Mesh(new THREE.SphereGeometry(tall ? .062 : .048, 24, 16), pearl)); p.position.set(c * rt, BAND + tipH(th) + (tall ? .05 : .04), s * rt); body.add(p);
    if (tall) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(.075, 32, 20), ruby); g.scale.set(1, 1.25, .55);
      g.position.set(c * (R + .035), BAND * .5, s * (R + .035)); g.lookAt(c * 5, BAND * .5, s * 5); body.add(g); gems.push(g);
      const set = cast(new THREE.Mesh(new THREE.TorusGeometry(.085, .012, 8, 32), gold)); set.scale.set(1, 1.25, 1); set.position.copy(g.position); set.lookAt(c * 5, BAND * .5, s * 5); body.add(set);
      const tipR = new THREE.Mesh(new THREE.SphereGeometry(.045, 24, 16), ruby); tipR.scale.set(1, 1.2, .55);
      const ty = BAND + .2, tr = R - .01 + FLARE * Math.pow(.2 / (TALL + .05), 2) + .02; tipR.position.set(c * tr, ty, s * tr); tipR.lookAt(c * 5, ty, s * 5); body.add(tipR);
    } else {
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(.05, 0), diamond); d.scale.set(1, 1, .6);
      d.position.set(c * (R + .03), BAND * .5, s * (R + .03)); d.lookAt(c * 5, BAND * .5, s * 5); body.add(d); gems.push(d);
    }
  }
  // velvet cap inside, ermine-free; the arches go over it
  {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R - .05, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), capVelvet);
    cap.scale.y = .72; cap.position.y = BAND * .6; body.add(cast(cap));
  }
  // two arches crossing over the top, an orb and a cross
  const ARCH_TOP = BAND + .95;
  for (let a = 0; a < 2; a++) {
    const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI; const x = Math.cos(t) * (R - .02), y = BAND + .08 + Math.sin(t) * (ARCH_TOP - BAND - .08); const dip = Math.exp(-Math.pow((t - Math.PI / 2) * 2.2, 2)) * .07; pts.push(new THREE.Vector3(x, y - dip, 0)); }
    const arch = cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, .03, 10), gold));
    arch.rotation.y = a * Math.PI / 2 + Math.PI / 8; body.add(arch);
    // pearls along the arch
    for (let i = 1; i < 12; i++) { if (i === 6) continue; const q = pts[i * 4], m = new THREE.Mesh(new THREE.SphereGeometry(.024, 12, 8), pearl); m.position.copy(q); m.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), arch.rotation.y); body.add(m); }
  }
  const orb = cast(new THREE.Mesh(new THREE.SphereGeometry(.11, 32, 20), gold)); orb.position.y = ARCH_TOP + .02; body.add(orb);
  const orbBand = cast(new THREE.Mesh(new THREE.TorusGeometry(.112, .012, 8, 48), goldSatin)); orbBand.rotation.x = Math.PI / 2; orbBand.position.y = orb.position.y; body.add(orbBand);
  const crossV = cast(new THREE.Mesh(new THREE.BoxGeometry(.045, .24, .045), gold)); crossV.position.y = ARCH_TOP + .24; body.add(crossV);
  const crossH = cast(new THREE.Mesh(new THREE.BoxGeometry(.16, .045, .045), gold)); crossH.position.y = ARCH_TOP + .27; body.add(crossH);
  const topGem = new THREE.Mesh(new THREE.OctahedronGeometry(.035, 0), ruby); topGem.position.set(0, ARCH_TOP + .27, .03); body.add(topGem); gems.push(topGem);
  body.rotation.x = .02;

  /* ----- glints ----- */
  const st = starTex();
  const glints = gems.map((g, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.scale.setScalar(.34); s.userData = { g, ph: i * 1.7, sp: .6 + (i % 3) * .25 }; scene.add(s); return s; });
  const burst = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.userData = { a: i / 14 * Math.PI * 2 + Math.random() * .3, r: 1.1 + Math.random() * .6, y: .3 + Math.random() * 1.1 }; scene.add(s); burst.push(s); }
  let burstT = -1;
  const fireBurst = () => { burstT = 0; };

  /* ----- camera ----- */
  const target = new THREE.Vector3(0, .58, 0);
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const needW = 4.5, needH = 3.3; // cushion corners + tassels, crown with cross
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const distH = needH / 2 / Math.tan(vf / 2), distW = needW / 2 / Math.tan(vf / 2) / aspect;
    const dist = Math.max(distH, distW) * 1.04;
    const el = .3;
    camera.position.set(0, target.y + Math.sin(el) * dist, Math.cos(el) * dist);
    camera.lookAt(target); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  /* ----- motion ----- */
  const seq = sequencer();
  const REST = CUSHION_TOP, HIGH = REST + 2.4;
  let spin = 0, spinV = RM ? 0 : .32, extraSpin = 0, squish = 0;
  crown.position.y = RM ? REST : HIGH; crown.visible = true;
  if (!RM) {
    seq.push(
      { d: .35 },
      { d: 1.25, run: k => { crown.position.y = lerp(HIGH, REST, land(k)); squish = k > .62 ? Math.sin((k - .62) / .38 * Math.PI) : 0; extraSpin = (1 - easeOut(k)) * 2.2; } },
      { run: () => { squish = 0; extraSpin = 0; fireBurst(); o.onLanded && o.onLanded(); } },
    );
  } else o.onLanded && o.onLanded();

  function celebrate() {
    if (seq.busy || RM) { fireBurst(); return; }
    const s0 = spin;
    seq.push(
      { d: .45, run: k => { crown.position.y = lerp(REST, REST + .55, easeOut(k)); } },
      { d: .9, run: k => { spin = s0 + easeInOut(k) * Math.PI * 2; } },
      { d: .55, run: k => { crown.position.y = lerp(REST + .55, REST, land(k)); squish = k > .55 ? Math.sin((k - .55) / .45 * Math.PI) * .6 : 0; } },
      { run: () => { squish = 0; fireBurst(); } },
    );
  }
  canvas.addEventListener('click', celebrate);

  let px = 0, py = 0, tx = 0, ty = 0;
  if (FINE && !RM) addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  let visible = true, last = performance.now(), raf = 0, time = 0;
  const wp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function loop(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    seq.tick(dt);
    spin += spinV * dt;
    px += (tx - px) * .05; py += (ty - py) * .05;
    crown.rotation.y = spin + extraSpin;
    body.rotation.x = .02 + py * .08; body.rotation.z = -px * .06;
    const bob = seq.busy || RM ? 0 : Math.sin(time * 1.3) * .012;
    body.position.y = bob;
    cushion.scale.set(1 + squish * .02, 1 - squish * .06, 1 + squish * .02);
    // glints: brightest when a gem faces the camera
    camera.getWorldDirection(camDir);
    glints.forEach(s => {
      const g = s.userData.g; g.getWorldPosition(wp); s.position.copy(wp);
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
      const facing = clamp(-n.dot(camDir));
      const tw = Math.pow(Math.max(0, Math.sin(time * s.userData.sp + s.userData.ph)), 10);
      s.material.opacity = RM ? 0 : clamp(Math.pow(facing, 6) * .9 + tw * facing * .8);
      s.material.rotation = time * .4 + s.userData.ph;
    });
    if (burstT >= 0) {
      burstT += dt; const k = clamp(burstT / 1.1);
      burst.forEach(s => { const u = s.userData, r = u.r * (.55 + easeOut(k) * .7); s.position.set(Math.cos(u.a) * r, u.y + k * .25, Math.sin(u.a) * r); s.material.opacity = Math.sin(k * Math.PI) * .95; s.scale.setScalar(.22 + .2 * Math.sin(k * Math.PI)); });
      if (k >= 1) { burstT = -1; burst.forEach(s => s.material.opacity = 0); }
    }
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return { celebrate };
}
