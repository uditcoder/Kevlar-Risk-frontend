const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// Hook up Sidebar Buttons
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?id="nav-btn-dashboard"[^>]*?)>/g, '<button onClick={() => setActiveTab(\'dashboard\')} $1>');
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?id="nav-btn-incidents"[^>]*?)>/g, '<button onClick={() => setActiveTab(\'incidents\')} $1>');

// Hook up Mode Pill
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?id="mode-pill-perimeter"[^>]*?)>/g, '<button onClick={() => setActiveTab(\'dashboard\')} $1>');
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?id="mode-pill-compliance"[^>]*?)>/g, '<button onClick={() => setActiveTab(\'incidents\')} $1>');

// Hook up Monitor Dropdown Tabs
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?)>Web URL<\/button>/g, '<button onClick={() => setActiveTab(\'monitor-web\')} $1>Web URL</button>');
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?)>VPN<\/button>/g, '<button onClick={() => setActiveTab(\'monitor-vpn\')} $1>VPN</button>');
code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?)>Public IP<\/button>/g, '<button onClick={() => setActiveTab(\'monitor-ip\')} $1>Public IP</button>');

// Hook up Monitor Dropdown toggling
// The original code was: onclick="document.getElementById('monitor-dropdown').classList.toggle('hidden')"
// Since we don't have that, we will add a local state for the dropdown
const stateHook = `  const [activeTab, setActiveTab] = useState('dashboard');\n  const [isMonitorOpen, setIsMonitorOpen] = useState(false);`;
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('dashboard'\);/, stateHook);

code = code.replace(/<button onClick=\{\(\) => \{\}\}([^>]*?)(?=class|className=".*?sidebar-item.*?Monitor)/, '<button onClick={() => setIsMonitorOpen(!isMonitorOpen)} $1');

// For view-dashboard, view-scanner, view-findings, we replace `className="... hidden"` or just `className="..."`
// view-dashboard
code = code.replace(/<div id="view-dashboard" className="(.*?)"/g, '<div id="view-dashboard" className={`$1 ${activeTab === \'dashboard\' ? \'\' : \'hidden\'}`}');
// view-scanner
code = code.replace(/<div id="view-scanner" className="(.*?)"/g, '<div id="view-scanner" className={`$1 ${activeTab.startsWith(\'monitor-\') ? \'\' : \'hidden\'}`}');
// view-findings
code = code.replace(/<div id="view-findings" className="(.*?)"/g, '<div id="view-findings" className={`$1 ${activeTab === \'incidents\' ? \'\' : \'hidden\'}`}');

// Also, Monitor dropdown needs state
code = code.replace(/<div id="monitor-dropdown" className="hidden(.*?)"/g, '<div id="monitor-dropdown" className={`$1 ${isMonitorOpen ? \'\' : \'hidden\'}`}');


fs.writeFileSync(appPath, code);
console.log('Tabs fixed in App.jsx');
