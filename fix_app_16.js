const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');
// Fix raycaster syntax error that might have been introduced
// Previous was:
// if (intersected) {
//     document.body.style.cursor = "pointer";
// } else {
//     document.body.style.cursor = "default";
// }
// if (intersected)

// Oh wait, `if (intersected) { ... } if (intersected) ...` is fine syntax-wise.
// Wait, I should make sure that the previous replace was correct.
console.log("Check app.js");
