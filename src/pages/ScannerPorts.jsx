import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import TokenBadge from '../components/TokenBadge';

export default function ScannerPorts() {
    const { token, refreshScans, setToastMessage, updateTokens } = useAppContext();
    const [target, setTarget] = useState('');
    const [topPorts, setTopPorts] = useState('100');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [hasScanned, setHasScanned] = useState(false);
    const [scanMeta, setScanMeta] = useState({ isRescan: false, newFindingsCount: 0 });

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);
        setHasScanned(false);
        setScanMeta({ isRescan: false, newFindingsCount: 0 });

        if (!target.trim()) {
            setError('Please enter a target host or IP.');
            setLoading(false);
            return;
        }

        const titleEl = document.getElementById('scanPopupTitle');
        if (titleEl) titleEl.innerText = 'Scanning Network Ports';
        const subEl = document.getElementById('scanPopupSubtitle');
        if (subEl) subEl.innerText = 'Probing network endpoints & detecting open ports...';
        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/ports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ target: target.trim(), topPorts })
            });
            const data = await res.json();
            if (!res.ok) {
                const msg = data.error || 'Scan failed';
                setToastMessage(msg);
                throw new Error(msg);
            }

            if (typeof data.remainingTokens === 'number') {
                updateTokens(data.remainingTokens);
            }

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
                                setResults(task.results || null);
                                setScanMeta({
                                    isRescan: !!task.isRescan,
                                    newFindingsCount: task.newFindingsCount || 0
                                });
                                refreshScans?.();
                            }
                        }
                    } catch (err) { }
                }, 5000);
            } else {
                setResults(data);
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

    const getPortRiskColor = (port) => {
        const highRisk = [21, 22, 23, 25, 53, 135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017];
        const medRisk = [80, 8080, 8443, 8888, 9200, 5000, 7001];
        if (highRisk.includes(port)) return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (medRisk.includes(port)) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <form onSubmit={handleScan} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2.5">
                        <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                Target Host / IP Address
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono font-normal">e.g. scanme.nmap.org</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                placeholder="scanme.nmap.org or 192.168.1.1"
                                className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-mono focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Top Ports to Scan
                        </label>
                        <select
                            value={topPorts}
                            onChange={e => setTopPorts(e.target.value)}
                            className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="100">Top 100 Ports</option>
                            <option value="1000">Top 1000 Ports</option>
                            <option value="full">All 65535 Ports</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer ${
                            loading ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                    >
                        <span>{loading ? 'Scanning in Background...' : 'START MONITORING'}</span>
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {hasScanned && !loading && !error && results && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${results.ports?.length === 0
                        ? 'bg-slate-900/60 border-slate-700/50 text-slate-300'
                        : scanMeta.isRescan
                            ? (scanMeta.newFindingsCount > 0
                                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300')
                            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>
                            {results.ports?.length === 0
                                ? 'ℹ️'
                                : scanMeta.isRescan
                                    ? (scanMeta.newFindingsCount > 0 ? '⚠️' : '✅')
                                    : '✅'}
                        </span>
                        <span>
                            {results.ports?.length === 0
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
