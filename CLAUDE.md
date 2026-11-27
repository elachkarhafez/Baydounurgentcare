# ElaSystems sites repo

Each folder is a single-file client website built with the `ela-studio` skill (`.claude/skills/ela-studio/`) and deployed to Vercel (team `team_AYB0SFZ1qQkp6TebSji5xEKA`).

## Standing rule: no language toggle unless the user asks (newest)

The user said: "dont js add that to all websites unless i ask for it" (about the English/Arabic toggle). Build every site English only. Add an Arabic (or any other) language toggle only when the user asks for it on that site. Sites that already have one keep it unless the user says to remove it (Custard Mill's was switched off on request).

## Standing rule: only the brand's own fonts and colours (newest, overrides any font choices elsewhere)

The user said: "The fonts look like AI. The colors are weird... Use their actual font for the fonts, and from now on, only do that. I want you to only use their fonts on the website, not some AI generic fonts. Use only theirs."
- Before building, identify the business's real typefaces from their logo, signage, menus, posts, packaging and website CSS (check their site's @font-face / Google Fonts / Typekit links first). Match lettering from images by rendering candidate fonts over the crop and comparing; name the font in the report with the evidence.
- Use only those fonts on the site. If the exact font is free (Google Fonts, Fontsource, open licence), load it. If it's commercial and not available, say so to the user, and use the closest free cut of the same design (same family or a published clone), never a generic pick. Never default to Inter, Geist, Playfair, Bodoni, DM Sans, Fraunces or any "safe AI" pair.
- Lettering that is part of the logo is traced, not set in a substitute font.
- Colours come from the brand too: sample them from their logo, packaging, store and photos. No invented palettes.
- State in the report which fonts and colours were used and where each came from.

## Standing rule: every site gets a custom link preview (newest)

The user said: "From now on each website should have a custom preview link". When the link is texted or shared (iMessage, WhatsApp, Instagram DMs, Slack), it must unfurl into a designed card, not a blank or generic one.
- Design a 1200x630 card per site in `<site>/render/og.html` (render/ is excluded from deploys): the business's real logo (vectorised or rendered), one or two of their best photos, the name, a one-line hook and the location or key fact (opening date, city). Brand colours lead, text stays clear of photos, nothing smaller than about 20px.
- Run `node .claude/skills/ela-studio/kit/og/card.mjs <site> https://<project>.vercel.app` after the project name is known. It renders `media/og.jpg`, makes a 180px `apple-touch-icon.png`, and rewrites the head with ABSOLUTE og/twitter tags (og:url, og:image with a cache-busting ?v=, width/height/alt, twitter:card summary_large_image, canonical). Relative og:image paths do not unfurl in most apps.
- Look at the rendered card before shipping, and after deploying curl the og:image URL for a 200.
- If the user means a custom domain instead, a domain costs money: ask before buying one.

## Standing rule: when a business doesn't want their site

Newest instruction from the user: "When i say pause or said no i mean delete the entire damn project to free up space". The team sits at the 200-project Hobby limit, so a declined business's Vercel project gets deleted, not just paused. **Newer clarification (overrides the "pause" part above):** "No when i tell you they didnt want it you delete, when i say pause it just means pause". So "pause X" = only `pause_project` on Vercel (no deletion link, no DECLINED marker). Delete only when the user says the business didn't want it / said no / passed / not interested.

When the user says a business doesn't want its site (or "said no", "passed", "not interested"), do this straight away, without asking again:
1. Find the business's Vercel project (`list_projects` with `search`, team `team_AYB0SFZ1qQkp6TebSji5xEKA`).
2. Delete it. The Vercel MCP can't delete; `get_project_deletion_link` gives the dashboard link, and the CLI needs the user's permission rule for `vercel api /v9/projects/<name> -X DELETE`. If neither works from here, hand the user the deletion link and pause the project in the meantime.
3. Confirm the old link is gone (curl returns 404 DEPLOYMENT_NOT_FOUND).
4. Mark the business as declined (deleted) in `.claude/skills/ela-studio/references/signatures.md`.
5. Report which projects were deleted.

Do NOT build a generic concept, deploy anything new, or `git rm` the folder any more. The older process in `references/declined.md` (concept rebuild) is retired unless the user asks for it.

## Standing rule: every site opens with an insanely well animated logo opening (newest)

The user said: "Make sure for every website you do an insanely well animated logo opening".
- Build it from the business's real logo, vectorised (potrace the logo into SVG paths) so it can be drawn, not a generic shape or a static image fade.
- Choreograph several beats: the mark draws itself in strokes, then fills; the wordmark letters rise one by one; a shine or light sweep crosses it; brand-specific motion around it (steam, bubbles, sparks, petals, whatever fits the business); then a transition that hands off into the page (the logo flies to the nav brand position, or the curtain splits or pours away).
- Keep it to about 2 to 2.5 seconds, play it once per visit (sessionStorage), let a tap or any key skip it, and skip it completely with prefers-reduced-motion. Lock scroll while it plays and release it at the end.
- QA it with timed screenshots (about 4 frames) on phone and desktop before shipping.

## Standing rule: Sketchfab models are CC0 only

The user said: "use only free ones tht dont need credits shown". Only free CC0 (public domain) Sketchfab models, never CC-BY, NonCommercial or paid. `kit/library/find.py` hides the rest and `fetch.py` re-checks the live license and refuses anything else. Downloads need `SKETCHFAB_TOKEN` (the user hasn't added it yet).

## Standing rule: no template sites (newest, overrides "start from luma/index.html" and the house anatomy)

The user said: "The designs ur making are coming out as generic ai concepts i dont like them theres no uniqueness and creativity". Billionaire Dough, Son of a Burger, Rollies, Olive Tree, MGP Built and Velvet Oven were all the same template (chips, headline left + photo card right, marquee, swipe rail, bento, closer, dock) with new colours. That is what read as generic.
- Every site gets its own concept taken from the business itself (their product, their room, their ritual, their numbers), and the layout follows the concept. No shared skeleton, no recycled section order.
- Before building, write the concept in one line ("the page is X because they do Y") and check it couldn't be swapped onto another client.
- Still professional, mobile first, fast and honest with facts. Formatting, copy, bot blocking and QA rules still apply.

## Standing rule: the 3D cup only when the user says "use Blender" (newest, overrides the cup rule below)

The user said: "The standing rule isn't to always use that cup ... only if I say use Blender, then you use that cup ... Not everything has to use that cup, and I low-key don't like the design of the cup. I think it looks pretty cheap." For coffee and matcha sites, don't render or reuse the luma cup unless the user explicitly says to use Blender. Instead match the business's own branding and the way they do their pictures and ads, with strong animation built from that (their type, colours, doodles, photo style).

## Older rule (only when the user says to use Blender): coffee and matcha sites reuse the 3D cup renders

The user said: "Whenever its anything to do w matcha or coffee use the wiss approach but reuse whatever we made already while just changing the logo so we dont have to re render stuff everytime, i want this done in 15 mins tops", then clarified: "I meant for the 3d renders ... keep their branding colors the focus of the website".
- **Reuse the 3D cup scene, swap only the logo.** `luma/render/cup.py` (the Buzz'n Brew iced cup: PET, condensation, cream top, ice) takes the sticker from `tex/label.png` (1600x740, transparent outside the sticker; make it with `scratchpad/lumalabel.mjs` or any 1600x740 PNG). `LUMA_MATCHA=1` turns the latte into iced matcha. Copy the script into the new site's `render/`, drop in their label, and render 2 stills through bpe: `bpe run <site>/render/cup.py -m final -- <out> 112 150 96 1` (latte, ~110 s) and `LUMA_MATCHA=1 ... 98 150 96 1` (matcha). Crop 864x864+0+130. No new modelling.
- **Their brand colours lead the page.** Start from `luma/index.html` (Wiss layout) and change the `:root` tokens to the business's own palette (logo, cups, signage). Don't carry over another client's colours.
- Never carry another client's photos or facts over. Real photos (steps, events, cart) come from the business's own posts.
- Target about 15 minutes: research, label, 2 renders in the background while the copy and colours are swapped, QA at 390 and 1366, deploy.

## Standing rule: not everything goes through Blender (newest, overrides the scroll-film anatomy below)

The user said: "Not everything has to go through blender and severe Animating". The Blender scroll film is optional, not the default.
- Lead with the business's own photography: a real-photo hero (headline, CTA and photo on the first phone screen), then the rest of the house sections (statement, menu/rail, steps, locations, closer, footer).
- Motion stays light: fade/rise reveals and small hover states. No full-screen intro overlays, no pinned scroll films, no word-by-word or scale-on-scroll effects unless the user asks.
- Reach for Blender only when the user asks for it or a product can't be shown well any other way, and then the Big Wiss bar below applies.
- Ship fast. Mobile-first sizing, formatting, copy, bot blocking, QA and logging rules all still apply.

## Standing rule: the Big Wiss bar for cups and products (overrides the three.js cup method below)

The user said: "if the cups arent to the standard of the wiss ones i dont want to even see it, from now on stop making me mediocre shit". The reference is bigwissmatcha.com: each drink is a pre-rendered clip and still from one photoreal 3D cup (clear PET with real wall thickness and a rim bead, condensation droplets, a printed or foil logo, liquid with depth and texture, soft studio light on a seamless backdrop, a soft contact shadow).
- Render cups and products in Blender Cycles through the performance engine. Ship them as frames or clips (scroll film, pour or spin), not as live three.js. A live three.js cup does not meet the bar.
- Before showing the user anything, put a full-size still next to a Big Wiss cup (`scratchpad/bigwiss-ref/public/flavors/*.webp` or a fresh screenshot) and fix every place it looks worse: plastic, droplets, liquid, logo print, light, shadow.
- If it isn't there yet, keep iterating and say so. Never deliver or preview a cup that's below the bar.

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
