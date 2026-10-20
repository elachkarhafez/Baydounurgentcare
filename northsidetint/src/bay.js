/* =====================================================================
   Northside Tint & Wraps: the bay.
   Their shop's honeycomb LED ceiling as a real 3D scene: hundreds of hex
   cells made of thin light tubes, seen from the floor of the bay, with a
   polished floor reflecting them. On load the cells switch on in a wave
   from the centre. Pick a service and a wave of its colour rolls across the
   ceiling (cool blue for tint, a colour shift for wraps, gold for ceramic),
   then settles back to white. Kit method: instanced geometry, physical
   floor, transparent canvas, step sequencer for the waves, pointer drift,
   render only while visible.
   Bundle: .claude/skills/ela-studio/kit/build3d/build.sh northsidetint/src/bay.js northsidetint/assets/bay.js
   ===================================================================== */
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function glowTex() {
  const W = 64, H = 16, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const fade = g.createLinearGradient(0, 0, W, 0); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(.12, 'rgba(0,0,0,0)'); fade.addColorStop(.88, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function floorTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S * .62, 10, S / 2, S * .55, S * .62); gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#bbb'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return new THREE.CanvasTexture(c);
}

export async function mountBay(canvas, o = {}) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x0a0a0b, 9, 34);
  const camera = new THREE.PerspectiveCamera(58, 1, .1, 80);

  /* ---------- the honeycomb ---------- */
  const SIDE = .82, CEIL = 3.3, ROWS = 34, COLS = 26;
  const cells = []; // {x,z,d}
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    const qq = q - Math.floor(COLS / 2) - Math.floor(r / 2), rr = r - 6;
    const x = Math.sqrt(3) * SIDE * (qq + rr / 2), z = 1.5 * SIDE * rr * -1 + 6;
    if (Math.abs(x) > 13) continue;
    cells.push({ x, z, d: Math.hypot(x, (z + 2) * .8) });
  }
  const edges = [];
  cells.forEach((c, ci) => {
    for (let k = 0; k < 6; k++) {
      const a0 = Math.PI / 6 + k * Math.PI / 3, a1 = a0 + Math.PI / 3;
      const gap = .9; // tubes stop short of the corners, like real hex kits
      const x0 = c.x + Math.cos(a0) * SIDE, z0 = c.z + Math.sin(a0) * SIDE, x1 = c.x + Math.cos(a1) * SIDE, z1 = c.z + Math.sin(a1) * SIDE;
      edges.push({ ci, x: (x0 + x1) / 2, z: (z0 + z1) / 2, rot: -Math.atan2(z1 - z0, x1 - x0), len: SIDE * gap });
    }
  });
  const N = edges.length;
  const tubeGeo = new THREE.BoxGeometry(1, .02, .036);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true });
  const tubes = new THREE.InstancedMesh(tubeGeo, tubeMat, N);
  const glowGeo = new THREE.PlaneGeometry(1.04, .42); glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex(), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff, fog: true });
  const glows = new THREE.InstancedMesh(glowGeo, glowMat, N);
  // mirrored copies for the floor reflection
  const tubesR = new THREE.InstancedMesh(tubeGeo, tubeMat.clone(), N), glowsR = new THREE.InstancedMesh(glowGeo, glowMat.clone(), N);
  const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  edges.forEach((e, i) => {
    qn.setFromAxisAngle(up, e.rot);
    sc.set(e.len, 1, 1); pos.set(e.x, CEIL, e.z); m.compose(pos, qn, sc); tubes.setMatrixAt(i, m); glows.setMatrixAt(i, m);
    pos.set(e.x, -CEIL, e.z); m.compose(pos, qn, sc); tubesR.setMatrixAt(i, m); glowsR.setMatrixAt(i, m);
  });
  const black = new THREE.Color(0, 0, 0);
  for (let i = 0; i < N; i++) { tubes.setColorAt(i, black); glows.setColorAt(i, black); tubesR.setColorAt(i, black); glowsR.setColorAt(i, black); }
  scene.add(tubes, glows, tubesR, glowsR);
  // ceiling panel between the tubes, and the floor that reflects
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshBasicMaterial({ color: 0x1b1c1f, fog: true }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL + .03, -10); scene.add(ceil);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshBasicMaterial({ color: 0x0a0a0b, transparent: true, opacity: .78, alphaMap: floorTex(), fog: true }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -10); scene.add(floor);
  // floor tiles: faint grout lines on the polished floor
  const grid = new THREE.GridHelper(40, 22, 0x2a2b30, 0x2a2b30); grid.position.set(0, .002, -10); grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
  // side walls: the wheel wall glimpse (dark slabs with rim rings)
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x121316, fog: true });
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, CEIL), wallMat); wall.rotation.y = -sx * Math.PI / 2; wall.position.set(sx * 9.5, CEIL / 2, -10); scene.add(wall);
  }

  /* ---------- lighting state ---------- */
  const bright = new Float32Array(cells.length);       // 0..1 per cell
  const tint = cells.map(() => new THREE.Color(1, 1, 1)); // per cell colour
  let t0 = performance.now() / 1000, wave = null; // { color, start, shift }
  const WHITE = new THREE.Color(0xF2F6FF);

  function pulse(hexOrShift) {
    wave = { start: performance.now() / 1000, shift: hexOrShift === 'shift', color: new THREE.Color(hexOrShift === 'shift' ? 0x7a3cff : hexOrShift) };
    kick();
  }

  /* ---------- camera ---------- */
  let px = 0, py = 0, tx = 0, ty = 0;
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; camera.aspect = w / h;
    camera.fov = w < 700 ? 68 : 58; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
  }
  frame(); new ResizeObserver(frame).observe(canvas);
  if (FINE && !RM) addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  const col = new THREE.Color(), tmp = new THREE.Color();
  let visible = true, raf = 0, last = performance.now();
  function loop(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = now / 1000 - t0;
    px += (tx - px) * .04; py += (ty - py) * .04;
    camera.position.set(px * .6, 1.25 - py * .15, 6.2);
    camera.lookAt(px * .3, 2.35, -8);
    const wt = wave ? now / 1000 - wave.start : -1;
    if (wave && wt > 5) wave = null;
    cells.forEach((c, i) => {
      // intro: switch on in a wave from the centre, with a little flicker on arrival
      const on = RM ? 1 : smooth(c.d * .14, c.d * .14 + .25, t);
      const flick = RM || on >= 1 ? 1 : (Math.sin(t * 60 + i) > -.2 ? 1 : .35);
      bright[i] = on * flick;
      // service wave
      if (wave) {
        const front = wt * 9, k = Math.exp(-Math.pow((c.d - front) / 2.2, 2)), fadeOut = 1 - smooth(3.4, 5, wt);
        if (wave.shift) tmp.setHSL((.72 + c.x * .02 + c.d * .015) % 1, .85, .62); else tmp.copy(wave.color);
        const mix = clamp(k * 1.4 + smooth(.4, 1.6, wt) * .8) * fadeOut;
        tint[i].copy(WHITE).lerp(tmp, mix);
        bright[i] *= 1 + k * .4; tint[i].userData = mix;
      } else { tint[i].lerp(WHITE, .08); tint[i].userData = (tint[i].userData || 0) * .92; }
    });
    for (let e = 0; e < N; e++) {
      const ci = edges[e].ci, b = bright[ci];
      const hot = 1.7 - (tint[ci].userData || 0) * .9; // coloured light can't be overdriven or it clips back to white
      col.copy(tint[ci]).multiplyScalar(b * hot); tubes.setColorAt(e, col);
      col.copy(tint[ci]).multiplyScalar(b * .28); glows.setColorAt(e, col);
      col.copy(tint[ci]).multiplyScalar(b * .5); tubesR.setColorAt(e, col);
      col.copy(tint[ci]).multiplyScalar(b * .12); glowsR.setColorAt(e, col);
    }
    tubes.instanceColor.needsUpdate = glows.instanceColor.needsUpdate = tubesR.instanceColor.needsUpdate = glowsR.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  kick();
  return { pulse };
}
