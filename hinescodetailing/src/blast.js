/* =====================================================================
   Hines & Co.: "Blast it clean."
   A real 3D driveway (four concrete slabs with expansion joints, CC0
   ambientCG Concrete002 colour/normal/roughness) caked in grime that is
   generated in the shader (mildew, dirt, tyre tracks, an oil stain). Drag
   and a pressure-washer lance follows the pointer: a fan of spray particles
   hits the slab, splash and mist kick up, and the grime is cut away in a
   clean stripe (painted into a mask texture). Fresh-cleaned concrete stays
   dark and glossy while it's wet, then dries. Golden-hour HDRI + sun with
   shadows; the slab fades out at its edges so the page shows through.
   onProgress(k) reports how much is clean; onClean() fires once at ~85%.
   Bundle: kit/build3d/build.sh hinescodetailing/src/blast.js hinescodetailing/assets/blast.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export async function mountBlast(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 1.8));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);

  const tl = new THREE.TextureLoader(), load = (u, srgb) => new Promise(res => tl.load(u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
  const [env, cCol, cNor, cRou] = await Promise.all([
    new Promise(res => new RGBELoader().load(A + 'sunset-512.hdr', t => res(t), undefined, () => res(null))),
    load(A + 'tex/concrete/color.webp', true), load(A + 'tex/concrete/normal.webp'), load(A + 'tex/concrete/rough.webp')
  ]);
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .7; scene.environmentRotation.set(0, 1.2, 0); }
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.6); sun.position.set(-6, 5, -3); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 }); sun.shadow.bias = -.0004; sun.shadow.radius = 4;
  scene.add(sun, new THREE.HemisphereLight(0xcfe3ff, 0x3a2a1c, .45));

  // ---- the driveway: 2 x 2 slabs with joints ----
  const SW = 8, SD = 5.4;                                   // full driveway size (x, z)
  const MW = 512, MH = Math.round(512 * SD / SW);           // mask resolution
  const mc = document.createElement('canvas'); mc.width = MW; mc.height = MH; const mg = mc.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, MW, MH);
  const wc = document.createElement('canvas'); wc.width = MW / 2; wc.height = MH / 2; const wg = wc.getContext('2d'); wg.fillStyle = '#000'; wg.fillRect(0, 0, wc.width, wc.height);
  const maskTex = new THREE.CanvasTexture(mc), wetTex = new THREE.CanvasTexture(wc);
  const U = { tMask: { value: maskTex }, tWet: { value: wetTex }, uSize: { value: new THREE.Vector2(SW, SD) }, uT: { value: 0 }, uShine: { value: -2 } };
  const mat = new THREE.MeshPhysicalMaterial({ map: cCol, normalMap: cNor, roughnessMap: cRou, roughness: 1, metalness: 0, clearcoat: 0, transparent: true });
  [cCol, cNor, cRou].forEach(t => t && t.repeat.set(2.2, 1.5));
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; uniform sampler2D tMask, tWet; uniform vec2 uSize; uniform float uT, uShine;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= .5; } return s; }
        vec2 duv(){ return vec2(vWP.x / uSize.x + .5, vWP.z / uSize.y + .5); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 mu = duv();
        float clean = texture2D(tMask, mu).r;
        float wet = texture2D(tWet, mu).r;
        // grime: mildew + dirt, tyre tracks, an oil stain, darker in the joints
        float g = fbm(vWP.xz * 1.3) * .65 + fbm(vWP.xz * 6.) * .35;
        float tracks = smoothstep(.45, .1, abs(abs(vWP.x - .3) - 1.05)) * (.55 + .45 * fbm(vWP.xz * vec2(3., .6)));
        float oil = smoothstep(.75, .1, length((vWP.xz - vec2(.6, -.4)) * vec2(1., 1.4))) * (.6 + .4 * fbm(vWP.xz * 5.));
        vec3 mildew = mix(vec3(.07, .08, .045), vec3(.19, .18, .11), g);
        vec3 grime = mix(diffuseColor.rgb * vec3(.36, .34, .29), mildew, .5 + .35 * g);
        grime = mix(grime, vec3(.07, .065, .06), tracks * .55);
        grime = mix(grime, vec3(.05, .05, .055), oil * .75);
        vec3 fresh = diffuseColor.rgb * .86;
        // a bright line right at the cut edge, like the real thing
        float edge = smoothstep(.15, .5, clean) * smoothstep(.85, .5, clean);
        diffuseColor.rgb = mix(grime, fresh, smoothstep(.05, .9, clean)) + edge * .05;
        diffuseColor.rgb *= 1. - wet * .42;
        // glint sweep on payoff
        float sw = smoothstep(.35, 0., abs(vWP.x + vWP.z * .4 - uShine));
        diffuseColor.rgb += sw * .18;
        // fade the slab out at its edges so the page shows through
        float fx = smoothstep(0., .1, mu.x) * smoothstep(1., .9, mu.x), fz = smoothstep(0., .14, mu.y) * smoothstep(1., .82, mu.y);
        diffuseColor.a *= fx * fz;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { vec2 mu2 = duv(); float c2 = texture2D(tMask, mu2).r, w2 = texture2D(tWet, mu2).r;
          roughnessFactor = mix(mix(1., roughnessFactor * .95, c2), .32, w2 * .85); }`);
  };
  const slabs = new THREE.Group(); scene.add(slabs);
  const gap = .035;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const w = SW / 2 - gap, d = SD / 2 - gap, m = new THREE.Mesh(new THREE.BoxGeometry(w, .12, d, 1, 1, 1), mat);
    m.position.set((i - .5) * SW / 2, -.06, (j - .5) * SD / 2); m.receiveShadow = true; slabs.add(m);
    // world-space UVs so the concrete pattern runs continuously across slabs
    const uv = m.geometry.attributes.uv, pos = m.geometry.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (pos.getX(k) + m.position.x) / SW + .5, (pos.getZ(k) + m.position.z) / SD + .5);
  }
  const jointMat = new THREE.MeshBasicMaterial({ color: 0x0b0a09, transparent: true, opacity: .85 });
  const j1 = new THREE.Mesh(new THREE.PlaneGeometry(gap * 1.2, SD * .9), jointMat); j1.rotation.x = -Math.PI / 2; j1.position.y = -.02; scene.add(j1);
  const j2 = new THREE.Mesh(new THREE.PlaneGeometry(SW * .88, gap * 1.2), jointMat); j2.rotation.x = -Math.PI / 2; j2.position.y = -.02; scene.add(j2);

  // ---- the lance (wand): tube, trigger grip, nozzle ----
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xc9ced4, metalness: 1, roughness: .25 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: .55, clearcoat: .3 });
  const tip = new THREE.MeshPhysicalMaterial({ color: 0xff3b26, roughness: .35, clearcoat: .6 });
  const lance = new THREE.Group(); scene.add(lance);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 1.3, 20), metal); tube.position.y = .65; tube.castShadow = true;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .45, 24), rubber); grip.position.y = 1.4; grip.castShadow = true;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, .14, 24), tip); nozzle.position.y = .02; nozzle.castShadow = true;
  lance.add(tube, grip, nozzle);
  const NOZ_H = .95;                                        // nozzle height above the slab

  // ---- spray, splash, mist (CPU particle pool, cheap) ----
  const PN = SMALL ? 500 : 900, pp = new Float32Array(PN * 3), pv = new Float32Array(PN * 3), pl = new Float32Array(PN), pk = new Uint8Array(PN);
  for (let i = 0; i < PN; i++) pl[i] = -1;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aL', new THREE.BufferAttribute(pl, 1)); pg.setAttribute('aK', new THREE.BufferAttribute(pk, 1));
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
  const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPR: { value: renderer.getPixelRatio() } },
    vertexShader: 'attribute float aL; attribute float aK; uniform float uPR; varying float vA; varying float vK; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; float big = aK > 1.5 ? 7. : aK > .5 ? 2.2 : 1.4; gl_PointSize = aL < 0. ? 0. : big * uPR * 12. / -mv.z; vA = aL < 0. ? 0. : (aK > 1.5 ? .18 : .8) * clamp(aL * 3., 0., 1.); vK = aK; }',
    fragmentShader: 'varying float vA; varying float vK; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, vK > 1.5 ? 0. : .2, r) * vA; gl_FragColor = vec4(vec3(.92, .96, 1.), a); }' });
  scene.add(new THREE.Points(pg, pMat));
  let pi = 0;
  const emit = (x, y, z, vx, vy, vz, life, kind) => { const i = pi = (pi + 1) % PN; pp[i * 3] = x; pp[i * 3 + 1] = y; pp[i * 3 + 2] = z; pv[i * 3] = vx; pv[i * 3 + 1] = vy; pv[i * 3 + 2] = vz; pl[i] = life; pk[i] = kind; };

  // ---- state + painting ----
  const st = { t: 0, on: false, hit: new THREE.Vector3(0, 0, 0), goal: new THREE.Vector3(0, 0, .3), last: null, clean: 0, done: false, shine: -9, auto: null, touched: false, dirty: false };
  function paint(x, z, r) {
    const u = (x / SW + .5) * MW, v = (1 - (z / SD + .5)) * MH, R = r / SW * MW;
    const gr = mg.createRadialGradient(u, v, 0, u, v, R); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    mg.globalCompositeOperation = 'lighter'; mg.fillStyle = gr; mg.beginPath(); mg.arc(u, v, R, 0, Math.PI * 2); mg.fill(); mg.globalCompositeOperation = 'source-over';
    const wu = u / 2, wv = v / 2, WR = R * .75; const wgr = wg.createRadialGradient(wu, wv, 0, wu, wv, WR); wgr.addColorStop(0, 'rgba(255,255,255,.9)'); wgr.addColorStop(1, 'rgba(255,255,255,0)');
    wg.fillStyle = wgr; wg.beginPath(); wg.arc(wu, wv, WR, 0, Math.PI * 2); wg.fill();
    st.dirty = true;
  }
  let measureT = 0;
  function measure() {
    const d = mg.getImageData(0, 0, MW, MH).data; let s = 0, n = 0;
    for (let y = Math.floor(MH * .14); y < MH * .82; y += 4) for (let x = Math.floor(MW * .1); x < MW * .9; x += 4) { s += Math.min(1, d[(y * MW + x) * 4] / 200); n++; }
    st.clean = s / n; o.onProgress && o.onProgress(st.clean);
    if (st.clean > .85 && !st.done) { st.done = true; st.shine = -9; o.onClean && o.onClean(); }
  }

  // ---- input ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tmp = new THREE.Vector3();
  const toSlab = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, tmp) ? tmp.clone() : null; };
  const within = p => p && Math.abs(p.x) < SW * .47 && Math.abs(p.z) < SD * .45;
  canvas.addEventListener('pointerdown', e => { const p = toSlab(e.clientX, e.clientY); if (!within(p)) return; st.on = true; st.touched = true; st.auto = null; st.goal.copy(p); canvas.setPointerCapture(e.pointerId); o.onTouch && o.onTouch(); kick(); });
  canvas.addEventListener('pointermove', e => { const p = toSlab(e.clientX, e.clientY); if (p) { p.x = clamp(p.x, -SW * .46, SW * .46); p.z = clamp(p.z, -SD * .44, SD * .44); st.goal.copy(p); kick(); } });
  const up = () => { st.on = false; st.last = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  // idle demo: one slow pass so people see what happens
  function demo() { if (st.touched || RM) return; st.auto = { t: 0 }; kick(); }

  // ---- framing ----
  let W = 1, H = 1;
  const fit = () => { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); kick(); };
  new ResizeObserver(fit).observe(canvas);

  // ---- loop ----
  let raf = 0, last = 0, visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  const upV = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  function tick(now) {
    raf = 0; const real = Math.max(0, Math.min(.1, (now - last) / 1000)), dt = Math.min(.05, real); last = now; st.t += dt; U.uT.value = st.t;
    // auto demo pass
    if (st.auto) { st.auto.t += real; const k = st.auto.t / 2.6; st.goal.set(lerp(-2.6, 2.4, k), 0, lerp(.9, .5, k) + Math.sin(k * 9) * .08); st.on = k < 1; if (k >= 1) { st.auto = null; st.on = false; st.last = null; } }
    st.hit.lerp(st.goal, 1 - Math.pow(.0005, real));
    // paint along the path while spraying
    if (st.on) {
      const p = st.hit.clone();
      if (st.last) { const d = p.distanceTo(st.last), steps = Math.max(1, Math.ceil(d / .05)); for (let s = 1; s <= steps; s++) { const q2 = st.last.clone().lerp(p, s / steps); paint(q2.x, q2.z, .32); } } else paint(p.x, p.z, .32);
      st.last = p;
      // spray fan from the nozzle to the slab
      const nx = p.x + .55, ny = NOZ_H, nz = p.z + .7;
      for (let k = 0; k < (SMALL ? 10 : 18); k++) { const fan = (Math.random() - .5) * .5, tx = p.x + fan, tz = p.z + (Math.random() - .5) * .08, tt = .09 + Math.random() * .04; emit(nx, ny, nz, (tx - nx) / tt, (0 - ny) / tt, (tz - nz) / tt, tt, 0); }
      for (let k = 0; k < (SMALL ? 6 : 10); k++) { const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 2.2; emit(p.x, .02, p.z, Math.cos(a) * s * .6, 1 + Math.random() * 2, Math.sin(a) * s * .6, .3 + Math.random() * .4, 1); }
      if (Math.random() < .6) emit(p.x + (Math.random() - .5) * .3, .1, p.z + (Math.random() - .5) * .3, (Math.random() - .5) * .3, .3 + Math.random() * .4, (Math.random() - .5) * .3, 1 + Math.random(), 2);
    }
    // particles
    for (let i = 0; i < PN; i++) { if (pl[i] < 0) continue; pl[i] -= real; if (pl[i] <= 0) { pl[i] = -1; continue; }
      pv[i * 3 + 1] -= (pk[i] === 2 ? .2 : 9.8) * real; pp[i * 3] += pv[i * 3] * real; pp[i * 3 + 1] += pv[i * 3 + 1] * real; pp[i * 3 + 2] += pv[i * 3 + 2] * real;
      if (pp[i * 3 + 1] < 0 && pk[i] !== 2) { if (pk[i] === 0) pl[i] = -1; else { pp[i * 3 + 1] = 0; pv[i * 3 + 1] *= -.3; pv[i * 3] *= .6; pv[i * 3 + 2] *= .6; } } }
    pg.attributes.position.needsUpdate = true; pg.attributes.aL.needsUpdate = true; pg.attributes.aK.needsUpdate = true;
    // the lance follows the jet
    lance.position.set(st.hit.x + .55, NOZ_H + .02, st.hit.z + .7);
    dir.set(st.hit.x - lance.position.x, -NOZ_H, st.hit.z - lance.position.z).normalize().negate(); q.setFromUnitVectors(upV, dir); lance.quaternion.slerp(q, 1 - Math.pow(.001, real));
    lance.visible = st.on || st.touched || !!st.auto;
    // drying: wet mask fades out
    if (st.t % .1 < dt) { wg.globalCompositeOperation = 'destination-out'; wg.fillStyle = 'rgba(0,0,0,.035)'; wg.fillRect(0, 0, wc.width, wc.height); wg.globalCompositeOperation = 'source-over'; wetTex.needsUpdate = true; }
    if (st.dirty) { maskTex.needsUpdate = true; wetTex.needsUpdate = true; st.dirty = false; }
    measureT += real; if (measureT > .35 && (st.on || st.auto)) { measureT = 0; measure(); }
    if (st.done && st.shine < 9) { st.shine += real * 9; U.uShine.value = st.shine - 4; } else U.uShine.value = -20;
    // camera: low, cinematic three-quarter, gentle drift
    const narrow = camera.aspect < .9, dist = narrow ? 10.2 : 8.8;
    const az = -.22 + (RM ? 0 : Math.sin(st.t * .12) * .035), el = narrow ? .66 : .44;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(W, H, 0, -H * (o.shiftY != null ? o.shiftY : .2), W, H);
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  if (RM) { paint(0, 0, 0); }
  fit(); kick();
  return { demo, reset: () => { mg.fillStyle = '#000'; mg.fillRect(0, 0, MW, MH); st.clean = 0; st.done = false; st.dirty = true; o.onProgress && o.onProgress(0); kick(); }, get clean() { return st.clean; }, renderer };
}
