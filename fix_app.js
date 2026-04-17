const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// Compute degree
let degreeCode = `
// --- DEGREE COMPUTATION ---
const nodeDegree = {};
rawNodes.forEach(n => nodeDegree[n.id] = 0);
edges.forEach(e => {
    nodeDegree[e.source] = (nodeDegree[e.source] || 0) + 1;
    nodeDegree[e.target] = (nodeDegree[e.target] || 0) + 1;
});
`;

code = code.replace('const nodeDepths = computeDepths();', 'const nodeDepths = computeDepths();\n' + degreeCode);

// Layout 2D width
code = code.replace('let x2d = (d - maxDepth/2) * 200;', 'let x2d = (d - maxDepth/2) * 300;');
code = code.replace('let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 100;', 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 120;');

// Save degree in nodesData
code = code.replace('activeColor: new THREE.Color(APP_CONFIG.colors.hoverAccent)', 'activeColor: new THREE.Color(APP_CONFIG.colors.hoverAccent),\n            degree: nodeDegree[n.id]');

// Update render size
let renderCode = `
        let s = nodeRadius;
        if (currentMode === "A") {
            s += n.degree * 0.5; // vary size based on connections
        }
        if (n === hoveredNode) s *= 1.5;
        n.mesh.scale.set(s, s, s);
`;
code = code.replace(/let s = nodeRadius;\s*if \(n === hoveredNode\) s \*= 1\.5;\s*n\.mesh\.scale\.set\(s, s, s\);/g, renderCode);

// HTML Labels logic for 2D mode
let labelCode = `
        // Update colors based on hover and mode
        n.labelDom.style.color = textCol;

        if (is2D) {
            n.mesh.material.color.setStyle(APP_CONFIG.colors.mode2DNode);
            if (n === hoveredNode) n.mesh.material.color.setStyle(APP_CONFIG.colors.hoverAccent);

            // 2D pill shapes
            n.labelDom.style.background = '#ffffff';
            n.labelDom.style.border = \`1px solid \${n === hoveredNode ? APP_CONFIG.colors.hoverAccent : APP_CONFIG.colors.mode2DNode}\`;
            n.labelDom.style.padding = '5px 10px';
            n.labelDom.style.borderRadius = '20px';
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
`;
code = code.replace(/\/\/ Update colors based on hover and mode[\s\S]*?if \(n === hoveredNode\) n\.mesh\.material\.color\.copy\(n\.activeColor\);\n\s*\}/g, labelCode);


fs.writeFileSync('app.js', code);
