import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// CONFIG
// ==========================================
const CFG = {
    font: "Fragment Mono, monospace",
    mode: "A", // A = 3D network, B = 2D diagram
    cluster: {
        research: "#e05a6a",
        analysis: "#4fc0d6",
        output:   "#e8943a"
    },
    file: {
        png:  "#9a9a9a",
        glb:  "#4ec9d6",
        html: "#d4a44e",
        py:   "#5ec97a",
        pdf:  "#c94e9a",
        json: "#9ac94e",
        ttf:  "#c9c94e",
        md:   "#7a7a7a",
        js:   "#c9844e",
        gh:   "#7ac9c9",
        log:  "#666666",
        other:"#666666"
    },
    edge3D:    0.42,
    edge2D:    0.7,
    nodeR3D:   9,
    fileR3D:   2.2,
    satRange:  [38, 72],
    spring:    { len: 110, k: 0.022, rep: 1900, damp: 0.87 },
};

// ==========================================
// WORKFLOW NODES
// ==========================================
const RAW_NODES = [
    { id: "BRIEF",                 cl: "research" },
    { id: "SITE",                  cl: "research" },
    { id: "MEDIA",                 cl: "research" },
    { id: "TECHNOLOGIES",          cl: "research" },
    { id: "STONES RESEARCH",       cl: "research" },
    { id: "PATTERNS",              cl: "research" },
    { id: "ARTISTS",               cl: "research" },

    { id: "SITE ANALYSIS",         cl: "analysis" },
    { id: "MEDIA M. CONCEPT",      cl: "analysis" },
    { id: "PROGRAM",               cl: "analysis" },
    { id: "MASSING",               cl: "analysis" },
    { id: "STRUCTURE",             cl: "analysis" },
    { id: "SKIN",                  cl: "analysis" },
    { id: "PY SKIN GENERATOR",     cl: "analysis" },

    { id: "SITE MODEL",            cl: "output" },
    { id: "MEDIA PROJECT",         cl: "output" },
    { id: "PROJECT MODEL",         cl: "output" },
    { id: "DRAWINGS + DETAILS",    cl: "output" },
    { id: "PROJECT DATA",          cl: "output" },
    { id: "OPEN SOURCE",           cl: "output" },
    { id: "WEB INTERACTIVE MODEL", cl: "output" },
    { id: "UE ENVIRONMENT",        cl: "output" },
    { id: "UE ANIMATION",          cl: "output" }
];

const EDGES = [
    ["BRIEF","SITE"], ["BRIEF","MEDIA"], ["BRIEF","PROGRAM"], ["BRIEF","MEDIA M. CONCEPT"],
    ["MEDIA","TECHNOLOGIES"], ["MEDIA","ARTISTS"], ["MEDIA","PROGRAM"],
    ["TECHNOLOGIES","MEDIA M. CONCEPT"],
    ["MEDIA M. CONCEPT","MEDIA PROJECT"], ["MEDIA M. CONCEPT","PROGRAM"],
    ["SITE","SITE ANALYSIS"], ["SITE","SITE MODEL"],
    ["SITE ANALYSIS","MASSING"],
    ["SITE MODEL","SITE ANALYSIS"], ["SITE MODEL","WEB INTERACTIVE MODEL"], ["SITE MODEL","UE ENVIRONMENT"],
    ["PROGRAM","MASSING"], ["PROGRAM","STRUCTURE"], ["PROGRAM","PROJECT MODEL"], ["PROGRAM","MEDIA PROJECT"],
    ["MASSING","SKIN"], ["MASSING","STRUCTURE"],
    ["SKIN","PROJECT MODEL"],
    ["STRUCTURE","PROJECT MODEL"],
    ["MEDIA PROJECT","PROJECT MODEL"],
    ["PROJECT MODEL","DRAWINGS + DETAILS"], ["PROJECT MODEL","PROJECT DATA"], ["PROJECT MODEL","UE ANIMATION"],
    ["DRAWINGS + DETAILS","PROJECT DATA"],
    ["PROJECT DATA","OPEN SOURCE"],
    ["UE ENVIRONMENT","UE ANIMATION"],
    ["STONES RESEARCH","PATTERNS"],
    ["PATTERNS","PY SKIN GENERATOR"],
    ["PY SKIN GENERATOR","SKIN"]
];

// ==========================================
// FILE CATALOG — every project file
// ==========================================
const F = (n, ext, p) => ({ n, ext, p });

const FILES = [
    // ── BRIEF ────────────────────────────────
    F('README.md',                'md',   'BRIEF'),
    F('agents.md',                'md',   'BRIEF'),
    F('Meteor Facade v7 Workflow', 'pdf', 'BRIEF'),
    F('workflow_bw',              'pdf',  'BRIEF'),

    // ── TECHNOLOGIES ─────────────────────────
    F('test_click',               'py',   'TECHNOLOGIES'),

    // ── ARTISTS ──────────────────────────────
    F('artists_data',             'json', 'ARTISTS'),
    F('museums_data',             'json', 'ARTISTS'),
    F('fetch_artists',            'py',   'ARTISTS'),
    F('fetch_artists_enriched',   'py',   'ARTISTS'),
    F('fetch_artists_v3',         'py',   'ARTISTS'),
    F('fetch_artists_v4',         'py',   'ARTISTS'),
    F('fetch_artists_v5',         'py',   'ARTISTS'),
    F('fetch_museums',            'py',   'ARTISTS'),
    F('media_artists_map/app',    'js',   'ARTISTS'),
    F('media_artists_map/index',  'html', 'ARTISTS'),
    F('media_artists_map/styles', 'css',  'ARTISTS'),
    F('media_artists_map/earth',  'glb',  'ARTISTS'),

    // ── STONES RESEARCH ──────────────────────
    F('MM_antimony',              'png', 'STONES RESEARCH'),
    F('MM_antimony-pattern',      'png', 'STONES RESEARCH'),
    F('MM_bournonite',            'png', 'STONES RESEARCH'),
    F('MM_bournonite-pattern',    'png', 'STONES RESEARCH'),
    F('MM_carrollite',            'png', 'STONES RESEARCH'),
    F('MM_carrollite-pattern',    'png', 'STONES RESEARCH'),
    F('MM_galena',                'png', 'STONES RESEARCH'),
    F('MM_galena-pattern',        'png', 'STONES RESEARCH'),
    F('MM_hausmannite',           'png', 'STONES RESEARCH'),
    F('MM_hausmannite-pattern',   'png', 'STONES RESEARCH'),
    F('MM_vivianite',             'png', 'STONES RESEARCH'),
    F('MM_vivianite-pattern',     'png', 'STONES RESEARCH'),
    F('MR_brotyoidal_hematite',   'png', 'STONES RESEARCH'),
    F('MR_brotyoidal_hematite-p', 'png', 'STONES RESEARCH'),
    F('MR_lava_stone',            'png', 'STONES RESEARCH'),
    F('MR_lava_stone-texture',    'png', 'STONES RESEARCH'),
    F('MR_obsidian',              'png', 'STONES RESEARCH'),
    F('MR_obsidian-pattern',      'png', 'STONES RESEARCH'),
    F('MR_orbicular_granite',     'png', 'STONES RESEARCH'),
    F('MR_orbicular_granite-p',   'png', 'STONES RESEARCH'),
    F('MR_pahoehoe_lava',         'png', 'STONES RESEARCH'),
    F('MR_pahoehoe_lava-pattern', 'png', 'STONES RESEARCH'),
    F('MR_variolite',             'png', 'STONES RESEARCH'),
    F('MR_variolite-pattern',     'png', 'STONES RESEARCH'),
    F('M_Sikhote-Alin',           'png', 'STONES RESEARCH'),
    F('M_Sikhote-Alin-pattern',   'png', 'STONES RESEARCH'),
    F('M_gibeon_iron',            'png', 'STONES RESEARCH'),
    F('M_gibeon_iron-pattern',    'png', 'STONES RESEARCH'),
    F('M_pallasite',              'png', 'STONES RESEARCH'),
    F('M_pallasite-pattern',      'png', 'STONES RESEARCH'),
    F('stone_research/app',       'js',  'STONES RESEARCH'),
    F('stone_research/index',     'html','STONES RESEARCH'),

    // ── PATTERNS ─────────────────────────────
    F('botryoidal_hematite_cryst',  'png', 'PATTERNS'),
    F('galena_crystalline_01',      'png', 'PATTERNS'),
    F('galena_crystalline_02',      'png', 'PATTERNS'),
    F('galena_crystalline_03',      'png', 'PATTERNS'),
    F('hematite_iron_rose_cryst',   'png', 'PATTERNS'),
    F('hematite_specularite_01',    'png', 'PATTERNS'),
    F('hematite_specularite_02',    'png', 'PATTERNS'),
    F('hematite_crystalline_01',    'png', 'PATTERNS'),
    F('hematite_crystalline_02',    'png', 'PATTERNS'),
    F('hematite_crystalline_03',    'png', 'PATTERNS'),
    F('iron_met_octahedrite',       'png', 'PATTERNS'),
    F('iron_met_widmanstatten',     'png', 'PATTERNS'),
    F('magnetite_crystalline_01',   'png', 'PATTERNS'),
    F('magnetite_crystalline_02',   'png', 'PATTERNS'),
    F('obsidian_layered_01',        'png', 'PATTERNS'),
    F('obsidian_layered_02',        'png', 'PATTERNS'),
    F('orbicular_granite_01',       'png', 'PATTERNS'),
    F('orbicular_granite_02',       'png', 'PATTERNS'),
    F('pahoehoe_lava_layered',      'png', 'PATTERNS'),
    F('pallasite_crystalline',      'png', 'PATTERNS'),
    F('scoria_crystalline',         'png', 'PATTERNS'),
    F('specular_hematite_cryst',    'png', 'PATTERNS'),
    F('stibnite_crystalline',       'png', 'PATTERNS'),

    // ── MASSING ──────────────────────────────
    ...['8d2954b4','39d31a2f','1f32a0eb','2c44d88d',
        'e4a6f740_3','e4a6f740_2','54c3993d_2','54c3993d_3','54c3993d_0',
        '572abb2f','14a73319_1','14a73319_3','7c9118b7_2','7c9118b7_1','7c9118b7_0',
        'aa527ed3','808b82a3','0ffa09ac','7ff14975_0','7ff14975_3',
        '0a85f838_1','0a85f838_0','dc044840_0','dc044840_3','2dcb6457',
        '756ad7c6','7c7ffca8','4764f528','e4a39a39','6f104ec0',
        'a4840761','3711fc3d_2','3711fc3d_3','b6abea8f','ab473aae',
        'dc6f3a96_2','dc6f3a96_1','7ca46ddb','d1bed81e','015d8959',
        'ab3d3e20','0d2e662d'
    ].map(id => F(`mj_${id}`, 'png', 'MASSING')),
    F('HYPEROBJECT_midterm/mass',     'glb', 'MASSING'),

    // ── SKIN ─────────────────────────────────
    F('galena-carrollite_v7-mat',    'png', 'SKIN'),
    F('galena-pallasite_fail_v7-mat','png', 'SKIN'),
    F('galena-pallasite_fail_v7',    'png', 'SKIN'),
    F('galena-pallasite_v7-mat',     'png', 'SKIN'),
    F('galena-pallasite_v7',         'png', 'SKIN'),
    F('hematite-granite_v8-mat',     'png', 'SKIN'),
    F('hematite-granite_v8',         'png', 'SKIN'),
    F('hematite-obsidian_v8-mat',    'png', 'SKIN'),
    F('hematite-obsidian_v8',        'png', 'SKIN'),
    F('obsidian-antimony_v7-mat',    'png', 'SKIN'),
    F('obsidian-antimony_v7',        'png', 'SKIN'),
    F('sk_4z_00_mat_side',           'png', 'SKIN'),
    F('sk_4z_00_side',               'png', 'SKIN'),
    F('sk_4z_01_mat-side',           'png', 'SKIN'),
    F('sk_4z_01_side',               'png', 'SKIN'),
    F('sk_rnd_01_mat-side',          'png', 'SKIN'),
    F('sk_rnd_01_side',              'png', 'SKIN'),
    F('test-test_v8-mat',            'png', 'SKIN'),
    F('test-test_v8',                'png', 'SKIN'),
    F('260303_exploded-skin',        'glb', 'SKIN'),

    // ── PY SKIN GENERATOR ────────────────────
    F('postprocess',                  'py',  'PY SKIN GENERATOR'),
    F('open_source/Meteor_facade_v7', 'py',  'PY SKIN GENERATOR'),
    F('open_source/srf_analysis',     'gh',  'PY SKIN GENERATOR'),

    // ── SITE MODEL ───────────────────────────
    F('G11_hyperobject',             'glb', 'SITE MODEL'),
    F('buildings',                   'glb', 'SITE MODEL'),
    F('cold_storage',                'glb', 'SITE MODEL'),
    F('dsr',                         'glb', 'SITE MODEL'),
    F('highline',                    'glb', 'SITE MODEL'),
    F('hy_new_dev',                  'glb', 'SITE MODEL'),
    F('mn04_building',               'glb', 'SITE MODEL'),
    F('railroads',                   'glb', 'SITE MODEL'),
    F('site_building',               'glb', 'SITE MODEL'),
    F('street',                      'glb', 'SITE MODEL'),
    F('street_props',                'glb', 'SITE MODEL'),
    F('subway_system',               'glb', 'SITE MODEL'),
    F('terrain',                     'glb', 'SITE MODEL'),
    F('HYPEROBJECT_midterm/site',    'glb', 'SITE MODEL'),
    F('HYPEROBJECT_midterm/streets', 'glb', 'SITE MODEL'),

    // ── STRUCTURE ────────────────────────────
    F('260303_exploded-structure',   'glb', 'STRUCTURE'),

    // ── MEDIA M. CONCEPT ─────────────────────
    F('HYPEROBJECT_midterm/blueprint','html','MEDIA M. CONCEPT'),

    // ── PROGRAM ──────────────────────────────
    F('HYPEROBJECT_midterm/diagnostic_ui','html','PROGRAM'),
    F('HYPEROBJECT_midterm/contorller',   'html','PROGRAM'),
    F('HYPEROBJECT_midterm/index-contorller','html','PROGRAM'),
    F('HYPEROBJECT_midterm/program',      'glb', 'PROGRAM'),

    // ── MEDIA PROJECT ────────────────────────
    F('260303_exploded-media',       'glb', 'MEDIA PROJECT'),

    // ── PROJECT MODEL ────────────────────────
    F('HYPEROBJECT_midterm/exploded_diagram','html','PROJECT MODEL'),
    F('HYPEROBJECT_midterm/index',   'html','PROJECT MODEL'),
    F('HYPEROBJECT_midterm/space',   'glb', 'PROJECT MODEL'),
    F('260303_exploded-circulation', 'glb', 'PROJECT MODEL'),
    F('260303_exploded-interiors',   'glb', 'PROJECT MODEL'),
    F('260303_exploded-machinary',   'glb', 'PROJECT MODEL'),

    // ── OPEN SOURCE ──────────────────────────
    F('open_source/meteor_facade_workflow','html','OPEN SOURCE'),
    F('open_source/workflow',        'html','OPEN SOURCE'),
    F('Fragment_Mono/OFL',           'txt', 'OPEN SOURCE'),

    // ── WEB INTERACTIVE MODEL ────────────────
    F('index',                       'html','WEB INTERACTIVE MODEL'),
    F('app',                         'js',  'WEB INTERACTIVE MODEL'),
    F('styles',                      'css', 'WEB INTERACTIVE MODEL'),
    F('Fragment_Mono/FragmentMono-Regular', 'ttf','WEB INTERACTIVE MODEL'),
    F('Fragment_Mono/FragmentMono-Italic',  'ttf','WEB INTERACTIVE MODEL'),
    F('HYPEROBJECT_midterm/index.controller','other','WEB INTERACTIVE MODEL'),
    F('server',                      'log', 'WEB INTERACTIVE MODEL'),
    ...Array.from({length:17}, (_,i) =>
        F(i===0 ? 'fix_app' : `fix_app_${i+1}`, 'js', 'WEB INTERACTIVE MODEL')
    ),
];

// ==========================================
// DEPTH / DEGREE PRECOMPUTE
// ==========================================
function computeDepths() {
    const inDeg = {}, adj = {}, d = {};
    RAW_NODES.forEach(n => { inDeg[n.id]=0; adj[n.id]=[]; d[n.id]=0; });
    EDGES.forEach(([s,t]) => { adj[s].push(t); inDeg[t]++; });
    let q = RAW_NODES.filter(n => inDeg[n.id]===0).map(n => n.id);
    while (q.length) {
        const u = q.shift();
        adj[u].forEach(v => {
            d[v] = Math.max(d[v], d[u]+1);
            if (--inDeg[v]===0) q.push(v);
        });
    }
    return d;
}
const DEPTHS = computeDepths();

const DEGREE = {};
RAW_NODES.forEach(n => DEGREE[n.id]=0);
EDGES.forEach(([s,t]) => { DEGREE[s]=(DEGREE[s]||0)+1; DEGREE[t]=(DEGREE[t]||0)+1; });

// ==========================================
// 2D LAYOUT — cluster columns
// ==========================================
function compute2DPos() {
    const cols = { research: -290, analysis: 0, output: 290 };
    const byCluster = { research:[], analysis:[], output:[] };
    RAW_NODES.forEach(n => byCluster[n.cl].push(n.id));
    const pos = {};
    Object.entries(byCluster).forEach(([cl, ids]) => {
        const x = cols[cl];
        const span = 500;
        ids.forEach((id, i) => {
            const y = ids.length > 1 ? -span/2 + (i/(ids.length-1))*span : 0;
            pos[id] = new THREE.Vector3(x, -y, 0);
        });
    });
    return pos;
}
const POS2D = compute2DPos();

// ==========================================
// RUNTIME
// ==========================================
let scene, camera, renderer, controls, grid2D;
let nodesData = [], fileNodesData = [], edgesData = [];
let tProgress = 0, currentMode = CFG.mode;
let hoveredNode = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let labelsContainer;
const clock = new THREE.Clock();

// ==========================================
// INIT THREE
// ==========================================
function initThree() {
    const canvas = document.getElementById('c');
    labelsContainer = document.getElementById('labels-container');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 8000);
    camera.position.set(0, 0, 650);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 60;
    controls.maxDistance = 2500;

    // 2D grid (XY plane, shows only in diagram mode)
    grid2D = new THREE.GridHelper(5000, 100, 0x000000, 0x000000);
    grid2D.material.opacity = 0.07;
    grid2D.material.transparent = true;
    grid2D.rotation.x = Math.PI / 2;
    grid2D.visible = false;
    scene.add(grid2D);

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
}

function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// BUILD GRAPH
// ==========================================
function buildGraph() {
    const clAng = { research: 0, analysis: Math.PI*0.72, output: Math.PI*1.44 };
    const nodeGeo = new THREE.SphereGeometry(1, 16, 16);
    const fileGeo = new THREE.SphereGeometry(1,  8,  8);

    // ── Workflow nodes ──────────────────────
    RAW_NODES.forEach(n => {
        const ang = clAng[n.cl] + (Math.random()-0.5)*1.1;
        const r   = 145 + Math.random()*180;
        const x3d = Math.cos(ang)*r;
        const y3d = Math.sin(ang)*r;
        const z3d = (Math.random()-0.5)*340;

        const color = new THREE.Color(CFG.cluster[n.cl]);
        const mesh  = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(x3d, y3d, z3d);
        scene.add(mesh);

        const label = document.createElement('div');
        label.className = 'node-label';
        label.textContent = n.id;
        label.style.cssText = `position:absolute;pointer-events:none;
            font-family:${CFG.font};font-size:11px;color:#fff;
            white-space:nowrap;letter-spacing:0.12em;text-transform:uppercase;`;
        labelsContainer.appendChild(label);

        nodesData.push({
            id: n.id, cl: n.cl, mesh, labelDom: label,
            pos3D: new THREE.Vector3(x3d, y3d, z3d),
            pos2D: POS2D[n.id].clone(),
            vx:0, vy:0, vz:0,
            baseColor: color.clone(),
            degree: DEGREE[n.id]
        });
    });

    // ── Workflow edges ──────────────────────
    const edgeMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:CFG.edge3D });
    EDGES.forEach(([sid, tid]) => {
        const s = nodesData.find(n => n.id===sid);
        const t = nodesData.find(n => n.id===tid);
        if (!s||!t) return;
        const pts = new Float32Array(6);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        geo.setDrawRange(0, 2);
        const line = new THREE.Line(geo, edgeMat.clone());
        scene.add(line);
        edgesData.push({ s, t, line, mat: line.material });
    });

    // ── File satellites ──────────────────────
    // Pre-group file counts per parent for fibonacci distribution
    const groupCounts = {};
    FILES.forEach(f => { groupCounts[f.p] = (groupCounts[f.p]||0)+1; });
    const groupIdx = {};
    FILES.forEach(f => { groupIdx[f.p] = (groupIdx[f.p]||0); });

    const PHI = (1+Math.sqrt(5))/2;

    FILES.forEach((f) => {
        const parent = nodesData.find(n => n.id===f.p);
        if (!parent) return;

        // Fibonacci sphere placement
        const total = groupCounts[f.p];
        const idx   = groupIdx[f.p]++;
        const theta = 2*Math.PI*idx/PHI;
        const phi   = Math.acos(1 - 2*(idx+0.5)/total);
        const [rMin, rMax] = CFG.satRange;
        const r = rMin + (idx/total)*(rMax-rMin);

        const offset = new THREE.Vector3(
            Math.sin(phi)*Math.cos(theta)*r,
            Math.sin(phi)*Math.sin(theta)*r,
            Math.cos(phi)*r*0.55
        );

        const col  = new THREE.Color(CFG.file[f.ext]||CFG.file.other);
        const mesh = new THREE.Mesh(fileGeo, new THREE.MeshBasicMaterial({ color: col.clone() }));
        mesh.position.set(parent.pos3D.x+offset.x, parent.pos3D.y+offset.y, parent.pos3D.z+offset.z);
        mesh.scale.setScalar(CFG.fileR3D);
        scene.add(mesh);

        const label = document.createElement('div');
        label.className = 'file-label';
        const displayName = f.n.length>24 ? f.n.slice(0,22)+'..' : f.n;
        label.textContent = displayName + '.' + f.ext;
        label.style.cssText = `position:absolute;pointer-events:none;display:none;
            font-family:${CFG.font};font-size:7px;white-space:nowrap;
            letter-spacing:0.05em;color:${CFG.file[f.ext]||CFG.file.other};opacity:0;`;
        labelsContainer.appendChild(label);

        fileNodesData.push({
            name: f.n+'.'+f.ext, ext: f.ext,
            parent, mesh, labelDom: label,
            offset: offset.clone(),
            phase: Math.random()*Math.PI*2,
            baseColor: col.clone(),
            pos3D: new THREE.Vector3()
        });
    });
}

// ==========================================
// PHYSICS — workflow nodes only
// ==========================================
function updatePhysics() {
    if (tProgress > 0.04) return;
    const { len, k, rep, damp } = CFG.spring;
    const clAng = { research:0, analysis:Math.PI*0.72, output:Math.PI*1.44 };

    for (let i=0; i<nodesData.length; i++) {
        for (let j=i+1; j<nodesData.length; j++) {
            const a=nodesData[i], b=nodesData[j];
            const dx=a.pos3D.x-b.pos3D.x, dy=a.pos3D.y-b.pos3D.y, dz=a.pos3D.z-b.pos3D.z;
            const d2=dx*dx+dy*dy+dz*dz;
            if (d2<1||d2>180000) continue;
            const d=Math.sqrt(d2), f=rep/d2;
            const fx=(dx/d)*f, fy=(dy/d)*f, fz=(dz/d)*f;
            a.vx+=fx; a.vy+=fy; a.vz+=fz;
            b.vx-=fx; b.vy-=fy; b.vz-=fz;
        }
    }
    edgesData.forEach(e => {
        const s=e.s, t=e.t;
        const dx=t.pos3D.x-s.pos3D.x, dy=t.pos3D.y-s.pos3D.y, dz=t.pos3D.z-s.pos3D.z;
        const d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
        const f=(d-len)*k;
        const fx=(dx/d)*f, fy=(dy/d)*f, fz=(dz/d)*f;
        s.vx+=fx; s.vy+=fy; s.vz+=fz;
        t.vx-=fx; t.vy-=fy; t.vz-=fz;
    });
    nodesData.forEach(n => {
        const ang=clAng[n.cl];
        n.vx+=(Math.cos(ang)*165-n.pos3D.x)*0.0007;
        n.vy+=(Math.sin(ang)*165-n.pos3D.y)*0.0007;
        n.vz+=(0-n.pos3D.z)*0.0007;
        n.pos3D.x+=n.vx; n.pos3D.y+=n.vy; n.pos3D.z+=n.vz;
        n.vx*=damp; n.vy*=damp; n.vz*=damp;
    });
}

// ==========================================
// LABEL PROJECTION
// ==========================================
function projectLabel(el, worldPos, offsetY=0) {
    const hw=window.innerWidth/2, hh=window.innerHeight/2;
    const p = worldPos.clone();
    p.project(camera);
    if (p.z>1) { el.style.display='none'; return false; }
    el.style.display='block';
    el.style.left=`${p.x*hw+hw}px`;
    el.style.top =`${-p.y*hh+hh+offsetY}px`;
    return true;
}

// ==========================================
// RENDER LOOP
// ==========================================
function render() {
    requestAnimationFrame(render);
    controls.update();
    updatePhysics();

    const t = tProgress;
    const target = currentMode==='A' ? 0 : 1;
    tProgress += (target-tProgress)*0.046;
    const is2D = tProgress > 0.5;
    const time  = clock.getElapsedTime();

    // Toggle controls based on mode
    controls.enableRotate = !is2D;
    grid2D.visible = is2D;

    renderer.setClearColor(is2D ? 0xf2f2f2 : 0x000000, 1);

    // ── Workflow nodes ──────────────────────
    nodesData.forEach(n => {
        n.mesh.position.lerpVectors(n.pos3D, n.pos2D, tProgress);

        const baseR = is2D ? 5 : (CFG.nodeR3D + n.degree*0.9);
        const isHov = n===hoveredNode;
        n.mesh.scale.setScalar(isHov ? baseR*1.7 : baseR);

        if (is2D) {
            n.mesh.visible = false;
            n.labelDom.style.color      = isHov ? '#ffffff' : '#000000';
            n.labelDom.style.background = isHov ? '#000000' : '#ffffff';
            n.labelDom.style.border     = '1px solid #111111';
            n.labelDom.style.padding    = '4px 10px';
            n.labelDom.style.borderRadius = '0';
            n.labelDom.style.fontSize   = '9px';
            n.labelDom.style.letterSpacing = '0.14em';
        } else {
            n.mesh.visible = true;
            if (isHov) {
                n.mesh.material.color.set(0xffffff);
            } else {
                n.mesh.material.color.copy(n.baseColor);
            }
            n.labelDom.style.color      = isHov ? '#ffffff' : '#ffffff';
            n.labelDom.style.background = 'transparent';
            n.labelDom.style.border     = 'none';
            n.labelDom.style.padding    = '0';
            n.labelDom.style.borderRadius = '0';
            n.labelDom.style.fontSize   = '11px';
            n.labelDom.style.letterSpacing = '0.12em';
        }

        const sc = is2D ? 0.75 : Math.max(0.35, 1-(n.mesh.position.distanceTo(camera.position)/1400));
        projectLabel(n.labelDom, n.mesh.position, is2D ? 0 : 18);
        n.labelDom.style.transform = `translate(-50%,${is2D?'-50%':'0'}) scale(${sc})`;
    });

    // ── File satellites ──────────────────────
    const camZ = camera.position.z;
    fileNodesData.forEach(f => {
        if (is2D) {
            f.mesh.visible = false;
            f.labelDom.style.display = 'none';
            return;
        }
        f.mesh.visible = true;

        // Follow parent + gentle float
        const osc = Math.sin(time*0.35+f.phase)*1.3;
        f.mesh.position.set(
            f.parent.pos3D.x + f.offset.x + osc,
            f.parent.pos3D.y + f.offset.y + Math.cos(time*0.28+f.phase)*1.3,
            f.parent.pos3D.z + f.offset.z
        );
        f.pos3D.copy(f.mesh.position);

        const isParentHov = f.parent===hoveredNode;
        if (isParentHov) {
            f.mesh.material.color.set(0xffffff);
            f.mesh.scale.setScalar(3.2);
        } else {
            f.mesh.material.color.copy(f.baseColor);
            f.mesh.scale.setScalar(CFG.fileR3D);
        }

        // Label: visible only when zoomed in
        const distToCam = camera.position.distanceTo(f.mesh.position);
        const labelAlpha = Math.max(0, Math.min(1, (420-distToCam)/220));
        if (labelAlpha > 0.02) {
            f.labelDom.style.opacity = String(labelAlpha*0.9);
            const visible = projectLabel(f.labelDom, f.mesh.position, -6);
            if (visible) {
                f.labelDom.style.transform = 'translate(-50%,-100%)';
            }
        } else {
            f.labelDom.style.display = 'none';
        }
    });

    // ── Workflow edges ──────────────────────
    edgesData.forEach(e => {
        const pS = e.s.mesh.position;
        const pT = e.t.mesh.position;
        const arr = e.line.geometry.attributes.position.array;
        arr[0]=pS.x; arr[1]=pS.y; arr[2]=pS.z;
        arr[3]=pT.x; arr[4]=pT.y; arr[5]=pT.z;
        e.line.geometry.attributes.position.needsUpdate = true;

        const isHov = e.s===hoveredNode || e.t===hoveredNode;
        if (is2D) {
            e.mat.color.set(isHov ? 0xCA8A04 : 0x111111);
            e.mat.opacity = isHov ? 1 : CFG.edge2D;
        } else {
            e.mat.color.set(isHov ? 0xCA8A04 : 0xffffff);
            e.mat.opacity = isHov ? 1 : CFG.edge3D;
        }
    });

    renderer.render(scene, camera);
}

// ==========================================
// HOVER
// ==========================================
function onMouseMove(e) {
    mouse.x =  (e.clientX/window.innerWidth )*2-1;
    mouse.y = -(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(nodesData.map(n => n.mesh));
    hoveredNode = hits.length > 0
        ? nodesData.find(n => n.mesh===hits[0].object) || null
        : null;
    document.body.style.cursor = hoveredNode ? 'pointer' : 'crosshair';
    updateHUD();
}

// ==========================================
// CLICK
// ==========================================
function onClick(e) {
    if (e.target.id==='toggleBtn') return;
    if (!hoveredNode) return;
    const id = hoveredNode.id;
    const nav = {
        "PROJECT MODEL":    "./HYPEROBJECT_midterm/exploded_diagram.html",
        "MEDIA M. CONCEPT": "./HYPEROBJECT_midterm/blueprint.html",
        "PROGRAM":          "./HYPEROBJECT_midterm/diagnostic_ui.html",
        "ARTISTS":          "./media_artists_map/index.html"
    };
    window.location.href = nav[id] || ('.' + id.toLowerCase().replace(/\s+/g,'_') + '/');
}

// ==========================================
// HUD
// ==========================================
function updateHUD() {
    document.getElementById('hud-mode').innerText = currentMode==='A' ? 'NETWORK_3D' : 'DIAGRAM_2D';
    const trg  = document.getElementById('hud-target');
    const clus = document.getElementById('hud-cluster');
    if (hoveredNode) {
        trg.innerText=hoveredNode.id; trg.classList.add('active');
        clus.innerText=hoveredNode.cl.toUpperCase();
    } else {
        trg.innerText='---'; trg.classList.remove('active');
        clus.innerText='---';
    }
    const c = document.getElementById('hud-coords');
    if (c) c.innerText=`${camera.position.x.toFixed(0)} / ${camera.position.y.toFixed(0)}`;
}

// ==========================================
// BOOT
// ==========================================
window.onload = () => {
    initThree();
    buildGraph();

    document.getElementById('toggleBtn').addEventListener('click', () => {
        currentMode = currentMode==='A' ? 'B' : 'A';
        document.body.classList.toggle('mode-diagram', currentMode==='B');
        updateHUD();
    });

    updateHUD();
    render();
};
