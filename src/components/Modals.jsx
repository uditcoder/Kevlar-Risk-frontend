import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';

function parseFindingRemediation(rawText) {
    if (!rawText) return { issue: '', steps: [], raw: '' };

    let clean = rawText.replace(/```markdown/gi, '').replace(/```/g, '').trim();

    let issue = '';
    let solutionRaw = '';

    const issueMatch = clean.match(/###?\s*issue[:\s]*([\s\S]*?)(?=###?\s*solution|$)/i);
    const solutionMatch = clean.match(/###?\s*solution[:\s]*([\s\S]*)$/i);

    if (issueMatch && issueMatch[1]) {
        issue = issueMatch[1].trim();
    }
    if (solutionMatch && solutionMatch[1]) {
        solutionRaw = solutionMatch[1].trim();
    }

    if (!issue && !solutionRaw) {
        solutionRaw = clean;
    }

    const rawLines = solutionRaw.split('\n');
    const steps = [];
    let currentStep = null;

    for (let rawLine of rawLines) {
        const line = rawLine.trim();
        if (!line) continue;

        const stepHeaderMatch = line.match(/^(?:[-*•]|\d+[\.\)])\s+(.*)/);

        if (stepHeaderMatch) {
            if (currentStep) {
                steps.push(currentStep);
            }
            currentStep = {
                title: stepHeaderMatch[1].trim(),
                details: []
            };
        } else if (currentStep) {
            currentStep.details.push(line);
        } else {
            currentStep = {
                title: line,
                details: []
            };
        }
    }
    if (currentStep) {
        steps.push(currentStep);
    }

    return { issue, steps, raw: clean };
}

export default function Modals() {
    const { selectedAssetHost, setSelectedAssetHost, modalHighestSeverity, modalFindings, toastMessage, setToastMessage, user, token } = useAppContext();
    const [scanStageIndex, setScanStageIndex] = useState(0);
    const [scanPercent, setScanPercent] = useState(24);
    const [activeFinding, setActiveFinding] = useState(null);
    const [remediationCache, setRemediationCache] = useState({});
    const [copied, setCopied] = useState(false);
    const [modalPage, setModalPage] = useState(1);
    const modalPageSize = 25;

    // Claude AI Threat Intelligence state (merged into unified view)
    const [claudeIntel, setClaudeIntel] = useState(null);
    const [claudeIntelCache, setClaudeIntelCache] = useState({});
    const [loadingIntel, setLoadingIntel] = useState(false);
    const [showAttackChain, setShowAttackChain] = useState(false);

    useEffect(() => {
        setModalPage(1);
        setActiveFinding(null);
        setShowAttackChain(false);

        if (!selectedAssetHost) {
            setClaudeIntel(null);
            return;
        }

        // Check if preloaded in findings or cached
        const preloaded = modalFindings.find(f => f.aiIntelligence)?.aiIntelligence || claudeIntelCache[selectedAssetHost];
        if (preloaded) {
            setClaudeIntel(preloaded);
            setLoadingIntel(false);
        } else if (token) {
            // Automatically fetch simultaneously in background
            fetchClaudeIntelAuto(selectedAssetHost);
        } else {
            setClaudeIntel(null);
        }
    }, [selectedAssetHost]);

    const fetchClaudeIntelAuto = async (hostTarget, force = false) => {
        if (!force && claudeIntelCache[hostTarget]) {
            setClaudeIntel(claudeIntelCache[hostTarget]);
            return;
        }
        setLoadingIntel(true);
        try {
            const apiUrl = window.__ENV__?.API_BASE_URL || "http://localhost:3001";
            const livePorts = Array.from(new Set(modalFindings.flatMap(f => f.portsDetected || [])));
            const res = await fetch(`${apiUrl}/api/auth/ai/target-intelligence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    target: hostTarget,
                    findings: modalFindings,
                    ports: livePorts
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.intelligence) {
                setClaudeIntel(data.intelligence);
                setClaudeIntelCache(prev => ({ ...prev, [hostTarget]: data.intelligence }));
            }
        } catch (err) {
            console.error('Claude auto-load error:', err);
        } finally {
            setLoadingIntel(false);
        }
    };

    const totalModalPages = Math.max(1, Math.ceil(modalFindings.length / modalPageSize));
    const paginatedModalFindings = useMemo(() => {
        const start = (modalPage - 1) * modalPageSize;
        return modalFindings.slice(start, start + modalPageSize);
    }, [modalFindings, modalPage, modalPageSize]);

    const handleOpenFindingRemediation = async (finding, idx) => {
        const cacheKey = `${selectedAssetHost}_${finding.templateId || finding.name}_${idx}`;
        const cachedRemediation = remediationCache[cacheKey];

        if (cachedRemediation) {
            setActiveFinding({
                finding,
                index: idx,
                remediation: cachedRemediation,
                loading: false,
                error: null
            });
            return;
        }

        setActiveFinding({
            finding,
            index: idx,
            remediation: null,
            loading: true,
            error: null
        });

        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/auth/ai/finding-remediation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    finding,
                    target: selectedAssetHost,
                    index: idx
                })
            });

            const data = await res.json();
            if (res.ok && data.success && data.remediation) {
                setRemediationCache(prev => ({ ...prev, [cacheKey]: data.remediation }));
                setActiveFinding(prev => prev && prev.index === idx ? {
                    ...prev,
                    remediation: data.remediation,
                    loading: false,
                    error: null
                } : prev);
            } else {
                setActiveFinding(prev => prev && prev.index === idx ? {
                    ...prev,
                    loading: false,
                    error: data.error || 'Failed to generate remediation plan'
                } : prev);
            }
        } catch (err) {
            setActiveFinding(prev => prev && prev.index === idx ? {
                ...prev,
                loading: false,
                error: err.message || 'Failed to contact remediation service'
            } : prev);
        }
    };

    const scanStages = [
        "ANALYZING MILLIONS OF RECORDS...",
        "QUERYING DEEP WEB & BREACH SOURCES...",
        "PROBING EXPOSED NETWORK SERVICES...",
        "CHECKING CVE EXPLOIT SIGNATURES...",
        "SYNTHESIZING THREAT TELEMETRY..."
    ];

    React.useEffect(() => {
        const interval = setInterval(() => {
            setScanStageIndex(prev => (prev + 1) % scanStages.length);
            setScanPercent(prev => {
                if (prev >= 94) return 94;
                return prev + Math.floor(Math.random() * 8) + 4;
            });
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <>

            {/* SCANNING PROGRESS MODAL */}
            <div id="scanPopupModal" className="hidden fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div 
                    className="absolute inset-0 bg-black/70 backdrop-blur-md" 
                    onClick={() => document.getElementById('scanPopupModal')?.classList.add('hidden')}
                />
                
                <div className="relative w-full max-w-sm bg-[#0d101d] border border-white/10 p-7 rounded-2xl shadow-2xl shadow-purple-950/40 text-center">
                    
                    {/* Close 'X' Button */}
                    <button
                        type="button"
                        onClick={() => document.getElementById('scanPopupModal')?.classList.add('hidden')}
                        className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Cyber Security Protection Visual */}
                    <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-2xl bg-indigo-500/15 blur-md animate-pulse" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-purple-500/20">
                            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <h3 id="scanPopupTitle" className="text-lg font-bold text-white tracking-wide">
                        Scanning Deep Web
                    </h3>
                    <p id="scanPopupSubtitle" className="text-xs text-slate-400 mt-1">
                        Analyzing millions of records...
                    </p>

                    {/* Continuous Cyber Loader Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#141829] border border-white/5 overflow-hidden relative my-5">
                        <div className="absolute top-0 bottom-0 w-2/5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full shadow-[0_0_12px_rgba(99,102,241,0.9)] animate-cyber-sweep" />
                    </div>

                    {/* Run in Background Button */}
                    <button
                        type="button"
                        onClick={() => document.getElementById('scanPopupModal')?.classList.add('hidden')}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/25 active:scale-[0.98] cursor-pointer"
                    >
                        Run in Background
                    </button>
                </div>
            </div>

            {/* RAW FINDINGS & AI REMEDIATION SPLIT SCREEN MODAL */}
            <div 
                id="incidentDetailModal" 
                className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden ${selectedAssetHost ? '' : 'hidden'}`} 
                onClick={() => { setSelectedAssetHost(null); setActiveFinding(null); }}
            >
                <div 
                    className={`relative w-full flex flex-col md:flex-row gap-5 items-stretch transition-all duration-300 ${
                        activeFinding ? 'max-w-7xl h-[90vh]' : 'max-w-5xl h-[88vh]'
                    }`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* LEFT / MAIN PANEL: UNIFIED CLAUDE AI + NUCLEI ASSESSMENT */}
                    <div className={`relative flex flex-col bg-[#0d101d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
                        activeFinding ? 'w-full md:w-1/2 h-full' : 'w-full h-full'
                    }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#12162a] shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-bold text-white font-mono truncate max-w-[200px] sm:max-w-xs">{selectedAssetHost || 'Target'}</h3>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            {(() => {
                                                const primary = modalFindings[0] || {};
                                                const assetType = (primary.assetType || '').toLowerCase();
                                                const tags = Array.isArray(primary.tags) ? primary.tags : [];
                                                const templateId = (primary.templateId || '').toLowerCase();
                                                const name = (primary.name || '').toLowerCase();
                                                if (assetType === 'hosts' || tags.includes('hosts') || tags.includes('subfinder') || templateId.includes('host') || name.includes('subdomain')) return 'HOST DISCOVERY';
                                                if (assetType === 'ports' || tags.includes('port-scan') || tags.includes('naabu') || templateId.includes('open-port')) return 'PORT SCAN';
                                                if (assetType === 'dns' || tags.includes('dnsx') || tags.includes('dns') || tags.includes('cname')) return 'DNS RESOLUTION';
                                                if (assetType === 'status' || tags.includes('httpx') || templateId.includes('http-status')) return 'HTTP STATUS';
                                                if (assetType === 'vpn') return 'VPN';
                                                if (assetType === 'ip') return 'IP';
                                                return 'WEB URL';
                                            })()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">Perimeter Security & Audit Findings</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono ${modalHighestSeverity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        modalHighestSeverity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                            modalHighestSeverity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                modalHighestSeverity === 'low' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>{modalHighestSeverity} RISK</span>
                                
                                {!activeFinding && (
                                    <button 
                                        onClick={() => { setSelectedAssetHost(null); setActiveFinding(null); }} 
                                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-400 text-red-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* MERGED CONTENT: CLAUDE AI INTELLIGENCE + NUCLEI FINDINGS */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-slate-200 text-xs custom-scrollbar">
                            {/* 1. CLAUDE AI SECURITY THREAT ASSESSMENT (TOP CARD) */}
                            {loadingIntel ? (
                                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center gap-3 animate-pulse">
                                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs text-purple-300 font-medium">Analyzing attack paths, exploitability, and security posture...</span>
                                </div>
                            ) : claudeIntel ? (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/25 via-[#13172c] to-[#0d0f1b] border border-purple-500/30 shadow-md space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 font-mono">
                                                Threat Assessment
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* <div className="text-right">
                                                <span className="text-[9px] text-slate-400 uppercase font-mono">Risk Score: </span>
                                                <strong className="text-sm font-bold text-white font-mono">{claudeIntel.riskScore || 50}/100</strong>
                                            </div> */}
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                                claudeIntel.riskRating === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                                                claudeIntel.riskRating === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                                                claudeIntel.riskRating === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                                                'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                            }`}>
                                                {claudeIntel.riskRating || 'MODERATE'}
                                            </span>

                                            {claudeIntel.attackChain && claudeIntel.attackChain.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAttackChain(prev => !prev)}
                                                    className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span>Attack Chain ({claudeIntel.attackChain.length})</span>
                                                    <svg className={`w-3 h-3 transition-transform ${showAttackChain ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Executive Summary */}
                                    <p className="text-slate-200 text-xs leading-relaxed">
                                        {claudeIntel.executiveSummary}
                                    </p>

                                    {/* Expandable Attack Chain & Threat Actor Simulation */}
                                    {showAttackChain && (
                                        <div className="pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                                            {/* Attack Chain Steps */}
                                            {Array.isArray(claudeIntel.attackChain) && claudeIntel.attackChain.length > 0 && (
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 font-mono">
                                                        Adversary Attack Chain Steps:
                                                    </span>
                                                    <div className="space-y-1.5">
                                                        {claudeIntel.attackChain.map((step, sIdx) => (
                                                            <div key={sIdx} className="p-2.5 rounded-lg bg-[#0e1224] border border-white/5 flex items-start gap-2.5 text-xs">
                                                                <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                                                    {step.step || sIdx + 1}
                                                                </span>
                                                                <div>
                                                                    <div className="font-bold text-white text-[11px] text-purple-200">{step.phase}</div>
                                                                    <div className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{step.description}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Threat Actor Perspective */}
                                            {claudeIntel.threatActorPerspective && (
                                                <div className="p-3 rounded-lg bg-[#0e1224] border border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                                                        Threat Actor Perspective:
                                                    </span>
                                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                                        {claudeIntel.threatActorPerspective}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Blindspots & Priorities */}
                                            {Array.isArray(claudeIntel.topPriorities) && claudeIntel.topPriorities.length > 0 && (
                                                <div className="p-3 rounded-lg bg-[#0e1224] border border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                                                        Immediate Priorities:
                                                    </span>
                                                    <ul className="space-y-1">
                                                        {claudeIntel.topPriorities.map((item, pIdx) => (
                                                            <li key={pIdx} className="text-slate-300 text-[11px] flex items-start gap-1.5">
                                                                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* 2. NUCLEI DISCOVERED FINDINGS & CVES */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white pb-2 border-b border-white/10 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        Discovered Vulnerabilities & Findings
                                    </span>
                                    <span className="bg-purple-500/20 text-purple-300 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border border-purple-500/30">
                                        {modalFindings.length} Total
                                    </span>
                                </h4>

                                {paginatedModalFindings.map((finding, pIdx) => {
                                    const globalIdx = (modalPage - 1) * modalPageSize + pIdx;
                                    const isCurrentActive = activeFinding && activeFinding.index === globalIdx;
                                    return (
                                        <div 
                                            key={globalIdx} 
                                            className={`rounded-xl p-4 transition-all duration-200 border ${
                                                isCurrentActive 
                                                    ? 'bg-purple-900/20 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40' 
                                                    : 'bg-[#1a1423]/30 border-white/5 hover:border-white/15'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${finding.severity === 'critical' ? 'bg-red-500' :
                                                            finding.severity === 'high' ? 'bg-orange-500' :
                                                                finding.severity === 'medium' ? 'bg-amber-500' :
                                                                    finding.severity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                                                        }`}></span>
                                                    <span className="font-bold text-sm text-white font-mono truncate">{globalIdx + 1}. {finding.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Individual Remediation Plan Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenFindingRemediation(finding, globalIdx)}
                                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all duration-200 shadow-sm cursor-pointer active:scale-95 group ${
                                                            isCurrentActive 
                                                                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' 
                                                                : 'bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-purple-600/30 hover:from-purple-600 hover:to-indigo-600 border-purple-500/40 hover:border-purple-300 text-purple-200 hover:text-white'
                                                        }`}
                                                        title="View remediation plan for this finding on split screen"
                                                    >
                                                        <svg className={`w-3.5 h-3.5 transition-colors ${isCurrentActive ? 'text-white' : 'text-purple-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        Remediation Plan
                                                    </button>
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono ${finding.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            finding.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                                finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                                    finding.severity === 'low' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                        }`}>{finding.severity}</span>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 mb-3 leading-relaxed text-xs">{finding.description}</p>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                                <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Template ID</div>
                                                    <div className="font-mono truncate text-[11px]" title={finding.templateId}>{finding.templateId}</div>
                                                </div>
                                                <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Protocol</div>
                                                    <div className="font-mono truncate text-[11px]">{finding.type || 'http'}</div>
                                                </div>
                                                <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Matched At</div>
                                                    <div className="font-mono text-emerald-400 truncate text-[11px]" title={finding.matchedAt}>{finding.matchedAt ? (finding.matchedAt.startsWith('http') ? new URL(finding.matchedAt).pathname : finding.matchedAt) : '/'}</div>
                                                </div>
                                                <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Time</div>
                                                    <div className="font-mono truncate text-[11px]">{finding.timestamp ? new Date(finding.timestamp).toLocaleTimeString() : 'Now'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Modal Pagination Bar */}
                                {totalModalPages > 1 && (
                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                        <span>
                                            Showing <strong className="text-white">{(modalPage - 1) * modalPageSize + 1}</strong> - <strong className="text-white">{Math.min(modalPage * modalPageSize, modalFindings.length)}</strong> of <strong className="text-white">{modalFindings.length}</strong>
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setModalPage(p => Math.max(1, p - 1))}
                                                disabled={modalPage === 1}
                                                className="px-2.5 py-1 rounded bg-[#12162a] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-white font-mono"
                                            >
                                                Prev
                                            </button>
                                            <span className="px-2 font-mono text-slate-300">
                                                {modalPage} / {totalModalPages}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setModalPage(p => Math.min(totalModalPages, p + 1))}
                                                disabled={modalPage === totalModalPages}
                                                className="px-2.5 py-1 rounded bg-[#12162a] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-white font-mono"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: AI REMEDIATION POPUP (SPLIT SCREEN) */}
                    {activeFinding && (
                        <div className="relative w-full md:w-1/2 h-full flex flex-col bg-[#0d101d] border border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/20 bg-[#12162a] shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-white tracking-wide">Remediation Plan</h3>
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                                Finding #{activeFinding.index + 1}
                                            </span>
                                        </div>
                                        <p className="text-xs text-purple-300/80 font-mono truncate max-w-sm mt-0.5">
                                            {activeFinding.finding.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border font-mono ${
                                        activeFinding.finding.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        activeFinding.finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        activeFinding.finding.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                        activeFinding.finding.severity === 'low' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                    }`}>
                                        {activeFinding.finding.severity}
                                    </span>
                                    {/* Close button for split screen */}
                                    <button 
                                        onClick={() => setActiveFinding(null)} 
                                        title="Close Remediation Plan panel"
                                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-400 text-red-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Meta strip */}
                            <div className="px-5 py-2 bg-[#090b14] border-b border-white/5 flex items-center gap-4 text-[11px] text-slate-400 flex-wrap shrink-0">
                                <span className="font-mono text-slate-300"><strong>Target:</strong> {selectedAssetHost}</span>
                                {activeFinding.finding.templateId && <span className="font-mono"><strong>Template:</strong> {activeFinding.finding.templateId}</span>}
                                {activeFinding.finding.matchedAt && <span className="font-mono text-emerald-400 truncate max-w-xs"><strong>Endpoint:</strong> {activeFinding.finding.matchedAt}</span>}
                            </div>

                            {/* Body */}
                            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-slate-200 text-xs">
                                {activeFinding.loading ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-purple-400 space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative shadow-lg shadow-purple-500/10">
                                            <svg className="w-8 h-8 absolute animate-spin opacity-50" fill="none" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15 30"></circle>
                                            </svg>
                                            <svg className="w-6 h-6 animate-pulse text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <span className="font-bold tracking-widest uppercase text-xs text-purple-200 block animate-pulse">
                                                Synthesizing Remediation Plan...
                                            </span>
                                            <span className="text-[11px] text-purple-400/70 mt-1 block">
                                                Evaluating exploit signature and formulating fix
                                            </span>
                                        </div>
                                    </div>
                                ) : activeFinding.error ? (
                                    <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <p className="text-red-300 font-medium">{activeFinding.error}</p>
                                        <button
                                            onClick={() => handleOpenFindingRemediation(activeFinding.finding, activeFinding.index)}
                                            className="px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold border border-red-500/30 cursor-pointer"
                                        >
                                            Retry Remediation Plan
                                        </button>
                                    </div>
                                ) : activeFinding.remediation ? (() => {
                                    const parsed = parseFindingRemediation(activeFinding.remediation);
                                    return (
                                        <div className="space-y-5">
                                            {/* ISSUE CARD */}
                                            {parsed.issue && (
                                                <div className="rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/5 to-transparent border border-red-500/25 p-4 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 font-mono">
                                                            Vulnerability Impact & Risk
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-200 leading-relaxed font-normal pl-3 border-l-2 border-red-500/40">
                                                        {parsed.issue}
                                                    </p>
                                                </div>
                                            )}

                                            {/* SOLUTION SECTION */}
                                            {parsed.steps.length > 0 ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
                                                                Remediation Steps
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                                                            {parsed.steps.length} {parsed.steps.length === 1 ? 'Step' : 'Numbered Steps'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2.5 pt-1">
                                                        {parsed.steps.map((step, sIdx) => (
                                                            <div 
                                                                key={sIdx} 
                                                                className="flex items-start gap-3 p-3.5 rounded-xl bg-[#111526] border border-white/10 hover:border-emerald-500/30 transition-all duration-200 shadow-sm"
                                                            >
                                                                {/* Number Badge */}
                                                                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                                                                    {sIdx + 1}
                                                                </div>

                                                                {/* Step Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-semibold text-slate-100 leading-relaxed">
                                                                        {step.title}
                                                                    </p>

                                                                    {/* Details / Ciphers / Code Snippets */}
                                                                    {step.details.length > 0 && (
                                                                        <div className="mt-2 p-2.5 rounded-lg bg-[#070914] border border-emerald-500/20 font-mono text-[11px] text-emerald-300 space-y-1 overflow-x-auto shadow-inner select-all">
                                                                            {step.details.map((detail, dIdx) => (
                                                                                <div key={dIdx} className="leading-relaxed">
                                                                                    {detail}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Fallback to styled ReactMarkdown */
                                                <ReactMarkdown
                                                    components={{
                                                        h1: ({node, ...props}) => <h1 className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-purple-500/20" {...props} />,
                                                        h2: ({node, ...props}) => <h2 className="text-sm font-bold text-purple-200 mt-4 mb-2" {...props} />,
                                                        h3: ({node, ...props}) => <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-4 mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />{props.children}</h3>,
                                                        p: ({node, ...props}) => <p className="mb-3 text-slate-300 leading-relaxed text-xs" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="space-y-2.5 my-3 pl-4 list-decimal text-slate-200 font-medium" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="space-y-2.5 my-3 pl-4 list-decimal text-slate-200 font-medium" {...props} />,
                                                        li: ({node, ...props}) => <li className="leading-relaxed text-xs text-slate-200" {...props} />,
                                                        code: ({node, inline, ...props}) => 
                                                            inline ? <code className="bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded font-mono text-[11px] border border-purple-500/30" {...props} /> : 
                                                            <code className="block bg-[#050711] text-emerald-400 p-3 rounded-xl border border-emerald-500/20 font-mono text-[11px] overflow-x-auto my-3 whitespace-pre-wrap leading-relaxed shadow-inner" {...props} />
                                                    }}
                                                >
                                                    {activeFinding.remediation}
                                                </ReactMarkdown>
                                            )}

                                            {/* Copy Button */}
                                            <div className="pt-3 mt-4 border-t border-white/10 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500 font-mono">Attack Surface Remediation Advisor</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(activeFinding.remediation);
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                                                >
                                                    {copied ? (
                                                        <>
                                                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                            <span className="text-emerald-400">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                            <span>Copy Plan</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })() : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
