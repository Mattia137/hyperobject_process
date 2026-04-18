import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const DATA = {
    p0: {
        file: 'P0_groundfloor.pdf',
        stats: { sqft: '85,400', exh: '4', elv: '6', park: '0', occ: '1,200' },
        desc: 'The ground floor serves as the primary ingress and core distributor for the hyperobject. Sprawling lobby areas directly funnel into the structural bedrock interfaces.'
    },
    p3: {
        file: 'P3_theater.pdf',
        stats: { sqft: '42,100', exh: '2', elv: '4', park: '0', occ: '3,500' },
        desc: 'The P3 Theater node introduces expansive void spaces for acoustics and performances. A dense structural lattice wraps the exterior shell holding the viewing galleries.'
    },
    s1: {
        file: 'S1_short-section.pdf',
        stats: { sqft: 'N/A', exh: 'ALL', elv: '6', park: 'N/A', occ: '8,000' },
        desc: 'S1 short section displays the total vertical stratification of the project, cutting cleanly through all public nodes and subterranean anchors.'
    }
};

let currentId = 'p0';

// --- UI Elements ---
const btns = document.querySelectorAll('.draw-btn');
const uiSqft = document.getElementById('d-sqft');
const uiExh = document.getElementById('d-exh');
const uiElv = document.getElementById('d-elv');
const uiPark = document.getElementById('d-park');
const uiOcc = document.getElementById('d-occ');
const uiDesc = document.getElementById('d-desc');

// --- PDF Logic ---
const pdfCanvas = document.getElementById('pdf-render');
const pdfCtx = pdfCanvas.getContext('2d');
const pdfContainer = document.getElementById('pdf-container');
let currentPdf = null;
let currentRenderTask = null;

// PDF Transform State
let pdfTransform = { x: 0, y: 0, scale: 1.0 };
let isDragging = false;
let startDrag = { x: 0, y: 0 };

pdfContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startDrag = { x: e.clientX - pdfTransform.x, y: e.clientY - pdfTransform.y };
});
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    pdfTransform.x = e.clientX - startDrag.x;
    pdfTransform.y = e.clientY - startDrag.y;
    applyPdfTransform();
});
window.addEventListener('mouseup', () => { isDragging = false; });
pdfContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = e.deltaY * -0.0008; // Less sensitive zoom multiplier
    pdfTransform.scale = Math.min(Math.max(0.1, pdfTransform.scale + zoomAmount), 5.0);
    applyPdfTransform();
}, { passive: false });

function applyPdfTransform() {
    pdfCanvas.style.transform = `translate(${pdfTransform.x}px, ${pdfTransform.y}px) scale(${pdfTransform.scale})`;
}

async function loadPDF(filename) {
    if (currentPdf) currentPdf.destroy();
    currentPdf = await pdfjsLib.getDocument(filename).promise;
    renderPage(1);
}

async function renderPage(num) {
    const page = await currentPdf.getPage(num);
    
    // High res output scale
    const viewport = page.getViewport({ scale: 2.5 });
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    
    // Auto fit into container
    pdfTransform = { x: 0, y: 0, scale: Math.min(
        (pdfContainer.clientWidth - 40) / viewport.width,
        (pdfContainer.clientHeight - 40) / viewport.height
    )};
    
    pdfTransform.scale = Math.max(0.2, pdfTransform.scale);
    applyPdfTransform();
    
    if (currentRenderTask) currentRenderTask.cancel();
    
    const renderContext = {
        canvasContext: pdfCtx,
        viewport: viewport
    };
    currentRenderTask = page.render(renderContext);
}

// --- Three.js Logic ---
let scene, camera, renderer, controls;
let planeMeshes = { p0: null, p3: null, s1: null };

function initThree() {
    const canvas = document.getElementById('c');
    const container = document.getElementById('three-container');
    
    scene = new THREE.Scene();
    
    // Orthographic Camera for explicitly Isometric Projection
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 65;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 2000
    );
    
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true; // allow spinning around isometric pivot
    controls.enableZoom = false; // explicitly disable zooming
    controls.enablePan = false; // explicitly disable panning
    
    window.addEventListener('resize', onResize);
    
    loadKeyplan();
}

function loadKeyplan() {
    const loader = new GLTFLoader();
    loader.load('keyplan.glb', (gltf) => {
        const model = gltf.scene;
        
        // Auto scale and center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 50 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        
        // Parse and stylize meshes
        model.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                
                // Identify target planes
                if (name.includes('p0') || name.includes('p3') || name.includes('s1')) {
                    child.material = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.5,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    
                    if (name.includes('p0')) planeMeshes.p0 = child;
                    if (name.includes('p3')) planeMeshes.p3 = child;
                    if (name.includes('s1')) planeMeshes.s1 = child;
                    
                } else {
                    // Structure - Pure White + Architect/CAD edges for crisp visibility
                    child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    
                    const edges = new THREE.EdgesGeometry(child.geometry);
                    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 1 }));
                    child.add(line);
                }
            }
        });
        
        scene.add(model);
        update3DMaterials();
    });
}

function update3DMaterials() {
    // Reset all
    Object.keys(planeMeshes).forEach(key => {
        const mesh = planeMeshes[key];
        if (mesh) {
            mesh.material.color.setHex(0xffffff);
            mesh.material.opacity = 0.5;
        }
    });
    
    // Active plan -> Solid Black
    if (planeMeshes[currentId]) {
        planeMeshes[currentId].material.color.setHex(0x000000);
        planeMeshes[currentId].material.opacity = 1.0;
    }
}

function onResize() {
    const container = document.getElementById('three-container');
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 65;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
}

// --- Interactive Linking ---
function switchDrawing(id) {
    if (currentId === id) return;
    currentId = id;
    
    btns.forEach(b => b.classList.toggle('active', b.dataset.id === id));
    
    const d = DATA[id];
    uiSqft.innerText = d.stats.sqft;
    uiExh.innerText = d.stats.exh;
    uiElv.innerText = d.stats.elv;
    uiPark.innerText = d.stats.park;
    uiOcc.innerText = d.stats.occ;
    uiDesc.innerText = d.desc;
    
    loadPDF(d.file);
    update3DMaterials();
}

btns.forEach(b => {
    b.addEventListener('click', () => switchDrawing(b.dataset.id));
});

// Start
initThree();
render();
loadPDF(DATA[currentId].file);
