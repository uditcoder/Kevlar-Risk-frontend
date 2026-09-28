const fs = require('fs');
const path = require('path');

function wrapInFragment(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix broken comments
    content = content.replace(/(\s*)(VIEW \d?:? [A-Z ]+) (.*?)-->/g, '$1{/* $2 $3 */}');
    content = content.replace(/(\s*)(LEFT SIDEBAR|MAIN APPLICATION VIEWPORT|Top Navigation Bar|Main Workspace Body|MONITORED ATTACK SURFACE|SCAN INITIATED POPUP|INCIDENT SCAN DETAILS POPUP|INTERACTIVE PERIMETER|LIVE AUDIT RESULT|Incidents Cards Grid|ALL FINDINGS & REPORT) (.*?)-->/g, '$1{/* $2 $3 */}');

    content = content.replace(/return \(\s*([\s\S]+?)\s*\);/, (match, inner) => {
        return `return (\n        <>\n${inner}\n        </>\n    );`;
    });
    
    fs.writeFileSync(filePath, content);
}

const dir = path.join(__dirname, 'src');
const files = [
    'components/Sidebar.jsx',
    'components/Header.jsx',
    'components/Modals.jsx',
    'pages/Dashboard.jsx',
    'pages/Scanner.jsx',
    'pages/IncidentCenter.jsx'
];

files.forEach(f => wrapInFragment(path.join(dir, f)));

// Also fix Scanner class=
let scannerPath = path.join(dir, 'pages', 'Scanner.jsx');
let scannerCode = fs.readFileSync(scannerPath, 'utf8');
scannerCode = scannerCode.replace(/class=/g, 'className=');
fs.writeFileSync(scannerPath, scannerCode);

console.log('Cleanup done');
