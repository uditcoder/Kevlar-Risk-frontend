import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerPorts() {
    const { token } = useAppContext();
    const [target, setTarget] = useState('');
    const [topPorts, setTopPorts] = useState('100');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);

        if (!target.trim()) {
            setError('Please enter a target host or IP.');
            setLoading(false);
            return;
        }

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/ports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ target: target.trim(), topPorts })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Scan failed');
            
            if (data.queued && data.taskId) {
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${apiUrl}/api/monitor-status/${data.taskId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!statusRes.ok) return;
                        const statusData = await statusRes.json();
                        
                        if (statusData.task?.status === 'complete' || statusData.task?.status === 'failed') {
                            clearInterval(pollInterval);
                            setLoading(false);
                            if (statusData.task.status === 'failed') {
                                setError('Background scan failed.');
                            } else {
                                setResults(statusData.task.results || null);
                            }
                        }
                    } catch (err) {}
                }, 5000);
            } else {
                setResults(data);
                setLoading(false);
            }
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    };

    const getPortRiskColor = (port) => {
        const highRisk = [21, 22, 23, 25, 53, 135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017];
        const medRisk = [80, 8080, 8443, 8888, 9200, 5000, 7001];
        if (highRisk.includes(port)) return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (medRisk.includes(port)) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Selected Monitor Type
                </div>
                <div className="p-3.5 rounded-2xl border border-orange-500/60 bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30 flex items-center gap-3.5 w-fit">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold block text-white">Port Scanner</span>
                        <span className="text-[10px] text-slate-400 font-normal">Powered by naabu</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-orange-400 mb-1.5">Target Host / IP Address</label>
                        <input
                            type="text"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            placeholder="e.g. scanme.nmap.org or 192.168.1.1"
                            className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Top Ports to Scan</label>
                        <select
                            value={topPorts}
                            onChange={e => setTopPorts(e.target.value)}
                            className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
                        >
                            <option value="100">Top 100</option>
                            <option value="1000">Top 1000</option>
                            <option value="full">All 65535</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-white/5">
                    <button type="submit" disabled={loading}
                        className={`bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center gap-2 text-xs ${loading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{loading ? 'Scanning Ports...' : 'Run Port Scan'}</span>
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {results && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">{results.ports?.length || 0} Open Port(s) on {results.target}</div>
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/> High Risk</span>
                            <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/> Medium Risk</span>
                            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Standard</span>
                        </div>
                    </div>
                    {results.ports?.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-xs bg-[#101423]/50 rounded-2xl border border-dashed border-white/10">No open ports detected.</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {results.ports?.map((p, i) => (
                                <span key={i} className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${getPortRiskColor(p.port)}`}>
                                    {p.port}/{p.protocol}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
