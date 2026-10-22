"""Asset resolver shared by the bpe CLI and scripts running inside Blender.

Scripts call asset('studio_small_09_1k.hdr') instead of hardcoding an absolute path. The name is looked up in:
  1. dirs listed in BPE_ASSET_DIRS (os.pathsep separated; `bpe run` fills this from blender-perf.json)
  2. the shared cache (<cache>/assets), where fetched files live
  3. if still missing and a source is pinned in blender-perf.json, it is downloaded once, checked against its
     sha256 and kept in the cache, so every later run (and every project) reuses it.
Works on Blender's bundled Python (3.11) and the system Python; no third-party imports.
"""
import hashlib, json, os, sys, tempfile, urllib.request

def cache_dir():
    base = os.environ.get('BPE_CACHE') or os.path.join(
        os.environ.get('XDG_CACHE_HOME') or os.path.join(os.path.expanduser('~'), '.cache'), 'blender-perf')
    os.makedirs(base, exist_ok=True)
    return base

def sha256(path, buf=1 << 20):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(buf), b''): h.update(chunk)
    return h.hexdigest()

def _search_dirs():
    dirs = [d for d in os.environ.get('BPE_ASSET_DIRS', '').split(os.pathsep) if d]
    return dirs + [os.path.join(cache_dir(), 'assets')]

def _sources():
    raw = os.environ.get('BPE_ASSET_SOURCES')
    if raw:
        try: return json.loads(raw)
        except ValueError: pass
    return {}

def fetch(name, src, dest_dir=None):
    """Download a pinned asset into the cache. src = {"url": ..., "sha256": ... (optional but recommended)}."""
    dest_dir = dest_dir or os.path.join(cache_dir(), 'assets')
    os.makedirs(os.path.join(dest_dir, os.path.dirname(name)) if os.path.dirname(name) else dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, name)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), prefix='.part-')
    os.close(fd); os.chmod(tmp, 0o644)
    try:
        req = urllib.request.Request(src['url'], headers={'User-Agent': 'blender-performance-engine'})
        with urllib.request.urlopen(req, timeout=120) as r, open(tmp, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b: break
                f.write(b)
        got = sha256(tmp)
        if src.get('sha256') and got != src['sha256']:
            raise RuntimeError(f'{name}: sha256 mismatch (expected {src["sha256"]}, got {got}); not using it')
        os.replace(tmp, dest)
        return dest, got
    finally:
        if os.path.exists(tmp): os.remove(tmp)

def find(name):
    """Return the local path for an asset name, or None (never downloads)."""
    if os.path.isabs(name): return name if os.path.exists(name) else None
    for d in _search_dirs():
        p = os.path.join(d, name)
        if os.path.exists(p): return p
    return None

def asset(name):
    """Resolve an asset name to a local path, fetching a pinned source once if needed. Raises with a clear fix."""
    p = find(name)
    if p: return p
    src = _sources().get(name)
    if src:
        print(f'[bpe] fetching asset {name} from {src["url"]}', file=sys.stderr)
        return fetch(name, src)[0]
    raise FileNotFoundError(
        f'asset {name!r} not found in {_search_dirs()} and no source is pinned for it. '
        f'Put the file in one of those dirs, or add {{"url": ..., "sha256": ...}} under assets.sources in blender-perf.json.')
