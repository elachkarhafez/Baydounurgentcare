# Golden Era Barbershop: the gold barber pole from their GE logo, mounted on a reclaimed-wood wall like the one in
# their team photos. Stripes in their cape colours (black, gold, white). Hero scroll film.
# Beats: dark wall, the pole off -> the lamp flickers on -> up to the polished gold crown -> down the glass while the
#        stripes turn -> pull back to the whole pole on the wall.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=108] [samples=64] [scale=1]
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 108
SAMPLES = int(argv[3]) if len(argv) > 3 else 64
SCALE = float(argv[4]) if len(argv) > 4 else 1.
random.seed(3)


def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a))
def smoother(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)
ENV = lambda k, d: os.environ.get('GE_' + k, d)

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


def lathe(name, prof, steps=192, parent=None):
    """prof: (r, z) from the axis out and back to the axis, spun round Z into a closed solid."""
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)
def side(r, z0, z1, step=.006, edge=.0004):
    """points up a straight wall, with extra rings right at the ends so smooth shading stays flat"""
    n = max(2, int((z1 - z0) / step)); zs = [z0 + edge] + [z0 + (z1 - z0) * i / n for i in range(1, n)] + [z1 - edge]
    return [(r, z) for z in zs]
def arc(r0, z0, rr, zz, a0, a1, n=10):
    return [(r0 + rr * cos(a), z0 + zz * sin(a)) for a in np.linspace(a0, a1, n)]

# ------------------------------------------------------------------ the pole (metres): glass 44 cm, gold crown and foot
GR, GH, ST = .074, .44, .060          # glass radius, glass height, striped drum radius
pole = obj('pole', None)

GOLD = Mat('gold')
nz = GOLD.n('ShaderNodeTexNoise', Scale=420., Detail=2.)
b = GOLD.bsdf(**{'Base Color': srgb('#f1c35a'), 'Metallic': 1., 'Coat Weight': .0})
GOLD.l(GOLD.mrange(nz.outputs['Fac'], .35, .65, .1, .17), b.inputs['Roughness'])
GOLD = GOLD.done(b.outputs[0])

# crown: collar with two beads, a dome, a neck and the ball finial
top = [(0., GH - .004), (.0805, GH - .004), (.0805, GH + .002)]
top += arc(.0805, GH + .0055, .0035, .0035, -pi / 2, pi / 2, 8)                       # bead
top += [(.0790, GH + .010), (.0790, GH + .014)]
top += arc(.0790, GH + .0175, .0035, .0035, -pi / 2, pi / 2, 8)
top += [(.0765, GH + .022)]
top += [(.0765 * cos(q), GH + .022 + .052 * sin(q)) for q in np.linspace(0, pi / 2 - .16, 16)]   # dome
top += [(.0115, GH + .076), (.0095, GH + .082), (.0105, GH + .086)]                    # neck
top += [(.022 * sin(q), GH + .108 - .022 * cos(q)) for q in np.linspace(.48, pi, 18)]  # ball
crown = lathe('crown', top, parent=pole); crown.data.materials.append(GOLD)
# foot: the same, upside down, with a teardrop finial
bot = [(0., .004), (.0805, .004), (.0805, -.002)]
bot += arc(.0805, -.0055, .0035, .0035, pi / 2, -pi / 2, 8)
bot += [(.0790, -.010), (.0790, -.014)]
bot += arc(.0790, -.0175, .0035, .0035, pi / 2, -pi / 2, 8)
bot += [(.0765, -.022)]
bot += [(.0765 * cos(q), -.022 - .046 * sin(q)) for q in np.linspace(0, pi / 2 - .18, 16)]
bot += [(.0110, -.070), (.0090, -.075)]
bot += [(.016 * sin(q), -.092 + .016 * cos(q)) for q in np.linspace(.35, pi * .78, 14)] + [(.006, -.116), (0., -.122)]
foot = lathe('foot', bot, parent=pole); foot.data.materials.append(GOLD)

# glass tube
GLASS = Mat('glass')
b = GLASS.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.5, 'Roughness': .0})
lp = GLASS.n('ShaderNodeLightPath'); tr = GLASS.n('ShaderNodeBsdfTransparent'); mx = GLASS.n('ShaderNodeMixShader')
GLASS.l(lp.outputs['Is Shadow Ray'], mx.inputs[0]); GLASS.l(b.outputs[0], mx.inputs[1]); GLASS.l(tr.outputs[0], mx.inputs[2])
GLASS = GLASS.done(mx.outputs[0])
gp = [(GR - .0021, -.001), (GR - .0004, -.001), (GR, -.001)] + side(GR, -.001, GH + .001) + [(GR, GH + .001), (GR - .0004, GH + .001), (GR - .0021, GH + .001)] + side(GR - .0025, -.001, GH + .001)[::-1] + [(GR - .0021, -.001)]
glass = lathe('glass', gp, parent=pole)
glass.data.materials.append(GLASS)

# the striped drum: helix bands that light up from inside and turn with the scroll
SM = Mat('stripes')
tc = SM.n('ShaderNodeTexCoord'); sx = SM.n('ShaderNodeSeparateXYZ'); SM.l(tc.outputs['Object'], sx.inputs[0])
ang = SM.math('ARCTAN2', sx.outputs['Y'], sx.outputs['X'])
SPIN = SM.n('ShaderNodeValue', name='SPIN'); GLOW = SM.n('ShaderNodeValue', name='GLOW')
h = SM.math('ADD', SM.math('ADD', SM.math('MULTIPLY', ang, 4 / (2 * pi)), SM.math('MULTIPLY', sx.outputs['Z'], 10.)), SPIN.outputs[0])   # 4 bands round, ~45 degrees
f = SM.math('FRACT', h)
# black .36 | white .14 | gold .36 | white .14, with soft printed edges
e = .006
blk = SM.math('MULTIPLY', SM.mrange(f, 0., e), SM.mrange(f, .36 + e, .36))
gld = SM.math('MULTIPLY', SM.mrange(f, .50, .50 + e), SM.mrange(f, .86 + e, .86))
base = SM.mix(gld, SM.mix(blk, srgb('#f4f1ea'), srgb('#0d0c0b')), srgb('#c08419'))
glow = SM.mix(gld, SM.mix(blk, srgb('#fff4e2'), srgb('#000000')), srgb('#8a5a12'))
b = SM.bsdf(Roughness=.32, **{'Subsurface Weight': .0, 'Coat Weight': .4, 'Coat Roughness': .1})
SM.l(base, b.inputs['Base Color']); SM.l(glow, b.inputs['Emission Color']); SM.l(GLOW.outputs[0], b.inputs['Emission Strength'])
SM = SM.done(b.outputs[0])
drum = lathe('drum', [(0., .004), (ST - .0006, .004)] + side(ST, .004, GH - .004) + [(ST - .0006, GH - .004), (0., GH - .004)], parent=pole)
drum.data.materials.append(SM)

# brackets to the wall: two gold arms and round wall plates
WALL_Y = .165
def rod(name, p0, p1, r):
    bm = bmesh.new(); L = (Vector(p1) - Vector(p0)).length
    bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=r, radius2=r, depth=L)
    o = obj(name, bm_mesh(name, bm), pole); o.location = (Vector(p0) + Vector(p1)) / 2
    o.rotation_euler = (Vector(p1) - Vector(p0)).to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(GOLD); return o
for z in (GH + .045, -.045):
    rod('arm', (0, .06, z), (0, WALL_Y, z), .0075)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=.03, radius2=.026, depth=.008)
    o = obj('plate', bm_mesh('plate', bm), pole); o.location = (0, WALL_Y - .004, z); o.rotation_euler = (radians(90), 0, 0); o.data.materials.append(GOLD)

# ------------------------------------------------------------------ the wall: reclaimed planks like their shop
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.6)
wall = obj('wall', bm_mesh('wall', bm, False)); wall.rotation_euler = (radians(90), 0, 0); wall.location = (0, WALL_Y, .2)
uv = wall.data.uv_layers.new(name='UVMap')
WM = Mat('wood')
tcw = WM.n('ShaderNodeTexCoord'); mpw = WM.n('ShaderNodeMapping'); mpw.inputs['Scale'].default_value = (1.25, 1.25, 1.25); WM.l(tcw.outputs['Object'], mpw.inputs['Vector'])
def wtex(name, cs='Non-Color'):
    t = WM.n('ShaderNodeTexImage', interpolation='Cubic'); t.image = bpy.data.images.load(asset('tex/' + name)); t.image.colorspace_settings.name = cs
    WM.l(mpw.outputs[0], t.inputs[0]); return t
wc, wn, wr = wtex('wood_color.jpg', 'sRGB'), wtex('wood_normal.jpg'), wtex('wood_rough.jpg')
# per-plank tone shifts (their wall mixes grey, brown and near-white boards)
sxw = WM.n('ShaderNodeSeparateXYZ'); WM.l(mpw.outputs[0], sxw.inputs[0])
plank = WM.math('FLOOR', WM.math('MULTIPLY', sxw.outputs['Y'], 8.))
wn_ = WM.n('ShaderNodeTexWhiteNoise', noise_dimensions='1D'); WM.l(plank, wn_.inputs['W'])
hsv = WM.n('ShaderNodeHueSaturation'); WM.l(wc.outputs['Color'], hsv.inputs['Color'])
WM.l(WM.mrange(wn_.outputs['Value'], 0., 1., .55, 1.35), hsv.inputs['Value']); WM.l(WM.mrange(wn_.outputs['Value'], 0., 1., .6, 1.05), hsv.inputs['Saturation'])
nm = WM.n('ShaderNodeNormalMap', Strength=1.4); WM.l(wn.outputs['Color'], nm.inputs['Color'])
b = WM.bsdf(**{'Specular IOR Level': .3})
WM.l(hsv.outputs['Color'], b.inputs['Base Color']); WM.l(wr.outputs['Color'], b.inputs['Roughness']); WM.l(nm.outputs[0], b.inputs['Normal'])
wall.data.materials.append(WM.done(b.outputs[0]))

# ------------------------------------------------------------------ light: a dark shop, the pole's own glow, a few hard lines for the gold and glass
LIGHT = float(ENV('LIGHT', '.06'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
area('key', (-.7, -.75, .75), (0, 0, .25), .7, .7, 60, (1, .86, .7), spread=radians(60))
area('rimL', (-.42, .02, .3), (0, 0, .25), .06, .9, 45, (1, .93, .85))
area('rimR', (.42, .0, .32), (0, 0, .25), .06, .9, 40, (1, .93, .85))
area('graze', (0., WALL_Y - .12, 1.05), (0, WALL_Y, -.2), 1.6, .25, 50, (1, .82, .6), spread=radians(30))
halo = area('halo', (0., .105, .22), (0, WALL_Y + 1, .22), .1, .42, 0, (1, .72, .4), spread=radians(150))     # the pole's glow on the wall behind it
halo.visible_glossy = False; halo.visible_transmission = False
# reflection cards for the gold (seen only in reflections)
card = Mat('card'); em = card.n('ShaderNodeEmission', Strength=float(ENV('CARD', '18'))); CARD = card.done(em.outputs[0])
try: CARD.cycles.emission_sampling = 'NONE'
except Exception: pass
for nm_, loc_, sz in (('cardL', (-.32, -.42, .38), (.12, .7)), ('cardR', (.36, -.3, .5), (.05, .6)), ('cardT', (.0, -.25, .95), (.6, .2))):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(sz[0] * 2, sz[1] * 2, 1), verts=bm.verts)
    co = obj(nm_, bm_mesh(nm_, bm, False)); co.data.materials.append(CARD); co.location = loc_
    co.rotation_euler = (Vector((0, 0, .25)) - Vector(loc_)).to_track_quat('Z', 'Y').to_euler()
    co.visible_camera = False; co.visible_diffuse = False; co.visible_shadow = False
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn2 = w.node_tree; wn2.nodes.clear()
env = wn2.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn2.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = float(ENV('WORLD', '.08'))
wo = wn2.nodes.new('ShaderNodeOutputWorld'); wn2.links.new(env.outputs[0], bg.inputs[0]); wn2.links.new(bg.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera: the pole always sits in the right half, captions live on the left
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 50.; cd.clip_start = .01
cd.dof.use_dof = True
cam = obj('cam', cd); scn.camera = cam
# (t, camera xyz, target xyz, lens, f-stop)
KEYS = [(0.00, (-.46, -1.62, .27), (-.21, 0, .22), 50, 6., 0.),
        (0.13, (-.42, -1.48, .28), (-.19, 0, .23), 50, 6., 0.),
        (0.32, (-.16, -.50, .58), (-.045, 0, .47), 55, 2.8, -.3),
        (0.48, (.13, -.47, .33), (-.05, 0, .30), 55, 2.8, -.5),
        (0.64, (.17, -.37, .17), (-.045, 0, .16), 55, 2.8, -.8),
        (0.82, (-.36, -1.25, .25), (-.17, 0, .22), 50, 5., -.1),
        (1.00, (-.46, -1.62, .27), (-.21, 0, .22), 50, 6., 0.)]
def place(t):
    for (t0, c0, g0, l0, f0, e0), (t1, c1, g1, l1, f1, e1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smoother((t - t0) / (t1 - t0)); L = lambda a, b: [x + (y - x) * k for x, y in zip(a, b)] if isinstance(a, tuple) else a + (b - a) * k
            c, g, lens, fs, ev = Vector(L(c0, c1)), Vector(L(g0, g1)), L(l0, l1), L(f0, f1), L(e0, e1); break
    scn.view_settings.exposure = float(ENV('EV', '0')) + ev
    cam.location = c; cam.rotation_euler = (g - c).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (Vector((0, -GR, g.z)) - c).length

def glow_at(t):
    """the lamp: off, a couple of flickers, then on"""
    if t < .07: return 0.
    for a, b_ in ((.075, .082), (.092, .097)):
        if a <= t < b_: return .55
    if t < .105: return 0.
    return 2.2 * smoother(seg(t, .105, .16))

def state(t):
    g = glow_at(t)
    GLOW.outputs[0].default_value = g
    SPIN.outputs[0].default_value = -2.6 * smoother(seg(t, .12, .95)) - .06 * t     # turns while you scroll; reads as climbing
    on = min(1., g / 2.2)
    bpy.data.lights['graze'].energy = 50 * LIGHT * (.3 + .7 * on)
    bpy.data.lights['halo'].energy = float(ENV('HALO', '420')) * LIGHT * on
    place(t)

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1440, 900; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.02'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 10; cy.transmission_bounces = 8; cy.transparent_max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 2
cy.sample_clamp_indirect = 0.; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 7
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
