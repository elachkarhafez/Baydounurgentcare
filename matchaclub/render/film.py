# Matcha Club: the "up close" scroll film. Their upside down matcha as it's built in their reel:
# a creamy white base, big ice, matcha poured over the ice, milk on top, a torched marshmallow skewer across the rim.
# One static cup, one camera move: macro on the base -> up through the matcha and ice -> the milk top and skewer -> pull back.
# Transparent film (glass stays see-through), composited onto the page green afterwards by encode.py.
# usage: bpe run film.py -m final -- <out_dir> [n_frames=72] [samples=48] [scale=1] [only_frame=-1]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; N = int(argv[1]) if len(argv) > 1 else 72; SAMPLES = int(argv[2]) if len(argv) > 2 else 48
SCALE = float(argv[3]) if len(argv) > 3 else 1.; ONLY = int(argv[4]) if len(argv) > 4 else -1
from bpe_assets import asset
HDRI = asset('studio_small_09_1k.hdr')
random.seed(7)

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

# ---------------------------------------------------------------- the cup (16 oz U-cup, metres)
H, R_TOP, R_BOT, BR = .122, .0475, .034, .022
FILL = .106
def r_out(z):
    if z >= BR: return R_BOT + (R_TOP - R_BOT) * (z - BR) / (H - BR)
    th = math.acos(max(-1, min(1, 1 - z / BR))); return R_BOT * sin(th)

def lathe(name, prof, steps=128, close_top=False):
    """prof: list of (r, z) from the axis outwards/upwards; spun around Z."""
    bm = bmesh.new(); vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * pi, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    if close_top: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    else:  # open surface: make the side faces point away from the axis
        bm.faces.ensure_lookup_table(); f = max(bm.faces, key=lambda f: f.calc_area())
        c = f.calc_center_median()
        if f.normal.x * c.x + f.normal.y * c.y < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return link(bpy.data.objects.new(name, me))

cup_prof = [(0, 0)]
for i in range(1, 25):
    th = (i / 24) * pi / 2; cup_prof.append((R_BOT * sin(th), BR * (1 - cos(th))))
for i in range(1, 41):
    z = BR + (H - BR) * i / 40; cup_prof.append((r_out(z), z))
cup = lathe('cup', cup_prof)
so = cup.modifiers.new('wall', 'SOLIDIFY'); so.thickness = .0007; so.offset = -1; so.use_even_offset = True
def glassy(name, rough, ior):
    """Clear plastic/ice that lets light through to what's inside: shadow rays see a transparent BSDF
    (otherwise the drink behind the wall sits in the dark, since lamps can't be sampled through refraction)."""
    m, nt, b, out = principled(name, (1, 1, 1, 1), Roughness=rough, IOR=ior, **{'Transmission Weight': 1.})
    lp = nt.nodes.new('ShaderNodeLightPath'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); nt.links.new(b.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0]); return m
PET = glassy('pet', .012, 1.52)
cup.data.materials.append(PET)
bpy.ops.mesh.primitive_torus_add(major_radius=R_TOP + .0003, minor_radius=.0012, major_segments=128, minor_segments=16, location=(0, 0, H))
rim = bpy.context.active_object; rim.data.materials.append(PET)
for p in rim.data.polygons: p.use_smooth = True

# ---------------------------------------------------------------- the drink: one solid, banded by height
liq_prof = [(0, .0009)]
for i in range(1, 25):
    th = (i / 24) * pi / 2; z = .0009 + (BR - .0009) * (1 - cos(th)); liq_prof.append((max(0, r_out(z) - .001), z))
for i in range(1, 37):
    z = BR + (FILL - BR) * i / 36; liq_prof.append((r_out(z) - .001, z))
liq_prof.append((0, FILL))
liq = lathe('drink', liq_prof, close_top=True)

LQ, nt, b, out = principled('drink', hexc('#88a94a'), Roughness=.16, **{'Subsurface Weight': .15, 'Subsurface Scale': .004, 'Coat Weight': .15, 'Coat Roughness': .1})
b.inputs['Subsurface Radius'].default_value = (1., .7, .4)
N_ = nt.nodes
tc = N_.new('ShaderNodeTexCoord')
sep = N_.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
nA = N_.new('ShaderNodeTexNoise'); nA.inputs['Scale'].default_value = 38; nA.inputs['Detail'].default_value = 3; nA.inputs['Distortion'].default_value = .4
nB = N_.new('ShaderNodeTexNoise'); nB.inputs['Scale'].default_value = 130; nB.inputs['Detail'].default_value = 4; nB.inputs['Roughness'].default_value = .55
for n_ in (nA, nB): nt.links.new(tc.outputs['Object'], n_.inputs['Vector'])
def math_(op, a=None, b_=None, v1=None, v2=None, clamp=False, v3=None):
    m = N_.new('ShaderNodeMath'); m.operation = op; m.use_clamp = clamp
    if a is not None: nt.links.new(a, m.inputs[0])
    elif v1 is not None: m.inputs[0].default_value = v1
    if b_ is not None: nt.links.new(b_, m.inputs[1])
    elif v2 is not None: m.inputs[1].default_value = v2
    if v3 is not None: m.inputs[2].default_value = v3
    return m.outputs[0]
dA = math_('MULTIPLY_ADD', nA.outputs['Fac'], v2=.018, v3=-.009)
dB = math_('MULTIPLY_ADD', nB.outputs['Fac'], v2=.007, v3=-.0035)
zz = math_('ADD', math_('ADD', sep.outputs['Z'], dA), dB)
h = math_('DIVIDE', zz, v2=FILL)
ramp = N_.new('ShaderNodeValToRGB'); nt.links.new(h, ramp.inputs[0])
stops = [(0., '#e9e2d0'), (.19, '#e4dcc6'), (.25, '#d3d5aa'), (.29, '#7e9c34'), (.35, '#3f6512'), (.52, '#365a0e'),
         (.66, '#4a7216'), (.78, '#6f9229'), (.9, '#93b04c'), (1., '#a6bf62')]
el = ramp.color_ramp.elements
el[0].position, el[0].color = stops[0][0], hexc(stops[0][1]); el[1].position, el[1].color = stops[-1][0], hexc(stops[-1][1])
for p, c in stops[1:-1]:
    e = el.new(p); e.color = hexc(c)
ramp.color_ramp.interpolation = 'EASE'
# ice pressed against the wall: square-ish lighter windows in the matcha band (Chebychev F1, smooth falloff, no cell colours)
vo = N_.new('ShaderNodeTexVoronoi'); vo.distance = 'CHEBYCHEV'; vo.inputs['Scale'].default_value = 44; vo.inputs['Randomness'].default_value = 1.
nV = N_.new('ShaderNodeTexNoise'); nV.inputs['Scale'].default_value = 90; nV.inputs['Detail'].default_value = 2
nt.links.new(tc.outputs['Object'], nV.inputs['Vector'])
vwarp = N_.new('ShaderNodeVectorMath'); vwarp.operation = 'MULTIPLY_ADD'; nt.links.new(nV.outputs['Color'], vwarp.inputs[0])
vwarp.inputs[1].default_value = (.006, .006, .006); nt.links.new(tc.outputs['Object'], vwarp.inputs[2])
nt.links.new(vwarp.outputs[0], vo.inputs['Vector'])
ice_r = N_.new('ShaderNodeMapRange'); ice_r.inputs['From Min'].default_value = .17; ice_r.inputs['From Max'].default_value = .27
ice_r.inputs['To Min'].default_value = 1.; ice_r.inputs['To Max'].default_value = 0.
nt.links.new(vo.outputs['Distance'], ice_r.inputs['Value'])
band = N_.new('ShaderNodeMapRange'); band.interpolation_type = 'SMOOTHSTEP'
band.inputs['From Min'].default_value = .30; band.inputs['From Max'].default_value = .40; nt.links.new(h, band.inputs['Value'])
band2 = N_.new('ShaderNodeMapRange'); band2.interpolation_type = 'SMOOTHSTEP'
band2.inputs['From Min'].default_value = .97; band2.inputs['From Max'].default_value = .86; nt.links.new(h, band2.inputs['Value'])
icef = math_('MULTIPLY', math_('MULTIPLY', ice_r.outputs['Result'], band.outputs['Result']), band2.outputs['Result'])
icef = math_('MULTIPLY', icef, v2=.34)
mix = N_.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MIX'
nt.links.new(icef, mix.inputs['Factor']); nt.links.new(ramp.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = hexc('#9fbb6c')
nt.links.new(mix.outputs[2], b.inputs['Base Color'])
rr = math_('MULTIPLY_ADD', icef, v2=-.12, v3=.16)
nt.links.new(rr, b.inputs['Roughness'])
liq.data.materials.append(LQ)

# ---------------------------------------------------------------- ice poking out of the top
ICE = glassy('ice', .05, 1.31)
icemesh = None
def cube(sz, loc, rot):
    global icemesh
    if icemesh is None:
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.)
        bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=.14, segments=3, affect='EDGES', profile=.5)
        icemesh = bpy.data.meshes.new('ice'); bm.to_mesh(icemesh); bm.free()
        for p in icemesh.polygons: p.use_smooth = True
        icemesh.materials.append(ICE)
    o = link(bpy.data.objects.new('ice', icemesh)); o.scale = (sz, sz * .92, sz * .96); o.location = loc; o.rotation_euler = rot; return o
for (x, y, z, s, rx, ry, rz) in [(-.016, -.012, FILL + .002, .025, .3, .2, .5), (.017, -.006, FILL + .001, .023, -.25, .35, 1.1),
                                 (.0, .018, FILL + .003, .024, .15, -.3, .2), (-.019, .02, FILL - .003, .022, .4, .1, .9)]:
    cube(s, (x, y, z), (rx, ry, rz))

# ---------------------------------------------------------------- torched marshmallows on a skewer, across the rim
MAL, nt, b, out = principled('marsh', hexc('#f7f1e6'), Roughness=.62, **{'Subsurface Weight': .55, 'Subsurface Scale': .006})
N_ = nt.nodes
tc = N_.new('ShaderNodeTexCoord'); geo = N_.new('ShaderNodeNewGeometry')
nz = N_.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 150; nz.inputs['Detail'].default_value = 6; nz.inputs['Roughness'].default_value = .62
nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
sp = N_.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sp.inputs[0])
up = N_.new('ShaderNodeMapRange'); up.inputs['From Min'].default_value = -.5; up.inputs['From Max'].default_value = .9; nt.links.new(sp.outputs['Z'], up.inputs['Value'])
t1 = N_.new('ShaderNodeMath'); t1.operation = 'MULTIPLY_ADD'; nt.links.new(nz.outputs['Fac'], t1.inputs[0]); t1.inputs[1].default_value = 1.1; nt.links.new(up.outputs['Result'], t1.inputs[2])
t2 = N_.new('ShaderNodeMath'); t2.operation = 'MULTIPLY_ADD'; nt.links.new(t1.outputs[0], t2.inputs[0]); t2.inputs[1].default_value = .9; t2.inputs[2].default_value = -.45
tr = N_.new('ShaderNodeValToRGB'); nt.links.new(t2.outputs[0], tr.inputs[0])
e = tr.color_ramp.elements; e[0].position, e[0].color = .30, hexc('#f8f2e7'); e[1].position, e[1].color = .74, hexc('#22150d')
for p, c in [(.40, '#efd9b5'), (.48, '#d39c55'), (.56, '#9a5b26'), (.64, '#4a2a14')]:
    x = e.new(p); x.color = hexc(c)
nt.links.new(tr.outputs['Color'], b.inputs['Base Color'])
rg = N_.new('ShaderNodeMapRange'); rg.inputs['To Min'].default_value = .6; rg.inputs['To Max'].default_value = .85; nt.links.new(t2.outputs[0], rg.inputs['Value'])
nt.links.new(rg.outputs['Result'], b.inputs['Roughness'])
bp = N_.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .25; bp.inputs['Distance'].default_value = .0006
nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])

WOOD = principled('wood', hexc('#d8c09a'), Roughness=.6)[0]
SKEW_A = .32  # skewer heading around Z
sk = link(bpy.data.objects.new('skewer', bpy.data.meshes.new('sk')))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=.0014, radius2=.0014, depth=.15); bm.to_mesh(sk.data); bm.free()
sk.data.materials.append(WOOD); sk.rotation_euler = (0, pi / 2, SKEW_A)
MR, ML = .0128, .0235
zc = H + MR - .0035
dirv = Vector((cos(SKEW_A), sin(SKEW_A), 0))
sk.location = Vector((0, 0, zc)) + dirv * -.012
mm = bpy.data.meshes.new('mallow')
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=MR, radius2=MR, depth=ML)
bmesh.ops.bevel(bm, geom=[e_ for e_ in bm.edges if abs(e_.verts[0].co.z - e_.verts[1].co.z) < 1e-6], offset=.0048, segments=5, affect='EDGES', profile=.55)
bm.to_mesh(mm); bm.free()
for p in mm.polygons: p.use_smooth = True
mm.materials.append(MAL)
for i, off in enumerate((-.036, -.012, .012, .036)):
    o = link(bpy.data.objects.new('mallow', mm)); o.location = Vector((0, 0, zc)) + dirv * (off - .006)
    o.rotation_euler = (0, pi / 2, SKEW_A); o.rotation_euler.rotate_axis('Z', random.uniform(0, 2 * pi))
    s = random.uniform(.95, 1.05); o.scale = (s, s * random.uniform(.94, 1.0), random.uniform(.94, 1.04))

# black straw behind the skewer
STRAW = principled('straw', hexc('#121212'), Roughness=.32, **{'Coat Weight': .4})[0]
st = link(bpy.data.objects.new('straw', bpy.data.meshes.new('st')))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=.0034, radius2=.0034, depth=.25); bm.to_mesh(st.data); bm.free()
for p in st.data.polygons: p.use_smooth = True
st.data.materials.append(STRAW); st.location = (-.004, .022, .135); st.rotation_euler = (-.1, -.06, 0)

# shadow catcher under the cup
bpy.ops.mesh.primitive_plane_add(size=3, location=(0, 0, 0)); fl = bpy.context.active_object; fl.is_shadow_catcher = True

# ---------------------------------------------------------------- light: dark studio, two long strips for the glass edges
def area(name, loc, target, sx, sy, power, color=(1, 1, 1), shape='RECTANGLE'):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = shape; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('stripL', (-.30, .10, .10), (0, 0, .07), .022, .42, 34, (1, .98, .96))
area('stripR', (.30, .12, .10), (0, 0, .07), .022, .42, 30, (.96, .99, 1))
area('key', (-.36, -.18, .30), (0, 0, .07), .24, .24, 16, (1, .96, .9))
area('fill', (.10, -.42, .06), (0, 0, .07), .4, .25, 3, (1, 1, 1))
area('top', (.02, .02, .46), (0, 0, .08), .3, .3, 9, (1, 1, 1))
area('back', (.04, .40, .16), (0, 0, .08), .2, .2, 9, (1, .92, .9))
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .32
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ---------------------------------------------------------------- camera path
cd = bpy.data.cameras.new('cam'); cd.lens = 62; cd.sensor_fit = 'AUTO'; cd.clip_start = .005
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
# (t, azimuth deg [0 = front, -Y], distance from axis, camera z, target z, lens)
KEYS = [(0., -28, .150, .030, .030, 62), (.22, -18, .155, .040, .040, 62), (.34, -8, .150, .062, .064, 62),
        (.50, 2, .150, .072, .072, 62), (.62, 14, .150, .175, .118, 62), (.74, 22, .170, .190, .122, 62),
        (.88, 18, .40, .17, .078, 62), (1., 10, .43, .15, .074, 62)]
def smooth(a): return a * a * (3 - 2 * a)
def place(t):
    for (t0, *a), (t1, *b_) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            k = smooth((t - t0) / (t1 - t0)); v = [x + (y - x) * k for x, y in zip(a, b_)]; break
    az, dist, cz, tz, lens = v
    th = math.radians(az); cam.location = (sin(th) * dist, -cos(th) * dist, cz)
    cam.rotation_euler = (Vector((0, 0, tz)) - cam.location).to_track_quat('-Z', 'Y').to_euler(); cd.lens = lens

r = scn.render; r.resolution_x = r.resolution_y = 900; r.resolution_percentage = int(100 * SCALE)
r.film_transparent = True; r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 12; cy.transmission_bounces = 12; cy.glossy_bounces = 4; cy.diffuse_bounces = 2
cy.transparent_max_bounces = 8; cy.sample_clamp_indirect = 8; cy.caustics_reflective = False; cy.caustics_refractive = False; cy.seed = 3
cy.film_transparent_glass = True; cy.film_transparent_roughness = .1
r.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'; scn.view_settings.exposure = -1.5
os.makedirs(OUT, exist_ok=True)
frames = [ONLY] if ONLY >= 0 else range(N)
for i in frames:
    fp = os.path.join(OUT, 'f_%03d.png' % i)
    if ONLY < 0 and os.path.exists(fp): continue
    place(i / (N - 1)); r.filepath = fp; bpy.ops.render.render(write_still=True)
print('done')
