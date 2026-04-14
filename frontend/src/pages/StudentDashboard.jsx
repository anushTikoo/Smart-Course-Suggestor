import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../utils/auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function StudentDashboard() {
    const { logout } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [loadingPhase, setLoadingPhase] = useState('checking');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [coursesData, setCoursesData] = useState(null);

    const buildPathway = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLoadingPhase('checking');
        setProgress(5);

        try {
            // ── STEP 1: Check if a pathway already exists ──────────────────────
            const existingRes = await fetchWithAuth(`${BACKEND_URL}/api/student/pathway`);
            if (!existingRes.ok) throw new Error('Failed to check existing pathway.');

            const existingData = await existingRes.json();

            if (existingData.exists) {
                // Pathway already saved — skip everything and render directly
                setCoursesData(existingData.courses);
                setProgress(100);
                setLoading(false);
                return;
            }

            // ── STEP 2: Fetch profile data ─────────────────────────────────────
            setLoadingPhase('market');
            setProgress(10);

            let role = location.state?.targetRole;
            let currentLoc = location.state?.location;
            let existingSkills = location.state?.current_skills;
            let experienceLevel = location.state?.experience_level;
            let currentRole = location.state?.current_job;

            if (!role || !currentLoc || !existingSkills || !experienceLevel || !currentRole) {
                const profileRes = await fetchWithAuth(`${BACKEND_URL}/api/student/profile`);
                if (!profileRes.ok) {
                    throw new Error('Failed to retrieve profile information. You may need to redo onboarding.');
                }
                const profileData = await profileRes.json();
                role = role || profileData.target_role;
                currentLoc = currentLoc || profileData.location;
                existingSkills = existingSkills || profileData.current_skills || [];
                experienceLevel = experienceLevel || profileData.experience_level || 'beginner';
                currentRole = currentRole || profileData.current_job || 'None';
            }

            if (!role || !currentLoc) {
                throw new Error('Target role or location missing from profile.');
            }

            setProgress(30);

            // ── STEP 3: Job market analysis (mocked) ──────────────────────────
            // const query = `${role} jobs in ${currentLoc}`.trim();
            // const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=in&fields=job_description&date_posted=month`;
            // const options = {
            //     method: 'GET',
            //     headers: {
            //         'x-rapidapi-key': import.meta.env.VITE_JSEARCH_API_KEY,
            //         'x-rapidapi-host': 'jsearch.p.rapidapi.com'
            //     }
            // };
            // const response = await fetch(url, options);
            // if (!response.ok) throw new Error('Failed to analyze the job market.');
            // const result = await response.json();
            // const jobs = result.data.slice(0, 10);
            // const jobDescriptions = jobs.map(job => job.job_description).filter(Boolean);

            console.log('Skipping JSearch API to save credits, using mock data.');
            const mockDescription = `We are hiring a ${role} based in ${currentLoc}. Skills required include JavaScript, React.js, Node.js, MongoDB, Docker, Git, AWS, and TailwindCSS.`;
            const jobDescriptions = Array(10).fill(mockDescription);

            // ── STEP 4: Skill extraction (mocked) ─────────────────────────────
            // const skillsGenAiResponse = await ai.models.generateContent({ ... });
            // const skillsJson = JSON.parse(skillsGenAiResponse.text);

            const skillsJson = ['JavaScript', 'React.js', 'Node.js', 'MongoDB', 'Docker', 'Git', 'AWS', 'TailwindCSS'];
            console.log('Extracted Skills (MOCK):', skillsJson);

            // Save target skills to user_profile (unchanged endpoint)
            const saveSkillsRes = await fetchWithAuth(`${BACKEND_URL}/api/student/target-skills`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_skills: skillsJson }),
            });
            if (!saveSkillsRes.ok) {
                throw new Error('Failed to save your target skills to the database.');
            }

            // ── STEP 5: LLM course curation via OpenRouter + Firecrawl ─────────
            setLoadingPhase('courses');
            setProgress(80);

            const coursePrompt = `You are an expert learning curator.

TASK:
Given a list of target skills and user context, find the BEST online courses and arrange them into an ORDERED learning pathway.

INPUT:

* Target Skills: ${JSON.stringify(skillsJson)}
* Existing Skills: ${JSON.stringify(existingSkills)}
* Experience Level: ${experienceLevel}
* Current Role: ${currentRole}

GOAL:
Return a HIGH-QUALITY, NON-REDUNDANT, ORDERED set of courses that:

* Focuses on gaps between existing skills and target skills
* Matches the user's experience level
* Avoids unnecessary beginner content if the user is already experienced

INSTRUCTIONS:

1. GAP ANALYSIS (CRITICAL)

* Identify which target skills are NOT already covered by existing skills
* Prioritize courses that teach missing or weak areas
* Avoid recommending courses that heavily overlap with existing skills unless needed as prerequisites

2. PERSONALIZATION

* Adjust difficulty based on experience level:

  * Beginner → foundational courses
  * Intermediate → skip basics, focus on applied skills
  * Advanced → focus on depth, system design, real-world application
* Consider current role to make recommendations more relevant

3. CURATION STRATEGY

* Recommend real, existing courses from reputable platforms like Coursera, edX, YouTube, Pluralsight, MIT OpenCourseWare, and official docs.
* Prefer courses that cover MULTIPLE target skills.
* ENFORCE PLATFORM DIVERSITY: You MUST include courses from at least 3 DIFFERENT platforms.

4. QUALITY FILTERING (STRICT)
   Only include courses that meet MOST of these:

* High rating (≥ 4.3 if available)
* Significant number of reviews/enrollments
* Trusted platform or credible instructor
* Up-to-date and relevant
* Clear structured curriculum

5. COVERAGE LOGIC

* Map each course → which TARGET skills it covers
* Prefer fewer high-quality courses with broader coverage
* Ensure most target skills are covered overall

6. ORDERING (VERY IMPORTANT)

* Arrange courses in a logical learning sequence
* Respect prerequisites but SKIP unnecessary basics if user already knows them
* Assign each course a unique \`order_index\` starting from 1

7. DEDUPLICATION

* Do NOT include near-duplicate courses
* Max 3–8 courses total

8. OUTPUT FORMAT (STRICT JSON ONLY, NO EXTRA TEXT)

{
"courses": [
{
"order_index": 1,
"title": "Course Title",
"platform": "Platform Name",
"rating": "e.g. 4.6/5 or null",
"estimated_duration": "e.g. 10 hours / 6 weeks or null"
}
]
}

9. IMPORTANT CONSTRAINTS

* Ensure courses come from multiple different platforms.
* If rating or duration is not found, return null.
* Ensure \`order_index\` is strictly increasing (1, 2, 3...).
* Optimize for relevance, not quantity.

Now process the input and return the result.`;

            // Single OpenRouter call
            const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b:free',
                    messages: [{ role: 'user', content: coursePrompt }],
                    reasoning: { enabled: true },
                    response_format: { type: 'json_object' },
                    plugins: [{ id: 'response-healing' }],
                }),
            });

            if (!openRouterRes.ok) {
                const errBody = await openRouterRes.text();
                throw new Error(`OpenRouter API error: ${openRouterRes.status} — ${errBody}`);
            }

            const openRouterData = await openRouterRes.json();
            console.log('OpenRouter response:', JSON.stringify(openRouterData, null, 2));

            const rawContent = openRouterData.choices?.[0]?.message?.content ?? '';
            const contentStr = Array.isArray(rawContent)
                ? rawContent.filter(p => p.type === 'text').map(p => p.text).join('')
                : (rawContent ?? '');

            if (!contentStr || contentStr.trim() === '') {
                throw new Error('AI returned an empty response. Please try again.');
            }

            // Strip any remaining markdown fences (response-healing handles most cases)
            const rawCourseText = contentStr
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();
            const coursesJson = JSON.parse(rawCourseText);
            console.log('Extracted Courses (JSON):', coursesJson);

            // ── STEP 6: Persist the pathway to the DB ─────────────────────────
            setLoadingPhase('saving');
            setProgress(95);

            const pathwaySaveRes = await fetchWithAuth(`${BACKEND_URL}/api/student/pathway`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courses: coursesJson.courses }),
            });

            if (!pathwaySaveRes.ok) {
                throw new Error('Failed to save your learning pathway to the database.');
            }

            const pathwayData = await pathwaySaveRes.json();
            console.log('Pathway saved:', pathwayData);

            setCoursesData(pathwayData.courses);
            setProgress(100);

        } catch (err) {
            console.error('Pathway Build Error:', err);

            let errMsg = 'Failed to build your personalized career pathway.';
            if (err.message === 'Failed to analyze the job market.') {
                errMsg = err.message;
            } else if (err.message.includes('profile')) {
                errMsg = 'Unable to retrieve your profile. Please try again.';
            } else if (err.message.includes('pathway') || err.message.includes('AI')) {
                errMsg = err.message;
            }

            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [location.state]);

    useEffect(() => {
        buildPathway();
    }, [buildPathway]);

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        const phaseLabel = {
            checking: 'Checking your profile...',
            market: 'Analyzing job market...',
            courses: 'Curating learning pathway...',
            saving: 'Finalizing your profile...',
        };
        const phaseSubLabel = {
            checking: 'Looking for a saved pathway.',
            market: 'Searching for the best opportunities for you.',
            courses: 'Finding the best courses for your skills using real-time search.',
            saving: 'Saving your AI-curated pathway securely.',
        };

        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md px-6">
                    <div className="w-16 h-16 border-4 border-surface-container-highest border-t-primary rounded-full animate-spin"></div>
                    <h2 className="font-headline text-2xl font-bold text-on-surface animate-pulse text-center">
                        {phaseLabel[loadingPhase] ?? 'Loading...'}
                    </h2>
                    <p className="text-on-surface-variant text-sm text-center">
                        {phaseSubLabel[loadingPhase] ?? ''}
                    </p>
                    <div className="w-full bg-surface-container-highest rounded-full h-2.5 mt-8 overflow-hidden">
                        <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────────
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
                        onClick={buildPathway}
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

    // ── Dashboard ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-[100dvh] bg-surface text-on-surface px-6 py-12">
            <div className="max-w-4xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Your Learning Pathway</h1>
                        <p className="text-on-surface-variant text-sm mt-1">
                            AI-curated courses tailored to your target role
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="px-6 py-3 rounded-full text-on-primary font-headline font-bold text-sm flex items-center gap-2 transition-all group cursor-pointer bg-gradient-to-br from-primary to-primary-container shadow-[0_6px_20px_rgba(37,76,216,0.25)] hover:scale-[1.02] active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">logout</span>
                        Logout
                    </button>
                </div>

                {/* Course cards */}
                {coursesData && coursesData.length > 0 ? (
                    <div className="space-y-4">
                        {coursesData.map((course, idx) => {
                            // Open a Google search for the course
                            const targetHref = `https://www.google.com/search?q=${encodeURIComponent(`${course.title} ${course.platform || 'course'}`)}`;

                            return (
                                <div
                                    key={course.id ?? idx}
                                    className="bg-surface-container-low border border-surface-container-highest rounded-2xl p-6 flex flex-col sm:flex-row sm:items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Order badge */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                        {course.order_index ?? idx + 1}
                                    </div>

                                    {/* Course info */}
                                    <div className="flex-1 space-y-1">
                                        <a
                                            href={targetHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg font-semibold font-headline text-on-surface hover:text-primary transition-colors"
                                        >
                                            {course.title}
                                        </a>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1">
                                            {course.platform && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">school</span>
                                                    {course.platform}
                                                </span>
                                            )}
                                            {course.rating && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">star</span>
                                                    {course.rating}
                                                </span>
                                            )}
                                            {(course.duration ?? course.estimated_duration) && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    {course.duration ?? course.estimated_duration}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <a
                                        href={targetHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0 self-center px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition-colors"
                                    >
                                        Find Course
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-on-surface-variant text-center py-16">No courses found. Please try again.</p>
                )}
            </div>
        </div>
    );
}
