# ElaSystems sites repo

Each folder is a single-file client website built with the `ela-studio` skill (`.claude/skills/ela-studio/`) and deployed to Vercel (team `team_AYB0SFZ1qQkp6TebSji5xEKA`).

## Standing rule: when a business doesn't want their site

Newest instruction from the user: "from now on if someone says no just pause deployment". When the user says a business doesn't want its site (or "said no", "passed", "not interested"), do this straight away, without asking:
1. Find the business's Vercel project (`list_projects` with `search`) and pause it with `pause_project` (team `team_AYB0SFZ1qQkp6TebSji5xEKA`).
2. Confirm the old link is down (curl returns 503).
3. Mark the business as declined (paused) in `.claude/skills/ela-studio/references/signatures.md`.
4. Report which links are paused.

Do NOT build a generic concept, deploy anything new, or `git rm` the folder any more. The older process in `references/declined.md` (concept rebuild) is retired unless the user asks for it.

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


## Standing rule: Apple-style house standard (consistency, no gimmicks, no bland)

The user said: "its either stupid gimmicks or its bland and ai slop, cant you make something with clean apple style animations with blender 3d rendered animations scroll based designs that are professional like apple and top creator websites instead? ... I need consistency". This replaces the older "no gimmicks" rule and the format/three-direction pitching in "keep evolving" below.
- **Every site uses the same anatomy**, from `.claude/skills/ela-studio/kit/scrollfilm/README.md`:
  1. thin nav
  2. a pinned scroll film rendered in Blender (Cycles, through the performance engine) with an opening card and three captions
  3. a ScrollGrow real photo
  4. a ScrollWords statement
  5. a bento mixing film stills and real photos
  6. steps, a centered CTA, and the footer
- Inline the player and helpers from `kit/scrollfilm/scrollfilm.js`.
- Consistency comes from that anatomy and the motion. Variety comes from the film itself (subject, light, story), the brand colour and the photography.
- Toys stay banned: no mini-games, drag/hold meters, or click-to-play mechanics. The scroll film is the one animated idea, and it must look like a product film, not a demo.
- The quality bar is a still from the film looking like an ad frame. Preview key frames (`bpe run -m quality`), fix anything muddy, blotchy or fake-looking before the final render, and never ship a render you wouldn't screenshot.
- Smoothness is part of the standard: decoded frames, nearest-frame drawing, a DPR cap, no backdrop-filter or animated grain over the canvas. Measure about 16.7 ms per frame before shipping.
- Don't pitch three directions any more. Build to this standard, and ask only when a real content choice needs the user.
- Formatting standards, copy rules, bot blocking, QA and logging all still apply.

## Standing rule: mobile first (newest, overrides desktop-first sizing)

The user said: "These are supposed to be mainly for mobile, meaning the formatting, everything. Like, a picture doesn't have to be cut between a scroll. Everything needs to be accessible easily through the scrolls... Everything is way too big." Design at 390×844 first; desktop is the add-on.
- **Write the CSS mobile first.** Base styles are the phone; use `min-width` media queries for tablet and desktop.
- **Phone type:** H1 26–30px, H2 20–24px, card titles 16–18px, body 14–15px, buttons 14px. Nav 56px with a 32px logo.
- **No image taller than about 55% of the phone screen.** Each photo and its caption fit in one view, and nothing gets sliced by the fold. Use 4:3, 1:1 or 3:4 crops; never full-width 4:5 or 9:16 photos.
- **Rows of cards scroll sideways on phones** (scroll-snap, one card plus a peek of the next, with dots), instead of stacking into a long scroll. Lists become compact rows, not big cards.
- **Short sections:** phone section padding 28–40px. Aim for the hero headline, CTA and first visual all on the first phone screen.
- **A sticky bottom action bar on phones** that hides when the closing CTA is on screen. Button labels fit one line (`white-space:nowrap`).
- **QA at 390×844 and 360×740 first**, measuring type sizes, image heights against the viewport, page height and overflow. Then desktop.

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
