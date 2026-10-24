# ELA Systems: website formatting standards (mandatory)

> **Mobile first (user feedback, newest; overrides "design for real laptops first" below).** Build and judge every site at 390×844 first. Phone type: H1 26–30px, H2 20–24px, body 14–15px. No photo taller than about 55% of the phone screen, so nothing gets sliced by the fold. Card rows scroll sideways with snap and a peek. Phone section padding 28–40px. Sticky bottom action bar. See CLAUDE.md "mobile first".

Every site must be cinematic and visually impressive, and also compact, in proportion, readable and easy to get around. Oversized type, huge heroes and padding that forces needless scrolling are defects. These are acceptance criteria for every build and every edit.

## 1. Type sizes

| Element | Desktop | Mobile |
|---|---|---|
| Hero headline | 40–56px | 30–38px |
| Section heading | 28–40px | 24–30px |
| Body text | 15–17px | 14–16px |
| Buttons | 14–16px | 14–16px |

- Size type with `clamp()` and rem, not huge fixed pixel sizes. Example: `font-size: clamp(1.875rem, 1.2rem + 2.2vw, 3.5rem)` for a hero.
- Keep line heights readable: about 1.05–1.15 for display type, 1.5–1.65 for body text, and more for scripts like Arabic.
- Keep a clear hierarchy (hero > section heading > card title > body) without blowing any level up.

## 2. Viewport and spacing

- Design for real laptops first. At **1366×768** the hero headline, supporting text and main call to action should be visible without scrolling.
- Aim to fit each reasonably sized section's main content in about one desktop viewport. Never force content-heavy sections into fixed heights.
- Avoid `min-h-screen`, `h-screen` / `100vh` sections, `py-32` and `py-40`.
- Section padding: 48–80px desktop, 32–56px mobile.
- Container max width: 1100–1200px.
- Tighten spacing with better grids, but don't cram.
- No horizontal overflow and no clipped content, at any width.

## 3. Design philosophy

It must feel like an art-directed digital experience, not an oversized AI landing-page template. Prioritise:
- balanced proportions and intentional whitespace
- clearly different type levels
- smooth, refined animation
- strong visual storytelling
- layouts dense enough to show useful information
- a consistent rhythm between sections

## 4. Protect existing work

On an existing project:
- Keep all functionality, branding, colours, fonts, assets and animations.
- Don't redesign or rebuild components without a reason. Change only layout, scale, responsiveness and spacing where needed.
- Never shrink content just to force it into a viewport at the cost of readability.

## 5. Visual testing (required before calling a site done)

Take real browser screenshots (Playwright) at:
- 1366×768 (standard laptop)
- 1440×900 (larger laptop)
- 1920×1080 (desktop)
- 390×844 (phone)
- 768×1024 (tablet)

Check:
- Type is in proportion; the hero is visible and balanced at 1366×768.
- Sections aren't needlessly tall.
- Text never overlaps illustrations or cards.
- Buttons and navigation stay reachable.
- Mobile stacks cleanly, with no horizontal scroll.
- The page still works with browser text enlarged or zoomed (test 200% zoom or a 20px root font).

Never claim visual testing happened if no browser test was run.
