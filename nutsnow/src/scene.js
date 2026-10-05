// Nuts Now: a gold party tray fills itself, compartment by compartment, as you scroll.
import { createStage } from '../../.claude/skills/ela-studio/kit/build3d/src/engine.js';
import { tray, scatter } from '../../.claude/skills/ela-studio/kit/build3d/src/primitives.js';
import { SHAPES, NUT_COLORS } from '../../.claude/skills/ela-studio/kit/build3d/src/shapes.js';

const FILLS = [
  ['cashews', 0, SHAPES.cashew(1.7), 'nut', NUT_COLORS.cashew, 330],
  ['pistachios', 1, SHAPES.pistachio(1.6), 'nut', NUT_COLORS.pistachio, 330],
  ['hazelnuts', 2, SHAPES.hazelnut(1.6), 'nut', NUT_COLORS.hazelnut, 340],
  ['pecans', 3, SHAPES.pecan(1.6), 'nut', NUT_COLORS.pecan, 280],
  ['chocolates', 4, SHAPES.chocolate(1.5), 'choc', NUT_COLORS.wrapped, 200],
  ['dates', 5, SHAPES.date(1.6), 'nut', NUT_COLORS.date, 220],
  ['delight', -1, SHAPES.cube(1.45), 'powder', NUT_COLORS.delight, 150]
];
const N = FILLS.length, START = .1, SPAN = .82 / N;
const secAngle = i => i < 0 ? 0 : ((i + .5) / 6 * 360);
const cam = [[0, -10, 62, 7.6, 0], [.06, 0, 56, 5.4, 0]];
FILLS.forEach((f, k) => { const p = START + k * SPAN + SPAN * .5, a = f[1] < 0 ? 20 + k * 6 : 90 - secAngle(f[1]); cam.push([p, a, f[1] < 0 ? 64 : 48, f[1] < 0 ? 4.9 : 4.7, 0]); });
cam.push([1, 30, 54, 5, 0]);
// keep the orbit going one way round
for (let i = 1; i < cam.length; i++) while (cam[i][1] < cam[i - 1][1] - 10) cam[i][1] += 360;

const st = await createStage({
  canvas: document.getElementById('gl'), observe: document.getElementById('stage'), assets: 'assets/', bg: '#0b0c08',
  camera: cam, desktopShift: -.12, exposure: .95, lights: { key: 165, rim: 70 },
  onReady: () => window.__ffReady && window.__ffReady()
});
const t = tray(st, { trigger: .04, sections: 6 });
FILLS.forEach(([name, sec, geometry, mat, colors, count], k) => {
  const from = START + k * SPAN, s = sec < 0 ? { x: 0, z: 0, r: .27 } : t.sec(sec);
  scatter(st, { name, geometry, mat, colors, count, at: [s.x, s.z], radius: s.r * 1.25, spill: 0, from, to: from + SPAN * .8,
    where: (x, z) => t.inSec(sec, x, z), pile: t.pileIn(sec, sec < 0 ? .08 : .1), seed: 100 + k * 7, after: k ? FILLS[k - 1][0] : 'tray' });
});
st.start();
