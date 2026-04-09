import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../utils/auth';

export default function SelectRole() {
    const [selectedRole, setSelectedRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const handleContinue = async () => {
        if (!selectedRole) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${BACKEND_URL}/api/user/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: selectedRole }),
            });

            const data = await res.json();

            if (res.status === 200) {
                // Backend returns a new access token with the updated role
                login(data.user, data.accessToken);
                if (selectedRole === 'student') navigate('/student/onboarding');
                else if (selectedRole === 'mentor') navigate('/mentor/onboarding');
            } else {
                setError(data.error || 'Failed to update role. Please try again.');
            }
        } catch (err) {
            setError('Could not connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface text-on-surface min-h-[100dvh] overflow-x-hidden flex items-center justify-center relative px-6 py-4 md:py-8 font-body">
            {/* Playful Geometric Background Shapes */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute w-64 h-64 rounded-full bg-primary-container/20 -top-20 -left-20 opacity-60 -z-10"></div>
                <div className="absolute w-48 h-48 rounded-full bg-secondary-container/30 bottom-1/4 -right-12 opacity-60 -z-10"></div>
                <div className="absolute w-32 h-32 rounded-full bg-tertiary-container/40 top-1/3 left-1/4 opacity-60 -z-10"></div>

                {/* Dots Pattern */}
                <div className="absolute inset-0 opacity-[0.03] -z-20" style={{ backgroundImage: 'radial-gradient(#2c2f31 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
            </div>

            <div className="w-full max-w-3xl z-10 relative">
                {/* Header */}
                <div className="text-center mb-10 md:mb-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-3 font-display">
                        Please select your role to continue
                    </h2>
                </div>

                {/* Main Card */}
                <div className="bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(44,47,49,0.06)] p-6 md:p-10 border border-surface-variant/20">

                    {/* Role Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        {/* Student Card */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole('student')}
                            className={`group relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden
                                ${selectedRole === 'student'
                                    ? 'border-primary bg-primary/10 shadow-[0_10px_30px_rgba(37,76,216,0.15)] scale-[1.02]'
                                    : 'border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5'
                                }
                            `}
                        >
                            {selectedRole === 'student' && (
                                <div className="absolute top-4 right-4 text-primary animate-in fade-in zoom-in duration-200">
                                    <span className="material-symbols-outlined filled text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </div>
                            )}

                            <div className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center transition-all duration-300
                                ${selectedRole === 'student' ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg shadow-primary/30' : 'bg-primary/10 text-primary/80 group-hover:bg-primary/20 group-hover:text-primary group-hover:shadow-md group-hover:shadow-primary/20'}
                            `}>
                                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                            </div>

                            <h3 className="text-2xl font-bold text-on-surface mb-2">Student</h3>
                            <p className="text-on-surface-variant text-center text-sm px-4">
                                Learn, explore courses, and connect with experienced mentors.
                            </p>
                        </button>

                        {/* Mentor Card */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole('mentor')}
                            className={`group relative flex flex-col items-center p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden
                                ${selectedRole === 'mentor'
                                    ? 'border-tertiary bg-tertiary/10 shadow-[0_10px_30px_rgba(167,139,250,0.15)] scale-[1.02]'
                                    : 'border-tertiary/20 bg-tertiary/5 hover:border-tertiary/40 hover:bg-tertiary/10 hover:scale-[1.01] hover:shadow-lg hover:shadow-tertiary/5'
                                }
                            `}
                        >
                            {selectedRole === 'mentor' && (
                                <div className="absolute top-4 right-4 text-tertiary animate-in fade-in zoom-in duration-200">
                                    <span className="material-symbols-outlined filled text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </div>
                            )}

                            <div className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center transition-all duration-300
                                ${selectedRole === 'mentor' ? 'bg-gradient-to-br from-tertiary to-tertiary-container text-white shadow-lg shadow-tertiary/30' : 'bg-tertiary/10 text-tertiary/80 group-hover:bg-tertiary/20 group-hover:text-tertiary group-hover:shadow-md group-hover:shadow-tertiary/20'}
                            `}>
                                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>co_present</span>
                            </div>

                            <h3 className="text-2xl font-bold text-on-surface mb-2">Mentor</h3>
                            <p className="text-on-surface-variant text-center text-sm px-4">
                                Share your knowledge, guide students, and manage your courses.
                            </p>
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <p className="text-sm text-error font-medium text-center mb-4">{error}</p>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleContinue}
                            disabled={!selectedRole || loading}
                            className={`
                                w-full md:w-auto min-w-[240px] py-4 px-8 rounded-full font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2
                                ${selectedRole
                                    ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] cursor-pointer'
                                    : 'bg-surface-variant text-outline opacity-60 cursor-not-allowed'
                                }
                            `}
                        >
                            {loading ? 'Processing...' : 'Continue'}
                            {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}