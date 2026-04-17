// ==========================================
// MEDIA ARTISTS MAP — MAP ONLY
// ==========================================
const CFG = {
    font:       "Fragment Mono, monospace",
    globeRadius: 120,
    camera: {
        radius:    320,
        minRadius: 140,
        maxRadius: 800
    },
    earth: {
        rotationX: 0,
        rotationY: 1.675*Math.PI,   // spin east/west to align prime meridian
        rotationZ: 0
    },
    labels: {
        scoreThreshold: 60,
        offsetPx: -14,
        fontSize: 15,
        color:    "rgba(255,255,255,0.85)"
    },
    dot: {
        baseMin:   0.6,
        baseMax:   2.0,
        museumR:   1.8,
        hoverMult: 1.7,
        jitter:    2.2,       // max world-unit tangential spread to prevent overlap
        screenComp: true
    },
    light: { hemi: 0.55, cam: 0.8 }
};

let engine, scene, camera, globeMesh;
let nodesData    = [];
let hoveredMesh  = null;
let mediumColors = {};
let guiTexture   = null;
let globeBaseScale = 1;

// ==========================================
// UTIL
// ==========================================

// Deterministic jitter in [-1,1] based on a string key
function strHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

// Add a small tangential offset on the sphere surface to prevent dot overlap
function jitteredVec3(lat, lon, r, label) {
    const pos    = latLonToVec3(lat, lon, r);
    const normal = pos.clone().normalize();
    const ref    = Math.abs(normal.y) < 0.9
        ? new BABYLON.Vector3(0, 1, 0)
        : new BABYLON.Vector3(1, 0, 0);
    const tan1 = BABYLON.Vector3.Cross(normal, ref).normalize();
    const tan2 = BABYLON.Vector3.Cross(normal, tan1).normalize();
    const jx = strHash(label + '_x') * CFG.dot.jitter;
    const jy = strHash(label + '_y') * CFG.dot.jitter;
    return pos.add(tan1.scale(jx)).add(tan2.scale(jy));
}

function latLonToVec3(lat, lon, r) {
    const phi   = (90 - lat)  * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new BABYLON.Vector3(
          r * Math.sin(phi) * Math.cos(theta),   // X un-negated to match globe X-flip
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
    );
}

// ==========================================
// LOAD DATA
// ==========================================
async function loadData() {
    const artistRes = await fetch('../artists_data.json');
    const artists   = await artistRes.json();

    let museumData = [];
    try {
        const mRes = await fetch('../museums_data.json');
        museumData = await mRes.json();
    } catch (_) {}

    let catIndex = 0;
    const root = getComputedStyle(document.documentElement);

    artists.forEach(a => {
        if (!a.name) return;
        const loc = a.locations && a.locations[0];
        if (!loc || loc.lat == null) return;

        // Derive medium
        const desc = ((a.description || '') + ' ' + (a.notable_artworks || []).join(' ')).toLowerCase();
        let medium = 'Media Art';
        if      (desc.includes('sculpture'))    medium = 'Sculpture';
        else if (desc.includes('installation')) medium = 'Installation';
        else if (desc.includes('video'))        medium = 'Video Art';
        else if (desc.includes('digital') || desc.includes('computer')) medium = 'Digital Art';
        else if (desc.includes('photography'))  medium = 'Photography';
        else if (desc.includes('sound'))        medium = 'Sound Art';
        else if (desc.includes('light'))        medium = 'Light Art';
        else if (desc.includes('performance'))  medium = 'Performance';
        else if (desc.includes('kinetic'))      medium = 'Kinetic Art';

        if (!mediumColors[medium]) {
            const idx = (catIndex++ % 8) + 1;
            const hex = root.getPropertyValue(`--cat-${idx}`).trim() || '#ffffff';
            mediumColors[medium] = BABYLON.Color3.FromHexString(hex);
        }

        nodesData.push({
            type: 'artist', label: a.name,
            medium, lat: loc.lat, lon: loc.lon,
            score: a.score || 1,
            bio: a.description || '',
            notable: (a.notable_artworks || []).join(', ')
        });
    });

    museumData.forEach(m => {
        if (!m.museum_name || m.latitude == null) return;
        nodesData.push({
            type: 'museum', label: m.museum_name,
            lat: m.latitude, lon: m.longitude,
            score: 100,
            bio: m.description || '',
            image_url: m.image_url || ''
        });
    });

    // Populate stats panel
    const artistCount = nodesData.filter(n => n.type === 'artist').length;
    const museumCount = nodesData.filter(n => n.type === 'museum').length;
    document.getElementById('hud-nodes').innerText = artistCount + museumCount;

    const catHtml = Object.entries(mediumColors)
        .map(([k]) => {
            const n = nodesData.filter(a => a.medium === k).length;
            return `<div class="stat-row"><span class="label">${k}</span><span class="val" style="color:${mediumColors[k].toHexString()}">${n}</span></div>`;
        }).join('');
    document.getElementById('stat-categories').innerHTML = catHtml;
    document.getElementById('stat-total-artists').innerText = artistCount;
    const musEl = document.getElementById('stat-total-museums');
    if (musEl) musEl.innerText = museumCount;
}

// ==========================================
// BUILD GLOBE
// ==========================================
async function buildGlobe() {
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', './', 'earth.glb', scene);
        globeMesh = result.meshes[0];

        const bbox   = globeMesh.getHierarchyBoundingVectors();
        const size   = bbox.max.subtract(bbox.min);
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
            const scale = (CFG.globeRadius * 2) / maxDim;
            globeBaseScale = scale;
            // Flip X for correct lat/lon texture orientation
            globeMesh.scaling = new BABYLON.Vector3(-scale, scale, scale);
        }

        // Apply configurable rotation to align texture with lat/lon coordinates
        globeMesh.rotationQuaternion = null;
        globeMesh.rotation = new BABYLON.Vector3(
            CFG.earth.rotationX,
            CFG.earth.rotationY,
            CFG.earth.rotationZ
        );

        // Leave GLB materials intact; just tune PBR params if present
        globeMesh.getChildMeshes().forEach(m => {
            if (!m.material) return;
            m.isPickable = false;
            if (m.material.getClassName && m.material.getClassName() === 'PBRMaterial') {
                m.material.metallic    = 0.8;
                m.material.roughness   = 0.9;
                m.material.environmentIntensity = 0.6;
                // Don't override albedoColor or albedoTexture — let the GLB texture show
            }
        });
    } catch (e) {
        console.warn('earth.glb failed, using procedural sphere', e);
        globeMesh = BABYLON.MeshBuilder.CreateSphere('globe', {
            diameter: CFG.globeRadius * 2, segments: 64
        }, scene);
        const mat = new BABYLON.StandardMaterial('globeMat', scene);
        mat.diffuseTexture = new BABYLON.Texture(
            'https://playground.babylonjs.com/textures/earth.jpg', scene);
        mat.specularTexture = new BABYLON.Texture(
            'https://playground.babylonjs.com/textures/earthspecular.jpg', scene);
        mat.bumpTexture = new BABYLON.Texture(
            'https://playground.babylonjs.com/textures/earthnormal.jpg', scene);
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        globeMesh.material = mat;
        globeMesh.isPickable = false;
    }
}

// ==========================================
// BUILD NODE DOTS + LABELS
// ==========================================
function buildNodes() {
    guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');
    const protoMat = new BABYLON.StandardMaterial('dotProto', scene);
    protoMat.disableLighting = true;

    nodesData.forEach(node => {
        const isArtist = node.type === 'artist';
        const isMuseum = node.type === 'museum';

        // Radius: score-based for artists, fixed for museums
        const r = isArtist
            ? CFG.dot.baseMin + (node.score / 100) * (CFG.dot.baseMax - CFG.dot.baseMin)
            : CFG.dot.museumR;
        node.baseRadius = r;

        const mesh = BABYLON.MeshBuilder.CreateSphere(node.label, {
            diameter: r * 2,
            segments: isArtist ? 6 : 10
        }, scene);

        const mat = protoMat.clone('mat_' + node.label);
        const col = isMuseum
            ? new BABYLON.Color3(1, 0.84, 0)          // gold for museums
            : (mediumColors[node.medium] || new BABYLON.Color3(1, 1, 1));
        mat.emissiveColor = col;
        mat.alpha = 0.88;
        mesh.material = mat;
        mesh.baseColor = col;
        mesh.position  = jitteredVec3(node.lat, node.lon, CFG.globeRadius + 1.5, node.label);
        mesh.nodeData  = node;
        node.mesh      = mesh;

        // GUI label — flat horizontal, fixed pixel offset above dot
        if (node.score >= CFG.labels.scoreThreshold) {
            const lbl = new BABYLON.GUI.TextBlock();
            lbl.text       = node.label.toUpperCase();
            lbl.color      = CFG.labels.color;
            lbl.fontSize   = CFG.labels.fontSize;
            lbl.fontFamily = CFG.font;
            lbl.rotation   = 0; // always horizontal
            lbl.isVisible  = false;
            guiTexture.addControl(lbl);
            lbl.linkWithMesh(mesh);
            lbl.linkOffsetY = CFG.labels.offsetPx;
            node.guiText = lbl;
        }
    });
}

// ==========================================
// PER-FRAME UPDATE
// ==========================================
function updateFrame() {
    const camFwd = camera.getForwardRay().direction.normalize();
    // Screen-size compensation factor
    const scaleComp = CFG.dot.screenComp
        ? camera.radius / CFG.camera.radius
        : 1.0;

    nodesData.forEach(node => {
        const isHov = hoveredMesh === node.mesh;
        node.mesh.scaling.setAll(scaleComp * (isHov ? CFG.dot.hoverMult : 1.0));

        // Front-face culling for labels
        if (node.guiText) {
            const toMesh = node.mesh.getAbsolutePosition().normalize();
            const facing = BABYLON.Vector3.Dot(toMesh, camFwd);
            node.guiText.isVisible = facing < 0.12;
        }
    });
}

// ==========================================
// ENGINE + SCENE INIT
// ==========================================
async function initEngine() {
    const canvas = document.getElementById('renderCanvas');

    try {
        engine = new BABYLON.WebGPUEngine(canvas);
        await engine.initAsync();
    } catch (_) {
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true, stencil: true
        });
    }

    // Render at full device pixel ratio (retina / HiDPI)
    engine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // Environment (needed for PBR materials on earth.glb)
    scene.createDefaultEnvironment({ createSkybox: false, createGround: false });

    camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.5,
        CFG.camera.radius, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit  = CFG.camera.minRadius;
    camera.upperRadiusLimit  = CFG.camera.maxRadius;
    camera.wheelDeltaPercentage = 0.02;
    camera.minZ = 0.1; camera.maxZ = 10000;
    camera.panningSensibility = 0;

    // Hemisphere fills shadows; cam-attached point ensures facing side is always lit
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = CFG.light.hemi;
    hemi.groundColor = new BABYLON.Color3(0.15, 0.15, 0.15);

    const camLight = new BABYLON.PointLight('camLight', BABYLON.Vector3.Zero(), scene);
    camLight.parent    = camera;
    camLight.intensity = CFG.light.cam;

    await buildGlobe();
    buildNodes();

    // Per-frame loop
    scene.onBeforeRenderObservable.add(updateFrame);

    // Hover
    scene.onPointerMove = () => {
        const hit = scene.pick(scene.pointerX, scene.pointerY);
        if (hit.pickedMesh && hit.pickedMesh.nodeData) {
            if (hoveredMesh !== hit.pickedMesh) {
                if (hoveredMesh) hoveredMesh.material.emissiveColor = hoveredMesh.baseColor;
            }
            hoveredMesh = hit.pickedMesh;
            hoveredMesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            document.body.style.cursor = 'pointer';
            document.getElementById('hud-target').innerText = hoveredMesh.nodeData.label.toUpperCase();
            document.getElementById('hud-target').classList.add('active');
            document.getElementById('hud-cluster').innerText =
                (hoveredMesh.nodeData.medium || 'MUSEUM').toUpperCase();
        } else {
            if (hoveredMesh) {
                hoveredMesh.material.emissiveColor = hoveredMesh.baseColor;
                hoveredMesh = null;
            }
            document.body.style.cursor = 'crosshair';
            document.getElementById('hud-target').innerText = '---';
            document.getElementById('hud-target').classList.remove('active');
            document.getElementById('hud-cluster').innerText = '---';
        }
    };

    window.addEventListener('click', () => {
        if (!hoveredMesh || !hoveredMesh.nodeData) return;
        const nd = hoveredMesh.nodeData;
        if (nd.type === 'artist')  fetchArtistWikiData(nd);
        if (nd.type === 'museum')  showMuseumData(nd);
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => {
        engine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));
        engine.resize();
    });
}

// ==========================================
// WIKI / PANEL
// ==========================================
function showFallbackImage(name) {
    const img = document.getElementById('artist-image');
    img.src = `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`;
    img.onload = () => {
        document.getElementById('artist-img-loader').classList.remove('active');
        img.classList.remove('hidden');
    };
}

async function fetchImageFromWiki(title) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=400&format=json&origin=*`;
        const data = await (await fetch(url)).json();
        const pages = data.query.pages;
        const pid = Object.keys(pages)[0];
        return (pid !== '-1' && pages[pid].thumbnail) ? pages[pid].thumbnail.source : null;
    } catch (_) { return null; }
}

async function fetchArtistWikiData(nd) {
    const panel = document.getElementById('artist-details');
    panel.classList.remove('hidden');
    document.getElementById('artist-name').innerText = nd.label;
    document.getElementById('artist-img-loader').classList.add('active');
    const img = document.getElementById('artist-image');
    img.classList.add('hidden');
    document.getElementById('artist-bio').innerText = 'Loading...';
    document.getElementById('artist-notable-work').innerText = nd.notable || '---';

    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(nd.label)}&prop=extracts&exintro=1&format=json&origin=*`;
        const data  = await (await fetch(url)).json();
        const pages = data.query.pages;
        const pid   = Object.keys(pages)[0];
        if (pid !== '-1' && pages[pid].extract) {
            const tmp = document.createElement('div');
            tmp.innerHTML = pages[pid].extract;
            document.getElementById('artist-bio').innerText = tmp.textContent || '';
        } else {
            document.getElementById('artist-bio').innerText = nd.bio || 'No biography available.';
        }

        let imgUrl = nd.notable ? await fetchImageFromWiki(nd.notable.split(', ')[0]) : null;
        if (!imgUrl) imgUrl = await fetchImageFromWiki(nd.label);
        if (imgUrl) {
            img.src = imgUrl;
            img.onload = () => { document.getElementById('artist-img-loader').classList.remove('active'); img.classList.remove('hidden'); };
        } else {
            showFallbackImage(nd.label);
        }
    } catch (_) {
        document.getElementById('artist-bio').innerText = nd.bio || 'Error loading data.';
        showFallbackImage(nd.label);
    }
}

function showMuseumData(nd) {
    const panel = document.getElementById('artist-details');
    panel.classList.remove('hidden');
    document.getElementById('artist-name').innerText = nd.label.toUpperCase();
    document.getElementById('artist-img-loader').classList.add('active');
    const img = document.getElementById('artist-image');
    img.classList.add('hidden');
    document.getElementById('artist-bio').innerText = nd.bio || 'No description available.';
    document.getElementById('artist-notable-work').innerText = 'MUSEUM / INSTITUTION';
    if (nd.image_url) {
        img.src = nd.image_url;
        img.onload = () => { document.getElementById('artist-img-loader').classList.remove('active'); img.classList.remove('hidden'); };
    } else {
        showFallbackImage(nd.label);
    }
}

// ==========================================
// BOOT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    await initEngine();
});
