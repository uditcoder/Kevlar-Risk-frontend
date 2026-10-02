import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Sidebar() {
    const { allFindings, user, logout } = useAppContext();
    const [isMonitorOpen, setIsMonitorOpen] = React.useState(false);

    return (
        <aside className="w-64 xl:w-72 bg-[#0d101d]/95 border-r border-white/5 flex flex-col justify-between p-5 min-h-screen shrink-0 sticky top-0 h-screen z-30">
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div>
                            <div className="text-sm font-extrabold tracking-tight flex items-center gap-1.5 text-white">
                                {window.__ENV__?.APP_NAME} <span className="text-[10px] text-purple-400 font-mono font-semibold">Ar</span>
                            </div>
                            {/* <div className="text-[11px] text-slate-400 font-medium">Attack Surface OS</div> */}
                        </div>
                    </div>
                </div>


                <nav className="space-y-1 text-xs font-semibold">
                    <NavLink to="/" className={({ isActive }) => `sidebar-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-transparent ${isActive ? 'active text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span>Dashboard</span>
                    </NavLink>

                    <div className="space-y-1">
                        <button onClick={() => setIsMonitorOpen(!isMonitorOpen)} className="sidebar-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white border border-transparent hover:bg-white/5 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                <span>Monitor</span>
                            </div>
                            <svg className={`w-3 h-3 text-slate-500 transition-transform ${isMonitorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div id="monitor-dropdown" className={`pl-10 pr-3 py-1 space-y-1 ${isMonitorOpen ? '' : 'hidden'}`}>
                            <NavLink to="/scanner/web" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Web URL</NavLink>
                            <NavLink to="/scanner/vpn" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>VPN</NavLink>
                            <NavLink to="/scanner/ip" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Public IP</NavLink>
                            <NavLink to="/scanner/status" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                Status &amp; Titles
                            </NavLink>

                            <NavLink to="/scanner/dns" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                CNAME &amp; DNS
                            </NavLink>
                            <NavLink to="/scanner/hosts" className={({ isActive }) => `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                Host Discovery
                            </NavLink>
                        </div>
                    </div>

                    <NavLink to="/incidents" className={({ isActive }) => `sidebar-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-transparent ${isActive ? 'active text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span>Incident Section</span>
                        </div>
                        {allFindings.length > 0 && (
                            <span className="text-[10px] mono bg-red-950/60 text-red-300 border border-red-800/60 px-1.5 py-0.5 rounded-full font-bold">{allFindings.length}</span>
                        )}
                    </NavLink>

                    <NavLink to="/profile" className={({ isActive }) => `sidebar-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-transparent ${isActive ? 'active text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span>Settings</span>
                        </div>
                    </NavLink>

                    {user?.role === 'admin' && (
                        <NavLink to="/admin" className={({ isActive }) => `sidebar-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-transparent ${isActive ? 'active text-white bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span>Onboard User</span>
                        </NavLink>
                    )}
                </nav>
            </div>

            <div className="mt-auto pt-6">
                <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-sm uppercase">
                        {user?.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-medium text-white truncate">{user?.email}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
                    </div>
                </div>
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/10 hover:border-red-500/20">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
