# Petals & Poetry menu stills, path-traced with the same glass, studio and cyclorama as the hero.
# usage: bpe run products.py -m final -- <outdir> [samples] [only_key]
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = argv[0]; SAMPLES = int(argv[1]) if len(argv) > 1 else 40; ONLY = argv[2] if len(argv) > 2 else None
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'scene.py')).read().split('# ---------------------------------------------------------------- timeline')[0]
sys.argv = [sys.argv[0], '--', 'lib']
exec(src)
random.seed(21)

# the bloom pieces: put every petal at its finished pose
for p in pieces:
    if p.get('dots'): p['obj'].matrix_world = p['M']; continue
    p['empty'].matrix_world = p['base'] @ basis(p['a'], p['tilt']); p['obj']['wire'] = 0.
glass['wire'] = 0.; cage.hide_render = True
for o in (stream, bag_body, bag_fill, tip): o.hide_render = True
for c in ices: c.location.z = c['home']
BLOOM = [cb, sw] + [p['obj'] for p in pieces] + pearls

# ---------------------------------------------------------------- helpers
def liquid_obj(name, level_frac, stops, sss=.25, clear=False):
    L = BT + (H - BT) * level_frac
    lp = [(0, BT + .0005)] + [(ri(lerp(BT + .0005, L, i / 30)) - .0003, lerp(BT + .0005, L, i / 30)) for i in range(1, 30)]
    lp += [(ri(L) - .0003, L + .0012), (ri(L) - .0012, L + .0003), (ri(L) * .7, L), (0, L)]
    o = lathe(name, lp, 160)
    m = drink_mat(name + '_m', stops, L, BT, sss=sss, rough=.08)
    if clear:  # refreshers: let some light through like a juice
        b = [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]
        b.inputs['Transmission Weight'].default_value = .55; b.inputs['Subsurface Weight'].default_value = .1
    o.data.materials.append(m); return o, L

def floating_ice(L, n=4):
    out = []
    for i in range(n):
        s = random.uniform(.02, .024); a = i / n * 2 * pi + random.uniform(-.4, .4); r = random.uniform(.004, .014)
        bpy.ops.mesh.primitive_cube_add(size=s, location=(cos(a) * r, sin(a) * r, L + s * .18))
        c = bpy.context.active_object; c.rotation_euler = (random.uniform(-.5, .5), random.uniform(-.5, .5), random.uniform(0, 3))
        bv = c.modifiers.new('bv', 'BEVEL'); bv.width = s * .16; bv.segments = 4; c.data.materials.append(ice_m)
        for p in c.data.polygons: p.use_smooth = True
        out.append(c)
    return out

def sss_mat(name, hexcol, rough=.35, sss=.4, coat=0.):
    return principled(name, hexc(hexcol), Roughness=rough, **{'Subsurface Weight': sss, 'Subsurface Scale': .002, 'Coat Weight': coat})[0]

def raspberry(loc, s=.0105):
    bm = bmesh.new(); n = 60
    for i in range(n):
        phi = math.acos(1 - 2 * (i + .5) / n); th = pi * (1 + 5 ** .5) * i
        v = Vector((sin(phi) * cos(th), sin(phi) * sin(th), cos(phi) * 1.12)) * s
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=s * .32 * random.uniform(.9, 1.1)); bmesh.ops.translate(bm, vec=v, verts=ret['verts'])
    me = bpy.data.meshes.new('rasp'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new('rasp', me)); o.location = loc; o.rotation_euler = (random.uniform(-.6, .6), random.uniform(-.6, .6), random.uniform(0, 3))
    o.data.materials.append(RASP); return o

def foam_top(L, hexcol='#fbf6ec', h=.016):
    o = lathe('foam', [(0, L - .002), (ri(L) - .0006, L - .002), (ri(L) - .0004, L + .003), (ri(L) - .003, L + h * .7), (ri(L) * .6, L + h * .95), (0, L + h)], 128)
    m, nt, b, out = principled('foam', hexc(hexcol), Roughness=.7, **{'Subsurface Weight': .5, 'Subsurface Scale': .002, 'Sheen Weight': .4})
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexVoronoi'); nz.inputs['Scale'].default_value = 900
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .25; bump.inputs['Distance'].default_value = .0002
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Distance'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    o.data.materials.append(m); return o, L + h

RASP = sss_mat('rasp', '#b41a38', rough=.28, sss=.5, coat=.4)
MANGO_C = sss_mat('mangoc', '#f39a1c', rough=.25, sss=.5, coat=.5)
def speck_mat(name, base, speck):
    m, nt, b, out = principled(name, hexc(base), Roughness=.3, **{'Subsurface Weight': .4, 'Subsurface Scale': .002, 'Coat Weight': .4})
    tc = nt.nodes.new('ShaderNodeTexCoord'); vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 700
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = .0; cr.color_ramp.elements[0].color = hexc(speck); cr.color_ramp.elements[1].position = .12; cr.color_ramp.elements[1].color = hexc(base)
    nt.links.new(tc.outputs['Object'], vo.inputs['Vector']); nt.links.new(vo.outputs['Distance'], cr.inputs[0]); nt.links.new(cr.outputs[0], b.inputs['Base Color']); return m
DRAGON = speck_mat('dragon', '#cf1f68', '#160a0e')
BANANA = speck_mat('banana', '#f4e3ad', '#8a6a35')

def cube_bits(L, mats, n=7, s=.011):
    out = []
    for i in range(n):
        a = i * 1.7; r = random.uniform(.004, .024)
        bpy.ops.mesh.primitive_cube_add(size=s, location=(cos(a) * r, sin(a) * r, L + random.uniform(-.002, .004)))
        c = bpy.context.active_object; c.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
        bv = c.modifiers.new('bv', 'BEVEL'); bv.width = s * .14; bv.segments = 3; c.data.materials.append(mats[i % len(mats)])
        for p in c.data.polygons: p.use_smooth = True
        out.append(c)
    return out

# ---------------------------------------------------------------- products
def hide(objs, v=True):
    for o in objs: o.hide_render = v

def p_bloom():
    return []
def p_rasp():
    hide(BLOOM); liquid.hide_render = True; hide(ices)
    lq, L = liquid_obj('rasp_l', .8, [(0, '#c42a55'), (.24, '#df6f8c'), (.36, '#f3eee5'), (.52, '#eeebe0'), (.62, '#8db240'), (1, '#5f8a26')])
    extra = [lq] + floating_ice(L, 3)
    for loc in [(.008, -.004, L + .012), (-.012, .006, L + .01), (.0, .016, L + .009)]: extra.append(raspberry(loc))
    return extra
def p_banana():
    hide(BLOOM); liquid.hide_render = True; hide(ices)
    lq, L = liquid_obj('ban_l', .78, [(0, '#f0cf6c'), (.36, '#f4e5b6'), (.52, '#eeebe0'), (.62, '#8db240'), (1, '#5f8a26')])
    fo, top = foam_top(L)
    extra = [lq, fo]
    for (r, a, t) in [(.008, .4, .35), (.014, 2.7, -.4), (.004, 4.6, .2)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=.0085, depth=.0028, vertices=48, location=(cos(a) * r, sin(a) * r, top - .001 - r * .2))
        c = bpy.context.active_object; c.rotation_euler = (t, t * .6, a); bv = c.modifiers.new('bv', 'BEVEL'); bv.width = .0008; bv.segments = 3
        c.data.materials.append(BANANA); extra.append(c)
        for p in c.data.polygons: p.use_smooth = True
    return extra
def p_mango():
    hide(BLOOM); liquid.hide_render = True; hide(ices)
    lq, L = liquid_obj('man_l', .82, [(0, '#c4206c'), (.45, '#e4506a'), (1, '#f6a03a')], sss=.15, clear=True)
    return [lq] + floating_ice(L, 4) + cube_bits(L, [DRAGON, MANGO_C], 7)
def p_lavender():
    hide(BLOOM); liquid.hide_render = True; hide(ices)
    lq, L = liquid_obj('lav_l', .82, [(0, '#9f88d2'), (.55, '#c3b2e8'), (1, '#e2d8f4')], sss=.15, clear=True)
    extra = [lq] + floating_ice(L, 4)
    # lavender sprig
    stem_m = principled('stem', hexc('#768f5c'), Roughness=.6)[0]; bud_m = sss_mat('bud', '#7f5cc0', rough=.5, sss=.5)
    bpy.ops.mesh.primitive_cylinder_add(radius=.0008, depth=.12, vertices=12, location=(.012, -.006, L + .02)); st = bpy.context.active_object; st.rotation_euler = (.12, .3, 0); st.data.materials.append(stem_m)
    bm = bmesh.new()
    for i in range(70):
        t = i / 70; a = i * 2.4; z = .03 + t * .03; r = .0026 * (1 - t * .5)
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.0019 * (1 - t * .35))
        bmesh.ops.scale(bm, vec=(1, 1, 1.5), verts=ret['verts']); bmesh.ops.translate(bm, vec=(cos(a) * r, sin(a) * r, z), verts=ret['verts'])
    me = bpy.data.meshes.new('buds'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    bo = link(bpy.data.objects.new('buds', me)); bo.data.materials.append(bud_m); bo.parent = st; bo.location = (0, 0, 0)
    extra += [st, bo]; return extra
def p_caramel():
    hide(BLOOM); liquid.hide_render = True; hide(ices)
    lq, L = liquid_obj('car_l', .78, [(0, '#f3eadc'), (.42, '#efe0c9'), (.55, '#d7a160'), (.7, '#a26b3c'), (1, '#7d4f2c')])
    fo, top = foam_top(L)
    pts = []
    for i in range(121):
        t = i / 120; x = lerp(-.026, .026, t); y = sin(t * pi * 7) * .02 * math.sqrt(max(0, 1 - (x / .03) ** 2)); rr = math.hypot(x, y)
        pts.append((x, y, top - .0015 - (rr / .034) ** 2 * .011 + .0012))
    cu = bpy.data.curves.new('drizzle', 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    cu.bevel_depth = .00085; cu.bevel_resolution = 4; cu.use_fill_caps = True
    dz = link(bpy.data.objects.new('drizzle', cu)); dz.data.materials.append(principled('caramel', hexc('#b8661f'), Roughness=.08, **{'Coat Weight': 1., 'Subsurface Weight': .4, 'Subsurface Scale': .001})[0])
    return [lq, fo, dz]
def p_cupcake():
    hide(BLOOM + [glass, drops, liquid] + ices)
    extra = []
    lp = [(0, 0)] + [(lerp(.03, .039, i / 20), i / 20 * .038) for i in range(21)]
    liner = lathe('liner', lp, 256)
    for v in liner.data.vertices:
        r = math.hypot(v.co.x, v.co.y)
        if r > .004: a = math.atan2(v.co.y, v.co.x); k = 1 + .045 * abs(sin(a * 16)); v.co.x *= k; v.co.y *= k
    liner.data.materials.append(principled('liner', hexc('#94b0da'), Roughness=.5, **{'Sheen Weight': .5, 'Coat Weight': .25})[0])
    cake = lathe('cake', [(0, .03), (.039, .034), (.04, .038), (.036, .043), (.02, .047), (0, .048)], 128)
    cake.data.materials.append(sss_mat('cake', '#d29551', rough=.8, sss=.2))
    sw2 = swirl('cswirl', turns=3.1, r0=.031, r1=.0022, z0=.046, z1=.093, t0=.0118, t1=.006); sw2.data.materials.append(icing_mat('#fffaf3', wire=False))
    extra += [liner, cake, sw2]
    # topper: one blossom + pearls (reuse petal mesh + dot material)
    Mt = Matrix.Translation((0, 0, .094))
    for p in blossom(COL['white'], 2.0):
        if p.get('dots'): continue
        o = link(bpy.data.objects.new('cp', p['me'])); o.data.materials.append(icing_mat(COL['white'], wire=False)); o['wire'] = 0.
        o.matrix_world = Mt @ Matrix.Translation(p['at']) @ basis(p['a'], p['tilt']); sub = o.modifiers.new('s', 'SUBSURF'); sub.render_levels = 1; extra.append(o)
    for i in range(9):
        a = random.uniform(0, 2 * pi); r = random.uniform(.008, .026)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.0014, location=(cos(a) * r, sin(a) * r, .05 + (.031 - r) * 1.4 + .004)); pr = bpy.context.active_object; pr.data.materials.append(pearl_m); extra.append(pr)
    return extra
def p_mangocake():
    hide(BLOOM + [glass, drops, liquid] + ices)
    stand = lathe('stand', [(0, 0), (.036, 0), (.037, .002), (.021, .005), (.0065, .01), (.005, .036), (.0085, .044), (.056, .047), (.057, .049), (0, .049)], 128)
    stand.data.materials.append(glass_mat_plain())
    plate = lathe('plate', [(0, .049), (.044, .049), (.053, .051), (.0555, .0535), (.054, .054), (.043, .051), (0, .0505)], 128)
    plate.data.materials.append(principled('porcelain', (1, 1, 1, 1), Roughness=.12, **{'Coat Weight': .8})[0])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=128, ring_count=96, location=(0, 0, 0)); mg = bpy.context.active_object
    cols = mg.data.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(mg.data.vertices):
        x, y, z = v.co
        k = x * .5 + z * .6 + noise_val(x, y, z) * .25
        cR, cO, cY, cG = Vector(hexc('#c41f1a')[:3]), Vector(hexc('#ee8212')[:3]), Vector(hexc('#efbb22')[:3]), Vector(hexc('#4f8a1f')[:3])
        if k > .25: c = cO.lerp(cR, smooth(.25, .8, k))
        elif k > -.25: c = cY.lerp(cO, smooth(-.25, .25, k))
        else: c = cG.lerp(cY, smooth(-.9, -.25, k))
        cols.data[i].color = (*c, 1)
        v.co = Vector((x * .033, y * .024 * (1 - .1 * x), z * .0215 + .0035 * (x * x - .35) * (1 - .3 * z) - .0014 * x))
    for p in mg.data.polygons: p.use_smooth = True
    m, nt, b, out = principled('glaze', (1, 1, 1, 1), Roughness=.1, **{'Coat Weight': 1., 'Coat Roughness': .02, 'Subsurface Weight': .1, 'Subsurface Scale': .001})
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'col'; nt.links.new(ca.outputs[0], b.inputs['Base Color'])
    mg.data.materials.append(m); mg.location = (0, 0, .0545 + .021); mg.rotation_euler = (0, 0, .5)
    leaf_o = link(bpy.data.objects.new('leaf', petal_mesh(w=.05, h=.2, cup=.2, flare=.1, leaf=True))); leaf_o.data.materials.append(icing_mat('#5f8a3a', wire=False)); leaf_o['wire'] = 0.
    leaf_o.parent = mg; leaf_o.location = (.031, .0, .009); leaf_o.rotation_euler = (.3, 0, -1.2)
    return [stand, plate, mg, leaf_o]

def noise_val(x, y, z):
    from mathutils import noise as N
    return N.noise(Vector((x * 2, y * 2, z * 2)))
def glass_mat_plain():
    m, nt, b, out = principled('glass2', (1, 1, 1, 1), **{'Transmission Weight': 1., 'IOR': 1.47, 'Roughness': .0})
    nt.links.new(light_through(nt, b.outputs[0]), out.inputs[0]); return m

PRODUCTS = [('bloom', p_bloom, .098), ('rasp', p_rasp, .08), ('banana', p_banana, .08), ('mango', p_mango, .08), ('lavender', p_lavender, .085), ('caramel', p_caramel, .08), ('cupcake', p_cupcake, .05), ('mangocake', p_mangocake, .058)]

# render settings (same look as the hero)
scn.render.engine = 'CYCLES'; cy = scn.cycles; cy.device = 'CPU'; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 12; cy.glossy_bounces = 4; cy.diffuse_bounces = 3; cy.transparent_max_bounces = 10
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.; cy.sample_clamp_indirect = 6
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'; scn.render.image_settings.file_format = 'PNG'
# camera for portrait cards
cam_d = bpy.data.cameras.new('pcam'); cam_d.lens = 85; cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 24
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 5.6
pcam = link(bpy.data.objects.new('pcam', cam_d)); scn.camera = pcam
pf = link(bpy.data.objects.new('pfocus', None)); cam_d.dof.focus_object = pf
r = scn.render; r.resolution_x = 960; r.resolution_y = 1200; cy.samples = SAMPLES; r.use_overwrite = True; r.use_placeholder = False
scn.frame_set(scn.frame_end)
for k, fn, tz in PRODUCTS:
    if ONLY and k != ONLY: continue
    # reset visibility to the bloom state
    hide(BLOOM, False); hide([glass, drops, liquid] + ices, False); glass.hide_render = False
    extra = fn()
    small = k in ('cupcake', 'mangocake')
    d = .52 if small else .8; el = .2 if small else .14; az = .45
    pcam.location = (sin(az) * cos(el) * d, -cos(az) * cos(el) * d, tz + sin(el) * d)
    pf.location = (0, 0, tz); pcam.rotation_euler = (pf.location - pcam.location).to_track_quat('-Z', 'Y').to_euler()
    r.filepath = os.path.join(OUTDIR, k + '.png'); bpy.ops.render.render(write_still=True)
    for o in extra: o.hide_render = True
print('done')
