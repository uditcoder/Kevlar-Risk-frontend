import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, setToastMessage } = useAppContext();
  const navigate = useNavigate();

  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotData, setForgotData] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleForgotRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email })
      });
      if (res.ok) {
        setToastMessage('OTP sent to your email');
        setForgotStep(2);
      } else {
        const data = await res.json();
        setToastMessage(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setToastMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyAndReset = async (e) => {
    e.preventDefault();
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      setToastMessage('Passwords do not match');
      return;
    }
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (forgotData.newPassword.length < 8 || !passwordRegex.test(forgotData.newPassword)) {
      setToastMessage('Please fulfill all password criteria before submitting.');
      return;
    }
    setLoading(true);
    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(forgotData.newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const encryptedPasswordPayload = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const apiUrl = window.__ENV__?.API_BASE_URL;
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email, otp: forgotData.otp, password: encryptedPasswordPayload })
      });
      if (res.ok) {
        setToastMessage('Password reset successful! You can now log in.');
        setIsForgot(false);
        setForgotStep(1);
        setForgotData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
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
        <h2 className="text-3xl font-bold text-center text-white">{window.__ENV__?.APP_NAME} Login</h2>
        <p className="text-center text-slate-400">Enter your credentials to access the dashboard</p>
        {isForgot ? (
          forgotStep === 1 ? (
            <form onSubmit={handleForgotRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email" required
                  value={forgotData.email} onChange={e => setForgotData({ ...forgotData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsForgot(false)} className="text-sm text-purple-400 hover:text-purple-300">
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotVerifyAndReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">OTP</label>
                <input
                  type="text" required autoComplete="off" maxLength="6"
                  value={forgotData.otp} onChange={e => setForgotData({ ...forgotData, otp: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 tracking-widest text-center text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={forgotData.newPassword} onChange={e => setForgotData({ ...forgotData, newPassword: e.target.value })}
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
                  <div className={`flex items-center gap-1.5 ${forgotData.newPassword?.length >= 8 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={forgotData.newPassword?.length >= 8 ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(forgotData.newPassword || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/[a-zA-Z]/.test(forgotData.newPassword || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${/\d/.test(forgotData.newPassword || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/\d/.test(forgotData.newPassword || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one number
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[^a-zA-Z0-9]/.test(forgotData.newPassword || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={/[^a-zA-Z0-9]/.test(forgotData.newPassword || '') ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}></path></svg>
                    At least one special character
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'} required
                    value={forgotData.confirmPassword} onChange={e => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
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
              <button
                type="submit" disabled={loading}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                type="email" required
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-[#1a1d2d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required
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
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-slate-400 hover:text-purple-400">
                Forgot Password?
              </button>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
