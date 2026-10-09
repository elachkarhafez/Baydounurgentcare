# Nuts Now online ordering

How the ordering on nutsnow-combined works, how to keep it up to date, and what is still to do.

## What's built

- **Shop by aisle** (`#order`): six aisles (Nuts, Seeds, Dried fruit, Sweets, Chocolate, Candy) and 28 items sold loose by weight. Each card shows a picture, name, description, price per lb (or "Price coming soon") and a − / + amount control, then **Add to basket** or **Add to my mix**.
- **Roaster**: pick a nut (cashews, pistachios or hazelnuts) and an amount (¼ to 1 lb), hold Roast, and pour the batch into the jar. The batch goes into the mix as that product at that weight. The roast colour is only for show.
- **Mix builder** (the jar): pour any mixable items in ¼, ½ or 1 lb scoops, then fine-tune each item with − / + or remove it. It shows each item's price per lb and subtotal, plus the total weight and mix subtotal. **Add mix to basket** seals the jar and adds it as one basket line ("Mix #1") with its items listed. Mixes are never merged together. **Edit this mix** in the basket loads it back into the jar, with **Save changes** / **Cancel editing**. An unfinished jar is kept and restored afterwards.
- **Basket** (the Basket button in the nav). It holds:
  - regular items (adding the same product twice adds to one line) and mixes
  - editable amounts, remove buttons, and an itemised breakdown of each mix
  - the subtotal, plus warnings for price changes and unavailable items
  - persistence in the browser across reloads
- **Pickup**: choose a shop, a day (today or tomorrow) and a time. Times are worked out in the store's time zone with the prep time, the last-pickup cutoff and any closures applied.
- **Server check** (`api/quote.js`): re-prices the basket from `data/catalog.json` with the server clock and re-checks the pickup time. It never trusts the browser's total. If the browser's total is different, the customer is told prices changed.
- **Payment**: not connected. The "Pay with DoorDash" button is disabled and says so. Customers can copy the order, send it on Instagram, or call. That text says "not paid yet". No order is stored anywhere and nothing is shown as paid.

## Files

| File | What it does |
|---|---|
| `data/catalog.json` | **The file the owner edits.** Products, prices, pictures, aisles, store hours, pickup rules, checkout switch. |
| `js/order-core.js` | All pricing, amount rules and pickup-time logic, shared by the page and the server. |
| `api/quote.js` | Vercel function: `POST /api/quote` re-prices a basket and re-checks pickup. |
| `index.html` | The page: the roaster's nut/amount pick, the jar mix builder, the `#order` shop, the basket dialog and pickup. Hours in the Visit section now come from the catalog too. |
| `tests/core.test.js` | Unit tests (pricing, rounding, validation, pickup cutoffs, DST, the API handler). |
| `tests/e2e.mjs`, `tests/serve.js` | Browser tests of the full journeys, plus a local server that runs the API. |

## Keeping it up to date (owner)

Everything is in **`data/catalog.json`**. Edit it on GitHub (pencil icon) and commit. The site redeploys with the change.

- **Price**: set `"priceCents"` on the product, in cents per lb. For example `1299` = $12.99/lb. `null` means "Price coming soon" (weighed and priced at the counter).
- **Out of stock**: `"available": false`. The card shows "Not available right now" and the item can't be ordered.
- **Mix or not**: `"mixable": true/false`.
- **Amount rules**: per product `"minUnits"`, `"stepUnits"`, `"maxUnits"`, where 1 unit = ¼ lb. The store-wide defaults are in `settings.weight` (minimum ¼ lb, steps of ¼ lb, at most 100 lb per line) and `settings.mix` (`minTotalUnits` for the whole mix).
- **Items sold by the piece**: `"sellBy": "each"` with `"priceCents"` per piece. These can't go in a mix.
- **New product**: copy an existing entry and give it a new `"id"`, `"category"`, `"name"`, `"description"` and `"order"`.
- **Aisles**: the `categories` list (id, name, description, order).
- **Photos**: put the photos in `img/products/<product-id>/`. Export them as WebP or JPG, about 1200 px wide, with the product filling the frame. Then set `"images"`:
  `[{"src": "img/products/cashews/1.webp", "alt": "Roasted cashews in the bin", "kind": "photo", "width": 1200, "height": 900}]`
  - `kind: "photo"` shows the picture full-bleed.
  - Extra entries show as dots under the main picture.
  - An optional `"srcset"` gives responsive sizes.
  - The current pictures are 3D illustrations (`kind: "illustration"`). Swap them as real photos arrive. If a picture fails to load, the card says "Photo coming soon".
- **Hours and pickup**: `stores[].hours` uses day numbers (0 = Sunday) with `open`, `close` and `lastPickup` as "HH:MM" in 24-hour time. `settings.pickup` holds:
  - `timeZone`
  - `prepMinutes` (minimum time between ordering and pickup)
  - `slotMinutes` (time-slot spacing)
  - `daysAhead` (2 = today and tomorrow)
  - `closures` (dates like `"2026-12-25"`; a store can also have its own `closures`)

Because the catalog lives in the repository, only people with access to the GitHub repo can change prices. There is no public upload or admin page.

## Rules and how they're enforced

- Weights are whole units of ¼ lb. Prices are whole cents. Each line is priced on its own as price per lb × units ÷ 4, rounded half-up to the cent. Mix and basket subtotals add up the rounded lines. Nothing is averaged, and no product is ever priced at another product's rate.
- Pickup times run from opening time to `lastPickup` inclusive. The first time offered is the first slot at least `prepMinutes` from now. With the defaults:
  - At Dearborn Heights the last pickup is 9 PM. 9:15 PM and later are never offered or accepted.
  - An order placed at 8:45 PM gets no same-day time and is offered tomorrow from 9 AM.
  - The 9 PM limit is on pickup time, not on when the order is placed.
- The server repeats every check. Unknown or unavailable products, bad amounts (zero, negative, fractional, over the max), a pickup time outside the rules, or a mismatched total all fail the check with a plain-English reason.

## Business rules to confirm

1. **Allen Park last pickup.** The brief gives 9 AM–10 PM and a 9 PM last pickup, which matches Dearborn Heights. Allen Park's published hours are Mon–Sat 10 AM–9 PM and Sun 10 AM–8 PM, so its last pickup is set to closing time (9 PM, 8 PM Sun). Change `lastPickup` if it should be earlier.
2. **Prep time.** 30 minutes (`prepMinutes`) is a placeholder.
3. **Quarter-pound rule.** It's set per product (each item at least ¼ lb, in ¼ lb steps) and the whole mix is at least ¼ lb. Both are configurable.
4. **Prices.** None are in the catalog yet. Until they are, everything shows "Price coming soon" and online payment can't happen even once a provider is connected.

## DoorDash (not started, by request)

Payment is switched off through `settings.checkout` (`provider: null`, `enabled: false`). Connecting it later means:

- adding a server function that rebuilds the basket from `api/quote` output and creates the provider's checkout session
- setting `provider` and `enabled: true`

Before building it, confirm the merchant actually has Storefront API access. Also confirm how ¼ lb amounts and mixes can be represented on the DoorDash menu (variants or modifiers). DoorDash quantities are whole items. Until then the site never takes payment or calls an order paid.

## Running the tests

```bash
cd nutsnow-combined
node --test tests/*.test.js                                   # unit + API tests
node tests/serve.js 8790 &                                     # real catalog
node tests/make-test-catalog.js /tmp/nn-test.json
node tests/serve.js 8791 /tmp/nn-test.json 2026-10-14T20:50:00Z &   # test prices + fixed clock
node tests/e2e.mjs /tmp/e2e                                    # browser journeys, desktop + phone
```
`make-test-catalog.js` writes **illustrative** test prices to a temp file only. Never put test prices in `data/catalog.json`.
