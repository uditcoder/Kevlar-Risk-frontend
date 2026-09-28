const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// If the previous replace resulted in className={`space-y-3 hidden`} etc.
code = code.replace(/id="field-group-url" className=\{?["'](.*?)["']\}?/g, (match, p1) => {
    let clean = p1.replace(' hidden', '').replace('hidden ', '');
    return `id="field-group-url" className={\`${clean} \${activeTab === 'monitor-web' ? '' : 'hidden'}\`}`;
});
code = code.replace(/id="field-group-vpn" className=\{?["'](.*?)["']\}?/g, (match, p1) => {
    let clean = p1.replace(' hidden', '').replace('hidden ', '');
    return `id="field-group-vpn" className={\`${clean} \${activeTab === 'monitor-vpn' ? '' : 'hidden'}\`}`;
});
code = code.replace(/id="field-group-ip" className=\{?["'](.*?)["']\}?/g, (match, p1) => {
    let clean = p1.replace(' hidden', '').replace('hidden ', '');
    return `id="field-group-ip" className={\`${clean} \${activeTab === 'monitor-ip' ? '' : 'hidden'}\`}`;
});

fs.writeFileSync(appPath, code);
console.log('Fixed field groups.');
