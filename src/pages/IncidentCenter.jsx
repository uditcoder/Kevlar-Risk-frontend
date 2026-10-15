import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import DateRangePicker from '../components/DateRangePicker';

export default function IncidentCenter() {
    const { allFindings, groupedFindings, setSelectedAssetHost, user, refreshScans } = useAppContext();
    const [dateFilter, setDateFilter] = useState({ start: null, end: null });
    const [severityFilter, setSeverityFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Auto-fetch latest scans as soon as user opens the Incident Center
    useEffect(() => {
        refreshScans?.();
    }, [refreshScans]);

    // Reset to page 1 whenever any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [severityFilter, dateFilter, searchQuery, pageSize]);

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
        link.setAttribute("download", `findings_${group.host}_${group.assetType || 'scan'}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Base incidents respecting search and date filters
    const searchableGroups = useMemo(() => {
        let result = groupedFindings;

        // Quick Search by Host or Finding Name
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(group => {
                if (group.host && group.host.toLowerCase().includes(query)) return true;
                return group.findings.some(f => (f.name && f.name.toLowerCase().includes(query)) || (f.templateId && f.templateId.toLowerCase().includes(query)));
            });
        }

        // Filter by Date
        if (dateFilter.start || dateFilter.end) {
            const startMs = dateFilter.start ? new Date(dateFilter.start).setHours(0, 0, 0, 0) : null;
            const endMs = dateFilter.end ? new Date(dateFilter.end).setHours(23, 59, 59, 999) : null;

            result = result.map(group => {
                const filteredFindings = group.findings.filter(f => {
                    if (!f.timestamp) return true;
                    const fMs = new Date(f.timestamp).getTime();
                    if (startMs && fMs < startMs) return false;
                    if (endMs && fMs > endMs) return false;
                    return true;
                });
                return { ...group, findings: filteredFindings };
            }).filter(group => group.findings.length > 0);
        }

        return result;
    }, [groupedFindings, dateFilter, searchQuery]);

    // Incident-level counts (number of incident rows/cards)
    const totalIncidentsCount = searchableGroups.length;
    const issueIncidentsCount = useMemo(() => {
        return searchableGroups.filter(g => g.findings.some(f => ['critical', 'high', 'medium', 'low'].includes(f.severity))).length;
    }, [searchableGroups]);
    const safeIncidentsCount = totalIncidentsCount - issueIncidentsCount;

    const filteredGroups = useMemo(() => {
        let result = searchableGroups;

        // Filter by Severity Category (Issues vs Safe)
        if (severityFilter !== 'all') {
            result = result.filter(group => {
                const hasIssue = group.findings.some(f => ['critical', 'high', 'medium', 'low'].includes(f.severity));
                if (severityFilter === 'issues') return hasIssue;
                if (severityFilter === 'safe') return !hasIssue;
                return true;
            });
        }

        return result;
    }, [searchableGroups, severityFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
    const paginatedGroups = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredGroups.slice(start, start + pageSize);
    }, [filteredGroups, currentPage, pageSize]);

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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setSeverityFilter('all')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'all' ? 'bg-blue-600 text-white border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            All (<span className={severityFilter === 'all' ? 'text-blue-200' : 'text-slate-500'}>{totalIncidentsCount}</span>)
                        </button>
                        <button onClick={() => setSeverityFilter('issues')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'issues' ? 'bg-purple-600 text-white border border-purple-500/30 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            Issues (<span className={severityFilter === 'issues' ? 'text-purple-200' : 'text-slate-500'}>{issueIncidentsCount}</span>)
                        </button>
                        <button onClick={() => setSeverityFilter('safe')} className={`inc-filter-pill px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === 'safe' ? 'bg-emerald-600 text-white border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#131729] text-slate-400 hover:text-white border border-white/5'}`}>
                            Safe / Info (<span className={severityFilter === 'safe' ? 'text-emerald-200' : 'text-slate-500'}>{safeIncidentsCount}</span>)
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search target host or CVE..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-[#131729] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-48 sm:w-60"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs">✕</button>
                            )}
                        </div>

                        <button onClick={downloadAllCSV} className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-white transition-colors shadow-sm cursor-pointer">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download Report
                        </button>
                    </div>
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
                            {paginatedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-medium text-xs bg-[#101423]/50">
                                        {filteredGroups.length === 0 ? "No active incidents found. Systems are secure." : "No incidents on this page."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedGroups.map((group, i) => {
                                    const globalIndex = (currentPage - 1) * pageSize + i;
                                    const highestSeverity = ['critical', 'high', 'medium', 'low', 'info'].find(s => group.findings.some(f => f.severity === s)) || 'info';
                                    const primaryFinding = group.findings.find(f => f.severity === highestSeverity) || group.findings[0] || {};
                                    
                                    const getDisplayType = (finding, groupItem) => {
                                        const tags = Array.isArray(finding.tags) ? finding.tags.map(t => String(t).toLowerCase()) : [];
                                        const templateId = (finding.templateId || '').toLowerCase();
                                        const name = (finding.name || '').toLowerCase();
                                        const rawType = (finding.assetType || groupItem?.assetType || '').toLowerCase();

                                        // 1. Explicit tool category
                                        if (rawType === 'url') return 'WEB URL SCAN';
                                        if (rawType === 'vpn') return 'VPN AUDIT';
                                        if (rawType === 'hosts') return 'HOST DISCOVERY';
                                        if (rawType === 'ports') return 'PORT SCAN';
                                        if (rawType === 'dns') return 'DNS RESOLUTION';
                                        if (rawType === 'status') return 'HTTP STATUS';

                                        // 2. High-precision signature check from monitor tool outputs
                                        if (
                                            tags.includes('subfinder') || 
                                            templateId === 'subdomain-enumeration-summary' || 
                                            templateId === 'live-host-discovered' || 
                                            name.includes('subdomain enumeration')
                                        ) {
                                            return 'HOST DISCOVERY';
                                        }

                                        if (
                                            tags.includes('dnsx') || 
                                            templateId === 'dns-resolution' || 
                                            templateId === 'dns-cname-record' || 
                                            name.includes('dns resolution active') || 
                                            name.includes('cname record exposed')
                                        ) {
                                            return 'DNS RESOLUTION';
                                        }

                                        if (
                                            tags.includes('httpx') || 
                                            templateId.startsWith('http-status-') || 
                                            name.startsWith('http ')
                                        ) {
                                            return 'HTTP STATUS';
                                        }

                                        if (
                                            tags.includes('naabu') || 
                                            templateId.startsWith('open-port-') || 
                                            name.startsWith('open port detected')
                                        ) {
                                            return 'PORT SCAN';
                                        }

                                        if (rawType === 'ip' || /^(\d{1,3}\.){3}\d{1,3}/.test(groupItem?.host || '')) {
                                            return 'IP SCAN';
                                        }

                                        return 'WEB URL SCAN';
                                    };

                                    const displayType = getDisplayType(primaryFinding, group);
                                    const typeCode = displayType.includes('HOST') ? 'HOST' :
                                                     displayType.includes('PORT') ? 'PORT' :
                                                     displayType.includes('DNS') ? 'DNSX' :
                                                     displayType.includes('HTTP') ? 'HTTP' :
                                                     displayType.includes('VPN') ? 'VPNS' :
                                                     displayType.includes('IP') ? 'IPSC' : 'DOMN';

                                    const dateStr = (primaryFinding.timestamp ? new Date(primaryFinding.timestamp) : new Date()).toLocaleDateString('en-GB').replace(/\//g, '');
                                    const prefix = (user?.company || user?.name || 'CYBR').substring(0, 4).toUpperCase().padEnd(4, 'A');
                                    const incidentId = `${prefix}-${typeCode}-${dateStr}-${String(globalIndex + 1).padStart(4, '0')}`;

                                    return (
                                        <tr key={group.key || group.id || `${group.host}_${displayType}_${globalIndex}`} className="border-b border-white/5 bg-[#12162a]/30 hover:bg-[#161b33] transition-colors group-row">
                                            <td className="px-5 py-4 whitespace-nowrap font-mono text-slate-300">
                                                {incidentId}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                                    {group.host}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-slate-200 font-mono font-bold tracking-wider text-[11px] uppercase">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    displayType.includes('HOST') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                                                    displayType.includes('PORT') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                                    displayType.includes('DNS') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                                                    displayType.includes('HTTP') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                                                    displayType.includes('VPN') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                                                    displayType.includes('IP') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                                                    'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                                }`}>
                                                    {displayType}
                                                </span>
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
                                                    <button onClick={() => setSelectedAssetHost(group.key || group.id || group.host)} className="bg-[#2d1b4e] hover:bg-[#3a2365] text-purple-200 border border-purple-500/20 rounded-lg px-4 py-2 transition-colors text-[10px] font-bold tracking-wider uppercase cursor-pointer">
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

                {/* PAGINATION CONTROLS */}
                {filteredGroups.length > 0 && (
                    <div className="px-5 py-4 border-t border-white/5 bg-[#101423]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                            <span>
                                Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-white">{Math.min(currentPage * pageSize, filteredGroups.length)}</strong> of <strong className="text-white">{filteredGroups.length}</strong> incident targets
                            </span>
                            <span className="text-slate-600">|</span>
                            <label className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span>Per page:</span>
                                <select 
                                    value={pageSize} 
                                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    className="bg-[#131729] border border-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 rounded bg-[#131729] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 text-slate-300 font-mono text-xs"
                                title="First page"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-[#131729] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 text-slate-300 text-xs font-medium"
                            >
                                Prev
                            </button>
                            
                            <span className="px-3 py-1 text-xs font-mono text-slate-300">
                                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                            </span>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded bg-[#131729] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 text-slate-300 text-xs font-medium"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1 rounded bg-[#131729] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 text-slate-300 font-mono text-xs"
                                title="Last page"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
