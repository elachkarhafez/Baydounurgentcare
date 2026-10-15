"""Turn the owner's product spreadsheet (NUTS_NOW_Product_Catalog_*.xlsx, sheet PRODUCTS) into data/catalog.json.

    python3 tools/import_catalog.py /path/to/NUTS_NOW_Product_Catalog.xlsx

Rules (from the spreadsheet's own POLICY sheet):
- Only "PRICE ON PHOTO" rows get a price and can be ordered online. "PRICE NOT VISIBLE", "PRICE CONFLICT" and
  "UNIT NOT SHOWN" rows are listed as "Price in store" and can't be added to the bag.
- Units: lb -> sold by weight in 1/4 lb steps; each/box/bag -> sold by the piece; "2 pieces"/"5 pieces" -> a multipack.
- Stores, hours, pickup and checkout settings are kept from the existing data/catalog.json.
- The spreadsheet's internal columns (source photos, evidence notes) are NOT copied to the website.
"""
import json, re, sys, os, collections
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from image_rules import key_for

# website aisles, in the order shoppers see them
CATS = [
    ("nuts-seeds", "Nuts & Seeds", "Nuts & Seeds", "Roasted at our place in Allen Park. Cashews in more flavors than you'll get through, plus almonds, pistachios, pecans, seeds and mixes."),
    ("candy", "Candy", "Candy", "Gummies, sours, laces, jelly beans and Swedish pick & mix, all by the pound."),
    ("chocolate", "Chocolate", "Chocolate & Confections", "Dubai chocolate, kunafa bars, chocolate-covered nuts and fruit, malt balls and Jordan almonds."),
    ("dried-fruit-dates", "Dried Fruit & Dates", "Dried Fruit & Dates", "Stuffed dates, chili mango, Turkish apricots, raisins and dried fruit by the pound."),
    ("turkish-delight-sweets", "Turkish Delight & Sweets", "Traditional Sweets", "Turkish delight, malban, nougat, halawa and sesame bars."),
    ("ice-cream", "Ice Cream & Frozen", "Frozen Desserts", "Fruit-shaped ice cream, Fruit Riot frozen candy, mochi and more from the freezer."),
    ("cakes-desserts", "Cakes & Desserts", "Bakery & Desserts", "From the fresh counter: cakes, cheesecakes, muffins and brownies."),
    ("snacks", "Savory Snacks", "Savory Snacks", "Vegetable chips, cheese and ketchup snacks, crackers, sesame sticks and snack mixes."),
    ("spices", "Spices", "Spices & Seasonings", "Spices by the pound and in Nuts Now jars: za'atar, sumac, seven spices, shawarma and more."),
    ("pantry", "Baking & Pantry", "Baking & Pantry", "Chocolate chips and buttons, coconut, sprinkles, chia, flax, quinoa and sesame."),
]
SHEET_TO_CAT = {sheet: cid for cid, _, sheet, _ in CATS}

# shopper collections that cut across aisles
COLLECTIONS = [
    ("dubai-chocolate", "Dubai Chocolate", r"dubai|kunafa|kanafa", "The pistachio-kunafa chocolate bars, plus Dubai cheesecake, muffins, dates and ice cream."),
    ("swedish-candy", "Swedish Candy", r"swedish|s-marke|bubs|sgab", "Swedish pick & mix: Bubs, S-Marke, sour skulls and freeze-dried candy."),
    ("sugar-free", "Sugar Free", r"sugar ?free", "Sugar-free candy, sweets and ice cream."),
]

# the home page's picks (by spreadsheet ID), chosen for what people come in for
FEATURED = ["NN-C0272", "NN-C0324", "NN-C0212", "NN-C0387", "NN-C0366", "NN-C0561", "NN-C0218", "NN-C0809",
            "NN-C0599", "NN-C0510", "NN-C0359", "NN-C0380"]

# obvious typos in the working names (the spreadsheet says names are working labels, not approved listings)
FIXES = [
    (r"\bSouer\b", "Sour"), (r"\bSkules\b", "Skulls"), (r"\bSkalls\b", "Skulls"), (r"\bSkalle\b", "Skulls"),
    (r"Pisatchio", "Pistachio"), (r"Pistatios", "Pistachios"), (r"Potatos", "Potato"), (r"Gummys\b", "Gummies"),
    (r"Gummy’s", "Gummies"), (r"Jellys\b", "Jellies"), (r"\bZatar\b", "Za'atar"), (r"\bZaatar\b", "Za'atar"),
    (r"\bZAATAR\b", "Za'atar"), (r"Pomegranate/Ras$", "Pomegranate/Raspberry"), (r"Blueberry&Strawber$", "Blueberry & Strawberry"),
    (r"Raspberry&Lemon", "Raspberry & Lemon"), (r"\bChilli\b", "Chili"), (r"\bSGAB\b|\bSgab\b", "SGAB"),
    (r"Lemonade RL$", "Lemonade Rolls"), (r"Strawberry Rolle$", "Strawberry Rolls"), (r"Kanafa", "Kunafa"),
    (r"Jordgubbs Skulls", "Strawberry Skulls"), (r"Veggie Sur Dansk Skulls", "Veggie Sour Danish Skulls"),
    (r"Veggie Sur Svensk Skulls", "Veggie Sour Swedish Skulls"), (r"\bTACO\b", "Taco"), (r"Brazilian Nut$", "Brazil Nuts"),
    (r"Brazilian Nuts", "Brazil Nuts"), (r"Raw Almond$", "Raw Almonds"), (r"Unsalted Pistachio$", "Unsalted Pistachios"),
    (r"Maple Pecan$", "Maple Pecans"), (r"Split Almond$", "Split Almonds"), (r"Cinnamon Almond$", "Cinnamon Almonds"),
    (r"Mike and Ikes", "Mike and Ike"), (r"Reeses", "Reese's"), (r"M&Ms", "M&M's"), (r"M&M Rainbow Trailmix", "M&M Rainbow Trail Mix"),
]

# shopper-facing sub-aisles: the spreadsheet's working subcategories, merged so each filter chip means something
SUB_MAP = {
    "Cakes, Muffins & Cheesecakes": "Cakes & Cheesecakes", "Packaged Cakes": "Cakes & Cheesecakes", "Packaged Cookies": "Cookies",
    "Sour Laces": "Sour Belts & Laces", "Sour Belts and Laces": "Sour Belts & Laces", "Unclassified Candy": "Bulk Candy",
    "Hard Candy": "Hard Candy & Gumballs", "Gumballs & Hard Candy": "Hard Candy & Gumballs", "Filled Hard Candy": "Hard Candy & Gumballs",
    "Pressed Candy": "Classic & Novelty Candy", "Wax Candy": "Classic & Novelty Candy", "Novelty Candy": "Classic & Novelty Candy",
    "Tamarind Candy": "Classic & Novelty Candy", "Caramel & Candy Apples": "Classic & Novelty Candy", "Mints": "Classic & Novelty Candy",
    "Sugar-Coated Peanuts": "Classic & Novelty Candy", "Sour Candy": "Sour Belts & Laces", "Wrapped Chewy Candy": "Wrapped Candy",
    "Chocolate Covered Nuts": "Chocolate-Covered Nuts", "Yogurt-Covered Fruit": "Chocolate-Covered Fruit", "Specialty Chocolate": "Chocolate Bars",
    "Chocolate Biscuits": "Chocolate Snacks & Pretzels", "Chocolate-Coated Snacks": "Chocolate Snacks & Pretzels",
    "Chocolate-Covered Candy": "Chocolate Snacks & Pretzels", "Coated Pretzels": "Chocolate Snacks & Pretzels",
    "Chocolate Candy@chocolate": "Malt Balls, Turtles & Mixes", "Chocolate Mixes": "Malt Balls, Turtles & Mixes",
    "Chocolate Specialties": "Malt Balls, Turtles & Mixes", "Chocolate Confections": "Malt Balls, Turtles & Mixes",
    "Imported Chocolate": "Imported Chocolate", "Jordan Almonds & Chocolates": "Jordan Almonds",
    "Dates": "Dates & Stuffed Dates", "Stuffed Dates": "Dates & Stuffed Dates", "Raisins": "Raisins & Cranberries",
    "Dried Tropical Fruit": "Dried Fruit", "Pineapple": "Dried Fruit", "Strawberries": "Dried Fruit", "Banana Chips": "Dried Fruit",
    "Apricots": "Dried Fruit", "Individually Wrapped Fruit": "Dried Fruit",
    "Fruit Ice Cream": "Fruit-Shaped Ice Cream", "Frozen Fruit Candy": "Fruit Riot & Frozen Candy",
    "Chocolate Ice Cream": "Chocolate & Specialty", "Frozen Chocolate Fruit": "Chocolate & Specialty", "Specialty Ice Cream": "Chocolate & Specialty",
    "Traditional Ice Cream": "Chocolate & Specialty", "Ice Cream Bars": "Bars, Bites & Mochi", "Ice Cream Bites": "Bars, Bites & Mochi",
    "Mochi Ice Cream": "Bars, Bites & Mochi", "Ice Cream Tubs": "Tubs, Cakes & Puffs", "Frozen Cakes": "Tubs, Cakes & Puffs", "Cream Puffs": "Tubs, Cakes & Puffs",
    "Halva": "Halawa & Nougat", "Nougat": "Halawa & Nougat", "Imported Confections": "Fruit Confections", "Sesame Confections": "Sesame Bars",
    "Rolled & Filled Confections": "Rolled & Filled Sweets",
    "Crackers": "Chips & Crackers", "Cracker Mixes and Peas": "Snack Mixes", "Granola": "Pretzels, Popcorn & Granola",
    "Popcorn": "Pretzels, Popcorn & Granola", "Pretzels": "Pretzels, Popcorn & Granola",
    "Bulk Spices": "Spices by the Pound", "Packaged Spice Bottles": "Nuts Now Spice Jars",
    "Nuts & Trail Mixes": "Mixed Nuts & Trail Mix", "Seeds": "Melon & Egyptian Seeds", "Roasted Legumes": "Chickpeas, Corn & Peas",
    "Coated Chickpeas": "Chickpeas, Corn & Peas", "Coated Peanuts and Chickpeas": "Chickpeas, Corn & Peas", "Corn and Peanuts": "Chickpeas, Corn & Peas",
    "Raw Nuts and Sunflower Seeds": "Brazil Nuts", "Macadamias": "Macadamias & Brazil Nuts", "Brazil Nuts": "Macadamias & Brazil Nuts",
    "Hazelnuts": "Hazelnuts & Walnuts", "Walnuts": "Hazelnuts & Walnuts", "Seeds & Grains": "Seeds & Grains",
}
NAME_SUB = [  # by product name, for the working groups that mixed several kinds
    (r"twizzlers", "Licorice"), (r"gumball", "Hard Candy & Gumballs"), (r"jelly belly|jelly beans", "Jelly Beans"),
    (r"macadamia", "Macadamias & Brazil Nuts"), (r"brazil", "Macadamias & Brazil Nuts"), (r"raw pistachio", "Pistachios"),
    (r"cranberr", "Raisins & Cranberries"), (r"roasted hazelnuts", "Chips & Crackers"),
]

def shop_sub(sub, name, cid):
    low = name.lower()
    for rx, s in NAME_SUB:
        if s == "Raisins & Cranberries" and cid != "dried-fruit-dates": continue
        if re.search(rx, low) and not (cid == "snacks" and s == "Chips & Crackers" and "hazelnut" not in low): return s
    return SUB_MAP.get(f"{sub}@{cid}", SUB_MAP.get(sub, sub))

MULTI = re.compile(r"\s*-\s*\d+\s*for\s*\$[\d.]+\s*$", re.I)

def clean(name):
    n = re.sub(r"\s+", " ", str(name)).strip()
    n = MULTI.sub("", n)
    n = re.sub(r"^Swedish Candy ", "", n)
    n = re.sub(r"([Ff])lavour", r"\1lavor", n)  # US spelling on the site
    n = re.sub(r"^Packaged Nuts Now (.+)$", r"\1 (Nuts Now jar)", n)
    for rx, to in FIXES: n = re.sub(rx, to, n)
    if n == n.lower() or n == n.upper(): n = n.title()
    n = n[0].upper() + n[1:]
    return n

def slug(s):
    s = s.lower().replace("&", " and ").replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def main(xlsx):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    old = json.load(open(os.path.join(ROOT, "data", "catalog.json")))
    rows = [r for r in wb["PRODUCTS"].iter_rows(min_row=6, values_only=True) if r[2]]
    products, used = [], set()
    for cat_sheet, sub, name, price, unit, status, _src, sku, _note in rows:
        cid = SHEET_TO_CAT[cat_sheet]
        nm = clean(name)
        s = slug(nm)
        if s in used: s = f"{s}-{sku[-4:].lower()}"
        used.add(s)
        status = (status or "").strip().upper()
        unit_s = (str(unit).strip().lower() if unit else "")
        p = {"id": sku.lower(), "slug": s, "name": nm, "category": cid, "sub": shop_sub(sub.strip(), nm, cid),
             "img": key_for(name, sub, cat_sheet), "priceCents": None, "sellBy": "weight", "orderable": False}
        if status == "PRICE ON PHOTO" and price is not None and unit_s:
            p["priceCents"] = int(round(float(price) * 100))
            p["orderable"] = True
            if unit_s == "lb":
                p["sellBy"] = "weight"
            else:
                p["sellBy"] = "each"
                m = re.match(r"(\d+)\s*pieces?", unit_s)
                if m: p.update(unit="pack", packSize=int(m.group(1)))
                elif unit_s in ("box", "bag"): p["unit"] = unit_s
                else: p["unit"] = "each"
        else:
            p["priceNote"] = "Price in store"
            if unit_s and unit_s != "lb": p["sellBy"] = "each"
            elif unit_s == "lb": p["sellBy"] = "weight"
            else: p["sellBy"] = "each" if cid in ("ice-cream", "cakes-desserts") else "weight"
        p["mixable"] = p["sellBy"] == "weight" and cid in ("nuts-seeds", "candy", "chocolate", "dried-fruit-dates", "turkish-delight-sweets", "snacks")
        tags = []
        low = nm.lower()
        for cid2, _, rx, _ in COLLECTIONS:
            if re.search(rx, low) or (cid2 == "swedish-candy" and sub.strip() == "Swedish Candy"): tags.append(cid2)
        if re.search(r"spicy|hot|chili|jalape|takis|cajun|buffalo|wasabi|sweet heat", low): tags.append("spicy")
        if tags: p["tags"] = tags
        products.append(p)

    # order: by aisle, then subcategory, then name; featured keep their own list
    cat_order = {c[0]: i for i, c in enumerate(CATS)}
    products.sort(key=lambda p: (cat_order[p["category"]], p["sub"], p["name"]))
    for i, p in enumerate(products): p["order"] = i + 1

    drinks = []
    for r in wb["DRINKS"].iter_rows(min_row=6, values_only=True):
        if r[0] and r[2] is not None:
            drinks.append({"name": {"HI Juice / grouped drinks": "HI juice drinks"}.get(r[1], r[1]).replace("All imported drinks", "Imported drinks").replace("Mini boba drinks", "Mini boba drinks"),
                           "priceCents": int(round(float(r[2]) * 100)), "unit": r[3] or "each"})

    by_cat = collections.Counter(p["category"] for p in products)
    out = {
        "_readme": "Generated by tools/import_catalog.py from the owner's product spreadsheet. Edit the spreadsheet and re-run, or edit prices here directly (priceCents = cents per lb for weight items, per piece/box/pack otherwise). orderable:false items show 'Price in store'.",
        "updated": "2026-10",
        "settings": old["settings"],
        "stores": old["stores"],
        "categories": [{"id": c, "name": n, "description": d, "count": by_cat[c], "order": i + 1} for i, (c, n, _, d) in enumerate(CATS)],
        "collections": [{"id": c, "name": n, "description": d} for c, n, _, d in COLLECTIONS],
        "featured": [s.lower() for s in FEATURED],
        "drinks": drinks,
        "products": products,
    }
    # weights: at most 25 lb of one item online; pieces: at most 40
    out["settings"]["weight"].update({"maxUnitsPerLine": 100})
    out["settings"]["eachMax"] = 40
    # delivery: live courier quotes come from /api/delivery (DoorDash Drive + Uber Direct keys in Vercel env).
    # storeUrls are the shops' own DoorDash / Uber Eats marketplace pages, shown on the store cards once they exist.
    out["settings"]["delivery"] = old.get("settings", {}).get("delivery") or {
        "doordash": {"name": "DoorDash", "storeUrls": {"ap": "", "dh": ""}},
        "ubereats": {"name": "Uber Eats", "storeUrls": {"ap": "", "dh": ""}},
    }
    for st in out["stores"]:
        if st["id"] == "dh": st["address"] = ["26454 Ford Rd", "Dearborn Heights, MI 48127"]; st["tag"] = "In The Heights"
    out["settings"]["checkout"]["unavailableMessage"] = "Online payment isn't switched on yet. Send your order to the shop and pay when you pick it up."
    json.dump(out, open(os.path.join(ROOT, "data", "catalog.json"), "w"), indent=1, ensure_ascii=False)
    n_ord = sum(p["orderable"] for p in products)
    print(f"{len(products)} products, {n_ord} orderable, {len(products) - n_ord} price in store; {len(drinks)} drink groups")
    missing = [s for s in FEATURED if s.lower() not in {p['id'] for p in products if p['orderable']}]
    if missing: print("featured not orderable:", missing)

if __name__ == "__main__":
    main(sys.argv[1])
