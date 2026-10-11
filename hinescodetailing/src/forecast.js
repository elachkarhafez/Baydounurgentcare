/* =====================================================================
   Hines & Co. v2: "Your car, this week in Atlanta."
   A procedural 3D sedan (bevelled extruded body with wheel arches, glass
   greenhouse picked out in the shader, tyres + 5-spoke rims, lamps) in
   glossy black metallic paint. The paint wears the week's weather, driven
   by real Open-Meteo data from the page:
     dust   → a beige film that kills the clearcoat
     spots  → dried water spots (cellular rings) after rain
     clay   → red Georgia clay splashed on the rockers and behind the wheels
     pollen → yellow powder on up-facing panels (spring)
     rain   → it's raining now: streaks fall, everything goes dark and wet
     fresh  → just detailed: sparkle sweeps the paint
   setDay(state) eases the material to a new state; setSun(hour) re-lights
   the scene for Atlanta's time of day. Transparent canvas + shadow catcher.
   Bundle: kit/build3d/build.sh hinescodetailing/src/forecast.js hinescodetailing/assets/forecast.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export async function mountForecast(canvas, o = {}) {
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
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 100);
  const env = await new Promise(res => new RGBELoader().load(A + 'studio-512.hdr', t => res(t), undefined, () => res(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .62; }
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 30 }); sun.shadow.bias = -.0004; sun.shadow.radius = 5;
  const sky = new THREE.HemisphereLight(0xdfeeff, 0xe9e2d6, .55);
  scene.add(sun, sun.target, sky);

  // ---- dirt-aware paint ----
  const U = { uDust: { value: 0 }, uSpots: { value: 0 }, uClay: { value: 0 }, uPollen: { value: 0 }, uWet: { value: 0 }, uFresh: { value: 0 }, uT: { value: 0 } };
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x0a0c0f, metalness: .3, roughness: .2, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .75 });
  paint.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec3 vLP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vLP = transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; varying vec3 vLP;
      uniform float uDust, uSpots, uClay, uPollen, uWet, uFresh, uT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * n2(p); p *= 2.07; a *= .5; } return s; }
      // dried water spots: rings from a jittered grid
      float spots(vec2 p){ vec2 i = floor(p), f = fract(p); float r = 0.;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), c = h22(i + g); float rad = .12 + .22 * h2(i + g + 3.1); float d = length(g + c - f);
          r = max(r, smoothstep(rad, rad - .04, d) * (.35 + .65 * smoothstep(rad - .07, rad - .02, d)) * step(.62, h2(i + g + 7.7))); }
        return r; }
      // greenhouse (glass) region in car-local coordinates
      float glassMask(){ float x = vLP.x, y = vLP.y; float top = smoothstep(.98, 1.04, y) * smoothstep(1.4, 1.36, y);
        float front = smoothstep(.98, .9, x), back = smoothstep(-1.78, -1.7, x);
        float bp = 1. - smoothstep(.05, .0, abs(x + .35) - .04) ; return top * front * back * bp; }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float gm = glassMask();
      vec2 sp = vWP.xz * 1.7 + vWP.y * .9;
      float pol = uPollen * smoothstep(.35, .9, vWN.y) * (.55 + .45 * fbm(vWP.xz * 3.));
      float dst = uDust * (.55 + .45 * fbm(vWP.xz * 2.5 + vWP.y));
      float lowY = smoothstep(.58, .3, vWP.y);
      float wheels = max(smoothstep(.72, .48, length(vec2(vWP.x - 1.45, vWP.y - .38))), smoothstep(.72, .48, length(vec2(vWP.x + 1.45, vWP.y - .38))));
      float cly = uClay * clamp(lowY * .8 + wheels * .7, 0., 1.) * smoothstep(.35, .7, fbm(vWP.xz * 4. + vWP.y * 6.) + lowY * .3);
      float spt = uSpots * spots(vec2(vWP.x * 9. + vWP.z * 5., vWP.y * 9. + vWP.z * 3.));
      float dirt = clamp(dst * .8 + cly + pol, 0., 1.);
      roughnessFactor = mix(roughnessFactor, .8, clamp(dst * .6 + cly + pol * .8, 0., 1.) * (1. - gm * .5));
      roughnessFactor = mix(roughnessFactor, .04, gm);
      roughnessFactor = mix(roughnessFactor, .08, uWet);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, 0., glassMask());`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        float gm2 = glassMask();
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.004, .006, .009), gm2);
        float lowY2 = smoothstep(.58, .3, vWP.y);
        float wh2 = max(smoothstep(.72, .48, length(vec2(vWP.x - 1.45, vWP.y - .38))), smoothstep(.72, .48, length(vec2(vWP.x + 1.45, vWP.y - .38))));
        float cly2 = uClay * clamp(lowY2 * .8 + wh2 * .7, 0., 1.) * smoothstep(.48, .78, fbm(vWP.xz * 5. + vWP.y * 7.) + lowY2 * .22);
        float pol2 = uPollen * smoothstep(.35, .9, vWN.y) * (.55 + .45 * fbm(vWP.xz * 3.));
        float dst2 = uDust * (.55 + .45 * fbm(vWP.xz * 2.5 + vWP.y));
        float spt2 = uSpots * spots(vec2(vWP.x * 15. + vWP.z * 8., vWP.y * 15. + vWP.z * 5.));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.62, .57, .49), dst2 * .3 * (1. - gm2 * .8));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.44, .2, .11), clamp(cly2, 0., 1.) * .52);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .72, .2), clamp(pol2, 0., 1.) * .85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.78, .8, .82), spt2 * .28 * (1. - gm2 * .5));
        diffuseColor.rgb *= 1. - uWet * .25;
        // just detailed: a sparkle band sweeps the panels
        float sweep = smoothstep(.25, 0., abs(vWP.x + vWP.y * .6 - (fract(uT * .35) * 7. - 3.5)));
        diffuseColor.rgb += uFresh * sweep * vec3(.25, .27, .3) * (1. - gm2 * .5);
      }`);
  };
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x111214, roughness: .8 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xb9bec4, metalness: 1, roughness: .22, clearcoat: .5 });
  const lampMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f7fa, emissive: 0xffffff, emissiveIntensity: .35, roughness: .1, clearcoat: 1 });
  const tailMat = new THREE.MeshPhysicalMaterial({ color: 0x8e0f12, emissive: 0xff2018, emissiveIntensity: .3, roughness: .2, clearcoat: 1 });
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- body: extruded side profile with wheel arches, heavy bevel ----
  const WR = .44, WX = 1.45, BOT = .34;
  const s = new THREE.Shape();
  s.moveTo(-2.22, BOT);
  s.lineTo(-WX - WR - .06, BOT); s.absarc(-WX, BOT - .02, WR + .06, Math.PI, 0, true); s.lineTo(WX - WR - .06, BOT);
  s.absarc(WX, BOT - .02, WR + .06, Math.PI, 0, true); s.lineTo(2.2, BOT);
  s.bezierCurveTo(2.32, BOT + .04, 2.34, .5, 2.3, .66);          // front face
  s.bezierCurveTo(2.26, .78, 2.1, .84, 1.85, .86);               // hood nose
  s.lineTo(.98, .98);                                             // hood
  s.bezierCurveTo(.7, 1.12, .45, 1.32, .25, 1.38);               // windshield
  s.bezierCurveTo(-.2, 1.44, -.8, 1.44, -1.05, 1.38);            // roof
  s.bezierCurveTo(-1.35, 1.3, -1.6, 1.12, -1.78, 1.0);           // rear window
  s.lineTo(-2.2, .96);                                            // trunk
  s.bezierCurveTo(-2.32, .92, -2.34, .7, -2.3, .56);             // rear face
  s.bezierCurveTo(-2.28, .42, -2.26, BOT + .02, -2.22, BOT);
  const W = 1.62;
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .2, bevelSize: .16, bevelSegments: 8, curveSegments: 40 });
  bodyGeo.translate(0, 0, -W / 2);
  const car = new THREE.Group(); scene.add(car);
  const body = cast(new THREE.Mesh(bodyGeo, paint)); car.add(body);
  // wheels
  const wheel = () => { const g = new THREE.Group(); const tire = cast(new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, .3, 48, 1), rubber)); tire.rotation.x = Math.PI / 2; g.add(tire);
    const face = cast(new THREE.Mesh(new THREE.CylinderGeometry(WR * .68, WR * .68, .32, 40), rimMat)); face.rotation.x = Math.PI / 2; g.add(face);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.06, WR * .62, .06), new THREE.MeshPhysicalMaterial({ color: 0x2a2d31, metalness: .8, roughness: .3 })); sp.position.z = .17; sp.rotation.z = k / 5 * Math.PI * 2; sp.position.x = Math.sin(-sp.rotation.z) * WR * .26; sp.position.y = Math.cos(sp.rotation.z) * WR * .26; g.add(sp); }
    return g; };
  [[WX, 1], [WX, -1], [-WX, 1], [-WX, -1]].forEach(([x, side]) => { const w = wheel(); w.position.set(x, WR, side * (W / 2 + .1)); if (side < 0) w.rotation.y = Math.PI; car.add(w); });
  // lamps
  [1, -1].forEach(z => { const hl = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .42), lampMat); hl.position.set(2.31, .7, z * .6); car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(.08, .1, .5), tailMat); tl.position.set(-2.33, .78, z * .58); car.add(tl); });

  // ---- shadow catcher ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .22, color: 0x2a3340 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ---- rain ----
  const RN = SMALL ? 500 : 1100, rp = new Float32Array(RN * 6);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rainLines = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8aa6c2, transparent: true, opacity: 0 }));
  scene.add(rainLines);
  const drops = Array.from({ length: RN }, () => ({ x: (Math.random() - .5) * 9, y: Math.random() * 6, z: (Math.random() - .5) * 6, v: 9 + Math.random() * 4 }));

  // ---- lighting by Atlanta time of day ----
  function setSun(hour) {
    const t = clamp((hour - 6) / 14), el = Math.sin(t * Math.PI) * 1.1 + .05, az = lerp(-1.2, 1.4, t);
    sun.position.set(Math.cos(az) * 6, Math.max(.6, el * 6), Math.sin(az) * 6 + 2);
    const golden = 1 - Math.sin(t * Math.PI); const night = hour < 6 || hour > 20.5;
    sun.color.setRGB(1, lerp(.97, .78, golden), lerp(.92, .58, golden)); sun.intensity = night ? .6 : lerp(1.4, 2.4, Math.sin(t * Math.PI));
    sky.color.set(night ? 0x8fa3d6 : 0xdfeeff); scene.environmentIntensity = night ? .4 : .62;
    kick();
  }

  // ---- state easing ----
  const goal = { dust: 0, spots: 0, clay: 0, pollen: 0, wet: 0, fresh: 0, rain: 0 }, cur = { ...goal };
  function setDay(st) { Object.assign(goal, { dust: st.dust || 0, spots: st.spots || 0, clay: st.clay || 0, pollen: st.pollen || 0, wet: st.rain ? 1 : 0, fresh: st.fresh ? 1 : 0, rain: st.rain ? 1 : 0 }); if (RM) Object.assign(cur, goal); kick(); }

  // ---- framing ----
  let Wd = 1, Hd = 1;
  const fit = () => { const r = canvas.getBoundingClientRect(); Wd = Math.max(1, r.width); Hd = Math.max(1, r.height); renderer.setSize(Wd, Hd, false); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); kick(); };
  new ResizeObserver(fit).observe(canvas);
  let par = { x: 0, y: 0, tx: 0, ty: 0 };
  if (FINE) addEventListener('pointermove', e => { par.tx = e.clientX / innerWidth - .5; par.ty = e.clientY / innerHeight - .5; kick(); }, { passive: true });

  // ---- loop ----
  let raf = 0, last = 0, visible = true, t = 0, idle = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  function kick() { idle = 0; if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; const real = Math.max(0, Math.min(.1, (now - last) / 1000)), dt = Math.min(.05, real); last = now; t += dt; U.uT.value = t;
    let moving = false;
    for (const k in cur) { const d = goal[k] - cur[k]; if (Math.abs(d) > .002) { cur[k] += d * (1 - Math.pow(.02, real)); moving = true; } else cur[k] = goal[k]; }
    U.uDust.value = cur.dust; U.uSpots.value = cur.spots; U.uClay.value = cur.clay; U.uPollen.value = cur.pollen; U.uWet.value = cur.wet; U.uFresh.value = cur.fresh;
    rainLines.material.opacity = cur.rain * .55; rainLines.visible = cur.rain > .01;
    if (rainLines.visible) { for (let i = 0; i < RN; i++) { const d = drops[i]; d.y -= d.v * real; if (d.y < 0) { d.y = 6; d.x = (Math.random() - .5) * 9; } rp.set([d.x, d.y, d.z, d.x - .04, d.y + .28, d.z], i * 6); } rg.attributes.position.needsUpdate = true; moving = true; }
    if (cur.fresh > .01) moving = true;
    par.x += (par.tx - par.x) * (1 - Math.pow(.05, real)); par.y += (par.ty - par.y) * (1 - Math.pow(.05, real));
    const narrow = camera.aspect < 1.1, dist = narrow ? 7.6 / Math.max(.45, camera.aspect) * .62 + 4 : 7.6;
    const az = .78 + par.x * .22 + (RM ? 0 : Math.sin(t * .15) * .05), el = .2 - par.y * .06;
    camera.position.set(Math.cos(az) * Math.cos(el) * dist, Math.sin(el) * dist + .4, Math.sin(az) * Math.cos(el) * dist);
    camera.lookAt(0, .72, 0);
    renderer.render(scene, camera);
    idle = moving ? 0 : idle + 1;
    if (visible && !document.hidden && (idle < 90 || FINE || !RM)) raf = requestAnimationFrame(tick);
  }
  setSun(o.hour != null ? o.hour : 14);
  fit(); kick();
  return { setDay, setSun, renderer, get state() { return { ...cur }; } };
}
