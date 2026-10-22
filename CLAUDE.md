# ElaSystems sites repo

Each folder is a single-file client website built with the `ela-studio` skill (`.claude/skills/ela-studio/`) and deployed to Vercel (team `team_AYB0SFZ1qQkp6TebSji5xEKA`).

## Standing rule: when a business doesn't want their site

Whenever the user says a business doesn't want its site (or "said no", "passed", "not interested"), follow `.claude/skills/ela-studio/references/declined.md` straight away. The user has pre-approved every step, so don't ask first:

1. Rebuild the site as a generic ElaSystems concept in `demos/<niche>/`:
   - a new fictional brand
   - none of their photos, names or contact details
   - every CTA pointing to @ela.systems
2. Deploy it under a new neutral Vercel name.
3. Take the old business-name link offline by pausing its Vercel project. Offer the delete link too.
4. `git rm` the original folder.
5. Mark the business as declined in `signatures.md`.
6. Report the new link.

## Standing rule: 3D method for designs

From now on, build every product/hero design (cups, drinks, food, objects) as a real 3D model using the Coffee Talks cup method, not flat SVG or canvas drawings:
- three.js bundled per site with `.claude/skills/ela-studio/kit/build3d/build.sh <site>/src/<name>.js <site>/assets/<name>.js` (esbuild + three, served from the site).
- Studio HDRI (`kit/build3d/assets/studio-512.hdr`), `MeshPhysicalMaterial` (clearcoat, sheen, transparency), lathe-turned geometry, a `ShadowMaterial` shadow catcher on a transparent canvas so the page shows through, soft key/rim/fill lights, pointer drift on fine pointers, render only while visible.
- Animate with a small step sequencer (pour, drop, settle), and keep a drawn fallback if WebGL or the module fails.
- References: `coffeetalks/src/cup.js` (cappuccino with latte art) and `demos/coffee-trailer/src/cup.js` (iced cup with layered drink, ice, foam, lid, straw; hot paper cup).

## Standing rule: Blender goes through the performance engine

Any Blender work (the `*/render/*.py` Cycles scripts, a `.blend`, a GLB/FBX export) uses the `blender-performance-engine` skill (`.claude/skills/blender-performance-engine/SKILL.md`). Never call `blender -b -P` directly.
- `bpe probe` first in a new container. If Blender is missing, `bpe fetch-blender` (portable 4.5 LTS into the cache).
- Use the cheapest mode that answers the question: `inspect` for geometry/data, `-m fast` for a look, `-m quality` before shipping, `-m final` only for the files the site uses.
- No absolute asset paths in scripts. Use `asset('<name>')` with the source pinned in `blender-perf.json`.

## Standing rule: keep evolving, don't repeat

The user said the sites were getting "repetitive and boring, they aren't evolving". For every new site:
- **Pick a format first.** Choose from `.claude/skills/ela-studio/references/formats.md`, such as one continuous 3D world, a video-led trailer, the page as the object, game-first, live and reactive, choose your path, editorial, map-first or single screen.
- **Check the bans.** Read `references/novelty.md`. Don't repeat the format, primary interaction, intro, story or tool of the last 5 builds, or the visual language of the last 3.
- **Retired patterns.** The house-style tells listed in `formats.md` §2 are retired, including the hold/drag meter toys, headline-left with a 3D object on the right, hand-icon callouts, four-step pinned stories and letterbox intros.
- **Pitch three different directions** to the user (format · verb · visual language), recommend one, and build what they pick. Skip this for declined→concept conversions, edits, or when the user says "just build it".
- **Log the build** in `novelty.md` after shipping.


## Standing rule: professional, clean, animated design (no gimmicks)

The user said (overrides the "signature interaction" / toy approach): "Enough with the gimmicks from now on I just want stuff that are professional, but clean, animated with creative designs, not creative gimmicks."
- Put the creativity in the design: layout, typography, photography, composition, colour, and smooth, tasteful motion (reveals, parallax, transitions, hover states, page-load choreography).
- No interactive toys or gimmick mechanics: no load-the-bar, roll-the-logo, press-the-shutter, sift, drag-to-X, mini-games or scroll-scrubbed films as the main idea.
- Don't pitch three gimmick directions any more. Build a polished, professional site that is easy to navigate. Pitch only if a real design choice needs the user's call, and pitch design directions, not mechanics.
- Real 3D/renders are still fine as visual design (hero imagery, product stills), but never as a toy.
- Formatting standards, copy rules, bot blocking, QA and logging all still apply.

## Standing rule: formatting standards (mandatory acceptance criteria)

Every site, new or edited, follows `.claude/skills/ela-studio/references/formatting.md`. The user called out oversized type, huge heroes and too much scrolling. In short:
- **Type**: hero headline 40–56px desktop / 30–38px mobile; section headings 28–40 / 24–30; body 15–17 / 14–16; buttons 14–16. Use `clamp()` + rem.
- **Hero**: at 1366×768 the hero headline, supporting text and main call to action are visible without scrolling. No `100vh` / `min-h-screen` sections.
- **Spacing**: section padding 48–80px desktop, 32–56px mobile; container 1100–1200px; no horizontal overflow.
- **Existing projects**: keep the functionality, branding, colours, assets and animations. Change only layout, scale and spacing.
- **Before calling a site done**, take Playwright screenshots at 1366×768, 1440×900, 1920×1080, 390×844 and 768×1024, plus a zoom/large-text check. Never claim a visual test you didn't run.

## Standing rule: human copy, no AI tells

Write copy like the owner talks (see `references/design.md` Copy rules). Avoid these AI tells:
- em-dash asides
- "not just X, it's Y"
- rule-of-three slogans
- fragment taglines ("Pistachio. Kunafa. Gone fast.")
- kicker-label-over-every-heading
- "elevate / curated / crafted / experience / journey"
- generic font stacks (Inter, Geist, Instrument Serif accents, mono eyebrow labels)
