/* =====================================================================
   Carioca's Barber Shop: "From Rio to the world."
   A horizontal journey in one three.js world. Scroll moves the camera
   sideways along +x:
     Rio      the Copacabana boardwalk (black/white wave mosaic, painted
              into a repeating CanvasTexture), sand, sea, palms that sway,
              Sugarloaf and its cable car line behind
     crossing open ocean, the sun on the water, a plane heading north
     city     concrete sidewalk, a night-lit skyline with a red/white/blue
              crown tower
     shop     their brick storefront: black frames, CARIOCAS window art,
              a lime downpipe and a spinning barber pole
   The sky shifts from Rio afternoon to city dusk along the way.
   Bundle: kit/build3d/build.sh cariocasbarbershop/src/rio.js cariocasbarbershop/assets/rio.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
let seed = 21; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const FD = '"Syne", system-ui, sans-serif';

export const X_END = 104; // camera travels x: 0 → X_END

function tex(w, h, draw, renderer, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}

export async function mountRio(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const SMALL = matchMedia('(max-width: 820px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.6 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(36, 1, .1, 400);
  try { await Promise.race([Promise.all(['800 60px Syne', '700 30px Syne'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .45; }

  // sky dome: afternoon over Rio → dusk over the city (uniform t)
  const skyU = { t: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; uniform float t;
      void main(){ float h = clamp(vP.y * 1.4 + .05, 0., 1.);
        vec3 dayTop = vec3(.36,.62,.9), dayLow = vec3(.98,.86,.66);
        vec3 duskTop = vec3(.12,.14,.32), duskLow = vec3(.98,.5,.36);
        vec3 top = mix(dayTop, duskTop, t), low = mix(dayLow, duskLow, t);
        gl_FragColor = vec4(mix(low, top, pow(h, .7)), 1.); }`,
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xf0d7b0, 40, 150);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.castShadow = true;
  sun.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 80 }); sun.shadow.bias = -.0006; sun.shadow.radius = 4;
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xe8c99a, .9);
  scene.add(sun, sun.target, hemi);
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---------- Rio: boardwalk, sand, sea ----------
  const mosaic = tex(1024, 512, (g, W, H) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
    // the wave: black bands that undulate across the walk (perpendicular to the sea)
    g.fillStyle = '#16181b';
    for (let band = 0; band < 2; band++) {
      g.beginPath();
      for (let x = 0; x <= W; x += 4) { const y = H * .25 + band * H * .5 + Math.sin(x / W * Math.PI * 2) * H * .17; x === 0 ? g.moveTo(x, y - H * .1) : g.lineTo(x, y - H * .1); }
      for (let x = W; x >= 0; x -= 4) { const y = H * .25 + band * H * .5 + Math.sin(x / W * Math.PI * 2) * H * .17; g.lineTo(x, y + H * .1); }
      g.closePath(); g.fill();
    }
    // hand-set stones: tiny irregular grid of joints
    g.strokeStyle = 'rgba(120,110,95,.28)'; g.lineWidth = 1;
    for (let y = 0; y < H; y += 9) for (let x = (y / 9) % 2 ? 0 : 4; x < W; x += 9) { g.strokeRect(x + rnd(-1, 1), y + rnd(-1, 1), 8 + rnd(-1, 1), 8 + rnd(-1, 1)); }
  }, renderer, [6, 1]);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(52, 6.5, 1, 1), new THREE.MeshStandardMaterial({ map: mosaic, roughness: .85 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(15, 0, 0); walk.receiveShadow = true; scene.add(walk);
  const curb = cast(new THREE.Mesh(new THREE.BoxGeometry(52, .18, .25), new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: .8 }))); curb.position.set(15, .05, -3.35); scene.add(curb);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(52, 16), new THREE.MeshStandardMaterial({ color: 0xe9cf9b, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(15, -.02, -11.4); sand.receiveShadow = true; scene.add(sand);
  // sea: one big animated plane under everything from Rio to the crossing
  const seaU = { uT: { value: 0 } };
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1f8fb8, roughness: .18, metalness: .1 });
  seaMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, seaU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * .35 + uT * 1.4) * .12 + sin(position.y * .5 - uT) * .1;'); };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 120, 120, 80), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(30, -.25, -66); scene.add(sea);
  // foam line
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(52, .5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(15, -.01, -19.2); scene.add(foam);

  // palms along the boardwalk
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: .9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: .7, side: THREE.DoubleSide });
  const palms = [];
  function palm(x, z, h) {
    const g = new THREE.Group(); const lean = rnd(-.25, .25);
    const pts = [0, .33, .66, 1].map(t => new THREE.Vector3(Math.sin(t * 1.4) * lean * h * .4, t * h, Math.sin(t * 1.2) * .2));
    const trunk = cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .16, 8), trunkMat)); g.add(trunk);
    const crown = new THREE.Group(); crown.position.copy(pts[3]); g.add(crown);
    for (let i = 0; i < 9; i++) {
      const L = rnd(1.8, 2.4), geo = new THREE.PlaneGeometry(L, .5, 10, 1); geo.translate(L / 2, 0, 0);
      const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, -Math.pow(x / L, 2) * 1.1); p.setY(k, p.getY(k) * (1 - x / L * .7)); }
      geo.computeVertexNormals();
      const leaf = cast(new THREE.Mesh(geo, leafMat)); leaf.rotation.set(-Math.PI / 2 + .35, i / 9 * Math.PI * 2, 0, 'YXZ'); crown.add(leaf);
    }
    g.position.set(x, 0, z); scene.add(g); palms.push(crown); return g;
  }
  for (let x = -6; x < 40; x += 6.5) palm(x + rnd(-1, 1), -4.2 + rnd(-.4, .3), rnd(4.2, 5.6));
  // Sugarloaf + Morro da Urca, cable car line
  const rock = new THREE.MeshStandardMaterial({ color: 0x5f6e5a, roughness: .95 });
  const sugar = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), rock); sugar.scale.set(7, 15, 7); sugar.position.set(22, -2, -62); scene.add(sugar);
  const urca = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), rock); urca.scale.set(10, 7, 8); urca.position.set(8, -1.5, -58); scene.add(urca);
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(10, 5, -58), new THREE.Vector3(16, 8.5, -60), new THREE.Vector3(22, 12.6, -62)]), new THREE.LineBasicMaterial({ color: 0x333333 })); scene.add(cable);
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(.6, .4, .4), new THREE.MeshStandardMaterial({ color: 0xffd400 })); scene.add(gondola);
  // far hills
  [[-10, -80, 18, 9], [40, -85, 16, 7], [55, -90, 20, 6]].forEach(([x, z, s, h]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x6f8a78, roughness: 1 })); m.scale.set(s, h, s * .6); m.position.set(x, -1.5, z); scene.add(m); });

  // ---------- crossing: a plane heading north ----------
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(.18, 1.6, 6, 12), new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: .4 })); fus.rotation.z = Math.PI / 2; plane.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, 2.2), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 })); plane.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.3, .5, .05), new THREE.MeshStandardMaterial({ color: 0x009c3b })); tail.position.set(-.8, .25, 0); plane.add(tail);
  scene.add(plane);

  // ---------- city: sidewalk, street, skyline ----------
  const concrete = tex(512, 512, (g, W, H) => { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(80,75,70,${rnd(.03, .1)})`; g.fillRect(rnd(0, W), rnd(0, H), 2, 2); } g.strokeStyle = 'rgba(90,85,80,.45)'; g.lineWidth = 3; for (let x = 0; x <= W; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); }, renderer, [12, 1]);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(56, 6.5), new THREE.MeshStandardMaterial({ map: concrete, roughness: .9 }));
  side.rotation.x = -Math.PI / 2; side.position.set(78, .01, 0); side.receiveShadow = true; scene.add(side);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(56, 14), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: .85 }));
  street.rotation.x = -Math.PI / 2; street.position.set(78, -.01, 10); street.receiveShadow = true; scene.add(street);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(56, 60), new THREE.MeshStandardMaterial({ color: 0x55524d, roughness: 1 }));
  lot.rotation.x = -Math.PI / 2; lot.position.set(78, -.02, -33); scene.add(lot);
  // skyline: boxes with lit window textures
  const winTex = (lit) => tex(256, 512, (g, W, H) => { g.fillStyle = '#1d2230'; g.fillRect(0, 0, W, H); for (let y = 10; y < H; y += 22) for (let x = 10; x < W; x += 24) { g.fillStyle = rnd() < lit ? `rgba(255,${rnd(200, 235) | 0},${rnd(140, 190) | 0},${rnd(.7, 1)})` : 'rgba(70,80,100,.6)'; g.fillRect(x, y, 14, 12); } }, renderer);
  const towers = [];
  const wt = [winTex(.35), winTex(.55), winTex(.2)];
  for (let i = 0; i < 16; i++) {
    const w = rnd(3.5, 7.5), d = rnd(3.5, 7), h = [9, 16, 24, 12, 30, 18, 11, 26, 14, 21, 8, 19, 28, 13, 17, 23][i] + rnd(-2, 2), x = 54 + i * 5.6 + rnd(-1.5, 1.5), z = -46 - rnd(0, 24);
    const t = wt[i % 3].clone(); t.repeat.set(Math.max(1, w / 3), Math.max(1, h / 8)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0, roughness: .6, transparent: true, opacity: 0 }));
    m.position.set(x, h / 2, z); scene.add(m); towers.push(m);
  }
  // the crown tower: red/white/blue bands
  const crown = new THREE.Group(); crown.position.set(88, 0, -62); scene.add(crown);
  const ct = new THREE.Mesh(new THREE.BoxGeometry(5, 40, 5), new THREE.MeshStandardMaterial({ map: wt[1], emissive: 0xffffff, emissiveMap: wt[1], emissiveIntensity: 0, roughness: .5, transparent: true, opacity: 0 })); ct.position.y = 20; crown.add(ct); towers.push(ct);
  const bands = [0xd8263a, 0xffffff, 0x2850c8].map((c, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.2, 5.1), new THREE.MeshBasicMaterial({ color: c })); b.position.y = 41 + i * 1.3; crown.add(b); return b; });
  const lamps = [];
  for (let x = 62; x < 100; x += 9) { const pole = cast(new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: .6, roughness: .4 }))); pole.position.set(x, 2.1, -3.6); scene.add(pole); const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c9 })); head.position.set(x, 4.25, -3.6); scene.add(head); lamps.push(head); }

  // ---------- the shop ----------
  const brick = tex(512, 512, (g, W, H) => {
    g.fillStyle = '#5c2f24'; g.fillRect(0, 0, W, H);
    for (let r = 0, y = 0; y < H; r++, y += 22) for (let x = (r % 2) * -26; x < W; x += 52) { g.fillStyle = `rgb(${120 + rnd(-18, 18) | 0},${52 + rnd(-10, 10) | 0},${38 + rnd(-8, 8) | 0})`; g.fillRect(x + 2, y + 2, 48, 18); }
  }, renderer, [3, 2]);
  const shop = new THREE.Group(); shop.position.set(X_END, 0, -1.2); scene.add(shop);
  const facade = cast(new THREE.Mesh(new THREE.BoxGeometry(11, 6.4, .6), new THREE.MeshStandardMaterial({ map: brick, roughness: .9 }))); facade.position.y = 3.2; shop.add(facade);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: .5, metalness: .4 });
  const winArt = (right) => tex(1024, 820, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0d0f12'); grd.addColorStop(1, '#1b1f25'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .35, 0); g.lineTo(0, H * .6); g.fill();
    g.fillStyle = '#f4f1ea'; g.textAlign = 'center';
    if (!right) { // palm + sea line
      g.strokeStyle = '#f4f1ea'; g.lineWidth = 6; g.beginPath(); g.moveTo(W * .5, H * .36); g.quadraticCurveTo(W * .52, H * .24, W * .5, H * .14); g.stroke();
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(W * .5, H * .14); g.quadraticCurveTo(W * (.5 + Math.cos(i) * .06), H * (.1 + Math.sin(i * 2) * .02), W * (.5 + Math.cos(i * 1.05) * .1), H * (.17 + Math.abs(Math.sin(i)) * .05)); g.stroke(); }
      g.beginPath(); for (let x = W * .3; x < W * .7; x += 4) g.lineTo(x, H * .4 + Math.sin(x / 18) * 6); g.stroke();
    } else { g.font = `700 30px ${FD}`; g.fillText('FROM RIO TO THE WORLD', W / 2, H * .62); }
    g.font = `800 150px ${FD}`; g.fillText('CARIOCAS', W / 2, H * (right ? .4 : .57));
    g.font = `700 42px ${FD}`; g.fillText('— BARBER SHOP —', W / 2, H * (right ? .48 : .66));
    g.font = `600 26px ${FD}`; g.fillText(right ? '856-548-2077' : 'STYLE · CONFIDENCE · ATTITUDE', W / 2, H * (right ? .74 : .8));
  }, renderer);
  [-3.1, 3.1].forEach((x, i) => {
    const fr = cast(new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, .2), frameMat)); fr.position.set(x, 2.6, .32); shop.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.9), new THREE.MeshPhysicalMaterial({ map: winArt(i === 1), roughness: .08, clearcoat: 1, envMapIntensity: .8 })); gl.position.set(x, 2.6, .43); shop.add(gl);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(3.3, .7), new THREE.MeshPhysicalMaterial({ color: 0x1d2229, roughness: .1, clearcoat: 1 })); top.position.set(x, 4.75, .32); shop.add(top);
    const sill = cast(new THREE.Mesh(new THREE.BoxGeometry(3.8, .9, .7), new THREE.MeshStandardMaterial({ map: brick, roughness: .9 }))); sill.position.set(x, .45, .45); shop.add(sill);
  });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.4), new THREE.MeshPhysicalMaterial({ color: 0x0f1114, roughness: .15, clearcoat: 1 })); door.position.set(0, 1.7, .05); shop.add(door);
  const doorLight = new THREE.PointLight(0xfff1d0, 6, 6); doorLight.position.set(0, 2.6, 1.2); shop.add(doorLight);
  const pipe = cast(new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 6.4, 10), new THREE.MeshStandardMaterial({ color: 0x8fdc2b, roughness: .4 }))); pipe.position.set(5.6, 3.2, .4); shop.add(pipe);
  // barber pole
  const poleTex = tex(256, 512, (g, W, H) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); const cs = ['#d8263a', '#ffffff', '#2850c8', '#ffffff']; for (let i = -8; i < 16; i++) { g.fillStyle = cs[(i + 80) % 4]; g.beginPath(); g.moveTo(0, i * 64); g.lineTo(W, i * 64 - 128); g.lineTo(W, i * 64 - 64); g.lineTo(0, i * 64 + 64); g.fill(); } }, renderer, [1, 1]);
  poleTex.wrapS = poleTex.wrapT = THREE.RepeatWrapping;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 1.6, 32), new THREE.MeshPhysicalMaterial({ map: poleTex, roughness: .2, clearcoat: 1, emissive: 0xffffff, emissiveMap: poleTex, emissiveIntensity: .25 }));
  pole.position.set(-5.1, 3.4, .75); shop.add(pole);
  [-1, 1].forEach(s => { const cap = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: .2 })); cap.position.set(-5.1, 3.4 + s * .8, .75); if (s < 0) cap.rotation.x = Math.PI; shop.add(cap); });
  const spot = new THREE.SpotLight(0xfff0d0, 40, 14, .6, .5); spot.position.set(0, 7, 4); spot.target.position.set(0, 2.5, 0); shop.add(spot, spot.target);

  // ---------- camera along the journey ----------
  let aspect = 1, p = 0, pGoal = 0, drift = { x: 0, y: 0, gx: 0, gy: 0 }, clock = 0;
  const tgt = new THREE.Vector3();
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); dirty = true; kick(); }
  function placeCamera() {
    const narrow = aspect < 1;
    const x = lerp(-2, X_END, p);
    const ocean = ss(.36, .44, p) - ss(.56, .64, p);            // lift up over the sea
    const arrive = ss(.88, 1, p);                                // swing to face the shop
    const back = (narrow ? 15 : 12.5) + ocean * 6 + arrive * (narrow ? 1 : 1.5);
    const up = (narrow ? 5.4 : 4.6) + ocean * 5 - arrive * 1.6;
    tgt.set(x + (narrow ? 0 : 2.5) * (1 - arrive) - (narrow ? 0 : 3.2) * arrive, lerp(1.4, 2.9, arrive) + ocean * 1.2, lerp(-4, -1, arrive));
    camera.position.set(x - lerp(4.5, narrow ? 0 : 3.2, arrive) + drift.x * .6, up + drift.y * .3, back);
    camera.lookAt(tgt);
    sun.position.set(x + 12, 20, 14); sun.target.position.set(x, 0, -2);
  }
  function update(dt) {
    clock += dt;
    const dusk = ss(.5, .85, p); skyU.t.value = dusk;
    scene.fog.color.setRGB(lerp(.94, .55, dusk), lerp(.84, .42, dusk), lerp(.69, .5, dusk));
    sun.intensity = lerp(2.4, .6, dusk); sun.color.setRGB(1, lerp(.94, .7, dusk), lerp(.85, .55, dusk)); hemi.intensity = lerp(.9, .45, dusk);
    renderer.toneMappingExposure = lerp(1, 1.12, dusk);
    const city = ss(.44, .6, p);
    towers.forEach(t => { t.material.emissiveIntensity = lerp(0, 1.3, dusk); t.material.opacity = city; t.visible = city > .01; t.material.depthWrite = city > .98; });
    crown.visible = city > .01; bands.forEach(b => { b.material.transparent = true; b.material.opacity = city; });
    seaU.uT.value = clock;
    palms.forEach((c, i) => { c.rotation.z = Math.sin(clock * .9 + i) * .04; c.rotation.x = Math.cos(clock * .7 + i * 2) * .03; });
    const gk = (Math.sin(clock * .12) + 1) / 2; gondola.position.set(lerp(10, 22, gk), lerp(5, 12.6, gk) - .35, lerp(-58, -62, gk));
    const fly = ss(.36, .64, p); plane.position.set(lerp(36, 66, fly), 6 + Math.sin(fly * Math.PI) * 4, lerp(-10, -14, fly)); plane.rotation.z = Math.sin(fly * Math.PI) * .12; plane.visible = fly > 0 && fly < 1;
    poleTex.offset.y = (clock * .35) % 1;
    lamps.forEach(l => l.material.color.setRGB(1, lerp(.95, .9, dusk), lerp(.8, .6, dusk)));
  }

  let visible = true, raf = 0, last = performance.now(), dirty = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  addEventListener('resize', size);
  if (FINE) addEventListener('pointermove', e => { drift.gx = e.clientX / innerWidth * 2 - 1; drift.gy = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    p += (pGoal - p) * (1 - Math.pow(.004, dt)); if (Math.abs(pGoal - p) < .0002) p = pGoal;
    drift.x += (drift.gx - drift.x) * (1 - Math.pow(.03, dt)); drift.y += (drift.gy - drift.y) * (1 - Math.pow(.03, dt));
    update(RM ? 0 : dt); placeCamera(); renderer.render(scene, camera);
    if (visible && !document.hidden && !RM) raf = requestAnimationFrame(frame); // palms, sea and the pole keep moving
  }
  size(); update(0); placeCamera(); await renderer.compileAsync?.(scene, camera); kick();
  return { renderer, setProgress(x, instant) { pGoal = clamp(x); if (instant) p = pGoal; kick(); }, get progress() { return p; } };
}
