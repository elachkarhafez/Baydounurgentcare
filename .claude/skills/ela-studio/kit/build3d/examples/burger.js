// Burger: plate → bottom bun → lettuce → patty → cheese → sauce → top bun → sesame
import { createStage } from '../src/engine.js';
import { plate, disc, sheet, sauce, scatter } from '../src/primitives.js';

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/',
  bg: '#0b0a09', rimColor: 0xffd2a0,
  camera: [[0, -14, 50, 7.4, 0], [.08, 0, 38, 5.2, .1], [.2, 10, 26, 4.3, .18], [.35, 18, 18, 3.8, .26], [.5, 6, 14, 3.4, .3], [.62, -12, 16, 3.2, .34], [.75, -18, 24, 3.5, .38], [.88, 0, 40, 3.6, .4], [1, 22, 16, 4.2, .36]],
  onReady: () => window.__ffReady && window.__ffReady()
});
plate(st, { trigger: .04, rim: false, color: '#e6e1d8' });
disc(st, { name: 'bun-bottom', trigger: .12, r: .44, h: .1, dome: .015, mat: 'bake', color: '#c98a4a' });
disc(st, { name: 'lettuce', trigger: .24, r: .5, h: .02, bevel: .008, ruffle: .025, mat: 'leaf', noise: .012, sink: -.002 });
disc(st, { name: 'patty', trigger: .36, r: .46, h: .12, bevel: .04, mat: 'meat', noise: .022, drop: { h: 2.8, squash: .09, shake: .05 } });
sheet(st, { name: 'cheese', trigger: .48, size: .66, droop: .09 });
sauce(st, { name: 'sauce', from: .56, to: .7, color: '#b3261e', radius: .4, startR: .1, drips: 7, stream: false });
disc(st, { name: 'bun-top', trigger: .74, after: 'sauce', r: .45, h: .1, dome: .2, mat: 'bake', color: '#c27c3c', drop: { h: 2.6, squash: .14, bounce: .03 } });
scatter(st, { name: 'sesame', shape: 'seed', count: 140, radius: .36, spill: 0, from: .84, to: .93, colors: ['#f4e6c4', '#efdcb0', '#f8eed4'], mat: 'matte', minY: .3 });
st.start();
