# Peepo's (Canton + Taylor): their chicken Afrikano sub, cut on the diagonal, on their branded paper liner.
# Built to match their own photo (DSC09236 on peepossubs.com): a sesame roll toasted golden, pressed thin, packed
# with Afrikano chicken, cabbage and melted cheese. The crust and the cut face are textured from that photo
# (tex/face.jpg + tex/face2.jpg, their _h height maps give the cut real relief); the crust is procedural, sesame seeds are geometry.
# Beats: the whole sub on the paper -> the halves slide apart and show the cut -> round the end -> both faces open.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=96] [samples=48] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, radians
from mathutils import Vector, Matrix
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 96
SAMPLES = int(argv[3]) if len(argv) > 3 else 48
SCALE = float(argv[4]) if len(argv) > 4 else 1.
rng = np.random.default_rng(21); random.seed(21)
ENV = lambda k, d: os.environ.get('PP_' + k, d)


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
def from_np(name, V, F, smooth_=True):
    me = bpy.data.meshes.new(name); me.from_pydata(np.asarray(V).tolist(), [], np.asarray(F).tolist()); me.update()
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

def simple(name, color, rough=.5, **kw):
    m = Mat(name); b = m.bsdf(**{'Base Color': srgb(color), 'Roughness': rough, **kw}); return m.done(b.outputs[0])


# ------------------------------------------------------------------ dimensions (metres): a 25 cm roll, pressed
L, Wd = .25, .085
H = .05; CROWN = .008; ZTOP = H + CROWN
ZF0, ZF1 = .015, .037        # the filling band (the seam on the open side, y < 0, away from the front camera)
CUT_A = radians(52)          # the diagonal cut, across the middle
CUT_M = Matrix.Rotation(CUT_A, 3, 'Z') @ Vector((0, 1, 0))           # normal of the cut plane (local)
DL = Vector((-CUT_M.y, CUT_M.x, 0))                                   # along the cut line
UH = Wd / 2 / sin(CUT_A) * 1.02                                       # half the cut line's length
FACE_BAND = (0., ZTOP, 0., 1., .0022)                                 # tex/face.jpg covers the whole section
def rr(u, p=2.6): return np.sign(u) * np.abs(u) ** (2 / p)

def roll_mesh(name):
    """the whole roll: a squarish superellipse section, rounded ends, toasted crown, flat sole, and a seam groove
    along the open side where the filling shows. POINT attribute 'seam' (1 in the groove) for the shader."""
    NU, NV = 170, 200
    us = np.linspace(-1, 1, NU); aa = 2 * pi * np.arange(NV) / NV
    U, A_ = np.meshgrid(us, aa, indexing='ij')
    end = (1 - np.abs(U) ** 5) ** .2
    cx, cy = rr(np.cos(A_)), rr(np.sin(A_))
    X = U * L / 2; Y = cx * Wd / 2 * end
    Z = H / 2 + cy * H / 2 * end ** .5
    Z = np.where(cy > 0, Z + CROWN * (1 - U * U) * cy ** 1.5, Z)
    Z = np.where(cy < 0, H / 2 + (Z - H / 2) * .9, Z)
    Z = np.where(cy < -.75, np.minimum(Z, .0025 + (Z - .0025) * .5), Z)                  # flat sole
    Z = np.maximum(Z, .0004)
    # the seam: on the open side the roll parts a little and the filling sits back in the gap
    band = np.clip(np.sin(np.clip((Z - ZF0) / (ZF1 - ZF0), 0, 1) * pi), 0, 1) ** .7
    side = np.clip((-cx - .6) / .35, 0, 1) * (np.abs(U) < .985)
    seam = band * side
    Y = Y + .003 * seam * end
    Z = Z + .0012 * np.sin(X * 90 + 1.3) * np.sin(Y * 120) * (cy > .3) + .0018 * np.sin(X * 28 + .5) * np.sin(Y * 30 + 1.) * (cy > .2)   # hand-made: bumps, undulation
    Y = Y * (1 + .03 * np.sin(X * 20 + 1.))
    V = np.stack([X, Y, Z], -1).reshape(-1, 3)
    F = []
    for i in range(NU - 1):
        for j in range(NV):
            p, q = i * NV + j, i * NV + (j + 1) % NV
            F.append((p, q, q + NV, p + NV))
    me = from_np(name, V, F)
    at = me.attributes.new('seam', 'FLOAT', 'POINT'); at.data.foreach_set('value', seam.reshape(-1).astype(np.float32))
    return me

def lin(m, val, a, b, lo=0., hi=1., clamp=False):
    r = m.n('ShaderNodeMapRange', interpolation_type='LINEAR', clamp=clamp); m.v(r.inputs['Value'], val)
    r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b; r.inputs['To Min'].default_value = lo; r.inputs['To Max'].default_value = hi
    return r.outputs['Result']
def img(path, colour=True):
    im = bpy.data.images.load(asset(path))
    if not colour: im.colorspace_settings.name = 'Non-Color'
    return im
FILL_IMG = img('tex/fill.webp')
def boxtex(m, image, scale):
    t = m.n('ShaderNodeTexCoord'); mp_ = m.n('ShaderNodeMapping'); mp_.inputs['Scale'].default_value = (scale, scale, scale)
    m.l(t.outputs['Object'], mp_.inputs['Vector'])
    ti = m.n('ShaderNodeTexImage', interpolation='Cubic', projection='BOX', projection_blend=.35); ti.image = image; m.l(mp_.outputs[0], ti.inputs[0])
    return ti.outputs['Color']

# crust: a toasted roll. Toast amount = large soft patches + the crown (the press browns the high points) + fine
# mottling; colour runs pale gold -> golden brown -> dark toast; oily sheen where it's darkest; pores and fine cracks
# in the bump; paler, floury sides and sole. The seam band shows the filling.
CR = Mat('crust')
tc = CR.n('ShaderNodeTexCoord'); sz_ = CR.n('ShaderNodeSeparateXYZ'); CR.l(tc.outputs['Object'], sz_.inputs[0])
n1 = CR.n('ShaderNodeTexNoise', Scale=11., Detail=6., Roughness=.55); CR.l(tc.outputs['Object'], n1.inputs['Vector'])
n3 = CR.n('ShaderNodeTexNoise', Scale=70., Detail=8., Roughness=.65); CR.l(tc.outputs['Object'], n3.inputs['Vector'])
n2 = CR.n('ShaderNodeTexNoise', Scale=420., Detail=4.); CR.l(tc.outputs['Object'], n2.inputs['Vector'])
geo = CR.n('ShaderNodeNewGeometry'); gn = CR.n('ShaderNodeSeparateXYZ'); CR.l(geo.outputs['Normal'], gn.inputs[0])
crown = CR.mrange(sz_.outputs['Z'], H - .006, ZTOP)
toast = CR.math('ADD', CR.math('ADD', CR.mrange(n1.outputs['Fac'], .38, .68), CR.math('MULTIPLY', crown, .45)), CR.math('MULTIPLY_ADD', n3.outputs['Fac'], .5, -.25))
toast = CR.math('MULTIPLY', toast, CR.mrange(gn.outputs['Z'], .1, .7, .6, 1.))            # the sides toast a little less
c0 = CR.mix(CR.mrange(toast, .1, .55), srgb('#dcae66'), srgb('#b8722f'))
top = CR.mix(CR.mrange(toast, .55, 1.05), c0, srgb('#6f3412'))
fd = CR.n('ShaderNodeTexNoise', Scale=45., Detail=6., Roughness=.7); CR.l(tc.outputs['Object'], fd.inputs['Vector'])
flour = CR.math('MULTIPLY', CR.mrange(fd.outputs['Fac'], .6, .72), CR.mrange(gn.outputs['Z'], .5, -.2))
colr = CR.mix(CR.math('MULTIPLY', flour, .6), top, srgb('#e8d6b4'))                                  # flour dust on the sides
colr = CR.mix(CR.mrange(gn.outputs['Z'], -.35, -.75), colr, srgb('#d6ad74'))                         # pale sole
sm = CR.n('ShaderNodeAttribute', attribute_name='seam')
colr = CR.mix(CR.mrange(sm.outputs['Fac'], .25, .6), colr, boxtex(CR, FILL_IMG, 1 / .035))
crk = CR.n('ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', Scale=120.); CR.l(tc.outputs['Object'], crk.inputs['Vector'])
hgt = CR.math('ADD', CR.math('MULTIPLY', n2.outputs['Fac'], .6), CR.math('ADD', CR.math('MULTIPLY', n3.outputs['Fac'], .5), CR.math('MULTIPLY', CR.mrange(crk.outputs['Distance'], .0, .04), .45)))
bp = CR.n('ShaderNodeBump', Strength=.6, Distance=.0012); CR.l(hgt, bp.inputs['Height'])
b = CR.bsdf(**{'Subsurface Weight': .05, 'Subsurface Scale': .002, 'Specular IOR Level': .5, 'Coat Roughness': .22})
b.inputs['Subsurface Radius'].default_value = (1., .6, .3)
CR.l(colr, b.inputs['Base Color']); CR.l(bp.outputs[0], b.inputs['Normal'])
CR.l(CR.mrange(toast, .2, 1., .62, .4), b.inputs['Roughness']); CR.l(CR.math('MULTIPLY', CR.mrange(toast, .4, 1.), .3), b.inputs['Coat Weight'])
CRUST = CR.done(b.outputs[0])

# the cut faces: their photo of this sub's cross-sections (A: the top half in the photo, B: the bottom half), crust skin round the edge
def cutface(name, path):
    CM = Mat(name); t = CM.n('ShaderNodeTexCoord')
    d = CM.n('ShaderNodeVectorMath', operation='DOT_PRODUCT'); CM.l(t.outputs['Object'], d.inputs[0]); d.inputs[1].default_value = DL[:]
    sz = CM.n('ShaderNodeSeparateXYZ'); CM.l(t.outputs['Object'], sz.inputs[0])
    uv = CM.n('ShaderNodeCombineXYZ'); CM.l(lin(CM, d.outputs['Value'], -UH, UH, 0., 1.), uv.inputs[0]); CM.l(lin(CM, sz.outputs['Z'], 0., ZTOP), uv.inputs[1])
    ti = CM.n('ShaderNodeTexImage', interpolation='Cubic', extension='EXTEND'); ti.image = img(path); CM.l(uv.outputs[0], ti.inputs[0])
    ra = CM.n('ShaderNodeAttribute', attribute_name='rim'); nr = CM.n('ShaderNodeTexNoise', Scale=400., Detail=3.)
    rimc = CM.mix(CM.mrange(sz.outputs['Z'], .015, .03), srgb('#a8652c'), srgb('#7a3e15'))
    colc = CM.mix(CM.mrange(CM.math('ADD', ra.outputs['Fac'], CM.math('MULTIPLY_ADD', nr.outputs['Fac'], .3, -.15)), .4, .8), ti.outputs['Color'], rimc)
    bwc = CM.n('ShaderNodeRGBToBW'); CM.l(ti.outputs['Color'], bwc.inputs[0])
    bpc = CM.n('ShaderNodeBump', Strength=.45, Distance=.0006); CM.l(bwc.outputs[0], bpc.inputs['Height'])
    bc = CM.bsdf(**{'Roughness': .5, 'Subsurface Weight': .1, 'Subsurface Scale': .002, 'Coat Weight': .18, 'Coat Roughness': .2})
    CM.l(colc, bc.inputs['Base Color']); CM.l(bpc.outputs[0], bc.inputs['Normal'])
    return CM.done(bc.outputs[0])
CUT = {1.: cutface('cutA', 'tex/face.jpg'), -1.: cutface('cutB', 'tex/face2.jpg')}

# ------------------------------------------------------------------ filling bits in the seam, sesame on top
def tiled(name, scale, rough, coat=.25, tint=None, k=.35):
    m = Mat(name); c_ = boxtex(m, FILL_IMG, scale)
    col_ = c_ if not tint else m.mix(k, c_, srgb(tint))
    bw_ = m.n('ShaderNodeRGBToBW'); m.l(c_, bw_.inputs[0])
    bp_ = m.n('ShaderNodeBump', Strength=.5, Distance=.0008); m.l(bw_.outputs[0], bp_.inputs['Height'])
    b_ = m.bsdf(**{'Roughness': rough, 'Subsurface Weight': .15, 'Subsurface Scale': .002, 'Coat Weight': coat, 'Coat Roughness': .15})
    m.l(col_, b_.inputs['Base Color']); m.l(bp_.outputs[0], b_.inputs['Normal'])
    return m.done(b_.outputs[0])
CHICK = tiled('chicken', 40., .42, tint='#a8501c', k=.5)
CHEESE = Mat('cheese'); ncz = CHEESE.n('ShaderNodeTexNoise', Scale=80., Detail=3.)
bcz = CHEESE.bsdf(**{'Roughness': .3, 'Subsurface Weight': .5, 'Subsurface Scale': .004, 'Coat Weight': .3, 'Coat Roughness': .15})
CHEESE.l(CHEESE.mix(CHEESE.mrange(ncz.outputs['Fac'], .4, .7), srgb('#f6ead0'), srgb('#efdcaa')), bcz.inputs['Base Color'])
CHEESE = CHEESE.done(bcz.outputs[0])
SES = Mat('sesame')
bs = SES.bsdf(**{'Roughness': .38, 'Subsurface Weight': .25, 'Subsurface Scale': .0008, 'Coat Weight': .25, 'Coat Roughness': .25})
sa = SES.n('ShaderNodeAttribute', attribute_name='tone')
SES.l(SES.mix(sa.outputs['Fac'], srgb('#efd9a6'), srgb('#a9692a')), bs.inputs['Base Color'])
SESAME = SES.done(bs.outputs[0])

def lump(r, seed_, stretch=(1.4, 1., .7)):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.)
    R = np.random.default_rng(seed_); w = R.normal(size=(5, 3)); ph_ = R.uniform(0, 2 * pi, 5)
    for v in bm.verts:
        p = np.array(v.co[:]); k = 1 + .26 * np.sin(w @ p * 2.6 + ph_).sum() / 3 + .018 * np.sin(w @ p * 9. + ph_).sum() / 3
        v.co = (p[0] * r * stretch[0] * k, p[1] * r * stretch[1] * k, p[2] * r * stretch[2] * k)
    return bm

def cap_rings(bm, bnd, K):
    """fill each boundary loop with K concentric rings (quads) and a tiny centre fan"""
    left = set(bnd)
    while left:
        e0 = left.pop(); loop = [e0.verts[0], e0.verts[1]]
        while True:
            nxt = [e for e in loop[-1].link_edges if e in left]
            if not nxt: break
            e = nxt[0]; left.discard(e); loop.append(e.other_vert(loop[-1]))
        if loop[0] == loop[-1]: loop = loop[:-1]
        if len(loop) < 3: continue
        c = sum((v.co for v in loop), Vector()) / len(loop)
        prev = loop
        for k in range(1, K):
            t_ = 1 - k / K
            ring = [bm.verts.new(c + (v.co - c) * t_) for v in loop]
            for i in range(len(loop)):
                j = (i + 1) % len(loop)
                f = bm.faces.new((prev[j], prev[i], ring[i], ring[j])); f.material_index = 1
            prev = ring
        cv = bm.verts.new(c)
        for i in range(len(loop)):
            f = bm.faces.new((prev[(i + 1) % len(loop)], prev[i], cv)); f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def hmap(path):
    im = img(path, False); w_, h_ = im.size
    return np.array(im.pixels[:], dtype=np.float32).reshape(h_, w_, -1)[:, :, 0]
HPXS = {1.: hmap('tex/face_h.png'), -1.: hmap('tex/face2_h.png')}
def sample_h(u, v, HPX):
    HH, HW = HPX.shape
    x = np.clip(u, 0, 1) * (HW - 1); y = np.clip(v, 0, 1) * (HH - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); x1 = np.minimum(x0 + 1, HW - 1); y1 = np.minimum(y0 + 1, HH - 1); fx = x - x0; fy = y - y0
    return (HPX[y0, x0] * (1 - fx) + HPX[y0, x1] * fx) * (1 - fy) + (HPX[y1, x0] * (1 - fx) + HPX[y1, x1] * fx) * fy

def img_relief(bm, sign, band):
    """real relief on the cut: push each cap vertex along the cut normal by the photo's (blurred) brightness, so the
    cabbage and chicken stand proud and the gaps sink; the crumb stays flatter; fades out near the edge so the cap
    stays sealed. Writes POINT attribute 'rim' (1 on the edge .. 0 by 2.4 mm in) for the crust skin in the shader."""
    z0, z1, v0, v1, amp = band
    lay_r = bm.verts.layers.float.get('rim') or bm.verts.layers.float.new('rim')     # layer first: adding one reallocates the verts
    cap = [f for f in bm.faces if f.material_index == 1]
    for f in cap: f.smooth = True
    fixed = {v for f in bm.faces if f.material_index != 1 for v in f.verts}
    vs = list({v for f in cap for v in f.verts} - fixed)
    bnd = [v for v in fixed if any(f.material_index == 1 for f in v.link_faces)]
    for v in bnd: v[lay_r] = 1.
    if not vs or not bnd: return
    P = np.array([(v.co.dot(DL), v.co.z) for v in vs]); B = np.array([(v.co.dot(DL), v.co.z) for v in bnd])
    d = np.full(len(P), 1.)
    for i in range(0, len(B), 256): d = np.minimum(d, np.sqrt(((P[:, None] - B[None, i:i + 256]) ** 2).sum(-1)).min(1))
    u = (P[:, 0] + UH) / (2 * UH); v = v0 + (P[:, 1] - z0) / (z1 - z0) * (v1 - v0)
    h = sample_h(u, v, HPXS[sign]) - .5
    fill = np.clip((P[:, 1] - ZF0 + .002) / .004, 0, 1) * np.clip((ZF1 + .002 - P[:, 1]) / .004, 0, 1)
    k = (.3 + .7 * fill) * np.clip(d / .003, 0, 1) ** 1.5
    nrm = CUT_M * sign
    for vert, hh_, k_, dd in zip(vs, h, k, d):
        vert.co += nrm * float(amp * hh_ * k_); vert[lay_r] = float(max(0., 1 - dd / .0024))

def slice_bm(bm, sign, cap=True, eps=0., band=None):
    """cut on the diagonal plane (offset back by eps), keep this half, cap the hole"""
    for f in bm.faces: f.smooth = True
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=CUT_M * sign * -eps, plane_no=CUT_M * sign, clear_outer=True)
    if not cap: return
    bnd = [e for e in bm.edges if e.is_boundary]
    if not bnd: return
    if band:     # convex section: concentric rings, even density for the relief
        cap_rings(bm, bnd, 56); img_relief(bm, sign, band); return
    new = bmesh.ops.holes_fill(bm, edges=bnd, sides=0)['faces']
    if not new: return
    tri = bmesh.ops.triangulate(bm, faces=new, quad_method='BEAUTY', ngon_method='BEAUTY')['faces']
    for f in tri: f.material_index = 1; f.smooth = False
def acc_add(acc, bm):
    me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); acc.from_mesh(me); bpy.data.meshes.remove(me)

# one sesame seed: a flat teardrop, ~3 x 1.8 x .7 mm
_sb = bmesh.new(); bmesh.ops.create_uvsphere(_sb, u_segments=12, v_segments=6, radius=1.)
SEED_V = np.array([v.co[:] for v in _sb.verts]); SEED_F = [[v.index for v in f.verts] for f in _sb.faces]; _sb.free()
SEED_V = SEED_V * np.array([.0015, .0009, .00035]); SEED_V[:, 1] *= 1 - .4 * (SEED_V[:, 0] / .0015)
from mathutils.bvhtree import BVHTree
def seeds(roll, sign, name, parent):
    me = roll.data; bvh = BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices for p in me.polygons])
    R = np.random.default_rng(31); V, F, T = [], [], []
    for k in range(1700):
        x = R.uniform(-L / 2 * .94, L / 2 * .94); end = (1 - abs(2 * x / L) ** 5) ** .2
        y = R.uniform(-1, 1) * Wd / 2 * .9 * end
        yaw = R.uniform(0, 2 * pi); tone = R.beta(2, 3); keep = R.random()
        hit = bvh.ray_cast(Vector((x, y, .2)), Vector((0, 0, -1)))
        if hit[0] is None or hit[1].z < .45 or keep > .55: continue
        p, n = hit[0], hit[1]
        if p.dot(CUT_M * sign) > -.0018: continue            # this seed belongs to the other half
        M = (n.to_track_quat('Z', 'Y') @ Matrix.Rotation(yaw, 3, 'Z').to_quaternion()).to_matrix(); base = len(V)
        V += [((M @ Vector(s_)) + p + n * .0002)[:] for s_ in SEED_V]; F += [[i + base for i in f] for f in SEED_F]; T += [tone] * len(SEED_V)
    me_ = bpy.data.meshes.new(name); me_.from_pydata(V, [], F); me_.update(); me_.shade_smooth()
    a = me_.attributes.new('tone', 'FLOAT', 'POINT'); a.data.foreach_set('value', T)
    o = obj(name, me_, parent); o.data.materials.append(SESAME); return o

def seam_y(x):
    end = (1 - min(1., abs(2 * x / L)) ** 5) ** .2
    return -(Wd / 2 * end - .003)
def build_half(sign, name):
    """one half of the cut sub: the roll (photo cut face), sesame, filling bits in the seam"""
    half = obj(name, None)
    ro = obj(name + '_roll', roll_mesh(name + '_roll'), half); ro.data.materials.append(CRUST)
    seeds(ro, sign, name + '_sesame', half)
    bm = bmesh.new(); bm.from_mesh(ro.data); slice_bm(bm, sign, band=FACE_BAND); ro.data.materials.append(CUT[sign]); bm.to_mesh(ro.data); bm.free()
    # chicken pieces and cheese pushed out into the seam
    R = np.random.default_rng(7); acc = bmesh.new(); accz = bmesh.new()
    for k in range(90):
        x = R.uniform(-L / 2 * .9, L / 2 * .9); cheese = R.random() < .2
        bm = lump(R.uniform(.0035, .006) * (1.3 if cheese else 1), int(R.integers(1e6)), (1.6, .8, .5) if cheese else (1.4, 1., .7))
        rot = Matrix.Rotation(R.uniform(-.5, .5), 4, 'Z') @ Matrix.Rotation(R.normal(0, .3), 4, 'X')
        z = R.uniform(ZF0 + .005, ZF1 - .005) if not cheese else R.uniform(ZF0 + .003, ZF0 + .009)
        for v in bm.verts: v.co = rot @ v.co + Vector((x, seam_y(x) - R.uniform(-.0015, .0015), z))
        slice_bm(bm, sign, cap=False, eps=.0016); acc_add(accz if cheese else acc, bm)
    ck = obj(name + '_chicken', bm_mesh(name + '_chicken', acc), half); ck.data.materials.append(CHICK)
    cz = obj(name + '_cheese', bm_mesh(name + '_cheese', accz), half); cz.data.materials.append(CHEESE)
    return half

A = build_half(1., 'halfA')     # the half that stays
B = build_half(-1., 'halfB')    # the half that moves
cutdir = CUT_M

# ------------------------------------------------------------------ the paper liner on their red sweep
PAPER = Mat('paper'); tcp = PAPER.n('ShaderNodeTexCoord'); mpp = PAPER.n('ShaderNodeMapping'); mpp.inputs['Scale'].default_value = (3.2, 3.2, 3.2)
PAPER.l(tcp.outputs['Object'], mpp.inputs['Vector'])
pim = PAPER.n('ShaderNodeTexImage', interpolation='Cubic'); pim.image = bpy.data.images.load(asset('tex/paper.jpg')); PAPER.l(mpp.outputs[0], pim.inputs[0])
npp = PAPER.n('ShaderNodeTexNoise', Scale=25., Detail=6.); PAPER.l(tcp.outputs['Object'], npp.inputs['Vector'])
bpp = PAPER.bsdf(**{'Roughness': .7, 'Subsurface Weight': .2, 'Subsurface Scale': .002})
PAPER.l(pim.outputs['Color'], bpp.inputs['Base Color'])
bmp = PAPER.n('ShaderNodeBump', Strength=.15, Distance=.002); PAPER.l(npp.outputs['Fac'], bmp.inputs['Height']); PAPER.l(bmp.outputs[0], bpp.inputs['Normal'])
PAPER = PAPER.done(bpp.outputs[0])
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=60, y_segments=60, size=.5)
for v in bm.verts:
    x, y = v.co.x * .9, v.co.y * .9
    v.co = (x, y, .0012 * sin(x * 13 + 1) * sin(y * 11) + .0007 * sin(x * 31 - y * 23))
paper = obj('paper', bm_mesh('paper', bm)); paper.rotation_euler = (0, 0, radians(-8)); paper.location = (0, .02, -.0012); paper.data.materials.append(PAPER)
# the backdrop: lit as usual for everything but the camera, which sees it evenly self-lit so the frame's edges
# fall off into the page's cream instead of going grey
TB = Mat('table'); lpt = TB.n('ShaderNodeLightPath'); btb = TB.bsdf(**{'Base Color': srgb(ENV('SWEEP', '#e7ddd0')), 'Roughness': .9})
etb = TB.n('ShaderNodeEmission'); etb.inputs['Color'].default_value = srgb(ENV('SWEEP', '#e7ddd0')); etb.inputs['Strength'].default_value = float(ENV('SWEEPE', '1.6'))
mtb = TB.n('ShaderNodeMixShader'); TB.l(TB.math('MULTIPLY', lpt.outputs['Is Camera Ray'], .85), mtb.inputs[0]); TB.l(btb.outputs[0], mtb.inputs[1]); TB.l(etb.outputs[0], mtb.inputs[2])
TABLE = TB.done(mtb.outputs[0])
bm = bmesh.new(); prof = [(-3., 0.)] + [(.55 + .5 * sin(q), .5 * (1 - cos(q))) for q in np.linspace(0, pi / 2, 24)] + [(1.05, 2.)]
rows_ = [[bm.verts.new((x, y, z - .0035)) for y, z in prof] for x in (-3., 3.)]
for i in range(len(prof) - 1): bm.faces.new((rows_[0][i], rows_[1][i], rows_[1][i + 1], rows_[0][i + 1]))
table = obj('table', bm_mesh('table', bm)); table.data.materials.append(TABLE)

# ------------------------------------------------------------------ light
LIGHT = float(ENV('LIGHT', '.02'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bgw = wn.nodes.new('ShaderNodeBackground'); bgw.inputs[1].default_value = float(ENV('WORLD', '.15'))
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bgw.inputs[0])
# camera rays see the backdrop colour past the sweep's edges; everything else still sees the studio HDRI
lp = wn.nodes.new('ShaderNodeLightPath'); bgc = wn.nodes.new('ShaderNodeBackground'); bgc.inputs[0].default_value = srgb(ENV('SWEEP', '#e7ddd0')); bgc.inputs[1].default_value = float(ENV('SWEEPE', '1.6'))
mxw = wn.nodes.new('ShaderNodeMixShader'); wn.links.new(lp.outputs['Is Camera Ray'], mxw.inputs[0]); wn.links.new(bgw.outputs[0], mxw.inputs[1]); wn.links.new(bgc.outputs[0], mxw.inputs[2]); wn.links.new(mxw.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 50.; cd.clip_start = .01; cd.dof.use_dof = True
cam = obj('cam', cd); scn.camera = cam
ROT0 = radians(-14)
A_POS = Vector((-.02, -.01, 0))
n_ = (Matrix.Rotation(ROT0, 3, 'Z') @ cutdir).normalized()          # from A's cut face toward B
d_ = Vector((-n_.y, n_.x, 0))                                         # along the cut line
FCW = A_POS + Vector((0, 0, .028))                                  # centre of A's cut face (world)
FACE = FCW
SIDE_ = float(ENV('SIDE', '1')); SPIN = float(ENV('SPIN', '1'))
PARK = FCW + d_ * .18 * SIDE_ + n_ * .004                             # B slid sideways off A's face: the reveal
END_B = FCW + d_ * .135 * SIDE_ - n_ * .02                           # B's cut face beside A's, both toward the camera
MIDF = (FCW + END_B) / 2
# light: one key high at the front-right of the opening shot = front-left of the hero shot, a rim from behind the hero
# shot, a low fill, a soft top
area('key', (.42, .36, .46), (0, 0, .02), .4, .4, float(ENV('KEYW', '230')), (1, .95, .88), spread=radians(60))
area('rim', (-.12, -.62, .3), (0, 0, .03), .6, .15, float(ENV('RIMW', '200')), (1, .9, .78), spread=radians(50))
area('fill', (-.55, .42, .14), (0, 0, .03), .5, .4, float(ENV('FILLW', '35')), (.93, .96, 1), spread=radians(70))
area('top', (0, 0, .9), (0, 0, 0), .6, .6, float(ENV('TOPW', '35')), (1, .97, .93))
# camera keys: (t, camera, target, lens, f-stop)
def V3(dn, dd, z, base=FCW): return base + n_ * dn + d_ * dd + Vector((0, 0, z))
KEYS = [(0.00, V3(-.42, -.55, .30, A_POS), A_POS + Vector((.0, .0, .02)), 50, 9.),
        (0.12, V3(-.36, -.50, .27, A_POS), A_POS + Vector((.01, .0, .02)), 50, 9.),
        (0.28, V3(-.25, -.30, .12, A_POS), A_POS + Vector((.0, .0, .035)) + n_ * .02, 52, 9.),     # low along the sesame crust
        (0.37, V3(.06, -.34 * SIDE_, .17), FCW + Vector((0, 0, .01)), 50, 9.),                      # round the end of the sub
        (0.46, V3(.40, -.05 * SIDE_, .13), FCW + Vector((0, 0, .004)), 50, 10.),                    # in front of the cut: B slides off
        (0.60, V3(.33, -.02 * SIDE_, .10), FCW + Vector((0, 0, .002)), 52, 10.),                    # A's face, full on
        (0.82, MIDF + n_ * .41 + Vector((0, 0, .15)), MIDF + Vector((0, 0, .0)), 50, 11.),           # both cut faces, side by side
        (1.00, MIDF + n_ * .37 + Vector((0, 0, .13)), MIDF + Vector((0, 0, .002)), 50, 11.)]
def place(t, focus):
    for (t0, c0, g0, l0, f0), (t1, c1, g1, l1, f1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smoother((t - t0) / (t1 - t0))
            c, g, lens, fs = c0.lerp(c1, k), g0.lerp(g1, k), l0 + (l1 - l0) * k, f0 + (f1 - f0) * k; break
    cam.location = c; cam.rotation_euler = (g - c).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (focus - c).length
    scn.view_settings.exposure = float(ENV('EV', '-1.1'))

MA = Matrix.Translation(A_POS) @ Matrix.Rotation(ROT0, 4, 'Z')
def state(t):
    A.matrix_world = MA
    # B slides out along the cut, steps aside, turns round on the paper and settles beside A, cut face forward
    s1 = smoother(seg(t, .4, .56)); s3 = smoother(seg(t, .6, .82))
    sep = smoother(seg(t, .36, .4))                                   # part the faces a few mm before sliding (the relief would clash)
    P = (FCW + n_ * .0035 * sep + (PARK - FCW - n_ * .004) * s1).lerp(END_B, s3) + Vector((0, 0, .003 * sin(pi * s1) + .008 * sin(pi * s3)))
    phi = SPIN * radians(180 - 14 * SIDE_ * SPIN) * s3
    B.matrix_world = Matrix.Translation(P) @ Matrix.Rotation(phi, 4, 'Z') @ Matrix.Translation(-FCW) @ MA
    focus = (A_POS + Vector((0, 0, .04))) if t < .34 else FCW.lerp(MIDF, seg(t, .62, .82))
    place(t, focus)
    if ENV('CAM', '') == 'top':
        cam.location = A_POS + Vector((.05, .05, .6)); cam.rotation_euler = (0, 0, 0); cd.lens = 50; cd.dof.use_dof = False

if ENV('CHECK', ''):      # do the halves ever pass through each other?
    from mathutils.bvhtree import BVHTree
    def tree(h):
        ro_ = [c for c in h.children if c.name.endswith('_roll')][0]; M = ro_.matrix_world
        return BVHTree.FromPolygons([M @ v.co for v in ro_.data.vertices], [p.vertices for p in ro_.data.polygons])
    for tt in [i / 40 for i in range(41)]:
        state(tt); bpy.context.view_layer.update()
        print('CHECK t=%.3f overlap=%d' % (tt, len(tree(A).overlap(tree(B)))))

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1440, 900; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.02'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.transmission_bounces = 4; cy.transparent_max_bounces = 4; cy.glossy_bounces = 3; cy.diffuse_bounces = 3
cy.sample_clamp_indirect = 0.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 17
r.use_persistent_data = True
try: scn.view_settings.view_transform = ENV('VIEW', 'Khronos PBR Neutral'); scn.view_settings.look = 'None'
except TypeError: scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast')

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / (N - 1)); r.filepath = fp
    for nm_ in filter(None, ENV('HIDE', '').split(',')):
        for o_ in bpy.data.objects:
            if nm_ in o_.name: o_.hide_render = True
    bpy.ops.render.render(write_still=True)
print('done')
