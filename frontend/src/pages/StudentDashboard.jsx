import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
    const { logout } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    const targetRole = location.state?.targetRole || 'Target Role';
    const preferredLocation = location.state?.location || '';

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const query = `${targetRole} jobs in ${preferredLocation}`.trim();
                const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=in&fields=job_description&date_posted=month`;

                const options = {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': '24868228efmshd028931894a0306p1cfc33jsnbea608bbd289',
                        'x-rapidapi-host': 'jsearch.p.rapidapi.com'
                    }
                };

                const response = await fetch(url, options);
                const result = await response.json();
                console.log('JSearch API Result:', result);
            } catch (error) {
                console.error('Error fetching jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [targetRole, preferredLocation]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 border-4 border-surface-container-highest border-t-primary rounded-full animate-spin"></div>
                    <h2 className="font-headline text-2xl font-bold text-on-surface animate-pulse">Finding perfect roles...</h2>
                    <p className="text-on-surface-variant text-sm">Searching for the best opportunities for you.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-surface text-on-surface space-y-8">
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl text-center mb-8">
                Results have been loaded successfully. Please check your browser's console to review the API response!
            </p>
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
