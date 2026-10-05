// Parma: the Rosso Riggo builds itself on scroll.
// plate → rigatoni rain onto a mound → house marinara pours and caps it → sun-dried tomato → parmesan snow → basil
import { createStage } from '../../.claude/skills/ela-studio/kit/build3d/src/engine.js';
import { plate, dome, sauce, scatter } from '../../.claude/skills/ela-studio/kit/build3d/src/primitives.js';
import { SHAPES, NUT_COLORS } from '../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/',
  bg: '#efe6d6', rimColor: 0xfff1d6, exposure: .92, desktopShift: -.15, floor: { color: '#eadfca', roughness: .75 },
  camera: [[0, -14, 50, 7.4, 0], [.07, -8, 42, 6, .08], [.16, 4, 34, 5, .12], [.27, 14, 28, 4.3, .2], [.38, 6, 30, 3.9, .24], [.5, -10, 26, 3.6, .26], [.62, -22, 32, 3.6, .26], [.74, -8, 44, 3.7, .26], [.86, 8, 50, 3.8, .26], [1, 22, 34, 4.4, .22]],
  onReady: () => window.__ffReady && window.__ffReady()
});
plate(st, { trigger: .045, rim: false, color: '#f1eee8' });
dome(st, { name: 'mound', trigger: .14, r: .27, ridges: false, mat: 'sauce', color: '#7a170e', drop: { h: 1.2, squash: .12 } });
scatter(st, { name: 'rigatoni', geometry: SHAPES.rigatoni(5.2), mat: 'nut', colors: [...NUT_COLORS.pasta, '#d4632f', '#c9532a', '#dc7a3c', '#c44a26'], count: 170, radius: .44, spill: .02, pile: (x, z) => .1 * Math.max(0, 1 - (x * x + z * z) / .17), from: .18, to: .34, seed: 9, after: 'mound' });
sauce(st, { name: 'marinara', over: 'mound', from: .38, to: .56, color: '#a8190e', drips: 10, radius: .52 });
scatter(st, { name: 'tomato', geometry: SHAPES.mango(1.5), mat: 'nut', colors: NUT_COLORS.sundried, count: 16, radius: .3, spill: 0, from: .58, to: .66, pile: () => .08, minY: .1, seed: 4, after: 'marinara' });
scatter(st, { name: 'parmesan', geometry: SHAPES.flake(2.4), mat: 'powder', colors: NUT_COLORS.parmesan, count: 170, radius: .36, spill: .04, from: .68, to: .8, pile: () => .085, minY: .1, seed: 12, after: null });
scatter(st, { name: 'basil', geometry: SHAPES.leaf(3.6), mat: 'leaf', colors: NUT_COLORS.basil, count: 5, radius: .14, spill: 0, from: .82, to: .9, pile: () => .1, minY: .12, seed: 3, after: null });
st.start();
