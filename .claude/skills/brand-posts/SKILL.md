---
name: brand-posts
description: Make high quality social posts for a brand, as still images and animated videos (feed posts, carousels, reels/stories) with motion and sound, built from the brand's own photos, logo, colors, fonts and words. Use when the user types /brand-posts <brand>, or asks for posts, content, animated posts, reels, promo graphics or "example posts" for a business or brand, including to show a client. Covers finding the brand, pulling real assets, writing the post set, animating, rendering MP4s with sound, QA and delivery.
---

# Brand posts: stills and animated videos from the brand's real assets

`/brand-posts <brand name or website> [what they want]`, for example `/brand-posts Big Wiss Matcha` or `/brand-posts elevatedshots.com 3 reels for the new menu`.

Output: 6 to 8 posts unless the user says otherwise, each as a PNG still **and** an MP4 with motion and sound. The default mix is 6 feed posts (1080×1350) plus 1 or 2 reels (1080×1920). Send everything back in chat with `SendUserFile` (contact sheet first). Speed matters: the user wants something to show a client fast, so aim for 15 to 25 minutes, no pitches or questions unless the brand can't be found.

Everything lives in `kit/`:
- `kit/grab.py`: pulls a website's images, colors, fonts and copy.
- `kit/template.html`: the starting point for a posts page, with the animation helpers.
- `kit/render.mjs`: renders the stills, the videos and the sound mix.
- `kit/snd/`: CC0 sound effects and a CC0 lofi music bed. No credit is needed for any of them.
- `kit/examples/bigwiss.html`: a finished set of 8 posts (7 feed posts and 1 reel), for reference.

## 1. Find the brand (2 min)

1. If the user gave a URL, use it. If they gave a name, check `.claude/skills/ela-studio/references/signatures.md` and the repo folders first: we may have built their site, which means their photos and facts are already here. Otherwise run a web search for their website and Instagram.
2. Run `python3 -I kit/grab.py <url> <scratchpad>/<brand>/`. It writes:
   - `img/`: their photos, renders and logo.
   - `brief.json`: title, description, color tokens, top hex colors, fonts and socials.
   - `text.txt`: their site copy.
   - `assets.jpg`: a labelled contact sheet of every image it downloaded.
3. **Look at `assets.jpg`** and read `text.txt`. Pick the strongest images: product shots, the place, the owner, the cart or truck, food close-ups, the logo.
4. Note the brand system you will use:
   - **Colors:** their CSS tokens, the logo and the colors on their packaging. Never another client's.
   - **Fonts:** their own (`brief.json` `fonts`, loaded from Google Fonts). Use their fonts even when that's Inter, since the brand's own type beats the house ban list. If they have none, pick a pairing that fits the product.
   - **Marks:** the logo file plus any signature detail (Big Wiss: the red heart on the lid, the gold foil script).
5. No website? Ask the user for an Instagram link or a few photos. Instagram itself usually can't be scraped from here. Never invent a brand's look.

## 2. Plan the set (2 min)

Write one line per post: format · idea · the real fact or photo it uses. Cover different jobs, not seven versions of one post:

| Post | What it shows |
| --- | --- |
| Product drop / new item | Hero product photo, name, 2 or 3 real ingredients or details |
| The line-up / menu | Every product in a grid or list with real names (and real prices if they publish them) |
| Book us / catering / services | Their space or cart photo, the real offer, how to book (DM, phone, link) |
| Social proof | A real review or quote with its real credit. Only real quotes, never invented ones |
| Where / when | Next pop-up, hours, location. Only if it's on their site or posts; otherwise "details in our story" |
| Meet the owner / behind the scenes | Their own photo of the person, their own words |
| Engagement | A vote, "what should we drop next", this-or-that. Mark invented options as suggestions in your reply |
| Reel (9:16) | A fast product run (one product per beat), a countdown, or a before/after. 8 to 12 s |

Facts come only from their site and posts. Anything you had to make up (a date, a price, vote options) goes into a bracket-free, natural placeholder in the post, **and you list it in your reply** so the user can check it with the client.

## 3. Build `posts.html` (8 to 12 min)

Copy `kit/template.html` to `<scratchpad>/<brand>/posts.html`, keep the brand's images in `img/` next to it, and build every post as one element:

```html
<div class="post feed" data-post id="p1"> … </div>     <!-- .feed 1080×1350, .square 1080×1080, .reel 1080×1920 -->
```

Design rules:
- **One idea per post.** One big headline in their voice (2 to 6 words), one supporting line, one call to action at most. Text sizes for 1080 px wide: headline 110 to 170 px, support 32 to 40 px, small labels 24 to 30 px. Nothing under 24 px.
- **Their photos carry it.** Use cover crops, slow pushes and soft masks to blend a photo's backdrop into the post color. A cup render on a gradient backdrop takes a radial mask (`-webkit-mask: radial-gradient(ellipse 50% 46% at 50% 50%, #000 62%, transparent 100%)`) so no hard rectangle edge shows.
- **Reels:** keep text inside the middle 1080×1420 (Instagram UI covers the top and bottom ~250 px).
- **Copy:** write like the owner talks. Follow the CLAUDE.md copy rules: no em-dash asides, no "not just X, it's Y", no rule-of-three slogans, no fragment taglines, no "elevate / curated / crafted / experience / journey".
- **No emoji, no gradient washes, no fake UI.** Icons are inline SVG. Credit quotes with the real handle.

## 4. Animate it

Every animated post registers a **paused GSAP timeline** in `TL`, plus optional sound cues in `CUES`. The renderer steps the timeline frame by frame, so motion is perfectly smooth. Never use CSS animations or transitions, because the renderer can't control them.

```js
{ const tl = TL.p1 = gsap.timeline({ paused: true }), p = $('#p1');
  A.zoom(tl, $('[data-zoom]', p), 8);        // slow push on the photo for the whole post
  A.words(tl, $('h1', p), .3);               // headline words rise from a mask
  A.rise(tl, $('p', p), 1.0);                // support line
  A.pop(tl, $$('.pill', p), 1.5);            // chips / stickers pop in
  A.hold(tl, 8);                             // total length 8 s, the finished frame holds
  CUES.p1 = [[.3, 'whoosh', .5], [1.5, 'pop', .6]]; }   // [seconds, kit/snd name or file path, gain]
```

- Helpers in the template: `A.words`, `A.rise`, `A.pop`, `A.wipe` (clip reveal), `A.zoom`, `A.float` (gentle bob), `A.count` (number counts up), `A.hold`.
- Feed posts run 6 to 9 s: build everything in by about 2.5 s, then hold with slow motion (zoom, float) so people can read it.
- Reels run 8 to 12 s: a 1 to 2 s hook, beats about 0.9 s apart, and an end card with the handle or call to action.
- Sounds in `kit/snd`: `whoosh` (headline, transitions), `pop` (chips, hearts, stickers), `flip` (list rows, cards), `drop` (a stack of options), `chime` and `ding` (product lands, end card), `stamp` (a call to action slams in), `impact`, `pour`, `snip`. Keep gains between 0.35 and 0.6.
- A music bed (`kit/snd/loop.mp3`, faded in and out) goes under every video by default. Use `--music none` for silent or `--music <file>` for another track. Only use CC0 or the client's own music.
- Stills are taken at the end of each timeline, so the finished frame is the PNG.

## 5. Render and check

```bash
K=.claude/skills/brand-posts/kit
node $K/render.mjs posts.html out --stills              # PNGs + out/sheet.jpg
node $K/render.mjs posts.html out --video --preview     # fast: out/<id>-frames.jpg motion strips, no mp4
node $K/render.mjs posts.html out --video               # final MP4s with sound (about 30 s per post)
node $K/render.mjs posts.html out --video --only p3,p8  # re-render just the fixed ones
```

Run them in this order:
1. **Check the stills.** Look at `out/sheet.jpg` and fix any overlap, clipped text, hard photo edges, a logo lost on a busy background (put it on a solid disc) or a headline that runs into the product. Re-shoot until it's clean.
2. **Check the motion.** Run `--video --preview` and look at the strips. Check that nothing starts visible when it should animate in, that nothing ends hidden, and that layers stack in the right order.
3. **Render the final MP4s.** Then pull a frame or two with ffmpeg for a last check.

## 6. Deliver

1. Send `sheet.jpg` first, then the PNGs and MP4s, all with `SendUserFile` (`display: "render"`).
2. In the reply, give one line per post naming what it is.
3. List anything invented that needs the client's OK (dates, prices, vote options, quotes to confirm).
4. Offer to swap in their next real date or a new flavor.

Keep the working folder in the scratchpad. Don't commit client post files to the repo unless the user asks.
