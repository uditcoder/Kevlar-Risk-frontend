const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add state variable selectedAssetHost
if (!code.includes('const [selectedAssetHost, setSelectedAssetHost] = useState(null);')) {
    code = code.replace(/const \[allFindings, setAllFindings\] = useState\(\[\]\);/, 
        "const [allFindings, setAllFindings] = useState([]);\n  const [selectedAssetHost, setSelectedAssetHost] = useState(null);");
}

// 2. Add helper logic inside App component to group findings by host
const helperLogic = `
  // Group findings by host for the Incident Center
  const groupedFindings = Object.values(allFindings.reduce((acc, finding) => {
    const host = finding.host || 'Unknown Target';
    if (!acc[host]) {
      acc[host] = {
        host,
        type: finding.type,
        findings: []
      };
    }
    acc[host].findings.push(finding);
    return acc;
  }, {}));

  // Selected findings for the modal
  const modalFindings = selectedAssetHost ? groupedFindings.find(g => g.host === selectedAssetHost)?.findings || [] : [];
  const modalHighestSeverity = modalFindings.length > 0 ? ['critical', 'high', 'medium', 'low', 'info'].find(s => modalFindings.some(f => f.severity === s)) || 'info' : 'info';
`;
if (!code.includes('const groupedFindings = Object.values(allFindings.reduce(')) {
    code = code.replace(/const showScanPopup = \(\) => {/, helperLogic + '\n  const showScanPopup = () => {');
}

// 3. Update incidentsListContainer to map over groupedFindings instead of allFindings
const containerRegex = /<div id="incidentsListContainer" className="grid([^>]+)>([\s\S]*?)<\/div>\s*<\/div>\s*\{\/\* <!-- ── VIEW 3/;
const dynamicCards = `<div id="incidentsListContainer" className="grid$1>
    {groupedFindings.length === 0 ? (
        <div className="col-span-full py-12 text-center text-slate-500 text-xs font-medium bg-[#101423]/50 rounded-2xl border border-dashed border-white/10">
            No active incidents. Systems are secure.
        </div>
    ) : (
        groupedFindings.map((group, i) => {
            const highestSeverity = ['critical', 'high', 'medium', 'low', 'info'].find(s => group.findings.some(f => f.severity === s)) || 'info';
            const primaryFinding = group.findings.find(f => f.severity === highestSeverity) || group.findings[0];
            return (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/5 bg-[#12162a]/60 hover:bg-[#161b33] transition-all group relative flex flex-col">
                
                {/* Top Badges */}
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-bold text-slate-300 bg-[#1a1f36] border border-white/10 uppercase tracking-widest px-2 py-1 rounded">
                        {primaryFinding.type === 'web' || !primaryFinding.type ? 'WEB URL' : primaryFinding.type}
                    </span>
                    <span className={\`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border \${
                        highestSeverity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        highestSeverity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        highestSeverity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        highestSeverity === 'low' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }\`}>
                        {highestSeverity} RISK
                    </span>
                </div>

                {/* Host Title */}
                <div className="flex items-center gap-2 mb-4">
                    <span className={\`w-2 h-2 rounded-full \${
                        highestSeverity === 'critical' ? 'bg-red-500' :
                        highestSeverity === 'high' ? 'bg-orange-500' :
                        highestSeverity === 'medium' ? 'bg-amber-500' :
                        highestSeverity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                    }\`}></span>
                    <h4 className="text-sm font-bold text-white tracking-wide truncate">{group.host}</h4>
                </div>

                {/* Inner Finding Box */}
                <div className="bg-[#1a1423]/50 border border-red-900/30 rounded-xl p-4 mb-5 flex-1">
                    <div className="text-xs font-bold text-red-400 mb-2 font-mono truncate">{primaryFinding.name}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                        {primaryFinding.description || "A weak cipher is defined as an encryption/decryption algorithm that uses a key of insufficient length. Using an unapproved or weak cryptographic algorithm increases the risk of successful cryptanalytic attacks."}
                    </p>
                    {group.findings.length > 1 && (
                        <div className="mt-3 text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                            + {group.findings.length - 1} more findings
                        </div>
                    )}
                </div>

                {/* Metadata Row */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-5 font-mono">
                    <div>Ports: <span className="text-slate-300">{primaryFinding.ports || '443/SSL'}</span></div>
                    <div>{primaryFinding.timestamp ? new Date(primaryFinding.timestamp).toLocaleDateString() : 'Just now'}</div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button onClick={() => setSelectedAssetHost(group.host)} className="flex items-center justify-center gap-2 bg-[#2d1b4e] hover:bg-[#3a2365] text-purple-200 border border-purple-500/20 rounded-lg py-2 transition-colors text-[11px] font-bold cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        View Details
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 rounded-lg py-2 transition-colors text-[11px] font-bold cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Rescan
                    </button>
                </div>
            </div>
            );
        })
    )}
</div>
</div>
            {/* <!-- ── VIEW 3`;

code = code.replace(containerRegex, dynamicCards);


// 4. Update Modal to display selectedAssetHost findings
const modalRegex = /<div id="incidentDetailModal"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const dynamicModal = `<div id="incidentDetailModal" className={\`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto \${selectedAssetHost ? '' : 'hidden'}\`} onClick={() => setSelectedAssetHost(null)}>
    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d101d] border border-white/10 rounded-2xl shadow-2xl shadow-purple-950/40 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* <!-- Modal Header --> */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12162a]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white font-mono truncate max-w-md">{selectedAssetHost || 'Target'}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">URL</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Automated Perimeter Security & Compliance Audit Log</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={\`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono \${
                    modalHighestSeverity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    modalHighestSeverity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    modalHighestSeverity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    modalHighestSeverity === 'low' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }\`}>{modalHighestSeverity} RISK</span>
                <button onClick={() => setSelectedAssetHost(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>

        {/* <!-- Modal Body --> */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200 text-xs">
            {modalFindings.map((finding, idx) => (
                <div key={idx} className="bg-[#1a1423]/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={\`w-2 h-2 rounded-full \${
                                finding.severity === 'critical' ? 'bg-red-500' :
                                finding.severity === 'high' ? 'bg-orange-500' :
                                finding.severity === 'medium' ? 'bg-amber-500' :
                                finding.severity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                            }\`}></span>
                            <span className="font-bold text-sm text-white font-mono">{finding.name}</span>
                        </div>
                        <span className={\`text-[9px] font-bold uppercase px-2 py-0.5 rounded \${
                            finding.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            finding.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            finding.severity === 'low' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }\`}>{finding.severity}</span>
                    </div>
                    <p className="text-slate-400 mb-3">{finding.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Template ID</div>
                            <div className="font-mono truncate">{finding.id}</div>
                        </div>
                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Protocol</div>
                            <div className="font-mono truncate">{finding.type || 'http'}</div>
                        </div>
                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Matched At</div>
                            <div className="font-mono text-emerald-400 truncate" title={finding.matchedAt}>{finding.matchedAt ? new URL(finding.matchedAt).pathname : '/'}</div>
                        </div>
                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Time</div>
                            <div className="font-mono truncate">{finding.timestamp ? new Date(finding.timestamp).toLocaleTimeString() : 'Now'}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
</div>`;

code = code.replace(modalRegex, dynamicModal);

fs.writeFileSync(appPath, code);
console.log('Fixed asset grouping and modal details');
