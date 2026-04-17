const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The scale(0.7) was applied in 2d but maybe pill shape isn't what we want or we need to remove the border.
// Look at 2d label update:
// label.style.padding = '4px 8px';
// label.style.border = '1px solid var(--fg)';
// label.style.borderRadius = '12px';

// Let's change the 2D layout spacing a bit more and fix the label styling in 2D mode
appJs = appJs.replace(/let x2d = \(d - maxDepth\/2\) \* 600;/g, 'let x2d = (d - maxDepth/2) * 200;');
appJs = appJs.replace(/let y2d = \(rowIdx - \(nodesInDepth\.length-1\)\/2\) \* 200;/g, 'let y2d = (rowIdx - (nodesInDepth.length-1)/2) * 60;');

appJs = appJs.replace(/label\.style\.padding = '4px 8px';/g, "label.style.padding = '0';");
appJs = appJs.replace(/label\.style\.border = '1px solid var\(--fg\)';/g, "label.style.border = 'none';");
appJs = appJs.replace(/label\.style\.borderRadius = '12px';/g, "label.style.borderRadius = '0';");
appJs = appJs.replace(/label\.style\.backgroundColor = 'var\(--bg\)';/g, "label.style.backgroundColor = 'transparent';");
appJs = appJs.replace(/label\.style\.transform = \`translate\(-50%, -50%\) scale\(0\.7\)\`;/g, "label.style.transform = `translate(-50%, -50%)`;");

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 7.");
