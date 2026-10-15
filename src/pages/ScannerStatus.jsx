import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerStatus() {
    const { token, refreshScans } = useAppContext();
    const [targets, setTargets] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [hasScanned, setHasScanned] = useState(false);
    const [scanMeta, setScanMeta] = useState({ isRescan: false, newFindingsCount: 0 });

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults([]);
        setHasScanned(false);
        setScanMeta({ isRescan: false, newFindingsCount: 0 });

        const targetList = targets.split('\n').map(t => t.trim()).filter(Boolean);
        if (!targetList.length) {
            setError('Please enter at least one URL.');
            setLoading(false);
            return;
        }

        const titleEl = document.getElementById('scanPopupTitle');
        if (titleEl) titleEl.innerText = 'Checking Status & Title';
        const subEl = document.getElementById('scanPopupSubtitle');
        if (subEl) subEl.innerText = 'Probing endpoints & extracting page titles...';
        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targets: targetList })
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
                            setHasScanned(true);
                            document.getElementById('scanPopupModal')?.classList.add('hidden');
                            if (statusData.task.status === 'failed') {
                                setError('Background scan failed.');
                            } else {
                                const task = statusData.task;
                                setResults(task.results?.results || []);
                                setScanMeta({
                                    isRescan: !!task.isRescan,
                                    newFindingsCount: task.newFindingsCount || 0
                                });
                                refreshScans?.();
                            }
                        }
                    } catch (err) {}
                }, 5000);
            } else {
                setResults(data.results || []);
                setScanMeta({
                    isRescan: !!data.isRescan,
                    newFindingsCount: data.newFindingsCount || 0
                });
                setLoading(false);
                setHasScanned(true);
                document.getElementById('scanPopupModal')?.classList.add('hidden');
                refreshScans?.();
            }
        } catch (e) {
            setError(e.message);
            setLoading(false);
            document.getElementById('scanPopupModal')?.classList.add('hidden');
        }
    };

    const getStatusColor = (code) => {
        if (!code) return 'text-slate-400';
        if (code >= 200 && code < 300) return 'text-emerald-400';
        if (code >= 300 && code < 400) return 'text-blue-400';
        if (code >= 400 && code < 500) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Selected Monitor Type
                </div>
                <div className="p-3.5 rounded-2xl border border-cyan-500/60 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30 flex items-center gap-3.5 w-fit">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold block text-white">Status Code & Title Monitor</span>
                        <span className="text-[10px] text-slate-400 font-normal">Powered by httpx</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-cyan-400 mb-1.5">
                        Target URLs <span className="text-slate-500 font-normal">(one per line)</span>
                    </label>
                    <textarea
                        rows={5}
                        value={targets}
                        onChange={e => setTargets(e.target.value)}
                        placeholder={"https://example.com\nhttps://api.myapp.com\nhttps://admin.myapp.com"}
                        className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none placeholder:text-slate-600"
                    />
                </div>

                <div className="flex justify-end pt-3 border-t border-white/5">
                    <button type="submit" disabled={loading}
                        className={`bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2 text-xs ${loading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{loading ? 'Scanning...' : 'Run Status Monitor'}</span>
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {hasScanned && !loading && !error && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    results.length === 0
                        ? 'bg-slate-900/60 border-slate-700/50 text-slate-300'
                        : scanMeta.isRescan
                            ? (scanMeta.newFindingsCount > 0 
                                ? 'bg-red-500/10 border-red-500/40 text-red-300' 
                                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300')
                            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                }`}>
                    <div className="flex items-center gap-2">
                        <span>
                            {results.length === 0 
                                ? 'ℹ️' 
                                : scanMeta.isRescan 
                                    ? (scanMeta.newFindingsCount > 0 ? '⚠️' : '✅') 
                                    : '✅'}
                        </span>
                        <span>
                            {results.length === 0
                                ? (scanMeta.isRescan ? 'No new results found.' : 'No results found.')
                                : scanMeta.isRescan
                                    ? (scanMeta.newFindingsCount > 0
                                        ? 'New results found, check Incident tab.'
                                        : 'No new results found.')
                                    : 'Results found, check Incident tab.'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
