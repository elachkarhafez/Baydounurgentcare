# Soura Classic Booth, path-traced in Cycles: ring light on an arm, a grey stadium-shaped pod with a warm
# LED line around its face, a Canon lens, a portrait screen, and a pole with a lit strip on a round base.
# Transparent background with a shadow-catcher floor so the page's backdrop shows through.
# Exports the screen, lens and ring positions in image space so the page can draw the live booth screen.
# usage: bpe run booth.py -m final -- <out_dir> [samples] [scale]
import bpy, bmesh, math, sys, os, json
from math import sin, cos, pi
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 64; SCALE = float(argv[2]) if len(argv) > 2 else 1.
from bpe_assets import asset  # pinned in blender-perf.json, fetched once into the shared cache (run through bpe)
HDRI = asset('studio_small_09_1k.hdr')
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

def shell_mat():
    """Satin powder-coated grey with a faint orange-peel bump, like the booth in their post."""
    m, nt, b, out = principled('shell', hexc('#575654'), Metallic=.15, Roughness=.45, **{'Coat Weight': .25, 'Coat Roughness': .22})
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900; nz.inputs['Detail'].default_value = 2
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .05; bp.inputs['Distance'].default_value = .0002
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m
SHELL = shell_mat()
DARK = principled('dark', hexc('#3a3937'), Metallic=.3, Roughness=.42)[0]
CHROME = principled('chrome', hexc('#d9d9d9'), Metallic=1., Roughness=.16)[0]
BLACK = principled('black', hexc('#0b0b0c'), Roughness=.3)[0]
GLASS = principled('lensglass', hexc('#0a0d14'), Roughness=.02, **{'Coat Weight': 1., 'Coat Roughness': .0, 'Coat Tint': hexc('#7a6cff')})[0]
LED = emission('led', hexc('#ffb866'), 22.)
RING = emission('ring', hexc('#fff1dc'), 7.)
SCREEN = emission('screen', hexc('#f3ece1'), 1.4)

def smooth_angle(o, ang=.6):
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=ang); o.select_set(False)

def stadium_pts(w, h, n=48):
    """Outline of a stadium (rectangle with semicircle ends) in XZ, centred on the origin."""
    r = w / 2; c = h / 2 - r; pts = []
    for i in range(n + 1): a = pi * i / n; pts.append((r * cos(a), c + r * sin(a)))
    for i in range(n + 1): a = pi + pi * i / n; pts.append((r * cos(a), -c + r * sin(a)))
    return pts
def rrect_pts(w, h, r, n=10):
    pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, pi / 2), (-w / 2 + r, -h / 2 + r, pi), (w / 2 - r, -h / 2 + r, 3 * pi / 2)):
        for i in range(n + 1): a = a0 + pi / 2 * i / n; pts.append((cx + r * cos(a), cz + r * sin(a)))
    return pts
def slab(name, pts, depth, loc, mat, bevel=.0, seg=4):
    """Extrude an XZ outline along Y (front face at y = -depth/2)."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; me.materials.append(mat)
    if bevel:
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = .7
    smooth_angle(o); return o
def tube_curve(name, pts, loc, radius, mat, closed=True):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 4
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, z) in zip(sp.points, pts): p.co = (x, 0, z, 1)
    sp.use_cyclic_u = closed
    o = link(bpy.data.objects.new(name, cu)); o.location = loc; cu.materials.append(mat); return o

# ---------------------------------------------------------------- the booth
POD_W, POD_H, POD_D, POD_Z = .40, .86, .10, 1.38
# base + pole with its LED strip
bpy.ops.mesh.primitive_cylinder_add(radius=.21, depth=.022, vertices=128, location=(0, 0, .011)); base = bpy.context.active_object
base.data.materials.append(SHELL); bv = base.modifiers.new('bv', 'BEVEL'); bv.width = .006; bv.segments = 4; smooth_angle(base)
pole_h = POD_Z - POD_H / 2 + .04 - .022
slab('pole', rrect_pts(.09, pole_h, .012), .06, (0, .0, .022 + pole_h / 2), SHELL, .004)
slab('strip', rrect_pts(.012, pole_h - .16, .005), .004, (0, -.031, .022 + .07 + (pole_h - .16) / 2), LED)
# pod: grey stadium shell, a dark inset face, the warm LED line just inside the edge
pod = slab('pod', stadium_pts(POD_W, POD_H), POD_D, (0, 0, POD_Z), SHELL, .016, 5)
slab('face', stadium_pts(POD_W - .05, POD_H - .05), .006, (0, -POD_D / 2 - .002, POD_Z), DARK, .002, 2)
tube_curve('ledline', stadium_pts(POD_W - .036, POD_H - .036, 64), (0, -POD_D / 2 - .003, POD_Z), .0042, LED)
# screen in a black bezel
SCR_W, SCR_H, SCR_Z = .22, .31, POD_Z - .05
slab('bezel', rrect_pts(SCR_W + .022, SCR_H + .022, .012), .006, (0, -POD_D / 2 - .006, SCR_Z), BLACK, .002, 2)
slab('screen', rrect_pts(SCR_W, SCR_H, .006), .002, (0, -POD_D / 2 - .009, SCR_Z), SCREEN)
# Canon lens above the screen
LENS_Z = POD_Z + POD_H / 2 - .115
bpy.ops.mesh.primitive_cylinder_add(radius=.046, depth=.03, vertices=96, location=(0, -POD_D / 2 - .012, LENS_Z), rotation=(pi / 2, 0, 0)); lr = bpy.context.active_object
lr.data.materials.append(BLACK); b = lr.modifiers.new('bv', 'BEVEL'); b.width = .004; b.segments = 3; smooth_angle(lr)
bpy.ops.mesh.primitive_torus_add(major_radius=.036, minor_radius=.004, major_segments=96, minor_segments=12, location=(0, -POD_D / 2 - .027, LENS_Z), rotation=(pi / 2, 0, 0))
t = bpy.context.active_object; t.data.materials.append(CHROME); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_uv_sphere_add(radius=.03, segments=64, ring_count=32, location=(0, -POD_D / 2 - .012, LENS_Z), scale=(1, .45, 1)); gl = bpy.context.active_object
gl.data.materials.append(GLASS); bpy.ops.object.shade_smooth()
# ring light on a chrome arm with a hinge block
TOP = POD_Z + POD_H / 2
RING_R, RING_T = .2, .03
RING_Z = TOP + .11 + RING_R + RING_T
bpy.ops.mesh.primitive_cylinder_add(radius=.011, depth=.13, vertices=48, location=(0, 0, TOP + .065)); arm = bpy.context.active_object; arm.data.materials.append(CHROME); bpy.ops.object.shade_smooth()
slab('hinge', rrect_pts(.036, .05, .008), .034, (0, 0, TOP + .085), SHELL, .003)
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R, minor_radius=RING_T, major_segments=192, minor_segments=32, location=(0, .006, RING_Z), rotation=(pi / 2, 0, 0))
ring_back = bpy.context.active_object; ring_back.data.materials.append(DARK); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R, minor_radius=RING_T * .86, major_segments=192, minor_segments=32, location=(0, -.02, RING_Z), rotation=(pi / 2, 0, 0))
ring = bpy.context.active_object; ring.data.materials.append(RING); ring.scale = (1, 1, .6); bpy.ops.object.shade_smooth()

# ---------------------------------------------------------------- set: shadow catcher floor, soft studio light
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); fl = bpy.context.active_object; fl.is_shadow_catcher = True
fl.data.materials.append(principled('floor', hexc('#efe7da'), Roughness=.8)[0])
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('key', (-2.2, -2.6, 2.6), (0, 0, 1.3), 1.6, 1.6, 190, (1, .95, .88))
area('fill', (2.6, -2.2, 1.6), (0, 0, 1.2), 1.4, 1.8, 70, (.96, .96, 1))
area('rimL', (-1.4, 1.6, 2.2), (0, 0, 1.4), .5, 2.2, 110, (1, .9, .78))
area('rimR', (1.5, 1.4, 1.8), (0, 0, 1.3), .5, 2.2, 90, (1, .94, .88))
area('top', (0, -.4, 3.6), (0, 0, 1.4), 1.2, 1.2, 70, (1, .96, .9))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .25; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 85; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (-1.25, -6.6, 1.55); tgt = Vector((0, 0, 1.22))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
r = scn.render; r.resolution_x, r.resolution_y = 1000, 1900
r.resolution_percentage = int(100 * SCALE); r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 6
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'

# ---------------------------------------------------------------- export anchors (image space, 0..1 from top-left)
bpy.context.view_layer.update()
def img(p): c = world_to_camera_view(scn, cam, Vector(p)); return [round(c.x, 5), round(1 - c.y, 5)]
fy = -POD_D / 2 - .0101
anchors = {
    'w': r.resolution_x, 'h': r.resolution_y,
    # screen corners: tl, tr, br, bl
    'screen': [img((-SCR_W / 2, fy, SCR_Z + SCR_H / 2)), img((SCR_W / 2, fy, SCR_Z + SCR_H / 2)), img((SCR_W / 2, fy, SCR_Z - SCR_H / 2)), img((-SCR_W / 2, fy, SCR_Z - SCR_H / 2))],
    'lens': img((0, -POD_D / 2 - .03, LENS_Z)),
    'ring': img((0, 0, RING_Z)), 'ringEdge': img((RING_R, 0, RING_Z)),
    'floor': img((0, 0, 0)),
}
os.makedirs(OUT, exist_ok=True)
json.dump(anchors, open(os.path.join(OUT, 'booth.json'), 'w'))
r.filepath = os.path.join(OUT, 'booth.png'); bpy.ops.render.render(write_still=True)
print('done')
