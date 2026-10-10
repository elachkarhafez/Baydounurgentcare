# Asset library: real models, textures and lighting for 3D designs

Free, licence-clean assets that make the build3d scenes look real instead of drawn.
Everything here is CC0 unless a row says otherwise.

## What's in it

| | |
|---|---|
| `catalog.json` | **6,308 assets** indexed: Poly Haven models (521), textures (867), HDRIs (997); ambientCG materials + more (2,902); Sketchfab downloadable CC0 / CC-BY food + tableware models (1,021, metadata). Rebuild with `python3 build-catalog.py`. |
| `cache.json` + `cache-index.jpg` | What's already downloaded and web-ready (thumbnail sheet to browse by eye). |
| `models/` | 60 Poly Haven scans packed as GLB (webp textures, ≤1024px): fruit, bread, cakes, onion, tableware, brass/enamel pots, kettles, boards, baskets, bowls, tables, chalkboard. |
| `materials/` | 69 ambientCG PBR sets at 512px webp (`color/normal/rough/ao/disp/metal`): metals (hammered, polished, brass, copper), foil, porcelain, glazed terracotta, marble, onyx, travertine, terrazzo, granite, woods, planks, tiles, fabric, leather, paper, cardboard, wicker, bamboo, ice, clay, candy, pizza, plus fingerprints/smear/scratches overlays. |
| `hdri/` | 9 HDRIs downsized to 512×256 for reflections: cowboy_town_saloon (warm restaurant), comfy_cafe, lythwood_lounge, anniversary_lounge, kiara_interior, brown_photostudio_02, studio_small_09, lapa, venice_sunset. |

## Tools

```bash
L=.claude/skills/ela-studio/kit/library
python3 $L/find.py hammered metal --kind material      # search the catalog
python3 $L/peek.py /tmp/sheet.jpg bowl --kind model     # thumbnail sheet of results
python3 $L/fetch.py polyhaven:croissant <site>/assets/models            # → croissant.glb
python3 $L/fetch.py ambientcg:Metal051B <site>/assets/tex --web 512     # → color/normal/rough webp
python3 $L/fetch.py polyhaven:comfy_cafe /tmp/h && python3 $L/hdrsize.py /tmp/h/comfy_cafe_1k.hdr <site>/assets/cafe-512.hdr
```

### The client's own food, made real (best results)
1. **Photo textures**: `phototex.py <photo> x0,y0,x1,y1 <site>/assets/tex/rice --size 512`
   crops their photo, removes the lighting gradient, makes it tile seamlessly and builds a
   normal map. `--rot` puts a long strip (kofta, a skewer) along V for lathe geometry.
2. **Image → 3D**: `i23d.py <crop.png> <out.glb>` runs TRELLIS.2 / TRELLIS / Hunyuan3D-2 /
   Stable Fast 3D on Hugging Face (free). Crop to one dish, whole item in frame.
   - Needs `HF_TOKEN` (free account) for a real daily allowance; anonymous quota is about one run.
   - `split-glb.mjs in.glb out.glb x <min> <max>` cuts a multi-item result apart (`--hist` shows where the gaps are).
   - `repaint-wall.py in.glb out.glb` glazes a bowl/cup wall the photo couldn't see (it comes out dark).
   - In three.js, generated GLBs have **no normals** and **metalness 1** (glTF default):
     `geometry.computeVertexNormals()`, `metalness = 0`, or they render black (and GTAO reads them as fully occluded).
3. **Sketchfab** models need `SKETCHFAB_TOKEN` (free account → Settings → Password & API). CC-BY needs a credit line in the footer; skip NonCommercial.

## Render recipe that sells it (see `fireandfeastcommerce/src/platter.js`)
- HDRI from `hdri/` matched to the venue (warm restaurant for food) at `environmentIntensity` .7–.9.
- Real texture maps on everything; normal maps from `phototex.py` at `normalScale` 1.2–2.
- Geometry detail where the eye lands: instanced rice grains, parsley flecks, lumpy hand-pressed kofta.
- Contact shadow blobs under each object + the ShadowMaterial floor.
- Desktop: `EffectComposer` → `RenderPass` → `GTAOPass` → `OutputPass` (MSAA target, alpha survives, so the page still shows through). Skip post on phones.
- Avoid roughness maps from photographed metals on reflective trays; they read as dirt. Normal map + flat roughness instead.
