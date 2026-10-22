# Measured results

Machine: cloud container, Intel Xeon @ 2.80 GHz, 4 threads, 15.7 GB RAM, **no GPU** (no /dev/dri, no CUDA/OptiX/
HIP/oneAPI backend reported by Blender), no libEGL (so Workbench and EEVEE can't render headless here).
Blender 4.5.15 LTS (portable, sha256-verified). Date: 2026-10-22. Every number below is a wall-clock measurement
from this machine. GPU paths were not testable here and are unverified.

"Original" = the scripts as they were, launched the way their usage lines said (`blender -b -P script.py -- args`),
with only their dead asset paths pointed at the same fetched files.

## Original workflow (production settings, one launch per output)

| Job | Wall | Of which path tracing |
|---|---|---|
| keaiks truck closed (2000×1100, 64 spp) | 184.1 s | 182.1 s |
| keaiks truck open | 198.7 s | 197.1 s |
| keaiks truck wheel | 72.7 s | 71.6 s |
| rtbgym bar 3 plates (2000×900) | 34.8 s | 33.7 s |
| treatstolove box wide (1800×1000) | 408.0 s | ~392 s (build ~15 s) |
| wheel-shop wheel still (960²) | 57.5 s | 56.1 s |
| sourabooths booth | 107.9 s | 106.8 s |

The bottleneck is path tracing (~2.5 s per sample at 2.2 MP on 4 cores, plus ~15 s OIDN). Startup is 0.4-0.8 s.
Scene builds were under 1 s except for three scripts with O(n²) builds (below).

## Same jobs through bpe

| What you need | Command | truck closed | box wide |
|---|---|---|---|
| Is the scene/data right? | `inspect` (ultra) | **1.6 s** | **2.6 s** |
| Look check | `-m fast` | **8.8 s** | **15.8 s** |
| Near-final check | `-m quality` | **28.4 s** | **54.9 s** |
| Part of the frame | `-m quality --region` | 9.5 s (truck open, 40% × 60% region) | |
| Deliverable | `-m final` | 183.4 s, **pixel-identical** to original (max diff 0) | 407.1 s (build 1.6 s instead of ~15 s) |
| Deliverable again, nothing changed | `-m final` | **0.12 s** (cache hit) | |

Layout JSON written by the scripts (e.g. `truck.json`) comes out byte-identical from `inspect`, so image-space
coordinates for the page can be regenerated in ~1.5 s without rendering.

## Build-time fixes (quality-neutral)

| Script | Before | After | How | Proof |
|---|---|---|---|---|
| treatstolove/box.py | 14.0-15.0 s | 1.6-1.9 s | bpe runs `bpy.ops.mesh.primitive_*_add` in a scratch scene (455 calls; 12.7 s was view-layer updates) | positions/matrices bit-identical on 583 objects; final render 82.0 dB PSNR vs original, inside Blender's own run-to-run noise (plain vs plain 79.9 dB, plain vs bpe 79.5 dB at quality) |
| demos/demolition/room.py (before) | 17.4-18.5 s | 2.0 s | same (556 calls) | identical object/tri/vertex counts |
| petalsnpoetry/scene.py droplets → products.py, scene.py | 93.6 s | 2.9 s | one small bmesh per drop instead of `create_icosphere` into one growing bmesh | vertex positions, face loops, loop starts, smooth flags md5-identical |

All 12 scripts: identical object/triangle/vertex counts with and without the primitive speedup, no errors.

## Batching and parallelism

| Workload | Option | Wall |
|---|---|---|
| bar.py ×4 final | 1 at a time | **141.0 s** |
| bar.py ×4 final | 2 at a time, 2 threads each | 150.8 s (7% slower) |
| bar.py ×7 fast | 1 at a time | 23.1 s |
| bar.py ×7 fast | 2 at a time | **17.2 s** (26% faster) |
| 19 inspections, 8 scripts | one process each | 25.3-25.6 s |
| 19 inspections, 8 scripts | one shared process | **12.5-13.0 s** |
| same 19, before the build fixes | shared process | 59.6 s |

Hence the defaults: final/quality renders run one at a time on CPU, fast previews 2 at a time, ultra jobs share
one process.

## Cache behaviour (verified)

Unchanged rerun: hit. `touch` on the script only: hit (rehash). Edited texture in the script folder: rebuild.
Deleted output: rebuild. Edited script: rebuild. New file in the script folder: rebuild. `--force`: rebuild.
Blender's own config files are excluded from the fingerprint.

## Export round-trips (verified)

bar.py → GLB, FBX, OBJ, USD, STL: all pass. box.py → GLB, FBX, OBJ, STL pass. box.py → USD fails correctly:
Blender's USD exporter writes the beveled drizzle curves as bare USD curves, losing 6,384 triangles. The fix is
to convert curves to mesh first. glTF exports list the procedural materials (noise, voronoi, color ramps) that
won't survive in three.js.

## Not measurable here

- GPU device selection and the CPU/GPU/hybrid bench (no GPU in this container). The code path is written against
  the Cycles preferences API but unverified on real hardware.
- EEVEE previews and Workbench thumbnails (no libEGL; probe records both as unavailable and bpe skips them).
