const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// I will adjust 2D camera zoom out completely to see all nodes.
appJs = appJs.replace(/camera\.position\.lerp\(new THREE\.Vector3\(0, 0, 1000\), 0\.05\);/g, 'camera.position.lerp(new THREE.Vector3(0, 0, 1300), 0.05);');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 9.");
