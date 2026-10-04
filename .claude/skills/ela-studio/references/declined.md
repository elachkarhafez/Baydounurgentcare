# When a business says no: retire the link, keep the work

Use this whenever the user says a business "doesn't want it", "said no", "passed" or anything similar. The user has given standing permission for every step here, so don't ask first: just do it and report back.

The goal is two things:
1. The link with the business's name in it stops working.
2. The site lives on as a generic concept that advertises ElaSystems, at a new neutral link.

## 1. Find what exists

- The site folder in the repo. Check `references/signatures.md` for the folder name.
- The Vercel project. Use `list_projects` with `search: <name>`, then note its `id` and production URL.

## 2. Turn it into a generic concept site

Copy the folder to `demos/<niche-slug>/`, for example `demos/epoxy/` or `demos/coffee-cart/`, and work on the copy.

1. **New brand.** Invent a concept name for the same niche.
   - Web-search it to make sure it isn't a real business in that niche.
   - `curl https://<slug>.vercel.app` should return `DEPLOYMENT_NOT_FOUND`.
   - The name must not echo the real one.
2. **Strip everything that belongs to the real business:**
   - name, logo files, wordmark
   - Instagram handle, website, phone, email, address
   - owner and staff names, real reviews, quotes, press, follower counts, ratings, years in business, awards
   - real listings, menus or prices: replace with plausible sample data and label it "sample"
3. **Replace their photos.** They own those photos, so none of them can stay.
   - Swap in art drawn in code (SVG or canvas), which is the default.
   - Generated images are fine only if you have the means and they're clearly generic.
   - Keep the signature interaction and the scroll story. They're the whole point of the demo.
   - If a piece depended on real assets, redraw it. Examples: real color swatches become procedural textures, a real cart photo becomes the SVG cart.
4. **Point every CTA at ElaSystems:**
   - Booking, quote, call and DM buttons go to `https://www.instagram.com/ela.systems/`, labeled e.g. "Want a site like this? DM @ela.systems".
   - Delete `tel:`, `sms:` and `mailto:` links that went to the old business.
   - Remove the old business's own Instagram, Facebook and Google links.
5. **Mark it as a concept:**
   - A slim top ribbon: "Concept site by ElaSystems · Get one for your business →".
   - The ElaSystems badge (see `boilerplate.md`).
   - A footer line: "<Concept name> is a fictional business. Concept site by ElaSystems; sample content only."
   - Update `<title>`, meta description and og tags.
6. Keep the AI-blocking files and meta tag (`vercel.json`, `robots.txt`, `noai`).
7. **Leftover check.** Grep the new folder for the old name, every word of the handle, the phone digits, the email, the owner's name, the street and every old image filename. Zero hits is required. Also confirm `ls img/` contains none of their photos.

## 3. QA and ship the concept

- Run the QA harness and the signature-interaction test, as for any build.
- Commit and push.
- Deploy as a NEW Vercel project with a neutral name, e.g. `<concept-slug>` or `ela-<niche>-demo`, with root directory `demos/<niche-slug>`.
- Verify the URL is live and that GPTBot gets a 403.
- Add the concept to the `projects` list in `demos/index.html` (the ElaSystems portfolio) with a screenshot at `demos/assets/<slug>.jpg`.

## 4. Kill the old link

- **Pause the old project:** `pause_project` with its id and teamId `team_AYB0SFZ1qQkp6TebSji5xEKA`. This takes the business-name URL offline right away, and it's reversible with `unpause_project`.
- **Confirm it's down:** curl the old URL and check it no longer returns the site.
- **Offer deletion:** to delete the project for good, call `delete_project`. It returns a Vercel dashboard link the user has to click to confirm, so pass that link along. Don't claim the project was deleted.
- **Remove the original files:**
  - `git rm -r <old-folder>`, then commit "Retire <business>: declined".
  - Remind the user once that the files are still in git history, and that making the GitHub repo private keeps them out of view.
- **Update records:** in `references/signatures.md`, mark the row "DECLINED → became <concept name> (<new url>)".

## 5. Hand off

Tell the user:
- the new link
- the new concept name
- that the old link is offline (paused)
- the delete-confirmation link if you generated one
- anything you couldn't make generic and had to cut
