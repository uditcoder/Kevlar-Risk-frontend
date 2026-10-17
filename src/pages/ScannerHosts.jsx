import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import TokenBadge from '../components/TokenBadge';

export default function ScannerHosts() {
    const { token, refreshScans, setToastMessage, updateTokens } = useAppContext();
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [hasScanned, setHasScanned] = useState(false);
    const [scanMeta, setScanMeta] = useState({ isRescan: false, newFindingsCount: 0 });

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);
        setSearch('');
        setHasScanned(false);
        setScanMeta({ isRescan: false, newFindingsCount: 0 });

        if (!domain.trim()) {
            setError('Please enter a root domain.');
            setLoading(false);
            return;
        }

        const titleEl = document.getElementById('scanPopupTitle');
        if (titleEl) titleEl.innerText = 'Scanning Vulnerabilities';
        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/hosts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ domain: domain.trim() })
            });
            const data = await res.json();
            if (!res.ok) {
                const msg = data.error || 'Host discovery failed';
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
                    } catch (err) {}
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

    const filtered = results?.hosts?.filter(h =>
        !search || (h.host || h).toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <form onSubmit={handleScan} className="space-y-6">
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Root Domain
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-normal">e.g. google.com</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder="google.com"
                            className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                        />
                    </div>
                    <p className="text-[11px] text-slate-500">Discovers all subdomains using passive intelligence sources. No active probing.</p>
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
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {hasScanned && !loading && !error && results && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    results.count === 0
                        ? 'bg-slate-900/60 border-slate-700/50 text-slate-300'
                        : scanMeta.isRescan
                            ? (scanMeta.newFindingsCount > 0 
                                ? 'bg-red-500/10 border-red-500/40 text-red-300' 
                                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300')
                            : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                }`}>
                    <div className="flex items-center gap-2">
                        <span>
                            {results.count === 0
                                ? 'ℹ️'
                                : scanMeta.isRescan 
                                    ? (scanMeta.newFindingsCount > 0 ? '⚠️' : '✅') 
                                    : '✅'}
                        </span>
                        <span>
                            {results.count === 0
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
