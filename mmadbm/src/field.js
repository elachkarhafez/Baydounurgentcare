/* =====================================================================
   DBM (Ahmad Dakka): one GPU particle field behind the whole site.
   ~90K points (35K on phones) that morph between shapes: an explosion that
   slams into his name on open, his reach number, a vertical video frame with
   breakdown marks (circles, arrows), "PRESENTED BY <BRAND>" that re-forms
   live while a sponsor types, and the DBM sign-off. Shapes are sampled from
   canvas text or built analytically; the vertex shader blends two shapes
   with per-particle stagger, a curl-ish turbulence during the move, cursor
   repulsion and depth-scaled point size. Additive + UnrealBloom.
   Bundle: kit/build3d/build.sh mmadbm/src/field.js mmadbm/assets/field.js
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const FONT = '"Big Shoulders Display", "Arial Narrow", Arial, sans-serif';

export async function mountField(canvas, o = {}) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 820px)').matches;
  const N = o.count || (SMALL ? 36000 : 90000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 1.6));
  // the composer encodes the clear colour to sRGB twice, so hand it a pre-darkened linear value (lands at #050506)
  renderer.setClearColor(new THREE.Color(.00012, .00012, .00014), 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 200); camera.position.set(0, 0, 16);

  // ---------- shape builders ----------
  let aspect = innerWidth / innerHeight, viewW = 1, viewH = 1;
  const measureView = () => { aspect = innerWidth / innerHeight; viewH = 2 * Math.tan(THREE.MathUtils.degToRad(20)) * 16; viewW = viewH * aspect; };
  measureView();
  const rand = mulberry(7);
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // lines: [{ t, size (relative), weight, track }] → particle targets inside the glyphs
  function textShape(lines, { width, cx = 0, cy = 0, depth = .35, seed = 1 } = {}) {
    const W = 1600, LH = 1.0, sizes = lines.map(l => l.size || 1), total = sizes.reduce((a, b) => a + b, 0);
    const H = Math.round(W * .62); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // fit: biggest font so the widest line fills ~94% of the canvas width
    let base = 600; const widthAt = (l, b) => { g.font = `${l.weight || 800} ${b * (l.size || 1)}px ${FONT}`; if (l.track) g.letterSpacing = `${b * (l.size || 1) * l.track}px`; else g.letterSpacing = '0px'; return g.measureText(l.t).width; };
    while (base > 20 && (Math.max(...lines.map(l => widthAt(l, base))) > W * .94 || base * total * LH > H * .94)) base -= 8;
    let y = H / 2 - base * total * LH / 2;
    lines.forEach(l => { const s = base * (l.size || 1); g.font = `${l.weight || 800} ${s}px ${FONT}`; g.letterSpacing = l.track ? `${s * l.track}px` : '0px'; g.fillText(l.t, W / 2, y + s * LH / 2 + s * .04); y += s * LH; });
    const px = g.getImageData(0, 0, W, H).data, pts = [];
    for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (px[(yy * W + xx) * 4 + 3] > 120) pts.push(xx, yy);
    const out = new Float32Array(N * 3), r = mulberry(seed), k = width / W, n = pts.length / 2;
    for (let i = 0; i < N; i++) { const j = (r() * n | 0) * 2; out[i * 3] = cx + (pts[j] - W / 2 + (r() - .5) * 2) * k; out[i * 3 + 1] = cy - (pts[j + 1] - H / 2 + (r() - .5) * 2) * k; out[i * 3 + 2] = (r() - .5) * depth; }
    return out;
  }
  // a three-armed spiral vortex (flat disc; the shader spins and tilts it) plus a few scattered stars
  function burst(seed = 3) {
    const out = new Float32Array(N * 3), r = mulberry(seed), g = () => (r() + r() + r() - 1.5) / 1.5;
    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (r() < .1) { const u = r() * 2 - 1, th = r() * Math.PI * 2, rr = 8 + r() * 26, s = Math.sqrt(1 - u * u); x = Math.cos(th) * s * rr; y = u * rr * .6; z = Math.sin(th) * s * rr; }
      else if (r() < .14) { const rr = Math.pow(r(), 2) * 2.2, th = r() * Math.PI * 2; x = Math.cos(th) * rr; z = Math.sin(th) * rr; y = g() * .5; }
      else { const rr = 1.6 + Math.pow(r(), .8) * 13, ang = (i % 3) * 2.094 + rr * .42 + g() * (.1 + rr * .012); x = Math.cos(ang) * rr; z = Math.sin(ang) * rr; y = g() * (.1 + rr * .02); }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }
  // a vertical video frame (9:16) with play mark, telestrator circle + arrow, scrub bar
  function phoneShape({ cx = 0, cy = 0, h = 9, seed = 5 } = {}) {
    const out = new Float32Array(N * 3), r = mulberry(seed), w = h * 9 / 16, rad = .55;
    const seg = []; // weighted samplers
    const rr = (fn, wt) => seg.push([fn, wt]);
    const edge = () => { // rounded rectangle outline, thick
      const per = 2 * (w + h - 4 * rad) + 2 * Math.PI * rad; let t = r() * per; let x, y;
      const sx = w / 2 - rad, sy = h / 2 - rad;
      if ((t -= 2 * sx) < 0) { x = -sx + (t + 2 * sx); y = h / 2; } else if ((t -= Math.PI * rad / 2) < 0) { const a = (t + Math.PI * rad / 2) / rad; x = sx + Math.sin(a) * rad; y = sy + Math.cos(a) * rad; }
      else if ((t -= 2 * sy) < 0) { x = w / 2; y = sy - (t + 2 * sy); } else if ((t -= Math.PI * rad / 2) < 0) { const a = (t + Math.PI * rad / 2) / rad; x = sx + Math.cos(a) * rad; y = -sy - Math.sin(a) * rad; }
      else if ((t -= 2 * sx) < 0) { x = sx - (t + 2 * sx); y = -h / 2; } else if ((t -= Math.PI * rad / 2) < 0) { const a = (t + Math.PI * rad / 2) / rad; x = -sx - Math.sin(a) * rad; y = -sy - Math.cos(a) * rad; }
      else if ((t -= 2 * sy) < 0) { x = -w / 2; y = -sy + (t + 2 * sy); } else { const a = (t) / rad; x = -sx - Math.cos(a) * rad; y = sy + Math.sin(a) * rad; }
      const j = (r() - .5) * .14; return [x + j, y + (r() - .5) * .14];
    };
    rr(edge, .34);
    rr(() => { // play triangle (filled) in the centre
      let a = r(), b = r(); if (a + b > 1) { a = 1 - a; b = 1 - b; } const p = [[-.55, .75], [-.55, -.75], [.8, 0]]; return [p[0][0] + a * (p[1][0] - p[0][0]) + b * (p[2][0] - p[0][0]), p[0][1] + a * (p[1][1] - p[0][1]) + b * (p[2][1] - p[0][1])]; }, .12);
    rr(() => { const a = r() * Math.PI * 2, R0 = 1.25 + (r() - .5) * .12; return [-.6 + Math.cos(a) * R0 * 1.15, 2.2 + Math.sin(a) * R0 * .8]; }, .14);   // telestrator circle
    rr(() => { const t = r(); if (r() < .8) return [.7 + t * 1.2, 1.4 - t * 1.4 + Math.sin(t * 3) * .1]; const s = r(); return r() < .5 ? [1.9 - s * .45, s * .45 * .2 - .05] : [1.9 - s * .1, s * .45]; }, .08); // arrow
    rr(() => [-w / 2 + .5 + r() * (w - 1), -h / 2 + .9 + (r() - .5) * .08], .1);                     // scrub bar
    rr(() => [-w / 2 + .5 + r() * (w - 1) * .62, -h / 2 + .9 + (r() - .5) * .22], .08);                // progress (thicker)
    rr(() => [-w / 2 + .5 + r() * (w - 1) * .7, h / 2 - 1.25 + (r() - .5) * .3], .07);               // caption bar
    rr(() => [(r() - .5) * w * .95, (r() - .5) * h * .95], .07);                                         // a faint fill so it reads as a screen
    const tot = seg.reduce((a, s) => a + s[1], 0);
    for (let i = 0; i < N; i++) { let q = r() * tot, k = 0; while ((q -= seg[k][1]) > 0 && k < seg.length - 1) k++; const [x, y] = seg[k][0](); out[i * 3] = cx + x; out[i * 3 + 1] = cy + y; out[i * 3 + 2] = (r() - .5) * .3; }
    // a little 3D tilt
    const m = new THREE.Matrix4().makeRotationY(-.32), v = new THREE.Vector3();
    for (let i = 0; i < N; i++) { v.set(out[i * 3] - cx, out[i * 3 + 1] - cy, out[i * 3 + 2]).applyMatrix4(m); out[i * 3] = v.x + cx; out[i * 3 + 1] = v.y + cy; out[i * 3 + 2] = v.z; }
    return out;
  }

  // layout per viewport: centred on phones, pushed right on desktop where the copy is left
  const side = () => (viewW > 14 ? viewW * .23 : 0);
  let brand = '';
  const builders = {
    burst: () => burst(),
    name: () => viewW < 12
      ? textShape([{ t: 'AHMAD' }, { t: 'DAKKA' }], { width: viewW * .8, cy: 2.75, seed: 11 })
      : textShape([{ t: 'AHMAD DAKKA' }], { width: Math.min(viewW * .8, 22), cy: 1.1, seed: 11 }),
    reach: () => textShape([{ t: '130K+' }, { t: 'FOLLOWERS', size: .3, weight: 800, track: .22 }], { width: Math.min(viewW * (viewW > 14 ? .4 : .8), 11), cx: side(), cy: viewW > 14 ? .2 : 2.6, seed: 12 }),
    phone: () => phoneShape({ cx: side() * 1.05, cy: viewW > 14 ? 0 : 1.2, h: Math.min(viewH * (viewW > 14 ? .78 : .5), 11.5) }),
    brand: () => textShape([{ t: 'PRESENTED BY', size: .27, weight: 800, track: .2 }, { t: (brand || 'YOUR BRAND').toUpperCase() }], { width: Math.min(viewW * (viewW > 14 ? .74 : .86), 17), cy: viewW > 14 ? 1.6 : 2.4, seed: 13 }),
    dbm: () => textShape([{ t: 'DBM' }], { width: Math.min(viewW * (viewW > 14 ? .42 : .7), 10), cy: viewW > 14 ? 1.2 : 1.8, seed: 14 })
  };
  const cache = {};
  const keyOf = k => (k === 'brand' ? 'brand:' + brand : k);
  const shape = k => { const key = keyOf(k); return cache[key] || (cache[key] = builders[k]()); };

  // ---------- geometry + shader ----------
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(new Float32Array(N * 3), 3), aTo = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
  const seedA = new Float32Array(N * 4); { const r = mulberry(99); for (let i = 0; i < N; i++) { seedA[i * 4] = r(); seedA[i * 4 + 1] = r(); seedA[i * 4 + 2] = r(); seedA[i * 4 + 3] = r(); } }
  geo.setAttribute('position', aPos); geo.setAttribute('aTo', aTo); geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80);
  const U = {
    uMix: { value: 0 }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 0) }, uPush: { value: 0 },
    uSize: { value: (SMALL ? 2.1 : 1.7) * renderer.getPixelRatio() }, uSurge: { value: 0 }, uSpin: { value: 0 }, uTilt: { value: 0 }, uDim: { value: 1 },
    uRed: { value: new THREE.Color(0xff2a1f) }, uWhite: { value: new THREE.Color(0xfff4ea) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aTo; attribute vec4 aSeed;
      uniform float uMix, uTime, uPush, uSize, uSurge, uSpin, uTilt, uDim; uniform vec3 uMouse;
      varying float vA; varying float vRed; varying float vHot;
      vec3 hash3(vec3 p){ p = fract(p * vec3(.1031,.1030,.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx) - .5; }
      void main(){
        // staggered progress so the shape sweeps in rather than popping
        float d = aSeed.x * .4 + clamp(aTo.x * .01, -.1, .1) + .1;
        float t = clamp(uMix * 1.6 - d, 0., 1.); t = t * t * (3. - 2. * t);
        vec3 a0 = position;
        // vortex: the source cloud spins like a galaxy and unwinds as it lands
        float sp = uSpin * (1. - t) * (.6 + aSeed.y * .8) / (1. + length(a0.xz) * .04);
        a0.xz = mat2(cos(sp), -sin(sp), sin(sp), cos(sp)) * a0.xz;
        a0.yz = mat2(cos(uTilt), -sin(uTilt), sin(uTilt), cos(uTilt)) * a0.yz;
        vec3 p = mix(a0, aTo, t);
        // turbulence while travelling: arcs out of the plane and swirls
        float mid = sin(3.14159 * t);
        vec3 swirl = vec3(sin(uTime * .7 + aSeed.y * 6.28 + p.y * .35), cos(uTime * .6 + aSeed.z * 6.28 + p.x * .3), sin(uTime * .5 + aSeed.w * 6.28));
        p += swirl * mid * (1.4 + aSeed.y * 2.2) + vec3(0., 0., mid * (aSeed.z - .5) * 7.);
        // idle breathing
        p.xy += vec2(sin(uTime * .9 + aSeed.y * 40.), cos(uTime * .8 + aSeed.z * 40.)) * .025;
        // cursor repulsion (in the z=0 plane)
        vec2 dm = p.xy - uMouse.xy; float dl = length(dm);
        float push = uPush * smoothstep(2.4, 0., dl);
        p.xy += normalize(dm + 1e-4) * push * (1.2 + aSeed.w);
        p.z += push * (aSeed.x - .3) * 3.;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float big = step(.985, aSeed.w) * 2.4;
        gl_PointSize = min((uSize + big + mid * 1.2 + push * 2.) * (16. / max(-mv.z, 1.)), 24.);
        vA = .45 + .55 * aSeed.z; vA *= (1. + mid * .6 + uSurge) * uDim;
        // broadcast scan: a light band sweeps across every few seconds
        float sx = mod(uTime * 9., 90.) - 45.;
        float scan = smoothstep(1.6, 0., abs(p.x - sx + p.y * .35));
        vRed = step(.78, aSeed.y) + mid * .5; vHot = push + mid + scan * .9 + uSurge * .5;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uRed, uWhite; varying float vA; varying float vRed; varying float vHot;
      void main(){
        vec2 c = gl_PointCoord - .5; float r = length(c); if (r > .5) discard;
        float a = smoothstep(.5, .0, r); a *= a;
        vec3 col = mix(uWhite, uRed, clamp(vRed, 0., 1.)) * (1. + vHot * .6);
        gl_FragColor = vec4(col * a * vA * .95, a * vA);
      }`
  });
  const points = new THREE.Points(geo, mat); scene.add(points);

  // dust + light shafts for depth
  const dustN = SMALL ? 900 : 2400, dp = new Float32Array(dustN * 3); { const r = mulberry(4); for (let i = 0; i < dustN; i++) { dp[i * 3] = (r() - .5) * 70; dp[i * 3 + 1] = (r() - .5) * 40; dp[i * 3 + 2] = -r() * 40 - 4; } }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x8a8f9e, size: .07, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust);
  const shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xff3326) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uT; uniform vec3 uC; varying vec2 vUv; void main(){ float x = abs(vUv.x - .5) * 2.; float a = smoothstep(1., 0., x) * smoothstep(0., .9, vUv.y) * (.5 + .5 * sin(uT * .6 + vUv.y * 3.)); gl_FragColor = vec4(uC * a * .012, a * .012); }' });
  const shafts = [];
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 60), shaftMat.clone()); s.position.set(-14 + i * 14, 14, -22); s.rotation.z = (i - 1) * .35; if (i === 1) s.material.uniforms.uC.value = new THREE.Color(0xffe8d6); scene.add(s); shafts.push(s); }

  // slam shockwave
  const ringMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = smoothstep(.86, .97, r) * smoothstep(1., .97, r); gl_FragColor = vec4(vec3(1., .3, .22) * a * uA, a * uA); }' });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat); ring.visible = false; scene.add(ring);
  let ringT = 9, shake = 0;
  function slam() { ringT = 0; ring.visible = true; shake = 1; U.uSurge.value = 1.3; }

  // ---------- post ----------
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), SMALL ? .7 : .85, .55, .12); composer.addPass(bloom); composer.addPass(new OutputPass());

  // ---------- state ----------
  let pairA = null, pairB = null, mix = 0, tween = null, t0 = 0, camZ = RM ? 16 : 34, camGoal = 16, want = null, spinT0 = 0;
  function setPair(a, b) {
    const ka = keyOf(a), kb = keyOf(b);
    if (ka === pairA && kb === pairB) return;
    aPos.array.set(shape(a)); aTo.array.set(shape(b)); aPos.needsUpdate = aTo.needsUpdate = true; pairA = ka; pairB = kb;
  }
  const settle = () => { if (want) { setPair(want[0], want[1]); mix = clamp(want[2]); } };
  // before the intro: the particles hang as a slowly spinning cloud
  function prime() { setPair('burst', 'name'); mix = 0; camZ = 34; spinT0 = t0; }
  // intro: the cloud collapses and slams into his name
  function intro(ms = 2600) {
    if (pairA !== 'burst') prime();
    tween = { from: 0, to: 1, t: 0, d: RM ? .01 : ms / 1000, done: () => { slam(); o.onIntroDone && o.onIntroDone(); settle(); } };
  }
  // scroll: show shape a blending toward b
  function scroll(a, b, k) { want = [a, b, k]; if (tween || pairA === 'burst') return; setPair(a, b); mix = clamp(k); }
  function setBrand(name) {
    const n = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18); if (n === brand) return;
    const shown = (pairA === keyOf('brand') && mix < .5) || (pairB === keyOf('brand') && mix >= .5);
    const old = shape('brand'); for (const k in cache) if (k.startsWith('brand:') && k !== keyOf('brand')) delete cache[k];
    brand = n;
    if (tween || pairA === 'burst') return;
    if (shown && !RM) { aPos.array.set(old); aTo.array.set(shape('brand')); aPos.needsUpdate = aTo.needsUpdate = true; pairA = pairB = '~'; mix = 0; U.uSurge.value = .7; tween = { from: 0, to: 1, t: 0, d: .95, done: settle }; }
    else settle();
  }

  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  let dimGoal = 1, pushGoal = 0, lastMove = 0, par = { x: 0, y: 0 };
  const move = (x, y) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(plane, hit)) U.uMouse.value.copy(hit); pushGoal = 1.5; lastMove = performance.now(); par.x = ndc.x; par.y = ndc.y; };
  addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', e => { move(e.clientX, e.clientY); pushGoal = 2.6; }, { passive: true });
  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    const before = viewW; measureView(); if (Math.abs(before - viewW) > .5) { for (const k in cache) delete cache[k]; const tw = pairA === 'burst'; pairA = pairB = null; if (tw) setPair('burst', 'name'); else if (!tween) settle(); } };
  addEventListener('resize', resize); resize();

  // ---------- loop ----------
  let raf = 0, last = performance.now();
  const frame = now => {
    raf = 0; const dt = clamp((now - last) / 1000, 0, .05); last = now; t0 += dt; U.uTime.value = t0;
    if (tween) { tween.t += Math.min((now - (tween.last || now)) / 1000, .2) / tween.d; tween.last = now; const k = clamp(tween.t); mix = tween.from + (tween.to - tween.from) * k; if (k >= 1) { const d = tween.done; tween = null; d && d(); } }
    U.uMix.value = RM ? Math.round(mix) : mix;
    const vortex = pairA === 'burst';
    U.uSpin.value = vortex && !RM ? (t0 - spinT0) * .45 + 1.4 : 0; U.uTilt.value = vortex ? -1.12 : 0;
    if (ring.visible) { ringT += dt / .9; const e = 1 - Math.pow(1 - clamp(ringT), 3); ring.scale.setScalar(1 + e * 26); ring.material.uniforms.uA.value = (1 - clamp(ringT)) * 1.4; ring.position.set(0, viewW < 12 ? 1.9 : 1.1, 0); if (ringT >= 1) ring.visible = false; }
    shake *= Math.pow(.015, dt);
    U.uDim.value += (dimGoal - U.uDim.value) * (1 - Math.pow(.05, dt));
    if (performance.now() - lastMove > 900) pushGoal = 0;
    U.uPush.value += (pushGoal - U.uPush.value) * (1 - Math.pow(.02, dt));
    U.uSurge.value *= Math.pow(.2, dt);
    camZ += (camGoal - camZ) * (1 - Math.pow(.12, dt));
    camera.position.set(par.x * .9 + (Math.random() - .5) * shake * .5, par.y * .6 + (Math.random() - .5) * shake * .5, camZ); camera.lookAt(0, 0, 0);
    points.rotation.y = RM ? 0 : Math.sin(t0 * .15) * .08; dust.rotation.y = t0 * .01;
    shafts.forEach((s, i) => { s.material.uniforms.uT.value = t0 + i * 2; s.rotation.z = (i - 1) * .35 + Math.sin(t0 * .2 + i) * .05; });
    composer.render(dt);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', start);
  if (o.primed) prime(); else setPair('name', 'name');
  start();
  return { scene, bloom, composer, prime, intro, scroll, setBrand, slam, surge: v => { U.uSurge.value = v; }, dim: v => { dimGoal = v; }, renderer, get mix() { return mix; }, get pair() { return [pairA, pairB]; } };
}
