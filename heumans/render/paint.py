# Heumans Auto Spa: an Apple-style product film of paint correction, path-traced in Cycles.
# A sculpted hood panel in deep metallic paint under long studio strips.
#   0–40   a light strip sweeps across in the dark: the clearcoat shows a web of swirl marks and haze
#   44–88  the correction front travels the panel: swirls and haze are gone behind it, the reflection turns to glass
#   96–143 ceramic: water beads form across the corrected finish, camera settles low and close
# usage: blender -b -P paint.py -- <out_dir> [samples] [scale] [frames: all | a-b | n,n,n]
import bpy, math, sys, os, random
from math import pi, sin, cos, exp, log
from mathutils import Vector
sys.path.insert(0, os.environ.get('BPE_SCRIPTS', ''))
try:
    from bpe_assets import asset
except Exception:
    asset = None

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/paint'
SAMPLES = int(argv[1]) if len(argv) > 1 else 24
SCALE = float(argv[2]) if len(argv) > 2 else 1.
FR = argv[3] if len(argv) > 3 else 'all'
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def link(o): col.objects.link(o); return o
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

# ---------------------------------------------------------------- the panel: crown across, a gentle sweep along, one crisp body line
XL, YL = 3.2, 1.7
def soft_relu(u, k): return k * log(1 + exp(u / k)) if u / k < 40 else u
def surf(x, y):
    t = y / YL
    z = .26 * (1 - t * t) ** 1.2 + .09 * sin(x * .42 + .3)
    z -= .16 * soft_relu(y - .58, .018)            # body line: the slope breaks sharply here
    z -= .05 * soft_relu(-y - .9, .05)
    return z
def normal(x, y, e=1e-3):
    dx = (surf(x + e, y) - surf(x - e, y)) / (2 * e); dy = (surf(x, y + e) - surf(x, y - e)) / (2 * e)
    return Vector((-dx, -dy, 1)).normalized()
NX, NY = 340, 200
verts = [(-XL + 2 * XL * i / (NX - 1), -YL + 2 * YL * j / (NY - 1), 0) for j in range(NY) for i in range(NX)]
verts = [(x, y, surf(x, y)) for x, y, _ in verts]
faces = [(j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i) for j in range(NY - 1) for i in range(NX - 1)]
me = bpy.data.meshes.new('panel'); me.from_pydata(verts, [], faces); me.shade_smooth()
panel = link(bpy.data.objects.new('panel', me))
# a thin rolled edge so the panel reads as sheet metal, not a plane
sol = panel.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = .03; sol.offset = -1

# ---------------------------------------------------------------- car paint with a swirl-marked, hazy clearcoat that a front corrects
def paint_mat():
    m = bpy.data.materials.new('paint'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    N = nt.nodes.new; L = nt.links.new
    b.inputs['Base Color'].default_value = hexc('#03050a'); b.inputs['Metallic'].default_value = .08; b.inputs['Roughness'].default_value = .45; b.inputs['Specular IOR Level'].default_value = .08
    b.inputs['Coat Weight'].default_value = 1.; b.inputs['Coat IOR'].default_value = 1.5
    tc = N('ShaderNodeTexCoord')
    # metallic flake in the base layer
    vf = N('ShaderNodeTexVoronoi'); vf.inputs['Scale'].default_value = 1400; L(tc.outputs['Object'], vf.inputs['Vector'])
    fb = N('ShaderNodeBump'); fb.inputs['Strength'].default_value = .18; fb.inputs['Distance'].default_value = .0001
    L(vf.outputs['Distance'], fb.inputs['Height']); L(fb.outputs[0], b.inputs['Normal'])
    # the correction front: mask = 1 where the paint is still uncorrected (x ahead of the front)
    front = N('ShaderNodeValue'); front.name = 'front'; front.outputs[0].default_value = -4.
    sep = N('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sep.inputs[0])
    sub = N('ShaderNodeMath'); sub.operation = 'SUBTRACT'; L(sep.outputs['X'], sub.inputs[0]); L(front.outputs[0], sub.inputs[1])
    mask = N('ShaderNodeMapRange'); mask.inputs['From Min'].default_value = -.12; mask.inputs['From Max'].default_value = .12; mask.clamp = True
    L(sub.outputs[0], mask.inputs['Value'])
    # uncorrected paint: real swirl marks are circular micro-scratches, so the clear coat reflects like
    # brushed arcs that wander across the panel (anisotropic, tangent from a smooth noise field). Light then
    # breaks into hologram arcs and a dull grey haze instead of a clean line. Smooth, so it denoises cleanly.
    sw = N('ShaderNodeBsdfPrincipled'); sw.inputs['Base Color'].default_value = hexc('#04060a'); sw.inputs['Metallic'].default_value = 0.
    sw.inputs['Roughness'].default_value = .1; sw.inputs['Anisotropic'].default_value = .55; sw.inputs['Specular IOR Level'].default_value = .55
    nd = N('ShaderNodeTexNoise'); nd.inputs['Scale'].default_value = 1.2; nd.inputs['Detail'].default_value = 1.5; L(tc.outputs['Object'], nd.inputs['Vector'])
    ang = N('ShaderNodeMath'); ang.operation = 'MULTIPLY'; ang.inputs[1].default_value = 5.; L(nd.outputs['Fac'], ang.inputs[0])
    cs = N('ShaderNodeMath'); cs.operation = 'COSINE'; L(ang.outputs[0], cs.inputs[0])
    sn = N('ShaderNodeMath'); sn.operation = 'SINE'; L(ang.outputs[0], sn.inputs[0])
    cxyz = N('ShaderNodeCombineXYZ'); L(cs.outputs[0], cxyz.inputs[0]); L(sn.outputs[0], cxyz.inputs[1])
    geo = N('ShaderNodeNewGeometry')   # project onto the surface so the brushed direction follows the panel
    t1 = N('ShaderNodeVectorMath'); t1.operation = 'CROSS_PRODUCT'; L(geo.outputs['Normal'], t1.inputs[0]); L(cxyz.outputs[0], t1.inputs[1])
    tan = N('ShaderNodeVectorMath'); tan.operation = 'CROSS_PRODUCT'; L(t1.outputs[0], tan.inputs[0]); L(geo.outputs['Normal'], tan.inputs[1])
    tn = N('ShaderNodeVectorMath'); tn.operation = 'NORMALIZE'; L(tan.outputs[0], tn.inputs[0]); L(tn.outputs[0], sw.inputs['Tangent'])
    # a few deeper random scratches on top
    sc = N('ShaderNodeTexWave'); sc.wave_type = 'BANDS'; sc.inputs['Scale'].default_value = 60; sc.inputs['Distortion'].default_value = 24; sc.inputs['Detail'].default_value = 2
    L(tc.outputs['Object'], sc.inputs['Vector'])
    scl = N('ShaderNodeMapRange'); scl.inputs['From Min'].default_value = .985; scl.inputs['From Max'].default_value = 1.; scl.clamp = True; L(sc.outputs['Fac'], scl.inputs['Value'])
    cb = N('ShaderNodeBump'); cb.inputs['Strength'].default_value = .35; cb.inputs['Distance'].default_value = .001
    L(scl.outputs[0], cb.inputs['Height']); L(cb.outputs[0], sw.inputs['Normal'])
    # corrected paint is the clean coat (b); the front blends between them
    b.inputs['Coat Roughness'].default_value = .008
    mx = N('ShaderNodeMixShader'); L(mask.outputs[0], mx.inputs[0]); L(b.outputs[0], mx.inputs[1]); L(sw.outputs[0], mx.inputs[2])
    L(mx.outputs[0], out.inputs[0])
    return m, front
PAINT, FRONT = paint_mat()
panel.data.materials.append(PAINT)

# ---------------------------------------------------------------- water beads (ceramic stage): one mesh, linked duplicates
WATER = bpy.data.materials.new('water'); WATER.use_nodes = True
wb = WATER.node_tree.nodes['Principled BSDF']; wb.inputs['Base Color'].default_value = (1, 1, 1, 1); wb.inputs['Roughness'].default_value = 0.
wb.inputs['IOR'].default_value = 1.333; wb.inputs['Transmission Weight'].default_value = 1.
bm = bpy.data.meshes.new('bead')
segs, rings = 24, 12
bv = [(0, 0, 1)]
for r_ in range(1, rings):
    th = pi * r_ / rings
    for s_ in range(segs): ph = 2 * pi * s_ / segs; bv.append((sin(th) * cos(ph), sin(th) * sin(ph), cos(th)))
bv.append((0, 0, -1))
bf = [(0, 1 + (s_ + 1) % segs, 1 + s_) for s_ in range(segs)]
for r_ in range(rings - 2):
    for s_ in range(segs):
        a = 1 + r_ * segs + s_; b_ = 1 + r_ * segs + (s_ + 1) % segs; c = b_ + segs; d = a + segs; bf.append((a, b_, c, d))
last = len(bv) - 1; base = 1 + (rings - 2) * segs
bf += [(base + s_, base + (s_ + 1) % segs, last) for s_ in range(segs)]
bm.from_pydata(bv, [], bf); bm.shade_smooth(); bm.materials.append(WATER)
beads, placed = [], []
tries = 0
while len(beads) < 380 and tries < 8000:
    tries += 1
    x, y = random.uniform(-1.6, 2.9), random.uniform(-1.25, 1.3)
    r = random.choice((.012, .016, .02, .025, .03, .038)) * random.uniform(.85, 1.15)
    if any((x - px) ** 2 + (y - py) ** 2 < (r + pr + .012) ** 2 for px, py, pr in placed): continue
    placed.append((x, y, r))
    if (x - .6) ** 2 + ((y + 1.15) / 1.4) ** 2 < .62 ** 2: continue   # nothing right under the final lens: it only renders as blur
    n = normal(x, y); p = Vector((x, y, surf(x, y))) + n * r * .28
    o = link(bpy.data.objects.new('bead', bm)); o.location = p
    o.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); o.scale = (r, r, r * .52)
    beads.append((o, x))
for o, x in beads:  # beads form in a wave from left to right
    f0 = 96 + (x + 1.6) / 4.5 * 22 + random.uniform(-2, 2)
    s = o.scale.copy()
    o.scale = (0, 0, 0); o.keyframe_insert('scale', frame=int(f0))
    o.scale = s * 1.12; o.keyframe_insert('scale', frame=int(f0) + 3)
    o.scale = s; o.keyframe_insert('scale', frame=int(f0) + 6)

# ---------------------------------------------------------------- light: dark studio, long strips that draw lines across the paint
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment')
hdri = asset('studio_small_09_1k.hdr') if asset else os.path.join(os.path.dirname(__file__), 'studio_small_09_1k.hdr')
env.image = bpy.data.images.load(hdri)
bgn = wn.nodes.new('ShaderNodeBackground'); bgn.inputs[1].default_value = .004
lp = wn.nodes.new('ShaderNodeLightPath'); blk = wn.nodes.new('ShaderNodeBackground'); blk.inputs[0].default_value = hexc('#040507'); blk.inputs[1].default_value = 1.
mix = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bgn.inputs[0]); wn.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
wn.links.new(bgn.outputs[0], mix.inputs[1]); wn.links.new(blk.outputs[0], mix.inputs[2]); wn.links.new(mix.outputs[0], wo.inputs[0])
def strip(name, loc, rot, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc; o.rotation_euler = rot; o.visible_camera = False; return o
key = strip('key', (0, -3.2, 2.4), (.95, 0, 0), 12, .05, 520, (.95, .97, 1))
strip('top', (0, .5, 3.2), (0, 0, 0), 12, .035, 260)
strip('top2', (0, -.9, 3.1), (.25, 0, 0), 12, .035, 220)
strip('rim', (0, 3.4, 1.0), (-1.3, 0, 0), 12, .06, 420, (.62, .78, 1))
strip('blue', (-7, 0, .6), (0, -1.45, 0), 2.6, .12, 160, (.35, .6, 1))
# act 1: the key strip sweeps across the panel (reflection line travels over the swirls)
for f, y, z in ((0, -6.0, 1.6), (40, -2.6, 2.6), (143, -2.2, 2.8)):
    key.location = (0, y, z); key.keyframe_insert('location', frame=f)
key.data.energy = 0; key.data.keyframe_insert('energy', frame=0)
key.data.energy = 520; key.data.keyframe_insert('energy', frame=14)
# act 2: the correction front travels along the panel
for f, v in ((0, -4.), (44, -3.4), (88, 3.6), (143, 3.6)):
    FRONT.outputs[0].default_value = v; FRONT.outputs[0].keyframe_insert('default_value', frame=f)

# ---------------------------------------------------------------- camera
cd = bpy.data.cameras.new('cam'); cd.lens = 40; cd.dof.use_dof = True; cd.dof.aperture_fstop = 5.6; cd.sensor_width = 36
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
tgt = link(bpy.data.objects.new('tgt', None)); cd.dof.focus_object = tgt
tc_ = cam.constraints.new('TRACK_TO'); tc_.target = tgt; tc_.track_axis = 'TRACK_NEGATIVE_Z'; tc_.up_axis = 'UP_Y'
KEYS = [
    (0, (-4.6, -3.6, 1.05), (.4, .2, .1), 32, 8.),
    (40, (-3.6, -3.4, 1.15), (.4, .1, .12), 34, 8.),
    (66, (-1.2, -3.3, 1.2), (.6, 0, .15), 36, 8.),
    (92, (1.9, -3.0, 1.0), (1.0, 0, .18), 40, 6.3),
    (143, (.55, -1.12, .42), (.85, .05, .23), 62, 4.5),
]
for f, c, t, lens, fs in KEYS:
    cam.location = c; cam.keyframe_insert('location', frame=f); tgt.location = t; tgt.keyframe_insert('location', frame=f)
    cd.lens = lens; cd.keyframe_insert('lens', frame=f); cd.dof.aperture_fstop = fs; cd.dof.keyframe_insert('aperture_fstop', frame=f)
scn.frame_start, scn.frame_end = 0, 143

# ---------------------------------------------------------------- render
r = scn.render; r.resolution_x, r.resolution_y = 1280, 720; r.resolution_percentage = int(100 * SCALE); r.use_persistent_data = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 4; cy.diffuse_bounces = 2; cy.transmission_bounces = 6
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 6; cy.seed = 3
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
os.makedirs(OUT, exist_ok=True)
if FR == 'all': frames = range(0, 144)
elif '-' in FR: a, b_ = FR.split('-'); frames = range(int(a), int(b_) + 1)
else: frames = [int(x) for x in FR.split(',')]
for f in frames:
    p = os.path.join(OUT, f'p{f:03d}.png')
    if os.path.exists(p) and os.path.getsize(p) > 0: continue
    scn.frame_set(f); r.filepath = p; bpy.ops.render.render(write_still=True)
print('done')
