import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, setToastMessage } = useAppContext();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Encrypt/hash the password payload before sending over the network
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(formData.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const encryptedPasswordPayload = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: encryptedPasswordPayload })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        setToastMessage('Successfully logged in');
        navigate('/scanner');
      } else {
        setToastMessage(`Login failed: ${data.error}`);
      }
    } catch (err) {
      setToastMessage('Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0c14] text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#0f111a] border border-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-white">Kevlar Risk Login</h2>
        <p className="text-center text-slate-400">Enter your credentials to access the dashboard</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input 
              type="email" required
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input 
              type="password" required
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
