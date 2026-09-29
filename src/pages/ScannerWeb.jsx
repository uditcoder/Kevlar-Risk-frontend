import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerWeb() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token } = useAppContext();

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
                    body: JSON.stringify({ assetType: 'url', targetUrl: target })
                });
                if (!res.ok) throw new Error('Failed to start scan');
                const data = await res.json();
                
                if (!data.scanId) throw new Error('No scan ID returned');

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
                            setScanStatus({ hidden: false, text: `Scan Complete! ${scan.rawCount} finding(s) found.`, type: 'success' });
                            setToastMessage(`✅ Scan complete for ${target}! Check Incident Center.`);
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

    return (
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

            <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-blue-400 mb-1.5 flex items-center justify-between">
                                <span>Target Web URL / Domain</span>
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
                        <span>{isScanning ? "Scanning in Background..." : "Scan & Add to Surface"}</span>
                        <svg className={`w-4 h-4 text-white ${isScanning ? 'animate-spin' : 'hidden'}`} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
