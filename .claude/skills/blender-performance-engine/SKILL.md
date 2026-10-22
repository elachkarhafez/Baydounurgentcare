---
name: blender-performance-engine
description: Use for any Blender work - bpy scripts, .blend files, Cycles or EEVEE renders, product stills, turntables and frame sequences, geometry/modeling scripts, rigs and animation, simulations, and glTF/GLB/FBX/OBJ/USD/STL export - including the per-site render/*.py scripts in this repo. It decides whether a render is needed at all, runs Blender headless in the cheapest mode that answers the question (ultra/fast/quality/final), inspects the hardware and picks the Cycles device by measurement, skips work whose inputs haven't changed, and validates results. Trigger on "Blender", "bpy", "Cycles", "EEVEE", "render", "path-traced", ".blend", "turntable", "frames", "export glb/fbx".
---

# Blender Performance Engine

The goal is the shortest time from an instruction to a **validated** result. Most of that time is path tracing, so
the biggest win is not rendering when the question doesn't need pixels, and rendering cheaply when it only needs a look.

Everything goes through one launcher (Python 3 stdlib, works on Linux/macOS/Windows):

```
B=.claude/skills/blender-performance-engine/bpe      # or: python3 <skill>/scripts/bpe.py
$B probe                                  # once per machine: hardware, Blender, Cycles backends, device decision (cached)
$B inspect SCRIPT -- ARGS                 # ultra: run the script, skip every render, report the scene
$B run SCRIPT -m fast -- ARGS             # quick look (previews go to the preview dir, never over deliverables)
$B run SCRIPT -m quality -- ARGS          # near-final look
$B run SCRIPT -m final -- ARGS            # the deliverable, quality settings untouched
$B export SCRIPT -f glb -o out.glb -- ARGS   # no render: export, re-import, compare
$B batch jobs.json                        # many jobs: cache skips, shared process for cheap jobs, RAM-safe parallelism
$B compare a.png b.png --min-psnr 40      # check an optimized render against a reference
$B report                                 # what recent runs cost, stage by stage
```

`SCRIPT` is an ordinary bpy script that reads its own args after `--`, or a `.blend` (rendered/inspected as saved;
`--animation` for its frame range). Scripts are **never edited to work with bpe**: the runtime runs them unchanged
and intercepts `bpy.ops.render.render`, which is where the mode applies.

## 1. Decide what the task actually needs

| The task is... | Do this | Never |
|---|---|---|
| Building/editing geometry, rigs, keyframes, UVs, materials-as-data, scene setup | `inspect` (ultra) and read the stats | path trace to "see if it worked" |
| Checking composition, framing, which state shows what | `run -m fast` (33% res, 16 spp) | a final render |
| Judging materials, lighting, glass, shadows before shipping | `run -m quality` (50% res, ~half samples), one representative frame or `--region` | a full sequence |
| Producing the PNGs/frames/video the site uses | `run -m final`, only after a fast/quality look passed | silently lower samples, resolution or bounces |
| A 3D asset for three.js / a game engine / AR | `export` (no render at all) | render images of a model to "deliver" it |
| An animation or frame loop | ultra to check data, then `--every N` or the mode's representative frames, then final once | render every frame to check timing |

Progressive validation for anything animated: data (ultra) → key poses (fast, `--every`) → short segment (quality)
→ full sequence (final). Each step only when the previous one passed.

## 2. Modes (what changes, exactly)

Presets live in `defaults.json` → `modes`; a project's `blender-perf.json` can override any value. Caps are applied
at render time and **never raise** a script's own value (samples/bounces use `min`, noise thresholds use `max`).

| | ultra | fast | quality | final |
|---|---|---|---|---|
| Path tracing | none (stats + optional Workbench thumbnail if headless Workbench works) | yes | yes | yes |
| Resolution | - | 33% | 50% | as scripted |
| Cycles samples / noise threshold | - | ≤16 / ≥0.08 | ≤32 / ≥0.03 | as scripted |
| Bounces, caustics | - | ≤6 total, diffuse/glossy ≤2, caustics off, clamp 10 | as scripted | as scripted |
| Denoise | - | OIDN, fast prefilter | on | as scripted |
| Simplify | - | subdiv ≤2, textures ≤1024 | - | - |
| Animations | - | ~5 representative frames | ~9 | every frame |
| Output | report only | preview dir | preview dir | the script's own path |
| Cached | no (cheaper than hashing) | yes | yes | yes |

Final mode changes **only** the compute device (and puts the denoiser on the GPU when the device is a GPU).
Preview modes write to `preview_dir` (default `<cache>/previews/<script>-<mode>-<id>/`; pass `--preview-dir`
to put them somewhere the user can open, e.g. the session scratchpad). `--region x0,y0,x1,y1` renders part of
the frame (always a preview). `--every N` renders only every Nth render call (scripts that loop over frames).

EEVEE is used for previews only when the scene is already EEVEE. A Cycles scene built around shadow catchers,
transparent film or caustics is never switched to EEVEE to look faster, because the preview would lie.

## 3. Hardware and device (never assume)

`bpe probe` records OS, CPU, RAM, GPUs (nvidia-smi / rocm-smi / lspci / system_profiler), the Blender version,
every Cycles backend Blender itself reports (OPTIX, CUDA, HIP, ONEAPI, METAL) and its devices, the denoisers,
whether Workbench and EEVEE render headless, and which exporters exist. The result is cached per Blender binary and
GPU set under `<cache>/probe/`.

Device policy (`device` in config, or `--device`): `auto` uses CPU when Blender reports no GPU backend. Otherwise it
benchmarks CPU, each GPU backend, and GPU+CPU hybrid on a built-in glossy/glass/diffuse scene once per machine,
caches the winner and uses it. `bpe bench-device SCRIPT -- ARGS` repeats that on a real script when the generic
bench may not represent it. If a GPU render throws or Blender dies without a report (typical VRAM exhaustion), the
job is retried **once** on CPU and the failure is reported. It doesn't loop.

## 4. Incremental cache

A run is skipped when nothing it depends on changed. The fingerprint covers the Blender version, the runtime, the
mode preset and device, the script, every file in the script's folder, every file the script `open()`ed for
reading (e.g. a sibling script it `exec`s), and every external file in `bpy.data` (images, HDRIs, fonts, libraries,
sounds, caches). Outputs are recorded with size+mtime+sha256 and must still exist unchanged. Changed mtime
alone triggers a rehash, not a rebuild, so git checkouts don't invalidate everything. A filename existing is never
enough. `--force` ignores the cache. Cache root: `$BPE_CACHE` or `~/.cache/blender-perf`.

## 5. Batching and parallelism

`bpe batch jobs.json`:
```json
{ "jobs": [
  { "script": "keaiks/render/truck.py", "mode": "final", "args_each": [["out", "open"], ["out", "closed"], ["out", "wheel"]] },
  { "script": "rtbgym/render/bar.py", "mode": "fast", "args_each": [["out", 0], ["out", 3], ["out", 6]] }
]}
```
Cache hits are skipped first. Cheap jobs (`parallel.share_process_for`, default ultra) share one Blender process.
Final and quality renders run one at a time on CPU (Cycles already uses every core; 2 at a time measured 7%
slower) and one per GPU. Fast previews run 2 at a time (measured 26% faster, because more of their time is
single-threaded). `-j N` overrides, with threads split evenly and the count bounded by free RAM against the last
measured peak RSS of each job. Numbers: `references/benchmarks.md`.

## 6. Writing or changing a Blender script (rules that keep it fast)

1. **No absolute asset paths.** `from bpe_assets import asset` then `asset('studio_small_09_1k.hdr')`. Pin the
   source under `assets.sources` (url + sha256) in `blender-perf.json`. It's fetched once and cached for every
   project. A script's own folder and its `assets/` are searched first.
2. Take `samples` and `scale` (or `res`) as optional args with production defaults, and one arg for the state/view
   so one script makes every variant.
3. Write layout metadata (image-space positions, JSON) from the scene data, not from a render, so ultra mode can
   regenerate it in a second.
4. Every operator call updates the view layer before and after it runs, so hundreds of `bpy.ops` calls in a loop
   cost O(n²). bpe already runs `bpy.ops.mesh.primitive_*_add` in a scratch scene (same operator, same args,
   bit-identical vertex positions; renders differ only within Blender's own run-to-run noise; `--plain-ops`
   turns it off), which took the two heaviest builds here from 14-17 s to 2 s.
   Other operators in loops (`transform_apply`, `shade_smooth*`, `modifier_apply`) still pay it, so in new code
   prefer the data API (`bpy.data.meshes.new` + `from_pydata`, `bmesh.ops.*`, `mesh.shade_smooth()`).
   `bpe inspect --profile` shows whether build time matters before you rewrite anything.
5. Repeated identical pieces (lug nuts, pearls, tiles) should share one mesh datablock (linked duplicates) or a
   collection instance. `inspect` reports `instancing_candidates`.
6. Frame loops in one process: set `scene.render.use_persistent_data = True` so Cycles keeps the BVH between frames.
7. Fixed seeds (`random.seed`, Cycles `seed`) so an optimized run can be compared pixel-for-pixel with `bpe compare`.
8. Keep `bpy.ops.wm.read_factory_settings(use_empty=True)` at the top, so a script is deterministic and can share a
   process with other jobs.

Details per engine, geometry, animation, simulation and export: `references/playbook.md`.

## 7. Export

`bpe export SCRIPT -f glb|gltf|fbx|obj|usd|stl -o PATH [--select 'glob,glob'] [--draco] -- ARGS` runs the script in
ultra mode, exports with modifiers applied, then re-imports into an empty scene and compares triangle count,
mesh objects, materials, UV presence, bones, actions and world bounding box (axis/scale conventions round-trip).
A mismatch fails the command. For glTF it also lists materials whose procedural nodes can't survive the format, so
you can bake those first instead of discovering it in three.js.

## 8. Simulations and caches

Bake simulations once in their own step (the cache is part of the fingerprint through `bpy.data.cache_files` /
point-cache folders on disk), preview them in fast mode, and render final only from a baked, unchanged cache.
Change an input and the fingerprint changes; stale caches are never reused. See `references/playbook.md` §5.

## 9. Project overrides

`blender-perf.json` is searched from the script's folder up to `/`, and also as `.claude/blender-perf.json`. The
closest file wins, and objects merge key by key over `defaults.json`. Relative paths resolve from the file that
names them. Keys: `blender.path|min_version|fetch_version`, `default_mode`, `device`, `preview_dir`,
`assets.dirs|sources`, `modes.<mode>.*`, `parallel.*`, `cache.*`. Example for a site that needs heavier previews:
```json
{ "modes": { "fast": { "cycles": { "samples": 24, "transmission_bounces": 10 } } } }
```

## 10. Failure recovery

- The script raises: the traceback is shown, nothing is cached, and earlier outputs are left untouched.
- Hardcoded paths that don't exist are flagged by a preflight scan before Blender launches.
- GPU error or crash: one CPU retry, then report. No retry loops.
- A setting that doesn't exist in this Blender version is skipped (every change goes through a `hasattr` guard and is
  logged per render in the run summary).
- Previews can't overwrite deliverables, and final runs only write where the script already writes.

## 11. Quality protection (needs the user's explicit OK to change in final)

Resolution, samples, noise threshold, bounces, denoiser settings, colour management (view transform/look), film
transparency/alpha, texture resolution, subdivision, simulation resolution, frame range and timing, rig/deformation,
export data. Prefer structural fixes (instancing, data API, caching, a better device) over visible compromises.

## 12. Reporting back

Quote measured numbers from the run summaries or `bpe report`, never estimates. If something couldn't be measured
(e.g. no GPU on this machine), say so. When a render was skipped because the cache was current, say that, not
"rendered". Getting Blender: `bpe fetch-blender` downloads a portable LTS build into the cache with sha256
verification. That's fine in an ephemeral cloud container; on someone's own machine, ask first.
