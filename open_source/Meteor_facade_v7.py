"""
Meteor Facade v7 — Surface Grid Panel Skin
===========================================
Panels sit on a regular grid produced by subdividing the mesh and placing
one panel at every face centre.  No SampleUVSurface — 100 % reliable.

Grid density is controlled by a single "Grid Level" integer:
  Level 0 → panels at every face of the zone-subdivided mesh
  Level 1 → 4×  more panels  (each face split into 4)
  Level 2 → 16× more panels  etc.

Zone assignment, gradient, depth noise, tilt — all unchanged from v6.
"""

import bpy, math

IMG_A_PATH  = ""
IMG_B_PATH  = ""
UV_MAP_NAME = "UVMap"   # ← change if your UV map has a different name

# ─────────────────────────────────────────────
# MATERIALS
# ─────────────────────────────────────────────
MAT_DEFS = [
    ("MF_SmoothStone", (0.180, 0.160, 0.140, 1), 0.95, 0.00),
    ("MF_RoughStone",  (0.100, 0.085, 0.075, 1), 0.88, 0.00),
    ("MF_BlackGlass",  (0.008, 0.008, 0.010, 1), 0.04, 0.00),
    ("MF_MetalPanel",  (0.200, 0.210, 0.220, 1), 0.28, 0.92),
]

def make_materials():
    mats = []
    for name, col, rough, metal in MAT_DEFS:
        if name in bpy.data.materials:
            bpy.data.materials.remove(bpy.data.materials[name])
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b:
            b.inputs['Base Color'].default_value = col
            b.inputs['Roughness'].default_value  = rough
            b.inputs['Metallic'].default_value   = metal
        mats.append(m)
    return mats

def make_debug_materials():
    DEBUG_COLS = [
        ("MF_Dbg_Z0", (1.0,  0.15, 0.15)),
        ("MF_Dbg_Z1", (0.15, 1.0,  0.15)),
        ("MF_Dbg_Z2", (0.15, 0.45, 1.0 )),
        ("MF_Dbg_Z3", (1.0,  1.0,  0.05)),
    ]
    dbg = []
    for name, col in DEBUG_COLS:
        if name in bpy.data.materials:
            bpy.data.materials.remove(bpy.data.materials[name])
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        out  = nt.nodes.new('ShaderNodeOutputMaterial'); out.location  = (300, 0)
        emit = nt.nodes.new('ShaderNodeEmission');       emit.location = (0,   0)
        emit.inputs['Color'].default_value    = (*col, 1.0)
        emit.inputs['Strength'].default_value = 1.5
        nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])
        dbg.append(m)
    return dbg

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def mk(nodes, ntype, x, y):
    n = nodes.new(ntype); n.location = (x, y); return n

def add_sock(ng, name, io, stype, default=None, mn=None, mx=None):
    try:
        s = ng.interface.new_socket(name, in_out=io, socket_type=stype)
        if default is not None: s.default_value = default
        if mn is not None and hasattr(s, 'min_value'): s.min_value = mn
        if mx is not None and hasattr(s, 'max_value'): s.max_value = mx
    except AttributeError:
        c = ng.inputs if io == 'INPUT' else ng.outputs
        c.new(stype, name)
        if default is not None and name in c:
            c[name].default_value = default

def mth(nodes, links, op, a_out, b_out=None, b_val=None, x=0, y=0):
    n = mk(nodes, 'ShaderNodeMath', x, y); n.operation = op
    if a_out  is not None: links.new(a_out,  n.inputs[0])
    if b_out  is not None: links.new(b_out,  n.inputs[1])
    elif b_val is not None: n.inputs[1].default_value = b_val
    return n.outputs['Value']

def store_named(nodes, links, geom_out, attr_name, value_out, domain, dtype, x, y):
    """Create StoreNamedAttribute and wire it."""
    sna = mk(nodes, 'GeometryNodeStoreNamedAttribute', x, y)
    sna.domain = domain
    try:    sna.data_type = dtype
    except Exception: pass
    links.new(geom_out, sna.inputs[0])          # Geometry
    # Name — try socket by name, then by index, then node property
    for attempt in (
        lambda: setattr(sna.inputs['Name'], 'default_value', attr_name),
        lambda: setattr(sna.inputs[2],      'default_value', attr_name),
        lambda: setattr(sna, 'attribute_name', attr_name),
    ):
        try: attempt(); break
        except Exception: pass
    # Value — try by name then index 3
    try:    links.new(value_out, sna.inputs['Value'])
    except KeyError:
        try: links.new(value_out, sna.inputs[3])
        except Exception: pass
    return sna

# ─────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────

def build(obj, mats, debug_mats):
    for m in list(obj.modifiers):
        if m.type == 'NODES' and m.name == "Meteor_facade_v7":
            obj.modifiers.remove(m)
    for g in [g for g in bpy.data.node_groups
              if g.name.startswith("Meteor_facade_v7")]:
        bpy.data.node_groups.remove(g)

    mod = obj.modifiers.new("Meteor_facade_v7", 'NODES')
    ng  = bpy.data.node_groups.new("Meteor_facade_v7", 'GeometryNodeTree')
    mod.node_group = ng
    nodes = ng.nodes; links = ng.links; nodes.clear()

    # ── SOCKETS ──────────────────────────────────────────────────────────
    add_sock(ng, 'Geometry',          'INPUT',  'NodeSocketGeometry')
    add_sock(ng, 'Geometry',          'OUTPUT', 'NodeSocketGeometry')

    # Grid level per zone — subdivide mesh N extra times → 4^N more panels
    # Zone 0: grid subdivision density (v3 tiling)
    add_sock(ng, 'Grid Z0',           'INPUT',  'NodeSocketInt',    2,    0,    5)
    # Zones 1-3: tile instance size + grid density (instancing pipeline)
    add_sock(ng, 'Width Z1',          'INPUT',  'NodeSocketFloat',  0.40, 0.02, 10.0)
    add_sock(ng, 'Width Z2',          'INPUT',  'NodeSocketFloat',  0.25, 0.02, 10.0)
    add_sock(ng, 'Width Z3',          'INPUT',  'NodeSocketFloat',  0.60, 0.02, 10.0)
    add_sock(ng, 'Height Z1',         'INPUT',  'NodeSocketFloat',  1.20, 0.02, 20.0)
    add_sock(ng, 'Height Z2',         'INPUT',  'NodeSocketFloat',  0.80, 0.02, 20.0)
    add_sock(ng, 'Height Z3',         'INPUT',  'NodeSocketFloat',  1.50, 0.02, 20.0)
    add_sock(ng, 'Grid Z1',           'INPUT',  'NodeSocketInt',    2,    0,    4)
    add_sock(ng, 'Grid Z2',           'INPUT',  'NodeSocketInt',    2,    0,    4)
    add_sock(ng, 'Grid Z3',           'INPUT',  'NodeSocketInt',    2,    0,    4)
    add_sock(ng, 'Tilt X',            'INPUT',  'NodeSocketFloat',  0.0,       -math.pi, math.pi)
    add_sock(ng, 'Tilt Y',            'INPUT',  'NodeSocketFloat',  0.0,       -math.pi, math.pi)
    add_sock(ng, 'Tilt Z',            'INPUT',  'NodeSocketFloat',  math.pi/6, -math.pi, math.pi)

    add_sock(ng, 'UV Scale A',        'INPUT',  'NodeSocketFloat',  1.0,  0.01, 20.0)
    add_sock(ng, 'UV Scale B',        'INPUT',  'NodeSocketFloat',  1.0,  0.01, 20.0)
    add_sock(ng, 'UV Offset A',       'INPUT',  'NodeSocketFloat',  0.0, -100.0, 100.0)
    add_sock(ng, 'UV Offset B',       'INPUT',  'NodeSocketFloat',  0.0, -100.0, 100.0)
    add_sock(ng, 'Threshold',         'INPUT',  'NodeSocketFloat',  0.5,  0.0,  1.0)

    add_sock(ng, 'Gap Size',          'INPUT',  'NodeSocketFloat',  0.10, 0.0,  0.40)
    add_sock(ng, 'Depth Z0',          'INPUT',  'NodeSocketFloat',  0.01, 0.0,  1.00)
    add_sock(ng, 'Depth Z1',          'INPUT',  'NodeSocketFloat',  0.08, 0.0,  2.00)
    add_sock(ng, 'Depth Z2',          'INPUT',  'NodeSocketFloat',  0.04, 0.0,  2.00)
    add_sock(ng, 'Depth Z3',          'INPUT',  'NodeSocketFloat',  0.12, 0.0,  2.00)
    add_sock(ng, 'Height Noise',      'INPUT',  'NodeSocketFloat',  3.0,  0.1,  20.0)

    add_sock(ng, 'Gradient Start',    'INPUT',  'NodeSocketFloat',  0.0,  0.0,  1.0)
    add_sock(ng, 'Gradient End',      'INPUT',  'NodeSocketFloat',  0.25, 0.0,  1.0)
    add_sock(ng, 'Gradient Rotation', 'INPUT',  'NodeSocketFloat',  0.0, -math.pi, math.pi)
    add_sock(ng, 'Height Min',        'INPUT',  'NodeSocketFloat',  0.0,  -500.0, 500.0)
    add_sock(ng, 'Height Max',        'INPUT',  'NodeSocketFloat', 10.0,  -500.0, 500.0)

    add_sock(ng, 'Boundary Detail',   'INPUT',  'NodeSocketInt',    2,    0,    5)
    add_sock(ng, 'Debug Maps',        'INPUT',  'NodeSocketBool',   False)

    gi = mk(nodes, 'NodeGroupInput',  -4200, 0)
    go = mk(nodes, 'NodeGroupOutput',  4800, 0)

    # ── SUBDIVIDE: zone boundary accuracy ────────────────────────────────
    subdv = mk(nodes, 'GeometryNodeSubdivideMesh', -4000, -100)
    links.new(gi.outputs['Geometry'],        subdv.inputs['Mesh'])
    links.new(gi.outputs['Boundary Detail'], subdv.inputs['Level'])

    # ── GRADIENT ─────────────────────────────────────────────────────────
    sin_r = mth(nodes, links, 'SINE',   gi.outputs['Gradient Rotation'], x=-3500, y=550)
    cos_r = mth(nodes, links, 'COSINE', gi.outputs['Gradient Rotation'], x=-3500, y=430)
    pos_f = mk(nodes, 'GeometryNodeInputPosition', -3500, 750)
    sep_f = mk(nodes, 'ShaderNodeSeparateXYZ',     -3300, 750)
    links.new(pos_f.outputs['Position'], sep_f.inputs['Vector'])
    px_sr = mth(nodes, links, 'MULTIPLY', sep_f.outputs['X'], b_out=sin_r, x=-3100, y=700)
    pz_cr = mth(nodes, links, 'MULTIPLY', sep_f.outputs['Z'], b_out=cos_r, x=-3100, y=600)
    proj  = mth(nodes, links, 'ADD',      px_sr, b_out=pz_cr,             x=-2900, y=650)
    p_rng  = mth(nodes, links, 'SUBTRACT', gi.outputs['Height Max'], b_out=gi.outputs['Height Min'], x=-2700, y=275)
    p_safe = mth(nodes, links, 'MAXIMUM',  p_rng, b_val=0.001,            x=-2500, y=275)
    p_sub  = mth(nodes, links, 'SUBTRACT', proj,  b_out=gi.outputs['Height Min'], x=-2700, y=500)
    norm_p = mth(nodes, links, 'DIVIDE',   p_sub, b_out=p_safe,           x=-2300, y=390)

    mr_g = mk(nodes, 'ShaderNodeMapRange', -2100, 390)
    try: mr_g.interpolation_type = 'SMOOTHSTEP'
    except AttributeError: pass
    mr_g.inputs['To Min'].default_value = 0.0
    mr_g.inputs['To Max'].default_value = 1.0
    links.new(norm_p,                       mr_g.inputs['Value'])
    links.new(gi.outputs['Gradient Start'], mr_g.inputs['From Min'])
    links.new(gi.outputs['Gradient End'],   mr_g.inputs['From Max'])

    pos_bn = mk(nodes, 'GeometryNodeInputPosition', -2100, 200)
    nse_bn = mk(nodes, 'ShaderNodeTexNoise',         -1900, 200)
    nse_bn.noise_dimensions = '3D'
    nse_bn.inputs['Scale'].default_value     = 12.0
    nse_bn.inputs['Detail'].default_value    = 2.0
    nse_bn.inputs['Roughness'].default_value = 0.5
    links.new(pos_bn.outputs['Position'], nse_bn.inputs['Vector'])
    bn_s    = mth(nodes, links, 'MULTIPLY',     nse_bn.outputs['Fac'], b_val=0.30, x=-1700, y=200)
    bn_o    = mth(nodes, links, 'SUBTRACT',     bn_s,                  b_val=0.15, x=-1500, y=200)
    gr_n    = mth(nodes, links, 'ADD',          mr_g.outputs['Result'],b_out=bn_o, x=-1300, y=340)
    use_img = mth(nodes, links, 'GREATER_THAN', gr_n,                  b_val=0.5,  x=-1100, y=340)

    # ── IMAGE ZONES ───────────────────────────────────────────────────────
    # Auto-detect the active UV map name from the mesh so the attribute
    # read never silently returns zeros due to a name mismatch.
    active_uv = UV_MAP_NAME
    if obj.data.uv_layers:
        active_uv = (obj.data.uv_layers.active.name
                     if obj.data.uv_layers.active
                     else obj.data.uv_layers[0].name)
    print(f"[MeteorV7] Using UV map: '{active_uv}'")

    # Read mesh UV as FLOAT_VECTOR → (U, V, 0).
    # Scale/offset via VectorMath SCALE + ADD — no SeparateXYZ/CombineXYZ needed,
    # so there is no risk of a 2D/3D socket type mismatch.
    uv_node = mk(nodes, 'GeometryNodeInputNamedAttribute', -3700, 900)
    try:   uv_node.data_type = 'FLOAT_VECTOR'
    except Exception: pass
    uv_node.inputs[0].default_value = active_uv

    # ── UV A: scale then offset ──────────────────────────────────────────
    sc_a = mk(nodes, 'ShaderNodeVectorMath', -3500, 1050); sc_a.operation = 'SCALE'
    links.new(uv_node.outputs[0], sc_a.inputs[0])
    links.new(gi.outputs['UV Scale A'], sc_a.inputs[3])     # Scale (float socket)

    off_a_v = mk(nodes, 'ShaderNodeCombineXYZ', -3300, 1050)
    links.new(gi.outputs['UV Offset A'], off_a_v.inputs['X'])
    links.new(gi.outputs['UV Offset A'], off_a_v.inputs['Y'])

    uv_a = mk(nodes, 'ShaderNodeVectorMath', -3100, 1050); uv_a.operation = 'ADD'
    links.new(sc_a.outputs[0],         uv_a.inputs[0])
    links.new(off_a_v.outputs['Vector'], uv_a.inputs[1])

    # ── UV B: scale, offset, + fixed decorrelation shift ────────────────
    sc_b = mk(nodes, 'ShaderNodeVectorMath', -3500, 800); sc_b.operation = 'SCALE'
    links.new(uv_node.outputs[0], sc_b.inputs[0])
    links.new(gi.outputs['UV Scale B'], sc_b.inputs[3])

    off_b_v = mk(nodes, 'ShaderNodeCombineXYZ', -3300, 800)
    links.new(gi.outputs['UV Offset B'], off_b_v.inputs['X'])
    links.new(gi.outputs['UV Offset B'], off_b_v.inputs['Y'])

    uv_b_add = mk(nodes, 'ShaderNodeVectorMath', -3100, 800); uv_b_add.operation = 'ADD'
    links.new(sc_b.outputs[0],           uv_b_add.inputs[0])
    links.new(off_b_v.outputs['Vector'], uv_b_add.inputs[1])

    uv_b = mk(nodes, 'ShaderNodeVectorMath', -2900, 800); uv_b.operation = 'ADD'
    links.new(uv_b_add.outputs[0], uv_b.inputs[0])
    uv_b.inputs[1].default_value = (0.37, 0.61, 0.0)      # decorrelation offset

    # ── Image textures ───────────────────────────────────────────────────
    img_a = mk(nodes, 'GeometryNodeImageTexture', -2700, 1050)
    img_a.name = "IMG_A"; img_a.label = "IMG_A  (bit 0)"
    img_a.extension = 'REPEAT'; img_a.interpolation = 'Linear'
    if IMG_A_PATH:
        try: img_a.inputs['Image'].default_value = bpy.data.images.load(IMG_A_PATH, check_existing=True)
        except Exception: pass
    links.new(uv_a.outputs[0], img_a.inputs['Vector'])
    bit0 = mk(nodes, 'ShaderNodeMath', -2400, 1050); bit0.operation = 'GREATER_THAN'
    links.new(img_a.outputs[0], bit0.inputs[0]); links.new(gi.outputs['Threshold'], bit0.inputs[1])

    img_b = mk(nodes, 'GeometryNodeImageTexture', -2700, 760)
    img_b.name = "IMG_B"; img_b.label = "IMG_B  (bit 1)"
    img_b.extension = 'REPEAT'; img_b.interpolation = 'Linear'
    if IMG_B_PATH:
        try: img_b.inputs['Image'].default_value = bpy.data.images.load(IMG_B_PATH, check_existing=True)
        except Exception: pass
    links.new(uv_b.outputs[0], img_b.inputs['Vector'])
    bit1 = mk(nodes, 'ShaderNodeMath', -2400, 760); bit1.operation = 'GREATER_THAN'
    links.new(img_b.outputs[0], bit1.inputs[0]); links.new(gi.outputs['Threshold'], bit1.inputs[1])

    b1x2 = mk(nodes, 'ShaderNodeMath', -2200, 760); b1x2.operation = 'MULTIPLY'
    b1x2.inputs[1].default_value = 2.0; links.new(bit1.outputs['Value'], b1x2.inputs[0])
    img_zone = mk(nodes, 'ShaderNodeMath', -2000, 900); img_zone.operation = 'ADD'
    links.new(bit0.outputs['Value'], img_zone.inputs[0])
    links.new(b1x2.outputs['Value'], img_zone.inputs[1])

    eff_zone = mth(nodes, links, 'MULTIPLY',
                   img_zone.outputs['Value'], b_out=use_img, x=-900, y=700)

    # Gap scale = 1 - Gap Size
    gap_n = mk(nodes, 'ShaderNodeMath', -900, 500); gap_n.operation = 'SUBTRACT'
    gap_n.inputs[0].default_value = 1.0; links.new(gi.outputs['Gap Size'], gap_n.inputs[1])
    gap_sc = gap_n.outputs['Value']

    # ── PER-ZONE BRANCHES
    # Zone 0: v3 direct tiling (SeparateGeometry → Subdivide → Scale → Extrude)
    # Zones 1-3: instancing pipeline (GridSub → MeshToPoints → InstanceOnPoints → Realize → Scale → Extrude+noise)
    DEPTH_KEYS  = ['Depth Z0',  'Depth Z1',  'Depth Z2',  'Depth Z3']
    GRID_KEYS   = ['Grid Z0',   'Grid Z1',   'Grid Z2',   'Grid Z3']
    WIDTH_KEYS  = [None,        'Width Z1',  'Width Z2',  'Width Z3']
    HEIGHT_KEYS = [None,        'Height Z1', 'Height Z2', 'Height Z3']
    Y_ROWS = [1200, 300, -600, -1500]
    X0 = -200

    def _geom_out(node):
        for name in ('Mesh', 'Geometry', 'Selection'):
            try: return node.outputs[name]
            except KeyError: pass
        return node.outputs[0]

    def _ext_in(ext_node, geom_out):
        for name in ('Mesh', 'Geometry'):
            try: links.new(geom_out, ext_node.inputs[name]); return
            except KeyError: pass
        links.new(geom_out, ext_node.inputs[0])

    def _mk_align(x, y_pos):
        for t in ('FunctionNodeAlignEulerToVector', 'FunctionNodeAlignRotationToVector'):
            try: return mk(nodes, t, x, y_pos)
            except Exception: pass
        return None

    geo_outputs = []
    zone_sels   = []

    for zi in range(4):
        y = Y_ROWS[zi]

        # ─ Zone selection mask (shared by all zones) ──────────────────────
        dz = mk(nodes, 'ShaderNodeMath', X0,       y - 80); dz.operation = 'SUBTRACT'
        dz.inputs[1].default_value = float(zi); links.new(eff_zone, dz.inputs[0])
        az = mk(nodes, 'ShaderNodeMath', X0 + 200, y - 80); az.operation = 'ABSOLUTE'
        links.new(dz.outputs['Value'], az.inputs[0])
        lz = mk(nodes, 'ShaderNodeMath', X0 + 400, y - 80); lz.operation = 'LESS_THAN'
        lz.inputs[1].default_value = 0.5; links.new(az.outputs['Value'], lz.inputs[0])
        zone_sels.append(lz.outputs['Value'])

        if zi == 0:
            # ── ZONE 0: v3 tiling ─────────────────────────────────────────
            # Pipeline:
            #   SeparateGeometry → SubdivideMesh → ExtrudeMesh(offset=0, Individual)
            #   → SeparateGeometry(Top) → ScaleElements → ExtrudeMesh(height)
            # The zero-offset individual extrude disconnects every face into its own
            # island so ScaleElements can scale each one around its OWN centre.

            # 1. Separate zone 0 faces from boundary mesh
            sep = mk(nodes, 'GeometryNodeSeparateGeometry', X0 + 650, y)
            sep.domain = 'FACE'
            try:    links.new(subdv.outputs['Mesh'], sep.inputs['Geometry'])
            except KeyError: links.new(subdv.outputs[0], sep.inputs['Geometry'])
            try:    links.new(lz.outputs['Value'], sep.inputs['Selection'])
            except KeyError: links.new(lz.outputs['Value'], sep.inputs[1])

            # 2. Subdivide for panel density
            sdv = mk(nodes, 'GeometryNodeSubdivideMesh', X0 + 900, y)
            links.new(_geom_out(sep), sdv.inputs[0])
            links.new(gi.outputs['Grid Z0'], sdv.inputs['Level'])

            # 3. Zero-offset individual extrude → disconnects every face island
            disc = mk(nodes, 'GeometryNodeExtrudeMesh', X0 + 1150, y)
            disc.mode = 'FACES'
            _ext_in(disc, _geom_out(sdv))
            disc.inputs['Offset Scale'].default_value = 0.0
            try: disc.inputs['Individual'].default_value = True
            except (KeyError, TypeError): pass
            try:    top_sel = disc.outputs['Top']
            except KeyError: top_sel = disc.outputs[1]

            # 4. Keep only the disconnected top faces (discard base + zero-area sides)
            iso = mk(nodes, 'GeometryNodeSeparateGeometry', X0 + 1380, y)
            iso.domain = 'FACE'
            links.new(_geom_out(disc), iso.inputs[0])
            links.new(top_sel,         iso.inputs[1])

            # 5. Scale each isolated face around its own centre → gap between panels
            sc = mk(nodes, 'GeometryNodeScaleElements', X0 + 1600, y)
            sc.domain = 'FACE'
            links.new(iso.outputs[0], sc.inputs['Geometry'])
            try:    links.new(gap_sc, sc.inputs['Scale'])
            except KeyError: links.new(gap_sc, sc.inputs[2])

            # 6. Extrude panels to their final height
            ext = mk(nodes, 'GeometryNodeExtrudeMesh', X0 + 1850, y)
            ext.mode = 'FACES'
            _ext_in(ext, sc.outputs['Geometry'])
            links.new(gi.outputs['Depth Z0'], ext.inputs['Offset Scale'])
            try: ext.inputs['Individual'].default_value = True
            except (KeyError, TypeError): pass

            smat = mk(nodes, 'GeometryNodeSetMaterial', X0 + 2100, y)
            links.new(_geom_out(ext), smat.inputs['Geometry'])

        else:
            # ── ZONES 1-3: instancing pipeline ────────────────────────────
            # Tile mesh template
            tile = mk(nodes, 'GeometryNodeMeshGrid', X0 + 500, y + 250)
            tile.inputs['Vertices X'].default_value = 2
            tile.inputs['Vertices Y'].default_value = 2
            links.new(gi.outputs[WIDTH_KEYS[zi]],  tile.inputs['Size X'])
            links.new(gi.outputs[HEIGHT_KEYS[zi]], tile.inputs['Size Y'])

            # Per-zone grid subdivision + store face normals
            grid_sub = mk(nodes, 'GeometryNodeSubdivideMesh', X0 + 200, y - 200)
            try:    links.new(subdv.outputs['Mesh'], grid_sub.inputs['Mesh'])
            except KeyError: links.new(subdv.outputs[0], grid_sub.inputs[0])
            links.new(gi.outputs[GRID_KEYS[zi]], grid_sub.inputs['Level'])
            nrm_in   = mk(nodes, 'GeometryNodeInputNormal', X0 + 200, y - 380)
            grid_out = grid_sub.outputs['Mesh'] if 'Mesh' in grid_sub.outputs else grid_sub.outputs[0]
            store_fn = store_named(nodes, links, grid_out, 'fn',
                                   nrm_in.outputs['Normal'], 'FACE', 'FLOAT_VECTOR',
                                   x=X0 + 450, y=y - 200)

            # MeshToPoints FACES → one point per face centre
            mtp = mk(nodes, 'GeometryNodeMeshToPoints', X0 + 650, y)
            try: mtp.mode = 'FACES'
            except Exception: pass
            try:    links.new(store_fn.outputs[0], mtp.inputs['Mesh'])
            except KeyError:
                try: links.new(store_fn.outputs[0], mtp.inputs['Geometry'])
                except KeyError: links.new(store_fn.outputs[0], mtp.inputs[0])
            try:    links.new(lz.outputs['Value'], mtp.inputs['Selection'])
            except KeyError: links.new(lz.outputs['Value'], mtp.inputs[1])

            # Read stored face normal transferred to points
            nrm_rd = mk(nodes, 'GeometryNodeInputNamedAttribute', X0 + 850, y - 180)
            try:   nrm_rd.data_type = 'FLOAT_VECTOR'
            except Exception: pass
            try:   nrm_rd.inputs[0].default_value = 'fn'
            except Exception: pass

            # Orientation: align tile to surface normal
            up_v   = mk(nodes, 'ShaderNodeCombineXYZ', X0 + 850, y - 380)
            up_v.inputs['Z'].default_value = 1.0
            h_tang = mk(nodes, 'ShaderNodeVectorMath', X0 + 1050, y - 380)
            h_tang.operation = 'CROSS_PRODUCT'
            links.new(up_v.outputs[0],    h_tang.inputs[0])
            links.new(nrm_rd.outputs[0],  h_tang.inputs[1])

            align  = _mk_align(X0 + 1050, y - 200)
            align2 = _mk_align(X0 + 1300, y - 200)
            final_rot = None
            if align and align2:
                try: align.axis = 'Z'
                except Exception: pass
                try:    links.new(nrm_rd.outputs[0], align.inputs['Vector'])
                except KeyError: links.new(nrm_rd.outputs[0], align.inputs[2])
                try: align2.axis = 'X'
                except Exception: pass
                links.new(align.outputs[0], align2.inputs[0])
                try:    links.new(h_tang.outputs[0], align2.inputs['Vector'])
                except KeyError: links.new(h_tang.outputs[0], align2.inputs[2])
                final_rot = align2.outputs[0]

            # InstanceOnPoints
            iop = mk(nodes, 'GeometryNodeInstanceOnPoints', X0 + 850, y)
            try:    mtp_out = mtp.outputs['Points']
            except KeyError: mtp_out = mtp.outputs[0]
            try:    links.new(mtp_out, iop.inputs['Points'])
            except KeyError: links.new(mtp_out, iop.inputs[0])
            try:    links.new(tile.outputs['Mesh'], iop.inputs['Instance'])
            except KeyError: links.new(tile.outputs[0], iop.inputs['Instance'])
            if final_rot is not None:
                try:    links.new(final_rot, iop.inputs['Rotation'])
                except KeyError: links.new(final_rot, iop.inputs[5])

            try:    iop_out = iop.outputs['Instances']
            except KeyError: iop_out = iop.outputs[0]

            # Zone 3: tilt panels
            if zi == 3:
                tilt_v = mk(nodes, 'ShaderNodeCombineXYZ', X0 + 1050, y + 130)
                links.new(gi.outputs['Tilt X'], tilt_v.inputs['X'])
                links.new(gi.outputs['Tilt Y'], tilt_v.inputs['Y'])
                links.new(gi.outputs['Tilt Z'], tilt_v.inputs['Z'])
                rot_inst = mk(nodes, 'GeometryNodeRotateInstances', X0 + 1300, y)
                try:    links.new(iop_out, rot_inst.inputs['Instances'])
                except KeyError: links.new(iop_out, rot_inst.inputs[0])
                links.new(tilt_v.outputs['Vector'], rot_inst.inputs['Rotation'])
                try: rot_inst.inputs['Local Space'].default_value = True
                except (KeyError, TypeError): pass
                try:    realize_input = rot_inst.outputs['Instances']
                except KeyError: realize_input = rot_inst.outputs[0]
            else:
                realize_input = iop_out

            # Realize → gap scale → noise extrude
            real = mk(nodes, 'GeometryNodeRealizeInstances', X0 + 1550, y)
            links.new(realize_input, real.inputs['Geometry'])

            sc = mk(nodes, 'GeometryNodeScaleElements', X0 + 1750, y)
            sc.domain = 'FACE'
            links.new(real.outputs['Geometry'], sc.inputs['Geometry'])
            links.new(gap_sc,                   sc.inputs['Scale'])

            pos_e = mk(nodes, 'GeometryNodeInputPosition', X0 + 1750, y - 280)
            nse   = mk(nodes, 'ShaderNodeTexNoise',        X0 + 1950, y - 280)
            nse.noise_dimensions = '3D'
            nse.inputs['Detail'].default_value    = 4.0
            nse.inputs['Roughness'].default_value = 0.7
            links.new(pos_e.outputs['Position'],  nse.inputs['Vector'])
            links.new(gi.outputs['Height Noise'], nse.inputs['Scale'])
            depth_sc = mth(nodes, links, 'MULTIPLY', nse.outputs['Fac'],
                           b_out=gi.outputs[DEPTH_KEYS[zi]], x=X0 + 2200, y=y - 280)

            ext = mk(nodes, 'GeometryNodeExtrudeMesh', X0 + 2200, y)
            ext.mode = 'FACES'
            _ext_in(ext, sc.outputs['Geometry'])
            links.new(depth_sc, ext.inputs['Offset Scale'])
            try: ext.inputs['Individual'].default_value = True
            except (KeyError, TypeError): pass

            smat = mk(nodes, 'GeometryNodeSetMaterial', X0 + 2450, y)
            links.new(_geom_out(ext), smat.inputs['Geometry'])

        smat.inputs[2].default_value = mats[zi]
        geo_outputs.append(smat.outputs['Geometry'])

    # ── JOIN ──────────────────────────────────────────────────────────────
    join = mk(nodes, 'GeometryNodeJoinGeometry', 3400, 0)
    for g_out in geo_outputs: links.new(g_out, join.inputs['Geometry'])

    # ── DEBUG BRANCH (uses zone-boundary mesh, not grid mesh) ─────────────
    dbg_geom = subdv.outputs['Mesh']
    for zi in range(4):
        sdm = mk(nodes, 'GeometryNodeSetMaterial', 3400, -300 - zi * 180)
        sdm.inputs[2].default_value = debug_mats[zi]
        links.new(dbg_geom,      sdm.inputs['Geometry'])
        links.new(zone_sels[zi], sdm.inputs['Selection'])
        dbg_geom = sdm.outputs['Geometry']

    # ── SWITCH ────────────────────────────────────────────────────────────
    sw = mk(nodes, 'GeometryNodeSwitch', 3700, 0); sw.input_type = 'GEOMETRY'
    try:
        links.new(gi.outputs['Debug Maps'],  sw.inputs['Switch'])
        links.new(join.outputs['Geometry'],  sw.inputs['False'])
        links.new(dbg_geom,                  sw.inputs['True'])
        links.new(sw.outputs['Output'],      go.inputs['Geometry'])
    except KeyError:
        links.new(gi.outputs['Debug Maps'],  sw.inputs[0])
        links.new(join.outputs['Geometry'],  sw.inputs[1])
        links.new(dbg_geom,                  sw.inputs[2])
        links.new(sw.outputs[0],             go.inputs['Geometry'])

    return mod


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
src = bpy.context.active_object

if not src or src.type != 'MESH':
    print("[MeteorV7] ERROR: select a mesh object first.")
else:
    src.data.materials.clear()
    mats       = make_materials()
    debug_mats = make_debug_materials()
    for m in mats + debug_mats: src.data.materials.append(m)
    build(src, mats, debug_mats)
    bpy.context.view_layer.update()

    print(f"[MeteorV7] Done → '{src.name}'")
    print()
    print("  IMAGES ────────────────────────────────────────────────────────")
    print("  Shader Editor → GeoNode group → assign B&W images to IMG_A / IMG_B")
    print()
    print("  KEY PARAMETERS ─────────────────────────────────────────────────")
    print("  Grid Z0          — zone 0 panel density (v3 tiling: 4^N panels per face)")
    print("  Grid Z1..Z3      — face subdivision density for zones 1-3 instancing")
    print("  Width/Height Z1..Z3 — tile instance size for zones 1-3")
    print("  Tilt X/Y/Z       — zone 3 panel tilt rotation")
    print("  Boundary Detail  — zone-boundary accuracy (0-5)")
    print("  UV Scale A / B   — zone image tiling scale")
    print("  UV Offset A / B  — shift zone images")
    print("  Threshold        — zone balance (0.5 = equal)")
    print("  Gap Size         — joint between panels (0 = flush)")
    print("  Depth Z0..Z3     — max extrusion depth per zone (× noise)")
    print("  Height Noise     — noise frequency for depth variation")
    print("  Height Min/Max   — world Z bottom/top of building")
    print("  Gradient Start/End — height range where zone-0 transitions to image zones")
    print("  Debug Maps       — ON: R/G/B/Y zone preview  OFF: full panels")
