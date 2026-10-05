// So Cheesy: the All American smash burger builds itself on scroll.
// brioche → lettuce → smash #1 → American melt → smash #2 → melt again → caramelized onions & mushrooms → secret sauce → pickles → sesame brioche top
import { createStage } from '../../.claude/skills/ela-studio/kit/build3d/src/engine.js';
import { plate, disc, sheet, sauce, scatter } from '../../.claude/skills/ela-studio/kit/build3d/src/primitives.js';
import { SHAPES } from '../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/',
  bg: '#0c0b09', rimColor: 0xffc04a, exposure: .95, desktopShift: -.15,
  camera: [[0, -14, 52, 7.4, 0], [.07, 0, 40, 5.2, .1], [.18, 10, 28, 4.3, .14], [.3, 18, 20, 3.9, .2], [.42, 8, 16, 3.6, .26], [.54, -8, 16, 3.5, .32], [.66, -16, 22, 3.6, .38], [.78, -6, 30, 3.7, .42], [.9, 6, 36, 3.9, .44], [1, 24, 18, 4.3, .4]],
  onReady: () => window.__ffReady && window.__ffReady()
});
plate(st, { trigger: .04, rim: false, color: '#efe9de' });
disc(st, { name: 'bun', trigger: .1, r: .44, h: .1, dome: .015, mat: 'bake', color: '#d0913f' });
disc(st, { name: 'lettuce', trigger: .19, r: .5, h: .02, bevel: .008, ruffle: .028, mat: 'leaf', noise: .012, sink: -.002 });
disc(st, { name: 'smash1', trigger: .28, r: .47, h: .085, bevel: .03, mat: 'meat', color: '#4a2716', noise: .055, drop: { h: 2.8, squash: .14, shake: .06 } });
sheet(st, { name: 'cheese1', trigger: .37, size: .7, droop: .11, color: '#f5a417' });
disc(st, { name: 'smash2', trigger: .46, r: .46, h: .085, bevel: .03, mat: 'meat', color: '#4a2716', noise: .055, drop: { h: 2.8, squash: .14, shake: .06 } });
sheet(st, { name: 'cheese2', trigger: .55, size: .68, droop: .12, rot: 1.25, color: '#f7ad1e' });
scatter(st, { name: 'onions', geometry: SHAPES.worm(1.25), mat: 'nut', colors: ['#c7853a', '#b06d2a', '#d9a050', '#9a5a22'], count: 46, radius: .3, spill: 0, from: .6, to: .68, minY: .25, seed: 21 });
scatter(st, { name: 'mushrooms', geometry: SHAPES.button(2.6), mat: 'nut', colors: ['#8a6446', '#9c7452', '#735035'], count: 22, radius: .28, spill: 0, from: .62, to: .7, minY: .25, seed: 33, after: null });
sauce(st, { name: 'sauce', from: .7, to: .8, color: '#e8823a', radius: .34, startR: .1, drips: 8, stream: false });
disc(st, { name: 'bun-top', trigger: .84, after: 'sauce', r: .45, h: .1, dome: .21, mat: 'bake', color: '#c98235', drop: { h: 2.6, squash: .14, bounce: .03 } });
scatter(st, { name: 'sesame', shape: 'seed', count: 160, radius: .36, spill: 0, from: .9, to: .96, colors: ['#f4e6c4', '#efdcb0', '#f8eed4'], mat: 'matte', minY: .4 });
st.start();
