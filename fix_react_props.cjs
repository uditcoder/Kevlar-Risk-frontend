const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

code = code.replace(/stop-color/g, 'stopColor');
code = code.replace(/colspan/g, 'colSpan');
code = code.replace(/ checked/g, ' defaultChecked');

// The onChange issue: find any onChange="something"
code = code.replace(/onChange="[^"]*"/g, 'onChange={() => {}}');

// The onInput issue: find any onInput="something" (just in case)
code = code.replace(/onInput="[^"]*"/g, 'onInput={() => {}}');

fs.writeFileSync(appPath, code);
console.log('Fixed React DOM warnings');
