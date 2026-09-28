import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header className="h-18 border-b border-white/5 bg-[#0d101d]/60 backdrop-blur-xl px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex-1 max-w-xl hidden sm:block">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input type="text" placeholder="Search vulnerabilities, CVEs, IP addresses (Press '/')"
                        className="w-full bg-white/5 border border-white/5 text-slate-200 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono placeholder:text-slate-500 placeholder:font-sans" />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] text-slate-500 font-bold border border-white/10 px-1.5 py-0.5 rounded bg-white/5">/</span>
                    </div>
                </div> 
            </div>
 
            <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                    <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md shadow-indigo-500/20 cursor-pointer">
                        <div className="w-full h-full bg-[#0d101d] rounded-[10px] overflow-hidden flex items-center justify-center">
                            <img src="https://ui-avatars.com/api/?name=Admin&background=1a1f36&color=a78bfa&bold=true&font-size=0.4" alt="User" className="w-full h-full object-cover" />
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
