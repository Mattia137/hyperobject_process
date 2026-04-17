const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Fix 2D layout spacing
appJs = appJs.replace(/let x2d = layerIndex \* 150 - totalLayers \* 75;/g, 'let x2d = layerIndex * 18 - totalLayers * 9;');
appJs = appJs.replace(/let y2d = layerY \* 60;/g, 'let y2d = layerY * 6;');

// Remove the scale(0.5) because standard size might be fine if spacing is appropriate
appJs = appJs.replace(/el\.style\.transform = \`translate\(-50%, -50%\) scale\(0\.5\)\`;/g, 'el.style.transform = `translate(-50%, -50%) scale(0.7)`;');

// Fix the node object properties in 2d initialization
// Ensure layerIndex is properly spread
appJs = appJs.replace(/node\.target2D = new THREE\.Vector3\(layerIndex \* 150 - totalLayers \* 75, layerY \* 60, 0\);/g, 'node.target2D = new THREE.Vector3(layerIndex * 18 - totalLayers * 9, layerY * 6, 0);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 6.");
