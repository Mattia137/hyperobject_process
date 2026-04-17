const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The bezier curves are crossing each other wildly because I just used simple control points in x.
// Let's make the 2D layout slightly more linear and simple, using orthogonal lines or less wild bezier.
// "Mode 1: 2D Architectural Diagram: A highly structured, precise flowchart. Use crisp rectangular/pill-shaped boxes for nodes and clean, curved or orthogonal lines for edges."
// I will use orthogonal lines or more subtle bezier. Let's make control points exactly halfway in X for straight horizontal lines that curve.
appJs = appJs.replace(/const cp1 = new THREE\.Vector3\(sPos\.x \+ dist \* 0\.3, sPos\.y, sPos\.z\);/g, 'const cp1 = new THREE.Vector3(sPos.x + dist * 0.5, sPos.y, sPos.z);');
appJs = appJs.replace(/const cp2 = new THREE\.Vector3\(tPos\.x - dist \* 0\.3, tPos\.y, tPos\.z\);/g, 'const cp2 = new THREE.Vector3(tPos.x - dist * 0.5, tPos.y, tPos.z);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 13.");
