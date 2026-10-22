# Petals & Poetry: Matcha In Bloom, path-traced in Blender (Cycles).
# Builds the whole scene from code: thick glass with condensation, layered milk + matcha,
# ice, a star-tip icing swirl that pipes on (curve bevel grows), ~60 buttercream petals that
# start as orange wireframe and fill in one by one while a piping bag follows them, sugar pearls,
# studio softboxes and a dusty-blue cyclorama. Camera moves and depth of field are keyframed.
#
# usage: bpe run scene.py -m final -- <mode> [args]
#   still <frame> <out.png> [samples] [res]     one frame
#   save <out.blend>                            save the scene for an animation render
import bpy, bmesh, math, random, sys
from math import sin, cos, pi
from mathutils import Vector, Matrix, Quaternion, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0] if argv else 'still'
from bpe_assets import asset  # pinned in blender-perf.json, fetched once into the shared cache (run through bpe)
try: HDRI = asset('studio_small_09_1k.hdr')
except FileNotFoundError: HDRI = ''  # the world load below already tolerates a missing HDRI
random.seed(11)

def clamp(v, a=0., b=1.): return max(a, min(b, v))
def smooth(a, b, x):
    t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def hexc(h, a=1.):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (a,)

# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
FPS = 24; scn.render.fps = FPS
F_END = 228; scn.frame_start = 1; scn.frame_end = F_END
col = scn.collection

def link(o): col.objects.link(o); return o

def lathe(name, prof, seg=160, smooth_all=True):
    verts, faces, rings = [], [], []
    for r, z in prof:
        if r < 1e-7: verts.append((0, 0, z)); rings.append([len(verts) - 1])
        else:
            idx = []
            for k in range(seg):
                a = 2 * pi * k / seg; verts.append((r * cos(a), r * sin(a), z)); idx.append(len(verts) - 1)
            rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        if len(A) == 1 and len(B) == 1: continue
        for k in range(seg):
            if len(A) == 1: faces.append((A[0], B[(k + 1) % seg], B[k]))
            elif len(B) == 1: faces.append((A[k], A[(k + 1) % seg], B[0]))
            else: faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth_all
    return link(bpy.data.objects.new(name, me))

# ---------------------------------------------------------------- materials
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); return m, nt, out

def principled(name, color, **kw):
    m, nt, out = node_mat(name)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = color
    for k, v in kw.items(): b.inputs[k].default_value = v
    nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b, out

def with_wire(m, nt, bsdf_out, out, wire_col=(1, .45, .08, 1), mode='outline'):
    """Driven by the object's custom prop 'wire' (1 → 0).
    outline: an orange selection-style rim glow over the material (petals as they're piped).
    fade: the material fades in from nothing (the glass, while its wire cage fades out)."""
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_type = 'OBJECT'; attr.attribute_name = 'wire'
    mix = nt.nodes.new('ShaderNodeMixShader')
    if mode == 'fade':
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        nt.links.new(attr.outputs['Fac'], mix.inputs[0]); nt.links.new(bsdf_out, mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    else:
        lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs[0].default_value = .35
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
        nt.links.new(lw.outputs['Facing'], mul.inputs[0]); nt.links.new(attr.outputs['Fac'], mul.inputs[1])
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = wire_col; em.inputs[1].default_value = 3.5
        add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(bsdf_out, add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
        nt.links.new(mul.outputs[0], mix.inputs[0]); nt.links.new(bsdf_out, mix.inputs[1]); nt.links.new(add.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m

def light_through(nt, shader_out):
    """Clear objects let shadow + diffuse rays straight through (caustics are off), so the drink inside gets light."""
    lp = nt.nodes.new('ShaderNodeLightPath'); mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); nt.links.new(lp.outputs['Is Diffuse Ray'], mx.inputs[1])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mx.outputs[0], mix.inputs[0]); nt.links.new(shader_out, mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    return mix.outputs[0]

def glass_mat():
    m, nt, b, out = principled('glass', (1, 1, 1, 1), **{'Transmission Weight': 1., 'IOR': 1.47, 'Roughness': .0})
    return with_wire(m, nt, light_through(nt, b.outputs[0]), out, mode='fade')
def water_mat():
    m, nt, b, out = principled('droplet', (1, 1, 1, 1), **{'Transmission Weight': 1., 'IOR': 1.33, 'Roughness': .0}); nt.links.new(light_through(nt, b.outputs[0]), out.inputs[0]); return m
def ice_mat():
    m, nt, b, out = principled('ice', (.96, .985, 1, 1), **{'Transmission Weight': 1., 'IOR': 1.31, 'Roughness': .06})
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 140; nz.inputs['Detail'].default_value = 6
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .18; bump.inputs['Distance'].default_value = .0004
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    nt.links.new(light_through(nt, b.outputs[0]), out.inputs[0])
    return m

def drink_mat(name, stops, level_world, base_z, sss=.25, rough=.12):
    """Layered drink: colour by WORLD height (so a rising level reveals milk first, then matcha),
    with noise-marbled boundaries."""
    m, nt, b, out = principled(name, (1, 1, 1, 1), **{'Roughness': rough, 'Subsurface Weight': sss, 'Subsurface Scale': .004})
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 45; nz.inputs['Detail'].default_value = 4; nt.links.new(geo.outputs['Position'], nz.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = base_z; mr.inputs['From Max'].default_value = level_world
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'; add.inputs[1].default_value = .09; add.inputs[2].default_value = -.045
    nt.links.new(nz.outputs['Fac'], add.inputs[0])
    sum_ = nt.nodes.new('ShaderNodeMath'); sum_.operation = 'ADD'; nt.links.new(mr.outputs[0], sum_.inputs[0]); nt.links.new(add.outputs[0], sum_.inputs[1])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position, cr.elements[0].color = stops[0][0], hexc(stops[0][1])
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], hexc(stops[-1][1])
    for p, h in stops[1:-1]: e = cr.elements.new(p); e.color = hexc(h)
    nt.links.new(sum_.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color']); nt.links.new(ramp.outputs[0], b.inputs['Subsurface Radius'])
    return m

ICING = {}
def icing_mat(hexcol, wire=True):
    key = (hexcol, wire)
    if key in ICING: return ICING[key]
    c = hexc(hexcol)
    m, nt, b, out = principled('icing_' + hexcol, c, **{'Roughness': .48, 'Subsurface Weight': .55, 'Subsurface Scale': .0025, 'Subsurface Radius': Vector((1, .55, .4)), 'Sheen Weight': .35, 'Sheen Roughness': .4, 'Specular IOR Level': .35, 'Coat Weight': .05})
    # fine pressure marks from the piping tip
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900; nz.inputs['Detail'].default_value = 3
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .08; bump.inputs['Distance'].default_value = .00015
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    if wire: with_wire(m, nt, b.outputs[0], out)
    ICING[key] = m; return m

# ---------------------------------------------------------------- dimensions (metres)
H, BT, WALL = .15, .014, .0028
def ri(z): return .0335 + .0075 * (z / H)
LEVEL = BT + (H - BT) * .9

# ---------------------------------------------------------------- set: cyclorama, lights, world
def cyclorama():
    verts, faces, prof = [], [], []
    for i in range(20): prof.append((-1.2 + i * .06, 0.))                         # floor toward camera
    for i in range(21): a = i / 20 * pi / 2; prof.append((.0 + .45 * sin(a), .45 - .45 * cos(a)))   # curve up
    for i in range(1, 8): prof.append((.45, .45 + i * .2))                           # back wall
    W = 3.; n = 2
    for y, z in prof:
        for k in range(n + 1): verts.append((-W / 2 + W * k / n, y + .25, z))
    for i in range(len(prof) - 1):
        for k in range(n): a = i * (n + 1) + k; faces.append((a, a + 1, a + n + 2, a + n + 1))
    me = bpy.data.meshes.new('cyc'); me.from_pydata(verts, [], faces)
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new('cyc', me))
    m, nt, b, out = principled('cyc', hexc('#8ea9d4'), Roughness=.62)
    o.data.materials.append(m); return o
cyclorama()

def area(name, loc, rot, size, power, color=(1, 1, 1), shape='RECTANGLE', size_y=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.shape = shape; l.size = size
    if size_y: l.size_y = size_y
    o = link(bpy.data.objects.new(name, l)); o.location = loc; o.rotation_euler = rot; o.visible_camera = False; o.visible_glossy = False; return o
def aim(o, target=(0, 0, .09)):
    d = Vector(target) - o.location; o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
key = area('key', (-.42, -.5, .42), (0, 0, 0), .55, 95, (1, .97, .93), size_y=.35); aim(key); key.data.energy = 16
stripL = area('stripL', (-.36, .3, .22), (0, 0, 0), .05, 7, (.92, .95, 1), size_y=.6); aim(stripL, (0, 0, .1))
stripR = area('stripR', (.38, .28, .2), (0, 0, 0), .05, 8, (1, .96, .96), size_y=.6); aim(stripR, (0, 0, .1))
top = area('top', (0, -.05, .7), (0, 0, 0), .4, 9, (1, 1, 1)); aim(top, (0, 0, 0))
fill = area('fill', (.5, -.45, .12), (0, 0, 0), .5, 3, (1, .93, .95)); aim(fill)
# world: studio HDRI, low, for reflections only
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment')
try: env.image = bpy.data.images.load(HDRI)
except Exception: env = None
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .3; wo = wn.nodes.new('ShaderNodeOutputWorld')
if env: wn.links.new(env.outputs[0], bg.inputs[0])
wn.links.new(bg.outputs[0], wo.inputs[0])

# ---------------------------------------------------------------- the glass
gp = [(0, 0), (.031, 0), (.0335, .0012), (.0347, .004), (.0352, .009)]
for i in range(1, 41): z = lerp(.009, H, i / 40); gp.append((ri(z) + WALL, z))
gp += [(ri(H) + WALL * .85, H + .0011), (ri(H) + WALL * .5, H + .0016), (ri(H) + WALL * .15, H + .0011), (ri(H), H)]
for i in range(40, -1, -1): z = lerp(BT + .004, H - .0004, i / 40); gp.append((ri(z), z))
gp += [(ri(BT) - .002, BT + .0006), (ri(BT) - .006, BT), (0, BT - .0004)]
glass = lathe('glass', gp, 192); glass.data.materials.append(glass_mat()); glass['wire'] = 1.0
# the modelling cage: a low-poly copy of the glass drawn as real wire geometry, glowing Blender orange
cage = lathe('cage', [(.0352, 0)] + [(ri(z) + WALL, z) for z in [lerp(.012, H, i / 9) for i in range(10)]] + [(ri(H), H)], 24, smooth_all=False)
wm = cage.modifiers.new('wf', 'WIREFRAME'); wm.thickness = .00045; wm.use_replace = True
cm, cnt, cout = node_mat('cage'); cem = cnt.nodes.new('ShaderNodeEmission'); cem.inputs[0].default_value = (1, .3, .02, 1); cem.inputs[1].default_value = 3
cattr = cnt.nodes.new('ShaderNodeAttribute'); cattr.attribute_type = 'OBJECT'; cattr.attribute_name = 'wire'
ctr = cnt.nodes.new('ShaderNodeBsdfTransparent'); cmix = cnt.nodes.new('ShaderNodeMixShader')
cnt.links.new(cattr.outputs['Fac'], cmix.inputs[0]); cnt.links.new(ctr.outputs[0], cmix.inputs[1]); cnt.links.new(cem.outputs[0], cmix.inputs[2]); cnt.links.new(cmix.outputs[0], cout.inputs[0])
cage.data.materials.append(cm); cage['wire'] = 1.0

# condensation: one mesh of flattened droplets on the outer wall
def droplets(n=1600):
    # each drop is built in its own small bmesh: create_icosphere into one shared bmesh rescans the whole growing
    # mesh on every call (O(n^2), ~90 s for 1600 drops). Same ops, same random sequence, same vertex/face order.
    co, faces = [], []
    for i in range(n):
        z = lerp(.016, .118, random.random() ** .8); a = random.random() * 2 * pi
        r0 = ri(z) + WALL
        s = random.choice([random.uniform(.0002, .0006)] * 5 + [random.uniform(.0007, .0016)])
        bm = bmesh.new(); ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.)
        n_ = Vector((cos(a), sin(a), 0))
        M = Matrix.Translation(n_ * (r0 + s * .15) + Vector((0, 0, z))) @ Matrix.Rotation(a, 4, 'Z') @ Matrix.Diagonal((s * .45, s, s * (1.25 if s > .0007 else 1), 1))
        bmesh.ops.transform(bm, matrix=M, verts=ret['verts'])
        bm.verts.index_update(); off = len(co)
        co += [v.co.copy() for v in bm.verts]; faces += [tuple(off + v.index for v in f.verts) for f in bm.faces]; bm.free()
    me = bpy.data.meshes.new('drops'); me.from_pydata(co, [], faces)
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new('drops', me)); o.data.materials.append(water_mat()); return o
drops = droplets()

# ---------------------------------------------------------------- the drink
STOPS = [(0, '#f6f3ea'), (.44, '#eeebe0'), (.57, '#8db240'), (1, '#5f8a26')]
lp = [(0, BT + .0005)]
for i in range(1, 30): z = lerp(BT + .0005, LEVEL, i / 30); lp.append((ri(z) - .0003, z))
lp += [(ri(LEVEL) - .0003, LEVEL + .0012), (ri(LEVEL) - .0012, LEVEL + .0003), (ri(LEVEL) * .7, LEVEL), (0, LEVEL)]
liquid = lathe('liquid', lp, 160)
liquid.data.materials.append(drink_mat('matcha', STOPS, LEVEL, BT))
# origin at the bottom so scaling Z = pouring
liquid.data.transform(Matrix.Translation((0, 0, -BT))); liquid.location.z = BT

# ice: bevelled cubes, some pressed to the wall
ice_m = ice_mat(); ices = []
for i in range(6):
    s = random.uniform(.021, .025); a = i / 6 * 2 * pi + random.uniform(-.3, .3)
    z = lerp(BT + .025, LEVEL - .02, random.random())
    r = ri(z) - s * .78
    bpy.ops.mesh.primitive_cube_add(size=s, location=(cos(a) * r, sin(a) * r, z))
    c = bpy.context.active_object; c.rotation_euler = (random.uniform(-.2, .2), random.uniform(-.2, .2), a)
    bv = c.modifiers.new('bv', 'BEVEL'); bv.width = s * .16; bv.segments = 4
    c.data.materials.append(ice_m); c['home'] = c.location.z; ices.append(c)
    for p in c.data.polygons: p.use_smooth = True

# pour stream
bpy.ops.mesh.primitive_cylinder_add(radius=.0032, depth=1., vertices=32, location=(.008, .004, .5))
stream = bpy.context.active_object
sm, snt, sb, sout = principled('stream', (1, 1, 1, 1), **{'Roughness': .08, 'Subsurface Weight': .3, 'Subsurface Scale': .002, 'Coat Weight': .3})
sattr = snt.nodes.new('ShaderNodeAttribute'); sattr.attribute_type = 'OBJECT'; sattr.attribute_name = 'green'
smix = snt.nodes.new('ShaderNodeMix'); smix.data_type = 'RGBA'; smix.inputs[6].default_value = hexc('#f6f3ea'); smix.inputs[7].default_value = hexc('#7fa63c')
snt.links.new(sattr.outputs['Fac'], smix.inputs[0]); snt.links.new(smix.outputs[2], sb.inputs['Base Color'])
stream.data.materials.append(sm); stream['green'] = 0.
for p in stream.data.polygons: p.use_smooth = True
stream.data.transform(Matrix.Translation((0, 0, .5)))  # origin at the bottom end

# ---------------------------------------------------------------- icing: cream base + star-tip swirl
cb = lathe('cream', [(0, LEVEL - .004), (ri(LEVEL) - .0012, LEVEL - .004), (ri(H) - .0008, H + .0005), (ri(H) * .6, H + .002), (0, H + .002)], 128)
cb.data.materials.append(icing_mat('#fdfaf3', wire=False))

def star_profile(points=7, inner=.8):
    cu = bpy.data.curves.new('star', 'CURVE'); cu.dimensions = '2D'
    sp = cu.splines.new('BEZIER'); n = points * 2; sp.bezier_points.add(n - 1)
    for i in range(n):
        a = i / n * 2 * pi; r = 1 if i % 2 == 0 else inner
        bp = sp.bezier_points[i]; bp.co = (cos(a) * r, sin(a) * r, 0); bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = True; cu.resolution_u = 6
    o = link(bpy.data.objects.new('star', cu)); o.hide_render = True; o.hide_viewport = True; return o
STAR = star_profile(8, .6)

def swirl(name, turns, r0, r1, z0, z1, t0, t1, n=260):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(n - 1)
    for i in range(n):
        s = i / (n - 1); a = s * turns * 2 * pi; r = lerp(r0, r1, s ** .9); z = lerp(z0, z1, s ** .85)
        sp.points[i].co = (cos(a) * r, sin(a) * r, z, 1)
        taper = smooth(0, .03, s) * (1 - smooth(.88, 1, s) * .97)
        sp.points[i].radius = lerp(t0, t1, s) / t0 * max(taper, .02)
    cu.bevel_mode = 'OBJECT'; cu.bevel_object = STAR; cu.use_fill_caps = True
    cu.bevel_factor_mapping_start = cu.bevel_factor_mapping_end = 'SPLINE'
    o = link(bpy.data.objects.new(name, cu))
    STAR.scale = (t0, t0 * .86, 1)
    return o
SW = dict(turns=3.0, r0=ri(H) - .0045, r1=.003, z0=H + .002, z1=H + .046, t0=.0108, t1=.0058)
sw = swirl('swirl', **SW); sw.data.materials.append(icing_mat('#fefbf5', wire=False))
def top_at(r):
    s = clamp((SW['r0'] - r) / (SW['r0'] - SW['r1'])); return lerp(SW['z0'], SW['z1'], s ** .85) + lerp(SW['t0'], SW['t1'], s) * .86

# ---------------------------------------------------------------- buttercream petals (closed shells)
K = .0714  # three.js units → metres
def petal_mesh(w=.1, h=.12, cup=.6, flare=.2, ruffle=.004, notch=0, leaf=False, thick=.016, nu=16, nv=14):
    def S(u, v):
        wid = w * (math.sin(pi * (v * .96 + .02)) ** 1.25) if leaf else w * (math.sin(pi * (v * .86 + .07)) ** .55)
        x = u * wid; y = v * h
        if notch: y -= notch * h * math.exp(-(u / .22) ** 2) * smooth(.7, 1, v)
        z = cup * x * x / max(w, 1e-3) - flare * v * v * h + ruffle * sin(u * 5 + v * 3) * v * v
        if leaf: z += .35 * abs(x) * (1 - v * .5)
        return Vector((x, y, z))
    F, B, verts, faces, e = [], [], [], [], .002
    for j in range(nv + 1):
        for i in range(nu + 1):
            u, v = i / nu * 2 - 1, j / nv; p = S(u, v)
            du = S(min(1, u + e), v) - S(max(-1, u - e), v); dv = S(u, min(1, v + e)) - S(u, max(0, v - e))
            nrm = du.cross(dv).normalized(); t = thick * (1 - .5 * v) * (1 - .45 * u * u) + .0025
            verts.append(tuple((p + nrm * t * .5) * K)); F.append(len(verts) - 1)
            verts.append(tuple((p - nrm * t * .5) * K)); B.append(len(verts) - 1)
    at = lambda i, j: j * (nu + 1) + i
    for j in range(nv):
        for i in range(nu):
            a, b, c, d = at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)
            faces.append((F[a], F[b], F[d], F[c])); faces.append((B[a], B[c], B[d], B[b]))
    loop = [at(i, 0) for i in range(nu)] + [at(nu, j) for j in range(nv)] + [at(i, nv) for i in range(nu, 0, -1)] + [at(0, j) for j in range(nv, 0, -1)]
    for k in range(len(loop)):
        p0, p1 = loop[k], loop[(k + 1) % len(loop)]; faces.append((F[p0], B[p0], B[p1], F[p1]))
    me = bpy.data.meshes.new('petal'); me.from_pydata(verts, [], faces); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me

def basis(a, tilt):
    rx, rz = cos(a), sin(a)   # three.js used x/z for the ground plane; here ground is x/y
    up = Vector((0, 0, 1)); radial = Vector((rx, rz, 0)); inward = -radial
    x = Vector((-rz, rx, 0))
    y = up * cos(tilt) + radial * sin(tilt)
    z = inward * cos(tilt) + up * sin(tilt)
    M = Matrix((x, y, z)).transposed(); return M.to_4x4()
# three.js petal axes: x across, y along the petal, z = cup side. Our basis maps local (x,y,z) → world.

COL = dict(blush='#f2a7b8', rose='#e8859d', blue='#86a6d6', white='#fffcf6', lilac='#c4a9e8', butter='#f3cf6e', leaf='#6f9a52')
def rose(color, s):
    out = []
    rings = [(2, .07, .055, .08, .006, 1.3, 0), (3, .085, .075, .32, .014, .95, .08), (5, .1, .09, .7, .026, .62, .22), (7, .108, .1, 1.05, .04, .4, .38)]
    for ri_, (n, h, w, tilt, r, cup, flare) in enumerate(rings):
        me = petal_mesh(w=w * s, h=h * s, cup=cup, flare=flare, ruffle=.006 * s)
        for k in range(n):
            a = k / n * 2 * pi + ri_ * .7
            out.append(dict(me=me, col=color, at=Vector((cos(a) * r * s * K, sin(a) * r * s * K, 0)), a=a, tilt=tilt))
    return out
def blossom(color, s):
    out = []; me = petal_mesh(w=.07 * s, h=.085 * s, cup=.28, flare=-.05, notch=.16, ruffle=.004 * s)
    for k in range(5):
        a = k / 5 * 2 * pi; out.append(dict(me=me, col=color, at=Vector((cos(a) * .008 * s * K, sin(a) * .008 * s * K, .004 * s * K)), a=a, tilt=1.32))
    out.append(dict(dots=True, s=s)); return out
def leaf(a, s):
    return [dict(me=petal_mesh(w=.045 * s, h=.13 * s, cup=.2, flare=.12, leaf=True), col=COL['leaf'], at=Vector((0, 0, 0)), a=a, tilt=1.25)]

def flower_at(r, a, tilt_out):
    z = top_at(r) - (.075 * K * (1 - r / (.12 * K)) if r < .12 * K else 0) - .012 * K
    M = Matrix.Translation((cos(a) * r, sin(a) * r, z)) @ Quaternion(Vector((-sin(a), cos(a), 0)), tilt_out).to_matrix().to_4x4()
    return M
random.seed(5)
sets = [
    (flower_at(.03 * K, .3, .04), rose(COL['rose'], 2.05)),
    (flower_at(.33 * K, 2.25, .5), rose(COL['blue'], 1.6)),
    (flower_at(.38 * K, 4.0, .62), blossom(COL['white'], 2.05)),
    (flower_at(.36 * K, 5.2, .6), blossom(COL['lilac'], 1.95)),
    (flower_at(.4 * K, .8, .68), blossom(COL['white'], 1.9)),
    (flower_at(.44 * K, 3.15, .72), blossom(COL['blush'], 1.85)),
    (flower_at(.5 * K, 1.75, .85), blossom(COL['white'], 1.45)),
    (flower_at(.5 * K, 4.65, .85), blossom(COL['blush'], 1.4)),
    (flower_at(.48 * K, 5.95, .82), rose(COL['blush'], 1.05)),
    (flower_at(.5 * K, 2.75, .85), blossom(COL['lilac'], 1.35)),
] + [(flower_at(r * K, a, .5), leaf(a + random.uniform(-.3, .3), 1.85)) for r, a in [(.27, 1.55), (.31, 3.6), (.28, 5.95), (.26, 4.62), (.34, .15), (.32, 2.85)]]

dot_mat = principled('dots', hexc(COL['butter']), Roughness=.35, **{'Subsurface Weight': .4, 'Subsurface Scale': .001})[0]
pieces = []
for M, plist in sets:
    for p in plist:
        if p.get('dots'):
            bm = bmesh.new()
            for i in range(7):
                a = i / 6 * 2 * pi; r = .014 * p['s'] * K if i else 0
                ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.009 * p['s'] * K)
                bmesh.ops.translate(bm, vec=(cos(a) * r, sin(a) * r, .022 * p['s'] * K), verts=ret['verts'])
            me = bpy.data.meshes.new('dots'); bm.to_mesh(me); bm.free()
            for q in me.polygons: q.use_smooth = True
            o = link(bpy.data.objects.new('dots', me)); o.data.materials.append(dot_mat)
            o.matrix_world = M; pieces.append(dict(obj=o, dots=True, M=M)); continue
        e = link(bpy.data.objects.new('pv', None)); e.empty_display_size = .002
        o = link(bpy.data.objects.new('petal', p['me'])); o.parent = e
        o.data.materials.append(icing_mat(p['col'])); o['wire'] = 1.0
        sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 0; sub.render_levels = 1
        base = M @ Matrix.Translation(p['at'])
        pieces.append(dict(obj=o, empty=e, base=base, a=p['a'], tilt=p['tilt']))

# sugar pearls with a thin-film shimmer
pearl_m = principled('pearl', (1, .98, .95, 1), Roughness=.12, Metallic=.55, **{'Thin Film Thickness': 420, 'Thin Film IOR': 1.45, 'Coat Weight': .6})[0]
pearls = []
for i in range(16):
    a = random.uniform(0, 2 * pi); r = random.uniform(.12, .5) * K
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.018 * K, segments=24, ring_count=16, location=(cos(a) * r, sin(a) * r, top_at(r) + .01 * K))
    pr = bpy.context.active_object; pr.data.materials.append(pearl_m); pr['home'] = pr.location.z
    for q in pr.data.polygons: q.use_smooth = True
    pearls.append(pr)

# piping bag: clear bag with icing inside + a steel star tip
bag = link(bpy.data.objects.new('bag', None))
bag_body = lathe('bagbody', [(.0018, 0), (.0042, .007), (.0105, .032), (.012, .044), (.0112, .05), (.0035, .056), (0, .0565)], 64)
m, nt, b, out = principled('bagplastic', (1, 1, 1, 1), **{'Transmission Weight': .7, 'Roughness': .22, 'IOR': 1.4}); nt.links.new(light_through(nt, b.outputs[0]), out.inputs[0]); bag_body.data.materials.append(m)
bag_fill = lathe('bagfill', [(0, .0016), (.0013, .0016), (.0034, .007), (.0092, .03), (.0, .036)], 64)
bag_fill.data.materials.append(icing_mat(COL['rose'], wire=False))
tip = lathe('tip', [(0, -.0065), (.0006, -.0065), (.0014, -.0062), (.0021, -.002), (.0024, 0), (.0021, .0014), (0, .0014)], 48)
tip.data.materials.append(principled('steel', (.82, .84, .86, 1), Metallic=1., Roughness=.16)[0])
for o in (bag_body, bag_fill, tip): o.parent = bag

# ---------------------------------------------------------------- timeline (frames)
F_GLASS = (1, 22)        # wire → glass
F_POUR = (20, 52)
F_ICE = 30
F_SWIRL = (54, 76)
F_PET0, F_PSTEP, F_PDUR = 78, .82, 10
F_PEARL = None
F_HOLD = F_END

def key(o, path, frame, value, interp='BEZIER'):
    if isinstance(path, str) and path.startswith('['):
        o[path[2:-2]] = value; o.keyframe_insert(data_path=path, frame=frame)
    else:
        setattr(o, path, value); o.keyframe_insert(data_path=path, frame=frame)

# glass + drops: modelling wire → shaded
key(glass, '["wire"]', F_GLASS[0], 1.0); key(glass, '["wire"]', F_GLASS[0] + 8, 1.0); key(glass, '["wire"]', F_GLASS[1], 0.0)
key(cage, '["wire"]', F_GLASS[0], 1.0); key(cage, '["wire"]', F_GLASS[0] + 10, 1.0); key(cage, '["wire"]', F_GLASS[1] + 2, 0.0)
cage.hide_render = False; cage.keyframe_insert('hide_render', frame=1); cage.hide_render = True; cage.keyframe_insert('hide_render', frame=F_GLASS[1] + 3)
drops.hide_render = True; drops.keyframe_insert('hide_render', frame=1); drops.hide_render = False; drops.keyframe_insert('hide_render', frame=F_GLASS[1] - 4)
# pour
key(liquid, 'scale', 1, Vector((1, 1, .001))); key(liquid, 'scale', F_POUR[0], Vector((1, 1, .001))); key(liquid, 'scale', F_POUR[1], Vector((1, 1, 1)))
liquid.hide_render = True; liquid.keyframe_insert('hide_render', frame=1); liquid.hide_render = False; liquid.keyframe_insert('hide_render', frame=F_POUR[0])
stream.hide_render = True; stream.keyframe_insert('hide_render', frame=1); stream.hide_render = False; stream.keyframe_insert('hide_render', frame=F_POUR[0] - 2); stream.hide_render = True; stream.keyframe_insert('hide_render', frame=F_POUR[1] + 2)
for f in range(F_POUR[0] - 2, F_POUR[1] + 3, 2):
    k = smooth(F_POUR[0], F_POUR[1], f); lvl = BT + (LEVEL - BT) * k
    stream.location = (.008, .004, lvl); stream.scale = (1 - smooth(F_POUR[1] - 6, F_POUR[1], f) * .7, 1 - smooth(F_POUR[1] - 6, F_POUR[1], f) * .7, 1.2)
    stream.keyframe_insert('location', frame=f); stream.keyframe_insert('scale', frame=f)
half = (F_POUR[0] + F_POUR[1]) // 2 + 2
stream['green'] = 0.; stream.keyframe_insert('["green"]', frame=half - 2); stream['green'] = 1.; stream.keyframe_insert('["green"]', frame=half + 1)
# ice drops in with a bounce
for i, c in enumerate(ices):
    f0 = F_ICE + i * 3; home = c['home']
    c.hide_render = True; c.keyframe_insert('hide_render', frame=1); c.hide_render = False; c.keyframe_insert('hide_render', frame=f0)
    for df, dz in [(0, .17), (8, 0), (11, .006), (14, 0)]:
        c.location.z = home + dz; c.keyframe_insert('location', frame=f0 + df)
# cream + swirl
cb.hide_render = True; cb.keyframe_insert('hide_render', frame=1); cb.hide_render = False; cb.keyframe_insert('hide_render', frame=F_SWIRL[0])
sw.data.bevel_factor_end = 0.; sw.data.keyframe_insert('bevel_factor_end', frame=F_SWIRL[0]); sw.data.bevel_factor_end = 1.; sw.data.keyframe_insert('bevel_factor_end', frame=F_SWIRL[1])
sw.hide_render = True; sw.keyframe_insert('hide_render', frame=1); sw.hide_render = False; sw.keyframe_insert('hide_render', frame=F_SWIRL[0])
# petals: each unfurls and grows from its base, wire first then buttercream
order = [p for p in pieces]
fcur = F_PET0
schedule = []
for p in order:
    f0 = round(fcur); fcur += F_PSTEP; schedule.append((p, f0))
    if p.get('dots'):
        o = p['obj']; o.hide_render = True; o.keyframe_insert('hide_render', frame=1); o.hide_render = False; o.keyframe_insert('hide_render', frame=f0)
        o.matrix_world = p['M']; S0 = o.scale.copy()
        o.scale = S0 * .01; o.keyframe_insert('scale', frame=f0); o.scale = S0 * 1.15; o.keyframe_insert('scale', frame=f0 + 5); o.scale = S0; o.keyframe_insert('scale', frame=f0 + 8)
        continue
    e, o = p['empty'], p['obj']
    for kf, k in [(f0, .0), (f0 + F_PDUR * .55, .8), (f0 + F_PDUR * .8, 1.06), (f0 + F_PDUR, 1.)]:
        tilt = lerp(.15 * p['tilt'], p['tilt'], min(1, k))
        M = p['base'] @ basis(p['a'], tilt) @ Matrix.Diagonal((lerp(.35, 1, min(k, 1)), max(k, .001), lerp(.35, 1, min(k, 1)), 1))
        e.matrix_world = M; e.keyframe_insert('location', frame=kf); e.keyframe_insert('rotation_euler', frame=kf); e.keyframe_insert('scale', frame=kf)
    o.hide_render = True; o.keyframe_insert('hide_render', frame=1); o.hide_render = False; o.keyframe_insert('hide_render', frame=f0)
    o['wire'] = 1.; o.keyframe_insert('["wire"]', frame=f0 + F_PDUR * .35); o['wire'] = 0.; o.keyframe_insert('["wire"]', frame=f0 + F_PDUR * 1.2)
F_PEND = round(fcur) + F_PDUR
F_PEARL = F_PEND + 2
for i, pr in enumerate(pearls):
    f0 = F_PEARL + i; home = pr['home']
    pr.hide_render = True; pr.keyframe_insert('hide_render', frame=1); pr.hide_render = False; pr.keyframe_insert('hide_render', frame=f0)
    for df, dz in [(0, .05), (6, 0), (8, .002), (10, 0)]:
        pr.location.z = home + dz; pr.keyframe_insert('location', frame=f0 + df)
# piping bag follows the current petal
bag.hide_render = False
for o in (bag_body, bag_fill, tip):
    o.hide_render = True; o.keyframe_insert('hide_render', frame=1); o.hide_render = False; o.keyframe_insert('hide_render', frame=F_PET0 - 10); o.hide_render = True; o.keyframe_insert('hide_render', frame=F_PEND + 10)
bag.rotation_euler = (0, -.5, .35)
for p, f0 in schedule[::2]:
    tgt = (p['M'] if p.get('dots') else p['base']).to_translation()
    bag.location = tgt + Vector((.004, -.002, .007)); bag.keyframe_insert('location', frame=f0 + 2)
bag.location = Vector((.02, -.01, .09)); bag.keyframe_insert('location', frame=F_PET0 - 10); bag.keyframe_insert('location', frame=F_PEND + 10)

# ---------------------------------------------------------------- camera
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85; cam_d.sensor_width = 36
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 4.5; cam_d.dof.aperture_blades = 9
cam = link(bpy.data.objects.new('cam', cam_d)); scn.camera = cam
focus = link(bpy.data.objects.new('focus', None)); cam_d.dof.focus_object = focus
# [frame, azimuth, elevation, distance, target z, fstop]
FE = F_PEND + 44; scn.frame_end = FE
CK = [(1, -.72, .24, .78, .085, 8), (22, -.55, .2, .7, .085, 8), (52, -.2, .2, .62, .1, 6),
      (76, .1, .55, .38, .17, 4.5), (115, .7, .72, .23, .185, 3.2), (F_PEND, 1.35, .62, .25, .184, 3.2),
      (F_PEND + 24, .45, .3, .64, .1, 5.6), (FE, .55, .29, .62, .1, 5.6)]
for f, az, el, d, tz, fs in CK:
    cam.location = (sin(az) * cos(el) * d, -cos(az) * cos(el) * d, tz + sin(el) * d)
    focus.location = (0, 0, tz + (.014 if f >= 76 and f < F_PEND + 10 else 0))
    dvec = focus.location - cam.location; cam.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
    cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f); focus.keyframe_insert('location', frame=f)
    cam_d.dof.aperture_fstop = fs; cam_d.dof.keyframe_insert('aperture_fstop', frame=f)

# ---------------------------------------------------------------- render settings
r = scn.render; scn.render.engine = 'CYCLES'
cy = scn.cycles; cy.device = 'CPU'; cy.samples = 24; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 12; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.transparent_max_bounces = 10
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.; cy.sample_clamp_indirect = 6
r.resolution_x = r.resolution_y = 720; r.resolution_percentage = 100
r.use_persistent_data = True; r.use_overwrite = False; r.use_placeholder = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
r.image_settings.file_format = 'PNG'

if MODE == 'still':
    f = int(argv[1]); out = argv[2]
    if len(argv) > 3: cy.samples = int(argv[3])
    if len(argv) > 4: r.resolution_x = r.resolution_y = int(argv[4])
    scn.frame_set(f); r.filepath = out; bpy.ops.render.render(write_still=True)
elif MODE == 'save':
    bpy.ops.wm.save_as_mainfile(filepath=argv[1])
print('F_PEND', F_PEND, 'FE', FE)
