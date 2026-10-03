import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import CryptoJS from 'crypto-js';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const name = searchParams.get('name');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requireOtp, setRequireOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (formData.password.length < 8 || !passwordRegex.test(formData.password)) {
      setError('Please fulfill all password criteria before submitting.');
      return;
    }

    setLoading(true);
    try {
      // Encrypt/hash the password payload before sending over the network
      const encryptedPasswordPayload = CryptoJS.SHA256(formData.password).toString(CryptoJS.enc.Hex);

      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/setup-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: encryptedPasswordPayload })
      });
      const data = await res.json();

      if (res.ok && data.requireOtp) {
        setRequireOtp(true);
        setToastMessage('OTP sent to your email. Please verify to complete setup.');
      } else if (res.ok) {
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    try {
      const encryptedPasswordPayload = CryptoJS.SHA256(formData.password).toString(CryptoJS.enc.Hex);

      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/setup-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: encryptedPasswordPayload, otp })
      });
      if (res.ok) {
        setToastMessage('Account setup successful! You can now log in.');
        navigate('/login');
      } else {
        setToastMessage('Please enter correct otp');
      }
    } catch (err) {
      setToastMessage('Please enter correct otp');
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
          requireOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">OTP</label>
                <input
                  type="text" required autoComplete="off" maxLength="6"
                  value={otp} onChange={e => setOtp(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 tracking-widest text-center text-lg"
                />
                <p className="text-xs text-slate-500 mt-2 text-center">We sent a 6-digit code to your email.</p>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Complete Setup'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {name && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text" disabled
                    value={name}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              )}
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={8}
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white">
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className={`flex items-center gap-1.5 ${formData.password?.length >= 8 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={formData.password?.length >= 8 ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(formData.password || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/[a-zA-Z]/.test(formData.password || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${/\d/.test(formData.password || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/\d/.test(formData.password || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one number
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[^a-zA-Z0-9]/.test(formData.password || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/[^a-zA-Z0-9]/.test(formData.password || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one special character
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'} required minLength={8}
                    value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white">
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-400">
                <input
                  type="checkbox" required
                  checked={formData.termsAccepted || false}
                  onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
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
                {loading ? 'Processing...' : 'Continue to Verification'}
              </button>
            </form>
          )
        ) : (
          <div className="text-center pt-4">
            <Link to="/login" className="text-purple-500 hover:underline">Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
