# AUROMA BODY intro: the atomizer mist, rendered from the exact camera of the intro bottle (bottles.py, square, az -14, elev 6).
# A volumetric cone of fine mist (procedural density, advected noise, back-lit so it glows) plus real water-like droplets
# that leave the nozzle fast and slow down in the air. The burst comes toward the camera, so it washes over the viewer.
# Transparent film, so the page layers it over the bottle. Framing is k times wider than the bottle render, same centre.
# usage: bpe run spray.py -m final -- <out_dir> <samples> <scale> [frames=all, e.g. 0,8,14,20]
import bpy, bmesh, sys, os, random
from math import pi, cos, sin, radians, exp, sqrt
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]; SAMPLES = int(argv[1]) if len(argv) > 1 else 64; SCALE = float(argv[2]) if len(argv) > 2 else 1.
N_FR, FPS = 20, 25
FRAMES = [int(x) for x in argv[3].split(',')] if len(argv) > 3 and argv[3] != 'all' else list(range(N_FR))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene; col = scn.collection
def obj(name, data):
    o = bpy.data.objects.new(name, data); col.objects.link(o); return o
class Mat:
    def __init__(s, name):
        s.m = bpy.data.materials.new(name); s.m.use_nodes = True; s.t = s.m.node_tree; s.t.nodes.clear(); s.out = s.n('ShaderNodeOutputMaterial')
    def n(s, typ, **kw):
        x = s.t.nodes.new(typ)
        for k, v in kw.items():
            if k in x.inputs.keys(): x.inputs[k].default_value = v
            else: setattr(x, k, v)
        return x
    def l(s, a, b): s.t.links.new(a, b)
    def math(s, op, a, b=None, clamp=False):
        m = s.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: s.l(v, m.inputs[i])
        return m.outputs[0]
    def rng(s, v, a, b, c=0., d=1., interp='SMOOTHSTEP'):
        m = s.n('ShaderNodeMapRange', interpolation_type=interp, clamp=True)
        s.l(v, m.inputs['Value']); m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b
        m.inputs['To Min'].default_value = c; m.inputs['To Max'].default_value = d; return m, m.outputs['Result']

# ------------------------------------------------------------------ the intro bottle's geometry and camera (from bottles.py)
H_BODY, H_ALL = .042, .042 + .0243
NOZ = Vector((0, -.0068, H_BODY + .0115))
tgt = Vector((0, 0, H_ALL * .5)); dist = .40; el = radians(6); az = radians(-14)
CAM = tgt + Vector((dist * sin(az) * cos(el), -dist * cos(az) * cos(el), dist * sin(el)))
cd = bpy.data.cameras.new('cam'); cam = obj('cam', cd); scn.camera = cam
cam.location = CAM; cam.rotation_euler = (tgt - CAM).to_track_quat('-Z', 'Y').to_euler()
fit = H_ALL * 1.22; K = 3.0                                    # K: the spray frame shows K times the bottle render's height
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24 * K; cd.lens = 24 * dist / fit; cd.clip_start = .004
cd.dof.use_dof = True; cd.dof.focus_distance = (NOZ - CAM).length; cd.dof.aperture_fstop = 5.6

# the spray heads out of the nozzle (-Y) and swings toward the lens so it ends up on the viewer
to_cam = (CAM - NOZ).normalized(); CR = cam.matrix_world.to_3x3() @ Vector((1, 0, 0)); CU = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
bpy.context.view_layer.update(); CR = cam.matrix_world.to_3x3() @ Vector((1, 0, 0)); CU = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
AX = (to_cam * cos(radians(30)) + CR * sin(radians(30)) + CU * .06).normalized()   # out of the nozzle toward screen right, then it opens over the lens
ax = bpy.data.objects.new('axis', None); col.objects.link(ax); ax.location = NOZ
ax.rotation_euler = AX.to_track_quat('Z', 'Y').to_euler()     # local +Z runs down the spray
REACH = (CAM - NOZ).dot(AX) + .02                               # the front ends just past the lens plane

def front(t):  # fast out of the nozzle, slowing as it spreads (air drag), normalised to reach the lens at the last frame
    T = (N_FR - 1) / FPS; tau = .34
    return REACH * (1 - exp(-t / tau)) / (1 - exp(-T / tau))

# ------------------------------------------------------------------ the mist volume
TANA = .26; FLARE = 1.6                                                     # cone half angle about 19 degrees, like a fine atomizer
m = Mat('mist')
tc = m.n('ShaderNodeTexCoord', object=ax)
P = tc.outputs['Object']
# turbulence grows with distance from the nozzle: offset the lookup with a low frequency noise vector
sep0 = m.n('ShaderNodeSeparateXYZ'); m.l(P, sep0.inputs[0]); z0 = sep0.outputs['Z']
adv = m.n('ShaderNodeVectorMath', operation='SUBTRACT'); m.l(P, adv.inputs[0])   # advect: texture flows outward with the spray
ADV = adv.inputs[1]
tn = m.n('ShaderNodeTexNoise', noise_dimensions='4D', Scale=26., Detail=3., Roughness=.5); m.l(adv.outputs[0], tn.inputs['Vector']); TW1 = tn.inputs['W']
cen = m.n('ShaderNodeVectorMath', operation='SUBTRACT'); m.l(tn.outputs['Color'], cen.inputs[0]); cen.inputs[1].default_value = (.5, .5, .5)
amp = m.math('MULTIPLY', z0, .55)
sc = m.n('ShaderNodeVectorMath', operation='SCALE'); m.l(cen.outputs[0], sc.inputs[0]); m.l(amp, sc.inputs['Scale'])
Pw = m.n('ShaderNodeVectorMath', operation='ADD'); m.l(P, Pw.inputs[0]); m.l(sc.outputs[0], Pw.inputs[1])
sep = m.n('ShaderNodeSeparateXYZ'); m.l(Pw.outputs[0], sep.inputs[0])
x, y, z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
rho = m.math('SQRT', m.math('ADD', m.math('MULTIPLY', x, x), m.math('MULTIPLY', y, y)))
zp = m.math('MAXIMUM', z, 0.)
r = m.math('ADD', m.math('ADD', .0012, m.math('MULTIPLY', zp, TANA)), m.math('MULTIPLY', m.math('MULTIPLY', zp, zp), FLARE))   # the plume flares as it slows and billows
q = m.math('DIVIDE', rho, r)
radial = m.math('EXPONENT', m.math('MULTIPLY', m.math('MULTIPLY', q, q), -2.2))
FR, front_m = m.rng(z, .0, .01, 1., 0.)                         # front edge (min/max set per frame)
TL, tail_m = m.rng(z, .0, .01, 0., 1.)                          # tail: the nozzle end clears once the press is over
_, start_m = m.rng(z, -.001, .003, 0., 1.)
dil = m.math('POWER', m.math('DIVIDE', .0012, r), .55)           # it thins as it spreads
# fine wisps: 4D noise moving outward with the flow, contrast-shaped
fn = m.n('ShaderNodeTexNoise', noise_dimensions='4D', Scale=110., Detail=9., Roughness=.62, Distortion=.25)
m.l(adv.outputs[0], fn.inputs['Vector']); TW2 = fn.inputs['W']
_, wisp = m.rng(fn.outputs['Fac'], .36, .74, 0., 1., 'SMOOTHERSTEP')
gn = m.n('ShaderNodeTexNoise', noise_dimensions='4D', Scale=34., Detail=4., Roughness=.55); m.l(adv.outputs[0], gn.inputs['Vector']); TW3 = gn.inputs['W']
_, clump = m.rng(gn.outputs['Fac'], .3, .7, .25, 1.)
tex = m.math('ADD', .04, m.math('MULTIPLY', m.math('MULTIPLY', wisp, clump), 1.6))
dens = m.math('MULTIPLY', m.math('MULTIPLY', m.math('MULTIPLY', radial, front_m), m.math('MULTIPLY', tail_m, start_m)), m.math('MULTIPLY', dil, tex))
DK = m.n('ShaderNodeMath', operation='MULTIPLY'); m.l(dens, DK.inputs[0]); DK.inputs[1].default_value = 1.
vs = m.n('ShaderNodeVolumeScatter', Anisotropy=.62); vs.inputs['Color'].default_value = (1., .975, .94, 1)
m.l(DK.outputs[0], vs.inputs['Density']); m.l(vs.outputs[0], m.out.inputs['Volume'])
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
me = bpy.data.meshes.new('dom'); bm.to_mesh(me); bm.free()
dom = obj('mist_domain', me); dom.data.materials.append(m.m)
mid = NOZ + AX * (REACH * .5)
dom.location = mid; dom.rotation_euler = ax.rotation_euler; RMAX = .0012 + REACH * TANA + REACH * REACH * FLARE
dom.scale = (RMAX * 2.6 + .02, RMAX * 2.6 + .02, REACH + .02)

# ------------------------------------------------------------------ droplets: atomized beads of fragrance, water-clear
dm = Mat('drop'); db = dm.n('ShaderNodeBsdfPrincipled', **{'Base Color': (1, 1, 1, 1), 'Roughness': .02, 'IOR': 1.36, 'Transmission Weight': 1.})
dm.l(db.outputs[0], dm.out.inputs[0])
random.seed(7)
def cone_dir(spread):
    a = random.random() * 2 * pi; s = abs(random.gauss(0, spread))
    u = AX.orthogonal().normalized(); v = AX.cross(u)
    return (AX * cos(s) + (u * cos(a) + v * sin(a)) * sin(s)).normalized()
DROPS = []
for i in range(2600):
    te = random.random() ** 1.4 * .20                           # the press lasts about a fifth of a second
    d = cone_dir(radians(11))
    v0 = random.uniform(1.6, 3.6); tau = random.uniform(.10, .26)
    rad = random.choice((.00012, .00016, .00022, .0003)) * random.uniform(.8, 1.25)
    if random.random() < .04: rad *= 2.2                         # a few bigger beads
    DROPS.append((te, d, v0, tau, rad, Vector((random.gauss(0, .0004), random.gauss(0, .0004), random.gauss(0, .0004)))))
def drop_mesh(t):
    bm = bmesh.new(); dt = 1 / 120
    for te, d, v0, tau, rad, j in DROPS:
        a = t - te
        if a <= 0: continue
        sdist = v0 * tau * (1 - exp(-a / tau)); spd = v0 * exp(-a / tau)
        p = NOZ + d * sdist + j * min(1., a * 8) + Vector((0, 0, -4.9 * a * a * .25))
        if (p - NOZ).dot(AX) > (CAM - NOZ).dot(AX) - .006: continue
        st = max(1., min(5., spd * dt / (rad * 2)))               # a short streak when it's moving fast (shutter blur)
        mat = Matrix.Translation(p) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Diagonal((rad, rad, rad * st, 1))
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1., matrix=mat)
    me = bpy.data.meshes.new('drops'); bm.to_mesh(me); bm.free(); me.shade_smooth(); return me
drops = obj('drops', bpy.data.meshes.new('d0')); drops.data.materials.append(dm.m)

# ------------------------------------------------------------------ light: warm key, and a strong back light so the mist glows toward the lens
def area(name, loc, target, sx, sy, Wt, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = Wt; l.color = color
    o = obj(name, l); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
MID = NOZ + AX * .12
area('back', MID + Vector((.10, .55, .18)), MID, .4, .4, 160, (1, .93, .80))
area('backL', MID + Vector((-.35, .30, .10)), MID, .25, .25, 60, (1, .96, .9))
area('key', MID + Vector((-.30, -.15, .35)), MID, .3, .3, 26, (1, .95, .86))
area('rim', MID + Vector((.40, -.05, .05)), MID, .05, .4, 30)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0, 0, 0, 1)

r = scn.render; r.engine = 'CYCLES'; r.film_transparent = True
r.resolution_x, r.resolution_y = int(1500 * SCALE), int(1100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.transmission_bounces = 8; cy.transparent_max_bounces = 8; cy.volume_bounces = 1; cy.glossy_bounces = 4; cy.diffuse_bounces = 1
cy.volume_step_rate = 1.; cy.volume_max_steps = 512; cy.sample_clamp_indirect = 6.
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
DEN = float(os.environ.get('AB_MIST', '120'))

for f in FRAMES:
    t = f / FPS; fz = front(t)
    FR.inputs['From Min'].default_value = fz * .82; FR.inputs['From Max'].default_value = fz * 1.02 + .002
    tl = max(0., (t - .24)) * .55                               # once the press ends, the nozzle end clears
    TL.inputs['From Min'].default_value = tl * .5 - .001; TL.inputs['From Max'].default_value = tl + .004
    ADV.default_value = (0, 0, fz * .55)
    for W_, k in ((TW1, .8), (TW2, 2.2), (TW3, 1.2)): W_.default_value = t * k
    DK.inputs[1].default_value = DEN * (.55 + 1.1 * min(1., t / .8) ** 1.5)  # it stays thick as it opens, so it washes over the lens
    old = drops.data; drops.data = drop_mesh(t); drops.data.materials.append(dm.m); bpy.data.meshes.remove(old)
    r.filepath = os.path.join(OUT, 'spray-%02d.png' % f)
    bpy.ops.render.render(write_still=True)
    print('rendered', f, 'front', round(fz, 3))
# where the nozzle and the bottle render's centre land in this frame, for lining it up in the page
from bpy_extras.object_utils import world_to_camera_view
nz = world_to_camera_view(scn, cam, NOZ)
print('NOZZLE_UV', round(nz.x, 4), round(1 - nz.y, 4), 'K', K)
