/* Shawarmaje: a Syrian "arabi" shawarma built on scroll, on their own horizontal charcoal spit.
   1 carve   a knife shaves the turning chicken log; strips fly onto saj bread
   2 garnish toum (garlic) dollops + pickles
   3 roll    the bread bends into a tight roll around the filling (bend-to-cylinder, filling rides along)
   4 dip     into a tray of glossy orange sauce, rolled once, lifted out coated
   5 grill   onto a grate over the coals; flames flare twice, grill marks + toast, flipped halfway
   6 cut     a chef's knife chops it into six bites that fan out, with garlic + pickles on the board
   Built on the kit stage (lights, HDRI, shadows, post, camera path, flows gated in order). */
import { createStage, THREE, dropState } from '../../.claude/skills/ela-studio/kit/build3d/src/engine.js';
import { clamp, lerp, sstep, easeOut, easeIn, easeInOut, rng, fbm, noise } from '../../.claude/skills/ela-studio/kit/build3d/src/util.js';

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/',
  bg: '#0c0705', rimColor: 0xff9a55, exposure: .95, fov: 26,
  floor: { color: '#4a3f38', repeat: 6, roughness: .7 },
  lights: { key: 120, rim: 95, kick: 1.3, pool: 240 },
  camera: [[0, -20, 15, 6.4, .5], [.07, -10, 17, 5.2, .48], [.18, 8, 21, 4.8, .45], [.3, 2, 36, 3.9, .22], [.38, -6, 32, 3.5, .18], [.5, -34, 27, 3.2, .2],
    [.56, 30, 24, 3.7, .32], [.64, 38, 17, 3.4, .26], [.7, -28, 14, 3.6, .38], [.8, -40, 16, 3.4, .34], [.86, -14, 46, 3.5, .08], [.94, 22, 36, 3.6, .1], [1, 34, 32, 4.7, .12]],
  onReady: () => window.__ffReady && window.__ffReady()
});
const { scene, dish, camera } = st;
const C = c => new THREE.Color(c);
const R = .17, BL = 1.5, BW = 2 * Math.PI * R * 1.05, NSEG = 6, SEG = BL / NSEG;
const BOARD_TOP = .06, BZ0 = .62, SPY = .82, SPZ = -.3, TR_TOP = .3;
const rnd = rng(7);

/* ---------- canvas textures ---------- */
function canvasTex(w, h, draw, rep = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; }
const breadTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e6c890'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, s = 30 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(196,140,70,${.18 + r() * .14})`); gr.addColorStop(1, 'rgba(196,140,70,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }
  for (let i = 0; i < 1400; i++) { const x = r() * w, y = r() * h, s = .8 + r() * 3.2; g.fillStyle = `rgba(${90 + r() * 50},${48 + r() * 30},${18 + r() * 14},${.25 + r() * .5})`; g.beginPath(); g.ellipse(x, y, s, s * (.5 + r() * .5), r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, s = 3 + r() * 7, gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(70,34,10,.75)'); gr.addColorStop(1, 'rgba(110,60,22,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,250,236,${.2 + r() * .35})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
}, 1);
const woodTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#8a5a34'; g.fillRect(0, 0, w, h); const r = rng(11);
  for (let y = 0; y < h; y += 2) { const v = Math.sin(y * .05 + Math.sin(y * .013) * 4) * .5 + .5; g.fillStyle = `rgba(${60 + v * 40},${34 + v * 22},${16 + v * 10},${.12 + v * .12})`; g.fillRect(0, y, w, 2); }
  for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(50,28,12,${.08 + r() * .15})`; g.lineWidth = .6 + r() * 1.4; g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .01 + i) * 6); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(230,200,160,${.05 + r() * .08})`; g.lineWidth = 1; g.beginPath(); const x = r() * w; g.moveTo(x, r() * h); g.lineTo(x + 40 + r() * 140, r() * h); g.stroke(); }
});
const fillTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a8662f'; g.fillRect(0, 0, w, h); const r = rng(5);
  for (let i = 0; i < 260; i++) { g.fillStyle = ['#d9a05c', '#c4843f', '#8a4a1e', '#e8bf80', '#6e3612'][Math.floor(r() * 5)]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(250,246,234,${.6 + r() * .4})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 5, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) { g.fillStyle = '#8fae45'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 4, 0, 7); g.fill(); }
  const gr = g.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .5); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.85, 'rgba(0,0,0,0)'); gr.addColorStop(.92, 'rgba(234,214,168,1)'); gr.addColorStop(1, 'rgba(200,150,90,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const marksTex = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h); const r = rng(9);
  for (const y0 of [.28, .74]) { g.save(); g.translate(w / 2, y0 * h); g.rotate(-.5); for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(30,10,2,${.42 + r() * .25})`; g.fillRect(-w, -9 + k * 3 + r() * 2, w * 2, 5); } g.restore(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(40,16,4,${.12 + r() * .2})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.fill(); }
});
/* ---------- materials ---------- */
const M = {
  bread: new THREE.MeshPhysicalMaterial({ map: breadTex, roughness: .82, sheen: .4, sheenColor: C('#fff0cc'), side: THREE.DoubleSide }),
  meat: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .55, clearcoat: .3, clearcoatRoughness: .45, envMapIntensity: .55, sheen: .3, sheenColor: C('#ffb36b'), normalMap: st.tex('brownie_side_n.webp', false, 3), normalScale: new THREE.Vector2(1.2, 1.2) }),
  shave: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .5, clearcoat: .3, clearcoatRoughness: .4, envMapIntensity: .5, sheen: .3, sheenColor: C('#ffc27a'), normalMap: st.tex('brownie_side_n.webp', false, 1), normalScale: new THREE.Vector2(1, 1) }),
  fillSide: new THREE.MeshStandardMaterial({ color: '#9a5a28', roughness: .6 }),
  fillCap: new THREE.MeshPhysicalMaterial({ map: fillTex, roughness: .5, clearcoat: .35 }),
  coat: new THREE.MeshPhysicalMaterial({ color: '#c24d16', roughness: .2, clearcoat: 1, clearcoatRoughness: .06, transparent: true, opacity: 0, depthWrite: false, sheen: .3, sheenColor: C('#ff9a4a') }),
  marks: new THREE.MeshStandardMaterial({ map: marksTex, transparent: true, opacity: 0, roughness: .8, depthWrite: false }),
  steel: new THREE.MeshPhysicalMaterial({ color: '#8d9296', metalness: 1, roughness: .32, envMapIntensity: 1.1 }),
  darkSteel: new THREE.MeshPhysicalMaterial({ color: '#2b2c2e', metalness: .85, roughness: .45 }),
  chrome: st.mat('chrome'),
  blade: new THREE.MeshPhysicalMaterial({ color: '#d9dde0', metalness: 1, roughness: .16, envMapIntensity: 1.5 }),
  handle: new THREE.MeshPhysicalMaterial({ color: '#141210', roughness: .45, clearcoat: .6 }),
  coal: new THREE.MeshStandardMaterial({ color: '#1f1b19', roughness: .95 }),
  ember: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ff7a2a', emissiveIntensity: 2.4, roughness: 1 }),   // emissive, not MeshBasic: Basic + HDR flared the whole frame green in SwiftShader
  wood: new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .62, clearcoat: .2, clearcoatRoughness: .5 }),
  sauce: st.mat('sauce', '#c84f17'),
  toum: st.mat('cream', '#f7f2e6', 2),
  pickle: new THREE.MeshPhysicalMaterial({ color: '#7f9a38', roughness: .3, clearcoat: .8, clearcoatRoughness: .1, sheen: .4, sheenColor: C('#d8ef8a') }),
  porcelain: st.mat('porcelain')
};
M.sauce.color.set('#c84f17');
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; };

/* ---------- the spit: chicken log on a horizontal skewer over a charcoal trough ---------- */
const spit = new THREE.Group(); dish.add(spit);
const logG = new THREE.Group(); spit.add(logG);
{
  const L = 1.7, g = new THREE.CylinderGeometry(.3, .3, L, 120, 70, false); g.rotateZ(Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(21);
  const gold = C('#a8622a'), deep = C('#703510'), char = C('#2a1206'), hi = C('#d39248'), cut = C('#d9aa6c');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rad = Math.hypot(y, z), a = Math.atan2(z, y), cap = rad < .29;
    const u = Math.abs(x) / (L / 2), taper = 1 - .22 * Math.pow(u, 5);
    const strata = Math.sin(x * 46 + fbm(x * 3, a, 1) * 9) * .5 + .5, n = fbm(x * 4, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 4);
    if (!cap) { const k = taper * (1 + .085 * n + .012 * strata + .02 * fbm(x * 18, Math.cos(a) * 5, Math.sin(a) * 5, 3)); p.setY(i, y * k); p.setZ(i, z * k); }
    else { p.setY(i, y * taper); p.setZ(i, z * taper); }
    if (cap) { c.copy(cut).lerp(deep, sstep(.15, .3, rad) * .6); const ring = Math.sin(rad * 120) * .5 + .5; c.lerp(hi, ring * .3); }
    else { c.copy(gold).lerp(deep, sstep(-.2, .35, n)); c.lerp(char, sstep(.2, .6, fbm(x * 7, Math.cos(a) * 3, Math.sin(a) * 3 + 7)) * .9); c.lerp(hi, sstep(.25, .6, n) * sstep(.6, .95, strata) * .5); }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  logG.add(mesh(g, M.meat));
  const sk = mesh(new THREE.CylinderGeometry(.016, .016, 2.6, 16), M.chrome); sk.rotation.z = Math.PI / 2; spit.add(sk);
  for (const s of [-1, 1]) { const post = mesh(new THREE.BoxGeometry(.05, SPY - TR_TOP + .06, .05), M.darkSteel); post.position.set(s * 1.24, (SPY + TR_TOP) / 2 - SPY - .03, 0); spit.add(post); const disc = mesh(new THREE.CylinderGeometry(.12, .12, .02, 32), M.steel); disc.rotation.z = Math.PI / 2; disc.position.x = s * .9; logG.add(disc); }
  const crank = mesh(new THREE.TorusGeometry(.06, .012, 10, 24), M.darkSteel); crank.rotation.y = Math.PI / 2; crank.position.x = 1.32; spit.add(crank);
}

/* the charcoal trough (later the grill) */
const trough = new THREE.Group(); dish.add(trough);
const fireLight = new THREE.PointLight(0xff6a20, 4, 3.2, 1.6); fireLight.position.set(0, .55, 0); trough.add(fireLight);
let embersMesh;
{
  const TL = 2.5, TW = .62, TH = TR_TOP, th = .03;
  const parts = [[TL, th, TW, 0, th / 2, 0], [TL, TH, th, 0, TH / 2, TW / 2], [TL, TH, th, 0, TH / 2, -TW / 2], [th, TH, TW, TL / 2, TH / 2, 0], [th, TH, TW, -TL / 2, TH / 2, 0]];
  for (const [w, h, d, x, y, z] of parts) { const m = mesh(new THREE.BoxGeometry(w, h, d), M.darkSteel); m.position.set(x, y, z); trough.add(m); }
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(.04, .02, .04), M.darkSteel); leg.position.set(s * 1.15, -.0, t * .26); trough.add(leg); }
  const N = 260, coal = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.05, 1), M.coal, N), emb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.034, 1), M.ember, N);
  const o = new THREE.Object3D(), c = new THREE.Color(), r = rng(31);
  for (let i = 0; i < N; i++) {
    const x = (r() - .5) * (TL - .12), z = (r() - .5) * (TW - .1), y = .05 + r() * .14 + (1 - Math.abs(z) / .3) * .03;
    o.position.set(x, y, z); o.rotation.set(r() * 6, r() * 6, r() * 6); const s = .7 + r() * .8; o.scale.set(s, s * (.6 + r() * .4), s); o.updateMatrix(); coal.setMatrixAt(i, o.matrix);
    o.position.y += .012; o.scale.multiplyScalar(.9); o.updateMatrix(); emb.setMatrixAt(i, o.matrix); const b = .25 + r() * .9; emb.setColorAt(i, c.setRGB(b, b * .8, b * .6));
  }
  coal.castShadow = false; coal.receiveShadow = true; trough.add(coal, emb); embersMesh = emb;
}
// grate (grill phase)
const grate = new THREE.Group(); trough.add(grate);
for (let i = 0; i < 26; i++) { const b = mesh(new THREE.CylinderGeometry(.008, .008, .64, 8), M.darkSteel, false); b.rotation.x = Math.PI / 2; b.position.set(-1.2 + i * .096, TR_TOP + .012, 0); grate.add(b); }
for (const z of [-.28, .28]) { const b = mesh(new THREE.BoxGeometry(2.46, .012, .014), M.darkSteel, false); b.position.set(0, TR_TOP + .006, z); grate.add(b); }

/* flames: additive billboards with a noise shader */
const flameMat = (seed) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uI: { value: 0 }, uS: { value: seed } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform float uT,uI,uS;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){vec2 uv=vUv;float t=uT*2.8+uS*13.;float d=n(vec2(uv.x*4.+uS*7.,uv.y*3.5-t))*.55+n(vec2(uv.x*9.,uv.y*7.-t*1.7))*.3;
  float x=(uv.x-.5)*2.+(d-.42)*1.1*uv.y;float w=pow(clamp(1.-uv.y,0.,1.),.75)*.85+.06;float body=1.-smoothstep(w*.3,w,abs(x));
  float a=clamp(body*smoothstep(0.,.07,uv.y)*(1.-smoothstep(.5,1.,uv.y+d*.4)),0.,1.);
  vec3 c=mix(vec3(1.,.93,.66),vec3(1.,.5,.1),smoothstep(.0,.4,uv.y));c=mix(c,vec3(.8,.16,.03),smoothstep(.4,.85,uv.y));
  gl_FragColor=vec4(clamp(c*a*uI*1.8,0.,4.),clamp(a*uI,0.,1.));}`
});
const flames = [];
for (let i = 0; i < 30; i++) { const g = new THREE.PlaneGeometry(.2, .5); g.translate(0, .25, 0); const m = new THREE.Mesh(g, flameMat(i * .37 % 1)); m.renderOrder = 5; m.frustumCulled = false; m.userData = { x: -.85 + (i / 29) * 1.7 + (rnd() - .5) * .06, z: (rnd() - .5) * .3, s: .6 + rnd() * .7, ph: rnd() * 6 }; trough.add(m); flames.push(m); }

/* board, sauce tray, ramekin, pickles */
const board = mesh(new THREE.BoxGeometry(2.1, BOARD_TOP, 1.15), [M.wood, M.wood, M.wood, M.wood, M.wood, M.wood]); dish.add(board);
const tray = new THREE.Group(); dish.add(tray);
const TRAY_Y = .1;
{
  const TL = 2.0, TW = .62, TH = .14, th = .02;
  for (const [w, h, d, x, y, z] of [[TL, th, TW, 0, th / 2, 0], [TL, TH, th, 0, TH / 2, TW / 2], [TL, TH, th, 0, TH / 2, -TW / 2], [th, TH, TW, TL / 2, TH / 2, 0], [th, TH, TW, -TL / 2, TH / 2, 0]]) { const m = mesh(new THREE.BoxGeometry(w, h, d), M.steel); m.position.set(x, y, z); tray.add(m); }
}
const sauceG = new THREE.PlaneGeometry(1.96, .58, 80, 24); sauceG.rotateX(-Math.PI / 2);
const sauceS = mesh(sauceG, M.sauce, false); sauceS.position.y = TRAY_Y; tray.add(sauceS);
const sauceBase = sauceG.attributes.position.array.slice();
const cup = new THREE.Group(); dish.add(cup);
{ const pr = [[0, 0], [.1, 0], [.115, .01], [.12, .08], [.112, .085], [.104, .02], [0, .02]].map(([a, b]) => new THREE.Vector2(a, b)); cup.add(mesh(new THREE.LatheGeometry(pr, 48), M.porcelain));
  const s = mesh(new THREE.CylinderGeometry(.103, .103, .02, 40), M.toum); s.position.y = .062; s.scale.y = 1; cup.add(s); const dol = mesh(new THREE.SphereGeometry(.06, 24, 16), M.toum); dol.scale.set(1, .45, 1); dol.position.y = .07; cup.add(dol); }
const spears = new THREE.Group(); dish.add(spears);
for (let i = 0; i < 4; i++) { const s = mesh(new THREE.CapsuleGeometry(.03, .18, 6, 12), M.pickle); s.rotation.z = Math.PI / 2; s.rotation.y = i * .35 - .5; s.position.set(i * .02, .03 + (i % 2) * .03, i * .065 - .1); spears.add(s); }

/* knives */
function knife(len, h, hl) {
  const g = new THREE.Group(), sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(len * .92, 0); sh.quadraticCurveTo(len, 0, len, h * .25); sh.quadraticCurveTo(len * .8, h, len * .1, h); sh.lineTo(0, h); sh.closePath();
  const bg = new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 1 }); bg.translate(0, 0, -.003);
  g.add(mesh(bg, M.blade)); const hd = mesh(new THREE.BoxGeometry(hl, h * .62, .028), M.handle); hd.position.set(-hl / 2, h * .55, 0); g.add(hd);
  for (const x of [-.25, -.55]) { const r = mesh(new THREE.CylinderGeometry(.008, .008, .03, 10), M.steel); r.rotation.x = Math.PI / 2; r.position.set(x * hl, h * .55, 0); g.add(r); }
  return g;
}
const carver = knife(.72, .07, .26); dish.add(carver);
const chopper = knife(.5, .12, .22); dish.add(chopper);

/* ---------- the wrap: W (world) → spinG (rolls around the wrap axis) → inner → segments ---------- */
const W = new THREE.Group(), spinG = new THREE.Group(), inner = new THREE.Group(); dish.add(W); W.add(spinG); spinG.add(inner); spinG.position.y = R; inner.position.y = -R;
const segs = [];
for (let k = 0; k < NSEG; k++) {
  const sg = new THREE.Group(); inner.add(sg); sg.position.x = -BL / 2 + SEG * (k + .5);
  const g = new THREE.PlaneGeometry(SEG, BW, 10, 56); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + k) / NSEG * 1.4);
  const base = g.attributes.position.array.slice(), bread = mesh(g, M.bread); sg.add(bread);
  const fill = mesh(new THREE.CylinderGeometry(R * .93, R * .93, SEG - .002, 40, 1, false), [M.fillSide, M.fillCap, M.fillCap]); fill.rotation.z = Math.PI / 2; fill.position.y = R; fill.visible = false; sg.add(fill);
  const coat = mesh(new THREE.CylinderGeometry(R * 1.035, R * 1.035, SEG, 48, 1, true), M.coat, false); coat.rotation.z = Math.PI / 2; coat.position.y = R; coat.visible = false; sg.add(coat);
  const mk = mesh(new THREE.CylinderGeometry(R * 1.045, R * 1.045, SEG, 48, 1, true), M.marks, false); mk.rotation.z = Math.PI / 2; mk.position.y = R; mk.visible = false; sg.add(mk);
  segs.push({ sg, bread, g, base, fill, coat, mk, xc: sg.position.x });
}
// bend the bread: s across the width wraps around a cylinder of radius R/F (flat at F=0, closed at F=1)
let lastRoll = -1;
function setRoll(F) {
  if (Math.abs(F - lastRoll) < 1e-4) return; lastRoll = F;
  for (const S of segs) {
    const p = S.g.attributes.position.array, b = S.base;
    for (let i = 0; i < p.length; i += 3) {
      const x = b[i], s = b[i + 2], edge = Math.max(0, Math.abs(s) / (BW / 2) - .9) * 10, wob = .005 * (noise(x * 6 + S.xc * 6, s * 7, 3) * .5 + .5) * (1 - F * .7) + edge * .004 * (1 - F);
      const lump = 1 + .045 * F * noise((x + S.xc) * 5, 2.5, 1), Fe = Math.max(F, 1e-4), Rb = R * lump / Fe, th = s / Rb, ov = F > .6 ? (s > 0 ? .007 : -.004) * sstep(.82, 1.04, Math.abs(th) / Math.PI) : 0, rr = Rb + ov;
      p[i] = x; p[i + 1] = Rb - rr * Math.cos(th) + wob * Math.cos(th); p[i + 2] = rr * Math.sin(th) - wob * Math.sin(th);
    }
    S.g.attributes.position.needsUpdate = true; S.g.computeVertexNormals();
  }
}
const place = (s, h, F) => { const Fe = Math.max(F, 1e-4), Rb = R / Fe, th = s / Rb, rr = Rb - h; return { y: Rb - rr * Math.cos(th), z: rr * Math.sin(th), th }; };

/* shavings: instanced curled strips, each on its own closed-form clock */
function curlGeo() { const g = new THREE.BoxGeometry(.11, .028, .042, 8, 2, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = noise(x * 40, y * 40, z * 40), a = x / .11 * 1.1;
    const yy = y * (1 + .5 * n) + (1 - Math.cos(a)) * .03 + .008 * noise(x * 25, 3, z * 25), zz = z * (1 + .35 * noise(x * 30, 1, 2)) * (1 - .35 * Math.pow(Math.abs(x) / .055, 2));
    p.setXYZ(i, x, yy, zz); }
  g.computeVertexNormals(); return g; }
const NSH = 128, shav = new THREE.InstancedMesh(curlGeo(), M.shave, NSH); shav.castShadow = true; shav.receiveShadow = true; shav.frustumCulled = false; inner.add(shav);
const CARVE_T = 4.2, STROKES = 8;
const knifeAt = T => { const t0 = .3, d = 3.6 / STROKES; const j = clamp(Math.floor((T - t0) / d), 0, STROKES - 1), u = clamp((T - t0 - j * d) / d), xj = -.62 + 1.24 * j / (STROKES - 1);
  const xn = -.62 + 1.24 * Math.min(j + 1, STROKES - 1) / (STROKES - 1), down = u < .62, k = down ? easeInOut(u / .62) : easeInOut((u - .62) / .38);
  return { x: down ? xj : lerp(xj, xn, k), y: down ? lerp(1.12, .66, k) : lerp(.66, 1.12, k), cutting: down && T > t0 && T < t0 + 3.6, j, u }; };
const SH = [];
{ const cell = new Map(), r = rng(41); const pal = ['#b8702f', '#9c5a22', '#c98a44', '#7a3f16', '#d9a25a', '#a86428'].map(C);
  for (let i = 0; i < NSH; i++) {
    const j = Math.floor(i / (NSH / STROKES)), u = (i % (NSH / STROKES)) / (NSH / STROKES), d = 3.6 / STROKES, spawn = .3 + j * d + u * .62 * d;
    const xj = -.62 + 1.24 * j / (STROKES - 1) + (r() - .5) * .1, bx = clamp(xj * .95 + (r() - .5) * .08, -.68, .68), bs = (r() + r() + r() - 1.5) * .09;
    const key = Math.round(bx / .07) + ',' + Math.round(bs / .05), h0 = cell.get(key) || .004; cell.set(key, h0 + .011);
    SH.push({ spawn, x0: xj, bx, bs, bh: h0, yaw: r() * 6.28, tilt: (r() - .5) * .5, sc: .9 + r() * .6, spin: (r() - .5) * 14, col: pal[Math.floor(r() * pal.length)].clone().multiplyScalar(.85 + r() * .3) });
    shav.setColorAt(i, SH[i].col);
  }
  SH.cell = cell;
}
const pileTop = (bx, bs) => { let m = .004; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) m = Math.max(m, SH.cell.get((Math.round(bx / .07) + dx) + ',' + (Math.round(bs / .05) + dz)) || 0); return m; };
// garnish: toum dollops + pickle slices
const GN = []; { const r = rng(55);
  for (let i = 0; i < 7; i++) { const bx = -.58 + i * .19 + (r() - .5) * .05, bs = (r() - .5) * .08, m = mesh(new THREE.SphereGeometry(.04, 20, 14), M.toum); m.scale.set(1, .5, 1.2); inner.add(m); GN.push({ m, bx, bs, bh: pileTop(bx, bs) + .012, t0: i * .08, yaw: r() * 3 }); }
  for (let i = 0; i < 10; i++) { const bx = -.62 + i * .135 + (r() - .5) * .05, bs = (r() - .5) * .14, m = mesh(new THREE.CylinderGeometry(.034, .034, .008, 22), M.pickle); inner.add(m); GN.push({ m, bx, bs, bh: pileTop(bx, bs) + .02, t0: .55 + i * .06, yaw: r() * 3, tilt: (r() - .5) * .5, pickle: true }); }
}
// sauce drips off the wrap after the dip
const drips = []; for (let i = 0; i < 9; i++) { const d = mesh(new THREE.SphereGeometry(.014, 10, 8), M.sauce, false); d.scale.y = 1.6; dish.add(d); drips.push({ m: d, x: -.65 + i * .16 + (rnd() - .5) * .05, t0: rnd() * .35 }); }

/* ---------- director: every phase reads its flow ---------- */
const flow = (name, from, to, rate) => st.add({ name, kind: 'flow', from, to, rate, after: name === 'carve' ? null : undefined });
flow('carve', .07, .29, .55); flow('garnish', .31, .37, 1); flow('roll', .39, .52, .8); flow('dip', .54, .66, .7); flow('grill', .68, .82, .55); flow('cut', .84, .935, .7);
const L = st.byName, o3 = new THREE.Object3D(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3();
let T = 0;
const bump = (a, b, c, x) => sstep(a, b, x) * (1 - sstep(b, c, x));

st.add({ name: 'director', kind: 'director', trigger: 0, after: null, obj: null,
  update(st, s) {
    const dt = s.dt || 0; T += dt;
    const Fc = L.carve.F, Fga = L.garnish.F, Fr = L.roll.F, Fd = L.dip.F, Fg = L.grill.F, Fk = L.cut.F;
    // spit turns, then lifts away when the roll starts
    logG.rotation.x = T * .55;
    const away = easeIn(sstep(0, .4, Fr));
    spit.position.set(0, SPY + 2.4 * away, SPZ - .9 * away); spit.visible = away < .99;
    // trough: back under the spit → further back → forward as the grill → back for the cut
    let trZ = lerp(SPZ, -.95, easeInOut(sstep(0, .3, Fr))); trZ = lerp(trZ, 0, easeInOut(sstep(.05, .28, Fg))); trZ = lerp(trZ, -.95, easeInOut(sstep(0, .24, Fk)));
    trough.position.set(0, 0, trZ);
    const gr = sstep(.12, .3, Fg) * (1 - sstep(0, .2, Fk)); grate.visible = gr > .01; grate.position.y = (1 - gr) * .5; grate.children.forEach(b => b.visible = gr > .01);
    // board: in front of the spit → centre (roll) → out left (dip) → back (cut)
    let bx = 0, bz = lerp(BZ0, 0, easeInOut(sstep(0, .25, Fr)));
    bx = lerp(bx, -3.6, easeInOut(sstep(.12, .34, Fd))); bx = lerp(bx, 0, easeInOut(sstep(.04, .26, Fk)));
    board.position.set(bx, BOARD_TOP / 2, bz);
    tray.position.x = lerp(3.8, 0, easeInOut(sstep(.12, .32, Fd))) + 3.8 * easeInOut(sstep(0, .2, Fg)); tray.visible = tray.position.x < 3.7;
    // the wrap's path
    let wy = BOARD_TOP + .006, wz = bz, wx = bx;
    const up1 = easeInOut(sstep(0, .14, Fd)); wy = lerp(wy, .66, up1); wx = lerp(wx, 0, up1);
    wy = lerp(wy, TRAY_Y - .07, easeInOut(sstep(.3, .44, Fd))); wy = lerp(wy, .66, easeInOut(sstep(.7, .86, Fd)));
    wy = lerp(wy, TR_TOP + .022, easeInOut(sstep(.24, .36, Fg))); wy = lerp(wy, .62, easeInOut(sstep(.93, 1, Fg)));
    wy = lerp(wy, BOARD_TOP + .006, easeInOut(sstep(.18, .3, Fk)));
    if (Fd > 0 && Fk < .2) wz = lerp(wz, 0, 1);
    W.position.set(wx, wy, wz);
    spinG.rotation.x = Math.PI * 2 * easeInOut(sstep(.44, .7, Fd)) + Math.PI * easeInOut(sstep(.56, .68, Fg));
    // the roll
    setRoll(easeInOut(Fr));
    const closed = Fr > .985, Fre = easeInOut(Fr);
    // carving knife
    const Tv = Fc * CARVE_T, kn = knifeAt(Tv), kOn = Fc > .005 && Fc < .995;
    // a long knife held along the spit, edge down, shaving the front face as it turns (saws side to side)
    carver.visible = Fc > 0 && Fc < 1;
    carver.position.set(kn.x - .36 + .05 * Math.sin(Tv * 26) * (kn.cutting ? 1 : 0), kn.y + (1 - sstep(0, .06, Fc)) * .9 + sstep(.94, 1, Fc) * 1.3, SPZ + .31);
    carver.rotation.set(-.32, 0, 0);
    // shavings: fly from the knife to the bread, then ride the roll
    const wPos = W.position;
    for (let i = 0; i < NSH; i++) {
      const S = SH[i], t = Tv - S.spawn; let px, py, pz, rx, ry, rz, sc = S.sc;
      if (t <= 0 || closed) { o3.scale.setScalar(0); o3.position.set(0, -5, 0); o3.updateMatrix(); shav.setMatrixAt(i, o3.matrix); continue; }
      const rest = place(S.bs, S.bh, Fre);
      const y0 = SPY - .22 - wPos.y, x0 = S.x0, z0 = SPZ + .3 - wPos.z, yl = S.bh, g = 9.5, tf = Math.sqrt(2 * Math.max(.05, y0 - yl) / g);
      if (t < tf && Fr <= 0) { const u = t / tf; px = lerp(x0, S.bx, u); pz = lerp(z0, S.bs, easeOut(u)); py = y0 - .5 * g * t * t + Math.sin(u * Math.PI) * .08; rx = (1 - u) * 1.4 + S.spin * t * .3; ry = S.yaw; rz = S.tilt + S.spin * t * .2; }
      else { const land = Math.max(0, t - tf), bo = Fr > 0 ? 0 : .01 * Math.exp(-land * 9) * Math.abs(Math.sin(land * 20)); px = S.bx; py = rest.y + bo; pz = rest.z; rx = -rest.th; ry = S.yaw; rz = S.tilt * (1 - Fre); sc *= 1 - Fre * .15; }
      o3.position.set(px, py, pz); eu.set(rx, ry, rz, 'XYZ'); o3.quaternion.setFromEuler(eu); o3.scale.setScalar(sc); o3.updateMatrix(); shav.setMatrixAt(i, o3.matrix);
    }
    shav.instanceMatrix.needsUpdate = true;
    // garnish
    const Tg = Fga * 1.6;
    for (const gI of GN) { const t = Tg - gI.t0, rest = place(gI.bs, gI.bh, Fre); gI.m.visible = t > 0 && !closed; if (!gI.m.visible) continue;
      const ds = Fr > 0 ? { y: 0, s: 1 } : dropState(t, .7, .01, gI.pickle ? .05 : .25);
      gI.m.position.set(gI.bx, rest.y + ds.y, rest.z); gI.m.rotation.set(-rest.th + (gI.tilt || 0) * (1 - Fre), gI.yaw, 0); if (!gI.pickle) gI.m.scale.set(1, .5 * ds.s, 1.2); }
    // inside the closed roll: swap the loose filling for solid segments (they show at the ends and in the cut)
    const coatO = .55 * sstep(.46, .64, Fd) * (1 - .8 * sstep(.36, .9, Fg)), markO = .9 * sstep(.4, .92, Fg), toast = sstep(.36, .96, Fg);
    M.coat.opacity = coatO; M.marks.opacity = markO; const dipT = sstep(.46, .64, Fd); M.bread.color.setRGB(1 - toast * .22 - dipT * .02, 1 - toast * .3 - dipT * .24, 1 - toast * .3 - dipT * .5);
    // cut: knife chops 5 times, gaps open, bites fan out
    const cuts = [1, 2, 3, 4, 5].map(k => sstep(.24 + (k - 1) * .1 + .045, .24 + (k - 1) * .1 + .07, Fk));
    const fan = easeOut(sstep(.76, .98, Fk));
    let acc = 0; const offs = segs.map((S, k) => { if (k > 0) acc += cuts[k - 1] * .014 + fan * .06; return acc; }), mid = offs[NSEG - 1] / 2;
    segs.forEach((S, k) => { S.fill.visible = closed; S.coat.visible = coatO > .01; S.mk.visible = markO > .01; S.sg.position.x = S.xc + offs[k] - mid; S.sg.rotation.y = (k % 2 ? 1 : -1) * .26 * fan; S.sg.position.z = (k % 2 ? 1 : -1) * .05 * fan; });
    // chopper
    const ck = Fk > .2 && Fk < .76; chopper.visible = Fk > .16 && Fk < .82;
    if (chopper.visible) { const kk = clamp(Math.floor((Fk - .24) / .1), 0, 4), u = clamp((Fk - .24 - kk * .1) / .1), cx = -BL / 2 + SEG * (kk + 1) + offs[kk] - mid;
      const prevX = kk > 0 ? -BL / 2 + SEG * kk : cx; const xNow = u < .3 ? lerp(prevX, cx, easeInOut(u / .3)) : cx;
      const yNow = Fk < .24 ? lerp(1.3, .7, sstep(.16, .24, Fk)) : Fk > .74 ? lerp(.7, 1.5, sstep(.74, .82, Fk)) : u < .3 ? .7 : u < .55 ? lerp(.7, BOARD_TOP + .005, easeIn((u - .3) / .25)) : lerp(BOARD_TOP + .005, .7, easeOut((u - .55) / .45));
      chopper.position.set(W.position.x + xNow, yNow, W.position.z - .25); chopper.rotation.set(0, -Math.PI / 2, 0); }
    // garlic cup + pickles land on the board for the finale
    const tc = (Fk - .8) * 6; const dc = dropState(Math.max(0, tc), 1.4, .02, .08), dp = dropState(Math.max(0, tc - .3), 1.4, .02, .06);
    cup.visible = tc > 0; cup.position.set(bx + .7, BOARD_TOP + dc.y, bz + .32); cup.scale.set(1, dc.s, 1);
    spears.visible = tc > .3; spears.position.set(bx - .72, BOARD_TOP + dp.y, bz + .3);
    // sauce ripples while the wrap is in the tray
    if (tray.visible) { const p = sauceG.attributes.position.array, A = .012 * bump(.3, .5, .78, Fd); for (let i = 0; i < p.length; i += 3) { const x = sauceBase[i], z = sauceBase[i + 2], d = Math.hypot(z * 1.6, Math.max(0, Math.abs(x) - .7)); p[i + 1] = A * Math.sin(d * 34 - T * 9) * Math.exp(-d * 4); } sauceG.attributes.position.needsUpdate = true; sauceG.computeVertexNormals(); }
    // drips
    drips.forEach(d => { const t = (Fd - .78 - d.t0 * .3) * 3; d.m.visible = t > 0 && Fd < 1 && Fg < .3; if (!d.m.visible) return; d.m.position.set(W.position.x + d.x, W.position.y - .005 - 2.4 * t * t, W.position.z); if (d.m.position.y < TRAY_Y) d.m.visible = false; });
    // fire: two flare-ups on the grill, embers breathing all the time
    const flare = Math.max(bump(.3, .42, .6, Fg), .9 * bump(.6, .7, .86, Fg)), base = .55 * sstep(.33, .4, Fg) * (1 - sstep(.86, .98, Fg)), I = Math.max(flare, base);
    const flick = .82 + .18 * Math.sin(T * 13) * Math.sin(T * 7.3 + 1);
    fireLight.intensity = Math.min(26, 3 + 3 * flick + 20 * I * flick); fireLight.position.y = .2;   // stays down in the coals: a light touching the wrap overflowed the HDR buffer (frame went green)
    M.ember.emissiveIntensity = Math.min(3.2, 2 * flick * (1 + .4 * I));
    flames.forEach(f => { const on = I > .01; f.visible = on; if (!on) return; const d = f.userData, h = (.5 + .7 * noise(T * 2 + d.ph, d.x * 3, 1) + .3) * d.s * (.4 + 1.6 * I);
      f.position.set(d.x, TR_TOP - .06, d.z); f.scale.set(.8 + I * .6, Math.max(.05, h), 1); f.quaternion.copy(camera.quaternion); f.material.uniforms.uT.value = T; f.material.uniforms.uI.value = I * (.7 + .3 * flick); });
    // keep rendering while any phase is still catching up to the scroll position (or something is alive on screen)
    const lag = ['carve', 'garnish', 'roll', 'dip', 'grill', 'cut'].some(k => { const l = L[k]; return Math.abs(l.F - clamp((st.p - l.from) / (l.to - l.from))) > .002; });
    this.busy = lag || st.p < .45 || (Fg > 0 && Fg < 1) || (Fd > .25 && Fd < .8);
  }
});

// for ElaGate: true while any phase is still well behind where the scroll says it should be
const PH = ['carve', 'garnish', 'roll', 'dip', 'grill', 'cut'];
window.__shawarma = { L, st, lag: () => st.isReady() && !document.hidden && PH.some(k => { const l = L[k]; return clamp((st.target - l.from) / (l.to - l.from)) - l.F > .04; }) };
st.start();
