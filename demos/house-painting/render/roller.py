# Ridgecoat concept: a 9" paint roller soaked in red paint (recolored to teal in post by recolor.py), path-traced in Cycles, pressed against a wall.
# Renders N frames of the cover turning one full revolution (transparent background, wall is a shadow catcher)
# so the page can roll it across the hero, plus roller.json with the cover's box in image space.
# usage: bpe run roller.py -m final -- <out_dir> [frames] [samples] [scale]
import bpy, math, sys, os, json
from math import pi, sin, cos
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; N = int(argv[1]) if len(argv) > 1 else 16
SAMPLES = int(argv[2]) if len(argv) > 2 else 64; SCALE = float(argv[3]) if len(argv) > 3 else 1.
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

CHROME = principled('chrome', hexc('#d8d8d8'), Metallic=1., Roughness=.14)[0]
GREY = principled('cap', hexc('#9a9a98'), Roughness=.45)[0]
HANDLE = principled('handle', hexc('#161616'), Roughness=.38, **{'Coat Weight': .4, 'Coat Roughness': .2})[0]
RED_PL = principled('redplastic', hexc('#c8161c'), Roughness=.32, **{'Coat Weight': .3})[0]
def paint_mat():
    """Wet red paint soaked into the nap: colour clumps follow object coords so they turn with the cover."""
    m, nt, b, out = principled('paint', hexc('#d4161b'), Roughness=.32, **{'Coat Weight': .55, 'Coat Roughness': .08, 'Specular IOR Level': .6})
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 60; nz.inputs['Detail'].default_value = 6
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position, e[0].color = .35, hexc('#8e0b10'); e[1].position, e[1].color = .7, hexc('#e8262a')
    nt.links.new(nz.outputs['Fac'], ramp.inputs[0])
    hi = nt.nodes.new('ShaderNodeHairInfo'); mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[0].default_value = .25
    mix.inputs[7].default_value = hexc('#f2f0ea')  # a few dry, unsoaked tips
    gate = nt.nodes.new('ShaderNodeMath'); gate.operation = 'GREATER_THAN'; gate.inputs[1].default_value = .994
    nt.links.new(hi.outputs['Random'], gate.inputs[0]); nt.links.new(gate.outputs[0], mix.inputs[0])
    nt.links.new(ramp.outputs[0], mix.inputs[6]); nt.links.new(mix.outputs[2], b.inputs['Base Color'])
    return m
PAINT = paint_mat()

# ---------------------------------------------------------------- cover (axis along Z), 9" long
R, L = .024, .23
cov = link(bpy.data.objects.new('cover', None))
bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=L, vertices=96, end_fill_type='NOTHING', location=(0, 0, 0)); core = bpy.context.active_object
core.data.materials.append(PAINT); bpy.ops.object.shade_smooth(); core.parent = cov
ps = core.modifiers.new('nap', 'PARTICLE_SYSTEM'); st = ps.particle_system.settings
st.type = 'HAIR'; st.count = 42000; st.hair_length = .0085; st.emit_from = 'FACE'; st.use_emit_random = True
st.factor_random = .0012; st.normal_factor = 1.; st.material_slot = 'paint'; st.root_radius = 1.; st.tip_radius = .55; st.radius_scale = .0006
st.child_type = 'INTERPOLATED'; st.rendered_child_count = 4; st.child_percent = 4; st.child_radius = .0015; st.roughness_1 = .0005; st.roughness_endpoint = .0003
st.clump_factor = .6; st.display_step = 3; st.render_step = 3
st.hair_length = .0048  # set last: normal_factor/factor_random rescale it
for z in (-L / 2, L / 2):
    bpy.ops.mesh.primitive_cylinder_add(radius=R * .62, depth=.006, vertices=64, location=(0, 0, z)); c = bpy.context.active_object
    c.data.materials.append(GREY); bpy.ops.object.shade_smooth(); c.parent = cov

# ---------------------------------------------------------------- frame: axle out of the bottom, offset sideways, down into the handle
def tube(name, pts, r, mat):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 6
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = link(bpy.data.objects.new(name, cu)); cu.materials.append(mat); return o
zb = -L / 2
tube('frame', [(0, 0, zb + .01), (0, 0, zb - .02), (-.022, -.012, zb - .045), (-.04, -.02, zb - .075), (-.042, -.02, zb - .13), (-.04, -.02, zb - .17)], .0034, CHROME)
# handle: lathe along Z
def lathe(name, prof, seg=64):
    verts, faces, rings = [], [], []
    for r, z in prof:
        idx = []
        for k in range(seg): a = 2 * pi * k / seg; verts.append((r * cos(a), r * sin(a), z)); idx.append(len(verts) - 1)
        rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(seg): faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    for p in me.polygons: p.use_smooth = True
    return me
hz = zb - .17
h = link(bpy.data.objects.new('handle', lathe('handle', [(.001, 0), (.008, -.002), (.011, -.012), (.0125, -.04), (.0118, -.07), (.013, -.1), (.0138, -.12), (.012, -.128), (.006, -.131), (.001, -.132)])))
h.location = (-.04, -.02, hz); h.data.materials.append(HANDLE)
ring = link(bpy.data.objects.new('ring', lathe('ring', [(.0128, -.004), (.0134, -.006), (.0134, -.014), (.0128, -.016)])))
ring.location = (-.04, -.02, hz); ring.data.materials.append(RED_PL)

# ---------------------------------------------------------------- wall (shadow catcher) just behind the cover, studio light
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, R + .006, 0), rotation=(pi / 2, 0, 0)); wall = bpy.context.active_object; wall.is_shadow_catcher = True
wall.data.materials.append(principled('wall', hexc('#f3f1ec'), Roughness=.9)[0])
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('key', (-.45, -.8, .4), (0, 0, -.05), .7, .7, 26, (1, .97, .92))
area('fill', (.6, -.6, -.1), (0, 0, -.05), .4, .6, 10, (.95, .96, 1))
area('rim', (.25, -.15, .6), (0, 0, 0), .15, .5, 14)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .3; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 120; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 34
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (-.32, -2.2, .1); tgt = Vector((0, 0, -.13))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
r = scn.render; r.resolution_x, r.resolution_y = 560, 1000; r.resolution_percentage = int(100 * SCALE)
r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 6; cy.glossy_bounces = 3; cy.diffuse_bounces = 2; cy.transparent_max_bounces = 4
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.cycles_curves.shape = 'THICK'
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'

bpy.context.view_layer.update()
def img(p): c = world_to_camera_view(scn, cam, Vector(p)); return [round(c.x, 5), round(1 - c.y, 5)]
Rn = R + .0048
os.makedirs(OUT, exist_ok=True)
json.dump({'w': r.resolution_x, 'h': r.resolution_y, 'frames': N,
           'coverTop': img((0, -Rn, L / 2)), 'coverBot': img((0, -Rn, -L / 2)), 'coverL': img((-Rn, -Rn * .2, 0)), 'coverR': img((Rn, -Rn * .2, 0)),
           'radiusM': Rn, 'lengthM': L}, open(os.path.join(OUT, 'roller.json'), 'w'))
for i in range(N):
    cov.rotation_euler = (0, 0, -2 * pi * i / N)  # rolling to the right turns the front face downward-left
    p = os.path.join(OUT, f'r{i:02d}.png')
    if os.path.exists(p): continue
    open(p, 'w').close(); r.filepath = p; bpy.ops.render.render(write_still=True)
print('done')
