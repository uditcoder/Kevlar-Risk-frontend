import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function AuditLogs() {
    const { token, setToastMessage } = useAppContext();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedLog, setSelectedLog] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchAuditLogs = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const API_BASE = window.__ENV__?.API_BASE_URL || '';
            const res = await fetch(`${API_BASE}/api/audit-logs?limit=300`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            } else {
                throw new Error('Failed to load audit logs');
            }
        } catch (err) {
            console.error('Audit logs error:', err);
            if (setToastMessage) setToastMessage(`❌ Error loading audit logs: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [token]);

    // Summary counts
    const counts = useMemo(() => {
        const c = { total: logs.length, security: 0, monitor: 0, auth: 0, admin: 0, failed: 0 };
        logs.forEach(l => {
            const cat = (l.category || '').toUpperCase();
            if (cat === 'SECURITY') c.security++;
            else if (cat === 'MONITOR') c.monitor++;
            else if (cat === 'AUTH') c.auth++;
            else if (cat === 'ADMIN') c.admin++;
            if ((l.status || '').toUpperCase() === 'FAILED') c.failed++;
        });
        return c;
    }, [logs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Category filter
            if (selectedCategory !== 'ALL' && (log.category || '').toUpperCase() !== selectedCategory) {
                return false;
            }
            // Status filter
            if (selectedStatus !== 'ALL' && (log.status || '').toUpperCase() !== selectedStatus) {
                return false;
            }
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTarget = (log.target || '').toLowerCase().includes(q);
                const matchAction = (log.action || '').toLowerCase().includes(q);
                const matchEmail = (log.userEmail || '').toLowerCase().includes(q);
                const matchName = (log.userName || '').toLowerCase().includes(q);
                const matchDetails = (log.details || '').toLowerCase().includes(q);
                const matchIp = (log.ipAddress || '').toLowerCase().includes(q);
                if (!matchTarget && !matchAction && !matchEmail && !matchName && !matchDetails && !matchIp) {
                    return false;
                }
            }
            return true;
        });
    }, [logs, selectedCategory, selectedStatus, searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedStatus]);

    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, currentPage, pageSize]);

    // CSV Export
    const handleExportCSV = () => {
        if (!logs || logs.length === 0) return;

        const headers = ['Timestamp', 'Action', 'Category', 'Target / Resource', 'Status', 'User Name', 'User Email', 'IP Address', 'Details'];
        const csvRows = [headers.join(',')];

        filteredLogs.forEach(l => {
            const dateStr = l.timestamp ? new Date(l.timestamp).toISOString() : '-';
            const row = [
                `"${dateStr}"`,
                `"${l.action || '-'}"`,
                `"${l.category || '-'}"`,
                `"${(l.target || '-').replace(/"/g, '""')}"`,
                `"${l.status || 'SUCCESS'}"`,
                `"${(l.userName || '-').replace(/"/g, '""')}"`,
                `"${(l.userEmail || '-').replace(/"/g, '""')}"`,
                `"${l.ipAddress || '-'}"`,
                `"${(l.details || '-').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cyberguard_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Color helpers for action badges
    const getActionBadgeStyle = (action) => {
        switch ((action || '').toUpperCase()) {
            case 'SCAN_INITIATED':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'SCAN_COMPLETED':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'MONITOR_RUN':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'SCHEDULE_CREATED':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'SCHEDULE_DELETED':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'USER_LOGIN':
                return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'USER_INVITED':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            default:
                return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
        }
    };

    const getCategoryBadgeStyle = (category) => {
        switch ((category || '').toUpperCase()) {
            case 'SECURITY':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'MONITOR':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'AUTH':
                return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'ADMIN':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default:
                return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        Audit Logs & Compliance Trail
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Immutable event log for SOC 2 and ISO 27001 auditability, capturing authentication, scans, schedules, and monitor runs.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchAuditLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        title="Refresh audit logs"
                    >
                        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>

                    <button
                        onClick={handleExportCSV}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV Audit Trail
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Audit Events</span>
                    <div className="text-2xl font-bold text-white mt-1">{counts.total}</div>
                    <span className="text-[11px] text-slate-500">Immutable records</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Operations</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{counts.security}</div>
                    <span className="text-[11px] text-slate-500">Scans initiated & completed</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recon & Monitoring</span>
                    <div className="text-2xl font-bold text-purple-400 mt-1">{counts.monitor}</div>
                    <span className="text-[11px] text-slate-500">Ports, DNS, HTTPX, Hosts</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Auth & Governance</span>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">{counts.auth + counts.admin}</div>
                    <span className="text-[11px] text-slate-500">Logins, invites, schedules</span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#0b0d14] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {[
                        { id: 'ALL', label: 'All Events', count: counts.total },
                        { id: 'SECURITY', label: 'Security', count: counts.security },
                        { id: 'MONITOR', label: 'Monitoring', count: counts.monitor },
                        { id: 'AUTH', label: 'Auth & 2FA', count: counts.auth },
                        { id: 'ADMIN', label: 'Admin', count: counts.admin }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                selectedCategory === tab.id
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                selectedCategory === tab.id ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-slate-400'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search & Status Filter */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 md:w-64">
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by target, user, action..."
                            className="w-full bg-[#121624] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="bg-[#121624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="SUCCESS">Success Only</option>
                        <option value="FAILED">Failed Only</option>
                    </select>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-4 px-6">Timestamp</th>
                                <th className="py-4 px-6">Actor</th>
                                <th className="py-4 px-6">Action</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Target / Resource</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">IP Address</th>
                                <th className="py-4 px-6">Event Details</th>
                                <th className="py-4 px-6 text-right">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400 font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                            Loading compliance audit trail...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-500 font-medium">
                                        No audit events matched your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => {
                                    const dateObj = log.timestamp ? new Date(log.timestamp) : new Date();
                                    const isSuccess = (log.status || 'SUCCESS').toUpperCase() === 'SUCCESS';

                                    return (
                                        <tr key={log.id || log._id} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                            {/* Timestamp */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="font-mono text-white text-[11px]">
                                                    {dateObj.toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>
                                            </td>

                                            {/* Actor */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="font-medium text-white text-xs">
                                                    {log.userName || (log.userEmail ? log.userEmail.split('@')[0] : 'System')}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                    {log.userEmail || 'system@internal'}
                                                </div>
                                            </td>

                                            {/* Action Badge */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${getActionBadgeStyle(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>

                                            {/* Category */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getCategoryBadgeStyle(log.category)}`}>
                                                    {log.category || 'SECURITY'}
                                                </span>
                                            </td>

                                            {/* Target */}
                                            <td className="py-4 px-6 font-mono text-white whitespace-nowrap">
                                                <span className="bg-[#121624] px-2 py-0.5 rounded border border-white/5 text-[11px]">
                                                    {log.target || '-'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                    isSuccess
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                    {log.status || 'SUCCESS'}
                                                </span>
                                            </td>

                                            {/* IP Address */}
                                            <td className="py-4 px-6 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                                                {log.ipAddress || '127.0.0.1'}
                                            </td>

                                            {/* Event Details */}
                                            <td className="py-4 px-6 text-slate-300 max-w-xs">
                                                <div className="truncate text-[11px]" title={log.details}>
                                                    {log.details || '-'}
                                                </div>
                                            </td>

                                            {/* View button */}
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg transition-all"
                                                    title="Inspect Event Metadata"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredLogs.length > pageSize && (
                    <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <div>
                            Showing <span className="text-white font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-white font-medium">{Math.min(currentPage * pageSize, filteredLogs.length)}</span> of{' '}
                            <span className="text-white font-medium">{filteredLogs.length}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <span className="px-2 text-slate-400">
                                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Event Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f121d] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${getActionBadgeStyle(selectedLog.action)}`}>
                                    {selectedLog.action}
                                </span>
                                <h3 className="text-base font-bold text-white">Event Audit Record</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Timestamp</span>
                                <div className="text-white font-mono mt-1">
                                    {new Date(selectedLog.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</span>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        selectedLog.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Actor / User</span>
                                <div className="text-white font-semibold mt-1">{selectedLog.userName || 'System'}</div>
                                <div className="text-[10px] text-slate-400">{selectedLog.userEmail || 'internal'}</div>
                            </div>
                            <div className="bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IP Address</span>
                                <div className="text-white font-mono mt-1">{selectedLog.ipAddress || '127.0.0.1'}</div>
                            </div>
                            <div className="col-span-2 bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Asset / Resource</span>
                                <div className="text-white font-mono mt-1 font-semibold">{selectedLog.target || '-'}</div>
                            </div>
                            <div className="col-span-2 bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Audit Details & Summary</span>
                                <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                                    {selectedLog.details || 'No additional metadata available for this event.'}
                                </p>
                            </div>
                            {selectedLog.id && (
                                <div className="col-span-2 bg-[#141827] p-3 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Unique Event ID</span>
                                    <div className="text-slate-400 font-mono text-[11px] mt-1 break-all select-all">
                                        {selectedLog.id}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
