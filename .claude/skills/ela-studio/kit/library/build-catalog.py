#!/usr/bin/env python3
"""Rebuild catalog.json: every free asset we can pull for 3D scenes.

Sources (all fetched live, nothing scraped):
  polyhaven  models / textures / hdris   CC0, direct download
  ambientcg  materials, hdris, models…   CC0, direct download (zip)
  sketchfab  downloadable CC0 / CC-BY food + tableware models (metadata only;
             downloading needs SKETCHFAB_TOKEN, CC-BY needs a credit line)

usage: python3 build-catalog.py            # writes catalog.json next to this file
"""
import json, os, sys, urllib.request, urllib.parse, time

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "ela-studio-library/1.0"}


def get(url, tries=4):
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90))
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 ** i)


def polyhaven():
    kinds = {"models": "model", "textures": "texture", "hdris": "hdri"}
    out = []
    for t, kind in kinds.items():
        for aid, a in get(f"https://api.polyhaven.com/assets?t={t}").items():
            out.append({
                "src": "polyhaven", "id": aid, "kind": kind, "name": a.get("name", aid),
                "cats": a.get("categories", []), "tags": a.get("tags", []), "license": "CC0",
                "page": f"https://polyhaven.com/a/{aid}",
                "thumb": f"https://cdn.polyhaven.com/asset_img/thumbs/{aid}.png?width=256",
                "polycount": a.get("polycount"), "dims_mm": a.get("dimensions"),
                "max_res": a.get("max_resolution"),
            })
        print("polyhaven", t, sum(1 for x in out if x["kind"] == kind), file=sys.stderr)
    return out


def ambientcg():
    out, offset = [], 0
    while True:
        d = get("https://ambientcg.com/api/v2/full_json?" + urllib.parse.urlencode(
            {"limit": 250, "offset": offset, "include": "tagData,displayData,downloadData", "sort": "Alphabet"}))
        for a in d["foundAssets"]:
            dl = {}
            folders = a.get("downloadFolders") or {}
            for folder in (folders.values() if isinstance(folders, dict) else folders):
                cats = folder.get("downloadFiletypeCategories") or {}
                for cat in (cats.values() if isinstance(cats, dict) else cats):
                    for f in cat.get("downloads", []):
                        dl[f.get("attribute")] = f.get("fullDownloadPath")
            out.append({
                "src": "ambientcg", "id": a["assetId"], "kind": (a.get("dataType") or "").lower(),
                "name": a.get("displayName") or a["assetId"], "cats": [a.get("displayCategory")] if a.get("displayCategory") else [],
                "tags": a.get("tags", []), "license": "CC0", "page": a.get("shortLink"),
                "thumb": f"https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-PNG/{a['assetId']}.png",
                "method": a.get("creationMethodName"), "downloads": dl,
            })
        offset += 250
        print("ambientcg", len(out), "/", d.get("numberOfResults"), file=sys.stderr)
        if offset >= d.get("numberOfResults", 0) or not d["foundAssets"]:
            break
    return out


SKETCHFAB_QUERIES = [
    "food", "kebab", "kabob", "shawarma", "pita", "hummus", "falafel", "rice", "salad", "bread", "pizza",
    "burger", "fries", "chicken", "steak", "soup", "pasta", "cake", "pastry", "croissant", "donut", "coffee",
    "cup", "mug", "plate", "bowl", "tray", "platter", "cutlery", "fruit", "vegetable", "sandwich", "taco",
    "sushi", "ice cream", "drink", "bottle", "cocktail", "kitchen", "restaurant",
]


def sketchfab():
    seen, out = set(), []
    for q in SKETCHFAB_QUERIES:
        for lic in ("cc0", "by"):
            url = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode(
                {"type": "models", "q": q, "downloadable": "true", "license": lic, "count": 24, "sort_by": "-likeCount"})
            try:
                d = get(url)
            except Exception as e:
                print("sketchfab", q, lic, "ERR", e, file=sys.stderr)
                continue
            for m in d.get("results", []):
                if m["uid"] in seen:
                    continue
                seen.add(m["uid"])
                th = sorted((m.get("thumbnails") or {}).get("images", []), key=lambda i: abs(i.get("width", 0) - 256))
                out.append({
                    "src": "sketchfab", "id": m["uid"], "kind": "model", "name": m.get("name"),
                    "cats": [c.get("name") for c in m.get("categories", [])], "tags": [t.get("name") for t in m.get("tags", [])][:20],
                    "license": (m.get("license") or {}).get("label") or lic.upper(),
                    "author": (m.get("user") or {}).get("displayName"), "page": m.get("viewerUrl"),
                    "thumb": th[0]["url"] if th else None, "polycount": m.get("faceCount"),
                    "query": q, "likes": m.get("likeCount"),
                })
        print("sketchfab", q, len(out), file=sys.stderr)
    return out


if __name__ == "__main__":
    cat = polyhaven() + ambientcg() + sketchfab()
    meta = {"built": time.strftime("%Y-%m-%d"), "count": len(cat),
            "by_source": {s: sum(1 for a in cat if a["src"] == s) for s in ("polyhaven", "ambientcg", "sketchfab")}}
    with open(os.path.join(HERE, "catalog.json"), "w") as f:
        json.dump({"meta": meta, "assets": cat}, f, separators=(",", ":"))
    print(json.dumps(meta))
