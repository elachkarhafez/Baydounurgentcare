#!/usr/bin/env python3
"""Download one catalog asset into a site, web-ready.

usage: python3 fetch.py <src:id> <outdir> [--res 1k|2k|4k] [--max 1024]
  --web 512          convert texture maps to <=512px webp (what sites should ship)
  polyhaven model    → <outdir>/<id>.glb           (packed, textures → webp, resized to --max)
  polyhaven texture  → <outdir>/<id>/{color,normal,rough,ao,disp,arm}.jpg
  polyhaven hdri     → <outdir>/<id>_<res>.hdr
  ambientcg material → <outdir>/<id>/{color,normal,rough,ao,disp,metal}.jpg
  sketchfab model    → <outdir>/<id>.glb           (needs SKETCHFAB_TOKEN; CC-BY → add a credit line)
  image-to-3D        → see i23d.py

Normal maps are OpenGL-style (what three.js expects).
"""
import json, os, sys, shutil, subprocess, tempfile, urllib.request, zipfile, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "ela-studio-library/1.0"}
NODE = os.environ.get("LIB_NODE", "/tmp/ela-lib-node")


def gt():
    b = os.path.join(NODE, "node_modules/.bin/gltf-transform")
    if not os.path.exists(b):
        os.makedirs(NODE, exist_ok=True)
        subprocess.run("npm init -y >/dev/null 2>&1 && npm i -s @gltf-transform/cli@4 >/dev/null 2>&1", shell=True, cwd=NODE, check=True)
    return b


def dl(url, path, headers=None, tries=5):
    import time
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(headers or {})}), timeout=180) as r, open(path, "wb") as f:
                shutil.copyfileobj(r, f)
            return path
        except Exception:
            if i == tries - 1: raise
            time.sleep(3 * 2 ** i)


def api(url, headers=None):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(headers or {})}), timeout=60))


def pack(src_gltf, out_glb, maxpx):
    g = gt()
    tmp = out_glb + ".tmp.glb"
    subprocess.run([g, "copy", src_gltf, tmp], check=True, capture_output=True)
    subprocess.run([g, "resize", tmp, tmp, "--width", str(maxpx), "--height", str(maxpx)], check=True, capture_output=True)
    subprocess.run([g, "webp", tmp, tmp, "--quality", "86"], check=True, capture_output=True)
    subprocess.run([g, "prune", tmp, tmp], check=True, capture_output=True)
    os.replace(tmp, out_glb)
    return out_glb


PH_MAPS = {"Diffuse": "color", "nor_gl": "normal", "Rough": "rough", "AO": "ao", "Displacement": "disp", "arm": "arm"}
ACG_MAPS = {"_Color": "color", "_NormalGL": "normal", "_Roughness": "rough", "_AmbientOcclusion": "ao", "_Displacement": "disp", "_Metalness": "metal", "_Opacity": "opacity"}


def polyhaven(aid, kind, out, res, maxpx):
    files = api(f"https://api.polyhaven.com/files/{aid}")
    if kind == "hdri":
        return dl(files["hdri"][res]["hdr"]["url"], os.path.join(out, f"{aid}_{res}.hdr"))
    if kind == "texture":
        got = []
        for k, name in PH_MAPS.items():
            f = (files.get(k) or {}).get(res, {}).get("jpg") or (files.get(k) or {}).get(res, {}).get("png")
            if f: got.append(dl(f["url"], os.path.join(out, aid, name + os.path.splitext(f["url"])[1])))
        return got
    g = files["gltf"][res]["gltf"]
    with tempfile.TemporaryDirectory() as t:
        main = dl(g["url"], os.path.join(t, os.path.basename(g["url"])))
        for rel, f in g.get("include", {}).items():
            dl(f["url"], os.path.join(t, rel))
        return pack(main, os.path.join(out, f"{aid}.glb"), maxpx)


def ambientcg(aid, entry, out, res):
    key = {"1k": "1K-JPG", "2k": "2K-JPG", "4k": "4K-JPG"}[res]
    url = (entry.get("downloads") or {}).get(key) or f"https://ambientcg.com/get?file={aid}_{key}.zip"
    got = []
    with tempfile.TemporaryDirectory() as t:
        z = dl(url, os.path.join(t, "a.zip"))
        with zipfile.ZipFile(z) as zf:
            for n in zf.namelist():
                for suf, name in ACG_MAPS.items():
                    if suf in n and n.lower().endswith((".jpg", ".png")):
                        p = os.path.join(out, aid, name + os.path.splitext(n)[1].lower())
                        os.makedirs(os.path.dirname(p), exist_ok=True)
                        with zf.open(n) as s, open(p, "wb") as d: shutil.copyfileobj(s, d)
                        got.append(p)
    return got


def sketchfab(uid, out, maxpx):
    tok = os.environ.get("SKETCHFAB_TOKEN")
    if not tok:
        sys.exit("sketchfab downloads need SKETCHFAB_TOKEN (free account → Settings → Password & API → API token)")
    d = api(f"https://api.sketchfab.com/v3/models/{uid}/download", {"Authorization": f"Token {tok}"})
    with tempfile.TemporaryDirectory() as t:
        if d.get("glb"):
            src = dl(d["glb"]["url"], os.path.join(t, "m.glb"))
        else:
            z = dl(d["gltf"]["url"], os.path.join(t, "m.zip"))
            zipfile.ZipFile(z).extractall(t)
            src = next(os.path.join(r, f) for r, _, fs in os.walk(t) for f in fs if f.endswith(".gltf"))
        return pack(src, os.path.join(out, f"{uid}.glb"), maxpx)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ref"); ap.add_argument("out")
    ap.add_argument("--res", default="1k"); ap.add_argument("--max", type=int, default=1024)
    ap.add_argument("--web", type=int, default=0)
    a = ap.parse_args()
    src, aid = a.ref.split(":", 1)
    cat = json.load(open(os.path.join(HERE, "catalog.json")))["assets"]
    entry = next((x for x in cat if x["src"] == src and x["id"] == aid), None)
    if not entry: sys.exit(f"{a.ref} not in catalog.json (run find.py)")
    if src == "polyhaven": r = polyhaven(aid, entry["kind"], a.out, a.res, a.max)
    elif src == "ambientcg": r = ambientcg(aid, entry, a.out, a.res)
    elif src == "sketchfab": r = sketchfab(aid, a.out, a.max)
    else: sys.exit("unknown source")
    if a.web and isinstance(r, list):
        from PIL import Image
        out = []
        for f in r:
            im = Image.open(f); im = im.convert("RGB") if im.mode not in ("RGB", "L") else im
            im.thumbnail((a.web, a.web), Image.LANCZOS)
            w = os.path.splitext(f)[0] + ".webp"; im.save(w, quality=90 if "normal" in f else 84); os.remove(f); out.append(w)
        r = out
    print(json.dumps({"ref": a.ref, "license": entry.get("license"), "author": entry.get("author"), "page": entry.get("page"), "files": r}, indent=1))
