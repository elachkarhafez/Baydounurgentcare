# ElaSystems kit: Fudge Fix quality in about 10 minutes

Everything here is tested and in production (The Fudge Fix, CareMed, The Lab Atlanta). Don't rebuild these from scratch: copy, configure, check.

```
kit/
  research/ig.mjs        one command: name, counts, captions, phone/address, post images, contact sheet (~30 s)
  build3d/               a studio-lit 3D object that builds itself on scroll (the Fudge Fix engine)
    src/engine.js        stage: lights, HDRI, shadows, post, camera path, physics clocks, gating, height map, loop, QA hooks
    src/primitives.js    plate · slab · disc · sheet · dome · sauce · scatter · topper
    src/materials.js     porcelain gold chrome sauce cream crumbSide crumbTop bake meat cheese leaf candy matte
    src/shapes.js        small pieces: nuts, seeds, candy (bear, fish, worm, licorice, pretzel, bonbon), fruit, coffee, baklava…
    src/goods.js         composite goods: Dubai cup, chocolate bar, dipped strawberries, dates, cake/cheesecake slice, ice cream, jar, spices, nougat, baklava
    src/tiles.js         catalog product shots: transparent, studio-lit, auto-framed piles + goods
    tiles/render.mjs     render a tiles bundle → <id>.webp + sheet.jpg (or --pieces for 2D physics sprites)
    examples/            sundae.js (Fudge Fix), burger.js (proves a new product = a short list)
    template.html        the pinned stage page: captions, step rail, skip, finale, Lenis, phone layout
    gate.js              ElaGate: speed limit for the pinned build (a hard flick plays the build forward, never skips it)
    build.sh             bundles scene + three.js into one same-origin module (no CDN waterfall)
    assets/              studio-512.hdr, stone + crumb + cream textures (WebP)  · gen_textures.py makes more
  intros/intros.js       ElaIntro.drip / .curtain / .fill: compositor-only openers, once per tab, Skip button
  interact/drag.js       ElaDrag: mouse 2D / touch one-axis, idle demo, callout, meter, payoff tap-guard
  interact/paint.js      Paint(): glossy black paint + hex lights + swirl marks (detailing / PPF / tint / wrap)
  qa/states.mjs          render a page at scroll states → one contact sheet + errors
  qa/verify-live.sh      after deploy: wait for LIVE-MATCH, GPTBot 403, asset 200s
  lib/                   gsap, ScrollTrigger, lenis (self-host these in every site: assets/lib/)
```

## The 10-minute path

| min | step | command / action |
|---|---|---|
| 0–1 | Research (run in background while you think) | `node kit/research/ig.mjs <handle> $S/<slug>` then **look at sheet.jpg** and read brief.md |
| 1–2 | Pick the signature | Food/product that's *assembled* → build3d. Paint/surface → Paint(). Tool/craft gesture (grind, pour, scratch, stamp) → ElaDrag + SVG/canvas. Write the 5-line brief. |
| 2–6 | Build | Copy the closest existing site or `build3d/template.html`, swap CONFIG + copy, palette, fonts. For 3D: copy an example to `<site>/src/scene.js`, edit the layer list, `kit/build3d/build.sh <site>/src/scene.js <site>/assets/scene.js`, copy `build3d/assets/*` and `lib/*` → `<site>/assets/`. Opener: `ElaIntro.<kind>({...})`. |
| 6–8 | Check | Serve the repo (`python3 -m http.server 8765` in background), `node kit/qa/states.mjs http://127.0.0.1:8765/<site>/index.html $S/qa` (+ `--phone`), plus `shoot.mjs` for overflow. Script the signature payoff in Playwright. Look at every sheet. |
| 8–10 | Ship | commit + push → `create_deployment` → `kit/qa/verify-live.sh <slug> <site> assets/scene.js` → hand off |

## build3d: a new product is a layer list

```js
import { createStage } from '../../.claude/skills/ela-studio/kit/build3d/src/engine.js';
import { plate, slab, disc, sheet, dome, sauce, scatter, topper } from '../../.claude/skills/ela-studio/kit/build3d/src/primitives.js';
const st = await createStage({ canvas: gl, observe: stage, camera: [[p, az, el, dist, targetY], ...], onReady: () => window.__ffReady() });
plate(st, { trigger: .045 });                                   // lowered in, gold rim draws itself
slab(st, { name: 'brownie', trigger: .205 });                   // falls, crumbs + camera shake on impact
dome(st, { name: 'scoop', trigger: .36 });                      // squash + jiggle
sauce(st, { name: 'fudge', over: 'scoop', from: .48, to: .68 });// pour → cap → pool → edge drips → puddles
scatter(st, { name: 'sprinkles', from: .66, to: .8 });          // each piece falls on its own clock
topper(st, { name: 'cherry', trigger: .835 });                  // bounce + springy stem
st.start();
```
- Layers stack automatically: each one sits on the height map of everything before it. Order in the list = build order.
- `after: 'name'` waits for that layer to land (default: the previous layer; `null` = never wait).
- Sauce without `over` pools on whatever is underneath and finds real edges to drip over (burger sauce, syrup on pancakes, glaze on a cake).
- Captions: template `CONFIG.stepAt[i] - .06` ≈ that layer's trigger.
- Fallback swap ideas: pancakes = disc ×3 + sauce(syrup '#7a3a0c') + topper(berry); cake slice = slab(top:'crumbTop') + sauce(glaze) + scatter; tacos/sandwiches = disc + sheet + scatter.

## Catalog tiles: show the whole range (any shop)
A client judges a shop site by whether *their products* are on it. Don't settle for text lists:
1. Copy `nutsnow/src/tiles.js` → `<site>/src/tiles.js`, edit the ITEMS list (pile of a SHAPE, or a GOODS builder).
2. `build.sh <site>/src/tiles.js <site>/src/tiles-page/tiles.js`, add an index.html that loads it as a module (assets path is absolute from the repo root), serve the repo.
3. `node kit/build3d/tiles/render.mjs http://127.0.0.1:8765/<site>/src/tiles-page/index.html $S/tiles` → look at sheet.jpg, fix, re-render (`... $S/tiles id,id` for a subset). `--pieces` renders single-piece sprites.
4. Copy WebPs to `<site>/img/shop/` (~13 KB each), delete the tiles-page bundle. Nuts Now shows the catalog, tabs, the tub (2D physics with the sprite atlas) and the planner hand-off.

## QA hooks (every build3d page has them)
`?p=0.5` jump to a state · `?qa` skip intro · `?freeze` stop clocks · `?t_<layer>=0.4` set a layer's clock (mid-drop frames) · `?F_<layer>=0.2` set a flow · `?dpr=0.5` fast renders · `?low` phone quality.

## Rules that are now built in (don't undo them)
- Animations: anything that must not stutter is a transform/opacity animation (WAAPI/CSS) scheduled up front. Never an SVG filter or per-frame DOM rewrite for an intro.
- Never block the site on the 3D: reveal on a fixed clock, fade the canvas in on `gl-ready`.
- Asset loading handlers are attached before any `await`; boot waits for both assets and build.
- Clamp rAF dt to ≥ 0 (the first frame can be negative).
- Grids rewritten every frame: winding must face out (flip) or the mesh renders inside-out.
- Never raycast thousands of times at boot: use the height map (it rasterises triangles, not vertices).
- Precompile (`compileAsync` + one warm render) with every layer visible, or the first drop hitches.
- Render only while something moves; drop DPR, then bloom, if frames run > 21 ms.
- Fog near/far follow camera distance.
- Payoff buttons get a 900 ms tap guard.
- Pinned builds use ElaGate (copy `build3d/gate.js` → `assets/lib/`): `if (gate.check()) return;` first thing in onScroll, `gate.open()` on Skip and on nav links past the section, `gate.arm()` on "build it again". Without it a hard scroll exits mid-build (So Cheesy feedback).
- Phones: one-axis gestures (`touch-action: pan-y`), captions at the bottom, rail at the top.
- Self-host libs + display fonts, WebP textures, 512 HDR, cache headers on /assets.

## Limits (be honest with the client)
- A brand-new *kind* of object (a car, a building, liquid in a glass) is a new primitive: budget an hour the first time, then it's in the kit.
- Software-rendered headless checks can't tell you real-phone frame rate; adaptive quality covers most of it.
- True photorealism of a specific real product needs real photos/video or AI frames (Higgsfield credits). build3d gets close for food and objects made of simple shapes.
