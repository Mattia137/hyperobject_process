const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// The DOM labels are not clickable because the logic "window.location.href" is inside the canvas onClick and relies on raycaster.
// If labels cover the canvas and have pointer-events auto, the raycaster fails.
// If labels have pointer-events none, the canvas click triggers, raycaster succeeds, and onClick is called.
// So we want labelDiv to be pointer-events none AND cursor pointer for the canvas itself when hovering.

// Let's add cursor logic in raycaster
appJs = appJs.replace(/if \(intersected\)/g, 'if (intersected) {\n        document.body.style.cursor = "pointer";\n    } else {\n        document.body.style.cursor = "default";\n    }\n    if (intersected)');

fs.writeFileSync('app.js', appJs);
console.log("Applied fix 15.");
