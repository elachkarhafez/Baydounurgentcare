# AUROMA BODY bottle renders, hyper-real cut-outs on a transparent background with a soft contact shadow.
# Two real bottle types from their counter: the 7 mL glass roll-on with a black ribbed cap, and the square ½ oz glass
# bottle with a polished chrome cap. Clear sticker labels with their scent names (tex/sq_*.png, tex/ro_*.png).
# usage: bpe run bottles.py -m final -- <jobs.json> <out_dir> [samples=160]
#   jobs: [{"out": "paris", "type": "square", "color": "#2f6fd6", "label": "sq_paris", "part": "full|nocap|cap", "clear": 0}]
import bpy, bmesh, sys, os, json, math
from math import pi, cos, sin, radians
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
JOBS = json.load(open(argv[0])); OUT = argv[1]; SAMPLES = int(argv[2]) if len(argv) > 2 else 160
os.makedirs(OUT, exist_ok=True)

def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def obj(name, data):
    o = bpy.data.objects.new(name, data); col.objects.link(o); return o
def mesh(name, bm, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    return me
class Mat:
    def __init__(s, name):
        s.m = bpy.data.materials.new(name); s.m.use_nodes = True; s.t = s.m.node_tree; s.t.nodes.clear(); s.out = s.n('ShaderNodeOutputMaterial')
    def n(s, typ, **kw):
        x = s.t.nodes.new(typ)
        for k, v in kw.items():
            if k in x.inputs.keys(): x.inputs[k].default_value = v
            else: setattr(x, k, v)
        return x
    def l(s, a, b): s.t.links.new(a, b)
def bsdf(name, **kw):
    m = Mat(name); b = m.n('ShaderNodeBsdfPrincipled', **kw); m.l(b.outputs[0], m.out.inputs[0]); return m.m, b

# ------------------------------------------------------------------ materials
GLASS, _ = bsdf('glass', **{'Base Color': (1, 1, 1, 1), 'Roughness': 0.0, 'IOR': 1.5, 'Transmission Weight': 1.0})
CHROME, _ = bsdf('chrome', **{'Base Color': srgb('#e9ecef'), 'Metallic': 1.0, 'Roughness': 0.06})
SATIN, _ = bsdf('satin', **{'Base Color': srgb('#c9ccd0'), 'Metallic': 1.0, 'Roughness': 0.22})
BLACK, _ = bsdf('blackcap', **{'Base Color': srgb('#030303'), 'Roughness': 0.22, 'Specular IOR Level': 0.5})
def liquid_mat():
    m = Mat('liquid'); b = m.n('ShaderNodeBsdfPrincipled', **{'Roughness': 0.0, 'IOR': 1.47, 'Transmission Weight': 1.0})
    v = m.n('ShaderNodeVolumeAbsorption', Density=40.0)
    m.l(b.outputs[0], m.out.inputs[0]); m.l(v.outputs[0], m.out.inputs[1]); return m.m, b, v
LIQ, LIQB, LIQV = liquid_mat()
def label_mat():
    m = Mat('label'); t = m.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP')
    b = m.n('ShaderNodeBsdfPrincipled', **{'Roughness': 0.35, 'Specular IOR Level': 0.35})
    tr = m.n('ShaderNodeBsdfTransparent'); mx = m.n('ShaderNodeMixShader')
    m.l(t.outputs['Color'], b.inputs['Base Color']); m.l(t.outputs['Alpha'], mx.inputs[0]); m.l(tr.outputs[0], mx.inputs[1]); m.l(b.outputs[0], mx.inputs[2]); m.l(mx.outputs[0], m.out.inputs[0])
    return m.m, t
LAB, LABT = label_mat()

# ------------------------------------------------------------------ geometry helpers
def rbox(name, w, h, d, r, z0, mat, seg=8):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h + z0 + h / 2))
    o = obj(name, mesh(name, bm, False)); o.data.materials.append(mat)
    md = o.modifiers.new('bev', 'BEVEL'); md.width = r; md.segments = seg; md.limit_method = 'NONE'
    o.modifiers.new('wn', 'WEIGHTED_NORMAL'); o.data.shade_smooth()
    return o
def lathe(name, prof, mat, steps=128, rib=None):
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    if rib:
        n, depth, z0, z1 = rib
        for v in bm.verts:
            if z0 < v.co.z < z1:
                a = math.atan2(v.co.y, v.co.x); rr = Vector((v.co.x, v.co.y)).length
                k = rr - depth * (0.5 + 0.5 * cos(n * a)) ** 3
                v.co.x, v.co.y = k * cos(a), k * sin(a)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj(name, mesh(name, bm)); o.data.materials.append(mat); return o
def roll_label(rr, z0, z1, half):
    """clear strip wrapped round the tube; the text runs bottom to top like their roll-ons"""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap'); NU, NV = 8, 48; g = []
    for i in range(NU + 1):
        z = z0 + (z1 - z0) * i / NU
        g.append([bm.verts.new((rr * sin(a), -rr * cos(a), z)) for a in [(-half + 2 * half * j / NV) for j in range(NV + 1)]])
    for i in range(NU):
        for j in range(NV):
            f = bm.faces.new((g[i][j], g[i][j + 1], g[i + 1][j + 1], g[i + 1][j]))
            for lp, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                lp[uv].uv = (ii / NU, 1 - jj / NV)
    o = obj('ro_label', mesh('ro_label', bm)); o.data.materials.append(LAB); return o
def side(r, z0, z1, n=24): return [(r, z0 + (z1 - z0) * i / n) for i in range(n + 1)]
def label_plane(name, w, h, y, zc, curve_r=None):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap'); NU, NV = (64 if curve_r else 1), 1; grid = []
    for i in range(NU + 1):
        u = i / NU; x = (u - .5) * w
        if curve_r:
            a = x / curve_r; px, py = curve_r * sin(a), -curve_r * cos(a)
        else: px, py = x, y
        grid.append([bm.verts.new((px, py, zc + (j / NV - .5) * h)) for j in range(NV + 1)])
    for i in range(NU):
        f = bm.faces.new((grid[i][0], grid[i + 1][0], grid[i + 1][1], grid[i][1]))
        for lp, (a, b) in zip(f.loops, ((i, 0), (i + 1, 0), (i + 1, 1), (i, 1))): lp[uv].uv = (a / NU, b / NV)
    o = obj(name, mesh(name, bm, False)); o.data.materials.append(LAB); return o

# ------------------------------------------------------------------ the square ½ oz bottle (meters). front face toward -Y
SQ = {}
def build_square():
    W, H, D, R = .040, .042, .024, .0045
    g = rbox('sq_glass', W, H, D, R, 0., GLASS, 10)
    l = rbox('sq_liquid', W - .0046, H - .0105, D - .0046, R - .0018, .0068, LIQ, 8)     # thick base, liquid to the shoulder
    neck = lathe('sq_neck', [(0, H - .001), (.0062, H - .001)] + side(.0062, H - .001, H + .0045, 4) + [(.0068, H + .0045), (.0068, H + .006), (0, H + .006)], SATIN, 96)
    act = lathe('sq_actuator', [(0, H + .006), (.0046, H + .006)] + side(.0046, H + .006, H + .0135, 6) + [(.0042, H + .014), (0, H + .014)], CHROME, 96)
    hole = lathe('sq_hole', [(0, 0), (.0007, 0), (.0007, .002), (0, .002)], BLACK, 24); hole.rotation_euler = (pi / 2, 0, 0); hole.location = (0, -.0047, H + .0115)
    cap = lathe('sq_cap', [(0, H + .0045), (.0090, H + .0045)] + side(.0090, H + .0045, H + .0235, 30) + [(.0089, H + .0239), (.0085, H + .0243), (0, H + .0243)], CHROME, 160)
    lab = label_plane('sq_label', W - .0062, (W - .0062) * 420 / 1200, -D / 2 - .00015, H * .6)
    SQ.update(glass=g, liquid=l, neck=neck, act=act, hole=hole, cap=cap, label=lab, H=H + .0243)
# ------------------------------------------------------------------ the 7 mL roll-on
RO = {}
def build_roll():
    r, H = .0080, .060
    prof = [(0, 0), (r - .0016, 0), (r - .0003, .0006), (r, .002)] + side(r, .002, H - .002, 40) + [(r - .0006, H - .0006), (r - .0016, H), (.0052, H), (.0052, H + .004), (0, H + .004)]
    g = lathe('ro_glass', prof, GLASS, 128)
    lprof = [(0, .0045), (r - .0018, .0045), (r - .0012, .0052)] + side(r - .0012, .0052, H * .86, 30) + [(0, H * .86)]
    l = lathe('ro_liquid', lprof, LIQ, 96)
    cap = lathe('ro_cap', [(0, H - .0035), (r + .0007, H - .0035)] + side(r + .0007, H - .0035, H + .0185, 40) + [(r + .0004, H + .0192), (r - .0004, H + .0196), (0, H + .0196)], BLACK, 256, rib=(72, .00022, H - .003, H + .0185))
    lab = roll_label(r + .00025, .006, .052, 1.25)
    RO.update(glass=g, liquid=l, cap=cap, label=lab, H=H + .0196)
build_square(); build_roll()

# ------------------------------------------------------------------ studio: soft key, long strip lights for the glass edges, a back light so the oil glows
def area(name, loc, target, sx, sy, Wt, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = Wt; l.color = color
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
LW = float(os.environ.get('AB_LW', '.14'))
area('key', (-.28, -.32, .22), (0, 0, .03), .3, .3, 26 * LW, (1, .97, .92))
area('stripL', (-.16, -.06, .05), (0, 0, .03), .02, .26, 18 * LW)
area('stripR', (.16, -.07, .05), (0, 0, .03), .02, .26, 16 * LW)
area('back', (0, .22, .06), (0, 0, .03), .2, .2, 22 * LW, (1, .95, .86))
area('top', (0, -.02, .3), (0, 0, .03), .2, .06, 10 * LW)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = float(os.environ.get('AB_WORLD', '.3')); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])
# a backdrop seen only through the glass, so refraction looks like a studio sweep, not the HDRI room
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
bd = obj('backdrop', mesh('backdrop', bm, False)); bd.location = (0, .18, .1); bd.rotation_euler = (radians(90), 0, 0)
bdm = Mat('backdrop'); grad = bdm.n('ShaderNodeTexGradient'); tc = bdm.n('ShaderNodeTexCoord'); mp = bdm.n('ShaderNodeMapping')
bdm.l(tc.outputs['Generated'], mp.inputs[0]); mp.inputs['Rotation'].default_value = (0, 0, radians(90)); bdm.l(mp.outputs[0], grad.inputs[0])
ramp = bdm.n('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = srgb('#f2ebdf'); ramp.color_ramp.elements[1].color = srgb('#7a6f60'); bdm.l(grad.outputs[0], ramp.inputs[0])
em = bdm.n('ShaderNodeEmission', Strength=float(os.environ.get('AB_BD', '.8'))); bdm.l(ramp.outputs[0], em.inputs[0]); bdm.l(em.outputs[0], bdm.out.inputs[0]); bd.data.materials.append(bdm.m)
bd.visible_camera = False; bd.visible_shadow = False
# shadow catcher floor
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.4)
fl = obj('floor', mesh('floor', bm, False)); fl.is_shadow_catcher = True; fl.hide_render = True; fl.data.materials.append(bsdf('floorm', **{'Base Color': (.8, .8, .8, 1), 'Roughness': .5})[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 100; cd.sensor_width = 36; cd.clip_start = .01
cam = obj('cam', cd); scn.camera = cam
r = scn.render; r.engine = 'CYCLES'; r.film_transparent = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .01
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 24; cy.transmission_bounces = 24; cy.transparent_max_bounces = 24; cy.glossy_bounces = 8; cy.diffuse_bounces = 3; cy.volume_bounces = 2
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 10.
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'; scn.view_settings.exposure = float(os.environ.get('AB_EV', '0'))

def show(objs, on):
    for o in objs: o.hide_render = not on
for job in JOBS:
    t = job['type']; part = job.get('part', 'full')
    show(SQ.values() if False else [v for v in SQ.values() if hasattr(v, 'hide_render')], t == 'square')
    show([v for v in RO.values() if hasattr(v, 'hide_render')], t == 'roll')
    c = srgb(job['color']); clear = job.get('clear', 0)
    LIQB.inputs['Base Color'].default_value = (1, 1, 1, 1) if clear else c
    LIQV.inputs['Color'].default_value = c
    LIQV.inputs['Density'].default_value = 10.0 if clear else float(job.get('density', 150))
    LABT.image = bpy.data.images.load(asset('tex/' + job['label'] + '.png'))
    (SQ if t == 'square' else RO)['label'].hide_render = bool(job.get('nolabel'))
    if job.get('nolabel'): print('IMG', LABT.image.size[:], LABT.image.alpha_mode, LABT.image.channels)
    if t == 'square':
        SQ['cap'].hide_render = part == 'nocap'
        if part == 'cap':
            for k in ('glass', 'liquid', 'neck', 'act', 'hole', 'label'): SQ[k].hide_render = True
            fl.hide_render = True
        Hh = SQ['H']; tgt = Vector((0, 0, Hh * .5)); dist = .40
    else:
        Hh = RO['H']; tgt = Vector((0, 0, Hh * .5)); dist = .40
    el = radians(job.get('elev', 6)); az = radians(job.get('az', -14))
    cam.location = tgt + Vector((dist * sin(az) * cos(el), -dist * cos(az) * cos(el), dist * sin(el)))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    fit = Hh * 1.22 if t == 'square' else Hh * 1.18
    cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.lens = 24 * dist / fit
    r.resolution_x, r.resolution_y = (1000, 1100) if t == 'square' else (560, 1300)
    r.filepath = os.path.join(OUT, job['out'] + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', job['out'])
print('done')
