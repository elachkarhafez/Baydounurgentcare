/* =====================================================================
   build3d engine: a studio-lit 3D object that assembles itself on scroll.
   Extracted from The Fudge Fix. Everything that made that build smooth is here:
   - studio HDRI reflections, soft key/rim/kick lights, a light pool for the opening
   - PCF soft shadows, MSAA, subtle bloom, vignette + grain grade, Neutral tone mapping
   - each layer runs its own clock toward its scroll trigger (and 3x backwards),
     so drops look physical at any scroll speed and rewind cleanly
   - layers wait for the one below to land; flows are rate-limited
   - a height field of the finished dish (no raycasting) for stacking and scatter
   - built in chunks (idle yields), shaders precompiled, render only while moving,
     adaptive DPR, QA hooks (?p= ?qa ?freeze ?t_<layer>= ?F_<layer>= ?dpr=)
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { clamp, lerp, sstep, noise, idle } from './util.js';
import { MAT } from './materials.js';

export { THREE };
export const G = 19;                                   // gravity in scene units/s² (tuned to look heavy)
export const fallT = h => Math.sqrt(2 * h / G);
// closed-form drop: fall, land, damped bounce + squash. Rewinds exactly.
export function dropState(t, h, bounce = .012, squash = .07) {
  const tf = fallT(h);
  if (t <= 0) return { y: h, s: 1, land: -1 };
  if (t < tf) return { y: h - .5 * G * t * t, s: 1, land: -1 };
  const u = t - tf;
  return { y: bounce * Math.abs(Math.sin(u * 13)) * Math.exp(-u * 7.5), s: 1 - squash * Math.exp(-u * 9) * Math.cos(u * 26), land: u };
}

export async function createStage(o) {
  const QS = new URLSearchParams(location.search);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = matchMedia('(max-width: 820px)').matches;
  const ASSETS = o.assets || 'assets/';
  const canvas = o.canvas;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
  const LOW = MOBILE || QS.has('low');
  let DPR = QS.has('dpr') ? +QS.get('dpr') : Math.min(devicePixelRatio || 1, o.dprMax || 1.5);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = o.exposure ?? .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const BG = new THREE.Color(o.bg || '#0d0705');
  const scene = new THREE.Scene(); scene.background = BG; scene.fog = new THREE.Fog(BG, 4, 10);
  const camera = new THREE.PerspectiveCamera(o.fov || 26, 1, .05, 60);
  const dish = new THREE.Group(); scene.add(dish);

  // ---- loading (handlers first: assets can finish while layers are still building) ----
  const manager = new THREE.LoadingManager();
  let assetsIn = false, builtIn = false, booted = false, ready = false;
  manager.onLoad = () => { assetsIn = true; boot(); };
  const tl = new THREE.TextureLoader(manager), texCache = {};
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (name, srgb, rep = 1) => { const k = name + srgb + rep; if (texCache[k]) return texCache[k]; const t = tl.load(name.includes('/') ? name : ASSETS + name); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rep, rep); return texCache[k] = t; };
  new RGBELoader(manager).load(ASSETS + (o.env?.file || 'studio-512.hdr'), t => { t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = t; });
  scene.environmentRotation.set(0, o.env?.rotation ?? 1.2, 0);
  const ENV_I = o.env?.intensity ?? .55;

  // ---- lights ----
  const LI = Object.assign({ key: 150, rim: 80, kick: 1.2, pool: 300 }, o.lights || {});
  const key = new THREE.SpotLight(0xfff5ea, 0, 0, .42, .85, 2); key.position.set(-2.6, 6.2, 3.2); key.target.position.set(0, .2, 0);
  key.castShadow = true; key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048); key.shadow.bias = -.00015; key.shadow.normalBias = .012; key.shadow.camera.near = 3; key.shadow.camera.far = 12;
  const rim = new THREE.SpotLight(o.rimColor || 0xffc89a, 0, 0, .5, .9, 2); rim.position.set(3.2, 2.6, -3.8); rim.target.position.set(0, .4, 0);
  const kick = new THREE.PointLight(0xffe2c4, 0, 6, 2); kick.position.set(.6, 1.9, 2.6);
  const pool = new THREE.SpotLight(0xffe6c8, LI.pool, 0, .2, 1, 2); pool.position.set(-.6, 7.5, .8); pool.target.position.set(0, 0, 0);
  scene.add(key, key.target, rim, rim.target, kick, pool, pool.target);

  // ---- floor ----
  if (o.floor !== false) {
    const f = o.floor || {};
    const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: tex(f.map || 'stone.webp', true, f.repeat || 5), color: new THREE.Color(f.color || '#8f8078'), roughness: f.roughness ?? .62, envMapIntensity: .07 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  }

  // ---- post ----
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: LOW ? 2 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), .14, .45, 1.05); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 q=vUv-.5;float v=smoothstep(.95,.25,length(q*vec2(1.,.9)));c.rgb*=mix(.55,1.,v);c.rgb=mix(c.rgb,c.rgb*vec3(1.025,1.,.965),.6);c.rgb+=(h(vUv*1000.+uTime)-.5)*.018;gl_FragColor=c;}`
  });
  composer.addPass(grade);

  // ---- height field of the dish at rest (world xz → top y) ----
  const HF_N = 256, HF_R = o.hfRadius || 1.15, hf = new Float32Array(HF_N * HF_N).fill(-9);
  const v3 = new THREE.Vector3();
  const HF = {
    // rasterise every triangle (top-down, keep the highest y). Vertices alone leave holes on flat tops.
    splat(mesh) {
      mesh.updateWorldMatrix(true, false);
      const p = mesh.geometry.attributes.position, idx = mesh.geometry.index, m = mesh.matrixWorld, n = idx ? idx.count : p.count;
      const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), S = (HF_N - 1) / (2 * HF_R);
      for (let t = 0; t < n; t += 3) {
        A.fromBufferAttribute(p, idx ? idx.getX(t) : t).applyMatrix4(m); B.fromBufferAttribute(p, idx ? idx.getX(t + 1) : t + 1).applyMatrix4(m); C.fromBufferAttribute(p, idx ? idx.getX(t + 2) : t + 2).applyMatrix4(m);
        const ax = (A.x + HF_R) * S, az = (A.z + HF_R) * S, bx = (B.x + HF_R) * S, bz = (B.z + HF_R) * S, cx = (C.x + HF_R) * S, cz = (C.z + HF_R) * S;
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(HF_N - 1, Math.ceil(Math.max(ax, bx, cx))), z0 = Math.max(0, Math.floor(Math.min(az, bz, cz))), z1 = Math.min(HF_N - 1, Math.ceil(Math.max(az, bz, cz)));
        const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        for (const V of [[ax, az, A.y], [bx, bz, B.y], [cx, cz, C.y]]) { const i = Math.round(V[0]), j = Math.round(V[1]); if (i >= 0 && j >= 0 && i < HF_N && j < HF_N && V[2] > hf[j * HF_N + i]) hf[j * HF_N + i] = V[2]; }
        if (Math.abs(den) < 1e-9) continue;
        for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) {
          const w1 = ((bz - cz) * (i - cx) + (cx - bx) * (j - cz)) / den, w2 = ((cz - az) * (i - cx) + (ax - cx) * (j - cz)) / den, w3 = 1 - w1 - w2;
          if (w1 < -.01 || w2 < -.01 || w3 < -.01) continue;
          const y = w1 * A.y + w2 * B.y + w3 * C.y, k = j * HF_N + i; if (y > hf[k]) hf[k] = y;
        }
      }
    },
    at(x, z) { const fi = (x + HF_R) / (2 * HF_R) * (HF_N - 1), fj = (z + HF_R) / (2 * HF_R) * (HF_N - 1); if (fi < 0 || fj < 0 || fi >= HF_N - 1 || fj >= HF_N - 1) return 0;
      const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j, g = (ii, jj) => Math.max(0, hf[jj * HF_N + ii]);
      return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b); },
    max(x, z, r) { let m = 0; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (const f of [0, .5, 1]) m = Math.max(m, HF.at(x + Math.cos(a) * r * f, z + Math.sin(a) * r * f)); } return m; },
    // freeze the current surface (e.g. before a scoop lands, so sauce can pool on what's under it)
    snapshot() { const copy = hf.slice(), S = Object.create(HF); S.at = (x, z) => { const fi = (x + HF_R) / (2 * HF_R) * (HF_N - 1), fj = (z + HF_R) / (2 * HF_R) * (HF_N - 1); if (fi < 0 || fj < 0 || fi >= HF_N - 1 || fj >= HF_N - 1) return 0; const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j, g = (ii, jj) => Math.max(0, copy[jj * HF_N + ii]); return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b); }; return S; },
    normal(x, z, out = new THREE.Vector3()) { const e = .008; return out.set(-(HF.at(x + e, z) - HF.at(x - e, z)) / (2 * e), 1, -(HF.at(x, z + e) - HF.at(x, z - e)) / (2 * e)).normalize(); }
  };

  // ---- stage object handed to primitives ----
  const st = { THREE, scene, dish, camera, renderer, tex, hf: HF, QS, RM, LOW, layers: [], byName: {}, time: 0, shake: 0, p: QS.has('p') ? +QS.get('p') : 0 };
  st.mat = (name, ...a) => MAT[name](st, ...a);
  st.add = layer => { layer.tau = 0; layer.F = 0; st.layers.push(layer); st.byName[layer.name] = layer; return layer; };
  st.target = st.p;
  st.setProgress = p => { if (!QS.has('p')) st.target = p; };

  // ---- camera path: [progress, azimuth°, elevation°, distance, target y] ----
  const CAM = o.camera || [[0, -14, 50, 7.4, 0], [.1, 0, 34, 5, .1], [1, 20, 18, 4.2, .45]];
  function camAt(p) {
    let i = 0; while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
    const a = CAM[Math.max(0, i - 1)], b = CAM[i], c = CAM[i + 1], d = CAM[Math.min(CAM.length - 1, i + 2)], t = clamp((p - b[0]) / (c[0] - b[0]));
    const cr = k => { const p0 = a[k], p1 = b[k], p2 = c[k], p3 = d[k], t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    return [cr(1), cr(2), cr(3), cr(4)];
  }

  // ---- per-frame update of every layer ----
  const landed = l => { if (!l) return true; if (l.kind === 'flow') return l.F > .97; if (l.kind === 'scatter') return l.done > .9; return l.tau > (l.settle ?? .25) + (l.drop ? fallT(l.drop.h) : 0); };
  function apply(dt) {
    const p = st.p; let shake = 0;
    for (const l of st.layers) {
      const prev = l.after === undefined ? st.layers[st.layers.indexOf(l) - 1] : st.byName[l.after];
      const ok = !l.after && l.after !== undefined ? true : landed(prev);
      if (l.kind === 'flow') {
        const Ft = clamp((p - l.from) / (l.to - l.from));
        const target = ok ? Ft : Math.min(l.F, Ft);
        const d = target - l.F, rate = target > l.F ? (l.rate || .55) : 2.5;
        l.F += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
        if (st.settle && !QS.has('F_' + l.name)) l.F = Ft;
        l.update && l.update(st, { F: l.F, dt });
        continue;
      }
      if (l.kind === 'scatter') { const rel = ok ? clamp((p - l.from) / (l.to - l.from)) : 0; l.update(st, { rel, dt }); continue; }
      const on = p >= l.trigger && (ok || l.tau > 0);
      l.tau = on ? Math.min(l.tau + dt, 4) : Math.max(0, Math.min(l.tau, 4) - dt * 3);
      const ds = l.drop ? dropState(l.tau, l.drop.h, l.drop.bounce, l.drop.squash) : { y: 0, s: 1, land: l.tau > 0 ? l.tau : -1 };
      if (l.drop && ds.land >= 0) shake = Math.max(shake, (l.drop.shake ?? .02) * Math.exp(-ds.land * 7));
      l.update && l.update(st, { tau: l.tau, y: ds.y, s: ds.s, land: ds.land, on, dt });
    }
    // lights come up as the first layer arrives
    const L = sstep(0, .09, p);
    key.intensity = LI.key * (.25 + .75 * L); rim.intensity = LI.rim * L; kick.intensity = LI.kick * L;
    pool.intensity = LI.pool * (1 - sstep(.005, .05, p));
    scene.environmentIntensity = ENV_I * (.25 + .75 * L);
    st.shake = shake;
  }

  // ---- sizing: subject right of the copy on desktop, above it on phones ----
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false); composer.setPixelRatio(DPR); composer.setSize(W, H);
    camera.aspect = W / H;
    if (W / H < .9) camera.setViewOffset(W, H, 0, H * (o.portraitShift ?? .1), W, H); else camera.setViewOffset(W, H, W * (o.desktopShift ?? -.17), 0, W, H);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { resize(); busyUntil = performance.now() + 1000; });

  // ---- finale: drag to spin ----
  let spin = 0, spinV = 0, dragging = false, lastX = 0;
  canvas.addEventListener('pointerdown', e => { if (st.p < .95) return; dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); o.onSpin && o.onSpin(); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; spin += dx * .008; spinV = dx * .5; });
  const endDrag = () => { dragging = false; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  const FREEZE = QS.has('freeze');
  function frame(dt) {
    st.time += dt; apply(FREEZE ? 0 : dt);
    const [az, el, d0, ty] = camAt(st.p), aspect = W / H;
    const dist = d0 * (aspect < 1 ? Math.min(1.9, 1 + (1 - aspect) * 1.25) : 1);
    if (!dragging) { spinV *= Math.pow(.05, dt); spin += spinV * dt; if (st.p > .97 && !RM) spin += dt * .12; }
    dish.rotation.y = spin;
    const A = THREE.MathUtils.degToRad(az), E = THREE.MathUtils.degToRad(el), sh = st.shake;
    const jx = sh * noise(st.time * 30, 1, 0), jy = sh * noise(st.time * 30, 2, 0);
    camera.position.set(Math.sin(A) * Math.cos(E) * dist + jx, Math.sin(E) * dist + ty + jy, Math.cos(A) * Math.cos(E) * dist);
    camera.lookAt(jx * .3, ty + jy * .3, 0);
    scene.fog.near = dist * .92; scene.fog.far = dist + 5.2;
    grade.uniforms.uTime.value = st.time % 10;
    composer.render(dt);
  }

  // ---- boot: build → plan (rest positions + height field) → compile → loop ----
  let running = false, visible = true, last = 0, busyUntil = 0, lastP = -1, perfN = 0, perfSum = 0, tier = 0;
  async function boot() {
    if (booted || !assetsIn || !builtIn) return; booted = true;
    resize();
    for (const l of st.layers) { l.plan && l.plan(st); await idle(); }
    st.layers.forEach(l => l.obj && (l.obj.visible = true));
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch (e) {}
    composer.render(0);
    st.layers.forEach(l => l.reset && l.reset(st));
    ready = true;
    if (RM) { st.p = st.target = 1; }
    if (QS.has('p') || RM) { st.settle = true; for (const l of st.layers) l.tau = st.p >= (l.trigger ?? 0) ? 9 : 0; }
    for (const l of st.layers) { if (QS.has('t_' + l.name)) l.tau = +QS.get('t_' + l.name); if (QS.has('F_' + l.name)) l.F = +QS.get('F_' + l.name); }
    o.onReady && o.onReady(st);
    start();
  }
  function degrade() { tier++; if (tier === 1) DPR = Math.min(DPR, 1.25); if (tier === 2) { bloom.enabled = false; DPR = 1; } resize(); perfN = perfSum = 0; }
  function start() { if (running || !ready) return; running = true; last = performance.now(); busyUntil = last + 4000; requestAnimationFrame(loop); }
  function loop(now) {
    if (!visible || document.hidden) { running = false; return; }
    const raw = now - last, dt = clamp(raw / 1000, 0, .05); last = now;
    st.p += (st.target - st.p) * (1 - Math.pow(.0009, dt)); if (Math.abs(st.target - st.p) < 1e-4) st.p = st.target;
    if (st.p !== lastP || dragging || Math.abs(spinV) > .01 || st.p > .97 || st.layers.some(l => l.busy)) busyUntil = now + 4000;
    lastP = st.p;
    if (now < busyUntil) {
      frame(dt);
      if (tier < 2 && raw > 0 && raw < 400 && !QS.has('dpr')) { perfN++; perfSum += raw; if (perfN === 60) { if (perfSum / perfN > 21) degrade(); else perfN = perfSum = 0; } }
    }
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(o.observe || canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });

  st.start = () => { builtIn = true; boot(); };
  st.jump = p => { st.p = st.target = p; st.settle = true; for (const l of st.layers) l.tau = p >= (l.trigger ?? 0) ? 9 : 0; setTimeout(() => { st.settle = false; }, 50); };
  st.frame = n => { for (let i = 0; i < (n || 1); i++) frame(1 / 60); };
  st.isReady = () => ready;
  window.__build3d = st;
  return st;
}
