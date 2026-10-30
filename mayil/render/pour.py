# Mayil Coffee: the Mayil Pour, as a scroll film. Their signature: a latte or matcha that comes with a mini pour bottle,
# and you pour it in yourself (menu board on the truck: "Mayil Pour, latte/matcha + mini pour bottle, 7.50").
# Beats: a cup of milk over ice with the Mayil print, the mini bottle of matcha beside it -> the bottle lifts and tips ->
#        matcha pours in and clouds down through the milk -> the bottle goes back down, the matcha keeps swirling.
# Cup, ice, condensation and studio come from the Buzz'n Brew cup (buzznbrew/render/film.py), which passed the Big Wiss bar.
# usage: bpe run pour.py -m final -- <out_dir> [frames=all|i,j,k] [n=96] [samples=48] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, sqrt, radians
from mathutils import Vector, Matrix, Euler
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 96
SAMPLES = int(argv[3]) if len(argv) > 3 else 48
SCALE = float(argv[4]) if len(argv) > 4 else 1.
random.seed(11); rng = np.random.default_rng(11)


def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)
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
    """Small node-tree builder: n() adds a node (inputs by socket name, everything else as attributes)."""
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
    def math(s, op, a, b=None, c=None, clamp_=False):
        m = s.n('ShaderNodeMath', operation=op, use_clamp=clamp_)
        for i, x in enumerate((a, b, c)):
            if x is not None: s.v(m.inputs[i], x)
        return m.outputs[0]
    def mrange(s, val, a, b, lo=0., hi=1., smooth_=True):
        m = s.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP' if smooth_ else 'LINEAR')
        s.v(m.inputs['Value'], val); s.v(m.inputs['From Min'], a); s.v(m.inputs['From Max'], b)
        m.inputs['To Min'].default_value = lo; m.inputs['To Max'].default_value = hi; return m.outputs['Result']
    def mix(s, fac, a, b):
        m = s.n('ShaderNodeMix', data_type='RGBA'); s.v(m.inputs['Factor'], fac); s.v(m.inputs[6], a); s.v(m.inputs[7], b)
        return m.outputs[2]
    def bsdf(s, **kw): return s.n('ShaderNodeBsdfPrincipled', **kw)
    def clear_shadow(s, shader, keep=0., diffuse=False):
        """Shadow rays (and, for the cup, bounce light) see through: what's inside clear plastic gets lit like it would be."""
        lp = s.n('ShaderNodeLightPath'); tr = s.n('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (1 - keep,) * 3 + (1,)
        f = lp.outputs['Is Shadow Ray']
        if diffuse: f = s.math('MAXIMUM', f, lp.outputs['Is Diffuse Ray'])
        mx = s.n('ShaderNodeMixShader'); s.v(mx.inputs[0], f); s.l(shader, mx.inputs[1]); s.l(tr.outputs[0], mx.inputs[2])
        return mx.outputs[0]
    def fade(s, shader, fac):
        tr = s.n('ShaderNodeBsdfTransparent'); mx = s.n('ShaderNodeMixShader'); s.v(mx.inputs[0], fac)
        s.l(tr.outputs[0], mx.inputs[1]); s.l(shader, mx.inputs[2]); return mx.outputs[0]
    def done(s, shader): s.l(shader, s.out.inputs[0]); return s.m


def lathe(name, prof, steps=192, parent=None, closed=False):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    if closed: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    else:
        bm.faces.ensure_lookup_table(); f = max(bm.faces, key=lambda f: f.calc_area()); c = f.calc_center_median()
        if f.normal.x * c.x + f.normal.y * c.y < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)
def torus(name, R, r, z, nu=192, nv=18, parent=None):
    bm = bmesh.new(); rows = []
    for i in range(nu):
        a = 2 * pi * i / nu
        rows.append([bm.verts.new(((R + r * cos(q)) * cos(a), (R + r * cos(q)) * sin(a), z + r * sin(q))) for q in (2 * pi * j / nv for j in range(nv))])
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((rows[i][j], rows[(i + 1) % nu][j], rows[(i + 1) % nu][(j + 1) % nv], rows[i][(j + 1) % nv]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)


# ------------------------------------------------------------------ the cup: a 20 oz PET cold cup
H, RT, RB = .140, .046, .029
WALL = .00055
ZS = H - .020
FL0 = H - .026                        # milk line before the pour; the matcha brings it up
def r_side(z): return RB + (RT - RB) * z / H + .0007 * smooth((z - (ZS - .0012)) / .0024)
def r_in(z): return r_side(z) - WALL
prof = [(0., .0034), (.010, .0033), (.018, .0028), (.0236, .0013)]
p0, p1, p2 = (.0255, 0.), (RB + .0004, -.0002), (r_side(.009), .009)
for i in range(13):
    s = i / 12; prof.append(((1 - s) ** 2 * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0], (1 - s) ** 2 * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1]))
for i in range(1, 91):
    z = .009 + (H - .009) * i / 90; prof.append((r_side(z), z))
cup = lathe('cup', prof)
so = cup.modifiers.new('wall', 'SOLIDIFY'); so.thickness = WALL; so.offset = -1; so.use_even_offset = True
pet = Mat('pet')
nz = pet.n('ShaderNodeTexNoise', Scale=90., Detail=3.)
pr = pet.mrange(nz.outputs['Fac'], .3, .7, .002, .012)
b = pet.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.57, 'Specular IOR Level': .5})
pet.l(pr, b.inputs['Roughness'])
PET = pet.done(pet.clear_shadow(b.outputs[0], keep=.06, diffuse=True))
cup.data.materials.append(PET)
BEAD = .00105
rim = torus('rim', r_side(H) - WALL / 2 + .0004, BEAD, H - .0002); rim.data.materials.append(PET)

# ------------------------------------------------------------------ the Mayil print: one colour, screen printed on the wall
PW = .052; PH = PW * 1021 / 978; ZP = .064
z0, z1 = ZP - PH / 2, ZP + PH / 2
span = PW / r_side(ZP); A0 = -pi / 2 - span / 2
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); NU, NV = 120, 30; grid = []
for i in range(NU + 1):
    a = A0 + span * i / NU
    grid.append([bm.verts.new(((r_side(z) + .00012) * cos(a), (r_side(z) + .00012) * sin(a), z)) for z in (z0 + (z1 - z0) * j / NV for j in range(NV + 1))])
for i in range(NU):
    for j in range(NV):
        f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for lp, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): lp[uvl].uv = (u / NU, v / NV)
label = obj('print', bm_mesh('print', bm))
lm = Mat('print')
tx = lm.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/print.png'))
b = lm.bsdf(Roughness=.3, **{'Specular IOR Level': .35})
b.inputs['Base Color'].default_value = srgb('#1f0807'); lm.l(tx.outputs['Alpha'], b.inputs['Alpha'])
label.data.materials.append(lm.done(b.outputs[0]))

# ------------------------------------------------------------------ ice: dropped once with rigid bodies, then frozen where it landed
icm = Mat('ice')
tci = icm.n('ShaderNodeTexCoord'); inz = icm.n('ShaderNodeTexNoise', Scale=160., Detail=3.); icm.l(tci.outputs['Object'], inz.inputs['Vector'])
bump = icm.n('ShaderNodeBump', Strength=.25, Distance=.0004); icm.l(inz.outputs['Fac'], bump.inputs['Height'])
b = icm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.31, 'Roughness': .06})
icm.l(bump.outputs[0], b.inputs['Normal'])
ICE = icm.done(icm.clear_shadow(b.outputs[0], keep=.15))
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=.16, segments=4, affect='EDGES', profile=.5)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
ice_me = bm_mesh('ice', bm); ice_me.materials.append(ICE)
scn.frame_start = 1; scn.frame_end = 400
bpy.ops.rigidbody.world_add(); rbw = scn.rigidbody_world
rbw.time_scale = .32; rbw.point_cache.frame_end = 400
def add_rb(o, kind, shape, **kw):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.rigidbody.object_add(type=kind); rb = o.rigid_body; rb.collision_shape = shape
    for k, v in kw.items(): setattr(rb, k, v)
    return rb
colliders = []
def box_obj(name, sx, sy, sz):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.); bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    return obj(name, bm_mesh(name, bm, False))
ZB_IN = .0034 + WALL; ZTOP = H + .04; NST = 36
tilt = math.atan((RT - RB) / H)
for k in range(NST):
    a = 2 * pi * k / NST; L_ = (ZTOP - ZB_IN) / cos(tilt); zm = (ZTOP + ZB_IN) / 2
    st_ = box_obj('stave%02d' % k, .006, 2 * pi * r_in(zm) / NST * 1.2, L_)
    st_.rotation_euler = (0, tilt, a)
    st_.location = ((r_in(zm) + .003 / cos(tilt)) * cos(a), (r_in(zm) + .003 / cos(tilt)) * sin(a), zm)
    add_rb(st_, 'PASSIVE', 'BOX', collision_margin=.0002, friction=.35, restitution=.12); colliders.append(st_)
disc = box_obj('floor', .14, .14, .05); disc.location = (0, 0, ZB_IN - .025)
add_rb(disc, 'PASSIVE', 'BOX', collision_margin=.0002, friction=.4, restitution=.1); colliders.append(disc)
rbw.substeps_per_frame = 100; rbw.solver_iterations = 80
SIMN = 60
ices = []
for i in range(17):
    o = obj('ice%02d' % i, ice_me); s = random.uniform(.0205, .0235)
    o.scale = (s, s * random.uniform(.9, 1.0), s * random.uniform(.88, .98))
    a = random.uniform(0, 2 * pi); rr = random.uniform(0, .011)
    o.location = (rr * cos(a), rr * sin(a), .29 + .04 * i)
    o.rotation_euler = (random.uniform(0, pi), random.uniform(0, pi), random.uniform(0, pi))
    add_rb(o, 'ACTIVE', 'BOX', mass=.012, friction=.3, restitution=.12, collision_margin=.0003, linear_damping=.04, angular_damping=.2)
    ices.append(o)
for f in range(1, SIMN + 2): scn.frame_set(f)
final = {o.name: o.matrix_world.copy() for o in ices}
keep = []
for o in ices:
    m = final[o.name]; p = m.translation
    top = max((m @ Vector(c)).z for c in ((x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)))
    ok = sqrt(p.x ** 2 + p.y ** 2) < r_in(p.z) and 0 < p.z and top < H - .004
    print('[ice] %s z=%.4f top=%.4f %s' % (o.name, p.z, top, 'ok' if ok else 'DROP'))
    if ok: keep.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in ices: o.select_set(True)
bpy.context.view_layer.objects.active = ices[0]
bpy.ops.rigidbody.objects_remove(); bpy.ops.rigidbody.world_remove()
for o in ices:
    o.animation_data_clear()
    if o not in keep: bpy.data.objects.remove(o)
    else: o.matrix_world = final[o.name]
for c_ in colliders: bpy.data.objects.remove(c_)
ices = keep

# ------------------------------------------------------------------ the milk, and the matcha clouding down through it
GAP = .0006
def liquid_points(L):
    zb, rr = .0034 + WALL + .0004, .0055
    rw = lambda z: r_in(z) - GAP
    zc = zb + rr; rwc = rw(zc)
    pts = [(0., zb)] + [((rwc - rr) * k / 6, zb) for k in range(1, 7)]
    for k in range(1, 9):
        q = k / 8 * pi / 2; z = zc - rr * cos(q)
        pts.append((rwc - rr + rr * sin(q), z))
    n = max(2, int((L - zc) / .002))
    pts += [(rw(z), z) for z in (zc + (L - .0012 - zc) * i / n for i in range(1, n + 1))]
    pts += [(rw(L) - .0004, L + .0006), (rw(L) - .0022, L + .0001), (rw(L) - .006, L)]
    pts.append((0., L))
    return pts
lq = Mat('milk')
tc = lq.n('ShaderNodeTexCoord'); lx = lq.n('ShaderNodeSeparateXYZ'); lq.l(tc.outputs['Object'], lx.inputs[0])
MT = lq.n('ShaderNodeValue', name='M'); MT.outputs[0].default_value = 0.          # how much matcha is in, 0..1
EX = lq.n('ShaderNodeValue', name='EX'); EX.outputs[0].default_value = 0.          # where the stream lands
EY = lq.n('ShaderNodeValue', name='EY'); EY.outputs[0].default_value = 0.
LV = lq.n('ShaderNodeValue', name='LV'); LV.outputs[0].default_value = FL0         # surface height
# marble: ribbons that spiral down round the cup (like a Big Wiss swirl), let in from the top as the matcha goes in
w1 = lq.n('ShaderNodeTexNoise', Scale=9., Detail=2., Roughness=.4, Distortion=.15); lq.l(tc.outputs['Object'], w1.inputs['Vector'])
w2 = lq.n('ShaderNodeTexNoise', Scale=90., Detail=3., Distortion=.6); lq.l(tc.outputs['Object'], w2.inputs['Vector'])
ang = lq.math('ARCTAN2', lx.outputs['Y'], lx.outputs['X'])
twist = lq.math('MULTIPLY_ADD', lx.outputs['Z'], 38., ang)                         # one turn and a bit over the height
band = lq.math('SINE', lq.math('MULTIPLY_ADD', w1.outputs['Fac'], 1.6, twist))
dz = lq.math('SUBTRACT', LV.outputs[0], lx.outputs['Z'])                           # distance below the surface
depth = lq.math('MULTIPLY', lq.math('POWER', MT.outputs[0], .8), .13)               # how far down it has got
wav = lq.math('MULTIPLY_ADD', w1.outputs['Fac'], .02, -.01)
topm = lq.mrange(lq.math('ADD', dz, wav), lq.math('ADD', depth, .012), lq.math('SUBTRACT', depth, .006))  # 1 where it has reached
thr = lq.math('MULTIPLY_ADD', MT.outputs[0], -1.15, .95)                          # more of the swirl turns green as it goes in
rib = lq.mrange(band, thr, lq.math('ADD', thr, .07))
surf = lq.math('MULTIPLY', lq.mrange(dz, .012, .002), lq.mrange(MT.outputs[0], .05, .3))
ex = lq.math('SUBTRACT', lx.outputs['X'], EX.outputs[0]); ey = lq.math('SUBTRACT', lx.outputs['Y'], EY.outputs[0])
rxy = lq.math('SQRT', lq.math('ADD', lq.math('MULTIPLY', ex, ex), lq.math('MULTIPLY', ey, ey)))
plume = lq.math('MULTIPLY', lq.mrange(lq.math('ADD', rxy, lq.math('MULTIPLY', wav, .5)), .016, .005),
                lq.mrange(dz, lq.math('ADD', lq.math('MULTIPLY', depth, 1.2), .015), .0))
m_ = lq.math('MAXIMUM', lq.math('MAXIMUM', lq.math('MULTIPLY', rib, topm), surf), lq.math('MULTIPLY', plume, lq.mrange(MT.outputs[0], .0, .03)))
m_ = lq.math('MINIMUM', m_, 1.)
milk = lq.mix(lq.mrange(w2.outputs['Fac'], .3, .7), srgb('#fbf8f2'), srgb('#f4efe5'))
pale = srgb('#bcc39c'); deep = lq.mix(lq.mrange(w2.outputs['Fac'], .3, .7), srgb('#56712e'), srgb('#5f7b34'))
c1 = lq.mix(lq.mrange(m_, 0., .2), milk, pale)
lc = lq.mix(lq.mrange(m_, .15, .6), c1, deep)
b = lq.bsdf(IOR=1.34, Roughness=.1, **{'Subsurface Weight': .15, 'Subsurface Scale': .0015, 'Coat Weight': .0})
b.inputs['Subsurface Radius'].default_value = (1., .85, .7)
lq.l(lc, b.inputs['Base Color'])
MILK = lq.done(b.outputs[0])
liq = obj('milk', bpy.data.meshes.new('milk0'))
def set_level(L):
    old = liq.data
    bm = bmesh.new(); pts = liquid_points(L); vs = [bm.verts.new((r, 0, z)) for r, z in pts]
    for a, b_ in zip(vs, vs[1:]): bm.edges.new((a, b_))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=160, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bm_mesh('milk', bm); me.materials.append(MILK); liq.data = me
    if old and old.users == 0: bpy.data.meshes.remove(old)
    LV.outputs[0].default_value = L

# ------------------------------------------------------------------ condensation: the cup has been sweating for a while
dm = Mat('drops')
b = dm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.333, 'Roughness': .0})
DROPS = dm.done(dm.clear_shadow(b.outputs[0], keep=.1, diffuse=True))
bm = bmesh.new()
tmpl = bmesh.new(); bmesh.ops.create_uvsphere(tmpl, u_segments=14, v_segments=8, radius=1.)
tv = [v.co.copy() for v in tmpl.verts]; tf = [[v.index for v in f.verts] for f in tmpl.faces]; tmpl.free()
for k in range(520):
    z = random.uniform(.007, FL0 - .003)
    a = random.uniform(0, 2 * pi)
    if abs(((a + pi / 2 + pi) % (2 * pi)) - pi) < span / 2 + .05 and z0 - .002 < z < z1 + .002 and random.random() < .7: continue   # fewer on the print
    r0 = (.00035 + .00115 * random.random() ** 2.4)
    big = random.random() < .025
    if big: r0 = random.uniform(.0014, .0019)
    rz = r_side(z) + .00002
    n = Vector((cos(a), sin(a), -(RT - RB) / H)).normalized(); tu = Vector((-sin(a), cos(a), 0)); tdn = n.cross(tu).normalized()
    if tdn.z > 0: tdn = -tdn
    base = Vector((rz * cos(a), rz * sin(a), z)) - n * .00012
    el = random.uniform(1.6, 2.6) if big else random.uniform(.92, 1.1)
    vs = []
    for c in tv:
        cz = max(c.z, 0.)
        p = base + tu * c.x * r0 + tdn * c.y * r0 * el + n * cz * r0 * .78
        if big: p += tdn * r0 * (el - 1) * .5
        vs.append(bm.verts.new(p))
    for fi in tf:
        try: bm.faces.new([vs[i] for i in fi])
        except ValueError: pass
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-9)
drops = obj('drops', bm_mesh('drops', bm)); drops.data.materials.append(DROPS)

# ------------------------------------------------------------------ the mini pour bottle (about 2 oz), full of matcha
BH = .086; BR = .0172; NR_ = .0086
bprof = [(0., .0016), (.010, .0014), (.0155, .0028), (BR, .0075)]
for i in range(1, 25): z = .0075 + (.056 - .0075) * i / 24; bprof.append((BR, z))
for i in range(1, 17):
    q = i / 16; bprof.append((NR_ + (BR - NR_) * cos(q * pi / 2) ** 1.4, .056 + .018 * q))
for i in range(1, 7): bprof.append((NR_, .074 + (BH - .074) * i / 6))
bottle = lathe('bottle', bprof, steps=128)
bs = bottle.modifiers.new('wall', 'SOLIDIFY'); bs.thickness = .0007; bs.offset = -1; bs.use_even_offset = True
bottle.data.materials.append(PET)
lip = torus('lip', NR_ - .00035 + .0003, .0009, BH - .0004, nu=128, nv=14, parent=bottle); lip.data.materials.append(PET)
for zt in (.077, .0805):
    th = torus('thread', NR_ + .0003, .0006, zt, nu=128, nv=10, parent=bottle); th.data.materials.append(PET)
# the matcha inside: fills the inside of the bottle, cut by a level plane in world space so it stays flat when tipped
inner = [(max(r - .0011, 0.), z) for r, z in bprof if z > .0025]
inner = [(0., .0026)] + inner[:-1] + [(NR_ - .0012, BH - .002), (0., BH - .002)]
bliq = lathe('bottle_matcha', inner, steps=96, parent=bottle, closed=True)
mm = Mat('matcha')
geo = mm.n('ShaderNodeNewGeometry'); gs = mm.n('ShaderNodeSeparateXYZ'); mm.l(geo.outputs['Position'], gs.inputs[0])
BLV = mm.n('ShaderNodeValue', name='BLV'); BLV.outputs[0].default_value = 1.
below = mm.math('LESS_THAN', gs.outputs['Z'], BLV.outputs[0])
mn = mm.n('ShaderNodeTexNoise', Scale=140., Detail=3.); mm.l(geo.outputs['Position'], mn.inputs['Vector'])
mcol = mm.mix(mm.mrange(mn.outputs['Fac'], .35, .65), srgb('#36501a'), srgb('#3f5a1e'))
b = mm.bsdf(IOR=1.34, Roughness=.08, **{'Subsurface Weight': .25, 'Subsurface Scale': .0015})
b.inputs['Subsurface Radius'].default_value = (.6, 1., .35)
mm.l(mcol, b.inputs['Base Color'])
MATCHA_B = mm.done(mm.fade(b.outputs[0], below))
bliq.data.materials.append(MATCHA_B)
sm = Mat('stream')
b = sm.bsdf(IOR=1.34, Roughness=.06, **{'Subsurface Weight': .5, 'Subsurface Scale': .002, 'Base Color': srgb('#4f6b26')})
b.inputs['Subsurface Radius'].default_value = (.6, 1., .35)
STREAM = sm.done(b.outputs[0])
stream = obj('stream', bpy.data.meshes.new('stream0'))
# its cap, put down on the counter
cap = lathe('cap', [(0., .0102), (NR_ + .0011, .0102), (NR_ + .0016, .0096), (NR_ + .0016, .0004), (NR_ + .0012, 0.)], steps=64)
cm = Mat('cap'); CAPM = cm.done(cm.bsdf(**{'Base Color': srgb('#1f0807'), 'Roughness': .38, 'Specular IOR Level': .4}).outputs[0])
cap.data.materials.append(CAPM)
cap.location = (.104, -.046, 0.); cap.rotation_euler = (0, 0, 0)

# bottle interior samples, for the level that keeps the poured-out volume right
pts_in = []
for i in range(4000):
    z = random.uniform(.003, BH - .003); r = sqrt(random.random()); a = random.uniform(0, 2 * pi)
    rr = (BR if z < .056 else NR_ + (BR - NR_) * cos(min(1., (z - .056) / .018) * pi / 2) ** 1.4 if z < .074 else NR_) - .0012
    pts_in.append(Vector((rr * r * cos(a), rr * r * sin(a), z)))
REST = (Vector((.093, .042, 0.)), 0.)
POUR = None
def bottle_pose(t):
    """Base position and tilt (about Y, radians) through the film. Up: lift and tip together. Back: tip upright where it
    is (beside and above the cup), then lower straight down to the counter, so it never passes in front of the cup."""
    mouth = Vector((.024, -.006, H + .036))
    def base_for(ang): return mouth - Vector((sin(ang), 0., cos(ang))) * BH
    if t < .80:
        up = smoother(seg(t, .17, .37))
        ang = (radians(-122) + radians(-6) * sin(pi * seg(t, .38, .80))) * up
        lift = Vector((0, 0, .03 * sin(pi * up)))
        return REST[0].lerp(base_for(ang), up) + lift, ang
    # back: turn upright about its middle while sliding off to the side above the cup, then set down on the counter
    rot = smoother(seg(t, .80, .875)); side = smoother(seg(t, .80, .88)); down = smoother(seg(t, .865, .985))
    ang = radians(-122) * (1 - rot)
    a0 = radians(-122); c0 = base_for(a0) + Vector((sin(a0), 0., cos(a0))) * BH / 2
    c_rest = REST[0] + Vector((0, 0, BH / 2))
    c = Vector((c0.x + (c_rest.x - c0.x) * side, c0.y + (c_rest.y - c0.y) * side, c0.z + (c_rest.z - c0.z) * down))
    return c - Vector((sin(ang), 0., cos(ang))) * BH / 2, ang
def remain(t): return .86 - .70 * smooth(seg(t, .38, .80))
def matcha_amount(t): return .92 * smooth(seg(t, .39, .82)) + .08 * seg(t, .82, 1.)
def pouring(t):
    """0..1 how far the stream front has got, and how far the tail has come off the mouth."""
    return smooth(seg(t, .37, .41)), smooth(seg(t, .78, .83))

def build_stream(mouth, d, Lsurf, front, tail, tt):
    v0 = d * .23; g = Vector((0, 0, -9.81)); path = []
    for i in range(160):
        s = i * .0012; p = mouth + v0 * s + .5 * g * s * s
        path.append(p)
        if p.z < Lsurf - .001: break
    n = len(path); a = int(tail * (n - 1)); bidx = max(a + 2, int(front * (n - 1)) + 1)
    path = path[a:bidx]
    bm = bmesh.new(); rings = []; SEGS = 14
    for i, p in enumerate(path):
        tdir = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        nx = tdir.cross(Vector((0, 1, 0))).normalized(); ny = tdir.cross(nx).normalized()
        u = (a + i) / max(1, n - 1)
        rad = .0032 * (1 - .45 * u) + .00025 * sin(u * 40 + tt * 60)
        if i == 0 and a > 0: rad *= .5
        rings.append([bm.verts.new(p + (nx * cos(2 * pi * j / SEGS) + ny * sin(2 * pi * j / SEGS)) * rad) for j in range(SEGS)])
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(SEGS): bm.faces.new((r0[j], r0[(j + 1) % SEGS], r1[(j + 1) % SEGS], r1[j]))
    if len(rings) > 1:
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    old = stream.data; me = bm_mesh('stream', bm); me.materials.append(STREAM); stream.data = me
    if old and old.users == 0: bpy.data.meshes.remove(old)
    return path[-1] if path else mouth

# ------------------------------------------------------------------ studio: a warm cream sweep like their menu board, soft light, long strips for the plastic
bm = bmesh.new(); prof = [(-2., 0.)] + [(.30 + .45 * sin(q), .45 * (1 - cos(q))) for q in np.linspace(0, pi / 2, 24)] + [(.75, 2.)]
rows = [[bm.verts.new((x, y, z)) for y, z in prof] for x in (-3., 3.)]
for i in range(len(prof) - 1): bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
sweep = obj('sweep', bm_mesh('sweep', bm))
sw = Mat('sweep')
b = sw.bsdf(**{'Base Color': srgb(os.environ.get('MY_BG', '#21140f')), 'Roughness': .72, 'Specular IOR Level': .25})
sweep.data.materials.append(sw.done(b.outputs[0]))
LIGHT = float(os.environ.get('MY_LIGHT', '.85'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    return o
area('key', (.62, -.6, .50), (0, 0, .11), 1.0, 1.0, 230, (1, .97, .94), spread=radians(55))
area('fill', (-.7, -.7, .2), (0, 0, .09), 1.0, .7, 28, (.97, .98, 1), spread=radians(75))
# a big soft front box, so the milk reads white instead of silver through the wall
front = area('front', (-.12, -.85, .22), (.02, 0, .08), .9, .6, float(os.environ.get('MY_FRONT', '120')), (1, .985, .965), spread=radians(70)); front.visible_glossy = False
flag = Mat('flag'); FLAG = flag.done(flag.bsdf(**{'Base Color': (.004, .004, .004, 1), 'Roughness': .9, 'Specular IOR Level': .1}).outputs[0])
for sx_ in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    fo = obj('flag', bm_mesh('flag', bm, False)); fo.data.materials.append(FLAG)
    fo.scale = (1., .7, 1.); fo.location = (sx_ * .5 + .03, -.05, .25); fo.rotation_euler = (0, pi / 2, 0)
    fo.visible_camera = False
wl = area('wall', (0., .22, .02), (0, .9, .4), 1.4, .6, float(os.environ.get('MY_WALL', '170')), (1, .97, .93)); wl.visible_glossy = False; wl.visible_transmission = False
card = Mat('card'); em = card.n('ShaderNodeEmission', Strength=float(os.environ.get('MY_CARD', '520'))); CARD = card.done(em.outputs[0])
try: CARD.cycles.emission_sampling = 'NONE'
except Exception: pass
for nm_, loc_ in (('cardL', (-.15, -.33, .16)), ('cardR', (.19, -.32, .16))):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.04, .34, 1), verts=bm.verts)
    co = obj(nm_, bm_mesh(nm_, bm, False)); co.data.materials.append(CARD); co.location = loc_
    co.rotation_euler = (Vector((0, 0, loc_[2])) - Vector(loc_)).to_track_quat('Z', 'Y').to_euler()
    co.visible_camera = False; co.visible_diffuse = False; co.visible_shadow = False; co.visible_volume_scatter = False
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.9, .7, 1), verts=bm.verts)
bc_ = obj('floorcard', bm_mesh('floorcard', bm, False)); bc_.data.materials.append(FLAG); bc_.location = (0, -.58, .0015)
bc_.visible_camera = False; bc_.visible_diffuse = False; bc_.visible_shadow = False; bc_.visible_transmission = False
area('rimL', (-.36, .36, .18), (0, 0, .10), .08, .6, 70, (1, .97, .95), spread=radians(60))
area('rimR', (.40, .34, .2), (.04, 0, .12), .08, .6, 60, (1, .97, .95), spread=radians(60))
area('top', (.06, -.10, .62), (0, 0, .12), .45, .45, 8, (1, .98, .95), spread=radians(60))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .06 * LIGHT / .16
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera: square frame, a slow orbit with a gentle push in
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24.; cd.lens = 62.; cd.clip_start = .01
cd.dof.use_dof = True; cd.dof.aperture_fstop = 8.
cam = obj('cam', cd); scn.camera = cam

def state(t):
    base, ang = bottle_pose(t)
    bottle.location = base; bottle.rotation_euler = (0, ang, 0)
    bpy.context.view_layer.update()
    mw = bottle.matrix_world
    # bottle level: the world height under which the remaining share of the inside sits
    zs = sorted((mw @ p).z for p in pts_in); BLV.outputs[0].default_value = zs[int(clamp(remain(t), 0, .999) * len(zs))]
    m = matcha_amount(t)
    set_level(FL0 + .010 * smooth(seg(t, .39, .82)))
    MT.outputs[0].default_value = m
    front, tail = pouring(t)
    mouth = mw @ Vector((0, 0, BH + .0006)); d = (mw.to_3x3() @ Vector((0, 0, 1))).normalized()
    if front > 0 and tail < 1:
        stream.hide_render = False
        end = build_stream(mouth, d, LV.outputs[0].default_value, front, tail, t)
    else:
        stream.hide_render = True; end = Vector((.0, -.006, 0))
    if front > 0: EX.outputs[0].default_value = clamp(end.x, -.02, .03); EY.outputs[0].default_value = clamp(end.y, -.02, .02)
    # camera
    az = radians(-16 + 26 * smoother(t)); el = radians(9 + 5 * smooth(seg(t, .15, .55)) - 3 * smooth(seg(t, .8, 1.)))
    dist = .74 - .04 * smoother(t); tgt = Vector((.026, 0., .118))
    cam.location = tgt + Vector((sin(az) * cos(el), -cos(az) * cos(el), sin(el))) * dist
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (cam.location - Vector((.01, -.03, .10))).length

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 840, 840; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(os.environ.get('MY_ADAPT', '.02'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 10; cy.transparent_max_bounces = 16; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 5
r.use_persistent_data = True
scn.view_settings.view_transform = 'Khronos PBR Neutral'; scn.view_settings.look = 'None'; scn.view_settings.exposure = float(os.environ.get('MY_EV', '-3.25'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for f in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % f)
    if SEL == 'all' and os.path.exists(fp): continue
    state(f / (N - 1)); r.filepath = fp
    for nm_ in filter(None, os.environ.get('MY_HIDE', '').split(',')):
        for o_ in bpy.data.objects:
            if o_.name.startswith(nm_): o_.hide_render = True
    bpy.ops.render.render(write_still=True)
print('done')
