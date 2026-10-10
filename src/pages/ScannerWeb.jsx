import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function ScannerWeb() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, scheduledScans, setScheduledScans, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token } = useAppContext();
    const navigate = useNavigate();
    const [frequency, setFrequency] = useState('now'); // 'now' or 'monthly' or 'weekly'
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        setIsScanning(true);
        setScanStatus({ hidden: false, text: 'Initializing engine...', type: 'info' });
        
        const target = document.getElementById('targetInput-url')?.value;
        if (!target) {
            setScanStatus({ hidden: false, text: 'Target required', type: 'error' });
            setIsScanning(false);
            return;
        }

        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        setTimeout(async () => {
            try {
                const apiUrl = window.__ENV__?.API_BASE_URL;
                // Step 1: Queue the scan — backend responds instantly with a scanId
                const res = await fetch(`${apiUrl}/api/scan-infrastructure`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ assetType: 'url', targetUrl: target, frequency })
                });
                if (!res.ok) throw new Error('Failed to start scan');
                const data = await res.json();
                
                if (!data.scanId) throw new Error('No scan ID returned');

                if (frequency === 'monthly' || frequency === 'weekly') {
                    setScheduledScans(prev => {
                        if (prev.some(s => s.target === target && s.frequency === frequency)) {
                            return prev;
                        }
                        return [{ target, frequency, status: 'active' }, ...prev];
                    });
                }

                setScanStatus({ hidden: false, text: 'Scan running in background... You will receive an email when complete.', type: 'info' });

                // Step 2: Poll /api/scan-status/:scanId every 8 seconds
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${apiUrl}/api/scan-status/${data.scanId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!statusRes.ok) return;
                        const statusData = await statusRes.json();
                        const scan = statusData.scan;

                        if (scan?.status === 'complete') {
                            clearInterval(pollInterval);
                            setIsScanning(false);

                            let toastText = '';
                            if (!scan.isRescan) {
                                toastText = scan.rawCount > 0 
                                    ? `Results found, see findings in Incident tab` 
                                    : `No results found.`;
                            } else {
                                if (scan.newFindingsCount > 0) {
                                    toastText = `New results found, see findings in Incident tab`;
                                } else {
                                    toastText = `No new results found.`;
                                }
                            }

                            if (frequency === 'monthly') {
                                const nextMonth = new Date();
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                toastText += ` | ${target} scheduled to rescan on ${nextMonth.toLocaleDateString()}`;
                            } else if (frequency === 'weekly') {
                                const nextWeek = new Date();
                                nextWeek.setDate(nextWeek.getDate() + 7);
                                toastText += ` | ${target} scheduled to rescan on ${nextWeek.toLocaleDateString()}`;
                            }

                            setScanStatus({ hidden: false, text: toastText, type: (scan.newFindingsCount > 0 || (!scan.isRescan && scan.rawCount > 0)) ? 'error' : 'success' });
                            setToastMessage(`✅ ${toastText}`);
                            setTimeout(() => setToastMessage(null), 8000);

                            // Update global findings from real DB data
                            if (scan.findings && scan.findings.length > 0) {
                                setAllFindings(prev => [...prev, ...scan.findings]);
                            }
                            setMonitoredAssets(prev => {
                                const newAsset = {
                                    target,
                                    category: 'url',
                                    status: scan.rawCount > 0 ? 'issue_found' : 'safe',
                                    severity: scan.findings[0]?.severity || 'info',
                                    portsDetected: scan.ports || [],
                                    lastScanned: new Date().toLocaleTimeString()
                                };
                                if (prev.some(a => a.target === target)) {
                                    return prev.map(a => a.target === target ? newAsset : a);
                                }
                                return [...prev, newAsset];
                            });
                        } else if (scan?.status === 'failed') {
                            clearInterval(pollInterval);
                            setIsScanning(false);
                            setScanStatus({ hidden: false, text: 'Scan failed on server.', type: 'error' });
                        }
                    } catch {}
                }, 8000);
                
            } catch(e) {
                setScanStatus({ hidden: false, text: 'Scan Failed: ' + e.message, type: 'error' });
                setIsScanning(false);
            }
        }, 1000);
    };

    const handleDeleteSchedule = async (id, target) => {
        try {
            const API_BASE = (window.__ENV__?.API_BASE_URL);
            const res = await fetch(`${API_BASE}/api/scheduled-scans/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                setScheduledScans(prev => prev.filter(s => s._id !== id));
                setToastMessage(`Schedule for ${target} deleted successfully`);
                setTimeout(() => setToastMessage(null), 5000);
            } else {
                throw new Error('Failed to delete schedule');
            }
        } catch (err) {
            setToastMessage(`❌ Error: ${err.message}`);
            setTimeout(() => setToastMessage(null), 5000);
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <>
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Selected Asset Surface Category
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 border-blue-500/60 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                        </div>
                        <div className="text-left">
                            <span className="text-xs font-bold block text-white">Web URL / Domain</span>
                            <span className="text-[10px] text-slate-400 font-normal">SaaS / Web App / API</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Monitoring Frequency
                </div>
                <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
                    <button 
                        type="button" 
                        onClick={() => {
                            setFrequency('now');
                            const el = document.getElementById('targetInput-url');
                            if(el) el.value = '';
                            setScanStatus({ hidden: true, text: '', type: '' });
                        }}
                        className={`p-3 rounded-xl border font-bold text-xs transition-all flex-1 flex justify-center items-center ${frequency === 'now' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-[#12162a] text-slate-400 border-white/10 hover:border-white/20'}`}
                    >
                        Check Now
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            setFrequency('weekly');
                            const el = document.getElementById('targetInput-url');
                            if(el) el.value = '';
                            setScanStatus({ hidden: true, text: '', type: '' });
                        }}
                        className={`p-3 rounded-xl border font-bold text-xs transition-all flex-1 flex justify-center items-center ${frequency === 'weekly' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-[#12162a] text-slate-400 border-white/10 hover:border-white/20'}`}
                    >
                        Weekly
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            setFrequency('monthly');
                            const el = document.getElementById('targetInput-url');
                            if(el) el.value = '';
                            setScanStatus({ hidden: true, text: '', type: '' });
                        }}
                        className={`p-3 rounded-xl border font-bold text-xs transition-all flex-1 flex justify-center items-center ${frequency === 'monthly' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-[#12162a] text-slate-400 border-white/10 hover:border-white/20'}`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-4 pt-6">
                <div className="space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-blue-400 mb-1.5 flex items-center justify-between">
                                <span>3. Target Web URL / Domain</span>
                                <span className="text-[10px] text-slate-500 font-mono font-normal">e.g. http://scanme.nmap.org</span>
                            </label>
                            <input type="text" id="targetInput-url" placeholder="http://scanme.nmap.org"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-3 border-t border-white/5">
                    <button type="submit" disabled={isScanning}
                        className={`bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 text-xs ${isScanning ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{isScanning ? "Scanning in Background..." : "START MONITORING"}</span>
                        <svg className={`w-4 h-4 text-white ${isScanning ? 'animate-spin' : 'hidden'}`} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </button>
                </div>
            </form>

            {(frequency === 'monthly' || frequency === 'weekly') && (
                <div className="pt-8 border-t border-white/5 mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">ACTIVE DOMAIN SCAN SCANS</h3>
                        </div>
                        <div className="px-3 py-1.5 bg-[#12162a] border border-white/10 rounded-lg text-[10px] text-slate-400 font-bold uppercase">
                            {scheduledScans.filter(s => s.frequency === frequency).length} PROTECTED DOMAIN SCAN
                        </div>
                    </div>

                    <div className="w-full text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 grid grid-cols-5 px-6 gap-4">
                        <div>TARGET</div>
                        <div>FREQUENCY</div>
                        <div>STATUS</div>
                        <div>NEXT SCAN</div>
                        <div>ACTION</div>
                    </div>

                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-inner min-h-[140px] flex items-center justify-center">
                        {scheduledScans.filter(s => s.frequency === frequency).length === 0 ? (
                            <span className="text-xs font-bold text-slate-500 italic uppercase tracking-wider">
                                NO ACTIVE MONITORS FOUND FOR THIS FREQUENCY.
                            </span>
                        ) : (
                            <div className="w-full divide-y divide-white/5 self-start">
                                {scheduledScans.filter(s => s.frequency === frequency).map((asset, i) => (
                                    <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 text-xs text-slate-300 items-center hover:bg-white/[0.02] transition-colors">
                                        <div className="font-mono text-white truncate">{asset.target}</div>
                                        <div className="uppercase text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-max">{asset.frequency || 'Monthly'}</div>
                                        <div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${asset.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {asset.status === 'active' ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                        <div className="font-mono text-slate-400 truncate" title={asset.nextRunAt ? new Date(asset.nextRunAt).toLocaleString() : '-'}>
                                            {asset.nextRunAt ? new Date(asset.nextRunAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setDeleteConfirmation({ id: asset._id, target: asset.target })}
                                                className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold px-3 py-1 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>

            {deleteConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b0d14] border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 mt-20 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-bold">Delete Schedule</h3>
                        </div>
                        <p className="text-sm text-slate-300 mb-6">
                            Are you sure you want to delete the scheduled scan for <span className="font-mono text-white">{deleteConfirmation.target}</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleDeleteSchedule(deleteConfirmation.id, deleteConfirmation.target)}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-colors"
                            >
                                Yes, Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
