import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header className="h-18 border-b border-white/5 bg-[#0d101d]/60 backdrop-blur-xl px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex-1 max-w-xl hidden sm:block">
                {/* Search removed as per user request */}
            </div>

            <div className="flex items-center gap-4 ml-auto">
                {/* Avatar removed as per user request */}
            </div>
        </header>
    );
}
