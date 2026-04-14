import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { generateAccessToken } from '../utils/tokenUtils.js';

const router = express.Router();

const VALID_ROLES = ['student', 'mentor'];

// PATCH /api/user/role
// Called from the /select-role page after Google OAuth (or basic auth if role was 'pending')
router.patch('/role', authenticateToken, async (req, res) => {
  const { role } = req.body;

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be student or mentor.' });
  }

  try {
    const result = await pool.query(
      `UPDATE user_credentials
       SET role = $1
       WHERE id = $2
       RETURNING id, email, role`,
      [role, req.user.id]
    );

    const user = result.rows[0];

    // Determine onboarding status from user_profile (column no longer exists in user_credentials)
    const profileCheck = await pool.query(
      'SELECT 1 FROM user_profile WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    user.is_onboarded = profileCheck.rows.length > 0;

    // Issue a new access token with the updated role
    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      message: 'Role updated successfully.',
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_onboarded: user.is_onboarded,
      },
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
