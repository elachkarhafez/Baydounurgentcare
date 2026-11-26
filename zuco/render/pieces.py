# Zu & Co: studio stills of gold pieces for the showroom case (sample inventory; their real 21k set photo leads).
# Each piece sits on black velvet under one case downlight with two thin LED strips for the gold's highlights,
# like the white cove light in their black showroom. Units are centimetres.
# usage: bpe run pieces.py -m final -- <out_dir> <piece|all> [samples=160] [res=1000]
# pieces: cuban rope bangles ring tennis rosebangle
import bpy, bmesh, math, random, sys, os
from math import sin, cos, pi, radians
from mathutils import Vector, Matrix
from bpe_assets import asset

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'out'
SEL = argv[1] if len(argv) > 1 else 'all'
SAMPLES = int(argv[2]) if len(argv) > 2 else 160
RES = int(argv[3]) if len(argv) > 3 else 1000
# ZU_BG=light: an ivory seamless sweep under a big softbox (the light showroom look); default: black velvet case
LIGHTBG = os.environ.get('ZU_BG', '') == 'light'
os.makedirs(OUT, exist_ok=True)


def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c) + (1.,)


# gold colours (linear F0-ish); 21k reads deeper and warmer than 18k
GOLD = {'21k': (1.0, .67, .2, 1), '18k': (.98, .72, .32, 1), 'white': (.86, .86, .84, 1), 'rose': (.97, .60, .47, 1)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.samples = SAMPLES; s.cycles.use_denoising = True
    s.cycles.max_bounces = 16; s.cycles.glossy_bounces = 8; s.cycles.transmission_bounces = 14; s.cycles.diffuse_bounces = 3
    s.cycles.caustics_reflective = False; s.cycles.caustics_refractive = False; s.cycles.sample_clamp_indirect = 12
    s.render.resolution_x = s.render.resolution_y = RES; s.render.film_transparent = False
    s.view_settings.view_transform = 'AgX'; s.view_settings.look = 'AgX - Medium High Contrast' if LIGHTBG else 'AgX - High Contrast'
    if LIGHTBG: s.view_settings.exposure = float(os.environ.get('ZU_EV', '0.55'))
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_depth = '8'
    return s


def obj(name, data):
    o = bpy.data.objects.new(name, data); bpy.context.scene.collection.objects.link(o); return o


def mesh_from(name, bm, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    return me


def torus_bm(R, r, nu=56, nv=20, sx=1., sz=1.):
    bm = bmesh.new(); rings = []
    for i in range(nu):
        u = 2 * pi * i / nu; ring = []
        for j in range(nv):
            v = 2 * pi * j / nv
            x = (R + r * cos(v)) * cos(u) * sx; y = (R + r * cos(v)) * sin(u); z = r * sin(v) * sz
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for i in range(nu):
        a, b = rings[i], rings[(i + 1) % nu]
        for j in range(nv):
            bm.faces.new((a[j], b[j], b[(j + 1) % nv], a[(j + 1) % nv]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def metal(name, col, rough=.13, facet=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; n = t.nodes
    b = n['Principled BSDF']; b.inputs['Base Color'].default_value = col; b.inputs['Metallic'].default_value = 1.
    b.inputs['Roughness'].default_value = rough
    if 'Specular Tint' in b.inputs: b.inputs['Specular Tint'].default_value = col
    # micro-scratches so it reads as polished metal, not CG chrome
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900.; nz.inputs['Detail'].default_value = 2.
    rm = n.new('ShaderNodeMapRange'); rm.inputs['To Min'].default_value = rough * .75; rm.inputs['To Max'].default_value = rough * 1.35
    t.links.new(nz.outputs[0], rm.inputs[0]); t.links.new(rm.outputs[0], b.inputs['Roughness'])
    if facet:
        # diamond-cut: hard faceted normals from a voronoi pattern
        vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = facet; vo.feature = 'F1'
        bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .35; bp.inputs['Distance'].default_value = .02
        t.links.new(vo.outputs['Distance'], bp.inputs['Height']); t.links.new(bp.outputs[0], b.inputs['Normal'])
    return m


def gem_mat():
    m = bpy.data.materials.new('diamond'); m.use_nodes = True; t = m.node_tree; n = t.nodes; n.clear()
    g = n.new('ShaderNodeBsdfGlass'); g.inputs['IOR'].default_value = 2.417; g.inputs['Roughness'].default_value = 0.
    g.inputs['Color'].default_value = (1, 1, 1, 1)
    if 'Dispersion' in g.inputs: g.inputs['Dispersion'].default_value = .044
    o = n.new('ShaderNodeOutputMaterial'); t.links.new(g.outputs[0], o.inputs[0]); return m


def brilliant(d=1.):
    """a round brilliant from its proportions: table 56%, crown 15%, pavilion 43%, convex hull, flat shaded"""
    R = d / 2; pts = []
    for i in range(8):
        a = 2 * pi * i / 8
        pts.append((.56 * R * cos(a), .56 * R * sin(a), .15 * d))
        a2 = a + pi / 8; pts.append((.82 * R * cos(a2), .82 * R * sin(a2), .09 * d))
    for i in range(32):
        a = 2 * pi * i / 32
        pts.append((R * cos(a), R * sin(a), .012 * d)); pts.append((R * cos(a), R * sin(a), -.012 * d))
    for i in range(16):
        a = 2 * pi * i / 16 + pi / 16
        pts.append((.55 * R * cos(a), .55 * R * sin(a), -.22 * d))
    pts.append((0, 0, -.43 * d))
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in pts]
    bmesh.ops.convex_hull(bm, input=vs)
    bmesh.ops.dissolve_limit(bm, angle_limit=radians(1.), verts=bm.verts, edges=bm.edges)
    return bm


def world_and_floor(s, floor_col='#0b0a0a', strength=.9):
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True; t = w.node_tree; t.nodes.clear()
    env = t.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
    mp = t.nodes.new('ShaderNodeMapping'); tc = t.nodes.new('ShaderNodeTexCoord'); mp.inputs['Rotation'].default_value = (0, 0, radians(30))
    t.links.new(tc.outputs['Generated'], mp.inputs[0]); t.links.new(mp.outputs[0], env.inputs[0])
    bg = t.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = strength
    black = t.nodes.new('ShaderNodeBackground'); black.inputs[0].default_value = (0, 0, 0, 1)
    lp = t.nodes.new('ShaderNodeLightPath'); mx = t.nodes.new('ShaderNodeMixShader')
    o = t.nodes.new('ShaderNodeOutputWorld')
    # the studio only shows up in reflections and through the stones; the velvet stays dark outside the downlight
    mxx = t.nodes.new('ShaderNodeMath'); mxx.operation = 'MAXIMUM'
    t.links.new(lp.outputs['Is Glossy Ray'], mxx.inputs[0]); t.links.new(lp.outputs['Is Transmission Ray'], mxx.inputs[1])
    t.links.new(env.outputs[0], bg.inputs[0]); t.links.new(mxx.outputs[0], mx.inputs[0])
    t.links.new(black.outputs[0], mx.inputs[1]); t.links.new(bg.outputs[0], mx.inputs[2]); t.links.new(mx.outputs[0], o.inputs[0])
    # velvet: near-black with a sheen that lifts the pile where the downlight grazes it
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=200)
    fl = obj('floor', mesh_from('floor', bm, False))
    m = bpy.data.materials.new('velvet'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(floor_col); b.inputs['Roughness'].default_value = .92
    if 'Sheen Weight' in b.inputs:
        b.inputs['Sheen Weight'].default_value = .9; b.inputs['Sheen Roughness'].default_value = .35; b.inputs['Sheen Tint'].default_value = (.55, .55, .58, 1)
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = .2
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 60.; nz.inputs['Detail'].default_value = 8.
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .25; bp.inputs['Distance'].default_value = .01
    nt.links.new(nz.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    fl.data.materials.append(m)


def world_and_sweep(s, col='#f4f0e8'):
    """light studio: the HDRI lights everything (camera rays see the sweep colour), an ivory seamless sweep
    (floor curving up into a back wall), and two black flags that only show in reflections so the gold keeps contrast"""
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True; t = w.node_tree; t.nodes.clear()
    env = t.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(asset('studio_small_09_1k.hdr'))
    mp = t.nodes.new('ShaderNodeMapping'); tc = t.nodes.new('ShaderNodeTexCoord'); mp.inputs['Rotation'].default_value = (0, 0, radians(30))
    t.links.new(tc.outputs['Generated'], mp.inputs[0]); t.links.new(mp.outputs[0], env.inputs[0])
    bg = t.nodes.new('ShaderNodeBackground'); bg.inputs[1].default_value = .6
    cam = t.nodes.new('ShaderNodeBackground'); cam.inputs[0].default_value = srgb(col); cam.inputs[1].default_value = 1.
    lp = t.nodes.new('ShaderNodeLightPath'); mx = t.nodes.new('ShaderNodeMixShader'); o = t.nodes.new('ShaderNodeOutputWorld')
    t.links.new(env.outputs[0], bg.inputs[0]); t.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0])
    t.links.new(bg.outputs[0], mx.inputs[1]); t.links.new(cam.outputs[0], mx.inputs[2]); t.links.new(mx.outputs[0], o.inputs[0])
    prof = [(y, 0.) for y in range(-140, 26, 5)] + [(25 + 40 * sin(a * pi / 2 / 12), 40 - 40 * cos(a * pi / 2 / 12)) for a in range(1, 13)] + [(65., z) for z in range(50, 160, 10)]
    bm = bmesh.new(); rows = []
    for x in (-160., 160.):
        rows.append([bm.verts.new((x, y, z)) for y, z in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    sw = obj('sweep', mesh_from('sweep', bm, True))
    m = bpy.data.materials.new('ivory'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(col); b.inputs['Roughness'].default_value = .62
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = .25
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 140.; nz.inputs['Detail'].default_value = 6.
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .06; bp.inputs['Distance'].default_value = .005
    nt.links.new(nz.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    sw.data.materials.append(m)
    fm = bpy.data.materials.new('flag'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.004, 0.004, 0.004, 1)
    fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.
    for nm_, loc in (('flagL', (-14., -3., 8.)), ('flagR', (14., 5., 9.)), ('flagB', (0., -18., 6.))):
        fb = bmesh.new(); bmesh.ops.create_grid(fb, x_segments=1, y_segments=1, size=1.); bmesh.ops.scale(fb, vec=(8., 24., 1.), verts=fb.verts)
        f = obj(nm_, mesh_from(nm_, fb, False)); f.data.materials.append(fm); f.location = loc
        f.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat('Z', 'Y').to_euler()
        f.visible_camera = False; f.visible_diffuse = False; f.visible_shadow = False; f.visible_transmission = False


def light(kind, name, loc, target, W, size=1., sy=None, spot=None, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind); l.energy = W; l.color = color
    if kind == 'AREA':
        l.shape = 'RECTANGLE'; l.size = size; l.size_y = sy or size
    if kind == 'SPOT':
        l.spot_size = radians(spot or 40); l.spot_blend = .6; l.shadow_soft_size = size
    o = obj(name, l); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


def rig(target, dist, elev, az, lens=85, fstop=4., spot_W=9000.):
    s = bpy.context.scene
    if LIGHTBG:  # one big softbox overhead: soft contact shadows, like a bright showroom counter
        sb = light('AREA', 'softbox', (target[0] - 5., target[1] - 4., 30.), target, spot_W * .42, size=12., sy=9., color=(1, .98, .95)); sb.visible_camera = False
    else:
        light('SPOT', 'downlight', (target[0] + .5, target[1] + 2., 34.), target, spot_W * 1.4, size=3.5, spot=34, color=(1, .97, .93))
    # thin LED strips (their showroom's cove light) give long clean highlights on the gold
    sL = light('AREA', 'stripL', (-16., -6., 14.), target, 1100., size=.5, sy=26., color=(.95, .97, 1.))
    sR = light('AREA', 'stripR', (16., 4., 12.), target, 800., size=.5, sy=26., color=(1., .96, .9))
    for o in (sL, sR): o.visible_camera = False
    cd = bpy.data.cameras.new('cam'); cd.lens = lens; cd.clip_start = .1
    cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
    cam = obj('cam', cd); s.camera = cam
    e, a = radians(elev), radians(az)
    cam.location = Vector(target) + Vector((dist * cos(e) * sin(a), -dist * cos(e) * cos(a), dist * sin(e)))
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (Vector(target) - cam.location).length


def frame_along(path_pts):
    """tangent frames along a poly path lying roughly on the floor"""
    out = []
    for i, p in enumerate(path_pts):
        a = path_pts[max(0, i - 1)]; b = path_pts[min(len(path_pts) - 1, i + 1)]
        T = (Vector(b) - Vector(a)).normalized(); up = Vector((0, 0, 1))
        Bn = T.cross(up).normalized(); N = Bn.cross(T).normalized()
        out.append((Vector(p), T, Bn, N))
    return out


def sample_curve(f, s0, s1, step, n=4000):
    """walk a parametric curve f(u) and drop points every `step` cm of arc length"""
    pts = [f(s0 + (s1 - s0) * i / n) for i in range(n + 1)]
    out = [pts[0]]; acc = 0.
    for i in range(1, len(pts)):
        acc += (Vector(pts[i]) - Vector(pts[i - 1])).length
        if acc >= step: out.append(pts[i]); acc = 0.
    return out


# ---------------------------------------------------------------- pieces
def piece_cuban(s):
    """21k Cuban link chain lying in an S across the velvet: thick oval links, each twisted against the last"""
    gold = metal('g21', GOLD['21k'], .12)
    R, r = .30, .2
    link = mesh_from('link', torus_bm(R, r, 64, 24, sx=1.3, sz=.5))
    link.materials.append(gold)
    f = lambda u: (u * .86 - 1.2 * sin(u * .3), u * .5 + 1.4 * sin(u * .3), 0.)
    pts = sample_curve(f, -12, 12, .56)
    for k, (p, T, B, N) in enumerate(frame_along(pts)):
        o = obj('l%d' % k, link)
        tw = radians(34 if k % 2 else -34)
        M = Matrix((T, B, N)).transposed().to_4x4() @ Matrix.Rotation(radians(9 if k % 2 else -9), 4, 'Z') @ Matrix.Rotation(tw, 4, 'X')
        o.matrix_world = Matrix.Translation(p + Vector((0, 0, r * 1.05))) @ M
    rig((0, 0, .2), 12., 58, 0, lens=70, fstop=3.5)


def piece_rope(s, col='18k'):
    """18k rope chain: three strands twisted round one another, laid in a loose loop"""
    gold = metal('g18', GOLD[col], .11)
    a, br, pitch = .15, .135, .78
    f = lambda u: (5.2 * cos(u) + .6 * cos(3 * u), 3.6 * sin(u) - .4, 0.)
    path = sample_curve(f, -pi * .92, pi * .78, .03)
    fr = frame_along(path)
    for k in range(3):
        cu = bpy.data.curves.new('strand%d' % k, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = br; cu.bevel_resolution = 4
        sp = cu.splines.new('POLY'); sp.points.add(len(fr) - 1); acc = 0.
        for i, (p, T, B, N) in enumerate(fr):
            if i: acc += (p - fr[i - 1][0]).length
            th = 2 * pi * acc / pitch + k * 2 * pi / 3
            q = p + a * (cos(th) * B + sin(th) * N) + Vector((0, 0, a + br))
            sp.points[i].co = (q.x, q.y, q.z, 1)
        cu.materials.append(gold); o = obj('strand%d' % k, cu)
    rig((1.5, -1.5, .2), 13.5, 44, -6, lens=70, fstop=3.2)


def piece_bangles(s, col='21k', facet=True):
    """three 21k bangles, diamond-cut, lying overlapped like they sit in the tray"""
    gold = metal('gb', GOLD[col], .1, facet=90. if facet else 0.)
    plain = metal('gp', GOLD[col], .1)
    for k, (x, y, tilt, rz) in enumerate([(-1.6, .4, 0, 0), (1.5, .9, 0, 20), (.1, -1.7, 0, 40)]):
        me = mesh_from('b%d' % k, torus_bm(3.15, .23, 160, 18, sz=.82)); me.materials.append(gold if k != 1 else plain)
        o = obj('bangle%d' % k, me); o.location = (x, y, .16 + k * .32); o.rotation_euler = (radians(2.5 * k), radians(-2 * k), radians(rz))
    rig((0, -.2, .3), 22., 48, 0, lens=70, fstop=4.)


def piece_ring(s, col='18k'):
    """18k solitaire: a round brilliant on a four-prong head, the band standing in a velvet slot"""
    gold = metal('gr', GOLD[col], .09)
    gm = gem_mat()
    # band: a slightly flattened torus standing upright
    band = mesh_from('band', torus_bm(.92, .11, 96, 16, sx=1., sz=1.)); band.materials.append(gold)
    b = obj('band', band); b.rotation_euler = (radians(90), 0, radians(-14)); b.location = (0, 0, 1.03)
    top = Vector((0, 0, 1.03 + .92 + .11))
    # diamond 6.4 mm (about 1 ct look)
    d = .64; gem = mesh_from('gem', brilliant(d), False); gem.materials.append(gm)
    g = obj('gem', gem); g.location = top + Vector((0, 0, .36))
    # basket + prongs
    bas = mesh_from('basket', torus_bm(.2, .035, 40, 10)); bas.materials.append(gold)
    obj('basket', bas).location = top + Vector((0, 0, .12))
    for i in range(4):
        a = pi / 4 + i * pi / 2
        p0 = top + Vector((.08 * cos(a), .08 * sin(a), -.02)); p1 = g.location + Vector((d / 2 * .93 * cos(a), d / 2 * .93 * sin(a), .07))
        cu = bpy.data.curves.new('prong%d' % i, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .034; cu.bevel_resolution = 3
        cu.use_fill_caps = True
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(1)
        for bp_, pp in zip(sp.bezier_points, (p0, p1)):
            bp_.co = pp; bp_.handle_left_type = bp_.handle_right_type = 'AUTO'
        cu.materials.append(gold); obj('prong%d' % i, cu)
    # a velvet ring slot
    rig((0, 0, 1.4), 9.8, 26, 22, lens=85, fstop=5.6, spot_W=5200.)


def piece_tennis(s, col='white'):
    """white gold tennis bracelet: a row of round brilliants in four-prong boxes, in an open curve"""
    wg = metal('wg', GOLD[col], .08); gm = gem_mat()
    d = .5; gem = mesh_from('gem', brilliant(d), False); gem.materials.append(gm)
    cup = mesh_from('cup', torus_bm(d * .52, .035, 32, 8, sz=1.6)); cup.materials.append(wg)
    f = lambda u: (6.4 * cos(u), 4.4 * sin(u), 0.)
    pts = sample_curve(f, radians(-200), radians(60), .54)
    for k, (p, T, B, N) in enumerate(frame_along(pts)):
        base = p + Vector((0, 0, .12))
        c = obj('c%d' % k, cup); c.location = base
        g = obj('g%d' % k, gem); g.location = base + Vector((0, 0, .1)); g.rotation_euler = (0, 0, random.random())
        lk = obj('k%d' % k, cup); lk.location = base + T * (.27) + Vector((0, 0, -.05)); lk.scale = (.35, .35, .5)
    rig((0, -4.4, .2), 10.5, 38, 0, lens=70, fstop=3.5, spot_W=8000.)


PIECES = {'cuban': piece_cuban, 'rope': piece_rope, 'bangles': piece_bangles, 'ring': piece_ring, 'tennis': piece_tennis,
          'rosebangle': lambda s: piece_bangles(s, 'rose', facet=True)}
random.seed(7)
for name in (PIECES if SEL == 'all' else SEL.split(',')):
    s = reset()
    if LIGHTBG: world_and_sweep(s)
    else: world_and_floor(s)
    PIECES[name](s)
    s.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
