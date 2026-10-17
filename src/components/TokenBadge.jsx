import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function TokenBadge() {
    const { user } = useAppContext();
    const isSuperAdmin = user?.role === 'superadmin';
    const tokens = typeof user?.scanTokens === 'number' ? user?.scanTokens : 10;

    return (
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-sm backdrop-blur-md">
            <div className="w-5 h-5 rounded-lg bg-amber-400/15 flex items-center justify-center text-amber-400 text-xs shadow-inner">
                ⚡
            </div>
            <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Tokens:</span>
                {isSuperAdmin ? (
                    <span className="font-bold text-purple-300">Unlimited</span>
                ) : (
                    <span className="font-bold font-mono">
                        <span className={tokens > 3 ? 'text-emerald-400' : tokens > 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {tokens}
                        </span>
                        <span className="text-slate-500 font-normal">/10</span>
                    </span>
                )}
            </div>
        </div>
    );
}
