import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

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
      const host = finding.host || 'Unknown Target';
      if (!acc[host]) {
        acc[host] = {
          host,
          type: finding.type,
          findings: [],
          latestTimestamp: 0
        };
      }
      acc[host].findings.push(finding);
      
      // Track the most recent finding timestamp for sorting
      const fTime = finding.timestamp ? new Date(finding.timestamp).getTime() : 0;
      if (fTime > acc[host].latestTimestamp) {
          acc[host].latestTimestamp = fTime;
      }
      
      return acc;
    }, {}));

    // Sort groups descending by their most recent finding
    return groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [allFindings]);

  const modalFindings = useMemo(() => {
    return selectedAssetHost ? groupedFindings.find(g => g.host === selectedAssetHost)?.findings || [] : [];
  }, [selectedAssetHost, groupedFindings]);

  const modalHighestSeverity = useMemo(() => {
    return modalFindings.length > 0 ? ['critical', 'high', 'medium', 'low', 'info'].find(s => modalFindings.some(f => f.severity === s)) || 'info' : 'info';
  }, [modalFindings]);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_user')) || null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('cg_token') || null);

  useEffect(() => {
    if (!token) return;
    const fetchScans = async () => {
      try {
        const apiUrl = window.__ENV__?.API_BASE_URL || "https://cyber-guard-poc.onrender.com";
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
            const allHstFindings = data.scans.flatMap(s => s.findings.map(f => ({...f, aiRecommendation: s.aiRecommendation})));
            
            // Avoid loop
            if (allFindings.length !== allHstFindings.length) {
              setAllFindings(allHstFindings);
              setMonitoredAssets(allAssets);
              setAllScans(data.scans);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch scan history", err);
      }

      try {
        const apiUrl = window.__ENV__?.API_BASE_URL || "https://cyber-guard-poc.onrender.com";
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
    };
    fetchScans();
  }, [token, allFindings.length]);

  const login = (userData, tokenString) => {
    setUser(userData);
    setToken(tokenString);
    localStorage.setItem('cg_user', JSON.stringify(userData));
    localStorage.setItem('cg_token', tokenString);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cg_user');
    localStorage.removeItem('cg_token');
  };

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
    user, token, login, logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
