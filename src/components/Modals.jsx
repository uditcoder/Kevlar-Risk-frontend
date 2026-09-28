import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Modals() {
    const { selectedAssetHost, setSelectedAssetHost, modalHighestSeverity, modalFindings, toastMessage, setToastMessage } = useAppContext();
    return (
        <>
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-[#1a1f36] border border-emerald-500/30 shadow-2xl shadow-emerald-900/20 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">{toastMessage}</h4>
                            <p className="text-xs text-slate-400">See findings in Incident Section</p>
                        </div>
                        <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white ml-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>
            )}
            <div id="scanPopupModal" className="hidden fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}}></div>
                <div className="relative w-full max-w-md bg-[#0d101d] border border-blue-500/30 p-8 rounded-2xl shadow-2xl shadow-blue-900/20 transform transition-all text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-6 relative">
                        <svg className="w-10 h-10 absolute animate-spin-slow opacity-50" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15 30"></circle>
                        </svg>
                        <svg className="w-8 h-8 relative z-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Security Scan Initiated</h3>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Our engine is currently analyzing the target infrastructure for vulnerabilities, open ports, and misconfigurations. This usually takes 5-15 seconds.
                    </p>
                    <button onClick={() => document.getElementById('scanPopupModal')?.classList.add('hidden')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium py-2.5 px-4 rounded-xl transition-colors">
                        Run in Background
                    </button>
                </div>
            </div>
            
            <div id="incidentDetailModal" className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto ${selectedAssetHost ? '' : 'hidden'}`} onClick={() => setSelectedAssetHost(null)}>
                <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d101d] border border-white/10 rounded-2xl shadow-2xl shadow-purple-950/40 overflow-hidden" onClick={e => e.stopPropagation()}>
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
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono ${
                                modalHighestSeverity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                modalHighestSeverity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                modalHighestSeverity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                modalHighestSeverity === 'low' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}>{modalHighestSeverity} RISK</span>
                            <button onClick={() => setSelectedAssetHost(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200 text-xs">
                        {modalFindings.map((finding, idx) => (
                            <div key={idx} className="bg-[#1a1423]/30 border border-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                            finding.severity === 'critical' ? 'bg-red-500' :
                                            finding.severity === 'high' ? 'bg-orange-500' :
                                            finding.severity === 'medium' ? 'bg-amber-500' :
                                            finding.severity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                                        }`}></span>
                                        <span className="font-bold text-sm text-white font-mono">{finding.name}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                        finding.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        finding.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                        finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        finding.severity === 'low' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                    }`}>{finding.severity}</span>
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
            </div>
        </>
    );
}
