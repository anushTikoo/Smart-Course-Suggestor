// In-memory store for access token (not localStorage — safer against XSS)
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
    accessToken = token;
};

/**
 * Returns the correct redirect path based on the user's role and onboarding status.
 * @param {{ role: string, is_onboarded: boolean }} user
 * @returns {string} path to redirect to
 */
export const getRedirectPath = (user) => {
    if (!user) return '/signup';
    if (user.role === 'pending') return '/select-role';
    if (user.role === 'student' && !user.is_onboarded) return '/student/onboarding';
    if (user.role === 'mentor' && !user.is_onboarded) return '/mentor/onboarding';
    if (user.role === 'student' && user.is_onboarded) return '/student/dashboard';
    if (user.role === 'mentor' && user.is_onboarded) return '/mentor/dashboard';
    return '/signup';
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * A fetch wrapper that automatically handles expired access tokens.
 * On a 401 response it will:
 *  1. Call /api/auth/refresh (using the HTTP-only cookie)
 *  2. Store the new access token in memory
 *  3. Retry the original request once with the new token
 *  4. If refresh also fails, dispatch an 'auth:logout' event so AuthContext clears the session
 *
 * Usage: same as fetch(), but no need to manually set Authorization header.
 * @param {string} url
 * @param {RequestInit} options
 */
export const fetchWithAuth = async (url, options = {}) => {
    // Attach current access token
    const makeRequest = (token) => fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include', // always send cookies
    });

    let res = await makeRequest(getAccessToken());

    // If unauthorized, try to silently refresh and retry once
    if (res.status === 401) {
        try {
            const refreshRes = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });

            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setAccessToken(data.accessToken);
                // Retry the original request with the new token
                res = await makeRequest(data.accessToken);
            } else {
                // Refresh token is also expired/invalid — force logout
                window.dispatchEvent(new Event('auth:logout'));
            }
        } catch (_) {
            window.dispatchEvent(new Event('auth:logout'));
        }
    }

    return res;
};
