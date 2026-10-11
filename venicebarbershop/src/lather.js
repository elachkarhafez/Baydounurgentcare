/* =====================================================================
   Venice Barbershop: "Hold to lather".
   A glazed teal shaving mug (lathe), a badger brush (lacquered handle,
   chrome ferrule, soft bristle knot) and an open straight razor on the
   counter. Hold: the brush drops into the mug and whisks, lather foams up
   past the rim (instanced bubbles in a rising dome), steam lifts off it.
   Full: callback once. Release: the brush stands back up, wearing foam.
   Studio HDRI, physical materials, shadow catcher on a transparent canvas,
   pointer drift on fine pointers, renders only while visible/moving.
   Bundle: kit/build3d/build.sh venicebarbershop/src/lather.js venicebarbershop/assets/lather.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function mountLather(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 900px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 60);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .85; scene.environmentRotation.set(0, 2.4, 0); }
  const key = new THREE.SpotLight(0xfff1dc, 60, 30, .6, .7, 2); key.position.set(-3, 5.5, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 7; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  const rim = new THREE.DirectionalLight(0xd8f0ff, 1.4); rim.position.set(3, 3, -4);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xfff8ee, 0x6a8d8c, .35));
  const world = new THREE.Group(); scene.add(world);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- materials ----
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x11777a, roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08 });
  const inner = new THREE.MeshPhysicalMaterial({ color: 0xf1ebdf, roughness: .3, clearcoat: .8, clearcoatRoughness: .15 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe8ecef, metalness: 1, roughness: .12 });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x1b2440, roughness: .25, clearcoat: 1, clearcoatRoughness: .06 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xece2cf, roughness: .35, clearcoat: .6 });
  const bristle = new THREE.MeshPhysicalMaterial({ color: 0xcdbb9c, roughness: .85, sheen: 1, sheenColor: new THREE.Color(0xfff1d8), sheenRoughness: .5 });
  const foamMat = new THREE.MeshPhysicalMaterial({ color: 0xfffdf8, roughness: .42, sheen: .6, sheenColor: new THREE.Color(0xffffff), clearcoat: .35, clearcoatRoughness: .25 });

  // ---- mug: lathe-turned, rounded rim, foot ----
  const H = .92, RO = .56, WALL = .05;
  const prof = [];
  prof.push(new THREE.Vector2(0, .0), new THREE.Vector2(.44, .0), new THREE.Vector2(.47, .03), new THREE.Vector2(.46, .07), new THREE.Vector2(.5, .1));
  for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(.5 + (RO - .5) * Math.sin(t * Math.PI / 2) + .02 * Math.sin(t * Math.PI), .1 + t * (H - .14))); }
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; prof.push(new THREE.Vector2(RO - WALL / 2 + Math.cos(a) * WALL / 2, H - .04 + Math.sin(a) * .035)); }
  prof.push(new THREE.Vector2(RO - WALL, H - .1), new THREE.Vector2(RO - WALL - .02, .2), new THREE.Vector2(.3, .14), new THREE.Vector2(0, .13));
  const mugGeo = new THREE.LatheGeometry(prof, 96); mugGeo.computeVertexNormals();
  // two materials: outside glaze, inside cream (split by profile index → use groups on the lathe index buffer)
  const mug = cast(new THREE.Mesh(mugGeo, glaze));
  const innerProf = [new THREE.Vector2(0, .131), new THREE.Vector2(.3, .141), new THREE.Vector2(RO - WALL - .021, .2), new THREE.Vector2(RO - WALL - .001, H - .1), new THREE.Vector2(RO - WALL + .001, H - .045)];
  const mugIn = new THREE.Mesh(new THREE.LatheGeometry(innerProf, 96), inner); mugIn.material.side = THREE.BackSide;
  // name band: canvas texture on a slightly larger open cylinder
  const bc = document.createElement('canvas'); bc.width = 2048; bc.height = 256; const g = bc.getContext('2d');
  g.clearRect(0, 0, 2048, 256); g.fillStyle = '#f3ede1'; g.fillRect(0, 70, 2048, 116);
  g.fillStyle = '#c8332b'; g.fillRect(0, 62, 2048, 6); g.fillRect(0, 188, 2048, 6);
  g.font = '700 74px "Zilla Slab", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#0b4f53';
  ['VENICE BARBERSHOP', '· EST 2010 ·'].forEach((t, i) => { g.fillText(t, 1024 * i + 512 + (i ? 0 : 0), 130); g.fillText(t, 1024 * i + 512 + 2048, 130); });
  const bandTex = new THREE.CanvasTexture(bc); bandTex.colorSpace = THREE.SRGBColorSpace; bandTex.anisotropy = 8;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.577, .571, .26, 96, 1, true), new THREE.MeshPhysicalMaterial({ map: bandTex, transparent: true, roughness: .25, clearcoat: 1, clearcoatRoughness: .08, alphaTest: .02 }));
  band.position.y = .52; band.rotation.y = -.72;
  const mugG = new THREE.Group(); mugG.add(mug, mugIn, band); world.add(mugG);
  mugG.position.set(-.15, 0, 0);

  // ---- lather: instanced bubbles in a dome that rises with level ----
  const NB = SMALL ? 260 : 460, rnd = mulberry(7), RIM = RO - WALL - .02;
  const bub = []; for (let i = 0; i < NB; i++) { const r = Math.sqrt(rnd()) * RIM, th = rnd() * Math.PI * 2; bub.push({ x: Math.cos(th) * r, z: Math.sin(th) * r, rn: r / RIM, s: .035 + Math.pow(rnd(), 2) * .07, depth: rnd() * .12, th: rnd(), ph: rnd() * 6.28 }); }
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 14), foamMat, NB); foam.castShadow = true; foam.receiveShadow = true;
  foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mugG.add(foam);
  // foam cap that rides on the brush tip after lathering
  const capN = 46, cap = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), foamMat, capN); cap.castShadow = true;
  const capB = []; for (let i = 0; i < capN; i++) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); capB.push([Math.cos(th) * s * .14, -Math.abs(u) * .16 - .02, Math.sin(th) * s * .14, .03 + rnd() * .04]); }

  // ---- brush ----
  const brush = new THREE.Group(); world.add(brush);
  const handleProf = [new THREE.Vector2(0, 0), new THREE.Vector2(.17, 0), new THREE.Vector2(.19, .03), new THREE.Vector2(.15, .12), new THREE.Vector2(.12, .26), new THREE.Vector2(.135, .36), new THREE.Vector2(.15, .42), new THREE.Vector2(0, .42)];
  const handle = cast(new THREE.Mesh(new THREE.LatheGeometry(handleProf, 64), lacquer));
  const ferrule = cast(new THREE.Mesh(new THREE.CylinderGeometry(.155, .15, .05, 48), chrome)); ferrule.position.y = .44;
  const knotProf = []; for (let i = 0; i <= 14; i++) { const t = i / 14; knotProf.push(new THREE.Vector2(.14 + Math.sin(t * Math.PI * .55) * .07 - Math.pow(t, 3) * .21, .46 + t * .34)); } knotProf.push(new THREE.Vector2(0, .8));
  const knot = cast(new THREE.Mesh(new THREE.LatheGeometry(knotProf, 64), bristle));
  const brushInner = new THREE.Group(); brushInner.add(handle, ferrule, knot); brush.add(brushInner);
  const capG = new THREE.Group(); capG.position.y = .78; capG.add(cap); brushInner.add(capG);
  // brush hangs knot-down when lathering: flip inside a pivot
  const BR_REST = { x: .95, y: 0, z: .25, rx: 0, rz: 0 };

  // ---- straight razor, open, lying on the counter ----
  const razor = new THREE.Group(); world.add(razor);
  const bl = new THREE.Shape(); bl.moveTo(0, 0); bl.lineTo(.95, 0); bl.quadraticCurveTo(1.05, .02, 1.03, .1); bl.lineTo(1.0, .2); bl.lineTo(.05, .2); bl.quadraticCurveTo(-.02, .12, 0, 0);
  const blade = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(bl, { depth: .015, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 12 }), chrome));
  const sc = new THREE.Shape(); sc.moveTo(0, .02); sc.lineTo(1.1, -.01); sc.quadraticCurveTo(1.2, .08, 1.1, .17); sc.lineTo(0, .17); sc.quadraticCurveTo(-.06, .1, 0, .02);
  const scales = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(sc, { depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 16 }), ivory));
  blade.rotation.x = -Math.PI / 2; blade.position.set(0, .018, 0); scales.rotation.x = -Math.PI / 2; scales.position.set(-1.12, .012, .01); scales.rotation.z = .12;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .08, 20), chrome); pin.position.set(-.02, .04, -.09);
  razor.add(blade, scales, pin); razor.position.set(.35, 0, .95); razor.rotation.y = .5;

  // ---- steam ----
  const steamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uT, uA; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec2 p = vUv; float x = p.x - .5 + sin(p.y * 5. + uT * 1.3) * .12 * p.y;
        float body = smoothstep(.32, 0., abs(x)) * smoothstep(0., .25, p.y) * smoothstep(1., .45, p.y);
        float nn = n(vec2(p.x * 4., p.y * 3. - uT * .8)) * n(vec2(p.x * 7. + 3., p.y * 5. - uT * 1.2));
        float a = body * nn * 1.6 * uA; gl_FragColor = vec4(vec3(1.), a * .55); }` });
  const steam = []; for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.5), steamMat.clone()); s.position.set(-.15 + (i - 1) * .14, H + .85, (i - 1) * .05); s.rotation.y = (i - 1) * .4; s.material.uniforms.uT = { value: i * 3 }; world.add(s); steam.push(s); }

  // ---- shadow catcher ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .28, color: 0x0a2e30 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  key.target.position.set(0, .4, 0);

  // ---- framing ----
  let W = 1, Hh = 1;
  const fit = () => { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); Hh = Math.max(1, r.height); renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix(); kick(); };
  new ResizeObserver(fit).observe(canvas);

  // ---- state ----
  const st = { t: 0, level: RM ? 0 : 0, hold: false, whisk: 0, full: false, par: { x: 0, y: 0, tx: 0, ty: 0 }, intro: RM ? 1 : 0, cap: 0 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3(), eu = new THREE.Euler();
  function layoutFoam() {
    const L = st.level, wob = st.whisk;
    const top = lerp(.42, H + .16, ease(L)), dome = lerp(.02, .26, ease(L));
    for (let i = 0; i < NB; i++) {
      const b = bub[i], vis = smooth(b.th * .85, b.th * .85 + .15, L * 1.05 + (L > 0 ? .05 : 0));
      const y = top + dome * Math.sqrt(Math.max(0, 1 - b.rn * b.rn)) - b.depth * (1 - b.rn * .3);
      const jx = Math.sin(st.t * 9 + b.ph) * .012 * wob, jz = Math.cos(st.t * 8 + b.ph) * .012 * wob;
      const spill = Math.max(0, (b.rn - .85) * L * L * .12);                                   // the edge creeps over the rim
      v.set(b.x * (1 + spill) + jx, y - spill * .6, b.z * (1 + spill) + jz);
      const s = b.s * vis * (.85 + .15 * Math.sin(st.t * 2 + b.ph)); sv.set(s, s * .9, s);
      m4.compose(v, q.identity(), sv); foam.setMatrixAt(i, m4);
    }
    foam.instanceMatrix.needsUpdate = true; foam.visible = L > .001;
    for (let i = 0; i < capN; i++) { const [x, y, z, s] = capB[i], k = st.cap * smooth(i / capN * .7, i / capN * .7 + .3, st.cap); v.set(x, y, z); sv.setScalar(s * k); m4.compose(v, q.identity(), sv); cap.setMatrixAt(i, m4); }
    cap.instanceMatrix.needsUpdate = true; cap.visible = st.cap > .001;
  }

  // brush pose: rest (standing beside) ↔ in the mug (upside down, knot in the lather, whisking)
  let pose = 0;
  function poseBrush() {
    const p = ease(pose);
    const restP = new THREE.Vector3(BR_REST.x, 0, BR_REST.z), inP = new THREE.Vector3(-.15, H + .78, 0);
    const arc = Math.sin(p * Math.PI) * .7;
    brush.position.set(lerp(restP.x, inP.x, p), lerp(restP.y, inP.y, p) + arc, lerp(restP.z, inP.z, p));
    const swirl = st.whisk * .22;
    brush.rotation.set(lerp(0, Math.PI, p) + Math.sin(st.t * 10) * swirl, st.t * 6 * st.whisk, Math.cos(st.t * 10) * swirl, 'XYZ');
    brushInner.position.y = 0;
  }

  // ---- input ----
  if (FINE) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); st.par.tx = ((e.clientX - r.left) / r.width - .5) * 2; st.par.ty = ((e.clientY - r.top) / r.height - .5) * 2; kick(); }, { passive: true });
  function hold(on) { st.hold = !!on; kick(); }

  // ---- loop ----
  let raf = 0, last = 0, visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; const real = Math.max(0, Math.min(.25, (now - last) / 1000)), dt = Math.min(.05, real); last = now; st.t += dt;
    st.intro = Math.min(1, st.intro + real / 1.6);
    const goal = st.hold ? 1 : 0;
    pose += (goal - pose) * (1 - Math.pow(st.hold ? .004 : .01, real));
    const inMug = pose > .82 && st.hold;
    st.whisk += ((inMug ? 1 : 0) - st.whisk) * (1 - Math.pow(.01, real));
    if (inMug && !RM) st.level = Math.min(1, st.level + real * .38);
    if (inMug) st.cap = Math.min(1, st.cap + real * .6);
    if (st.level >= 1 && !st.full) { st.full = true; o.onFull && o.onFull(); }
    o.onLevel && o.onLevel(st.level);
    poseBrush(); layoutFoam();
    steam.forEach((s, i) => { s.material.uniforms.uT.value += real * (1 + i * .2); s.material.uniforms.uA.value = (.25 + .75 * st.level) * st.intro; s.lookAt(camera.position.x, s.position.y, camera.position.z); });
    st.par.x += (st.par.tx - st.par.x) * (1 - Math.pow(.05, real)); st.par.y += (st.par.ty - st.par.y) * (1 - Math.pow(.05, real));
    const dist = lerp(9.2, 6.6, ease(st.intro)) * (camera.aspect < .9 ? 1.25 : 1);
    const az = .55 + st.par.x * .18 + (RM ? 0 : Math.sin(st.t * .25) * .05), el = .42 - st.par.y * .06;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + .3, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(.15, .75, .2);
    renderer.render(scene, camera);
    const busy = st.hold || pose > .002 || st.intro < 1 || Math.abs(st.par.tx - st.par.x) > .002 || true;
    if (busy && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  if (RM) { st.level = 1; st.cap = 0; }
  fit(); kick();
  return { hold, setLevel: l => { st.level = clamp(l); kick(); }, get level() { return st.level; }, renderer };
}
