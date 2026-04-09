import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
    const { logout } = useAuth();

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-surface text-on-surface space-y-8">
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <button
                onClick={logout}
                className="px-10 py-4 rounded-full text-on-primary font-headline font-bold text-sm flex items-center gap-3 transition-all group cursor-pointer bg-gradient-to-br from-primary to-primary-container shadow-[0_10px_30px_rgba(37,76,216,0.25)] hover:scale-[1.02] active:scale-95"
            >
                <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">logout</span>
                Logout
            </button>
        </div>
    );
}
