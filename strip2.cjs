const fs = require('fs');
const path = require('path');

function stripComments(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove ANY line containing '<!--'
    content = content.split('\n').filter(line => !line.includes('<!--')).join('\n');
    
    // Fix IncidentCenter adjacent JSX
    if (filePath.endsWith('IncidentCenter.jsx')) {
        // If there are multiple root elements, it needs a fragment. 
        // We already wrapped it in <></>, but maybe the wrapper is bad.
    }
    
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

files.forEach(f => stripComments(path.join(dir, f)));

console.log('Stripped all lines with HTML comments');
