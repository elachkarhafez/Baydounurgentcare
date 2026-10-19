/* =====================================================================
   JV & Gentlemen Club: the chair.
   A vintage barber chair (chrome pedestal with gold bands, tufted black
   leather seat and back with buttons, chrome armrests with leather pads,
   headrest on a chrome rod, gridded footrest, pump lever) stands on a
   round black-and-white marble checkerboard under a warm spot. Beside it a
   slim gold stand holds a tray with a straight razor (silver blade, black
   scales, gold pins) and a shaving brush. Pick a service and the chair
   swivels to you; the shave reclines the back, lifts the footrest and the
   razor rises and unfolds. Kit method: studio HDRI, physical materials,
   lathe/extrude geometry, shadows on a transparent canvas, step sequencer,
   pointer drift, render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh jvgentlemenclub/src/chair.js jvgentlemenclub/assets/chair.js
   ===================================================================== */
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let seed = 11; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };

// tufted leather: height field of diamond pillows between buttons → colour + normal maps
function tuftMaps(W, H, cols, rows) {
  const hC = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W * cols, v = y / H * rows;
    // diamond lattice: rotate 45°, distance to nearest lattice point
    const a = u + v, b = u - v;
    const fa = a - Math.floor(a) - .5, fb = b - Math.floor(b) - .5; // 0 at the pillow centre, ±.5 on the seams
    const m = 1 - Math.max(Math.abs(fa), Math.abs(fb)) * 2;
    const pillow = Math.pow(Math.sin(clamp(m * 1.6) * Math.PI / 2), .7);
    hC[y * W + x] = pillow;
  }
  const col = document.createElement('canvas'); col.width = W; col.height = H; const cg = col.getContext('2d');
  const cd = cg.createImageData(W, H), nm = document.createElement('canvas'); nm.width = W; nm.height = H; const ng = nm.getContext('2d'), nd = ng.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, h = hC[i];
    const hx = hC[y * W + Math.min(W - 1, x + 1)] - hC[y * W + Math.max(0, x - 1)];
    const hy = hC[Math.min(H - 1, y + 1) * W + x] - hC[Math.max(0, y - 1) * W + x];
    const n = new THREE.Vector3(-hx * 6, -hy * 6, 1).normalize();
    nd.data[i * 4] = (n.x * .5 + .5) * 255; nd.data[i * 4 + 1] = (n.y * .5 + .5) * 255; nd.data[i * 4 + 2] = (n.z * .5 + .5) * 255; nd.data[i * 4 + 3] = 255;
    const g = 10 + h * 16 + (Math.random() - .5) * 5;
    cd.data[i * 4] = g; cd.data[i * 4 + 1] = g * .96; cd.data[i * 4 + 2] = g * .94; cd.data[i * 4 + 3] = 255;
  }
  cg.putImageData(cd, 0, 0); ng.putImageData(nd, 0, 0);
  // gold-capped buttons at the lattice points
  cg.fillStyle = '#c49a45';
  for (let a = -cols * 2; a <= cols * 2; a++) for (let b = -rows * 2; b <= rows * 2; b++) { const u = (a + b) / 2, v = (a - b) / 2, x = u / cols * W, y = v / rows * H; if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue; cg.beginPath(); cg.arc(x, y, W / cols * .045, 0, 7); cg.fill(); }
  const ct = new THREE.CanvasTexture(col); ct.colorSpace = THREE.SRGBColorSpace;
  const nt = new THREE.CanvasTexture(nm);
  return { map: ct, normalMap: nt };
}

function marbleFloor(S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), n = 10, t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const dark = (i + j) % 2; g.fillStyle = dark ? '#111' : '#d6d0c4'; g.fillRect(i * t, j * t, t, t);
    g.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(80,80,80,.18)'; g.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) { g.beginPath(); let x = i * t + rnd(0, t), y = j * t; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += rnd(-t * .2, t * .2); y += t / 6; g.lineTo(x, y); } g.stroke(); }
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, S); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(S, i * t); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function radialAlpha(S, inner = .55) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, S * inner * .5, S / 2, S / 2, S / 2); r.addColorStop(0, '#fff'); r.addColorStop(1, '#000');
  g.fillStyle = r; g.fillRect(0, 0, S, S); return new THREE.CanvasTexture(c);
}

export async function mountChair(canvas, o = {}) {
  const A = o.assets || 'assets/';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const env = await new Promise(r => new RGBELoader().load(A + 'studio-512.hdr', t => r(t), undefined, () => r(null)));
  if (env) { env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = .55; }

  const spot = new THREE.SpotLight(0xffe7c4, 60, 14, .55, .65, 1.6); spot.position.set(-1.2, 6.5, 2.8); spot.target.position.set(0, .6, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.0004; spot.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0xffc87a, 1.4); rim.position.set(3, 3, -4);
  const fill = new THREE.DirectionalLight(0xdfe6ff, .35); fill.position.set(-4, 2, 3);
  scene.add(spot, spot.target, rim, fill, new THREE.HemisphereLight(0xfff4e2, 0x0c0b0a, .25));

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ft = marbleFloor(1024); ft.anisotropy = aniso;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.7, 96), new THREE.MeshPhysicalMaterial({ map: ft, roughness: .22, clearcoat: .8, clearcoatRoughness: .12, alphaMap: radialAlpha(512, .2), transparent: true }));
  floor.rotation.x = -Math.PI / 2; floor.rotation.z = Math.PI / 4; floor.receiveShadow = true; scene.add(floor);

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe8e8e8, metalness: 1, roughness: .07 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd4ab55, metalness: 1, roughness: .22, clearcoat: .4 });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0x0d0d0d, roughness: .25, clearcoat: 1, clearcoatRoughness: .05 });
  const tuftBack = tuftMaps(512, 512, 3, 3), tuftSeat = tuftMaps(512, 512, 3, 3);
  tuftBack.map.anisotropy = aniso;
  const leatherBack = new THREE.MeshPhysicalMaterial({ map: tuftBack.map, normalMap: tuftBack.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: .5, clearcoat: .2, clearcoatRoughness: .45, sheen: .3, sheenColor: new THREE.Color(0x444444) });
  const leatherSeat = leatherBack.clone(); leatherSeat.map = tuftSeat.map; leatherSeat.normalMap = tuftSeat.normalMap;
  const leatherPlain = new THREE.MeshPhysicalMaterial({ color: 0x141312, roughness: .45, clearcoat: .35, sheen: .3, sheenColor: new THREE.Color(0x444444) });
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const lathe = (pts, mat, seg = 64) => cast(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat));

  /* ---------- the chair ---------- */
  const chair = new THREE.Group(); scene.add(chair);
  // pedestal: base disc, bell, column (bottom→top)
  chair.add(lathe([[0, 0], [.56, 0], [.58, .02], [.56, .06], [.42, .08], [.24, .14], [.15, .22], [.13, .3], [.13, .56], [0, .56]], chrome));
  for (const y of [.09, .34, .5]) { const r = cast(new THREE.Mesh(new THREE.TorusGeometry(y < .2 ? .36 : .135, .012, 10, 64), gold)); r.rotation.x = Math.PI / 2; r.position.y = y; chair.add(r); }
  // pump pedal
  const pedal = cast(new THREE.Mesh(new THREE.BoxGeometry(.06, .03, .3), chrome)); pedal.position.set(.32, .12, .2); pedal.rotation.y = -.5; chair.add(pedal);
  // swivel part (everything above the column turns)
  const top = new THREE.Group(); top.position.y = .56; chair.add(top);
  const seatFrame = cast(new THREE.Mesh(new RoundedBoxGeometry(.98, .14, .9, 3, .04), enamel)); seatFrame.position.y = .08; top.add(seatFrame);
  const trim = cast(new THREE.Mesh(new RoundedBoxGeometry(1.0, .02, .92, 2, .01), gold)); trim.position.y = .16; top.add(trim);
  const seat = cast(new THREE.Mesh(new RoundedBoxGeometry(.92, .2, .86, 5, .08), leatherSeat)); seat.position.y = .26; top.add(seat);
  // fix the seat's top-face UVs to read the tuft texture once (RoundedBox maps every face 0..1 already)
  // backrest on a hinge so it can recline
  const backHinge = new THREE.Group(); backHinge.position.set(0, .3, -.4); top.add(backHinge);
  const back = cast(new THREE.Mesh(new RoundedBoxGeometry(.9, 1.0, .18, 5, .07), leatherBack)); back.position.set(0, .56, -.02); backHinge.add(back);
  const backShell = cast(new THREE.Mesh(new RoundedBoxGeometry(.94, 1.04, .08, 3, .035), enamel)); backShell.position.set(0, .56, -.13); backHinge.add(backShell);
  const backTrim = cast(new THREE.Mesh(new THREE.TorusGeometry(.5, .01, 8, 64, Math.PI), gold)); backTrim.scale.set(.9, .5, 1); backTrim.position.set(0, .95, -.17); backHinge.add(backTrim);
  // headrest on a chrome rod
  const rod = cast(new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .34, 16), chrome)); rod.position.set(0, 1.18, -.12); backHinge.add(rod);
  const head = cast(new THREE.Mesh(new RoundedBoxGeometry(.5, .17, .17, 4, .07), leatherPlain)); head.position.set(0, 1.32, -.04); backHinge.add(head);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.055, 40), gold); badge.position.set(0, 1.32, .047); backHinge.add(badge);
  backHinge.rotation.x = -.14;
  // armrests: chrome loops with leather pads
  for (const sx of [-1, 1]) {
    const pts = [[sx * .5, .12, .34], [sx * .56, .28, .4], [sx * .56, .42, .3], [sx * .54, .46, 0], [sx * .52, .44, -.3]].map(a => new THREE.Vector3(...a));
    top.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .028, 12), chrome)));
    const pad = cast(new THREE.Mesh(new RoundedBoxGeometry(.13, .07, .7, 4, .03), leatherPlain)); pad.position.set(sx * .545, .5, .02); top.add(pad);
    const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(.04, 20, 14), gold)); cap.position.set(sx * .545, .5, .38); top.add(cap);
  }
  // footrest on a hinge at the front
  const footHinge = new THREE.Group(); footHinge.position.set(0, .02, .43); top.add(footHinge);
  {
    const arm = cast(new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .4), chrome)); arm.position.set(0, -.14, .16); arm.rotation.x = .9; footHinge.add(arm);
    const plate = cast(new THREE.Mesh(new RoundedBoxGeometry(.56, .03, .24, 2, .012), chrome)); plate.position.set(0, -.32, .3); footHinge.add(plate);
    for (let i = -3; i <= 3; i++) { const bar = cast(new THREE.Mesh(new THREE.BoxGeometry(.012, .012, .22), gold)); bar.position.set(i * .07, -.3, .3); footHinge.add(bar); }
  }
  // pump lever on the right
  const lever = cast(new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .42, 12), chrome)); lever.position.set(.56, .02, -.1); lever.rotation.x = -.6; top.add(lever);
  const knob = cast(new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: .2, clearcoat: 1 }))); knob.position.set(.56, .19, .02); top.add(knob);

  /* ---------- the side stand, tray, razor and brush ---------- */
  const stand = new THREE.Group(); stand.position.set(1.1, 0, -.15); scene.add(stand);
  stand.add(lathe([[0, 0], [.2, 0], [.21, .015], [.18, .03], [.03, .05], [.022, .08], [.022, .86], [0, .86]], gold));
  const tray = cast(new THREE.Mesh(new THREE.CylinderGeometry(.27, .25, .025, 64), chrome)); tray.position.y = .87; stand.add(tray);
  const lip = cast(new THREE.Mesh(new THREE.TorusGeometry(.27, .012, 8, 64), gold)); lip.rotation.x = Math.PI / 2; lip.position.y = .885; stand.add(lip);
  // shaving brush: lathe handle + bristles
  const brush = new THREE.Group(); brush.position.set(.12, .885, -.1); stand.add(brush);
  brush.add(lathe([[0, 0], [.045, 0], [.05, .02], [.035, .06], [.04, .1], [.045, .11], [0, .11]], new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: .15, clearcoat: 1 }), 32));
  brush.add(lathe([[0, .11], [.042, .11], [.06, .16], [.062, .2], [.04, .23], [0, .24]], new THREE.MeshPhysicalMaterial({ color: 0xe7ddcb, roughness: .9, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), 32));
  const goldBand = cast(new THREE.Mesh(new THREE.TorusGeometry(.046, .006, 8, 32), gold)); goldBand.rotation.x = Math.PI / 2; goldBand.position.y = .1; brush.add(goldBand);
  // straight razor: scales (handle) + blade on a pivot
  const razor = new THREE.Group(); razor.position.set(-.05, .9, .05); razor.rotation.y = .5; stand.add(razor);
  {
    const sh = new THREE.Shape(); sh.moveTo(0, -.022); sh.lineTo(.36, -.018); sh.quadraticCurveTo(.4, 0, .36, .018); sh.lineTo(0, .022); sh.quadraticCurveTo(-.03, 0, 0, -.022);
    const scaleGeo = new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 });
    const scaleMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: .18, clearcoat: 1 });
    for (const z of [-.016, .004]) { const s = cast(new THREE.Mesh(scaleGeo, scaleMat)); s.position.z = z; razor.add(s); }
    for (const x of [.01, .34]) { const pin = cast(new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .05, 12), gold)); pin.rotation.x = Math.PI / 2; pin.position.set(x, 0, 0); razor.add(pin); }
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(0, -.012); bladeShape.lineTo(.06, -.016); bladeShape.lineTo(.3, -.03); bladeShape.quadraticCurveTo(.33, -.02, .325, .01); bladeShape.lineTo(.3, .03); bladeShape.lineTo(.06, .018); bladeShape.lineTo(0, .012); bladeShape.closePath();
    const blade = cast(new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: .004, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, metalness: 1, roughness: .05 })));
    blade.position.z = -.002;
    const pivot = new THREE.Group(); pivot.position.set(.01, 0, 0); pivot.add(blade); razor.add(pivot); razor.userData.pivot = pivot;
    pivot.rotation.z = .03; // folded into the scales
  }
  razor.rotation.x = -Math.PI / 2; // lying flat on the tray

  /* ---------- poses ---------- */
  // per service: chair swivel, recline, footrest, razor unfold
  const POSES = {
    idle:   { yaw: .55, recline: -.14, foot: 0, razor: 0 },
    cut:    { yaw: .35, recline: -.14, foot: 0, razor: 0 },
    fade:   { yaw: -.55, recline: -.14, foot: 0, razor: 0 },
    beard:  { yaw: .15, recline: -.3, foot: .2, razor: 0 },
    shave:  { yaw: .5, recline: -.75, foot: .55, razor: 1 },
    lineup: { yaw: -.3, recline: -.14, foot: 0, razor: 0 },
    kids:   { yaw: .8, recline: -.14, foot: 0, razor: 0 },
  };
  const cur = { ...POSES.idle }, tgt = { ...POSES.idle };
  let spin = 0; // extra flourish turn on change

  /* ---------- camera ---------- */
  const target = new THREE.Vector3(.4, .95, 0);
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const needH = 2.75, needW = 3.5;
    const dist = Math.max(needH / 2 / Math.tan(vf / 2), needW / 2 / Math.tan(vf / 2) / camera.aspect);
    const el = .2;
    camera.position.set(target.x, target.y + Math.sin(el) * dist, Math.cos(el) * dist);
    camera.lookAt(target); camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);

  let px = 0, tx = 0, time = 0, intro = RM ? 1 : 0, razorRise = 0;
  if (FINE && !RM) addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; }, { passive: true });

  let visible = true, raf = 0, last = performance.now();
  function loop(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    intro = Math.min(1, intro + dt / 1.6);
    const k = RM ? 1 : 1 - Math.pow(.025, dt);
    for (const key of ['yaw', 'recline', 'foot', 'razor']) cur[key] += (tgt[key] - cur[key]) * k;
    spin *= RM ? 0 : Math.pow(.06, dt);
    px += (tx - px) * .05;
    // intro: the chair turns in from its back
    const introTurn = (1 - easeOut(intro)) * 2.6;
    top.rotation.y = cur.yaw + spin + introTurn + px * .1;
    backHinge.rotation.x = cur.recline;
    footHinge.rotation.x = -cur.foot;
    // razor: rise off the tray, turn upright toward camera, unfold the blade
    const r = easeInOut(cur.razor);
    razor.position.y = .9 + r * .38 + (r > .98 && !RM ? Math.sin(time * 1.4) * .01 : 0);
    razor.rotation.x = lerp(-Math.PI / 2, .05, r); razor.rotation.y = lerp(.5, .15, r); razor.scale.setScalar(lerp(1, 1.7, r));
    razor.userData.pivot.rotation.z = lerp(.03, Math.PI + .14, clamp((cur.razor - .25) / .75));
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();

  return {
    pose(id, quiet) { const p = POSES[id] || POSES.idle; if (!RM && !quiet) spin += (Math.sign(p.yaw - tgt.yaw) || 1) * Math.PI * 2; Object.assign(tgt, p); kick(); },
  };
}
