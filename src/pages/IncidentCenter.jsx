import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function IncidentCenter() {
    const { allFindings, groupedFindings, setSelectedAssetHost } = useAppContext();
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass-card p-6 sm:p-7 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            Incident Center & Root-Cause Audit
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Deep inspection of discovered exposures, CVE mappings, affected ports, and compliance remediation.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#141829] hover:bg-[#1a2038] text-slate-200 border border-white/10 transition-all flex items-center gap-2 cursor-pointer">
                            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            <span>Export Audit Report (JSON)</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white">All (<span>{allFindings.length}</span>)</button>
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131729] text-slate-400 hover:text-white">Critical (<span>{allFindings.filter(f => f.severity === 'critical').length}</span>)</button>
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131729] text-slate-400 hover:text-white">High (<span>{allFindings.filter(f => f.severity === 'high').length}</span>)</button>
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131729] text-slate-400 hover:text-white">Medium (<span>{allFindings.filter(f => f.severity === 'medium').length}</span>)</button>
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131729] text-slate-400 hover:text-white">Low (<span>{allFindings.filter(f => f.severity === 'low').length}</span>)</button>
                        <button className="inc-filter-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131729] text-slate-400 hover:text-white">Safe / Info (<span>{allFindings.filter(f => f.severity === 'info' || f.severity === 'unknown').length}</span>)</button>
                    </div>

                    <div className="w-full lg:w-80">
                        <input type="text" placeholder="Filter by rule, CVE, or endpoint..." className="w-full bg-[#111424] border border-white/10 text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 font-mono placeholder:text-slate-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[9px] font-bold text-slate-300 bg-[#1a1f36] border border-white/10 uppercase tracking-widest px-2 py-1 rounded">
                                        {primaryFinding.type === 'web' || !primaryFinding.type ? 'WEB URL' : primaryFinding.type}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                                        highestSeverity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        highestSeverity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                        highestSeverity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        highestSeverity === 'low' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                        {highestSeverity} RISK
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`w-2 h-2 rounded-full ${
                                        highestSeverity === 'critical' ? 'bg-red-500' :
                                        highestSeverity === 'high' ? 'bg-orange-500' :
                                        highestSeverity === 'medium' ? 'bg-amber-500' :
                                        highestSeverity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                                    }`}></span>
                                    <h4 className="text-sm font-bold text-white tracking-wide truncate">{group.host}</h4>
                                </div>

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

                                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-5 font-mono">
                                    <div>Ports: <span className="text-slate-300">{primaryFinding.ports || '443/SSL'}</span></div>
                                    <div>{primaryFinding.timestamp ? new Date(primaryFinding.timestamp).toLocaleDateString() : 'Just now'}</div>
                                </div>

                                <div className="mt-auto">
                                    <button onClick={() => setSelectedAssetHost(group.host)} className="w-full flex items-center justify-center gap-2 bg-[#2d1b4e] hover:bg-[#3a2365] text-purple-200 border border-purple-500/20 rounded-lg py-2 transition-colors text-[11px] font-bold cursor-pointer">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="glass-card p-6 dropzone text-center cursor-pointer relative mt-8">
                <input type="file" className="hidden" />
                <div className="flex flex-col items-center justify-center space-y-2 py-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    </div>
                    <p className="text-sm font-bold text-white">Ingest Raw Findings Log</p>
                    <p className="text-[11px] text-slate-400">Drag & drop external Security JSON logs here</p>
                </div>
            </div>
        </div>
    );
}
