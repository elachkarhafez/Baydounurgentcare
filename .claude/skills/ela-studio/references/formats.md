# Formats, bans and the three-directions step

Added after the user said the sites were getting "repetitive and boring, they aren't evolving". They were right. Every site had become the same page in a new costume:

- headline on the left, one 3D object on the right
- a hold or drag "fill the meter" toy, with a hand-icon callout and a payoff card
- a four-step pinned scroll story
- a builder or calculator that spits out a total
- a marquee, fade-up reveals, a letterbox intro and film grain

The ideas changed, but the **format** never did, and the format is what people notice.

This file fixes that with four things:
1. A catalog of formats.
2. A cooldown ban list, enforced by the ledger in `novelty.md`.
3. Fresh visual languages.
4. A step where three different directions are pitched before anything is built.

---

## 1. Pick the FORMAT before the theme

A format is the kind of experience the whole site is, not a section inside the usual page. Pick one, then build everything to serve it. If the result still reads as "hero + sections + toy + story + tool", you picked a theme, not a format.

| # | Format | What the visitor gets | Good for | How to build it |
|---|---|---|---|---|
| A | **One continuous world** | The whole site is one 3D space. Scrolling moves a camera through it, and content appears as signs, objects and screens in that world. There are no sections. | Shops with a place: barbers, cafés, garages, studios | three.js plus a camera along a CatmullRom path scrubbed by scroll. Text is HTML pinned to projected 3D anchors. Build a light, distinct "set"; one world, not 10 objects. |
| B | **Video-led trailer** | The client's own reels, cut like a trailer. Scroll scrubs the footage and captions read like subtitles. Sound is opt-in. | Anyone posting cinematic reels: detailers, gyms, chefs, creators | Use `video_url` from the IG API (see `kit/research`). `ffmpeg` to an image sequence (WebP, about 60 frames per chapter) drawn on a canvas by scroll progress, or `<video>` with `currentTime` scrubbing. |
| C | **The page is the object** | The site *is* a receipt that prints as you scroll, a menu board, a parking ticket, a business card, a polaroid stack, a vinyl sleeve or a prescription pad. | Food, retail, services with a paper artifact | One long DOM object with real paper texture (`phototex` or drawn), perforation tear-offs, stamps, a thermal-print reveal. The 3D rule is met by making the object itself 3D, such as a curling receipt or a card that flips. |
| D | **Game-first** | A real 20–40 second game fills the hero: a timed challenge, a queue rush or a precision test. It ends with a score, a reward, and the info below it. | Gyms, car washes, food trucks, barbers, anything with a "rush" | Small loop, clear rules shown by doing, not by text. A shareable score card. Never a meter you just hold. |
| E | **Live and reactive** | The site is set by the client's real time, weather and sun: dawn light at opening, rain on the glass when it rains there, "closing soon" urgency. | Local spots with a strong sense of place | The open-meteo API (no key) plus a sun-position calc. Lighting, palette and copy all key off it. Show a "live in <city>" badge. |
| F | **Personal / choose your path** | Two or three questions up front, then the page reorders and rewrites itself for the answers. | Clinics, multi-service businesses, B2B | A CONFIG with variant copy and section order per persona. Animate the reflow so the rebuild is visible. |
| G | **Editorial magazine** | Print-like spreads, huge photography, pull quotes, issue numbers, folios. No toys. | Fashion, luxury, design-led, premium | A strict grid, real typographic hierarchy, image-led pacing and page-turn transitions. |
| H | **Horizontal journey** | One sideways trip: a road, a conveyor, a timeline, a counter run. | Process businesses, food lines, movers | A pinned horizontal track with parallax depth layers, and stops that open into detail. |
| I | **Collection explorer** | An infinite canvas or grid you pan and zoom. Items open in place. | Portfolios, menus with many items, tattoo flash, inventory | WebGL or CSS-transform grid with inertia and pinch zoom on phones. Never a 3x3 card grid. |
| J | **App / OS / chat UI** | The site is a phone home screen, a text thread, a desktop with windows or a terminal. Content lives in apps and messages. | Creators, techy brands, youth brands | A DOM app shell, real gestures, a notification queue as the storytelling device. |
| K | **Physics toy box** | Everything is a physical object you can toss: menu items, services, letters of the name. | Playful food, kids' brands, candy | matter.js or rapier with sprite textures. Info appears when you catch or drop things in zones. |
| L | **Documentary** | A founder or origin story in chapters: lower-thirds, quotes and archival photos. | Family businesses, long-running shops | Chapter rail, photo-led pacing, captions. Honest copy only from what they said. |
| M | **Map-first** | Their area map is the interface: service radius, routes, pop-up spots, delivery zones. | Mobile services, food trucks, pop-ups, movers | A drawn SVG or vector map (no tiles needed), animated routes, tap a zone to see what's available there. |
| N | **Single screen** | No scrolling at all. One composed screen with drawers, tabs and modes. | Simple businesses, link-in-bio replacements | A strict 100svh composition. Everything is reachable in two taps. |

New formats are welcome. Add them here when one works.

### How the 3D standing rule fits

3D is a **medium, not a layout**. The rule still holds: real three.js for the product or hero design, built with the kit's method. But the 3D thing can be:
- the world you travel through (A)
- the paper object itself (C)
- the game piece (D)
- items in a toy box (K)
- a model at a pin on a map (M)

What is banned is defaulting to "one 3D object beside the headline".

---

## 2. Cooldown bans (enforced by `novelty.md`)

A pattern used in any of the **last 5 builds** in `references/novelty.md` is off-limits. Some patterns are retired for good because they became the house style.

**Retired until the user asks for them by name:**
- **Meter toys:** a hold-to-fill or drag-to-fill progress meter with a payoff card at 100% (the lather, driveway, shears, ignite button and slate all collapsed into this).
- **Default hero layout:** headline on the left with a single 3D product object on the right, or in a rounded panel.
- **Hand-icon callouts:** a hand-icon callout pill plus an idle wiggle as the way to teach an interaction. Teach in-world instead: the object moves first, a ghost hand demo plays, or the first scroll performs the action.
- **Four-step stories:** a four-step pinned scroll story with progress dashes and a timecode HUD.
- **Intros:** letterbox bars plus title cards. Logo or barber-pole wipe loaders.
- **Default fill-ins:** a services marquee strip, a film-grain overlay, fade-up reveals on every element, a kicker label with a dash before it, and gradient pill buttons used as the default.
- **Palette:** tinted near-black plus a single gradient accent as the default palette.
- **Fonts:** Anton, Big Shoulders, Cinzel or Bricolage used as the go-to display face.

**Cooldown (not in the last 5 builds):**
- **Background:** a fixed full-screen WebGL background behind all sections.
- **Builder tools:** builder → total, price, runtime or DM message as the "useful tool". Pick a different tool shape: a comparator, a live status board, a map, a schedule you can subscribe to, a before/after archive.
- **Story structure:** any scroll story that is a sequence of numbered steps.
- **Primary verb:** the same primary interaction verb (drag-to-clean, hold, pick-and-watch, type-to-rebuild…).
- **Visual language:** the same visual language. Bans cover the last 3 builds for this one.

If the format genuinely needs a banned pattern (a calculator *is* the product, for example), say so in the pitch and get the user's OK.

---

## 3. Visual languages (rotate them)

Pick one per site, logged in `novelty.md`. Don't use the same one twice in a row.

| Language | Looks like | Type ideas |
|---|---|---|
| Risograph / print | 2–3 spot colours, misregistration, halftone, paper grain, overprint | Archivo Black + Space Mono; Rubik Mono One |
| Swiss / International | Strict grid, huge numerals, a red accent, flush-left, lots of white | Inter Display / Neue Haas look (Hanken Grotesk), tabular numbers |
| Brutalist web | Raw borders, system fonts, visible structure, loud blocks of colour | system-ui, Courier, a single bold grotesk |
| Hand-made collage | Scanned paper, tape, marker, cut-out photos, scribbles | Permanent Marker + a clean sans; hand-drawn SVG |
| Clay / toy 3D | Soft clay materials, rounded forms, pastel studio light, squash and stretch | Rounded display (Baloo, Fredoka) + a clean sans |
| Photoreal product | HDRI studio, real materials, macro camera, depth of field | A quiet sans; let the render speak |
| Editorial luxe | Big serif, folios, captions, generous margins | Fraunces, Playfair, Instrument Serif |
| Retro signage / neon | Tubes, enamel signs, marquee bulbs, night street | Monoton, Bungee, Shrikhand used sparingly |
| Blueprint / technical | Grid paper, callouts, dimensions, spec sheets | IBM Plex Mono + Plex Sans |
| Newspaper / zine | Columns, headlines, rules, photocopy texture | Old Standard, Chomsky, Bodoni |
| Y2K / chrome | Chrome type, bubbles, gradients, pixel UI | Syne, Unbounded, chrome rendered in 3D |
| Light and airy | Off-white, sun, soft shadows, pastel accents | Manrope + a soft serif |

Dark sites are allowed, but no more than one of the last three builds can be dark.

---

## 4. The three-directions step (do this before building)

After the brand read (Phase 2), send the user **three genuinely different directions**. They should differ in format, primary verb and visual language, not be three colour schemes. Keep each pitch to four lines:

```
A. <Format> · <primary verb> · <visual language>
First 5 seconds: what the visitor sees and does.
Why them: the brand-read fact it grows from.
Risk: what could fall flat.
```

- Recommend one and say why in a sentence.
- Wait for the pick (or "mix A + C"), then build. If the user says "just build it", "fast" or "your call", build the recommended one and list the other two in the hand-off as alternates.
- Every direction must pass the bans in section 2 against the current `novelty.md`. Check before pitching.
- **Skip the step** for: declined→concept conversions (they keep the original format), edits to an existing site, and redesigns where the user dictated the format.

---

## 5. After shipping

Add a row to `references/novelty.md` with the following tags. Keep the signatures.md row too (that's the how-to; novelty.md is the variety log).
- format
- primary verb
- visual language
- intro type
- story type
- tool type
- palette mode (dark or light)
- display face
