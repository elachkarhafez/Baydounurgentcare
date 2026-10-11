/* =====================================================================
   WebIgnite: the logo's globe, lit for real.
   A glowing sphere wrapped in a white-hot web (nodes + great-circle arcs that
   light up outward from Detroit), a lat/long grid, and a GPU fire: ~24K
   particles rising from behind the globe and sweeping up and right like the
   logo's flames, plus embers that drift up the whole page. Additive + bloom.
   - intro(): dark globe → the web ignites from Detroit outward → the fire
     catches with a flash and a shake → camera settles
   - ignite(city): globe turns to Michigan, camera pushes in, a beacon stands
     on the city and rings of light race across the web
   - scroll(k): after the hero the globe sinks back and dims; embers stay
   Bundle: kit/build3d/build.sh webignite/src/globe.js webignite/assets/globe.js
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = t => { t = clamp(t); const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const R = 2;
const D2R = Math.PI / 180;
// lat/lon → point on the globe (lon 0 faces +z)
const ll = (lat, lon, r = R) => new THREE.Vector3(Math.cos(lat * D2R) * Math.sin(lon * D2R) * r, Math.sin(lat * D2R) * r, Math.cos(lat * D2R) * Math.cos(lon * D2R) * r);
export const CITIES = { Detroit: [42.33, -83.05], Dearborn: [42.32, -83.18], Livonia: [42.37, -83.35], 'Allen Park': [42.26, -83.21], 'Ann Arbor': [42.28, -83.74], Warren: [42.49, -83.03], Troy: [42.61, -83.15], 'Grand Rapids': [42.96, -85.67], Lansing: [42.73, -84.56], Flint: [43.01, -83.69] };

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function mountGlobe(canvas, o = {}) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 1.75));
  // the composer sRGB-encodes the clear colour twice: hand it a pre-darkened linear value so it lands on #080608
  renderer.setClearColor(new THREE.Color(.000186, .000141, .000186), 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const rnd = mulberry(11);
  const PR = renderer.getPixelRatio();

  const world = new THREE.Group(); scene.add(world);          // moves with scroll
  const globe = new THREE.Group(); world.add(globe);          // spins

  // ---- core: lit from inside like the logo (dark until it catches) ----
  const U = { uHeat: { value: RM ? 1 : 0 }, uTime: { value: 0 }, uDraw: { value: RM ? 1 : 0 }, uPulse: { value: -1 }, uFire: { value: RM ? 1 : 0 }, uSurge: { value: 0 }, uPR: { value: PR }, uDim: { value: 1 } };
  const core = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); vW = normalize((modelMatrix * vec4(position,0.)).xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uHeat, uTime, uSurge, uDim; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float fr = pow(1. - max(dot(vN, vV), 0.), 2.2);
        float lit = clamp(dot(vW, normalize(vec3(.55, .6, .55))) * .5 + .5, 0., 1.);
        vec3 cold = vec3(.035, .022, .022) + fr * vec3(.25, .06, .04);
        vec3 hot = mix(vec3(.05, .004, .004), vec3(.42, .08, .015), pow(lit, 2.6));
        hot = mix(hot, vec3(.95, .5, .14), pow(lit, 10.) * .65);
        float flick = .92 + .08 * sin(uTime * 7. + vW.y * 6.) * sin(uTime * 3.1 + vW.x * 5.);
        vec3 c = mix(cold, hot * flick, uHeat) + fr * vec3(.9, .28, .06) * (.3 + uSurge * .8) * uHeat;
        gl_FragColor = vec4(c * uDim, 1.);
      }`
  }));
  globe.add(core);

  // ---- web: nodes + arcs, lit outward from Detroit ----
  const home = ll(...CITIES.Detroit);
  const nodes = [home.clone()];
  for (const k in CITIES) if (k !== 'Detroit') nodes.push(ll(...CITIES[k]));
  while (nodes.length < (SMALL ? 70 : 96)) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); nodes.push(new THREE.Vector3(Math.cos(th) * s * R, u * R, Math.sin(th) * s * R)); }
  const arcPos = [], arcD = [];
  const dist = v => v.angleTo(home);
  const maxD = Math.PI;
  const seg = (a, b, lift = 1.012, n = 18) => { for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; [t0, t1].forEach(t => { const p = a.clone().normalize().lerp(b.clone().normalize(), t).normalize().multiplyScalar(R * (lift + Math.sin(Math.PI * t) * .04)); arcPos.push(p.x, p.y, p.z); arcD.push(dist(p) / maxD); }); } };
  nodes.forEach((a, i) => { const near = nodes.map((b, j) => [a.distanceTo(b), j]).filter(x => x[1] !== i).sort((x, y) => x[0] - y[0]).slice(0, i < 10 ? 4 : 3); near.forEach(([, j]) => { if (j > i || i < 10) seg(a, nodes[j]); }); });
  const webGeo = new THREE.BufferGeometry(); webGeo.setAttribute('position', new THREE.Float32BufferAttribute(arcPos, 3)); webGeo.setAttribute('aD', new THREE.Float32BufferAttribute(arcD, 1));
  const lineMat = (base, alpha) => new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aD; varying float vD; varying float vF; void main(){ vD = aD; vec4 mv = modelViewMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * normalize(position)); vF = smoothstep(-.25, .35, dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uDraw, uPulse, uDim, uHeat; varying float vD; varying float vF;
      void main(){
        float on = smoothstep(vD - .015, vD, uDraw * 1.02);
        float edge = smoothstep(.06, 0., abs(vD - uDraw)) * step(uDraw, .999);
        float ring = uPulse < 0. ? 0. : smoothstep(.035, 0., abs(vD - fract(uPulse))) * (1. - fract(uPulse) * .6);
        vec3 c = vec3(${base}) * on * .8 + vec3(1., .8, .5) * edge * 2. + vec3(1., .9, .7) * ring * 2.;
        gl_FragColor = vec4(c * (.25 + .75 * vF) * uDim, (on * ${alpha} + edge + ring) * vF);
      }` });
  const web = new THREE.LineSegments(webGeo, lineMat('1., .93, .86', '.9')); globe.add(web);
  // lat/long grid, faint
  const gPos = [], gD = [];
  const push = p => { gPos.push(p.x, p.y, p.z); gD.push(dist(p) / maxD); };
  for (let la = -60; la <= 60; la += 20) for (let lo = 0; lo < 360; lo += 4) { push(ll(la, lo, R * 1.004)); push(ll(la, lo + 4, R * 1.004)); }
  for (let lo = 0; lo < 360; lo += 20) for (let la = -84; la < 84; la += 4) { push(ll(la, lo, R * 1.004)); push(ll(la + 4, lo, R * 1.004)); }
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3)); gridGeo.setAttribute('aD', new THREE.Float32BufferAttribute(gD, 1));
  globe.add(new THREE.LineSegments(gridGeo, lineMat('1., .45, .2', '.22')));
  // nodes
  const nPos = new Float32Array(nodes.length * 3), nD = new Float32Array(nodes.length), nS = new Float32Array(nodes.length);
  nodes.forEach((v, i) => { const p = v.clone().multiplyScalar(1.016); nPos.set([p.x, p.y, p.z], i * 3); nD[i] = dist(v) / maxD; nS[i] = i < 10 ? 1.6 : .7 + rnd() * .6; });
  const nGeo = new THREE.BufferGeometry(); nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3)); nGeo.setAttribute('aD', new THREE.BufferAttribute(nD, 1)); nGeo.setAttribute('aS', new THREE.BufferAttribute(nS, 1));
  const nodePts = new THREE.Points(nGeo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aD; attribute float aS; uniform float uDraw, uPR, uTime; varying float vOn; varying float vF; void main(){ vOn = smoothstep(aD - .01, aD, uDraw); vec4 mv = modelViewMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * normalize(position)); vF = smoothstep(-.1, .4, dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; gl_PointSize = aS * (5. + 1.5 * sin(uTime * 3. + aD * 40.)) * uPR * (9. / -mv.z) * vOn; }',
    fragmentShader: 'uniform float uDim; varying float vOn; varying float vF; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, 0., r); gl_FragColor = vec4(vec3(1., .95, .85) * a * 1.4 * vF * uDim, a * vF); }' }));
  globe.add(nodePts);

  // ---- city beacon (for ignite) ----
  const beacon = new THREE.Group(); globe.add(beacon); beacon.visible = false;
  const beamMat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA, uTime; varying vec2 vUv; void main(){ float x = abs(vUv.x - .5) * 2.; float a = (1. - x) * (1. - x) * (1. - vUv.y) * uA * (.85 + .15 * sin(uTime * 20. + vUv.y * 30.)); gl_FragColor = vec4(vec3(1., .7, .3) * a * 2., a); }' });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(.12, 1.6), beamMat); beam.position.y = .8; const beam2 = beam.clone(); beam2.rotation.y = Math.PI / 2; beacon.add(beam, beam2);
  const ringMat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = smoothstep(.8, .95, r) * smoothstep(1., .95, r) * uA; gl_FragColor = vec4(vec3(1., .6, .25) * a * 2., a); }' });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; beacon.add(ring);
  const placeBeacon = v => { beacon.position.copy(v.clone().normalize().multiplyScalar(R * 1.01)); beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); };

  // ---- fire: GPU particles in flame tongues that rise from behind the globe's left rim and curl up and right ----
  const FN = o.fireCount || (SMALL ? 12000 : 30000), TONGUES = 9;
  const fb = new Float32Array(FN * 3), fs = new Float32Array(FN * 4), ft = new Float32Array(FN * 4);
  const tongue = [];
  for (let k = 0; k < TONGUES; k++) {
    const a = (95 + k * (150 / (TONGUES - 1)) + (rnd() - .5) * 10) * D2R;               // around the left half of the silhouette, top → bottom
    const base = new THREE.Vector3(Math.cos(a), Math.sin(a), -.12).normalize().multiplyScalar(R * .96);
    const up = 1 - k / (TONGUES - 1);                                                       // tongues near the top are tallest
    tongue.push([base, 1.6 + up * 2.6 + rnd() * .6, .6 + up * 1.6 + rnd() * .4, .28 + up * .22]);
  }
  for (let i = 0; i < FN; i++) {
    const k = Math.min(TONGUES - 1, Math.floor(Math.pow(rnd(), .8) * TONGUES)), [base, h, curl, wid] = tongue[k];
    fb.set([base.x, base.y, base.z], i * 3);
    fs.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    ft.set([h, curl, wid, k / TONGUES], i * 4);
  }
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fb, 3)); fGeo.setAttribute('aSeed', new THREE.BufferAttribute(fs, 4)); fGeo.setAttribute('aT', new THREE.BufferAttribute(ft, 4));
  fGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 9);
  const fire = new THREE.Points(fGeo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aSeed; attribute vec4 aT; uniform float uTime, uFire, uPR, uSurge; varying float vLife; varying float vA;
      void main(){
        float sp = .42 + aSeed.y * .3;
        float life = fract(uTime * sp + aSeed.x);
        float flick = .82 + .18 * sin(uTime * (3. + aT.w * 5.) + aT.w * 40.) * sin(uTime * 1.7 + aT.w * 9.);
        float h = aT.x * flick * (.3 + .7 * uFire) * (1. + uSurge * .4);
        vec3 rimN = normalize(vec3(position.xy, 0.));
        // centreline: out from the rim, then up, then curling right over the top
        vec3 c = position + rimN * (.95 * sin(life * 2.4) * (.5 + aT.z)) + vec3(0., 1., 0.) * (life * h) + vec3(1., 0., 0.) * (life * life * aT.y);
        c.x += sin(uTime * 2.2 + aT.w * 30. + life * 5.) * .18 * life;
        // spread around the centreline, narrowing to a point
        float w = aT.z * (1. - life * .85) * (.6 + .4 * uFire);
        float ang = aSeed.z * 6.2832, rr = sqrt(aSeed.w) * w;
        c += vec3(cos(ang) * rr, sin(ang) * rr * .5, sin(ang) * rr);
        vec4 mv = modelViewMatrix * vec4(c, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = mix(2.1, .9, life) * (.7 + aSeed.y * .7) * uPR * 130. / -mv.z;
        vLife = life; vA = uFire * smoothstep(0., .05, life) * (1. - smoothstep(.6, 1., life));
      }`,
    fragmentShader: `uniform float uDim; varying float vLife; varying float vA;
      void main(){
        float r = length(gl_PointCoord - .5); if (r > .5) discard;
        vec3 c = mix(vec3(1., .78, .42), vec3(1., .42, .08), smoothstep(0., .25, vLife));
        c = mix(c, vec3(.95, .16, .04), smoothstep(.25, .55, vLife));
        c = mix(c, vec3(.45, .03, .03), smoothstep(.55, .9, vLife));
        float a = smoothstep(.5, .05, r); a = a * a * (3. - 2. * a);
        gl_FragColor = vec4(c * a * vA * .085 * uDim, a * vA);
      }` }));
  world.add(fire);

  // ---- embers across the page ----
  const EN = SMALL ? 260 : 700, ep = new Float32Array(EN * 3), es = new Float32Array(EN * 4);
  for (let i = 0; i < EN; i++) { ep.set([(rnd() - .5) * 26, (rnd() - .5) * 16, -rnd() * 14 + 2], i * 3); es.set([rnd(), rnd(), rnd(), rnd()], i * 4); }
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eGeo.setAttribute('aSeed', new THREE.BufferAttribute(es, 4));
  eGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  const EU = { uTime: U.uTime, uPR: U.uPR, uE: { value: RM ? .6 : 0 }, uScroll: { value: 0 } };
  const embers = new THREE.Points(eGeo, new THREE.ShaderMaterial({ uniforms: EU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uPR, uScroll; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (.25 + aSeed.y * .6) + uScroll * (2. + aSeed.z * 4.) + 8., 16.) - 8.;
        p.x += sin(uTime * (.6 + aSeed.x) + aSeed.w * 20.) * .5;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1. + aSeed.z * 2.6) * uPR * 9. / -mv.z * (step(.93, aSeed.w) * 1.6 + 1.);
        vA = (.4 + .6 * aSeed.x) * (.6 + .4 * sin(uTime * (3. + aSeed.y * 6.) + aSeed.w * 50.));
      }`,
    fragmentShader: 'uniform float uE; varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, 0., r); gl_FragColor = vec4(vec3(1., .55, .18) * a * vA * uE, a); }' }));
  scene.add(embers);

  // ---- halo behind the globe ----
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uHeat, uSurge, uDim; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = smoothstep(1., .3, r) * .045 * (uHeat + uSurge * 2.) * uDim; gl_FragColor = vec4(vec3(1., .3, .08) * a, a); }' }));
  halo.position.z = -1.5; world.add(halo);

  // ---- post ----
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), SMALL ? .7 : .8, .55, .42); composer.addPass(bloom); composer.addPass(new OutputPass());

  // ---- framing ----
  let W = 1, H = 1, baseZ = 11;
  const fit = () => { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); composer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), narrow = camera.aspect < .9;
    // globe + flames ≈ 6.4 tall, 5.6 wide
    baseZ = narrow ? Math.max(5.4 / .78 / camera.aspect / 2 / tv, 6.6 / .42 / 2 / tv) : Math.max(6.6 / .82 / 2 / tv, 5.8 / .46 / camera.aspect / 2 / tv); };
  addEventListener('resize', fit); fit();

  // ---- state ----
  const HOME_Y = -CITIES.Detroit[1] * D2R, HOME_X = CITIES.Detroit[0] * D2R * .75;
  const st = { t: 0, intro: null, ign: null, done: RM, scroll: 0, drag: { x: 0, vx: 0, on: false }, par: { x: 0, y: 0, tx: 0, ty: 0 }, shake: 0, spin: HOME_Y };
  const pose = { camZ: RM ? 1 : 0, rotY: HOME_Y, rotX: HOME_X, focus: 0, push: 0 };
  let target = { y: HOME_Y, x: HOME_X };
  const STEPS = [
    [0, .5, k => { U.uDraw.value = 0; }],
    [.35, 2.0, k => { U.uDraw.value = easeInOut(k); }],
    [.2, 3.4, k => { pose.camZ = easeInOut(k); }],
    [1.9, .9, k => { U.uHeat.value = easeOut(k); U.uFire.value = backOut(k); EU.uE.value = easeOut(k) * .9; }],
    [1.9, .01, k => { if (k >= 1 && !st._flashed) { st._flashed = true; U.uSurge.value = 1.4; st.shake = 1; o.onIgnite && o.onIgnite(); } }]
  ];
  const introLen = 3.6;
  let onIntroDone = null;
  function intro(cb) { onIntroDone = cb || null; if (RM) { cb && cb(); return; } st.intro = 0; st._flashed = false; U.uHeat.value = 0; U.uFire.value = 0; U.uDraw.value = 0; EU.uE.value = 0; pose.camZ = 0; }
  function finishIntro() { STEPS.forEach(s => s[2](1)); st.intro = null; st.done = true; const f = onIntroDone; onIntroDone = null; f && f(); }
  function skip() { if (st.intro !== null) finishIntro(); else { U.uDraw.value = 1; U.uHeat.value = 1; U.uFire.value = 1; EU.uE.value = .9; pose.camZ = 1; st.done = true; } }
  function ignite(city) {
    const c = CITIES[city] || CITIES.Detroit, v = ll(...c);
    placeBeacon(v); beacon.visible = true;
    let ty = -c[1] * D2R; ty += Math.round((pose.rotY - ty) / (Math.PI * 2)) * Math.PI * 2; target = { y: ty, x: c[0] * D2R * .9 };
    st.ign = 0; U.uPulse.value = 0; U.uSurge.value = .9; st.shake = .4;
  }

  // ---- input ----
  let down = null;
  const onMove = e => { if (FINE) { st.par.tx = e.clientX / W * 2 - 1; st.par.ty = e.clientY / H * 2 - 1; } if (down) { const dx = e.clientX - down.x; st.drag.vx = dx * .006; st.drag.x += st.drag.vx; down.x = e.clientX; } };
  addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX }; st.drag.on = true; });
  addEventListener('pointerup', () => { down = null; st.drag.on = false; });

  // ---- loop ----
  let raf = 0, last = performance.now();
  const tick = now => {
    raf = 0; const real = Math.max(0, Math.min(.25, (now - last) / 1000)), dt = Math.min(.05, real); last = now; st.t += dt; U.uTime.value = st.t;
    if (st.intro !== null) { st.intro += real; STEPS.forEach(([s, d, fn]) => { if (st.intro >= s) fn(clamp((st.intro - s) / d)); }); if (st.intro >= introLen) finishIntro(); }
    if (st.ign !== null) { st.ign += real; U.uPulse.value = st.ign * .45; pose.push = easeInOut(st.ign / 1.4); beamMat.uniforms.uA.value = clamp(st.ign / .4); ring.scale.setScalar(.1 + (st.ign * .9 % 1) * .9); ringMat.uniforms.uA.value = 1 - (st.ign * .9 % 1); }
    else pose.push = Math.max(0, pose.push - real * .5);
    U.uSurge.value *= Math.pow(.12, dt); st.shake *= Math.pow(.02, dt);
    // spin: idle drift until a city is lit, then ease onto it
    if (st.ign === null) { st.spin += dt * (RM || !st.done ? 0 : .06); target.y = st.spin; }
    if (!st.drag.on) st.drag.x *= Math.pow(.15, dt);
    pose.rotY += (target.y + st.drag.x - pose.rotY) * (1 - Math.pow(st.ign !== null ? .02 : .2, dt));
    pose.rotX += (target.x - pose.rotX) * (1 - Math.pow(.05, dt));
    globe.rotation.set(pose.rotX, pose.rotY, 0, 'XYZ');
    st.par.x += (st.par.tx - st.par.x) * (1 - Math.pow(.05, dt)); st.par.y += (st.par.ty - st.par.y) * (1 - Math.pow(.05, dt));
    // scroll: globe sinks back and dims after the hero
    const k = st.scroll;
    world.position.set(0, -k * 1.6, -k * 6);
    U.uDim.value = lerp(1, .2, clamp(k * 1.25)); EU.uScroll.value = k;
    const z = lerp(baseZ * 1.9, baseZ, pose.camZ) * lerp(1, .72, pose.push);
    const sx = (Math.random() - .5) * st.shake * .25, sy = (Math.random() - .5) * st.shake * .25;
    camera.position.set(st.par.x * .5 + sx, -st.par.y * .3 + sy + .3, z); camera.lookAt(0, .5 - pose.push * .4, 0);
    const shiftX = lerp(o.shiftX || 0, (o.shiftX || 0) * .6, clamp(k * 2)), e = pose.camZ;
    camera.setViewOffset(W, H, -shiftX * W * e, (o.shiftY || 0) * H * e, W, H);
    composer.render(dt);
    if (!document.hidden) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', start);
  if (!RM) { U.uDraw.value = 0; pose.camZ = 0; } else skip();
  start();
  return { intro, skip, ignite, scroll: k => { st.scroll = clamp(k); }, get done() { return st.done; }, renderer };
}
