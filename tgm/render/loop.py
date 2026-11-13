# The Groomed Man: background loop. Their full line the way their own product photos stage it: shampoo, conditioner and
# body wash pump bottles (white, gold side bands, labels redrawn in tex/bottle_*.png) and the black pomade tin with the
# gold lid (tex/label.png) on a black plinth with a gold top, gold spheres on the floor, a warm gold glow behind,
# gold dust rising through the light. The camera drifts slowly; a strip of light sweeps across once per loop.
# The dust rises at speeds that wrap exactly once per loop and the camera path is closed, so the clip loops seamlessly.
# usage: bpe run loop.py -m final -- <out_dir> [frames=all|i,j,k] [n=96] [samples=32] [scale=1]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 96
SAMPLES = int(argv[3]) if len(argv) > 3 else 32
SCALE = float(argv[4]) if len(argv) > 4 else 1.
ENV = lambda k, d: os.environ.get('TGM_' + k, d)
random.seed(9)
TAU = 2 * pi


def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def smoother(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)


bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def obj(name, data, parent=None):
    o = bpy.data.objects.new(name, data); col.objects.link(o)
    if parent: o.parent = parent
    return o


class Mat:
    def __init__(s, name):
        s.m = bpy.data.materials.new(name); s.m.use_nodes = True; s.t = s.m.node_tree; s.t.nodes.clear()
        s.out = s.n('ShaderNodeOutputMaterial')
    def n(s, typ, **kw):
        x = s.t.nodes.new(typ)
        for k, v in kw.items():
            if k in x.inputs.keys(): x.inputs[k].default_value = v
            else: setattr(x, k, v)
        return x
    def l(s, a, b): s.t.links.new(a, b)
    def done(s, shader): s.l(shader, s.out.inputs['Surface']); return s.m


def principled(name, color, metal=0., rough=.3, coat=0., coat_rough=.05, spec=.5):
    M = Mat(name); b = M.n('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = srgb(color); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    for k, v in (('Coat Weight', coat), ('Coat Roughness', coat_rough), ('Specular IOR Level', spec)):
        if k in b.inputs: b.inputs[k].default_value = v
    return M.done(b.outputs[0])


BLACK = principled('black_lacquer', '#0a0909', rough=.2, coat=1., coat_rough=.03)
GOLD = principled('gold', '#e6b45a', metal=1., rough=.14)
GOLDB = principled('gold_brushed', '#d9a650', metal=1., rough=.24)
WHITE = principled('white_plastic', '#f3efe8', rough=.28, coat=.35, coat_rough=.12)

def tin_label_mat():
    M = Mat('tin_label'); tx = M.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/label.png'))
    uv = M.n('ShaderNodeTexCoord'); M.l(uv.outputs['UV'], tx.inputs['Vector'])
    lum = M.n('ShaderNodeRGBToBW'); M.l(tx.outputs['Color'], lum.inputs['Color'])
    ramp = M.n('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .12; ramp.color_ramp.elements[1].position = .3; M.l(lum.outputs['Val'], ramp.inputs['Fac'])
    b = M.n('ShaderNodeBsdfPrincipled')
    tint = M.n('ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); tint.inputs['Factor'].default_value = .6
    M.l(tx.outputs['Color'], tint.inputs[6]); tint.inputs[7].default_value = srgb('#eab040'); M.l(tint.outputs[2], b.inputs['Base Color'])
    M.l(ramp.outputs['Color'], b.inputs['Metallic'])
    rr = M.n('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = .45; rr.inputs['To Max'].default_value = .24
    M.l(ramp.outputs['Color'], rr.inputs['Value']); M.l(rr.outputs['Result'], b.inputs['Roughness'])
    return M.done(b.outputs[0])

def bottle_label_mat(name):
    M = Mat('lab_' + name); uv = M.n('ShaderNodeTexCoord')
    tx = M.n('ShaderNodeTexImage', interpolation='Cubic'); tx.image = bpy.data.images.load(asset('tex/bottle_%s.png' % name)); M.l(uv.outputs['UV'], tx.inputs['Vector'])
    mk = M.n('ShaderNodeTexImage', interpolation='Cubic'); mk.image = bpy.data.images.load(asset('tex/bottle_%s_mask.png' % name)); mk.image.colorspace_settings.name = 'Non-Color'; M.l(uv.outputs['UV'], mk.inputs['Vector'])
    b = M.n('ShaderNodeBsdfPrincipled'); M.l(tx.outputs['Color'], b.inputs['Base Color']); M.l(mk.outputs['Color'], b.inputs['Metallic'])
    rr = M.n('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = .3; rr.inputs['To Max'].default_value = .16
    M.l(mk.outputs['Color'], rr.inputs['Value']); M.l(rr.outputs['Result'], b.inputs['Roughness'])
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .4; b.inputs['Coat Roughness'].default_value = .1
    return M.done(b.outputs[0])

DM = Mat('dust'); em = DM.n('ShaderNodeEmission'); em.inputs['Color'].default_value = srgb('#ffcf6e'); em.inputs['Strength'].default_value = 7.
DUST = DM.done(em.outputs[0])

# floor that melts into black (no horizon)
FM = Mat('floor'); fb = FM.n('ShaderNodeBsdfPrincipled'); fb.inputs['Base Color'].default_value = srgb('#060505'); fb.inputs['Roughness'].default_value = .14
ftc = FM.n('ShaderNodeTexCoord'); flen = FM.n('ShaderNodeVectorMath', operation='LENGTH'); FM.l(ftc.outputs['Object'], flen.inputs[0])
fmr = FM.n('ShaderNodeMapRange'); fmr.inputs['From Min'].default_value = 4.; fmr.inputs['From Max'].default_value = 10.; FM.l(flen.outputs['Value'], fmr.inputs['Value'])
fblk = FM.n('ShaderNodeEmission'); fblk.inputs['Color'].default_value = (0, 0, 0, 1); fblk.inputs['Strength'].default_value = 0.
fmix = FM.n('ShaderNodeMixShader'); FM.l(fmr.outputs['Result'], fmix.inputs['Fac']); FM.l(fb.outputs[0], fmix.inputs[1]); FM.l(fblk.outputs[0], fmix.inputs[2])
FLOOR = FM.done(fmix.outputs[0])

# the warm glow behind the products, like the halo in their own product shots
GM = Mat('glow'); gtc = GM.n('ShaderNodeTexCoord'); gl = GM.n('ShaderNodeVectorMath', operation='LENGTH')
gsc = GM.n('ShaderNodeVectorMath', operation='MULTIPLY'); gsc.inputs[1].default_value = (1., 1.45, 1.); GM.l(gtc.outputs['Object'], gsc.inputs[0]); GM.l(gsc.outputs[0], gl.inputs[0])
gmr = GM.n('ShaderNodeMapRange'); gmr.inputs['From Min'].default_value = 0.; gmr.inputs['From Max'].default_value = 9.; gmr.inputs['To Min'].default_value = 1.; gmr.inputs['To Max'].default_value = 0.
GM.l(gl.outputs['Value'], gmr.inputs['Value'])
gpw = GM.n('ShaderNodeMath', operation='POWER'); gpw.inputs[1].default_value = 2.2; GM.l(gmr.outputs['Result'], gpw.inputs[0])
gst = GM.n('ShaderNodeMath', operation='MULTIPLY'); gst.inputs[1].default_value = float(ENV('GLOW', '1.6')); GM.l(gpw.outputs[0], gst.inputs[0])
gem = GM.n('ShaderNodeEmission'); gem.inputs['Color'].default_value = srgb('#c98a2e'); GM.l(gst.outputs[0], gem.inputs['Strength'])
GLOWM = GM.done(gem.outputs[0])


# ------------------------------------------------------------------ geometry
def mesh_from_bm(name, bm, mat=None, smooth=True, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if mat: me.materials.append(mat)
    if smooth: me.shade_smooth()
    return obj(name, me, parent)

def cyl(name, r, h, z0=0., segs=128, mat=None, bevel=0., parent=None, caps=True):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=caps, segments=segs, radius1=r, radius2=r, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, z0 + h / 2), verts=bm.verts)
    o = mesh_from_bm(name, bm, mat, parent=parent)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 4; bv.limit_method = 'ANGLE'
        if hasattr(o.data, 'set_sharpness_by_angle'): o.data.set_sharpness_by_angle(angle=radians(40))
    return o

def lathe(name, prof, segs=96, mat=None, parent=None):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=TAU, steps=segs, use_merge=True)
    return mesh_from_bm(name, bm, mat, parent=parent)

def sleeve(name, r, z0, z1, mat, parent, segs=128):
    # open cylinder with UVs: u wraps once (0 at the back, .5 facing +x), v runs bottom to top
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rows = []
    for j in (0, 1):
        rows.append([bm.verts.new((r * cos(pi + TAU * i / segs), r * sin(pi + TAU * i / segs), z0 if j == 0 else z1)) for i in range(segs + 1)])
    for i in range(segs):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for lp, (u, v) in zip(f.loops, ((i / segs, 0), ((i + 1) / segs, 0), ((i + 1) / segs, 1), (i / segs, 1))): lp[uvl].uv = (u, v)
    return mesh_from_bm(name, bm, mat, parent=parent)

def bottle(name, label, loc, face):
    root = bpy.data.objects.new(name, None); col.objects.link(root); root.location = loc
    root.rotation_euler = (0, 0, face)
    prof = [(0, 0), (.36, 0), (.405, .02), (.42, .07), (.42, 1.98), (.415, 2.05), (.39, 2.13), (.33, 2.21), (.22, 2.27), (.16, 2.29), (.155, 2.36), (0, 2.36)]
    lathe(name + '_body', prof, mat=WHITE, parent=root)
    sleeve(name + '_label', .4225, .16, 1.94, bottle_label_mat(label), root)
    cyl(name + '_collar', .175, .13, 2.33, mat=GOLDB, bevel=.015, parent=root)
    cyl(name + '_stem', .055, .22, 2.45, mat=WHITE, parent=root)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
    bmesh.ops.scale(bm, vec=(.2, .46, .16), verts=bm.verts); bmesh.ops.translate(bm, vec=(0, -.09, 2.72), verts=bm.verts)
    hd = mesh_from_bm(name + '_head', bm, WHITE, parent=root); bv = hd.modifiers.new('bevel', 'BEVEL'); bv.width = .06; bv.segments = 5
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=.04, radius2=.035, depth=.22)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(pi / 2, 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, -.42, 2.74), verts=bm.verts); mesh_from_bm(name + '_nozzle', bm, WHITE, parent=root)
    return root

# plinth: black base with a gold top, as in their shots
PZ = .5
cyl('plinth', 2.7, PZ, 0, segs=192, mat=BLACK, bevel=.04)
cyl('plinth_top', 2.35, .06, PZ, segs=192, mat=GOLDB, bevel=.02)
TOP = PZ + .06

# their four products (labels face the camera, which sits on -y)
FACE = -pi / 2 + radians(4)
CAMP = (0., -10.2)
def face_cam(x, y): return math.atan2(CAMP[1] - y, CAMP[0] - x)
for nm, (x, y) in (('shampoo', (-1.08, .62)), ('conditioner', (0., .98)), ('bodywash', (1.08, .62))): bottle(nm, nm, (x, y, TOP), face_cam(x, y))

tin = bpy.data.objects.new('tin', None); col.objects.link(tin); tin.location = (0.0, -1.85, TOP); tin.scale = (.62, .62, .62)
cyl('tin_base', 1.0, .58, 0., mat=BLACK, bevel=.03, parent=tin)
lid = bpy.data.objects.new('lid', None); col.objects.link(lid); lid.parent = tin; lid.rotation_euler = (0, 0, radians(-14))
cyl('tin_lid', 1.035, .3, .5, mat=BLACK, bevel=.035, parent=lid)
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=180, radius=.965); bmesh.ops.translate(bm, vec=(0, 0, .8015), verts=bm.verts)
uvl = bm.loops.layers.uv.new()
for f in bm.faces:
    for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / 1.93 + .5, lp.vert.co.y / 1.93 + .5)
mesh_from_bm('tin_label', bm, tin_label_mat(), smooth=False, parent=lid)
cyl('tin_seam', 1.012, .018, .49, mat=GOLD, parent=tin, caps=False)
tin.rotation_euler = (radians(24), 0, 0)   # tilted toward camera like their hero shots, lid label showing
TIN_Z = TOP + .16; tin.location.z = TIN_Z

# gold spheres on the floor and the plinth
def sphere(name, r, loc, mat=GOLD):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=r); bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return mesh_from_bm(name, bm, mat)
sphere('s1', .42, (-3.25, -1.1, .42)); sphere('s2', .24, (-2.75, -2.0, .24)); sphere('s3', .3, (3.1, -.9, .3)); sphere('s4', .16, (2.85, -1.9, .16))
sphere('s5', .14, (1.7, -1.4, TOP + .14)); sphere('s6', .1, (-1.75, -1.25, TOP + .1))

# floor + glow backdrop
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); mesh_from_bm('floor', bm, FLOOR, smooth=False)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
gp = mesh_from_bm('glow', bm, GLOWM, smooth=False); gp.location = (0, 9, 3.2); gp.rotation_euler = (radians(90), 0, 0)
gp.visible_diffuse = False; gp.visible_glossy = True; gp.visible_shadow = False

# dust: each mote wraps through its height a whole number of times per loop
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.)
dme = bpy.data.meshes.new('mote'); bm.to_mesh(dme); bm.free(); dme.materials.append(DUST); dme.shade_smooth()
motes = []
HZ = 6.
for i in range(int(ENV('MOTES', '460'))):
    x = random.uniform(-7, 7); y = random.uniform(-4.5, 6.5)
    if abs(x) < 2.9 and -1.9 < y < 1.7: x += 3.2 if x > 0 else -3.2
    s = random.uniform(.007, .022) * (1.7 if random.random() < .07 else 1.)
    o = obj('m%d' % i, dme); o.scale = (s, s, s); o.visible_shadow = False
    motes.append((o, x, y, random.uniform(0, HZ), random.choice((1, 1, 2)), random.uniform(0, TAU), s))

# ------------------------------------------------------------------ lights + world
def area(name, size, size_y, energy, color, loc, rot):
    L = bpy.data.lights.new(name, 'AREA'); L.shape = 'RECTANGLE'; L.size = size; L.size_y = size_y; L.energy = energy; L.color = srgb(color)[:3]
    o = obj(name, L); o.location = loc; o.rotation_euler = [radians(x) for x in rot]; return o

key = area('key', 8., .35, 700, '#fff4e4', (-5.5, -5., 4.5), (58, 0, -48))
rimL = area('rimL', 7., .3, 900, '#ffc670', (-4.8, 4.2, 3.4), (-62, 0, -130))
rimR = area('rimR', 7., .3, 1100, '#ffc670', (4.8, 4.2, 3.4), (-62, 0, 130))
top = area('top', 4., 4., 130, '#ffe7bd', (0, -.5, 8), (0, 0, 0))
sweep = area('sweep', 9., .25, 0, '#ffffff', (-7, -4.5, 3), (60, 0, -10))
lidfill = area('lidfill', 2.2, 1.2, 35, '#ffbf45', (.4, -5.2, 4.6), (52, 0, 4))

W = bpy.data.worlds.new('w'); scn.world = W; W.use_nodes = True; wt = W.node_tree; wt.nodes.clear()
wo = wt.nodes.new('ShaderNodeOutputWorld'); env = wt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = float(ENV('ENV', '.25'))
blk = wt.nodes.new('ShaderNodeBackground'); blk.inputs['Color'].default_value = (0, 0, 0, 1)
lp = wt.nodes.new('ShaderNodeLightPath'); mix = wt.nodes.new('ShaderNodeMixShader')
wt.links.new(env.outputs['Color'], bg.inputs['Color']); wt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
wt.links.new(bg.outputs[0], mix.inputs[1]); wt.links.new(blk.outputs[0], mix.inputs[2]); wt.links.new(mix.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ camera: a slow closed orbit, products right of centre
cd = bpy.data.cameras.new('cam'); cam = obj('cam', cd); scn.camera = cam
cd.lens = float(ENV('LENS', '42')); cd.dof.use_dof = True; cd.dof.aperture_fstop = float(ENV('FSTOP', '4.0'))
aim = bpy.data.objects.new('aim', None); col.objects.link(aim)
tc = cam.constraints.new('TRACK_TO'); tc.target = aim; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
OFFX = float(ENV('OFFX', '-2.3'))   # aim left of the products so they sit right of centre (text goes left)

def state(t):
    ph = TAU * t
    ang = radians(-90) + radians(5) * sin(ph)
    rad = 10.2 + .35 * cos(ph)
    cam.location = (rad * cos(ang), rad * sin(ang), 3.05 + .2 * sin(ph + 1.))
    aim.location = (OFFX + .25 * sin(ph), 0, 1.55)
    cd.dof.focus_distance = (Vector(cam.location) - Vector((0, -.4, 1.4))).length
    # one light sweep across the set per loop, dark at the seam
    u = (t + .5) % 1.; w = smoother(clamp((u - .15) / .55))
    sweep.location = (-7 + 14 * w, -4.5, 3.); sweep.data.energy = 1500 * sin(pi * w) ** 2
    tin.location.z = TIN_Z + .07 * sin(ph); tin.rotation_euler = (radians(24) + radians(2) * sin(ph + .6), 0, radians(5) * sin(ph))
    for o, x, y, z0, k, phs, s in motes:
        z = (z0 + k * HZ * t) % HZ - .2
        fade = clamp(z / .6) * clamp((HZ - .4 - z) / .8)
        o.location = (x + .18 * sin(ph * k + phs), y + .12 * cos(ph + phs), z); sc = s * (.25 + .75 * fade); o.scale = (sc, sc, sc)


r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = int(ENV('RX', '1600')), int(ENV('RY', '900')); r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.025'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 2; cy.transmission_bounces = 2; cy.transparent_max_bounces = 4
cy.sample_clamp_indirect = 6.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 11
r.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast'); scn.view_settings.exposure = float(ENV('EV', '0'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / N); r.filepath = fp
    bpy.ops.render.render(write_still=True)
print('done')
