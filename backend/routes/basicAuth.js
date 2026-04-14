import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  setRefreshTokenCookie,
} from '../utils/tokenUtils.js';
import { verifyOrigin } from '../middleware/verifyOrigin.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  let { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Validate role — only student or mentor allowed (not pending, not arbitrary strings)
  const VALID_ROLES = ['student', 'mentor'];
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be student or mentor.' });
  }

  email = email.toLowerCase();

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM user_credentials WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user (google_id left NULL for now)
    const result = await pool.query(
      `INSERT INTO user_credentials (email, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, hashedPassword, role || 'pending']
    );

    const newUser = result.rows[0];

    // Issue tokens immediately after registration
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh token to DB
    await saveRefreshToken(newUser.id, refreshToken);

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: 'User registered successfully.',
      accessToken,
      // New users always need onboarding — frontend should route to onboarding page
      redirect: 'onboarding',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        is_onboarded: false, // brand new — no user_profile row yet
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  email = email.toLowerCase();

  try {
    // Look up user by email
    const result = await pool.query(
      'SELECT * FROM user_credentials WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check if the user has a profile row (i.e. completed onboarding)
    const profileCheck = await pool.query(
      'SELECT 1 FROM user_profile WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    user.is_onboarded = profileCheck.rows.length > 0;

    // If account was created via Google OAuth, it won't have a password
    if (!user.password) {
      return res.status(401).json({
        error: 'This account uses Google Sign-In. Please login with Google.',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    await saveRefreshToken(user.id, refreshToken);

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Determine redirect hint for the frontend
    let redirect;
    if (!user.is_onboarded) {
      redirect = 'onboarding';
    } else if (user.role === 'student') {
      redirect = 'student_dashboard';
    } else if (user.role === 'mentor') {
      redirect = 'mentor_dashboard';
    }

    res.status(200).json({
      message: 'Login successful.',
      accessToken,
      redirect,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_onboarded: user.is_onboarded,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/refresh
// Uses the refresh token from the HTTP-only cookie to issue a new access token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found.' });
  }

  try {
    // Verify the refresh token signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check it actually exists in the DB (not revoked/logged out)
    const tokenRecord = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE refresh_token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [refreshToken, decoded.id]
    );

    if (tokenRecord.rows.length === 0) {
      return res.status(403).json({ error: 'Refresh token is invalid or expired.' });
    }

    // Fetch the latest user data
    const userResult = await pool.query(
      'SELECT id, email, role FROM user_credentials WHERE id = $1',
      [decoded.id]
    );

    const user = userResult.rows[0];

    // Check if the user has a profile row (i.e. completed onboarding)
    const profileCheck = await pool.query(
      'SELECT 1 FROM user_profile WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    user.is_onboarded = profileCheck.rows.length > 0;

    // Issue a new access token
    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_onboarded: user.is_onboarded,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(403).json({ error: 'Refresh token is invalid or expired.' });
  }
});

// POST /api/auth/logout
// Revokes the refresh token from the DB and clears the cookie
router.post('/logout', verifyOrigin, async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Delete from DB to revoke this session
    await pool.query(
      'DELETE FROM refresh_tokens WHERE refresh_token = $1',
      [refreshToken]
    );
  }

  // Clear the cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({ message: 'Logged out successfully.' });
});

export default router;
