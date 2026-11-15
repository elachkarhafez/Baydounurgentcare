# LUMA Coffee & Matcha: the Buzz'n Brew cookie butter latte scene reused as-is with LUMA's round sticker (tex/label.png).
# Their real drink (reel De0GFEUu7E0): clear cup with the white BUZZ'N BREW label, cookie butter on the walls, ice,
# espresso and milk, a snickerdoodle cookie as the lid and a black straw pushed through it.
# Beats: empty cup -> cookie butter on the walls -> ice drops in -> the latte fills, the cup sweats ->
#        the cookie lands on the rim -> the straw goes through it while the camera rises to the lid.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=150] [samples=96] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, atan2, sqrt, radians
from mathutils import Vector, Matrix, Euler
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 150
SAMPLES = int(argv[3]) if len(argv) > 3 else 96
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
        s.v(m.inputs['Value'], val); m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b
        m.inputs['To Min'].default_value = lo; m.inputs['To Max'].default_value = hi; return m.outputs['Result']
    def mix(s, fac, a, b):
        m = s.n('ShaderNodeMix', data_type='RGBA'); s.v(m.inputs['Factor'], fac); s.v(m.inputs[6], a); s.v(m.inputs[7], b)
        return m.outputs[2]
    def bsdf(s, **kw): return s.n('ShaderNodeBsdfPrincipled', **kw)
    def clear_shadow(s, shader, keep=0.):
        """Shadow rays see (mostly) through: lamps reach what's behind clear plastic, ice and water."""
        lp = s.n('ShaderNodeLightPath'); tr = s.n('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (1 - keep,) * 3 + (1,)
        mx = s.n('ShaderNodeMixShader'); s.l(lp.outputs['Is Shadow Ray'], mx.inputs[0]); s.l(shader, mx.inputs[1]); s.l(tr.outputs[0], mx.inputs[2])
        return mx.outputs[0]
    def fade(s, shader, fac):
        """fac 0 = invisible, 1 = shader."""
        tr = s.n('ShaderNodeBsdfTransparent'); mx = s.n('ShaderNodeMixShader'); s.v(mx.inputs[0], fac)
        s.l(tr.outputs[0], mx.inputs[1]); s.l(shader, mx.inputs[2]); return mx.outputs[0]
    def done(s, shader): s.l(shader, s.out.inputs[0]); return s.m


def lathe(name, prof, steps=192, parent=None, closed=False):
    """prof: (r, z) from the axis outwards and up, spun around Z. Open surfaces get outward normals."""
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    if closed: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    else:
        bm.faces.ensure_lookup_table(); f = max(bm.faces, key=lambda f: f.calc_area()); c = f.calc_center_median()
        if f.normal.x * c.x + f.normal.y * c.y < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)


# ------------------------------------------------------------------ dimensions (metres): a 24 oz PET cold cup
H, RT, RB = .150, .049, .030
WALL = .00055
ZS = H - .021                         # the stacking ring every PET cup has under the rim
FL = H - .012                         # latte fill line
def r_side(z): return RB + (RT - RB) * z / H + .0007 * smooth((z - (ZS - .0012)) / .0024)
def r_in(z): return r_side(z) - WALL

prod = obj('product', None)           # cup + everything in it turns on this
prod.empty_display_size = .05

# ------------------------------------------------------------------ the cup
prof = [(0., .0034), (.010, .0033), (.018, .0028), (.0236, .0013)]
p0, p1, p2 = (.0262, 0.), (RB + .0004, -.0002), (r_side(.009), .009)
for i in range(13):
    s = i / 12; prof.append(((1 - s) ** 2 * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0], (1 - s) ** 2 * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1]))
for i in range(1, 91):
    z = .009 + (H - .009) * i / 90; prof.append((r_side(z), z))
cup = lathe('cup', prof, parent=prod)
so = cup.modifiers.new('wall', 'SOLIDIFY'); so.thickness = WALL; so.offset = -1; so.use_even_offset = True

pet = Mat('pet')
nz = pet.n('ShaderNodeTexNoise', Scale=90., Detail=3.)
pr = pet.mrange(nz.outputs['Fac'], .3, .7, .002, .012)
b = pet.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.57, 'Specular IOR Level': .5})
pet.l(pr, b.inputs['Roughness'])
PET = pet.done(pet.clear_shadow(b.outputs[0], keep=.06))
cup.data.materials.append(PET)

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
BEAD = .00105
rim = torus('rim', r_side(H) - WALL / 2 + .0004, BEAD, H - .0002, parent=prod); rim.data.materials.append(PET)
RIM_TOP = H - .0002 + BEAD

# ------------------------------------------------------------------ the printed label (their logo, black on white)
LW = .080; LH = LW * 740 / 1600; ZL = .089
z0, z1 = ZL - LH / 2, ZL + LH / 2
span = LW / r_side(ZL); A0 = -pi / 2 - span / 2
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
NU, NV = 140, 24; grid = []
for i in range(NU + 1):
    a = A0 + span * i / NU
    grid.append([bm.verts.new(((r_side(z) + .00012) * cos(a), (r_side(z) + .00012) * sin(a), z)) for z in (z0 + (z1 - z0) * j / NV for j in range(NV + 1))])
for i in range(NU):
    for j in range(NV):
        f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for lp, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): lp[uvl].uv = (u / NU, v / NV)
if os.environ.get('BNB_FLIP'): bmesh.ops.reverse_faces(bm, faces=bm.faces)
label = obj('label', bm_mesh('label', bm), prod)
lm = Mat('label')
tx = lm.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/label.png'))
b = lm.bsdf(Roughness=.35, **{'Specular IOR Level': .1, 'Subsurface Weight': .0})
lm.l(tx.outputs['Color'], b.inputs['Base Color']); lm.l(tx.outputs['Alpha'], b.inputs['Alpha'])
label.data.materials.append(lm.done(b.outputs[0]))

# ------------------------------------------------------------------ cookie butter smeared on the inside of the wall
sp = [(r_in(z) - .00016, z) for z in (.006 + (FL - .002 - .006) * i / 60 for i in range(61))]
sauce = lathe('sauce', sp, parent=prod)
sm = Mat('sauce')
# cookie butter drizzled round the inside in zigzag loops, with a few drips running down from them
tc = sm.n('ShaderNodeTexCoord'); sx = sm.n('ShaderNodeSeparateXYZ'); sm.l(tc.outputs['Object'], sx.inputs[0])
ang = sm.math('ARCTAN2', sx.outputs['Y'], sx.outputs['X'])
wob = sm.n('ShaderNodeTexNoise', Scale=55., Detail=3.); sm.l(tc.outputs['Object'], wob.inputs['Vector'])
fine = sm.n('ShaderNodeTexNoise', Scale=300., Detail=2.); sm.l(tc.outputs['Object'], fine.inputs['Vector'])
mpc = sm.n('ShaderNodeMapping'); mpc.inputs['Scale'].default_value = (1., 1., 0.); sm.l(tc.outputs['Object'], mpc.inputs['Vector'])
col1 = sm.n('ShaderNodeTexNoise', Scale=210., Detail=1.); sm.l(mpc.outputs[0], col1.inputs['Vector'])      # varies with angle only: drip columns
col2 = sm.n('ShaderNodeTexNoise', Scale=90., Detail=1.); sm.l(mpc.outputs[0], col2.inputs['Vector'])
SAUCE_T = sm.n('ShaderNodeValue', name='T'); SAUCE_T.outputs[0].default_value = 1.
an = sm.math('MULTIPLY_ADD', ang, 1 / (2 * pi), .5)                  # 0..1 round the cup
LINES = [(.93, 5, .3, .0095), (.79, 6, 2.1, .011), (.63, 5, 4.0, .012), (.47, 7, 1.2, .01)]
mask = None
for i, (h, m, ph, A) in enumerate(LINES):
    zl = sm.math('ADD', sm.math('MULTIPLY_ADD', sm.math('SINE', sm.math('MULTIPLY_ADD', ang, float(m), ph)), A, h * FL),
                 sm.math('MULTIPLY_ADD', wob.outputs['Fac'], .006, -.003))
    dz = sm.math('SUBTRACT', sx.outputs['Z'], zl)
    w = sm.math('MULTIPLY_ADD', fine.outputs['Fac'], .0012, .0007)
    line = sm.math('SUBTRACT', 1., sm.mrange(sm.math('DIVIDE', sm.math('ABSOLUTE', dz), w), .55, 1.))
    # drips: under the line, only in some angular columns, longer where the column noise is high
    colv = sm.mrange(col1.outputs['Fac'], .6, .7)
    dl = sm.math('MULTIPLY', sm.math('MULTIPLY', col2.outputs['Fac'], .03), sm.mrange(SAUCE_T.outputs[0], .55, 1.))
    drip = sm.math('MULTIPLY', colv, sm.math('MULTIPLY', sm.mrange(dz, .0005, -.0005), sm.mrange(dz, sm.math('MULTIPLY', dl, -1.), 0) if False else sm.mrange(sm.math('ADD', dz, dl), -.0015, .0015)))
    drawn = sm.mrange(sm.math('SUBTRACT', sm.math('MULTIPLY_ADD', SAUCE_T.outputs[0], 1.7, -i * .22), an), -.02, .02)  # loops get drawn round the cup in turn
    li = sm.math('MULTIPLY', sm.math('MAXIMUM', line, drip), drawn)
    mask = li if mask is None else sm.math('MAXIMUM', mask, li)
bmp = sm.n('ShaderNodeBump', Strength=.6, Distance=.0005); sm.l(mask, bmp.inputs['Height'])
sc = sm.mix(sm.mrange(fine.outputs['Fac'], .35, .7), srgb('#8f4517'), srgb('#b8662a'))
b = sm.bsdf(Roughness=.16, **{'Subsurface Weight': .3, 'Subsurface Scale': .0015, 'IOR': 1.45, 'Coat Weight': .4, 'Coat Roughness': .06})
sm.l(sc, b.inputs['Base Color']); sm.l(bmp.outputs[0], b.inputs['Normal'])
SAUCE = sm.done(sm.fade(b.outputs[0], mask))
sauce.data.materials.append(SAUCE)

# ------------------------------------------------------------------ ice: a real rigid body drop into the cup
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
rbw.time_scale = .32; rbw.substeps_per_frame = 40; rbw.solver_iterations = 40; rbw.point_cache.frame_end = 400
def add_rb(o, kind, shape, **kw):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.rigidbody.object_add(type=kind); rb = o.rigid_body; rb.collision_shape = shape
    for k, v in kw.items(): setattr(rb, k, v)
    return rb
# collider: the inside of the cup as convex pieces (staves + a disc), which Bullet handles far better than a thin triangle mesh
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
SIMN = 50
ices, spawn = [], []
NICE = 21
for i in range(NICE):
    o = obj('ice%02d' % i, ice_me); s = random.uniform(.0215, .0245)
    o.scale = (s, s * random.uniform(.9, 1.0), s * random.uniform(.88, .98))
    # a falling column: every cube starts at rest above the frame, higher ones land later (slow motion via time_scale)
    a = random.uniform(0, 2 * pi); rr = random.uniform(0, .011)
    o.location = (rr * cos(a), rr * sin(a), .31 + .04 * i)
    o.rotation_euler = (random.uniform(0, pi), random.uniform(0, pi), random.uniform(0, pi))
    add_rb(o, 'ACTIVE', 'BOX', mass=.012, friction=.3, restitution=.12, collision_margin=.0003, linear_damping=.04, angular_damping=.2)
    ices.append(o); spawn.append(0)
track = {o.name: [] for o in ices}
for f in range(1, SIMN + 2):
    scn.frame_set(f)
    for o in ices: track[o.name].append(o.matrix_world.copy())
    if os.environ.get('BNB_DEBUG'): print('[sim] f=%d ice00 %s kin=%s  ice05 %s' % (f, tuple(round(x, 3) for x in ices[0].matrix_world.translation), ices[0].rigid_body.kinematic, tuple(round(x, 3) for x in ices[5].matrix_world.translation)))
# keep only cubes that ended inside the cup and under the cookie
keep = []
for o in ices:
    m = track[o.name][-1]; p = m.translation
    top = max((m @ Vector(c)).z for c in ((x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)))
    ok = sqrt(p.x ** 2 + p.y ** 2) < r_in(p.z) and 0 < p.z and top < RIM_TOP - .0015
    print('[ice] %s end z=%.4f r=%.4f top=%.4f %s' % (o.name, p.z, sqrt(p.x ** 2 + p.y ** 2), top, 'ok' if ok else 'DROP'))
    if ok: keep.append(o)
SPAWN = {o.name: s for o, s in zip(ices, spawn) if o in keep}
# freeze: plain objects parented to the product, driven from the recorded track
bpy.ops.object.select_all(action='DESELECT')
for o in ices: o.select_set(True)
bpy.context.view_layer.objects.active = ices[0]
bpy.ops.rigidbody.objects_remove()
bpy.ops.rigidbody.world_remove()
for o in ices:
    o.animation_data_clear()
    if o not in keep: bpy.data.objects.remove(o)
for c_ in colliders: bpy.data.objects.remove(c_)
for o in keep: o.parent = prod
ices = keep

# ------------------------------------------------------------------ the latte (opaque, so the ice only shows at the wall and the top)
GAP = .0006
def liquid_points(L):
    zb, rr = .0034 + WALL + .0004, .0055
    rw = lambda z: r_in(z) - GAP
    zc = zb + rr; rwc = rw(zc)
    pts = [(0., zb)] + [((rwc - rr) * k / 6, zb) for k in range(1, 7)]
    for k in range(1, 9):                       # rounded foot of the liquid
        q = k / 8 * pi / 2; z = zc - rr * cos(q)
        if z >= L - .0003: break
        pts.append((rwc - rr + rr * sin(q), z))
    if L <= zc + .002:
        q = math.acos(clamp((zc - L) / rr, -1, 1)); pts.append((rwc - rr + rr * sin(q), L))
    else:
        n = max(2, int((L - zc) / .002))
        pts += [(rw(z), z) for z in (zc + (L - .0012 - zc) * i / n for i in range(1, n + 1))]
        pts += [(rw(L) - .0004, L + .0006), (rw(L) - .0022, L + .0001), (rw(L) - .006, L)]   # meniscus up the wall
    pts.append((0., L))
    return pts
lq = Mat('latte')
tc = lq.n('ShaderNodeTexCoord'); lx = lq.n('ShaderNodeSeparateXYZ'); lq.l(tc.outputs['Object'], lx.inputs[0])
w1 = lq.n('ShaderNodeTexNoise', Scale=28., Detail=5., Roughness=.6, Distortion=1.2); lq.l(tc.outputs['Object'], w1.inputs['Vector'])
w2 = lq.n('ShaderNodeTexNoise', Scale=75., Detail=3.); lq.l(tc.outputs['Object'], w2.inputs['Vector'])
hz = lq.math('ADD', lq.math('DIVIDE', lx.outputs['Z'], FL), lq.math('MULTIPLY_ADD', w1.outputs['Fac'], .10, -.05))
# cookie butter latte below, a fold of espresso where the cold foam sits on it, the foam on top
MATCHA = bool(os.environ.get('LUMA_MATCHA'))     # LUMA's iced matcha: same cup and cream top, matcha below, no cookie butter
latte = lq.mix(lq.mrange(w2.outputs['Fac'], .3, .7), *((srgb('#5d7d2b'), srgb('#7a9a3d')) if MATCHA else (srgb('#8e5527'), srgb('#b07440'))))
streak = lq.math('MULTIPLY', lq.mrange(lq.math('ABSOLUTE', lq.math('SUBTRACT', w1.outputs['Fac'], .5)), .045, .01), lq.mrange(hz, .5, .7))
latte = lq.mix(lq.math('MULTIPLY', streak, .8), latte, srgb('#3e5519') if MATCHA else srgb('#4a2410'))
foamf = lq.mrange(hz, .755, .79)
foam = lq.mix(lq.mrange(w2.outputs['Fac'], .4, .6), srgb('#efe6d8'), srgb('#f6f0e6'))
lc = lq.mix(foamf, latte, foam)
bub = lq.n('ShaderNodeTexVoronoi', Scale=900.); lq.l(tc.outputs['Object'], bub.inputs['Vector'])
lbmp = lq.n('ShaderNodeBump', Distance=.0002); lq.l(bub.outputs['Distance'], lbmp.inputs['Height']); lq.l(lq.math('MULTIPLY', foamf, .5), lbmp.inputs['Strength'])
b = lq.bsdf(IOR=1.34, **{'Subsurface Weight': .35, 'Subsurface Scale': .003, 'Coat Weight': .0})
b.inputs['Subsurface Radius'].default_value = (1., .55, .3)
lq.l(lc, b.inputs['Base Color']); lq.l(lq.math('MULTIPLY_ADD', foamf, .38, .1), b.inputs['Roughness']); lq.l(lbmp.outputs[0], b.inputs['Normal'])
LATTE = lq.done(b.outputs[0])
liq = obj('latte', bpy.data.meshes.new('latte0'), prod)
def set_level(L):
    old = liq.data
    if L < .0045:
        liq.hide_render = True; return
    liq.hide_render = False
    bm = bmesh.new(); pts = liquid_points(L); vs = [bm.verts.new((r, 0, z)) for r, z in pts]
    for a, b_ in zip(vs, vs[1:]): bm.edges.new((a, b_))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=160, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bm_mesh('latte', bm); me.materials.append(LATTE); liq.data = me
    if old and old.users == 0: bpy.data.meshes.remove(old)

# ------------------------------------------------------------------ condensation: droplets bead up below the fill line
def level_at(t): return FL * smoother(seg(t, .44, .66))
def t_reach(z):
    for k in range(400):
        t = .44 + .22 * k / 399
        if level_at(t) >= z: return t
    return .66
dm = Mat('drops')
at = dm.n('ShaderNodeAttribute', attribute_name='appear'); NOW = dm.n('ShaderNodeValue', name='T'); NOW.outputs[0].default_value = 1.
vis = dm.mrange(dm.math('SUBTRACT', NOW.outputs[0], at.outputs['Fac']), 0., .025)
b = dm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.333, 'Roughness': .0})
DROPS = dm.done(dm.fade(dm.clear_shadow(b.outputs[0], keep=.1), vis))
bm = bmesh.new(); appear = []
tmpl = bmesh.new(); bmesh.ops.create_uvsphere(tmpl, u_segments=14, v_segments=8, radius=1.)
tv = [v.co.copy() for v in tmpl.verts]; tf = [[v.index for v in f.verts] for f in tmpl.faces]; tmpl.free()
ND = 560
for k in range(ND):
    z = random.uniform(.007, FL - .004)
    a = random.uniform(0, 2 * pi)
    r0 = (.00035 + .00115 * random.random() ** 2.4)
    big = random.random() < .025
    if big: r0 = random.uniform(.0014, .0019)
    rz = r_side(z) + .00002
    n = Vector((cos(a), sin(a), -(RT - RB) / H)).normalized(); tu = Vector((-sin(a), cos(a), 0)); tdn = n.cross(tu).normalized()
    if tdn.z > 0: tdn = -tdn
    base = Vector((rz * cos(a), rz * sin(a), z)) - n * .00012
    el = random.uniform(1.6, 2.6) if big else random.uniform(.92, 1.1)
    ap = t_reach(z) + random.uniform(.025, .2)
    vs = []
    for c in tv:
        cz = max(c.z, 0.)
        p = base + tu * c.x * r0 + tdn * c.y * r0 * el + n * cz * r0 * .78
        if big: p += tdn * r0 * (el - 1) * .5
        vs.append(bm.verts.new(p))
    for fi in tf:
        try: bm.faces.new([vs[i] for i in fi])
        except ValueError: pass
    appear += [ap] * len(tv)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-9)
drops_me = bm_mesh('drops', bm)
attr = drops_me.attributes.new('appear', 'FLOAT', 'POINT'); attr.data.foreach_set('value', appear[:len(drops_me.vertices)])
drops_me.materials.append(DROPS)
drops = obj('drops', drops_me, prod)

# ------------------------------------------------------------------ the snickerdoodle: a scanned cookie (ambientCG CookieSet001, CC0)
def img_np(path, cs='Non-Color'):
    im = bpy.data.images.load(path); im.colorspace_settings.name = cs
    a = np.empty(im.size[0] * im.size[1] * im.channels, dtype=np.float32); im.pixels.foreach_get(a)
    return im, a.reshape(im.size[1], im.size[0], im.channels)
_, disp = img_np(asset('tex/cookie_disp.png')); _, mask = img_np(asset('tex/cookie_mask.png'))
disp = disp[..., 0]; mask = mask[..., 0]; S_ = disp.shape[0]
def samp(arr, u, v):
    x = np.clip(u * (S_ - 1), 0, S_ - 1.001); y = np.clip(v * (S_ - 1), 0, S_ - 1.001)
    x0 = x.astype(int); y0 = y.astype(int); fx = x - x0; fy = y - y0
    return (arr[y0, x0] * (1 - fx) * (1 - fy) + arr[y0, x0 + 1] * fx * (1 - fy) + arr[y0 + 1, x0] * (1 - fx) * fy + arr[y0 + 1, x0 + 1] * fx * fy)
NA, NR = 288, 72
angs = np.linspace(0, 2 * pi, NA, endpoint=False)
redge = np.zeros(NA)
for i, a in enumerate(angs):
    rs = np.linspace(.2, .5, 300); m = samp(mask, .5 + rs * cos(a), .5 + rs * sin(a))
    inside = np.where(m > .5)[0]; redge[i] = rs[inside[-1]] if len(inside) else .45
k_ = np.ones(3) / 3; redge = np.convolve(np.r_[redge[-1:], redge, redge[:1]], k_, 'valid')
redge *= .985
RC = .0625; TC = .0118
kxy = RC / redge.mean()
def boxblur(a, r):
    c = np.cumsum(np.cumsum(np.pad(a, r + 1, mode='edge'), 0), 1); n = 2 * r + 1
    return (c[n:, n:] - c[:-n, n:] - c[n:, :-n] + c[:-n, :-n])[:a.shape[0], :a.shape[1]] / n / n
disp = (disp - boxblur(disp, 28)) * 1. + boxblur(disp, 28) * .25      # keep the cracks, flatten the big lumps
inner = disp[mask > .5]; d50, d5, d95 = np.percentile(inner, 50), np.percentile(inner, 4), np.percentile(inner, 96)
rings = np.r_[np.linspace(0, .8, 34)[:-1], .8 + .2 * np.sin(np.linspace(0, pi / 2, NR - 33))]   # dense near the rounded edge
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); top = []
for j, rn in enumerate(rings):
    row = []
    for i, a in enumerate(angs):
        re = redge[i]; u = .5 + rn * re * cos(a); v = .5 + rn * re * sin(a)
        e = .93
        prof_ = TC * (.62 + .38 * (1 - rn * rn)) * (sqrt(max(0., 1 - ((rn - e) / (1 - e)) ** 2)) if rn > e else 1.)
        d = (samp(disp, np.array([u]), np.array([v]))[0] - d50) / (d95 - d5)
        z = prof_ + d * .0042 * (1 - smooth((rn - .9) / .1) * .6) * (1 if rn < .995 else 0)
        row.append((bm.verts.new((rn * re * kxy * cos(a), rn * re * kxy * sin(a), max(z, 0.))), u, v))
    top.append(row)
for j in range(len(rings) - 1):
    for i in range(NA):
        q = (top[j][i], top[j][(i + 1) % NA], top[j + 1][(i + 1) % NA], top[j + 1][i])
        if j == 0: q = (q[0], q[2], q[3])
        try:
            f = bm.faces.new([x[0] for x in q])
            for lp, x in zip(f.loops, q): lp[uvl].uv = (x[1], x[2])
        except ValueError: pass
bc = bm.verts.new((0, 0, 0)); last = top[-1]
for i in range(NA):
    f = bm.faces.new((last[(i + 1) % NA][0], last[i][0], bc))
    for lp, uv in zip(f.loops, ((last[(i + 1) % NA][1], last[(i + 1) % NA][2]), (last[i][1], last[i][2]), (.5, .5))): lp[uvl].uv = uv
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
cookie = obj('cookie', bm_mesh('cookie', bm), prod)
ck = Mat('cookie')
uvn = ck.n('ShaderNodeUVMap', uv_map='UVMap')
cimg = ck.n('ShaderNodeTexImage', interpolation='Cubic'); cimg.image = bpy.data.images.load(asset('tex/cookie_color.jpg')); ck.l(uvn.outputs[0], cimg.inputs[0])
nimg = ck.n('ShaderNodeTexImage', interpolation='Cubic'); nimg.image = bpy.data.images.load(asset('tex/cookie_normal.jpg')); nimg.image.colorspace_settings.name = 'Non-Color'; ck.l(uvn.outputs[0], nimg.inputs[0])
rimg = ck.n('ShaderNodeTexImage'); rimg.image = bpy.data.images.load(asset('tex/cookie_rough.jpg')); rimg.image.colorspace_settings.name = 'Non-Color'; ck.l(uvn.outputs[0], rimg.inputs[0])
hs = ck.n('ShaderNodeHueSaturation', Hue=.5, Saturation=.86, Value=.9); ck.l(cimg.outputs['Color'], hs.inputs['Color'])
tco = ck.n('ShaderNodeTexCoord')
vor = ck.n('ShaderNodeTexVoronoi', Scale=650.); ck.l(tco.outputs['Object'], vor.inputs['Vector'])
spn = ck.n('ShaderNodeTexNoise', Scale=260., Detail=2.); ck.l(tco.outputs['Object'], spn.inputs['Vector'])
speck = ck.math('MULTIPLY', ck.mrange(vor.outputs['Distance'], .36, .14), ck.mrange(spn.outputs['Fac'], .36, .5))
geo = ck.n('ShaderNodeNewGeometry'); gz = ck.n('ShaderNodeSeparateXYZ'); ck.l(geo.outputs['Normal'], gz.inputs[0])
upf = ck.mrange(gz.outputs['Z'], .2, .7)                       # cinnamon sugar sits on the top, not the underside
col_ = ck.mix(ck.math('MULTIPLY', speck, ck.math('MULTIPLY', upf, .9)), hs.outputs['Color'], srgb('#5a2c10'))
edgec = ck.n('ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); edgec.inputs['Factor'].default_value = 1.; ck.l(col_, edgec.inputs[6]); edgec.inputs[7].default_value = srgb('#c9a27a')
under = ck.mix(ck.math('SUBTRACT', 1., upf), col_, edgec.outputs[2])      # the baked edge: same crumb, a shade darker
nm = ck.n('ShaderNodeNormalMap', Strength=2.2, uv_map='UVMap'); ck.l(nimg.outputs['Color'], nm.inputs['Color'])
sug = ck.n('ShaderNodeTexVoronoi', Scale=2400.); ck.l(tco.outputs['Object'], sug.inputs['Vector'])
glint = ck.math('MULTIPLY', ck.mrange(sug.outputs['Distance'], .07, .03), upf)
rough = ck.math('SUBTRACT', ck.mrange(rimg.outputs['Color'], 0., 1., .62, .92, False), ck.math('MULTIPLY', glint, .5))
b = ck.bsdf(**{'Subsurface Weight': .1, 'Subsurface Scale': .0015, 'Specular IOR Level': .3})
b.inputs['Subsurface Radius'].default_value = (1., .5, .25)
ck.l(under, b.inputs['Base Color']); ck.l(rough, b.inputs['Roughness']); ck.l(nm.outputs[0], b.inputs['Normal'])
cookie.data.materials.append(ck.done(b.outputs[0]))

# ------------------------------------------------------------------ the black straw
SR, SLEN, STILT = .0034, .218, radians(5.5)
segs = 40
def tube():
    bm = bmesh.new(); rows = []
    for rr_ in (SR, SR - .00042):
        rows.append([[bm.verts.new((rr_ * cos(2 * pi * i / segs), rr_ * sin(2 * pi * i / segs), z)) for i in range(segs)] for z in (0., SLEN)])
    (ob, ot), (ib, it) = rows
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((ob[i], ob[j], ot[j], ot[i])); bm.faces.new((ib[j], ib[i], it[i], it[j]))
        bm.faces.new((ot[i], ot[j], it[j], it[i])); bm.faces.new((ob[j], ob[i], ib[i], ib[j]))
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > .1], cuts=8)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_mesh('straw', bm)
straw = obj('straw', tube(), prod)
stm = Mat('straw')
b = stm.bsdf(**{'Base Color': srgb('#0a0a0a'), 'Roughness': .3, 'Specular IOR Level': .15})
straw.data.materials.append(stm.done(b.outputs[0]))
# put it where the ice leaves room near the top
best, bxy = -1, (.012, -.008)
for a in np.linspace(0, 2 * pi, 36, endpoint=False):
    for rr_ in (.010, .014, .018):
        x, y = rr_ * cos(a), rr_ * sin(a)
        if y > .004: continue                                   # keep it on the camera side
        clear = min([sqrt((track[o.name][-1].translation.x - x) ** 2 + (track[o.name][-1].translation.y - y) ** 2)
                     for o in ices if track[o.name][-1].translation.z > FL - .03] or [1.])
        if clear > best: best, bxy = clear, (x, y)
print('[straw] at %.4f %.4f clearance %.4f' % (bxy[0], bxy[1], best))
STRAW_BASE = Vector((bxy[0], bxy[1], .0075))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=SR * 1.22, radius2=SR * 1.22, depth=SLEN)
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, SLEN / 2))
cutter = obj('straw_hole', bm_mesh('hole', bm, False), prod); cutter.hide_render = True; cutter.display_type = 'WIRE'
cutter.location = STRAW_BASE; cutter.rotation_euler = (0, STILT, 0)
hole = cookie.modifiers.new('hole', 'BOOLEAN'); hole.operation = 'DIFFERENCE'; hole.object = cutter; hole.solver = 'EXACT'

# ------------------------------------------------------------------ studio: a blush sweep (their wall is pink), soft light, long strips for the plastic
bm = bmesh.new(); prof = [(-2., 0.)] + [(.30 + .45 * sin(q), .45 * (1 - cos(q))) for q in np.linspace(0, pi / 2, 24)] + [(.75, 2.)]
rows = [[bm.verts.new((x, y, z)) for y, z in prof] for x in (-3., 3.)]
for i in range(len(prof) - 1): bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
sweep = obj('sweep', bm_mesh('sweep', bm))
sw = Mat('sweep')
b = sw.bsdf(**{'Base Color': srgb(os.environ.get('BNB_BG', '#c9c0b5')), 'Roughness': .92, 'Specular IOR Level': .2})
sweep.data.materials.append(sw.done(b.outputs[0]))
LIGHT = float(os.environ.get('BNB_LIGHT', '.85'))
WALLW = float(os.environ.get('BNB_WALL', '220'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    if os.environ.get('BNB_ONLY') and name not in os.environ['BNB_ONLY'].split(','): l.energy = 0
    return o
area('key', (.62, -.6, .42), (0, 0, .10), 1.0, 1.0, 230, (1, .97, .94), spread=radians(80))
area('fill', (-.7, -.7, .2), (0, 0, .09), 1.0, .7, 28, (.97, .98, 1), spread=radians(75))
# black flags just out of frame: they give the clear plastic its dark edges and keep pink spill off the sides
flag = Mat('flag'); FLAG = flag.done(flag.bsdf(**{'Base Color': (.004, .004, .004, 1), 'Roughness': .9, 'Specular IOR Level': .1}).outputs[0])
for sx_ in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    fo = obj('flag', bm_mesh('flag', bm, False)); fo.data.materials.append(FLAG)
    fo.scale = (1., .7, 1.); fo.location = (sx_ * .5, -.05, .25); fo.rotation_euler = (0, pi / 2, 0)
    fo.visible_camera = False
wl = area('wall', (0., .22, .02), (0, .9, .4), 1.4, .6, WALLW, (1, .97, .93)); wl.visible_glossy = False; wl.visible_transmission = False
# reflection cards: two tall emissive strips only reflections and refractions see (not lights, so the print and the straw stay clean)
card = Mat('card'); em = card.n('ShaderNodeEmission', Strength=float(os.environ.get('BNB_CARD', '260'))); CARD = card.done(em.outputs[0])
try: CARD.cycles.emission_sampling = 'NONE'
except Exception: pass
# low and close, so the camera still finds them in the plastic when it looks down at the lid
for nm_, loc_ in (('cardL', (-.15, -.33, .16)), ('cardR', (.165, -.32, .16))):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.026, .29, 1), verts=bm.verts)
    co = obj(nm_, bm_mesh(nm_, bm, False)); co.data.materials.append(CARD); co.location = loc_
    co.rotation_euler = (Vector((0, 0, loc_[2])) - Vector(loc_)).to_track_quat('Z', 'Y').to_euler()
    co.visible_camera = False; co.visible_diffuse = False; co.visible_shadow = False; co.visible_volume_scatter = False
# a black card on the floor in front of the set: the cup reflects it instead of the bright floor, which keeps the base clean
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.9, .7, 1), verts=bm.verts)
bc_ = obj('floorcard', bm_mesh('floorcard', bm, False)); bc_.data.materials.append(FLAG); bc_.location = (0, -.58, .0015)
bc_.visible_camera = False; bc_.visible_diffuse = False; bc_.visible_shadow = False; bc_.visible_transmission = False
area('rimL', (-.36, .36, .18), (0, 0, .10), .08, .6, 70, (1, .97, .95), spread=radians(60))
area('rimR', (.36, .34, .18), (0, 0, .10), .08, .6, 60, (1, .97, .95), spread=radians(60))
area('top', (.06, -.10, .62), (0, 0, .12), .45, .45, 8, (1, .98, .95), spread=radians(60))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .06 * LIGHT / .16
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera: low and level, then it rises to the lid at the end
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24.; cd.lens = 70.; cd.clip_start = .01
cd.dof.use_dof = True; cd.dof.aperture_fstop = 9.
cam = obj('cam', cd); scn.camera = cam

# ------------------------------------------------------------------ the film timeline
def state(t):
    prod.rotation_euler = (0, 0, radians(-34 + 34 * smoother(seg(t, .02, .96))))
    SAUCE_T.outputs[0].default_value = smoother(seg(t, .07, .22))
    sf = (t - .17) / (.47 - .17) * SIMN
    for o in ices:
        k = int(round(clamp(sf, 0, SIMN)))
        o.matrix_local = track[o.name][min(k, SIMN)]
    set_level(level_at(t))
    if MATCHA: SAUCE_T.outputs[0].default_value = 0.; sauce.hide_render = True
    NOW.outputs[0].default_value = t
    # cookie: falls from above, lands on the rim, settles
    p = seg(t, .68, .785); q = seg(t, .785, .845)
    cz = RIM_TOP + .30 * (1 - p * p) + .006 * sin(pi * q) * (1 - q) * (1 if p >= 1 else 0)
    cookie.location = (0, 0, cz)
    cookie.rotation_euler = (.05 * sin(3 * pi * q) * (1 - q) ** 2 * (p >= 1) + .018, -.012, radians(28) * (1 - smooth(p)))
    cookie.hide_render = p <= 0
    # straw: pushed down through the cookie
    s = smoother(seg(t, .83, .93))
    straw.location = STRAW_BASE + Vector((sin(STILT) * .32 * (1 - s), 0, .32 * (1 - s) * cos(STILT)))
    straw.rotation_euler = (0, STILT, 0)
    straw.hide_render = s <= 0
    hole.show_render = s > .55
    # camera: level product shot, then a slow rise to look down at the lid
    c = smoother(seg(t, .70, 1.))
    el = radians(5.5 + 8.5 * c); dist = .92 - .04 * c; tz = .108 + .006 * c
    cam.location = (0, -dist * cos(el), tz + dist * sin(el))
    cam.rotation_euler = (Vector((0, 0, tz)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (cam.location - Vector((0, -.045, .09 + .03 * c))).length
    if os.environ.get('BNB_STILL') == 'lid':           # landscape close-up for the page's photo grid
        cam.location = (.05, -.36, .25); cam.rotation_euler = (Vector((0, 0, .132)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cd.lens = 58.; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.dof.focus_distance = (cam.location - Vector((0, -.03, .155))).length; cd.dof.aperture_fstop = 5.6
    if os.environ.get('BNB_CAM') == 'cookie':          # look-dev close-up on the lid
        cam.location = (0, -.30, .30); cam.rotation_euler = (Vector((0, 0, .155)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cd.dof.focus_distance = (cam.location - Vector((0, 0, .16))).length

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = (1280, 960) if os.environ.get('BNB_STILL') else (864, 1080); r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(os.environ.get('BNB_ADAPT', '.016'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 10; cy.transparent_max_bounces = 16; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.sample_clamp_indirect = float(os.environ.get('BNB_CLAMP', '0')); cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 5
r.use_persistent_data = True
scn.view_settings.view_transform = os.environ.get('BNB_VT', 'Khronos PBR Neutral'); scn.view_settings.look = 'None'; scn.view_settings.exposure = float(os.environ.get('BNB_EV', '-3.85'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for f in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % f)
    if SEL == 'all' and os.path.exists(fp): continue
    state(f / (N - 1)); r.filepath = fp
    for nm_ in filter(None, os.environ.get('BNB_HIDE', '').split(',')):
        for o_ in bpy.data.objects:
            if o_.name.startswith(nm_): o_.hide_render = True; print('[hide]', o_.name)
    if os.environ.get('BNB_DEBUG'): print('[objs]', [(o_.name, o_.type, o_.hide_render, tuple(round(x, 3) for x in o_.matrix_world.translation)) for o_ in bpy.data.objects if o_.type in ('MESH', 'EMPTY')][:30])
    bpy.ops.render.render(write_still=True)
print('done')
