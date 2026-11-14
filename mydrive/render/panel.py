"""MyDrive scroll film: one body panel goes from dented to factory finish.
args: out_dir first last samples width height
frames 1..72: 1-18 damaged, 18-36 dent pulls + primer, 36-56 new paint sweeps, 56-72 light glides, camera settles
"""
import bpy, math, sys, os
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/panel'
F0 = int(argv[1]) if len(argv) > 1 and argv[1].isdigit() else 1
F1 = int(argv[2]) if len(argv) > 2 else 72
SPP = int(argv[3]) if len(argv) > 3 else 48
W = int(argv[4]) if len(argv) > 4 else 1280
H = int(argv[5]) if len(argv) > 5 else 720
N = 72
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; col = sc.collection

# ---------- panel mesh: a curved door skin with two character lines ----------
NX, NY = 560, 210
xs = np.linspace(-3.4, 3.4, NX); ys = np.linspace(-1.2, 1.2, NY)
GX, GY = np.meshgrid(xs, ys)  # NY x NX
def base_z(x, y):
    z = -0.10 * (y / 1.2) ** 2 - 0.05 * (x / 3.4) ** 2
    z += 0.028 * np.exp(-((y - 0.38) / 0.032) ** 2)            # upper character line
    z += 0.018 * np.tanh((y + 0.62) / 0.018)                    # lower body step
    return z
BZ = base_z(GX, GY)
DC = (-0.35, -0.12)
R2 = (GX - DC[0]) ** 2 + (GY - DC[1]) ** 2
# a real push-in: a soft bowl, one sharp crease where the panel folded, and a smaller kink
ca, sa = math.cos(math.radians(32)), math.sin(math.radians(32))
along = (GX - DC[0]) * ca + (GY - DC[1]) * sa; perp = -(GX - DC[0]) * sa + (GY - DC[1]) * ca
DENT = 0.75 * np.exp(-R2 / 0.27 ** 2)
DENT += 0.55 * np.exp(-(perp / 0.022) ** 2) * np.exp(-(along / 0.3) ** 2)
DENT += 0.25 * np.exp(-((perp + 0.09) / 0.016) ** 2) * np.exp(-((along - 0.05) / 0.14) ** 2)

verts = np.zeros((NY * NX, 3), dtype=np.float32)
verts[:, 0] = GX.ravel(); verts[:, 1] = GY.ravel(); verts[:, 2] = BZ.ravel()
faces = []
for j in range(NY - 1):
    for i in range(NX - 1):
        a = j * NX + i; faces.append((a, a + 1, a + NX + 1, a + NX))
me = bpy.data.meshes.new('panel'); me.from_pydata(verts.tolist(), [], faces); me.update()
me.shade_smooth() if hasattr(me, 'shade_smooth') else [setattr(p, 'use_smooth', True) for p in me.polygons]
panel = bpy.data.objects.new('panel', me); col.objects.link(panel)
panel.rotation_euler = (math.radians(90), 0, 0)  # stand it up, face toward -Y

def set_dent(depth):
    z = (BZ - depth * DENT).ravel().astype(np.float32)
    co = verts.copy(); co[:, 2] = z
    me.vertices.foreach_set('co', co.ravel()); me.update()

# ---------- paint: old (scratched), primer, new (flake + clearcoat) ----------
m = bpy.data.materials.new('paint'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
out = nt.nodes.new('ShaderNodeOutputMaterial')
tc = nt.nodes.new('ShaderNodeTexCoord')
def val(name, v):
    n = nt.nodes.new('ShaderNodeValue'); n.name = name; n.outputs[0].default_value = v; return n
v_damage, v_primer, v_sweep = val('damage', 1), val('primer', 0), val('sweep', -3)
sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sep.inputs[0])
# radial mask around the dent
dx = nt.nodes.new('ShaderNodeMath'); dx.operation = 'SUBTRACT'; L(sep.outputs['X'], dx.inputs[0]); dx.inputs[1].default_value = DC[0]
dy = nt.nodes.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'; L(sep.outputs['Y'], dy.inputs[0]); dy.inputs[1].default_value = DC[1]
cx = nt.nodes.new('ShaderNodeCombineXYZ'); L(dx.outputs[0], cx.inputs[0]); L(dy.outputs[0], cx.inputs[1])
ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L(cx.outputs[0], ln.inputs[0])
pn = nt.nodes.new('ShaderNodeTexNoise'); pn.inputs['Scale'].default_value = 3.5; pn.inputs['Detail'].default_value = 4; L(tc.outputs['Object'], pn.inputs['Vector'])
pnm = nt.nodes.new('ShaderNodeMath'); pnm.operation = 'MULTIPLY_ADD'; L(pn.outputs['Fac'], pnm.inputs[0]); pnm.inputs[1].default_value = 0.22; pnm.inputs[2].default_value = -0.11
lw = nt.nodes.new('ShaderNodeMath'); lw.operation = 'ADD'; L(ln.outputs['Value'], lw.inputs[0]); L(pnm.outputs[0], lw.inputs[1])
rad = nt.nodes.new('ShaderNodeMapRange'); L(lw.outputs[0], rad.inputs['Value']); rad.inputs['From Min'].default_value = 0.5; rad.inputs['From Max'].default_value = 0.24; rad.interpolation_type = 'SMOOTHSTEP'
# scratches: stretched noise inside the dent zone
sn = nt.nodes.new('ShaderNodeTexNoise'); sn.inputs['Scale'].default_value = 9; sn.inputs['Detail'].default_value = 8
mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 46.0, 1.0); mp.inputs['Rotation'].default_value = (0, 0, math.radians(-18))
L(tc.outputs['Object'], mp.inputs['Vector']); L(mp.outputs[0], sn.inputs['Vector'])
sr = nt.nodes.new('ShaderNodeMapRange'); L(sn.outputs['Fac'], sr.inputs['Value']); sr.inputs['From Min'].default_value = 0.655; sr.inputs['From Max'].default_value = 0.69
scr = nt.nodes.new('ShaderNodeMath'); scr.operation = 'MULTIPLY'; scr.inputs[0].default_value = 0.85; L(rad.outputs['Result'], scr.inputs[1])  # smooth scuffed haze, no thin lines (they denoise into confetti)
scr2 = nt.nodes.new('ShaderNodeMath'); scr2.operation = 'MULTIPLY'; L(scr.outputs[0], scr2.inputs[0]); L(v_damage.outputs[0], scr2.inputs[1])
# flakes for the metallic layers
vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 900
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08; L(vor.outputs['Distance'], bump.inputs['Height'])
NAVY = (0.012, 0.04, 0.13, 1)
def bsdf(color, metal, rough, coat, coat_r=0.03, flakes=False):
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = color; b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = coat_r
    if flakes: L(bump.outputs['Normal'], b.inputs['Normal'])
    return b
old = bsdf(NAVY, 0.6, 0.4, 0.35, 0.18, True)
scol = nt.nodes.new('ShaderNodeMix'); scol.data_type = 'RGBA'; L(scr2.outputs[0], scol.inputs['Factor']); scol.inputs['A'].default_value = NAVY; scol.inputs['B'].default_value = (0.09, 0.11, 0.15, 1)
L(scol.outputs['Result'], old.inputs['Base Color'])
srough = nt.nodes.new('ShaderNodeMapRange'); L(scr2.outputs[0], srough.inputs['Value']); srough.inputs['To Min'].default_value = 0.4; srough.inputs['To Max'].default_value = 0.72
L(srough.outputs['Result'], old.inputs['Roughness'])
primer = bsdf((0.32, 0.33, 0.34, 1), 0, 0.78, 0)
new = bsdf(NAVY, 0.65, 0.32, 1.0, 0.02, True)
pm = nt.nodes.new('ShaderNodeMath'); pm.operation = 'MULTIPLY'; L(rad.outputs['Result'], pm.inputs[0]); L(v_primer.outputs[0], pm.inputs[1])
m1 = nt.nodes.new('ShaderNodeMixShader'); L(pm.outputs[0], m1.inputs[0]); L(old.outputs[0], m1.inputs[1]); L(primer.outputs[0], m1.inputs[2])
# new paint sweeps left to right with a soft wet edge
sw = nt.nodes.new('ShaderNodeMath'); sw.operation = 'SUBTRACT'; L(v_sweep.outputs[0], sw.inputs[0]); L(sep.outputs['X'], sw.inputs[1])
swm = nt.nodes.new('ShaderNodeMapRange'); L(sw.outputs[0], swm.inputs['Value']); swm.inputs['From Min'].default_value = -0.05; swm.inputs['From Max'].default_value = 0.25; swm.interpolation_type = 'SMOOTHSTEP'
m2 = nt.nodes.new('ShaderNodeMixShader'); L(swm.outputs['Result'], m2.inputs[0]); L(m1.outputs[0], m2.inputs[1]); L(new.outputs[0], m2.inputs[2])
L(m2.outputs[0], out.inputs[0])
me.materials.append(m)

# ---------- studio: long strip softboxes seen in the paint, a raking key for the dent ----------
def emitter(name, loc, rot, sx, sy, strength, color=(1, 1, 1)):
    mm = bpy.data.meshes.new(name)
    mm.from_pydata([(-sx / 2, -sy / 2, 0), (sx / 2, -sy / 2, 0), (sx / 2, sy / 2, 0), (-sx / 2, sy / 2, 0)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new(name, mm); o.location = loc; o.rotation_euler = rot; col.objects.link(o)
    ma = bpy.data.materials.new(name); ma.use_nodes = True; t = ma.node_tree; t.nodes.clear()
    e = t.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength; e.inputs['Color'].default_value = (*color, 1)
    o2 = t.nodes.new('ShaderNodeOutputMaterial'); t.links.new(e.outputs[0], o2.inputs[0]); mm.materials.append(ma)
    o.visible_camera = False; o.visible_shadow = False
    return o, e
dome, dome_e = emitter('dome', (0, -3.4, 3.0), (math.radians(-55), 0, 0), 12, 2.6, 1.4)
# soft edges so the softbox never reflects as a hard shape
_t = dome.data.materials[0].node_tree
_tc = _t.nodes.new('ShaderNodeTexCoord'); _mp = _t.nodes.new('ShaderNodeMapping'); _mp.inputs['Scale'].default_value = (1 / 6.0, 1 / 1.3, 1)
_g = _t.nodes.new('ShaderNodeTexGradient'); _g.gradient_type = 'SPHERICAL'
_m = _t.nodes.new('ShaderNodeMath'); _m.operation = 'MULTIPLY'; _m.inputs[1].default_value = 4.5
_t.links.new(_tc.outputs['Object'], _mp.inputs['Vector']); _t.links.new(_mp.outputs[0], _g.inputs['Vector'])
_t.links.new(_g.outputs['Fac'], _m.inputs[0]); _t.links.new(_m.outputs[0], dome_e.inputs['Strength'])
s1, _ = emitter('stripTop', (0, -2.2, 2.4), (math.radians(-35), 0, 0), 12, 0.35, 12)
s2, _ = emitter('stripLow', (0, -2.6, -1.6), (math.radians(-140), 0, 0), 12, 0.3, 7, (0.75, 0.85, 1.0))
glide, glide_e = emitter('glide', (-6, -3.0, 0.4), (math.radians(-90), 0, 0), 0.5, 4.0, 0)
rk = bpy.data.lights.new('rake', 'AREA'); rk.shape = 'RECTANGLE'; rk.size = 0.4; rk.size_y = 3; rk.energy = 380; rk.color = (1, 0.92, 0.82)
rake = bpy.data.objects.new('rake', rk); rake.location = (-3.4, -0.9, 0.0); rake.rotation_euler = (0, math.radians(-78), 0); col.objects.link(rake)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.006, 0.012, 1); wd.node_tree.nodes['Background'].inputs['Strength'].default_value = 1

cd = bpy.data.cameras.new('cam'); cd.lens = 42; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0
cam = bpy.data.objects.new('cam', cd); col.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); col.objects.link(tgt)
tk = cam.constraints.new('TRACK_TO'); tk.target = tgt; tk.track_axis = 'TRACK_NEGATIVE_Z'; tk.up_axis = 'UP_Y'
cd.dof.focus_object = tgt

def sm(a, b, t):
    t = min(1, max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t)
def lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))

def pose(f):
    t = (f - 1) / (N - 1)
    repair = sm(0.24, 0.5, t)
    set_dent(0.06 * (1 - repair))
    nt.nodes['damage'].outputs[0].default_value = 1 - repair
    nt.nodes['primer'].outputs[0].default_value = sm(0.26, 0.48, t)
    nt.nodes['sweep'].outputs[0].default_value = -2.8 + 5.8 * sm(0.5, 0.78, t)
    g = sm(0.76, 1.0, t)
    glide.location = (-4.0 + 7.5 * g, -3.0, 0.4); glide_e.inputs['Strength'].default_value = 26 * math.sin(math.pi * g)
    rk.energy = 380 * (1 - 0.6 * sm(0.5, 0.8, t))
    # camera: close on the dent, then eases back along the panel
    c = sm(0.0, 1.0, t)
    cam.location = lerp((-1.55, -1.55, 0.18), (-2.7, -2.75, 0.32), c)
    tgt.location = lerp((-0.35, 0.0, -0.12), (0.05, 0.0, -0.05), c)

sc.render.engine = 'CYCLES'; sc.cycles.samples = SPP; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.glossy_bounces = 4; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.render.resolution_x = W; sc.render.resolution_y = H
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
sc.render.use_persistent_data = True; sc.cycles.seed = 11

def pair_state(before, dent, haze, faded):
    """One side of a before/after pair. Same camera and lights on both sides."""
    set_dent(dent if before else 0.0)
    nt.nodes['damage'].outputs[0].default_value = haze if before else 0.0
    nt.nodes['primer'].outputs[0].default_value = 0.0
    nt.nodes['sweep'].outputs[0].default_value = -9.0 if before else 9.0
    srough.inputs['To Min'].default_value = 0.62 if (before and faded) else 0.4
    scol.inputs['A'].default_value = (0.03, 0.06, 0.12, 1) if (before and faded) else NAVY

PAIRS = {
    # name: camera, target, glide x, glide strength, rake, dent, haze, faded
    'dent':  ((-1.30, -1.70, 0.20), (-0.35, 0.0, -0.12), -0.55, 16, 300, 0.06, 1.0, False),
    'panel': ((-2.70, -2.75, 0.32), (0.05, 0.0, -0.05), -0.2, 22, 300, 0.06, 1.0, False),
    'paint': ((-2.10, -2.20, -0.05), (0.4, 0.0, 0.1), 0.9, 20, 220, 0.0, 0.0, True),
}
if argv[1:2] == ['pairs']:
    for name, (cl, tl, gx, gs, rkE, dent, haze, faded) in PAIRS.items():
        cam.location = cl; tgt.location = tl
        glide.location = (gx, -3.0, 0.4); glide_e.inputs['Strength'].default_value = gs; rk.energy = rkE
        for side in ('before', 'after'):
            pair_state(side == 'before', dent, haze, faded)
            sc.render.filepath = os.path.join(OUT, f'{name}-{side}.png')
            bpy.ops.render.render(write_still=True)
    raise SystemExit(0)

for f in range(F0, F1 + 1):
    pose(f); sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f'p{f:03d}.png')
    bpy.ops.render.render(write_still=True)
