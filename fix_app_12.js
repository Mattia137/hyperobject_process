const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Also adjust the node text to look like button. The current zoom level might not be enough or spacing is still too wide.
// Let's decrease spacing slightly to fit in standard wide screen.
appJs = appJs.replace(/let x2d = \(d - maxDepth\/2\) \* 180;/g, 'let x2d = (d - maxDepth/2) * 160;');
appJs = appJs.replace(/let y2d = \(rowIdx - \(nodesInDepth\.length-1\)\/2\) \* 80;/g, 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 90;');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 12.");
