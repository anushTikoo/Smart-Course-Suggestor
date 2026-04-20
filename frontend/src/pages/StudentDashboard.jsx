import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: '', platform: '', duration: '', rating: '' });

    // Map Canvas State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [activeCourseId, setActiveCourseId] = useState(null);
    const pathRef = useRef(null);
    const [pathLength, setPathLength] = useState(0);
    const [showMasteryPopup, setShowMasteryPopup] = useState(false);

    // Calculate SVG Path length when loaded
    useEffect(() => {
        if (pathRef.current) {
            setPathLength(pathRef.current.getTotalLength());
        }
    }, [coursesData]);

    // Custom wider nodes mapping for map paths
    const NODE_POSITIONS = [
        { x: 500, y: 700 },
        { x: 750, y: 480 },
        { x: 1000, y: 350 },
        { x: 1250, y: 100 },
        { x: 1500, y: -80 },
        { x: 1750, y: -150 },
        { x: 2000, y: -250 },
        { x: 2300, y: -150 },
        { x: 2550, y: 50 },
        { x: 2750, y: 200 },
    ];

    const handlePointerDown = (e) => {
        if (e.target.closest('.interactive-element')) return;
        setIsDraggingMap(true);
        setDragStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        try { e.target.setPointerCapture(e.pointerId); } catch(err){}
    };
    const handlePointerMove = (e) => {
        if (!isDraggingMap) return;
        setPan({ x: e.clientX - dragStartPos.x, y: e.clientY - dragStartPos.y });
    };
    const handlePointerUp = (e) => {
        setIsDraggingMap(false);
        try { e.target.releasePointerCapture(e.pointerId); } catch(err){}
    };

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

            // ── STEP 3: Job market analysis via JSearch API ────────────────────
            setLoadingPhase('market');
            const query = `${role} jobs in ${currentLoc}`.trim();
            const jsearchUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=in&fields=job_description&date_posted=month&num_pages=1`;
            console.log('JSearch query:', query);

            const jsearchRes = await fetch(jsearchUrl, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': import.meta.env.VITE_JSEARCH_API_KEY,
                    'x-rapidapi-host': 'jsearch.p.rapidapi.com',
                },
            });

            if (!jsearchRes.ok) {
                throw new Error('Failed to analyze the job market. Please try again.');
            }

            const jsearchData = await jsearchRes.json();
            console.log('JSearch raw response:', jsearchData);

            const jobs = (jsearchData.data || []).slice(0, 10);
            console.log(`Found ${jobs.length} job listings.`);

            const jobDescriptions = jobs
                .map(job => job.job_description)
                .filter(Boolean);

            if (jobDescriptions.length === 0) {
                throw new Error('No job listings found for your role and location. Try adjusting your profile.');
            }

            console.log('Job descriptions extracted:', jobDescriptions.length);
            setProgress(55);

            // ── STEP 4: Skill extraction via LLM ──────────────────────────────
            setLoadingPhase('skills');
            const skillsPrompt = `You are a technical skill extraction expert.

TASK:
Analyze the following job descriptions and extract the key TECHNICAL skills that are frequently required.

JOB DESCRIPTIONS:
${jobDescriptions.map((d, i) => `[Job ${i + 1}]:\n${d.substring(0, 800)}`).join('\n\n')}

RULES:
- Only extract TECHNICAL skills (programming languages, frameworks, tools, platforms, databases, concepts)
- Do NOT include soft skills (communication, teamwork, leadership etc.)
- Deduplicate — list each skill only once
- FREQUENCY FILTERING (CRITICAL): ONLY include a skill if it is explicitly mentioned in at least 20% of the provided job descriptions. Do NOT include niche or rarely mentioned skills.
- CONFLICT RESOLUTION (CRITICAL): Identify mutually exclusive or competing technologies that serve the identical purpose (e.g., React.js vs Angular, Vue vs React, AWS vs Azure, MySQL vs PostgreSQL). If multiple conflicting technologies are present, ONLY keep the ONE that is most frequently requested across the jobs. NEVER include multiple conflicting/competing frameworks or platforms in the final list.
- Return between 8 and 20 skills
- Use the most common industry name for each skill (e.g. "React.js" not "React JS")

OUTPUT FORMAT (STRICT JSON ONLY, NO EXTRA TEXT):
{ "skills": ["Skill1", "Skill2", ...] }`;

            console.log('Sending skill extraction prompt to LLM...');

            const skillsRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b:free',
                    messages: [{ role: 'user', content: skillsPrompt }],
                    reasoning: { enabled: true },
                    response_format: { type: 'json_object' },
                    plugins: [{ id: 'response-healing' }],
                }),
            });

            if (!skillsRes.ok) {
                const errBody = await skillsRes.text();
                throw new Error(`Skill extraction API error: ${skillsRes.status} — ${errBody}`);
            }

            const skillsLLMData = await skillsRes.json();
            console.log('Skill extraction LLM response:', JSON.stringify(skillsLLMData, null, 2));

            const rawSkillsContent = skillsLLMData.choices?.[0]?.message?.content ?? '';
            const skillsContentStr = Array.isArray(rawSkillsContent)
                ? rawSkillsContent.filter(p => p.type === 'text').map(p => p.text).join('')
                : (rawSkillsContent ?? '');

            if (!skillsContentStr || skillsContentStr.trim() === '') {
                throw new Error('Skill extraction returned an empty response. Please try again.');
            }

            const rawSkillsText = skillsContentStr
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();

            const skillsJson = JSON.parse(rawSkillsText).skills;
            console.log('Extracted Skills (LLM):', skillsJson);
            setProgress(75);

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

    // ── Helper: Parse Duration for Time Left ─────────────────────────────────
    const parseDurationToHours = (durationStr) => {
        if (!durationStr) return 0;
        const lower = durationStr.toLowerCase();
        let hours = 0;
        const hoursMatch = lower.match(/(\d+)\s*hour/);
        if (hoursMatch) hours += parseInt(hoursMatch[1], 10);
        const weeksMatch = lower.match(/(\d+)\s*week/);
        if (weeksMatch) hours += parseInt(weeksMatch[1], 10) * 10; // estimate 10h/week
        if (hours === 0 && durationStr.length > 0) hours = 5;
        return hours;
    };

    const metrics = coursesData ? (() => {
        const total = coursesData.length;
        if (total === 0) return { completed: 0, total: 0, percent: 0, hoursLeft: 0 };
        const completed = coursesData.filter(c => c.is_completed).length;
        const percent = Math.round((completed / total) * 100);
        const uncompleted = coursesData.filter(c => !c.is_completed);
        const hoursLeft = uncompleted.reduce((acc, c) => acc + parseDurationToHours(c.duration || c.estimated_duration), 0);
        return { completed, total, percent, hoursLeft };
    })() : { completed: 0, total: 0, percent: 0, hoursLeft: 0 };

    useEffect(() => {
        if (metrics.total > 0 && metrics.completed === metrics.total) {
            setShowMasteryPopup(true);
        } else {
            setShowMasteryPopup(false);
        }
    }, [metrics.completed, metrics.total]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleToggleComplete = async (pcId, currentStatus) => {
        // optimistic UI
        setCoursesData(prev => prev.map(c => c.pc_id === pcId ? { ...c, is_completed: !currentStatus } : c));
        try {
            const res = await fetchWithAuth(`${BACKEND_URL}/api/student/pathway_course/${pcId}/complete`, { method: 'PATCH' });
            if (!res.ok) {
                // revert if fail
                setCoursesData(prev => prev.map(c => c.pc_id === pcId ? { ...c, is_completed: currentStatus } : c));
            }
        } catch (err) {
            console.error('Failed to toggle completion', err);
            setCoursesData(prev => prev.map(c => c.pc_id === pcId ? { ...c, is_completed: currentStatus } : c));
        }
    };

    const handleDeleteCourse = async (pcId) => {
        try {
            const res = await fetchWithAuth(`${BACKEND_URL}/api/student/pathway_course/${pcId}`, { method: 'DELETE' });
            if (res.ok) {
                setCoursesData(prev => prev.filter(c => c.pc_id !== pcId).map((c, idx) => ({...c, order_index: idx + 1})));
            }
        } catch (err) {
            console.error('Failed to delete course', err);
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth(`${BACKEND_URL}/api/student/pathway_course`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCourse)
            });
            if (res.ok) {
                const added = await res.json();
                setCoursesData(prev => [...(prev || []), added]);
                setIsAddModalOpen(false);
                setNewCourse({ title: '', platform: '', duration: '', rating: '' });
            }
        } catch (err) {
            console.error('Failed to add course', err);
        }
    };

    // ── Drag & Drop Handlers ──────────────────────────────────────────────────
    const handleDragStart = (index) => {
        setDraggedItemIndex(index);
    };

    const handleDragEnter = (index) => {
        if (draggedItemIndex === index) return;
        setCoursesData(prev => {
            const newData = [...prev];
            const draggedItem = newData[draggedItemIndex];
            newData.splice(draggedItemIndex, 1);
            newData.splice(index, 0, draggedItem);
            return newData;
        });
        setDraggedItemIndex(index);
    };

    const handleDragEnd = async () => {
        setDragOverItemIndex(null);
        setDraggedItemIndex(null);

        if (!coursesData) return;

        const orderUpdates = coursesData.map((c, idx) => ({ pc_id: c.pc_id, new_order_index: idx + 1 }));
        setCoursesData(prev => prev.map((c, idx) => ({...c, order_index: idx + 1})));

        try {
            await fetchWithAuth(`${BACKEND_URL}/api/student/pathway/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderUpdates })
            });
        } catch(err) {
            console.error('Failed to reorder courses', err);
        }
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        const phaseLabel = {
            checking: 'Checking your profile...',
            market: 'Analyzing job market...',
            skills: 'Extracting required skills...',
            courses: 'Curating learning pathway...',
            saving: 'Finalizing your profile...',
        };
        const phaseSubLabel = {
            checking: 'Looking for a saved pathway.',
            market: 'Fetching real job listings from the market.',
            skills: 'Using AI to identify the skills you need most.',
            courses: 'Finding the best courses for your skill gaps.',
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

    // ── Dashboard Layout (Candy Crush Map Styles) ────────────────────────────
    return (
        <div className="text-on-surface overflow-hidden w-full h-[100dvh] bg-transparent">
            <style dangerouslySetInnerHTML={{__html: `
                .glass-panel { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
                .map-canvas {
                    background: transparent !important;
                }
                .dashboard-bg {
                    background-color: #f8faff;
                    background-image:
                        radial-gradient(ellipse 80% 60% at 10% 80%, rgba(147, 197, 253, 0.35) 0%, transparent 70%),
                        radial-gradient(ellipse 70% 55% at 90% 10%, rgba(167, 243, 208, 0.3) 0%, transparent 70%),
                        radial-gradient(ellipse 60% 50% at 60% 90%, rgba(196, 181, 253, 0.25) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 40% at 85% 60%, rgba(253, 186, 116, 0.15) 0%, transparent 60%),
                        radial-gradient(ellipse 40% 35% at 20% 20%, rgba(147, 197, 253, 0.2) 0%, transparent 60%);
                }
                .dot-pattern {
                    background-image: radial-gradient(rgba(148, 163, 184, 0.35) 1.5px, transparent 1.5px);
                    background-size: 32px 32px;
                }
                .blob-1 {
                    animation: drift-1 18s ease-in-out infinite alternate;
                }
                .blob-2 {
                    animation: drift-2 22s ease-in-out infinite alternate;
                }
                .blob-3 {
                    animation: drift-3 16s ease-in-out infinite alternate;
                }
                @keyframes drift-1 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    100% { transform: translate(60px, -80px) scale(1.1); }
                }
                @keyframes drift-2 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    100% { transform: translate(-80px, 60px) scale(0.95); }
                }
                @keyframes drift-3 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    100% { transform: translate(40px, 50px) scale(1.05); }
                }
                .node-pulse {
                    box-shadow: 0 0 0 0 rgba(65, 105, 225, 0.7);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(65, 105, 225, 0.7); }
                    50% { transform: scale(1.15); box-shadow: 0 0 0 25px rgba(65, 105, 225, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(65, 105, 225, 0); }
                }
                .vibrant-blue-gradient {
                    background: linear-gradient(90deg, #4d7cff 0%, #3a5ce1 100%);
                }
            `}} />

            <div className="flex h-full w-full">
                <main
                    className={`flex-1 relative overflow-hidden select-none ${isDraggingMap ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                        backgroundColor: '#f0f4ff',
                        backgroundImage: `
                            radial-gradient(ellipse 80% 60% at 10% 80%, rgba(147, 197, 253, 0.45) 0%, transparent 70%),
                            radial-gradient(ellipse 70% 55% at 90% 10%, rgba(167, 243, 208, 0.4) 0%, transparent 70%),
                            radial-gradient(ellipse 60% 50% at 55% 85%, rgba(196, 181, 253, 0.35) 0%, transparent 70%),
                            radial-gradient(ellipse 50% 40% at 80% 55%, rgba(253, 186, 116, 0.25) 0%, transparent 60%),
                            radial-gradient(ellipse 40% 35% at 25% 20%, rgba(147, 197, 253, 0.3) 0%, transparent 60%),
                            radial-gradient(rgba(148, 163, 184, 0.3) 1.5px, transparent 1.5px)
                        `,
                        backgroundSize: `100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 32px 32px`,
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Animated soft blur blobs */}
                    <div className="blob-1 absolute rounded-full pointer-events-none z-0"
                        style={{ width: '600px', height: '600px', top: '-10%', left: '-5%',
                            background: 'radial-gradient(circle, rgba(99,162,255,0.5) 0%, rgba(147,197,253,0.2) 40%, transparent 70%)',
                            filter: 'blur(60px)' }} />
                    <div className="blob-2 absolute rounded-full pointer-events-none z-0"
                        style={{ width: '700px', height: '700px', bottom: '-15%', right: '-8%',
                            background: 'radial-gradient(circle, rgba(110,231,183,0.45) 0%, rgba(167,243,208,0.15) 40%, transparent 70%)',
                            filter: 'blur(70px)' }} />
                    <div className="blob-3 absolute rounded-full pointer-events-none z-0"
                        style={{ width: '550px', height: '550px', top: '25%', right: '10%',
                            background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, rgba(196,181,253,0.15) 40%, transparent 70%)',
                            filter: 'blur(50px)' }} />
                    <div className="blob-1 absolute rounded-full pointer-events-none z-0"
                        style={{ width: '450px', height: '450px', bottom: '15%', left: '25%',
                            background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(253,224,71,0.1) 40%, transparent 70%)',
                            filter: 'blur(50px)', animationDelay: '4s' }} />
                    {/* Mastery Tracker Overlay - Left side */}
                    <div className="absolute top-8 left-10 z-40 w-full max-w-xl pr-6 interactive-element pointer-events-none">
                        <div className="glass-panel p-6 rounded-[1.5rem] shadow-2xl border border-white/50 flex flex-col sm:flex-row items-center gap-6 pointer-events-auto">
                            <div className="flex-1 w-full">
                                <h1 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight mb-3">Mastery Map</h1>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-sm font-black text-on-surface font-headline">Progress: <span className="text-primary">{metrics.completed} / {metrics.total}</span></span>
                                    <span className="text-[10px] font-black text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{metrics.percent}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                                    <div className="h-full vibrant-blue-gradient rounded-full transition-all duration-700" style={{ width: `${metrics.percent}%` }}></div>
                                </div>
                            </div>
                            <div className="flex flex-row items-center sm:items-end border-t sm:border-t-0 sm:border-l border-surface-container-highest pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto mt-4 sm:mt-0 justify-between sm:justify-center gap-4">
                                <div className="flex flex-col items-start w-full text-left mr-4">
                                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5">Time Left</span>
                                    <span className="text-sm font-black text-primary font-headline whitespace-nowrap">{metrics.hoursLeft}h est.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 pointer-events-auto text-sm font-bold w-full sm:w-auto shadow-[0_4px_14px_rgba(37,76,216,0.25)] hover:scale-[1.02] active:scale-95 whitespace-nowrap">
                                        <span className="material-symbols-outlined text-sm font-bold pt-0.5">add</span>
                                        Add Course
                                    </button>
                                    <button onClick={logout} className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 pointer-events-auto text-sm font-bold w-full sm:w-auto whitespace-nowrap">
                                        <span className="material-symbols-outlined text-sm pt-0.5">exit_to_app</span>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Draggable Viewport Layer */}
                    <div
                        className="w-[3000px] h-[1200px] relative transition-transform duration-75 ease-linear pointer-events-none origin-center"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(0.85)` }}
                    >
                        {/* Technical / Education stylized sweeping lines tracking with Panning */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60 -z-10 overflow-visible" viewBox="0 0 3000 1200">
                            <path d="M 100 200 Q 400 500, 700 100 T 1200 400 T 2000 200 T 3000 600" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="15 15" opacity="0.8" />
                            <path d="M -100 800 Q 300 1000, 800 600 T 1500 900 T 2500 700 T 3200 1000" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5 20" opacity="0.6" />
                            <path d="M 500 -200 Q 800 100, 1100 -50 T 1800 200 T 2400 -100 T 2800 300" fill="none" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="30 10" />
                            
                            {/* Light floating geometric shapes to break up space */}
                            <circle cx="250" cy="350" r="150" fill="none" stroke="#ffffff" strokeWidth="40" className="float-slower" opacity="0.5" />
                            <circle cx="1400" cy="800" r="250" fill="none" stroke="#f8fafc" strokeWidth="60" strokeDasharray="40 40" className="float-slow" />
                            <circle cx="2300" cy="150" r="120" fill="none" stroke="#ffffff" strokeWidth="20" className="float-slower" style={{ animationDelay: '3s' }} opacity="0.7" />
                        </svg>

                        {/* SVG Visual Path */}
                        <svg className="absolute top-0 left-0 w-[3000px] h-[1200px] path-svg pointer-events-none opacity-50 overflow-visible" viewBox="0 0 3000 1200">
                            <defs>
                                <clipPath id="mapClip">
                                    <rect x="0" y="-500" width={(coursesData ? (NODE_POSITIONS[coursesData.length]?.x || 2800) + 65 : 3000)} height="2000" />
                                </clipPath>
                                <linearGradient id="pathGradient" x1="0%" x2="100%" y1="100%" y2="0%">
                                    <stop offset="0%" style={{stopColor:'var(--color-primary, #4169E1)', stopOpacity:1}}></stop>
                                    <stop offset="100%" style={{stopColor:'var(--color-tertiary, #0055c4)', stopOpacity:1}}></stop>
                                </linearGradient>
                            </defs>
                            <path
                                ref={pathRef}
                                clipPath="url(#mapClip)"
                                d="M 300 800 C 650 800, 400 500, 800 450 C 1200 400, 950 0, 1400 -50 C 1900 -100, 1800 -300, 2200 -250 C 2600 -200, 2400 100, 2800 250"
                                fill="none"
                                stroke="url(#pathGradient)"
                                strokeLinecap="round"
                                strokeWidth="40"
                                style={{ transition: 'all 0.4s ease-in-out' }}
                            ></path>
                        </svg>

                        {/* Start Flag */}
                        <div className="absolute left-[275px] top-[775px] flex flex-col items-center pointer-events-none">
                            <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center shadow-lg border-4 border-surface-container">
                                <span className="material-symbols-outlined text-on-surface">flag</span>
                            </div>
                            <span className="mt-2 text-xs font-black text-on-surface-variant uppercase tracking-widest">Start</span>
                        </div>

                        {/* Courses Mapping */}
                        {coursesData && coursesData.map((course, idx) => {
                            const pos = NODE_POSITIONS[idx] || { x: 300 + idx * 100, y: 800 - idx * 50 }; // fallback
                            const isCurrent = !course.is_completed && (idx === 0 || coursesData[idx - 1]?.is_completed);
                            const targetHref = `https://www.google.com/search?q=${encodeURIComponent(`${course.title} ${course.platform || 'course'}`)}`;

                            return (
                                <div
                                    key={course.pc_id ?? idx}
                                    style={{ left: pos.x, top: pos.y, position: 'absolute' }}
                                    className="flex flex-col items-center z-10 pointer-events-auto interactive-element group"
                                >
                                    {/* Native DnD wrapper to avoid map-pan override */}
                                    <div
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        onClick={() => setActiveCourseId(activeCourseId === idx ? null : idx)}
                                    >
                                        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-4 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform ${
                                            course.is_completed
                                                ? 'bg-secondary border-surface'
                                                : isCurrent
                                                    ? 'vibrant-blue-gradient border-surface node-pulse w-28 h-28'
                                                    : 'bg-surface border-surface-container-highest shadow-none'
                                        }`}>
                                            {/* Delete hover overlay functionality inside node */}
                                            {course.pc_id && (
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.pc_id); }}
                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-error text-on-error rounded-full items-center justify-center shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex hover:scale-110 z-50"
                                                    title="Delete Course"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </div>
                                            )}

                                            {course.is_completed ? (
                                                <span className="material-symbols-outlined text-white text-3xl font-bold">check</span>
                                            ) : isCurrent ? (
                                                <span className="material-symbols-outlined text-white text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-on-surface-variant text-3xl">lock</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="mt-4 font-bold text-on-surface font-headline text-base text-center w-36 drop-shadow-md">
                                        {course.title}
                                    </span>

                                    {/* Info Overlay (Candy Crush Level Detail) */}
                                    {activeCourseId === idx && (
                                        <div
                                            className="absolute top-32 lg:left-0 left-[-100px] w-96 glass-panel rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(37,76,216,0.2)] border border-surface/60 animate-in fade-in slide-in-from-top-4 duration-300 z-50 bg-white/95 cursor-auto"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-2xl font-black text-on-surface font-headline leading-tight pr-4">{course.title}</h3>
                                                    <p className="text-sm font-bold text-primary mt-1">Platform: {course.platform || 'General'}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {isCurrent && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest mb-2">Current step</span>}
                                                    {course.rating && (
                                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                                            <span className="material-symbols-outlined text-base" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                            {course.rating}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mb-8 p-4 bg-surface-container-lowest rounded-2xl border border-surface-container">
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Est. Time</span>
                                                    <span className="text-sm font-bold text-on-surface">{course.duration || course.estimated_duration || 'Self-paced'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                <label className="flex items-center gap-4 cursor-pointer group w-fit">
                                                    <input
                                                        type="checkbox"
                                                        checked={course.is_completed}
                                                        onChange={() => handleToggleComplete(course.pc_id, course.is_completed)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-6 h-6 rounded-md border-2 border-surface-container-highest peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors">
                                                        <span className="material-symbols-outlined text-white text-lg scale-0 peer-checked:scale-100 transition-transform">check</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Mark as Completed</span>
                                                </label>
                                            </div>

                                            <a
                                                href={targetHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-4 vibrant-blue-gradient text-white rounded-2xl font-black text-base shadow-xl shadow-primary/30 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                Continue Learning
                                                <span className="material-symbols-outlined">east</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Trophy Finish Symbol */}
                        {coursesData && (
                            <div
                                style={{
                                    left: NODE_POSITIONS[coursesData.length]?.x || 300,
                                    top: NODE_POSITIONS[coursesData.length]?.y || 800,
                                    marginLeft: '-15px'
                                }}
                                className="absolute flex flex-col items-center pointer-events-auto interactive-element z-10"
                                onClick={() => { if(metrics.completed > 0 && metrics.completed === metrics.total) setShowMasteryPopup(true); }}
                            >
                                <div
                                    className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl border-4 border-white cursor-pointer hover:scale-110 transition-transform ${
                                        metrics.completed > 0 && metrics.completed === metrics.total
                                            ? 'bg-gradient-to-tr from-yellow-400 to-amber-600 animate-[bounce_1.5s_infinite]'
                                            : 'bg-surface-dim opacity-70'
                                    }`}
                                >
                                    <span
                                        className={`material-symbols-outlined text-6xl ${metrics.completed > 0 && metrics.completed === metrics.total ? 'text-white' : 'text-slate-400'}`}
                                        style={{fontVariationSettings: "'FILL' 1"}}
                                    >
                                        emoji_events
                                    </span>
                                </div>
                                <span className={`mt-4 font-black font-headline text-xl uppercase tracking-widest drop-shadow-md ${metrics.completed > 0 && metrics.completed === metrics.total ? 'text-amber-600' : 'text-slate-400'}`}>
                                    Mastery
                                </span>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* Mastery Achieved Popup */}
            {showMasteryPopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm p-4 interactive-element">
                    <div className="relative bg-surface rounded-[2rem] p-10 max-w-lg w-full shadow-2xl flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-500 border border-amber-500/20">
                        {/* Confetti background */}
                        <div className="absolute inset-0 pointer-events-none opacity-60">
                            <span className="absolute top-10 left-10 text-4xl animate-[bounce_2s_infinite]">🎊</span>
                            <span className="absolute top-20 right-20 text-4xl animate-[bounce_3s_infinite_0.5s]">🎈</span>
                            <span className="absolute bottom-20 left-20 text-4xl animate-[bounce_2.5s_infinite_1s]">🎉</span>
                            <span className="absolute top-40 right-10 text-4xl animate-[bounce_3.5s_infinite_0.2s]">🥳</span>
                            <span className="absolute bottom-10 right-32 text-4xl animate-[bounce_2s_infinite_1.5s]">✨</span>
                        </div>

                        <div className="w-32 h-32 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-xl border-8 border-white mb-6 z-10 animate-bounce cursor-default">
                            <span className="material-symbols-outlined text-white text-[80px]" style={{fontVariationSettings: "'FILL' 1"}}>emoji_events</span>
                        </div>

                        <h2 className="text-3xl font-headline font-black text-on-surface mb-4 z-10 drop-shadow-sm">Mastery Achieved!</h2>
                        <p className="text-on-surface-variant text-base mb-8 z-10 leading-relaxed font-bold">
                            Outstanding dedication! You have successfully conquered all the modules in your learning pathway. Take a moment to celebrate unlocking all these incredible new skills!
                        </p>

                        <button
                            onClick={() => setShowMasteryPopup(false)}
                            className="w-full py-4 text-white rounded-2xl font-black text-lg transition-transform active:scale-95 z-10 cursor-pointer hover:brightness-110"
                            style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 10px 25px -5px rgba(217, 119, 6, 0.4)' }}
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Add Course Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 interactive-element">
                    <div className="bg-surface p-8 rounded-3xl max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-headline font-bold mb-6 text-on-surface">Add Custom Course</h2>
                        <form onSubmit={handleAddCourse} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-1">Course Title *</label>
                                <input required type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full bg-surface-container-lowest border border-surface-container-highest px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-on-surface" placeholder="e.g. Advanced System Design" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-1">Platform</label>
                                <input type="text" value={newCourse.platform} onChange={e => setNewCourse({...newCourse, platform: e.target.value})} className="w-full bg-surface-container-lowest border border-surface-container-highest px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-on-surface" placeholder="e.g. Coursera" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Duration</label>
                                    <input type="text" value={newCourse.duration} onChange={e => setNewCourse({...newCourse, duration: e.target.value})} className="w-full bg-surface-container-lowest border border-surface-container-highest px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-on-surface" placeholder="e.g. 10 hours" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Rating</label>
                                    <input type="text" value={newCourse.rating} onChange={e => setNewCourse({...newCourse, rating: e.target.value})} className="w-full bg-surface-container-lowest border border-surface-container-highest px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-on-surface" placeholder="e.g. 4.8/5" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md cursor-pointer">Add Node</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
