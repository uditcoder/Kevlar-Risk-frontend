import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header className="h-18 border-b border-white/5 bg-[#0d101d]/60 backdrop-blur-xl px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex-1 max-w-xl hidden sm:block">
                {/* Search removed as per user request */}
            </div>
 
            <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                    <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md shadow-indigo-500/20 cursor-pointer">
                        <div className="w-full h-full bg-[#0d101d] rounded-[10px] overflow-hidden flex items-center justify-center">
                            <img src="https://ui-avatars.com/api/?name=Admin&background=1a1f36&color=a78bfa&bold=true&font-size=0.4" alt="User" className="w-full h-full object-cover" />
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
