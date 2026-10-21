# Kings Wheels: a 22x12 chrome split-spoke truck wheel on a 33" all-terrain tire with chrome spike lugs,
# path-traced in a dark showroom. Renders a 360 degree turntable (for drag-to-spin) or a single still.
# usage: blender -b -P wheel.py -- <out_dir> <mode: turntable|still> [frames|frame] [samples] [res]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector, Matrix, Euler

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; MODE = argv[1]; N = int(argv[2]) if len(argv) > 2 else 36; SAMPLES = int(argv[3]) if len(argv) > 3 else 48; RES = int(argv[4]) if len(argv) > 4 else 960
HDRI = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/blend/hdri/studio_small_09_1k.hdr'
random.seed(9)
def lerp(a, b, t): return a + (b - a) * t
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

CHROME = principled('chrome', (.92, .93, .95, 1), Metallic=1., Roughness=.035)[0]
MACHINED = principled('machined', (.8, .81, .83, 1), Metallic=1., Roughness=.16, **{'Anisotropic': .8})[0]
RUBBER, rnt, rb, rout = principled('rubber', hexc('#121213'), Roughness=.8, **{'Sheen Weight': .15, 'Specular IOR Level': .3})
tc = rnt.nodes.new('ShaderNodeTexCoord'); nz = rnt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900
bp = rnt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .15; bp.inputs['Distance'].default_value = .0002
rnt.links.new(tc.outputs['Object'], nz.inputs['Vector']); rnt.links.new(nz.outputs['Fac'], bp.inputs['Height']); rnt.links.new(bp.outputs[0], rb.inputs['Normal'])
CAP = principled('capblack', hexc('#0e0e10'), Roughness=.2, **{'Coat Weight': 1.})[0]
FLOOR = principled('floor', hexc('#060607'), Roughness=.5, **{'Coat Weight': .35, 'Coat Roughness': .08})[0]

def lathe(name, prof, seg=192):
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
    return link(bpy.data.objects.new(name, me))

# ---------------------------------------------------------------- wheel (axle = local Z, face toward +Z)
wheel = link(bpy.data.objects.new('wheel', None))
def part(o): o.parent = wheel; return o
# barrel + deep polished lip
barrel = part(lathe('barrel', [(.262, -.152), (.286, -.15), (.29, -.143), (.278, -.136), (.262, -.118), (.252, -.06), (.252, .04), (.258, .075),
                               (.27, .1), (.284, .124), (.292, .14), (.294, .149), (.29, .156), (.281, .157), (.272, .152), (.266, .14), (.262, .124)]))
barrel.data.materials.append(CHROME)
# hub face (recessed: concave)
hub = part(lathe('hub', [(.262, .118), (.2, .1), (.12, .075), (.098, .07), (.092, .062), (.06, .06), (0, .06)], 192))
hub.data.materials.append(CHROME)

def arm(a0, a1, z0, z1, r0, r1, w0, w1, t0, t1, twist=0.):
    """A spoke as a loft between two rectangles: hub end (r0, z0) to lip end (r1, z1)."""
    bm = bmesh.new(); rings = []
    steps = 10
    for i in range(steps + 1):
        u = i / steps; a = lerp(a0, a1, u); r = lerp(r0, r1, u); z = lerp(z0, z1, u ** 1.3) + .012 * sin(pi * u)
        w = lerp(w0, w1, u); t = lerp(t0, t1, u)
        c = Vector((cos(a) * r, sin(a) * r, z)); tang = Vector((-sin(a), cos(a), 0)); rad = Vector((cos(a), sin(a), 0))
        up = Vector((0, 0, 1)).lerp(rad, .15).normalized()
        tang = (Matrix.Rotation(twist * u, 3, rad) @ tang)
        ring = [bm.verts.new(c + tang * sx * w / 2 + up * sz * t / 2) for sx, sz in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
        rings.append(ring)
    for i in range(steps):
        A, B = rings[i], rings[i + 1]
        for k in range(4): bm.faces.new((A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('arm'); bm.to_mesh(me); bm.free()
    o = part(link(bpy.data.objects.new('arm', me)))
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .004; bv.segments = 4; bv.limit_method = 'ANGLE'
    o.modifiers.new('ws', 'WEIGHTED_NORMAL')
    o.data.materials.append(CHROME)
    for p in o.data.polygons: p.use_smooth = True
    return o

# six split-spoke pairs, swept slightly for a directional look
for k in range(6):
    base = k / 6 * 2 * pi
    for side in (-1, 1):
        a0 = base + side * .11; a1 = base + side * .2 + .1
        arm(a0, a1, .07, .126, .1, .262, .046, .066, .036, .026, twist=side * .25)
    # machined accent between the pair
    arm(base + .02, base + .12, .08, .122, .13, .245, .016, .026, .014, .012).data.materials[0] = MACHINED
# lug nuts: 8 on a 165.1 mm bolt circle, chrome spikes
for k in range(8):
    a = k / 8 * 2 * pi + pi / 8; r = .0826
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.0125, depth=.022, location=(cos(a) * r, sin(a) * r, .07)); n = bpy.context.active_object
    bv = n.modifiers.new('bv', 'BEVEL'); bv.width = .0015; bv.segments = 2; n.data.materials.append(CHROME); part(n)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.011, radius2=.0012, depth=.05, location=(cos(a) * r, sin(a) * r, .105)); s = bpy.context.active_object
    s.data.materials.append(CHROME); part(s)
    for p in s.data.polygons: p.use_smooth = True
# center cap: gloss black with a chrome ring and a chrome crown
cap = part(lathe('cap', [(.056, .062), (.058, .07), (.052, .082), (.035, .088), (0, .09)], 96)); cap.data.materials.append(CAP)
ring = part(lathe('capring', [(.058, .066), (.0615, .07), (.06, .076), (.056, .072)], 96)); ring.data.materials.append(CHROME)
crown = bmesh.new()
pts = [(-.022, -.008), (-.022, .006), (-.014, .0), (-.007, .012), (0, .002), (.007, .012), (.014, .0), (.022, .006), (.022, -.008)]
vs = [crown.verts.new((x, y, .0885)) for x, y in pts]; f = crown.faces.new(vs)
ext = bmesh.ops.extrude_face_region(crown, geom=[f]); bmesh.ops.translate(crown, vec=(0, 0, .004), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
me = bpy.data.meshes.new('crown'); crown.to_mesh(me); crown.free(); co = part(link(bpy.data.objects.new('crown', me))); co.data.materials.append(CHROME)
bv = co.modifiers.new('bv', 'BEVEL'); bv.width = .0008; bv.segments = 2

# ---------------------------------------------------------------- tire: 33x12.50R22 all-terrain
R_OUT, R_BASE = .419, .403
tire = part(lathe('tire', [(.287, -.15), (.3, -.158), (.34, -.166), (.38, -.162), (R_BASE - .004, -.15), (R_BASE, -.13), (R_BASE + .001, -.06), (R_BASE + .001, .06),
                           (R_BASE, .13), (R_BASE - .004, .15), (.38, .162), (.34, .166), (.3, .158), (.287, .15)], 256))
tire.data.materials.append(RUBBER)
# tread blocks: two staggered rows + shoulder lugs that wrap onto the sidewall
bm = bmesh.new(); NB = 38
def block(a, z, w, l, h, r0, tilt=0., sipe=True):
    h = h * .62
    parts = [(-.27, .46), (.27, .46)] if sipe else [(0, 1.)]
    for off, frac in parts:
        ret = bmesh.ops.create_cube(bm, size=1)
        for v in ret['verts']:
            if v.co.x > 0: v.co.y *= .8; v.co.z *= .84            # tapered, chamfered tops
        bmesh.ops.scale(bm, vec=(h, l * frac, w * random.uniform(.9, 1.06)), verts=ret['verts'])
        bmesh.ops.translate(bm, vec=(0, off * l, 0), verts=ret['verts'])
        M = Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation((r0 + h / 2, 0, z)) @ Matrix.Rotation(tilt, 4, 'X')
        bmesh.ops.transform(bm, matrix=M, verts=ret['verts'])
    return
    ret = bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(h, l, w), verts=ret['verts'])
    M = Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation((r0 + h / 2, 0, z)) @ Matrix.Rotation(tilt, 4, 'X')
    bmesh.ops.transform(bm, matrix=M, verts=ret['verts'])
for k in range(NB):
    a = k / NB * 2 * pi
    block(a, .045, .075, .044, .024, R_BASE - .004, .22)
    block(a + pi / NB, -.045, .075, .044, .024, R_BASE - .004, -.22)
    for side in (-1, 1):
        block(a + (pi / NB if side < 0 else 0), side * .118, .06, .05, .026, R_BASE - .008, side * .1)
        if k % 2 == 0: block(a + (pi / NB if side < 0 else 0), side * .157, .022, .07, .03, .37, 0, sipe=False)
me = bpy.data.meshes.new('tread'); bm.to_mesh(me); bm.free()
tread = part(link(bpy.data.objects.new('tread', me))); tread.data.materials.append(RUBBER)
bv = tread.modifiers.new('bv', 'BEVEL'); bv.width = .0018; bv.segments = 2

# ---------------------------------------------------------------- stand the wheel up on a turntable
turn = link(bpy.data.objects.new('turn', None))
wheel.parent = turn
wheel.rotation_euler = (pi / 2, 0, 0)          # axle along -Y, face toward the camera side
wheel.location = (0, 0, R_OUT)
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); fl = bpy.context.active_object; fl.data.materials.append(FLOOR)

# ---------------------------------------------------------------- light: dark showroom, long strip softboxes for chrome
def area(name, loc, target, sx, sy, power, color=(1, 1, 1), cam=False):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = cam; return o
area('stripL', (-1.6, -.6, 1.2), (0, 0, .42), .25, 2.2, 110)
area('stripR', (1.7, -.4, 1.0), (0, 0, .42), .25, 2.2, 95, (.92, .95, 1))
area('top', (0, .3, 2.4), (0, 0, .4), 1.2, .4, 55)
area('front', (.3, -2.4, .8), (0, 0, .42), 1.2, .5, 22, (1, .97, .93))
area('back', (0, 2.2, 1.1), (0, 0, .5), 2.4, .4, 45, (.85, .9, 1))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bgE = wn.nodes.new('ShaderNodeBackground'); bgE.inputs[1].default_value = .25
bgC = wn.nodes.new('ShaderNodeBackground'); bgC.inputs[0].default_value = hexc('#0b0b0d'); bgC.inputs[1].default_value = 1.
lp = wn.nodes.new('ShaderNodeLightPath'); mix = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bgE.inputs[0]); wn.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0]); wn.links.new(bgE.outputs[0], mix.inputs[1]); wn.links.new(bgC.outputs[0], mix.inputs[2]); wn.links.new(mix.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 85; cd.dof.use_dof = True; cd.dof.aperture_fstop = 8.
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (.0, -2.55, .5); tgt = Vector((0, 0, .43))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
focus = link(bpy.data.objects.new('focus', None)); focus.location = (0, -.1, .42); cd.dof.focus_object = focus

r = scn.render; r.resolution_x = r.resolution_y = RES; r.resolution_percentage = 100
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 10; cy.glossy_bounces = 8; cy.diffuse_bounces = 3; cy.sample_clamp_indirect = 10
cy.caustics_reflective = False; cy.caustics_refractive = False
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - High Contrast'
r.use_persistent_data = True; r.image_settings.file_format = 'PNG'
os.makedirs(OUT, exist_ok=True)
if MODE == 'turntable':
    r.use_overwrite = False; r.use_placeholder = True
    scn.frame_start = 1; scn.frame_end = N
    for f in range(1, N + 1):
        turn.rotation_euler = (0, 0, -.55 + (f - 1) / N * 2 * pi); turn.keyframe_insert('rotation_euler', frame=f)
    for fc in turn.animation_data.action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    r.filepath = os.path.join(OUT, 'spin_'); bpy.ops.render.render(animation=True)
else:
    turn.rotation_euler = (0, 0, -.55 + N / 36 * 2 * pi)
    r.filepath = os.path.join(OUT, f'still_{N}.png'); bpy.ops.render.render(write_still=True)
print('done')
