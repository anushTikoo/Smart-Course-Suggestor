import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  setRefreshTokenCookie,
} from '../utils/tokenUtils.js';

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes we request from Google
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];

// GET /api/auth/google
// Redirects the user to Google's OAuth consent screen
router.get('/', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

// GET /api/auth/google/callback
// Google redirects here after user grants/denies permission
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  const BASE_URL = process.env.CLIENT_URL;

  if (error) {
    return res.redirect(`${BASE_URL}/signup?error=access_denied`);
  }

  if (!code) {
    return res.redirect(`${BASE_URL}/signup?error=missing_code`);
  }

  try {
    // Exchange the authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);

    // Verify and decode the ID token to get user info
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    // Check if a user with this google_id or email already exists
    const existingUser = await pool.query(
      'SELECT * FROM user_credentials WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    let user;
    let isNewUser = false;

    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];

      // If they registered via email/password before, link their Google account
      if (!user.google_id) {
        await pool.query(
          'UPDATE user_credentials SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
        user.google_id = googleId;
      }
    } else {
      // New user — create a record (no password since it's Google OAuth)
      const result = await pool.query(
        `INSERT INTO user_credentials (email, google_id, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, google_id`,
        [email, googleId, 'pending']
      );
      user = result.rows[0];
      user.is_onboarded = false; // brand new — no user_profile row yet
      isNewUser = true;
    }

    // For existing users, determine onboarding status from user_profile
    if (!isNewUser) {
      const profileCheck = await pool.query(
        'SELECT 1 FROM user_profile WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      user.is_onboarded = profileCheck.rows.length > 0;
    }

    // Issue access + refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    await saveRefreshToken(user.id, refreshToken);

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Determine where to send the user based on their state
    let redirectUrl;

    if (isNewUser) {
      // Brand new user — they haven't picked a role yet
      redirectUrl = `${BASE_URL}/select-role`;

    } else if (!user.is_onboarded) {
      // Returning user who hasn't completed onboarding yet
      // Route to their role-specific onboarding page
      if (user.role === 'student') {
        redirectUrl = `${BASE_URL}/student/onboarding`;
      } else if (user.role === 'mentor') {
        redirectUrl = `${BASE_URL}/mentor/onboarding`;
      } else {
        // role is still 'pending' — they closed the tab on /select-role
        redirectUrl = `${BASE_URL}/select-role`;
      }

    } else {
      // Fully onboarded returning user — go straight to their dashboard
      if (user.role === 'student') {
        redirectUrl = `${BASE_URL}/student/dashboard`;
      } else if (user.role === 'mentor') {
        redirectUrl = `${BASE_URL}/mentor/dashboard`;
      } else {
        redirectUrl = `${BASE_URL}/select-role`; // fallback
      }
    }

    res.redirect(`${redirectUrl}?accessToken=${accessToken}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${BASE_URL}/signup?error=server_error`);
  }
});

export default router;
