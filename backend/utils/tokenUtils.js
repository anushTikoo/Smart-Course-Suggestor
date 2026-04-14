import jwt from 'jsonwebtoken';
import pool from '../db.js';

const ACCESS_TOKEN_EXPIRY = '15m';    // Short-lived
const REFRESH_TOKEN_EXPIRY = '7d';    // Long-lived
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Generate a short-lived access token.
// user.is_onboarded must be set by the caller (derived from a user_profile lookup,
// NOT from the deleted user_credentials.is_onboarded column).
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_onboarded: user.is_onboarded },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Generate a long-lived refresh token
export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Save a refresh token to the DB
export async function saveRefreshToken(userId, refreshToken) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, refreshToken, expiresAt]
  );
}

// Set the refresh token as an HTTP-only cookie on the response
export function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,                           // Not accessible via JS
    secure: process.env.NODE_ENV === 'production', // send cookie over HTTPS only in prod
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });
}
