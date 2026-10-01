import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ScannerIP() {
    const { isScanning, setIsScanning, scanStatus, setScanStatus, setScanResult, monitoredAssets, setMonitoredAssets, setAllFindings, setToastMessage, token } = useAppContext();
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
                    {ipFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 relative border-b border-white/5 pb-3">
                            <div>
                                <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center justify-between">
                                    <span>IP Address {index + 1} {index === 0 ? '(Required)' : '(Optional)'}</span>
                                </label>
                                <input type="text" placeholder="e.g. 198.51.100.1" required={index === 0}
                                    value={field.ip} onChange={(e) => updateField(field.id, 'ip', e.target.value)}
                                    className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                                    <span>Range / End IP {index + 1} (Optional)</span>
                                    {index === 0 && ipFields.length < 5 && (
                                        <button type="button" onClick={addField} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                            Add IP
                                        </button>
                                    )}
                                </label>
                                <input type="text" placeholder="e.g. 1-20 or /28"
                                    value={field.range} onChange={(e) => updateField(field.id, 'range', e.target.value)}
                                    className="w-full bg-[#111424] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all" />
                                
                                {index > 0 && (
                                    <button type="button" onClick={() => removeField(field.id)} className="absolute right-0 top-0 -mt-1 text-slate-500 hover:text-red-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {/* Add button moved to the first input row */}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-3 border-t border-white/5">
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
