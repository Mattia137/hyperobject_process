const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The bezier curves going all the way from x to x+dist sometimes jump back or go too far vertically.
// Since x difference is large, it makes smooth s-curves.
// Let's add pointer-events: none to labels to allow clicking.
// "Every node is a clickable link." Wait, if labels are DOM, I need pointer-events auto to click them OR I need to use raycaster on spheres.
// I already have raycaster on spheres. And spheres have opacity 0 in 2D mode?
// Wait, in 2D mode, does it have spheres?
// Let's check opacity of nodes in 2D mode.

appJs = appJs.replace(/const mat = mesh\.material;/g, 'const mat = mesh.material;');
// Let's make spheres slightly visible in 2D mode but perfectly behind the labels so they can be clicked
// Actually I update scale of spheres based on node.degree.
// If labels cover spheres and have pointer-events:none, raycaster hits spheres.
// I need to ensure raycaster hits spheres and DOM labels have pointer-events none!
appJs = appJs.replace(/labelDiv\.style\.whiteSpace = 'nowrap';/g, "labelDiv.style.whiteSpace = 'nowrap';\n        labelDiv.style.pointerEvents = 'none';");

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 14.");
