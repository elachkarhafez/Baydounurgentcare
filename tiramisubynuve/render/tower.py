# NUVÉ tiramisu tower, path-traced in Cycles: polished steel coupes on stems stacked into a tower like a
# champagne tower, each filled with tiramisu. Three states for the page's sift-to-reveal hero:
#   bare   = smooth mascarpone tops
#   cocoa  = cocoa-dusted tops with NUVÉ stencilled in powdered sugar
#   matcha = matcha-dusted tops with the same stencil
# usage: blender -b -P tower.py -- <out_dir> <state> <view: wide|tall> [samples] [scale]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, STATE, VIEW = argv[0], argv[1], argv[2]
SAMPLES = int(argv[3]) if len(argv) > 3 else 64; SCALE = float(argv[4]) if len(argv) > 4 else 1.
T = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tnr'
HDRI = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/blend/hdri/studio_small_09_1k.hdr'
random.seed(4)
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def link(o): col.objects.link(o); return o
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')
def principled(name, color, **kw):
    m, nt, out = node_mat(name); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = color
    for k, v in kw.items(): b.inputs[k].default_value = v
    nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b, out

STEEL = principled('steel', (.86, .87, .89, 1), Metallic=1., Roughness=.09)[0]
def top_mat():
    """The tiramisu surface. Disc UVs come from object XY (radius R_TOP), so the stencil faces up."""
    if STATE == 'bare':
        m, nt, b, out = principled('top', hexc('#eadbc2'), Roughness=.42, **{'Subsurface Weight': .5, 'Subsurface Scale': .004, 'Coat Weight': .1})
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 140; nz.inputs['Detail'].default_value = 4
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .12; bp.inputs['Distance'].default_value = .0004
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
        return m
    powder = '#5a2a10' if STATE == 'cocoa' else '#6f9a1c'
    powder2 = '#3a1608' if STATE == 'cocoa' else '#527812'
    m, nt, b, out = principled('top', hexc(powder), Roughness=.98, **{'Sheen Weight': .12, 'Sheen Roughness': .8, 'Specular IOR Level': .05})
    tc = nt.nodes.new('ShaderNodeTexCoord')
    # powder grain
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900; nz.inputs['Detail'].default_value = 8
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    grain = nt.nodes.new('ShaderNodeValToRGB'); grain.color_ramp.elements[0].color = hexc(powder2); grain.color_ramp.elements[1].color = hexc(powder)
    grain.color_ramp.elements[0].position = .35; grain.color_ramp.elements[1].position = .65
    nt.links.new(nz.outputs['Fac'], grain.inputs[0])
    # stencil: object XY → image UV
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / (2 * R_TOP) * .92, 1 / (2 * R_TOP) * .92, 1); mp.inputs['Location'].default_value = (.5, .5, 0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(os.path.join(T, 'nuve.png')); im.extension = 'CLIP'
    nt.links.new(mp.outputs[0], im.inputs['Vector'])
    # soften the stencil edge with a little grain so it reads as sifted sugar
    sharp = nt.nodes.new('ShaderNodeMath'); sharp.operation = 'MULTIPLY_ADD'; sharp.inputs[1].default_value = .3; sharp.inputs[2].default_value = -.15
    nt.links.new(nz.outputs['Fac'], sharp.inputs[0])
    a = nt.nodes.new('ShaderNodeMath'); a.operation = 'ADD'; a.use_clamp = True; nt.links.new(im.outputs['Alpha'], a.inputs[0]); nt.links.new(sharp.outputs[0], a.inputs[1])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[7].default_value = hexc('#f4ede0')
    nt.links.new(a.outputs[0], mix.inputs[0]); nt.links.new(grain.outputs[0], mix.inputs[6]); nt.links.new(mix.outputs[2], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .35; bp.inputs['Distance'].default_value = .0003
    nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m

def lathe(name, prof, seg=96):
    verts, faces, rings = [], [], []
    for r, z in prof:
        if r < 1e-7: verts.append((0, 0, z)); rings.append([len(verts) - 1])
        else:
            idx = []
            for k in range(seg): a = 2 * pi * k / seg; verts.append((r * cos(a), r * sin(a), z)); idx.append(len(verts) - 1)
            rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(seg):
            if len(A) == 1 and len(B) == 1: break
            if len(A) == 1: faces.append((A[0], B[(k + 1) % seg], B[k]))
            elif len(B) == 1: faces.append((A[k], A[(k + 1) % seg], B[0]))
            else: faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    for p in me.polygons: p.use_smooth = True
    return me

# ---------------------------------------------------------------- one coupe (stem height varies)
R_BOWL, R_TOP = .056, .052
TOP_MAT = top_mat()
bowl_me = lathe('bowl', [(0, 0), (.012, 0), (.03, .006), (.046, .014), (.054, .022), (.0575, .028), (.0585, .0305), (.057, .031), (.0555, .0285), (.052, .025), (.045, .018), (.03, .011), (.012, .006), (0, .005)], 96)
foot_me = lathe('foot', [(0, 0), (.034, 0), (.036, .002), (.033, .004), (.012, .008), (.006, .012), (0, .012)], 64)
top_me = lathe('top', [(0, .0262), (R_TOP * .6, .0262), (R_TOP, .0258), (R_TOP + .0015, .0248)], 96)
def coupe(x, y, z_base, stem):
    g = link(bpy.data.objects.new('coupe', None)); g.location = (x, y, z_base)
    f = link(bpy.data.objects.new('foot', foot_me)); f.parent = g; f.data.materials.append(STEEL) if not f.data.materials else None
    bpy.ops.mesh.primitive_cylinder_add(radius=.0042, depth=stem, vertices=24, location=(x, y, z_base + .01 + stem / 2)); s = bpy.context.active_object; s.data.materials.append(STEEL)
    for p in s.data.polygons: p.use_smooth = True
    b = link(bpy.data.objects.new('bowl', bowl_me)); b.parent = g; b.location = (0, 0, .01 + stem)
    if not b.data.materials: b.data.materials.append(STEEL)
    t = link(bpy.data.objects.new('top', top_me)); t.parent = g; t.location = (0, 0, .01 + stem)
    if not t.data.materials: t.data.materials.append(TOP_MAT)
    return g

# tower: a mirrored tray with concentric rings of coupes, inner rings standing taller (champagne-tower silhouette)
bpy.ops.mesh.primitive_cylinder_add(radius=.33, depth=.012, vertices=128, location=(0, 0, .006)); tray = bpy.context.active_object; tray.data.materials.append(STEEL)
bv = tray.modifiers.new('bv', 'BEVEL'); bv.width = .003; bv.segments = 3
rings = [(0, 1, .66), (.075, 4, .52), (.14, 7, .38), (.2, 10, .24), (.26, 13, .1)]
for ri, (r, n, h) in enumerate(rings):
    for k in range(n):
        a = k / n * 2 * pi + ri * .35 + pi / 2
        coupe(cos(a) * r, sin(a) * r, .012, h + (random.uniform(-.004, .004) if r else 0))

# ---------------------------------------------------------------- set: warm brown studio, low key
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); fl = bpy.context.active_object; fl.visible_camera = False; fl.visible_shadow = False
fl.data.materials.append(principled('floor', hexc('#24150d'), Roughness=.6, **{'Coat Weight': .15, 'Coat Roughness': .3})[0])
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 3.2, 2), rotation=(pi / 2, 0, 0)); wall = bpy.context.active_object
wall.data.materials.append(principled('wall', hexc('#3a2418'), Roughness=.9)[0]); wall.visible_camera = False; wall.visible_shadow = False; wall.visible_diffuse = False
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('key', (-.9, -1.0, 1.2), (0, 0, .4), .7, .5, 26, (1, .93, .84))
area('top', (0, -.2, 2.0), (0, 0, .4), .7, .7, 12, (1, .96, .9))
area('rimL', (-1.0, .9, .9), (0, 0, .4), .12, 1.2, 22, (1, .88, .74))
area('rimR', (1.0, .8, .9), (0, 0, .4), .12, 1.2, 18, (.95, .92, 1))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .18; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.dof.use_dof = True; cd.dof.aperture_fstop = 6.3
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
focus = link(bpy.data.objects.new('focus', None)); focus.location = (0, -.15, .38); cd.dof.focus_object = focus
r = scn.render
if VIEW == 'wide':
    r.resolution_x, r.resolution_y = 1800, 1000; cd.lens = 56; cam.location = (0, -2.0, .84); tgt = Vector((0, 0, .35))
else:
    r.resolution_x, r.resolution_y = 1000, 1300; cd.lens = 54; cam.location = (0, -2.3, .92); tgt = Vector((0, 0, .37))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
r.resolution_percentage = int(100 * SCALE); r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 10; cy.glossy_bounces = 6; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 8
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'
os.makedirs(OUT, exist_ok=True)
r.filepath = os.path.join(OUT, f'{STATE}-{VIEW}.png'); bpy.ops.render.render(write_still=True)
print('done')
