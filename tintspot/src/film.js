/* =====================================================================
   Tint Spot: laying the film.
   Their own shop photo (the red Supra, rear glass freshly tinted) fills the
   hero. A real 3D roll of window film (glossy black wound film around a
   cardboard core with gold-banded end caps) rolls across it from left to
   right and leaves a sheet of film behind: the photo darkens to the chosen
   shade, a soft specular sheen slides across the new film and the cut edge
   catches the light. Pick another shade and a fresh roll lays it over the
   old one. Kit method: studio HDRI, physical materials, lathe geometry,
   transparent canvas, step sequencer, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh tintspot/src/film.js tintspot/assets/film.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function mountFilm(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 1.1; }
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 5); scene.add(key, new THREE.HemisphereLight(0xffffff, 0x222222, .5));

  // camera sees a 2 x (2/aspect) world rectangle at z=0
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const DIST = 6;

  /* ---------- photo + film, one shader plane ---------- */
  const loadTex = src => new Promise(r => new THREE.TextureLoader().load(src, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); }, undefined, () => r(null)));
  const photos = { wide: await loadTex(o.wide), tall: await loadTex(o.tall || o.wide) };
  const uni = {
    map: { value: photos.wide }, uvScale: { value: new THREE.Vector2(1, 1) }, uvOff: { value: new THREE.Vector2(0, 0) },
    dOld: { value: 0 }, dNew: { value: 0 }, reveal: { value: -.1 }, sheen: { value: -1 }, edgeGlow: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform vec2 uvScale, uvOff; uniform float dOld, dNew, reveal, sheen, edgeGlow; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv * uvScale + uvOff).rgb;
        // tint film: darken with a faint cool cast, like real ceramic film
        float laid = step(vUv.x, reveal);
        float d = mix(dOld, dNew, laid);
        vec3 filmed = c * (1.0 - d) * vec3(.95, .97, 1.0);
        // sheen: a soft diagonal band sliding across freshly laid film
        float band = exp(-pow((vUv.x * 1.2 + vUv.y * .35 - sheen) * 5.5, 2.0)) * laid * .16;
        // the cut edge of the film catches the light
        float edge = exp(-pow((vUv.x - reveal) * 260.0, 2.0)) * edgeGlow * .35 * step(.001, dNew);
        gl_FragColor = vec4(filmed + band + edge, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); scene.add(plane);

  /* ---------- the roll ---------- */
  const roll = new THREE.Group(); scene.add(roll);
  const filmMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, roughness: .14, metalness: .2, clearcoat: 1, clearcoatRoughness: .05 });
  const coreMat = new THREE.MeshPhysicalMaterial({ color: 0xb98b55, roughness: .8 });
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: .35, clearcoat: .6 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xf2c230, metalness: 1, roughness: .25 });
  let body, coreIn, caps = [];
  function buildRoll(H) {
    roll.clear(); caps = [];
    const R = .085;
    body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), filmMat); roll.add(body);
    const ends = [];
    for (const s of [-1, 1]) {
      // end caps: lathe ring (bottom→top) + gold band
      const cap = new THREE.Mesh(new THREE.LatheGeometry([[R * .38, 0], [R * 1.08, 0], [R * 1.12, .012], [R * 1.08, .024], [R * .38, .024]].map(([x, y]) => new THREE.Vector2(x, y)), 48), capMat);
      cap.position.y = s * H / 2 - (s > 0 ? 0 : .024); roll.add(cap); caps.push(cap);
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, .006, 8, 48), goldMat); band.rotation.x = Math.PI / 2; band.position.y = s * (H / 2 - .03); roll.add(band);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R * .36, R * .36, .05, 32, 1, true), coreMat); core.position.y = s * (H / 2 + .01); roll.add(core); ends.push(core);
    }
    roll.position.z = .14;
  }

  let W = 2, Hh = 2, tall = false;
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect; camera.position.set(0, 0, DIST);
    Hh = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); W = Hh * aspect;
    camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    plane.scale.set(W, Hh, 1);
    tall = aspect < .9;
    const tex = tall ? photos.tall : photos.wide; uni.map.value = tex;
    if (tex && tex.image) { // cover-fit
      const ia = tex.image.width / tex.image.height;
      if (aspect > ia) { uni.uvScale.value.set(1, ia / aspect); uni.uvOff.value.set(0, (1 - ia / aspect) * (tall ? .35 : .45)); }
      else { uni.uvScale.value.set(aspect / ia, 1); uni.uvOff.value.set((1 - aspect / ia) / 2, 0); }
    }
    buildRoll(Hh * 1.06);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  /* ---------- laying sequence ---------- */
  let job = null, onDone = o.onDone;
  function lay(darkness) {
    if (RM) { uni.dOld.value = uni.dNew.value = darkness; uni.reveal.value = 1.1; roll.visible = false; onDone && onDone(); kick(); return; }
    uni.dOld.value = uni.reveal.value > .99 ? uni.dNew.value : uni.dOld.value;
    uni.dNew.value = darkness; uni.reveal.value = -.02;
    job = { t: 0, dur: 2.1, sheenT: -1 }; roll.visible = true; kick();
  }

  let visible = true, raf = 0, last = performance.now(), spin = 0;
  function loop(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now;
    let busy = false;
    if (job) {
      job.t += dt; const k = easeInOut(job.t / job.dur);
      uni.reveal.value = -.02 + k * 1.06;
      const x = (uni.reveal.value - .5) * W;
      roll.position.x = x + .09; spin -= dt * 9 * (1 - k * .6); roll.rotation.y = spin;
      roll.scale.setScalar(1 - k * .18); roll.scale.y = 1;
      if (job.t >= job.dur) { job = null; roll.visible = false; uni.dOld.value = uni.dNew.value; uni.sheen.value = -.6; onDone && onDone(); }
      busy = true;
    }
    if (uni.sheen.value < 2.2 && uni.sheen.value > -.9) { uni.sheen.value += dt * .9; busy = true; }
    renderer.render(scene, camera);
    if ((busy || job) && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', kick);
  roll.visible = false; kick();
  return { lay };
}
