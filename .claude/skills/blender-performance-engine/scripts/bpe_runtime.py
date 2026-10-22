"""Runs inside Blender:  blender -b --factory-startup --python-exit-code 1 -P bpe_runtime.py
The bpe CLI writes a job file and points $BPE_JOB at it. Never edit user scripts to use it: the runtime executes them
unchanged and intercepts their bpy.ops.render.render calls, which is where the execution mode takes effect.

Job kinds:
  script  run a bpy script (optionally after opening a .blend), applying the mode at each render call
  probe   report Blender version, engines, Cycles backends/devices, headless engine support, exporters
  bench   time a small built-in Cycles scene on one device config (used to pick CPU vs GPU backends)
Several jobs can share one Blender process (cheap jobs, e.g. ultra inspections) - see `bpe batch`.
"""
import bpy, builtins, cProfile, fnmatch, io, json, math, os, pstats, sys, tempfile, time, traceback, types

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path: sys.path.insert(0, HERE)   # so user scripts can `from bpe_assets import asset`
T_PROC = time.time()

def _peak_rss_mb():
    try:
        import resource
        r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return round(r / (1 << 20) if sys.platform == 'darwin' else r / 1024, 1)
    except Exception:
        return None

# ---------------------------------------------------------------------------------------------- setting helpers
class Changes(list):
    """Log of setting changes that can be undone, so a script rendering several times in one process gets the mode
    applied to its own values each time (not compounded) and is left exactly as it set itself up."""
    def __init__(self): super().__init__(); self.undo = []
    def restore(self):
        for obj, attr, old in reversed(self.undo):
            try: setattr(obj, attr, old)
            except Exception: pass
        self.undo.clear()

def _set(obj, attr, value, log, rule='set'):
    """Version-safe property change. rule: set | min (never raise a value) | max (never lower it) | scale."""
    if obj is None or not hasattr(obj, attr): return
    old = getattr(obj, attr)
    new = value
    if rule == 'min': new = min(old, value)
    elif rule == 'max': new = max(old, value)
    elif rule == 'scale': new = max(1, int(round(old * value)))
    if new == old: return
    try:
        setattr(obj, attr, new); log.append(f'{attr}: {old} -> {new}')
        if isinstance(log, Changes): log.undo.append((obj, attr, old))
    except (TypeError, ValueError) as e:
        log.append(f'{attr}: unchanged ({e})')

CYCLES_CAPS = {   # preset key -> (property, rule)
    'samples': ('samples', 'min'), 'adaptive_threshold': ('adaptive_threshold', 'max'),
    'max_bounces': ('max_bounces', 'min'), 'diffuse_bounces': ('diffuse_bounces', 'min'),
    'glossy_bounces': ('glossy_bounces', 'min'), 'transmission_bounces': ('transmission_bounces', 'min'),
    'transparent_max_bounces': ('transparent_max_bounces', 'min'), 'volume_bounces': ('volume_bounces', 'min'),
    'blur_glossy': ('blur_glossy', 'max'), 'denoising_prefilter': ('denoising_prefilter', 'set'),
    'denoising_quality': ('denoising_quality', 'set'), 'texture_limit_render': ('texture_limit_render', 'set'),
}
EEVEE_CAPS = {
    'taa_render_samples': ('taa_render_samples', 'min'), 'use_raytracing': ('use_raytracing', 'set'),
    'shadow_ray_count': ('shadow_ray_count', 'min'), 'shadow_step_count': ('shadow_step_count', 'min'),
    'volumetric_samples': ('volumetric_samples', 'min'), 'use_shadows': ('use_shadows', 'set'),
}

def eevee_id():
    items = bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()
    return 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in items else 'BLENDER_EEVEE'

def apply_device(scene, dev, log):
    """dev = {"type": "CPU"} or {"type": "GPU", "backend": "OPTIX"|"CUDA"|"HIP"|"ONEAPI"|"METAL", "hybrid": bool}.
    Preferences are set at render time because scripts often call read_factory_settings, which resets them."""
    cy = scene.cycles
    if dev.get('type') != 'GPU':
        _set(cy, 'device', 'CPU', log); return
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = dev['backend']
    prefs.refresh_devices()
    used = []
    for d in prefs.devices:
        d.use = d.type == dev['backend'] or (d.type == 'CPU' and bool(dev.get('hybrid')))
        if d.use: used.append(d.name)
    if not any(d.use and d.type != 'CPU' for d in prefs.devices):
        log.append(f'no {dev["backend"]} device found at render time; staying on CPU')
        _set(cy, 'device', 'CPU', log); return
    _set(cy, 'device', 'GPU', log)
    _set(cy, 'denoising_use_gpu', True, log)
    log.append('devices: ' + ', '.join(used))

def apply_mode(scene, mode, preset, log):
    """Preview modes cap cost; final leaves every quality setting exactly as the script set it."""
    r = scene.render
    if mode == 'final' or not preset: return
    if preset.get('resolution_scale'): _set(r, 'resolution_percentage', preset['resolution_scale'], log, 'scale')
    if preset.get('persistent_data'): _set(r, 'use_persistent_data', True, log)
    simp = preset.get('simplify')
    if simp:
        _set(r, 'use_simplify', True, log)
        if 'subdivision' in simp: _set(r, 'simplify_subdivision_render', simp['subdivision'], log, 'min')
        if 'child_particles' in simp: _set(r, 'simplify_child_particles_render', simp['child_particles'], log, 'min')
        if 'volumes' in simp: _set(r, 'simplify_volumes', simp['volumes'], log, 'min')
    if r.engine == 'CYCLES':
        cy = scene.cycles; c = preset.get('cycles', {})
        for k, (prop, rule) in CYCLES_CAPS.items():
            if k in c: _set(cy, prop, c[k], log, rule)
        if c.get('caustics') is False:
            _set(cy, 'caustics_reflective', False, log); _set(cy, 'caustics_refractive', False, log)
        if c.get('clamp_indirect') and getattr(cy, 'sample_clamp_indirect', 1) == 0:
            _set(cy, 'sample_clamp_indirect', c['clamp_indirect'], log)
        if c.get('denoise'): _set(cy, 'use_denoising', True, log)
    elif r.engine.startswith('BLENDER_EEVEE'):
        ev = scene.eevee; e = preset.get('eevee', {})
        for k, (prop, rule) in EEVEE_CAPS.items():
            if k in e: _set(ev, prop, e[k], log, rule)

# ---------------------------------------------------------------------------------------------- scene inspection
RENDERABLE = {'MESH', 'CURVE', 'SURFACE', 'META', 'FONT', 'CURVES', 'POINTCLOUD', 'VOLUME', 'GREASEPENCIL'}

def external_files():
    """Every file the current bpy.data depends on (inputs for the cache fingerprint)."""
    out = set()
    def add(fp, owner=None):
        if not fp or fp.startswith('<'): return
        p = os.path.normpath(bpy.path.abspath(fp, library=getattr(owner, 'library', None)))
        out.add(p)
    for im in bpy.data.images:
        if im.source in {'FILE', 'SEQUENCE', 'MOVIE', 'TILED'} and not im.packed_file: add(im.filepath, im)
    for f in bpy.data.fonts:
        if not f.packed_file: add(f.filepath, f)
    for lib in bpy.data.libraries: add(lib.filepath)
    for coll in ('sounds', 'movieclips', 'volumes', 'cache_files'):
        for d in getattr(bpy.data, coll, []):
            if not getattr(d, 'packed_file', None): add(getattr(d, 'filepath', ''), d)
    # baked simulation caches on disk: fluid domains, Geometry Nodes bakes, disk point caches (cloth, soft body, particles)
    dirs = set()
    blend = bpy.data.filepath
    for ob in bpy.data.objects:
        for m in ob.modifiers:
            ds = getattr(m, 'domain_settings', None)
            if ds is not None and getattr(ds, 'cache_directory', ''): dirs.add(bpy.path.abspath(ds.cache_directory))
            if getattr(m, 'bake_directory', ''): dirs.add(bpy.path.abspath(m.bake_directory))
            pc = getattr(m, 'point_cache', None)
            if pc is not None and pc.use_disk_cache and blend:
                dirs.add(pc.filepath and bpy.path.abspath(pc.filepath) or os.path.join(os.path.dirname(blend), 'blendcache_' + os.path.splitext(os.path.basename(blend))[0]))
        for ps in getattr(ob, 'particle_systems', []):
            pc = ps.point_cache
            if pc.use_disk_cache and blend:
                dirs.add(os.path.join(os.path.dirname(blend), 'blendcache_' + os.path.splitext(os.path.basename(blend))[0]))
    for d in dirs:
        for root, _, files in os.walk(d):
            out.update(os.path.join(root, f) for f in files)
    return sorted(out)

def scene_stats(scene, heavy=12):
    """Cheap, render-free validation: geometry, modifiers, materials, textures, lights, camera framing."""
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    t = time.perf_counter(); dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    st = {'depsgraph_eval_s': round(time.perf_counter() - t, 3)}
    rows, tris_total, verts_total = [], 0, 0
    sig_count = {}
    for ob in scene.objects:
        if ob.type not in RENDERABLE or ob.hide_render: continue
        ev = ob.evaluated_get(dg)
        try: me = ev.to_mesh()
        except RuntimeError: me = None
        if me is None: continue
        me.calc_loop_triangles(); tr, vc = len(me.loop_triangles), len(me.vertices)
        ev.to_mesh_clear()
        tris_total += tr; verts_total += vc
        mods = [f'{m.type}' + (f'(L{m.render_levels})' if m.type == 'SUBSURF' else '') for m in ob.modifiers if m.show_render]
        rows.append({'name': ob.name, 'type': ob.type, 'tris': tr, 'verts': vc, 'modifiers': mods})
        if ob.type == 'MESH' and not ob.modifiers:
            d = ob.data; sig = (len(d.vertices), len(d.polygons), tuple(round(x, 4) for x in ob.dimensions))
            sig_count[sig] = sig_count.get(sig, 0) + (1 if d.users == 1 else 0)
    rows.sort(key=lambda r: -r['tris'])
    st.update(objects=len(rows), tris=tris_total, verts=verts_total, heaviest=rows[:heavy],
              unique_meshes=len({o.data.name for o in scene.objects if o.type == 'MESH'}),
              instancing_candidates=sum(n for n in sig_count.values() if n >= 8))
    st['booleans'] = sum(1 for o in scene.objects for m in o.modifiers if m.type == 'BOOLEAN' and m.show_render)
    st['high_subsurf'] = [o.name for o in scene.objects for m in o.modifiers if m.type == 'SUBSURF' and m.render_levels > 2]
    st['materials'] = len([m for m in bpy.data.materials if m.users])
    st['lights'] = len([o for o in scene.objects if o.type == 'LIGHT' and not o.hide_render])
    imgs, tex_mb, missing = [], 0., []
    for im in bpy.data.images:
        if im.source not in {'FILE', 'SEQUENCE', 'TILED'}: continue
        p = bpy.path.abspath(im.filepath)
        if not im.packed_file and not os.path.exists(p): missing.append(p); continue
        w, h = im.size[:]
        mb = w * h * 4 * (4 if im.is_float else 1) / (1 << 20); tex_mb += mb
        imgs.append({'name': im.name, 'size': [w, h], 'float': im.is_float, 'mb': round(mb, 1)})
    st.update(images=imgs, texture_mb=round(tex_mb, 1), missing_files=missing)
    cam = scene.camera
    if cam:
        cropped = []
        for ob in scene.objects:
            if ob.type not in RENDERABLE or ob.hide_render or getattr(ob, 'is_shadow_catcher', False): continue
            pts = [world_to_camera_view(scene, cam, ob.matrix_world @ Vector(c)) for c in ob.bound_box]
            pts = [p for p in pts if p.z > 0]
            if not pts: continue
            x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
            if x0 < 0 and x1 > 1 and y0 < 0 and y1 > 1: continue          # floors/walls/backdrops filling the frame
            if x1 < 0 or x0 > 1 or y1 < 0 or y0 > 1: continue              # fully outside (offscreen helpers)
            if x0 < -.001 or x1 > 1.001 or y0 < -.001 or y1 > 1.001: cropped.append(ob.name)
        st['camera'] = {'name': cam.name, 'type': cam.data.type, 'objects_crossing_frame': cropped[:30]}
    else:
        st['camera'] = None
    r = scene.render
    st['render'] = {'engine': r.engine, 'res': [r.resolution_x, r.resolution_y, r.resolution_percentage],
                    'film_transparent': r.film_transparent, 'frames': [scene.frame_start, scene.frame_end, scene.frame_step]}
    if r.engine == 'CYCLES':
        cy = scene.cycles
        st['render'].update(samples=cy.samples, device=cy.device, max_bounces=cy.max_bounces, denoise=cy.use_denoising,
                            adaptive=cy.use_adaptive_sampling)
    st['megapixel_samples'] = round(r.resolution_x * r.resolution_y * (r.resolution_percentage / 100) ** 2 *
                                    (scene.cycles.samples if r.engine == 'CYCLES' else 1) / 1e6, 1)
    return st

# ---------------------------------------------------------------------------------------------- the render hook
class Run:
    def __init__(self, job):
        self.job, self.mode = job, job.get('mode', 'fast')
        self.preset = job.get('preset') or {}
        self.renders, self.writes, self.reads, self.notes, self.stats = [], set(), set(), [], None
        self.calls = 0; self.placeholders = 0
        self.skip_roots = tuple(os.path.normpath(p) for p in (
            os.path.dirname(bpy.app.binary_path), bpy.utils.resource_path('LOCAL'), bpy.utils.resource_path('USER'),
            '/proc', '/sys', '/dev') if p)   # Blender's own install + config files are not script inputs

    def _snapshot(self, d):
        try: return {e.path: (e.stat().st_mtime_ns, e.stat().st_size) for e in os.scandir(d) if e.is_file()}
        except OSError: return {}

    def thumbnail(self, scene):
        """Workbench preview for ultra mode, only where the probe showed headless Workbench works."""
        if not self.job.get('caps', {}).get('workbench'): return None
        r = scene.render; keep = (r.engine, r.resolution_percentage, r.filepath, r.film_transparent)
        out = os.path.join(self.job['preview_dir'], f'thumb-{self.calls:03d}.png')
        try:
            r.engine = 'BLENDER_WORKBENCH'; r.resolution_percentage = max(1, int(keep[1] * .25)); r.filepath = out
            t = time.perf_counter(); _REAL_OPS.render.render(write_still=True)
            self.notes.append(f'workbench thumbnail {out} ({time.perf_counter() - t:.2f}s)'); return out
        except Exception as e:
            self.notes.append(f'workbench thumbnail failed: {e}'); return None
        finally:
            r.engine, r.resolution_percentage, r.filepath, r.film_transparent = keep

    def drop_placeholder(self, scene):
        """Scripts that resume frame loops create an empty file before each render (`open(p, 'w').close()`).
        When bpe skips or redirects that render, the empty file must not survive, or a later final run would treat
        the frame as done."""
        p = bpy.path.abspath(scene.render.filepath)
        try:
            if os.path.isfile(p) and os.path.getsize(p) == 0 and p in self.writes:
                os.remove(p); self.writes.discard(p); self.placeholders += 1
        except OSError:
            pass

    def render(self, *args, **kw):
        scene = bpy.data.scenes[kw['scene']] if kw.get('scene') else bpy.context.scene
        self.calls += 1
        if self.mode == 'ultra':     # Rule 1: validate the data, don't path-trace it
            if self.stats is None: self.stats = scene_stats(scene)
            thumb = self.thumbnail(scene) if self.preset.get('thumbnail') and self.calls <= self.preset.get('max_thumbnails', 1) else None
            self.renders.append({'skipped': True, 'call': self.calls, 'thumbnail': thumb, 'animation': bool(kw.get('animation'))})
            self.drop_placeholder(scene)
            return {'FINISHED'}
        every = int(self.job.get('every') or 1)
        if every > 1 and (self.calls - 1) % every:
            self.renders.append({'skipped': True, 'call': self.calls, 'reason': f'--every {every}'})
            self.drop_placeholder(scene); return {'FINISHED'}
        r = scene.render; log = Changes()
        keep = {'filepath': r.filepath, 'frame_step': scene.frame_step, 'use_border': r.use_border,
                'use_crop_to_border': r.use_crop_to_border}
        apply_mode(scene, self.mode, self.preset, log)
        dev = self.job.get('device') or {'type': 'CPU'}
        if r.engine == 'CYCLES': apply_device(scene, dev, log)
        redirect = self.mode != 'final' or self.job.get('region')
        if redirect:   # previews never overwrite deliverables
            self.drop_placeholder(scene)
            base = os.path.basename(bpy.path.abspath(r.filepath)) or 'render'
            r.filepath = os.path.join(self.job['preview_dir'], base)
        reg = self.job.get('region')
        if reg:
            r.use_border = True; r.use_crop_to_border = True
            r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = reg
            log.append(f'region {reg}')
        if kw.get('animation') and self.mode != 'final':
            n = int(self.preset.get('animation_frames') or 0)
            if n > 1:
                step = max(1, math.ceil((scene.frame_end - scene.frame_start) / (n - 1)))
                if step > scene.frame_step: scene.frame_step = step; log.append(f'frame_step -> {step} (~{n} representative frames)')
        out_dir = os.path.dirname(bpy.path.abspath(r.filepath)) or os.getcwd()
        os.makedirs(out_dir, exist_ok=True)
        before = self._snapshot(out_dir)
        rec = {'call': self.calls, 'engine': r.engine, 'animation': bool(kw.get('animation')),
               'res': [r.resolution_x, r.resolution_y, r.resolution_percentage], 'changes': log}
        if r.engine == 'CYCLES':
            rec.update(samples=scene.cycles.samples, device=scene.cycles.device)
        elif r.engine.startswith('BLENDER_EEVEE'):
            rec.update(samples=scene.eevee.taa_render_samples)
        t = time.perf_counter()
        try:
            try:
                res = _REAL_OPS.render.render(*args, **kw)
            except RuntimeError as e:   # failure recovery: one retry on CPU, never a loop
                if r.engine == 'CYCLES' and scene.cycles.device == 'GPU':
                    self.notes.append(f'GPU render failed ({e}); retried on CPU'); rec['gpu_failed'] = str(e)[:300]
                    scene.cycles.device = 'CPU'; rec['device'] = 'CPU'
                    res = _REAL_OPS.render.render(*args, **kw)
                else:
                    raise
        finally:
            rec['seconds'] = round(time.perf_counter() - t, 3)
            after = self._snapshot(out_dir)
            rec['outputs'] = sorted(p for p, s in after.items() if before.get(p) != s)
            if not rec['outputs'] and not kw.get('animation') and kw.get('write_still'):
                rec['note'] = 'no new file detected in ' + out_dir
            self.writes.update(rec['outputs'])
            rec['preview'] = bool(redirect)
            r.filepath = keep['filepath']; scene.frame_step = keep['frame_step']
            r.use_border = keep['use_border']; r.use_crop_to_border = keep['use_crop_to_border']
            rec['changes'] = list(log); log.restore()
            self.renders.append(rec)
        return res

    # file-level dependency tracking for the cache (open() reads are inputs, writes are outputs)
    def tracking_open(self, file, mode='r', *a, **k):
        try:
            if isinstance(file, (str, bytes, os.PathLike)):
                p = os.path.normpath(os.path.abspath(os.fsdecode(file)))
                if not p.startswith(self.skip_roots):
                    (self.writes if any(c in mode for c in 'wax+') else self.reads).add(p)
        except Exception:
            pass
        return _REAL_OPEN(file, mode, *a, **k)

_REAL_OPS = bpy.ops
_REAL_OPEN = builtins.open
TMP_SCENE = 'bpe-primitive-scratch'

class FastPrimitives:
    """bpy.ops.mesh.primitive_*_add without the cost that grows with the scene.

    Every operator call updates the active view layer before and after it runs; in a script that adds hundreds of
    objects that is O(n^2) and dominates the build (measured: 12.7 of 14.5 s in treatstolove/box.py). Here the
    *same operator with the same arguments* runs inside an empty scratch scene, then the new object is moved into
    the caller's collection and left selected/active with its world matrix set, exactly as the plain call leaves
    it. Geometry comes from Blender's own operator: vertex positions and matrices were bit-identical on all 583
    objects of box.py. Primitive UVs vary by ~1e-6 between runs in stock Blender too, and the box.py render differed
    from plain operators by 79.5 dB PSNR vs 79.9 dB plain-vs-plain, i.e. inside Blender's own run-to-run noise.
    Anything unusual (positional args, edit mode, no view layer) falls through to the plain operator."""
    def __init__(self, run): self.run, self.calls = run, 0

    def scratch(self):
        sc = bpy.data.scenes.get(TMP_SCENE)
        return sc if sc is not None else bpy.data.scenes.new(TMP_SCENE)

    def wrap(self, name):
        real = getattr(_REAL_OPS.mesh, name)
        def call(*args, **kw):
            ctx = bpy.context
            vl, coll = ctx.view_layer, ctx.collection
            if args or kw.get('enter_editmode') or ctx.mode != 'OBJECT' or vl is None or coll is None:
                return real(*args, **kw)
            sc = self.scratch(); svl = sc.view_layers[0]
            with ctx.temp_override(scene=sc, view_layer=svl, collection=sc.collection):
                res = real(**kw)
            o = svl.objects.active
            if 'FINISHED' not in res or o is None: return res
            sc.collection.objects.unlink(o); coll.objects.link(o)
            for s in ctx.selected_objects: s.select_set(False, view_layer=vl)
            o.select_set(True, view_layer=vl); vl.objects.active = o
            o.matrix_world = o.matrix_basis   # what the operator's post-update would have written
            self.calls += 1
            return res
        return call

    def cleanup(self):
        sc = bpy.data.scenes.get(TMP_SCENE)
        if sc is not None: bpy.data.scenes.remove(sc)

def _proxy_bpy(run, fast_prims=None):
    """A bpy stand-in for the user's script: identical except bpy.ops.render.render goes through Run.render
    (and, unless disabled, mesh primitives go through FastPrimitives)."""
    class RenderOps:
        def __getattr__(self, name): return run.render if name == 'render' else getattr(_REAL_OPS.render, name)
    render_ops = RenderOps()
    class MeshOps:
        def __getattr__(self, name):
            if fast_prims and name.startswith('primitive_') and name.endswith('_add'): return fast_prims.wrap(name)
            return getattr(_REAL_OPS.mesh, name)
    mesh_ops = MeshOps()
    class Ops:
        def __getattr__(self, name):
            return render_ops if name == 'render' else mesh_ops if name == 'mesh' else getattr(_REAL_OPS, name)
    mod = types.ModuleType('bpy'); mod.__dict__.update(bpy.__dict__); mod.ops = Ops()
    return mod

# ---------------------------------------------------------------------------------------------- export + validation
def _norm(name):   # exporters sanitize names differently (USD: 'dw.001' -> 'dw_001')
    return ''.join(c if c.isalnum() else '_' for c in name)

def export_stats(select=None, include_hidden=False, only=None):
    import numpy as np
    dg = bpy.context.evaluated_depsgraph_get()
    obs = [o for o in bpy.context.scene.objects if o.type in RENDERABLE and (include_hidden or not o.hide_render)
           and (not select or any(fnmatch.fnmatch(o.name, s) for s in select)) and (only is None or _norm(o.name) in only)]
    tris, lo, hi, uv, per = 0, np.full(3, 1e9), np.full(3, -1e9), 0, {}
    for o in obs:
        ev = o.evaluated_get(dg)
        try: me = ev.to_mesh()
        except RuntimeError: continue
        if me is None: continue
        me.calc_loop_triangles(); tris += len(me.loop_triangles); uv += 1 if me.uv_layers else 0
        per[_norm(o.name)] = len(me.loop_triangles)
        if len(me.vertices):
            co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
            M = np.array(ev.matrix_world); w = co @ M[:3, :3].T + M[:3, 3]
            lo = np.minimum(lo, w.min(0)); hi = np.maximum(hi, w.max(0))
        ev.to_mesh_clear()
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    mats = {s.material.name for o in obs for s in o.material_slots if s.material}
    return {'mesh_objects': len(obs), 'tris': tris, 'with_uvs': uv, 'materials': sorted(mats), 'per_object': per,
            'bones': sum(len(a.data.bones) for a in arms), 'actions': len([a for a in bpy.data.actions if a.users]),
            'bbox': [list(map(lambda x: round(x, 4), lo)), list(map(lambda x: round(x, 4), hi))] if obs else None}

GLTF_SAFE_NODES = {'BSDF_PRINCIPLED', 'OUTPUT_MATERIAL', 'TEX_IMAGE', 'NORMAL_MAP', 'UVMAP', 'TEX_COORD', 'MAPPING',
                   'SEPARATE_COLOR', 'SEPARATE_RGB', 'MIX_SHADER', 'BSDF_TRANSPARENT', 'EMISSION', 'GROUP', 'VERTEX_COLOR',
                   'ATTRIBUTE', 'BUMP', 'MIX', 'MIX_RGB', 'MATH', 'GAMMA', 'INVERT', 'BSDF_DIFFUSE'}

def export_and_validate(ex):
    fmt, path = ex['format'].lower(), os.path.abspath(ex['path'])
    sel = ex.get('select')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    src = export_stats(sel)
    src_all_tris = export_stats(sel, include_hidden=True)['tris']
    curvy = [o.name for o in bpy.context.scene.objects if o.type in ('CURVE', 'FONT') and not o.hide_render
             and (getattr(o.data, 'bevel_depth', 0) or getattr(o.data, 'extrude', 0) or o.type == 'FONT')]
    hidden_names = {_norm(o.name) for o in bpy.context.scene.objects if o.hide_render}
    warn = []
    if fmt in ('glb', 'gltf'):
        for m in bpy.data.materials:
            if m.users and m.use_nodes:
                bad = sorted({n.type for n in m.node_tree.nodes} - GLTF_SAFE_NODES)
                if bad: warn.append(f'material {m.name}: procedural nodes {bad} do not survive glTF; bake them to textures')
    if sel:
        for o in bpy.context.scene.objects: o.select_set(any(fnmatch.fnmatch(o.name, s) for s in sel))
    t = time.perf_counter()
    opts = ex.get('options') or {}
    if fmt in ('glb', 'gltf'):
        o = dict(filepath=path, export_format='GLB' if fmt == 'glb' else 'GLTF_SEPARATE', export_apply=True,
                 export_yup=True, use_selection=bool(sel), export_cameras=False, export_lights=False)
        if ex.get('draco'): o['export_draco_mesh_compression_enable'] = True
        o.update(opts); _REAL_OPS.export_scene.gltf(**o)
    elif fmt == 'fbx':
        o = dict(filepath=path, use_selection=bool(sel), use_mesh_modifiers=True, add_leaf_bones=False,
                 path_mode='COPY', embed_textures=True, object_types={'MESH', 'ARMATURE', 'EMPTY', 'OTHER'})  # OTHER = curves/text as mesh
        o.update(opts); _REAL_OPS.export_scene.fbx(**o)
    elif fmt == 'obj':
        o = dict(filepath=path, export_selected_objects=bool(sel), apply_modifiers=True, export_materials=True)
        o.update(opts); _REAL_OPS.wm.obj_export(**o)
    elif fmt in ('usd', 'usdc', 'usda', 'usdz'):
        o = dict(filepath=path, selected_objects_only=bool(sel)); o.update(opts); _REAL_OPS.wm.usd_export(**o)
    elif fmt == 'stl':
        o = dict(filepath=path, export_selected_objects=bool(sel), apply_modifiers=True); o.update(opts)
        _REAL_OPS.wm.stl_export(**o)
    else:
        raise ValueError(f'unsupported export format {fmt}')
    export_s = round(time.perf_counter() - t, 3)
    # validate: re-import into an empty scene and compare what the format is able to carry
    _REAL_OPS.wm.read_factory_settings(use_empty=True)
    if fmt in ('glb', 'gltf'): _REAL_OPS.import_scene.gltf(filepath=path)
    elif fmt == 'fbx': _REAL_OPS.import_scene.fbx(filepath=path)
    elif fmt == 'obj': _REAL_OPS.wm.obj_import(filepath=path)
    elif fmt.startswith('usd'): _REAL_OPS.wm.usd_import(filepath=path)
    elif fmt == 'stl': _REAL_OPS.wm.stl_import(filepath=path)
    sp = src['per_object']
    bp = export_stats(include_hidden=True)['per_object']
    by_name = fmt not in ('stl', 'usd', 'usdc', 'usda', 'usdz')   # STL merges everything; USD import renames objects
    back = export_stats(include_hidden=True, only=set(sp)) if by_name else export_stats(include_hidden=True)
    checks = {}
    if not by_name:   # totals only (an exporter may or may not include render-hidden objects)
        checks['tris'] = back['tris'] in (src['tris'], src_all_tris)
        if fmt != 'stl': checks['objects'] = back['mesh_objects'] >= src['mesh_objects']
        if not checks['tris']:
            warn.append(f'triangles: source {src["tris"]} (all incl. hidden {src_all_tris}), file {back["tris"]}')
            if curvy and fmt.startswith('usd'):
                warn.append(f'{len(curvy)} beveled curve/text objects ({curvy[:5]}) export as USD curves without their surface; '
                            'convert them to mesh before exporting (bpy.ops.object.convert(target="MESH"))')
    else:
        missing = sorted(set(sp) - set(bp)); extra = sorted(set(bp) - set(sp))
        checks['objects'] = not missing
        checks['tris'] = all(bp[n] == sp[n] for n in sp if n in bp)
        if missing: warn.append(f'{len(missing)} objects missing after re-import: {missing[:10]}')
        if extra:
            why = 'hidden from render in the source; the exporter includes them' if set(extra) <= hidden_names else 'not in the source'
            warn.append(f'{len(extra)} extra objects in the file ({why}): {extra[:10]}')
        bad = [n for n in sp if n in bp and bp[n] != sp[n]]
        if bad: warn.append(f'triangle count changed on {len(bad)} objects: ' + ', '.join(f'{n} {sp[n]}->{bp[n]}' for n in bad[:8]))
    src.pop('per_object'); back.pop('per_object')
    if fmt != 'stl': checks['materials'] = set(src['materials']) <= set(back['materials'])
    if fmt in ('glb', 'gltf', 'fbx'):
        checks['bones'] = back['bones'] == src['bones']
        checks['actions'] = back['actions'] >= min(src['actions'], 1) if src['actions'] else True
    if src['bbox'] and back['bbox']:
        size = max(1e-6, max(h - l for l, h in zip(*src['bbox'])))
        checks['bbox'] = all(abs(a - b) <= 1e-3 * size + 1e-5 for a, b in zip(sum(src['bbox'], []), sum(back['bbox'], [])))
    if src['with_uvs'] and fmt != 'stl': checks['uvs'] = back['with_uvs'] >= src['with_uvs'] * (1 if fmt != 'obj' else 0)
    return {'path': path, 'format': fmt, 'bytes': os.path.getsize(path) if os.path.exists(path) else None,
            'export_s': export_s, 'source': src, 'reimported': back, 'checks': checks, 'ok': all(checks.values()),
            'warnings': warn}

# ---------------------------------------------------------------------------------------------- probe + bench
def probe(job):
    out = {'blender': bpy.app.version_string, 'version': list(bpy.app.version), 'python': sys.version.split()[0],
           'binary': bpy.app.binary_path, 'platform': sys.platform, 'cpu_threads': os.cpu_count(),
           'engines': bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys(), 'eevee_id': eevee_id()}
    cp = bpy.context.preferences.addons['cycles'].preferences
    backends = {}
    for t in [x[0] for x in cp.get_device_types(bpy.context)]:
        if t == 'NONE': continue
        try:
            cp.compute_device_type = t; cp.refresh_devices()
            backends[t] = [d.name for d in cp.devices if d.type == t]
        except Exception as e:
            backends[t] = f'error: {e}'
    out['cycles_backends'] = {k: v for k, v in backends.items() if v}
    cy, den = bpy.context.scene.cycles, []   # dynamic enum: test by assignment
    for d in ('OPENIMAGEDENOISE', 'OPTIX'):
        try: cy.denoiser = d; den.append(d) if cy.denoiser == d else None
        except TypeError: pass
    out['denoisers'] = den
    ex = {}
    for name, op in (('gltf', 'export_scene.gltf'), ('fbx', 'export_scene.fbx'), ('obj', 'wm.obj_export'),
                     ('usd', 'wm.usd_export'), ('stl', 'wm.stl_export'), ('alembic', 'wm.alembic_export')):
        a, b = op.split('.')
        try: getattr(getattr(_REAL_OPS, a), b).get_rna_type(); ex[name] = True
        except Exception: ex[name] = False
    out['exporters'] = ex
    try: import numpy; out['numpy'] = numpy.__version__
    except ImportError: out['numpy'] = None
    return out

def headless(job):
    """Can this engine render without a display here? Run in its own process: a GPU-context failure can crash Blender."""
    eng = eevee_id() if job['engine'] == 'eevee' else 'BLENDER_WORKBENCH'
    _REAL_OPS.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = eng; sc.render.resolution_x = sc.render.resolution_y = 32
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
    sc.render.filepath = os.path.join(tempfile.gettempdir(), f'bpe-probe-{job["engine"]}-{os.getpid()}.png')
    t = time.perf_counter(); _REAL_OPS.render.render(write_still=True)
    ok = os.path.exists(sc.render.filepath)
    if ok: os.remove(sc.render.filepath)
    return {'engine': eng, 'ok': ok, 'seconds': round(time.perf_counter() - t, 3)}

def bench(job):
    """A small representative Cycles scene (glossy, glass, diffuse, area + world light). Same scene for every device."""
    from mathutils import Vector
    _REAL_OPS.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; col = sc.collection
    def mat(name, **kw):
        m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        for k, v in kw.items(): b.inputs[k].default_value = v
        return m
    mats = [mat('glossy', Metallic=1., Roughness=.15), mat('glass', **{'Transmission Weight': 1., 'Roughness': 0.}),
            mat('diffuse', Roughness=.8)]
    import bmesh
    for i in range(36):
        me = bpy.data.meshes.new(f's{i}'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=.4)
        bm.to_mesh(me); bm.free(); [setattr(p, 'use_smooth', True) for p in me.polygons]; me.materials.append(mats[i % 3])
        o = bpy.data.objects.new(f's{i}', me); o.location = ((i % 6) - 2.5, (i // 6) - 2.5, .4); col.objects.link(o)
    me = bpy.data.meshes.new('floor'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=10)
    bm.to_mesh(me); bm.free(); me.materials.append(mats[2]); col.objects.link(bpy.data.objects.new('floor', me))
    ld = bpy.data.lights.new('key', 'AREA'); ld.energy = 800; ld.size = 3; lo = bpy.data.objects.new('key', ld)
    lo.location = (3, -3, 6); lo.rotation_euler = (Vector((0, 0, 0)) - lo.location).to_track_quat('-Z', 'Y').to_euler(); col.objects.link(lo)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = .5; sc.world = w
    cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); col.objects.link(cam); sc.camera = cam
    cam.location = (0, -9, 5); cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = job.get('res', [480, 320]); r.resolution_percentage = 100
    cy = sc.cycles; cy.samples = job.get('samples', 64); cy.use_adaptive_sampling = False; cy.use_denoising = False
    r.filepath = os.path.join(tempfile.gettempdir(), 'bpe-bench.png')
    log = []; apply_device(sc, job.get('device') or {'type': 'CPU'}, log)
    t = time.perf_counter(); _REAL_OPS.render.render(write_still=True)
    return {'device': job.get('device'), 'seconds': round(time.perf_counter() - t, 3), 'log': log}

# ---------------------------------------------------------------------------------------------- main
def run_script(job):
    run = Run(job); rep = {'kind': 'script', 'mode': run.mode, 'script': job.get('script'), 'args': job.get('args', [])}
    os.makedirs(job['preview_dir'], exist_ok=True)
    if job.get('blend'):
        t = time.perf_counter(); _REAL_OPS.wm.open_mainfile(filepath=job['blend']); rep['load_s'] = round(time.perf_counter() - t, 3)
    elif job.get('reset'):
        _REAL_OPS.wm.read_factory_settings(use_empty=True)
    script = job.get('script')
    t0 = time.perf_counter(); err = None
    prof = cProfile.Profile() if job.get('profile') else None
    if script:
        src = _REAL_OPEN(script, encoding='utf-8').read()
        g = {'__name__': '__main__', '__file__': script, '__builtins__': builtins}
        saved = (sys.argv, sys.modules['bpy'], builtins.open, sys.path[:])
        saved_assets = os.environ.get('BPE_ASSET_DIRS', '')
        sys.argv = [bpy.app.binary_path, '--'] + list(job.get('args', []))
        fp = FastPrimitives(run) if job.get('fast_primitives', True) else None
        sys.modules['bpy'] = _proxy_bpy(run, fp); builtins.open = run.tracking_open
        sys.path.insert(0, os.path.dirname(script))
        sd = os.path.dirname(script)   # a script's own folder (and its assets/) is searched first for asset() names
        os.environ['BPE_ASSET_DIRS'] = os.pathsep.join([sd, os.path.join(sd, 'assets'), saved_assets])
        try:
            if prof: prof.enable()
            exec(compile(src, script, 'exec'), g)
        except SystemExit as e:
            if e.code not in (None, 0): err = f'SystemExit({e.code})'
        except Exception:
            err = traceback.format_exc()
        finally:
            if prof: prof.disable()
            sys.argv, sys.modules['bpy'], builtins.open = saved[0], saved[1], saved[2]; sys.path[:] = saved[3]
            os.environ['BPE_ASSET_DIRS'] = saved_assets
            if fp:
                fp.cleanup()
                if fp.calls: rep['fast_primitives'] = fp.calls
    else:   # a .blend on its own: render (or inspect) its scene as saved
        try: run.render(write_still=True) if not job.get('animation') else run.render(animation=True)
        except Exception: err = traceback.format_exc()
    script_s = time.perf_counter() - t0
    render_s = sum(r.get('seconds', 0) for r in run.renders)
    if run.placeholders: run.notes.append(f'removed {run.placeholders} empty placeholder file(s) left for skipped/redirected renders')
    if run.mode == 'ultra' and run.stats is None and not err:
        run.stats = scene_stats(bpy.context.scene)   # scripts that never call render (modeling, export prep)
    rep.update(script_s=round(script_s, 3), render_s=round(render_s, 3), build_s=round(script_s - render_s, 3),
               renders=run.renders, notes=run.notes, stats=run.stats, error=err)
    if job.get('export') and not err:
        try: rep['export'] = export_and_validate(job['export'])
        except Exception: rep['export'] = {'ok': False, 'error': traceback.format_exc()}
    rep['outputs'] = sorted(run.writes)
    rep['inputs'] = sorted((run.reads | set(external_files())) - run.writes)
    if prof:
        s = io.StringIO(); pstats.Stats(prof, stream=s).sort_stats('cumulative').print_stats(25); rep['profile'] = s.getvalue()[-6000:]
    return rep

def main():
    spec = json.load(_REAL_OPEN(os.environ['BPE_JOB']))
    startup = round(T_PROC - spec['launched_at'], 3) if spec.get('launched_at') else None
    reports, failed = [], False
    for i, job in enumerate(spec['jobs']):
        kind = job.get('kind', 'script'); t = time.perf_counter()
        if i and kind == 'script' and not job.get('blend'): job['reset'] = True   # isolate jobs sharing a process
        try:
            rep = {'probe': probe, 'bench': bench, 'headless': headless}.get(kind, run_script)(job)
        except Exception:
            rep = {'kind': kind, 'error': traceback.format_exc()}
        rep['job_s'] = round(time.perf_counter() - t, 3)
        failed = failed or bool(rep.get('error')) or (rep.get('export') and not rep['export'].get('ok'))
        reports.append(rep)
    out = {'startup_s': startup, 'blender': bpy.app.version_string, 'peak_rss_mb': _peak_rss_mb(), 'reports': reports}
    with _REAL_OPEN(spec['report'], 'w') as f: json.dump(out, f, indent=1)
    sys.stdout.flush()
    if failed: sys.exit(1)

main()
