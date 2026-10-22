---
name: ela-studio
description: Build a standout, animated, single-file marketing website for a local business or niche (restaurant, barber, gym, salon, contractor, bakery, real estate, tattoo, detailing, clinic, anything), then QA it and deploy it to Vercel. Use when the user asks for a website for a business, an Instagram handle, or a niche/concept site for the ElaSystems portfolio, or says "make me a site for ...". Also use when the user says a business doesn't want / declined / passed on its site (retire the link and turn it into a generic ElaSystems concept). Covers brand research, the signature-interaction concept, design system, build, mobile/accessibility pass, headless screenshot QA, and deployment.
---

# ElaSystems Studio: niche websites that people screenshot

> **House standard (user feedback, newest, overrides everything below about signature interactions, formats and three-direction pitches).** The user wants "clean apple style animations with blender 3d rendered animations scroll based designs that are professional like apple and top creator websites ... I need consistency". Every site follows `kit/scrollfilm/README.md`: a thin nav, then a pinned Blender scroll film with captions, a ScrollGrow photo, a ScrollWords statement, a bento, steps, a CTA and the footer. No toys or mechanics, and no bland template pages. Preview render key frames and fix anything muddy before the final render.

> **Evolve, don't repeat (user feedback, read first).** The user called the sites "repetitive and boring, they aren't evolving". Every build had become the same page: headline left with a 3D object right, a hold/drag-to-fill meter toy, a four-step pinned story, a calculator, a marquee and a letterbox intro. From now on, every build starts by picking a **format** from `references/formats.md`, passes the cooldown bans checked against `references/novelty.md`, and pitches **three different directions** to the user before building (Phase 3). Novelty is part of the job, not a bonus.

> **Formatting standards (mandatory, user feedback).** Oversized type, huge heroes and extra scrolling are defects. Every build and edit meets `references/formatting.md`: hero headline 40–56px desktop / 30–38px mobile, section padding 48–80px, container 1100–1200px, and the hero fully visible at 1366×768. Before shipping, take screenshots at 1366×768, 1440×900, 1920×1080, 390×844 and 768×1024.

This is the playbook behind the Baydoun Urgent Care, Stack Shack, Vella Bakehouse, Mr. 2 Weeks, Bagel & Co, Halcyon Cuts, Vantage Detail, Halvark Strength, Lumen Skin, Marrowick Estates and Inkwell & Oak sites. Follow every phase in order. The thing that makes these sites work is not "more animation". It's **one idea that only fits this business**, built properly, wrapped in a site that's genuinely useful.


> **User feedback (Carioca's):** the 3D "Rio to the chair" journey was rejected as gimmicky ("looks like shit… stop making me bullshit like that wasting my credits"). When a client has little content (few photos, no prices or address), default to a clean, professional, photo-led site and skip the toy. Ask before spending a big 3D build on a thin brand.

## Fast path: use the kit's tools, not its concepts (target: 10 minutes)

> **Standing rule from the user: never reuse a signature concept unless they ask for it by name.** The Fudge Fix "3D object builds itself on scroll" (build3d) was made for The Fudge Fix only. Do NOT default to it for food, products or anything else. Use it only when the user explicitly asks ("do it like Fudge Fix", "3D build on scroll"). The same goes for every other signature in `references/signatures.md`: each client gets a concept invented for *their* business. Check the last few rows of signatures.md before choosing, and if your idea resembles one of them, pick something else.

`kit/` holds tested production *infrastructure*: one-command research, compositor-only openers, the ElaDrag interaction helper, QA scripts, verify-live, product tiles, libs, and the build3d engine (opt-in only, see above). Use the infrastructure freely; invent the concept fresh every time. **Read `kit/README.md` before Phase 2.**

Time budget: research 1 min (`kit/research/ig.mjs` in the background) → read `novelty.md` + pitch three directions 2 min (then wait for the pick) → build 4 min (copy closest site/example, edit CONFIG + layers) → check 2 min (`kit/qa/states.mjs`, `shoot.mjs`, scripted payoff) → ship 1 min (`kit/qa/verify-live.sh`). Run independent steps in parallel (research while choosing the concept; QA desktop and phone together; a subagent for a second site).

Reference files (read them when you reach the phase that needs them):
- `references/formats.md`: the format catalog, the cooldown ban list, visual languages and the three-directions pitch. **Read it before every new build.**
- `references/novelty.md`: the ledger of recent builds (format, verb, visual language, intro, story, tool, palette, face). The last 5 rows decide what's banned next.
- `references/declined.md`: what to do when a business says no (generic concept + retire the old link).
- `references/signatures.md`: catalogue of signature interactions by niche, with how each was built.
- `references/boilerplate.md`: the HTML skeleton, CDN tags, CONFIG pattern, smooth-scroll setup, ElaSystems badge.
- `references/design.md`: type pairings, palettes, copy rules, motion rules, anti-patterns.
- `scripts/shoot.mjs`: headless QA harness (desktop + phone screenshots, console errors, horizontal overflow).
- `kit/README.md`: the fast path, the build3d engine, openers, interaction helpers and the rules they encode.

---

> **Standing rule from the user: designs are built in real 3D.** 3D is a medium, not a layout: the product can be the world you move through, the paper object, the game piece or the thing on a map. It is never "one object beside the headline" by default (see `formats.md`). Every product/hero design (cups, drinks, food, objects) uses the Coffee Talks cup method: three.js bundled with `kit/build3d/build.sh`, studio HDRI, physical materials, lathe geometry, transparent shadow catcher, sequenced animation, drawn fallback. See `coffeetalks/src/cup.js` and `demos/coffee-trailer/src/cup.js`. Don't ship flat SVG/canvas product drawings. For realism use `kit/library/` (see its README): texture food from the client's own photos with `phototex.py`, real CC0 materials/HDRIs/models from the cache or `fetch.py`, image→3D side items with `i23d.py`, GTAO on desktop. Reference: `demos/catering-kitchen/src/platter.js`.

## Phase 1: Intake (keep it short)

Get, or decide yourself, these five things. Ask the user only for what you can't find or reasonably pick:

1. **Business**: name, Instagram handle or website, city.
2. **Niche and what they actually sell**: services, menu, price range.
3. **Real or concept**: a real client gets real details; a portfolio concept gets an invented name and sample data, clearly labelled as a concept in the footer.
4. **Vibe**: if the user doesn't say, pick from the brand itself (see Phase 2). Don't make them choose from a menu.
5. **Contact details**: hours, address, phone, booking link. Missing items get tasteful placeholders plus graceful fallbacks, never broken links.

## Phase 2: Brand read

- If there's an Instagram handle or site, try to look at it. For Instagram, if the `/embed/` page says the profile "may be broken", call `https://i.instagram.com/api/v1/users/web_profile_info/?username=<handle>` with header `x-ig-app-id: 936619743392459`: it returns the bio, the latest 12 posts with captions, full-size image URLs and reel `video_url`s. Pull frames from reels with ffmpeg for real before/after shots. Look at: bio, highlights, post themes, colours, how they talk, what customers comment on. If the platform blocks fetching, say so and work from what the user gives you (screenshots, bio text). Never invent quotes, reviews, awards or stats and present them as real.
- Write a 5-line brief before designing:
  - **Who comes here and why** (one line)
  - **The feeling** in three words (e.g. "warm, old-school, precise")
  - **The material world** of the niche: the physical stuff it's made of (barber: brass, enamel, striped pole, hot towels; bakery: dough, icing, flour dust; gym: chalk, iron, rubber plates).
  - **The one thing they're proudest of**
  - **The main action** a visitor should take: book, order, call, visit, or get a quote.

## Phase 3: Format, directions, then concept (most important step)

1. **Read `references/novelty.md`.** Write down what the last 5 rows rule out: format, primary verb, intro, story and tool type. Also note the visual language used in the last 3 and how many recent builds were dark.
2. **Read `references/formats.md`.** Pick candidate formats that grow from the brand read. Some examples:
   - a detailer who posts cinematic reels → video-led trailer
   - a pop-up that moves around → map-first
   - a cash-only barber with a menu board → the page *is* the menu board / receipt
   - a gym → game-first
   - a family shop since 1985 → documentary
3. **Pitch three directions** to the user using the format in `formats.md` §4:
   - Each one differs in format, primary verb and visual language, and all three pass the bans.
   - Recommend one, then wait for the pick.
   - Skip this only for declined→concept conversions, edits, or when the user dictated the format or said "just build it" (then build your recommendation and list the other two as alternates in the hand-off).
4. **Then design the concept inside the chosen format:**
   - **It's the product or the craft.** Not generic decoration: their cut, their wash, their dish, their counter, their footage.
   - **It's interactive in the format's own way.** Scroll-driving a camera, playing, panning, choosing, tossing, printing, reading a live state. "Hold until the meter fills" is retired.
   - **It's taught in-world.** The thing demonstrates itself first (a ghost hand, an auto-play beat, or the first scroll performs the action). It must still be obvious in two seconds; a real visitor once missed a small grey hint, so make the demo unmissable. The hand-icon callout pill is retired.
   - **It has a payoff that fits the format.** A score card, an arrival, a printed receipt, a lit-up window. Not a toast card at 100%.
   - **It works on phones and has a static fallback** (reduced motion, no WebGL).
5. **The rest of the page follows the format.** There is no mandatory "one scroll story + one tool".
   - Include only what the format needs: real info (services, prices, hours, contact) laid out in the format's own language.
   - The "useful tool" must change shape from recent builds: a comparator, a live board, a map, an archive, a subscription schedule, or none at all if the format already is the tool.

> **Read the room.** Playful formats (game-first, toy box, page-is-the-object) suit food, gyms, car shops and local services. Fashion, luxury and premium brands want editorial, documentary or one-continuous-world, with their best photography huge. The first C4U menswear version, a drag-clothes-onto-a-rug game, was rejected as "stupid". If unsure, put one of each in the three directions.

Check `references/signatures.md` for how past pieces were built. Never reuse a signature for two clients.

## Phase 4: Design system

Read `references/design.md`. Pick the **visual language** from `formats.md` §3: not the same one as the last 3 builds, and no more than one of the last three dark. Then decide, and write down at the top of the CSS:
- **Palette**: 5–7 tokens as CSS variables on `:root`, pulled from the niche's material world. One loud accent and one supporting accent max.
- **Type**: a display face with character, a clean text face and, optionally, a mono for labels and prices. All from Google Fonts.
- **Layout grid and spacing**: use `clamp()` everywhere, with `--pad: clamp(16px, 4vw, 56px)`.
- **Motion personality**: heavy/snappy for a gym, slow/soft for skincare, bouncy for food.

## Phase 5: Build

One folder per site containing a single `index.html` (all CSS and JS inline, libraries from CDN). Start from `references/boilerplate.md`.

There is **no standard section order** any more. The old order produced the same page every time: loader → hero → marquee → services → pinned story → tool → gallery → visit → CTA. Structure the page the way the chosen format needs it:
- **One continuous world:** a single scene with no sections.
- **Page-is-the-object:** one long object.
- **Single screen:** one screen with drawers.
- **Trailer:** chapters.

Every site still needs these, wherever the format puts them:
- the business's real info: what they sell, prices if public, hours, location, contact
- a clear primary call to action that's always reachable (sticky on phones)
- the footer credit / ElaSystems badge (see boilerplate)

An intro is optional and must be under 1.8s and skippable. Letterbox title cards and logo wipes are retired; if you use an intro, it belongs to the format, like a receipt printing or a camera lifting off.

Build rules:
- **All business data lives in one `CONFIG` object** at the top of the script: name, phone, address, hours, services and prices, socials. The page renders from it, so a new client is a data swap.
- **Art is drawn in code** (inline SVG, canvas, Three.js) unless you have the client's real photos. No stock-photo URLs and no hotlinked images that can break.
- **Escape anything rendered from CONFIG** with an `esc()` helper.
- **Every link must work**: `tel:`, `sms:`, `mailto:`, map links, booking. If something is missing, fall back to an in-page anchor and change the button label to match.
- **Performance**:
  - Cap the WebGL device pixel ratio at 2.
  - Pause canvases and render loops when they're offscreen (IntersectionObserver) or the tab is hidden.
  - Wrap `new THREE.WebGLRenderer` in try/catch and fall back to an SVG or CSS version.
- **Accessibility**:
  - Use semantic sections and real buttons.
  - Give interactive elements focus styles and `aria-label`s.
  - Honour `prefers-reduced-motion` (no smooth scroll, no scrubbing, final states shown).
  - Keep text contrast at AA or better.
- **Touch and fine pointers are different**: custom cursors, magnetic buttons and hover effects only under `(hover: hover) and (pointer: fine)`. Give every hover reveal a tap equivalent.

## Phase 6: QA (don't skip it)

Run the harness on every build and after every fix:

```bash
node .claude/skills/ela-studio/scripts/shoot.mjs <site>/index.html <outDir> [stops=12] [waitMs=5000]
# add --via-curl if the headless browser can't reach CDNs directly (sandboxed containers)
```

Then **look at the screenshots** (desktop 1440×900 and phone 390×844) and fix:
- Any page error or console error.
- `HORIZONTAL OVERFLOW` on either size.
- Overlapping elements, text colliding with the signature piece, unreadable contrast.
- A hero that doesn't read in the first second on a phone.
- Floating badges or toasts covering content.
- Squashed or stretched photos. If an `<img>` has `width`/`height` attributes and you size it with CSS `aspect-ratio`, you must also set `height: auto`, or the height attribute wins and the photo turns into a tall sliver (this happened on Out Tinted's phone gallery). On phones, prefer a swipeable row of large cards over two skinny columns.

Also script the signature interaction itself in Playwright (drag, hold, click) and confirm the payoff fires. Clicks only count once you've seen the result.

**Novelty check (before shipping):** put the desktop hero screenshot next to the last three builds' heroes. If someone could mistake it for one of them (same layout, same palette mood, same type feel), it isn't done. Change the composition, not just the colours.

## Phase 7: Ship

1. **Name check**: before claiming a `<name>.vercel.app` or inventing a concept brand, make sure the name isn't a real business in that niche. If it is, rename the concept. Also `curl https://<name>.vercel.app` first: if it returns anything but `DEPLOYMENT_NOT_FOUND`, someone else owns that subdomain and your deploy will only get a private team URL, so pick another name (The Family Doc ended up on `familydoc-clinics`).
2. **Block AI crawlers**: copy `assets/noai/vercel.json` and `assets/noai/robots.txt` into the site folder, and add `<meta name="robots" content="noai, noimageai">` right after `<meta charset>`. The `vercel.json` returns 403 at Vercel's edge to self-identified AI bots and AI assistants' fetchers (GPTBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, CCBot and others), while browsers, Googlebot and Instagram/Facebook link previews still load. After deploying, check it: `curl -A "GPTBot/1.2" https://<name>.vercel.app` should return 403, and a normal browser user agent should return 200.
3. **Commit and push** the site folder.
4. **Deploy to Vercel** as a static site with no build step, using the site folder as the root directory.
   - With the Vercel MCP: `create_deployment` with `gitSource` (org, repo, ref, sha), `target: "production"` and `projectSettings: { rootDirectory: "<folder>", framework: null, buildCommand: null, installCommand: null, outputDirectory: null }`.
   - With the CLI: run `vercel --prod` from inside the folder.
   - If the Vercel connector drops mid-session (its tools vanish and won't reload until a new session), don't stall: `npm i -g vercel`, run `vercel login` in the background and give the user the device-approval URL it prints (no token is pasted anywhere), then `vercel deploy --prod --yes --scope elachkarhafezs-projects` from inside the site folder. The project name is the folder name. **Straight after, set the project's root directory** (`vercel api "/v9/projects/<name>?teamId=team_AYB0SFZ1qQkp6TebSji5xEKA" -X PATCH --input` a JSON file with `{"rootDirectory":"<folder>","framework":null,"buildCommand":null,"installCommand":null,"outputDirectory":null}`): the CLI auto-links the GitHub repo with root `.`, so the next push redeploys the repo root (the old Baydoun Urgent Care page) over the site. That happened on Get Tinted. Re-run verify-live after every push, not just after the deploy.
5. **Verify live**: `curl` the production URL until it returns 200 and contains a string unique to this build. Only then hand over the link.
6. **Log it**: add a row to `references/novelty.md` (format, verb, visual language, intro, story, tool, palette, display face), plus the usual `signatures.md` row.
7. **Hand off**: give the link, two or three lines on what's interactive, and what the client needs to send to replace any placeholders.

## When a business says no

The user has given standing permission: as soon as they say a business doesn't want its site, follow `references/declined.md` without asking. Rebuild it as a generic ElaSystems concept at a new neutral link, pause the old Vercel project so the business-name URL goes offline, `git rm` the original folder and report the new link.

## Edits after launch

Change the CONFIG first. For copy or design changes, edit, re-run the QA harness and redeploy the same project so the link stays the same.
