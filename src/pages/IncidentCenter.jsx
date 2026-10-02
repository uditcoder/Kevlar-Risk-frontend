import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import DateRangePicker from '../components/DateRangePicker';

export default function IncidentCenter() {
    const { allFindings, groupedFindings, setSelectedAssetHost, user } = useAppContext();
    const [dateFilter, setDateFilter] = useState({ start: null, end: null });
    const [severityFilter, setSeverityFilter] = useState('all');

    const downloadAllCSV = () => {
        const headers = ["Target Host", "Finding Name", "Severity", "Description"];
        const rows = [];
        filteredGroups.forEach(group => {
            group.findings.forEach(f => {
                rows.push([
                    group.host || 'Unknown',
                    `"${(f.name || '').replace(/"/g, '""')}"`,
                    f.severity || 'info',
                    `"${(f.description || '').replace(/"/g, '""')}"`
                ]);
            });
        });
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `All_Incidents_Report_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCSV = (group) => {
        const headers = ["Target Host", "Finding Name", "Severity", "Description"];
        const rows = group.findings.map(f => [
            group.host || 'Unknown',
            `"${(f.name || '').replace(/"/g, '""')}"`,
            f.severity || 'info',
            `"${(f.description || '').replace(/"/g, '""')}"`
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `findings_${group.host}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredGroups = useMemo(() => {
        let result = groupedFindings;

        // Filter by Severity Category (Issues vs Safe)
        result = result.filter(group => {
            if (severityFilter === 'all') return true;
            const hasIssue = group.findings.some(f => ['critical', 'high', 'medium', 'low'].includes(f.severity));
            if (severityFilter === 'issues') return hasIssue;
            if (severityFilter === 'safe') return !hasIssue;
            return true;
        });

        // Filter by Date
        if (dateFilter.start || dateFilter.end) {
            result = result.map(group => {
                const filteredFindings = group.findings.filter(f => {
                    if (!f.timestamp) return true; // Keep if no timestamp
                    const findingDate = new Date(f.timestamp);
                    findingDate.setHours(0, 0, 0, 0); // Normalize to midnight
                    
                    let inRange = true;
                    if (dateFilter.start) {
                        const startDate = new Date(dateFilter.start);
                        startDate.setHours(0, 0, 0, 0);
                        if (findingDate < startDate) inRange = false;
                    }
                    if (dateFilter.end) {
                        const endDate = new Date(dateFilter.end);
                        endDate.setHours(0, 0, 0, 0);
                        if (findingDate > endDate) inRange = false;
                    }
                    return inRange;
                });
                return { ...group, findings: filteredFindings };
            }).filter(group => group.findings.length > 0);
        }

        return result;
    }, [groupedFindings, dateFilter, severityFilter]);
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative z-20 glass-card p-6 sm:p-7 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            Incident Center & Root-Cause Audit
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Deep inspection of discovered exposures, CVE mappings, affected ports, and compliance remediation.</p>
                    </div>

                    <div className="flex-shrink-0">
                        <DateRangePicker onDateChange={setDateFilter} defaultMonth={user?.createdAt} />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setSeverityFilter('all')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'all' ? 'bg-blue-600 text-white border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            All (<span className={severityFilter === 'all' ? 'text-blue-200' : 'text-slate-500'}>{allFindings.length}</span>)
                        </button>
                        <button onClick={() => setSeverityFilter('issues')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'issues' ? 'bg-purple-600 text-white border border-purple-500/30 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            Issues (<span className={severityFilter === 'issues' ? 'text-purple-200' : 'text-slate-500'}>{allFindings.filter(f => ['critical', 'high', 'medium', 'low'].includes(f.severity)).length}</span>)
                        </button>
                        <button onClick={() => setSeverityFilter('safe')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'safe' ? 'bg-emerald-600 text-white border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            Safe / Info (<span className={severityFilter === 'safe' ? 'text-emerald-200' : 'text-slate-500'}>{allFindings.filter(f => !f.severity || f.severity === 'info' || f.severity === 'unknown').length}</span>)
                        </button>
                    </div>
                    
                    <button onClick={downloadAllCSV} className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-white transition-colors shadow-sm ml-4">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download Report
                    </button>
                </div>
            </div>

            <div className="glass-card mt-6 border border-white/5 bg-[#12162a]/60 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-widest bg-[#1a1423]/50">
                                <th className="py-4 px-5">Incident ID</th>
                                <th className="py-4 px-5">Target</th>
                                <th className="py-4 px-5">Type</th>
                                <th className="py-4 px-5">Sources</th>
                                <th className="py-4 px-5">Detected Date</th>
                                <th className="py-4 px-5">Status</th>
                                <th className="py-4 px-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-medium text-xs bg-[#101423]/50">
                                        No active incidents. Systems are secure.
                                    </td>
                                </tr>
                            ) : (
                                filteredGroups.map((group, i) => {
                                    const highestSeverity = ['critical', 'high', 'medium', 'low', 'info'].find(s => group.findings.some(f => f.severity === s)) || 'info';
                                    const primaryFinding = group.findings.find(f => f.severity === highestSeverity) || group.findings[0];
                                    
                                    const dateStr = (primaryFinding.timestamp ? new Date(primaryFinding.timestamp) : new Date()).toLocaleDateString('en-GB').replace(/\//g, '');
                                    const prefix = (user?.company || user?.name || 'CYBR').substring(0, 4).toUpperCase().padEnd(4, 'A');
                                    const typeStr = (primaryFinding.assetType === 'url' ? 'DOMAIN' : (primaryFinding.assetType || 'DOMAIN')).substring(0, 5).toUpperCase();
                                    const incidentId = `${prefix}-${typeStr}-${dateStr}-${String(i+1).padStart(4, '0')}`;

                                    return (
                                        <tr key={i} className="border-b border-white/5 bg-[#12162a]/30 hover:bg-[#161b33] transition-colors group-row">
                                            <td className="px-5 py-4 whitespace-nowrap font-mono text-slate-300">
                                                {incidentId}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                                    {group.host}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-slate-300 uppercase">
                                                {primaryFinding.assetType === 'url' ? 'DOMAIN SCAN' : `${primaryFinding.assetType || 'DOMAIN'} SCAN`}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-slate-400 uppercase text-[10px] truncate max-w-[200px]" title={primaryFinding.name}>
                                                    {primaryFinding.name} {group.findings.length > 1 ? `[+${group.findings.length - 1} MORE]` : ''}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-slate-300 font-mono">
                                                {primaryFinding.timestamp ? new Date(primaryFinding.timestamp).toLocaleDateString() : 'Just now'}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                                    Open
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setSelectedAssetHost(group.host)} className="bg-[#2d1b4e] hover:bg-[#3a2365] text-purple-200 border border-purple-500/20 rounded-lg px-4 py-2 transition-colors text-[10px] font-bold tracking-wider uppercase cursor-pointer">
                                                        View Details
                                                    </button>
                                                    <button onClick={() => downloadCSV(group)} title="Download CSV" className="flex items-center justify-center p-2 bg-[#131729] hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Ingest raw findings log removed as per user request */}
        </div>
    );
}
