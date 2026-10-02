# Design rules

## Type pairings that worked

| Mood | Display | Text | Labels |
|---|---|---|---|
| Old-school, crafted (barber, tattoo) | Cormorant Garamond italic, UnifrakturMaguntia (sparingly) | Manrope | JetBrains Mono |
| Loud, physical (gym, burgers, construction) | Anton, Archivo (wide `wdth` axis), Saira Stencil One | Inter Tight / Archivo | Barlow Condensed, DM Mono |
| Soft, premium (skin, wellness) | Fraunces (SOFT axis), Instrument Serif | DM Sans / Manrope | none |
| Warm, playful (bakery, bagels) | Bagel Fat One, Bricolage Grotesque, DM Serif Display | DM Sans | none |
| Quiet luxury (real estate) | Cormorant | Instrument Sans | JetBrains Mono |
| Cinematic, clinical-calm (medical) | Instrument Serif italic | Inter Tight | none |

Rules:
- Never ship an Inter-only site. The display face carries the personality.
- Use one display face, with italics for emphasis words.
- Size display type with `clamp()`. Heroes are big (`clamp(56px, 11vw, 180px)` is normal).
- Load only the weights you use, with `display=swap`.

## Palette method

1. Take the niche's materials (enamel red, brass, navy; chalk, iron, safety yellow; flour, cinnamon, icing).
2. Build 5–7 tokens: `--bg`, `--bg-2`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-2`.
3. Dark sites: use a tinted near-black, never `#000`. Light sites: use a warm off-white, never `#fff`.
4. Use the accent on calls to action, the signature piece and a few highlights. If everything is accent, nothing is.
5. Check contrast: body text should be ≥ 4.5:1.

## Copy rules

- Write like the owner talks, then tighten it. Short lines, real specifics, a little humour where the brand allows it.
  - "Down to zero, blended up. No visible lines."
  - "Napping permitted."
  - "Sitting still is optional."
- Use the niche's own words: guard numbers, ceramic coating, PR, proofing, schmear.
- Calls to action are verbs plus the thing: "Book a chair", "Get a quote", "Order pickup", "Call the clinic".
- Never write lorem ipsum, "Welcome to our website", "We are passionate about…" or "Your trusted partner".
- Never invent reviews, ratings, awards, years in business or client counts and present them as real. Concept sites put "concept site, sample menu" in the footer.

## Motion rules

- **Loader**: under 1.8s, branded, and it hands off cleanly into the hero animation.
- **Reveals**: split headlines into lines or words, rise with a slight stagger (0.04–0.08s), and use `power3.out` / `expo.out`.
- **Scroll**:
  - Lenis smooth scroll with ScrollTrigger synced to it.
  - At most one or two pinned sections per page; more feels like a trap.
- **Micro-interactions**:
  - Magnetic primary buttons on fine pointers.
  - Underline wipes on links.
  - Marquee speed nudged by scroll velocity.
- **Motion personality**: match it to the brand (heavy and snappy, soft and slow, or bouncy).
- **Reduced motion**: skip smooth scroll and scrubbing, show end states, and keep the signature usable without animation.

## Anti-patterns (things that make it look AI-generated)

- Purple-to-blue gradients on everything, and glassmorphism cards for no reason.
- Emoji as icons. Draw simple stroke SVG icons instead (24×24 viewBox, 1.3–1.6 stroke width).
- Three identical feature cards with an icon, a title and a sentence.
- Centred everything, with the same spacing in every section.
- Stock photos of people shaking hands.
- Animations that play on every element. Animate the important things, and let the rest just be well set.
- Fixed badges, toasts or chat bubbles covering content on phones.
