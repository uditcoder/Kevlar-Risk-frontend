import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerIP() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token } = useAppContext();

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        setIsScanning(true);
        setScanStatus({ hidden: false, text: 'Initializing engine...', type: 'info' });
        
        const target1 = document.getElementById('targetInput-ip-1')?.value;
        const range1 = document.getElementById('targetInput-range-1')?.value;
        const t1 = target1 ? (range1 ? `${target1}${range1.startsWith('/') ? range1 : '-' + range1}` : target1) : null;

        const target2 = document.getElementById('targetInput-ip-2')?.value;
        const range2 = document.getElementById('targetInput-range-2')?.value;
        const t2 = target2 ? (range2 ? `${target2}${range2.startsWith('/') ? range2 : '-' + range2}` : target2) : null;

        const target3 = document.getElementById('targetInput-ip-3')?.value;
        const range3 = document.getElementById('targetInput-range-3')?.value;
        const t3 = target3 ? (range3 ? `${target3}${range3.startsWith('/') ? range3 : '-' + range3}` : target3) : null;
        
        const targets = [t1, t2, t3].filter(Boolean);
        const target = targets.join(', ');

        if (targets.length === 0) {
            setScanStatus({ hidden: false, text: 'At least one target required', type: 'error' });
            setIsScanning(false);
            return;
        }

        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        setTimeout(async () => {
            try {
                const scanPromises = targets.map(async (t) => {
                    const apiUrl = window.__ENV__?.API_BASE_URL;
                    const res = await fetch(`${apiUrl}/api/scan-infrastructure`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ assetType: 'ip', targetUrl: t })
                    });
                    if (!res.ok) throw new Error(`Scan failed for ${t}`);
                    return await res.json();
                });

                const results = await Promise.all(scanPromises);
                
                let successCount = 0;
                results.forEach((data, index) => {
                    const t = targets[index];
                    if (data.summary) setScanResult(data.summary);
                    
                    setMonitoredAssets(prev => {
                        const newAsset = {
                            target: data.asset ? data.asset.target : t,
                            category: data.asset ? data.asset.type : 'ip',
                            status: data.asset && data.asset.status === 'issue_found' ? 'issue_found' : 'active',
                            ports: data.asset ? data.asset.portsDetected || [] : [],
                            label: data.asset ? data.asset.label : undefined,
                            lastScanned: new Date().toLocaleTimeString()
                        };
                        if (prev.some(a => a.target === t)) {
                            return prev.map(a => a.target === t ? newAsset : a);
                        }
                        return [...prev, newAsset];
                    });
                    
                    if (data.discoveredFindings && data.discoveredFindings.length > 0) {
                        setAllFindings(prev => [...prev, ...data.discoveredFindings]);
                    } else if (data.finding) {
                        setAllFindings(prev => [...prev, data.finding]);
                    }
                    successCount++;
                });

                setScanStatus({ hidden: false, text: `Scan Complete (${successCount} targets)`, type: 'success' });
                setToastMessage(`Scan Complete (${successCount} targets)!`);
                setTimeout(() => setToastMessage(null), 5000);
                
            } catch(e) {
                setScanStatus({ hidden: false, text: 'Scan Failed: ' + e.message, type: 'error' });
            } finally {
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
                    <div className="p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 border-emerald-500/60 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
                        </div>
                        <div className="text-left">
                            <span className="text-xs font-bold block text-white">Public IP</span>
                            <span className="text-[10px] text-slate-400 font-normal">IPv4 Ingress / Cloud Bastion</span>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center justify-between">
                                <span>IP Address 1 (Required)</span>
                            </label>
                            <input type="text" id="targetInput-ip-1" placeholder="e.g. 198.51.100.1"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                                <span>Range / End IP 1 (Optional)</span>
                            </label>
                            <input type="text" id="targetInput-range-1" placeholder="e.g. 198.51.100.20 or 1-20 or /28"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center justify-between">
                                <span>IP Address 2 (Optional)</span>
                            </label>
                            <input type="text" id="targetInput-ip-2" placeholder="e.g. 45.33.32.156"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                                <span>Range / End IP 2 (Optional)</span>
                            </label>
                            <input type="text" id="targetInput-range-2" placeholder="e.g. 198.51.100.20 or 1-20 or /28"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center justify-between">
                                <span>IP Address 3 (Optional)</span>
                            </label>
                            <input type="text" id="targetInput-ip-3" placeholder="e.g. 10.0.0.1"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                                <span>Range / End IP 3 (Optional)</span>
                            </label>
                            <input type="text" id="targetInput-range-3" placeholder="e.g. 198.51.100.20 or 1-20 or /28"
                                className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/5">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 hover:text-white transition-colors">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500" />
                        <span>Schedule recurring bi-weekly audit sweep</span>
                    </label>

                    <button type="submit" disabled={isScanning}
                        className={`bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-7 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 text-xs ${isScanning ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>{isScanning ? "Running Live Security Scan (5-15s)..." : "Scan & Add to Surface"}</span>
                        <svg className={`w-4 h-4 spinner text-white ${isScanning ? '' : 'hidden'}`} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
