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

}

renderTree();
