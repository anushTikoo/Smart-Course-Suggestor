import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { generateAccessToken } from '../utils/tokenUtils.js';

const router = express.Router();

const VALID_EXPERIENCE_LEVELS = ['beginner', 'mid', 'senior'];

/**
 * POST /api/student/onboard
 *
 * Saves the student onboarding profile.
 * Requires a valid JWT.
 *
 * Body:
 *  - current_job      {string}   optional
 *  - target_role      {string}   required
 *  - experience_level {string}   required — "beginner" | "mid" | "senior"
 *  - location         {string}   optional
 *  - current_skills   {string[]} required
 *
 * Returns:
 *  - 201 with a fresh access token embedding is_onboarded: true
 */
router.post('/onboard', authenticateToken, async (req, res) => {
    const { id: userId } = req.user;

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

        // Re-fetch user credentials (no is_onboarded column anymore).
        // The user is considered onboarded because we just inserted/updated their user_profile row.
        const result = await pool.query(
            `SELECT id, email FROM user_credentials WHERE id = $1`,
            [userId]
        );

        const updatedUser = { ...result.rows[0], is_onboarded: true };

        // Issue a new access token with is_onboarded = true (derived from user_profile existence)
        const newAccessToken = generateAccessToken(updatedUser);

        return res.status(201).json({
            message: 'Onboarding complete.',
            accessToken: newAccessToken,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                is_onboarded: true,
            },
        });
    } catch (error) {
        console.error('Student onboarding error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/student/profile
 *
 * Fetches target_role, location, current_skills, experience_level, current_job for the authenticated student.
 */
router.get('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            'SELECT target_role, location, current_skills, experience_level, current_job FROM user_profile WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching student profile:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * PATCH /api/student/target-skills
 *
 * Updates the student's target skills derived from the job market.
 * Requires a valid JWT.
 */
router.patch('/target-skills', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { target_skills } = req.body;

    if (!Array.isArray(target_skills)) {
        return res.status(400).json({ error: 'target_skills must be an array.' });
    }

    try {
        await pool.query(
            'UPDATE user_profile SET target_skills = $1 WHERE user_id = $2',
            [target_skills, userId]
        );

        return res.status(200).json({ message: 'Target skills updated successfully.' });
    } catch (error) {
        console.error('Error updating target skills:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/student/pathway
 *
 * Returns the student's saved pathway and its courses, if one exists.
 */
router.get('/pathway', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Check if a pathway row exists for this user
        const pathwayResult = await pool.query(
            'SELECT id FROM pathways WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        if (pathwayResult.rows.length === 0) {
            return res.status(200).json({ exists: false });
        }

        const pathwayId = pathwayResult.rows[0].id;

        // Fetch the ordered courses for this pathway
        const coursesResult = await pool.query(
            `SELECT c.id, c.title, c.platform, c.rating, c.duration,
                    pc.id as pc_id, pc.order_index, pc.is_completed
             FROM pathway_courses pc
             JOIN courses c ON c.id = pc.course_id
             WHERE pc.pathway_id = $1
             ORDER BY pc.order_index ASC`,
            [pathwayId]
        );

        return res.status(200).json({
            exists: true,
            pathway_id: pathwayId,
            courses: coursesResult.rows,
        });
    } catch (error) {
        console.error('Error fetching pathway:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/student/pathway
 *
 * Saves a curated learning pathway for the student.
 * Idempotent: if a pathway already exists for the user it is replaced.
 *
 * Body:
 *  - courses  {Array}  required — array of course objects from the LLM:
 *      { title, platform, rating, estimated_duration, order_index }
 *
 * Returns: { message, pathway_id, courses: [...] }
 */
router.post('/pathway', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { courses } = req.body;

    if (!Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({ error: 'courses must be a non-empty array.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert pathway row — replace any existing one for this user
        const pathwayResult = await client.query(
            `INSERT INTO pathways (user_id)
             VALUES ($1)
             ON CONFLICT (user_id) DO UPDATE SET created_at = NOW()
             RETURNING id`,
            [userId]
        );
        const pathwayId = pathwayResult.rows[0].id;

        // Delete existing pathway_courses links so we can re-insert cleanly
        await client.query(
            'DELETE FROM pathway_courses WHERE pathway_id = $1',
            [pathwayId]
        );

        const savedCourses = [];

        for (const course of courses) {
            const { title, platform, rating, estimated_duration, order_index } = course;

            if (!title) continue; // skip malformed entries

            // Insert course
            const courseResult = await client.query(
                `INSERT INTO courses (title, platform, rating, duration)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, title, platform, rating, duration`,
                [title, platform || null, rating || null, estimated_duration || null]
            );
            const savedCourse = courseResult.rows[0];

            // Link course to pathway
            await client.query(
                `INSERT INTO pathway_courses (pathway_id, course_id, order_index)
                 VALUES ($1, $2, $3)`,
                [pathwayId, savedCourse.id, order_index]
            );

            savedCourses.push({ ...savedCourse, order_index });
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Pathway saved successfully.',
            pathway_id: pathwayId,
            courses: savedCourses,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving pathway:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/student/pathway_course
 *
 * Adds a manual custom course to the user's active pathway.
 */
router.post('/pathway_course', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { title, platform, duration, rating, order_index } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Ensure user has a pathway
        let pathwayResult = await client.query('SELECT id FROM pathways WHERE user_id = $1 LIMIT 1', [userId]);
        if (pathwayResult.rows.length === 0) {
            pathwayResult = await client.query('INSERT INTO pathways (user_id) VALUES ($1) RETURNING id', [userId]);
        }
        const pathwayId = pathwayResult.rows[0].id;

        // Determine order index if not provided
        let targetOrderIndex = order_index;
        if (!targetOrderIndex) {
            const maxOrderRes = await client.query('SELECT MAX(order_index) as max_idx FROM pathway_courses WHERE pathway_id = $1', [pathwayId]);
            targetOrderIndex = (maxOrderRes.rows[0].max_idx || 0) + 1;
        } else {
            // Shift elements down if explicitly placed
            await client.query('UPDATE pathway_courses SET order_index = order_index + 1 WHERE pathway_id = $1 AND order_index >= $2', [pathwayId, targetOrderIndex]);
        }

        // Insert course
        const courseRes = await client.query(
            `INSERT INTO courses (title, platform, duration, rating) VALUES ($1, $2, $3, $4) RETURNING id, title, platform, duration, rating`,
            [title, platform || null, duration || null, rating || null]
        );
        const newCourse = courseRes.rows[0];

        // Insert mapping
        const pcRes = await client.query(
            `INSERT INTO pathway_courses (pathway_id, course_id, order_index) VALUES ($1, $2, $3) RETURNING id as pc_id, is_completed, order_index`,
            [pathwayId, newCourse.id, targetOrderIndex]
        );

        await client.query('COMMIT');
        return res.status(201).json({ ...newCourse, ...pcRes.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Add course error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/student/pathway_course/:id/complete
 * Toggles a course's completion.
 */
router.patch('/pathway_course/:id/complete', authenticateToken, async (req, res) => {
    const pcId = req.params.id;
    try {
        // Toggle is_completed
        const result = await pool.query(
            `UPDATE pathway_courses SET is_completed = NOT is_completed WHERE id = $1 RETURNING is_completed`,
            [pcId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Pathway course not found' });
        
        return res.json({ is_completed: result.rows[0].is_completed });
    } catch (error) {
        console.error('Update complete error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * PUT /api/student/pathway/reorder
 * Bulk updates the order of courses for the current user's pathway
 * Expects: { orderUpdates: [{ pc_id, new_order_index }] }
 */
router.put('/pathway/reorder', authenticateToken, async (req, res) => {
    const { orderUpdates } = req.body;
    if (!Array.isArray(orderUpdates)) return res.status(400).json({ error: 'Invalid payload' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const update of orderUpdates) {
            await client.query('UPDATE pathway_courses SET order_index = $1 WHERE id = $2', [update.new_order_index, update.pc_id]);
        }
        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Reorder error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/student/pathway_course/:id
 */
router.delete('/pathway_course/:id', authenticateToken, async (req, res) => {
    const pcId = req.params.id;
    try {
        await pool.query('DELETE FROM pathway_courses WHERE id = $1', [pcId]);
        return res.json({ success: true });
    } catch (error) {
        console.error('Delete course error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;