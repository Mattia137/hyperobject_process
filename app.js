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
        output: "#e8943a"
    },
    file: {
        png: "#9a9a9a",
        glb: "#4ec9d6",
        html: "#d4a44e",
        py: "#5ec97a",
        pdf: "#c94e9a",
        json: "#9ac94e",
        ttf: "#c9c94e",
        md: "#7a7a7a",
        js: "#c9844e",
        gh: "#7ac9c9",
        log: "#666666",
        other: "#666666"
    },
    edge3D: 0.42,
    nodeR3D: 9,
    fileR3D: 2.2,
    satRange: [38, 72],
    spring: { len: 110, k: 0.022, rep: 1900, damp: 0.87 },
};

// ==========================================
// WORKFLOW NODES
// ==========================================
const RAW_NODES = [
    { id: "BRIEF", cl: "research", type: "tertiary" },
    { id: "SITE", cl: "research", type: "tertiary" },
    { id: "MEDIA", cl: "research", type: "tertiary" },
    { id: "TECHNOLOGIES", cl: "research", type: "tertiary" },
    { id: "STONES RESEARCH", cl: "research", type: "tertiary" },
    { id: "PATTERNS", cl: "research", type: "tertiary" },
    { id: "ARTISTS", cl: "research", type: "tertiary" },

    { id: "SITE ANALYSIS", cl: "analysis", type: "secondary" },
    { id: "MEDIA M. CONCEPT", cl: "analysis", type: "secondary" },
    { id: "PROGRAM", cl: "analysis", type: "secondary" },
    { id: "MASSING", cl: "analysis", type: "secondary" },
    { id: "STRUCTURE", cl: "analysis", type: "secondary" },
    { id: "SKIN", cl: "analysis", type: "secondary" },
    { id: "PY SKIN GENERATOR", cl: "analysis", type: "secondary" },

    { id: "SITE MODEL", cl: "output", type: "primary" },
    { id: "MEDIA PROJECT", cl: "output", type: "primary" },
    { id: "PROJECT MODEL", cl: "output", type: "primary" },
    { id: "DRAWINGS + DETAILS", cl: "output", type: "primary" },
    { id: "PROJECT DATA", cl: "output", type: "primary" },
    { id: "OPEN SOURCE", cl: "output", type: "primary" },
    { id: "WEB INTERACTIVE MODEL", cl: "output", type: "primary" },
    { id: "UE ENVIRONMENT", cl: "output", type: "primary" },
    { id: "UE ANIMATION", cl: "output", type: "primary" }
];

const EDGES = [
    ["BRIEF", "SITE"], ["BRIEF", "MEDIA"], ["BRIEF", "PROGRAM"], ["BRIEF", "MEDIA M. CONCEPT"],
    ["MEDIA", "TECHNOLOGIES"], ["MEDIA", "ARTISTS"], ["MEDIA", "PROGRAM"],
    ["TECHNOLOGIES", "MEDIA M. CONCEPT"],
    ["MEDIA M. CONCEPT", "MEDIA PROJECT"], ["MEDIA M. CONCEPT", "PROGRAM"],
    ["SITE", "SITE ANALYSIS"], ["SITE", "SITE MODEL"],
    ["SITE ANALYSIS", "MASSING"],
    ["SITE MODEL", "SITE ANALYSIS"], ["SITE MODEL", "WEB INTERACTIVE MODEL"], ["SITE MODEL", "UE ENVIRONMENT"],
    ["PROGRAM", "MASSING"], ["PROGRAM", "STRUCTURE"], ["PROGRAM", "PROJECT MODEL"], ["PROGRAM", "MEDIA PROJECT"],
    ["MASSING", "SKIN"], ["MASSING", "STRUCTURE"],
    ["SKIN", "PROJECT MODEL"],
    ["STRUCTURE", "PROJECT MODEL"],
    ["MEDIA PROJECT", "PROJECT MODEL"],
    ["PROJECT MODEL", "DRAWINGS + DETAILS"], ["PROJECT MODEL", "PROJECT DATA"], ["PROJECT MODEL", "UE ANIMATION"],
    ["DRAWINGS + DETAILS", "PROJECT DATA"],
    ["PROJECT DATA", "OPEN SOURCE"],
    ["UE ENVIRONMENT", "UE ANIMATION"],
    ["STONES RESEARCH", "PATTERNS"],
    ["PATTERNS", "PY SKIN GENERATOR"],
    ["PY SKIN GENERATOR", "SKIN"]
];

// ==========================================
// FILE CATALOG — every project file
// ==========================================
const F = (n, ext, p) => ({ n, ext, p });

const FILES = [
    // ── BRIEF ────────────────────────────────
    F('README.md', 'md', 'BRIEF'),
    F('agents.md', 'md', 'BRIEF'),
    F('Meteor Facade v7 Workflow', 'pdf', 'BRIEF'),
    F('workflow_bw', 'pdf', 'BRIEF'),

    // ── TECHNOLOGIES ─────────────────────────
    F('test_click', 'py', 'TECHNOLOGIES'),

    // ── ARTISTS ──────────────────────────────
    F('artists_data', 'json', 'ARTISTS'),
    F('museums_data', 'json', 'ARTISTS'),
    F('fetch_artists', 'py', 'ARTISTS'),
    F('fetch_artists_enriched', 'py', 'ARTISTS'),
    F('fetch_artists_v3', 'py', 'ARTISTS'),
    F('fetch_artists_v4', 'py', 'ARTISTS'),
    F('fetch_artists_v5', 'py', 'ARTISTS'),
    F('fetch_museums', 'py', 'ARTISTS'),
    F('media_artists_map/app', 'js', 'ARTISTS'),
    F('media_artists_map/index', 'html', 'ARTISTS'),
    F('media_artists_map/styles', 'css', 'ARTISTS'),
    F('media_artists_map/earth', 'glb', 'ARTISTS'),

    // ── STONES RESEARCH ──────────────────────
    F('MM_antimony', 'png', 'STONES RESEARCH'),
    F('MM_antimony-pattern', 'png', 'STONES RESEARCH'),
    F('MM_bournonite', 'png', 'STONES RESEARCH'),
    F('MM_bournonite-pattern', 'png', 'STONES RESEARCH'),
    F('MM_carrollite', 'png', 'STONES RESEARCH'),
    F('MM_carrollite-pattern', 'png', 'STONES RESEARCH'),
    F('MM_galena', 'png', 'STONES RESEARCH'),
    F('MM_galena-pattern', 'png', 'STONES RESEARCH'),
    F('MM_hausmannite', 'png', 'STONES RESEARCH'),
    F('MM_hausmannite-pattern', 'png', 'STONES RESEARCH'),
    F('MM_vivianite', 'png', 'STONES RESEARCH'),
    F('MM_vivianite-pattern', 'png', 'STONES RESEARCH'),
    F('MR_brotyoidal_hematite', 'png', 'STONES RESEARCH'),
    F('MR_brotyoidal_hematite-p', 'png', 'STONES RESEARCH'),
    F('MR_lava_stone', 'png', 'STONES RESEARCH'),
    F('MR_lava_stone-texture', 'png', 'STONES RESEARCH'),
    F('MR_obsidian', 'png', 'STONES RESEARCH'),
    F('MR_obsidian-pattern', 'png', 'STONES RESEARCH'),
    F('MR_orbicular_granite', 'png', 'STONES RESEARCH'),
    F('MR_orbicular_granite-p', 'png', 'STONES RESEARCH'),
    F('MR_pahoehoe_lava', 'png', 'STONES RESEARCH'),
    F('MR_pahoehoe_lava-pattern', 'png', 'STONES RESEARCH'),
    F('MR_variolite', 'png', 'STONES RESEARCH'),
    F('MR_variolite-pattern', 'png', 'STONES RESEARCH'),
    F('M_Sikhote-Alin', 'png', 'STONES RESEARCH'),
    F('M_Sikhote-Alin-pattern', 'png', 'STONES RESEARCH'),
    F('M_gibeon_iron', 'png', 'STONES RESEARCH'),
    F('M_gibeon_iron-pattern', 'png', 'STONES RESEARCH'),
    F('M_pallasite', 'png', 'STONES RESEARCH'),
    F('M_pallasite-pattern', 'png', 'STONES RESEARCH'),
    F('stone_research/app', 'js', 'STONES RESEARCH'),
    F('stone_research/index', 'html', 'STONES RESEARCH'),

    // ── PATTERNS ─────────────────────────────
    F('botryoidal_hematite_cryst', 'png', 'PATTERNS'),
    F('galena_crystalline_01', 'png', 'PATTERNS'),
    F('galena_crystalline_02', 'png', 'PATTERNS'),
    F('galena_crystalline_03', 'png', 'PATTERNS'),
    F('hematite_iron_rose_cryst', 'png', 'PATTERNS'),
    F('hematite_specularite_01', 'png', 'PATTERNS'),
    F('hematite_specularite_02', 'png', 'PATTERNS'),
    F('hematite_crystalline_01', 'png', 'PATTERNS'),
    F('hematite_crystalline_02', 'png', 'PATTERNS'),
    F('hematite_crystalline_03', 'png', 'PATTERNS'),
    F('iron_met_octahedrite', 'png', 'PATTERNS'),
    F('iron_met_widmanstatten', 'png', 'PATTERNS'),
    F('magnetite_crystalline_01', 'png', 'PATTERNS'),
    F('magnetite_crystalline_02', 'png', 'PATTERNS'),
    F('obsidian_layered_01', 'png', 'PATTERNS'),
    F('obsidian_layered_02', 'png', 'PATTERNS'),
    F('orbicular_granite_01', 'png', 'PATTERNS'),
    F('orbicular_granite_02', 'png', 'PATTERNS'),
    F('pahoehoe_lava_layered', 'png', 'PATTERNS'),
    F('pallasite_crystalline', 'png', 'PATTERNS'),
    F('scoria_crystalline', 'png', 'PATTERNS'),
    F('specular_hematite_cryst', 'png', 'PATTERNS'),
    F('stibnite_crystalline', 'png', 'PATTERNS'),

    // ── MASSING ──────────────────────────────
    ...['8d2954b4', '39d31a2f', '1f32a0eb', '2c44d88d',
        'e4a6f740_3', 'e4a6f740_2', '54c3993d_2', '54c3993d_3', '54c3993d_0',
        '572abb2f', '14a73319_1', '14a73319_3', '7c9118b7_2', '7c9118b7_1', '7c9118b7_0',
        'aa527ed3', '808b82a3', '0ffa09ac', '7ff14975_0', '7ff14975_3',
        '0a85f838_1', '0a85f838_0', 'dc044840_0', 'dc044840_3', '2dcb6457',
        '756ad7c6', '7c7ffca8', '4764f528', 'e4a39a39', '6f104ec0',
        'a4840761', '3711fc3d_2', '3711fc3d_3', 'b6abea8f', 'ab473aae',
        'dc6f3a96_2', 'dc6f3a96_1', '7ca46ddb', 'd1bed81e', '015d8959',
        'ab3d3e20', '0d2e662d'
    ].map(id => F(`mj_${id}`, 'png', 'MASSING')),
    F('HYPEROBJECT_midterm/mass', 'glb', 'MASSING'),

    // ── SKIN ─────────────────────────────────
    F('galena-carrollite_v7-mat', 'png', 'SKIN'),
    F('galena-pallasite_fail_v7-mat', 'png', 'SKIN'),
    F('galena-pallasite_fail_v7', 'png', 'SKIN'),
    F('galena-pallasite_v7-mat', 'png', 'SKIN'),
    F('galena-pallasite_v7', 'png', 'SKIN'),
    F('hematite-granite_v8-mat', 'png', 'SKIN'),
    F('hematite-granite_v8', 'png', 'SKIN'),
    F('hematite-obsidian_v8-mat', 'png', 'SKIN'),
    F('hematite-obsidian_v8', 'png', 'SKIN'),
    F('obsidian-antimony_v7-mat', 'png', 'SKIN'),
    F('obsidian-antimony_v7', 'png', 'SKIN'),
    F('sk_4z_00_mat_side', 'png', 'SKIN'),
    F('sk_4z_00_side', 'png', 'SKIN'),
    F('sk_4z_01_mat-side', 'png', 'SKIN'),
    F('sk_4z_01_side', 'png', 'SKIN'),
    F('sk_rnd_01_mat-side', 'png', 'SKIN'),
    F('sk_rnd_01_side', 'png', 'SKIN'),
    F('test-test_v8-mat', 'png', 'SKIN'),
    F('test-test_v8', 'png', 'SKIN'),
    F('260303_exploded-skin', 'glb', 'SKIN'),

    // ── PY SKIN GENERATOR ────────────────────
    F('postprocess', 'py', 'PY SKIN GENERATOR'),
    F('open_source/Meteor_facade_v7', 'py', 'PY SKIN GENERATOR'),
    F('open_source/srf_analysis', 'gh', 'PY SKIN GENERATOR'),

    // ── SITE MODEL ───────────────────────────
    F('G11_hyperobject', 'glb', 'SITE MODEL'),
    F('buildings', 'glb', 'SITE MODEL'),
    F('cold_storage', 'glb', 'SITE MODEL'),
    F('dsr', 'glb', 'SITE MODEL'),
    F('highline', 'glb', 'SITE MODEL'),
    F('hy_new_dev', 'glb', 'SITE MODEL'),
    F('mn04_building', 'glb', 'SITE MODEL'),
    F('railroads', 'glb', 'SITE MODEL'),
    F('site_building', 'glb', 'SITE MODEL'),
    F('street', 'glb', 'SITE MODEL'),
    F('street_props', 'glb', 'SITE MODEL'),
    F('subway_system', 'glb', 'SITE MODEL'),
    F('terrain', 'glb', 'SITE MODEL'),
    F('HYPEROBJECT_midterm/site', 'glb', 'SITE MODEL'),
    F('HYPEROBJECT_midterm/streets', 'glb', 'SITE MODEL'),

    // ── STRUCTURE ────────────────────────────
    F('260303_exploded-structure', 'glb', 'STRUCTURE'),

    // ── MEDIA M. CONCEPT ─────────────────────
    F('HYPEROBJECT_midterm/blueprint', 'html', 'MEDIA M. CONCEPT'),

    // ── PROGRAM ──────────────────────────────
    F('HYPEROBJECT_midterm/diagnostic_ui', 'html', 'PROGRAM'),
    F('HYPEROBJECT_midterm/contorller', 'html', 'PROGRAM'),
    F('HYPEROBJECT_midterm/index-contorller', 'html', 'PROGRAM'),
    F('HYPEROBJECT_midterm/program', 'glb', 'PROGRAM'),

    // ── MEDIA PROJECT ────────────────────────
    F('260303_exploded-media', 'glb', 'MEDIA PROJECT'),

    // ── PROJECT MODEL ────────────────────────
    F('HYPEROBJECT_midterm/exploded_diagram', 'html', 'PROJECT MODEL'),
    F('HYPEROBJECT_midterm/index', 'html', 'PROJECT MODEL'),
    F('HYPEROBJECT_midterm/space', 'glb', 'PROJECT MODEL'),
    F('260303_exploded-circulation', 'glb', 'PROJECT MODEL'),
    F('260303_exploded-interiors', 'glb', 'PROJECT MODEL'),
    F('260303_exploded-machinary', 'glb', 'PROJECT MODEL'),

    // ── OPEN SOURCE ──────────────────────────
    F('open_source/meteor_facade_workflow', 'html', 'OPEN SOURCE'),
    F('open_source/workflow', 'html', 'OPEN SOURCE'),
    F('Fragment_Mono/OFL', 'txt', 'OPEN SOURCE'),

    // ── WEB INTERACTIVE MODEL ────────────────
    F('index', 'html', 'WEB INTERACTIVE MODEL'),
    F('app', 'js', 'WEB INTERACTIVE MODEL'),
    F('styles', 'css', 'WEB INTERACTIVE MODEL'),
    F('Fragment_Mono/FragmentMono-Regular', 'ttf', 'WEB INTERACTIVE MODEL'),
    F('Fragment_Mono/FragmentMono-Italic', 'ttf', 'WEB INTERACTIVE MODEL'),
    F('HYPEROBJECT_midterm/index.controller', 'other', 'WEB INTERACTIVE MODEL'),
    F('server', 'log', 'WEB INTERACTIVE MODEL'),
    ...Array.from({ length: 17 }, (_, i) =>
        F(i === 0 ? 'fix_app' : `fix_app_${i + 1}`, 'js', 'WEB INTERACTIVE MODEL')
    ),
];

// ==========================================
// DEPTH / DEGREE PRECOMPUTE
// ==========================================
function computeDepths() {
    const inDeg = {}, adj = {}, d = {};
    RAW_NODES.forEach(n => { inDeg[n.id] = 0; adj[n.id] = []; d[n.id] = 0; });
    EDGES.forEach(([s, t]) => { adj[s].push(t); inDeg[t]++; });
    let q = RAW_NODES.filter(n => inDeg[n.id] === 0).map(n => n.id);
    while (q.length) {
        const u = q.shift();
        adj[u].forEach(v => {
            d[v] = Math.max(d[v], d[u] + 1);
            if (--inDeg[v] === 0) q.push(v);
        });
    }
    return d;
}
const DEPTHS = computeDepths();

const DEGREE = {};
RAW_NODES.forEach(n => DEGREE[n.id] = 0);
EDGES.forEach(([s, t]) => { DEGREE[s] = (DEGREE[s] || 0) + 1; DEGREE[t] = (DEGREE[t] || 0) + 1; });

// ==========================================
// 2D LAYOUT — SKETCH BASED HIERARCHY
// ==========================================
function compute2DPos() {
    const layout = {
        "BRIEF": [0, 0],
        
        "STONES RESEARCH": [1, -2],
        "SITE": [1, -1],
        "MEDIA": [1, 1],
        "TECHNOLOGIES": [1, 2],
        
        "PATTERNS": [2, -2],
        "SITE MODEL": [2, -1],
        "SITE ANALYSIS": [2, 0],
        "ARTISTS": [2, 1],
        
        "PY SKIN GENERATOR": [3, -2],
        "WEB INTERACTIVE MODEL": [3, -1],
        "PROGRAM": [3, 0],
        "MEDIA M. CONCEPT": [3, 1],
        
        "UE ENVIRONMENT": [4, -1],
        "MASSING": [4, 0],
        "MEDIA PROJECT": [4, 1],
        
        "SKIN": [5, -1],
        "STRUCTURE": [5, 0],
        
        "PROJECT MODEL": [6, 0],
        
        "UE ANIMATION": [7, -1],
        "DRAWINGS + DETAILS": [7, 0],
        "PROJECT DATA": [7, 1],
        
        "OPEN SOURCE": [8, 0]
    };

    const pos = {};
    Object.keys(layout).forEach(id => {
        const [row, col] = layout[id];
        // X interval 140px, Y interval 90px
        pos[id] = new THREE.Vector3(col * 140, -(row * 90 + 50) + 400, 0); 
    });
    return pos;
}
const POS2D = compute2DPos();

// ==========================================
// RUNTIME
// ==========================================
let scene, camera, renderer, controls;
let nodesData = [], fileNodesData = [], edgesData = [];
let hoveredNode = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let labelsContainer;
let rightPane, leftPane, diagramContent, diagSvg;
const clock = new THREE.Clock();

// Pan / Zoom for 2D DOM
let domTransform = { x: 0, y: 0, scale: 0.65 };
let isPanning = false;
let startPan = { x: 0, y: 0 };

// ==========================================
// INIT THREE & DOM
// ==========================================
function initThree() {
    const canvas = document.getElementById('c');
    labelsContainer = document.getElementById('labels-container');
    rightPane = document.getElementById('right-pane');
    leftPane = document.getElementById('left-pane');
    diagramContent = document.getElementById('diagram-content');
    diagSvg = document.getElementById('diagram-edges');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, rightPane.clientWidth / rightPane.clientHeight, 0.1, 8000);
    camera.position.set(0, 0, 650);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(rightPane.clientWidth, rightPane.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 60;
    controls.maxDistance = 2500;

    window.addEventListener('resize', onResize);

    // Interactions
    rightPane.addEventListener('mousemove', onThreeMouseMove);
    rightPane.addEventListener('click', onThreeClick);
    
    leftPane.addEventListener('mousedown', onDomMouseDown);
    window.addEventListener('mousemove', onDomMouseMove);
    window.addEventListener('mouseup', onDomMouseUp);
    leftPane.addEventListener('wheel', onDomWheel, { passive: false });

    // Splitter Drag Logic
    const gutter = document.getElementById('gutter');
    let isDraggingGutter = false;
    gutter.addEventListener('mousedown', () => {
        isDraggingGutter = true;
        document.body.style.cursor = 'col-resize';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDraggingGutter) return;
        let p = (e.clientX / window.innerWidth) * 100;
        p = Math.max(10, Math.min(p, 90)); // limit between 10% and 90%
        leftPane.style.width = `${p}%`;
        onResize();
    });
    window.addEventListener('mouseup', () => {
        if (isDraggingGutter) {
            isDraggingGutter = false;
            document.body.style.cursor = 'crosshair';
        }
    });
}

function onResize() {
    camera.aspect = rightPane.clientWidth / rightPane.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(rightPane.clientWidth, rightPane.clientHeight);
}

function updateDomTransform() {
    diagramContent.style.transform = `translate(${domTransform.x}px, ${domTransform.y}px) scale(${domTransform.scale})`;
}

function onDomMouseDown(e) {
    if (e.button === 2) { // Right click
        isPanning = true;
        startPan = { x: e.clientX - domTransform.x, y: e.clientY - domTransform.y };
    }
}
function onDomMouseMove(e) {
    if (isPanning) {
        domTransform.x = e.clientX - startPan.x;
        domTransform.y = e.clientY - startPan.y;
        updateDomTransform();
    }
}
function onDomMouseUp(e) {
    if (e.button === 2) {
        isPanning = false;
    }
}
function onDomWheel(e) {
    e.preventDefault();
    const zoomAmount = e.deltaY * -0.001;
    domTransform.scale = Math.min(Math.max(0.1, domTransform.scale + zoomAmount), 3);
    updateDomTransform();
}

// ==========================================
// BUILD GRAPH & DOM
// ==========================================
function buildGraph() {
    const clAng = { research: 0, analysis: Math.PI * 0.72, output: Math.PI * 1.44 };
    const nodeGeo = new THREE.SphereGeometry(1, 16, 16);
    const fileGeo = new THREE.SphereGeometry(1, 8, 8);

    // ── Workflow nodes ──────────────────────
    RAW_NODES.forEach(n => {
        const ang = clAng[n.cl] + (Math.random() - 0.5) * 1.1;
        const r = 145 + Math.random() * 180;
        const x3d = Math.cos(ang) * r;
        const y3d = Math.sin(ang) * r;
        const z3d = (Math.random() - 0.5) * 340;

        const color = new THREE.Color(CFG.cluster[n.cl]);
        const mesh = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(x3d, y3d, z3d);
        scene.add(mesh);

        const label = document.createElement('div');
        label.className = 'node-label';
        label.textContent = n.id;
        label.style.cssText = `position:absolute;pointer-events:none;
            font-family:${CFG.font};font-size:11px;color:#fff;
            white-space:nowrap;letter-spacing:0.12em;text-transform:uppercase;`;
        labelsContainer.appendChild(label);

        // 2D DOM Node creation
        const domNode = document.createElement('div');
        domNode.className = `node-dom ${n.type}`;
        domNode.id = `dom-${n.id}`;
        // Map abstract 2D pos to pixel coordinates (center is 0,0)
        domNode.style.left = `${POS2D[n.id].x}px`;
        domNode.style.top = `${-POS2D[n.id].y}px`; // Flip Y

        domNode.innerHTML = `
            <div class="node-dom-title">${n.id}</div>
        `;

        diagramContent.appendChild(domNode);

        nodesData.push({
            id: n.id, cl: n.cl, mesh, labelDom: label,
            domNode,
            pos3D: new THREE.Vector3(x3d, y3d, z3d),
            pos2D: POS2D[n.id].clone(),
            vx: 0, vy: 0, vz: 0,
            baseColor: color.clone(),
            degree: DEGREE[n.id]
        });

        // Hover listeners on DOM nodes
        domNode.addEventListener('mouseenter', () => {
            hoveredNode = nodesData.find(d => d.id === n.id);
            updateHUD();
            updateDOMHoverState();
        });
        domNode.addEventListener('mouseleave', () => {
            if (hoveredNode && hoveredNode.id === n.id) {
                hoveredNode = null;
                updateHUD();
                updateDOMHoverState();
            }
        });
        domNode.addEventListener('click', (e) => {
            if (e.button === 0) performNav(n.id);
        });
    });

    // ── Workflow edges ──────────────────────
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: CFG.edge3D });
    let svgGraphHTML = `<defs>
      <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
        <polygon points="0 0, 6 2, 0 4" fill="#ffffff"/>
      </marker>
    </defs>`;

    EDGES.forEach(([sid, tid]) => {
        const s = nodesData.find(n => n.id === sid);
        const t = nodesData.find(n => n.id === tid);
        if (!s || !t) return;

        // 3D edge
        const pts = new Float32Array(6);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        geo.setDrawRange(0, 2);
        const line = new THREE.Line(geo, edgeMat.clone());
        scene.add(line);
        edgesData.push({ s, t, line, mat: line.material });

        // 2D SVG edge (Offset to attach strictly to top/bottom edges)
        const sx = s.pos2D.x + 4000;
        const sy = -s.pos2D.y + 4000 + 17; // block base (height 34 -> /2 = 17)
        const tx = t.pos2D.x + 4000;
        const ty = -t.pos2D.y + 4000 - 17; // top bounds
        
        let pathStr = "";
        if (Math.abs(sx - tx) < 5 && Math.abs(sy - ty) <= 120) {
            // Straight vertical line for direct adjacent tracks
            pathStr = `M ${sx} ${sy} L ${tx} ${ty}`;
        } else {
            // Gap router to strictly avoid passing through other nodes vertically
            let gapX = sx === tx ? sx + 70 : (sx < tx ? tx - 70 : tx + 70);
            
            // Generate orthogonal S-shape routing via clear vertical channels
            pathStr = `M ${sx} ${sy} L ${sx} ${sy+12} L ${gapX} ${sy+12} L ${gapX} ${ty-12} L ${tx} ${ty-12} L ${tx} ${ty}`;
        }
        
        svgGraphHTML += `<path d="${pathStr}" fill="none" stroke="#ffffff" stroke-width="0.75" marker-end="url(#arrowhead)"/>`;
    });
    diagSvg.innerHTML = svgGraphHTML;

    // ── File satellites ──────────────────────
    const groupCounts = {};
    FILES.forEach(f => { groupCounts[f.p] = (groupCounts[f.p] || 0) + 1; });
    const groupIdx = {};
    FILES.forEach(f => { groupIdx[f.p] = (groupIdx[f.p] || 0); });

    const PHI = (1 + Math.sqrt(5)) / 2;

    FILES.forEach((f) => {
        const parent = nodesData.find(n => n.id === f.p);
        if (!parent) return;

        const total = groupCounts[f.p];
        const idx = groupIdx[f.p]++;
        const theta = 2 * Math.PI * idx / PHI;
        const phi = Math.acos(1 - 2 * (idx + 0.5) / total);
        const [rMin, rMax] = CFG.satRange;
        const r = rMin + (idx / total) * (rMax - rMin);

        const offset = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.sin(phi) * Math.sin(theta) * r,
            Math.cos(phi) * r * 0.55
        );

        const col = new THREE.Color(CFG.file[f.ext] || CFG.file.other);
        const mesh = new THREE.Mesh(fileGeo, new THREE.MeshBasicMaterial({ color: col.clone() }));
        mesh.position.set(parent.pos3D.x + offset.x, parent.pos3D.y + offset.y, parent.pos3D.z + offset.z);
        mesh.scale.setScalar(CFG.fileR3D);
        scene.add(mesh);

        const label = document.createElement('div');
        label.className = 'file-label';
        const displayName = f.n.length > 24 ? f.n.slice(0, 22) + '..' : f.n;
        label.textContent = displayName + '.' + f.ext;
        label.style.cssText = `position:absolute;pointer-events:none;display:none;
            font-family:${CFG.font};font-size:12px;white-space:nowrap;
            letter-spacing:0.05em;color:#ffffff;opacity:0.5;`;
        labelsContainer.appendChild(label);

        fileNodesData.push({
            name: f.n + '.' + f.ext, ext: f.ext,
            parent, mesh, labelDom: label,
            offset: offset.clone(),
            phase: Math.random() * Math.PI * 2,
            baseColor: col.clone(),
            pos3D: new THREE.Vector3()
        });
    });

    updateDomTransform();
}

function updateDOMHoverState() {
    nodesData.forEach(n => {
        if (hoveredNode && n.id === hoveredNode.id) {
            n.domNode.classList.add('hovered');
        } else {
            n.domNode.classList.remove('hovered');
        }
    });
}

// ==========================================
// PHYSICS — workflow nodes only (3D)
// ==========================================
function updatePhysics() {
    const { len, k, rep, damp } = CFG.spring;
    const clAng = { research: 0, analysis: Math.PI * 0.72, output: Math.PI * 1.44 };

    for (let i = 0; i < nodesData.length; i++) {
        for (let j = i + 1; j < nodesData.length; j++) {
            const a = nodesData[i], b = nodesData[j];
            const dx = a.pos3D.x - b.pos3D.x, dy = a.pos3D.y - b.pos3D.y, dz = a.pos3D.z - b.pos3D.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < 1 || d2 > 180000) continue;
            const d = Math.sqrt(d2), f = rep / d2;
            const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
            a.vx += fx; a.vy += fy; a.vz += fz;
            b.vx -= fx; b.vy -= fy; b.vz -= fz;
        }
    }
    edgesData.forEach(e => {
        const s = e.s, t = e.t;
        const dx = t.pos3D.x - s.pos3D.x, dy = t.pos3D.y - s.pos3D.y, dz = t.pos3D.z - s.pos3D.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const f = (d - len) * k;
        const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
        s.vx += fx; s.vy += fy; s.vz += fz;
        t.vx -= fx; t.vy -= fy; t.vz -= fz;
    });
    nodesData.forEach(n => {
        const ang = clAng[n.cl];
        n.vx += (Math.cos(ang) * 165 - n.pos3D.x) * 0.0007;
        n.vy += (Math.sin(ang) * 165 - n.pos3D.y) * 0.0007;
        n.vz += (0 - n.pos3D.z) * 0.0007;
        n.pos3D.x += n.vx; n.pos3D.y += n.vy; n.pos3D.z += n.vz;
        n.vx *= damp; n.vy *= damp; n.vz *= damp;
    });
}

// ==========================================
// LABEL PROJECTION
// ==========================================
function projectLabel(el, worldPos, offsetY = 0) {
    const hw = rightPane.clientWidth / 2;
    const hh = rightPane.clientHeight / 2;
    const p = worldPos.clone();
    p.project(camera);
    if (p.z > 1) { el.style.display = 'none'; return false; }
    el.style.display = 'block';
    el.style.left = `${p.x * hw + hw}px`;
    el.style.top = `${-p.y * hh + hh + offsetY}px`;
    return true;
}

// ==========================================
// RENDER LOOP
// ==========================================
function render() {
    requestAnimationFrame(render);
    controls.update();
    updatePhysics();

    const time = clock.getElapsedTime();

    // ── Workflow nodes (ALWAYS 3D) ──────────────────────
    nodesData.forEach(n => {
        n.mesh.position.copy(n.pos3D); // Restore physics movement

        const baseR = CFG.nodeR3D + n.degree * 0.9;
        const isHov = n === hoveredNode;
        n.mesh.scale.setScalar(isHov ? baseR * 1.7 : baseR);

        if (isHov) {
            n.mesh.material.color.set(0xffffff);
            n.mesh.material.transparent = false;
        } else {
            n.mesh.material.color.copy(n.baseColor);
        }

        n.labelDom.style.color = '#ffffff';
        n.labelDom.style.background = 'transparent';
        n.labelDom.style.border = 'none';
        n.labelDom.style.padding = '0';
        n.labelDom.style.borderRadius = '0';
        n.labelDom.style.fontSize = '16px';
        n.labelDom.style.letterSpacing = '0.12em';
        n.labelDom.style.fontWeight = 'bold';

        const sc = Math.max(0.35, 1 - (n.mesh.position.distanceTo(camera.position) / 1400));
        projectLabel(n.labelDom, n.mesh.position, 18);
        n.labelDom.style.transform = `translate(-50%, 0) scale(${sc})`;
    });

    // ── File satellites ──────────────────────
    fileNodesData.forEach(f => {
        // Follow parent + gentle float
        const osc = Math.sin(time * 0.35 + f.phase) * 1.3;
        f.mesh.position.set(
            f.parent.pos3D.x + f.offset.x + osc,
            f.parent.pos3D.y + f.offset.y + Math.cos(time * 0.28 + f.phase) * 1.3,
            f.parent.pos3D.z + f.offset.z
        );
        f.pos3D.copy(f.mesh.position);

        const isParentHov = f.parent === hoveredNode;
        if (isParentHov) {
            f.mesh.material.color.set(0xffffff);
            f.mesh.scale.setScalar(CFG.fileR3D * 1.5);
        } else {
            f.mesh.material.color.copy(f.baseColor);
            f.mesh.scale.setScalar(CFG.fileR3D);
        }

        // Label: Always visible regardless of distance
        const visible = projectLabel(f.labelDom, f.mesh.position, -6);
        if (visible) {
            const fSc = Math.max(0.35, 1 - (f.mesh.position.distanceTo(camera.position) / 1400));
            f.labelDom.style.display = 'block';
            f.labelDom.style.transform = `translate(-50%,-100%) scale(${fSc})`;
        } else {
            f.labelDom.style.display = 'none';
        }
    });

    // ── Workflow edges ──────────────────────
    edgesData.forEach(e => {
        const pS = e.s.mesh.position;
        const pT = e.t.mesh.position;
        const arr = e.line.geometry.attributes.position.array;
        arr[0] = pS.x; arr[1] = pS.y; arr[2] = pS.z;
        arr[3] = pT.x; arr[4] = pT.y; arr[5] = pT.z;
        e.line.geometry.attributes.position.needsUpdate = true;

        const isHov = e.s === hoveredNode || e.t === hoveredNode;
        e.mat.color.set(isHov ? 0xCA8A04 : 0xffffff);
        e.mat.opacity = isHov ? 1 : CFG.edge3D;
    });

    renderer.render(scene, camera);
}

// ==========================================
// HOVER / CLICK for 3D PANE
// ==========================================
function onThreeMouseMove(e) {
    const rect = rightPane.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(nodesData.map(n => n.mesh));
    hoveredNode = hits.length > 0
        ? nodesData.find(n => n.mesh === hits[0].object) || null
        : null;
    document.body.style.cursor = hoveredNode ? 'pointer' : 'crosshair';
    updateHUD();
    updateDOMHoverState();
}

function onThreeClick(e) {
    if (!hoveredNode) return;
    performNav(hoveredNode.id);
}

function performNav(id) {
    const nav = {
        "PROJECT MODEL": "./HYPEROBJECT_midterm/exploded_diagram.html",
        "MEDIA M. CONCEPT": "./HYPEROBJECT_midterm/blueprint.html",
        "PROGRAM": "./HYPEROBJECT_midterm/diagnostic_ui.html",
        "ARTISTS": "./media_artists_map/index.html",
        "WEB INTERACTIVE MODEL": "https://mattia137.github.io/2GBX_environment-2/",
        "UE ANIMATION": "https://vimeo.com/1183403180?share=copy&fl=sv&fe=ci",
        "STONES RESEARCH": "./stone_research/index.html",
        "OPEN SOURCE": "./open_source/index.html",
        "PATTERN": "./stone_research/index.html",
        "PY SKIN GENERATOR": "./stone_research/index.html",
        "SITE": "./site_model/index.html",
        "UE ENVIRONMENT": "./ue-360/index.html"
    };
    window.location.href = nav[id] || ('.' + id.toLowerCase().replace(/\s+/g, '_') + '/');
}

// ==========================================
// HUD
// ==========================================
function updateHUD() {
    const trg = document.getElementById('hud-target');
    const clus = document.getElementById('hud-cluster');
    if (hoveredNode) {
        trg.innerText = hoveredNode.id; trg.classList.add('active');
        clus.innerText = hoveredNode.cl.toUpperCase();
    } else {
        trg.innerText = '---'; trg.classList.remove('active');
        clus.innerText = '---';
    }
    const c = document.getElementById('hud-coords');
    if (c) c.innerText = `${camera.position.x.toFixed(0)} / ${camera.position.y.toFixed(0)}`;
}

// ==========================================
// BOOT
// ==========================================
window.onload = () => {
    initThree();
    buildGraph();
    updateHUD();
    render();
};
