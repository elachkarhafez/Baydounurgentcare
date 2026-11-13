# The Groomed Man (TGM Style): "The Golden Feel". Their Black Amethyst pomade tin (black tin, gold lid label, label
# redrawn from their product shots in tex/label.png) in a black studio, with gold dust and molten gold ribbons, the
# black-and-gold look of their own product photography.
# Beats: darkness and drifting gold dust -> a light sweeps across the gold POMADE label (macro) -> pull back and orbit
#        the tin while gold ribbons wind up around it -> the dust bursts and the camera rises to the hero shot.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=150] [samples=40] [scale=1]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 150
SAMPLES = int(argv[3]) if len(argv) > 3 else 40
SCALE = float(argv[4]) if len(argv) > 4 else 1.
ENV = lambda k, d: os.environ.get('TGM_' + k, d)
random.seed(5)


def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def smoother(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)
def lerp(a, b, t): return a + (b - a) * t
def vlerp(a, b, t): return Vector(a).lerp(Vector(b), t)


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


# ------------------------------------------------------------------ materials
BLACK = principled('black_tin', '#0b0a0a', metal=.0, rough=.22, coat=1., coat_rough=.04)
GOLD = principled('gold', '#e8b85e', metal=1., rough=.16)
FM = Mat('floor'); fb = FM.n('ShaderNodeBsdfPrincipled'); fb.inputs['Base Color'].default_value = srgb('#050404'); fb.inputs['Roughness'].default_value = .16
if 'Specular IOR Level' in fb.inputs: fb.inputs['Specular IOR Level'].default_value = .55
# the floor melts into black away from the tin, so there is no horizon line
ftc = FM.n('ShaderNodeTexCoord'); flen = FM.n('ShaderNodeVectorMath', operation='LENGTH'); FM.l(ftc.outputs['Object'], flen.inputs[0])
fmr = FM.n('ShaderNodeMapRange'); fmr.inputs['From Min'].default_value = 2.2; fmr.inputs['From Max'].default_value = 6.5
FM.l(flen.outputs['Value'], fmr.inputs['Value'])
fblk = FM.n('ShaderNodeEmission'); fblk.inputs['Color'].default_value = (0, 0, 0, 1); fblk.inputs['Strength'].default_value = 0.
fmix = FM.n('ShaderNodeMixShader'); FM.l(fmr.outputs['Result'], fmix.inputs['Fac']); FM.l(fb.outputs[0], fmix.inputs[1]); FM.l(fblk.outputs[0], fmix.inputs[2])
FLOOR = FM.done(fmix.outputs[0])

# lid label: their gold label; dark ink reads as printed, gold as foil
LM = Mat('label'); tx = LM.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/label.png'))
uv = LM.n('ShaderNodeTexCoord'); LM.l(uv.outputs['UV'], tx.inputs['Vector'])
lum = LM.n('ShaderNodeRGBToBW'); LM.l(tx.outputs['Color'], lum.inputs['Color'])
ramp = LM.n('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'LINEAR'
ramp.color_ramp.elements[0].position = .12; ramp.color_ramp.elements[1].position = .3
LM.l(lum.outputs['Val'], ramp.inputs['Fac'])
lb = LM.n('ShaderNodeBsdfPrincipled')
tint = LM.n('ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); tint.inputs['Factor'].default_value = .85
LM.l(tx.outputs['Color'], tint.inputs[6]); tint.inputs[7].default_value = srgb('#e2a43c'); LM.l(tint.outputs[2], lb.inputs['Base Color'])
LM.l(ramp.outputs['Color'], lb.inputs['Metallic'])
rr = LM.n('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = .5; rr.inputs['To Max'].default_value = .2
LM.l(ramp.outputs['Color'], rr.inputs['Value']); LM.l(rr.outputs['Result'], lb.inputs['Roughness'])
rr.inputs['To Max'].default_value = .14
LABEL = LM.done(lb.outputs[0])

DM = Mat('dust'); em = DM.n('ShaderNodeEmission'); em.inputs['Color'].default_value = srgb('#ffcf6e'); em.inputs['Strength'].default_value = 9.
DUSTV = DM.n('ShaderNodeValue', name='DUSTV'); DUSTV.outputs[0].default_value = 1.
mul = DM.n('ShaderNodeMath', operation='MULTIPLY'); mul.inputs[0].default_value = 9.; DM.l(DUSTV.outputs[0], mul.inputs[1]); DM.l(mul.outputs[0], em.inputs['Strength'])
DUST = DM.done(em.outputs[0])


# ------------------------------------------------------------------ geometry helpers
def cylinder(name, r, depth, z0, segs=160, mat=None, bevel=.025):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    bmesh.ops.translate(bm, vec=(0, 0, z0 + depth / 2), verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = obj(name, me)
    if mat: me.materials.append(mat)
    bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 4; bv.limit_method = 'ANGLE'
    if hasattr(bv, 'harden_normals'): bv.harden_normals = False
    me.shade_smooth()
    if hasattr(me, 'set_sharpness_by_angle'): me.set_sharpness_by_angle(angle=radians(40))
    return o


tin = bpy.data.objects.new('tin', None); col.objects.link(tin)
base = cylinder('base', 1.0, .58, 0., mat=BLACK, bevel=.03); base.parent = tin
lid = bpy.data.objects.new('lid', None); col.objects.link(lid); lid.parent = tin
lidbody = cylinder('lidbody', 1.035, .3, .5, mat=BLACK, bevel=.035); lidbody.parent = lid
# label disk on the lid top, planar UVs 0..1
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=180, radius=.965)
bmesh.ops.translate(bm, vec=(0, 0, .8015), verts=bm.verts)
uvl = bm.loops.layers.uv.new()
for f in bm.faces:
    for lp in f.loops: x, y = lp.vert.co.x, lp.vert.co.y; lp[uvl].uv = (x / 1.93 + .5, y / 1.93 + .5)
me = bpy.data.meshes.new('label'); bm.to_mesh(me); bm.free(); me.materials.append(LABEL)
label = obj('label', me, lid)
# a thin gold ring where the lid meets the base, like their product shots' gold seam
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=160, radius1=1.012, radius2=1.012, depth=.018)
bmesh.ops.translate(bm, vec=(0, 0, .49), verts=bm.verts)
me = bpy.data.meshes.new('seam'); bm.to_mesh(me); bm.free(); me.materials.append(GOLD); me.shade_smooth()
obj('seam', me, tin)

# floor
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40)
me = bpy.data.meshes.new('floor'); bm.to_mesh(me); bm.free(); me.materials.append(FLOOR); obj('floor', me)

# gold dust: one shared mesh, many instances
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.)
dme = bpy.data.meshes.new('mote')
bm.to_mesh(dme); bm.free(); dme.materials.append(DUST); dme.shade_smooth()
motes = []
for i in range(int(ENV('MOTES', '520'))):
    r = random.uniform(1.35, 5.5); a = random.uniform(0, 2 * pi); z = random.uniform(-.1, 3.8)
    s = random.uniform(.006, .02) * (1.6 if random.random() < .08 else 1.)
    o = obj('m%d' % i, dme); o.scale = (s, s, s)
    motes.append((o, r, a, z, random.uniform(.25, 1.), random.uniform(0, 2 * pi)))


# molten gold ribbons: flat twisted strips winding up around the tin
def ribbon(name, r0, r1, z0, z1, turns, phase, width):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.resolution_u = 24
    cu.extrude = width; cu.bevel_depth = .006; cu.bevel_resolution = 2; cu.use_fill_caps = True
    cu.twist_mode = 'MINIMUM'
    if hasattr(cu, 'bevel_factor_mapping_start'): cu.bevel_factor_mapping_start = 'SPLINE'; cu.bevel_factor_mapping_end = 'SPLINE'
    sp = cu.splines.new('NURBS'); K = 64; sp.points.add(K - 1)
    for k in range(K):
        u = k / (K - 1); ang = phase + turns * 2 * pi * u; rad = lerp(r0, r1, u) + .12 * sin(u * 9 + phase)
        sp.points[k].co = (rad * cos(ang), rad * sin(ang), lerp(z0, z1, smoother(u)) + .08 * sin(u * 13 + phase), 1)
        sp.points[k].tilt = 2.2 * sin(u * 6 + phase)
    sp.use_endpoint_u = True; sp.order_u = 4
    o = obj(name, cu); cu.materials.append(GOLD); return o


ribbons = [ribbon('rib0', 1.55, 1.25, -.05, 2.7, 1.55, 0., .07), ribbon('rib1', 1.75, 1.35, .1, 3.1, 1.3, 2.3, .05), ribbon('rib2', 1.4, 1.6, -.02, 2.2, 1.1, 4.4, .035)]


# ------------------------------------------------------------------ lights + world
def area(name, size, size_y, energy, color, loc, rot):
    L = bpy.data.lights.new(name, 'AREA'); L.shape = 'RECTANGLE'; L.size = size; L.size_y = size_y; L.energy = energy; L.color = srgb(color)[:3]
    o = obj(name, L); o.location = loc; o.rotation_euler = [radians(x) for x in rot]; return o


key = area('key', 7., .32, 380, '#fff3e0', (-4.2, -3.2, 3.2), (62, 0, -52))
rim = area('rim', 6., .28, 900, '#ffc46a', (3.6, 3.4, 2.6), (-60, 0, -135))
sweep = area('sweep', 3.2, .22, 0, '#fff6e6', (-3, -1.2, 2.4), (30, 0, 90))
top = area('top', 3., 3., 60, '#fff0d8', (0, 0, 6), (0, 0, 0))

W = bpy.data.worlds.new('w'); scn.world = W; W.use_nodes = True; wt = W.node_tree; wt.nodes.clear()
wo = wt.nodes.new('ShaderNodeOutputWorld'); env = wt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = float(ENV('ENV', '.22'))
blk = wt.nodes.new('ShaderNodeBackground'); blk.inputs['Color'].default_value = (0, 0, 0, 1)
lp = wt.nodes.new('ShaderNodeLightPath'); mix = wt.nodes.new('ShaderNodeMixShader')
wt.links.new(env.outputs['Color'], bg.inputs['Color']); wt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
wt.links.new(bg.outputs[0], mix.inputs[1]); wt.links.new(blk.outputs[0], mix.inputs[2]); wt.links.new(mix.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ camera
cd = bpy.data.cameras.new('cam'); cam = obj('cam', cd); scn.camera = cam
cd.dof.use_dof = True; cd.sensor_width = 36
aim = bpy.data.objects.new('aim', None); col.objects.link(aim)
tc = cam.constraints.new('TRACK_TO'); tc.target = aim; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'

# camera path: (t, position, aim, lens, fstop)
KEYS = [
    (0.00, (0.62, -1.05, 1.18), (0.05, -0.05, 0.80), 62, 1.6),
    (0.20, (0.95, -1.35, 1.32), (-0.05, 0.05, 0.80), 58, 1.8),
    (0.40, (3.9, -5.2, 2.5), (-1.35, 0.0, 0.55), 50, 3.2),
    (0.62, (-1.6, -6.0, 1.15), (-1.25, 0.2, 0.75), 50, 3.0),
    (0.82, (-4.6, -3.9, 1.6), (-0.9, 0.3, 0.85), 52, 3.0),
    (1.00, (0.0, -6.6, 3.6), (0.0, 0.0, 0.62), 50, 3.6),
]
def cam_at(t):
    for i in range(1, len(KEYS)):
        if t <= KEYS[i][0]:
            a, b = KEYS[i - 1], KEYS[i]; u = smoother((t - a[0]) / (b[0] - a[0]))
            # orbit-ish blend: interpolate in cylindrical coordinates so the camera swings around, not through
            pa, pb = Vector(a[1]), Vector(b[1])
            ra, rb = pa.xy.length, pb.xy.length; aa, ab = math.atan2(pa.y, pa.x), math.atan2(pb.y, pb.x)
            if ab - aa > pi: ab -= 2 * pi
            if aa - ab > pi: ab += 2 * pi
            rad, ang, z = lerp(ra, rb, u), lerp(aa, ab, u), lerp(pa.z, pb.z, u)
            return Vector((rad * cos(ang), rad * sin(ang), z)), vlerp(a[2], b[2], u), lerp(a[3], b[3], u), lerp(a[4], b[4], u)
    k = KEYS[-1]; return Vector(k[1]), Vector(k[2]), k[3], k[4]


def state(t):
    p, a, lens, fs = cam_at(t)
    cam.location = p; aim.location = a; cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (p - Vector((0, 0, .7 if t > .3 else .8))).length * (1. if t > .3 else .98)
    lid.rotation_euler = (0, 0, -.9 * smoother(t) - .25)
    # the opening sweep: a strip of light crosses the label
    sw = seg(t, .02, .26); sweep.location = (lerp(-2.6, 2.8, smoother(sw)), lerp(-1.6, -.6, sw), 2.3)
    sweep.data.energy = 420 * sin(pi * sw) * float(ENV('SWEEP', '1'))
    up = smoother(seg(t, .1, .34))
    key.data.energy = 380 * (.08 + .92 * up); rim.data.energy = 900 * (.3 + .7 * up); top.data.energy = 170 * up
    # ribbons wind up around the tin, then flow off the top
    g = seg(t, .42, .74); out = seg(t, .8, 1.)
    for i, rb in enumerate(ribbons):
        d = i * .06
        rb.data.bevel_factor_end = smoother(clamp((g - d) / (1 - d))); rb.data.bevel_factor_start = .85 * smoother(out) * (1 - i * .15)
        rb.hide_render = g <= d
    # dust: drifts and rises, swirls with the ribbons, then bursts outward for the hero
    burst = smoother(seg(t, .74, .95)); swirl = .5 * t + 1.4 * smoother(seg(t, .42, .8))
    DUSTV.outputs[0].default_value = .7 + .6 * smoother(seg(t, .74, .9))
    for o, r, ang, z, sp, ph in motes:
        rr = r * (1 + .55 * burst) + .05 * sin(t * 6 + ph)
        aa = ang + swirl * sp
        o.location = (rr * cos(aa), rr * sin(aa), z + .5 * t * sp + .7 * burst * (z / 3.8) + .04 * sin(t * 9 + ph))


r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1280, 720; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.03'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 2; cy.transmission_bounces = 2; cy.transparent_max_bounces = 4
cy.sample_clamp_indirect = 6.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 7
r.use_persistent_data = True
scn.view_settings.view_transform = ENV('VT', 'AgX'); scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast'); scn.view_settings.exposure = float(ENV('EV', '0'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / (N - 1)); r.filepath = fp
    bpy.ops.render.render(write_still=True)
print('done')
