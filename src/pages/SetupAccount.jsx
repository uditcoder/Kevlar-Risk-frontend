import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setToastMessage } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing setup token. Please check your email link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      // Encrypt/hash the password payload before sending over the network
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(formData.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const encryptedPasswordPayload = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/setup-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: encryptedPasswordPayload })
      });
      const data = await res.json();
      
      if (res.ok) {
        setToastMessage('Account setup successful! You can now log in.');
        navigate('/login');
      } else {
        setError(`Setup failed: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to setup account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0c14] text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#0f111a] border border-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-white">Set Up Account</h2>
        <p className="text-center text-slate-400">Choose a secure password to activate your account</p>
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {token && !error?.includes('missing setup token') ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" disabled
                  value={email}
                  className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
              <input 
                type="password" required minLength={8}
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
              <input 
                type="password" required minLength={8}
                value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-400">
              <input 
                type="checkbox" required
                checked={formData.termsAccepted || false} 
                onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}
                className="w-4 h-4 rounded border-slate-700 bg-[#1a1d2d] text-purple-600 focus:ring-purple-500"
              />
              <span>
                I agree to the <a href="https://kevlardefense.com/terms-and-conditons/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">Terms and Conditions</a>
              </span>
            </label>
            <button 
              type="submit" disabled={loading}
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Activating...' : 'Activate Account'}
            </button>
          </form>
        ) : (
          <div className="text-center pt-4">
            <Link to="/login" className="text-purple-500 hover:underline">Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
