import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth, setAccessToken } from '../utils/auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const StudentOnboarding = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [activeTab, setActiveTab] = useState('identity');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showTOS, setShowTOS] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [optimizationScore, setOptimizationScore] = useState(98);

    // Form Data State
    const [currentJob, setCurrentJob] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [preferredLocation, setPreferredLocation] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');

    // Validations
    const isIdentityComplete = targetRole.trim() !== '' && preferredLocation.trim() !== '';
    const isSkillsComplete = skills.length >= 3 && experienceLevel !== '';

    const toTitleCase = (str) =>
        str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());

    const handleAddSkill = (e) => {
        e.preventDefault();
        if (skillInput.trim() !== '' && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setSkills(skills.filter((s) => s !== skillToRemove));
    };

    const handleCompleteSkills = (e) => {
        e.preventDefault();
        if (isSkillsComplete) {
            setOptimizationScore(Math.floor(Math.random() * 5) + 95); // Random between 95 and 99
            setIsGenerating(true);
            setActiveTab('completion');
        }
    };

    useEffect(() => {
        let timer;
        if (isGenerating) {
            timer = setTimeout(() => setIsGenerating(false), 2500);
        }
        return () => clearTimeout(timer);
    }, [isGenerating]);

    const handleCompleteSetup = async () => {
        setSubmitting(true);
        setSubmitError('');
        try {
            const res = await fetchWithAuth(`${BACKEND_URL}/api/student/onboard`, {
                method: 'POST',
                body: JSON.stringify({
                    current_job: currentJob.trim() || undefined,
                    target_role: targetRole.trim(),
                    location: preferredLocation.trim(),
                    experience_level: experienceLevel,
                    current_skills: skills,
                }),
            });
            const data = await res.json();
            if (res.status === 201) {
                setAccessToken(data.accessToken);
                login(data.user, data.accessToken);
                navigate('/student/dashboard');
            } else {
                setSubmitError(data.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            setSubmitError('Network error. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const TOSModal = () => (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface">
                    <h2 className="font-headline text-2xl font-bold text-on-surface">Terms of Service</h2>
                    <button onClick={() => setShowTOS(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-8 overflow-y-auto font-body text-on-surface-variant text-sm space-y-6 flex-1">
                    <p className="text-sm"><strong>Last Updated:</strong> April 2026</p>
                    <h3 className="font-bold text-on-surface text-base">1. Acceptance of Terms</h3>
                    <p>By using the Smart Course Suggester, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
                    <h3 className="font-bold text-on-surface text-base">2. Data Collection and Privacy</h3>
                    <p>We take your privacy seriously. The information you provide during this onboarding process—including your Target Role, Preferred Location, and Skills—is securely stored in our database. This information is strictly used to customize your learning path, recommend appropriate courses, and connect you with relevant opportunities.</p>
                    <p>We do not sell your personal data to third parties. All stored data is encrypted and handled in compliance with standard security protocols.</p>
                    <h3 className="font-bold text-on-surface text-base">3. User Responsibilities</h3>
                    <p>You agree to provide accurate and up-to-date information. Establishing multiple accounts for the purpose of abusing the system or providing fraudulent information will result in the immediate termination of your profile.</p>
                    <h3 className="font-bold text-on-surface text-base">4. Service Availability</h3>
                    <p>We strive to ensure continuous access to the platform, but we reserve the right to modify, suspend, or discontinue the service (or any part thereof) at any time.</p>
                    <h3 className="font-bold text-on-surface text-base">5. Intellectual Property</h3>
                    <p>The content generated, including recommended curriculums and learning paths, is meant for your personal use. You may not reproduce, distribute, or commercially exploit any part of our service without written permission.</p>
                    <h3 className="font-bold text-on-surface text-base">6. Modifications</h3>
                    <p>We may update these terms from time to time. We will notify you of any major changes via the email associated with your account or through periodic in-app notifications.</p>
                </div>
                <div className="p-6 border-t border-outline-variant/20 bg-surface flex justify-end">
                    <button onClick={() => setShowTOS(false)} className="bg-primary hover:bg-primary-container text-white px-8 py-3 rounded-full font-bold text-sm shadow-md transition-colors cursor-pointer">
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface font-body text-on-surface overflow-x-hidden relative flex">
            {showTOS && <TOSModal />}

            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[100px] -right-[50px] w-[400px] h-[400px] bg-gradient-to-br from-primary-container to-primary rounded-[43%_57%_70%_30%/30%_45%_55%_70%] blur-[80px] opacity-15"></div>
                <div className="absolute -bottom-[200px] -left-[100px] w-[600px] h-[600px] bg-gradient-to-br from-secondary-container to-secondary rounded-full blur-[150px] opacity-10"></div>
                {activeTab === 'identity' && (
                    <>
                        <div className="absolute top-20 left-1/4 w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-secondary/10 rotate-12"></div>
                        <div className="absolute bottom-20 left-1/3 w-8 h-8 bg-tertiary/20 rounded-sm -rotate-12"></div>
                    </>
                )}
            </div>

            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-screen flex flex-col py-8 w-64 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900 z-50 select-none">
                <div className="px-8 mb-12">
                    <h1 className="font-headline text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Setup Profile</h1>
                    <p className="font-label text-xs text-on-surface-variant mt-1">
                        Step {activeTab === 'identity' ? '1' : activeTab === 'skills' ? '2' : '3'} of 3
                    </p>
                </div>
                <nav className="flex-1 px-4 space-y-2 cursor-default">
                    <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        activeTab === 'identity'
                            ? 'bg-primary text-white shadow-md transform scale-105'
                            : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        <span className="material-symbols-outlined">person</span>
                        <span className="font-manrope text-sm font-medium">Identity</span>
                    </div>
                    <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        activeTab === 'skills'
                            ? 'bg-primary text-white shadow-md transform scale-105'
                            : isIdentityComplete
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-300 dark:text-slate-600'
                    }`}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'skills' ? "'FILL' 1" : "" }}>psychology</span>
                        <span className="font-manrope text-sm font-medium">Skills</span>
                    </div>
                    <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        activeTab === 'completion'
                            ? 'bg-primary text-white shadow-md transform scale-105'
                            : (isIdentityComplete && isSkillsComplete)
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-300 dark:text-slate-600'
                    }`}>
                        <span className="material-symbols-outlined">check_circle</span>
                        <span className="font-manrope text-sm font-medium">Completion</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={`ml-64 relative z-10 flex-1 flex ${activeTab === 'identity' ? 'items-start justify-center min-h-screen px-6 pt-32' : 'px-12 lg:px-24 max-w-7xl mx-auto pt-24 pb-20'}`}>

                {/* 1. Identity View */}
                {activeTab === 'identity' && (
                    <div className="max-w-xl w-full">
                        <div className="mb-10">
                            <span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full mb-6">Step 01 / 03</span>
                            <h2 className="font-headline text-5xl font-extrabold text-on-surface leading-tight tracking-tighter mb-4">
                                Defining your <span className="text-secondary">Identity</span>
                            </h2>
                            <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
                                Tell us where you want to go. We'll tailor your learning path to match your target role and location.
                            </p>
                        </div>
                        <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0_20px_50px_rgba(44,47,49,0.06)] relative overflow-hidden">
                            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); if (isIdentityComplete) setActiveTab('skills'); }}>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold font-headline uppercase tracking-wider text-on-surface-variant ml-1">
                                        Current Job <span className="text-xs text-on-surface-variant/80 normal-case font-normal ml-1">(optional)</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="material-symbols-outlined absolute left-4 text-primary">badge</span>
                                        <input
                                            autoFocus
                                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition-all text-on-surface placeholder:text-outline-variant font-medium"
                                            placeholder="e.g., Computer Science Student"
                                            type="text"
                                            value={currentJob}
                                            onChange={(e) => setCurrentJob(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold font-headline uppercase tracking-wider text-on-surface-variant ml-1">
                                        Target Role <span className="text-error ml-0.5">*</span> <span className="text-xs text-on-surface-variant/80 normal-case font-normal ml-1">(be specific for better results)</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="material-symbols-outlined absolute left-4 text-primary">work</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition-all text-on-surface placeholder:text-outline-variant font-medium"
                                            placeholder="e.g., Senior Full-Stack React & Node.js Developer"
                                            type="text"
                                            value={targetRole}
                                            onChange={(e) => setTargetRole(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold font-headline uppercase tracking-wider text-on-surface-variant ml-1">
                                        Preferred Location <span className="text-error ml-0.5">*</span> <span className="text-xs text-on-surface-variant/80 normal-case font-normal ml-1">(currently limited to Indian cities)</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="material-symbols-outlined absolute left-4 text-primary">location_on</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition-all text-on-surface placeholder:text-outline-variant font-medium"
                                            placeholder="e.g., Mumbai"
                                            type="text"
                                            value={preferredLocation}
                                            onChange={(e) => setPreferredLocation(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center pt-6 justify-end">
                                    <button
                                        disabled={!isIdentityComplete}
                                        className={`group flex items-center gap-2 px-8 py-4 text-on-primary font-bold rounded-full shadow-lg transition-all ${
                                            isIdentityComplete
                                                ? 'bg-gradient-to-br from-primary to-primary-container hover:shadow-primary/20 active:scale-95 cursor-pointer'
                                                : 'bg-gray-400 cursor-not-allowed opacity-50'
                                        }`}
                                        type="submit"
                                    >
                                        Continue
                                        <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. Skills View */}
                {activeTab === 'skills' && (
                    <div className="grid grid-cols-12 gap-12 items-start w-full">
                        <div className="col-span-12 lg:col-span-5 space-y-8">
                            <header className="space-y-4">
                                <span className="px-4 py-1.5 bg-secondary-container text-on-secondary-fixed-variant text-[11px] font-bold uppercase tracking-wider rounded-full inline-block">
                                    Career Architecture
                                </span>
                                <h1 className="font-headline text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.1] text-on-surface">
                                    Define your <span className="text-secondary">expertise</span> landscape.
                                </h1>
                                <p className="text-lg text-on-surface-variant font-light max-w-md">
                                    Detail your professional status and technical competencies to tailor your learning journey and network connections.
                                </p>
                            </header>
                            <div className="bg-surface-container-low p-8 rounded-lg space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="font-headline text-4xl font-bold text-primary">2.4k</div>
                                    <div className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">Skills <br />Mapped Today</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-7">
                            <div className="space-y-6">
                                <div className="bg-surface-container-lowest p-10 rounded-lg shadow-[0_20px_50px_rgba(44,47,49,0.06)] border border-outline-variant/10">
                                    <form className="space-y-10" onSubmit={handleCompleteSkills}>

                                        {/* Experience Level */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                                                </div>
                                                <h3 className="font-headline text-xl font-bold">Experience Level</h3>
                                            </div>
                                            <div className="flex gap-3 flex-wrap">
                                                {[
                                                    { value: 'beginner', label: 'Beginner', sublabel: '0–2 yrs' },
                                                    { value: 'mid', label: 'Mid-level', sublabel: '2–5 yrs' },
                                                    { value: 'senior', label: 'Senior', sublabel: '5+ yrs' },
                                                ].map(({ value, label, sublabel }) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setExperienceLevel(value)}
                                                        className={`flex-1 py-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm text-center ${
                                                            experienceLevel === value
                                                                ? 'border-primary bg-primary/5 text-primary'
                                                                : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <div>{label}</div>
                                                        <div className="text-[10px] font-normal opacity-70 mt-0.5">{sublabel}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Skills Section */}
                                        <section className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                                    </div>
                                                    <h3 className="font-headline text-xl font-bold">Skills</h3>
                                                </div>
                                                <span className={`text-[11px] font-bold uppercase tracking-tighter ${skills.length >= 3 ? 'text-green-600' : 'text-on-surface-variant/60'}`}>
                                                    {skills.length >= 3 ? `${skills.length} added ✓` : `${skills.length}/3 minimum`}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                                {skills.map((skill, index) => (
                                                    <div key={index} className="flex items-center gap-2 bg-primary text-on-primary py-2 px-4 rounded-full text-sm font-semibold">
                                                        {skill}
                                                        <span onClick={() => handleRemoveSkill(skill)} className="material-symbols-outlined text-[16px] cursor-pointer hover:text-white/70 transition-colors">close</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={skillInput}
                                                    onChange={(e) => setSkillInput(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSkill(e); }}
                                                    className="flex-1 bg-surface-container-low border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary focus:ring-opacity-30 outline-none placeholder:text-outline/50 text-sm"
                                                    placeholder="Type a skill and press Enter"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddSkill}
                                                    className="bg-primary-container text-on-primary-container font-bold py-3 px-6 rounded-xl hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </section>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button type="button" onClick={() => setActiveTab('identity')} className="text-on-surface-variant font-bold text-sm hover:text-primary transition-colors flex items-center gap-2 cursor-pointer">
                                                <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!isSkillsComplete}
                                                className={`px-10 py-4 rounded-full font-bold text-sm transition-all ${
                                                    isSkillsComplete
                                                        ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_10px_30px_rgba(37,76,216,0.25)] hover:scale-[1.02] active:scale-95 cursor-pointer'
                                                        : 'bg-gray-400 text-on-primary cursor-not-allowed opacity-50'
                                                }`}
                                            >
                                                Next Step
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Completion View */}
                {activeTab === 'completion' && (
                    <div className="w-full flex items-center justify-center min-h-[70vh]">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className="w-16 h-16 border-4 border-surface-container-highest border-t-primary rounded-full animate-spin"></div>
                                <h2 className="font-headline text-2xl font-bold text-on-surface animate-pulse">Personalizing your profile...</h2>
                                <p className="text-on-surface-variant text-sm">Analyzing skills to recommend the best paths.</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-6xl animate-fade-in fade-in duration-500">
                                <header className="mb-12 text-center">
                                    <span className="bg-tertiary-container/30 text-on-tertiary-container px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">Final Review</span>
                                    <h1 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-4">
                                        Ready to <span className="text-secondary">Launch?</span>
                                    </h1>
                                    <p className="text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                                        Review your profile details below. Once confirmed, we'll tailor your personalized learning path and connect you with the right opportunities.
                                    </p>
                                </header>
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-lg p-8 shadow-[0_20px_50px_rgba(44,47,49,0.06)] relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                                        <div className="relative z-10">
                                            <h3 className="font-label text-on-surface-variant font-bold text-xs uppercase tracking-widest mb-6">Identity &amp; Focus</h3>
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-sm text-on-surface-variant mb-1">Target Role</p>
                                                    <p className="text-3xl font-headline font-bold text-on-surface">{toTitleCase(targetRole)}</p>
                                                </div>
                                                {currentJob.trim() !== '' && (
                                                    <div className="flex items-center gap-2 text-on-surface-variant">
                                                        <span className="material-symbols-outlined text-lg">badge</span>
                                                        <span className="font-medium">Currently: {toTitleCase(currentJob)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-on-tertiary-fixed-variant">
                                                    <span className="material-symbols-outlined text-lg">location_on</span>
                                                    <span className="font-medium">{preferredLocation}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-lg">trending_up</span>
                                                    <span className="font-medium capitalize">{experienceLevel} Level</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute -right-12 -bottom-12 opacity-10">
                                            <span className="material-symbols-outlined text-[200px]">person_search</span>
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-5 bg-primary-container/10 rounded-lg p-8 flex flex-col justify-center space-y-8">
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(44,47,49,0.06)]">
                                                <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-headline font-bold text-primary">{optimizationScore}%</p>
                                                <p className="text-sm font-label text-on-surface-variant">Profile Optimization</p>
                                            </div>
                                        </div>
                                        <div className="h-px bg-outline-variant/20 w-full"></div>
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(44,47,49,0.06)]">
                                                <span className="material-symbols-outlined text-secondary text-3xl">speed</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-headline font-bold text-secondary capitalize">
                                                    {experienceLevel === 'mid' ? 'Steady' : experienceLevel === 'senior' ? 'Expert' : 'Fast'} Track
                                                </p>
                                                <p className="text-sm font-label text-on-surface-variant">Learning Intensity</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 bg-surface-container-lowest rounded-lg p-8 shadow-[0_20px_50px_rgba(44,47,49,0.06)] border border-white">
                                        <h3 className="font-label text-on-surface-variant font-bold text-xs uppercase tracking-widest mb-6">Skill Inventory</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {skills.map((skill, index) => (
                                                <span key={index} className="px-5 py-2.5 bg-surface-container-low rounded-full text-sm font-semibold border border-outline-variant/10">{skill}</span>
                                            ))}
                                        </div>
                                        <div className="mt-10 flex items-center p-4 bg-surface rounded-xl">
                                            <div className="flex items-center gap-6">
                                                <span className="material-symbols-outlined text-primary">verified</span>
                                                <span className="text-sm font-medium -ml-3 tracking-wide">Technical Verification Ready</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {submitError && (
                                    <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm font-medium text-center">
                                        {submitError}
                                    </div>
                                )}

                                <footer className="mt-16 flex flex-col items-center">
                                    <div className="w-full h-px bg-surface-container-high mb-12"></div>
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <button
                                            onClick={() => setActiveTab('skills')}
                                            className="px-8 py-4 rounded-full font-bold text-on-surface-variant cursor-pointer hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            Back to Skills
                                        </button>
                                        <button
                                            onClick={handleCompleteSetup}
                                            disabled={submitting}
                                            className={`px-12 py-5 rounded-full text-on-primary font-headline font-bold text-lg flex items-center gap-3 transition-all group cursor-pointer ${
                                                submitting
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-br from-primary to-primary-container shadow-[0_20px_50px_rgba(44,47,49,0.06)] hover:scale-[1.02] active:scale-95'
                                            }`}
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    Complete Setup
                                                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-6 text-sm text-on-surface-variant font-label">
                                        By completing, you agree to our{' '}
                                        <button onClick={() => setShowTOS(true)} className="underline text-primary hover:text-primary-container transition-colors cursor-pointer">
                                            Terms of Service
                                        </button>.
                                    </p>
                                </footer>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentOnboarding;
