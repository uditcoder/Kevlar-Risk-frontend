import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState({ hidden: true, text: '', type: '' });
  const [scanResult, setScanResult] = useState(null);
  const [monitoredAssets, setMonitoredAssets] = useState([]);
  const [scheduledScans, setScheduledScans] = useState([]);
  const [allFindings, setAllFindings] = useState([]);
  const [selectedAssetHost, setSelectedAssetHost] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [allScans, setAllScans] = useState([]);

  const groupedFindings = useMemo(() => {
    const groups = Object.values(allFindings.reduce((acc, finding) => {
      // Group by the normalized target domain/host AND the scan type (web url, hosts, dns, status, ports, vpn, ip)
      // so scans on the same target across different tools remain separate distinct incident entries
      const rawHost = finding.scanTarget || finding.target || finding.host || 'Unknown Target';
      const host = rawHost.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      
      const rawType = (finding.scanAssetType || finding.assetType || '').toLowerCase();
      const tags = Array.isArray(finding.tags) ? finding.tags : [];
      const templateId = (finding.templateId || '').toLowerCase();
      const name = (finding.name || '').toLowerCase();

      let category = '';
      if (rawType === 'url') {
        category = 'url';
      } else if (rawType === 'vpn') {
        category = 'vpn';
      } else if (
        rawType === 'hosts' ||
        tags.includes('subfinder') || 
        templateId === 'subdomain-enumeration-summary' || 
        templateId === 'live-host-discovered' || 
        name.includes('subdomain enumeration')
      ) {
        category = 'hosts';
      } else if (
        rawType === 'dns' ||
        tags.includes('dnsx') || 
        templateId === 'dns-resolution' || 
        templateId === 'dns-cname-record' || 
        name.includes('dns resolution active') || 
        name.includes('cname record exposed')
      ) {
        category = 'dns';
      } else if (
        rawType === 'status' ||
        tags.includes('httpx') || 
        templateId.startsWith('http-status-') || 
        name.startsWith('http ')
      ) {
        category = 'status';
      } else if (
        rawType === 'ports' ||
        tags.includes('naabu') || 
        templateId.startsWith('open-port-') || 
        name.startsWith('open port detected')
      ) {
        category = 'ports';
      } else if (rawType === 'ip' || /^(\d{1,3}\.){3}\d{1,3}/.test(host)) {
        category = 'ip';
      } else {
        category = 'url';
      }

      const groupKey = `${host}__${category}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          id: groupKey,
          key: groupKey,
          host,
          assetType: category,
          type: finding.type,
          findings: [],
          latestTimestamp: 0
        };
      }
      acc[groupKey].findings.push(finding);
      
      // Track the most recent finding timestamp for sorting
      const fTime = finding.timestamp ? new Date(finding.timestamp).getTime() : 0;
      if (fTime > acc[groupKey].latestTimestamp) {
          acc[groupKey].latestTimestamp = fTime;
      }
      
      return acc;
    }, {}));

    // Sort groups descending by their most recent finding
    return groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [allFindings]);

  const modalFindings = useMemo(() => {
    return selectedAssetHost ? groupedFindings.find(g => g.key === selectedAssetHost || g.id === selectedAssetHost || g.host === selectedAssetHost)?.findings || [] : [];
  }, [selectedAssetHost, groupedFindings]);

  const modalHighestSeverity = useMemo(() => {
    return modalFindings.length > 0 ? ['critical', 'high', 'medium', 'low', 'info'].find(s => modalFindings.some(f => f.severity === s)) || 'info' : 'info';
  }, [modalFindings]);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('cg_user') || localStorage.getItem('cg_user')) || null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('cg_token') || localStorage.getItem('cg_token') || null);

  const fetchScans = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/scans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scans) {
          const allAssets = data.scans.map(s => ({
            target: s.target,
            category: s.assetType,
            status: s.isRescan ? (s.newFindingsCount > 0 ? 'new_issue_found' : 'no_new_issue_found') : (s.findings.length > 0 ? 'issue_found' : 'safe'),
            severity: s.findings.length > 0 ? s.findings[0].severity : 'info',
            portsDetected: s.ports || []
          }));
          const allHstFindings = data.scans.flatMap(s => (s.findings || []).map(f => ({
            ...f, 
            scanTarget: s.target,
            scanAssetType: s.assetType,
            assetType: f.assetType || s.assetType,
            aiRecommendation: s.aiRecommendation,
            aiIntelligence: s.aiIntelligence
          })));
          
          setAllFindings(allHstFindings);
          setMonitoredAssets(allAssets);
          setAllScans(data.scans);
        }
      }
    } catch (err) {
      console.error("Failed to fetch scan history", err);
    }

    try {
      const apiUrl = window.__ENV__?.API_BASE_URL || "https://attack-surface-poc.onrender.com";
      const res2 = await fetch(`${apiUrl}/api/scheduled-scans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res2.ok) {
        const data = await res2.json();
        if (data.schedules) {
          setScheduledScans(data.schedules);
        }
      }
    } catch (err) {
      console.error("Failed to fetch scheduled scans", err);
    }

    // Refresh user profile & live scan token balance
    try {
      const apiUrl = window.__ENV__?.API_BASE_URL;
      const resUser = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resUser.ok) {
        const uData = await resUser.json();
        if (uData.user) {
          setUser(prev => {
            const updated = { ...(prev || {}), ...uData.user };
            sessionStorage.setItem('cg_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {}
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchScans();
    // Auto-poll every 6 seconds so newly completed scans appear immediately without manual page refresh
    const interval = setInterval(fetchScans, 6000);
    return () => clearInterval(interval);
  }, [token, fetchScans]);

  const login = (userData, tokenString) => {
    setUser(userData);
    setToken(tokenString);
    sessionStorage.setItem('cg_user', JSON.stringify(userData));
    sessionStorage.setItem('cg_token', tokenString);
    // Remove persistent localStorage entries
    localStorage.removeItem('cg_user');
    localStorage.removeItem('cg_token');
  };

  const logout = () => {
    if (token) {
      try {
        const API_BASE = window.__ENV__?.API_BASE_URL || '';
        fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      } catch (e) {}
    }
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('cg_user');
    sessionStorage.removeItem('cg_token');
    localStorage.removeItem('cg_user');
    localStorage.removeItem('cg_token');
    setToastMessage('Logout Successfully');
  };

    const updateTokens = useCallback((newTokens) => {
      if (typeof newTokens === 'number') {
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, scanTokens: newTokens };
          sessionStorage.setItem('cg_user', JSON.stringify(updated));
          return updated;
        });
      }
    }, []);

    const value = {
      isScanning, setIsScanning,
      scanStatus, setScanStatus,
      scanResult, setScanResult,
      monitoredAssets, setMonitoredAssets,
      scheduledScans, setScheduledScans,
      allScans, setAllScans,
      allFindings, setAllFindings,
      selectedAssetHost, setSelectedAssetHost,
      groupedFindings,
      modalFindings,
      modalHighestSeverity,
      toastMessage, setToastMessage,
      user, token, login, logout,
      updateTokens,
      refreshScans: fetchScans
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
