# Nino's Coffee Cart: the brown sugar shaken espresso film, in Nino's real cup.
# Their cup (photo from the owner): a clear 16 oz PET cold cup with a flat rolled lip, a stacking step ~21 mm under it,
# a straight taper to a banded foot, and a round silver sticker with their badge (tex/sticker.png, flattened off the photo).
# Beats: the empty cup turns to face you -> brown sugar syrup ribbons down the inside -> ice drops in ->
#        the shaken espresso pours in with its foam -> milk pours on top and blooms down through the espresso ->
#        the cup sweats and the camera rises to the foam.
# usage: bpe run cup.py -m final -- <out_dir> [frames=all|i,j,k] [n=72] [samples=96] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, sqrt, radians
from mathutils import Vector, Matrix
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 72
SAMPLES = int(argv[3]) if len(argv) > 3 else 96
SCALE = float(argv[4]) if len(argv) > 4 else 1.
E = os.environ.get
random.seed(7); rng = np.random.default_rng(7)


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
    def mixf(s, fac, a, b):
        m = s.n('ShaderNodeMix', data_type='FLOAT'); s.v(m.inputs['Factor'], fac); s.v(m.inputs[2], a); s.v(m.inputs[3], b)
        return m.outputs[0]
    def noise(s, vec, scale, detail=2., rough=.5, dist=0., w=None):
        x = s.n('ShaderNodeTexNoise', noise_dimensions='4D' if w is not None else '3D', Scale=scale, Detail=detail, Roughness=rough, Distortion=dist)
        s.l(vec, x.inputs['Vector'])
        if w is not None: s.v(x.inputs['W'], w)
        return x.outputs['Fac']
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


# ------------------------------------------------------------------ dimensions (metres): Nino's 16 oz PET cold cup
H = .140                     # lip height
WALL = .00052
ZF = .0095                   # top of the banded foot
RF0, RF1 = .0284, .0297      # foot radius at the floor and at the band
ZS = H - .021                # the stacking step
RB = .0301                   # body just above the foot band
RS0, RS1 = .0413, .0430      # under / over the step
RL = .0465                   # wall just under the lip
def r_side(z):
    if z < ZF: return RF0 + (RF1 - RF0) * smooth(z / ZF)
    if z < ZF + .0012: return RF1 + (RB - RF1) * smooth((z - ZF) / .0012)        # the little shelf at the top of the foot band
    if z < ZS: return RB + (RS0 - RB) * (z - ZF - .0012) / (ZS - ZF - .0012)
    if z < ZS + .0016: return RS0 + (RS1 - RS0) * smooth((z - ZS) / .0016)
    return RS1 + (RL - RS1) * ((z - ZS - .0016) / (H - ZS - .0016)) ** 1.15
def r_in(z): return r_side(z) - WALL
FL = H - .0255               # fill line: under the step
ZBOT = .0028                 # the floor sits up in the foot

prod = obj('product', None)  # cup + everything in it turns on this
prod.empty_display_size = .05

# ------------------------------------------------------------------ the cup
prof = [(0., ZBOT + .0007), (.012, ZBOT + .0006), (.02, ZBOT + .0003), (RF0 - .0035, ZBOT - .0004), (RF0 - .0016, .0009), (RF0 - .0006, .0001), (RF0, .0003)]
zs_ = sorted(set([.0003 + (ZF - .0003) * i / 12 for i in range(13)] + [ZF + .0012 * i / 6 for i in range(7)] +
                 [ZF + .0012 + (ZS - ZF - .0012) * i / 70 for i in range(71)] + [ZS + .0016 * i / 8 for i in range(9)] +
                 [ZS + .0016 + (H - ZS - .0016) * i / 16 for i in range(17)]))
prof += [(r_side(z), z) for z in zs_ if z > .0003]
cup = lathe('cup', prof, steps=224, parent=prod)
so = cup.modifiers.new('wall', 'SOLIDIFY'); so.thickness = WALL; so.offset = -1; so.use_even_offset = True

pet = Mat('pet')
tcp = pet.n('ShaderNodeTexCoord')
nz = pet.noise(tcp.outputs['Object'], 90., 3.)
nzz = pet.noise(tcp.outputs['Object'], 7., 2.)                  # long, faint moulding waves in the wall
pr = pet.mrange(nz, .3, .7, .002, .012)
b = pet.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.57, 'Specular IOR Level': .5})
pet.l(pr, b.inputs['Roughness'])
pbm = pet.n('ShaderNodeBump', Strength=.04, Distance=.001); pet.l(nzz, pbm.inputs['Height']); pet.l(pbm.outputs[0], b.inputs['Normal'])
PET = pet.done(pet.clear_shadow(b.outputs[0], keep=.06))
cup.data.materials.append(PET)

# the rolled lip: a flattened torus that sits out past the wall, like their cup's flange
def lip():
    bm = bmesh.new(); nu, nv = 224, 22; rows = []
    R0 = RL + .0009; ra, rb = .0021, .0010                   # flat and wide
    for i in range(nu):
        a = 2 * pi * i / nu
        row = []
        for j in range(nv):
            q = 2 * pi * j / nv
            rr = R0 + ra * cos(q); zz = H + rb * sin(q)
            row.append(bm.verts.new((rr * cos(a), rr * sin(a), zz)))
        rows.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((rows[i][j], rows[(i + 1) % nu][j], rows[(i + 1) % nu][(j + 1) % nv], rows[i][(j + 1) % nv]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj('lip', bm_mesh('lip', bm), prod)
rim = lip(); rim.data.materials.append(PET)
RIM_TOP = H + .0010

# ------------------------------------------------------------------ the round silver sticker (their badge), wrapped on the taper
D = .056; ZL = .062; AL = -pi / 2                     # diameter, centre height, facing -Y (the camera)
def wall_point(s, v):
    """s: arc length round the wall from the sticker centre, v: distance up the slant from the centre."""
    tilt = math.atan((RS0 - RB) / (ZS - ZF)); z = ZL + v * cos(tilt); rr = r_side(z) + .00015
    return Vector((rr * cos(AL + s / rr), rr * sin(AL + s / rr), z))
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); NS = 72; grid = []
for i in range(NS + 1):
    grid.append([bm.verts.new(wall_point((i / NS - .5) * D, (j / NS - .5) * D)) for j in range(NS + 1)])
for i in range(NS):
    for j in range(NS):
        f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for lp, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): lp[uvl].uv = (u / NS, v / NS)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.faces.ensure_lookup_table()
if bm.faces[NS * NS // 2].normal.y > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
sticker = obj('sticker', bm_mesh('sticker', bm), prod)
st = Mat('sticker')
tx = st.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/sticker.png')); tx.image.colorspace_settings.name = 'Non-Color'
ink = st.mrange(tx.outputs['Color'], .25, .75)
tcs = st.n('ShaderNodeTexCoord'); grain = st.noise(tcs.outputs['Object'], 2600., 1.)
silver = st.mix(st.mrange(grain, .3, .7), srgb(E('NC_SILVER', '#d8dbe1')), srgb('#e4e6ea'))
cc = st.mix(ink, silver, srgb('#121318'))
b = st.bsdf(**{'Specular IOR Level': .5, 'Coat Weight': .0})
st.l(cc, b.inputs['Base Color'])
st.l(st.mixf(ink, float(E('NC_MET', '.3')), 0.), b.inputs['Metallic'])                 # metallic silver paper, flat black ink
st.l(st.mixf(ink, .42, .5), b.inputs['Roughness'])
st.l(tx.outputs['Alpha'], b.inputs['Alpha'])
sbm = st.n('ShaderNodeBump', Strength=.12, Distance=.0002); st.l(grain, sbm.inputs['Height']); st.l(sbm.outputs[0], b.inputs['Normal'])
sticker.data.materials.append(st.done(b.outputs[0]))

# ------------------------------------------------------------------ brown sugar syrup ribboned down the inside of the wall
sp = [(r_in(z) - .00016, z) for z in (.010 + (FL - .002 - .010) * i / 70 for i in range(71))]
sauce = lathe('syrup', sp, parent=prod)
sm = Mat('syrup')
tc = sm.n('ShaderNodeTexCoord'); sx = sm.n('ShaderNodeSeparateXYZ'); sm.l(tc.outputs['Object'], sx.inputs[0])
ang = sm.math('ARCTAN2', sx.outputs['Y'], sx.outputs['X'])
wob = sm.noise(tc.outputs['Object'], 55., 3.)
fine = sm.noise(tc.outputs['Object'], 300., 2.)
mpc = sm.n('ShaderNodeMapping'); mpc.inputs['Scale'].default_value = (1., 1., 0.); sm.l(tc.outputs['Object'], mpc.inputs['Vector'])
col1 = sm.noise(mpc.outputs[0], 210., 1.); col2 = sm.noise(mpc.outputs[0], 90., 1.)
SYR_T = sm.n('ShaderNodeValue', name='T'); SYR_T.outputs[0].default_value = 1.
an = sm.math('MULTIPLY_ADD', ang, 1 / (2 * pi), .5)
LINES = [(.90, 4, .3, .008), (.70, 5, 2.1, .010), (.50, 4, 4.0, .010)]
mask = None
for i, (h, m, ph, A) in enumerate(LINES):
    zl = sm.math('ADD', sm.math('MULTIPLY_ADD', sm.math('SINE', sm.math('MULTIPLY_ADD', ang, float(m), ph)), A, h * FL),
                 sm.math('MULTIPLY_ADD', wob, .006, -.003))
    dz = sm.math('SUBTRACT', sx.outputs['Z'], zl)
    w = sm.math('MULTIPLY_ADD', fine, .0008, .00045)
    line = sm.math('SUBTRACT', 1., sm.mrange(sm.math('DIVIDE', sm.math('ABSOLUTE', dz), w), .55, 1.))
    colv = sm.mrange(col1, .58, .68)
    dl = sm.math('MULTIPLY', sm.math('MULTIPLY', col2, .045), sm.mrange(SYR_T.outputs[0], .5, 1.))
    drip = sm.math('MULTIPLY', colv, sm.math('MULTIPLY', sm.mrange(dz, .0005, -.0005), sm.mrange(sm.math('ADD', dz, dl), -.0015, .0015)))
    drawn = sm.mrange(sm.math('SUBTRACT', sm.math('MULTIPLY_ADD', SYR_T.outputs[0], 1.7, -i * .22), an), -.02, .02)
    li = sm.math('MULTIPLY', sm.math('MAXIMUM', line, drip), drawn)
    mask = li if mask is None else sm.math('MAXIMUM', mask, li)
bmp = sm.n('ShaderNodeBump', Strength=.5, Distance=.0005); sm.l(mask, bmp.inputs['Height'])
sc = sm.mix(sm.mrange(fine, .35, .7), srgb('#7c3a10'), srgb('#b0662a'))       # dark molasses brown sugar syrup
b = sm.bsdf(Roughness=.08, **{'Subsurface Weight': .45, 'Subsurface Scale': .002, 'IOR': 1.47, 'Coat Weight': .6, 'Coat Roughness': .03})
b.inputs['Subsurface Radius'].default_value = (1., .45, .2)
sm.l(sc, b.inputs['Base Color']); sm.l(bmp.outputs[0], b.inputs['Normal'])
SYRUP = sm.done(sm.fade(b.outputs[0], mask))
sauce.data.materials.append(SYRUP)

# ------------------------------------------------------------------ ice: a real rigid body drop into the cup
icm = Mat('ice')
tci = icm.n('ShaderNodeTexCoord'); inz = icm.noise(tci.outputs['Object'], 160., 3.)
bump = icm.n('ShaderNodeBump', Strength=.25, Distance=.0004); icm.l(inz, bump.inputs['Height'])
cloud = icm.noise(tci.outputs['Object'], 3.5, 2.)
b = icm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.31})
icm.l(icm.mrange(cloud, .45, .7, .03, .14), b.inputs['Roughness'])          # frosty patches, clear centres
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
ZB_IN = ZBOT + .0007 + WALL; ZTOP = H + .05; NST = 36
tilt = math.atan((RS0 - RB) / (ZS - ZF))
for k in range(NST):
    a = 2 * pi * k / NST; L_ = (ZTOP - ZB_IN) / cos(tilt); zm = (ZTOP + ZB_IN) / 2
    rzm = RB + (RS0 - RB) * (zm - ZF) / (ZS - ZF) - WALL
    st_ = box_obj('stave%02d' % k, .006, 2 * pi * rzm / NST * 1.2, L_)
    st_.rotation_euler = (0, tilt, a)
    st_.location = ((rzm + .003 / cos(tilt)) * cos(a), (rzm + .003 / cos(tilt)) * sin(a), zm)
    add_rb(st_, 'PASSIVE', 'BOX', collision_margin=.0002, friction=.35, restitution=.12); colliders.append(st_)
disc = box_obj('floor', .14, .14, .05); disc.location = (0, 0, ZB_IN - .025)
add_rb(disc, 'PASSIVE', 'BOX', collision_margin=.0002, friction=.4, restitution=.1); colliders.append(disc)
rbw.substeps_per_frame = 100; rbw.solver_iterations = 80
SIMN = 50
ices = []
NICE = int(E('NC_NICE', '17'))
for i in range(NICE):
    o = obj('ice%02d' % i, ice_me); s = random.uniform(.0205, .0235)
    o.scale = (s, s * random.uniform(.9, 1.0), s * random.uniform(.86, .97))
    a = random.uniform(0, 2 * pi); rr = random.uniform(0, .010)
    o.location = (rr * cos(a), rr * sin(a), .29 + .038 * i)
    o.rotation_euler = (random.uniform(0, pi), random.uniform(0, pi), random.uniform(0, pi))
    add_rb(o, 'ACTIVE', 'BOX', mass=.012, friction=.3, restitution=.12, collision_margin=.0003, linear_damping=.04, angular_damping=.2)
    ices.append(o)
track = {o.name: [] for o in ices}
for f in range(1, SIMN + 2):
    scn.frame_set(f)
    for o in ices: track[o.name].append(o.matrix_world.copy())
keep = []
for o in ices:
    m = track[o.name][-1]; p = m.translation
    top = max((m @ Vector(c)).z for c in ((x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)))
    ok = sqrt(p.x ** 2 + p.y ** 2) < r_in(max(p.z, 0)) and 0 < p.z and top < H - .004
    print('[ice] %s end z=%.4f r=%.4f top=%.4f %s' % (o.name, p.z, sqrt(p.x ** 2 + p.y ** 2), top, 'ok' if ok else 'DROP'))
    if ok: keep.append(o)
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
print('[ice] kept %d' % len(ices))
# final pose of each cube as (inverse matrix, half extents) for the ice-against-the-wall map on the coffee
ICE_BOX = []
for o in ices:
    m = track[o.name][-1]
    lo_, ro_, sc_ = m.decompose(); mr = Matrix.LocRotScale(lo_, ro_, None); ICE_BOX.append((np.array(mr.inverted()), np.array(sc_) * .5))

# ------------------------------------------------------------------ the drink: shaken espresso with foam, then milk blooming down through it
GAP = .0005
def liquid_points(L):
    zb, rr = ZBOT + .0007 + WALL + .0003, .0050
    rw = lambda z: r_in(z) - GAP
    zc = zb + rr; rwc = rw(zc)
    pts = [(0., zb)] + [((rwc - rr) * k / 6, zb) for k in range(1, 7)]
    for k in range(1, 9):
        q = k / 8 * pi / 2; z = zc - rr * cos(q)
        if z >= L - .0003: break
        pts.append((rwc - rr + rr * sin(q), z))
    if L <= zc + .002:
        q = math.acos(clamp((zc - L) / rr, -1, 1)); pts.append((rwc - rr + rr * sin(q), L))
    else:
        n = max(2, int((L - zc) / .0009))
        pts += [(rw(z), z) for z in (zc + (L - .0012 - zc) * i / n for i in range(1, n + 1))]
        pts += [(rw(L) - .0004, L + .0006), (rw(L) - .0022, L + .0001), (rw(L) - .006, L)]
    pts += [(rw(L) * k / 10, L) for k in range(9, 0, -1)]
    pts.append((0., L))
    return pts

lq = Mat('drink')
tc = lq.n('ShaderNodeTexCoord'); lx = lq.n('ShaderNodeSeparateXYZ'); lq.l(tc.outputs['Object'], lx.inputs[0])
DT = lq.n('ShaderNodeValue', name='T'); DT.outputs[0].default_value = 1.          # film time
MF = lq.n('ShaderNodeValue', name='front'); MF.outputs[0].default_value = 1.2      # how far down the milk has reached (in fill heights)
MS = lq.n('ShaderNodeValue', name='milk'); MS.outputs[0].default_value = 0.        # how much milk is in
LV = lq.n('ShaderNodeValue', name='level'); LV.outputs[0].default_value = FL       # current surface height
pos = tc.outputs['Object']
hz = lq.math('DIVIDE', lx.outputs['Z'], FL)
w4 = lq.math('MULTIPLY', DT.outputs[0], 2.2)
big = lq.noise(pos, 24., 4., .55, 1.6, w4)                   # slow, rolling clouds
mid = lq.noise(pos, 62., 3., .6, .8, lq.math('MULTIPLY', DT.outputs[0], 3.1))
hd = lq.math('ADD', hz, lq.math('ADD', lq.math('MULTIPLY_ADD', big, .55, -.275), lq.math('MULTIPLY_ADD', mid, .16, -.08)))
milk = lq.math('MULTIPLY', lq.mrange(hd, lq.math('SUBTRACT', MF.outputs[0], .06), lq.math('ADD', MF.outputs[0], .14)), MS.outputs[0])
# thin bright ribbons where the milk is rolling into the espresso
rib = lq.math('MULTIPLY', lq.mrange(lq.math('ABSOLUTE', lq.math('SUBTRACT', mid, .5)), .05, .012), lq.math('MULTIPLY', milk, lq.math('SUBTRACT', 1., milk)))
rib = lq.math('MULTIPLY', rib, 3.2)
grad = lq.mrange(hz, .0, .9)                                  # espresso settles darker at the bottom
esp = lq.mix(grad, srgb('#2a1408'), srgb('#5a2f12'))
esp = lq.mix(lq.math('MULTIPLY', lq.mrange(big, .35, .75), .5), esp, srgb('#6e3a17'))
latte = lq.mix(lq.mrange(mid, .3, .7), srgb('#b07c4f'), srgb('#d8b48c'))
latte = lq.mix(lq.mrange(big, .4, .72), latte, srgb('#e3cdb0'))                 # creamy folds
vein = lq.mrange(lq.math('ABSOLUTE', lq.math('SUBTRACT', big, .5)), .035, .008)   # thin espresso veins left in the milk
latte = lq.mix(lq.math('MULTIPLY', vein, .55), latte, srgb('#7a4520'))
body = lq.mix(milk, esp, latte)
body = lq.mix(lq.math('MINIMUM', rib, .7), body, srgb('#e6d3b8'))
# the foam cap: shaken espresso foam, a creamy tan that goes paler once the milk is in
foam_h = lq.math('SUBTRACT', LV.outputs[0], lq.math('MULTIPLY_ADD', big, .003, .0085))
foamf = lq.mrange(lx.outputs['Z'], foam_h, lq.math('ADD', foam_h, .0016))
fcol = lq.mix(MS.outputs[0], lq.mix(lq.mrange(mid, .3, .7), srgb('#a26f40'), srgb('#bf8d5c')), lq.mix(lq.mrange(mid, .3, .7), srgb('#cfae86'), srgb('#e2c9a6')))
cc = lq.mix(foamf, body, fcol)
# ice pressed against the wall shows through the coffee as paler, glassier patches
ia = lq.n('ShaderNodeAttribute', attribute_name='ice')
icef = lq.math('MULTIPLY', ia.outputs['Fac'], lq.math('SUBTRACT', 1., lq.math('MULTIPLY', foamf, .7)))
icecol = lq.n('ShaderNodeMix', data_type='RGBA', blend_type='SCREEN'); icecol.inputs['Factor'].default_value = .45; lq.l(cc, icecol.inputs[6]); icecol.inputs[7].default_value = srgb('#d9c4ae')
cc = lq.mix(icef, cc, icecol.outputs[2])
bub = lq.n('ShaderNodeTexVoronoi', Scale=900.); lq.l(pos, bub.inputs['Vector'])
bub2 = lq.n('ShaderNodeTexVoronoi', Scale=420.); lq.l(pos, bub2.inputs['Vector'])
bh = lq.math('ADD', bub.outputs['Distance'], lq.math('MULTIPLY', bub2.outputs['Distance'], .6))
lbmp = lq.n('ShaderNodeBump', Distance=.00025); lq.l(bh, lbmp.inputs['Height']); lq.l(lq.math('MULTIPLY', foamf, .8), lbmp.inputs['Strength'])
b = lq.bsdf(IOR=1.34, **{'Subsurface Weight': .4, 'Subsurface Scale': .0035, 'Coat Weight': .0, 'Specular IOR Level': .5})
b.inputs['Subsurface Radius'].default_value = (1., .5, .25)
lq.l(cc, b.inputs['Base Color'])
rgh = lq.mixf(foamf, lq.mixf(icef, .14, .05), .55)
lq.l(rgh, b.inputs['Roughness']); lq.l(lbmp.outputs[0], b.inputs['Normal'])
DRINK = lq.done(b.outputs[0])
liq = obj('drink', bpy.data.meshes.new('drink0'), prod)

def box_sdf(P):
    """distance from points P (n,3) to the nearest settled ice cube (rounded box)."""
    d = np.full(len(P), 1.)
    Ph = np.c_[P, np.ones(len(P))]
    for Minv, he in ICE_BOX:
        q = (Ph @ Minv.T)[:, :3]                           # metres, in the cube's frame
        rr_ = he.min() * .3
        qq = np.abs(q) - (he - rr_)
        dd = np.linalg.norm(np.maximum(qq, 0), axis=1) + np.minimum(qq.max(1), 0) - rr_
        d = np.minimum(d, dd)
    return d

def set_level(L):
    old = liq.data
    if L < .0035:
        liq.hide_render = True; return
    liq.hide_render = False
    bm = bmesh.new(); pts = liquid_points(L); vs = [bm.verts.new((r, 0, z)) for r, z in pts]
    for a, b_ in zip(vs, vs[1:]): bm.edges.new((a, b_))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=256, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bm_mesh('drink', bm); me.materials.append(DRINK)
    P = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', P); P = P.reshape(-1, 3)
    d = box_sdf(P)
    v = np.clip((.0026 - d) / .0024, 0, 1); v = v * v * (3 - 2 * v)
    v *= (np.sqrt(P[:, 0] ** 2 + P[:, 1] ** 2) > .012)          # only on the side wall, not the middle of the surface
    at = me.attributes.new('ice', 'FLOAT', 'POINT'); at.data.foreach_set('value', v.astype(np.float32))
    liq.data = me
    if old and old.users == 0: bpy.data.meshes.remove(old)

# ------------------------------------------------------------------ the pour streams (shaken espresso, then milk)
def stream_mat(name, c0, c1, sss):
    m = Mat(name); t = m.n('ShaderNodeTexCoord'); n_ = m.noise(t.outputs['Object'], 140., 2.)
    b = m.bsdf(IOR=1.34, Roughness=.05, **{'Subsurface Weight': sss, 'Subsurface Scale': .003, 'Coat Weight': .3, 'Coat Roughness': .02})
    b.inputs['Subsurface Radius'].default_value = (1., .55, .3)
    m.l(m.mix(m.mrange(n_, .3, .7), srgb(c0), srgb(c1)), b.inputs['Base Color'])
    return m.done(b.outputs[0])
ESPM = stream_mat('espstream', '#3a1c0a', '#6a3814', .35)
MILKM = stream_mat('milkstream', '#ece4d6', '#f5f0e6', .6)
SX, SY = .009, .010                                           # where the stream lands (back right of centre)
def stream_mesh(zlo, zhi, r0, ph, name):
    bm = bmesh.new(); segs = 28; nz_ = 60; rows = []
    for k in range(nz_ + 1):
        z = zlo + (zhi - zlo) * k / nz_; u = (z - zlo) / max(zhi - zlo, 1e-4)
        rr = r0 * (.72 + .5 * u) * (1 + .06 * sin(z * 260 + ph * 3))      # thinner where it's fallen furthest
        ox = .0009 * sin(z * 70 + ph) + .0004 * sin(z * 190 - ph * 2); oy = .0006 * cos(z * 55 + ph * 1.3)
        rows.append([bm.verts.new((SX + ox + rr * cos(2 * pi * i / segs) + .06 * (z - zlo), SY + oy + rr * sin(2 * pi * i / segs), z)) for i in range(segs)])
    for k in range(nz_):
        for i in range(segs):
            j = (i + 1) % segs; bm.faces.new((rows[k][i], rows[k][j], rows[k + 1][j], rows[k + 1][i]))
    tip = bm.verts.new((SX, SY, zlo - r0 * .6));
    for i in range(segs): bm.faces.new((rows[0][(i + 1) % segs], rows[0][i], tip))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_mesh(name, bm)
stream = obj('stream', bpy.data.meshes.new('s0'), prod); stream.hide_render = True

# ------------------------------------------------------------------ condensation: droplets bead up below the fill line, off the sticker
T_ESP0, T_ESP1, T_MILK0, T_MILK1 = .43, .60, .63, .80
def level_at(t):
    return FL * (.80 * smoother(seg(t, T_ESP0, T_ESP1)) + .20 * smoother(seg(t, T_MILK0, T_MILK1 - .04)))
def t_reach(z):
    for k in range(600):
        t = T_ESP0 + (T_MILK1 - T_ESP0) * k / 599
        if level_at(t) >= z: return t
    return T_MILK1
dm = Mat('drops')
at = dm.n('ShaderNodeAttribute', attribute_name='appear'); NOW = dm.n('ShaderNodeValue', name='T'); NOW.outputs[0].default_value = 1.
vis = dm.mrange(dm.math('SUBTRACT', NOW.outputs[0], at.outputs['Fac']), 0., .03)
b = dm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.333, 'Roughness': .0})
DROPS = dm.done(dm.fade(dm.clear_shadow(b.outputs[0], keep=.1), vis))
bm = bmesh.new(); appear = []
tmpl = bmesh.new(); bmesh.ops.create_uvsphere(tmpl, u_segments=14, v_segments=8, radius=1.)
tv = [v.co.copy() for v in tmpl.verts]; tf = [[v.index for v in f.verts] for f in tmpl.faces]; tmpl.free()
ND = int(E('NC_DROPS', '520')); k = 0
while k < ND:
    z = random.uniform(ZF + .004, FL - .004)
    a = random.uniform(0, 2 * pi)
    # keep the badge clean: no beads on the sticker
    da = (a - AL + pi) % (2 * pi) - pi
    if (da * r_side(z)) ** 2 + (z - ZL) ** 2 < (D / 2 + .0015) ** 2: continue
    k += 1
    r0 = (.00035 + .00110 * random.random() ** 2.4)
    bigd = random.random() < .03
    if bigd: r0 = random.uniform(.0013, .0018)
    rz = r_side(z) + .00002
    n = Vector((cos(a), sin(a), -(RS0 - RB) / (ZS - ZF))).normalized(); tu = Vector((-sin(a), cos(a), 0)); tdn = n.cross(tu).normalized()
    if tdn.z > 0: tdn = -tdn
    base = Vector((rz * cos(a), rz * sin(a), z)) - n * .00012
    el = random.uniform(1.6, 2.6) if bigd else random.uniform(.92, 1.1)
    ap = t_reach(z) + random.uniform(.04, .2)
    vs = []
    for c in tv:
        cz = max(c.z, 0.)
        p = base + tu * c.x * r0 + tdn * c.y * r0 * el + n * cz * r0 * .78
        if bigd: p += tdn * r0 * (el - 1) * .5
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

# ------------------------------------------------------------------ studio: the page's cream sweep, soft light, long strips for the plastic
bm = bmesh.new(); prof = [(-2., 0.)] + [(.30 + .45 * sin(q), .45 * (1 - cos(q))) for q in np.linspace(0, pi / 2, 24)] + [(.75, 2.)]
rows = [[bm.verts.new((x, y, z)) for y, z in prof] for x in (-3., 3.)]
for i in range(len(prof) - 1): bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
sweep = obj('sweep', bm_mesh('sweep', bm))
sw = Mat('sweep')
b = sw.bsdf(**{'Base Color': srgb(E('BNB_BG', '#c9c0b5')), 'Roughness': .92, 'Specular IOR Level': .2})
sweep.data.materials.append(sw.done(b.outputs[0]))
LIGHT = float(E('BNB_LIGHT', '.85'))
WALLW = float(E('BNB_WALL', '220'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    return o
area('key', (.62, -.6, .42), (0, 0, .10), 1.0, 1.0, 230, (1, .97, .94), spread=radians(80))
area('fill', (-.7, -.7, .2), (0, 0, .09), 1.0, .7, 28, (.97, .98, 1), spread=radians(75))
flag = Mat('flag'); FLAG = flag.done(flag.bsdf(**{'Base Color': (.004, .004, .004, 1), 'Roughness': .9, 'Specular IOR Level': .1}).outputs[0])
for sx_ in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    fo = obj('flag', bm_mesh('flag', bm, False)); fo.data.materials.append(FLAG)
    fo.scale = (1., .7, 1.); fo.location = (sx_ * .5, -.05, .25); fo.rotation_euler = (0, pi / 2, 0)
    fo.visible_camera = False
wl = area('wall', (0., .22, .02), (0, .9, .4), 1.4, .6, WALLW, (1, .97, .93)); wl.visible_glossy = False; wl.visible_transmission = False
card = Mat('card'); em = card.n('ShaderNodeEmission', Strength=float(E('BNB_CARD', '260'))); CARD = card.done(em.outputs[0])
try: CARD.cycles.emission_sampling = 'NONE'
except Exception: pass
for nm_, loc_ in (('cardL', (-.15, -.33, .15)), ('cardR', (.165, -.32, .15))):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.026, .29, 1), verts=bm.verts)
    co = obj(nm_, bm_mesh(nm_, bm, False)); co.data.materials.append(CARD); co.location = loc_
    co.rotation_euler = (Vector((0, 0, loc_[2])) - Vector(loc_)).to_track_quat('Z', 'Y').to_euler()
    co.visible_camera = False; co.visible_diffuse = False; co.visible_shadow = False; co.visible_volume_scatter = False
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.9, .7, 1), verts=bm.verts)
bc_ = obj('floorcard', bm_mesh('floorcard', bm, False)); bc_.data.materials.append(FLAG); bc_.location = (0, -.58, .0015)
bc_.visible_camera = False; bc_.visible_diffuse = False; bc_.visible_shadow = False; bc_.visible_transmission = False
area('rimL', (-.36, .36, .18), (0, 0, .10), .08, .6, 70, (1, .97, .95), spread=radians(60))
area('rimR', (.36, .34, .18), (0, 0, .10), .08, .6, 60, (1, .97, .95), spread=radians(60))
area('top', (.06, -.10, .62), (0, 0, .12), .45, .45, float(E('NC_TOP', '14')), (1, .98, .95), spread=radians(60))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .06 * LIGHT / .16
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24.; cd.lens = 70.; cd.clip_start = .01
cd.dof.use_dof = True; cd.dof.aperture_fstop = 9.
cam = obj('cam', cd); scn.camera = cam

# ------------------------------------------------------------------ the film timeline
def state(t):
    prod.rotation_euler = (0, 0, radians(-38 + 38 * smoother(seg(t, .0, .42))))     # the badge turns to face you while it fills with ice
    SYR_T.outputs[0].default_value = smoother(seg(t, .07, .22))
    sf = (t - .20) / (.40 - .20) * SIMN
    for o in ices:
        k = int(round(clamp(sf, 0, SIMN)))
        o.matrix_local = track[o.name][min(k, SIMN)]
    L = level_at(t); set_level(L); LV.outputs[0].default_value = L
    DT.outputs[0].default_value = t
    # milk: arrives at the top, rolls down through the espresso, then keeps drifting a little lower
    m = seg(t, T_MILK0, T_MILK1)
    MS.outputs[0].default_value = smooth(seg(t, T_MILK0, T_MILK0 + .05))
    MF.outputs[0].default_value = 1.05 - .62 * smoother(m) - .12 * seg(t, T_MILK1, 1.)
    NOW.outputs[0].default_value = t
    # the pour streams
    old = stream.data
    if T_ESP0 - .01 < t < T_ESP1 - .005 or T_MILK0 - .01 < t < T_MILK1 - .03:
        espp = t < T_ESP1
        a, b_ = (T_ESP0 - .01, T_ESP1 - .005) if espp else (T_MILK0 - .01, T_MILK1 - .03)
        u = seg(t, a, b_)
        zhi = .42 - (.42 - L) * smooth(seg(u, .82, 1.)) * 1.        # the tail leaves from the top at the end
        zlo = max(L - .002, ZB_IN) if u > .06 else .42 - (.42 - max(L - .002, ZB_IN)) * smooth(u / .06)
        r0 = (.0021 if espp else .0026) * (1 - .4 * smooth(seg(u, .7, 1.)))
        me = stream_mesh(zlo, max(zhi, zlo + .002), r0, t * 40, 'stream'); me.materials.append(ESPM if espp else MILKM)
        stream.data = me; stream.hide_render = False
        if old and old.users == 0: bpy.data.meshes.remove(old)
    else:
        stream.hide_render = True
    # camera: level product shot, then a slow rise to look into the foam
    c = smoother(seg(t, .74, 1.))
    el = radians(5.0 + 10.0 * c); dist = .86 - .05 * c; tz = .098 + .006 * c
    cam.location = (0, -dist * cos(el), tz + dist * sin(el))
    cam.rotation_euler = (Vector((0, 0, tz)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (cam.location - Vector((0, -.04, .08 + .03 * c))).length
    if E('NC_CAM') == 'top':                    # look-dev close-up on the foam
        cam.location = (0, -.26, .30); cam.rotation_euler = (Vector((0, 0, .11)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cd.dof.focus_distance = (cam.location - Vector((0, 0, .115))).length
    if E('NC_CAM') == 'sticker':                # look-dev close-up on the badge
        cam.location = (0, -.30, ZL + .01); cam.rotation_euler = (Vector((0, 0, ZL)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cd.dof.focus_distance = .28

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = (864, 1080); r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(E('BNB_ADAPT', '.016'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 10; cy.transparent_max_bounces = 16; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.sample_clamp_indirect = float(E('BNB_CLAMP', '0')); cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 5
r.use_persistent_data = True
scn.view_settings.view_transform = E('BNB_VT', 'Khronos PBR Neutral'); scn.view_settings.look = 'None'; scn.view_settings.exposure = float(E('BNB_EV', '-3.85'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for f in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % f)
    if SEL == 'all' and os.path.exists(fp): continue
    state(f / (N - 1)); r.filepath = fp
    for nm_ in filter(None, E('BNB_HIDE', '').split(',')):
        for o_ in bpy.data.objects:
            if o_.name.startswith(nm_): o_.hide_render = True
    bpy.ops.render.render(write_still=True)
print('done')
