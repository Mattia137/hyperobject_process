const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Also adjust the node text to look like button. The current zoom level might not be enough or spacing is still too wide.
// Let's decrease spacing slightly to fit in standard wide screen.
appJs = appJs.replace(/let x2d = \(d - maxDepth\/2\) \* 250;/g, 'let x2d = (d - maxDepth/2) * 180;');

// Also fix the camera for 2D mode, making it view slightly more
appJs = appJs.replace(/camera\.position\.lerp\(new THREE\.Vector3\(0, 0, 1300\), 0\.05\);/g, 'camera.position.lerp(new THREE.Vector3(0, 0, 1000), 0.05);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 10.");
