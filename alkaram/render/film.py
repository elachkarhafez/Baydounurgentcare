# Al Karam Meat & Bakery (Dearborn Heights): a za'atar manousheh baking in their brick oven, like their reels.
# Real geometry where the eye lands: the hand-pinched rope edge, a puffed dough top, a za'atar-and-oil layer with
# a few thousand modelled sesame seeds, glowing embers at the back of the oven.
# Beats: the oven mouth glowing in the dark, the raw manousheh on the stone -> the camera goes in and it bakes ->
#        macro across the za'atar and sesame -> the wooden peel slides under and brings it out to the front.
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
rng = np.random.default_rng(9); random.seed(9)
ENV = lambda k, d: os.environ.get('AK_' + k, d)


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
    def tex(s, path, vec, cs='Non-Color', box=False):
        t = s.n('ShaderNodeTexImage', interpolation='Cubic'); t.image = bpy.data.images.load(asset(path)); t.image.colorspace_settings.name = cs
        if box: t.projection = 'BOX'; t.projection_blend = .25
        s.l(vec, t.inputs[0]); return t

BAKE = None   # value nodes driven per frame (filled in below)

# ------------------------------------------------------------------ the manousheh (metres): 28 cm round, thin hand-stretched rim
MR = .14
pie = obj('pie', None)
NA, NRr = 360, 90
th = np.linspace(0, 2 * pi, NA, endpoint=False)
rr = np.r_[np.linspace(0, .88, 70), .88 + .12 * np.sin(np.linspace(0, pi / 2, NRr - 70 + 1))[1:]]
# low puffs in the dough, a raised rope edge with a pinch every ~2.2 cm
def surf(rn, a, puff):
    x, y = rn * MR * np.cos(a), rn * MR * np.sin(a)
    n1 = .0018 * np.sin(x * 61 + 1.3) * np.sin(y * 57 - .4) + .0012 * np.sin(x * 140 + y * 37) * np.cos(y * 121 - x * 18)
    bub = np.clip(np.sin(x * 33 + 2.1) * np.sin(y * 29 + .7) - .6, 0, None) * .008     # a few bubbles that rise as it bakes
    rim = np.clip((rn - .88) / .12, 0, 1)
    wob = .5 + .5 * np.sin(a * 5 + 1.1) * np.sin(a * 3 - .4)                              # hand-stretched: the rim isn't even
    rope = np.sin(np.clip(rim, 0, 1) * pi) ** .7 * (.0034 + .0022 * wob)
    edge = -np.clip((rn - .97) / .03, 0, 1) ** 2 * .004
    lump = .0007 * np.sin(x * 260 + np.sin(y * 90) * 2) * np.sin(y * 240 + 1.7) + .0005 * np.sin(a * 23 + rn * 40)
    return x, y, .005 + n1 * (1 - rim) * .7 + bub * puff * (1 - rim) + rope * (.8 + .2 * puff) + edge + lump * rim
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); grid = []
for rn in rr:
    row = []
    for a in th:
        x, y, z = surf(rn, a, 1.)
        row.append(bm.verts.new((x, y, z)))
    grid.append(row)
for j in range(len(rr) - 1):
    for i in range(NA):
        q = (grid[j][i], grid[j][(i + 1) % NA], grid[j + 1][(i + 1) % NA], grid[j + 1][i])
        if j == 0: q = (q[0], q[2], q[3])
        try: bm.faces.new(q)
        except ValueError: pass
# underside: a flat disc slightly in from the edge
bc = bm.verts.new((0, 0, 0)); ring = [bm.verts.new((MR * .995 * cos(a), MR * .995 * sin(a), .0005)) for a in th]
for i in range(NA):
    bm.faces.new((ring[(i + 1) % NA], ring[i], bc)); bm.faces.new((grid[-1][i], grid[-1][(i + 1) % NA], ring[(i + 1) % NA], ring[i]))
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:
    for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / (2 * MR) + .5, lp.vert.co.y / (2 * MR) + .5)
me = bm_mesh('dough', bm)
# per-vertex: how far toward the rim (for the crust browning) and the bubble height
co = np.array([v.co[:] for v in me.vertices]); rad = np.hypot(co[:, 0], co[:, 1]) / MR
a1 = me.attributes.new('rim', 'FLOAT', 'POINT'); a1.data.foreach_set('value', np.clip((rad - .84) / .16, 0, 1).astype(np.float32))
dough = obj('dough', me, pie)

D = Mat('dough')
tc = D.n('ShaderNodeTexCoord'); rimA = D.n('ShaderNodeAttribute', attribute_name='rim')
BAKE = D.n('ShaderNodeValue', name='BAKE')
n1 = D.n('ShaderNodeTexNoise', Scale=60., Detail=8., Roughness=.6); D.l(tc.outputs['Object'], n1.inputs['Vector'])
n2 = D.n('ShaderNodeTexNoise', Scale=420., Detail=3.); D.l(tc.outputs['Object'], n2.inputs['Vector'])
geo = D.n('ShaderNodeNewGeometry'); gz = D.n('ShaderNodeSeparateXYZ'); D.l(tc.outputs['Object'], gz.inputs[0])
up = D.n('ShaderNodeSeparateXYZ'); D.l(geo.outputs['Normal'], up.inputs[0])
# za'atar layer: everywhere inside the rim, patchy where the oil pooled
zmask = D.mrange(rimA.outputs['Fac'], .42, .2)
herb = D.mix(D.mrange(n2.outputs['Fac'], .35, .7), srgb('#2b2a0a'), srgb('#4f4512'))
herb = D.mix(D.mrange(n1.outputs['Fac'], .45, .75), herb, srgb('#6a5a1c'))
fl = D.n('ShaderNodeTexVoronoi', Scale=700., Randomness=1.); D.l(tc.outputs['Object'], fl.inputs['Vector'])                # herb flakes
flc = D.n('ShaderNodeSeparateColor'); D.l(fl.outputs['Color'], flc.inputs[0])
herb = D.mix(D.math('MULTIPLY', D.mrange(flc.outputs[0], .55, .8), .8), herb, srgb('#1c2207'))
herb = D.mix(D.math('MULTIPLY', D.mrange(flc.outputs[1], .75, .95), .6), herb, srgb('#7d6c2c'))
oil_hi = D.mrange(n1.outputs['Fac'], .5, .75)
# dough: raw cream -> baked gold, the rope rim and high points brown first
height = D.math('ADD', D.mrange(gz.outputs['Z'], .005, .011), D.math('MULTIPLY', rimA.outputs['Fac'], .6))
brown = D.math('MULTIPLY', BAKE.outputs[0], D.math('ADD', D.math('MULTIPLY', height, 1.1), D.math('MULTIPLY_ADD', n1.outputs['Fac'], .5, -.15)))
raw = D.mix(D.mrange(n2.outputs['Fac'], .3, .7), srgb('#d8c296'), srgb('#c9ad7e'))
gold = D.mix(D.mrange(n2.outputs['Fac'], .3, .7), srgb('#d29b4c'), srgb('#b97c34'))
dark = srgb('#8a4f1e')
crust = D.mix(D.mrange(brown, .15, .65), raw, gold)
crust = D.mix(D.mrange(brown, .7, 1.1), crust, dark)
flour = D.mrange(n2.outputs['Fac'], .68, .78)
flour2 = D.mrange(n1.outputs['Fac'], .56, .7)
crust = D.mix(D.math('MULTIPLY', D.math('ADD', flour, flour2), D.math('MULTIPLY', rimA.outputs['Fac'], .4)), crust, srgb('#e6dcc8'))
blv = D.n('ShaderNodeTexVoronoi', Scale=95., Randomness=1.); D.l(tc.outputs['Object'], blv.inputs['Vector'])
blis = D.math('MULTIPLY', D.math('MULTIPLY', D.mrange(blv.outputs['Distance'], .22, .08), D.mrange(n1.outputs['Fac'], .45, .62)), D.math('MULTIPLY', BAKE.outputs[0], rimA.outputs['Fac']))
crust = D.mix(D.math('MULTIPLY', blis, .9), crust, srgb('#6b3a14'))                       # blistered spots where bubbles caught
herb_baked = D.mix(D.math('MULTIPLY', BAKE.outputs[0], .72), herb, srgb('#2a260b'))
colr = D.mix(zmask, crust, herb_baked)
rough = D.mix(zmask, D.mrange(brown, 0., 1., .72, .58), D.math('SUBTRACT', .66, D.math('MULTIPLY', oil_hi, .14)))
bp = D.n('ShaderNodeBump', Strength=.35, Distance=.0008); D.l(D.math('ADD', n2.outputs['Fac'], D.math('MULTIPLY', n1.outputs['Fac'], .4)), bp.inputs['Height'])
b = D.bsdf(**{'Subsurface Weight': .15, 'Subsurface Scale': .003, 'Specular IOR Level': .5, 'Coat Weight': .0})
b.inputs['Subsurface Radius'].default_value = (1., .7, .4)
D.l(colr, b.inputs['Base Color']); D.l(rough, b.inputs['Roughness']); D.l(bp.outputs[0], b.inputs['Normal'])
D.l(D.mix(zmask, (.5, .5, .5, 1.), (float(ENV('ZSPEC', '.04')),) * 3 + (1.,)), b.inputs['Specular IOR Level'])
coat = D.math('MULTIPLY', zmask, D.math('MULTIPLY_ADD', oil_hi, .12, .06)); D.l(coat, b.inputs['Coat Weight']); b.inputs['Coat Roughness'].default_value = .3
dough.data.materials.append(D.done(b.outputs[0]))

# sesame seeds: small flattened teardrops scattered over the za'atar, sitting on the surface
SES = Mat('sesame'); ns = SES.n('ShaderNodeTexNoise', Scale=900.); sb_ = SES.n('ShaderNodeValue', name='SBAKE')
bs = SES.bsdf(**{'Subsurface Weight': .25, 'Subsurface Scale': .0008, 'Roughness': .45})
sraw = SES.mix(SES.mrange(ns.outputs['Fac'], .35, .65), srgb('#ddc690'), srgb('#c3a568'))
SES.l(SES.mix(sb_.outputs[0], sraw, srgb('#b9873e')), bs.inputs['Base Color'])                                     # toasts as it bakes
SES = SES.done(bs.outputs[0])
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.)
for v in bm.verts:
    x, y, z = v.co; v.co = (x * .0013 * (1 - .35 * (y > 0) * y), y * .0009, z * .0004)
seed_me = bm_mesh('seed', bm); seed_me.materials.append(SES)
NS = int(ENV('SEEDS', '650'))
sv, sf = [], []; base = np.array([v.co[:] for v in seed_me.vertices]); faces = [list(p.vertices) for p in seed_me.polygons]
for _ in range(NS):
    r_ = MR * .8 * np.sqrt(rng.random())
    a_ = rng.uniform(0, 2 * pi); x, y = r_ * cos(a_), r_ * sin(a_)
    _, _, z = surf(np.array([r_ / MR]), np.array([a_]), 1.)
    rot = rng.uniform(0, 2 * pi); c, s_ = cos(rot), sin(rot)
    P = np.c_[base[:, 0] * c - base[:, 1] * s_, base[:, 0] * s_ + base[:, 1] * c, base[:, 2]] + np.array([x, y, float(z[0]) + .0006])
    sf += [[i + len(sv) for i in fc] for fc in faces]; sv += P.tolist()
sm = bpy.data.meshes.new('seeds'); sm.from_pydata(sv, [], sf); sm.update(); sm.shade_smooth(); sm.materials.append(SES)
seeds = obj('seeds', sm, pie)

# ------------------------------------------------------------------ the oven: a brick barrel vault with an arched mouth, stone floor, embers at the back
BR = Mat('brick')
tcb = BR.n('ShaderNodeTexCoord'); mpb = BR.n('ShaderNodeMapping'); mpb.inputs['Scale'].default_value = (2.2, 2.2, 2.2); BR.l(tcb.outputs['Object'], mpb.inputs['Vector'])
bcol = BR.tex('tex/brick_color.jpg', mpb.outputs[0], 'sRGB', True); bnor = BR.tex('tex/brick_normal.jpg', mpb.outputs[0], box=True); brou = BR.tex('tex/brick_rough.jpg', mpb.outputs[0], box=True)
soot = BR.n('ShaderNodeTexNoise', Scale=3., Detail=6.); BR.l(tcb.outputs['Object'], soot.inputs['Vector'])
sz = BR.n('ShaderNodeSeparateXYZ'); BR.l(tcb.outputs['Object'], sz.inputs[0])
sootf = BR.math('MULTIPLY', BR.mrange(sz.outputs['Z'], .12, .45), BR.mrange(soot.outputs['Fac'], .35, .65, .45, .95))   # soot climbs the vault
bc_ = BR.mix(sootf, bcol.outputs['Color'], srgb('#1a120d'))
nmb = BR.n('ShaderNodeNormalMap', Strength=1.2); BR.l(bnor.outputs['Color'], nmb.inputs['Color'])
bb = BR.bsdf(**{'Specular IOR Level': .3}); BR.l(bc_, bb.inputs['Base Color']); BR.l(brou.outputs['Color'], bb.inputs['Roughness']); BR.l(nmb.outputs[0], bb.inputs['Normal'])
BRICK = BR.done(bb.outputs[0])
# vault interior: half-cylinder along +Y, radius .42, from y=-.25 (mouth) to y=.7
VR, Y0, Y1 = .42, -.22, .72
bm = bmesh.new(); rows = []
for y in np.linspace(Y0, Y1, 30):
    rows.append([bm.verts.new((VR * cos(a), y, VR * sin(a))) for a in np.linspace(0, pi, 60)])
for j in range(len(rows) - 1):
    for i in range(len(rows[0]) - 1):
        bm.faces.new((rows[j][i + 1], rows[j][i], rows[j + 1][i], rows[j + 1][i + 1]))
vault = obj('vault', bm_mesh('vault', bm, False)); vault.data.materials.append(BRICK)
# back wall
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=VR)
back = obj('back', bm_mesh('back', bm, False)); back.rotation_euler = (radians(90), 0, 0); back.location = (0, Y1, 0); back.data.materials.append(BRICK)
# facade with an arched mouth
MW, MH = .30, .26                                                       # mouth half-width, height of the arch springline
# the facade: a grid with the arched mouth cut out
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=600, y_segments=375, size=1.)
bmesh.ops.scale(bm, vec=(1.2, .75, 1), verts=bm.verts)
def inside(x, z): return (z < MH * .5 and abs(x) < MW and z > -.01) or (z >= MH * .5 and (x / MW) ** 2 + ((z - MH * .5) / (MW * .62)) ** 2 < 1)
for v in bm.verts: v.co = (v.co.x, 0, v.co.y + .45)
kill = [f for f in bm.faces if inside(f.calc_center_median().x, f.calc_center_median().z)]
bmesh.ops.delete(bm, geom=kill, context='FACES')
facade = obj('facade', bm_mesh('facade', bm, False)); facade.location = (0, Y0, 0); facade.data.materials.append(BRICK)
# stone floor (inside and a ledge in front)
ST = Mat('stone'); tcs = ST.n('ShaderNodeTexCoord')
nst = ST.n('ShaderNodeTexNoise', Scale=22., Detail=8.); ST.l(tcs.outputs['Object'], nst.inputs['Vector'])
nfl = ST.n('ShaderNodeTexNoise', Scale=7., Detail=8., Roughness=.7); ST.l(tcs.outputs['Object'], nfl.inputs['Vector'])
nsp = ST.n('ShaderNodeTexNoise', Scale=160., Detail=4.); ST.l(tcs.outputs['Object'], nsp.inputs['Vector'])
bst = ST.bsdf(**{'Specular IOR Level': .4})
stone = ST.mix(ST.mrange(nst.outputs['Fac'], .3, .7), srgb('#4d3d31'), srgb('#55443a'))
stone = ST.mix(ST.math('MULTIPLY', ST.mrange(nsp.outputs['Fac'], .55, .7), .5), stone, srgb('#2e241d'))                    # speckle
stone = ST.mix(ST.math('MULTIPLY', ST.mrange(nfl.outputs['Fac'], .6, .72), .5), stone, srgb('#2a201a'))                  # faint scorch
flourf = ST.math('MULTIPLY', ST.mrange(nfl.outputs['Fac'], .36, .28), ST.mrange(nsp.outputs['Fac'], .5, .72))
stone = ST.mix(ST.math('MULTIPLY', flourf, .45), stone, srgb('#a8987f'))                                                    # a dusting of flour
r0 = ST.mrange(nst.outputs['Fac'], .3, .7, .32, .5)
ST.l(stone, bst.inputs['Base Color']); ST.l(ST.math('ADD', r0, ST.math('MULTIPLY', flourf, ST.math('SUBTRACT', .9, r0))), bst.inputs['Roughness'])
bpst = ST.n('ShaderNodeBump', Strength=.3, Distance=.002); ST.l(ST.math('ADD', nst.outputs['Fac'], ST.math('MULTIPLY', nsp.outputs['Fac'], .3)), bpst.inputs['Height']); ST.l(bpst.outputs[0], bst.inputs['Normal'])
STONE = ST.done(bst.outputs[0])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.); bmesh.ops.scale(bm, vec=(1.2, 1.2, 1), verts=bm.verts)
floor = obj('floor', bm_mesh('floor', bm, False)); floor.location = (0, .2, 0); floor.data.materials.append(STONE)
# the fire: flames rolling up the back-left of the vault behind a low firebox wall, like their oven.
# Each sheet is noise-shaped emission (4D noise, so the flames move frame to frame); camera and reflections see
# them, diffuse doesn't, so the room is lit cleanly by the firelight area lights instead of noisy emission.
FIRE = None
FL = Mat('flame'); tcf = FL.n('ShaderNodeTexCoord'); sxf = FL.n('ShaderNodeSeparateXYZ'); FL.l(tcf.outputs['Generated'], sxf.inputs[0])
FIRE = FL.n('ShaderNodeValue', name='FIRE'); FTIME = FL.n('ShaderNodeValue', name='FTIME')
ofs = FL.n('ShaderNodeCombineXYZ'); FL.l(FL.math('MULTIPLY', sxf.outputs['X'], 5.), ofs.inputs[0]); FL.l(FL.math('SUBTRACT', FL.math('MULTIPLY', sxf.outputs['Z'], 2.4), FL.math('MULTIPLY', FTIME.outputs[0], 2.2)), ofs.inputs[1])
oif = FL.n('ShaderNodeObjectInfo')
nf = FL.n('ShaderNodeTexNoise', noise_dimensions='4D', Scale=1.4, Detail=7., Roughness=.62, Distortion=.6); FL.l(ofs.outputs[0], nf.inputs['Vector']); FL.l(FL.math('ADD', FTIME.outputs[0], FL.math('MULTIPLY', oif.outputs['Random'], 40.)), nf.inputs['W'])
across = FL.math('MULTIPLY', FL.mrange(sxf.outputs['X'], .0, .18), FL.mrange(sxf.outputs['X'], 1., .82))
body = FL.math('ADD', nf.outputs['Fac'], FL.math('MULTIPLY', FL.math('SUBTRACT', 1., sxf.outputs['Z']), .75))
body = FL.math('MULTIPLY', body, across)
alpha = FL.math('MULTIPLY', FL.mrange(body, .8, 1.16), .92)
heat = FL.math('ADD', FL.mrange(body, .95, 1.4), FL.math('MULTIPLY', FL.mrange(sxf.outputs['Z'], .35, .0), .35))   # hottest low down
fcol = FL.mix(FL.mrange(heat, .0, .45), srgb('#d8320a'), srgb('#ff8a24'))
fcol = FL.mix(FL.mrange(heat, .45, 1.), fcol, srgb('#ffe2a0'))
emf = FL.n('ShaderNodeEmission'); FL.l(fcol, emf.inputs['Color']); FL.l(FL.math('MULTIPLY', FIRE.outputs[0], FL.math('MULTIPLY_ADD', heat, 26., 3.)), emf.inputs['Strength'])
trf = FL.n('ShaderNodeBsdfTransparent'); mxf = FL.n('ShaderNodeMixShader'); FL.l(alpha, mxf.inputs[0]); FL.l(trf.outputs[0], mxf.inputs[1]); FL.l(emf.outputs[0], mxf.inputs[2])
FLAME = FL.done(mxf.outputs[0])
def flame_sheet(name, x0, y0, w, h, lean, rot):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=24, y_segments=24, size=.5)
    for v in bm.verts:
        u, q = v.co.x + .5, v.co.y + .5                                   # q: 0 at the base .. 1 at the tips
        v.co = (u * w + lean * q * q, 0, q * h)
    o = obj(name, bm_mesh(name, bm, False)); o.location = (x0, y0, .03); o.rotation_euler = (0, 0, radians(rot)); o.data.materials.append(FLAME)
    o.visible_diffuse = False; o.visible_shadow = False; o.visible_volume_scatter = False
    return o
for i_, (x_, y_, w_, h_, l_, r_) in enumerate([(-.40, .52, .22, .30, .14, -8), (-.38, .44, .2, .26, .16, -24), (-.41, .60, .24, .34, .12, 8),
                                               (-.37, .36, .16, .2, .12, -36), (-.39, .48, .18, .32, .18, 18), (-.42, .66, .2, .28, .1, -14),
                                               (-.36, .40, .14, .22, .14, 30)]):
    flame_sheet('flame%d' % i_, x_, y_, w_, h_, l_, r_)
# the low firebox wall the flames rise behind
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.); bmesh.ops.scale(bm, vec=(.045, .42, .065), verts=bm.verts)
fw = obj('firewall', bm_mesh('firewall', bm, False)); fw.location = (-.17, .48, .0325); fw.data.materials.append(BRICK)
# a bed of glowing ash just visible over the wall, mostly black
EM = Mat('ash'); tce = EM.n('ShaderNodeTexCoord'); ve = EM.n('ShaderNodeTexNoise', Scale=70., Detail=6., Roughness=.65); EM.l(tce.outputs['Object'], ve.inputs['Vector'])
crack = EM.math('MULTIPLY', EM.mrange(EM.math('ABSOLUTE', EM.math('SUBTRACT', ve.outputs['Fac'], .5)), .02, .0), EM.mrange(ve.outputs['Fac'], .3, .45))
eme = EM.n('ShaderNodeEmission'); EM.l(EM.mix(crack, srgb('#a51a00'), srgb('#ff6a10')), eme.inputs['Color'])
EM.l(EM.math('MULTIPLY', FIRE.outputs[0], EM.math('MULTIPLY', crack, 6.)), eme.inputs['Strength'])
be = EM.bsdf(**{'Base Color': srgb('#2a2522'), 'Roughness': .95}); ad = EM.n('ShaderNodeAddShader'); EM.l(be.outputs[0], ad.inputs[0]); EM.l(eme.outputs[0], ad.inputs[1])
ASH = EM.done(ad.outputs[0])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=40, y_segments=40, size=.5)
for v in bm.verts: v.co = (v.co.x * .2, v.co.y * .44, .012 + .02 * max(0., .25 - v.co.x * v.co.x - v.co.y * v.co.y * .3) + .003 * sin(v.co.x * 90) * sin(v.co.y * 70))
asb = obj('ash', bm_mesh('ash', bm)); asb.location = (-.3, .5, 0); asb.data.materials.append(ASH)

# ------------------------------------------------------------------ the steel peel
WD = Mat('steel'); nw = WD.n('ShaderNodeTexNoise', Scale=6., Detail=6.); tcw = WD.n('ShaderNodeTexCoord'); WD.l(tcw.outputs['Object'], nw.inputs['Vector'])
nbr = WD.n('ShaderNodeTexNoise', Scale=400., Detail=2.); mpw = WD.n('ShaderNodeMapping'); mpw.inputs['Scale'].default_value = (1., 60., 1.); WD.l(tcw.outputs['Object'], mpw.inputs['Vector']); WD.l(mpw.outputs[0], nbr.inputs['Vector'])
bw = WD.bsdf(**{'Metallic': .75, 'Base Color': srgb('#c9c5be')})
WD.l(WD.mix(WD.mrange(nw.outputs['Fac'], .4, .7), srgb('#c2bfba'), srgb('#8f8a84')), bw.inputs['Base Color'])
WD.l(WD.math('ADD', .4, WD.math('MULTIPLY', nbr.outputs['Fac'], .14)), bw.inputs['Roughness'])
WOOD = WD.done(bw.outputs[0])
peel = obj('peel', None)
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=128, radius=1.)          # a rounded-square steel sheet
for v in bm.verts:
    x, y = v.co.x, v.co.y; v.co = (np.sign(x) * abs(x) ** .45 * .18, np.sign(y) * abs(y) ** .45 * .17, 0)
bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.002)
pb = obj('peelboard', bm_mesh('peelboard', bm, False), peel); pb.location = (0, 0, -.001); pb.data.materials.append(WOOD)
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=.009, radius2=.009, depth=.9)
ph = obj('handle', bm_mesh('handle', bm), peel); ph.rotation_euler = (radians(90), 0, 0); ph.location = (0, -.62, .008); ph.data.materials.append(WOOD)

# ------------------------------------------------------------------ light
LIGHT = float(ENV('LIGHT', '.06'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
FIREL = area('firelight', (-.18, .48, .22), (.1, .1, 0), .35, .25, 0, (1, .45, .14), spread=radians(120))
area('vaultfill', (0, .15, .38), (0, .15, 0), .3, .5, 7, (1, .62, .3))
area('front', (.35, -1.1, .55), (0, -.1, .02), .5, .35, 80, (1, .95, .9), spread=radians(35))
area('rim', (-.55, -.6, .25), (0, -.1, .02), .1, .6, 40, (1, .85, .7))
area('mouthfill', (.05, -.18, .2), (.05, .25, 0), .4, .2, 14, (1, .93, .85), spread=radians(60))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
bgw = wn.nodes.new('ShaderNodeBackground'); bgw.inputs[0].default_value = srgb('#050403'); bgw.inputs[1].default_value = 1.
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(bgw.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 40.; cd.clip_start = .01; cd.dof.use_dof = True
cam = obj('cam', cd); scn.camera = cam
# pie positions: on the stone inside the oven, then out on the peel at the front
PIE_IN = Vector((.05, .22, .0)); PIE_OUT = Vector((.12, -.48, .06))
KEYS = [(0.00, (-.18, -1.05, .30), (-.06, .2, .1), 35, 8., 0.),
        (0.14, (-.12, -.80, .25), (-.02, .22, .06), 35, 8., 0.),
        (0.36, (.08, -.28, .22), (.03, .2, .01), 45, 4., -.2),
        (0.52, (.16, -.02, .12), (.04, .24, .004), 55, 2.8, -.3),
        (0.66, (-.02, .05, .1), (.07, .26, .004), 55, 2.8, -.3),
        (0.82, (.0, -.95, .34), (.04, -.3, .05), 45, 5., -.1),
        (1.00, (-.12, -1.25, .42), (.0, -.36, .08), 45, 6., 0.)]
def place(t, focus):
    for (t0, c0, g0, l0, f0, e0), (t1, c1, g1, l1, f1, e1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smoother((t - t0) / (t1 - t0)); L = lambda a, b: [x + (y - x) * k for x, y in zip(a, b)] if isinstance(a, tuple) else a + (b - a) * k
            c, g, lens, fs, ev = Vector(L(c0, c1)), Vector(L(g0, g1)), L(l0, l1), L(f0, f1), L(e0, e1); break
    cam.location = c; cam.rotation_euler = (g - c).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (focus - c).length
    scn.view_settings.exposure = float(ENV('EV', '-.8')) + ev

def state(t):
    f = .55 + .45 * smoother(seg(t, .06, .2)) + .06 * sin(t * 61) * sin(t * 23 + 1.)
    FIRE.outputs[0].default_value = f * float(ENV('FIRE', '1')); FTIME.outputs[0].default_value = t * 9.
    FIREL.data.energy = float(ENV('FIREW', '170')) * LIGHT * f
    BAKE.outputs[0].default_value = smoother(seg(t, .2, .62)); SES.node_tree.nodes['SBAKE'].outputs[0].default_value = .8 * smoother(seg(t, .3, .7))
    # the peel: slides in under the pie (.68-.76), lifts and comes out (.76-.9)
    a = smoother(seg(t, .66, .76)); b_ = smoother(seg(t, .76, .9))
    pin = PIE_IN + Vector((0, 0, .0)); pout = PIE_OUT
    peel_pos = (pin + Vector((0, -.55, .0))).lerp(pin + Vector((0, 0, .0)), a).lerp(pout, b_)
    peel.location = peel_pos + Vector((0, 0, .006 + .006 * b_))
    for o_ in peel.children: o_.hide_render = t < .62
    pie.location = pin.lerp(pout, b_) + Vector((0, 0, .012 * b_ + (.006 if t > .76 else 0)))
    pie.rotation_euler = (0, 0, radians(18 - 30 * smoother(seg(t, .1, .9))))
    place(t, pie.location + Vector((0, 0, .01)))

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1440, 900; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.02'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.transmission_bounces = 4; cy.transparent_max_bounces = 24; cy.glossy_bounces = 3; cy.diffuse_bounces = 3
cy.sample_clamp_indirect = 0.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 13
r.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast')

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / (N - 1)); r.filepath = fp
    bpy.ops.render.render(write_still=True)
print('done')
