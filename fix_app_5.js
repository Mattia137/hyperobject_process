const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// The 2D diagram needs to be even more zoomed out to see all nodes
// Let's modify the 2D label display code so that the scale applies to them too
// Currently they are not scaled in 2D mode, making them take up too much screen space
let scaleCode = `
        // Scale text based on depth in 3D
        let scale = 1;
        if (currentMode === "A") {
            scale = Math.max(0.3, 1 - (n.mesh.position.distanceTo(camera.position) / 1500));
        } else {
            // In 2D we also need to scale down because the graph is huge
            scale = 0.5;
        }
        n.labelDom.style.transform = \`translate(-50%, -50%) scale(\${scale})\`;
`;
code = code.replace(/\/\/ Scale text based on depth in 3D[\s\S]*?n\.labelDom\.style\.transform = `translate\(-50%, -50%\) scale\(\$\{scale\}\)`;/g, scaleCode);

fs.writeFileSync('app.js', code);
