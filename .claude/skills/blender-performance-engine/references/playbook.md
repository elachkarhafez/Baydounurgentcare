# Optimization playbook

Work from the measured bottleneck down. `bpe report` and each run summary split a job into **startup · build
(your Python + scene evaluation) · render**. `bpe run ... --profile` adds a cProfile of the build. Optimize the
largest number first; on a CPU-only box that's almost always the render.

"Final-safe" means the change can't alter the deliverable's look. Everything else is preview-only unless the user
approves it.

## 1. Cycles

Final-safe:
- Fastest device by measurement (`bpe probe --bench`, `bpe bench-device`). GPU isn't always faster: small scenes,
  heavy CPU-side sync and old cards can lose to the CPU. Hybrid GPU+CPU sometimes wins and sometimes loses. Measure it.
- OptiX denoiser only on an OPTIX device. Otherwise OIDN (`denoising_use_gpu` when the device is a GPU, 4.1+).
- `render.use_persistent_data = True` when one process renders many frames/states of the same scene. It keeps BVH
  and shaders between renders. It costs memory, so leave it off for a single still.
- Adaptive sampling on (`use_adaptive_sampling`) with the script's own threshold.
- Light tree (default on since 4.0) helps many-light scenes. For 1-4 lights it's roughly neutral. Don't touch it
  without measuring.
- Spatial splits (`debug_use_spatial_splits`) speed up rendering of very uneven geometry but slow the BVH build.
  Only worth it for long renders of big scenes. Measure.
- Texture memory: float HDRIs at 4k+ for reflections only are waste. A 1k-2k HDRI reflects the same in most
  product shots. Changing it is an asset change, so the user decides.
- Instancing repeated geometry (linked mesh data / collection instances) cuts sync time and memory with identical
  pixels.

Preview-only (fast/quality presets do these): lower samples, higher noise threshold, fewer bounces (diffuse and
glossy first; keep transmission for glass), caustics off, filter glossy ≥1, indirect clamp, simplify subdivision,
texture size limit, lower resolution, region renders, representative frames.

Don't, even in previews: switch a shadow-catcher / transparent-film / caustics scene to EEVEE or Workbench and
call it a look check.

## 2. EEVEE (4.2+ "EEVEE Next", engine id `BLENDER_EEVEE_NEXT`; 5.x `BLENDER_EEVEE`)

- Needs a GPU context. In headless containers it may not render at all (`bpe probe` reports `headless eevee`).
- Previews: `taa_render_samples`, ray tracing off, fewer shadow rays/steps, fewer volume samples.
- Shader compilation is the hidden cost. Fewer unique materials and node groups means fewer compiles, and
  re-rendering in the same process reuses compiled shaders.
- Final-safe: remove lights with zero contribution, drop volumetrics that aren't visible, share materials.

## 3. Geometry and the Python build

- Every `bpy.ops` call updates the view layer before and after it runs (and pushes undo in the UI), so a loop of
  operator calls gets slower as the scene grows, O(n²) overall. Under bpe, `bpy.ops.mesh.primitive_*_add` runs
  in an empty scratch scene with identical results (measured 14.0 s → 1.9 s on a 587-object build). Other
  operators in loops still pay full price: use `bmesh.ops.*` / `from_pydata`, `mesh.shade_smooth()`, and
  `obj.data.transform(matrix)` instead of `transform_apply` in new code.
- Make one mesh and share it: `bpy.data.objects.new(name, shared_mesh)` for repeats (pearls, lug nuts, tiles).
- Booleans: apply them once the shape is settled if nothing downstream needs them live. They re-evaluate on every
  depsgraph update.
- Subdivision: viewport/preview level low, render level as designed. Check `inspect` → `high_subsurf`.
- Don't `bpy.context.view_layer.update()` inside loops. Update once before reading evaluated data.
- Geometry Nodes: realize instances only when the next step needs real geometry. Instances are far cheaper to
  sync and render.
- Hidden helper objects (`hide_render`) still evaluate if they are boolean operands. That's expected, but delete
  helpers you no longer need.
- Never decimate a deliverable to make it faster unless the user asked for a lighter asset.

## 4. Animation

- Validate timing as data: keyframe counts, f-curve ranges, `frame_start/end`, constraint targets, NLA strips. Use
  `inspect`, or a short ultra script that prints them.
- Preview poses with `--every N` (frame loops in Python) or the mode's representative frames (`render(animation=True)`).
- Constraints and drivers evaluate every frame. Bake heavy rigs to keyframes for final renders when the rig itself
  isn't the deliverable (`bpy.ops.nla.bake`). That's quality-neutral.
- Never thin frames or change fps/timing for speed. Final renders every frame of the range.

## 5. Simulations

- Bake in a dedicated step (`bpy.ops.ptcache.bake_all(bake=True)`, fluid `bpy.ops.fluid.bake_all()`, Geometry Nodes
  `bpy.ops.object.simulation_nodes_cache_bake`), to disk, next to the .blend.
- The bpe fingerprint includes files in fluid cache directories, Geometry Nodes bake directories and disk point
  caches (`blendcache_<name>/`), so a re-bake invalidates downstream renders and an unchanged bake is reused.
- Preview the bake at low resolution in fast mode. Final renders read the full-resolution bake. Resolution and substeps
  are quality settings: preview-only unless approved.
- A changed emitter, collider, force field or setting means re-bake. Never render final from a cache older than its
  inputs.

## 6. Export (prefer this over rendering when the deliverable is a 3D asset)

| Format | Carries | Watch for |
|---|---|---|
| glTF/GLB | meshes, Principled BSDF + image textures, UVs, skins, animations, morph targets | procedural nodes don't survive (bake to textures), Y-up, metres, Draco needs the three.js DRACOLoader |
| FBX | meshes, skeletons, animation, basic materials | scale (apply transforms, unit scale 1.0), leaf bones off, embed textures with `path_mode='COPY'` |
| OBJ | static meshes, UVs, MTL basic materials | no animation, no rigs |
| USD | meshes, materials (UsdPreviewSurface), cameras, lights, animation | material translation differs per app |
| STL | triangles only | units, no materials or UVs |

`bpe export` validates by re-importing. Check the reported warnings for procedural materials before handing a GLB
to three.js.

## 7. Version notes (bpe checks these at runtime, but write scripts for them)

- 4.0: Principled BSDF v2 input names (`Coat Weight`, `Transmission Weight`, `Specular IOR Level`, `Sheen Weight`);
  AgX became the default view transform.
- 4.1: Auto Smooth replaced by `shade_smooth_by_angle` / the Smooth by Angle modifier; OIDN can run on the GPU;
  `denoising_quality` exists.
- 4.2 LTS: EEVEE Next (`BLENDER_EEVEE_NEXT`) with different settings from legacy EEVEE.
- 5.x: the EEVEE id is `BLENDER_EEVEE` again. Check `bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items`
  rather than hardcoding it. For anything else version-dependent, `hasattr` before setting.

## 8. Reading a Cycles log for stage costs

`bpe` writes Blender's log next to its job files (path shown on failure). The lines to look at:
`Synchronizing object` (Python-built scene to Cycles), `Updating Scene BVH` (acceleration structure),
`Loading render kernels` (first GPU run compiles/loads kernels, so a cold start is slower),
`Sample N/M` (path tracing; time per sample × samples), then the jump at the end (denoise + save).
