const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// Ensure camera zoom capability by allowing user scrolling
// (OrbitControls handles zooming, but we should make sure we're starting pulled back enough)
code = code.replace('camera.position.z = 800;', 'camera.position.z = 1500;');

fs.writeFileSync('app.js', code);
