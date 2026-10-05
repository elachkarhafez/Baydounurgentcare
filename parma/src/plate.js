// One studio still of a Rosso Riggo plate (transparent background) for the "Say when" hero.
// Render: kit/build3d/build.sh parma/src/plate.js parma/src/tiles-page/tiles.js ; node kit/build3d/tiles/render.mjs <page> <out>
import { createTiles, THREE } from '../../.claude/skills/ela-studio/kit/build3d/src/tiles.js';
import { SHAPES, NUT_COLORS } from '../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';
import { GM } from '../../.claude/skills/ela-studio/kit/build3d/src/goods.js';
window.renderAll = async () => {
  const T = await createTiles({ size: 1100, assets: '/.claude/skills/ela-studio/kit/build3d/assets/', shadow: .3, exposure: 1.08, normalBias: .02, shadowBias: -.002 });
  const g = new THREE.Group();
    T.mesh(g, new THREE.LatheGeometry([new THREE.Vector2(0, .004), new THREE.Vector2(.14, .004), new THREE.Vector2(.19, .012), new THREE.Vector2(.215, .026), new THREE.Vector2(.222, .028), new THREE.Vector2(.218, .022), new THREE.Vector2(.185, .006), new THREE.Vector2(.15, 0), new THREE.Vector2(0, 0)], 128), T.mat('porcelain', '#f6f3ee'));
  const pool = new THREE.SphereGeometry(.135, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2); const pp = pool.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + .07 * Math.sin(a * 5) + .04 * Math.sin(a * 11 + 1); pp.setXYZ(i, x * k, pp.getY(i) * .1, z * k); } pool.computeVertexNormals();
  T.mesh(g, pool, GM.syrup('#b01f10'), [0, .005, 0]);
  T.pile(g, { geometry: SHAPES.rigatoni(1.5), mat: 'nut', colors: ['#d4632f', '#c9532a', '#dc7a3c', '#c44a26', '#e08a45', '#f2c96e'], count: 46, radius: .1, height: .75, seed: 5, at: [0, .012, 0], filler: true, flat: .5 });
  T.pile(g, { geometry: SHAPES.mango(.5), mat: 'nut', colors: NUT_COLORS.sundried, count: 7, radius: .07, seed: 8, at: [0, .06, 0], filler: false, lift: 1 });
  T.pile(g, { geometry: SHAPES.leaf(1.2), mat: 'leaf', colors: NUT_COLORS.basil, count: 3, radius: .02, seed: 2, at: [0, .085, 0], filler: false, flat: .3, lift: 1 });
  return { plate: await T.shot(g, { el: 30, az: 20 }) };
};
