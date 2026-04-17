const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The instructions say: "Mode 1: 2D Architectural Diagram: A highly structured, precise flowchart. Use crisp rectangular/pill-shaped boxes for nodes and clean, curved or orthogonal lines for edges."
// I will re-add the pill-shaped box for nodes in 2D mode.
// Also the 2D layout has nodes overlapping with each other. Let's fix x2d, y2d again.
appJs = appJs.replace(/let x2d = \(d - maxDepth\/2\) \* 200;/g, 'let x2d = (d - maxDepth/2) * 250;');
appJs = appJs.replace(/let y2d = \(rowIdx - \(nodesInDepth\.length-1\)\/2\) \* 60;/g, 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 80;');

// Re-add pill style
appJs = appJs.replace(/label\.style\.padding = '0';/g, "label.style.padding = '4px 8px';");
appJs = appJs.replace(/label\.style\.border = 'none';/g, "label.style.border = '1px solid var(--fg)';");
appJs = appJs.replace(/label\.style\.borderRadius = '0';/g, "label.style.borderRadius = '12px';");
appJs = appJs.replace(/label\.style\.backgroundColor = 'transparent';/g, "label.style.backgroundColor = 'var(--bg)';");

// Camera in 2D mode zoom out a little
appJs = appJs.replace(/camera\.position\.lerp\(new THREE\.Vector3\(0, 0, 800\), 0\.05\);/g, 'camera.position.lerp(new THREE.Vector3(0, 0, 1000), 0.05);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 8.");
