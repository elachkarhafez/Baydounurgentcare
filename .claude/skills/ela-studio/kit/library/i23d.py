#!/usr/bin/env python3
"""Image → 3D model (GLB) using free Hugging Face Spaces.

Free, but every image-to-3D Space runs on ZeroGPU, which caps anonymous use
almost immediately. With a free HF account token in HF_TOKEN you get a daily
GPU allowance (enough for several models a day; PRO gets ~8x more).

usage: HF_TOKEN=hf_… python3 i23d.py <photo> <out.glb> [--space trellis2|trellis|hunyuan|sf3d] [--max 1024]
Tries the chosen Space, then falls back down the list. Output is packed with
gltf-transform (textures → webp, resized) so it can ship on a site.

Best input: one dish/object, centred, whole thing in frame, plain-ish background
(the Space removes the background). Crop the client's photo to the item first.
"""
import argparse, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def client(space):
    from gradio_client import Client
    tok = os.environ.get("HF_TOKEN")
    try:
        return Client(space, token=tok, verbose=False) if tok else Client(space, verbose=False)
    except TypeError:
        return Client(space, hf_token=tok, verbose=False)


def p(x):
    return x if isinstance(x, str) else (x.get("path") if isinstance(x, dict) else x)


def trellis2(img, tmp):
    from gradio_client import handle_file
    c = client("microsoft/TRELLIS.2")
    try: c.predict(api_name="/start_session")
    except Exception: pass
    pre = p(c.predict(handle_file(img), api_name="/preprocess_image"))
    c.predict(handle_file(pre), 0, "1024", api_name="/image_to_3d")
    g = c.predict(200000, 2048, api_name="/extract_glb")
    return p(g[0] if isinstance(g, (list, tuple)) else g)


def trellis(img, tmp):
    from gradio_client import handle_file
    c = client("trellis-community/TRELLIS")
    try: c.predict(api_name="/start_session")
    except Exception: pass
    pre = p(c.predict(handle_file(img), api_name="/preprocess_image"))
    r = c.predict(handle_file(pre), [], 0, 7.5, 12, 3.0, 12, "stochastic", 0.95, 2048, api_name="/generate_and_extract_glb")
    return p(r[2])


def hunyuan(img, tmp):
    from gradio_client import handle_file
    c = client("tencent/Hunyuan3D-2")
    for name in ("/generation_all", "/shape_generation"):
        try:
            r = c.predict(caption=None, image=handle_file(img), api_name=name)
            files = [p(x) for x in (r if isinstance(r, (list, tuple)) else [r]) if isinstance(p(x), str) and p(x).endswith(".glb")]
            if files: return files[-1]
        except Exception as e:
            last = e
    raise last


def sf3d(img, tmp):
    from gradio_client import handle_file
    c = client("stabilityai/stable-fast-3d")
    r = c.predict(handle_file(img), 0.85, "none", -1, 1024, api_name="/run_button")
    return p(r[1])


SPACES = {"trellis2": trellis2, "trellis": trellis, "hunyuan": hunyuan, "sf3d": sf3d}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("img"); ap.add_argument("out")
    ap.add_argument("--space", default="trellis2", choices=list(SPACES)); ap.add_argument("--max", type=int, default=1024)
    a = ap.parse_args()
    try:
        import gradio_client  # noqa
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gradio_client"], check=True)
    if not os.environ.get("HF_TOKEN"):
        print("note: no HF_TOKEN set, anonymous ZeroGPU quota is tiny and usually already spent", file=sys.stderr)
    order = [a.space] + [k for k in SPACES if k != a.space]
    with tempfile.TemporaryDirectory() as t:
        for name in order:
            try:
                print("trying", name, file=sys.stderr)
                glb = SPACES[name](os.path.abspath(a.img), t)
                from fetch import pack
                os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
                pack(glb, a.out, a.max)
                print(a.out, "via", name); sys.exit(0)
            except Exception as e:
                print(" ", name, "failed:", str(e).splitlines()[0][:200], file=sys.stderr)
    sys.exit("all Spaces failed (quota? add HF_TOKEN)")
