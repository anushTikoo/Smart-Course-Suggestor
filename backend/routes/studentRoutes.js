import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { generateAccessToken } from '../utils/tokenUtils.js';

const router = express.Router();

const VALID_EXPERIENCE_LEVELS = ['beginner', 'mid', 'senior'];

/**
 * POST /api/student/onboard
 *
 * Saves the student onboarding profile and marks them as onboarded.
 * Requires a valid JWT (role must be 'student').
 *
 * Body:
 *  - current_job      {string}   optional — e.g. "Junior Dev at TCS"
 *  - target_role      {string}   required — e.g. "Machine Learning Engineer"
 *  - experience_level {string}   required — "beginner" | "mid" | "senior"
 *  - location         {string}   optional — e.g. "Pune, India"
 *  - current_skills   {string[]} required — free-form tags e.g. ["Python", "SQL"]
 *
 * Returns:
 *  - 201 with a fresh access token (is_onboarded flipped to true)
 */
router.post('/onboard', authenticateToken, async (req, res) => {
    const { id: userId, role } = req.user;

    // Only students can access this route
    if (role !== 'student') {
        return res.status(403).json({ error: 'Only students can complete student onboarding.' });
    }

    const { current_job, target_role, experience_level, location, current_skills } = req.body;

    // --- Validation ---
    if (!target_role || target_role.trim() === '') {
        return res.status(400).json({ error: 'target_role is required.' });
    }
    if (!experience_level || !VALID_EXPERIENCE_LEVELS.includes(experience_level)) {
        return res.status(400).json({
            error: `experience_level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}.`
        });
    }
    if (!Array.isArray(current_skills) || current_skills.length === 0) {
        return res.status(400).json({ error: 'current_skills must be a non-empty array of strings.' });
    }
    // Sanitise: remove empty/blank entries, deduplicate, trim whitespace
    const sanitisedSkills = [...new Set(
        current_skills.map(s => String(s).trim()).filter(Boolean)
    )];
    if (sanitisedSkills.length === 0) {
        return res.status(400).json({ error: 'current_skills must contain at least one valid skill.' });
    }

    try {
        // Insert profile (or update if they somehow reach onboarding twice)
        await pool.query(
            `INSERT INTO user_profile
                (user_id, current_job, target_role, experience_level, location, current_skills)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id) DO UPDATE SET
                current_job      = EXCLUDED.current_job,
                target_role      = EXCLUDED.target_role,
                experience_level = EXCLUDED.experience_level,
                location         = EXCLUDED.location,
                current_skills   = EXCLUDED.current_skills`,
            [
                userId,
                current_job?.trim() || null,
                target_role.trim(),
                experience_level,
                location?.trim() || null,
                sanitisedSkills,
            ]
        );

        // Flip is_onboarded to true in user_credentials
        const result = await pool.query(
            `UPDATE user_credentials
             SET is_onboarded = true
             WHERE id = $1
             RETURNING id, email, role, is_onboarded`,
            [userId]
        );

        const updatedUser = result.rows[0];

        // Issue a new access token with is_onboarded = true
        const newAccessToken = generateAccessToken(updatedUser);

        return res.status(201).json({
            message: 'Onboarding complete.',
            accessToken: newAccessToken,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                is_onboarded: updatedUser.is_onboarded,
            },
        });
    } catch (error) {
        console.error('Student onboarding error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;