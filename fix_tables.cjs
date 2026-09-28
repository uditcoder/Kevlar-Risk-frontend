const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

const assetsTbodyRegex = /<tbody[^>]*>([\s\S]*?No assets monitored yet[\s\S]*?)<\/tbody>/;
const assetsTbodyReplacement = `<tbody>
    {monitoredAssets.length === 0 ? (
        <tr>
            <td colSpan="5" className="px-5 py-12 text-center text-slate-500 font-medium text-xs bg-[#101423]/50">
                No assets monitored yet. Enter an address above to start an audit.
            </td>
        </tr>
    ) : (
        monitoredAssets.map((asset, idx) => (
            <tr key={idx} className="border-b border-white/5 bg-[#12162a]/30 hover:bg-[#161b33] transition-colors group">
                <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{asset.target}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{asset.label || 'Unlabeled Asset'}</div>
                        </div>
                    </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-[#1a1f36] text-slate-300 border border-white/10 uppercase tracking-wider">
                        {asset.category}
                    </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                    </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                        {asset.ports && asset.ports.length > 0 ? asset.ports.map((p, i) => (
                            <span key={i} className="text-[10px] mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p}</span>
                        )) : (
                            <span className="text-[10px] text-slate-500 italic">None</span>
                        )}
                    </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-[11px] text-slate-400 font-medium">
                    {asset.lastScanned}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                    <button className="text-slate-500 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                </td>
            </tr>
        ))
    )}
</tbody>`;
code = code.replace(assetsTbodyRegex, assetsTbodyReplacement);

const findingsTbodyRegex = /<tbody[^>]*>([\s\S]*?No security exposures discovered yet[\s\S]*?)<\/tbody>/g;
const findingsTbodyReplacement = `<tbody>
    {allFindings.length === 0 ? (
        <tr>
            <td colSpan="6" className="px-5 py-12 text-center text-slate-500 font-medium text-xs bg-[#101423]/50">
                No security exposures discovered yet. Run an audit to populate this center.
            </td>
        </tr>
    ) : (
        allFindings.map((finding, idx) => (
            <tr key={idx} className="border-b border-white/5 bg-[#12162a]/30 hover:bg-[#161b33] transition-colors group">
                <td className="px-5 py-3 whitespace-nowrap">
                    <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border \${
                        finding.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        finding.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        finding.severity === 'low' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    } uppercase\`}>
                        {finding.severity}
                    </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{finding.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate">{finding.id}</div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-xs font-mono text-slate-300">{finding.host}</div>
                    <div className="text-[10px] text-emerald-400/70 mt-0.5 font-mono truncate max-w-[150px]">{finding.matchedAt || finding.host}</div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-[10px] mono bg-[#1a1f36] text-slate-400 px-1.5 py-0.5 rounded border border-white/10 uppercase">
                        {finding.type || 'vuln'}
                    </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[11px] text-slate-400 font-medium">
                    {finding.timestamp ? new Date(finding.timestamp).toLocaleString() : 'Just now'}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-right">
                    <button className="text-purple-400 hover:text-purple-300 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded transition-colors">
                        Investigate
                    </button>
                </td>
            </tr>
        ))
    )}
</tbody>`;

code = code.replace(findingsTbodyRegex, findingsTbodyReplacement);

fs.writeFileSync(appPath, code);
console.log('Fixed React mapping for tables');
