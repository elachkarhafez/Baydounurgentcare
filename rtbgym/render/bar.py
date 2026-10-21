# RTB Gym: an old-school loaded barbell, path-traced in Cycles, rendered at 0..6 plates a side.
# The bar bends more with every plate (like the bent bar in their logo). Transparent background.
# usage: blender -b -P bar.py -- <out_dir> <plates 0-6> [samples] [scale]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; NP = int(argv[1]); SAMPLES = int(argv[2]) if len(argv) > 2 else 64; SCALE = float(argv[3]) if len(argv) > 3 else 1.
HDRI = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/blend/hdri/studio_small_09_1k.hdr'
random.seed(2)
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

# cast iron: black hammertone paint, worn to bare metal on the edges (pointiness)
IRON, nt, b, out = principled('iron', hexc('#141416'), Roughness=.42, Metallic=.35)
geo = nt.nodes.new('ShaderNodeNewGeometry'); ramp = nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = .52; ramp.color_ramp.elements[0].color = (0, 0, 0, 1); ramp.color_ramp.elements[1].position = .6; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
nt.links.new(geo.outputs['Pointiness'], ramp.inputs[0])
mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.inputs[6].default_value = hexc('#141416'); mixc.inputs[7].default_value = hexc('#6d6a66')
nt.links.new(ramp.outputs[0], mixc.inputs[0]); nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 260; nz.inputs['Detail'].default_value = 6
bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .35; bp.inputs['Distance'].default_value = .0006
nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
STEEL = principled('steel', (.72, .73, .75, 1), Metallic=1., Roughness=.22)[0]
KNURL, knt, kb, kout = principled('knurl', (.62, .63, .65, 1), Metallic=1., Roughness=.38)
ktc = knt.nodes.new('ShaderNodeTexCoord'); kw = knt.nodes.new('ShaderNodeTexWave'); kw.wave_type = 'BANDS'; kw.inputs['Scale'].default_value = 140
kw2 = knt.nodes.new('ShaderNodeTexWave'); kw2.wave_type = 'BANDS'; kw2.inputs['Scale'].default_value = 140; kw2.bands_direction = 'Y'
mx = knt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'
knt.links.new(ktc.outputs['Object'], kw.inputs['Vector']); knt.links.new(ktc.outputs['Object'], kw2.inputs['Vector'])
knt.links.new(kw.outputs['Fac'], mx.inputs[0]); knt.links.new(kw2.outputs['Fac'], mx.inputs[1])
kbp = knt.nodes.new('ShaderNodeBump'); kbp.inputs['Strength'].default_value = .6; kbp.inputs['Distance'].default_value = .0004
knt.links.new(mx.outputs[0], kbp.inputs['Height']); knt.links.new(kbp.outputs[0], kb.inputs['Normal'])
ORANGE = principled('orange', hexc('#f2911b'), Roughness=.32, **{'Coat Weight': .6})[0]
RUBBER = principled('floor', hexc('#0d0d0e'), Roughness=.85)[0]

# ---------------------------------------------------------------- the bar (along X), bent by a curve
L, SLEEVE0 = 2.2, .72          # half-length to sleeve start ~ .72 m from center... (bar centered at origin)
bend = .012 + NP * .022       # sag at the sleeves, grows with load
def sag(x): return -bend * (abs(x) / 1.1) ** 2
def bar_piece(x0, x1, r, mat, seg=48, steps=40):
    bm = bmesh.new(); rings = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps; y0 = sag(x)
        rings.append([bm.verts.new((x, r * cos(2 * pi * k / seg), y0 + r * sin(2 * pi * k / seg))) for k in range(seg)])
    for i in range(steps):
        A, B = rings[i], rings[i + 1]
        for k in range(seg): bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('bar'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new('bar', me)); o.data.materials.append(mat); return o
bar_piece(-.66, .66, .0145, KNURL)          # shaft
for s in (-1, 1):
    bar_piece(s * .66, s * .68, .021, STEEL, steps=4)       # inner collar
    bar_piece(s * .68, s * 1.1, .025, STEEL, steps=30)      # sleeve

# ---------------------------------------------------------------- old-school deep-dish 45 lb plates
R_PL, T_PL = .225, .055
plate_prof = [(.0255, -T_PL / 2), (.06, -T_PL / 2), (.07, -T_PL / 2 + .012), (.19, -T_PL / 2 + .012), (.205, -T_PL / 2), (R_PL, -T_PL / 2 + .004),
              (R_PL + .002, 0), (R_PL, T_PL / 2 - .004), (.205, T_PL / 2), (.19, T_PL / 2 - .014), (.07, T_PL / 2 - .014), (.06, T_PL / 2), (.0255, T_PL / 2)]
def plate_mesh():
    seg = 128; verts, faces = [], []
    for r, z in plate_prof:
        for k in range(seg): a = 2 * pi * k / seg; verts.append((z, r * cos(a), r * sin(a)))
    n = len(plate_prof)
    for i in range(n):
        j = (i + 1) % n
        for k in range(seg): faces.append((i * seg + k, i * seg + (k + 1) % seg, j * seg + (k + 1) % seg, j * seg + k))
    me = bpy.data.meshes.new('plate'); me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me
PM = plate_mesh()
def plate(x, side):
    o = link(bpy.data.objects.new('plate', PM)); o.data.materials.append(IRON) if not o.data.materials else None
    o.location = (x, 0, sag(x)); o.rotation_euler = (random.uniform(0, 6.28), 0, -side * math.atan(2 * bend * abs(x) / 1.1 ** 2) * 0)
    # tilt with the bar's slope at x
    slope = -2 * bend * abs(x) / 1.1 ** 2
    o.rotation_euler = (random.uniform(0, 6.28), side * math.atan(slope) * -1, 0)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .0025; bv.segments = 2
    # raised "45" lettering ring on the outer face
    return o
for s in (-1, 1):
    for i in range(NP):
        plate(s * (.7 + T_PL / 2 + .002 + i * (T_PL + .002)), s)
    # orange spring collar right outside the stack
    xc = s * (.7 + NP * (T_PL + .002) + .016)
    bpy.ops.mesh.primitive_torus_add(major_radius=.029, minor_radius=.008, location=(xc, 0, sag(xc)), rotation=(0, pi / 2, 0))
    c = bpy.context.active_object; c.data.materials.append(ORANGE)
    bpy.ops.mesh.primitive_cylinder_add(radius=.004, depth=.06, location=(xc, 0, sag(xc) + .045)); h = bpy.context.active_object; h.data.materials.append(ORANGE)

# ---------------------------------------------------------------- set: dark gym, orange rim light
bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, -.35)); fl = bpy.context.active_object; fl.data.materials.append(RUBBER); fl.visible_camera = False; fl.visible_shadow = False
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('key', (-1.2, -2.0, 1.6), (0, 0, 0), 1.6, .4, 120, (1, .97, .93))
area('top', (0, -.3, 2.2), (0, 0, 0), 3.0, .3, 90)
area('rimL', (-2.4, 1.6, .5), (0, 0, 0), .25, 1.4, 160, (1, .55, .15))
area('rimR', (2.4, 1.6, .5), (0, 0, 0), .25, 1.4, 160, (1, .55, .15))
area('fill', (.6, -2.4, -.3), (0, 0, 0), 2.0, .5, 18, (.85, .9, 1))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .25; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 50; cd.dof.use_dof = True; cd.dof.aperture_fstop = 9
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (0, -4.0, .5); tgt = Vector((0, 0, -.07))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
focus = link(bpy.data.objects.new('focus', None)); focus.location = (0, 0, 0); cd.dof.focus_object = focus
r = scn.render; r.resolution_x, r.resolution_y = 2000, 900; r.resolution_percentage = int(100 * SCALE)
r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 8
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'
os.makedirs(OUT, exist_ok=True)
r.filepath = os.path.join(OUT, f'bar-{NP}.png'); bpy.ops.render.render(write_still=True)
print('done')
