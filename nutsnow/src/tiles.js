// Catalog tiles for Nuts Now: one studio shot per item (pile, transparent bg) + one single piece for the bag.
// Build: kit/build3d/build.sh nutsnow/src/tiles.js $S/tiles/tiles.js ; render: kit/build3d/tiles/render.mjs
import { createTiles, THREE } from '../../.claude/skills/ela-studio/kit/build3d/src/tiles.js';
import { SHAPES as S, NUT_COLORS as N } from '../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';
import { GOODS, GM } from '../../.claude/skills/ela-studio/kit/build3d/src/goods.js';

const P = (geometry, colors, mat = 'nut', count = 46, radius = 0, extra = {}) => ({ geometry, colors, mat, count, ...(radius ? { radius } : {}), ...extra });
// id: [pile spec | goods fn, piece spec for the bag (or null)]
const ITEMS = {
  cashews: [P(S.cashew(1.5), N.cashew, 'nut', 52)],
  bbq: [P(S.cashew(1.5), N.bbq, 'nut', 52)],
  zaatar: [[P(S.cashew(1.5), N.zaatar, 'nut', 52), P(S.seed(.35), ['#5d6b2a', '#76843a', '#f0e6c8'], 'powder', 140, .075, { lift: 2.4, height: .5, filler: false, flat: 1.5 })]],
  pistachios: [P(S.pistachio(1.5), N.pistachio, 'nut', 52)],
  pecans: [P(S.pecan(1.5), N.pecan, 'nut', 40)],
  hazelnuts: [P(S.hazelnut(1.5), N.hazelnut, 'nut', 48)],
  walnuts: [P(S.walnut(1.4), N.walnut, 'nut', 34)],
  mix: [[P(S.cashew(1.3), N.cashew, 'nut', 16, .075), P(S.hazelnut(1.3), N.hazelnut, 'nut', 12, .075, { seed: 3, filler: false }), P(S.pretzel(.9), N.pretzel, GM.syrup('#ffffff'), 8, .075, { seed: 5, filler: false }), P(S.almond(1.3), N.almond, 'nut', 12, .075, { seed: 9, filler: false }), P(S.pistachio(1.3), N.pistachio, 'nut', 10, .075, { seed: 13, filler: false })]],
  pumpkin: [P(S.flatseed(1.3), N.pumpkin, 'nut', 80)],
  melon: [P(S.flatseed(1, 1.9), N.melon, 'nut', 110)],
  lemon: [P(S.flatseed(1.05, 2), ['#e9e2c4', '#f1ead2', '#dcd2a8'], 'nut', 100, 0, { spill: 1 })],
  strawberries: [P(S.strawberry(1, true), ['#b0303a', '#9a2430', '#c04048'], GM.berry(), 44, 0, { filler: false, height: .35 })],
  mango: [P(S.mango(1.1), N.mango, GM.syrup('#ffffff'), 22, 0, { filler: false, flat: .5 })],
  kiwi: [P(S.ring(1.1), ['#ffffff'], GM.syrup('#ffffff'), 18, 0, { filler: false, vertexColors: true, flat: .5 })],
  pineapple: [P(S.ring(1.3, ['#f6dc7a', '#f2c53d', '#f2c53d', '#efbd2e', '#d9a21f'], .22, .006), ['#ffffff'], GM.syrup('#ffffff'), 16, 0, { filler: false, vertexColors: true, flat: .5 })],
  baklava: ['baklava'],
  delight: [P(S.cube(1.4), N.delight, 'powder', 30)],
  dates: [{ fn: 'dates' }],
  stuffed: [{ fn: 'dates', o: { stuffed: true } }],
  dubaidates: [{ fn: 'dates', o: { coated: true } }],
  bulkchoc: [P(S.truffle(1.2), N.chocolate, 'choc', 40)],
  wrapped: [P(S.bonbon(1.4), N.wrapped, GM.foil(), 40, 0, { filler: false, flat: .3 })],
  discs: [P(S.button(1.2), ['#3b1f12', '#f3e7cd', '#4a2716'], 'choc', 60, 0, { flat: .5 })],
  dubaibar: ['dubaiBar'],
  dubaicup: ['dubaiCup'],
  browniecup: [{ fn: 'dubaiCup', o: { base: 'brownie' } }],
  dubaiberries: ['dippedStrawberries'],
  gummies: [P(S.bear(2.3), N.gummy, GM.candy(), 36, 0, { flat: .25, filler: false, height: .3 })],
  sours: [P(S.worm(1.2), N.sour, 'powder', 34, 0, { filler: false, flat: .6 })],
  blue: [P(S.worm(1.2), N.blue, 'powder', 34, 0, { filler: false, flat: .6, seed: 4 })],
  licorice: [P(S.licorice(1.1), N.licorice, 'candy', 24, 0, { filler: false, flat: .4 })],
  swedish: [P(S.foam(1.4), N.foam, 'powder', 40)],
  fish: [P(S.fish(1.3), N.fish, 'candy', 40, 0, { filler: false })],
  pretzels: [P(S.pretzel(1.2), N.pretzel, GM.syrup('#ffffff'), 28, 0, { filler: false, flat: .6 })],
  nougat: ['nougat'],
  cheesecake: [{ fn: 'slice', o: { kind: 'cheesecake' } }],
  cake: [{ fn: 'slice', o: { kind: 'cake' } }],
  icecream: ['iceCream'],
  peanutbutter: [{ fn: 'jar', o: { fill: '#b0773a' } }],
  nutbutters: [{ fn: 'jar', o: { fill: '#8a5a2c', label: '#d8b46c' } }],
  spices: ['spices'],
  coffee: [P(S.bean(1.4), N.coffee, 'choc', 70)]
};
window.renderAll = async (only) => {
  const T = await createTiles({ size: +(new URLSearchParams(location.search).get('size') || 560), assets: '/.claude/skills/ela-studio/kit/build3d/assets/' });
  const out = {};
  for (const [id, [spec]] of Object.entries(ITEMS)) {
    if (only && !only.includes(id)) continue;
    const g = new THREE.Group();
    if (typeof spec === 'string') g.add(GOODS[spec](T));
    else if (spec.fn) g.add(GOODS[spec.fn](T, spec.o));
    else (Array.isArray(spec) ? spec : [spec]).forEach((p, i) => T.pile(g, { seed: 7 + i, ...p }));
    out[id] = await T.shot(g, { el: typeof spec === 'string' || spec.fn ? 26 : 38 });
  }
  return out;
};
window.ITEM_IDS = Object.keys(ITEMS);
// single pieces for the bag (2D physics sprites): up to 3 colour variants per item, seen from above-ish
window.renderPieces = async () => {
  const T = await createTiles({ size: 192, shadow: 0, assets: '/.claude/skills/ela-studio/kit/build3d/assets/' });
  const out = {};
  for (const [id, [spec]] of Object.entries(ITEMS)) {
    const base = typeof spec === 'string' || spec.fn ? null : (Array.isArray(spec) ? spec[0] : spec);
    if (!base) { const g = new THREE.Group(); g.add(typeof spec === 'string' ? GOODS[spec](T) : GOODS[spec.fn](T, spec.o)); out[id + '_0'] = await T.shot(g, { el: 30 }); continue; }
    const cols = (base.colors || ['#ffffff']).slice(0, 3);
    for (let k = 0; k < cols.length; k++) { const g = new THREE.Group(); T.pile(g, { ...base, colors: [cols[k]], count: 1, filler: false, flat: 0, seed: 3 + k, radius: 1e-4, scale: 1 }); g.rotation.set(.5, k * 2, .2); out[id + '_' + k] = await T.shot(g, { el: 55, zoom: 1.1 }); }
  }
  return out;
};
