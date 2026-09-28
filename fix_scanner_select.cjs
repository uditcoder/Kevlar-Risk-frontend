const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// Fix the select dropdown that shows the category so it matches activeTab
code = code.replace(/<select id="selectAssetCategory"([^>]*?)>/, 
    `<select id="selectAssetCategory" $1 value={activeTab.startsWith('monitor-') ? activeTab.replace('monitor-', '') : 'url'} onChange={(e) => setActiveTab('monitor-' + e.target.value)}>`
);

fs.writeFileSync(appPath, code);
console.log('Fixed select dropdown.');
