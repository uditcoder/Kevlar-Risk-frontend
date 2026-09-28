const fs = require('fs');
const path = require('path');

function stripComments(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Strip out all comments that look like `{/* ... */}` and `*/}` that are malformed
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    content = content.replace(/\*\/\}/g, '');
    content = content.replace(/\{\/\*/g, '');
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    
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

console.log('Stripped comments');
