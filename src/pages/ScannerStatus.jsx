import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import TokenBadge from '../components/TokenBadge';

export default function ScannerStatus() {
    const { token, refreshScans, setToastMessage, updateTokens } = useAppContext();
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
                                setResults(task.results?.results || []);
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
            <form onSubmit={handleScan} className="space-y-6">
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            Target URLs
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-normal">one per line</span>
                    </label>
                    <textarea
                        rows={4}
                        value={targets}
                        onChange={e => setTargets(e.target.value)}
                        placeholder={"https://example.com\nhttps://api.myapp.com"}
                        className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl p-3.5 text-xs font-mono focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none placeholder:text-slate-600 shadow-inner"
                    />
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

            {hasScanned && !loading && !error && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${results.length === 0
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
