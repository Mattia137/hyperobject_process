const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// The 2D diagram needs to be spread out significantly more so that all the pills fit
// We can scale the entire scene out or just increase x2d and y2d significantly.
// Let's adjust x2d and y2d
code = code.replace('let x2d = (d - maxDepth/2) * 450;', 'let x2d = (d - maxDepth/2) * 600;');
code = code.replace('let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 150;', 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 200;');

// Also, the 2D pills look a bit clunky, let's refine them
code = code.replace("n.labelDom.style.border = `1px solid ${n === hoveredNode ? APP_CONFIG.colors.hoverAccent : APP_CONFIG.colors.mode2DNode}`;", "n.labelDom.style.border = `2px solid ${n === hoveredNode ? APP_CONFIG.colors.hoverAccent : APP_CONFIG.colors.mode2DNode}`;");
code = code.replace("n.labelDom.style.borderRadius = '20px';", "n.labelDom.style.borderRadius = '25px';");

fs.writeFileSync('app.js', code);
