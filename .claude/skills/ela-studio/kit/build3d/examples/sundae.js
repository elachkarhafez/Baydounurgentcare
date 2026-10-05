// Sundae: plate → brownie → ice cream → hot fudge → sprinkles → cherry (The Fudge Fix, rebuilt from the kit)
import { createStage } from '../src/engine.js';
import { plate, slab, dome, sauce, scatter, topper } from '../src/primitives.js';

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/',
  bg: '#0d0705',
  // [progress, azimuth°, elevation°, distance, target y]
  camera: [[0, -14, 50, 7.4, 0], [.06, -10, 44, 6.2, .1], [.13, 4, 36, 5.3, .1], [.22, 12, 27, 4.4, .22], [.29, 16, 20, 3.9, .26], [.38, 0, 26, 3.8, .36], [.45, -10, 22, 3.4, .44], [.53, -22, 18, 2.75, .5], [.62, -32, 13, 2.9, .36], [.7, -18, 30, 3.2, .42], [.78, -6, 52, 3.1, .45], [.86, 6, 24, 3.25, .55], [.93, 16, 19, 3.6, .5], [1, 24, 17, 4.15, .45]],
  onReady: () => window.__ffReady && window.__ffReady()
});
plate(st, { trigger: .045 });
slab(st, { name: 'brownie', trigger: .205 });
dome(st, { name: 'scoop', trigger: .36, mat: 'cream' });
sauce(st, { name: 'fudge', over: 'scoop', from: .48, to: .68, color: '#1e0c05' });
const cherry = topper(st, { name: 'cherry', trigger: .835, after: 'sprinkles' });
scatter(st, { name: 'sprinkles', from: .66, to: .8, after: 'fudge', avoid: cherry.avoid });
// scatter must plan before the cherry lands on top: move it ahead of the topper in the list
st.layers.splice(st.layers.indexOf(st.byName.sprinkles), 1); st.layers.splice(st.layers.indexOf(cherry), 0, st.byName.sprinkles);
st.start();
