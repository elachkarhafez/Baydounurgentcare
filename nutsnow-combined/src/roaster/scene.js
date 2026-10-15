/* Nuts Now roaster: an offline 3D render that becomes the hero video.
   A stainless drum with lifting vanes turns over a row of gas flames; cashews, pistachios and hazelnuts tumble
   inside it with real (verlet) physics. Rendered frame by frame in headless Chromium (src/roaster/render.mjs),
   then encoded to a seamless loop: the tail is crossfaded into the head, so physics and flames need not be
   periodic. The drum's turn and the machine's shake are: LOOP is a whole number of vane passes and hum cycles.
   Each frame is three passes: the beauty render (on black), a white silhouette mask, and the floor shadow.
   render.mjs saves them; the encode step composites the machine onto white so the page can show it with
   mix-blend-mode:multiply (white vanishes into whatever is behind it, the shadow darkens it). */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SHAPES } from '../../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';
import { rng, fbm } from '../../../.claude/skills/ela-studio/kit/build3d/src/util.js';

const W = 1080, H = 1350, FPS = 30;
const LOOP = 8, FADE = 1;                       // seconds; render LOOP + FADE, crossfade the tail into the head
const R = .19, L = .28, VANES = 4;              // drum radius / length (m), lifting vanes
const OMEGA = 2 * Math.PI / 4;                  // one turn every 4 s → 2 turns per loop, vanes line up
const r = rng(20261015);

const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, W / H, .01, 30);
camera.position.set(.47, .5, 1.62); camera.lookAt(-.005, -.125, .02);
const FLOOR = -.452;
// the machine shakes as one piece, rocking on its feet: rig pivots at the floor, inner holds everything
const rig = new THREE.Group(); rig.position.y = FLOOR; scene.add(rig); const inner = new THREE.Group(); inner.position.y = -FLOOR; rig.add(inner);

/* ---------- environment + light ---------- */
const env = await new RGBELoader().loadAsync('../../../.claude/skills/ela-studio/kit/build3d/assets/studio-512.hdr');
env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .34; scene.environmentRotation.set(0, 2.2, 0);
const key = new THREE.SpotLight('#ffe7c7', 1.25, 5, .5, .8, 1.2); key.position.set(-.22, 1.15, .8); key.target.position.set(0, -.1, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .012; key.shadow.radius = 6; scene.add(key, key.target);
// a work lamp aimed into the drum so the bed of nuts reads
const lamp = new THREE.SpotLight('#ffe6c4', .42, 3, .3, .85, 1.2); lamp.position.set(.1, .32, .62); lamp.target.position.set(0, -.13, -.02); scene.add(lamp, lamp.target);
const rim = new THREE.DirectionalLight('#9fb8ff', .35); rim.position.set(-1.2, .6, -.8); scene.add(rim);
scene.add(new THREE.HemisphereLight('#fff1dc', '#3a2a1f', .38));
// fire light: flickering warm points under the drum, and heat glowing inside it
// a faint warm glow inside the drum (roasting heat), weak: in physical units a small value is already bright up close
const heat = new THREE.PointLight('#ff9550', .006, .32, 2); heat.position.set(0, .04, .06); inner.add(heat);
// short range (physical units: anything bigger floods the nuts through the steel, these lights cast no shadow)
const fireL = [-.1, .1].map(x => { const p = new THREE.PointLight('#ff7a2a', .05, .1, 2); p.position.set(x, -R - .07, .03); inner.add(p); return p; });

// floor: only its shadow is kept (shadow pass), plus a soft contact blob so the legs sit on the page
const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ color: '#ffffff', opacity: 1, toneMapped: false }));
floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
const ao = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.66, .5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(0, FLOOR + .001, 0); scene.add(m); return m; })();

/* ---------- the roaster ---------- */
const steel = new THREE.MeshPhysicalMaterial({ color: '#aeaba5', metalness: 1, roughness: .36, clearcoat: .2, clearcoatRoughness: .4 });
const steelIn = new THREE.MeshPhysicalMaterial({ color: '#7a6f64', metalness: .9, roughness: .45, side: THREE.BackSide, emissive: '#5a2008', emissiveIntensity: .5 }); // hot inside
const iron = new THREE.MeshStandardMaterial({ color: '#1d1b19', metalness: .6, roughness: .55 });
const lime = new THREE.MeshPhysicalMaterial({ color: '#8cc63f', roughness: .28, clearcoat: 1, clearcoatRoughness: .08, metalness: .05 });
const drum = new THREE.Group(); inner.add(drum);
const dark = new THREE.MeshPhysicalMaterial({ color: '#1a1714', metalness: .75, roughness: .42, clearcoat: .3, clearcoatRoughness: .5 });
{
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + .005, R + .005, L, 128, 1, true), steel); shell.rotation.x = Math.PI / 2; shell.castShadow = shell.receiveShadow = true; drum.add(shell);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 128, 1, true), steelIn); inner.rotation.x = Math.PI / 2; inner.receiveShadow = true; drum.add(inner);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshPhysicalMaterial({ color: '#3a3028', metalness: .8, roughness: .5, emissive: '#5a2008', emissiveIntensity: .45 })); back.position.z = -L / 2; back.receiveShadow = true; drum.add(back);
  // front: a steel funnel narrowing to the mouth, like a real drum roaster, with a rolled edge
  const fz = L / 2, cone = new THREE.Mesh(new THREE.CylinderGeometry(R * .8, R + .006, .045, 160, 1, true), new THREE.MeshPhysicalMaterial({ color: '#86c13b', roughness: .3, clearcoat: 1, clearcoatRoughness: .06, side: THREE.DoubleSide }));
  cone.rotation.x = Math.PI / 2; cone.position.z = fz + .0225; cone.castShadow = true; drum.add(cone);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(R * .8, .0055, 16, 160), steel); mouth.position.z = fz + .045; drum.add(mouth);
  // their lime enamel band round the drum's front, with rivets
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + .009, R + .009, .03, 128, 1, true), steel); band.rotation.x = Math.PI / 2; band.position.z = fz - .022; drum.add(band);
  for (const z of [-L / 2 + .02, .0]) { const b = new THREE.Mesh(new THREE.TorusGeometry(R + .006, .0032, 10, 128), steel); b.position.z = z; drum.add(b); }
  const riv = new THREE.InstancedMesh(new THREE.SphereGeometry(.0034, 10, 8), steel, 40); const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; m.makeTranslation(Math.cos(a) * (R + .009), Math.sin(a) * (R + .009), fz - .022); riv.setMatrixAt(i, m); } drum.add(riv);
}
const vanes = []; for (let k = 0; k < VANES; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(.04, .004, L * .96), new THREE.MeshPhysicalMaterial({ color: '#8f877e', metalness: .9, roughness: .38 })); v.castShadow = v.receiveShadow = true; drum.add(v); vanes.push(v); }
const vaneAt = (k, ang) => ang + k * 2 * Math.PI / VANES;
// firebox under the drum: black steel box, open at the top, with a window in front onto the burner
const FB = { w: R * 2.3, h: .15, d: L + .05, top: -R - .012 };
{
  const fb = new THREE.Group(); inner.add(fb); const y0 = FB.top - FB.h / 2;
  const plate = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dark); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; fb.add(m); return m; };
  plate(FB.w, FB.h, .008, 0, y0, -FB.d / 2); plate(.008, FB.h, FB.d, -FB.w / 2, y0, 0); plate(.008, FB.h, FB.d, FB.w / 2, y0, 0); plate(FB.w, .008, FB.d, 0, FB.top - FB.h, 0);
  // front plate with a window cut out
  const sh = new THREE.Shape(); sh.moveTo(-FB.w / 2, -FB.h / 2); sh.lineTo(FB.w / 2, -FB.h / 2); sh.lineTo(FB.w / 2, FB.h / 2); sh.lineTo(-FB.w / 2, FB.h / 2); sh.closePath();
  const hole = new THREE.Path(); const hw = FB.w * .36, hh = FB.h * .3; hole.moveTo(-hw, -hh); hole.lineTo(hw, -hh); hole.lineTo(hw, hh); hole.lineTo(-hw, hh); hole.closePath(); sh.holes.push(hole);
  const front = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .008, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 2 }), dark); front.position.set(0, y0, FB.d / 2 - .004); front.castShadow = true; fb.add(front);
  const brass = new THREE.MeshPhysicalMaterial({ color: '#b08a3e', metalness: 1, roughness: .3 }); for (const [w, h, x, y] of [[hw * 2 + .012, .006, 0, hh + .003], [hw * 2 + .012, .006, 0, -hh - .003], [.006, hh * 2, hw + .003, 0], [.006, hh * 2, -hw - .003, 0]]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, .006), brass); bar.position.set(x, y0 + y, FB.d / 2 + .009); fb.add(bar); }
  // glowing refractory back wall inside the firebox
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 64; const gx = gc.getContext('2d'); const gg = gx.createLinearGradient(0, 64, 0, 0); gg.addColorStop(0, '#ff8a2a'); gg.addColorStop(.5, '#a8320c'); gg.addColorStop(1, '#2a0a04'); gx.fillStyle = gg; gx.fillRect(0, 0, 256, 64);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(FB.w - .02, FB.h - .01), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), toneMapped: false, color: new THREE.Color(.75, .75, .75) })); wall.position.set(0, y0, -FB.d / 2 + .006); fb.add(wall);
  for (const pz of [.11, .04]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, FB.w - .02, 20), new THREE.MeshPhysicalMaterial({ color: '#5c5047', metalness: .9, roughness: .45 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, FB.top - FB.h + .028, pz); fb.add(pipe); }
  // legs, a control knob, and the rollers the drum rides on
  for (const x of [-FB.w / 2 + .012, FB.w / 2 - .012]) for (const z of [-FB.d / 2 + .012, FB.d / 2 - .012]) plate(.02, .1, .02, x, FB.top - FB.h - .05, z);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .012, 24), new THREE.MeshPhysicalMaterial({ color: '#b08a3e', metalness: 1, roughness: .25 })); knob.rotation.x = Math.PI / 2; knob.position.set(FB.w / 2 - .035, y0, FB.d / 2 + .012); fb.add(knob);
  for (const sx of [-1, 1]) for (const z of [-L / 2 + .03, L / 2 - .03]) { const ro = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .022, 24), steel); ro.rotation.x = Math.PI / 2; ro.position.set(sx * R * .62, -R * .83, z); fb.add(ro); }
}

/* ---------- gas flames: billboard planes with a moving noise flame shader ---------- */
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float a=0.,s=.5;for(int i=0;i<5;i++){a+=snoise(p)*s;p*=2.07;s*=.5;}return a;}`;
const flameMat = seed => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uSeed: { value: seed }, uHeat: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: NOISE + `
    varying vec2 vUv; uniform float uT, uSeed, uHeat;
    void main(){
      vec2 p = vUv; float y = p.y, x = (p.x - .5) * 2.;
      float t = uT * 2.8;
      float n = fbm(vec3(p.x * 2.6, p.y * 2.4 - t, uSeed));
      float n2 = fbm(vec3(p.x * 6.0 + 3.1, p.y * 5.5 - t * 1.6, uSeed + 9.));
      float bend = (n * .32 + n2 * .1) * smoothstep(.15, 1., y);
      // a teardrop: widest a little above the jet, a soft licking tip
      float w = .5 * pow(sin(3.14159 * clamp(y * .92 + .08, 0., 1.)), .7) * (1. - .35 * y) * (1. + .22 * n2);
      float d = abs(x + bend) / max(w, .001);
      float body = smoothstep(1., .35, d) * smoothstep(.98, .5 + .3 * n, y) * smoothstep(.0, .08, y);
      // blue at the root (gas burning clean), yellow-orange above it, a deeper red-orange at the licking tips
      float blue = smoothstep(.42, .08, y) * smoothstep(1., .2, d);
      vec3 hot = mix(vec3(1., .26, .04), vec3(1., .58, .16), smoothstep(.7, .15, d) * smoothstep(.95, .3, y));
      vec3 col = mix(hot, vec3(.25, .45, 1.), blue * .85) * body;
      col += vec3(1., .8, .5) * pow(max(body - .35, 0.), 2.) * smoothstep(.6, .25, y) * .3;
      float a = clamp(body * (1. - blue * .5), 0., 1.) * uHeat;
      gl_FragColor = vec4(col * .62 * uHeat, a);
    }`
});
const flames = []; { const N = 11; for (let row = 0; row < 2; row++) for (let i = 0; i < N; i++) { const x = -FB.w / 2 + .03 + i * (FB.w - .06) / (N - 1); const f = new THREE.Mesh(new THREE.PlaneGeometry(.05, .1), flameMat(r() * 50)); f.position.set(x + row * .012, FB.top - FB.h + .03 + .05, .11 - row * .07); f.renderOrder = 2; inner.add(f); flames.push(f); } }
// a soft orange glow on the drum's belly where the flames lick it
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,140,60,1)'); g.addColorStop(.4, 'rgba(255,90,30,.35)'); g.addColorStop(1, 'rgba(255,60,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t; })();
const belly = new THREE.Mesh(new THREE.PlaneGeometry(.46, .2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55, toneMapped: false })); belly.position.set(0, -R - .02, .12); inner.add(belly);

/* ---------- sparks ---------- */
const SP = 70, spGeo = new THREE.BufferGeometry(), spPos = new Float32Array(SP * 3), spA = new Float32Array(SP); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute('a', new THREE.BufferAttribute(spA, 1));
const sparks = new THREE.Points(spGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `attribute float a; varying float vA; void main(){ vA = a; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = 5.5 * a / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(1., .62, .25) * (1. - d * 2.) * 2.2, vA * (1. - d * 2.)); }` }));
inner.add(sparks);
const spark = [...Array(SP)].map(() => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1 }));

/* ---------- nuts ---------- */
const types = [
  { geo: SHAPES.cashew(.62), n: 230, rad: .0098, colors: ['#c98f45', '#bf8238', '#d29a52', '#b7772f', '#c48a40'] },
  { geo: SHAPES.pistachio(.66), n: 150, rad: .0094, colors: ['#c4a678', '#b8996a', '#cdb085', '#ad8e60'] },
  { geo: SHAPES.hazelnut(.66), n: 150, rad: .0094, colors: ['#8a522b', '#7b4723', '#9a5e33', '#6f3f1f'] }
];
const nutMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .55, clearcoat: .22, clearcoatRoughness: .35 });
const nuts = []; const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpV = new THREE.Vector3();
types.forEach(t => { t.mesh = new THREE.InstancedMesh(t.geo, nutMat, t.n); t.mesh.castShadow = t.mesh.receiveShadow = true; inner.add(t.mesh);
  for (let i = 0; i < t.n; i++) { const c = new THREE.Color(t.colors[i % t.colors.length]).offsetHSL(0, (r() - .5) * .05, (r() - .5) * .06); t.mesh.setColorAt(i, c);
    nuts.push({ t, i, p: new THREE.Vector3(), q: new THREE.Vector3(), rad: t.rad * (.9 + r() * .2), rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) }); } });
// drop them in from above on a loose lattice (no overlaps), shuffled so the three kinds mix
for (let i = nuts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [nuts[i], nuts[j]] = [nuts[j], nuts[i]]; }
{ const gap = .021, cols = []; for (let y = -R + .02; y < R - .02; y += gap) for (let x = -R + .02; x < R - .02; x += gap) if (Math.hypot(x, y) < R - .02) for (let z = -L / 2 + .015; z < L / 2 - .015; z += gap) cols.push([x, y, z]);
  cols.sort((a, b) => a[1] - b[1]); nuts.forEach((n, k) => { const c = cols[k]; n.p.set(c[0] + (r() - .5) * .002, c[1], c[2]); n.q.copy(n.p); }); }

let ang = 0;
const CELL = .022, grid = new Map(), key3 = p => (Math.floor(p.x / CELL) * 73856093) ^ (Math.floor(p.y / CELL) * 19349663) ^ (Math.floor(p.z / CELL) * 83492791);
function physics(dt) {
  const g = -9.8, damp = .995, lim = R - .002;
  for (const n of nuts) { const vx = (n.p.x - n.q.x) * damp, vy = (n.p.y - n.q.y) * damp, vz = (n.p.z - n.q.z) * damp; n.q.copy(n.p); n.p.x += vx; n.p.y += vy + g * dt * dt; n.p.z += vz; }
  for (let it = 0; it < 4; it++) {
    grid.clear(); for (let i = 0; i < nuts.length; i++) { const n = nuts[i], k = key3(n.p); let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(i); }
    for (let i = 0; i < nuts.length; i++) { const a = nuts[i], cx = Math.floor(a.p.x / CELL), cy = Math.floor(a.p.y / CELL), cz = Math.floor(a.p.z / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) { const c = grid.get(((cx + ox) * 73856093) ^ ((cy + oy) * 19349663) ^ ((cz + oz) * 83492791)); if (!c) continue;
        for (const j of c) { if (j <= i) continue; const b = nuts[j], dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z, m = a.rad + b.rad, d2 = dx * dx + dy * dy + dz * dz; if (d2 < m * m && d2 > 1e-12) { const d = Math.sqrt(d2), k = (m - d) / d * .5; a.p.x -= dx * k; a.p.y -= dy * k; a.p.z -= dz * k; b.p.x += dx * k; b.p.y += dy * k; b.p.z += dz * k; } } }
      // drum wall: push in, and drag the nut along with the turning wall (that's what lifts the bed)
      const d = Math.hypot(a.p.x, a.p.y), w = lim - a.rad; if (d > w) { const nx = a.p.x / d, ny = a.p.y / d; a.p.x = nx * w; a.p.y = ny * w; const tx = -ny, ty = nx, vt = ((a.p.x - a.q.x) * tx + (a.p.y - a.q.y) * ty), want = OMEGA * w * dt, dv = (want - vt) * .45; a.q.x -= tx * dv; a.q.y -= ty * dv; }
      // vanes: thin plates from the wall inward; a nut that hits one is pushed off it and carried round
      for (let k = 0; k < VANES; k++) { const va = vaneAt(k, ang), ux = Math.cos(va), uy = Math.sin(va); const s = a.p.x * ux + a.p.y * uy; if (s < R - .04 || s > R) continue; const nx = -uy, ny = ux, off = a.p.x * nx + a.p.y * ny, need = a.rad + .003; if (Math.abs(off) < need) { const sg = off >= 0 ? 1 : -1, push = (need - Math.abs(off)) * sg; a.p.x += nx * push; a.p.y += ny * push; const vv = OMEGA * s * dt; a.q.x = a.p.x - (a.p.x - a.q.x) * .5 - nx * vv * .5; a.q.y = a.p.y - (a.p.y - a.q.y) * .5 - ny * vv * .5; } }
      // back plate and the front lip
      if (a.p.z < -L / 2 + a.rad) a.p.z = -L / 2 + a.rad;
      if (a.p.z > L / 2 - a.rad - .004) a.p.z = L / 2 - a.rad - .004;
    }
  }
  // tumble: spin each nut by how far it rolled this step
  for (const n of nuts) { tmpV.set(n.p.x - n.q.x, n.p.y - n.q.y, n.p.z - n.q.z); const sp = tmpV.length(); if (sp > 1e-6) { const axis = new THREE.Vector3(-tmpV.y, tmpV.x, tmpV.z * .3).normalize(); n.rot.premultiply(tmpQ.setFromAxisAngle(axis, sp / n.rad)); } }
}
function syncNuts() { for (const n of nuts) { tmpM.compose(n.p, n.rot, tmpS); n.t.mesh.setMatrixAt(n.i, tmpM); } types.forEach(t => { t.mesh.instanceMatrix.needsUpdate = true; }); }

/* ---------- time ---------- */
let T = 0;
function step(dt) {
  const sub = 6; for (let s = 0; s < sub; s++) { ang += OMEGA * dt / sub; physics(dt / sub); }
  T += dt;
  // alive: a motor hum (whole cycles per LOOP) and a thump each time a vane passes the bottom (every 1 s),
  // the machine rocking on its feet; the drum rattles a little on its rollers on top of that
  const P2 = 2 * Math.PI, hum = (f, s) => Math.sin(P2 * f * T + s), ph = T % 1, kAmp = [1, .72, .9, .62, 1.08, .78, .86, .66][Math.floor(T + 1e-6) % 8];
  const kick = Math.exp(-ph / .12) * Math.sin(P2 * 6 * ph) * kAmp;
  rig.position.set(.001 * hum(7.5, 0) + .0027 * kick, FLOOR + .0005 * hum(11.25, 1) + .0018 * Math.abs(kick), .0005 * hum(3.75, 2));
  rig.rotation.set(.0011 * hum(5, .5) + .005 * kick, 0, .0016 * hum(7.5, 1.3) + .014 * kick);
  drum.position.set(.0008 * hum(11.25, 2.1), .0006 * hum(7.5, .7) + .0013 * Math.abs(kick), 0);
  drum.rotation.z = ang; vanes.forEach((v, k) => { const a = vaneAt(k, 0); v.position.set(Math.cos(a) * (R - .018), Math.sin(a) * (R - .018), 0); v.rotation.z = a; });
  flames.forEach((f, i) => { f.material.uniforms.uT.value = T + i * .37; f.lookAt(camera.position.x, f.position.y, camera.position.z); const fl = 1 + .08 * Math.sin(T * 13 + i * 1.7) + .05 * Math.sin(T * 29 + i); f.scale.set(1, fl, 1); });
  fireL.forEach((l, i) => { l.intensity = .05 + .012 * Math.sin(T * 11 + i * 2) + .008 * Math.sin(T * 23.7 + i); });
  belly.material.opacity = .3 + .05 * Math.sin(T * 9.3);
  // sparks pop off the burner now and then
  for (const s of spark) { if (s.life <= 0 && r() < .02) { s.p.set((r() - .5) * FB.w * .8, FB.top - FB.h + .1, (r() - .5) * .12 + .02); s.v.set((r() - .5) * .08, .25 + r() * .35, (r() - .5) * .05 + .05); s.life = s.max = .6 + r() * .9; } }
  spark.forEach((s, k) => { if (s.life > 0) { s.life -= dt; s.v.y += .15 * dt; s.v.x += (r() - .5) * .3 * dt; s.p.addScaledVector(s.v, dt); } spPos[k * 3] = s.p.x; spPos[k * 3 + 1] = s.p.y; spPos[k * 3 + 2] = s.p.z; spA[k] = Math.max(0, s.life / s.max) * (s.life > 0 ? 1 : 0); });
  spGeo.attributes.position.needsUpdate = spGeo.attributes.a.needsUpdate = true;
  syncNuts();
}

/* ---------- post: bloom on the flames ---------- */
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 })); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .5, .45, 1.05));
composer.addPass(new OutputPass());

// settle the bed for 3 s with the drum turning, then the recording starts
for (let i = 0; i < 4 * FPS; i++) step(1 / FPS);
T = 0; ang = 0;
window.__frames = (LOOP + FADE) * FPS;
const fx = [...flames, belly, sparks], white = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
const mats = new Set(); inner.traverse(o => { if (o.isMesh) mats.add(o.material); });
window.__render = i => {
  if (i > 0) step(1 / FPS);
  floor.visible = ao.visible = false; composer.render(); const beauty = canvas.toDataURL('image/png');
  const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; fx.forEach(o => { o.visible = false; });
  // the mask must be pure white: instance colours would tint it (and let the page show through the nuts)
  const ic = types.map(t => t.mesh.instanceColor); types.forEach(t => { t.mesh.instanceColor = null; });
  scene.overrideMaterial = white; renderer.render(scene, camera); const mask = canvas.toDataURL('image/png'); scene.overrideMaterial = null;
  types.forEach((t, k) => { t.mesh.instanceColor = ic[k]; });
  mats.forEach(m => { m.colorWrite = false; }); floor.visible = ao.visible = true; renderer.render(scene, camera); const shadow = canvas.toDataURL('image/png');
  mats.forEach(m => { m.colorWrite = true; }); fx.forEach(o => { o.visible = true; }); renderer.toneMapping = tm;
  return [beauty, mask, shadow];
};
window.__dbg = { key, lamp, rim, fireL, heat, scene, renderer, nutMat, composer, types, canvas };
window.__nuts = nuts; window.__R = R; window.__L = L;
window.__ready = true;
