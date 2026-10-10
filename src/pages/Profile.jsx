import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import CryptoJS from 'crypto-js';

export default function Profile() {
    const { token } = useAppContext();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [showPasswords, setShowPasswords] = useState(false);
    
    // Security Tab State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityMsg, setSecurityMsg] = useState(null);

    // Access Control State
    const [grantName, setGrantName] = useState('');
    const [grantEmail, setGrantEmail] = useState('');
    const [grantDesignation, setGrantDesignation] = useState('');
    const [accessMsg, setAccessMsg] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [fetchingUsers, setFetchingUsers] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'access' && ['admin', 'superadmin'].includes(profileData?.role)) {
            const fetchUsers = async () => {
                setFetchingUsers(true);
                try {
                    const apiUrl = window.__ENV__?.API_BASE_URL || '';
                    const res = await fetch(`${apiUrl}/api/admin/users`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setAdminUsers(data.users.filter(u => u.parentAdminId === profileData.id));
                    }
                } catch (err) {
                    console.error('Failed to fetch admin users', err);
                } finally {
                    setFetchingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [activeTab, token, profileData]);

    const handleGrantAccess = async (e) => {
        e.preventDefault();
        setAccessMsg(null);
        try {
            const apiUrl = window.__ENV__?.API_BASE_URL || '';
            const res = await fetch(`${apiUrl}/api/admin/grant-access`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ name: grantName, email: grantEmail, designation: grantDesignation })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAccessMsg({ type: 'success', text: 'Access granted and setup email sent!' });
                setGrantName('');
                setGrantEmail('');
                setGrantDesignation('');
                // Refresh list
                const usersRes = await fetch(`${apiUrl}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
                const usersData = await usersRes.json();
                if (usersData.success) setAdminUsers(usersData.users.filter(u => u.parentAdminId === profileData.id));
            } else {
                setAccessMsg({ type: 'error', text: data.error || 'Failed to grant access' });
            }
        } catch (err) {
            setAccessMsg({ type: 'error', text: 'Network error occurred' });
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setSecurityMsg(null);
        if (newPassword !== confirmPassword) {
            setSecurityMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        try {
            // Hash old password
            const hashedOldPassword = CryptoJS.SHA256(oldPassword).toString(CryptoJS.enc.Hex);

            // Hash new password
            const hashedNewPassword = CryptoJS.SHA256(newPassword).toString(CryptoJS.enc.Hex);

            const apiUrl = window.__ENV__?.API_BASE_URL || '';
            const res = await fetch(`${apiUrl}/api/auth/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ oldPassword: hashedOldPassword, newPassword: hashedNewPassword })
            });

            const data = await res.json();
            
            if (!res.ok) {
                setSecurityMsg({ type: 'error', text: data.error || 'Failed to update password' });
                return;
            }

            setSecurityMsg({ type: 'success', text: 'Password successfully updated.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setSecurityMsg({ type: 'error', text: 'Network error. Please try again later.' });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4L4 8l8 4 8-4-8-4z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 12l8 4 8-4M4 16l8 4 8-4"/></svg>
                    Settings
                </h1>
                <p className="text-slate-400 text-sm ml-11">Update your account profile information and email address</p>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading profile...</div>
            ) : error ? (
                <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-lg">{error}</div>
            ) : profileData ? (
                <div className="glass-card rounded-2xl border border-white/5 bg-[#131729]/80 shadow-xl overflow-hidden">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-white/10 px-6">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                            Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                            Security
                        </button>
                        {['admin', 'superadmin'].includes(profileData?.role) && (
                            <button 
                                onClick={() => setActiveTab('access')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'access' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                Access Control
                            </button>
                        )}
                    </div>

                    <div className="p-8">
                        {activeTab === 'profile' && (
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                                        </div>
                                        <input type="text" readOnly value={profileData.name || 'Not provided'} className="w-full bg-white/5 border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                                        </div>
                                        <input type="email" readOnly value={profileData.email} className="w-full bg-white/5 border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Role</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                                        </div>
                                        <input type="text" readOnly value={profileData.role || 'Admin'} className="w-full bg-white/5 border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none capitalize" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-2xl">
                                {securityMsg && (
                                    <div className={`p-3 rounded-lg text-sm ${securityMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        {securityMsg.text}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                        </div>
                                        <input type={showPasswords ? "text" : "password"} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer">
                                            {showPasswords ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                        </div>
                                        <input type={showPasswords ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer">
                                            {showPasswords ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                        </div>
                                        <input type={showPasswords ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer">
                                            {showPasswords ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-500/25">
                                    Update Password
                                </button>
                            </form>
                        )}

                        {activeTab === 'access' && ['admin', 'superadmin'].includes(profileData?.role) && (
                            <div className="space-y-8">
                                <div className="bg-[#0f111a] border border-white/10 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-2">Grant Access / Invite Admin</h3>
                                    <p className="text-sm text-slate-400 mb-6">Specify the user's details below to grant access to your organization.</p>
                                    
                                    <form onSubmit={handleGrantAccess} className="space-y-6">
                                        {accessMsg && (
                                            <div className={`p-3 rounded-lg text-sm ${accessMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                {accessMsg.text}
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1.5 uppercase text-xs tracking-wider">Full Name</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                                                    </div>
                                                    <input type="text" required value={grantName} onChange={e => setGrantName(e.target.value)} placeholder="John Doe" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1.5 uppercase text-xs tracking-wider">Email Address</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                                                    </div>
                                                    <input type="email" required value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="john.doe@example.com" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1.5 uppercase text-xs tracking-wider">Designation</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>
                                                    </div>
                                                    <input type="text" required value={grantDesignation} onChange={e => setGrantDesignation(e.target.value)} placeholder="Security Director" className="w-full bg-[#0d101d] border border-white/10 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button type="submit" className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-500/25">
                                                Grant Access
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-xl font-bold text-white mb-4">Administrative Access List</h3>
                                    {fetchingUsers ? (
                                        <div className="flex justify-center p-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                        </div>
                                    ) : adminUsers.length === 0 ? (
                                        <div className="bg-[#0f111a] border border-white/10 rounded-xl p-8 text-center text-slate-400">
                                            No administrative users found.
                                        </div>
                                    ) : (
                                        <div className="bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                                                        <th className="px-6 py-4 font-medium">Name</th>
                                                        <th className="px-6 py-4 font-medium">Email</th>
                                                        <th className="px-6 py-4 font-medium">Designation</th>
                                                        <th className="px-6 py-4 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {adminUsers.map(user => (
                                                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-6 py-4 text-sm text-white font-medium">{user.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-300">{user.designation || '-'}</td>
                                                            <td className="px-6 py-4 text-sm">
                                                                {user.setupToken ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                        Pending Setup
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
