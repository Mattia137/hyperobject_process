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
        mode3DText: "#ffffff"
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
    }
};

// --- DATA STRUCTURES ---
const rawNodes = [
    { id: "brief", cluster: "research" }, { id: "site", cluster: "research" }, { id: "media", cluster: "research" }, { id: "stones research", cluster: "research" },
    { id: "site model", cluster: "analysis" }, { id: "site analysis", cluster: "analysis" }, { id: "program", cluster: "analysis" },
    { id: "technologies", cluster: "design" }, { id: "artists", cluster: "design" }, { id: "massing", cluster: "design" }, { id: "skin", cluster: "design" }, { id: "structure", cluster: "design" }, { id: "patterns", cluster: "design" }, { id: "py skin generator", cluster: "design" },
    { id: "media protect", cluster: "output" }, { id: "project model", cluster: "output" }, { id: "web interactive model", cluster: "output" }, { id: "ue environment", cluster: "output" }, { id: "ue animation", cluster: "output" }, { id: "drawings + details", cluster: "output" }, { id: "project data", cluster: "output" }, { id: "open source", cluster: "output" }
];

const edges = [
    { source: "brief", target: "site" }, { source: "brief", target: "media" }, { source: "brief", target: "program" },
    { source: "media", target: "technologies" }, { source: "media", target: "artists" },
    { source: "technologies", target: "media protect" },
    { source: "site", target: "site analysis" }, { source: "site", target: "site model" },
    { source: "site model", target: "site analysis" }, { source: "site model", target: "web interactive model" }, { source: "site model", target: "ue environment" },
    { source: "site analysis", target: "massing" },
    { source: "massing", target: "skin" }, { source: "massing", target: "structure" },
    { source: "program", target: "massing" }, { source: "program", target: "structure" }, { source: "program", target: "media protect" }, { source: "program", target: "project model" },
    { source: "skin", target: "project model" }, { source: "structure", target: "project model" }, { source: "media protect", target: "project model" },
    { source: "project model", target: "drawings + details" }, { source: "project model", target: "project data" }, { source: "project model", target: "ue animation" },
    { source: "ue environment", target: "ue animation" }, { source: "web interactive model", target: "ue environment" },
    { source: "drawings + details", target: "project data" }, { source: "project data", target: "open source" },
    { source: "stones research", target: "patterns" }, { source: "patterns", target: "py skin generator" }, { source: "py skin generator", target: "project data" }
];

// Graph depth logic for 2D diagram
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

// State
let nodes = [];
let animProgress = 1; // 1 = fully current mode
let currentMode = APP_CONFIG.defaultMode; // "A" = 3D Network, "B" = 2D Diagram
let mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let hoveredNode = null;
let canvas, ctx;
let time = 0;

// Initialize nodes with target positions
function initGraph() {
    // Determine bounds for layout calculation
    let maxDepth = Math.max(...Object.values(nodeDepths));
    
    // Cluster base angles for 3D layout to group them
    const clusterAngles = { "research": 0, "analysis": Math.PI/2, "design": Math.PI, "output": Math.PI * 1.5 };

    rawNodes.forEach((n, idx) => {
        // 2D pos
        let d = nodeDepths[n.id];
        let nodesInDepth = rawNodes.filter(rn => nodeDepths[rn.id] === d);
        let rowIdx = nodesInDepth.findIndex(rn => rn.id === n.id);
        let x2d = (d - maxDepth/2) * 200;
        let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 80;

        // 3D/Network pos (Random spread constrained by cluster angle)
        let ang = clusterAngles[n.cluster] + (Math.random() - 0.5) * 1.2;
        let radius = 100 + Math.random() * 250;
        let z3d = (Math.random() - 0.5) * 400; // Fake Z for parallax
        let x3d = Math.cos(ang) * radius;
        let y3d = Math.sin(ang) * radius;

        nodes.push({
            id: n.id,
            cluster: n.cluster,
            z: z3d,
            pos3D: { x: x3d, y: y3d },
            pos2D: { x: x2d, y: y2d },
            lx: currentMode === "A" ? x3d : x2d,
            ly: currentMode === "A" ? y3d : y2d,
            vx: 0, vy: 0
        });
    });
}

function project(nx, ny, nz) {
    if (currentMode === "B") return { x: nx, y: ny, scale: 1 };
    // Fake 3D perspective projection
    let fl = 800; // focal length
    let z = nz + 500; // offset Z so things don't cross camera
    let scale = fl / z;
    if (z < 1) z = 1;
    // We blend between pure 2D and fake 3D
    let actScale = currentMode === "A" ? scale : 1;
    return {
        x: nx * actScale,
        y: ny * actScale,
        scale: actScale
    };
}

// Draw Loop
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 0.01;

    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    
    // Smooth camera pan based on mouse
    APP_CONFIG.camera.x += (mouse.x - canvas.width/2 - APP_CONFIG.camera.x) * 0.05;
    APP_CONFIG.camera.y += (mouse.y - canvas.height/2 - APP_CONFIG.camera.y) * 0.05;

    ctx.save();
    ctx.translate(cx - APP_CONFIG.camera.x * 0.2, cy - APP_CONFIG.camera.y * 0.2);

    // Update node logical positions (tweening between layouts)
    nodes.forEach(n => {
        let tX = currentMode === "A" ? n.pos3D.x : n.pos2D.x;
        let tY = currentMode === "A" ? n.pos3D.y : n.pos2D.y;
        
        // Add subtle floating effect in 3D mode
        if (currentMode === "A") {
            tY += Math.sin(time + n.pos3D.x) * 10;
        }

        n.lx += (tX - n.lx) * 0.05;
        n.ly += (tY - n.ly) * 0.05;
    });

    hoveredNode = null;
    let closestDist = 40; // Collision rad

    // Draw Edges
    edges.forEach(e => {
        let s = nodes.find(n => n.id === e.source);
        let t = nodes.find(n => n.id === e.target);
        if (!s || !t) return;
        
        let pS = project(s.lx, s.ly, s.z);
        let pT = project(t.lx, t.ly, t.z);

        ctx.beginPath();
        ctx.moveTo(pS.x, pS.y);
        
        if (currentMode === "B") {
            // Draw flowing multi-column flowchart lines
            ctx.bezierCurveTo(pS.x + 100, pS.y, pT.x - 100, pT.y, pT.x, pT.y);
            ctx.strokeStyle = APP_CONFIG.colors.mode2DEdge;
            ctx.lineWidth = 1;
        } else {
            // Direct glowing network links
            ctx.lineTo(pT.x, pT.y);
            ctx.strokeStyle = APP_CONFIG.colors.mode3DEdge;
            ctx.lineWidth = 1 * Math.min(pS.scale, pT.scale);
        }
        ctx.stroke();
    });

    // Draw Nodes
    nodes.forEach(n => {
        let p = project(n.lx, n.ly, n.z);
        
        // Mouse interact calc
        let dx = (mouse.worldX) - p.x;
        let dy = (mouse.worldY) - p.y;
        if (Math.hypot(dx, dy) < 20) {
            hoveredNode = n;
        }

        let isHover = hoveredNode === n;
        
        // Render node shape
        let radius = currentMode === "A" ? 4 * p.scale : 6;
        if (isHover) radius *= 1.5;

        let nodeColor = currentMode === "A" ? APP_CONFIG.colors.clusters[n.cluster] : APP_CONFIG.colors.mode2DNode;

        if (currentMode === "A") {
            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = nodeColor;
            ctx.fillStyle = nodeColor;
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = nodeColor;
            ctx.lineWidth = 1.5;
        }

        ctx.beginPath();
        if (currentMode === "B") {
             ctx.rect(p.x - 8, p.y - 8, 16, 16); // Square for flowchart
             ctx.fill();
             ctx.stroke();
        } else {
             ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); // Circle for 3D network
             ctx.fill();
        }
        ctx.shadowBlur = 0; // reset

        // Label
        ctx.fillStyle = currentMode === "A" ? APP_CONFIG.colors.mode3DText : APP_CONFIG.colors.mode2DText;
        ctx.font = `${currentMode === "A" ? 10 * p.scale : 10}px Fragment Mono`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Dim non-hovered in 3D mode for depth
        if (currentMode === "A" && !isHover) {
            ctx.globalAlpha = Math.min(1, p.scale);
        }
        
        ctx.fillText(n.id.toUpperCase(), p.x, p.y + (currentMode === "A" ? 15*p.scale : 20));
        ctx.globalAlpha = 1;
    });

    ctx.restore();

    updateHUD();
    requestAnimationFrame(render);
}

function updateHUD() {
    let modeText = currentMode === "A" ? "NETWORK_3D" : "DIAGRAM_2D";
    document.getElementById("hud-mode").innerText = modeText;
    document.body.className = currentMode === "A" ? "mode-3d" : "mode-2d";
    
    let trg = document.getElementById("hud-target");
    let clus = document.getElementById("hud-cluster-name");
    
    if (hoveredNode) {
        trg.innerText = hoveredNode.id.toUpperCase();
        trg.classList.add("active");
        clus.innerText = hoveredNode.cluster.toUpperCase();
        document.body.style.cursor = "pointer";
    } else {
        trg.innerText = "---";
        trg.classList.remove("active");
        clus.innerText = "---";
        document.body.style.cursor = "crosshair";
    }
}

// Init
window.onload = () => {
    canvas = document.getElementById("graphCanvas");
    ctx = canvas.getContext("2d");
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        
        let cx = canvas.width / 2;
        let cy = canvas.height / 2;
        // Map screen to canvas local space for collision
        mouse.worldX = e.clientX - cx + APP_CONFIG.camera.x * 0.2;
        mouse.worldY = e.clientY - cy + APP_CONFIG.camera.y * 0.2;
    });

    window.addEventListener("click", () => {
        if (hoveredNode) {
            window.location.href = hoveredNode.id.replace(/\s+/g, '-') + ".html";
        }
    });

    document.getElementById("modeToggle").addEventListener("click", () => {
        currentMode = currentMode === "A" ? "B" : "A";
        let btn = document.getElementById("modeToggle");
        btn.innerText = currentMode === "A" ? "SWITCH_TO_DIAGRAM_2D" : "SWITCH_TO_NETWORK_3D";
    });

    initGraph();
    render();
};
