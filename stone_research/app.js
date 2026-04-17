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
    },
    // New parameters for the stone research tree layout
    treeLayout: {
        nodeWidth: 260,
        nodeHeight: 320,
        horizontalSpacing: 450,
        verticalSpacing: 350,
        imageHeight: 180,
        cardPadding: 15
    }
};

// --- DATA STRUCTURES ---
export const geologicalData = {
    name: "STONE RESEARCH DATABASE",
    subtitle: "Comprehensive Geological Catalog",
    description: "Classification and processing patterns of retrieved samples.",
    image_url: "../database/root/stone_research_root.jpg",
    children: [
        {
            name: "Meteorites",
            subtitle: "Extraterrestrial origins",
            description: "Samples recovered from atmospheric entry.",
            image_url: "../database/meteorites/meteorites_branch.jpg",
            children: [
                {
                    name: "Gibeon Iron Meteorite",
                    subtitle: "High iron-nickel content",
                    description: "Displays Widmanstätten pattern.",
                    image_url: "../database/meteorites/gibeon.jpg"
                },
                {
                    name: "Pallasite",
                    subtitle: "Stony-iron meteorite",
                    description: "Olive-green olivine crystals in metal matrix.",
                    image_url: "../database/meteorites/pallasite.jpg"
                },
                {
                    name: "Sikhote-Alin Meteorite",
                    subtitle: "High-iron composition",
                    description: "Features regmaglypts (thumbprint indentations).",
                    image_url: "../database/meteorites/sikhote_alin.jpg"
                }
            ]
        },
        {
            name: "Magmatic Rocks",
            subtitle: "Volcanic & Plutonic",
            description: "Rocks formed through the cooling and solidification of magma or lava.",
            image_url: "../database/magmatic/magmatic_branch.jpg",
            children: [
                {
                    name: "Lava Stone",
                    subtitle: "Igneous rock",
                    description: "Dark, porous, textured.",
                    image_url: "../database/magmatic/lava_stone.jpg"
                },
                {
                    name: "Pahoehoe Lava",
                    subtitle: "Basaltic lava",
                    description: "Smooth, billowy, or 'ropy' twisted appearance.",
                    image_url: "../database/magmatic/pahoehoe.jpg"
                },
                {
                    name: "Obsidian",
                    subtitle: "Volcanic glass",
                    description: "Jet-black, smooth, shiny.",
                    image_url: "../database/magmatic/obsidian.jpg"
                },
                {
                    name: "Orbicular Granite",
                    subtitle: "Plutonic rock",
                    description: "Features concentric spherical 'orbicules'.",
                    image_url: "../database/magmatic/orbicular_granite.jpg"
                },
                {
                    name: "Variolite",
                    subtitle: "Basic igneous rock",
                    description: "Contains light-colored globular spots (varioles).",
                    image_url: "../database/magmatic/variolite.jpg"
                }
            ]
        },
        {
            name: "Metallic Minerals & Ores",
            subtitle: "Natural mineral deposits",
            description: "Minerals with high metallic element concentrations.",
            image_url: "../database/minerals/minerals_branch.jpg",
            children: [
                {
                    name: "Brotyoidal Hematite",
                    subtitle: "Iron oxide",
                    description: "Rounded grape-like clusters, metallic luster.",
                    image_url: "../database/minerals/hematite.jpg"
                },
                {
                    name: "Bournonite",
                    subtitle: "Cogwheel ore",
                    description: "Dark gray twin crystals resembling gears.",
                    image_url: "../database/minerals/bournonite.jpg"
                },
                {
                    name: "Carriollite",
                    subtitle: "Cu/Co/Ni mineral",
                    description: "Silvery-gray octahedral crystals.",
                    image_url: "../database/minerals/carriollite.jpg"
                },
                {
                    name: "Galena",
                    subtitle: "Lead ore (PbS)",
                    description: "Heavy, metallic lead-gray, perfect cubic cleavage.",
                    image_url: "../database/minerals/galena.jpg"
                },
                {
                    name: "Hausmannite",
                    subtitle: "Manganese oxide",
                    description: "Dark brown/black pyramidal crystals.",
                    image_url: "../database/minerals/hausmannite.jpg"
                },
                {
                    name: "Vivianite",
                    subtitle: "Hydrated iron phosphate",
                    description: "Turns deep blue/green in light, blade-like clusters.",
                    image_url: "../database/minerals/vivianite.jpg"
                }
            ]
        },
        {
            name: "Metalloids",
            subtitle: "Intermediate properties",
            description: "Elements with properties between metals and solid nonmetals.",
            image_url: "../database/metalloids/metalloids_branch.jpg",
            children: [
                {
                    name: "Antimony",
                    subtitle: "Brittle, silvery-white",
                    description: "Distinct crystalline and flaky texture.",
                    image_url: "../database/metalloids/antimony.jpg"
                }
            ]
        }
    ]
};

// --- D3 RENDERING AND LOGIC ---
function renderTree() {
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, imageHeight, cardPadding } = APP_CONFIG.treeLayout;

    // Set up SVG and container
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#d3-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Zoom setup
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    const g = svg.append("g");

    // Initial zoom transform
    const initialTransform = d3.zoomIdentity.translate(width / 4, height / 2).scale(0.8);
    svg.call(zoom.transform, initialTransform);

    // Hierarchy and tree layout setup
    const root = d3.hierarchy(geologicalData);

    // We use a custom flex tree or standard tree. Standard d3.tree
    const treeLayout = d3.tree()
        .nodeSize([verticalSpacing, horizontalSpacing]);

    treeLayout(root);

    // Links
    const link = g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        );

    // Nodes
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .on("mouseover", function(event, d) {
            // Highlight current node
            d3.select(this).classed("highlight", true);

            // Find path to root
            let current = d;
            const pathNodes = new Set();
            while (current) {
                pathNodes.add(current);
                current = current.parent;
            }

            // Highlight links
            link.classed("highlight", l => pathNodes.has(l.source) && pathNodes.has(l.target));
        })
        .on("mouseout", function(event, d) {
            d3.select(this).classed("highlight", false);
            link.classed("highlight", false);
        });

    // Node Cards (Rectangles)
    node.append("rect")
        .attr("class", "node-card")
        .attr("x", -nodeWidth / 2)
        .attr("y", -nodeHeight / 2)
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("rx", 5) // Rounded corners
        .attr("ry", 5);

    // Image Placeholder
    const imgGroup = node.append("g")
        .attr("transform", `translate(${-nodeWidth / 2 + cardPadding}, ${-nodeHeight / 2 + cardPadding})`);

    imgGroup.append("rect")
        .attr("class", "node-image-bg")
        .attr("width", nodeWidth - cardPadding * 2)
        .attr("height", imageHeight)
        .attr("rx", 3)
        .attr("ry", 3);

    imgGroup.append("text")
        .attr("class", "node-text")
        .attr("x", (nodeWidth - cardPadding * 2) / 2)
        .attr("y", imageHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .attr("fill", "var(--fg-dim)")
        .text(d => d.data.image_url);

    // Text Content
    const textGroup = node.append("g")
        .attr("transform", `translate(${-nodeWidth / 2 + cardPadding}, ${-nodeHeight / 2 + cardPadding + imageHeight + 20})`);

    // Title
    textGroup.append("text")
        .attr("class", "node-text node-title")
        .attr("x", 0)
        .attr("y", 0)
        .text(d => d.data.name);

    // Subtitle
    textGroup.append("text")
        .attr("class", "node-text node-subtitle")
        .attr("x", 0)
        .attr("y", 16)
        .text(d => d.data.subtitle);

    // Description (Wrap text logic or basic line)
    // For simplicity, cutting description if too long or splitting manually.
    // D3 doesn't auto-wrap text easily inside SVG, so we'll do a simple split or show as much as fits.
    textGroup.append("foreignObject")
        .attr("x", 0)
        .attr("y", 30)
        .attr("width", nodeWidth - cardPadding * 2)
        .attr("height", 60)
        .append("xhtml:div")
        .style("font-size", "9px")
        .style("color", "var(--fg)")
        .style("font-family", "'Fragment Mono', monospace")
        .text(d => d.data.description);
}

renderTree();
