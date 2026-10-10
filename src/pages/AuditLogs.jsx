import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function AuditLogs() {
    const { allScans, scheduledScans, token, setToastMessage, setScheduledScans } = useAppContext();
    const [isDeleting, setIsDeleting] = React.useState(null);

    const deduplicatedScans = React.useMemo(() => {
        const seen = new Set();

        // 1. Get history and sort by latest first reliably
        let list = [...(allScans || [])]
            .sort((a, b) => {
                const dateA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
                const dateB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
                return dateB - dateA;
            })
            .filter(scan => {
                if (seen.has(scan.target)) return false;
                seen.add(scan.target);
                return true;
            });

        // 2. Add any active schedules that have never run yet (no history)
        if (scheduledScans) {
            scheduledScans.forEach(schedule => {
                if (!seen.has(schedule.target)) {
                    list.push({
                        target: schedule.target,
                        assetType: schedule.assetType,
                        userEmail: schedule.userEmail,
                        userName: schedule.userName,
                        trigger: 'scheduled',
                        findings: [],
                        scannedAt: schedule.createdAt || new Date().toISOString()
                    });
                    seen.add(schedule.target);
                }
            });
        }

        // 3. Sort one final time so everything is perfectly ordered latest first
        return list.sort((a, b) => {
            const dateA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
            const dateB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [allScans, scheduledScans]);

    const handleDeleteSchedule = async (id, target) => {
        try {
            setIsDeleting(id);
            const API_BASE = (window.__ENV__?.API_BASE_URL);
            const res = await fetch(`${API_BASE}/api/scheduled-scans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
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
            setIsDeleting(null);
        }
    };

    const handleDownload = () => {
        if (!deduplicatedScans || deduplicatedScans.length === 0) return;

        // Create CSV headers
        const headers = ['User', 'Target', 'Type', 'Frequency', 'Scan Date', 'Vulnerability Name', 'Severity', 'Description'];

        const csvRows = [];
        deduplicatedScans.forEach(scan => {
            const user = scan.userEmail || scan.userName || 'Unknown';
            const target = scan.target;
            const type = scan.assetType;
            const schedule = scheduledScans?.find(s => s.target === target);
            const frequency = schedule ? schedule.frequency : (scan.trigger === 'scheduled' ? 'Scheduled' : 'Manual');
            const date = new Date(scan.scannedAt).toLocaleString();

            if (scan.findings && scan.findings.length > 0) {
                scan.findings.forEach(f => {
                    csvRows.push([
                        user, target, type, frequency, date,
                        f.name || f.info?.name || 'Unknown',
                        f.severity || f.info?.severity || 'info',
                        String(f.description || f.info?.description || '-').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
                    ]);
                });
            } else {
                csvRows.push([
                    user, target, type, frequency, date,
                    'No vulnerabilities detected', 'safe', '-'
                ]);
            }
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'cyberguard_audit_logs.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadReport = (log) => {
        const headers = ['Target', 'Vulnerability Name', 'Severity', 'Type', 'Description'];
        const csvRows = [];

        if (log.findings && log.findings.length > 0) {
            log.findings.forEach(f => {
                csvRows.push([
                    log.target,
                    f.name || f.info?.name || 'Unknown',
                    f.severity || f.info?.severity || 'info',
                    f.type || 'vulnerability',
                    String(f.description || f.info?.description || '-').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
                ]);
            });
        } else {
            csvRows.push([log.target, 'No findings detected', 'safe', '-', '-']);
        }

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const safeTarget = log.target.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute('download', `report_${safeTarget}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Audit Logs
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Review full scan execution history and download reports.</p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={!allScans || allScans.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Excel (CSV)
                </button>
            </div>

            <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-4 px-6">User</th>
                                <th className="py-4 px-6">Target</th>
                                <th className="py-4 px-6">Type</th>
                                <th className="py-4 px-6">Frequency</th>
                                <th className="py-4 px-6">Findings</th>
                                <th className="py-4 px-6">Date</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {!deduplicatedScans || deduplicatedScans.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                deduplicatedScans.map((log, i) => {
                                    const schedule = scheduledScans?.find(s => s.target === log.target);
                                    const frequencyText = schedule ? schedule.frequency : (log.trigger === 'scheduled' ? 'Scheduled' : 'Manual');
                                    const isScheduled = !!schedule;

                                    return (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                            <td className="py-4 px-6">{log.userEmail || log.userName || 'Unknown'}</td>
                                            <td className="py-4 px-6 font-mono text-white">{log.target}</td>
                                            <td className="py-4 px-6 uppercase font-bold text-slate-400">{log.assetType}</td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] border ${isScheduled ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                    {frequencyText}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${log.findings?.length > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {log.findings?.length || 0} issues
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-400 font-mono">
                                                {new Date(log.scannedAt).toLocaleDateString()} {new Date(log.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleDownloadReport(log)}
                                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md transition-all ml-auto"
                                                    title="Download Scan Report"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
