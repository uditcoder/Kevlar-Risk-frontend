import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Profile() {
    const { token } = useAppContext();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const apiUrl = window.__ENV__?.API_BASE_URL || '';
                const res = await fetch(`${apiUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) throw new Error('Failed to fetch profile details');
                
                const data = await res.json();
                setProfileData(data.user);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                My Profile
            </h1>

            {loading ? (
                <div className="text-slate-400">Loading profile...</div>
            ) : error ? (
                <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-lg">{error}</div>
            ) : profileData ? (
                <div className="glass-card p-8 rounded-2xl border border-white/5 bg-[#131729]/80 shadow-xl flex flex-col md:flex-row gap-8 items-start">
                    
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-lg shadow-purple-500/25 shrink-0 uppercase">
                        {profileData.email?.[0] || 'U'}
                    </div>

                    <div className="flex-1 w-full space-y-6">
                        <div>
                            <div className="text-sm font-medium text-slate-400 mb-1">Full Name</div>
                            <div className="text-xl font-semibold text-white">{profileData.name || 'Not provided'}</div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="text-sm font-medium text-slate-400 mb-1">Email Address</div>
                                <div className="text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-3">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                    {profileData.email}
                                </div>
                            </div>
                            
                            <div>
                                <div className="text-sm font-medium text-slate-400 mb-1">Company Name</div>
                                <div className="text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-3">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                    {profileData.companyName || 'Not provided'}
                                </div>
                            </div>
                            
                            <div>
                                <div className="text-sm font-medium text-slate-400 mb-1">Phone Number</div>
                                <div className="text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-3">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                    {profileData.phone || 'Not provided'}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-slate-400 mb-1">Role / Access</div>
                                <div className="text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg flex items-center gap-3 capitalize">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                    {profileData.role}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
