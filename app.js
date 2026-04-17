import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ==========================================
// EARTH-MARS BRIDGE PROJECT - PARAMETERS
// ==========================================
export const APP_CONFIG = {
    fontFamily: "Fragment Mono, monospace",
    defaultMode: "A", // A: 3D Network (Color), B: 2D Diagram (B&W)
    colors: {
        clusters: {
            "research": "#ff3366", // Red/Pink
            "analysis": "#33ccff", // Cyan
            "design":   "#9933ff", // Purple
            "output":   "#ff9933"  // Orange
        },
        mode2DNode: "#000000",
        mode2DEdge: "rgba(0, 0, 0, 0.4)",
        mode3DEdge: "rgba(255, 255, 255, 0.2)",
        mode2DText: "#000000",
        mode3DText: "#ffffff",
        hoverAccent: "var(--accent)" // To be computed dynamically or using CSS custom prop via JS
    },
    physics: {
        springLength: 100,
        springFactor: 0.1,
        repulsion: 1500,
        damping: 0.85
    },
    camera: {
        zoom: 1,
        x: 0,
        y: 0
    },
    material: {
        nodeRadius3D: 4,
        nodeRadius2D: 8,
        edgeWidth3D: 1,
        edgeWidth2D: 1
    },
    postProcess: {
        bloomStrength: 1.5,
        bloomRadius: 0.4,
        bloomThreshold: 0
    }
};

// --- DATA STRUCTURES ---
const rawNodes = [
    { id: "BRIEF", cluster: "research" },
    { id: "SITE", cluster: "research" },
    { id: "MEDIA", cluster: "research" },
    { id: "TECHNOLOGIES", cluster: "research" },
    { id: "STONES RESEARCH", cluster: "research" },
    { id: "PATTERNS", cluster: "research" },
    { id: "ARTISTS", cluster: "research" },

    { id: "SITE ANALYSIS", cluster: "analysis" },
    { id: "MEDIA M. CONCEPT", cluster: "analysis" },
    { id: "PROGRAM", cluster: "analysis" },
    { id: "MASSING", cluster: "analysis" },
    { id: "STRUCTURE", cluster: "analysis" },
    { id: "SKIN", cluster: "analysis" },
    { id: "PY SKIN GENERATOR", cluster: "analysis" },

    { id: "SITE MODEL", cluster: "output" },
    { id: "MEDIA PROJECT", cluster: "output" },
    { id: "PROJECT MODEL", cluster: "output" },
    { id: "DRAWINGS + DETAILS", cluster: "output" },
    { id: "PROJECT DATA", cluster: "output" },
    { id: "OPEN SOURCE", cluster: "output" },
    { id: "WEB INTERACTIVE MODEL", cluster: "output" },
    { id: "UE ENVIRONMENT", cluster: "output" },
    { id: "UE ANIMATION", cluster: "output" }
];

const edges = [
    { source: "BRIEF", target: "SITE" },
    { source: "BRIEF", target: "MEDIA" },
    { source: "BRIEF", target: "PROGRAM" },
    { source: "BRIEF", target: "MEDIA M. CONCEPT" },

    { source: "MEDIA", target: "TECHNOLOGIES" },
    { source: "MEDIA", target: "ARTISTS" },
    { source: "MEDIA", target: "PROGRAM" },

    { source: "TECHNOLOGIES", target: "MEDIA M. CONCEPT" },

    { source: "MEDIA M. CONCEPT", target: "MEDIA PROJECT" },
    { source: "MEDIA M. CONCEPT", target: "PROGRAM" },

    { source: "SITE", target: "SITE ANALYSIS" },
    { source: "SITE", target: "SITE MODEL" },

    { source: "SITE ANALYSIS", target: "MASSING" },

    { source: "SITE MODEL", target: "SITE ANALYSIS" },
    { source: "SITE MODEL", target: "WEB INTERACTIVE MODEL" },
    { source: "SITE MODEL", target: "UE ENVIRONMENT" },

    { source: "PROGRAM", target: "MASSING" },
    { source: "PROGRAM", target: "STRUCTURE" },
    { source: "PROGRAM", target: "PROJECT MODEL" },
    { source: "PROGRAM", target: "MEDIA PROJECT" },

    { source: "MASSING", target: "SKIN" },
    { source: "MASSING", target: "STRUCTURE" },

    { source: "SKIN", target: "PROJECT MODEL" },

    { source: "STRUCTURE", target: "PROJECT MODEL" },

    { source: "MEDIA PROJECT", target: "PROJECT MODEL" },

    { source: "PROJECT MODEL", target: "DRAWINGS + DETAILS" },
    { source: "PROJECT MODEL", target: "PROJECT DATA" },
    { source: "PROJECT MODEL", target: "UE ANIMATION" },

    { source: "DRAWINGS + DETAILS", target: "PROJECT DATA" },

    { source: "PROJECT DATA", target: "OPEN SOURCE" },

    { source: "UE ENVIRONMENT", target: "UE ANIMATION" },

    { source: "STONES RESEARCH", target: "PATTERNS" },

    { source: "PATTERNS", target: "PY SKIN GENERATOR" },

    { source: "PY SKIN GENERATOR", target: "SKIN" }
];


// --- THREE.JS SETUP ---
let scene, camera, renderer, composer, controls;
let nodesData = [];
let edgesData = [];
let transitionProgress = 0; // 0 = 3D Network, 1 = 2D Diagram
let currentMode = APP_CONFIG.defaultMode;

let hoveredNode = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let labelsContainer;

function initThree() {
    const canvas = document.getElementById('c');
    labelsContainer = document.getElementById('labels-container');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.z = 1000;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = APP_CONFIG.postProcess.bloomThreshold;
    bloomPass.strength = APP_CONFIG.postProcess.bloomStrength;
    bloomPass.radius = APP_CONFIG.postProcess.bloomRadius;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// --- LAYOUT ENGINE ---
function computeDepths() {
    let inDegree = {}; let adj = {}; let depths = {};
    rawNodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; depths[n.id] = 0; });
    edges.forEach(e => { adj[e.source].push(e.target); inDegree[e.target]++; });
    
    let q = rawNodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    while (q.length) {
        let u = q.shift();
        adj[u].forEach(v => {
            depths[v] = Math.max(depths[v], depths[u] + 1);
            if (--inDegree[v] === 0) q.push(v);
        });
    }
    return depths;
}

const nodeDepths = computeDepths();

// --- DEGREE COMPUTATION ---
const nodeDegree = {};
rawNodes.forEach(n => nodeDegree[n.id] = 0);
edges.forEach(e => {
    nodeDegree[e.source] = (nodeDegree[e.source] || 0) + 1;
    nodeDegree[e.target] = (nodeDegree[e.target] || 0) + 1;
});


function buildGraph() {
    let maxDepth = Math.max(...Object.values(nodeDepths));
    const clusterAngles = { "research": 0, "analysis": Math.PI * 0.66, "output": Math.PI * 1.33 };

    // Material definitions
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    rawNodes.forEach(n => {
        // 2D pos
        let d = nodeDepths[n.id];
        let nodesInDepth = rawNodes.filter(rn => nodeDepths[rn.id] === d);
        let rowIdx = nodesInDepth.findIndex(rn => rn.id === n.id);

        let x2d = (d - maxDepth/2) * 160;
        let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 90;
        let z2d = 0;

        // 3D pos
        let ang = clusterAngles[n.cluster] + (Math.random() - 0.5) * 1.5;
        let radius = 200 + Math.random() * 300;
        let x3d = Math.cos(ang) * radius;
        let y3d = Math.sin(ang) * radius;
        let z3d = (Math.random() - 0.5) * 600;

        const color = new THREE.Color(APP_CONFIG.colors.clusters[n.cluster]);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(sphereGeo, material);

        // Use calculated 3D pos as initial
        mesh.position.set(x3d, y3d, z3d);
        scene.add(mesh);

        // Label DOM Element
        const labelDiv = document.createElement('div');
        labelDiv.className = 'node-label';
        labelDiv.style.position = 'absolute';
        labelDiv.style.color = APP_CONFIG.colors.mode3DText;
        labelDiv.style.fontFamily = APP_CONFIG.fontFamily;
        labelDiv.style.fontSize = '12px';
        labelDiv.style.transform = 'translate(-50%, -50%)';
        labelDiv.style.marginTop = '20px';
        labelDiv.style.whiteSpace = 'nowrap';
        labelDiv.style.pointerEvents = 'none';
        labelDiv.textContent = n.id;
        labelsContainer.appendChild(labelDiv);

        nodesData.push({
            id: n.id,
            cluster: n.cluster,
            mesh: mesh,
            labelDom: labelDiv,
            pos3D: new THREE.Vector3(x3d, y3d, z3d),
            pos2D: new THREE.Vector3(x2d, y2d, z2d),
            vx: 0, vy: 0, vz: 0,
            baseColor: color,
            activeColor: new THREE.Color(APP_CONFIG.colors.hoverAccent),
            degree: nodeDegree[n.id]
        });
    });

    const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(APP_CONFIG.colors.mode3DEdge),
        transparent: true,
        opacity: 0.4
    });

    edges.forEach(e => {
        let s = nodesData.find(n => n.id === e.source);
        let t = nodesData.find(n => n.id === e.target);
        if (!s || !t) return;

        const geo = new THREE.BufferGeometry();
        // Create bezier curve in 2D mode, straight line in 3D
        // Initialize with max points for smooth 2D curve interpolation
        const points = new Float32Array(50 * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(points, 3));

        const line = new THREE.Line(geo, lineMat);
        scene.add(line);

        edgesData.push({
            source: s,
            target: t,
            line: line,
            baseMat: lineMat,
            activeMat: new THREE.LineBasicMaterial({ color: new THREE.Color(APP_CONFIG.colors.hoverAccent), linewidth: 2 })
        });
    });
}

function updatePhysics() {
    if (transitionProgress > 0.1) return; // Only apply physics in 3D mode

    const dt = 0.1;
    // Apply repulsion
    for(let i=0; i<nodesData.length; i++) {
        for(let j=i+1; j<nodesData.length; j++) {
            let n1 = nodesData[i];
            let n2 = nodesData[j];
            let dx = n1.pos3D.x - n2.pos3D.x;
            let dy = n1.pos3D.y - n2.pos3D.y;
            let dz = n1.pos3D.z - n2.pos3D.z;
            let distSq = dx*dx + dy*dy + dz*dz;
            if (distSq > 0 && distSq < 100000) {
                let dist = Math.sqrt(distSq);
                let f = APP_CONFIG.physics.repulsion / distSq;
                let fx = (dx/dist) * f;
                let fy = (dy/dist) * f;
                let fz = (dz/dist) * f;
                n1.vx += fx; n1.vy += fy; n1.vz += fz;
                n2.vx -= fx; n2.vy -= fy; n2.vz -= fz;
            }
        }
    }

    // Apply springs
    edgesData.forEach(e => {
        let s = e.source; let t = e.target;
        let dx = t.pos3D.x - s.pos3D.x;
        let dy = t.pos3D.y - s.pos3D.y;
        let dz = t.pos3D.z - s.pos3D.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        let diff = dist - APP_CONFIG.physics.springLength;

        let f = diff * APP_CONFIG.physics.springFactor;
        if(dist > 0) {
            let fx = (dx/dist) * f;
            let fy = (dy/dist) * f;
            let fz = (dz/dist) * f;
            s.vx += fx; s.vy += fy; s.vz += fz;
            t.vx -= fx; t.vy -= fy; t.vz -= fz;
        }
    });

    // Update 3D positions
    nodesData.forEach(n => {
        // Attract to origin slightly based on cluster to maintain shape
        const clusterAngles = { "research": 0, "analysis": Math.PI * 0.66, "output": Math.PI * 1.33 };
        let ang = clusterAngles[n.cluster];
        let tx = Math.cos(ang) * 200;
        let ty = Math.sin(ang) * 200;

        n.vx += (tx - n.pos3D.x) * 0.001;
        n.vy += (ty - n.pos3D.y) * 0.001;
        n.vz += (0 - n.pos3D.z) * 0.001;

        n.pos3D.x += n.vx * dt;
        n.pos3D.y += n.vy * dt;
        n.pos3D.z += n.vz * dt;

        n.vx *= APP_CONFIG.physics.damping;
        n.vy *= APP_CONFIG.physics.damping;
        n.vz *= APP_CONFIG.physics.damping;
    });
}

function updateLabels() {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    nodesData.forEach(n => {
        // Project 3D pos to 2D screen space
        const pos = n.mesh.position.clone();
        pos.project(camera);

        if (pos.z > 1) {
            n.labelDom.style.display = 'none'; // Behind camera
            return;
        }

        const x = (pos.x * halfWidth) + halfWidth;
        const y = -(pos.y * halfHeight) + halfHeight;

        n.labelDom.style.display = 'block';
        n.labelDom.style.left = `${x}px`;
        n.labelDom.style.top = `${y}px`;

        
        // Scale text based on depth in 3D
        let scale = 1;
        if (currentMode === "A") {
            scale = Math.max(0.3, 1 - (n.mesh.position.distanceTo(camera.position) / 1500));
        } else {
            // In 2D we also need to scale down because the graph is huge
            scale = 0.5;
        }
        n.labelDom.style.transform = `translate(-50%, -50%) scale(${scale})`;

    });
}

function render() {
    requestAnimationFrame(render);

    controls.update();
    updatePhysics();

    // Mode Transition
    const targetProgress = currentMode === "A" ? 0 : 1;
    transitionProgress += (targetProgress - transitionProgress) * 0.05;

    // Determine current colors
    const nodeRadius = THREE.MathUtils.lerp(APP_CONFIG.material.nodeRadius3D, APP_CONFIG.material.nodeRadius2D, transitionProgress);
    const textCol = currentMode === "A" ? APP_CONFIG.colors.mode3DText : APP_CONFIG.colors.mode2DText;
    const is2D = transitionProgress > 0.5;

    nodesData.forEach(n => {
        // Interpolate position
        n.mesh.position.lerpVectors(n.pos3D, n.pos2D, transitionProgress);
        

        let s = nodeRadius;
        if (currentMode === "A") {
            s += n.degree * 0.5; // vary size based on connections
        }
        if (n === hoveredNode) s *= 1.5;
        n.mesh.scale.set(s, s, s);


        
        // Update colors based on hover and mode
        n.labelDom.style.color = textCol;

        if (is2D) {
            n.mesh.material.color.setStyle(APP_CONFIG.colors.mode2DNode);
            if (n === hoveredNode) n.mesh.material.color.setStyle(APP_CONFIG.colors.hoverAccent);

            // 2D pill shapes
            n.labelDom.style.background = '#ffffff';
            n.labelDom.style.border = `2px solid ${n === hoveredNode ? APP_CONFIG.colors.hoverAccent : APP_CONFIG.colors.mode2DNode}`;
            n.labelDom.style.padding = '5px 10px';
            n.labelDom.style.borderRadius = '25px';
            n.labelDom.style.color = n === hoveredNode ? APP_CONFIG.colors.hoverAccent : APP_CONFIG.colors.mode2DText;
            n.mesh.visible = false; // Hide 3D sphere in 2D mode
        } else {
            n.mesh.material.color.copy(n.baseColor);
            if (n === hoveredNode) n.mesh.material.color.copy(n.activeColor);

            // Revert to 3D label
            n.labelDom.style.background = 'transparent';
            n.labelDom.style.border = 'none';
            n.labelDom.style.padding = '0';
            n.labelDom.style.color = currentMode === "A" ? APP_CONFIG.colors.mode3DText : APP_CONFIG.colors.mode2DText;
            n.mesh.visible = true; // Show sphere in 3D mode
        }

    });

    edgesData.forEach(e => {
        const positions = e.line.geometry.attributes.position.array;
        
        const pS = e.source.mesh.position;
        const pT = e.target.mesh.position;

        // Create curve. In 3D (progress=0), control points match start/end (straight line).
        // In 2D (progress=1), control points are offset on X axis to make horizontal flow curves.
        const c1 = new THREE.Vector3().copy(pS).lerp(new THREE.Vector3(pS.x + 100, pS.y, pS.z), transitionProgress);
        const c2 = new THREE.Vector3().copy(pT).lerp(new THREE.Vector3(pT.x - 100, pT.y, pT.z), transitionProgress);

        const curve = new THREE.CubicBezierCurve3(pS, c1, c2, pT);
        const points = curve.getPoints(49);

        for (let i = 0; i < 50; i++) {
            positions[i*3] = points[i].x;
            positions[i*3+1] = points[i].y;
            positions[i*3+2] = points[i].z;
        }
        e.line.geometry.attributes.position.needsUpdate = true;

        // Highlight active edges
        let isHoveredEdge = (e.source === hoveredNode || e.target === hoveredNode);

        if (is2D) {
            e.line.material.color.setStyle(APP_CONFIG.colors.mode2DEdge);
        } else {
            e.line.material.color.setStyle(APP_CONFIG.colors.mode3DEdge);
        }
        
        if (isHoveredEdge) {
             e.line.material.color.setStyle(APP_CONFIG.colors.hoverAccent);
             e.line.material.opacity = 1.0;
        } else {
             e.line.material.opacity = is2D ? 1.0 : 0.4;
        }
    });

    updateLabels();

    if (currentMode === "A") {
        composer.render(); // Use Bloom
    } else {
        renderer.render(scene, camera);
    }
}

// --- INTERACTIVITY & DOM LOGIC ---
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(nodesData.map(n => n.mesh));

    if (intersects.length > 0) {
        let mesh = intersects[0].object;
        hoveredNode = nodesData.find(n => n.mesh === mesh);
        document.body.style.cursor = "pointer";
    } else {
        hoveredNode = null;
        document.body.style.cursor = "crosshair";
    }

    updateHUD();
}

function onClick() {
    if (hoveredNode) {
        if (hoveredNode.id === "ARTISTS") {
            window.location.href = "./media_artists_map/artist_map.html";
        } else {
            const folderName = hoveredNode.id.toLowerCase().replace(/ /g, '_');
            window.location.href = `./${folderName}/index.html`;
        }
    }
}

function updateHUD() {
    document.getElementById("hud-mode").innerText = currentMode === "A" ? "NETWORK_3D" : "DIAGRAM_2D";
    
    let trg = document.getElementById("hud-target");
    let clus = document.getElementById("hud-cluster");
    
    if (hoveredNode) {
        trg.innerText = hoveredNode.id;
        trg.classList.add("active");
        clus.innerText = hoveredNode.cluster.toUpperCase();
    } else {
        trg.innerText = "---";
        trg.classList.remove("active");
        clus.innerText = "---";
    }
}

// Init
window.onload = () => {
    // Read CSS variables dynamically
    const rootStyle = getComputedStyle(document.documentElement);
    APP_CONFIG.colors.hoverAccent = rootStyle.getPropertyValue('--accent').trim();

    initThree();
    buildGraph();

    document.getElementById("toggleBtn").addEventListener("click", () => {
        currentMode = currentMode === "A" ? "B" : "A";

        // Sync CSS theme
        if (currentMode === "B") {
            document.body.classList.add('mode-diagram');
            document.getElementById("toggleBtn").innerText = "SWITCH_TO_NETWORK_3D";
        } else {
            document.body.classList.remove('mode-diagram');
            document.getElementById("toggleBtn").innerText = "SWITCH_TO_DIAGRAM_2D";
        }

        // Re-read CSS variables dynamically as theme changes
        setTimeout(() => {
            const currentStyle = getComputedStyle(document.body);
            APP_CONFIG.colors.hoverAccent = currentStyle.getPropertyValue('--accent').trim();
            nodesData.forEach(n => {
                n.activeColor = new THREE.Color(APP_CONFIG.colors.hoverAccent);
            });
        }, 50);

        updateHUD();
    });

    updateHUD();
    render();
};
