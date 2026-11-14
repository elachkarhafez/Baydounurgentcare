"""MyDrive crest as a metal badge. Renders a short turn-in with a light sweep.
args: out_dir first last samples res
"""
import bpy, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/emblem'
F0 = int(argv[1]) if len(argv) > 1 else 1
F1 = int(argv[2]) if len(argv) > 2 else 54
SPP = int(argv[3]) if len(argv) > 3 else 40
RES = int(argv[4]) if len(argv) > 4 else 720
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- 2D geometry in crest units (200 x 224, y down) ----------
def cubic(p0, p1, p2, p3, n=24):
    return [tuple((1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i] for i in (0, 1)) for t in [k / n for k in range(1, n + 1)]]

def shield(k=0.0):
    """Shield outline; k shrinks it toward the centre (positive = inward)."""
    pts = [(100, 8)]
    pts += cubic((100, 8), (128, 8), (160, 14), (186, 26))
    pts += [(186, 26 + (108 - 26) * t / 10) for t in range(1, 11)]
    pts += cubic((186, 108), (186, 160), (150, 196), (100, 216))
    pts += cubic((100, 216), (50, 196), (14, 160), (14, 108))
    pts += [(14, 108 - (108 - 26) * t / 10) for t in range(1, 11)]
    pts += cubic((14, 26), (40, 14), (72, 8), (100, 8))[:-1]
    if not k: return pts
    # offset along averaged normals
    out = []; n = len(pts)
    for i in range(n):
        a, b, c = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % n])
        t = (c - a).normalized(); nrm = Vector((t.y, -t.x))  # outward for clockwise screen-space order
        out.append(tuple(b - nrm * k))
    return out

def arc(cx, cy, r, a0, a1, n=28):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]

MONO = [(46, 62), (57, 62), (79, 101), (101, 62), (112, 62)] + arc(112, 104, 42, -90, 90)[1:-1] + [(112, 146), (101, 146), (101, 86), (83, 117), (75, 117), (57, 86), (57, 146), (46, 146)]
COUNTER = [(112, 73)] + arc(112, 104, 31, -90, 90)[1:-1] + [(112, 135)]
DASHES = [[(97.5, 160), (102.5, 160), (102.5, 168), (97.5, 168)], [(97, 175), (103, 175), (103, 185), (97, 185)], [(96.5, 192), (103.5, 192), (103.5, 205), (96.5, 205)]]

S = 0.01  # crest unit -> metres (crest is 2.0 x 2.24 m)
def to3(p): return ((p[0] - 100) * S, -(p[1] - 112) * S)

def curve_obj(name, loops, depth, bevel, z, mat):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = depth; cu.bevel_depth = bevel; cu.bevel_resolution = 4; cu.resolution_u = 2
    for loop in loops:
        sp = cu.splines.new('POLY'); sp.points.add(len(loop) - 1)
        for i, p in enumerate(loop):
            x, y = to3(p); sp.points[i].co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    ob = bpy.data.objects.new(name, cu); ob.location.z = z
    ob.data.materials.append(mat)
    return ob

# ---------- materials ----------
def mat(name, base, metal, rough, coat=0.0, aniso=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    if aniso and 'Anisotropic' in b.inputs: b.inputs['Anisotropic'].default_value = aniso
    return m

chrome = mat('chrome', (0.92, 0.93, 0.95), 1, 0.08)
steel = mat('steel', (0.78, 0.8, 0.83), 1, 0.2, aniso=0.6)
enamel = mat('enamel', (0.004, 0.016, 0.06), 0, 0.5)
enamel.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.22
copper = mat('copper', (0.86, 0.46, 0.28), 1, 0.18)

col = sc.collection
badge = bpy.data.objects.new('badge', None); col.objects.link(badge)
parts = [
    curve_obj('field', [shield(4)], 0.05, 0.0, 0.0, enamel),
    curve_obj('frame', [shield(-3.6), shield(3.6)], 0.11, 0.012, 0.02, steel),
    curve_obj('inner', [shield(11.2), shield(12.8)], 0.07, 0.004, 0.02, steel),
    curve_obj('mono', [MONO, COUNTER], 0.1, 0.012, 0.05, chrome),
] + [curve_obj(f'dash{i}', [d], 0.07, 0.006, 0.03, copper) for i, d in enumerate(DASHES)]
for p in parts: col.objects.link(p); p.parent = badge

# ---------- light, camera, world ----------
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.01, 0.022, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35

def area(name, loc, rot, size, power, color=(1, 1, 1), sx=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color
    if sx: l.shape = 'RECTANGLE'; l.size = sx[0]; l.size_y = sx[1]
    else: l.size = size
    o = bpy.data.objects.new(name, l); o.location = loc; o.rotation_euler = rot; col.objects.link(o); return o

key = area('key', (-3.2, -4.6, 4.2), (math.radians(50), 0, math.radians(-35)), 3.5, 700)
rim = area('rim', (3.5, 2.5, 2.0), (math.radians(-60), 0, math.radians(130)), 2.0, 500, (0.6, 0.75, 1.0))

def emitter(name, loc, sx, sy, strength, gradient=False):
    """A softbox plane facing +Y (toward the badge), seen only in reflections."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-sx / 2, 0, -sy / 2), (sx / 2, 0, -sy / 2), (sx / 2, 0, sy / 2), (-sx / 2, 0, sy / 2)], [], [(0, 1, 2, 3)])
    me.uv_layers.new()
    o = bpy.data.objects.new(name, me); o.location = loc; col.objects.link(o)
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    em.inputs['Strength'].default_value = strength
    if gradient:
        # brighter at the top, falling off to dark at the bottom: chrome gets a horizon line
        tc_ = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.42; ramp.color_ramp.elements[0].color = (0.02, 0.025, 0.035, 1)
        ramp.color_ramp.elements[1].position = 0.58; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
        nt.links.new(tc_.outputs['UV'], sep.inputs[0]); nt.links.new(sep.outputs['Y'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs[0])
    me.materials.append(m)
    o.visible_camera = False; o.visible_shadow = False
    return o

box = emitter('softbox', (0, -18, 0.5), 22, 14, 2.2, gradient=True)
strip = emitter('strip', (-8, -16, 0.5), 1.6, 14, 14)

cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 70
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); col.objects.link(tgt); tgt.location = (0, 0, 0.05)
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'

# ---------- animation: turn in, dolly, strip sweeps across ----------
def ease(t): return 1 - (1 - t) ** 3
N = 54
def pose(f):
    t = (f - 1) / (N - 1); e = ease(min(1, t * 1.15))
    badge.rotation_euler = (math.radians(90 + 12 * (1 - e)), math.radians(-5 * (1 - e)), math.radians(40 * (1 - e)))
    cam.location = (0.0, -9.4 + 1.6 * (1 - e), 0.4 * (1 - e) + 0.05)
    s = min(1, max(0, (t - 0.25) / 0.6))
    strip.location = (-4.5 + 9.0 * (s * s * (3 - 2 * s)), -16, 0.5)

sc.render.engine = 'CYCLES'; sc.cycles.samples = SPP; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.render.resolution_x = RES; sc.render.resolution_y = RES; sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast' if hasattr(sc.view_settings, 'look') else 'None'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.use_persistent_data = True; sc.cycles.seed = 7

for f in range(F0, F1 + 1):
    pose(f); sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f'e{f:03d}.png')
    bpy.ops.render.render(write_still=True)
