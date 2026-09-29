import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState({ hidden: true, text: '', type: '' });
  const [scanResult, setScanResult] = useState(null);
  const [monitoredAssets, setMonitoredAssets] = useState([]);
  const [allFindings, setAllFindings] = useState([]);
  const [selectedAssetHost, setSelectedAssetHost] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const groupedFindings = useMemo(() => {
    return Object.values(allFindings.reduce((acc, finding) => {
      const host = finding.host || 'Unknown Target';
      if (!acc[host]) {
        acc[host] = {
          host,
          type: finding.type,
          findings: []
        };
      }
      acc[host].findings.push(finding);
      return acc;
    }, {}));
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
              status: s.findings.length > 0 ? 'issue_found' : 'safe',
              severity: s.findings.length > 0 ? s.findings[0].severity : 'info',
              portsDetected: s.ports || []
            }));
            const allHstFindings = data.scans.flatMap(s => s.findings);
            
            // Avoid loop
            if (allFindings.length !== allHstFindings.length) {
              setAllFindings(allHstFindings);
              setMonitoredAssets(allAssets);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch scan history", err);
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
