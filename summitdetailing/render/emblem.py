# Summit Mobile Detailing: their chrome diamond-plate emblem rebuilt in 3D and path-traced in Cycles.
# A long strip light sweeps across it; frames play back as a light-sweep loop on the page. Transparent bg.
# usage: blender -b -P emblem.py -- <out_dir> <frames|still> [n_or_frame] [samples] [scale]
import bpy, bmesh, math, sys, os
from math import sin, cos, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, MODE = argv[0], argv[1]; N = int(argv[2]) if len(argv) > 2 else 24; SAMPLES = int(argv[3]) if len(argv) > 3 else 64; SCALE = float(argv[4]) if len(argv) > 4 else 1.
T = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/sumr'
HDRI = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/blend/hdri/studio_small_09_1k.hdr'
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

# diamond plate: polished steel with raised diagonal lugs (two rotated wave textures, thresholded)
DP, nt, b, out = principled('diamondplate', (.86, .87, .9, 1), Metallic=1., Roughness=.14, **{'Anisotropic': .3})
tc = nt.nodes.new('ShaderNodeTexCoord')
def lugs(angle):
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, angle); mp.inputs['Scale'].default_value = (34, 34, 34)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    # repeating lozenges: product of a fine and a coarse band
    w1 = nt.nodes.new('ShaderNodeTexWave'); w1.wave_type = 'BANDS'; w1.inputs['Scale'].default_value = 1.; w1.wave_profile = 'SIN'
    w2 = nt.nodes.new('ShaderNodeTexWave'); w2.wave_type = 'BANDS'; w2.bands_direction = 'Y'; w2.inputs['Scale'].default_value = .38; w2.wave_profile = 'SIN'
    nt.links.new(mp.outputs[0], w1.inputs['Vector']); nt.links.new(mp.outputs[0], w2.inputs['Vector'])
    m = nt.nodes.new('ShaderNodeMath'); m.operation = 'MULTIPLY'; nt.links.new(w1.outputs['Fac'], m.inputs[0]); nt.links.new(w2.outputs['Fac'], m.inputs[1])
    g = nt.nodes.new('ShaderNodeMath'); g.operation = 'GREATER_THAN'; g.inputs[1].default_value = .55; nt.links.new(m.outputs[0], g.inputs[0])
    return g
a, c = lugs(.785), lugs(-.785)
mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; nt.links.new(a.outputs[0], mx.inputs[0]); nt.links.new(c.outputs[0], mx.inputs[1])
bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .9; bp.inputs['Distance'].default_value = .004
nt.links.new(mx.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
DP = DP
CHROME = principled('chrome', (.95, .96, .98, 1), Metallic=1., Roughness=.03)[0]
NAVY = principled('navy', hexc('#0b1a3f'), Roughness=.25, Metallic=.6, **{'Coat Weight': 1.})[0]
GLOW = principled('blueglow', hexc('#1f6bff'), Roughness=.3, **{'Emission Color': hexc('#2f7bff'), 'Emission Strength': 5.})[0]
WHITE = principled('white', (1, 1, 1, 1), Roughness=.3, **{'Emission Color': (1, 1, 1, 1), 'Emission Strength': 2.2})[0]

def text(body, font, size, loc, extrude, bevel, mat, shear=0., spacing=1.):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = body; cu.font = bpy.data.fonts.load(font); cu.size = size
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = extrude; cu.bevel_depth = bevel; cu.bevel_resolution = 3; cu.shear = shear; cu.space_character = spacing
    o = link(bpy.data.objects.new('t', cu)); o.location = loc; o.rotation_euler = (pi / 2, 0, 0); o.data.materials.append(mat); return o

def slab(name, pts, depth, mat, y=0., bevel=.01):
    """Extrude a 2D outline (x, z) along -Y."""
    bm = bmesh.new(); vs = [bm.verts.new((x, y, z)) for x, z in pts]; f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, depth, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    if bevel: bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 3; bv.limit_method = 'ANGLE'
    return o

# mountain peak above the word: chrome outline over a navy fill
peak = [(-1.2, .6), (-.6, .95), (-.36, .82), (0, 1.18), (.34, .86), (.58, 1.0), (1.2, .6)]
slab('peakfill', peak + [(1.2, .56), (-1.2, .56)], .06, DP, y=.06)
def ribbon(pts, w, depth, mat, y):
    """A chrome stroke along a polyline."""
    bm = bmesh.new(); last = None
    for i in range(len(pts) - 1):
        (x0, z0), (x1, z1) = pts[i], pts[i + 1]; d = Vector((x1 - x0, z1 - z0)).normalized(); nrm = Vector((-d.y, d.x)) * w / 2
        q = [(x0 - nrm.x, z0 - nrm.y), (x1 - nrm.x, z1 - nrm.y), (x1 + nrm.x, z1 + nrm.y), (x0 + nrm.x, z0 + nrm.y)]
        vs = [bm.verts.new((x, y, z)) for x, z in q]; f = bm.faces.new(vs)
        ext = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, -depth, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0005); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('rib'); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('rib', me)); o.data.materials.append(mat); bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .008; bv.segments = 3
    return o
ribbon(peak, .085, .14, CHROME, .02)
# snow caps
slab('snow1', [(-.11, 1.06), (0, 1.18), (.1, 1.07), (.03, 1.09), (0, 1.04), (-.04, 1.08)], .04, WHITE, y=-.13, bevel=.004)

# the word
word = text('SUMMIT', os.path.join(T, 'kanit-blackitalic.ttf'), 1.08, (0, 0, .02), .14, .018, DP, spacing=1.0)
outline = text('SUMMIT', os.path.join(T, 'kanit-blackitalic.ttf'), 1.08, (0, .2, .02), .03, .045, NAVY, spacing=1.0)
# blue glow bar + MOBILE DETAILING plate
slab('bar', [(-1.75, -.42), (1.75, -.42), (1.62, -.62), (-1.62, -.62)], .08, NAVY, y=-.02)
slab('barglow', [(-1.7, -.44), (1.7, -.44), (1.68, -.47), (-1.68, -.47)], .02, GLOW, y=-.11, bevel=0)
slab('barglow2', [(-1.62, -.58), (1.62, -.58), (1.6, -.61), (-1.6, -.61)], .02, GLOW, y=-.11, bevel=0)
sub = text('MOBILE DETAILING', os.path.join(T, 'kanit-bolditalic.ttf'), .25, (0, -.08, -.52), .02, .004, WHITE, spacing=1.25)
for x in (-.12, 0, .12):
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=.045, radius2=0, depth=.02, location=(x, -.07, -.74), rotation=(pi / 2, 0, 0)); s = bpy.context.active_object; s.data.materials.append(GLOW)

# ---------------------------------------------------------------- light: dark studio + a long strip that sweeps
def area(name, loc, target, sx, sy, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = sx; l.size_y = sy; l.energy = power; l.color = color
    o = link(bpy.data.objects.new(name, l)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; return o
area('top', (0, -1.2, 3.0), (0, 0, .3), 4.0, .6, 140, (.9, .94, 1))
area('blueL', (-3.2, 1.0, .4), (0, 0, .3), .4, 3.0, 400, (.25, .5, 1))
area('blueR', (3.2, 1.0, .4), (0, 0, .3), .4, 3.0, 400, (.25, .5, 1))
area('low', (0, -2.6, -1.2), (0, 0, .2), 4.0, .5, 40, (.6, .75, 1))
sweep = area('sweep', (0, -2.4, .3), (0, 0, .3), .18, 3.4, 900, (1, 1, 1))
# make the strip visible to glossy (that's the streak on the chrome) but not to the camera
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .35
dark = wn.nodes.new('ShaderNodeBackground'); dark.inputs[0].default_value = (0, 0, 0, 1)
lp = wn.nodes.new('ShaderNodeLightPath'); mix = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0]); wn.links.new(bg.outputs[0], mix.inputs[1]); wn.links.new(dark.outputs[0], mix.inputs[2]); wn.links.new(mix.outputs[0], wo.inputs[0])

cd = bpy.data.cameras.new('cam'); cd.lens = 80
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
cam.location = (0, -9.0, .55); cam.rotation_euler = (Vector((0, 0, .32)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
r = scn.render; r.resolution_x, r.resolution_y = 1600, 900; r.resolution_percentage = int(100 * SCALE)
r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 8; cy.glossy_bounces = 6; cy.diffuse_bounces = 2; cy.sample_clamp_indirect = 10
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'
os.makedirs(OUT, exist_ok=True)
def place(t):  # t 0..1: the strip travels left to right in front of the emblem
    sweep.location = (-3.4 + 6.8 * t, -2.2, .35); sweep.rotation_euler = (Vector((-1.4 + 2.8 * t, 0, .3)) - sweep.location).to_track_quat('-Z', 'Y').to_euler()
if MODE == 'still':
    place(N / 24); r.filepath = os.path.join(OUT, 'still.png'); bpy.ops.render.render(write_still=True)
else:
    r.use_overwrite = False
    for i in range(N):
        fp = os.path.join(OUT, 'sweep_%02d.png' % i)
        if os.path.exists(fp): continue
        place(i / (N - 1)); r.filepath = fp; bpy.ops.render.render(write_still=True)
print('done')
