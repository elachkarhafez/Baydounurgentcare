# Signature interactions

Each of these was built and shipped. Use them as proof of the pattern, not as templates to copy for a competitor in the same town.

| Niche | Site | Signature | How it was built |
|---|---|---|---|
| Barbershop | Halcyon Cuts | 3D barber pole that spins and tilts toward the cursor, plus a scroll-driven "skin fade": the headline fades guard by guard (#0 to #4) | Three.js open cylinder with a shader stripe that scrolls over time, a glass shader shell, lathe-turned chrome caps and brass torus rings; pointer sets a target tilt that gets lerped. The fade is a sticky section whose scrubbed ScrollTrigger progress steps through guard numbers and blends the headline |
| Car detailing | Vantage Detail Co. | Drag across a muddy car to wash it; at 100% the headline swaps to "Showroom ready". Paint swatches recolour the car. Water beads roll off a "ceramic" panel, with the cursor as a blower | Car is SVG; dirt is a canvas on top, erased with `destination-out` brush strokes; a sampled pixel count gives the clean %. Beads are simple particles pushed by cursor distance |
| Strength gym | Halvark Strength | "Hold to lift": hold the button to grind a barbell to lockout, drop it, add plates; five good reps triggers a PR. Chalk dust floats in the hero | Hold time drives the bar's progress with a struggle wobble near the sticking point; judges' lights turn white on a good rep. Archivo's variable width axis gives condensed/wide kinetic type, the marquee speeds up and flips with scroll velocity, and a Three.js points shader drifts chalk dust |
| Skincare / facials | Lumen Skin Studio | Liquid pearl background that ripples under the cursor; a "Find your facial" quiz; one morphing shape through a pinned "ritual" scroll | WebGL fragment shader (iridescent noise plus ripple uniforms from pointer). Morph is SVG path interpolation scrubbed by ScrollTrigger |
| Luxury real estate | Marrowick Estates | Scroll and a 2D floor plan extrudes into a 3D house; listings filter live; a mortgage calculator updates instantly | Three.js: walls from plan line segments, scaled in Y by scroll progress, then roof and camera orbit. Listing cards' house illustrations are generated SVG from a seed |
| Tattoo studio | Inkwell & Oak | Live ink-in-water fluid sim where the studio name bleeds as you swirl; a flash sheet that colours itself in on hover; a body-map placement picker | 2D stable-fluids sim on WebGL (half-res), dye injected along pointer velocity, title rendered into the dye field. Flash designs use SVG stroke-dashoffset draw, then a fill fade |
| Burger spot | Stack Shack | Animated SVG burger: layers drop in and squash, cheese drips melt, it bobs idle, leans to the cursor, and click explodes and restacks it. Matter.js stickers bounce around it | Layer `<g>` groups animated with GSAP (y, scaleY squash, rotation). Burger is a static Matter body so stickers collide with it |
| Bakery | Vella Bakehouse | 3D cinnamon roll you can turn, with a shader swirl and icing drizzle | Spiral shape via Three.js ExtrudeGeometry along an Archimedean spiral; fragment shader darkens the cinnamon layer; icing is a TubeGeometry along a noisy path |
| Bagel shop | Bagel & Co | 3D bagel with a visible cream cheese schmear | Bagel is a TorusGeometry; the schmear is a LatheGeometry. Watch the lathe profile order: reversed points render inside-out and the cream cheese looks invisible |
| Construction (comedy brand) | Mr. 2 Weeks | Job-site energy: hazard-tape marquees, a "2 weeks" running-joke counter, skit-style copy | Plays on the owner's comedy persona. The joke is the brand, so the copy carries it |
| Urgent care | Baydoun (cinematic) | Calm, confident cinematic scroll: walk-in, get seen | Big type reveals, pinned "how a visit works" steps, live open/closed status, one-tap call and directions |

## Ideas for niches not done yet

- **Coffee shop**: pour-over you control by holding (water level rises, bloom animates); latte-art pattern drawn by the cursor.
- **Florist**: drag stems into a vase to build a bouquet, and the price updates live.
- **Nail salon**: hover a hand and colours paint on per nail; a swatch picker plus a "your set" summary.
- **Dentist**: smile shade slider (before and after scrub), plus a calm step-by-step first-visit scroll.
- **Plumber / HVAC**: drag to connect pipes and water flows when sealed; an emergency banner with live hours.
- **Landscaping**: scroll grows a yard from dirt to finished garden, season by season.
- **Pizza**: build-your-pie with toppings that fall with physics, and the price adds up.
- **Photographer**: a viewfinder cursor with aperture blades that focus the portfolio image under it.
- **Yoga / pilates**: a breathing circle synced to a 4-7-8 count, with the class schedule below.
- **Auto repair**: an engine exploded view on scroll; tap a part to get a quote.
- **Lawyer / accountant**: understated. The signature is a precise calculator or eligibility checker, not a toy.
- **Pet groomer**: a fluffy dog you brush with the cursor (fur strands in canvas) until it's groomed.
- **Ice cream / dessert**: scoops stack with a wobble physics tower; tap to add flavours.

## Picking one quickly

1. List the 3 most physical, recognisable objects in the business.
2. For each, ask: what is the satisfying verb? (scrub, stack, pour, lift, cut, brush, build)
3. Pick the one that is satisfying, buildable in a day, and works on a phone. That's the signature.
