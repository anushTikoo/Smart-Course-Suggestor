import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../utils/auth';
import { GoogleGenAI } from '@google/genai';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function StudentDashboard() {
    const { logout } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [loadingPhase, setLoadingPhase] = useState('market');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [skillsFound, setSkillsFound] = useState(null);

    const fetchJobsFromMarket = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLoadingPhase('market');
        setProgress(10);

        try {
            let role = location.state?.targetRole;
            let currentLoc = location.state?.location;

            if (!role || !currentLoc) {
                const profileRes = await fetchWithAuth(`${BACKEND_URL}/api/student/profile`);
                if (!profileRes.ok) {
                    throw new Error("Failed to retrieve profile information. You may need to redo onboarding.");
                }
                const profileData = await profileRes.json();
                role = profileData.target_role;
                currentLoc = profileData.location;
            }

            if (!role || !currentLoc) {
                 throw new Error("Target role or location missing from profile.");
            }

            setProgress(30);

            const query = `${role} jobs in ${currentLoc}`.trim();
            const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=in&fields=job_description&date_posted=month`;

            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': import.meta.env.VITE_JSEARCH_API_KEY,
                    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error("Failed to analyze the job market.");
            }

            const result = await response.json();
            console.log('JSearch API Result:', result);

            if (!result || !result.data || result.data.length === 0) {
                throw new Error("No job descriptions found for this role and location.");
            }

            const jobs = result.data.slice(0, 10);
            const jobDescriptions = jobs.map(job => job.job_description).filter(Boolean);

            if (jobDescriptions.length === 0) {
                throw new Error("The retrieved jobs do not have valid descriptions.");
            }

            setLoadingPhase('skills');
            setProgress(70);
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

            const prompt = `Parse and extract the technical skills required for the jobs from the following job descriptions. These are from ${jobDescriptions.length} different job postings. Take the final union of all technical skills discovered across all these postings.

For this combined list of skills, strictly apply the following rules:
1. Count the number of job postings that mention each skill.
2. Drop any skill from this list if it is mentioned in fewer than 20% of the job postings (i.e., if its appearance count divided by ${jobDescriptions.length} is strictly less than 0.20).
3. Analyze the remaining skills for directly conflicting technologies or frameworks (e.g., React vs Angular, or MySQL vs PostgreSQL). If directly conflicting skills are found, keep ONLY the one with the higher appearance count and drop the alternatives.
4. Format the result as an array of objects.

Provide the final response explicitly as a single JSON. Provide just the name of the skills in the response. Example response: {JavaScript, React.js, Node.js, Git, Docker, AWS, MongoDB, Redis} Do not use markdown code block syntax around the JSON.\n\nJob Descriptions:\n${jobDescriptions.join('\n\n---\n\n')}`;

            // Switch to the specific preview model the user requested initially, bypassing 2.5 limits
            const genAiResponse = await ai.models.generateContent({
                model: "gemini-3.1-flash-lite-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const skillsJson = JSON.parse(genAiResponse.text);
            console.log("Extracted Skills Analysis (JSON):", skillsJson);

            setLoadingPhase('saving');
            setProgress(90);

            const saveRes = await fetchWithAuth(`${BACKEND_URL}/api/student/target-skills`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_skills: skillsJson.skills || skillsJson })
            });

            if (!saveRes.ok) {
                throw new Error("Failed to securely save your target skills to the database.");
            }

            setSkillsFound(skillsJson);
            setProgress(100);

        } catch (err) {
            console.error('Extraction Process Error:', err);

            let errMsg = "Failed to build your personalized career pathway.";

            // If it's a specific JSearch error the user already renamed
            if (err.message === "Failed to analyze the job market.") {
                errMsg = err.message;
            } else if (err.message.includes("profile")) {
                errMsg = "Unable to retrieve your profile. Please try again.";
            }

            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [location.state]);

    useEffect(() => {
        fetchJobsFromMarket();
    }, [fetchJobsFromMarket]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md px-6">
                    <div className="w-16 h-16 border-4 border-surface-container-highest border-t-primary rounded-full animate-spin"></div>
                    <h2 className="font-headline text-2xl font-bold text-on-surface animate-pulse text-center">
                        {loadingPhase === 'market' ? 'Analyzing job market...' : loadingPhase === 'saving' ? 'Finalizing your profile...' : 'Analyzing required skills...'}
                    </h2>
                    <p className="text-on-surface-variant text-sm text-center">
                        {loadingPhase === 'market'
                            ? 'Searching for the best opportunities for you.'
                            : loadingPhase === 'saving'
                            ? 'Adding AI analytics securely to your student profile.'
                            : 'Using AI to map technical requirements from the listings.'}
                    </p>
                    <div className="w-full bg-surface-container-highest rounded-full h-2.5 mt-8 overflow-hidden">
                        <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
                <div className="bg-surface-container-low p-10 rounded-2xl max-w-lg w-full shadow-lg border border-error/20 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">error</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-headline font-bold text-on-surface mb-3">Analysis Interrupted</h2>
                        <p className="text-on-surface-variant font-body text-sm leading-relaxed">{error}</p>
                    </div>
                    <button
                        onClick={fetchJobsFromMarket}
                        className="mt-6 px-10 py-4 w-full rounded-full text-on-primary font-headline font-bold text-sm bg-primary hover:bg-primary-container shadow-md transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={logout}
                        className="text-on-surface-variant text-sm cursor-pointer hover:text-primary transition-colors mt-2"
                    >
                        Logout
                    </button>
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
