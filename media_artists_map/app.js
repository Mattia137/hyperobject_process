// ==========================================
// EARTH-MARS BRIDGE PROJECT - PARAMETERS
// ==========================================
export const APP_CONFIG = {
    fontFamily: "Fragment Mono, monospace",
    defaultMode: "MAP", // "MAP" or "NETWORK"
    colors: {
        background: new BABYLON.Color4(0, 0, 0, 1),
        globe: new BABYLON.Color3(0.04, 0.04, 0.04),
        globeWireframe: new BABYLON.Color3(0.1, 0.1, 0.1),
        edgeLine: new BABYLON.Color4(1, 1, 1, 0.15),
        nodeDefault: new BABYLON.Color3(1, 1, 1),
        nodeOpacity: 0.8, // 0.0 – 1.0
        hoverEffect: new BABYLON.Color3(1, 1, 1),
        museumNode: new BABYLON.Color3(1.0, 0.84, 0.0) // Gold/Yellow #FFD700
    },
    earthMaterial: {
        metallic: 0.9,
        roughness: 0.7,
        alpha: 1.0,
        environmentIntensity: 0.3,
        // Fine-tune these to align texture to lat/lon:
        rotationX: 0,           // radians — tilt north/south
        rotationY: Math.PI,     // radians — spin east/west
        rotationZ: 0,           // radians — roll
        wireframeEnabled: false,
        wireframeThickness: 0.1,
        wireframeColor: new BABYLON.Color4(1, 1, 1, 0.15)
    },
    labels: {
        enabled: true,
        scoreThreshold: 65,     // Only artists above this score get a label
        offsetFactor: 22,       // World-units the label floats above the dot
        fontSize: 10,
        lineColor: "rgba(255,255,255,0.4)",
        textColor: "rgba(255,255,255,0.85)"
    },
    globeTextures: {
        diffuse: "https://playground.babylonjs.com/textures/earth.jpg",
        specular: "https://playground.babylonjs.com/textures/earthspecular.jpg",
        bump: "https://playground.babylonjs.com/textures/earthnormal.jpg"
    },
    lightIntensity: 1.2,
    physics: {
        networkRadiusScale: 400,
        clusterSpacing: 200,
        iterations: 150
    },
    globeRadius: 120,
    camera: {
        radiusMap: 320,
        radiusNet: 600,
        zoomSpeed: 30,          // Higher = faster scroll zoom
        minRadius: 130,
        maxRadius: 900
    },
    animationSpeed: 0.06
};

const palette = [
    new BABYLON.Color3(0.0, 1.0, 0.8), // Cyan
    new BABYLON.Color3(1.0, 0.0, 0.5), // Magenta
    new BABYLON.Color3(0.8, 1.0, 0.0), // Electric Yellow
    new BABYLON.Color3(1.0, 0.4, 0.0), // Neon Orange
    new BABYLON.Color3(0.6, 0.0, 1.0), // Deep Purple
    new BABYLON.Color3(0.0, 0.6, 1.0), // Neon Blue
    new BABYLON.Color3(0.3, 1.0, 0.3), // Acid Green
    new BABYLON.Color3(1.0, 0.1, 0.2)  // Crimson
];

// Context State
let engine, scene, camera, globeMesh;
let nodesData = []; // Combined array of artists and mediums
let edgesData = [];
let nodeMeshes = [];
let edgeLines = [];
let currentMode = APP_CONFIG.defaultMode;
let hoveredMesh = null;
let mediumColors = {};

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180); // +180 to align with standard mapping
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new BABYLON.Vector3(x, y, z);
}

function rand3D(scale) {
    return new BABYLON.Vector3(
        (Math.random() - 0.5) * scale,
        (Math.random() - 0.5) * scale,
        (Math.random() - 0.5) * scale
    );
}

async function loadData() {
    // Load Artists
    const response = await fetch('../artists_data.json');
    const data = await response.json();

    // Load Museums
    let museumData = [];
    try {
        const musRes = await fetch('../museums_data.json');
        museumData = await musRes.json();
    } catch(e) {
        console.warn("Could not load museums_data.json", e);
    }

    let mediumDict = {};
    let artistIdCounter = 0;
    let museumIdCounter = 0;

    data.forEach(artist => {
        if (!artist.name) return;

        let hasLocation = artist.locations && artist.locations.length > 0
            && artist.locations[0].lat !== null && artist.locations[0].lat !== undefined;
        if (!hasLocation) return; // Skip if no confirmed coordinates

        let primaryMedium = artist.mediums && artist.mediums.length > 0 ? artist.mediums[0] : "digital art";

        if (!mediumDict[primaryMedium]) {
            mediumDict[primaryMedium] = {
                id: `medium_${Object.keys(mediumDict).length}`,
                label: primaryMedium,
                type: "medium",
                artists: []
            };
            mediumColors[primaryMedium] = palette[Object.keys(mediumColors).length % palette.length];
        }

        let lat = artist.locations[0].lat;
        let lon = artist.locations[0].lon;

        let aNode = {
            id: `artist_${artistIdCounter++}`,
            label: artist.name,
            type: "artist",
            medium: primaryMedium,
            hasLoc: true,
            lat: lat,
            lon: lon,
            bio: artist.description || "",
            notable: (artist.notable_artworks && artist.notable_artworks.length > 0) ? artist.notable_artworks.join(", ") : "",
            score: artist.score || 1
        };

        nodesData.push(aNode);
        mediumDict[primaryMedium].artists.push(aNode.id);

        edgesData.push({
            source: aNode.id,
            target: mediumDict[primaryMedium].id
        });
    });

    Object.values(mediumDict).forEach(m => nodesData.push(m));

    // Add Museum nodes
    museumData.forEach(museum => {
        if (!museum.museum_name || museum.latitude == null || museum.longitude == null) return;

        let mNode = {
            id: `museum_${museumIdCounter++}`,
            label: museum.museum_name,
            type: "museum",
            hasLoc: true,
            lat: museum.latitude,
            lon: museum.longitude,
            bio: museum.description || "",
            image_url: museum.image_url || "",
            score: 100 // High score to always show label if we want, or handle differently
        };
        nodesData.push(mNode);
    });

    // Precalculate network 2D/3D planar physics layout
    computeNetworkLayout(Object.values(mediumDict));

    document.getElementById("hud-nodes").innerText = artistIdCounter + museumIdCounter;
    document.getElementById("hud-edges").innerText = Object.keys(mediumDict).length;

    // Populate Right Panel Stats
    document.getElementById("stat-total-artists").innerText = artistIdCounter;
    let musEl = document.getElementById("stat-total-museums");
    if (musEl) musEl.innerText = museumIdCounter;

    // Calculate top media categories
    let cats = Object.values(mediumDict).sort((a, b) => b.artists.length - a.artists.length).slice(0, 5);
    let catsHtml = "";
    cats.forEach(c => {
        catsHtml += `<div class="stat-row"><span class="label">${c.label}</span><span class="val" style="color: ${mediumColors[c.label].toHexString()}">${c.artists.length}</span></div>`;
    });
    document.getElementById("stat-categories").innerHTML = catsHtml;
}

function computeNetworkLayout(mediums) {
    // Simple grouped cluster layout to avoid massive physics freezing
    let totalMediums = mediums.length;
    let angleStep = (Math.PI * 2) / totalMediums;

    mediums.forEach((m, i) => {
        // Medium node position in Network Mode
        let angle = i * angleStep;
        let radius = APP_CONFIG.physics.networkRadiusScale;
        m.networkPos = new BABYLON.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        m.mapPos = new BABYLON.Vector3(0, 0, 0); // hidden or centered in Map Mode

        // Distribute its artists around it
        let artistsForMedium = nodesData.filter(n => n.type === "artist" && n.medium === m.label);
        artistsForMedium.forEach((a, j) => {
            let offsetAngle = (j / artistsForMedium.length) * Math.PI * 2;
            let offsetRadius = 40 + Math.random() * 80;

            a.networkPos = new BABYLON.Vector3(
                m.networkPos.x + Math.cos(offsetAngle) * offsetRadius,
                m.networkPos.y + Math.sin(offsetAngle) * offsetRadius,
                (Math.random() - 0.5) * 50 // Slight Z variation for depth
            );

            if (a.hasLoc) {
                a.mapPos = latLonToVector3(a.lat, a.lon, APP_CONFIG.globeRadius + 1);
            } else {
                // If no location, float them slightly off globe by medium cluster
                let mapOffsetAngle = (j / artistsForMedium.length) * Math.PI * 2;
                a.mapPos = new BABYLON.Vector3(
                    Math.cos(mapOffsetAngle) * (APP_CONFIG.globeRadius + 40),
                    (i - totalMediums / 2) * 10,
                    Math.sin(mapOffsetAngle) * (APP_CONFIG.globeRadius + 40)
                );
            }
        });
    });

    // Add museums to a general cluster or distribute them on the periphery in Network mode
    let museums = nodesData.filter(n => n.type === "museum");
    museums.forEach((m, idx) => {
        if (m.hasLoc) {
            m.mapPos = latLonToVector3(m.lat, m.lon, APP_CONFIG.globeRadius + 1);
        }

        // For Network Mode, position them in a larger outer ring
        let angle = (idx / museums.length) * Math.PI * 2;
        let radius = APP_CONFIG.physics.networkRadiusScale * 1.5;
        m.networkPos = new BABYLON.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * 100
        );
    });
}

async function initEngine() {
    const canvas = document.getElementById("renderCanvas");

    // Try WebGPU first, fallback to WebGL
    try {
        engine = new BABYLON.WebGPUEngine(canvas);
        await engine.initAsync();
    } catch (e) {
        console.warn("WebGPU not available, falling back to WebGL2");
        engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }

    scene = new BABYLON.Scene(engine);
    scene.clearColor = APP_CONFIG.colors.background;

    scene.createDefaultEnvironment({
        createSkybox: false,
        createGround: false
    });

    camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2.5, APP_CONFIG.camera.radiusMap, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = APP_CONFIG.camera.minRadius;
    camera.upperRadiusLimit = APP_CONFIG.camera.maxRadius;
    // Faster, smoother scroll zoom
    camera.wheelPrecision = 1;
    camera.wheelDeltaPercentage = 0.02;
    camera.minZ = 0.1;
    camera.maxZ = 10000;
    camera.panningSensibility = 0; // disable panning, only orbit+zoom

    let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = APP_CONFIG.lightIntensity;

    await buildSceneElements();

    scene.onBeforeRenderObservable.add(() => {
        updateTransitions();
        updateEdges();
        updateLabels();
    });

    scene.onPointerMove = function () {
        let hit = scene.pick(scene.pointerX, scene.pointerY);

        if (hit.pickedMesh && hit.pickedMesh.nodeData) {
            hoveredMesh = hit.pickedMesh;
            document.body.style.cursor = "pointer";
            document.getElementById("hud-target").innerText = hoveredMesh.nodeData.label.toUpperCase();
            document.getElementById("hud-target").classList.add("active");
            document.getElementById("hud-cluster").innerText = (hoveredMesh.nodeData.medium || "SUPPORT").toUpperCase();

            // Highlight color
            if (hoveredMesh.material) {
                hoveredMesh.material.emissiveColor = APP_CONFIG.colors.hoverEffect;
            }
        } else {
            if (hoveredMesh) {
                // restore color
                if (hoveredMesh.material) {
                    hoveredMesh.material.emissiveColor = hoveredMesh.baseColor;
                }
                hoveredMesh = null;
            }
            document.body.style.cursor = "default";
            document.getElementById("hud-target").innerText = "---";
            document.getElementById("hud-target").classList.remove("active");
            document.getElementById("hud-cluster").innerText = "---";
        }
    };

    window.addEventListener("click", () => {
        if (hoveredMesh && hoveredMesh.nodeData) {
            if (hoveredMesh.nodeData.type === "artist") {
                fetchArtistWikiData(hoveredMesh.nodeData);
            } else if (hoveredMesh.nodeData.type === "museum") {
                showMuseumData(hoveredMesh.nodeData);
            }
        }
    });

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
        _labelViewport = null; // invalidate viewport cache
    });
}

async function buildSceneElements() {
    // Build Globe via GLB async load
    try {
        let result = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "earth.glb", scene);
        globeMesh = result.meshes[0];

        let bbox = globeMesh.getHierarchyBoundingVectors();
        let size = bbox.max.subtract(bbox.min);
        let maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            let targetSize = APP_CONFIG.globeRadius * 2 * 0.98; // Fit slightly inside points
            let scale = targetSize / maxDim;
            globeMesh.scaling = new BABYLON.Vector3(scale, scale, scale);

            if (APP_CONFIG.earthMaterial.rotationOffset) {
                globeMesh.rotationQuaternion = null;
                globeMesh.rotation = new BABYLON.Vector3(
                    APP_CONFIG.earthMaterial.rotationX,
                    APP_CONFIG.earthMaterial.rotationY,
                    APP_CONFIG.earthMaterial.rotationZ
                );
            }

            // Apply EarthMaterial params mapping
            globeMesh.getChildMeshes().forEach(m => {
                if (m.material && m.material.getClassName() === "PBRMaterial") {
                    m.material.metallic = APP_CONFIG.earthMaterial.metallic;
                    m.material.roughness = APP_CONFIG.earthMaterial.roughness;
                    m.material.environmentIntensity = APP_CONFIG.earthMaterial.environmentIntensity;
                    m.material.alpha = APP_CONFIG.earthMaterial.alpha;
                    if (APP_CONFIG.earthMaterial.alpha < 1.0) {
                        m.material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                    }
                }
                if (APP_CONFIG.earthMaterial.wireframeEnabled) {
                    let wfClone = m.clone(m.name + "_wf");
                    let wfMat = new BABYLON.StandardMaterial("wfMat", scene);
                    wfMat.wireframe = true;
                    wfMat.emissiveColor = new BABYLON.Color3(APP_CONFIG.earthMaterial.wireframeColor.r, APP_CONFIG.earthMaterial.wireframeColor.g, APP_CONFIG.earthMaterial.wireframeColor.b);
                    wfMat.disableLighting = true;
                    wfMat.alpha = APP_CONFIG.earthMaterial.wireframeColor.a;
                    wfClone.material = wfMat;
                }
            });
        }
    } catch (e) {
        console.warn("Could not load earth.glb, falling back to sphere", e);
        globeMesh = BABYLON.MeshBuilder.CreateSphere("globe", { diameter: APP_CONFIG.globeRadius * 2, segments: 64 }, scene);
        let globeMat = new BABYLON.PBRMaterial("globeMat", scene);
        globeMat.albedoColor = new BABYLON.Color3(0.04, 0.04, 0.04);
        globeMat.roughness = 0.5;
        globeMat.metallic = 0.1;
        globeMesh.material = globeMat;
    }

    // We use basic meshes for nodes
    let artistMatProto = new BABYLON.StandardMaterial("artistMat", scene);
    artistMatProto.disableLighting = true;

    // Build fullscreen GUI for labels
    let advancedTexture = null;
    if (APP_CONFIG.labels.enabled) {
        advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    }

    nodesData.forEach(node => {
        let isArtist = node.type === "artist";
        let isMuseum = node.type === "museum";

        // World-space diameter — stays visually constant because we compensate scaling per-frame
        let diameter = isArtist ? (1.5 + (node.score / 100) * 10.5) : (isMuseum ? 5 : 8);
        node.baseDiameter = diameter; // remember for scale compensation

        let mesh = BABYLON.MeshBuilder.CreateSphere(node.id, {
            diameter: diameter,
            segments: isArtist ? 6 : (isMuseum ? 16 : 12)
        }, scene);

        let mat = artistMatProto.clone("mat_" + node.id);
        let nColor;
        if (isArtist) nColor = mediumColors[node.medium] || APP_CONFIG.colors.nodeDefault;
        else if (isMuseum) nColor = APP_CONFIG.colors.museumNode;
        else nColor = APP_CONFIG.colors.nodeDefault;

        mat.emissiveColor = nColor;
        mat.alpha = APP_CONFIG.colors.nodeOpacity;
        mesh.material = mat;
        mesh.baseColor = nColor;

        mesh.position = currentMode === "MAP" ? node.mapPos : node.networkPos;
        mesh.nodeData = node;
        node.mesh = mesh;

        // --- Label for high-score artists and museums ---
        if ((isArtist || isMuseum) && advancedTexture && node.score > APP_CONFIG.labels.scoreThreshold) {
            let targetNode = new BABYLON.TransformNode("lbl_" + node.id, scene);
            // start offset, will be updated each frame
            targetNode.position = mesh.position.add(
                mesh.position.normalizeToNew().scale(APP_CONFIG.labels.offsetFactor)
            );

            let line = new BABYLON.GUI.Line();
            line.lineWidth = 1;
            line.dash = [3, 3];
            line.color = APP_CONFIG.labels.lineColor;
            advancedTexture.addControl(line);
            line.linkWithMesh(mesh);

            let idText = new BABYLON.GUI.TextBlock();
            idText.text = node.label.toUpperCase();
            idText.color = APP_CONFIG.labels.textColor;
            idText.fontSize = APP_CONFIG.labels.fontSize;
            idText.fontFamily = "Fragment Mono, monospace";
            idText.outlineWidth = 2;
            idText.outlineColor = "rgba(0,0,0,0.6)";
            advancedTexture.addControl(idText);
            idText.linkWithMesh(targetNode);

            line.connectedControl = idText;

            node.labelTarget = targetNode;
            node.guiLine = line;
            node.guiText = idText;
        }

        if (!isArtist && !isMuseum) {
            mesh.visibility = currentMode === "MAP" ? 0 : 1;
        }

        nodeMeshes.push(mesh);
    });

    // Build Edges as LineSystem for heavy performance improvement
    updateEdges(true); // initial build
}

function updateEdges(initial = false) {
    let linesArray = [];
    let colorsArray = [];

    edgesData.forEach(edge => {
        let sNode = nodesData.find(n => n.id === edge.source);
        let tNode = nodesData.find(n => n.id === edge.target);
        if (sNode && tNode) {
            linesArray.push([sNode.mesh.position, tNode.mesh.position]);
            colorsArray.push([APP_CONFIG.colors.edgeLine, APP_CONFIG.colors.edgeLine]);
        }
    });

    if (linesArray.length === 0) return;

    if (edgeLines.length === 0 || initial) {
        edgeLines = BABYLON.MeshBuilder.CreateLineSystem("edges", {
            lines: linesArray,
            colors: colorsArray,
            updatable: true
        }, scene);
    } else {
        BABYLON.MeshBuilder.CreateLineSystem("edges", {
            lines: linesArray,
            colors: colorsArray,
            instance: edgeLines
        });
    }

    // Completely hide edges in map mode, only draw in Network mode
    edgeLines.alpha = currentMode === "MAP" ? 0.0 : 0.5;
    edgeLines.isVisible = currentMode !== "MAP";
}

function updateTransitions() {

    globeMesh.scaling = BABYLON.Vector3.Lerp(
        globeMesh.scaling,
        currentMode === "MAP" ? new BABYLON.Vector3(1, 1, 1) : new BABYLON.Vector3(0.01, 0.01, 0.01),
        APP_CONFIG.animationSpeed
    );

    nodesData.forEach(node => {
        let targetPos = currentMode === "MAP" ? node.mapPos : node.networkPos;
        if (targetPos) {
            node.mesh.position = BABYLON.Vector3.Lerp(node.mesh.position, targetPos, APP_CONFIG.animationSpeed);
        }

        if (node.type === "medium") {
            let targetVis = currentMode === "MAP" ? 0 : 1;
            node.mesh.visibility += (targetVis - node.mesh.visibility) * APP_CONFIG.animationSpeed;
        }

        // Constant screen-size: scale UP as camera zooms OUT and DOWN when zoomed IN
        // ratio = 1 at default radius, > 1 when zoomed out, < 1 when zoomed in
        let sizeScale = camera.radius / APP_CONFIG.camera.radiusMap;
        let hoverBoost = (hoveredMesh === node.mesh) ? 1.6 : 1.0;
        let finalScale = sizeScale * hoverBoost;
        node.mesh.scaling.setAll(finalScale);
    });
}

// --- Label update: atan2 rotation + front-face culling ---
let _labelViewport = null;
function updateLabels() {
    if (!APP_CONFIG.labels.enabled) return;

    _labelViewport = _labelViewport || camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const projMatrix = scene.getTransformMatrix();
    const identMatrix = BABYLON.Matrix.Identity();
    const camFwd = camera.getForwardRay().direction;

    nodesData.forEach(node => {
        if (!node.guiText || !node.labelTarget) return;

        const meshPos = node.mesh.getAbsolutePosition();

        // Front-face culling: hide label if dot is on the far side of the globe
        const toMesh = meshPos.normalizeToNew();
        const facing = BABYLON.Vector3.Dot(toMesh, camFwd.normalizeToNew());
        if (facing > 0.1) {
            node.guiText.isVisible = false;
            node.guiLine.isVisible = false;
            return;
        }
        node.guiText.isVisible = true;
        node.guiLine.isVisible = true;

        // Update label anchor position along the normal, compensated for current zoom
        const normal = meshPos.normalizeToNew();
        const labelDist = APP_CONFIG.labels.offsetFactor * (camera.radius / APP_CONFIG.camera.radiusMap);
        node.labelTarget.position = meshPos.add(normal.scale(labelDist));

        // 2D screen-space angle for parallel text
        const p1 = BABYLON.Vector3.Project(meshPos, identMatrix, projMatrix, _labelViewport);
        const p2 = BABYLON.Vector3.Project(node.labelTarget.position, identMatrix, projMatrix, _labelViewport);
        let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        // Keep text right-side-up
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
        node.guiText.rotation = angle;
    });
}

// Map UI interactions
document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("toggleBtn").addEventListener("click", () => {
        currentMode = currentMode === "MAP" ? "NETWORK" : "MAP";
        document.getElementById("hud-mode").innerText = currentMode === "MAP" ? "WORLD_MAP" : "NETWORK_FLOW";
        document.getElementById("toggleBtn").innerText = currentMode === "MAP" ? "SWITCH TO NETWORK" : "SWITCH TO MAP";

        // Single automatic transition for the camera
        let targetRadius = currentMode === "MAP" ? APP_CONFIG.camera.radiusMap : APP_CONFIG.camera.radiusNet;
        let ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        BABYLON.Animation.CreateAndStartAnimation("camZoomAnim", camera, "radius", 60, 45, camera.radius, targetRadius, 0, ease);
    });

    await loadData();
    await initEngine();
});

function showFallbackImage(name) {
    let imgEl = document.getElementById("artist-image");
    imgEl.src = `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`;
    imgEl.onload = () => {
        document.getElementById("artist-img-loader").classList.remove("active");
        imgEl.classList.remove("hidden");
    };
}

async function fetchImageFromWiki(title) {
    let url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=400&format=json&origin=*`;
    let response = await fetch(url);
    let data = await response.json();
    let pages = data.query.pages;
    let pageId = Object.keys(pages)[0];
    if (pageId !== "-1" && pages[pageId].thumbnail) {
        return pages[pageId].thumbnail.source;
    }
    return null;
}

async function fetchArtistWikiData(artistData) {
    let panel = document.getElementById("artist-details");
    panel.classList.remove("hidden");

    document.getElementById("artist-name").innerText = artistData.label;
    document.getElementById("artist-img-loader").classList.add("active");
    let imgEl = document.getElementById("artist-image");
    imgEl.classList.add("hidden");

    document.getElementById("artist-bio").innerText = "Loading data...";
    document.getElementById("artist-notable-work").innerText = artistData.notable ? artistData.notable : "UNKNOWN";

    try {
        let name = encodeURIComponent(artistData.label);
        let url = `https://en.wikipedia.org/w/api.php?action=query&titles=${name}&prop=extracts&exintro=1&format=json&origin=*`;
        let response = await fetch(url);
        let data = await response.json();

        let pages = data.query.pages;
        let pageId = Object.keys(pages)[0];
        let page = pages[pageId];

        if (pageId !== "-1") {
            if (page.extract) {
                let tmp = document.createElement("DIV");
                tmp.innerHTML = page.extract;
                document.getElementById("artist-bio").innerText = tmp.textContent || tmp.innerText || "";
            } else {
                document.getElementById("artist-bio").innerText = artistData.bio || "No biography available.";
            }
        } else {
            document.getElementById("artist-bio").innerText = artistData.bio || "Artist not found on Wikipedia. " + artistData.bio;
        }

        // Image Prioritization Logic
        let imageUrl = null;
        if (artistData.notable) {
            let firstWork = artistData.notable.split(", ")[0];
            imageUrl = await fetchImageFromWiki(firstWork);
        }

        if (!imageUrl) {
            imageUrl = await fetchImageFromWiki(artistData.label);
        }

        if (imageUrl) {
            imgEl.src = imageUrl;
            imgEl.onload = () => {
                document.getElementById("artist-img-loader").classList.remove("active");
                imgEl.classList.remove("hidden");
            };
        } else {
            showFallbackImage(artistData.label);
        }
    } catch (e) {
        document.getElementById("artist-bio").innerText = artistData.bio || "Error loading Wikipedia data.";
        showFallbackImage(artistData.label);
    }
}

function showMuseumData(museumData) {
    let panel = document.getElementById("artist-details");
    panel.classList.remove("hidden");

    document.getElementById("artist-name").innerText = museumData.label.toUpperCase();
    document.getElementById("artist-img-loader").classList.add("active");
    let imgEl = document.getElementById("artist-image");
    imgEl.classList.add("hidden");

    document.getElementById("artist-bio").innerText = museumData.bio || "No description available.";
    document.getElementById("artist-notable-work").innerText = "MUSEUM / INSTITUTION";

    if (museumData.image_url) {
        imgEl.src = museumData.image_url;
        imgEl.onload = () => {
            document.getElementById("artist-img-loader").classList.remove("active");
            imgEl.classList.remove("hidden");
        };
    } else {
        showFallbackImage(museumData.label);
    }
}
