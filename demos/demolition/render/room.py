# Studline Demo & Haul (ElaSystems concept): one bathroom, path-traced in three states (before / demo day / after).
# The page wipes between them with a jagged break line as you drag.
# usage: bpe run room.py -m final -- <out_dir> <state: before|demo|after> [samples] [scale] [view: wide|tall]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector, Matrix, Euler

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; STATE = argv[1]; SAMPLES = int(argv[2]) if len(argv) > 2 else 64; SCALE = float(argv[3]) if len(argv) > 3 else 1.; VIEW = argv[4] if len(argv) > 4 else 'wide'
from bpe_assets import asset  # pinned in blender-perf.json, fetched once into the shared cache (run through bpe)
HDRI = asset('studio_small_09_1k.hdr')
random.seed(3)
def lerp(a, b, t): return a + (b - a) * t
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def link(o): col.objects.link(o); return o

# ---------------------------------------------------------------- materials
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')
def principled(name, color, **kw):
    m, nt, out = node_mat(name); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = color
    for k, v in kw.items(): b.inputs[k].default_value = v
    nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b, out
def tex_color(nt, b, kind, scale, c0, c1, p0=0., p1=1., coord='Object', detail=6, distort=0., vec_scale=(1, 1, 1)):
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = vec_scale
    nt.links.new(tc.outputs[coord], mp.inputs['Vector'])
    if kind == 'wave':
        tx = nt.nodes.new('ShaderNodeTexWave'); tx.inputs['Scale'].default_value = scale; tx.inputs['Distortion'].default_value = distort; tx.inputs['Detail'].default_value = detail
    elif kind == 'voronoi':
        tx = nt.nodes.new('ShaderNodeTexVoronoi'); tx.inputs['Scale'].default_value = scale
    else:
        tx = nt.nodes.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value = scale; tx.inputs['Detail'].default_value = detail; tx.inputs['Distortion'].default_value = distort
    nt.links.new(mp.outputs[0], tx.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = p0; cr.color_ramp.elements[0].color = c0; cr.color_ramp.elements[1].position = p1; cr.color_ramp.elements[1].color = c1
    nt.links.new(tx.outputs[0 if kind != 'voronoi' else 'Distance'], cr.inputs[0]); nt.links.new(cr.outputs[0], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .25; bp.inputs['Distance'].default_value = .0008
    nt.links.new(tx.outputs[0 if kind != 'voronoi' else 'Distance'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return cr

WOOD = principled('stud', hexc('#d8b98a'), Roughness=.72)
tex_color(WOOD[1], WOOD[2], 'wave', 9, hexc('#c49a62'), hexc('#e4c79a'), .2, .8, distort=6, vec_scale=(1, 1, .12)); WOOD = WOOD[0]
OSB = principled('osb', hexc('#b98b55'), Roughness=.8)
tex_color(OSB[1], OSB[2], 'voronoi', 60, hexc('#b58c5a'), hexc('#cfab7a'), 0, .5, coord='Object'); OSB = OSB[0]
PLY = principled('plywood', hexc('#d6b483'), Roughness=.7)
tex_color(PLY[1], PLY[2], 'wave', 6, hexc('#cfa874'), hexc('#dfc092'), .2, .8, distort=3, vec_scale=(.3, 1, 1)); PLY = PLY[0]
DRYWALL = principled('drywall', hexc('#c9d3bd'), Roughness=.85)[0]          # dated sage paint
GYPSUM = principled('gypsum', hexc('#efebe2'), Roughness=.95)[0]
TILE = principled('tile', hexc('#e3d2b3'), Roughness=.18, **{'Coat Weight': .3})[0]
GROUT = principled('grout', hexc('#cbc3b4'), Roughness=.95)[0]
FLOORT = principled('floortile', hexc('#b9a68e'), Roughness=.35)
tex_color(FLOORT[1], FLOORT[2], 'noise', 30, hexc('#a8937a'), hexc('#c9b8a0'), .3, .7); FLOORT = FLOORT[0]
OAK = principled('oak', hexc('#b9803f'), Roughness=.45, **{'Coat Weight': .4})
tex_color(OAK[1], OAK[2], 'wave', 14, hexc('#a06a30'), hexc('#cf9a5a'), .2, .8, distort=5, vec_scale=(.15, .15, 1)); OAK = OAK[0]
PORC = principled('porcelain', hexc('#f6f4ef'), Roughness=.08, **{'Coat Weight': .6})[0]
CHROME = principled('chrome', (.85, .86, .88, 1), Metallic=1., Roughness=.08)[0]
COPPER = principled('copper', hexc('#c9773f'), Metallic=1., Roughness=.3)[0]
PVC = principled('pvc', hexc('#f2f2ee'), Roughness=.35)[0]
BLACKPLASTIC = principled('bag', hexc('#18191b'), Roughness=.25, **{'Coat Weight': .6})[0]
TARP = principled('tarp', hexc('#2f6fb3'), Roughness=.35, **{'Coat Weight': .3})[0]
STEEL = principled('steel', (.45, .46, .48, 1), Metallic=1., Roughness=.35)[0]
HANDLE = principled('fiberglass', hexc('#f2c230'), Roughness=.35, **{'Coat Weight': .4})[0]
MIRROR = principled('mirror', (.95, .95, .95, 1), Metallic=1., Roughness=.02)[0]
GLOBE = principled('globe', (1, 1, 1, 1), Roughness=.3, **{'Emission Color': hexc('#ffe2b0'), 'Emission Strength': 6., 'Transmission Weight': .5})[0]
DUST = principled('dust', hexc('#e6e0d4'), Roughness=1.)[0]
BOXWIRE = principled('jbox', hexc('#3b6fd0'), Roughness=.4)[0]

def box(name, size, loc, mat, bevel=.002, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.active_object; o.name = name; o.scale = size
    if bevel: bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 2
    o.data.materials.append(mat); return o

# ---------------------------------------------------------------- room shell
# back wall: drywall face at y = 0, studs behind (y > 0); left wall: face at x = 0, studs at x < 0.  Floor z = 0.
W, D, HT = 2.1, 3.0, 2.4
STUD = (.038, .089)
def wall_frame(axis):
    objs = []
    span = W if axis == 'back' else D
    n = int(span / .406) + 1
    R = W + .0127 + STUD[1] / 2
    for i in range(n + 1):
        u = min(span - .02, i * .406 + .02)
        if axis == 'back': objs.append(box('stud', (STUD[0], STUD[1], HT), (u, .0127 + STUD[1] / 2, HT / 2), WOOD, .001))
        elif axis == 'left': objs.append(box('stud', (STUD[1], STUD[0], HT), (-.0127 - STUD[1] / 2, -u, HT / 2), WOOD, .001))
        else: objs.append(box('stud', (STUD[1], STUD[0], HT), (R, -u, HT / 2), WOOD, .001))
    for z in (STUD[0] / 2, HT - STUD[0] / 2, HT - STUD[0] * 1.5):
        if axis == 'back': objs.append(box('plate', (span, STUD[1], STUD[0]), (span / 2, .0127 + STUD[1] / 2, z), WOOD, .001))
        elif axis == 'left': objs.append(box('plate', (STUD[1], span, STUD[0]), (-.0127 - STUD[1] / 2, -span / 2, z), WOOD, .001))
        else: objs.append(box('plate', (STUD[1], span, STUD[0]), (R, -span / 2, z), WOOD, .001))
    # sheathing behind
    if axis == 'back': objs.append(box('osb', (span + .3, .011, HT), (span / 2, .0127 + STUD[1] + .006, HT / 2), OSB, 0))
    elif axis == 'left': objs.append(box('osb', (.011, span + .3, HT), (-.0127 - STUD[1] - .006, -span / 2, HT / 2), OSB, 0))
    else: objs.append(box('osb', (.011, span + .3, HT), (W + .0127 + STUD[1] + .006, -span / 2, HT / 2), OSB, 0))
    return objs
frame = wall_frame('back') + wall_frame('left') + wall_frame('right')
# ceiling
box('ceiling', (W + .4, D + .4, .02), (W / 2, -D / 2, HT + .01), GYPSUM, 0)
box('frontwall', (W + .4, .02, HT), (W / 2, -D - .01, HT / 2), principled('door', hexc('#f1eee8'), Roughness=.6)[0], 0)
# subfloor + floor tile
box('subfloor', (W + .4, D + .4, .019), (W / 2, -D / 2, -.0095), PLY, 0)

def keep(u, z):
    if z < 1.25: return math.sin(u * 3.1 + z * 2.3) + math.cos(u * 1.7 - z * 4.1) > 1.15
    return math.sin(u * 7.3 + z * 3.1) + math.sin(u * 2.1 - z * 5.7) < .95

def drywall(axis, holes=False):
    """Drywall as a grid of chunks so demo day can knock some out."""
    out = []; span = W if axis == 'back' else D; cw, ch = .2, .2
    for i in range(int(span / cw) + 1):
        for j in range(int(HT / ch) + 1):
            u0, z0 = i * cw, j * ch
            if u0 >= span or z0 >= HT: continue
            sw, sh = min(cw, span - u0), min(ch, HT - z0)
            if holes and not keep(u0 + sw / 2 + (0 if axis == 'back' else 3.7 if axis == 'left' else 7.1), z0 + sh / 2): continue
            jit = .003 if holes else 0
            if axis == 'back': o = box('dw', (sw, .0127, sh), (u0 + sw / 2, .0064, z0 + sh / 2), DRYWALL, .0005)
            elif axis == 'left': o = box('dw', (.0127, sw, sh), (-.0064, -(u0 + sw / 2), z0 + sh / 2), DRYWALL, .0005)
            else: o = box('dw', (.0127, sw, sh), (W + .0064, -(u0 + sw / 2), z0 + sh / 2), DRYWALL, .0005)
            if holes: o.rotation_euler = (random.uniform(-.03, .03), random.uniform(-.03, .03), random.uniform(-.02, .02))
            out.append(o)
    return out

def tiles(axis, height=1.22, holes=False):
    """Dated 4.25 inch beige tiles with grout, as one mesh."""
    T, g = .108, .003; span = W if axis == 'back' else D
    bm = bmesh.new()
    for i in range(int(span / T)):
        for j in range(int(height / T)):
            u, z = i * T + T / 2, j * T + T / 2
            if holes and (not keep(u + (0 if axis == 'back' else 3.7 if axis == 'left' else 7.1), z) or random.random() < .25): continue
            ret = bmesh.ops.create_cube(bm, size=1)
            sx, sy, sz = (T - g, .008, T - g) if axis == 'back' else (.008, T - g, T - g)
            loc = (u, -.004, z) if axis == 'back' else ((.004, -u, z) if axis == 'left' else (W - .004, -u, z))
            bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=ret['verts']); bmesh.ops.translate(bm, vec=loc, verts=ret['verts'])
    me = bpy.data.meshes.new('tiles'); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('tiles', me)); bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .0018; bv.segments = 3; o.data.materials.append(TILE)
    for p in o.data.polygons: p.use_smooth = True
    # grout bed
    if holes: return o
    if axis == 'back': box('grout', (span, .004, height), (span / 2, -.002, height / 2), GROUT, 0)
    elif axis == 'left': box('grout', (.004, span, height), (.002, -span / 2, height / 2), GROUT, 0)
    else: box('grout', (.004, span, height), (W - .002, -span / 2, height / 2), GROUT, 0)
    return o

def floor_tiles():
    T, g = .3, .004; bm = bmesh.new()
    for i in range(8):
        for j in range(11):
            ret = bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(T - g, T - g, .01), verts=ret['verts'])
            bmesh.ops.translate(bm, vec=(i * T + T / 2 - .05, -(j * T + T / 2) + .05, .005), verts=ret['verts'])
    me = bpy.data.meshes.new('ftiles'); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('ftiles', me)); bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .002; bv.segments = 2; o.data.materials.append(FLOORT)
    box('fgrout', (W + .4, D + .4, .006), (W / 2, -D / 2, .003), GROUT, 0)
    return o

def lathe(name, prof, seg=64):
    verts, faces, rings = [], [], []
    for r, z in prof:
        if r < 1e-7: verts.append((0, 0, z)); rings.append([len(verts) - 1])
        else:
            idx = []
            for k in range(seg): a = 2 * pi * k / seg; verts.append((r * cos(a), r * sin(a), z)); idx.append(len(verts) - 1)
            rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(seg):
            if len(A) == 1 and len(B) == 1: break
            if len(A) == 1: faces.append((A[0], B[(k + 1) % seg], B[k]))
            elif len(B) == 1: faces.append((A[k], A[(k + 1) % seg], B[0]))
            else: faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return link(bpy.data.objects.new(name, me))

def fixtures():
    # oak vanity with two doors, cultured-marble top, oval sink, chrome faucet
    vx = .75
    box('vanity', (.9, .52, .8), (vx, -.27, .4), OAK, .006)
    for dx in (-.215, .215):
        box('door', (.4, .02, .62), (vx + dx, -.535, .43), OAK, .008)
        box('knob', (.02, .03, .02), (vx + dx + (.15 if dx < 0 else -.15), -.555, .55), CHROME, .006)
    box('top', (.94, .56, .03), (vx, -.28, .815), principled('marble', hexc('#efe6d2'), Roughness=.15, **{'Coat Weight': .5})[0], .006)
    s = lathe('sink', [(0, .74), (.15, .745), (.2, .79), (.205, .832), (.215, .832)], 64); s.scale = (1, .75, 1); s.location = (vx, -.29, 0); s.data.materials.append(PORC)
    for p in [((vx, -.08, .9), (.012, .012, .09)), ((vx, -.13, .97), (.012, .1, .012))]:
        box('faucet', p[1], p[0], CHROME, .005)
    # mirror + globe light bar
    box('mframe', (.82, .02, .92), (vx, -.012, 1.55), OAK, .008); box('mirror', (.76, .006, .86), (vx, -.024, 1.55), MIRROR, 0)
    box('lightbar', (.8, .06, .07), (vx, -.04, 2.08), CHROME, .01)
    for dx in (-.28, 0, .28):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.05, location=(vx + dx, -.1, 2.03)); g = bpy.context.active_object; g.data.materials.append(GLOBE)
        for p in g.data.polygons: p.use_smooth = True
    # toilet
    tx = 1.55
    base = lathe('tbase', [(0, 0), (.14, 0), (.15, .05), (.12, .25), (.17, .38), (.19, .4), (.16, .42), (0, .4)], 64); base.scale = (1, 1.35, 1); base.location = (tx, -.36, 0); base.data.materials.append(PORC)
    box('tank', (.48, .2, .36), (tx, -.12, .6), PORC, .02); box('tanklid', (.5, .22, .03), (tx, -.12, .795), PORC, .012)
    box('seat', (.36, .44, .025), (tx, -.4, .425), PORC, .03)
    # towel bar on the left wall
    box('towelbar', (.02, .6, .02), (-.04, -1.0, 1.2), CHROME, .006)
    box('towel', (.03, .5, .5), (-.05, -1.0, .97), principled('towel', hexc('#e9dccb'), Roughness=.9, **{'Sheen Weight': 1.})[0], .01)

def plumbing():
    for dx in (-.08, .08):
        bpy.ops.mesh.primitive_cylinder_add(radius=.008, depth=.55, location=(.75 + dx, .04, .6)); p = bpy.context.active_object; p.data.materials.append(COPPER)
        bpy.ops.mesh.primitive_cylinder_add(radius=.008, depth=.1, location=(.75 + dx, -.02, .55), rotation=(pi / 2, 0, 0)); p = bpy.context.active_object; p.data.materials.append(COPPER)
        box('valve', (.03, .04, .03), (.75 + dx, -.07, .55), CHROME, .006)
    bpy.ops.mesh.primitive_cylinder_add(radius=.024, depth=.9, location=(.75, .05, .45)); p = bpy.context.active_object; p.data.materials.append(PVC)
    bpy.ops.mesh.primitive_cylinder_add(radius=.024, depth=.12, location=(.75, -.01, .45), rotation=(pi / 2, 0, 0)); p = bpy.context.active_object; p.data.materials.append(PVC)
    # toilet flange, capped
    bpy.ops.mesh.primitive_cylinder_add(radius=.09, depth=.012, location=(1.55, -.3, .006)); p = bpy.context.active_object; p.data.materials.append(PVC)
    # electrical box on a stud with a wire coil
    box('jbox', (.06, .05, .09), (.33, .045, 1.15), BOXWIRE, .004)

def debris(n=260):
    bm = bmesh.new()
    for i in range(n):
        ret = bmesh.ops.create_cube(bm, size=1); s = random.uniform(.02, .09)
        bmesh.ops.scale(bm, vec=(s, s * random.uniform(.5, 1.2), random.uniform(.004, .012)), verts=ret['verts'])
        r = random.random() ** .6 * .55; a = random.uniform(0, 2 * pi)
        cx, cy = .55 + cos(a) * r, -.45 + sin(a) * r * .8
        h = max(0, .16 - r * .28) * random.uniform(.3, 1)
        M = Matrix.Translation((cx, cy, .02 + h)) @ Euler((random.uniform(-.8, .8), random.uniform(-.8, .8), random.uniform(0, 3))).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=M, verts=ret['verts'])
    me = bpy.data.meshes.new('debris'); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('debris', me)); bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .0015
    o.data.materials.append(TILE); o.data.materials.append(GYPSUM); o.data.materials.append(DRYWALL)
    for i, p in enumerate(o.data.polygons): p.material_index = (i // 6) % 3
    return o

def tools_and_bags():
    # sledgehammer leaning on the left wall
    sh = link(bpy.data.objects.new('sledge', None)); sh.location = (.12, -1.25, 0); sh.rotation_euler = (0, -.22, .2)
    h = box('handle', (.035, .035, .9), (0, 0, .47), HANDLE, .01); h.parent = sh
    hd = box('head', (.07, .2, .07), (0, 0, .95), STEEL, .008); hd.parent = sh
    # contractor bags
    for (x, y, s) in [(1.55, -.45, 1.), (1.25, -.9, .9), (1.72, -.95, .85)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.28 * s, segments=48, ring_count=32, location=(x, y, .24 * s))
        b = bpy.context.active_object; b.scale = (1, .9, .85)
        tex = bpy.data.textures.new('wr', 'CLOUDS'); tex.noise_scale = .12
        d = b.modifiers.new('d', 'DISPLACE'); d.texture = tex; d.strength = .06 * s
        b.data.materials.append(BLACKPLASTIC)
        for p in b.data.polygons: p.use_smooth = True
        bpy.ops.mesh.primitive_cone_add(radius1=.07 * s, depth=.12 * s, location=(x, y, .46 * s)); k = bpy.context.active_object; k.data.materials.append(BLACKPLASTIC)
    # floor protection
    tarp = box('tarp', (W - .05, D - .05, .002), (W / 2, -D / 2, .012), TARP, 0)
    tex = bpy.data.textures.new('wrinkle', 'CLOUDS'); tex.noise_scale = .25
    sub = tarp.modifiers.new('s', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = sub.render_levels = 5
    d = tarp.modifiers.new('d', 'DISPLACE'); d.texture = tex; d.strength = .012

def broom():
    br = link(bpy.data.objects.new('broom', None)); br.location = (1.85, -.15, 0); br.rotation_euler = (.12, -.1, 0)
    h = box('bhandle', (.025, .025, 1.25), (0, 0, .7), principled('bh', hexc('#2b3f8f'), Roughness=.4)[0], .008); h.parent = br
    hd = box('bhead', (.3, .06, .06), (0, 0, .06), principled('bristle', hexc('#2a2a2a'), Roughness=.9)[0], .01); hd.parent = br

# ---------------------------------------------------------------- build the state
if STATE == 'before':
    drywall('back'); drywall('left'); drywall('right'); tiles('back'); tiles('left'); tiles('right'); floor_tiles(); fixtures()
elif STATE == 'demo':
    drywall('back', holes=True); drywall('left', holes=True); drywall('right', holes=True); tiles('back', holes=True); tiles('left', holes=True); tiles('right', holes=True); floor_tiles()
    plumbing(); debris(); tools_and_bags()
    # dust hanging in the air
    w = bpy.data.worlds.new('tmp')
else:
    plumbing(); broom()

# ---------------------------------------------------------------- light + camera
def area(name, loc, target, size, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.size = size
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('ceiling', (1.05, -1.2, 2.36), (1.05, -1.2, 0), .9, 26, (1, .9, .78))
area('work', (1.7, -2.7, 1.7), (.7, -.2, .9), .8, 34, (1, .98, .95))
area('bounce', (.5, -2.6, .7), (.7, 0, 1.0), 1.0, 8, (.95, .97, 1))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .12; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])
if STATE == 'demo':   # light haze of drywall dust
    vol = bpy.data.materials.new('haze'); vol.use_nodes = True; vn = vol.node_tree; vn.nodes.clear()
    vs = vn.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = .025; vs.inputs['Color'].default_value = hexc('#f1ece2')
    vo = vn.nodes.new('ShaderNodeOutputMaterial'); vn.links.new(vs.outputs[0], vo.inputs['Volume'])
    hz = box('haze', (W, D, HT), (W / 2, -D / 2, HT / 2), vol, 0)

cd = bpy.data.cameras.new('cam'); cd.lens = 24; cd.dof.use_dof = False
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
r = scn.render
if VIEW == 'wide':
    r.resolution_x, r.resolution_y = 1800, 1000; cam.location = (1.75, -2.85, 1.5); target = Vector((.85, -.3, 1.05)); cd.lens = 16
else:
    r.resolution_x, r.resolution_y = 1000, 1300; cam.location = (1.6, -2.85, 1.45); target = Vector((.85, -.35, 1.0)); cd.lens = 15
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
r.resolution_percentage = int(100 * SCALE)
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .025
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 3; cy.diffuse_bounces = 4; cy.sample_clamp_indirect = 8; cy.volume_bounces = 1
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
os.makedirs(OUT, exist_ok=True)
r.filepath = os.path.join(OUT, f'{STATE}-{VIEW}.png'); bpy.ops.render.render(write_still=True)
print('done')
