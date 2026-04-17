import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// ==========================================
// EARTH-MARS BRIDGE PROJECT - PARAMETERS
// ==========================================
export const APP_CONFIG = {
    fontFamily: "Fragment Mono, monospace",
    treeLayout: {
        nodeWidth: 48,
        nodeHeight: 48,
        horizontalSpacing: 52,
        verticalSpacing: 90,
        imageHeight: 36,
    }
};

// --- DATA STRUCTURES ---
const descriptions = {
    "Sikhote-Alin": "Originating from a massive 1947 impact in Russia, these are high-iron meteorites often found as shrapnel pieces or smooth-surfaced individuals with thumbprint-like indentations called regmaglypts.",
    "Gibeon Iron": "A prehistoric meteorite from Namibia characterized by a high iron-nickel content. It is famous for its Widmanstätten pattern, a unique crystalline structure revealed when the metal is etched.",
    "Pallasite": "An extremely rare type of stony-iron meteorite consisting of translucent olive-green olivine crystals embedded in a gleaming silver-colored metal matrix.",
    "Brotyoidal Hematite": "A form of iron oxide where the mineral grows in rounded, grape-like clusters. It often has a metallic luster and a distinct kidney ore appearance.",
    "Lava Stone": "A classic igneous rock formed from the rapid cooling of magnesium-rich and iron-rich lava. It is highly durable and characterized by its dark, porous, and textured surface.",
    "Pahoehoe Lava": "A smooth, billowy, or ropy basaltic lava. It forms from highly fluid lava that creates a twisted, cord-like appearance as it cools and moves.",
    "Obsidian": "A naturally occurring volcanic glass formed when lava cools so rapidly that crystals do not have time to grow. It is typically jet-black with a smooth, shiny, and glass-like finish.",
    "Orbicular Granite": "A rare plutonic rock containing orbicules—concentric layers of minerals that form spherical or eye-like patterns within the stone.",
    "Variolite": "A basic igneous rock containing small, light-colored globular spots (varioles). These spots are typically made of radiating crystals that stand out against a darker, finer-grained background.",
    "Antimony": "A brittle, silvery-white metalloid with a distinct crystalline and flaky texture. It is primarily used in industrial alloys and is recognized for its unique ability to expand as it cools.",
    "Bournonite": "A metallic mineral commonly called cogwheel ore due to its frequent twin crystal formations. These dark gray crystals often grow into shapes that closely resemble the gears or cogs of a machine.",
    "Carrollite": "A rare metallic mineral composed of copper, cobalt, and nickel. It typically forms bright, silvery-gray octahedral crystals and is prized for its high metallic luster and distinct cubic symmetry.",
    "Galena": "The primary ore of lead, easily recognized by its heavy weight and perfect cubic cleavage. It has a distinctive shiny, metallic lead-gray color and often forms sharp, geometric blocks.",
    "Hausmannite": "A complex manganese oxide mineral that usually forms dark brown to black metallic crystals. It is often found in granular masses or as distinctive pyramidal (pseudo-octahedral) crystal shapes.",
    "Vivianite": "A unique hydrated iron phosphate mineral that is often colorless when first found but turns deep blue or emerald green upon exposure to light. It typically grows in elegant, blade-like or prismatic crystal clusters."
};

export const geologicalData = {
    name: "STONE DATABASE",
    children: [
        {
            name: "METEORITES",
            children: [
                { name: "Sikhote-Alin", img: "../database/stone_catalogue/M_Sikhote-Alin meteorite.png", children: [{ name: "Sikhote-Alin Pattern", img: "../database/stone_catalogue/M_Sikhote-Alin meteorite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/sikhote-alin_graphic.png"}] }] },
                { name: "Gibeon Iron", img: "../database/stone_catalogue/M_gibeon iron.png", children: [{ name: "Gibeon Pattern", img: "../database/stone_catalogue/M_gibeon iron-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/gibeon_graphic.png"}] }] },
                { name: "Pallasite", img: "../database/stone_catalogue/M_pallasite.png", children: [{ name: "Pallasite Pattern", img: "../database/stone_catalogue/M_pallasite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/pallasite_graphic.png"}] }] }
            ]
        },
        {
            name: "MAGMATIC ROCKS",
            children: [
                { name: "Brotyoidal Hematite", img: "../database/stone_catalogue/MR_brotyoidal hematite_.png", children: [{ name: "Hematite Pattern", img: "../database/stone_catalogue/MR_brotyoidal hematite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/hematite_graphic.png"}] }] },
                { name: "Lava Stone", img: "../database/stone_catalogue/MR_lava_stone.png", children: [{ name: "Lava Texture", img: "../database/stone_catalogue/MR_lava_stone-texture.png", children: [{name: "Graphic", img: "../database/stone_catalogue/lava_graphic.png"}] }] },
                { name: "Obsidian", img: "../database/stone_catalogue/MR_obsidian.png", children: [{ name: "Obsidian Pattern", img: "../database/stone_catalogue/MR_obsidian-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/obsidian_graphic.png"}] }] },
                { name: "Orbicular Granite", img: "../database/stone_catalogue/MR_orbicular granite.png", children: [{ name: "Granite Pattern", img: "../database/stone_catalogue/MR_orbicular granite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/granite_graphic.png"}] }] },
                { name: "Pahoehoe Lava", img: "../database/stone_catalogue/MR_pahoehoe lava_.png", children: [{ name: "Pahoehoe Pattern", img: "../database/stone_catalogue/MR_pahoehoe lava-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/pahoehoe_graphic.png"}] }] },
                { name: "Variolite", img: "../database/stone_catalogue/MR_variolite.png", children: [{ name: "Variolite Pattern", img: "../database/stone_catalogue/MR_variolite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/variolite_graphic.png"}] }] }
            ]
        },
        {
            name: "METALLIC MINERALS",
            children: [
                { name: "Antimony", img: "../database/stone_catalogue/MM_antimony.png", children: [{ name: "Antimony Pattern", img: "../database/stone_catalogue/MM_antimony-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/antimony_graphic.png"}] }] },
                { name: "Bournonite", img: "../database/stone_catalogue/MM_bournonite.png", children: [{ name: "Bournonite Pattern", img: "../database/stone_catalogue/MM_bournonite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/bournonite_graphic.png"}] }] },
                { name: "Carrollite", img: "../database/stone_catalogue/MM_carrollite.png", children: [{ name: "Carrollite Pattern", img: "../database/stone_catalogue/MM_carrollite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/carrollite_graphic.png"}] }] },
                { name: "Galena", img: "../database/stone_catalogue/MM_galena.png", children: [{ name: "Galena Pattern", img: "../database/stone_catalogue/MM_galena-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/galena_graphic.png"}] }] },
                { name: "Hausmannite", img: "../database/stone_catalogue/MM_hausmannite.png", children: [{ name: "Hausmannite Pattern", img: "../database/stone_catalogue/MM_hausmannite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/housmannite_graphic.png"}] }] },
                { name: "Vivianite", img: "../database/stone_catalogue/MM_vivianite.png", children: [{ name: "Vivianite Pattern", img: "../database/stone_catalogue/MM_vivianite-pattern.png", children: [{name: "Graphic", img: "../database/stone_catalogue/vivianite_graphic.png"}] }] }
            ]
        }
    ]
};

export const synthesisData = [
    {
        id: "galena_pallasite_fail",
        img: "../database/skin_test/galena-pallasite_fail_v7.png",
        parents: ["Galena", "Pallasite"]
    },
    {
        id: "galena_pallasite",
        img: "../database/skin_test/galena-pallasite_v7.png",
        parents: ["Galena", "Pallasite"]
    },
    {
        id: "galena_carrollite",
        img: "../database/skin_test/galena-carrollite_v7.png",
        parents: ["Galena", "Carrollite"]
    },
    {
        id: "hematite_granite",
        img: "../database/skin_test/hematite-granite_v8.png",
        parents: ["Brotyoidal Hematite", "Orbicular Granite"]
    },
    {
        id: "hematite_obsidian",
        img: "../database/skin_test/hematite-obsidian_v8.png",
        parents: ["Brotyoidal Hematite", "Obsidian"]
    },
    {
        id: "obsidian_antimony",
        img: "../database/skin_test/obsidian-antimony_v7.png",
        parents: ["Obsidian", "Antimony"]
    },
    {
        id: "sikhote_pahoehoe",
        img: "../database/skin_test/sikhote-alin-pahoehoe.png",
        parents: ["Sikhote-Alin", "Pahoehoe Lava"]
    },
    // Materials that tether exactly under their source test
    {
        id: "galena_pallasite_fail_mat",
        img: "../database/skin_test/galena-pallasite_fail_v7-mat.png",
        parents: ["galena_pallasite_fail"]
    },
    {
        id: "galena_pallasite_mat",
        img: "../database/skin_test/galena-pallasite_v7-mat.png",
        parents: ["galena_pallasite"]
    },
    {
        id: "galena_carrollite_mat",
        img: "../database/skin_test/galena-carrollite_v7-mat.png",
        parents: ["galena_carrollite"]
    },
    {
        id: "hematite_granite_mat",
        img: "../database/skin_test/hematite-granite_v8-mat.png",
        parents: ["hematite_granite"]
    },
    {
        id: "hematite_obsidian_mat",
        img: "../database/skin_test/hematite-obsidian_v8-mat.png",
        parents: ["hematite_obsidian"]
    },
    {
        id: "obsidian_antimony_mat",
        img: "../database/skin_test/obsidian-antimony_v7-mat.png",
        parents: ["obsidian_antimony"]
    },
    {
        id: "sikhote_pahoehoe_mat",
        img: "../database/skin_test/sikhote-alin-pahoehoe-mat.png",
        parents: ["sikhote_pahoehoe"]
    }
];

// --- D3 RENDERING AND LOGIC ---
function renderTree() {
    const { nodeWidth, horizontalSpacing, verticalSpacing, imageHeight } = APP_CONFIG.treeLayout;

    // Set up SVG and container
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#d3-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Zoom setup
    const zoom = d3.zoom()
        .scaleExtent([0.5, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    const g = svg.append("g");

    // Inject Kuma structural overlay images to live within the zoomable hierarchy
    const overlayW = 560; // Twice the size
    const overlayY = -800; // Pushed higher up to prevent hitting the nodes
    
    g.append("image")
        .attr("href", "Meteor Facade v7 — Workflow.png")
        .attr("x", -overlayW - 40)
        .attr("y", overlayY)
        .attr("width", overlayW)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("opacity", "0.85")
        .style("mix-blend-mode", "multiply");

    g.append("image")
        .attr("href", "Meteor Facade v7 — Workflow1.png")
        .attr("x", 40)
        .attr("y", overlayY)
        .attr("width", overlayW)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("opacity", "0.85")
        .style("mix-blend-mode", "multiply");

    // Initial zoom transform: center root at top horizontally, push it down so imgs are visible
    const initialTransform = d3.zoomIdentity.translate(width / 2, 700).scale(1.1);
    svg.call(zoom.transform, initialTransform);

    // Hierarchy and tree layout setup
    const root = d3.hierarchy(geologicalData);

    // Top-to-bottom standard tree spreading out on X
    const treeLayout = d3.tree()
        .nodeSize([horizontalSpacing, verticalSpacing]);

    treeLayout(root);

    // Filter out edge linking root to categories (optional, but matching Kuma)
    // Wait, let's keep all edges but make them sweeping
    const link = g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y)
        );

    // Nodes
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("mouseover", function(event, d) {
            d3.select(this).classed("highlight", true);
            let current = d;
            const pathNodes = new Set();
            while (current) {
                pathNodes.add(current);
                current = current.parent;
            }
            link.classed("highlight", l => pathNodes.has(l.source) && pathNodes.has(l.target));
        })
        .on("mouseout", function(event, d) {
            d3.select(this).classed("highlight", false);
            link.classed("highlight", false);
        })
        .style("cursor", "pointer")
        .style("pointer-events", "all")
        .on("click", function(event, d) {
            if (d.data.img) {
                let baseNode = d;
                while (baseNode && baseNode.depth > 2) {
                    baseNode = baseNode.parent;
                }
                let desc = descriptions[baseNode.data.name] || "";
                
                document.getElementById('dynamic-info').style.display = 'block';
                document.getElementById('info-image').src = d.data.img;
                document.getElementById('info-title').innerText = d.data.name;
                document.getElementById('info-desc').innerText = desc;
            }
        });

    // Image rendering (only if the node has an image)
    const imgGroup = node.append("g")
        .attr("transform", `translate(${-nodeWidth / 2}, ${-imageHeight})`);

    imgGroup.each(function(d) {
        if (d.data.img) {
            d3.select(this).append("image")
                .attr("href", d.data.img)
                .attr("width", nodeWidth)
                .attr("height", imageHeight)
                // Fit image nicely
                .attr("preserveAspectRatio", "xMidYMid meet");
        }
    });

    // Text Content
    const textGroup = node.append("g")
        .attr("transform", `translate(0, 15)`);

    // Title
    textGroup.append("text")
        .attr("class", "node-text node-title")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", 0)
        .text(d => d.data.name);

    // === MULTI-PARENT SYNTHESIS LAYER ===
    const nodeCoords = {};
    root.descendants().forEach(d => {
        nodeCoords[d.data.name] = d;
    });

    const synthYSpacing = APP_CONFIG.treeLayout.verticalSpacing * 4.5; // Moved even further down
    const baseDepthY = 3 * APP_CONFIG.treeLayout.verticalSpacing;
    
    let synthNodes = synthesisData.map(s => {
        let x = 0;
        let pCoords = [];
        s.parents.forEach(p => {
            if (nodeCoords[p]) {
                // Traverse down to the target 'Graphic' terminal leaf instead of the stone
                let leaf = nodeCoords[p];
                while(leaf.children && leaf.children.length > 0) {
                    leaf = leaf.children[0];
                }
                pCoords.push(leaf);
                x += leaf.x;
            } else {
                let parentDef = synthesisData.find(sd => sd.id === p);
                if (parentDef && parentDef.nodeRef) {
                    pCoords.push(parentDef.nodeRef);
                    x += parentDef.nodeRef.x;
                }
            }
        });
        
        let nodeY = baseDepthY + synthYSpacing;
        
        if (s.parents.length === 1 && pCoords.length > 0) {
            nodeY = pCoords[0].y + synthYSpacing * 0.4; // Mat drop pushed proportionally lower
            x = pCoords[0].x;
        } else {
            // Override centroids with a forced linear spread for perfect identical spacing
            let forcedSpacing = 175; // Slashed in half to pack tightly 
            switch(s.id) {
                case "sikhote_pahoehoe": x = forcedSpacing * -3; break;
                case "hematite_obsidian": x = forcedSpacing * -2; break;
                case "galena_pallasite_fail": x = forcedSpacing * -1; break;
                case "hematite_granite": x = forcedSpacing * 0; break;
                case "obsidian_antimony": x = forcedSpacing * 1; break;
                case "galena_pallasite": x = forcedSpacing * 2; break;
                case "galena_carrollite": x = forcedSpacing * 3; break;
            }
        }
        
        s.nodeRef = { x: x, y: nodeY, data: { name: s.id.replace(/_/g, '-').toUpperCase(), img: s.img }, pCoords: pCoords };
        return s;
    });

    const linkGenerator = d3.linkVertical().x(d => d.x).y(d => d.y);
        
    synthNodes.forEach(sn => {
        sn.nodeRef.pCoords.forEach(p => {
            g.insert("path", ".node") // draw underneath nodes
                .attr("class", "link")
                .attr("d", linkGenerator({ source: p, target: sn.nodeRef }));
        });
    });

    const synthG = g.selectAll(".synth-node")
        .data(synthNodes.map(s => s.nodeRef))
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .style("pointer-events", "all")
        .on("click", function(event, d) {
            document.getElementById('dynamic-info').style.display = 'block';
            document.getElementById('info-image').src = d.data.img;
            document.getElementById('info-title').innerText = "SKIN PASS: " + d.data.name;
            document.getElementById('info-desc').innerText = "Algorithmically mapped facade synthesis data combining inherited geological traits.";
        });

    synthG.append("image")
        .attr("href", d => d.data.img)
        .attr("x", -nodeWidth * 1.4) // Scaled way up
        .attr("y", -imageHeight * 2.8)
        .attr("width", nodeWidth * 2.8) 
        .attr("height", imageHeight * 2.8)
        .attr("preserveAspectRatio", "xMidYMid meet");
        
    synthG.append("text")
        .attr("class", "node-text node-title")
        .attr("text-anchor", "middle")
        .attr("x", 0)
        .attr("y", 20)
        .text(d => d.data.name);

}

renderTree();
