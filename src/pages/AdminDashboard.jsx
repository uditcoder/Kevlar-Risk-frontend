import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function AdminDashboard() {
  const { token, setToastMessage } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', companyName: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const apiUrl = window.__ENV__?.API_BASE_URL;

    try {
      const res = await fetch(`${apiUrl}/api/admin/onboard-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setToastMessage('User onboarded! Setup email has been sent.');
        setShowModal(false);
        setFormData({ name: '', companyName: '', phone: '', email: '' });
      } else {
        setToastMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setToastMessage('Failed to onboard user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Admin Dashboard - Onboard User</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-purple-600/20"
        >
          Add New User
        </button>
      </div>
      
      <div className="bg-[#0f111a] border border-slate-800 p-8 rounded-xl shadow-sm text-center">
        <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Manage Users</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Click the "Add New User" button above to send a setup invitation to a new team member or client.
        </p>
      </div>

      {/* Onboard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f111a] border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Onboard New User</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                  <input 
                    type="text" required
                    value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number (Optional)</label>
                  <input 
                    type="tel"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email" required
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="john@company.com"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Setup Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
