import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerHosts() {
    const { token } = useAppContext();
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);
        setSearch('');

        if (!domain.trim()) {
            setError('Please enter a root domain.');
            setLoading(false);
            return;
        }

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/hosts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ domain: domain.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Host discovery failed');
            
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

    const filtered = results?.hosts?.filter(h =>
        !search || (h.host || h).toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Selected Monitor Type
                </div>
                <div className="p-3.5 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 flex items-center gap-3.5 w-fit">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold block text-white">Host & Subdomain Discovery</span>
                        <span className="text-[10px] text-slate-400 font-normal">Powered by subfinder — passive recon</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-emerald-400 mb-1.5">Root Domain</label>
                    <input
                        type="text"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        placeholder="e.g. google.com"
                        className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Discovers all subdomains using passive intelligence sources. No active probing.</p>
                </div>
                <div className="flex justify-end pt-3 border-t border-white/5">
                    <button type="submit" disabled={loading}
                        className={`bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 text-xs ${loading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{loading ? 'Discovering Hosts...' : 'Discover Hosts'}</span>
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {results && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {results.count} Host(s) discovered for {results.domain}
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter hosts..."
                            className="bg-[#111424] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all w-48"
                        />
                    </div>
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-xs bg-[#101423]/50 rounded-2xl border border-dashed border-white/10">No hosts found.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                            {filtered.map((h, i) => (
                                <div key={i} className="flex items-center gap-2 bg-[#111424] rounded-lg border border-white/5 px-3 py-2 hover:border-emerald-500/30 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span className="text-xs font-mono text-slate-300 truncate">{h.host || h}</span>
                                    {h.source && <span className="ml-auto text-[9px] text-slate-500 shrink-0">{Array.isArray(h.source) ? h.source[0] : h.source}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
