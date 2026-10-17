import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import TokenBadge from '../components/TokenBadge';

export default function ScannerIP() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token, updateTokens, refreshScans } = useAppContext();
    const [ipFields, setIpFields] = useState([{ id: 1, ip: '', range: '' }]);

    const addField = () => {
        if (ipFields.length < 5) {
            setIpFields([...ipFields, { id: Date.now(), ip: '', range: '' }]);
        }
    };

    const removeField = (id) => {
        setIpFields(ipFields.filter(field => field.id !== id));
    };

    const updateField = (id, key, value) => {
        setIpFields(ipFields.map(field => field.id === id ? { ...field, [key]: value } : field));
    };

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        setIsScanning(true);
        setScanStatus({ hidden: false, text: 'Initializing engine...', type: 'info' });

        const targets = ipFields
            .map(f => f.ip ? (f.range ? `${f.ip}${f.range.startsWith('/') ? f.range : '-' + f.range}` : f.ip) : null)
            .filter(Boolean);

        if (targets.length === 0) {
            setScanStatus({ hidden: false, text: 'At least one target required', type: 'error' });
            setIsScanning(false);
            return;
        }

        const titleEl = document.getElementById('scanPopupTitle');
        if (titleEl) titleEl.innerText = 'Scanning Target IP';
        const subEl = document.getElementById('scanPopupSubtitle');
        if (subEl) subEl.innerText = 'Analyzing network perimeter & vulnerabilities...';
        document.getElementById('scanPopupModal')?.classList.remove('hidden');

        setTimeout(async () => {
            try {
                setScanStatus({ hidden: false, text: 'Scans running in background... You will receive emails when complete.', type: 'info' });

                const scanPromises = targets.map(async (t) => {
                    const apiUrl = window.__ENV__?.API_BASE_URL;
                    const res = await fetch(`${apiUrl}/api/scan-infrastructure`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ assetType: 'ip', targetUrl: t, frequency: 'now' })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        const msg = data.error || `Scan failed for ${t}`;
                        setToastMessage(msg);
                        throw new Error(msg);
                    }

                    if (typeof data.remainingTokens === 'number') {
                        updateTokens(data.remainingTokens);
                    }

                    if (!data.scanId) throw new Error('No scan ID returned');

                    return new Promise((resolve) => {
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

                                    let toastText = '';
                                    const hasTargetIssues = scan.newFindingsCount > 0 || (!scan.isRescan && scan.rawCount > 0);
                                    if (!scan.isRescan) {
                                        toastText = scan.rawCount > 0
                                            ? `Results found, check Incident tab for ${t}`
                                            : `No results found for ${t}.`;
                                    } else {
                                        if (scan.newFindingsCount > 0) {
                                            toastText = `New results found, check Incident tab for ${t}`;
                                        } else {
                                            toastText = `No new results found for ${t}.`;
                                        }
                                    }

                                    setToastMessage(`${hasTargetIssues ? '⚠️' : '✅'} ${toastText}`);
                                    setTimeout(() => setToastMessage(null), 8000);

                                    if (scan.findings && scan.findings.length > 0) {
                                        setAllFindings(prev => [...prev, ...scan.findings]);
                                    }
                                    setMonitoredAssets(prev => {
                                        const newAsset = {
                                            target: t,
                                            category: 'ip',
                                            status: scan.rawCount > 0 ? 'issue_found' : 'safe',
                                            severity: scan.findings[0]?.severity || 'info',
                                            portsDetected: scan.ports || [],
                                            lastScanned: new Date().toLocaleTimeString()
                                        };
                                        if (prev.some(a => a.target === t)) {
                                            return prev.map(a => a.target === t ? newAsset : a);
                                        }
                                        return [...prev, newAsset];
                                    });
                                    resolve({
                                        findingsCount: scan.rawCount || (scan.findings?.length || 0),
                                        newFindingsCount: scan.newFindingsCount || 0,
                                        isRescan: !!scan.isRescan
                                    });
                                } else if (scan?.status === 'failed') {
                                    clearInterval(pollInterval);
                                    setToastMessage(`❌ Scan failed on server for ${t}`);
                                    setTimeout(() => setToastMessage(null), 8000);
                                    resolve({ findingsCount: 0, newFindingsCount: 0, isRescan: false });
                                }
                            } catch { }
                        }, 8000);
                    });
                });

                Promise.all(scanPromises).then((results) => {
                    const totalFindings = results.reduce((acc, r) => acc + (r?.findingsCount || 0), 0);
                    const totalNewFindings = results.reduce((acc, r) => acc + (r?.newFindingsCount || 0), 0);
                    const hasRescan = results.some(r => r?.isRescan);

                    let statusText = '';
                    let hasIssues = false;

                    if (!hasRescan) {
                        if (totalFindings > 0) {
                            statusText = 'Results found, check Incident tab.';
                            hasIssues = true;
                        } else {
                            statusText = 'No results found.';
                            hasIssues = false;
                        }
                    } else {
                        if (totalNewFindings > 0) {
                            statusText = 'New results found, check Incident tab.';
                            hasIssues = true;
                        } else {
                            statusText = 'No new results found.';
                            hasIssues = false;
                        }
                    }

                    refreshScans?.();
                    setScanStatus({ hidden: false, text: statusText, type: hasIssues ? 'error' : 'success' });
                }).finally(() => {
                    setIsScanning(false);
                    document.getElementById('scanPopupModal')?.classList.add('hidden');
                });

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
                <div className="space-y-3">
                    {ipFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        IP Address {index + 1} {index === 0 ? '(Required)' : '(Optional)'}
                                    </span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="e.g. 198.51.100.1"
                                        required={index === 0}
                                        value={field.ip}
                                        onChange={(e) => updateField(field.id, 'ip', e.target.value)}
                                        className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="block text-xs font-semibold text-slate-300 tracking-wide flex items-center justify-between">
                                    <span>Range / End IP (Optional)</span>
                                    {index === 0 && ipFields.length < 5 && (
                                        <button
                                            type="button"
                                            onClick={addField}
                                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            + Add Another IP
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1-20 or /28"
                                    value={field.range}
                                    onChange={(e) => updateField(field.id, 'range', e.target.value)}
                                    className="w-full bg-[#111424]/90 border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                                />

                                {index > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => removeField(field.id)}
                                        className="absolute right-0 top-0 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
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
