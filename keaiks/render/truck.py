# Keaik's food truck, path-traced in Cycles, as a clean side elevation (orthographic camera) so the page can
# drive it in on scroll and spin the wheels as separate layers.
# States: closed (roll-up shutter down, awning folded) / open (shutter up, red awning out, warm lit window) /
# wheel (one wheel alone, for the page to rotate). Transparent background with a shadow-catcher floor.
# usage: blender -b -P truck.py -- <out_dir> <state: open|closed|wheel> [samples] [scale]
import bpy, bmesh, math, sys, os, json
from math import pi, sin, cos
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, STATE = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv) > 2 else 64; SCALE = float(argv[3]) if len(argv) > 3 else 1.
HERE = os.path.dirname(os.path.abspath(__file__))
HDRI = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/blend/hdri/studio_small_09_1k.hdr'
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
def emission(name, color, strength):
    m, nt, out = node_mat(name); e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = color; e.inputs[1].default_value = strength
    nt.links.new(e.outputs[0], out.inputs[0]); return m

PAINT = principled('paint', hexc('#f1f0ec'), Roughness=.28, **{'Coat Weight': 1., 'Coat Roughness': .05})[0]
RED = principled('red', hexc('#c8202a'), Roughness=.3, **{'Coat Weight': 1., 'Coat Roughness': .06})[0]
BLACK = principled('black', hexc('#121212'), Roughness=.55)[0]
TRIM = principled('trim', hexc('#2a2a2a'), Roughness=.4, Metallic=.2)[0]
STEEL = principled('steel', hexc('#c9cbcd'), Metallic=1., Roughness=.28)[0]
CHROME = principled('chrome', hexc('#e2e2e2'), Metallic=1., Roughness=.1)[0]
GLASS = principled('glass', hexc('#141a20'), Roughness=.04, **{'Coat Weight': 1.})[0]
AMBER = emission('amber', hexc('#ffb347'), 6.)
def rubber():
    m, nt, b, out = principled('rubber', hexc('#141414'), Roughness=.72)
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 300
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .15
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m
RUBBER = rubber()
def shutter_mat():
    """Corrugated stainless roll-up shutter: horizontal ribs from a wave texture."""
    m, nt, b, out = principled('shutter', hexc('#b9bcbf'), Metallic=1., Roughness=.34)
    tc = nt.nodes.new('ShaderNodeTexCoord'); wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'
    wv.inputs['Scale'].default_value = 7; nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .5; bp.inputs['Distance'].default_value = .01
    nt.links.new(wv.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m
def logo_mat():
    m, nt, out = node_mat('logo')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(HERE, 'logo.png')); tex.extension = 'CLIP'
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = .3; b.inputs['Coat Weight'].default_value = 1.
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color']); nt.links.new(tex.outputs['Alpha'], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(b.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    return m

def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=0., seg=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.active_object; o.name = name; o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = seg
        bpy.ops.object.shade_smooth_by_angle(angle=.6)
    return o
def disc(name, x, y, z, r, mat, depth=.004, verts=96):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=(x, y, z), rotation=(pi / 2, 0, 0))
    o = bpy.context.active_object; o.name = name; o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o
def lathe_y(name, prof, seg=96):
    """Revolve (radius, y) around the Y axis (wheel axle)."""
    verts, faces, rings = [], [], []
    for r, y in prof:
        idx = []
        for k in range(seg): a = 2 * pi * k / seg; verts.append((r * cos(a), y, r * sin(a))); idx.append(len(verts) - 1)
        rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(seg): faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    for p in me.polygons: p.use_smooth = True
    return me

YS = -1.1                 # the side facing the camera
WR, WZ = .45, .45          # wheel radius / centre height
AX = (-1.75, 1.85)         # rear / front axle x
WIN = (-1.5, .6, 1.42, 2.36)

if STATE != 'wheel':
    body = box('body', -2.75, 1.15, -1.1, 1.1, .58, 3.0, PAINT, .09, 6)
    cut = box('cut', WIN[0], WIN[1], -1.4, -.55, WIN[2], WIN[3], BLACK)
    bo = body.modifiers.new('win', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'; cut.hide_render = True; cut.hide_viewport = True
    cab = box('cab', 1.05, 2.68, -1.05, 1.05, .58, 2.4, PAINT, .2, 8)
    box('roofcap', 1.0, 1.2, -1.06, 1.06, 2.36, 2.98, PAINT, .08, 4)  # fairing where the cab meets the box
    box('door_glass', 1.42, 2.3, -1.07, -1.0, 1.55, 2.2, GLASS, .05, 3)
    box('mirror_arm', 2.55, 2.6, -1.25, -1.0, 1.95, 1.99, TRIM)
    box('mirror', 2.5, 2.62, -1.32, -1.22, 1.72, 2.06, TRIM, .02, 2)
    box('handle', 1.55, 1.72, -1.07, -1.05, 1.38, 1.42, CHROME, .008, 2)
    box('bumper_f', 2.55, 2.8, -1.0, 1.0, .5, .78, TRIM, .04, 3)
    box('bumper_r', -2.88, -2.7, -1.0, 1.0, .5, .74, TRIM, .04, 3)
    box('chassis', -2.5, 2.5, -.8, .8, .4, .6, principled('under', hexc('#0b0b0b'), Roughness=.8)[0])
    box('marker_f', 2.52, 2.64, -1.08, -1.04, .9, 1.0, AMBER, .01, 2)
    box('marker_r', -2.76, -2.68, -1.12, -1.1, 2.7, 2.82, emission('redlamp', hexc('#ff2a2a'), 4.), .01, 2)
    # aluminium corner trim, roof unit, cab door seams
    for x in (-2.77, 1.07):
        box('corner', x, x + .08, -1.13, -1.08, .62, 2.98, STEEL, .01, 2)
    box('roof_trim', -2.75, 1.15, -1.13, -1.08, 2.94, 3.0, STEEL, .01, 2)
    box('ac', -2.2, -1.2, -.5, .5, 3.0, 3.28, principled('ac', hexc('#d9d8d4'), Roughness=.35)[0], .05, 4)
    box('vent', .2, .45, -.3, .3, 3.0, 3.1, STEEL, .02, 2)
    for (x0, x1, z0, z1) in ((1.32, 1.34, .66, 2.25), (2.38, 2.4, .66, 2.25), (1.32, 2.4, 2.25, 2.27)):
        box('seam', x0, x1, -1.066, -1.05, z0, z1, TRIM)
    box('step', 1.3, 2.3, -1.12, -.9, .52, .58, TRIM, .01, 2)
    # brand: red stripe + logo badge
    box('stripe', -2.72, 2.62, -1.112, -1.1, .74, .86, RED)
    box('stripe2', -2.72, 1.12, -1.112, -1.1, .92, .95, RED)
    disc('badge', -2.12, -1.114, 2.0, .5, BLACK, .006)
    disc('badge_ring', -2.12, -1.112, 2.0, .53, RED, .004)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-2.12, -1.121, 2.0), rotation=(pi / 2, 0, 0)); lg = bpy.context.active_object
    lg.scale = (.86, .86 * 654 / 1016, 1); lg.data.materials.append(logo_mat())
    # wheel wells (dark arches the wheels sit in)
    for ax in AX:  # half-disc arch above the axle; the wheel layer covers the rest
        bm = bmesh.new(); vs = [bm.verts.new((ax + .56 * cos(pi * i / 48), -1.116, WZ + .04 + .56 * sin(pi * i / 48))) for i in range(49)]
        bm.faces.new(vs); me = bpy.data.meshes.new('well'); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('well', me)); me.materials.append(BLACK)
    # serving window: trim frame, counter, interior
    for (x0, x1, z0, z1) in ((WIN[0] - .06, WIN[1] + .06, WIN[3], WIN[3] + .06), (WIN[0] - .06, WIN[1] + .06, WIN[2] - .06, WIN[2]),
                             (WIN[0] - .06, WIN[0], WIN[2], WIN[3]), (WIN[1], WIN[1] + .06, WIN[2], WIN[3])):
        box('frame', x0, x1, -1.13, -1.06, z0, z1, STEEL, .01, 2)
    box('counter', WIN[0] - .05, WIN[1] + .05, -1.42, -1.05, WIN[2] - .08, WIN[2] - .04, STEEL, .01, 2)
    box('back', -2.6, 1.0, .5, .55, .6, 2.9, principled('inwall', hexc('#4c4844'), Roughness=.45, Metallic=.4)[0])
    box('menu', -1.25, .35, .45, .5, 1.85, 2.25, BLACK, .01, 2)
    for i, x in enumerate((-1.1, -.6, -.1)):
        box('menuline', x, x + .35, .44, .45, 2.12 - 0, 2.15, emission('chalk', hexc('#f3efe6'), 1.2 if STATE == 'open' else .15))
    box('shelf', -1.45, .55, -.6, .5, 1.62, 1.66, STEEL)
    for i, x in enumerate((-1.3, -1.05, .25)):
        bpy.ops.mesh.primitive_cylinder_add(radius=.05, depth=.22, location=(x, .2, 1.77)); b = bpy.context.active_object
        b.data.materials.append(RED if i < 2 else principled('sauce', hexc('#efe3cf'), Roughness=.3)[0]); bpy.ops.object.shade_smooth()
    for i, (x, c) in enumerate(((WIN[0] + .25, RED), (WIN[0] + .45, principled('sauce2', hexc('#efe3cf'), Roughness=.25)[0]), (WIN[1] - .3, RED))):
        if STATE != 'open': break
        bpy.ops.mesh.primitive_cylinder_add(radius=.055, depth=.24, location=(x, -1.24, WIN[2] + .08)); b = bpy.context.active_object; b.data.materials.append(c); bpy.ops.object.shade_smooth()
        bpy.ops.mesh.primitive_cone_add(radius1=.05, radius2=.008, depth=.09, location=(x, -1.24, WIN[2] + .245)); n = bpy.context.active_object; n.data.materials.append(c); bpy.ops.object.shade_smooth()
    if STATE == 'open':
        box('lightbar', WIN[0] + .05, WIN[1] - .05, -.7, -.5, WIN[3] - .04, WIN[3] - .01, emission('warm', hexc('#ffd9a0'), 5.))
        l = bpy.data.lights.new('inside', 'AREA'); l.size = 2.; l.size_y = 1.; l.energy = 40; l.color = (1, .82, .6)
        o = link(bpy.data.objects.new('inside', l)); o.location = (-.45, -.2, 2.3); o.rotation_euler = (0, 0, 0)
        # awning out over the window
        x0, x1, zt = WIN[0] - .14, WIN[1] + .14, WIN[3] + .14
        me = bpy.data.meshes.new('awning'); me.from_pydata([(x0, YS - .01, zt), (x1, YS - .01, zt), (x1, YS - .62, zt - .34), (x0, YS - .62, zt - .34)], [], [(0, 1, 2, 3)])
        aw = link(bpy.data.objects.new('awning', me)); me.materials.append(RED); sol = aw.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .025
        for i in range(12):  # scalloped valance along the front edge
            xx = x0 + (x1 - x0) * (i + .5) / 12
            bpy.ops.mesh.primitive_cylinder_add(radius=(x1 - x0) / 24, depth=.02, vertices=32, location=(xx, YS - .625, zt - .36), rotation=(pi / 2, 0, 0))
            v = bpy.context.active_object; v.scale = (1, .55, 1); v.data.materials.append(RED)
        for x in (WIN[0] - .05, WIN[1] + .05):
            bpy.ops.mesh.primitive_cylinder_add(radius=.012, depth=.62, location=(x, YS - .25, WIN[3] - .12), rotation=(.95, 0, 0)); s = bpy.context.active_object; s.data.materials.append(STEEL)
    else:
        box('awning_flat', WIN[0] - .12, WIN[1] + .12, -1.17, -1.11, WIN[3] + .08, WIN[3] + .5, RED, .02, 3)
        sh = box('shutter', WIN[0], WIN[1], -1.08, -1.04, WIN[2], WIN[3], shutter_mat())
        box('shutter_lock', (WIN[0] + WIN[1]) / 2 - .06, (WIN[0] + WIN[1]) / 2 + .06, -1.1, -1.07, WIN[2] + .04, WIN[2] + .1, CHROME, .01, 2)

# ---------------------------------------------------------------- wheel (built at the front axle; the page clones it for both)
def wheel(x):
    t = link(bpy.data.objects.new('tire', lathe_y('tire', [(.3, -.14), (.39, -.155), (.44, -.14), (.45, -.1), (.45, .1), (.44, .14), (.39, .155), (.3, .14)])))
    t.location = (x, -.85, WZ); t.data.materials.append(RUBBER)
    r = link(bpy.data.objects.new('rim', lathe_y('rim', [(.0, -.17), (.06, -.17), (.09, -.16), (.1, -.14), (.27, -.13), (.3, -.12), (.31, -.1), (.31, .1)])))
    r.location = (x, -.85, WZ); r.data.materials.append(STEEL)
    hub = link(bpy.data.objects.new('hub', lathe_y('hub', [(.0, -.205), (.05, -.2), (.075, -.18), (.08, -.16)])))
    hub.location = (x, -.85, WZ); hub.data.materials.append(CHROME)
    for k in range(8):  # lug nuts + vent holes give the rotation something to read
        a = 2 * pi * k / 8
        bpy.ops.mesh.primitive_cylinder_add(radius=.016, depth=.03, vertices=6, location=(x + .125 * cos(a), -1.01, WZ + .125 * sin(a)), rotation=(pi / 2, 0, 0))
        n = bpy.context.active_object; n.data.materials.append(CHROME)
        disc('vent', x + .215 * cos(a + pi / 8), -.985, WZ + .215 * sin(a + pi / 8), .035, BLACK, .01, 24)
    # a sidewall stripe so the spin reads
    t2 = link(bpy.data.objects.new('wall_txt', lathe_y('wall_txt', [(.36, -.152), (.38, -.152)], 96)))
    t2.location = (x, -.85, WZ); t2.data.materials.append(principled('wallmark', hexc('#3a3a3a'), Roughness=.6)[0])
if STATE == 'wheel': wheel(0.)

# ---------------------------------------------------------------- set
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0)); fl = bpy.context.active_object; fl.is_shadow_catcher = True
fl.data.materials.append(principled('floor', hexc('#2a2827'), Roughness=.8)[0])
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('key', (-3, -7, 6), (0, 0, 1.5), 6, 3, 1200, (1, .97, .92))
area('fill', (5, -6, 2), (0, 0, 1.2), 4, 3, 320, (.94, .96, 1))
area('top', (0, -1, 8), (0, 0, 1.5), 8, 3, 420)
area('rim', (6, 4, 4), (0, 0, 1.5), 1, 4, 450, (1, .9, .8))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .3; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = 6.4
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (0, -20, 1.55 + 20 * .035); cam.rotation_euler = (pi / 2 - .035, 0, 0)  # a hair of top-down so the roof edge reads
r = scn.render; r.resolution_x, r.resolution_y = 2000, 1100; r.resolution_percentage = int(100 * SCALE)
r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 8
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'

bpy.context.view_layer.update()
def img(p): c = world_to_camera_view(scn, cam, Vector(p)); return [round(c.x, 5), round(1 - c.y, 5)]
os.makedirs(OUT, exist_ok=True)
if STATE == 'closed':
    json.dump({'w': r.resolution_x, 'h': r.resolution_y, 'wheels': [img((ax, -1.2, WZ)) for ax in AX], 'wheelR': img((AX[1] + WR, -1.2, WZ))[0] - img((AX[1], -1.2, WZ))[0],
               'front': img((2.8, -1.2, 1))[0], 'rear': img((-2.88, -1.2, 1))[0], 'ground': img((0, -1.2, 0))[1]}, open(os.path.join(OUT, 'truck.json'), 'w'))
if STATE == 'wheel':
    json.dump({'centre': img((0, -1.2, WZ)), 'r': img((WR, -1.2, WZ))[0] - img((0, -1.2, WZ))[0]}, open(os.path.join(OUT, 'wheel.json'), 'w'))
r.filepath = os.path.join(OUT, f'truck-{STATE}.png'); bpy.ops.render.render(write_still=True)
print('done')
