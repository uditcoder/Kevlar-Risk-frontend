import os
import re

src_dir = os.path.join(os.path.dirname(__file__), 'src')
app_path = os.path.join(src_dir, 'App.jsx')

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

def get_between(text, start_str, end_str):
    start = text.find(start_str)
    if start == -1: return ""
    end = text.find(end_str, start)
    if end == -1: return ""
    return text[start:end]

sidebar = get_between(code, '{/* <!-- \U0001f537\U0001f537 LEFT SIDEBAR', '{/* <!-- \U0001f537\U0001f537 MAIN APPLICATION VIEWPORT')
if not sidebar: sidebar = get_between(code, 'LEFT SIDEBAR', 'MAIN APPLICATION VIEWPORT')

header = get_between(code, '{/* <!-- Top Navigation Bar', '{/* <!-- Main Workspace Body --> */}')
if not header: header = get_between(code, 'Top Navigation Bar', 'Main Workspace Body')

dash = get_between(code, '{/* <!-- \U0001f537\U0001f537 VIEW 1: DASHBOARD', '{/* <!-- \U0001f537\U0001f537 VIEW: SCANNER')
if not dash: dash = get_between(code, 'VIEW 1: DASHBOARD', 'VIEW: SCANNER')
dash_match = re.search(r'(<div id="view-dashboard".*?>)', dash)
if dash_match: dash = dash.replace(dash_match.group(1), '<div className="space-y-8 animate-in fade-in duration-500">')

scanner = get_between(code, '{/* <!-- \U0001f537\U0001f537 VIEW: SCANNER', '{/* <!-- \U0001f537\U0001f537 VIEW 2: INCIDENT CENTER')
if not scanner: scanner = get_between(code, 'VIEW: SCANNER', 'VIEW 2: INCIDENT CENTER')
scan_match = scanner.find('<div className="glass-card')
if scan_match != -1: scanner = scanner[scan_match:]

incidents = get_between(code, '{/* <!-- \U0001f537\U0001f537 VIEW 2: INCIDENT CENTER', '{/* <!-- \U0001f537\U0001f537 VIEW 3: ALL FINDINGS')
if not incidents: incidents = get_between(code, 'VIEW 2: INCIDENT CENTER', 'VIEW 3: ALL FINDINGS')
inc_match = re.search(r'(<div id="view-findings".*?>)', incidents)
if inc_match: incidents = incidents.replace(inc_match.group(1), '<div className="space-y-8 animate-in fade-in duration-500">')

scan_modal = get_between(code, '{/* <!-- \U0001f537\U0001f537 SCAN INITIATED POPUP MODAL', '{/* <!-- \U0001f537\U0001f537 INCIDENT SCAN DETAILS POPUP MODAL')
if not scan_modal: scan_modal = get_between(code, 'SCAN INITIATED POPUP MODAL', 'INCIDENT SCAN DETAILS POPUP MODAL')

inc_modal = get_between(code, '{/* <!-- \U0001f537\U0001f537 INCIDENT SCAN DETAILS POPUP MODAL', '</div>\n</div>\n  );\n}')
if not inc_modal: inc_modal = get_between(code, 'INCIDENT SCAN DETAILS POPUP MODAL', '</div>\n</div>\n  );\n}')
if inc_modal: inc_modal = '{/* ' + inc_modal

# Write Sidebar
sidebar_code = f"""import React, {{ useState }} from 'react';
import {{ NavLink }} from 'react-router-dom';
import {{ useAppContext }} from '../context/AppContext';

export default function Sidebar() {{
    const {{ allFindings }} = useAppContext();
    const [isMonitorOpen, setIsMonitorOpen] = useState(false);
    return (
        {'{/* ' + sidebar if sidebar else ''}
    );
}}
"""
sidebar_code = re.sub(r'<button onClick=\{[^>]+\}[^>]*>([\s\S]*?)<\/button>', r'<NavLink to="#" className="sidebar-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white border border-transparent">\1</NavLink>', sidebar_code)

os.makedirs(os.path.join(src_dir, 'components'), exist_ok=True)
os.makedirs(os.path.join(src_dir, 'pages'), exist_ok=True)
os.makedirs(os.path.join(src_dir, 'layouts'), exist_ok=True)

with open(os.path.join(src_dir, 'components', 'Sidebar.jsx'), 'w', encoding='utf-8') as f: f.write(sidebar_code)

# Write Header
header_code = f"""import React from 'react';
import {{ Link }} from 'react-router-dom';
export default function Header() {{
    return (
        {'{/* ' + header if header else ''}
    );
}}
"""
with open(os.path.join(src_dir, 'components', 'Header.jsx'), 'w', encoding='utf-8') as f: f.write(header_code)

# Write Dashboard
dash_code = f"""import React from 'react';
import {{ useAppContext }} from '../context/AppContext';
import {{ Link }} from 'react-router-dom';

export default function Dashboard() {{
    const {{ monitoredAssets, allFindings }} = useAppContext();
    return (
        {dash}
    );
}}
"""
with open(os.path.join(src_dir, 'pages', 'Dashboard.jsx'), 'w', encoding='utf-8') as f: f.write(dash_code)

# Write Scanner
scanner_code = f"""import React, {{ useState }} from 'react';
import {{ useAppContext }} from '../context/AppContext';

export default function Scanner() {{
    const {{ isScanning, setIsScanning, scanStatus, setScanStatus, scanResult, setScanResult, monitoredAssets, setMonitoredAssets, allFindings, setAllFindings }} = useAppContext();
    const [scannerCategory, setScannerCategory] = useState('web');
    
    // We will place the handleScanSubmit here
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
        {scanner}
        </div>
    );
}}
"""
with open(os.path.join(src_dir, 'pages', 'Scanner.jsx'), 'w', encoding='utf-8') as f: f.write(scanner_code)

# Write IncidentCenter
inc_code = f"""import React from 'react';
import {{ useAppContext }} from '../context/AppContext';

export default function IncidentCenter() {{
    const {{ allFindings, groupedFindings, setSelectedAssetHost }} = useAppContext();
    return (
        {incidents}
    );
}}
"""
with open(os.path.join(src_dir, 'pages', 'IncidentCenter.jsx'), 'w', encoding='utf-8') as f: f.write(inc_code)

# Write Modals
modals_code = f"""import React from 'react';
import {{ useAppContext }} from '../context/AppContext';

export default function Modals() {{
    const {{ selectedAssetHost, setSelectedAssetHost, modalHighestSeverity, modalFindings }} = useAppContext();
    return (
        <>
            {'{/* ' + scan_modal if scan_modal else ''}
            {inc_modal}
        </>
    );
}}
"""
with open(os.path.join(src_dir, 'components', 'Modals.jsx'), 'w', encoding='utf-8') as f: f.write(modals_code)

# Write MainLayout
layout_code = """import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Modals from '../components/Modals';

export default function MainLayout() {
    return (
        <div className="min-h-screen flex bg-[#0a0c14] text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                <Header />
                <div className="p-6 sm:p-8 space-y-8 flex-1">
                    <Outlet />
                </div>
            </main>
            <Modals />
        </div>
    );
}
"""
with open(os.path.join(src_dir, 'layouts', 'MainLayout.jsx'), 'w', encoding='utf-8') as f: f.write(layout_code)

print("Extraction complete via Python.")
