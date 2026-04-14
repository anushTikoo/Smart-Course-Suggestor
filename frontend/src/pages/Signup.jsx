import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectPath } from '../utils/auth';

export default function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!isLogin) {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (res.status === 201) {
                    login(data.user, data.accessToken); // update AuthContext immediately
                    navigate(getRedirectPath(data.user));
                } else {
                    setError(data.error || 'Registration failed. Please try again.');
                }
            } catch (err) {
                setError('Could not connect to the server. Please try again.');
            } finally {
                setLoading(false);
            }
        } else {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // receives HTTP-only refresh token cookie
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (res.status === 200) {
                    login(data.user, data.accessToken); // update AuthContext immediately
                    navigate(getRedirectPath(data.user));
                } else {
                    setError(data.error || 'Login failed. Please try again.');
                }
            } catch (err) {
                setError('Could not connect to the server. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="bg-surface text-on-surface min-h-[100dvh] overflow-x-hidden flex items-center justify-center relative px-6 py-4 md:py-8 font-body">

            {/* Playful Geometric Background Shapes */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Floating Circles */}
                <div className="absolute w-64 h-64 rounded-full bg-primary-container/20 -top-20 -left-20 opacity-60 -z-10"></div>
                <div className="absolute w-48 h-48 rounded-full bg-secondary-container/30 bottom-1/4 -right-12 opacity-60 -z-10"></div>
                <div className="absolute w-32 h-32 rounded-full bg-tertiary-container/40 top-1/3 left-1/4 opacity-60 -z-10"></div>

                {/* Triangles / Polygons */}
                <div className="absolute w-40 h-40 bg-primary/10 rotate-12 top-1/4 -right-10 opacity-60 -z-10" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <div className="absolute w-56 h-56 bg-secondary/10 -rotate-45 bottom-10 left-10 opacity-60 -z-10" style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}></div>
                <div className="absolute w-24 h-24 bg-tertiary/20 top-10 right-1/3 opacity-60 -z-10" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>

                {/* Rectangles */}
                <div className="absolute w-32 h-64 bg-primary-fixed/20 rotate-[30deg] -bottom-20 right-1/4 rounded-xl opacity-60 -z-10"></div>
                <div className="absolute w-72 h-16 bg-surface-variant/40 -rotate-12 top-1/2 -left-20 rounded-full opacity-60 -z-10"></div>

                {/* Additional floating shapes */}
                <div className="absolute top-10 left-[10%] w-32 h-32 bg-[#FFD93D] rotate-12 opacity-40 -z-10" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <div className="absolute top-1/2 -right-10 w-40 h-40 bg-[#4D96FF] opacity-30 -z-10" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}></div>
                <div className="absolute bottom-20 left-[5%] w-48 h-48 bg-[#6BCB77] rounded-full opacity-40 -z-10"></div>
                <div className="absolute top-[15%] right-[15%] w-24 h-24 bg-[#FF6B6B] -rotate-45 opacity-30 -z-10"></div>
                <div className="absolute bottom-40 right-[10%] w-36 h-36 bg-[#F472B6] opacity-30 -z-10" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#A78BFA] rotate-6 opacity-20 -z-10 rounded-3xl"></div>
                <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-[#58e7ab]/20 rounded-full blur-3xl -z-20"></div>
            </div>

            {/* Main Content Wrapper */}
            <div className="relative z-10 w-full max-w-md">
                {/* Header Section */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl mb-1 font-headline">
                        {isLogin ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-on-surface-variant font-medium">
                        {isLogin ? 'Please enter your details to sign in.' : 'Join our learning community today.'}
                    </p>
                </div>

                {/* Central Card */}
                <div className="bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(44,47,49,0.06)] p-6 md:p-8 border border-surface-variant/20">
                    <form action="#" className="space-y-4" method="POST" onSubmit={handleSubmit}>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold tracking-wide text-on-surface-variant uppercase px-1 font-label" htmlFor="username">Email Id</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                </div>
                                <input
                                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-on-surface"
                                    id="username"
                                    name="username"
                                    placeholder="johndoe@gmail.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold tracking-wide text-on-surface-variant uppercase px-1 font-label" htmlFor="password">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                </div>
                                <input
                                    className="w-full pl-11 pr-12 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-on-surface"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline-variant hover:text-outline transition-colors cursor-pointer" type="button">
                                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <p className="text-sm text-error font-medium text-center">{error}</p>
                        )}

                        {/* Primary CTA */}
                        <button
                            className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-full text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-5">
                        <div aria-hidden="true" className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-variant/30"></div>
                        </div>
                        <div className="relative flex justify-center text-sm font-medium">
                            <span className="bg-surface-container-lowest px-4 text-on-surface-variant">or continue with</span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <button
                        type="button"
                        onClick={() => window.location.href = `${BACKEND_URL}/api/auth/google`}
                        className="w-full py-3 px-4 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold rounded-full flex items-center justify-center gap-3 transition-colors cursor-pointer border border-outline-variant"
                    >
                        <img alt="Google Logo" className="w-5 h-5" src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" />
                        <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
                    </button>
                </div>

                {/* Toggle Login/Signup */}
                <p className="mt-5 text-center text-on-surface-variant font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary font-bold hover:underline underline-offset-4 ml-1"
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </div>

            {/* Background Decoration Image (Bottom Right) */}
            <div className="fixed bottom-0 right-0 w-1/3 h-1/3 pointer-events-none opacity-20 hidden md:block">
                <img
                    className="w-full h-full object-cover rounded-tl-[10rem]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQMRxL8QWDcLYOpKZI47_QyuHimAekgfCZpcoxUaP2FdawGZYX4olCqawFTi5IcAykKt2G7nbmAVagPtfewWOLHZ9oQNCLE8q1VLTJFgxOtcCTv0rQaagBNsimT6Lus-Yd_-SWrWGUZ01-JzhxcSVbRnsdhfMQrA7j8XqUCGy2YlPCywMJx6Zmii88Sz6FxMN-yTlxNCZgn5VwIeEcsTsjEcpP4_yNdu2q4wrI_MLhbj1o-BbejJi82O3v22Nvtc8MPeQnQWpeQ34X"
                    alt="Students studying"
                    style={{ maskImage: 'linear-gradient(to top left, black, transparent)', WebkitMaskImage: 'linear-gradient(to top left, black, transparent)' }}
                />
            </div>
        </div>
    );
}