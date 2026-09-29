import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Dashboard() {
    const { monitoredAssets, allFindings, setMonitoredAssets, setAllFindings, token } = useAppContext();
    
    // Global scan fetching has been moved to AppContext to ensure data persists across all pages

    const criticalHighCount = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
    
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="glass-card p-5 space-y-3 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">Critical & High Risks</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                            <span>{criticalHighCount}</span>
                            <span className="text-xs font-bold text-red-400 mono">Urgent</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Exploitable CVEs & Misconfigs</div>
                    </div>
                    <div className="h-10 w-full pt-1">
                        <svg className="w-full h-full sparkline-svg" viewBox="0 0 200 40" fill="none">
                            <path d="M0 32 Q 30 35, 60 25 T 120 18 T 170 8 T 200 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-3 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">Active Perimeter</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                            <span>{monitoredAssets.length}</span>
                            <span className="text-xs font-bold text-indigo-400 mono">Enrolled</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Domains, Gateways & Bastions</div>
                    </div>
                    <div className="h-10 w-full pt-1">
                        <svg className="w-full h-full sparkline-svg" viewBox="0 0 200 40" fill="none">
                            <path d="M0 28 Q 40 10, 80 22 T 140 12 T 200 4" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-3 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">Total Findings</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                            <span>{allFindings.length}</span>
                            <span className="text-xs font-bold text-emerald-400 mono">Audited</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Low, Med & Info Headers</div>
                    </div>
                    <div className="h-10 w-full pt-1">
                        <svg className="w-full h-full sparkline-svg" viewBox="0 0 200 40" fill="none">
                            <path d="M0 35 Q 50 38, 90 20 T 150 15 T 200 8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>

                <div className="promo-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                            Continuous Cadence
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase">
                            14-Day Cycle
                        </span>
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                            Automated Attack Surface Sweeps
                        </h3>
                        <p className="text-[11px] text-purple-200/70 mt-1 leading-relaxed">
                            Continuous Security scans verify external TLS, exposed ports, and missing headers.
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 sm:p-7 space-y-4" id="inventorySection">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                            Monitored Attack Surface Inventory
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Enrolled perimeter endpoints receiving continuous automated audits.</p>
                    </div>
                    <span className="text-xs font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg font-bold">
                        {monitoredAssets.length} Targets Enrolled
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-slate-400 font-mono text-[11px]">
                                <th className="py-3 px-3">Target Address</th>
                                <th className="py-3 px-3">Category</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Open Ports</th>
                                <th className="py-3 px-3">Last Scanned</th>
                            </tr>
                        </thead>
                        <tbody>
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
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                asset.status === 'issue_found' 
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                    asset.status === 'issue_found' ? 'bg-red-400' : 'bg-emerald-400'
                                                }`}></span>
                                                {asset.status === 'issue_found' ? 'Issue Found' : 'Active'}
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
