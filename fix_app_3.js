const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 2D Spread Fix
code = code.replace('let x2d = (d - maxDepth/2) * 300;', 'let x2d = (d - maxDepth/2) * 450;');
code = code.replace('let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 120;', 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 150;');

// Also pull camera closer in 3D now that zoom is 1500 but nodes are small
code = code.replace('camera.position.z = 1500;', 'camera.position.z = 1000;');

fs.writeFileSync('app.js', code);
