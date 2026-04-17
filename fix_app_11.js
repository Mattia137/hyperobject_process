const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The lines in 2D mode are bezier curves, but they look very chaotic when starting and ending at random places.
// Also some nodes are missing from screen. We should probably adjust the curve path slightly for bezier so they are less curly.
appJs = appJs.replace(/const cp1 = new THREE\.Vector3\(sPos\.x \+ dist \* 0\.5, sPos\.y, sPos\.z\);/g, 'const cp1 = new THREE.Vector3(sPos.x + dist * 0.3, sPos.y, sPos.z);');
appJs = appJs.replace(/const cp2 = new THREE\.Vector3\(tPos\.x - dist \* 0\.5, tPos\.y, tPos\.z\);/g, 'const cp2 = new THREE.Vector3(tPos.x - dist * 0.3, tPos.y, tPos.z);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 11.");
