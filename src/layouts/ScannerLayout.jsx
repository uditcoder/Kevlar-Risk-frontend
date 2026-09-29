import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function ScannerLayout() {
    const { scanStatus, setScanStatus } = useAppContext();
    const location = useLocation();

    useEffect(() => {
        setScanStatus({ hidden: true, text: '', type: '' });
    }, [location.pathname, setScanStatus]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="glass-card p-6 sm:p-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <h2 className="text-base font-bold text-white tracking-tight">
                                Continuous Perimeter Scan & Triage
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Execute real-time Security templates against web domains, VPN portals, and ingress IPs.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-[#12162a] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                        <button type="button" className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white shadow transition-all flex items-center gap-1.5 cursor-pointer">
                            <span>⚡ Live Engine</span>
                        </button>
                        {/* <button type="button" className="px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                            <span>💡 Instant Simulation</span>
                        </button> */}
                    </div>
                </div>

                <Outlet />

                <div className={`text-xs font-semibold p-3.5 rounded-xl ${scanStatus.hidden ? 'hidden ' : ''} ${scanStatus.type === 'error' ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'}`}>
                    {scanStatus.text}
                </div>
            </div>

            <div id="scanResultCard" className="hidden glass-card p-6 border-purple-500/40 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                        <span id="resultSevBadge" className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider severity-low">LOW</span>
                        <h3 id="resultTitle" className="text-base font-bold text-white">Scan Finding Title</h3>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded-lg">Audit Completed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-[#111424] p-3.5 rounded-xl border border-white/5 space-y-1.5">
                        <div><span className="text-slate-500">Target Address:</span> <span id="resultTarget" className="text-blue-400 font-bold">scanme.nmap.org</span></div>
                        <div><span className="text-slate-500">Asset Category:</span> <span id="resultType" className="text-purple-300 uppercase font-bold">URL</span></div>
                        <div><span className="text-slate-500">Matched Endpoint:</span> <span id="resultMatched" className="text-slate-300 break-all">http://scanme.nmap.org/index</span></div>
                    </div>
                    <div className="bg-[#111424] p-3.5 rounded-xl border border-white/5 space-y-1.5">
                        <div><span className="text-slate-500">Perimeter Status:</span> <span id="resultStatus" className="text-amber-400 font-bold">Vulnerability Detected</span></div>
                        <div><span className="text-slate-500">Open Ports:</span> <span id="resultPorts" className="text-slate-300">80/HTTP</span></div>
                        <div><span className="text-slate-500">Engine Rule:</span> <span id="resultTemplate" className="text-slate-400">apache-mod-negotiation-listing</span></div>
                    </div>
                </div>

                <p id="resultDesc" className="text-xs text-slate-300 leading-relaxed"></p>

                <div id="resultRemediationBox" className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 space-y-1">
                    <strong className="text-emerald-400 block font-bold">Recommended Compliance Action:</strong>
                    <span id="resultRemediation" className="leading-relaxed">Action steps</span>
                </div>
            </div>
        </div>
    );
}
