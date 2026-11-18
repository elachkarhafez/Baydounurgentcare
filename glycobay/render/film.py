# GlycoBay: the diabetic-friendly smart vending machine, built from code and filmed coming online. Hero scroll film.
# Black satin cabinet with a glass door, five lit compartments (snack bags, bars, water, sparkling cans), coils,
# the GB monogram panel, a portrait touch screen and a tap-to-pay reader, on a dark gloss floor.
# Beats: dark machine, the GB logo lights -> the compartments light row by row while the camera glides down the glass
#        -> over to the screen as it boots into the menu -> in on the reader as it glows -> pull back to the whole machine.
# usage: bpe run film.py -m final -- <out_dir> [frames=all|i,j,k] [n=144] [samples=40] [scale=1]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frames'
SEL = argv[1] if len(argv) > 1 else 'all'
N = int(argv[2]) if len(argv) > 2 else 144
SAMPLES = int(argv[3]) if len(argv) > 3 else 40
SCALE = float(argv[4]) if len(argv) > 4 else 1.
random.seed(5)
ENV = lambda k, d: os.environ.get('GB_' + k, d)


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
    def bsdf(s, **kw): return s.n('ShaderNodeBsdfPrincipled', **kw)
    def done(s, shader): s.l(shader, s.out.inputs[0]); return s.m

def principled(name, **kw):
    m = Mat(name); b = m.bsdf(**kw); return m.done(b.outputs[0])
def img(path, cs='sRGB'):
    i = bpy.data.images.load(asset(path)); i.colorspace_settings.name = cs; return i


# ------------------------------------------------------------------ materials
SATIN = principled('satin', **{'Base Color': srgb('#060707'), 'Roughness': .38, 'Coat Weight': .3, 'Coat Roughness': .1, 'Specular IOR Level': .4})
GUN = principled('gun', **{'Base Color': srgb('#2a2e2d'), 'Metallic': 1., 'Roughness': .28})
INNER = principled('inner', **{'Base Color': srgb('#1b1f1e'), 'Metallic': .6, 'Roughness': .38})
CHROME = principled('chrome', **{'Base Color': srgb('#d9dedd'), 'Metallic': 1., 'Roughness': .16})
TRAY = principled('tray', **{'Base Color': srgb('#3b4140'), 'Metallic': 1., 'Roughness': .3})
BLACKGLOSS = principled('blackgloss', **{'Base Color': srgb('#050606'), 'Roughness': .08, 'Coat Weight': .6, 'Coat Roughness': .03})
GLASS = principled('glass', **{'Base Color': (1, 1, 1, 1), 'Roughness': .015, 'IOR': 1.05, 'Transmission Weight': 1., 'Specular IOR Level': .9})
PET = principled('pet', **{'Base Color': srgb('#eaf6ff'), 'Roughness': .05, 'IOR': 1.33, 'Transmission Weight': 1.})
def floor_mat():
    # dark gloss under the machine that falls off to pure black, so there is no horizon line
    m = Mat('floor'); b = m.bsdf(**{'Base Color': srgb('#070908'), 'Roughness': .2, 'Coat Weight': .5, 'Coat Roughness': .06})
    blk = m.bsdf(**{'Base Color': (0, 0, 0, 1), 'Roughness': 1., 'Specular IOR Level': 0.})
    tc = m.n('ShaderNodeTexCoord'); ln = m.n('ShaderNodeVectorMath', operation='LENGTH'); m.l(tc.outputs['Object'], ln.inputs[0])
    mr = m.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP'); m.l(ln.outputs['Value'], mr.inputs['Value'])
    mr.inputs['From Min'].default_value = .9; mr.inputs['From Max'].default_value = 2.6
    mx = m.n('ShaderNodeMixShader'); m.l(mr.outputs[0], mx.inputs[0]); m.l(b.outputs[0], mx.inputs[1]); m.l(blk.outputs[0], mx.inputs[2])
    return m.done(mx.outputs[0])
FLOOR = floor_mat()

def emitter(name, color, strength):
    m = Mat(name); e = m.n('ShaderNodeEmission', Strength=strength); e.inputs[0].default_value = color
    return m.done(e.outputs[0]), e
MINT = srgb('#00f58a')
def tex_emit(name, path, strength=1., alpha=False):
    """image as light, optionally alpha-cut over the black panel; returns (material, emission node)"""
    m = Mat(name); t = m.n('ShaderNodeTexImage', interpolation='Cubic'); t.image = img(path)
    e = m.n('ShaderNodeEmission', Strength=strength); m.l(t.outputs['Color'], e.inputs[0])
    if alpha:
        base = m.n('ShaderNodeBsdfPrincipled'); base.inputs['Base Color'].default_value = srgb('#0c0e0d'); base.inputs['Roughness'].default_value = .34
        mx = m.n('ShaderNodeMixShader'); m.l(t.outputs['Alpha'], mx.inputs[0]); m.l(base.outputs[0], mx.inputs[1]); m.l(e.outputs[0], mx.inputs[2])
        return m.done(mx.outputs[0]), e
    return m.done(e.outputs[0]), e


# ------------------------------------------------------------------ geometry helpers
def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=.006, parent=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
    for v in bm.verts: v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    o = obj(name, bm_mesh(name, bm, False), parent); o.data.materials.append(mat)
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'
        o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    return o
def plane(name, cx, y, cz, w, h, mat, facing=-1):
    """vertical plane in XZ at depth y, UV 0..1, facing -Y (the camera side)"""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap')
    vs = [bm.verts.new((cx + dx * w / 2, y, cz + dz * h / 2)) for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(vs if facing < 0 else vs[::-1])
    for lp, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1)) if facing < 0 else ((0, 1), (1, 1), (1, 0), (0, 0))):
        lp[uv].uv = (u, v)
    o = obj(name, bm_mesh(name, bm, False)); o.data.materials.append(mat); return o
def lathe(name, prof, mat, loc, steps=48):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj(name, bm_mesh(name, bm)); o.location = loc
    if isinstance(mat, list):
        for m in mat: o.data.materials.append(m)
    else: o.data.materials.append(mat)
    return o


# ------------------------------------------------------------------ the cabinet (front face at y=0, depth +y, floor z=0)
W, H, D = .95, 1.83, .82
XL, XR = -W / 2, W / 2
XD0, XD1 = XL + .035, .155          # glass door opening
ZD0, ZD1 = .63, 1.75
box('plinth', XL + .02, XR - .02, .03, D - .03, 0, .06, BLACKGLOSS, .004)
box('sideL', XL, XD0, 0, D, .06, H, SATIN, .01)
box('top', XL, XR, 0, D, ZD1, H, SATIN, .01)
box('col', XD1, XR, 0, D, .06, H, SATIN, .01)
box('lower', XL, XD1, 0, D, .06, ZD0, SATIN, .01)
box('back', XL, XD1, D - .04, D, ZD0, ZD1, INNER, 0)
# door frame trim and glass
for nm, a in (('trimL', (XD0 - .012, XD0 + .004, -.012, .02, ZD0 - .012, ZD1 + .012)), ('trimR', (XD1 - .004, XD1 + .012, -.012, .02, ZD0 - .012, ZD1 + .012)),
              ('trimT', (XD0 - .012, XD1 + .012, -.012, .02, ZD1 - .004, ZD1 + .012)), ('trimB', (XD0 - .012, XD1 + .012, -.012, .02, ZD0 - .012, ZD0 + .004))):
    box(nm, *a, GUN, .003)
box('handle', XD1 - .03, XD1 - .018, -.05, -.012, 1.05, 1.32, CHROME, .004)
glass = plane('glass', (XD0 + XD1) / 2, .004, (ZD0 + ZD1) / 2, XD1 - XD0, ZD1 - ZD0, GLASS)
glass.visible_shadow = False

# compartments: 5 rows, each with a shelf tray, a front price rail and an LED strip under the shelf above
ROWS = 5
SH = [ZD0 + .03 + i * ((ZD1 - ZD0 - .05) / ROWS) for i in range(ROWS + 1)]
SLOTS = 6; SW = (XD1 - XD0 - .03) / SLOTS; SX = [XD0 + .015 + SW * (i + .5) for i in range(SLOTS)]
LED = []; ROWLIGHT = []
for r in range(ROWS):
    z = SH[r]
    box(f'shelf{r}', XD0, XD1, .05, .66, z - .012, z, TRAY, .002)
    box(f'rail{r}', XD0, XD1, .03, .055, z - .03, z + .012, GUN, .002)
    m, e = emitter(f'led{r}', MINT, 0.); LED.append(e)
    st = box(f'strip{r}', XD0 + .01, XD1 - .01, .06, .075, SH[r + 1] - .022, SH[r + 1] - .016, m, 0)
    l = bpy.data.lights.new(f'rowl{r}', 'AREA'); l.shape = 'RECTANGLE'; l.size = XD1 - XD0 - .04; l.size_y = .05; l.energy = 0; l.color = (.82, 1, .9)
    lo = obj(f'rowl{r}', l); lo.location = ((XD0 + XD1) / 2, .2, SH[r + 1] - .03); lo.rotation_euler = (radians(20), 0, 0)
    lo.visible_camera = False; lo.visible_transmission = False; lo.visible_glossy = False; ROWLIGHT.append(l)
    # spiral coils behind the products
    for x in SX:
        cu = bpy.data.curves.new(f'coil{r}{x:.2f}', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .0022; cu.bevel_resolution = 2
        sp = cu.splines.new('POLY'); pts = []
        turns = 9; n = turns * 16
        for k in range(n + 1):
            a = 2 * pi * k / 16; yy = .11 + .52 * k / n
            pts.append((x + .029 * cos(a), yy, z + .031 + .029 * sin(a)))
        sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts): p.co = (*c, 1)
        co = obj(cu.name, cu); co.data.materials.append(CHROME)

# products
snack_img = img('tex/snacks.png')
def snack_mat(k):
    m = Mat(f'snack{k}'); t = m.n('ShaderNodeTexImage', interpolation='Cubic'); t.image = snack_img
    uv = m.n('ShaderNodeUVMap'); mp = m.n('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / 6, 1, 1); mp.inputs['Location'].default_value = (k / 6, 0, 0)
    m.l(uv.outputs[0], mp.inputs[0]); m.l(mp.outputs[0], t.inputs[0])
    b = m.bsdf(Roughness=.32, **{'Coat Weight': .5, 'Coat Roughness': .2, 'Specular IOR Level': .6}); m.l(t.outputs['Color'], b.inputs['Base Color'])
    return m.done(b.outputs[0])
SNACK = [snack_mat(k) for k in range(6)]
def pillow(name, loc, w, h, t, mat):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=2.)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=7, use_grid_fill=True)
    uv = bm.loops.layers.uv.new('UVMap')
    for v in bm.verts:
        x, y, z = v.co
        puff = (1 - abs(x) ** 4) * (1 - abs(z) ** 6)
        v.co = Vector((x * w / 2, y * t / 2 * (.12 + .88 * puff), z * h / 2))
    for f in bm.faces:
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co.x / w + .5, lp.vert.co.z / h + .5)
    o = obj(name, bm_mesh(name, bm)); o.location = loc; o.data.materials.append(mat)
    o.rotation_euler = (radians(random.uniform(-6, -2)), 0, radians(random.uniform(-3, 3))); return o
BOTTLE = [(0, 0), (.031, 0), (.033, .006), (.033, .15), (.03, .165), (.016, .19), (.013, .2), (.013, .212), (0, .212)]
CAN = [(0, 0), (.028, 0), (.033, .008), (.033, .112), (.028, .122), (0, .122)]
def label_mat(name, c1, c2, metal=False):
    m = Mat(name); tc = m.n('ShaderNodeTexCoord'); sep = m.n('ShaderNodeSeparateXYZ'); m.l(tc.outputs['Object'], sep.inputs[0])
    ramp = m.n('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = c1; ramp.color_ramp.elements[1].position = .5; ramp.color_ramp.elements[1].color = c2
    mr = m.n('ShaderNodeMapRange'); m.l(sep.outputs['Z'], mr.inputs['Value']); mr.inputs['From Min'].default_value = .03; mr.inputs['From Max'].default_value = .09
    m.l(mr.outputs[0], ramp.inputs[0])
    b = m.bsdf(Roughness=.22 if metal else .35, Metallic=.85 if metal else 0., **{'Coat Weight': .4}); m.l(ramp.outputs[0], b.inputs['Base Color'])
    return m.done(b.outputs[0])
CANS = [label_mat('can0', srgb('#00c774'), srgb('#e9fff4'), True), label_mat('can1', srgb('#f2f4f3'), srgb('#7a5cff'), True), label_mat('can2', srgb('#ffb547'), srgb('#fff5e0'), True)]
BAND = [principled('band0', **{'Base Color': srgb('#e8f4ff'), 'Roughness': .4}), principled('band1', **{'Base Color': srgb('#0f8f5a'), 'Roughness': .4})]
CAP = principled('cap', **{'Base Color': srgb('#00c774'), 'Roughness': .35})
BAR = [principled('bar0', **{'Base Color': srgb('#e0703a'), 'Roughness': .4, 'Coat Weight': .3}), principled('bar1', **{'Base Color': srgb('#3b2f63'), 'Roughness': .4, 'Coat Weight': .3}),
       principled('bar2', **{'Base Color': srgb('#f1efe6'), 'Roughness': .4, 'Coat Weight': .3})]
for r in range(ROWS):
    z = SH[r]; kind = ('can', 'bottle', 'bar', 'snack', 'snack')[r]
    for i, x in enumerate(SX):
        for dpth, y in enumerate((.16, .3)):
            if kind == 'snack':
                k = (i + r * 2 + dpth) % 6
                pillow(f's{r}{i}{dpth}', (x, y, z + .086), SW * .9, .155, .07, SNACK[k])
            elif kind == 'bar':
                box(f'b{r}{i}{dpth}', x - SW * .4, x + SW * .4, y - .016, y + .016, z, z + .13, BAR[(i + dpth) % 3], .004)
            elif kind == 'bottle':
                o = lathe(f'w{r}{i}{dpth}', BOTTLE, PET, (x, y, z))
                lathe(f'wl{r}{i}{dpth}', [(0, .06), (.0336, .06), (.0336, .115), (0, .115)], BAND[i % 2], (x, y, z))
                lathe(f'wc{r}{i}{dpth}', [(0, .2), (.0145, .2), (.0145, .224), (0, .224)], CAP, (x, y, z), 24)
            else:
                lathe(f'c{r}{i}{dpth}', CAN, CANS[(i + dpth) % 3], (x, y, z))

# right column: logo panel, screen, payment module; pickup bin on the lower block
CX = (XD1 + XR) / 2
logo_m, LOGO = tex_emit('logo', 'tex/logo.png', 0., alpha=True)
plane('logo', CX, -.002, 1.62, .24, .24 * 520 / 900, logo_m)
box('bezel', CX - .135, CX + .135, -.012, .004, 1.03, 1.5, BLACKGLOSS, .006)
scr = Mat('screen'); t1 = scr.n('ShaderNodeTexImage', interpolation='Cubic'); t1.image = img('tex/boot.png'); t2 = scr.n('ShaderNodeTexImage', interpolation='Cubic'); t2.image = img('tex/ui.png')
mixc = scr.n('ShaderNodeMix', data_type='RGBA'); SCR_MIX = mixc.inputs['Factor']; scr.l(t1.outputs['Color'], mixc.inputs[6]); scr.l(t2.outputs['Color'], mixc.inputs[7])
SCR_E = scr.n('ShaderNodeEmission', Strength=0.); scr.l(mixc.outputs[2], SCR_E.inputs[0])
gl = scr.bsdf(**{'Base Color': srgb('#020303'), 'Roughness': .04, 'Coat Weight': 1., 'Coat Roughness': .02})
add = scr.n('ShaderNodeAddShader'); scr.l(SCR_E.outputs[0], add.inputs[0]); scr.l(gl.outputs[0], add.inputs[1]); scr.done(add.outputs[0])
plane('screen', CX, -.0125, 1.265, .24, .40, scr.m)
box('paybox', CX - .1, CX + .1, -.018, .004, .74, 1.0, BLACKGLOSS, .006)
rd_m, READER = tex_emit('reader', 'tex/reader.png', 0.)
plane('reader', CX + .035, -.0185, .87, .09, .126, rd_m)
ring_m, RING = emitter('ring', MINT, 0.)
for nm, a in (('ringT', (CX - .015, CX + .085, -.02, -.016, .937, .941)), ('ringB', (CX - .015, CX + .085, -.02, -.016, .803, .807)),
              ('ringL', (CX - .015, CX - .011, -.02, -.016, .803, .941)), ('ringR', (CX + .081, CX + .085, -.02, -.016, .803, .941))):
    box(nm, *a, ring_m, 0)
box('cardslot', CX - .085, CX - .04, -.022, -.004, .84, .92, GUN, .003)
box('flap', XD0 + .07, XD1 - .07, -.014, .002, .2, .38, BLACKGLOSS, .008)
bin_m, BIN = emitter('binled', MINT, 0.)
box('binled', XD0 + .07, XD1 - .07, -.016, -.012, .405, .411, bin_m, 0)

# floor
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40.)
fl = obj('floor', bm_mesh('floor', bm, False)); fl.data.materials.append(FLOOR); fl.location = (0, .4, 0)

# ------------------------------------------------------------------ light: long strips for the edges, a soft key, a mint rim behind
LIGHT = float(ENV('LIGHT', '1'))
def area(name, loc, target, sx, sy, Wt, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = Wt * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
area('key', (-2.2, -2.0, 2.4), (0, .3, .9), 1.4, 1.4, 110, (1, .97, .94), radians(60))
area('stripL', (-1.5, -.5, 1.0), (0, .3, 1.0), .08, 2.6, 220, (.95, 1, .98))
area('stripR', (1.6, -.4, 1.0), (0, .3, 1.0), .08, 2.6, 120, (.95, 1, .98))
area('top', (0, -.3, 3.0), (0, .3, 1.0), 2.2, .12, 120)
rim = area('rim', (1.4, 1.6, 1.4), (0, .2, 1.0), .2, 2.2, 0, (.3, 1, .62))
INT = area('interior', ((XD0 + XD1) / 2, .45, ZD1 - .03), ((XD0 + XD1) / 2, .45, ZD0), XD1 - XD0 - .04, .5, 0, (.85, 1, .92))
INT.visible_transmission = False; INT.visible_glossy = False
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = float(ENV('WORLD', '.12'))
black = wn.nodes.new('ShaderNodeBackground'); black.inputs[0].default_value = (0, 0, 0, 1)
lp = wn.nodes.new('ShaderNodeLightPath'); mx = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); wn.links.new(bg.outputs[0], mx.inputs[1]); wn.links.new(black.outputs[0], mx.inputs[2]); wn.links.new(mx.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera: machine in the right half, captions on the left
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 40.; cd.clip_start = .02
cd.dof.use_dof = True
cam = obj('cam', cd); scn.camera = cam
# (t, camera, target, lens, f-stop, focus point)
KEYS = [(0.00, (-2.05, -3.05, 1.18), (-.50, .3, 1.0), 38, 8., (0, 0, .95)),
        (0.12, (-1.90, -2.82, 1.2), (-.47, .3, 1.0), 38, 8., (0, 0, .95)),
        (0.30, (-1.05, -1.38, 1.55), (-.36, .3, 1.40), 42, 3.2, ((XD0 + XD1) / 2, .1, 1.45)),
        (0.44, (-.98, -1.30, 1.02), (-.34, .3, 1.00), 42, 3.2, ((XD0 + XD1) / 2, .1, 1.0)),
        (0.58, (-.30, -1.12, 1.34), (.05, .3, 1.26), 45, 3.2, (CX, 0, 1.26)),
        (0.72, (-.05, -.78, .98), (.13, .3, .88), 50, 2.8, (CX, 0, .87)),
        (0.88, (-1.92, -2.86, 1.14), (-.47, .3, .98), 38, 8., (0, 0, .95)),
        (1.00, (-2.08, -3.08, 1.14), (-.51, .3, .98), 38, 8., (0, 0, .95))]
def place(t):
    for (t0, c0, g0, l0, f0, p0), (t1, c1, g1, l1, f1, p1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smoother((t - t0) / (t1 - t0)); L = lambda a, b: [x + (y - x) * k for x, y in zip(a, b)] if isinstance(a, tuple) else a + (b - a) * k
            c, g, lens, fs, fp = Vector(L(c0, c1)), Vector(L(g0, g1)), L(l0, l1), L(f0, f1), Vector(L(p0, p1)); break
    cam.location = c; cam.rotation_euler = (g - c).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens; cd.dof.aperture_fstop = fs
    cd.dof.focus_distance = (fp - c).length

def state(t):
    logo = smoother(seg(t, .06, .14)) * (0 if .085 < t < .095 else 1)
    LOGO.inputs['Strength'].default_value = 3.2 * logo
    rows = [smoother(seg(t, .16 + .05 * r, .22 + .05 * r)) for r in range(ROWS)]
    for r in range(ROWS):
        LED[r].inputs['Strength'].default_value = 9. * rows[r]
        ROWLIGHT[r].energy = float(ENV('ROWW', '9')) * LIGHT * rows[r]
    INT.data.energy = float(ENV('INTW', '16')) * LIGHT * sum(rows) / ROWS
    boot = smoother(seg(t, .43, .48)); ui = smoother(seg(t, .5, .535))
    SCR_E.inputs['Strength'].default_value = 1.6 * boot; SCR_MIX.default_value = ui
    ring = smoother(seg(t, .66, .72))
    RING.inputs['Strength'].default_value = 10. * ring; READER.inputs['Strength'].default_value = 1.4 * ring
    BIN.inputs['Strength'].default_value = 8. * smoother(seg(t, .84, .9))
    rim.data.energy = float(ENV('RIMW', '220')) * LIGHT * smoother(seg(t, .02, .12))
    bpy.data.lights['key'].energy = 110 * LIGHT * (.3 + .7 * smoother(seg(t, .02, .26)))
    bpy.data.lights['stripL'].energy = 220 * LIGHT * (.45 + .55 * smoother(seg(t, .0, .2)))
    place(t)

r = scn.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1280, 720; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(ENV('ADAPT', '.03'))
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.transmission_bounces = 6; cy.transparent_max_bounces = 6; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 5; cy.sample_clamp_indirect = 8.
r.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = ENV('LOOK', 'AgX - Medium High Contrast'); scn.view_settings.exposure = float(ENV('EV', '0'))

os.makedirs(OUT, exist_ok=True)
frames = range(N) if SEL == 'all' else [int(x) for x in SEL.split(',')]
for fr in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % fr)
    if SEL == 'all' and os.path.exists(fp): continue
    state(fr / (N - 1)); r.filepath = fp
    bpy.ops.render.render(write_still=True)
print('done')
