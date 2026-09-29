import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function GlobalToast() {
    const { toastMessage, setToastMessage } = useAppContext();

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage, setToastMessage]);

    if (!toastMessage) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-[#1a1f36] border border-emerald-500/30 shadow-2xl shadow-emerald-900/20 rounded-xl p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    {toastMessage.toLowerCase().includes('error') || toastMessage.toLowerCase().includes('failed') || toastMessage.toLowerCase().includes('please enter correct otp') ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    )}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">{toastMessage}</h4>
                </div>
                <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white ml-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
    );
}
