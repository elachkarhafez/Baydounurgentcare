#!/usr/bin/env python3
"""bpe - Blender Performance Engine. Runs bpy scripts / .blend files headless in the cheapest mode that answers
the question, picks the compute device from measurements, and skips work whose inputs have not changed.

  bpe probe [--refresh] [--bench]             hardware + Blender capabilities (cached), device decision
  bpe fetch-blender [--version 4.5]           portable Blender into the cache (sha256-verified)
  bpe assets [--fetch]                        resolve / pre-fetch the assets pinned in blender-perf.json
  bpe run SCRIPT [-m MODE] [opts] -- ARGS     run a bpy script (MODE: ultra | fast | quality | final)
  bpe inspect SCRIPT -- ARGS                  = run -m ultra (no path tracing, scene stats only)
  bpe export SCRIPT -f glb -o out.glb -- ARGS run the script without rendering, export, re-import and validate
  bpe batch JOBS.json [-j N]                  many jobs: cache-skips, shared process for cheap jobs, RAM-safe parallelism
  bpe bench-device SCRIPT -- ARGS             time a real script on every available device config
  bpe compare A.png B.png                     PSNR / pixel diff between two renders
  bpe report [-n 20]                          recent run metrics
Run `bpe <cmd> -h` for options. Python 3.9+, standard library only (numpy + Pillow optional, for compare).
"""
import argparse, concurrent.futures as cf, glob, hashlib, json, os, platform, re, shutil, subprocess, sys, tarfile
import tempfile, time, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
RUNTIME = os.path.join(HERE, 'bpe_runtime.py')
sys.path.insert(0, HERE)
import bpe_assets as A  # noqa: E402

MODES = ('ultra', 'fast', 'quality', 'final')
BACKEND_ORDER = ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL')

def log(*a): print('[bpe]', *a, file=sys.stderr, flush=True)
def sha_text(s): return hashlib.sha256(s.encode()).hexdigest()
def jdump(o): return json.dumps(o, sort_keys=True, default=str)

# ------------------------------------------------------------------------------------------------- config
def deep_merge(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out

def load_config(start):
    cfg = json.load(open(os.path.join(SKILL, 'defaults.json')))
    files, d = [], os.path.abspath(start if os.path.isdir(start) else os.path.dirname(start) or '.')
    while True:
        for name in ('blender-perf.json', os.path.join('.claude', 'blender-perf.json')):
            p = os.path.join(d, name)
            if os.path.isfile(p): files.append(p)
        nd = os.path.dirname(d)
        if nd == d: break
        d = nd
    for p in reversed(files):   # outermost first, so the closest file wins
        c = json.load(open(p)); base = os.path.dirname(p)
        if os.path.basename(base) == '.claude': base = os.path.dirname(base)
        if c.get('blender', {}).get('path'): c['blender']['path'] = os.path.join(base, os.path.expanduser(c['blender']['path']))
        if c.get('preview_dir'): c['preview_dir'] = os.path.join(base, os.path.expanduser(c['preview_dir']))
        if 'assets' in c:
            c['assets']['dirs'] = [os.path.join(base, os.path.expanduser(x)) for x in c['assets'].get('dirs', [])]
            prev = cfg.get('assets', {}).get('dirs', [])
            c['assets']['dirs'] = c['assets']['dirs'] + [x for x in prev if x not in c['assets']['dirs']]
        cfg = deep_merge(cfg, c)
    cfg['_files'] = files
    return cfg

def asset_env(cfg):
    a = cfg.get('assets', {})
    return {'BPE_ASSET_DIRS': os.pathsep.join(a.get('dirs', [])), 'BPE_ASSET_SOURCES': json.dumps(a.get('sources', {}))}

# ------------------------------------------------------------------------------------------------- system + Blender discovery
def _cmd(args, timeout=10):
    try: return subprocess.run(args, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except Exception: return ''

def system_info():
    s = {'os': platform.system(), 'release': platform.release(), 'arch': platform.machine(), 'threads': os.cpu_count(),
         'cpu': platform.processor() or '', 'gpus': []}
    if s['os'] == 'Linux':
        try:
            mi = dict(l.split(':', 1) for l in open('/proc/meminfo') if ':' in l)
            s['ram_gb'] = round(int(mi['MemTotal'].split()[0]) / 1048576, 1)
            s['ram_avail_gb'] = round(int(mi['MemAvailable'].split()[0]) / 1048576, 1)
        except Exception: pass
        m = re.search(r'model name\s*:\s*(.+)', open('/proc/cpuinfo').read()) if os.path.exists('/proc/cpuinfo') else None
        if m: s['cpu'] = m.group(1).strip()
    elif s['os'] == 'Darwin':
        s['ram_gb'] = round(int(_cmd(['sysctl', '-n', 'hw.memsize']) or 0) / 2 ** 30, 1)
        s['cpu'] = _cmd(['sysctl', '-n', 'machdep.cpu.brand_string'])
    elif s['os'] == 'Windows':
        out = _cmd(['wmic', 'ComputerSystem', 'get', 'TotalPhysicalMemory'])
        n = re.findall(r'\d+', out); s['ram_gb'] = round(int(n[0]) / 2 ** 30, 1) if n else None
    if shutil.which('nvidia-smi'):
        for l in _cmd(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader']).splitlines():
            p = [x.strip() for x in l.split(',')]
            if len(p) == 3: s['gpus'].append({'vendor': 'NVIDIA', 'name': p[0], 'vram': p[1], 'driver': p[2]})
    if shutil.which('rocm-smi'):
        for l in _cmd(['rocm-smi', '--showproductname']).splitlines():
            if 'Card series' in l: s['gpus'].append({'vendor': 'AMD', 'name': l.split(':', 2)[-1].strip()})
    if s['os'] == 'Darwin':
        for l in _cmd(['system_profiler', 'SPDisplaysDataType']).splitlines():
            if 'Chipset Model' in l: s['gpus'].append({'vendor': 'Apple/other', 'name': l.split(':', 1)[1].strip()})
    if not s['gpus'] and shutil.which('lspci'):
        for l in _cmd(['lspci']).splitlines():
            if re.search(r'VGA|3D|Display', l): s['gpus'].append({'name': l.split(': ', 1)[-1]})
    s['dri'] = os.path.exists('/dev/dri') if s['os'] == 'Linux' else None
    return s

def _vtuple(s):
    m = re.search(r'(\d+)\.(\d+)(?:\.(\d+))?', s or '')
    return tuple(int(x or 0) for x in m.groups()) if m else (0, 0, 0)

def blender_version(path):
    cache = os.path.join(A.cache_dir(), 'versions.json')
    try: known = json.load(open(cache))
    except Exception: known = {}
    st = os.stat(path); k = f'{os.path.realpath(path)}|{st.st_size}|{st.st_mtime_ns}'
    if k not in known:
        out = _cmd([path, '-b', '--factory-startup', '--version'], timeout=60)
        m = re.search(r'Blender (\d+\.\d+(?:\.\d+)?)', out)
        known[k] = m.group(1) if m else None
        json.dump(known, open(cache, 'w'))
    return known[k]

def blender_candidates(cfg):
    c = []
    if cfg['blender'].get('path'): c.append(cfg['blender']['path'])
    if os.environ.get('BLENDER'): c.append(os.environ['BLENDER'])
    if shutil.which('blender'): c.append(shutil.which('blender'))
    c += sorted(glob.glob(os.path.join(A.cache_dir(), 'blender', '*', 'blender')), reverse=True)
    sysname = platform.system()
    if sysname == 'Darwin':
        c += glob.glob('/Applications/Blender*.app/Contents/MacOS/Blender') + glob.glob(os.path.expanduser('~/Applications/Blender*.app/Contents/MacOS/Blender'))
    elif sysname == 'Windows':
        for root in (os.environ.get('ProgramFiles', r'C:\Program Files'), os.environ.get('LOCALAPPDATA', '')):
            c += glob.glob(os.path.join(root, 'Blender Foundation', 'Blender*', 'blender.exe'))
        c += glob.glob(os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe'))
    else:
        c += ['/snap/bin/blender', '/usr/bin/blender', '/usr/local/bin/blender', '/var/lib/flatpak/exports/bin/org.blender.Blender']
        c += glob.glob('/opt/blender*/blender') + glob.glob(os.path.expanduser('~/blender*/blender'))
    seen, out = set(), []
    for p in c:
        if p and os.path.isfile(p) and os.access(p, os.X_OK) and os.path.realpath(p) not in seen:
            seen.add(os.path.realpath(p)); out.append(p)
    return out

def find_blender(cfg, quiet=False):
    want = _vtuple(cfg['blender'].get('min_version'))
    found = []
    for p in blender_candidates(cfg):
        v = blender_version(p)
        if v: found.append((_vtuple(v), v, p))
        if cfg['blender'].get('path') and p == cfg['blender']['path'] and v: return p, v   # explicit pin wins
    ok = sorted([f for f in found if f[0] >= want], reverse=True)
    if ok: return ok[0][2], ok[0][1]
    msg = ('no Blender >= %s found (looked at $BLENDER, PATH, the bpe cache and standard install paths; saw %s). '
           'Set blender.path in blender-perf.json, export BLENDER=/path/to/blender, or run `bpe fetch-blender`.'
           % (cfg['blender'].get('min_version'), [f[1] for f in found] or 'none'))
    raise SystemExit(msg)

def fetch_blender(series):
    sysname, mach = platform.system(), platform.machine().lower()
    base = f'https://download.blender.org/release/Blender{series}/'
    idx = urllib.request.urlopen(base, timeout=60).read().decode()
    if sysname == 'Linux':
        tag = 'linux-x64.tar.xz' if mach in ('x86_64', 'amd64') else 'linux-arm64.tar.xz'
    elif sysname == 'Windows':
        tag = 'windows-x64.zip' if 'arm' not in mach else 'windows-arm64.zip'
    else:
        raise SystemExit(f'macOS: download the .dmg from {base} (Blender is a signed app bundle; install it in /Applications). bpe finds it there.')
    names = sorted(set(re.findall(r'blender-(\d+\.\d+\.\d+)-' + re.escape(tag), idx)), key=_vtuple)
    if not names: raise SystemExit(f'no {tag} build listed at {base}')
    ver = names[-1]; fname = f'blender-{ver}-{tag}'
    dest_root = os.path.join(A.cache_dir(), 'blender'); os.makedirs(dest_root, exist_ok=True)
    folder = os.path.join(dest_root, fname.rsplit('.tar', 1)[0].rsplit('.zip', 1)[0])
    exe = os.path.join(folder, 'blender.exe' if sysname == 'Windows' else 'blender')
    if os.path.exists(exe): log('already cached:', exe); return exe
    sums = urllib.request.urlopen(base + f'blender-{ver}.sha256', timeout=60).read().decode()
    want = next((l.split()[0] for l in sums.splitlines() if l.strip().endswith(fname)), None)
    log(f'downloading {base + fname}')
    tmp = os.path.join(dest_root, '.part-' + fname)
    with urllib.request.urlopen(base + fname, timeout=600) as r, open(tmp, 'wb') as f: shutil.copyfileobj(r, f, 1 << 20)
    got = A.sha256(tmp)
    if want and got != want: os.remove(tmp); raise SystemExit(f'sha256 mismatch for {fname}; deleted the download')
    log('sha256 ok' if want else 'WARNING: no published sha256 found to verify against')
    if fname.endswith('.zip'): zipfile.ZipFile(tmp).extractall(dest_root)
    else:
        with tarfile.open(tmp) as t:
            if hasattr(tarfile, 'data_filter'): t.extractall(dest_root, filter='tar')   # keeps Blender's symlinks/modes, blocks path escapes
            else: t.extractall(dest_root)
    os.remove(tmp)
    return exe

# ------------------------------------------------------------------------------------------------- launching Blender
def launch(blender, jobs, cfg, threads=None, log_path=None, extra_env=None):
    """One Blender process for a list of jobs. Returns (report dict or None, returncode, wall seconds, log path)."""
    tmpd = os.path.join(A.cache_dir(), 'jobs'); os.makedirs(tmpd, exist_ok=True)
    logs = sorted(glob.glob(os.path.join(tmpd, '*.log')), key=os.path.getmtime)
    for old in logs[:-60]:   # keep the last 60 Blender logs
        try: os.remove(old)
        except OSError: pass
    fd, spec_path = tempfile.mkstemp(dir=tmpd, suffix='.json'); os.close(fd)
    report_path = spec_path[:-5] + '.report.json'
    log_path = log_path or spec_path[:-5] + '.log'
    spec = {'jobs': jobs, 'report': report_path, 'launched_at': time.time()}
    json.dump(spec, open(spec_path, 'w'))
    env = dict(os.environ, BPE_JOB=spec_path, **asset_env(cfg), **(extra_env or {}))
    cmd = [blender, '-b', '--factory-startup', '-noaudio', '--python-exit-code', '1']
    if threads: cmd += ['-t', str(threads)]
    cmd += ['-P', RUNTIME]
    t = time.time()
    with open(log_path, 'w') as lf:
        rc = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, env=env).returncode
    wall = time.time() - t
    rep = json.load(open(report_path)) if os.path.exists(report_path) else None
    for p in (spec_path, report_path):
        try: os.remove(p)
        except OSError: pass
    return rep, rc, wall, log_path

def tail(path, n=25):
    try:
        lines = open(path, errors='replace').read().replace('\r', '\n').splitlines()
        return '\n'.join(l for l in lines[-n:] if l.strip())
    except OSError: return ''

# ------------------------------------------------------------------------------------------------- probe + device decision
def probe(cfg, refresh=False):
    blender, ver = find_blender(cfg)
    sysi = system_info()
    st = os.stat(blender)
    fp = sha_text(jdump([os.path.realpath(blender), st.st_size, st.st_mtime_ns, sysi.get('gpus'), sysi.get('dri'), sysi['threads']]))[:16]
    path = os.path.join(A.cache_dir(), 'probe', fp + '.json')
    if not refresh and os.path.exists(path):
        p = json.load(open(path)); p['system'] = sysi; return p, path
    rep, rc, wall, lp = launch(blender, [{'kind': 'probe'}], cfg)
    if not rep or rep['reports'][0].get('error'):
        raise SystemExit(f'probe failed (exit {rc}); log {lp}:\n{(rep or {}).get("reports", [{}])[0].get("error") or tail(lp)}')
    p = rep['reports'][0]; p['startup_s'] = rep['startup_s']; p['system'] = sysi; p['blender_path'] = blender
    p['headless'] = {}
    for eng in ('workbench', 'eevee'):   # separate processes: a missing GPU context can crash Blender outright
        r, rc, _, elog = launch(blender, [{'kind': 'headless', 'engine': eng}], cfg)
        res = (r or {}).get('reports', [{}])[0]
        p['headless'][eng] = bool(res.get('ok'))
        if not res.get('ok'):
            p['headless'][eng + '_error'] = (res.get('error') or f'exit {rc}: ' + tail(elog, 3))[-200:]
    os.makedirs(os.path.dirname(path), exist_ok=True); json.dump(p, open(path, 'w'), indent=1)
    return p, path

def device_configs(p):
    out = [{'type': 'CPU'}]
    for b in BACKEND_ORDER:
        if p.get('cycles_backends', {}).get(b):
            out.append({'type': 'GPU', 'backend': b}); out.append({'type': 'GPU', 'backend': b, 'hybrid': True})
    return out

def decide_device(cfg, p, ppath, rebench=False):
    want = (cfg.get('device') or 'auto')
    backends = [b for b in BACKEND_ORDER if p.get('cycles_backends', {}).get(b)]
    if want.upper() == 'CPU' or (want == 'auto' and not backends):
        return {'type': 'CPU', 'why': 'no Cycles GPU backend on this machine' if not backends else 'configured'}
    if want.upper() in BACKEND_ORDER:
        if want.upper() in backends: return {'type': 'GPU', 'backend': want.upper(), 'why': 'configured'}
        log(f'device {want} requested but not available here (have {backends or "CPU only"}); using CPU')
        return {'type': 'CPU', 'why': f'{want} unavailable'}
    if want.upper() == 'GPU':
        return {'type': 'GPU', 'backend': backends[0], 'why': 'configured GPU, first available backend'}
    if p.get('device_decision') and not rebench: return p['device_decision']
    blender = p['blender_path']
    jobs = [{'kind': 'bench', 'device': d} for d in device_configs(p)]
    log(f'benchmarking {len(jobs)} device configs once for this machine ...')
    rep, rc, wall, lp = launch(blender, jobs, cfg)
    res = [r for r in (rep or {}).get('reports', []) if not r.get('error')]
    if not res: return {'type': 'CPU', 'why': f'device bench failed, see {lp}'}
    best = min(res, key=lambda r: r['seconds'])
    dec = dict(best['device'], why='fastest in bench', bench={jdump(r['device']): r['seconds'] for r in res})
    p['device_decision'] = dec; json.dump(p, open(ppath, 'w'), indent=1)
    return dec

# ------------------------------------------------------------------------------------------------- incremental cache
def file_sig(p):
    try: st = os.stat(p); return [st.st_size, st.st_mtime_ns]
    except OSError: return None

def same_file(p, rec):
    """rec = [size, mtime_ns, sha]. Size+mtime match -> same; otherwise rehash (survives git checkouts touching mtimes)."""
    sig = file_sig(p)
    if sig is None: return False
    if sig == rec[:2]: return True
    return sig[0] == rec[0] and A.sha256(p) == rec[2]

def record(paths):
    out = {}
    for p in paths:
        if os.path.isfile(p):
            s = file_sig(p); out[p] = s + [A.sha256(p)]
    return out

def script_dir_files(script, exclude):
    d = os.path.dirname(script); out = []
    for e in sorted(os.listdir(d)):
        p = os.path.join(d, e)
        if os.path.isfile(p) and not e.startswith('.') and p not in exclude: out.append(p)
    return out

def static_fp(job, ver):
    parts = [ver, A.sha256(RUNTIME), A.sha256(os.path.join(HERE, 'bpe_assets.py')),
             jdump({k: job.get(k) for k in ('mode', 'preset', 'device', 'region', 'every', 'export', 'args', 'animation', 'fast_primitives')})]
    return sha_text(jdump(parts))

def run_key(job):
    return sha_text(jdump([job.get('script'), job.get('blend'), job.get('args'), job.get('mode'), job.get('region'),
                           job.get('every'), job.get('export'), job.get('animation')]))[:20]

def cache_lookup(job, ver):
    path = os.path.join(A.cache_dir(), 'runs', run_key(job) + '.json')
    if not os.path.exists(path): return None, path
    m = json.load(open(path))
    if m.get('static') != static_fp(job, ver): return None, path
    if not m.get('outputs'): return None, path
    for group in ('inputs', 'outputs'):
        for p, rec in m[group].items():
            if not same_file(p, rec): return None, path
    # new files in the script folder are new potential inputs
    if job.get('script') and set(script_dir_files(job['script'], set(m['outputs']))) - set(m['inputs']): return None, path
    return m, path

def cache_store(job, ver, rep, path, wall):
    outputs = set(rep.get('outputs') or [])
    inputs = set(rep.get('inputs') or [])
    if job.get('script'): inputs |= {job['script']} | set(script_dir_files(job['script'], outputs))
    if job.get('blend'): inputs.add(job['blend'])
    if rep.get('export', {}).get('path'): outputs.add(rep['export']['path'])
    inputs -= outputs
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump({'static': static_fp(job, ver), 'inputs': record(sorted(inputs)), 'outputs': record(sorted(outputs)),
               'wall_s': round(wall, 2), 'at': time.strftime('%Y-%m-%d %H:%M:%S')}, open(path, 'w'), indent=1)

def metric(rec):
    with open(os.path.join(A.cache_dir(), 'metrics.jsonl'), 'a') as f: f.write(json.dumps(rec) + '\n')

def last_metric(key):
    try:
        for l in reversed(open(os.path.join(A.cache_dir(), 'metrics.jsonl')).read().splitlines()):
            r = json.loads(l)
            if r.get('key') == key and not r.get('cached'): return r
    except OSError: pass
    return None

# ------------------------------------------------------------------------------------------------- building + running jobs
DEAD_PATH = re.compile(r"""['"](/(?:tmp|home|Users|var|mnt)[^'"\n]*\.(?:hdr|exr|png|jpe?g|webp|tiff?|ttf|otf|blend|glb|gltf|fbx|obj|usd[acz]?|abc|wav|mp4))['"]""")

def preflight(script):
    """Catch dead absolute asset paths before paying for a launch."""
    try: src = open(script, encoding='utf-8').read()
    except OSError: raise SystemExit(f'script not found: {script}')
    return sorted({m for m in DEAD_PATH.findall(src) if not os.path.exists(m)})

def make_job(a, cfg, dev, caps):
    mode = a.mode or cfg.get('default_mode', 'fast')
    if mode not in MODES: raise SystemExit(f'mode must be one of {MODES}')
    script = os.path.abspath(a.script) if getattr(a, 'script', None) and not a.script.endswith('.blend') else None
    blend = os.path.abspath(a.blend) if getattr(a, 'blend', None) else (os.path.abspath(a.script) if a.script.endswith('.blend') else None)
    key_base = os.path.splitext(os.path.basename(script or blend))[0]
    pdir = a.preview_dir or cfg.get('preview_dir') or os.path.join(A.cache_dir(), 'previews')
    job = {'kind': 'script', 'script': script, 'blend': blend, 'args': list(a.args or []), 'mode': mode,
           'preset': cfg['modes'].get(mode, {}), 'device': {k: v for k, v in dev.items() if k in ('type', 'backend', 'hybrid')},
           'caps': {'workbench': bool(caps.get('workbench')), 'eevee': bool(caps.get('eevee'))},
           'region': [float(x) for x in a.region.split(',')] if getattr(a, 'region', None) else None,
           'every': getattr(a, 'every', None), 'profile': getattr(a, 'profile', False),
           'fast_primitives': bool(cfg.get('fast_primitives', True)) and not getattr(a, 'plain_ops', False),
           'animation': getattr(a, 'animation', False)}
    job['preview_dir'] = os.path.join(pdir, f'{key_base}-{mode}-{run_key(job)[:6]}')
    if getattr(a, 'format', None):
        job['export'] = {'format': a.format, 'path': os.path.abspath(a.out), 'select': a.select.split(',') if a.select else None,
                         'draco': a.draco}
        job['mode'] = 'ultra'; job['preset'] = dict(cfg['modes']['ultra'], thumbnail=False)
    return job

def summarize(job, rep, wall, startup, cached=False, quiet=False):
    name = job.get('script') or job.get('blend') or '?'
    if name.startswith(os.getcwd() + os.sep): name = os.path.relpath(name)
    if cached:
        print(f'{name} {" ".join(job["args"])}  [{job["mode"]}]  cache hit: {len(cached["outputs"])} outputs up to date '
              f'(inputs unchanged since {cached.get("at")}, that run took {cached.get("wall_s")}s)')
        return
    dev = job['device'].get('backend') or job['device']['type']
    rs = [r for r in rep.get('renders', []) if not r.get('skipped')]
    print(f'{name} {" ".join(job["args"])}  [{job["mode"]}, {dev}]  {wall:.1f}s total | startup {startup or 0:.1f}s · '
          f'build {rep.get("build_s", 0):.1f}s · render {rep.get("render_s", 0):.1f}s ({len(rs)} render{"s" * (len(rs) != 1)}'
          f'{", %d skipped" % (len(rep.get("renders", [])) - len(rs)) if len(rep.get("renders", [])) - len(rs) else ""})')
    if quiet: return
    for r in rs:
        ch = '; '.join(r.get('changes', [])[:12])
        print(f'   render {r["call"]}: {r["seconds"]:.1f}s {r["engine"]} {r.get("device", "")} {r["res"][0]}x{r["res"][1]}@{r["res"][2]}% '
              f'{"s=%s " % r.get("samples") if r.get("samples") else ""}{"[" + ch + "]" if ch else ""}')
        for o in r.get('outputs', [])[:3]: print('     ->', o)
        if len(r.get('outputs', [])) > 3: print(f'     -> ... {len(r["outputs"])} files')
    st = rep.get('stats')
    if st:
        print(f'   scene: {st["objects"]} objects, {st["tris"]:,} tris, {st["materials"]} materials, {st["lights"]} lights, '
              f'textures {st["texture_mb"]} MB, depsgraph {st["depsgraph_eval_s"]}s, ~{st["megapixel_samples"]} MP·samples per final frame')
        for h in st['heaviest'][:5]: print(f'     {h["tris"]:>9,} tris  {h["name"]} {" ".join(h["modifiers"])}')
        if st.get('instancing_candidates'): print(f'   tip: {st["instancing_candidates"]} single-user meshes share identical geometry; instance them (linked data / collection instances)')
        if st.get('booleans'): print(f'   note: {st["booleans"]} live boolean modifiers are evaluated on every update')
        if st.get('high_subsurf'): print(f'   note: render subdivision > 2 on {st["high_subsurf"][:6]}')
        if st.get('missing_files'): print(f'   MISSING FILES: {st["missing_files"]}')
        cam = st.get('camera')
        if cam is None: print('   WARNING: scene has no camera')
        elif cam.get('objects_crossing_frame'): print(f'   framing: objects crossing the frame edge: {cam["objects_crossing_frame"][:8]}')
        thumbs = [r['thumbnail'] for r in rep.get('renders', []) if r.get('thumbnail')]
        if thumbs: print('   thumbnail:', thumbs[0])
    for n in rep.get('notes', []): print('   note:', n)
    ex = rep.get('export')
    if ex:
        if ex.get('error'): print('   EXPORT FAILED:', ex['error'][-800:])
        else:
            print(f'   export {ex["format"]} -> {ex["path"]} ({(ex["bytes"] or 0) / 1024:.0f} KB, {ex["export_s"]}s) '
                  f'validation {"PASSED" if ex["ok"] else "FAILED"}: ' + ', '.join(f'{k}={"ok" if v else "MISMATCH"}' for k, v in ex['checks'].items()))
            if not ex['ok']: print('     source:', jdump(ex['source'])); print('     reimported:', jdump(ex['reimported']))
            for w in ex.get('warnings', [])[:8]: print('   export warning:', w)
    if rep.get('profile'): print(rep['profile'])

def execute(jobs, cfg, blender, ver, force=False, threads=None, quiet=False, json_out=False):
    """Run jobs that are not cache hits in one Blender process. Returns list of (job, report|None, ok)."""
    results, todo = [], []
    use_cache = cfg['cache'].get('enabled', True)
    for j in jobs:
        if use_cache and not force and j['mode'] not in cfg['cache'].get('skip_modes', []):
            hit, _ = cache_lookup(j, ver)
            if hit:
                summarize(j, None, 0, 0, cached=hit)
                metric({'ts': time.time(), 'key': run_key(j), 'script': j.get('script'), 'args': j['args'], 'mode': j['mode'], 'cached': True})
                results.append((j, None, True)); continue
        todo.append(j)
    if not todo: return results
    rep, rc, wall, lp = launch(blender, todo, cfg, threads=threads)
    if rep is None and any(j['device'].get('type') == 'GPU' for j in todo):   # crashed (e.g. GPU OOM): one CPU retry
        log(f'Blender exited {rc} without a report on GPU; retrying once on CPU. Log: {lp}')
        for j in todo: j['device'] = {'type': 'CPU'}
        rep, rc, wall2, lp = launch(blender, todo, cfg, threads=threads); wall += wall2
    if rep is None:
        print(f'FAILED: Blender exited {rc} with no report. Last log lines ({lp}):\n{tail(lp)}')
        return results + [(j, None, False) for j in todo]
    per_wall = wall / max(1, len(todo))
    for j, r in zip(todo, rep['reports']):
        ok = not r.get('error') and (not r.get('export') or r['export'].get('ok'))
        if json_out: print(json.dumps(dict(r, startup_s=rep['startup_s'], peak_rss_mb=rep['peak_rss_mb'], wall_s=round(wall, 2)), indent=1))
        else: summarize(j, r, wall if len(todo) == 1 else r.get('job_s', per_wall), rep['startup_s'], quiet=quiet)
        if r.get('error'):
            print('   ERROR in script:\n' + '\n'.join('     ' + l for l in r['error'].strip().splitlines()[-12:]))
        elif use_cache and j['mode'] not in cfg['cache'].get('skip_modes', []) and ok:
            _, mpath = cache_lookup(j, ver); cache_store(j, ver, r, mpath, wall if len(todo) == 1 else r.get('job_s', per_wall))
        metric({'ts': time.time(), 'key': run_key(j), 'script': j.get('script'), 'args': j['args'], 'mode': j['mode'],
                'device': j['device'], 'cached': False, 'ok': ok, 'wall_s': round(wall if len(todo) == 1 else r.get('job_s', per_wall), 2),
                'startup_s': rep['startup_s'], 'build_s': r.get('build_s'), 'render_s': r.get('render_s'),
                'renders': len([x for x in r.get('renders', []) if not x.get('skipped')]), 'peak_rss_mb': rep['peak_rss_mb'],
                'blender': ver, 'shared_process': len(todo) > 1})
        results.append((j, r, ok))
    if rc and not any(not ok for _, _, ok in results): log(f'Blender exited {rc}; log {lp}')
    return results

# ------------------------------------------------------------------------------------------------- commands
def _setup(start, a):
    cfg = load_config(start)
    if getattr(a, 'device', None): cfg['device'] = a.device
    blender, ver = find_blender(cfg)
    p, ppath = probe(cfg)
    dev = decide_device(cfg, p, ppath)
    return cfg, blender, ver, p, dev

def cmd_probe(a):
    cfg = load_config(os.getcwd())
    p, path = probe(cfg, refresh=a.refresh)
    dev = decide_device(cfg, p, path, rebench=a.bench)
    if a.json: print(json.dumps(dict(p, device_decision=dev), indent=1)); return
    s = p['system']
    print(f'system   {s["os"]} {s["arch"]} · {s.get("cpu")} · {s["threads"]} threads · RAM {s.get("ram_gb")} GB ({s.get("ram_avail_gb", "?")} free)')
    print(f'gpus     {", ".join(g["name"] + (" " + g.get("vram", "") if g.get("vram") else "") for g in s["gpus"]) or "none detected"}')
    print(f'blender  {p["blender"]} at {p["blender_path"]} (python {p["python"]}, startup {p.get("startup_s")}s)')
    print(f'cycles   backends {p["cycles_backends"] or "none (CPU only)"} · denoisers {p["denoisers"]}')
    hl = p['headless']
    print(f'headless workbench={"yes" if hl.get("workbench") else "no"} eevee={"yes" if hl.get("eevee") else "no (" + str(hl.get("eevee_error", ""))[:80] + ")"}')
    print(f'export   {", ".join(k for k, v in p["exporters"].items() if v)}')
    print(f'device   {dev.get("backend") or dev["type"]} ({dev.get("why")})' + (f'  bench: {dev["bench"]}' if dev.get('bench') else ''))
    print(f'config   {cfg["_files"] or "defaults only"}')
    print(f'cache    {A.cache_dir()}  (probe {path})')

def cmd_fetch(a):
    print(fetch_blender(a.version or load_config(os.getcwd())['blender'].get('fetch_version', '4.5')))

def cmd_assets(a):
    cfg = load_config(os.getcwd()); os.environ.update(asset_env(cfg))
    srcs = cfg['assets'].get('sources', {})
    print('search dirs:', A._search_dirs())
    for n in sorted(srcs):
        p = A.find(n)
        if not p and a.fetch: p = A.fetch(n, srcs[n])[0]
        print(f'  {"ok " if p else "-- "} {n}  {p or "(not fetched; bpe assets --fetch, or it is fetched on first use)"}')

def cmd_run(a):
    if a.inspect: a.mode = 'ultra'
    start = os.path.dirname(os.path.abspath(a.script))
    cfg, blender, ver, p, dev = _setup(start, a)
    dead = preflight(a.script) if not a.script.endswith('.blend') else []
    if dead:
        log('WARNING: hardcoded paths that do not exist (the run will likely fail):'); [log('   ', d) for d in dead]
        log("    fix: from bpe_assets import asset; asset('<name>') and pin the file under assets.sources")
    job = make_job(a, cfg, dev, p['headless'])
    prev = last_metric(run_key(job))
    if prev and job['mode'] == 'final' and not a.quiet: log(f'last final run of this job took {prev["wall_s"]}s')
    res = execute([job], cfg, blender, ver, force=a.force, threads=a.threads, json_out=a.json)
    if not all(ok for _, _, ok in res): sys.exit(1)

def cmd_batch(a):
    spec = json.load(open(a.jobs)); base = os.path.dirname(os.path.abspath(a.jobs))
    cfg, blender, ver, p, dev = _setup(base, a)
    jobs = []
    for e in spec['jobs']:
        each = e.get('args_each') or [e.get('args', [])]
        for args in each:
            ns = argparse.Namespace(script=os.path.join(base, e['script']), blend=e.get('blend') and os.path.join(base, e['blend']),
                                    args=[str(x) for x in args], mode=e.get('mode', spec.get('mode')), region=e.get('region'),
                                    every=e.get('every'), profile=False, animation=e.get('animation', False),
                                    preview_dir=a.preview_dir, format=None)
            jobs.append(make_job(ns, cfg, dev, p['headless']))
    t0 = time.time()
    shared = [j for j in jobs if j['mode'] in cfg['parallel'].get('share_process_for', [])]
    heavy = [j for j in jobs if j not in shared]
    n = a.jobs_n or spec.get('max_jobs') or cfg['parallel'].get('max_jobs', 'auto')
    if n == 'auto': n = auto_parallel(cfg, heavy, dev)
    n = max(1, int(n))
    threads = max(1, (os.cpu_count() or 1) // n) if n > 1 and dev['type'] == 'CPU' else None
    log(f'{len(jobs)} jobs: {len(shared)} share one process, {len(heavy)} run {n} at a time' + (f' ({threads} threads each)' if threads else ''))
    results = []
    if shared: results += execute(shared, cfg, blender, ver, force=a.force, quiet=True)
    if heavy:
        with cf.ThreadPoolExecutor(max_workers=n) as ex:
            for r in ex.map(lambda j: execute([j], cfg, blender, ver, force=a.force, threads=threads, quiet=True), heavy):
                results += r
    bad = [j for j, _, ok in results if not ok]
    print(f'batch: {len(results) - len(bad)}/{len(results)} ok in {time.time() - t0:.1f}s')
    if bad: sys.exit(1)

def auto_parallel(cfg, jobs, dev):
    """Concurrency from measurements, bounded by RAM (4-core CPU, references/benchmarks.md): final/quality renders
    keep every core busy, and 2 at a time was 7% slower, so they run one at a time. Fast previews spend a larger
    share in single-threaded startup/build/denoise/save, and 2 at a time was 26% faster. GPU jobs: one per device."""
    if not jobs: return 1
    if dev['type'] == 'GPU': return 1
    if all(j['mode'] in ('final', 'quality') for j in jobs): return 1
    sysi = system_info(); avail = sysi.get('ram_avail_gb') or sysi.get('ram_gb') or 4
    peaks = [((last_metric(run_key(j)) or {}).get('peak_rss_mb') or cfg['parallel']['default_job_peak_gb'] * 1024) / 1024 for j in jobs]
    by_ram = int(max(1, (avail - cfg['parallel']['ram_reserve_gb'])) // max(peaks))
    return max(1, min(2, by_ram, (os.cpu_count() or 1) // 2, len(jobs)))

def cmd_bench_device(a):
    start = os.path.dirname(os.path.abspath(a.script))
    cfg, blender, ver, p, _ = _setup(start, a)
    rows = []
    for d in device_configs(p):
        ns = argparse.Namespace(script=a.script, blend=None, args=a.args, mode=a.mode, region=a.region, every=None,
                                profile=False, animation=False, preview_dir=None, format=None)
        job = make_job(ns, cfg, d, p['headless'])
        res = execute([job], cfg, blender, ver, force=True, quiet=True)
        r = res[0][1]
        if r: rows.append((r['render_s'], d))
    for s, d in sorted(rows, key=lambda x: x[0]): print(f'{s:8.2f}s  {d}')
    if len(rows) <= 1: print('only one device config exists on this machine; nothing to choose between')

def cmd_compare(a):
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        raise SystemExit('compare needs numpy and Pillow in the system Python (pip install numpy pillow)')
    x, y = Image.open(a.a), Image.open(a.b)
    if x.size != y.size: raise SystemExit(f'size differs: {x.size} vs {y.size}')
    mode = 'RGBA' if 'A' in x.getbands() + y.getbands() else 'RGB'
    x = np.asarray(x.convert(mode), dtype=np.float64); y = np.asarray(y.convert(mode), dtype=np.float64)
    d = np.abs(x - y); mse = (d ** 2).mean()
    psnr = float('inf') if mse == 0 else 10 * np.log10(255 ** 2 / mse)
    out = {'psnr_db': round(psnr, 2) if psnr != float('inf') else 'identical', 'mean_abs': round(d.mean(), 4),
           'max_abs': int(d.max()), 'pixels_over_2': round(float((d.max(axis=2) > 2).mean() * 100), 3)}
    print(json.dumps(out))
    if a.min_psnr and psnr < a.min_psnr: sys.exit(1)

def cmd_report(a):
    try: rows = [json.loads(l) for l in open(os.path.join(A.cache_dir(), 'metrics.jsonl')).read().splitlines()][-a.n:]
    except OSError: print('no runs recorded yet'); return
    for r in rows:
        name = os.path.basename(r.get('script') or '?')
        if r.get('cached'): print(f'{time.strftime("%m-%d %H:%M", time.localtime(r["ts"]))}  {name} {" ".join(r["args"])} [{r["mode"]}] cache hit'); continue
        print(f'{time.strftime("%m-%d %H:%M", time.localtime(r["ts"]))}  {name} {" ".join(r["args"])} [{r["mode"]}] {r["wall_s"]}s '
              f'(startup {r.get("startup_s")} build {r.get("build_s")} render {r.get("render_s")}, {r.get("renders")} renders, '
              f'peak {r.get("peak_rss_mb")} MB){"" if r.get("ok") else "  FAILED"}')

def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    passthru = []
    if '--' in argv: i = argv.index('--'); argv, passthru = argv[:i], argv[i + 1:]
    ap = argparse.ArgumentParser(prog='bpe', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('probe'); s.add_argument('--refresh', action='store_true'); s.add_argument('--bench', action='store_true'); s.add_argument('--json', action='store_true')
    s = sub.add_parser('fetch-blender'); s.add_argument('--version')
    s = sub.add_parser('assets'); s.add_argument('--fetch', action='store_true')
    for name in ('run', 'inspect', 'export'):
        s = sub.add_parser(name)
        s.add_argument('script', help='bpy script (.py), or a .blend to render/inspect as saved')
        s.add_argument('-m', '--mode', choices=MODES)
        s.add_argument('--blend', help='open this .blend before running the script')
        s.add_argument('--device', help='auto | CPU | GPU | OPTIX | CUDA | HIP | ONEAPI | METAL')
        s.add_argument('--region', help='x0,y0,x1,y1 in 0..1 - render only this part (preview output)')
        s.add_argument('--every', type=int, help='render only every Nth render call (preview frame loops)')
        s.add_argument('--animation', action='store_true', help='.blend only: render the animation instead of a still')
        s.add_argument('--threads', type=int); s.add_argument('--preview-dir')
        s.add_argument('--force', action='store_true', help='ignore the cache'); s.add_argument('--profile', action='store_true')
        s.add_argument('--plain-ops', action='store_true', help='run mesh primitive operators unmodified (no scratch-scene speedup)')
        s.add_argument('--json', action='store_true'); s.add_argument('--quiet', action='store_true')
        if name == 'export':
            s.add_argument('-f', '--format', required=True, choices=('glb', 'gltf', 'fbx', 'obj', 'usd', 'usdc', 'usda', 'stl'))
            s.add_argument('-o', '--out', required=True); s.add_argument('--select', help='comma-separated object name globs')
            s.add_argument('--draco', action='store_true')
        s.set_defaults(inspect=name == 'inspect')
    s = sub.add_parser('batch'); s.add_argument('jobs'); s.add_argument('-j', dest='jobs_n'); s.add_argument('--force', action='store_true')
    s.add_argument('--device'); s.add_argument('--preview-dir')
    s = sub.add_parser('bench-device'); s.add_argument('script'); s.add_argument('-m', '--mode', default='quality', choices=MODES)
    s.add_argument('--region'); s.add_argument('--device')
    s = sub.add_parser('compare'); s.add_argument('a'); s.add_argument('b'); s.add_argument('--min-psnr', type=float)
    s = sub.add_parser('report'); s.add_argument('-n', type=int, default=20)
    a = ap.parse_args(argv); a.args = passthru
    if a.cmd == 'export': a.mode = 'ultra'
    {'probe': cmd_probe, 'fetch-blender': cmd_fetch, 'assets': cmd_assets, 'run': cmd_run, 'inspect': cmd_run,
     'export': cmd_run, 'batch': cmd_batch, 'bench-device': cmd_bench_device, 'compare': cmd_compare,
     'report': cmd_report}[a.cmd](a)

if __name__ == '__main__':
    main()
