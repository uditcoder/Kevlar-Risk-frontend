import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Modals from '../components/Modals';

export default function MainLayout() {
    return (
        <div className="min-h-screen flex bg-[#0a0c14] text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                <div className="p-6 sm:p-8 space-y-8 flex-1">
                    <Outlet />
                </div>
            </main>
            <Modals />
        </div>
    );
}
