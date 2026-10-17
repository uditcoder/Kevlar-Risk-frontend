import React from 'react';
import { useAppContext } from '../context/AppContext';
import TokenBadge from '../components/TokenBadge';

export default function ScannerVPN() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token, updateTokens, refreshScans } = useAppContext();

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        setIsScanning(true);
        setScanStatus({ hidden: false, text: 'Initializing engine...', type: 'info' });

        const target = document.getElementById('targetInput-vpn')?.value;
        if (!target) {
            setScanStatus({ hidden: false, text: 'Target required', type: 'error' });
            setIsScanning(false);
            return;
        }

        const titleEl = document.getElementById('scanPopupTitle');
        if (titleEl) titleEl.innerText = 'Auditing VPN Gateway';
        const subEl = document.getElementById('scanPopupSubtitle');
        if (subEl) subEl.innerText = 'Analyzing perimeter gateway security...';
        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        setTimeout(async () => {
            try {
                const apiUrl = window.__ENV__?.API_BASE_URL;
                const res = await fetch(`${apiUrl}/api/scan-infrastructure`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ assetType: 'vpn', targetUrl: target, frequency: 'now' })
                });
                const data = await res.json();
                if (!res.ok) {
                    const msg = data.error || 'Failed to start scan';
                    setToastMessage(msg);
                    throw new Error(msg);
                }

                if (typeof data.remainingTokens === 'number') {
                    updateTokens(data.remainingTokens);
                }

                if (!data.scanId) throw new Error('No scan ID returned');

                setScanStatus({ hidden: false, text: 'Scan running in background... You will receive an email when complete.', type: 'info' });

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
                            document.getElementById('scanPopupModal')?.classList.add('hidden');

                            let toastText = '';
                            const hasIssues = scan.newFindingsCount > 0 || (!scan.isRescan && scan.rawCount > 0);
                            if (!scan.isRescan) {
                                toastText = scan.rawCount > 0
                                    ? `Results found, check Incident tab.`
                                    : `No results found.`;
                            } else {
                                if (scan.newFindingsCount > 0) {
                                    toastText = `New results found, check Incident tab.`;
                                } else {
                                    toastText = `No new results found.`;
                                }
                            }

                            setScanStatus({ hidden: false, text: toastText, type: hasIssues ? 'error' : 'success' });
                            setToastMessage(`${hasIssues ? '⚠️' : '✅'} ${toastText}`);
                            setTimeout(() => setToastMessage(null), 8000);

                            refreshScans?.();
                            setMonitoredAssets(prev => {
                                const newAsset = {
                                    target,
                                    category: 'vpn',
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
                            document.getElementById('scanPopupModal')?.classList.add('hidden');
                            setScanStatus({ hidden: false, text: 'Scan failed on server.', type: 'error' });
                        }
                    } catch { }
                }, 8000);

            } catch (e) {
                document.getElementById('scanPopupModal')?.classList.add('hidden');
                setScanStatus({ hidden: false, text: 'Scan Failed: ' + e.message, type: 'error' });
                setIsScanning(false);
            }
        }, 1000);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <form onSubmit={handleScanSubmit} className="space-y-6">
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            Target VPN Gateway Host
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-normal">e.g. vpn.yourcompany.com</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            id="targetInput-vpn"
                            placeholder="vpn.yourcompany.com"
                            className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-mono focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={isScanning}
                        className={`bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer ${
                            isScanning ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                    >
                        <span>{isScanning ? "Scanning in Background..." : "START MONITORING"}</span>
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
