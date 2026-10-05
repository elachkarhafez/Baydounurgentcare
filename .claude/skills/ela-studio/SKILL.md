---
name: ela-studio
description: Build a standout, animated, single-file marketing website for a local business or niche (restaurant, barber, gym, salon, contractor, bakery, real estate, tattoo, detailing, clinic, anything), then QA it and deploy it to Vercel. Use when the user asks for a website for a business, an Instagram handle, or a niche/concept site for the ElaSystems portfolio, or says "make me a site for ...". Also use when the user says a business doesn't want / declined / passed on its site (retire the link and turn it into a generic ElaSystems concept). Covers brand research, the signature-interaction concept, design system, build, mobile/accessibility pass, headless screenshot QA, and deployment.
---

# ElaSystems Studio: niche websites that people screenshot

This is the playbook behind the Baydoun Urgent Care, Stack Shack, Vella Bakehouse, Mr. 2 Weeks, Bagel & Co, Halcyon Cuts, Vantage Detail, Halvark Strength, Lumen Skin, Marrowick Estates and Inkwell & Oak sites. Follow every phase in order. The thing that makes these sites work is not "more animation". It's **one idea that only fits this business**, built properly, wrapped in a site that's genuinely useful.

## Fast path: use the kit's tools, not its concepts (target: 10 minutes)

> **Standing rule from the user: never reuse a signature concept unless they ask for it by name.** The Fudge Fix "3D object builds itself on scroll" (build3d) was made for The Fudge Fix only. Do NOT default to it for food, products or anything else. Use it only when the user explicitly asks ("do it like Fudge Fix", "3D build on scroll"). The same goes for every other signature in `references/signatures.md`: each client gets a concept invented for *their* business. Check the last few rows of signatures.md before choosing, and if your idea resembles one of them, pick something else.

`kit/` holds tested production *infrastructure*: one-command research, compositor-only openers, the ElaDrag interaction helper, QA scripts, verify-live, product tiles, libs, and the build3d engine (opt-in only, see above). Use the infrastructure freely; invent the concept fresh every time. **Read `kit/README.md` before Phase 2.**

Time budget: research 1 min (`kit/research/ig.mjs` in the background) → concept 1 min → build 4 min (copy closest site/example, edit CONFIG + layers) → check 2 min (`kit/qa/states.mjs`, `shoot.mjs`, scripted payoff) → ship 1 min (`kit/qa/verify-live.sh`). Run independent steps in parallel (research while choosing the concept; QA desktop and phone together; a subagent for a second site).

Reference files (read them when you reach the phase that needs them):
- `references/declined.md`: what to do when a business says no (generic concept + retire the old link).
- `references/signatures.md`: catalogue of signature interactions by niche, with how each was built.
- `references/boilerplate.md`: the HTML skeleton, CDN tags, CONFIG pattern, smooth-scroll setup, ElaSystems badge.
- `references/design.md`: type pairings, palettes, copy rules, motion rules, anti-patterns.
- `scripts/shoot.mjs`: headless QA harness (desktop + phone screenshots, console errors, horizontal overflow).
- `kit/README.md`: the fast path, the build3d engine, openers, interaction helpers and the rules they encode.

---

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

## Phase 3: The concept (most important step)

> **Read the room first.** A playful toy is right for food, gyms, car shops and local service brands. For fashion, luxury, design-led and premium brands it reads as gimmicky (the first C4U menswear version, a drag-clothes-onto-a-rug game, was rejected as "stupid"). For those, the signature is the *experience*: editorial layout, their best photography huge, and slick motion (curtain intro, clip-path image reveals, a pinned horizontal collection rail, scroll-zoom detail shots, word-by-word text reveals). If unsure which way a client leans, ask.

Pick **one signature interaction**: a playable piece of the business itself, built in code, that sits in or near the hero. Rules:

- It must be **the product or the craft**, not generic decoration. A barber pole that spins toward your cursor, a dirty car you scrub clean, a barbell you grind to lockout, a burger that stacks and explodes, a cinnamon roll you can turn, a floor plan that builds into a house as you scroll, ink that swirls in water.
- It must be **interactive**: cursor, drag, hold, click or scroll. Not just a looping video.
- It should have a **payoff**: a headline that swaps at 100% clean, a "PR!" at five reps, the burger restacking.
- It needs a **mobile version** (touch or drag, or auto-play) and a **static fallback** (reduced motion, no WebGL).
- It must be **obvious in the first two seconds**. Put a bold callout right on or next to it that names the action ("Grab the photo & shake it", with a hand icon and an arrow pointing at it), use touch wording on phones, and add an idle nudge: if nobody touches it for ~3s, it wiggles. Hide the callout for good after the first interaction. Small grey hint text under the piece is not enough; a real visitor missed it.

Then pick two supporting pieces:
- **One scroll story**: a pinned, scrubbed section that walks through their process (the six-step detail, the skin fade by guard number, the ritual).
- **One genuinely useful tool**: booking steps, a size-based pricing toggle, a calculator, a quiz, menu filters, a live "Open now / Closes at 9" status computed from the hours.

Check `references/signatures.md` for what's been done and ideas for new niches. Don't reuse the same signature for two different clients.

## Phase 4: Design system

Read `references/design.md`. Then decide, and write down at the top of the CSS:
- **Palette**: 5–7 tokens as CSS variables on `:root`, pulled from the niche's material world. One loud accent and one supporting accent max.
- **Type**: a display face with character, a clean text face and, optionally, a mono for labels and prices. All from Google Fonts.
- **Layout grid and spacing**: use `clamp()` everywhere, with `--pad: clamp(16px, 4vw, 56px)`.
- **Motion personality**: heavy/snappy for a gym, slow/soft for skincare, bouncy for food.

## Phase 5: Build

One folder per site containing a single `index.html` (all CSS and JS inline, libraries from CDN). Start from `references/boilerplate.md`.

Standard section order (adapt, don't force):
1. **Loader**: on-brand, under 1.8s, skippable. It should feel like part of the brand, not a spinner.
2. **Hero**: the headline, the signature interaction and the main call to action. Nav with a sticky "Book / Order / Call" button.
3. **Marquee or proof strip**: short phrases in the brand voice.
4. **Services / menu / listings**: built from CONFIG data, with prices if they have them.
5. **Scroll story**: pinned and scrubbed.
6. **Useful tool**: booking, pricing, quiz or calculator.
7. **Gallery / Instagram / about**: real posts for a real client; drawn SVG art for concepts.
8. **Visit**: hours table with today highlighted, live open/closed status, address, map link, phone.
9. **Big closing call to action, then the footer**: footer includes the ElaSystems badge (see boilerplate).

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

## Phase 7: Ship

1. **Name check**: before claiming a `<name>.vercel.app` or inventing a concept brand, make sure the name isn't a real business in that niche. If it is, rename the concept. Also `curl https://<name>.vercel.app` first: if it returns anything but `DEPLOYMENT_NOT_FOUND`, someone else owns that subdomain and your deploy will only get a private team URL, so pick another name (The Family Doc ended up on `familydoc-clinics`).
2. **Block AI crawlers**: copy `assets/noai/vercel.json` and `assets/noai/robots.txt` into the site folder, and add `<meta name="robots" content="noai, noimageai">` right after `<meta charset>`. The `vercel.json` returns 403 at Vercel's edge to self-identified AI bots and AI assistants' fetchers (GPTBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, CCBot and others), while browsers, Googlebot and Instagram/Facebook link previews still load. After deploying, check it: `curl -A "GPTBot/1.2" https://<name>.vercel.app` should return 403, and a normal browser user agent should return 200.
3. **Commit and push** the site folder.
4. **Deploy to Vercel** as a static site with no build step, using the site folder as the root directory.
   - With the Vercel MCP: `create_deployment` with `gitSource` (org, repo, ref, sha), `target: "production"` and `projectSettings: { rootDirectory: "<folder>", framework: null, buildCommand: null, installCommand: null, outputDirectory: null }`.
   - With the CLI: run `vercel --prod` from inside the folder.
5. **Verify live**: `curl` the production URL until it returns 200 and contains a string unique to this build. Only then hand over the link.
6. **Hand off**: give the link, two or three lines on what's interactive, and what the client needs to send to replace any placeholders.

## When a business says no

The user has given standing permission: as soon as they say a business doesn't want its site, follow `references/declined.md` without asking. Rebuild it as a generic ElaSystems concept at a new neutral link, pause the old Vercel project so the business-name URL goes offline, `git rm` the original folder and report the new link.

## Edits after launch

Change the CONFIG first. For copy or design changes, edit, re-run the QA harness and redeploy the same project so the link stays the same.
