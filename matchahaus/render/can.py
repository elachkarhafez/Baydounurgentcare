# Matcha Haus: their slim clear can (aluminium lid, white "H." print) in their four flavours, on their off-white set.
# Materials, condensation and the studio rig are lifted from luma/render/cup.py; only the vessel and the liquids are new.
# usage: bpe run can.py -m final -- <out.png> <flavour|lineup> [samples=96] [turn_deg=0] [scale=1] [res=864x1080]
#   flavour: ceremonial | coconut | vanilla | coffee
import bpy, bmesh, math, random, sys, os
import numpy as np
from math import sin, cos, pi, radians, sqrt
from mathutils import Vector
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'can.png'
WHAT = argv[1] if len(argv) > 1 else 'ceremonial'
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
TURN = float(argv[3]) if len(argv) > 3 else 0.
SCALE = float(argv[4]) if len(argv) > 4 else 1.
RES = tuple(int(x) for x in (argv[5] if len(argv) > 5 else '864x1080').split('x'))
random.seed(7)

def srgb(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)

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
        m = s.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        s.v(m.inputs['Value'], val); m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b
        m.inputs['To Min'].default_value = lo; m.inputs['To Max'].default_value = hi; return m.outputs['Result']
    def mix(s, fac, a, b):
        m = s.n('ShaderNodeMix', data_type='RGBA'); s.v(m.inputs['Factor'], fac); s.v(m.inputs[6], a); s.v(m.inputs[7], b)
        return m.outputs[2]
    def bsdf(s, **kw): return s.n('ShaderNodeBsdfPrincipled', **kw)
    def clear_shadow(s, shader, keep=0.):
        lp = s.n('ShaderNodeLightPath'); tr = s.n('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (1 - keep,) * 3 + (1,)
        # shadow rays AND diffuse bounces see through: a sealed can otherwise starves the drink of the bounce off the white set
        mx = s.n('ShaderNodeMixShader'); s.l(s.math('MAXIMUM', lp.outputs['Is Shadow Ray'], lp.outputs['Is Diffuse Ray']), mx.inputs[0])
        s.l(shader, mx.inputs[1]); s.l(tr.outputs[0], mx.inputs[2])
        return mx.outputs[0]
    def done(s, shader): s.l(shader, s.out.inputs[0]); return s.m

def lathe(name, prof, steps=160, parent=None, closed=False):
    """Closed profiles get recalculated normals; open ones (the can wall) are forced to face outwards."""
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    if closed: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    else:
        bm.faces.ensure_lookup_table(); f = max(bm.faces, key=lambda f: f.calc_area()); c = f.calc_center_median()
        if f.normal.x * c.x + f.normal.y * c.y < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return obj(name, bm_mesh(name, bm), parent)

# ------------------------------------------------------------------ dimensions (metres): a slim 16 oz clear PET can
H, R, WALL = .158, .0300, .0006
ZN = H - .010                      # where the body necks in under the lid
RN = R - .0016                     # neck radius
FL = H - .019                      # fill line
def r_side(z):
    if z < .006: return R - .0026 + .0026 * smooth(z / .006)          # rounded heel
    if z > ZN: return R - (R - RN) * smooth((z - ZN) / .0045)          # neck
    return R

# ------------------------------------------------------------------ shared materials
pet = Mat('pet'); nz = pet.n('ShaderNodeTexNoise', Scale=120., Detail=2.)
b = pet.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': float(os.environ.get('MH_IOR', '1.57')), 'Specular IOR Level': float(os.environ.get('MH_SPEC', '.5'))})
pet.l(pet.mrange(nz.outputs['Fac'], .3, .7, .002, .01), b.inputs['Roughness'])
PET = pet.done(pet.clear_shadow(b.outputs[0], keep=.05))
al = Mat('alu'); tc = al.n('ShaderNodeTexCoord')
ring = al.n('ShaderNodeTexWave', wave_type='RINGS', Scale=420., Distortion=.4, Detail=1.); al.l(tc.outputs['Object'], ring.inputs['Vector'])
b = al.bsdf(**{'Base Color': srgb('#d9dadc'), 'Metallic': 1., 'Anisotropic': .55})
al.l(al.mrange(ring.outputs['Fac'], 0., 1., .16, .26), b.inputs['Roughness'])
ALU = al.done(b.outputs[0])
pm = Mat('print'); tx = pm.n('ShaderNodeTexImage', interpolation='Cubic', extension='CLIP'); tx.image = bpy.data.images.load(asset('tex/hlabel.png'))
b = pm.bsdf(**{'Base Color': (.97, .97, .96, 1), 'Roughness': .45, 'Specular IOR Level': .25})
ink = pm.n('ShaderNodeEmission', Strength=float(os.environ.get('MH_INK', '9.'))); ink.inputs['Color'].default_value = (1, 1, 1, 1)
ad = pm.n('ShaderNodeAddShader'); pm.l(b.outputs[0], ad.inputs[0]); pm.l(ink.outputs[0], ad.inputs[1])   # white ink reads crisp from any side
trp = pm.n('ShaderNodeBsdfTransparent'); mxp = pm.n('ShaderNodeMixShader'); pm.l(tx.outputs['Alpha'], mxp.inputs[0])
pm.l(trp.outputs[0], mxp.inputs[1]); pm.l(ad.outputs[0], mxp.inputs[2])
PRINT = pm.done(mxp.outputs[0])
dm = Mat('drops'); b = dm.bsdf(**{'Base Color': (1, 1, 1, 1), 'Transmission Weight': 1., 'IOR': 1.333, 'Roughness': 0.})
DROPS = dm.done(dm.clear_shadow(b.outputs[0], keep=.1))

# ------------------------------------------------------------------ the four drinks (shading only; one liquid mesh)
def drink(fl):
    m = Mat('liq_' + fl); tc = m.n('ShaderNodeTexCoord'); sx = m.n('ShaderNodeSeparateXYZ'); m.l(tc.outputs['Object'], sx.inputs[0])
    hz = m.math('DIVIDE', sx.outputs['Z'], FL)                                   # 0 at the bottom, 1 at the fill line
    w1 = m.n('ShaderNodeTexNoise', Scale=22., Detail=6., Roughness=.62, Distortion=1.6); m.l(tc.outputs['Object'], w1.inputs['Vector'])
    w2 = m.n('ShaderNodeTexNoise', Scale=70., Detail=4.); m.l(tc.outputs['Object'], w2.inputs['Vector'])
    ice = m.n('ShaderNodeTexVoronoi', Scale=38., Randomness=.85); m.l(tc.outputs['Object'], ice.inputs['Vector'])
    hzn = m.math('ADD', hz, m.math('MULTIPLY_ADD', w1.outputs['Fac'], .12, -.06))  # wobbly layer boundaries
    swirl = m.mrange(m.math('ABSOLUTE', m.math('SUBTRACT', w1.outputs['Fac'], .5)), .045, .0)  # thin milky ribbons
    edges = m.mrange(ice.outputs['Distance'], .05, .42, 1., 0.)                   # soft cube faces where ice presses on the wall
    grain = m.mrange(w2.outputs['Fac'], .35, .65)
    if fl == 'ceremonial':
        base = m.mix(grain, srgb('#2f5014'), srgb('#4c7420'))
        cloud = m.mrange(w1.outputs['Fac'], .55, .7)                                # milk clouding through the matcha
        base = m.mix(m.math('MULTIPLY', cloud, .3), base, srgb('#8fa86a'))
        base = m.mix(m.math('MULTIPLY', swirl, .18), base, srgb('#c9d6b0'))
        base = m.mix(m.math('MULTIPLY', edges, .45), base, srgb('#5f8a2c'))
        top = m.mix(grain, srgb('#8fae52'), srgb('#a8c46a')); topf = m.mrange(hzn, .93, .97)
    elif fl == 'coconut':
        green = m.mix(grain, srgb('#7f9e3a'), srgb('#9ab656'))
        milk = m.mix(grain, srgb('#e3eacc'), srgb('#f1f4e2'))
        base = m.mix(m.mrange(hzn, .30, .46), milk, green)
        base = m.mix(m.math('MULTIPLY', swirl, .12), base, srgb('#f4f5ea'))
        base = m.mix(m.math('MULTIPLY', edges, .3), base, srgb('#b9cc86'))
        top = m.mix(grain, srgb('#a3bd62'), srgb('#b6cc7a')); topf = m.mrange(hzn, .95, .985)
    elif fl == 'vanilla':
        coffee = m.mix(grain, srgb('#b38658'), srgb('#cfa77a'))
        coffee = m.mix(m.math('MULTIPLY', swirl, .25), coffee, srgb('#eadcc6'))
        coffee = m.mix(m.math('MULTIPLY', edges, .35), coffee, srgb('#8d6038'))
        base = coffee
        top = m.mix(grain, srgb('#fbf6ee'), srgb('#fffdf8')); topf = m.mrange(hzn, .86, .9)      # the cold foam cap
    else:  # iced coffee
        base = m.mix(grain, srgb('#3a1d0c'), srgb('#5d3317'))
        base = m.mix(m.math('MULTIPLY', swirl, .2), base, srgb('#9a6638'))
        base = m.mix(m.math('MULTIPLY', edges, .55), base, srgb('#b88552'))
        top = m.mix(grain, srgb('#6e4422'), srgb('#8a5a33')); topf = m.mrange(hzn, .965, .99)
    colr = m.mix(topf, base, top)
    b = m.bsdf(IOR=1.34, **{'Subsurface Weight': .12, 'Subsurface Scale': .002, 'Specular IOR Level': .35})
    b.inputs['Subsurface Radius'].default_value = (1., .7, .4)
    m.l(colr, b.inputs['Base Color']); m.l(m.math('MULTIPLY_ADD', topf, .35, .12), b.inputs['Roughness'])
    bmp = m.n('ShaderNodeBump', Distance=.0003); m.l(ice.outputs['Distance'], bmp.inputs['Height']); bmp.inputs['Strength'].default_value = .12
    m.l(bmp.outputs[0], b.inputs['Normal'])
    # a little self-light scaled by the drink's own colour, to give back what the sealed wall takes (pale foam and milk read grey without it)
    em = m.n('ShaderNodeEmission'); m.l(colr, em.inputs['Color']); em.inputs['Strength'].default_value = float(os.environ.get('MH_GLOW', '7.'))
    ad = m.n('ShaderNodeAddShader'); m.l(b.outputs[0], ad.inputs[0]); m.l(em.outputs[0], ad.inputs[1])
    return m.done(ad.outputs[0])

# ------------------------------------------------------------------ one can
def make_can(fl, x=0., turn=0.):
    root = obj('can_' + fl, None); root.location = (x, 0, 0); root.rotation_euler = (0, 0, radians(turn))
    prof = [(0., .0030), (.012, .0028), (.020, .0022), (R - .0050, .0008), (R - .0030, 0.)]
    prof += [(r_side(z), z) for z in np.linspace(.0006, H - .0035, 110)]
    body = lathe('body_' + fl, prof, parent=root)
    so = body.modifiers.new('wall', 'SOLIDIFY'); so.thickness = WALL; so.offset = -1; so.use_even_offset = True
    body.data.materials.append(PET)
    # aluminium end: double seam ring, chuck wall, recessed panel, a pull tab
    lid = [(0., H + .0003), (RN - .0062, H + .0003), (RN - .0050, H + .0009), (RN - .0040, H + .0034), (RN - .0016, H + .0046),
           (RN + .0006, H + .0046), (RN + .0011, H + .0030), (RN + .0010, H - .0012), (RN + .0003, H - .0036), (RN - .0004, H - .0040)]
    lo = lathe('lid_' + fl, lid, parent=root); lo.data.materials.append(ALU)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
    bmesh.ops.scale(bm, vec=(.019, .011, .0007), verts=bm.verts)
    tab = obj('tab_' + fl, bm_mesh('tab', bm, False), root); tab.location = (.004, -.004, H + .0012); tab.rotation_euler = (0, 0, radians(30))
    bv = tab.modifiers.new('bv', 'BEVEL'); bv.width = .0016; bv.segments = 5; tab.data.materials.append(ALU)
    # liquid
    zb = .0030 + WALL + .0004; rw = lambda z: r_side(z) - WALL - .0005
    lp = [(0., zb), (.012, zb), (rw(.006) - .002, zb + .0006), (rw(.008), .008)]
    lp += [(rw(z), z) for z in np.linspace(.010, FL - .0012, 70)]
    lp += [(rw(FL) - .0005, FL + .0007), (rw(FL) - .003, FL + .0001), (0., FL)]
    lq = lathe('liq_' + fl, lp, parent=root, closed=True); lq.data.materials.append(drink(fl))
    # the white H. printed on the front, wrapped on the wall
    LW, LH, ZL = .036, .036, .060
    span = LW / R; a0 = -pi / 2 - span / 2
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); NU, NV = 48, 12; g = []
    for i in range(NU + 1):
        a = a0 + span * i / NU
        g.append([bm.verts.new(((R + .00008) * cos(a), (R + .00008) * sin(a), ZL - LH / 2 + LH * j / NV)) for j in range(NV + 1)])
    for i in range(NU):
        for j in range(NV):
            f = bm.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
            for lp_, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): lp_[uvl].uv = (u / NU, v / NV)
    bm.faces.ensure_lookup_table(); f0 = bm.faces[len(bm.faces) // 2]; c0 = f0.calc_center_median()
    if f0.normal.x * c0.x + f0.normal.y * c0.y < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)   # face the camera, not the drink
    pr = obj('print_' + fl, bm_mesh('print', bm), root); pr.data.materials.append(PRINT)
    # a light sweat below the fill line
    bm = bmesh.new(); t = bmesh.new(); bmesh.ops.create_uvsphere(t, u_segments=10, v_segments=6, radius=1.)
    tv = [v.co.copy() for v in t.verts]; tf = [[v.index for v in f.verts] for f in t.faces]; t.free()
    for k in range(260):
        z = random.uniform(.012, FL - .006); a = random.uniform(-pi, pi)
        if abs(((a + pi / 2 + pi) % (2 * pi)) - pi) < span * .6 and abs(z - ZL) < LH * .55: continue   # keep the print clean
        r0 = .0003 + .0009 * random.random() ** 2.6
        n_ = Vector((cos(a), sin(a), 0)); tu = Vector((-sin(a), cos(a), 0)); tz = Vector((0, 0, 1))
        base = Vector((R * cos(a), R * sin(a), z)) - n_ * .0001
        vs = [bm.verts.new(base + tu * c.x * r0 + tz * c.y * r0 * random.uniform(1., 1.25) + n_ * max(c.z, 0) * r0 * .75) for c in tv]
        for fi in tf:
            try: bm.faces.new([vs[i] for i in fi])
            except ValueError: pass
    dr = obj('drops_' + fl, bm_mesh('drops', bm), root); dr.data.materials.append(DROPS)
    return root

FLAVOURS = ['ceremonial', 'coconut', 'vanilla', 'coffee']
if WHAT == 'lineup':
    for i, fl in enumerate(FLAVOURS): make_can(fl, (i - 1.5) * .082, TURN)
else:
    make_can(WHAT, 0., TURN)

# ------------------------------------------------------------------ studio: their off-white sweep and the cup.py light rig
bm = bmesh.new(); prof = [(-2., 0.)] + [(.30 + .45 * sin(q), .45 * (1 - cos(q))) for q in np.linspace(0, pi / 2, 24)] + [(.75, 2.)]
rows = [[bm.verts.new((x, y, z)) for y, z in prof] for x in (-3., 3.)]
for i in range(len(prof) - 1): bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
sweep = obj('sweep', bm_mesh('sweep', bm)); sw = Mat('sweep')
sweep.data.materials.append(sw.done(sw.bsdf(**{'Base Color': srgb(os.environ.get('MH_BG', '#cfccc5')), 'Roughness': .92, 'Specular IOR Level': .2}).outputs[0]))
LIGHT = float(os.environ.get('MH_LIGHT', '.85'))
def area(name, loc, target, sx, sy, W, color=(1, 1, 1), spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = W * LIGHT; l.color = color
    if spread: l.spread = spread
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False; return o
area('key', (.62, -.6, .42), (0, 0, .10), 1.0, 1.0, 230, (1, .97, .94), spread=radians(80))
area('fill', (-.7, -.7, .2), (0, 0, .09), 1.0, .7, 34, (.97, .98, 1), spread=radians(75))
flag = Mat('flag'); FLAG = flag.done(flag.bsdf(**{'Base Color': (.004, .004, .004, 1), 'Roughness': .9, 'Specular IOR Level': .1}).outputs[0])
for sx_ in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    fo = obj('flag', bm_mesh('flag', bm, False)); fo.data.materials.append(FLAG)
    fo.scale = (1., .7, 1.); fo.location = (sx_ * (.62 if WHAT == 'lineup' else .5), -.05, .25); fo.rotation_euler = (0, pi / 2, 0); fo.visible_camera = False
wl = area('wall', (0., .22, .02), (0, .9, .4), 1.6, .6, 230, (1, .98, .95)); wl.visible_glossy = False; wl.visible_transmission = bool(os.environ.get('MH_WT'))
card = Mat('card'); em = card.n('ShaderNodeEmission', Strength=260.); CARD = card.done(em.outputs[0])
for nm_, loc_ in (('cardL', (-.15, -.33, .16)), ('cardR', (.165, -.32, .16))):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.026, .29, 1), verts=bm.verts)
    co = obj(nm_, bm_mesh(nm_, bm, False)); co.data.materials.append(CARD); co.location = loc_
    co.rotation_euler = (Vector((0, 0, loc_[2])) - Vector(loc_)).to_track_quat('Z', 'Y').to_euler()
    co.visible_camera = False; co.visible_diffuse = False; co.visible_shadow = False; co.visible_volume_scatter = False
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); bmesh.ops.scale(bm, vec=(.9, .7, 1), verts=bm.verts)
bc_ = obj('floorcard', bm_mesh('floorcard', bm, False)); bc_.data.materials.append(FLAG); bc_.location = (0, -.58, .0015)
bc_.visible_camera = False; bc_.visible_diffuse = False; bc_.visible_shadow = False; bc_.visible_transmission = False
area('rimL', (-.36, .36, .18), (0, 0, .10), .08, .6, 70, (1, .97, .95), spread=radians(60))
area('rimR', (.36, .34, .18), (0, 0, .10), .08, .6, 60, (1, .97, .95), spread=radians(60))
area('top', (.06, -.10, .62), (0, 0, .12), .45, .45, 10, (1, .98, .95), spread=radians(60))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .06 * LIGHT / .16
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ------------------------------------------------------------------ camera
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24.; cd.clip_start = .01
cd.dof.use_dof = True; cd.dof.aperture_fstop = 9.
cam = obj('cam', cd); scn.camera = cam
if WHAT == 'lineup':
    cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.; cd.lens = 62.; el = radians(6.); dist = 1.02; tz = .082
else:
    cd.lens = 70.; el = radians(5.5); dist = .62; tz = .082
cam.location = (0, -dist * cos(el), tz + dist * sin(el))
cam.rotation_euler = (Vector((0, 0, tz)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cd.dof.focus_distance = (cam.location - Vector((0, -R, tz))).length

r = scn.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = RES; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .016
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 10; cy.transparent_max_bounces = 16; cy.glossy_bounces = 3; cy.diffuse_bounces = 2
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 5
scn.view_settings.view_transform = os.environ.get('MH_VT', 'Khronos PBR Neutral'); scn.view_settings.look = 'None'
scn.view_settings.exposure = float(os.environ.get('MH_EV', '-3.85'))
for o_ in bpy.data.objects:
    if any(o_.name.startswith(h) for h in filter(None, os.environ.get('MH_HIDE', '').split(','))): o_.hide_render = True
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print('done', OUT)
