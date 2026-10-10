#!/usr/bin/env python3
"""Search catalog.json.

usage: python3 find.py <words…> [--kind model|texture|hdri|material] [--src polyhaven|ambientcg|sketchfab] [--cc0] [-n 30]
e.g.   python3 find.py hammered metal --kind texture
       python3 find.py bowl ceramic --kind model --cc0
"""
import json, os, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("words", nargs="*")
ap.add_argument("--kind"); ap.add_argument("--src"); ap.add_argument("--cc0", action="store_true")
ap.add_argument("-n", type=int, default=30); ap.add_argument("--json", action="store_true")
a = ap.parse_args()
cat = json.load(open(os.path.join(HERE, "catalog.json")))["assets"]
words = [w.lower() for w in a.words]


def score(x):
    name = (x.get("name") or "").lower(); idl = x["id"].lower()
    tags = " ".join(t.lower() for t in (x.get("tags") or []) if t)
    cats = " ".join(c.lower() for c in (x.get("cats") or []) if c)
    s = 0
    for w in words:
        hit = 0
        if w in name or w in idl: hit = 3
        elif w in tags.split() or w in cats: hit = 2
        elif w in tags or w in cats: hit = 1
        if not hit: return 0
        s += hit
    return s + (x.get("likes") or 0) / 1e5


rows = []
for x in cat:
    if a.kind and x["kind"] != a.kind: continue
    if a.src and x["src"] != a.src: continue
    if a.cc0 and x.get("license", "").upper() not in ("CC0", "CC0 PUBLIC DOMAIN"): continue
    s = score(x) if words else 1
    if s: rows.append((s, x))
rows.sort(key=lambda r: -r[0])
if a.json:
    print(json.dumps([x for _, x in rows[: a.n]], indent=1))
else:
    for s, x in rows[: a.n]:
        extra = f"{x['polycount']} polys" if x.get("polycount") else (x.get("method") or "")
        print(f"{x['src']}:{x['id']:<34} {x['kind']:<9} {x.get('license',''):<10} {x['name'][:40]:<40} {extra}")
    print(f"-- {len(rows)} matches (showing {min(len(rows), a.n)})", file=sys.stderr)
