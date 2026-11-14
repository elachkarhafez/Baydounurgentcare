"""MyDrive full lockup in metal on a black gloss floor: the logo opening film.
args: out_dir first last samples width height
Reuses the crest geometry from emblem.py (everything above its lighting section).
"""
import bpy, math, sys, os

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
src = open(os.path.join(HERE, 'emblem.py')).read()
exec(src[:src.index('# ---------- light, camera, world')])  # builds badge, materials, crest parts (sets sc, col, mat, ...)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/lockup'
F0 = int(argv[1]) if len(argv) > 1 else 1
F1 = int(argv[2]) if len(argv) > 2 else 90
SPP = int(argv[3]) if len(argv) > 3 else 32
W = int(argv[4]) if len(argv) > 4 else 1280
H = int(argv[5]) if len(argv) > 5 else 720
N = 90
os.makedirs(OUT, exist_ok=True)

badge.rotation_euler = (math.radians(90), 0, 0)

def text(name, body, font, size, space, z, material, depth, bevel):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = bpy.data.fonts.load(os.path.join(HERE, font))
    cu.size = size; cu.space_character = space; cu.align_x = 'CENTER'; cu.align_y = 'TOP'
    cu.extrude = depth; cu.bevel_depth = bevel; cu.bevel_resolution = 3; cu.resolution_u = 6
    o = bpy.data.objects.new(name, cu); o.location = (0, 0, z); o.rotation_euler = (math.radians(90), 0, 0)
    cu.materials.append(material); col.objects.link(o); return o

chrome_t = mat('chromeText', (0.93, 0.94, 0.96), 1, 0.07)
word = text('word', 'MYDRIVE', 'michroma.ttf', 0.95, 1.06, -1.30, chrome_t, 0.05, 0.007)
desc = text('desc', 'COLLISION', 'montserrat-600.ttf', 0.27, 1.75, -2.30, steel, 0.02, 0.003)
for sx in (-1, 1):  # copper rules either side of the descriptor
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * 1.74, 0, -2.42))
    r = bpy.context.active_object; r.scale = (0.62, 0.02, 0.012); r.data.materials.append(copper)

# black gloss floor, so the whole mark sits on its own reflection
floor_m = mat('floor', (0.0025, 0.003, 0.005), 0, 0.12)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 150, -2.62))
bpy.context.active_object.data.materials.append(floor_m)

# ---------- world, softboxes, lights ----------
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.0012, 0.0016, 0.003, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

def emitter(name, loc, rot, sx, sy, strength, gradient=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-sx / 2, 0, -sy / 2), (sx / 2, 0, -sy / 2), (sx / 2, 0, sy / 2), (-sx / 2, 0, sy / 2)], [], [(0, 1, 2, 3)]); me.uv_layers.new()
    o = bpy.data.objects.new(name, me); o.location = loc; o.rotation_euler = rot; col.objects.link(o)
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial'); em.inputs['Strength'].default_value = strength
    if gradient:
        tc_ = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.46; ramp.color_ramp.elements[0].color = (0.006, 0.008, 0.012, 1)
        ramp.color_ramp.elements[1].position = 0.6; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
        nt.links.new(tc_.outputs['UV'], sep.inputs[0]); nt.links.new(sep.outputs['Y'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs[0]); me.materials.append(m)
    o.visible_camera = False; o.visible_shadow = False
    return o, em

box, box_e = emitter('softbox', (0, -24, 0.0), (0, 0, 0), 30, 16, 2.0, gradient=True)
strip, strip_e = emitter('strip', (-14, -20, 0.0), (0, 0, 0), 1.8, 18, 18)

def area(name, loc, rot, size, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.size = size
    o = bpy.data.objects.new(name, l); o.location = loc; o.rotation_euler = rot; col.objects.link(o); return o
key = area('key', (-4, -6, 5), (math.radians(45), 0, math.radians(-30)), 4, 900)
rimL = area('rimL', (-6, 3, 1.5), (math.radians(-75), 0, math.radians(-120)), 2.5, 700, (0.62, 0.75, 1.0))
rimR = area('rimR', (6, 3, 1.5), (math.radians(-75), 0, math.radians(120)), 2.5, 700, (0.62, 0.75, 1.0))
pool = area('pool', (0, -1.2, 4.0), (0, 0, 0), 3.5, 260, (0.9, 0.93, 1.0))   # soft pool of light on the floor

cd = bpy.data.cameras.new('cam'); cd.lens = 50
cam = bpy.data.objects.new('cam', cd); col.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); col.objects.link(tgt)
tk = cam.constraints.new('TRACK_TO'); tk.target = tgt; tk.track_axis = 'TRACK_NEGATIVE_Z'; tk.up_axis = 'UP_Y'

def sm(a, b, t):
    t = min(1, max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t)
def eo(a, b, t):
    t = min(1, max(0, (t - a) / (b - a))); return 1 - (1 - t) ** 3
def lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))

def pose(f):
    t = (f - 1) / (N - 1)
    turn = eo(0.0, 0.5, t)
    badge.rotation_euler = (math.radians(90 + 10 * (1 - turn)), 0, math.radians(55 * (1 - turn)))
    pull = eo(0.08, 0.78, t)
    cam.location = lerp((0.5, -6.2, 0.15), (0.0, -14.2, -0.35), pull)
    tgt.location = lerp((0.0, 0.0, 0.1), (0.0, 0.0, -1.05), pull)
    up = sm(0.06, 0.55, t)
    key.data.energy = 900 * up; pool.data.energy = 260 * up; box_e.inputs['Strength'].default_value = 0.25 + 1.85 * up
    s = sm(0.22, 0.82, t)
    strip.location = (-14 + 28 * s, -20, 0.0); strip_e.inputs['Strength'].default_value = 18 * (0.25 + 0.75 * math.sin(math.pi * s))

sc.render.engine = 'CYCLES'; sc.cycles.samples = SPP; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.render.resolution_x = W; sc.render.resolution_y = H
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
sc.render.use_persistent_data = True; sc.cycles.seed = 3

for f in range(F0, F1 + 1):
    pose(f); sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f'l{f:03d}.png')
    bpy.ops.render.render(write_still=True)
