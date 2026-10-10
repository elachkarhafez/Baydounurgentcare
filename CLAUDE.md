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
- References: `coffeetalks/src/cup.js` (cappuccino with latte art) and `brewdcoffee/src/cup.js` (iced cup with layered drink, ice, foam, lid, straw; hot paper cup).

