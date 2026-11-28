# Good Riddance reels: refill playbook

The autoposter (`goodriddance/reels/post.sh`, scheduled 5x a day) publishes the next reel in
`goodriddance/reels/queue.json` that isn't on @goodriddancejunkremoval_ yet. Queue and videos are read from the
public GitHub repo (videos via jsDelivr pinned to the commit), so a push to `main` is all it takes to go live.
The Instagram token is injected by the environment's network proxy for graph.facebook.com. Never print or store it.

## When to refill
`COUNT_ONLY=1 bash goodriddance/reels/post.sh` prints `UNPOSTED n`. Refill only when n < 8. Otherwise stop.

## Make the next batch (15 reels)
1. **Trends (5 min).** Web search this week's Instagram Reels formats and hooks (POV, then-and-now, "rate this",
   quiz/guess, countdowns, seasonal moments in the next 3 days). Pick 15 different ideas. Don't repeat an idea or a
   headline already in `queue.json`. Use formats, not other people's videos or copyrighted songs.
2. **Write `goodriddance/render/reels/batch<N>.body.html`** (N = next unused number) by copying the patterns in
   `batch2.body.html`: one `<div class="post reel" data-post id="rXX">` per reel, then `<!--JS-->`, then one paused
   GSAP timeline per reel (`TL.rXX`) and sound cues (`CUES.rXX`), ending with `endTL(...)` and `A.hold(tl, 9-11)`.
   Ids continue from the highest id in `queue.json` (r26, r27, ...). Building blocks in `_helpers.js`: `truck()`,
   `packInto()`, `art(id,w,h)` (item drawings: couch, loveseat, recliner, mattress, boxspring, dresser, table, chairs,
   desk, fridge, washer, tv, boxes, bags, yard, tires, grill, carpet, bike, hottub), `badge()`, `endCard()`, `A.*`.
3. **Build and check the motion.**
   `python3 build2.py <N>` then
   `node .claude/skills/brand-posts/kit/render.mjs batch<N>.html /tmp/b<N> --video --preview`
   and LOOK at every `/tmp/b<N>/rXX-frames.jpg`: no text overlapping text or art, nothing cut off at the edges,
   headlines wrap cleanly, text stays between y 250 and 1670. Fix and re-check.
4. **Final render:** `node .../render.mjs batch<N>.html /tmp/b<N>hq --video --fps 60 --music beat.mp3`
   (beat.mp3 is our own track, made by music.py). Pull one mid frame per reel with ffmpeg and look at it.
5. **Ship:** copy the MP4s to `goodriddance/reels/`, append one entry per reel to `queue.json`
   (`{"id","file","caption"}`; caption = one or two lines in the owner's voice + 4-7 hashtags; first line must be
   unique because the poster matches posted reels by it), commit, `git pull --rebase origin main`, push to `main`.
6. **Verify:** `COUNT_ONLY=1 bash goodriddance/reels/post.sh` shows the new count, then
   `DRY=1 bash goodriddance/reels/post.sh` reports `DRY RUN OK` (do not publish from the refill job).

## Rules
- Real facts only. No prices, service area, reviews, guarantees, hours or phone number (none are public).
  Contact is DM @goodriddancejunkremoval_ or goodriddancesupport@gmail.com.
- Brand only: colours #050505 #fb6308 #f6f6f5 #323131 #5a5959 #c4c4c4 #d8bb94 #965e3c; Saira Black Italic + Montserrat.
- Copy: no em-dash asides, no "not just X", no rule-of-three slogans, no "elevate/curated/crafted/experience/journey".
- Commit trailer: the session's attribution lines. No model names in the repo.
