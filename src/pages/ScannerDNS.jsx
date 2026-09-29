import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerDNS() {
    const { token } = useAppContext();
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);

        if (!domain.trim()) {
            setError('Please enter a domain name.');
            setLoading(false);
            return;
        }

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/monitor/dns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ domain: domain.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'DNS scan failed');
            
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

    const recordTypes = ['a', 'aaaa', 'cname', 'mx', 'ns', 'txt'];
    const typeColors = {
        a: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        aaaa: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        cname: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        mx: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        ns: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        txt: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Selected Monitor Type
                </div>
                <div className="p-3.5 rounded-2xl border border-purple-500/60 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30 flex items-center gap-3.5 w-fit">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/></svg>
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold block text-white">CNAME & DNS Record Resolver</span>
                        <span className="text-[10px] text-slate-400 font-normal">Powered by dnsx — detects Subdomain Takeovers</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-purple-400 mb-1.5">Target Domain</label>
                    <input
                        type="text"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        placeholder="e.g. example.com"
                        className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                </div>
                <div className="flex justify-end pt-3 border-t border-white/5">
                    <button type="submit" disabled={loading}
                        className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 text-xs ${loading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{loading ? 'Resolving DNS...' : 'Resolve DNS Records'}</span>
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-semibold">{error}</div>
            )}

            {results && (
                <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">{results.records?.length || 0} DNS Record(s) for {results.domain}</div>
                    {results.records?.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-xs bg-[#101423]/50 rounded-2xl border border-dashed border-white/10">No DNS records found.</div>
                    ) : (
                        <div className="space-y-2">
                            {results.records?.map((r, i) => (
                                <div key={i} className="bg-[#111424] rounded-xl border border-white/5 p-3.5 space-y-2">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="font-mono text-xs text-white font-bold">{r.host}</span>
                                        {recordTypes.filter(t => r[t]).map(t => (
                                            <span key={t} className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${typeColors[t] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>{t}</span>
                                        ))}
                                        {r.cname && <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded font-semibold">⚠ Check Takeover Risk</span>}
                                    </div>
                                    <div className="space-y-1 text-[11px] font-mono text-slate-400">
                                        {r.a && r.a.map((v, j) => <div key={j}><span className="text-blue-400 font-semibold">A </span>{v}</div>)}
                                        {r.cname && r.cname.map((v, j) => <div key={j}><span className="text-purple-400 font-semibold">CNAME </span>{v}</div>)}
                                        {r.mx && r.mx.map((v, j) => <div key={j}><span className="text-emerald-400 font-semibold">MX </span>{v}</div>)}
                                        {r.ns && r.ns.map((v, j) => <div key={j}><span className="text-amber-400 font-semibold">NS </span>{v}</div>)}
                                        {r.txt && r.txt.map((v, j) => <div key={j} className="break-all"><span className="text-slate-300 font-semibold">TXT </span>{v}</div>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
