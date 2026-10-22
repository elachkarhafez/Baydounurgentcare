# Treats to Love: their signature box of white-chocolate strawberries with gold-framed name plaques,
# path-traced in Cycles. Plaques render blank; the page writes the visitor's initials onto them using the
# plaque corners this script exports (projected to the image), so the names sit in perspective.
#
# usage: bpe run box.py -m final -- <out_dir> <view: wide|tall> [samples] [scale]
import bpy, bmesh, math, random, sys, os, json
from math import sin, cos, pi
from mathutils import Vector, Matrix, Euler
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; VIEW = argv[1] if len(argv) > 1 else 'wide'; SAMPLES = int(argv[2]) if len(argv) > 2 else 64; SCALE = float(argv[3]) if len(argv) > 3 else 1.
from bpe_assets import asset  # pinned in blender-perf.json, fetched once into the shared cache (run through bpe)
HDRI = asset('studio_small_09_1k.hdr')
random.seed(7)

def clamp(v, a=0., b=1.): return max(a, min(b, v))
def smooth(a, b, x):
    t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def link(o): col.objects.link(o); return o

def mesh_obj(name, verts, faces, smooth_all=True, recalc=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if recalc:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth_all
    return link(bpy.data.objects.new(name, me))

def lathe(name, prof, seg=96):
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
    return mesh_obj(name, verts, faces)

def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')
def principled(name, color, **kw):
    m, nt, out = node_mat(name); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = color
    for k, v in kw.items(): b.inputs[k].default_value = v
    nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b, out
def bump(nt, b, scale, strength, dist, kind='noise', coord='Object'):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tx = nt.nodes.new('ShaderNodeTexNoise' if kind == 'noise' else 'ShaderNodeTexVoronoi'); tx.inputs['Scale'].default_value = scale
    if kind == 'noise': tx.inputs['Detail'].default_value = 6
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength; bp.inputs['Distance'].default_value = dist
    nt.links.new(tc.outputs[coord], tx.inputs['Vector']); nt.links.new(tx.outputs[0 if kind == 'noise' else 'Distance'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])

# ---------------------------------------------------------------- materials
GOLD = principled('gold', hexc('#d9ad55'), Metallic=1., Roughness=.3)
bump(GOLD[1], GOLD[2], 420, .55, .00012); GOLD = GOLD[0]
PLAQUE = principled('plaque', hexc('#efe6d6'), Roughness=.5, **{'Coat Weight': .25, 'Coat Roughness': .2})
bump(PLAQUE[1], PLAQUE[2], 1400, .06, .00002); PLAQUE = PLAQUE[0]
def choc_mat():
    """White chocolate shell with the strawberry showing above an uneven dip line (object Z)."""
    m, nt, b, out = principled('choc', hexc('#f4ece0'), Roughness=.22, **{'Subsurface Weight': .35, 'Subsurface Scale': .003, 'Coat Weight': .35, 'Coat Roughness': .12})
    berry = nt.nodes.new('ShaderNodeBsdfPrincipled'); berry.inputs['Base Color'].default_value = hexc('#b4152c'); berry.inputs['Roughness'].default_value = .3; berry.inputs['Coat Weight'].default_value = .5
    berry.inputs['Subsurface Weight'].default_value = .3; berry.inputs['Subsurface Scale'].default_value = .002
    # seeds on the berry part
    tc = nt.nodes.new('ShaderNodeTexCoord'); vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 260
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = hexc('#e9c34c'); cr.color_ramp.elements[1].position = .1; cr.color_ramp.elements[1].color = hexc('#b4152c')
    nt.links.new(tc.outputs['Object'], vo.inputs['Vector']); nt.links.new(vo.outputs['Distance'], cr.inputs[0]); nt.links.new(cr.outputs[0], berry.inputs['Base Color'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 90; nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'; add.inputs[1].default_value = .004; nt.links.new(nz.outputs['Fac'], add.inputs[0]); nt.links.new(sep.outputs['Z'], add.inputs[2])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = .0375; mr.inputs['From Max'].default_value = .0385; nt.links.new(add.outputs[0], mr.inputs['Value'])
    mix = nt.nodes.new('ShaderNodeMixShader'); nt.links.new(mr.outputs[0], mix.inputs[0]); nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(berry.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .12; bp.inputs['Distance'].default_value = .0003
    nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 160; nt.links.new(tc.outputs['Object'], nz2.inputs['Vector']); nt.links.new(nz2.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m
CHOC = choc_mat()
LEAF = principled('leaf', hexc('#2f6b22'), Roughness=.45, **{'Subsurface Weight': .25, 'Subsurface Scale': .001})[0]
MALLOW = principled('mallow', hexc('#fbf8f2'), Roughness=.75, **{'Subsurface Weight': .6, 'Subsurface Scale': .004, 'Sheen Weight': .3})[0]
PAPER = principled('paper', hexc('#f7f4ee'), Roughness=.8); bump(PAPER[1], PAPER[2], 600, .08, .0002); PAPER = PAPER[0]
LINEN = principled('linen', hexc('#e3d4bf'), Roughness=.85, **{'Sheen Weight': .5})
bump(LINEN[1], LINEN[2], 700, .3, .0004, 'voronoi'); LINEN = LINEN[0]

# ---------------------------------------------------------------- set
bpy.ops.mesh.primitive_plane_add(size=3); cloth = bpy.context.active_object; cloth.data.materials.append(LINEN)
# box: base + walls (inside dims 0.30 x 0.20, wall 0.045 high)
BW, BD, BH = .30, .20, .045
def slab(name, sx, sy, sz, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.scale = (sx, sy, sz); o.name = name
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .0012; bv.segments = 3; o.data.materials.append(mat); return o
slab('base', BW + .01, BD + .01, .004, (0, 0, .002), PAPER)
slab('wallN', BW + .01, .003, BH, (0, BD / 2 + .0035, BH / 2), PAPER)
slab('wallS', BW + .01, .003, BH, (0, -BD / 2 - .0035, BH / 2), PAPER)
slab('wallE', .003, BD + .01, BH, (BW / 2 + .0035, 0, BH / 2), PAPER)
slab('wallW', .003, BD + .01, BH, (-BW / 2 - .0035, 0, BH / 2), PAPER)
# marshmallow filler
for i in range(300):
    x, y = random.uniform(-BW / 2 + .008, BW / 2 - .008), random.uniform(-BD / 2 + .008, BD / 2 - .008)
    bpy.ops.mesh.primitive_cylinder_add(radius=random.uniform(.0045, .0058), depth=random.uniform(.008, .011), vertices=24, location=(x, y, .006 + random.uniform(0, .009)))
    o = bpy.context.active_object; o.rotation_euler = (random.uniform(0, pi), random.uniform(0, pi), random.uniform(0, pi))
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .0028; bv.segments = 4; o.data.materials.append(MALLOW)
    for p in o.data.polygons: p.use_smooth = True

# ---------------------------------------------------------------- strawberries
def sepal_mesh(w=.0058, h=.0135):
    verts, faces = [], []; nu, nv = 6, 8
    for j in range(nv + 1):
        v = j / nv; wid = w * math.sin(pi * (v * .95 + .03)) ** 1.2
        for i in range(nu + 1):
            u = i / nu * 2 - 1; verts.append((u * wid, v * h, .25 * abs(u * wid) + .3 * v * v * h * .3))
    for j in range(nv):
        for i in range(nu): a = j * (nu + 1) + i; faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    me = bpy.data.meshes.new('sepal'); me.from_pydata(verts, [], faces)
    for p in me.polygons: p.use_smooth = True
    return me
SEPAL = sepal_mesh()
def strawberry(loc, rot, s=1., gold_flower=False):
    prof = [(0, 0)]
    for i in range(1, 31):
        t = i / 30; z = t * .046
        body = math.sin(pi / 2 * min(1, t / .76)) ** .85          # cone out of a soft point
        top = lerp(1, .42, smooth(.7, 1.0, t) ** 1.4)                # rounded shoulders into the calyx
        r = .0178 * body * (top if t > .76 else 1) * (1 - .08 * (1 - t) ** 2)
        prof.append((max(r, .0006), z))
    prof.append((.0045, .0466)); prof.append((0, .0468))
    o = lathe('berry', prof, 64)
    for v in o.data.vertices:  # gentle lumps so it's not a perfect lathe
        n = Vector((v.co.x, v.co.y, 0)).normalized() if v.co.xy.length > 1e-5 else Vector((0, 0, 0))
        v.co += n * (math.sin(v.co.z * 400 + math.atan2(v.co.y, v.co.x) * 3) * .0004)
    o.data.materials.append(CHOC)
    # calyx: sepals fanned at the top + a short stem
    for k in range(11):
        a = k / 11 * 2 * pi + random.uniform(-.12, .12)
        sp = link(bpy.data.objects.new('sepal', SEPAL)); sp.data.materials.append(LEAF) if not sp.data.materials else None
        sp.parent = o; sp.location = (cos(a) * .006, sin(a) * .006, .0452)
        sp.rotation_euler = Euler((0, 0, a - pi / 2)); sp.rotation_euler.rotate(Euler((0, 0, 0)))
        M = Matrix.Rotation(a - pi / 2, 4, 'Z') @ Matrix.Rotation(-1.0 + random.uniform(-.15, .15), 4, 'X') @ Matrix.Diagonal((1.3, 1.25, 1, 1))
        sp.matrix_basis = Matrix.Translation((cos(a) * .0042, sin(a) * .0042, .0468)) @ M
    bpy.ops.mesh.primitive_cylinder_add(radius=.0011, depth=.008, vertices=12, location=(0, 0, .049)); st = bpy.context.active_object; st.parent = o; st.data.materials.append(LEAF)
    st.matrix_parent_inverse = Matrix.Identity(4); st.location = (0, 0, .049)
    if gold_flower:
        for k in range(7):
            a = k / 7 * 2 * pi
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.0045, segments=20, ring_count=12); pe = bpy.context.active_object; pe.parent = o; pe.data.materials.append(GOLD)
            pe.matrix_parent_inverse = Matrix.Identity(4); pe.scale = (1, .55, .18)
            pe.location = (.0172 + .0005, cos(a) * .0045, .02 + sin(a) * .0045); pe.rotation_euler = (a, 0, pi / 2)
            for p in pe.data.polygons: p.use_smooth = True
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.0022, segments=16, ring_count=10); c = bpy.context.active_object; c.parent = o; c.matrix_parent_inverse = Matrix.Identity(4); c.location = (.0185, 0, .02); c.data.materials.append(PLAQUE)
    o.location = loc; o.rotation_euler = rot; o.scale = (s, s, s)
    return o

DRIZ = principled('drizzle', hexc('#f8f2e8'), Roughness=.25, **{'Subsurface Weight': .3, 'Subsurface Scale': .002, 'Coat Weight': .3})[0]
def drizzle(berry):
    pts = []
    for i in range(80):
        t = i / 79; z = lerp(.008, .036, t); a = math.sin(t * pi * 9) * 1.1
        rr = .0182 * math.sin(pi / 2 * min(1, z / .046 / .76)) ** .85 + .0004
        pts.append((cos(a) * rr, sin(a) * rr, z))
    cu = bpy.data.curves.new('dz', 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    cu.bevel_depth = .00055; cu.bevel_resolution = 3; cu.use_fill_caps = True
    o = link(bpy.data.objects.new('dz', cu)); o.data.materials.append(DRIZ); o.parent = berry; return o

# lay them on their sides in two rows, tips alternating
berries = []
rows = [(-.045, [-.11, -.055, 0, .055, .11]), (.045, [-.085, -.03, .025, .08, .125])]
for ri_, (y, xs) in enumerate(rows):
    for j, x in enumerate(xs):
        flip = (j + ri_) % 2
        rot = (pi / 2 + random.uniform(-.1, .1), 0, (pi / 2 if flip else -pi / 2) + random.uniform(-.25, .25))
        berries.append(strawberry((x + (-.022 if flip else .022), y + random.uniform(-.006, .006), .026), rot, random.uniform(.95, 1.06), gold_flower=False))
        if (j + ri_) % 3 == 1: drizzle(berries[-1])

# gold-painted chocolate flowers on the uncovered berries (world space, facing up)
def gold_flower(loc, s=1.):
    g = link(bpy.data.objects.new('gflower', None)); g.location = loc
    for k in range(8):
        a = k / 8 * 2 * pi + random.uniform(-.1, .1)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=14); pe = bpy.context.active_object
        for v in pe.data.vertices:  # ruffle the petal edge
            v.co.z += .25 * math.sin(math.atan2(v.co.y, v.co.x) * 5) * (v.co.x ** 2)
        pe.data.materials.append(GOLD); pe.parent = g
        pe.scale = (.0062 * s, .0038 * s, .0012 * s); pe.location = (cos(a) * .0058 * s, sin(a) * .0058 * s, .0008 * s); pe.rotation_euler = (0, -.35, a)
        for p in pe.data.polygons: p.use_smooth = True
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.0028 * s, segments=16, ring_count=10, location=(0, 0, .0016 * s)); c = bpy.context.active_object; c.parent = g; c.data.materials.append(MALLOW); c.location = (0, 0, .0016 * s)
    return g
bpy.context.view_layer.update()
for bi in (0, 3, 6, 9):
    b_ = berries[bi]; c = b_.matrix_world @ Vector((0, 0, .022)); gold_flower((c.x, c.y, c.z + .0172), random.uniform(1.45, 1.6))

# ---------------------------------------------------------------- gold baroque frames with blank plaques
def frame_mesh(a=.024, b=.03, seg=220, ring=18):
    """An oval frame swept around an ellipse; the outer edge carries baroque scallops and leafy bumps."""
    verts, faces = [], []
    for i in range(seg):
        t = i / seg * 2 * pi; c = Vector((a * cos(t), b * sin(t), 0))
        tang = Vector((-a * sin(t), b * cos(t), 0)).normalized(); nrm = Vector((tang.y, -tang.x, 0))
        from mathutils import noise as _N
        crest = (.5 + .5 * math.cos(2 * (t - pi / 2))) ** 8
        lump = _N.noise(Vector((cos(t) * 2.2, sin(t) * 2.2, .3))) * .5 + .5
        orn = .0034 * lump ** 2 + .0007 * (.5 + .5 * math.cos(t * 22 + lump * 6)) + .0038 * crest * (.75 + .25 * math.cos(t * 30))
        for j in range(ring):
            th = j / ring * 2 * pi
            from mathutils import noise as _n
            rr = .0028 + orn * (.55 + .45 * math.cos(th)) + .00028 * _n.noise(Vector((cos(t) * 9, sin(t) * 9, th * 1.5)))
            p = c + nrm * (math.cos(th) * rr * 1.1 + .0012) + Vector((0, 0, math.sin(th) * .0028 + .0028))
            verts.append(tuple(p))
    for i in range(seg):
        for j in range(ring):
            a0 = i * ring + j; a1 = i * ring + (j + 1) % ring; b0 = ((i + 1) % seg) * ring + j; b1 = ((i + 1) % seg) * ring + (j + 1) % ring
            faces.append((a0, a1, b1, b0))
    return verts, faces
plaques = []
FRAMES = [((-.075, -.01, .052), (.22, -.12, .25)), ((.0, .01, .056), (-.05, .12, -.08)), ((.078, -.012, .051), (.15, .1, -.3))]
for fi, (loc, rot) in enumerate(FRAMES):
    v, f = frame_mesh(); fr = mesh_obj('frame', v, f); fr.data.materials.append(GOLD)
    sub = fr.modifiers.new('s', 'SUBSURF'); sub.render_levels = 1; sub.levels = 1
    tex = bpy.data.textures.new('carve', 'CLOUDS'); tex.noise_scale = .0035; tex.noise_depth = 2
    dsp = fr.modifiers.new('d', 'DISPLACE'); dsp.texture = tex; dsp.strength = .0007; dsp.mid_level = .5; dsp.texture_coords = 'GLOBAL'
    pl_prof = [(0, .0042), (.94, .0042), (1., .0034), (1., .0)]
    # plaque: an oval disc (scaled unit lathe)
    pl = lathe('plaque', [(0, 0), (1, 0), (1, .002), (.985, .0031), (.95, .0036), (.85, .0036), (.6, .0036), (.3, .0036), (0, .0036)], 96); pl.scale = (.0215, .0275, 1); pl.data.materials.append(PLAQUE)
    back = lathe('back', [(0, -.0005), (1, -.0005), (1, .0006), (0, .0006)], 96); back.scale = (.026, .032, 1); back.data.materials.append(GOLD)
    beads = []
    for k in range(34):
        t = k / 34 * 2 * pi
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.00075, segments=12, ring_count=8, location=(.0222 * cos(t), .0282 * sin(t), .0032)); bd = bpy.context.active_object; bd.data.materials.append(GOLD); beads.append(bd)
        for p in bd.data.polygons: p.use_smooth = True
    holder = link(bpy.data.objects.new('frameholder', None)); holder.location = loc; holder.rotation_euler = rot
    for o in [fr, pl, back] + beads: o.parent = holder
    plaques.append((pl, holder))

# ---------------------------------------------------------------- light + camera
def area(name, loc, size, power, color=(1, 1, 1), size_y=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.shape = 'RECTANGLE'; l.size = size; l.size_y = size_y or size
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector((0, 0, .03)) - o.location).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('window', (-.9, .35, .75), 1.0, 34, (1, .96, .9), .6)
area('fill', (.8, -.6, .5), .8, 6, (1, .97, .97))
area('rim', (.3, .9, .4), .6, 12, (1, .95, .9))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .22; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 70; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
focus = link(bpy.data.objects.new('focus', None)); focus.location = (0, 0, .05); cd.dof.focus_object = focus
r = scn.render
if VIEW == 'wide':
    r.resolution_x, r.resolution_y = 1800, 1000; cam.location = (.03, -.44, .36)
else:
    r.resolution_x, r.resolution_y = 1000, 1300; cam.location = (.01, -.25, .5); cd.lens = 62
cam.rotation_euler = (Vector((0, .0, .03)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
r.resolution_percentage = int(100 * SCALE)

scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 10; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 6
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'

# ---------------------------------------------------------------- export plaque quads (image space, 0..1 from top-left)
bpy.context.view_layer.update()
quads = []
for pl, holder in plaques:
    M = pl.matrix_world; pts = []
    for (u, v) in [(-.72, .5), (.72, .5), (.72, -.5), (-.72, -.5)]:   # inner text box of the oval (local units), TL, TR, BR, BL
        wpt = M @ Vector((u, v, .0037)); c = world_to_camera_view(scn, cam, wpt); pts.append([round(c.x, 5), round(1 - c.y, 5)])
    quads.append(pts)
os.makedirs(OUT, exist_ok=True)
json.dump({'w': r.resolution_x, 'h': r.resolution_y, 'plaques': quads}, open(os.path.join(OUT, f'box-{VIEW}.json'), 'w'))
r.filepath = os.path.join(OUT, f'box-{VIEW}.png'); bpy.ops.render.render(write_still=True)
print('done', quads)
