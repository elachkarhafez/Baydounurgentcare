# Shawarma Taj (Farmington Hills): the chicken shawarma cone on the spit in front of the vertical broiler, like their reel.
# Real stacked layers: every layer of marinated chicken is its own ragged slab, caramelised where the fire hits it,
# pale where the layers meet. The cone turns as you scroll.
# Beats: dark kitchen -> the broiler tiles light up -> macro on the crisp layers while the cone turns -> pull back to
#        the whole cone, gold crown on top like their logo.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=96] [samples=48] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 96
SAMPLES = int(argv[3]) if len(argv) > 3 else 48
SCALE = float(argv[4]) if len(argv) > 4 else 1.
rng = np.random.default_rng(5); random.seed(5)
ENV = lambda k, d: os.environ.get('ST_' + k, d)


def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def smoother(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def obj(name, data, parent=None):
    o = bpy.data.objects.new(name, data); col.objects.link(o)
    if parent: o.parent = parent
    return o
def bm_mesh(name, bm, smooth_=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth_: me.shade_smooth()
    return me


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
    def v(s, sock, x):
        if isinstance(x, (int, float, tuple)): sock.default_value = x
        else: s.l(x, sock)
    def math(s, op, a, b=None, c=None):
        m = s.n('ShaderNodeMath', operation=op)
        for i, x in enumerate((a, b, c)):
            if x is not None: s.v(m.inputs[i], x)
        return m.outputs[0]
    def mrange(s, val, a, b, lo=0., hi=1.):
        m = s.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP'); s.v(m.inputs['Value'], val)
        m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b; m.inputs['To Min'].default_value = lo; m.inputs['To Max'].default_value = hi
        return m.outputs['Result']
    def mix(s, fac, a, b):
        m = s.n('ShaderNodeMix', data_type='RGBA'); s.v(m.inputs['Factor'], fac); s.v(m.inputs[6], a); s.v(m.inputs[7], b); return m.outputs[2]
    def bsdf(s, **kw): return s.n('ShaderNodeBsdfPrincipled', **kw)
    def done(s, shader): s.l(shader, s.out.inputs[0]); return s.m


def lathe(name, prof, steps=128, parent=None):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)

# ------------------------------------------------------------------ the cone: stacked layers of marinated chicken (metres)
Z0, Z1 = .0, .50                      # bottom and top of the meat
RB, RT = .072, .118                   # radius at the bottom and at the top
spin = obj('spin', None)              # the cone turns on this
def R(z): u = (z - Z0) / (Z1 - Z0); return RB + (RT - RB) * max(0., u) ** .8
# a real cone is a mass of marinated thigh pieces pressed onto the spit: build it from overlapping, lumpy chunks
ico = bmesh.new(); bmesh.ops.create_icosphere(ico, subdivisions=3, radius=1.)
TV = np.array([v.co[:] for v in ico.verts]); TF = np.array([[v.index for v in f.verts] for f in ico.faces]); ico.free()
WAVES = rng.normal(size=(7, 3)); WPH = rng.uniform(0, 2 * pi, 7)
verts, faces, outv, cidv = [], [], [], []; nv = 0
zrow = .004
while zrow < Z1 - .006:
    Rz = R(zrow); n = int(2 * pi * Rz / .03) + 2
    a0 = rng.uniform(0, 2 * pi)
    for k in range(n):
        a = a0 + 2 * pi * (k + rng.uniform(-.3, .3)) / n
        sx, sy, sz = rng.uniform(.026, .05), rng.uniform(.02, .034), rng.uniform(.008, .016)
        rad = Rz * (1 + rng.normal(0, .045)) - sy * .55
        t_ = np.array([-sin(a), cos(a), 0.]); n_ = np.array([cos(a), sin(a), 0.]); u_ = np.array([0., 0., 1.])
        droop = rng.uniform(.15, .55); twist = rng.normal(0, .25)
        n2 = n_ * cos(droop) - u_ * sin(droop); u2 = u_ * cos(droop) + n_ * sin(droop)      # outer edge sags down
        t2 = t_ * cos(twist) + u2 * sin(twist); u3 = u2 * cos(twist) - t_ * sin(twist)
        lump = 1 + .22 * np.sin(TV @ (WAVES.T * rng.uniform(2.5, 4.5)) + WPH).sum(1) / 3.
        lv = TV * lump[:, None] * np.array([sx, sy, sz])
        P = np.array([rad * cos(a), rad * sin(a), zrow + rng.normal(0, .002)]) + lv[:, :1] * t2 + lv[:, 1:2] * n2 + lv[:, 2:3] * u3
        rr = np.hypot(P[:, 0], P[:, 1]); RzP = np.array([R(z) for z in np.clip(P[:, 2], Z0, Z1)])
        outv.append(np.clip((rr - RzP * .9) / (RzP * .2), 0, 1)); cidv.append(np.full(len(P), rng.random()))
        verts.append(P); faces.append(TF + nv); nv += len(P)
    zrow += rng.uniform(.0085, .0125)
V = np.concatenate(verts); F = np.concatenate(faces)
me = bpy.data.meshes.new('cone'); me.from_pydata(V.tolist(), [], F.tolist()); me.update(); me.shade_smooth()
a1 = me.attributes.new('out', 'FLOAT', 'POINT'); a1.data.foreach_set('value', np.concatenate(outv).astype(np.float32))
a2 = me.attributes.new('cid', 'FLOAT', 'POINT'); a2.data.foreach_set('value', np.concatenate(cidv).astype(np.float32))
cone = obj('cone', me, spin)
print('[cone] chunks verts', len(V))
# the packed core between the pieces
core = lathe('core', [(0., Z0 + .002)] + [(R(z) * .84, z) for z in np.linspace(Z0 + .002, Z1 - .004, 40)] + [(0., Z1 - .004)], 96, spin)

M = Mat('chicken')
ov = M.n('ShaderNodeAttribute', attribute_name='out'); cv_ = M.n('ShaderNodeAttribute', attribute_name='cid')
tc = M.n('ShaderNodeTexCoord')
mp = M.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1., 1., 4.); M.l(tc.outputs['Object'], mp.inputs['Vector'])   # fibres run round the cone
n1 = M.n('ShaderNodeTexNoise', Scale=30., Detail=8., Roughness=.6); M.l(tc.outputs['Object'], n1.inputs['Vector'])
n2 = M.n('ShaderNodeTexNoise', Scale=140., Detail=5.); M.l(mp.outputs[0], n2.inputs['Vector'])
char = M.n('ShaderNodeTexVoronoi', Scale=70.); M.l(tc.outputs['Object'], char.inputs['Vector'])
heat = M.math('ADD', M.math('MULTIPLY', ov.outputs['Fac'], .95), M.math('ADD', M.math('MULTIPLY_ADD', n1.outputs['Fac'], .7, -.35), M.math('MULTIPLY_ADD', cv_.outputs['Fac'], .35, -.17)))
pale = M.mix(M.mrange(n2.outputs['Fac'], .3, .7), srgb('#e6cf98'), srgb('#d9b773'))
gold = M.mix(M.mrange(n2.outputs['Fac'], .3, .7), srgb('#e0a82e'), srgb('#d39422'))
car = M.mix(M.mrange(n2.outputs['Fac'], .3, .7), srgb('#7a3d0e'), srgb('#5c2c09'))
c1 = M.mix(M.mrange(heat, .0, .35), pale, gold)
c2 = M.mix(M.mrange(heat, .72, 1.05), c1, car)
spot = M.math('MULTIPLY', M.mrange(char.outputs['Distance'], .2, .06), M.mrange(heat, .75, 1.05))
c3 = M.mix(M.math('MULTIPLY', spot, .85), c2, srgb('#2d1406'))
fat = M.mrange(n1.outputs['Fac'], .55, .7)
rough = M.math('SUBTRACT', M.mrange(heat, 0., 1., .42, .26), M.math('MULTIPLY', fat, .14))
bp = M.n('ShaderNodeBump', Strength=.55, Distance=.0012); M.l(M.math('ADD', n2.outputs['Fac'], M.math('MULTIPLY', n1.outputs['Fac'], .5)), bp.inputs['Height'])
b = M.bsdf(**{'Subsurface Weight': .12, 'Subsurface Scale': .004, 'Specular IOR Level': .6, 'Coat Weight': .25, 'Coat Roughness': .2})
b.inputs['Subsurface Radius'].default_value = (1., .75, .45)
M.l(c3, b.inputs['Base Color']); M.l(rough, b.inputs['Roughness']); M.l(bp.outputs[0], b.inputs['Normal'])
CH = M.done(b.outputs[0]); cone.data.materials.append(CH)
CM = Mat('core'); bc = CM.bsdf(**{'Base Color': srgb('#b98a52'), 'Roughness': .6}); core.data.materials.append(CM.done(bc.outputs[0]))

# ------------------------------------------------------------------ the spit, top plate, drip pan
STEEL = Mat('steel')
nz = STEEL.n('ShaderNodeTexNoise', Scale=60., Detail=3.)
bs = STEEL.bsdf(**{'Base Color': srgb('#b9bcc0'), 'Metallic': 1., 'Roughness': .24})
STEEL = STEEL.done(bs.outputs[0])
rod = lathe('rod', [(0., -.14), (.009, -.14), (.009, Z1 + .09), (.0055, Z1 + .12), (0., Z1 + .125)], 48, spin); rod.data.materials.append(STEEL)
plate = lathe('plate', [(0., Z1 + .002), (.075, Z1 + .002), (.078, Z1 + .006), (.075, Z1 + .010), (0., Z1 + .010)], 96, spin); plate.data.materials.append(STEEL)
PANM = Mat('pan'); bpn = PANM.bsdf(**{'Base Color': srgb('#5f6266'), 'Metallic': 1., 'Roughness': .45}); PANM = PANM.done(bpn.outputs[0])
pan = lathe('pan', [(0., -.11), (.10, -.11), (.115, -.095), (.13, -.07), (.135, -.068), (.128, -.07), (.112, -.093), (.098, -.104), (0., -.104)], 128); pan.data.materials.append(PANM)
JUICE = Mat('juice'); bj = JUICE.bsdf(**{'Base Color': srgb('#3e1d07'), 'Roughness': .05, 'Coat Weight': .6, 'Subsurface Weight': .3})
juice = lathe('juice', [(0., -.1035), (.099, -.1035), (.099, -.1015), (0., -.1015)], 96); juice.data.materials.append(JUICE.done(bj.outputs[0]))

# the crown from their logo, sat on the top plate
GOLD = Mat('gold'); bg_ = GOLD.bsdf(**{'Base Color': srgb('#f1c35a'), 'Metallic': 1., 'Roughness': .16}); GOLD = GOLD.done(bg_.outputs[0])
bm = bmesh.new(); NC, CR, CH = 240, .052, .055
ring = []
for i in range(NC):
    a = 2 * pi * i / NC; p = (i % (NC // 5)) / (NC // 5)                          # five points
    h = .022 + (CH - .022) * (1 - abs(p - .5) * 2) ** 2.2
    ring.append([bm.verts.new((CR * cos(a), CR * sin(a), Z1 + .010 + z)) for z in (0., h)] + [bm.verts.new(((CR - .004) * cos(a), (CR - .004) * sin(a), Z1 + .010 + z)) for z in (h, 0.)])
for i in range(NC):
    j = (i + 1) % NC
    for k in range(4): bm.faces.new((ring[i][k], ring[j][k], ring[j][(k + 1) % 4], ring[i][(k + 1) % 4]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
crown = obj('crown', bm_mesh('crown', bm), spin); crown.data.materials.append(GOLD)
for i in range(5):
    a = 2 * pi * (i + .5) / 5
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=.0065)
    o = obj('jewel', bm_mesh('jewel', bm), spin); o.location = (CR * cos(a), CR * sin(a), Z1 + .010 + CH + .004); o.data.materials.append(GOLD)

# ------------------------------------------------------------------ the broiler: three ceramic burner tiles behind the cone
BY = .19
FIRE = Mat('fire')
tcf = FIRE.n('ShaderNodeTexCoord'); vf = FIRE.n('ShaderNodeTexVoronoi', Scale=300.); FIRE.l(tcf.outputs['Object'], vf.inputs['Vector'])
nf = FIRE.n('ShaderNodeTexNoise', Scale=6., Detail=3.); FIRE.l(tcf.outputs['Object'], nf.inputs['Vector'])
FIREV = FIRE.n('ShaderNodeValue', name='FIRE')
hot = FIRE.math('MULTIPLY', FIRE.mrange(vf.outputs['Distance'], .05, .4), FIRE.mrange(nf.outputs['Fac'], .25, .75, .55, 1.))
emc = FIRE.mix(hot, srgb('#b32602'), srgb('#f2600c'))
em = FIRE.n('ShaderNodeEmission'); FIRE.l(emc, em.inputs['Color']); FIRE.l(FIRE.math('MULTIPLY', FIREV.outputs[0], FIRE.math('MULTIPLY_ADD', hot, .8, .35)), em.inputs['Strength'])
bf = FIRE.bsdf(**{'Base Color': srgb('#3a2a22'), 'Roughness': .8})
mxf = FIRE.n('ShaderNodeAddShader'); FIRE.l(bf.outputs[0], mxf.inputs[0]); FIRE.l(em.outputs[0], mxf.inputs[1])
FIRE = FIRE.done(mxf.outputs[0])
for k, z in enumerate((.07, .23, .39)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.); bmesh.ops.scale(bm, vec=(.2, .02, .14), verts=bm.verts)
    o = obj('tile%d' % k, bm_mesh('tile', bm, False)); o.location = (0, BY, z + .07); o.data.materials.append(FIRE)
# stainless housing and back wall
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.); bmesh.ops.scale(bm, vec=(.34, .06, .78), verts=bm.verts)
house = obj('house', bm_mesh('house', bm, False)); house.location = (0, BY + .04, .25); house.data.materials.append(STEEL)
WALL = Mat('wall'); nw = WALL.n('ShaderNodeTexNoise', Scale=8., Detail=6.)
bw = WALL.bsdf(**{'Base Color': srgb('#2a2624'), 'Metallic': .6}); WALL.l(WALL.mrange(nw.outputs['Fac'], .3, .7, .35, .6), bw.inputs['Roughness'])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=2.)
wall = obj('wall', bm_mesh('wall', bm, False)); wall.rotation_euler = (radians(90), 0, 0); wall.location = (0, .45, .3); wall.data.materials.append(WALL.done(bw.outputs[0]))

# ------------------------------------------------------------------ light
LIGHT = float(ENV('LIGHT', '.08'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
area('key', (-.55, -.75, .55), (0, 0, .25), .5, .5, 50, (1, .88, .74), spread=radians(50))
area('fill', (.7, -.6, .2), (0, 0, .25), .8, .6, 7, (.9, .95, 1), spread=radians(70))
for nm_, x_ in (('heatL', -.2), ('heatR', .2)):     # the broiler's heat wraps round the sides of the cone
    area(nm_, (x_, .12, .25), (0, 0, .25), .06, .5, 0, (1, .48, .14))
area('top', (0., -.1, 1.1), (0, 0, .4), .5, .5, 70, (1, .92, .8), spread=radians(50))
FIREL = area('firelight', (0., BY - .03, .25), (0, -1, .25), .2, .5, 0, (1, .5, .16))     # what the tiles throw on the meat
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bgw = wn.nodes.new('ShaderNodeBackground'); bgw.inputs[1].default_value = float(ENV('WORLD', '.05'))
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bgw.inputs[0]); wn.links.new(bgw.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera: the cone always in the right half, captions on the left
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 50.; cd.clip_start = .01; cd.dof.use_dof = True
cam = obj('cam', cd); scn.camera = cam
KEYS = [(0.00, (-.50, -1.45, .34), (-.22, 0, .25), 45, 5.6, 0.),
        (0.14, (-.46, -1.32, .34), (-.2, 0, .26), 45, 5.6, 0.),
        (0.34, (-.12, -.50, .46), (-.05, 0, .40), 55, 2.8, -.2),
        (0.52, (.10, -.46, .30), (-.045, 0, .27), 55, 2.8, -.3),
        (0.68, (.18, -.40, .12), (-.04, 0, .12), 55, 2.8, -.4),
        (0.84, (-.40, -1.25, .30), (-.19, 0, .26), 45, 5., 0.),
        (1.00, (-.50, -1.45, .34), (-.22, 0, .25), 45, 5.6, 0.)]
def place(t):
    for (t0, c0, g0, l0, f0, e0), (t1, c1, g1, l1, f1, e1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smoother((t - t0) / (t1 - t0)); L = lambda a, b: [x + (y - x) * k for x, y in zip(a, b)] if isinstance(a, tuple) else a + (b - a) * k
            c, g, lens, fs, ev = Vector(L(c0, c1)), Vector(L(g0, g1)), L(l0, l1), L(f0, f1), L(e0, e1); break
    cam.location = c; cam.rotation_euler = (g - c).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (Vector((0, -R(g.z), g.z)) - c).length
    scn.view_settings.exposure = float(ENV('EV', '0')) + ev

def fire_at(t):
    if t < .06: return 0.
    for a, b_ in ((.065, .075), (.085, .092)):
        if a <= t < b_: return .5
    if t < .1: return .15
    return smoother(seg(t, .1, .2))

def state(t):
    f = fire_at(t)
    FIREV.outputs[0].default_value = float(ENV('FIRE', '1.6')) * f
    FIREL.data.energy = float(ENV('FIREW', '700')) * LIGHT * f
    for nm_ in ('heatL', 'heatR'): bpy.data.lights[nm_].energy = float(ENV('HEATW', '260')) * LIGHT * f
    spin.rotation_euler = (0, 0, radians(-200 * smoother(seg(t, .1, .98)) - 25 * t))
    place(t)

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1440, 900; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.02'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.transmission_bounces = 4; cy.transparent_max_bounces = 4; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.sample_clamp_indirect = 0.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 11
r.use_persistent_data = True
scn.view_settings.view_transform = ENV('VT', 'AgX'); scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast')

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / (N - 1)); r.filepath = fp
    bpy.ops.render.render(write_still=True)
print('done')
