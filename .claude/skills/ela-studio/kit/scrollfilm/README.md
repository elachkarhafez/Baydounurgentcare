# ScrollFilm: the house standard for Apple-style sites

The user's standard (from now on, every site): **clean Apple-style animation, Blender-rendered 3D animation driven by scroll, professional like Apple and top creator sites, consistent from site to site.** No gimmicks (toys, mini-games), no bland template pages.

## Page anatomy (use it every time, adapt the content)
1. **Thin translucent nav**: logo, 3–4 links, one pill CTA. Turns solid after the film.
2. **Pinned film hero** (`<section class="film">` ~420–480vh, sticky 100svh stage, `<canvas>`): a Blender/Cycles sequence (120–180 frames, 1280×720, webp q74–80) that tells the product story in 3 beats. Opening card (H1, one line, CTA) fades out as the camera moves; each beat gets one big caption (heading + one line) in the frame's negative space, fading/blurring in and out.
3. **Scale-up media** (`ScrollGrow`): the business's best real photo grows to full width with easing corners.
4. **Statement** (`ScrollWords`): one honest sentence that lights up word by word.
5. **Feature bento**: 3–5 tiles mixing render stills from the film and real photos, big type, short copy.
6. **Simple steps / info**, then a **centered CTA** with the phone/booking, then footer.

## Rules
- Plan the render around the story the page tells; script it with `render/<name>.py`, preview with the blender-performance-engine (`bpe run -m quality` on 5 key frames), then `-m final`.
- Leave negative space in the frames for captions. Dark, studio-lit, few strong light lines.
- Phones: `mobileStep: 2` (half the frames), `focus` keyframes so the subject stays in the crop.
- Keep motion compositor-friendly: no backdrop-filter or animated noise over the canvas.
- Measure smoothness with a scripted wheel scroll (target ≈16.7 ms/frame avg and p95) before shipping.
- The bar: any frame of the film should pass as an ad still. Look at full-res test frames, not just 50% previews; seams and blotches show up only at 100%.

## Render lessons
- Thin procedural lines (rings, scratches) at 24–32 spp get smeared by OIDN into blotches. Show surface states with smooth material changes instead (roughness, anisotropy, coat), which denoise cleanly. Heumans' "before vs after" is a hazy blurred reflection turning into a crisp mirror line (`heumans/render/paint.py`).
- Voronoi-cell tangent fields leave visible cell seams (it looks like hammered metal). For anisotropy, use a smooth noise-driven direction projected onto the surface.
- Mix two BSDFs by an animated mask for state changes, so the "after" frames stay identical when you retune the "before" look and you only re-render the frames that changed.
- A black world for camera rays (LightPath "Is Camera Ray"), plus long thin area strips, gives the Apple product-film look on glossy subjects.
- Check every caption against the frames it sits on (screenshot the page at three scroll points, desktop and phone). If the subject rises into the caption band, shorten that caption to a headline and a CTA, or end it before the camera moves. Don't box it.
