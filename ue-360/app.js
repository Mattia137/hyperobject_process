import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
const PANORAMAS = [
    { name: "CineCameraActor4.0001", file: "CineCameraActor4.0001.jpeg" },
    { name: "CineCameraActor10.0002", file: "CineCameraActor10.0002.jpeg" },
    { name: "CineCameraActor11.0000", file: "CineCameraActor11.0000.jpeg" },
    { name: "CineCameraActor16.0001", file: "CineCameraActor16.0001.jpeg" },
    { name: "CineCameraActor20.0000", file: "CineCameraActor20.0000.jpeg" },
    { name: "CineCameraActor21.0003", file: "CineCameraActor21.0003.jpeg" }
];

let currentPanoIndex = 0;
let isTransitioning = false;

// UI Elements
const loaderOverlay = document.getElementById('loading-overlay');
const loaderText = document.getElementById('loader-text');
const hudFov = document.getElementById('hud-fov');
const hudRot = document.getElementById('hud-rot');
const mapNodes = [
    document.getElementById('map-node-0'),
    document.getElementById('map-node-1'),
    document.getElementById('map-node-2'),
    document.getElementById('map-node-3'),
    document.getElementById('map-node-4'),
    document.getElementById('map-node-5')
];
const dots = [
    document.getElementById('dot-0'),
    document.getElementById('dot-1'),
    document.getElementById('dot-2'),
    document.getElementById('dot-3'),
    document.getElementById('dot-4'),
    document.getElementById('dot-5')
];
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const activeCamName = document.getElementById('active-cam-name');

// Three.js Elements
let scene, camera, renderer, controls;
let sphereActive, sphereNext;
let textures = [];

function init() {
    const canvas = document.getElementById('c');
    
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // Slightly offset from exactly 0 to give OrbitControls a direction
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Zoom disabled in standard 360 viewers
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3; // Slow cinematic rotation
    
    // Geometry for spheres
    const geometryActive = new THREE.SphereGeometry(500, 60, 40);
    // Invert the geometry on the x-axis so that all of the faces point inward and textures aren't mirrored
    geometryActive.scale(-1, 1, 1);
    
    // Slightly smaller sphere for fading to avoid z-fighting
    const geometryNext = new THREE.SphereGeometry(499, 60, 40);
    geometryNext.scale(-1, 1, 1);
    
    // Create two spheres for crossfading
    const materialActive = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 });
    const materialNext = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    
    sphereActive = new THREE.Mesh(geometryActive, materialActive);
    sphereNext = new THREE.Mesh(geometryNext, materialNext);
    
    scene.add(sphereActive);
    scene.add(sphereNext);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Setup UI listeners
    btnPrev.addEventListener('click', () => { navigateTo((currentPanoIndex - 1 + PANORAMAS.length) % PANORAMAS.length); });
    btnNext.addEventListener('click', () => { navigateTo((currentPanoIndex + 1) % PANORAMAS.length); });
    
    mapNodes.forEach((node, idx) => {
        node.addEventListener('click', () => { navigateTo(idx); });
    });
    
    // Stop auto-rotate on interaction
    controls.addEventListener('start', () => {
        controls.autoRotate = false;
    });
    
    // FOV control via mouse scroll
    window.addEventListener('wheel', (e) => {
        camera.fov += e.deltaY * 0.05;
        camera.fov = Math.max(30, Math.min(camera.fov, 120)); // Limit FOV bounds
        camera.updateProjectionMatrix();
    });
    
    loadTextures();
}

function loadTextures() {
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    
    let loadedCount = 0;
    
    manager.onProgress = function (item, loaded, total) {
        const percent = Math.round((loaded / total) * 100);
        loaderText.innerText = `INITIALIZING ENVIRONMENT... ${percent}%`;
    };
    
    manager.onLoad = function () {
        // Hide loader
        loaderOverlay.style.opacity = '0';
        setTimeout(() => {
            loaderOverlay.style.display = 'none';
        }, 800);
        
        // Set initial texture
        sphereActive.material.map = textures[0];
        sphereActive.material.needsUpdate = true;
        updateUI();
        
        // Start render loop
        animate();
    };
    
    // Preload both textures
    PANORAMAS.forEach((pano, idx) => {
        loader.load(pano.file, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            textures[idx] = texture;
        });
    });
}

function navigateTo(targetIndex) {
    if (targetIndex === currentPanoIndex || isTransitioning) return;
    
    isTransitioning = true;
    
    // Setup crossfade
    sphereNext.material.map = textures[targetIndex];
    sphereNext.material.opacity = 0;
    sphereNext.material.needsUpdate = true;
    
    let startOpacity = 0;
    const transitionDuration = 800; // ms
    const startTime = performance.now();
    
    function fade() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / transitionDuration, 1);
        
        // Easing easeInOutQuad
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        sphereNext.material.opacity = ease;
        
        if (progress < 1) {
            requestAnimationFrame(fade);
        } else {
            // Swap active spheres
            sphereActive.material.map = textures[targetIndex];
            sphereActive.material.needsUpdate = true;
            sphereNext.material.opacity = 0;
            
            // Update state
            currentPanoIndex = targetIndex;
            updateUI();
            isTransitioning = false;
        }
    }
    
    fade();
}

function updateUI() {
    // Update active classes
    mapNodes.forEach((node, idx) => {
        node.classList.toggle('active', idx === currentPanoIndex);
    });
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentPanoIndex);
    });
    
    // Update text
    activeCamName.innerText = PANORAMAS[currentPanoIndex].name;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateHUD() {
    // FoV
    hudFov.innerText = camera.fov.toFixed(1);
    
    // Calculate Pitch / Yaw from camera rotation
    // Yaw is around Y axis, Pitch is around X axis
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    const pitch = THREE.MathUtils.radToDeg(euler.x);
    const yaw = THREE.MathUtils.radToDeg(euler.y);
    
    hudRot.innerText = `${pitch.toFixed(1)} / ${yaw.toFixed(1)}`;
}

function animate() {
    requestAnimationFrame(animate);
    
    controls.update(); // required if controls.enableDamping or controls.autoRotate are set
    updateHUD();
    
    renderer.render(scene, camera);
}

// Start
init();
