const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// The issue is that the class strings captured in the template literal still contain the word "hidden".
// For example: <div id="view-scanner" className={`hidden space-y-8 ${...}`}>
// We need to remove the hardcoded "hidden" from these specific view containers.

code = code.replace(/<div id="view-scanner" className=\{`(.*?) \$\{/g, (match, p1) => {
    let clean = p1.replace(/\bhidden\b/g, '').trim();
    return `<div id="view-scanner" className={\`${clean} \${`;
});

code = code.replace(/<div id="view-findings" className=\{`(.*?) \$\{/g, (match, p1) => {
    let clean = p1.replace(/\bhidden\b/g, '').trim();
    return `<div id="view-findings" className={\`${clean} \${`;
});

// Also check view-incidents if that's a thing
code = code.replace(/<div id="view-incidents" className="hidden (.*?)"/g, '<div id="view-incidents" className="$1"');


fs.writeFileSync(appPath, code);
console.log('Fixed hardcoded hidden classes on views.');
