import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function AuditLogs() {
    const { token, setToastMessage, monitoredAssets, allScans, user: currentUser } = useAppContext();
    const [logs, setLogs] = useState([]);
    const [userDetails, setUserDetails] = useState([]);
    const [monitoringData, setMonitoringData] = useState([]);
    const [grantedAccess, setGrantedAccess] = useState({ total: 0, active: 0, pending: 0, expired: 0, users: [] });
    const [incidentsData, setIncidentsData] = useState({ securityFindings: [], settingsChanges: [], totalIncidents: 0, totalSettingsChanges: 0 });
    const [loading, setLoading] = useState(true);

    // Main navigation tabs: 'all-logs', 'users', 'monitoring', 'grant-access', 'incidents'
    const [activeTab, setActiveTab] = useState('all-logs');

    // Incidents subtab: 'all', 'findings', 'settings'
    const [incidentSubTab, setIncidentSubTab] = useState('all');
    const [incidentSearch, setIncidentSearch] = useState('');
    const [incidentUserFilter, setIncidentUserFilter] = useState('ALL');

    // Monitoring tab filters
    const [monitorTypeFilter, setMonitorTypeFilter] = useState('ALL');
    const [monitorSearch, setMonitorSearch] = useState('');

    // All Logs tab filters
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
            const res = await fetch(`${API_BASE}/api/audit-logs?limit=400`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const fetchedLogs = data.logs || [];
                setLogs(fetchedLogs);

                // 1. Process User Details
                if (Array.isArray(data.userDetails) && data.userDetails.length > 0) {
                    setUserDetails(data.userDetails);
                } else {
                    // Fallback derivation from fetched logs
                    const userMap = new Map();
                    fetchedLogs.forEach(l => {
                        const email = l.userEmail;
                        if (!email) return;
                        if (!userMap.has(email)) {
                            userMap.set(email, {
                                id: l.userId || email,
                                name: l.userName || email.split('@')[0],
                                email: email,
                                role: email.includes('admin') ? 'admin' : 'user',
                                designation: email.includes('admin') ? 'Administrator' : 'Security Analyst',
                                companyName: '',
                                signupAt: l.timestamp,
                                lastLoginAt: null,
                                lastLoginIp: '127.0.0.1',
                                lastLogoutAt: null,
                                status: 'ACTIVE'
                            });
                        }
                        const u = userMap.get(email);
                        if (l.action === 'USER_LOGIN' && (!u.lastLoginAt || new Date(l.timestamp) > new Date(u.lastLoginAt))) {
                            u.lastLoginAt = l.timestamp;
                            u.lastLoginIp = l.ipAddress || '127.0.0.1';
                        }
                        if (l.action === 'USER_LOGOUT' && (!u.lastLogoutAt || new Date(l.timestamp) > new Date(u.lastLogoutAt))) {
                            u.lastLogoutAt = l.timestamp;
                        }
                        if (l.action === 'USER_SIGNUP' || l.action === 'USER_INVITED') {
                            u.signupAt = l.timestamp;
                        }
                    });

                    // Ensure current user is present
                    if (currentUser && currentUser.email && !userMap.has(currentUser.email)) {
                        userMap.set(currentUser.email, {
                            id: currentUser.id || 'curr-user',
                            name: currentUser.name || currentUser.email.split('@')[0],
                            email: currentUser.email,
                            role: currentUser.role || 'admin',
                            designation: currentUser.designation || 'Security Administrator',
                            companyName: currentUser.companyName || '',
                            signupAt: currentUser.createdAt || new Date(),
                            lastLoginAt: new Date(),
                            lastLoginIp: '127.0.0.1',
                            lastLogoutAt: null,
                            status: 'ACTIVE'
                        });
                    }
                    setUserDetails(Array.from(userMap.values()));
                }

                // 2. Process Monitoring Data
                if (Array.isArray(data.monitoringData) && data.monitoringData.length > 0) {
                    const normalizedMonitoring = data.monitoringData.map(item => ({
                        ...item,
                        type: (item.type && item.type.toUpperCase() !== 'SCHEDULED')
                            ? item.type.toUpperCase()
                            : ((item.assetType || 'WEB').toUpperCase())
                    }));
                    setMonitoringData(normalizedMonitoring);
                } else {
                    // Fallback derivation from allScans, monitoredAssets & audit logs
                    const items = [];
                    const seenTargets = new Set();

                    (allScans || []).forEach(s => {
                        const targetKey = `${s.target}-${s.assetType || 'web'}`;
                        if (!seenTargets.has(targetKey)) {
                            seenTargets.add(targetKey);
                            items.push({
                                id: s.scanId || s.id || Math.random().toString(),
                                target: s.target,
                                type: (s.assetType || 'web').toUpperCase(),
                                category: 'Vulnerability Audit',
                                status: (s.status || 'complete').toUpperCase(),
                                scannedAt: s.scannedAt || s.createdAt || new Date(),
                                frequency: s.frequency || (s.trigger === 'cron' ? 'Weekly' : 'Manual'),
                                findingsCount: Array.isArray(s.findings) ? s.findings.length : 0,
                                ports: s.ports || [],
                                details: `Perimeter audit discovered ${Array.isArray(s.findings) ? s.findings.length : 0} findings.`
                            });
                        }
                    });

                    fetchedLogs.filter(l => l.category === 'SECURITY' || l.category === 'MONITOR').forEach(l => {
                        const targetKey = `${l.target}-${l.category}`;
                        if (!seenTargets.has(targetKey) && l.target && l.target !== '-') {
                            seenTargets.add(targetKey);
                            items.push({
                                id: l.id || Math.random().toString(),
                                target: l.target,
                                type: l.category === 'MONITOR' ? 'PORTS' : 'WEB',
                                category: l.category === 'MONITOR' ? 'Asset Reconnaissance' : 'Vulnerability Audit',
                                status: l.status || 'COMPLETE',
                                scannedAt: l.timestamp,
                                frequency: l.category === 'MONITOR' ? 'Manual' : 'Monthly',
                                findingsCount: 0,
                                ports: [],
                                details: l.details || `Monitored ${l.target}`
                            });
                        }
                    });
                    setMonitoringData(items);
                }

                // 3. Process Granted Access Data
                if (data.grantedAccess && Array.isArray(data.grantedAccess.users)) {
                    setGrantedAccess(data.grantedAccess);
                } else {
                    // Fallback derivation from USER_INVITED logs
                    const invitedUsers = [];
                    fetchedLogs.filter(l => l.action === 'USER_INVITED' || l.action === 'ACCESS_GRANTED').forEach(l => {
                        invitedUsers.push({
                            id: l.id || Math.random().toString(),
                            name: l.userName || l.target.split('@')[0],
                            email: l.target,
                            role: 'user',
                            designation: 'Security Member',
                            companyName: '',
                            grantedAt: l.timestamp,
                            status: 'ACTIVE',
                            lastLoginAt: l.timestamp,
                            grantedBy: l.userEmail || 'Admin'
                        });
                    });
                    setGrantedAccess({
                        total: invitedUsers.length,
                        active: invitedUsers.length,
                        pending: 0,
                        expired: 0,
                        users: invitedUsers
                    });
                }

                // 4. Process Incidents & Settings Changes
                if (data.incidents) {
                    setIncidentsData(data.incidents);
                } else {
                    // Fallback derivation
                    const fallbackFindings = [];
                    (allScans || []).forEach(s => {
                        (s.findings || []).forEach((f, fIdx) => {
                            fallbackFindings.push({
                                id: `${s.scanId || s.id}-${fIdx}`,
                                scanId: s.scanId,
                                target: s.target,
                                type: (s.assetType || 'web').toUpperCase(),
                                name: f.name || f.info?.name || 'Security Finding',
                                severity: (f.severity || f.info?.severity || 'medium').toUpperCase(),
                                status: (s.status || 'DETECTED').toUpperCase(),
                                cve: f.cve || '-',
                                timestamp: s.scannedAt || new Date(),
                                details: f.description || `Vulnerability detected on ${s.target}`,
                                createdBy: currentUser?.name || currentUser?.email || 'User'
                            });
                        });
                    });

                    const fallbackSettings = fetchedLogs.filter(l => 
                        l.action === 'PASSWORD_CHANGED' || 
                        l.action === 'USER_INVITED' ||
                        l.action === 'ACCESS_GRANTED'
                    ).map(l => ({
                        id: l.id || Math.random().toString(),
                        action: l.action,
                        type: l.action.includes('PASSWORD') ? 'SECURITY' : 'ACCESS_CONTROL',
                        userEmail: l.userEmail,
                        userName: l.userName,
                        target: l.target,
                        details: l.details,
                        grantedDetails: (l.action === 'USER_INVITED' || l.action === 'ACCESS_GRANTED') ? {
                            email: l.target,
                            name: l.userName || l.target.split('@')[0],
                            status: 'ACTIVE'
                        } : null,
                        status: l.status,
                        ipAddress: l.ipAddress || '127.0.0.1',
                        timestamp: l.timestamp
                    }));

                    setIncidentsData({
                        securityFindings: fallbackFindings,
                        settingsChanges: fallbackSettings,
                        totalIncidents: fallbackFindings.length,
                        totalSettingsChanges: fallbackSettings.length
                    });
                }
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

    // All Logs Summary counts
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

    // Filtered Monitoring Data by Type & Search
    const filteredMonitoringData = useMemo(() => {
        return monitoringData.filter(item => {
            if (monitorTypeFilter !== 'ALL') {
                const itemType = (item.type || '').toUpperCase();
                if (monitorTypeFilter === 'WEB' && itemType !== 'WEB' && itemType !== 'URL') return false;
                if (monitorTypeFilter === 'PORTS' && itemType !== 'PORTS') return false;
                if (monitorTypeFilter === 'DNS' && itemType !== 'DNS') return false;
                if (monitorTypeFilter === 'HOSTS' && itemType !== 'HOSTS') return false;
                if (monitorTypeFilter === 'VPN' && itemType !== 'VPN') return false;
                if (monitorTypeFilter === 'SCHEDULED' && itemType !== 'SCHEDULED') return false;
            }
            if (monitorSearch.trim()) {
                const q = monitorSearch.toLowerCase();
                const matchTarget = (item.target || '').toLowerCase().includes(q);
                const matchType = (item.type || '').toLowerCase().includes(q);
                const matchDetails = (item.details || '').toLowerCase().includes(q);
                if (!matchTarget && !matchType && !matchDetails) return false;
            }
            return true;
        });
    }, [monitoringData, monitorTypeFilter, monitorSearch]);

    // Filtered Incidents & Settings
    const filteredIncidentFindings = useMemo(() => {
        return (incidentsData.securityFindings || []).filter(item => {
            if (incidentUserFilter !== 'ALL') {
                const userMatch = (item.createdBy || '').toLowerCase();
                if (!userMatch.includes(incidentUserFilter.toLowerCase())) return false;
            }
            if (incidentSearch.trim()) {
                const q = incidentSearch.toLowerCase();
                const matchTarget = (item.target || '').toLowerCase().includes(q);
                const matchName = (item.name || '').toLowerCase().includes(q);
                const matchDetails = (item.details || '').toLowerCase().includes(q);
                const matchCve = (item.cve || '').toLowerCase().includes(q);
                const matchUser = (item.createdBy || '').toLowerCase().includes(q);
                if (!matchTarget && !matchName && !matchDetails && !matchCve && !matchUser) return false;
            }
            return true;
        });
    }, [incidentsData.securityFindings, incidentUserFilter, incidentSearch]);

    const filteredSettingsChanges = useMemo(() => {
        return (incidentsData.settingsChanges || []).filter(item => {
            if (incidentUserFilter !== 'ALL') {
                const userMatch = (item.userEmail || item.userName || '').toLowerCase();
                if (!userMatch.includes(incidentUserFilter.toLowerCase())) return false;
            }
            if (incidentSearch.trim()) {
                const q = incidentSearch.toLowerCase();
                const matchAction = (item.action || '').toLowerCase().includes(q);
                const matchTarget = (item.target || '').toLowerCase().includes(q);
                const matchDetails = (item.details || '').toLowerCase().includes(q);
                const matchEmail = (item.userEmail || '').toLowerCase().includes(q);
                const matchName = (item.userName || '').toLowerCase().includes(q);
                if (!matchAction && !matchTarget && !matchDetails && !matchEmail && !matchName) return false;
            }
            return true;
        });
    }, [incidentsData.settingsChanges, incidentUserFilter, incidentSearch]);

    // Filtered All Logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (selectedCategory !== 'ALL' && (log.category || '').toUpperCase() !== selectedCategory) return false;
            if (selectedStatus !== 'ALL' && (log.status || '').toUpperCase() !== selectedStatus) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTarget = (log.target || '').toLowerCase().includes(q);
                const matchAction = (log.action || '').toLowerCase().includes(q);
                const matchEmail = (log.userEmail || '').toLowerCase().includes(q);
                const matchName = (log.userName || '').toLowerCase().includes(q);
                const matchDetails = (log.details || '').toLowerCase().includes(q);
                const matchIp = (log.ipAddress || '').toLowerCase().includes(q);
                if (!matchTarget && !matchAction && !matchEmail && !matchName && !matchDetails && !matchIp) return false;
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
            case 'SCAN_INITIATED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'SCAN_COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'MONITOR_RUN': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'SCHEDULE_CREATED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'USER_LOGIN': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'USER_LOGOUT': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'USER_SIGNUP': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
            case 'USER_INVITED': case 'ACCESS_GRANTED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            default: return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
        }
    };

    const getMonitorTypeBadge = (type) => {
        const t = (type || 'WEB').toUpperCase();
        switch (t) {
            case 'WEB': case 'URL': return { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'WEB / URL' };
            case 'PORTS': return { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'PORT SCAN' };
            case 'DNS': return { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'DNS RECON' };
            case 'HOSTS': return { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', label: 'HOST DISCOVERY' };
            case 'VPN': return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'VPN GATEWAY' };
            case 'SCHEDULED': return { bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'SCHEDULED' };
            default: return { bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20', label: t };
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        Audit Logs & Governance
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Comprehensive compliance audit trail capturing user authentication lifecycle, monitored assets across all types, and access delegations.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchAuditLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        title="Refresh audit trail"
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

            {/* Overview KPI Cards (Placed ABOVE the Tabs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monitored Targets</span>
                    <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">{monitoringData.length}</div>
                    <span className="text-[11px] text-slate-500">Across all scan types</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User Details / Accounts</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{userDetails.length}</div>
                    <span className="text-[11px] text-slate-500">Logins, logouts & signups</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Granted Access</span>
                    <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">{grantedAccess.total}</div>
                    <span className="text-[11px] text-slate-500">Delegated permissions</span>
                </div>
                <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Audit Events</span>
                    <div className="text-2xl font-bold text-white mt-1 font-mono">{counts.total}</div>
                    <span className="text-[11px] text-slate-500">Immutable compliance records</span>
                </div>
            </div>

            {/* Navigation Tabs (All Audit Events FIRST, followed by User Details, Monitoring, Grant Access, Incidents & Settings) */}
            <div className="bg-[#0b0d14] border border-white/5 rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-sm">
                <button
                    onClick={() => setActiveTab('all-logs')}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'all-logs'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>All Audit Events</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === 'all-logs' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
                    }`}>
                        {counts.total}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'users'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>User Details</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === 'users' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
                    }`}>
                        {userDetails.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('monitoring')}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'monitoring'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Monitoring (All Types)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === 'monitoring' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
                    }`}>
                        {monitoringData.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('grant-access')}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'grant-access'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Grant Access</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === 'grant-access' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
                    }`}>
                        {grantedAccess.total}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('incidents')}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'incidents'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Incidents & Settings</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === 'incidents' ? 'bg-black/20 text-black' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                        {(incidentsData.totalIncidents || 0) + (incidentsData.totalSettingsChanges || 0)}
                    </span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 1: USER DETAILS (LAST LOGIN, LOGOUT, SIGNUP & SESSION STATUS)
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'users' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* User Details Table */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    User Authentication Lifecycle
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Real-time tracking of user account creation (Signup), Last Login timestamp with IP address, and Session Logout.
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                                Total: <strong className="text-white">{userDetails.length}</strong> Users
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-4 px-6">User / Identity</th>
                                        <th className="py-4 px-6">Role & Designation</th>
                                        <th className="py-4 px-6">Signup Date</th>
                                        <th className="py-4 px-6">Last Login</th>
                                        <th className="py-4 px-6">Last Logout</th>
                                        <th className="py-4 px-6">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Loading user authentication details...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : userDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">
                                                No user records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        userDetails.map((u, idx) => {
                                            const signupDate = u.signupAt ? new Date(u.signupAt) : new Date();
                                            const loginDate = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
                                            const logoutDate = u.lastLogoutAt ? new Date(u.lastLogoutAt) : null;

                                            return (
                                                <tr key={u.id || idx} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                                    {/* User Identity */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                                                                {(u.name || u.email || 'U')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-white text-xs">{u.name || 'User'}</div>
                                                                <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                            {u.role || 'USER'}
                                                        </span>
                                                        <div className="text-[10px] text-slate-400 mt-1">
                                                            {u.designation || 'Member'}
                                                        </div>
                                                    </td>

                                                    {/* Signup Date */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="font-mono text-white text-[11px]">
                                                            {signupDate.toLocaleDateString()}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            {signupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>

                                                    {/* Last Login */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        {loginDate ? (
                                                            <div>
                                                                <div className="font-mono text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                                    {loginDate.toLocaleDateString()} {loginDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                    IP: {u.lastLoginIp || '127.0.0.1'} • 2FA/OTP
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500 italic text-[11px]">No login recorded</span>
                                                        )}
                                                    </td>

                                                    {/* Last Logout */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        {logoutDate ? (
                                                            <div>
                                                                <div className="font-mono text-slate-300 text-[11px]">
                                                                    {logoutDate.toLocaleDateString()} {logoutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500">Session closed</div>
                                                            </div>
                                                        ) : loginDate ? (
                                                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                                Active Session
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 italic text-[11px]">-</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono border ${
                                                            u.status === 'ACTIVE'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : u.status === 'PENDING_SETUP'
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                u.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : u.status === 'PENDING_SETUP' ? 'bg-amber-400' : 'bg-slate-400'
                                                            }`}></span>
                                                            {u.status || 'ACTIVE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Authentication Events Stream */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Recent Login & Logout Event Logs
                            </h4>
                            <span className="text-[11px] text-slate-500 font-mono">Auth audit events</span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {logs.filter(l => l.category === 'AUTH' || l.action.startsWith('USER_')).slice(0, 8).map((log, lIdx) => (
                                <div key={log.id || lIdx} className="py-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${getActionBadgeStyle(log.action)}`}>
                                            {log.action}
                                        </span>
                                        <div>
                                            <span className="text-white font-medium">{log.userName || log.userEmail}</span>
                                            <span className="text-slate-400 text-[11px] ml-2">{log.details}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-[10px] text-slate-400 font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 2: MONITORING (ALL MONITORED TARGETS ACROSS ALL TYPES)
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'monitoring' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Filter Bar for Types */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                        {/* Type Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                            {[
                                { id: 'ALL', label: 'All Types', count: monitoringData.length },
                                { id: 'WEB', label: 'Web & URLs', count: monitoringData.filter(m => (m.type || '').includes('WEB') || (m.type || '').includes('URL')).length },
                                { id: 'PORTS', label: 'Port Scanning', count: monitoringData.filter(m => (m.type || '').toUpperCase() === 'PORTS').length },
                                { id: 'DNS', label: 'DNS Recon', count: monitoringData.filter(m => (m.type || '').toUpperCase() === 'DNS').length },
                                { id: 'HOSTS', label: 'Host Discovery', count: monitoringData.filter(m => (m.type || '').toUpperCase() === 'HOSTS').length },
                                { id: 'VPN', label: 'VPN Gateway', count: monitoringData.filter(m => (m.type || '').toUpperCase() === 'VPN').length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMonitorTypeFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                                        monitorTypeFilter === tab.id
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        monitorTypeFilter === tab.id ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative md:w-64">
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={monitorSearch}
                                onChange={(e) => setMonitorSearch(e.target.value)}
                                placeholder="Search target host or details..."
                                className="w-full bg-[#121624] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>
                    </div>

                    {/* Monitoring Data Table */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-4 px-6">Monitored Target</th>
                                        <th className="py-4 px-6">Monitor Type</th>
                                        <th className="py-4 px-6">Schedule / Frequency</th>
                                        <th className="py-4 px-6">Category</th>
                                        <th className="py-4 px-6">Last Monitored</th>
                                        <th className="py-4 px-6">Findings / Discoveries</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Summary Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Loading monitored targets across all types...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredMonitoringData.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-12 text-center text-slate-500 font-medium">
                                                No monitored targets match the selected type or filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMonitoringData.map((item, mIdx) => {
                                            const typeBadge = getMonitorTypeBadge(item.type);
                                            const scanDate = item.scannedAt ? new Date(item.scannedAt) : new Date();
                                            const freq = (item.frequency || (item.type === 'SCHEDULED' ? 'Monthly' : 'Weekly')).toLowerCase();

                                            return (
                                                <tr key={item.id || mIdx} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                                    {/* Target */}
                                                    <td className="py-4 px-6 font-mono text-white whitespace-nowrap font-semibold">
                                                        <span className="bg-[#121624] px-2.5 py-1 rounded border border-white/5 text-xs text-emerald-400">
                                                            {item.target || '-'}
                                                        </span>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono border ${typeBadge.bg}`}>
                                                            {typeBadge.label}
                                                        </span>
                                                    </td>

                                                    {/* Schedule / Frequency */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono border ${
                                                            freq.includes('month')
                                                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                                                                : freq.includes('week')
                                                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                                                                : freq.includes('manual')
                                                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                                        }`}>
                                                            <svg className="w-3 h-3 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {item.frequency || 'Manual'}
                                                        </span>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="py-4 px-6 text-slate-300 whitespace-nowrap text-[11px]">
                                                        {item.category || 'Vulnerability Audit'}
                                                    </td>

                                                    {/* Last Monitored */}
                                                    <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                                                        <div className="text-white">{scanDate.toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>

                                                    {/* Findings */}
                                                    <td className="py-4 px-6 whitespace-nowrap font-mono">
                                                        {item.findingsCount > 0 ? (
                                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                                {item.findingsCount} Detected
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 text-[11px]">0 Findings</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                            {item.status || 'COMPLETE'}
                                                        </span>
                                                    </td>

                                                    {/* Details */}
                                                    <td className="py-4 px-6 text-slate-300 max-w-sm truncate text-[11px]" title={item.details}>
                                                        {item.details || '-'}
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
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 3: GRANT ACCESS (USERS GIVEN ACCESS & THEIR CURRENT STATUS)
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'grant-access' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Grant Access KPI Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Granted Access</span>
                            <div className="text-2xl font-bold text-white mt-1 font-mono">{grantedAccess.total}</div>
                            <span className="text-[11px] text-slate-500">Access granted by you</span>
                        </div>
                        <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Verified</span>
                            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{grantedAccess.active}</div>
                            <span className="text-[11px] text-slate-500">Completed account setup</span>
                        </div>
                        <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Setup</span>
                            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{grantedAccess.pending}</div>
                            <span className="text-[11px] text-slate-500">Invited / setup link active</span>
                        </div>
                        <div className="p-4 bg-[#0b0d14] border border-white/5 rounded-2xl shadow-sm">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expired Invites</span>
                            <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{grantedAccess.expired}</div>
                            <span className="text-[11px] text-slate-500">Needs reinvitation</span>
                        </div>
                    </div>

                    {/* Granted Access Users Table */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                    Users Granted Access & Current Status
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Track the number of users you authorized, their assigned permissions, and their current activation status.
                                </p>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                Total Granted: <strong className="text-white">{grantedAccess.total}</strong> Accounts
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-4 px-6">User Name & Email</th>
                                        <th className="py-4 px-6">Assigned Designation</th>
                                        <th className="py-4 px-6">Access Granted Date</th>
                                        <th className="py-4 px-6">Granted By</th>
                                        <th className="py-4 px-6">Current Status</th>
                                        <th className="py-4 px-6">Last Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Loading access authorization records...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : grantedAccess.users.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">
                                                You haven't granted access to any external users yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        grantedAccess.users.map((gu, gIdx) => {
                                            const grantedDate = gu.grantedAt ? new Date(gu.grantedAt) : new Date();
                                            const lastLogin = gu.lastLoginAt ? new Date(gu.lastLoginAt) : null;

                                            return (
                                                <tr key={gu.id || gIdx} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                                    {/* User */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                                                                {(gu.name || gu.email || 'M')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-white text-xs">{gu.name || 'Member'}</div>
                                                                <div className="text-[11px] text-slate-400 font-mono">{gu.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Designation */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                            {gu.designation || 'Security Member'}
                                                        </span>
                                                        <div className="text-[10px] text-slate-500 mt-0.5">Role: {gu.role || 'user'}</div>
                                                    </td>

                                                    {/* Granted Date */}
                                                    <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                                                        <div className="text-white">{grantedDate.toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {grantedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>

                                                    {/* Granted By */}
                                                    <td className="py-4 px-6 whitespace-nowrap text-slate-300 text-[11px]">
                                                        {gu.grantedBy || (currentUser?.name || 'Administrator')}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono border ${
                                                            gu.status === 'ACTIVE'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : gu.status === 'PENDING_SETUP'
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                gu.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : gu.status === 'PENDING_SETUP' ? 'bg-amber-400' : 'bg-rose-400'
                                                            }`}></span>
                                                            {gu.status === 'ACTIVE' ? 'ACTIVE & VERIFIED' : gu.status === 'PENDING_SETUP' ? 'PENDING SETUP' : 'EXPIRED'}
                                                        </span>
                                                    </td>

                                                    {/* Last Activity */}
                                                    <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                                                        {lastLogin ? (
                                                            <div>
                                                                <div className="text-slate-200">{lastLogin.toLocaleDateString()}</div>
                                                                <div className="text-[10px] text-slate-500">{lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500 italic text-[10px]">Awaiting First Login</span>
                                                        )}
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
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 4: INCIDENTS & SETTING CHANGES (Created / Triggered by Users)
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'incidents' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Header Controls & Filter Bar */}
                    <div className="bg-[#0b0d14] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                        {/* Subtabs: All, Security Findings, Settings Changes */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                            {[
                                { id: 'all', label: 'All Incidents & Changes', count: (incidentsData.totalIncidents || 0) + (incidentsData.totalSettingsChanges || 0) },
                                { id: 'findings', label: 'Security Incidents & Findings', count: incidentsData.totalIncidents || 0 },
                                { id: 'settings', label: 'Settings & Security Changes', count: incidentsData.totalSettingsChanges || 0 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setIncidentSubTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                                        incidentSubTab === tab.id
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        incidentSubTab === tab.id ? 'bg-rose-500/30 text-rose-200' : 'bg-white/5 text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative min-w-[260px]">
                            <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={incidentSearch}
                                onChange={(e) => setIncidentSearch(e.target.value)}
                                placeholder="Search by target, action, user or CVE..."
                                className="w-full bg-[#121624] border border-white/10 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* SECTION A: SECURITY INCIDENTS / FINDINGS */}
                    {(incidentSubTab === 'all' || incidentSubTab === 'findings') && (
                        <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/[0.02]">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                                        Security Vulnerability Incidents Triggered by User
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        All active and detected incidents discovered from scans, port audits, and monitors executed by this user.
                                    </p>
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                    Total Detected: <strong className="text-rose-400">{filteredIncidentFindings.length}</strong> Incidents
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-4 px-6">Incident Target</th>
                                            <th className="py-4 px-6">Vulnerability / Incident Name</th>
                                            <th className="py-4 px-6">Severity</th>
                                            <th className="py-4 px-6">CVE / Classification</th>
                                            <th className="py-4 px-6">Detected At</th>
                                            <th className="py-4 px-6">Created / Triggered By</th>
                                            <th className="py-4 px-6">Incident Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                                                        Loading incidents...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredIncidentFindings.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                        </svg>
                                                        <span className="font-semibold text-slate-400">Zero active security incidents detected</span>
                                                        <span className="text-[11px] text-slate-500">All user-scanned targets currently have no active vulnerability incidents.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredIncidentFindings.map((inc, iIdx) => {
                                                const incDate = inc.timestamp ? new Date(inc.timestamp) : new Date();
                                                const sev = (inc.severity || 'medium').toLowerCase();
                                                return (
                                                    <tr key={inc.id || iIdx} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                                        {/* Target */}
                                                        <td className="py-4 px-6 font-mono text-white whitespace-nowrap font-semibold">
                                                            <span className="bg-[#121624] px-2.5 py-1 rounded border border-white/5 text-xs text-rose-400">
                                                                {inc.target || '-'}
                                                            </span>
                                                        </td>

                                                        {/* Incident Name */}
                                                        <td className="py-4 px-6 max-w-xs">
                                                            <div className="font-semibold text-white truncate" title={inc.name}>
                                                                {inc.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 truncate mt-0.5" title={inc.details}>
                                                                {inc.details}
                                                            </div>
                                                        </td>

                                                        {/* Severity */}
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono border ${
                                                                sev === 'critical'
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                    : sev === 'high'
                                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                    : sev === 'medium'
                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    sev === 'critical' || sev === 'high' ? 'bg-red-400 animate-ping' : 'bg-amber-400'
                                                                }`}></span>
                                                                {sev}
                                                            </span>
                                                        </td>

                                                        {/* CVE */}
                                                        <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px] text-slate-400">
                                                            {inc.cve && inc.cve !== '-' ? (
                                                                <span className="text-indigo-400 font-semibold">{inc.cve}</span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>

                                                        {/* Detected At */}
                                                        <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                                                            <div className="text-slate-200">{incDate.toLocaleDateString()}</div>
                                                            <div className="text-[10px] text-slate-500">{incDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>

                                                        {/* Triggered By */}
                                                        <td className="py-4 px-6 whitespace-nowrap text-slate-300 text-[11px]">
                                                            <span className="text-emerald-400 font-semibold">{inc.createdBy}</span>
                                                        </td>

                                                        {/* Incident Status */}
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                                                ● {inc.status || 'DETECTED'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SECTION B: USER SETTING CHANGES (Password Updates & Access Grants) */}
                    {(incidentSubTab === 'all' || incidentSubTab === 'settings') && (
                        <div className="bg-[#0b0d14] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-500/[0.02]">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                        User Password & Access Control Audit Log
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Auditing whether users updated their passwords and tracking all accounts to whom access was granted, including the recipient's identity, role, and activation status.
                                    </p>
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                    Total Changes: <strong className="text-indigo-400">{filteredSettingsChanges.length}</strong> Audit Events
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-4 px-6">Timestamp</th>
                                            <th className="py-4 px-6">Operation / Type</th>
                                            <th className="py-4 px-6">Performed By (User)</th>
                                            <th className="py-4 px-6">Action Performed</th>
                                            <th className="py-4 px-6">Granted User / Target Details</th>
                                            <th className="py-4 px-6">Details / Summary</th>
                                            <th className="py-4 px-6">Result Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                                        Loading setting change logs...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredSettingsChanges.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-500">
                                                    No password modification or access grant events recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSettingsChanges.map((sc, sIdx) => {
                                                const sDate = sc.timestamp ? new Date(sc.timestamp) : new Date();
                                                const isPassword = sc.action === 'PASSWORD_CHANGED';
                                                const isAccess = sc.action === 'USER_INVITED' || sc.action === 'ACCESS_GRANTED';

                                                return (
                                                    <tr key={sc.id || sIdx} className="hover:bg-white/[0.02] transition-colors text-slate-300">
                                                        {/* Timestamp */}
                                                        <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                                                            <div className="text-slate-200">{sDate.toLocaleDateString()}</div>
                                                            <div className="text-[10px] text-slate-500">{sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>

                                                        {/* Operation Type */}
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono border ${
                                                                isPassword
                                                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                                                                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                                                            }`}>
                                                                {isPassword ? '🔑 PASSWORD CHANGE' : '👥 ACCESS CONTROL'}
                                                            </span>
                                                        </td>

                                                        {/* Performed By (User) */}
                                                        <td className="py-4 px-6 whitespace-nowrap text-slate-300 text-[11px]">
                                                            <div className="font-semibold text-white">{sc.userName || sc.userEmail?.split('@')[0] || 'User'}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{sc.userEmail}</div>
                                                        </td>

                                                        {/* Action Performed */}
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            <span className="font-semibold text-white text-[11px] block">
                                                                {isPassword ? 'Changed Password' : 'Granted User Access'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {sc.action}
                                                            </span>
                                                        </td>

                                                        {/* Granted User / Target Details */}
                                                        <td className="py-4 px-6 max-w-xs">
                                                            {isPassword ? (
                                                                <div className="font-mono text-emerald-400 text-xs">
                                                                    ✓ Password successfully changed
                                                                </div>
                                                            ) : sc.grantedDetails ? (
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-white flex items-center gap-1.5">
                                                                        <span>{sc.grantedDetails.name}</span>
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                                                                            {sc.grantedDetails.role || 'Member'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-300 font-mono">{sc.grantedDetails.email}</div>
                                                                    <div className="text-[10px] text-slate-400">Designation: {sc.grantedDetails.designation || 'Security Member'}</div>
                                                                    <div className="text-[10px] font-mono">
                                                                        <span className={`px-1.5 py-0.2 rounded ${
                                                                            sc.grantedDetails.status === 'ACTIVE' 
                                                                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                                                        }`}>
                                                                            ● {sc.grantedDetails.status === 'ACTIVE' ? 'Active & Setup Complete' : 'Pending Password Setup'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="font-semibold text-white">{sc.target}</div>
                                                                    <div className="text-[10px] text-slate-400">Access invitation dispatched</div>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Details */}
                                                        <td className="py-4 px-6 max-w-sm text-[11px] text-slate-300">
                                                            {sc.details}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                                                sc.status === 'SUCCESS' || sc.status === 'ACTIVE'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                            }`}>
                                                                ● {sc.status || 'SUCCESS'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                TAB 5: ALL AUDIT EVENTS (SOC 2 / ISO 27001 FULL COMPLIANCE TRAIL)
               ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'all-logs' && (
                <div className="space-y-6 animate-in fade-in duration-200">
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
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
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="font-mono text-white text-[11px]">{dateObj.toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="font-medium text-white text-xs">
                                                            {log.userName || (log.userEmail ? log.userEmail.split('@')[0] : 'System')}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                            {log.userEmail || 'system@internal'}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono border ${getActionBadgeStyle(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                                            {log.category || 'SECURITY'}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 font-mono text-white whitespace-nowrap">
                                                        <span className="bg-[#121624] px-2 py-0.5 rounded border border-white/5 text-[11px]">
                                                            {log.target || '-'}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                                            isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                            {log.status || 'SUCCESS'}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                                                        {log.ipAddress || '127.0.0.1'}
                                                    </td>

                                                    <td className="py-4 px-6 text-slate-300 max-w-xs">
                                                        <div className="truncate text-[11px]" title={log.details}>
                                                            {log.details || '-'}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => setSelectedLog(log)}
                                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg transition-all cursor-pointer"
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
                                    <span className="px-2 text-slate-400 font-mono">
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
                </div>
            )}

            {/* Event Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f121d] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase font-mono border ${getActionBadgeStyle(selectedLog.action)}`}>
                                    {selectedLog.action}
                                </span>
                                <h3 className="text-base font-bold text-white">Event Audit Record</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
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
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                        selectedLog.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-[#141827] p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Actor / User</span>
                                <div className="text-white font-semibold mt-1">{selectedLog.userName || 'System'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{selectedLog.userEmail || 'internal'}</div>
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
                                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
