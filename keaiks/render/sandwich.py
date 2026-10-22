# Keaik's: an Apple-style product film of The Sexy Chick, path-traced in Cycles.
# Brioche, homemade chipotle sauce, lettuce, grilled marinated chicken, melted pepper jack, pickles (their real build).
#   0–16    the finished sandwich on black glass, warm studio light
#   16–56   the layers lift apart into an exploded stack while it turns
#   56–100  exploded hold, slow turn (captions name the layers)
#   100–132 the layers drop back together and settle
#   132–143 camera pushes in on the finished sandwich
# usage: blender -b -P sandwich.py -- <out_dir> [samples] [scale] [frames: all | a-b | n,n,n]
import bpy, bmesh, math, sys, os, random
from math import pi, sin, cos, sqrt, atan2
from mathutils import Vector, Euler
sys.path.insert(0, os.environ.get('BPE_SCRIPTS', ''))
try:
    from bpe_assets import asset
except Exception:
    asset = None

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/sandwich'
SAMPLES = int(argv[1]) if len(argv) > 1 else 32
SCALE = float(argv[2]) if len(argv) > 2 else 1.
FR = argv[3] if len(argv) > 3 else 'all'
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def link(o, parent=None):
    col.objects.link(o)
    if parent: o.parent = parent
    return o
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

# ---------------------------------------------------------------- mesh builders (data API, no ops)
def finish(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    return me

def lathe(name, prof, segs=96, wob=None):
    """prof: [(r, z)] from the bottom axis point round to the top axis point. wob(theta, z) -> radial scale."""
    verts, idx = [], []
    for r, z in prof:
        if r < 1e-6: idx.append([len(verts)]); verts.append((0, 0, z)); continue
        row = []
        for j in range(segs):
            t = 2 * pi * j / segs; s = wob(t, z) if wob else 1.
            row.append(len(verts)); verts.append((r * s * cos(t), r * s * sin(t), z))
        idx.append(row)
    faces = []
    for k in range(len(idx) - 1):
        a, b = idx[k], idx[k + 1]
        for j in range(segs):
            j2 = (j + 1) % segs
            if len(a) == 1: faces.append((a[0], b[j2], b[j]))
            elif len(b) == 1: faces.append((a[j], a[j2], b[0]))
            else: faces.append((a[j], a[j2], b[j2], b[j]))
    return finish(name, verts, faces)

def slab(name, R, top, bot, NR=26, NS=128):
    """a solid with outline radius R(theta), top surface top(x, y), bottom surface bot(x, y)"""
    verts, faces = [], []
    def grid(fz):
        c = len(verts); verts.append((0, 0, fz(0, 0))); rows = []
        for i in range(1, NR + 1):
            row = []
            for j in range(NS):
                t = 2 * pi * j / NS; r = R(t) * i / NR; x, y = r * cos(t), r * sin(t)
                row.append(len(verts)); verts.append((x, y, fz(x, y)))
            rows.append(row)
        return c, rows
    ct, T = grid(top); cb, Bm = grid(bot)
    for j in range(NS):
        j2 = (j + 1) % NS
        faces.append((ct, T[0][j], T[0][j2])); faces.append((cb, Bm[0][j2], Bm[0][j]))
        for i in range(NR - 1):
            faces.append((T[i][j], T[i + 1][j], T[i + 1][j2], T[i][j2]))
            faces.append((Bm[i][j], Bm[i][j2], Bm[i + 1][j2], Bm[i + 1][j]))
        faces.append((T[-1][j], Bm[-1][j], Bm[-1][j2], T[-1][j2]))
    return finish(name, verts, faces)

def smooth_prof(pts, n=6):
    """Catmull-Rom densify a profile so the lathe reads as a soft bake, not facets"""
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3) for d in (0, 1)))
    out.append(pts[-1]); return out

# ---------------------------------------------------------------- shader helpers
class NT:
    def __init__(s, name):
        s.m = bpy.data.materials.new(name); s.m.use_nodes = True; s.t = s.m.node_tree; s.t.nodes.clear()
        s.out = s.n('ShaderNodeOutputMaterial'); s.tc = s.n('ShaderNodeTexCoord')
    def n(s, kind, **kw):
        nd = s.t.nodes.new(kind)
        for k, v in kw.items(): setattr(nd, k, v)
        return nd
    def L(s, a, b): s.t.links.new(a, b)
    def noise(s, scale, detail=4, rough=.55, vec=None):
        nz = s.n('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = detail; nz.inputs['Roughness'].default_value = rough
        s.L(vec or s.tc.outputs['Object'], nz.inputs['Vector']); return nz
    def ramp(s, fac, stops):
        cr = s.n('ShaderNodeValToRGB'); e = cr.color_ramp; e.elements[0].position = stops[0][0]; e.elements[0].color = hexc(stops[0][1])
        e.elements[1].position = stops[-1][0]; e.elements[1].color = hexc(stops[-1][1])
        for p, c in stops[1:-1]: el = e.elements.new(p); el.color = hexc(c)
        s.L(fac, cr.inputs[0]); return cr
    def math(s, op, a, b=None, clamp=False):
        m = s.n('ShaderNodeMath'); m.operation = op; m.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: s.L(v, m.inputs[i])
        return m.outputs[0]
    def mixc(s, fac, a, b):
        m = s.n('ShaderNodeMix'); m.data_type = 'RGBA'; s.L(fac, m.inputs[0])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, str): sock.default_value = hexc(v)
            else: s.L(v, sock)
        return m.outputs[2]
    def bump(s, h, strength, dist, normal=None):
        b = s.n('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = dist; s.L(h, b.inputs['Height'])
        if normal is not None: s.L(normal, b.inputs['Normal'])
        return b.outputs[0]
    def bsdf(s, **kw):
        b = s.n('ShaderNodeBsdfPrincipled')
        for k, v in kw.items():
            if isinstance(v, str): b.inputs[k].default_value = hexc(v)
            elif isinstance(v, tuple): b.inputs[k].default_value = v
            elif isinstance(v, (int, float)): b.inputs[k].default_value = v
            else: s.L(v, b.inputs[k])
        return b

def bun_mat(name, cut_sign, hmax, stops):
    s = NT(name); o = s.tc.outputs
    sep = s.n('ShaderNodeSeparateXYZ'); s.L(o['Object'], sep.inputs[0])
    nsep = s.n('ShaderNodeSeparateXYZ'); s.L(o['Normal'], nsep.inputs[0])
    hz = s.math('DIVIDE', sep.outputs['Z'], hmax)
    lum = s.noise(3.5, 5, .62)
    hj = s.math('ADD', hz, s.math('MULTIPLY', s.math('SUBTRACT', lum.outputs['Fac'], .5), .45))
    crust = s.ramp(hj, stops)
    # toasted crumb on the cut face: pale with golden toast patches and pores
    tz = s.noise(5, 5)
    crumb = s.ramp(tz.outputs['Fac'], [(.3, '#efcf92'), (.5, '#d9a457'), (.68, '#b06a2a'), (.8, '#8a4a1a')])
    cut = s.n('ShaderNodeMapRange'); cut.clamp = True; cut.inputs['From Min'].default_value = .55; cut.inputs['From Max'].default_value = .85
    s.L(s.math('MULTIPLY', nsep.outputs['Z'], cut_sign), cut.inputs['Value'])
    base = s.mixc(cut.outputs[0], crust.outputs[0], crumb.outputs[0])
    pores = s.n('ShaderNodeTexVoronoi'); pores.inputs['Scale'].default_value = 70; s.L(o['Object'], pores.inputs['Vector'])
    fine = s.noise(40, 6)
    wr = s.noise(7, 3)
    h = s.math('ADD', s.math('ADD', s.math('MULTIPLY', pores.outputs['Distance'], cut.outputs[0]), s.math('MULTIPLY', fine.outputs['Fac'], .25)), s.math('MULTIPLY', wr.outputs['Fac'], .6))
    rough = s.n('ShaderNodeMapRange'); rough.inputs['To Min'].default_value = .45; rough.inputs['To Max'].default_value = .85; s.L(cut.outputs[0], rough.inputs['Value'])
    coat = s.n('ShaderNodeMapRange'); coat.inputs['To Min'].default_value = .55; coat.inputs['To Max'].default_value = 0.; s.L(cut.outputs[0], coat.inputs['Value'])
    b = s.bsdf(**{'Base Color': base, 'Roughness': rough.outputs[0], 'Coat Weight': coat.outputs[0], 'Coat Roughness': .24,
                  'Subsurface Weight': .04, 'Subsurface Radius': (.3, .18, .08), 'Subsurface Scale': .05, 'Normal': s.bump(h, .35, .004), 'Coat Normal': s.bump(wr.outputs['Fac'], .5, .01)})
    s.L(b.outputs[0], s.out.inputs[0]); return s.m

def chicken_mat():
    s = NT('chicken'); o = s.tc.outputs
    mot = s.noise(4.5, 6, .6)
    base = s.ramp(mot.outputs['Fac'], [(.28, '#d9a95c'), (.45, '#b37a36'), (.6, '#8a5424'), (.78, '#553012')])
    # grill marks across the top: rotated bands, sharp, broken by noise
    mp = s.n('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, .55); s.L(o['Object'], mp.inputs['Vector'])
    wv = s.n('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.7; wv.inputs['Distortion'].default_value = 1.6; wv.inputs['Detail'].default_value = 2; s.L(mp.outputs[0], wv.inputs['Vector'])
    gm = s.n('ShaderNodeMapRange'); gm.clamp = True; gm.inputs['From Min'].default_value = .78; gm.inputs['From Max'].default_value = .95; s.L(wv.outputs['Fac'], gm.inputs['Value'])
    nsep = s.n('ShaderNodeSeparateXYZ'); s.L(o['Normal'], nsep.inputs[0])
    up = s.n('ShaderNodeMapRange'); up.clamp = True; up.inputs['From Min'].default_value = .45; up.inputs['From Max'].default_value = .8; s.L(nsep.outputs['Z'], up.inputs['Value'])
    gate = s.noise(9, 2)
    gmask = s.math('MULTIPLY', s.math('MULTIPLY', gm.outputs[0], up.outputs[0]), s.math('GREATER_THAN', gate.outputs['Fac'], .36))
    col = s.mixc(s.math('MULTIPLY', gmask, .92), base.outputs[0], '#1e0c04')
    fib = s.noise(24, 8, .7)
    h = s.math('SUBTRACT', s.math('MULTIPLY', fib.outputs['Fac'], .6), s.math('MULTIPLY', gmask, .5))
    b = s.bsdf(**{'Base Color': col, 'Roughness': .4, 'Coat Weight': .45, 'Coat Roughness': .16,
                  'Normal': s.bump(h, .6, .01)})
    s.L(b.outputs[0], s.out.inputs[0]); return s.m

def cheese_mat():
    s = NT('pepperjack'); o = s.tc.outputs
    fl = s.n('ShaderNodeTexVoronoi'); fl.inputs['Scale'].default_value = 16; fl.inputs['Randomness'].default_value = 1; s.L(o['Object'], fl.inputs['Vector'])
    dots = s.math('LESS_THAN', fl.outputs['Distance'], .12)
    pick = s.math('GREATER_THAN', fl.outputs['Color'], .55)
    fleck = s.mixc(pick, '#4e7a1e', '#c0321e')
    sheen = s.noise(6, 3)
    base = s.ramp(sheen.outputs['Fac'], [(.35, '#f6e6b0'), (.65, '#efd384')])
    col = s.mixc(s.math('MULTIPLY', dots, .85), base.outputs[0], fleck)
    b = s.bsdf(**{'Base Color': col, 'Roughness': .3, 'Subsurface Weight': .55, 'Subsurface Radius': (1, .8, .45), 'Subsurface Scale': .06,
                  'Coat Weight': .2, 'Coat Roughness': .18, 'Normal': s.bump(sheen.outputs['Fac'], .15, .01)})
    s.L(b.outputs[0], s.out.inputs[0]); return s.m

def lettuce_mat():
    s = NT('lettuce'); o = s.tc.outputs
    g = s.n('ShaderNodeTexGradient'); g.gradient_type = 'SPHERICAL'
    mp = s.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.8, .8, .8); s.L(o['Object'], mp.inputs['Vector']); s.L(mp.outputs[0], g.inputs['Vector'])
    vein = s.noise(14, 2)
    col = s.ramp(s.math('ADD', g.outputs['Fac'], s.math('MULTIPLY', vein.outputs['Fac'], .2)), [(.0, '#5f9a27'), (.35, '#8cbf3c'), (.7, '#cfe08e'), (1, '#e9f0c4')])
    b = s.bsdf(**{'Base Color': col.outputs[0], 'Roughness': .28, 'Subsurface Weight': .4, 'Subsurface Radius': (.5, 1, .3), 'Subsurface Scale': .02,
                  'Normal': s.bump(vein.outputs['Fac'], .3, .006)})
    tr = s.n('ShaderNodeBsdfTranslucent'); s.L(col.outputs[0], tr.inputs['Color'])
    mx = s.n('ShaderNodeMixShader'); mx.inputs[0].default_value = .22; s.L(b.outputs[0], mx.inputs[1]); s.L(tr.outputs[0], mx.inputs[2])
    s.L(mx.outputs[0], s.out.inputs[0]); return s.m

def pickle_mat():
    s = NT('pickle'); o = s.tc.outputs
    sep = s.n('ShaderNodeSeparateXYZ'); s.L(o['Object'], sep.inputs[0])
    r = s.math('DIVIDE', s.math('SQRT', s.math('ADD', s.math('MULTIPLY', sep.outputs['X'], sep.outputs['X']), s.math('MULTIPLY', sep.outputs['Y'], sep.outputs['Y']))), .3)
    seeds = s.n('ShaderNodeTexVoronoi'); seeds.inputs['Scale'].default_value = 34; s.L(o['Object'], seeds.inputs['Vector'])
    rr = s.math('ADD', r, s.math('MULTIPLY', seeds.outputs['Distance'], .12))
    col = s.ramp(rr, [(0, '#d8d47c'), (.42, '#ccc35a'), (.55, '#b9b23a'), (.86, '#a6a531'), (.93, '#56651a'), (1, '#3f4d12')])
    b = s.bsdf(**{'Base Color': col.outputs[0], 'Roughness': .14, 'Subsurface Weight': .6, 'Subsurface Radius': (.7, 1, .25), 'Subsurface Scale': .04,
                  'Normal': s.bump(seeds.outputs['Distance'], .2, .003)})
    s.L(b.outputs[0], s.out.inputs[0]); return s.m

def sauce_mat():
    s = NT('chipotle'); nz = s.noise(5, 2)
    col = s.ramp(nz.outputs['Fac'], [(.35, '#f2b07a'), (.65, '#e6915a')])
    b = s.bsdf(**{'Base Color': col.outputs[0], 'Roughness': .16, 'Subsurface Weight': .35, 'Subsurface Radius': (1, .5, .3), 'Subsurface Scale': .03,
                  'Normal': s.bump(nz.outputs['Fac'], .1, .01)})
    s.L(b.outputs[0], s.out.inputs[0]); return s.m

def floor_mat():
    s = NT('glass_floor')
    b = s.bsdf(**{'Base Color': '#000000', 'Roughness': .2, 'Specular IOR Level': .5})
    sep = s.n('ShaderNodeSeparateXYZ'); s.L(s.tc.outputs['Object'], sep.inputs[0])
    r = s.math('SQRT', s.math('ADD', s.math('MULTIPLY', sep.outputs['X'], sep.outputs['X']), s.math('MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
    fade = s.n('ShaderNodeMapRange'); fade.clamp = True; fade.inputs['From Min'].default_value = 1.1; fade.inputs['From Max'].default_value = 2.3; s.L(r, fade.inputs['Value'])
    blk = s.n('ShaderNodeBsdfDiffuse'); blk.inputs['Color'].default_value = (0, 0, 0, 1)
    mx = s.n('ShaderNodeMixShader'); s.L(fade.outputs[0], mx.inputs[0]); s.L(b.outputs[0], mx.inputs[1]); s.L(blk.outputs[0], mx.inputs[2])
    s.L(mx.outputs[0], s.out.inputs[0]); return s.m

# ---------------------------------------------------------------- the build (units: bun radius = 1)
stack = link(bpy.data.objects.new('stack', None))
def wob_bun(t, z): return 1 + .018 * sin(3 * t + 1.1 + z * 3) + .01 * sin(7 * t + .4 + z * 5) + .006 * sin(13 * t + z * 9)

top_prof = [(0, 0), (.4, 0), (.8, 0), (.95, .004), (.995, .02)]
for k in range(1, 15):
    ph = (pi / 2) * k / 14
    top_prof.append((1.015 * cos(ph) ** .78 * (1 + .025 * sin(ph * 2.2)), .035 + .66 * sin(ph) ** 1.2))
top_prof[-1] = (0, top_prof[-1][1])
TOP_H = top_prof[-1][1]
bot_prof = [(0, 0), (.45, -.002), (.86, .004), (.95, .02), (.99, .06), (1.0, .12), (.995, .19), (.98, .24), (.955, .262), (.9, .27), (.55, .274), (0, .272)]
BOT_H = .272
top_bun = link(bpy.data.objects.new('top_bun', lathe('top_bun', smooth_prof(top_prof, 3), 112, wob_bun)), stack)
bot_bun = link(bpy.data.objects.new('bot_bun', lathe('bot_bun', smooth_prof(bot_prof, 3), 112, wob_bun)), stack)
top_bun.data.materials.append(bun_mat('bun_top', -1, TOP_H, [(0, '#e9bf7e'), (.14, '#cf8a3a'), (.32, '#a24f16'), (.55, '#77320c'), (1, '#4a1b05')]))
bot_bun.data.materials.append(bun_mat('bun_bot', 1, BOT_H, [(0, '#b77a3a'), (.3, '#dcae6a'), (.7, '#ecca8e'), (1, '#f1d6a0')]))

def chick_R(t): return 1.1 * (1 + .07 * sin(2 * t + .5) + .045 * sin(3 * t + 1.3) + .025 * sin(5 * t + 2.2) + .012 * sin(9 * t))
def chick_q(x, y):
    t = atan2(y, x); return min(1., sqrt(x * x + y * y) / chick_R(t))
CH_T = .24
def chick_top(x, y):
    q = chick_q(x, y); return CH_T * max(0., 1 - q ** 2.4) ** .55 + .012 * sin(3.1 * x + 1) * sin(2.3 * y)
def chick_bot(x, y):
    q = chick_q(x, y); return -.035 * max(0., 1 - q ** 2) ** .6
chicken = link(bpy.data.objects.new('chicken', slab('chicken', chick_R, chick_top, chick_bot, 30, 140)), stack)
chicken.data.materials.append(chicken_mat())

def cheese_R(t, a=1.0, n=6.):
    t2 = t - .35; return a / (abs(cos(t2)) ** n + abs(sin(t2)) ** n) ** (1 / n)
def cheese_top(x, y):
    r = sqrt(x * x + y * y); t = atan2(y, x); q = r / chick_R(t)
    under = CH_T * max(0., 1 - min(q, 1.) ** 2.4) ** .55
    droop = .55 * max(0., q - .93) ** 1.5
    return under + .016 - droop
def cheese_bot(x, y): return cheese_top(x, y) - .022
cheese = link(bpy.data.objects.new('cheese', slab('cheese', cheese_R, cheese_top, cheese_bot, 30, 160)), stack)
cheese.data.materials.append(cheese_mat())

def let_R(t): return 1.16 + .07 * sin(9 * t + .3) + .04 * sin(15 * t + 1)
def let_top(x, y):
    r = sqrt(x * x + y * y); t = atan2(y, x)
    return .045 * sin(11 * t + 4 * r) * r ** 1.6 + .02 * sin(23 * t + 7 * r) * r ** 2 - .07 * max(0., r - .85) ** 1.5
lettuce = link(bpy.data.objects.new('lettuce', slab('lettuce', let_R, let_top, lambda x, y: let_top(x, y) - .008, 26, 220)), stack)
lettuce.data.materials.append(lettuce_mat())

def sauce_R(t): return .9 + .05 * sin(5 * t + .7) + .03 * sin(11 * t + 2)
def sauce_top(x, y):
    t = atan2(y, x); q = min(1., sqrt(x * x + y * y) / sauce_R(t)); return .05 * max(0., 1 - q ** 4) ** .5 + .006 * sin(6 * x) * sin(5 * y)
sauce = link(bpy.data.objects.new('sauce', slab('sauce', sauce_R, sauce_top, lambda x, y: 0., 18, 128)), stack)
sauce.data.materials.append(sauce_mat())

PK = .3
def pk_R(t): return PK * (1 + .045 * sin(18 * t))
pm = slab('pickle', pk_R, lambda x, y: .034 + .012 * (x * x + y * y) / (PK * PK), lambda x, y: .012 * (x * x + y * y) / (PK * PK), 10, 72)
pm.materials.append(pickle_mat())
PICKLES = []
for k, (ang, rad) in enumerate(((.2, .42), (1.35, .48), (2.5, .4), (3.6, .5), (4.7, .44), (5.75, .47), (0, 0))):
    x, y = rad * cos(ang), rad * sin(ang)
    o = link(bpy.data.objects.new('pickle', pm), stack)
    e = .006; nx = -(cheese_top(x + e, y) - cheese_top(x - e, y)) / (2 * e); ny = -(cheese_top(x, y + e) - cheese_top(x, y - e)) / (2 * e)
    o.rotation_euler = Vector((nx, ny, 1)).normalized().to_track_quat('Z', 'Y').to_euler(); o.rotation_euler.rotate_axis('Z', random.uniform(0, 6.28))
    PICKLES.append((o, (x, y, cheese_top(x, y) + .003 + k * .002)))   # z relative to the cheese origin

def displace(o, size, strength, seed_off):
    tx = bpy.data.textures.new(o.name + '_lumps', 'CLOUDS'); tx.noise_scale = size; tx.noise_depth = 2
    m = o.modifiers.new('lumps', 'DISPLACE'); m.texture = tx; m.strength = strength; m.mid_level = .5; m.texture_coords = 'OBJECT'
    e = bpy.data.objects.new(o.name + '_tx', None); link(e); e.location = (seed_off, seed_off * .7, 0); m.texture_coords_object = e
displace(top_bun, .45, .035, 3.1); displace(bot_bun, .5, .02, 5.3); displace(chicken, .22, .045, 1.7); displace(cheese, .5, .012, 2.2)

# ---------------------------------------------------------------- assembled heights vs exploded heights
# (object, assembled xyz, extra lift when exploded, small exploded tilt)
Z_SAUCE, Z_LET, Z_CH = BOT_H - .004, BOT_H + .026, BOT_H + .07
LAYERS = [
    (bot_bun, (0, 0, 0), 0., (0, 0)),
    (sauce, (0, 0, Z_SAUCE), .32, (.02, -.03)),
    (lettuce, (0, 0, Z_LET), .66, (-.05, .04)),
    (chicken, (0, 0, Z_CH), 1.04, (.06, -.04)),
    (cheese, (0, 0, Z_CH + .04), 1.44, (-.04, .05)),
]
PK_LIFT = 1.84
TOP_Z = Z_CH + CH_T + .11
LAYERS.append((top_bun, (0, 0, TOP_Z), 2.3, (-.05, -.04)))

def ease(t): t = min(1, max(0, t)); return t * t * (3 - 2 * t)
def lift(f, i, n):
    """0 assembled → 1 exploded; layers leave from the top down and land from the bottom up"""
    up = ease((f - 16 - (n - 1 - i) * 2.2) / 30.)           # top layers lift first
    dn = ease((f - 100 - i * 2.4) / 22.)                     # bottom layers land first
    v = up * (1 - dn)
    # a small settle bounce as each layer lands
    land = f - 100 - i * 2.4 - 22
    if 0 < land < 8: v -= .025 * sin(pi * land / 8)
    return v
N = len(LAYERS)
for f in range(0, 144):
    for i, (o, base, dz, tilt) in enumerate(LAYERS):
        v = lift(f, i, N)
        o.location = (base[0], base[1], base[2] + dz * v); o.keyframe_insert('location', frame=f)
        o.rotation_euler = (tilt[0] * v, tilt[1] * v, o.rotation_euler.z); o.keyframe_insert('rotation_euler', frame=f)
    v = lift(f, len(LAYERS) - 1.5, N)
    for k, (o, p) in enumerate(PICKLES):
        o.location = (p[0] * (1 + .25 * v), p[1] * (1 + .25 * v), Z_CH + .04 + p[2] + PK_LIFT * v + .03 * v * sin(k * 1.7)); o.keyframe_insert('location', frame=f)
for a in bpy.data.actions:
    for fc in a.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# the whole stack turns slowly
for f, rz in ((0, -.42), (143, .62)):
    stack.rotation_euler = (0, 0, rz); stack.keyframe_insert('rotation_euler', frame=f)

# ---------------------------------------------------------------- set: black glass floor, black world, warm studio light
fl = bpy.data.meshes.new('floor'); fl.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
# (no floor: the sandwich floats in black, like a product shot)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment')
hdri = asset('studio_small_09_1k.hdr') if asset else os.path.join(os.path.dirname(__file__), 'studio_small_09_1k.hdr')
env.image = bpy.data.images.load(hdri)
bgn = wn.nodes.new('ShaderNodeBackground'); bgn.inputs[1].default_value = .012
lp = wn.nodes.new('ShaderNodeLightPath'); blk = wn.nodes.new('ShaderNodeBackground'); blk.inputs[0].default_value = (0, 0, 0, 1)
mix = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bgn.inputs[0]); wn.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
wn.links.new(bgn.outputs[0], mix.inputs[1]); wn.links.new(blk.outputs[0], mix.inputs[2]); wn.links.new(mix.outputs[0], wo.inputs[0])
def area(name, loc, size, power, color, sy=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = size; l.size_y = sy or size; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc; o.visible_camera = False
    d = Vector((0, 0, 1.1)) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o
area('key', (-3.8, .8, 3.6), 2.4, 1300, (1, .84, .66))
area('rim', (2.8, 3.6, 2.8), .5, 1100, (1, .78, .55), 4)
area('rim2', (-3.2, 3.2, 2.0), .4, 650, (1, .9, .8), 3)
area('fill', (2.5, -5, 1.6), 3, 160, (1, .95, .9))
area('front', (-1.5, -4.5, 3.2), 1.6, 380, (1, .9, .78))
area('top', (0, 0, 6), 2, 260, (1, .95, .88))

# ---------------------------------------------------------------- camera
cd = bpy.data.cameras.new('cam'); cd.lens = 50; cd.sensor_width = 36; cd.dof.use_dof = True; cd.dof.aperture_fstop = 5.6
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
tgt = link(bpy.data.objects.new('tgt', None)); cd.dof.focus_object = tgt
tc_ = cam.constraints.new('TRACK_TO'); tc_.target = tgt; tc_.track_axis = 'TRACK_NEGATIVE_Z'; tc_.up_axis = 'UP_Y'
# each key: (frame, azimuth°, elevation°, lens, f-stop, (low, high) band of the frame height the sandwich fills).
# The top of the frame stays clear for the page's captions; the solver finds distance and target height per key.
KEYS = [
    (0, 0, 11, 55, 5.6, (.1, .52)),
    (16, 4, 11, 55, 5.6, (.1, .52)),
    (36, 8, 12, 52, 7., (.08, .6)),
    (56, 12, 13, 50, 8., (.07, .64)),
    (100, -8, 13, 50, 8., (.07, .64)),
    (118, -5, 12, 52, 7., (.08, .6)),
    (132, -2, 11, 55, 5.6, (.1, .54)),
    (143, 0, 9, 60, 4., (.06, .6)),
]
from bpy_extras.object_utils import world_to_camera_view
SAMPLE = []
for o in [l[0] for l in LAYERS] + [p_[0] for p_ in PICKLES]:
    vs = o.data.vertices; SAMPLE += [(o, vs[i].co.copy()) for i in range(0, len(vs), 7)]
def solve(f, az, el, lens, band):
    scn.frame_set(f); cd.lens = lens; d, tz = 8., .8
    dirv = Vector((sin(math.radians(az)) * cos(math.radians(el)), -cos(math.radians(az)) * cos(math.radians(el)), sin(math.radians(el))))
    for _ in range(40):
        tgt.location = (0, 0, tz); cam.location = tgt.location + dirv * d; bpy.context.view_layer.update()
        ys = [world_to_camera_view(scn, cam, o.matrix_world @ c).y for o, c in SAMPLE]
        lo, hi = min(ys), max(ys)
        d *= (hi - lo) / (band[1] - band[0])
        vis = 2 * d * (cd.sensor_width * 9 / 16 / 2) / lens
        tz += ((lo + hi) / 2 - (band[0] + band[1]) / 2) * vis
    return cam.location.copy(), Vector((0, 0, tz))
SOLVED = [(f, *solve(f, az, el, lens, band), lens, fs) for f, az, el, lens, fs, band in KEYS]
for f, c, t, lens, fs in SOLVED:
    cam.location = c; cam.keyframe_insert('location', frame=f); tgt.location = t; tgt.keyframe_insert('location', frame=f)
    cd.lens = lens; cd.keyframe_insert('lens', frame=f); cd.dof.aperture_fstop = fs; cd.dof.keyframe_insert('aperture_fstop', frame=f)
scn.frame_start, scn.frame_end = 0, 143

# ---------------------------------------------------------------- render
r = scn.render; r.resolution_x, r.resolution_y = 1280, 720; r.resolution_percentage = int(100 * SCALE); r.use_persistent_data = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 3; cy.diffuse_bounces = 2; cy.transmission_bounces = 4
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 6; cy.seed = 5
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
if FR == 'check':   # print where the subject sits in frame (0 = bottom/left, 1 = top/right) for the key frames
    from bpy_extras.object_utils import world_to_camera_view
    for f in (0, 16, 36, 56, 76, 100, 118, 132, 143):
        scn.frame_set(f); xs, ys = [], []; os.makedirs(OUT, exist_ok=True)
        for o in [l[0] for l in LAYERS] + [p_[0] for p_ in PICKLES]:
            for c in o.bound_box:
                v = world_to_camera_view(scn, cam, o.matrix_world @ Vector(c)); xs.append(v.x); ys.append(v.y)
        with open(os.path.join(OUT, 'framing.txt'), 'a') as fh: fh.write(f'frame {f:3d}  x {min(xs):.2f}-{max(xs):.2f}  y {min(ys):.2f}-{max(ys):.2f}\n')
    raise SystemExit
os.makedirs(OUT, exist_ok=True)
if FR == 'all': frames = range(0, 144)
elif '-' in FR: a, b_ = FR.split('-'); frames = range(int(a), int(b_) + 1)
else: frames = [int(x) for x in FR.split(',')]
for f in frames:
    p = os.path.join(OUT, f's{f:03d}.png')
    if os.path.exists(p) and os.path.getsize(p) > 0: continue
    scn.frame_set(f); r.filepath = p; bpy.ops.render.render(write_still=True)
print('done')
