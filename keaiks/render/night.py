# Keaik's "midnight at the station": the food truck (geometry from truck.py, open state) parked on wet asphalt
# beside a glowing gas-station canopy at night, with a red neon KEAIK'S roof sign that flickers on.
# A 96-frame camera move (establishing shot → orbit → into the serving window) for the page to scrub on scroll.
# usage: blender -b -P night.py -- <out_dir> [samples] [scale] [frames: all | a-b | n,n,n]
import bpy, bmesh, math, sys, os, random
from math import pi, sin, cos
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]; ARGV = list(argv)
OUT = argv[0]; SAMPLES = int(argv[1]) if len(argv) > 1 else 32; SCALE = float(argv[2]) if len(argv) > 2 else 1.
FR = argv[3] if len(argv) > 3 else 'all'
HERE = os.path.dirname(os.path.abspath(__file__))
S = '/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad'
HDRI_NIGHT = S + '/night/street_lamp_2k.hdr'; ASPH = S + '/night/asphalt/asphalt_02/'
FONT_SCRIPT = S + '/fonts/Yellowtail.ttf'; FONT_SANS = S + '/fonts/BebasNeue.ttf'
random.seed(3)

# ---------------------------------------------------------------- the truck, built by truck.py (open state)
src = open(os.path.join(HERE, 'truck.py')).read()
src = src.split('# ---------------------------------------------------------------- set')[0]
sys.argv = ['blender', '--', OUT, 'open']
exec(compile(src, 'truck.py', 'exec'))
argv = ARGV; OUT = argv[0]; SAMPLES = int(argv[1]) if len(argv) > 1 else 32; SCALE = float(argv[2]) if len(argv) > 2 else 1.  # truck.py reset these
# real wheel arches: drop the flat arch decals, cut the body/cab/stripes and line the opening dark
for o in [o for o in bpy.data.objects if o.name.startswith('well')]: bpy.data.objects.remove(o)
cutters = []
for ax in AX:
    bpy.ops.mesh.primitive_cylinder_add(radius=.56, depth=3, vertices=96, location=(ax, 0, WZ + .03), rotation=(pi / 2, 0, 0))
    c = bpy.context.active_object; c.hide_render = True; c.hide_viewport = True; cutters.append(c)
    bpy.ops.mesh.primitive_cylinder_add(radius=.55, depth=2.08, vertices=96, location=(ax, 0, WZ + .03), rotation=(pi / 2, 0, 0))
    h = bpy.context.active_object; h.data.materials.append(principled('wheelhouse', hexc('#070707'), Roughness=.9)[0])
for o in [o for o in bpy.data.objects if o.name.split('.')[0] in ('body', 'cab', 'stripe', 'stripe2', 'step')]:
    for c in cutters:
        m = o.modifiers.new('arch', 'BOOLEAN'); m.object = c; m.operation = 'DIFFERENCE'
for ax in AX: wheel(ax)
# far-side wheels: mirror the near ones across the truck's centre line
for o in [o for o in bpy.data.objects if o.name.split('.')[0] in ('tire', 'rim', 'hub', 'wall_txt', 'Cylinder', 'vent')]:
    if o.location.y < -.5:
        c = o.copy(); c.data = o.data; col.objects.link(c); c.location.y = -o.location.y; c.scale.y = -1

def m_emit(name, color, strength):
    m, nt, out = node_mat(name); e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = color; e.inputs[1].default_value = strength
    nt.links.new(e.outputs[0], out.inputs[0]); return m, e

# cab front: windshield, grille, headlights (on)
box('windshield', 2.62, 2.7, -.88, .88, 1.5, 2.22, GLASS, .04, 3)
box('grille', 2.66, 2.72, -.6, .6, .82, 1.22, TRIM, .02, 2)
HEAD, he = m_emit('headlamp', hexc('#fff4e0'), 18.)
for y in (-.78, .78):
    disc('headlight', 2.69, y, 1.08, .13, HEAD, .04); bpy.context.active_object.rotation_euler = (0, pi / 2, 0)
    l = bpy.data.lights.new('beam', 'SPOT'); l.energy = 900; l.spot_size = .9; l.spot_blend = .6; l.color = (1, .93, .8); l.shadow_soft_size = .08
    o = link(bpy.data.objects.new('beam', l)); o.location = (2.8, y, 1.08); o.rotation_euler = (0, pi / 2 + .14, 0)

# chalk menu board inside the window: their real items
CHALK, _ = m_emit('chalk2', hexc('#f2ece2'), 1.6)
def flat_text(body, font, size, loc, mat):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = body; cu.font = bpy.data.fonts.load(font); cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = link(bpy.data.objects.new('menu_txt', cu)); o.location = loc; o.rotation_euler = (pi / 2, 0, 0); cu.materials.append(mat); return o
for o in [o for o in bpy.data.objects if o.name.startswith('menuline')]: bpy.data.objects.remove(o)
box('inside_back', WIN[0], WIN[1], -.58, -.555, WIN[2], WIN[3], principled('inside_steel', hexc('#8e9093'), Metallic=1., Roughness=.35)[0])
box('menuboard', -1.32, .42, -.62, -.585, 1.72, 2.3, principled('chalkboard', hexc('#151515'), Roughness=.85)[0], .01, 2)
flat_text("Keaik's", FONT_SCRIPT, .16, (-.45, -.625, 2.19), m_emit('menured', hexc('#ff4a4a'), 3.)[0])
for i, t in enumerate(('THE SEXY CHICK', 'CRISPY CHICKEN', 'LEBANESE BURGER')):
    flat_text(t, FONT_SANS, .075, (-.45, -.625, 2.05 - i * .1), CHALK)
box('hood', WIN[0], WIN[1], -.75, -.56, 2.26, 2.34, STEEL, .01, 2)
# proper squeeze bottles on the counter (replace truck.py's simple cylinders)
for o in [o for o in bpy.data.objects if -1.3 < o.location.y < -1.2 and o.name.split('.')[0] in ('Cylinder', 'Cone')]: bpy.data.objects.remove(o)
def lathe_z(name, prof, seg=48):
    verts, faces, rings = [], [], []
    for r_, z in prof:
        idx = []
        for k in range(seg): a = 2 * pi * k / seg; verts.append((r_ * cos(a), r_ * sin(a), z)); idx.append(len(verts) - 1)
        rings.append(idx)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(seg): faces.append((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    for p_ in me.polygons: p_.use_smooth = True
    return me
BOT = lathe_z('bottle', [(0, 0), (.05, 0), (.056, .012), (.056, .17), (.05, .2), (.03, .222), (.02, .232), (.012, .29), (.004, .315), (0, .316)])
SAUCE_R = principled('sauce_red', hexc('#c81e24'), Roughness=.18, **{'Coat Weight': 1., 'Subsurface Weight': .2})[0]
SAUCE_C = principled('sauce_cream', hexc('#efe2cc'), Roughness=.2, **{'Coat Weight': 1., 'Subsurface Weight': .3})[0]
for x, m_ in ((WIN[0] + .26, SAUCE_R), (WIN[0] + .42, SAUCE_C), (WIN[1] - .3, SAUCE_R)):
    b_ = link(bpy.data.objects.new('bottle', BOT)); b_.location = (x, -1.24, WIN[2] - .04); b_.data = BOT.copy(); b_.data.materials.append(m_)
# string lights under the awning edge
BULB, _ = m_emit('bulb', hexc('#ffcf8a'), 22.)
x0, x1 = WIN[0] - .12, WIN[1] + .12
for i in range(13):
    x = x0 + (x1 - x0) * i / 12; sag = .05 * sin(pi * ((i % 6) / 6))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.028, location=(x, YS - .66, WIN[3] - .3 - sag), segments=12, ring_count=8)
    b = bpy.context.active_object; b.data.materials.append(BULB)

# ---------------------------------------------------------------- neon roof sign
NEON, ne = m_emit('neon', hexc('#ff1f2d'), 26.)
NEONW, nw = m_emit('neon_white', hexc('#fff3e6'), 10.)
box('sign_back', -2.45, .55, -.2, -.12, 3.12, 4.18, principled('signback', hexc('#0d0d0d'), Roughness=.4, Metallic=.3)[0], .03, 3)
for x in (-2.1, .2):
    box('sign_leg', x, x + .06, -.17, -.11, 2.98, 3.14, STEEL)
def neon_text(body, font, size, loc, mat, ext=.012, bev=.014):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = body; cu.font = bpy.data.fonts.load(font); cu.size = size
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = ext; cu.bevel_depth = bev; cu.bevel_resolution = 3
    o = link(bpy.data.objects.new('neon', cu)); o.location = loc; o.rotation_euler = (pi / 2, 0, 0); cu.materials.append(mat); return o
neon_text("Keaik's", FONT_SCRIPT, .74, (-.95, -.24, 3.72), NEON)
neon_text('BURGERS  ·  CHICKEN', FONT_SANS, .22, (-.95, -.24, 3.3), NEONW, .006, .006)
for p, c in (((-.95, -.9, 3.65), (1, .12, .15)),):
    l = bpy.data.lights.new('neonglow', 'POINT'); l.energy = 260; l.color = c; l.shadow_soft_size = .8
    o = link(bpy.data.objects.new('neonglow', l)); o.location = p
NEONLIGHT = o

# ---------------------------------------------------------------- the station: canopy, pillars, pumps
CAN, ce = m_emit('canopy_panel', hexc('#e9f1ff'), 7.)
CX, CY, CW, CD, CZ = -1., 7.4, 14., 8., 5.4
box('canopy', CX - CW / 2, CX + CW / 2, CY - CD / 2, CY + CD / 2, CZ, CZ + .75, principled('canopy', hexc('#e6e4e0'), Roughness=.5)[0], .04, 3)
box('fascia_strip', CX - CW / 2 - .01, CX + CW / 2 + .01, CY - CD / 2 - .02, CY - CD / 2 + .02, CZ + .5, CZ + .58, m_emit('fascia', hexc('#ff2b36'), 6.)[0])
for i in range(5):
    for j in range(3):
        x = CX - CW / 2 + 1.6 + i * (CW - 3.2) / 4; y = CY - CD / 2 + 1.5 + j * (CD - 3.) / 2
        box('panel', x - .7, x + .7, y - .45, y + .45, CZ - .02, CZ, CAN)
        l = bpy.data.lights.new('canlight', 'AREA'); l.size = 1.4; l.size_y = .9; l.energy = 300; l.color = (.93, .96, 1)
        o = link(bpy.data.objects.new('canlight', l)); o.location = (x, y, CZ - .05); o.rotation_euler = (0, 0, 0)
for x in (CX - CW / 2 + 1.2, CX + CW / 2 - 1.2):
    for y in (CY - CD / 2 + 1.2, CY + CD / 2 - 1.2):
        box('pillar', x - .3, x + .3, y - .3, y + .3, 0, CZ, principled('pillar', hexc('#d8d6d2'), Roughness=.45)[0], .03, 2)
PUMPSCR, _ = m_emit('pump_screen', hexc('#9ad6ff'), 3.)
for x in (CX - 3.2, CX + 2.6):
    box('island', x - 1.6, x + 1.6, CY - .6, CY + .6, 0, .18, principled('curb', hexc('#bcbab5'), Roughness=.7)[0], .03, 2)
    for dx in (-.7, .7):
        box('pump', x + dx - .38, x + dx + .38, CY - .28, CY + .28, .18, 2.0, principled('pumpbody', hexc('#f2f1ee'), Roughness=.3, **{'Coat Weight': .6})[0], .05, 3)
        box('pump_top', x + dx - .4, x + dx + .4, CY - .3, CY + .3, 2.0, 2.2, m_emit('pump_band', hexc('#ff3340'), 3.5)[0], .02, 2)
        box('pump_scr', x + dx - .22, x + dx + .22, CY - .3, CY - .27, 1.25, 1.6, PUMPSCR)
        box('nozzle', x + dx + .22, x + dx + .3, CY - .34, CY - .28, .85, 1.25, TRIM)
# tall price-sign pole far left, blank lit panels (no brands)
box('pole', -14.2, -13.8, 3.8, 4.2, 0, 7.5, TRIM)
box('polesign', -15.6, -12.4, 3.85, 4.15, 7.5, 9.6, m_emit('polepanel', hexc('#f4f4f4'), 1.4)[0], .05, 3)
box('polesign_r', -15.6, -12.4, 3.8, 4.2, 6.8, 7.5, m_emit('polered', hexc('#e3202c'), 5.)[0], .03, 2)
# street lamp (sodium) on the right
box('lamp_pole', 11.8, 12.0, -6.1, -5.9, 0, 6.8, TRIM)
box('lamp_head', 10.8, 12.0, -6.15, -5.85, 6.7, 6.85, m_emit('sodium', hexc('#ffb35a'), 14.)[0])
l = bpy.data.lights.new('sodium', 'SPOT'); l.energy = 2200; l.spot_size = 1.6; l.spot_blend = .8; l.color = (1, .7, .38); l.shadow_soft_size = .3
o = link(bpy.data.objects.new('sodium', l)); o.location = (11.3, -6, 6.6)
# parking bay lines + curb stops around the truck
LINE = principled('paint_line', hexc('#e9e6df'), Roughness=.6)[0]
for x in (-3.6, 3.4):
    box('bay', x - .06, x + .06, -3.2, 1.6, 0, .006, LINE)
box('bay_back', -3.6, 3.46, 1.5, 1.62, 0, .006, LINE)
for x in (-4.6, -10.6, 9.4):
    box('stall', x - .06, x + .06, -3.2, 1.6, 0, .006, LINE)

# ---------------------------------------------------------------- wet asphalt
bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 0, 0)); fl = bpy.context.active_object
def asphalt():
    m, nt, b, out = principled('asphalt', hexc('#2a2a2a'), Roughness=.6)
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (11, 11, 11)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
    def img(f, non=False):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(ASPH + f)
        if non: t.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs[0], t.inputs['Vector']); return t
    col_t, rgh, nrm = img('color.jpg'), img('rough.jpg', True), img('normal.jpg', True)
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'; dark.blend_type = 'MULTIPLY'; dark.inputs[0].default_value = 1.
    dark.inputs[7].default_value = (.13, .13, .14, 1); nt.links.new(col_t.outputs['Color'], dark.inputs[6])
    # puddles: large-scale noise mask → mirror-like water, darker base
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = .16; nz.inputs['Detail'].default_value = 4; nz.inputs['Roughness'].default_value = .55
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements; e[0].position, e[0].color = .46, (0, 0, 0, 1); e[1].position, e[1].color = .56, (1, 1, 1, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs[0])
    rmix = nt.nodes.new('ShaderNodeMix'); rmix.data_type = 'FLOAT'; nt.links.new(ramp.outputs[0], rmix.inputs[0])
    rr = nt.nodes.new('ShaderNodeMath'); rr.operation = 'MULTIPLY'; rr.inputs[1].default_value = .55; nt.links.new(rgh.outputs['Color'], rr.inputs[0])
    nt.links.new(rr.outputs[0], rmix.inputs[2]); rmix.inputs[3].default_value = .03; nt.links.new(rmix.outputs[0], b.inputs['Roughness'])
    cmix = nt.nodes.new('ShaderNodeMix'); cmix.data_type = 'RGBA'; nt.links.new(ramp.outputs[0], cmix.inputs[0])
    nt.links.new(dark.outputs[2], cmix.inputs[6]); cmix.inputs[7].default_value = (.012, .012, .014, 1); nt.links.new(cmix.outputs[2], b.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nrm.outputs['Color'], nm.inputs['Color'])
    st = nt.nodes.new('ShaderNodeMath'); st.operation = 'SUBTRACT'; st.inputs[0].default_value = 1.; nt.links.new(ramp.outputs[0], st.inputs[1])
    nt.links.new(st.outputs[0], nm.inputs['Strength']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    b.inputs['Specular IOR Level'].default_value = .7
    return m
fl.data.materials.append(asphalt())

# ---------------------------------------------------------------- world: the night HDRI, dim
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI_NIGHT)
mp = wn.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, 2.1); tcw = wn.nodes.new('ShaderNodeTexCoord')
wn.links.new(tcw.outputs['Generated'], mp.inputs['Vector']); wn.links.new(mp.outputs[0], env.inputs['Vector'])
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .55; wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])
# soft moon fill so the white truck reads in the dark
l = bpy.data.lights.new('moon', 'SUN'); l.energy = .08; l.color = (.7, .8, 1.); l.angle = .2
o = link(bpy.data.objects.new('moon', l)); o.rotation_euler = (.9, 0, -.6)
k = bpy.data.lights.new('key', 'AREA'); k.size = 4; k.size_y = 2; k.energy = 260; k.color = (.85, .9, 1.)
o = link(bpy.data.objects.new('key', k)); o.location = (-3, -7, 5); o.rotation_euler = (Vector((0, 0, 1.6)) - Vector(o.location)).to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- neon flicker-on (frames 3–14)
FLK = {0: 0, 3: 0, 4: .5, 5: 0, 6: .9, 7: .15, 8: 1., 9: .3, 10: 1., 12: .7, 14: 1.}
for f, v in FLK.items():
    ne.inputs[1].default_value = 26. * v; ne.inputs[1].keyframe_insert('default_value', frame=f)
    nw.inputs[1].default_value = 10. * v; nw.inputs[1].keyframe_insert('default_value', frame=f + 1)
    NEONLIGHT.data.energy = 260 * v; NEONLIGHT.data.keyframe_insert('energy', frame=f)
for fc in (ne.id_data.animation_data.action.fcurves if ne.id_data.animation_data else []):
    for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'

# ---------------------------------------------------------------- camera path
cd = bpy.data.cameras.new('cam'); cd.lens = 30; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.
cam = link(bpy.data.objects.new('cam', cd)); scn.camera = cam
tgt = link(bpy.data.objects.new('tgt', None)); cd.dof.focus_object = tgt
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
KEYS = [  # frame, camera, target, lens
    (0, (-12.5, -15.5, 1.15), (-.2, 1.5, 2.3), 30),
    (14, (-11.4, -14.4, 1.2), (-.2, 1.4, 2.3), 30),
    (40, (-3.5, -11.5, 1.45), (.2, .4, 2.0), 30),
    (62, (6.8, -8.6, 1.55), (.6, -.2, 1.9), 32),
    (80, (1.6, -6.6, 1.7), (-.4, -.4, 2.0), 34),
    (95, (-1.9, -4.9, 1.62), (-.45, -.2, 2.05), 34),
]
for f, c, t, lens in KEYS:
    cam.location = c; cam.keyframe_insert('location', frame=f)
    tgt.location = t; tgt.keyframe_insert('location', frame=f)
    cd.lens = lens; cd.keyframe_insert('lens', frame=f)
for ob in (cam, tgt, cd):
    if ob.animation_data:
        for fc in ob.animation_data.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
scn.frame_start, scn.frame_end = 0, 95

# ---------------------------------------------------------------- render + a little bloom on the neon
r = scn.render; r.resolution_x, r.resolution_y = 1280, 720; r.use_persistent_data = True; r.resolution_percentage = int(100 * SCALE)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 6; cy.glossy_bounces = 3; cy.diffuse_bounces = 2; cy.sample_clamp_indirect = 6
cy.light_sampling_threshold = .01
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Punchy'; scn.view_settings.exposure = -.1
scn.use_nodes = True; ct = scn.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); gl = ct.nodes.new('CompositorNodeGlare'); gl.glare_type = 'FOG_GLOW'; gl.quality = 'MEDIUM'; gl.threshold = 1.2; gl.size = 8; gl.mix = -.55
co = ct.nodes.new('CompositorNodeComposite'); ct.links.new(rl.outputs['Image'], gl.inputs['Image']); ct.links.new(gl.outputs['Image'], co.inputs['Image'])

os.makedirs(OUT, exist_ok=True)
if FR == 'all': frames = range(0, 96)
elif '-' in FR: a, b = FR.split('-'); frames = range(int(a), int(b) + 1)
else: frames = [int(x) for x in FR.split(',')]
for f in frames:
    p = os.path.join(OUT, f'n{f:03d}.png')
    if os.path.exists(p): continue
    open(p, 'w').close(); scn.frame_set(f); r.filepath = p; bpy.ops.render.render(write_still=True)
print('done')
