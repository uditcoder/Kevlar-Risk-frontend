import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';

export default function Modals() {
    const { selectedAssetHost, setSelectedAssetHost, modalHighestSeverity, modalFindings, toastMessage, setToastMessage, user } = useAppContext();
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState('');

    React.useEffect(() => {
        if (!selectedAssetHost) {
            setAiRecommendation('');
            setAiLoading(false);
            return;
        }

        if (modalFindings && modalFindings.length > 0) {
            if (modalFindings[0].aiRecommendation) {
                setAiRecommendation(modalFindings[0].aiRecommendation);
                setAiLoading(false);
            } else {
                // Automatically fetch for older scans
                fetchAiRecommendation();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAssetHost]);

    const fetchAiRecommendation = async () => {
        if (!modalFindings || modalFindings.length === 0) return;
        setAiLoading(true);
        setAiRecommendation('');
        try {
            const apiUrl = window.__ENV__?.API_BASE_URL;
            const res = await fetch(`${apiUrl}/api/auth/ai/recommendation`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('cg_token') || ''}`
                },
                body: JSON.stringify({ findings: modalFindings, target: selectedAssetHost })
            });
            const data = await res.json();
            if (res.ok) {
                setAiRecommendation(data.recommendation);
            } else {
                setToastMessage(`AI Error: ${data.error}`);
            }
        } catch (err) {
            setToastMessage('Failed to fetch AI recommendation');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <>

            <div id="scanPopupModal" className="hidden fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { }}></div>
                <div className="relative w-full max-w-md bg-[#0d101d] border border-blue-500/30 p-8 rounded-2xl shadow-2xl shadow-blue-900/20 transform transition-all text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-6 relative">
                        <svg className="w-10 h-10 absolute animate-spin-slow opacity-50" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15 30"></circle>
                        </svg>
                        <svg className="w-8 h-8 relative z-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Security Scan Initiated</h3>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Our engine is currently analyzing the target infrastructure for vulnerabilities, open ports, and misconfigurations. This usually takes 5-15 seconds.
                    </p>
                    <button onClick={() => document.getElementById('scanPopupModal')?.classList.add('hidden')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium py-2.5 px-4 rounded-xl transition-colors">
                        Run in Background
                    </button>
                </div>
            </div>

            <div id="incidentDetailModal" className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md overflow-y-auto ${selectedAssetHost ? '' : 'hidden'}`} onClick={() => setSelectedAssetHost(null)}>
                
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl items-stretch justify-center h-full max-h-[80vh]">
                    {/* RIGHT BOX: AI RECOMMENDATIONS (visually pushed to right using order-2) */}
                    <div className="relative w-full md:w-[45%] flex flex-col bg-[#0f0c16] border border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden order-2" onClick={e => e.stopPropagation()}>
                        <div className="p-6 overflow-y-auto custom-scrollbar relative h-full">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-80 text-purple-400">
                                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 relative">
                                        <svg className="w-10 h-10 absolute animate-spin-slow opacity-50" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15 30"></circle>
                                        </svg>
                                        <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold tracking-widest uppercase text-sm animate-pulse">AI is Thinking...</span>
                                </div>
                            ) : aiRecommendation ? (
                                <div className="text-sm leading-relaxed pr-2">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-inner">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        AI Remediation Plan
                                    </h4>
                                    
                                    {aiRecommendation.includes('### Issue') && aiRecommendation.includes('### Solution') ? (
                                        <div className="space-y-8">
                                            {aiRecommendation.split('### Issue').filter(block => block.trim()).map((block, idx) => {
                                                const parts = block.split('### Solution');
                                                const issueText = parts[0]?.trim();
                                                const solutionText = parts[1]?.trim();
                                                return (
                                                    <div key={idx} className="space-y-4">
                                                        {issueText && (
                                                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 shadow-inner">
                                                                <ReactMarkdown
                                                                    components={{
                                                                        h3: ({node, ...props}) => <h3 className="text-md font-bold text-red-400 mt-1 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>{props.children}</h3>,
                                                                        p: ({node, ...props}) => <p className="mb-3 last:mb-0 text-red-300/90" {...props} />,
                                                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                                                        li: ({node, ...props}) => <li className="text-red-300/90" {...props} />,
                                                                        strong: ({node, ...props}) => <strong className="font-bold text-red-200" {...props} />
                                                                    }}
                                                                >
                                                                    {`### Issue ${idx + 1}\n` + issueText}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                        {solutionText && (
                                                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                                                                <ReactMarkdown
                                                                    components={{
                                                                        h3: ({node, ...props}) => <h3 className="text-md font-bold text-emerald-400 mt-1 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>{props.children}</h3>,
                                                                        p: ({node, ...props}) => <p className="mb-3 last:mb-0 text-emerald-300/90 break-words" {...props} />,
                                                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                                                        li: ({node, ...props}) => <li className="text-emerald-300/90 break-words" {...props} />,
                                                                        code: ({node, inline, ...props}) => 
                                                                            inline ? <code className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded font-mono text-xs border border-emerald-500/30 break-words" {...props} /> : 
                                                                            <code className="block bg-[#05110a] text-emerald-400 p-4 rounded-xl border border-emerald-500/20 font-mono text-xs overflow-x-auto my-3 shadow-inner whitespace-pre-wrap break-words" {...props} />,
                                                                        pre: ({node, ...props}) => <pre className="m-0 p-0 bg-transparent overflow-x-auto whitespace-pre-wrap break-words max-w-full" {...props} />,
                                                                        strong: ({node, ...props}) => <strong className="font-bold text-emerald-200" {...props} />
                                                                    }}
                                                                >
                                                                    {`### Solution ${idx + 1}\n` + solutionText}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-5 mb-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-purple-200 mt-5 mb-2 border-b border-purple-500/20 pb-1" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-md font-bold text-purple-300 mt-4 mb-2" {...props} />,
                                                p: ({node, ...props}) => <p className="mb-3 last:mb-0 text-slate-300 break-words" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                                li: ({node, ...props}) => <li className="text-slate-300 break-words" {...props} />,
                                                code: ({node, inline, ...props}) => 
                                                    inline ? <code className="bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded font-mono text-xs border border-purple-500/30 break-words" {...props} /> : 
                                                    <code className="block bg-[#090b14] text-emerald-400 p-4 rounded-xl border border-white/10 font-mono text-xs overflow-x-auto my-3 shadow-inner whitespace-pre-wrap break-words" {...props} />,
                                                pre: ({node, ...props}) => <pre className="m-0 p-0 bg-transparent overflow-x-auto whitespace-pre-wrap break-words max-w-full" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                                            }}
                                        >
                                            {aiRecommendation}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-sm font-medium tracking-wide">No AI Plan Generated</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LEFT BOX: INCIDENT FINDINGS (visually pushed to left using order-1) */}
                    <div className="relative w-full md:w-[55%] flex flex-col bg-[#0d101d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden order-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12162a]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-white font-mono truncate max-w-md">{selectedAssetHost || 'Target'}</h3>
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">URL</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">Automated Perimeter Security & Compliance Audit Log</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono ${modalHighestSeverity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    modalHighestSeverity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        modalHighestSeverity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            modalHighestSeverity === 'low' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                }`}>{modalHighestSeverity} RISK</span>
                            <button onClick={() => setSelectedAssetHost(null)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-400 text-red-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto space-y-5 text-slate-200 text-xs custom-scrollbar">
                            <h4 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center justify-between">
                                Raw Findings
                                <span className="bg-blue-500/20 text-blue-400 text-[10px] uppercase font-mono px-3 py-1 rounded-full border border-blue-500/30">
                                    {modalFindings.length} Total
                                </span>
                            </h4>
                            
                            {modalFindings.map((finding, idx) => (
                                <div key={idx} className="bg-[#1a1423]/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${finding.severity === 'critical' ? 'bg-red-500' :
                                                    finding.severity === 'high' ? 'bg-orange-500' :
                                                        finding.severity === 'medium' ? 'bg-amber-500' :
                                                            finding.severity === 'low' ? 'bg-blue-500' : 'bg-slate-500'
                                                }`}></span>
                                            <span className="font-bold text-sm text-white font-mono">{idx + 1}. {finding.name}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${finding.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                finding.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                    finding.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        finding.severity === 'low' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>{finding.severity}</span>
                                    </div>
                                    <p className="text-slate-400 mb-3 leading-relaxed">{finding.description}</p>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Template ID</div>
                                            <div className="font-mono truncate" title={finding.templateId}>{finding.templateId}</div>
                                        </div>
                                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Protocol</div>
                                            <div className="font-mono truncate">{finding.type || 'http'}</div>
                                        </div>
                                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Matched At</div>
                                            <div className="font-mono text-emerald-400 truncate" title={finding.matchedAt}>{finding.matchedAt ? (finding.matchedAt.startsWith('http') ? new URL(finding.matchedAt).pathname : finding.matchedAt) : '/'}</div>
                                        </div>
                                        <div className="bg-[#12162a] p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Time</div>
                                            <div className="font-mono truncate">{finding.timestamp ? new Date(finding.timestamp).toLocaleTimeString() : 'Now'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
