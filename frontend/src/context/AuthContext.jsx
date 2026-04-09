import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, setAccessToken, getRedirectPath } from '../utils/auth';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true while checking session on mount

    // On mount: try to restore session from the HTTP-only refresh token cookie.
    // Also handles Google OAuth redirect which passes ?accessToken=... in the URL.
    useEffect(() => {
        const restoreSession = async () => {
            try {
                // Check if Google OAuth just redirected here with a token in the URL
                const params = new URLSearchParams(window.location.search);
                const urlToken = params.get('accessToken');

                if (urlToken) {
                    // Store it immediately in memory
                    setAccessToken(urlToken);
                    // Remove it from the URL so it doesn't sit in browser history
                    params.delete('accessToken');
                    const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
                    window.history.replaceState({}, '', cleanUrl);
                }

                // Always call /refresh — it sets the user object from the cookie.
                // Whether we just got a URL token or are restoring a previous session,
                // the HTTP-only refresh cookie is present in both cases.
                const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                });

                if (res.ok) {
                    const data = await res.json();
                    // Only update the access token from /refresh if we didn't get one from the URL
                    if (!urlToken) setAccessToken(data.accessToken);
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    // Called after a successful login or register — updates context immediately
    const login = (userData, token) => {
        setAccessToken(token);
        setUser(userData);
    };

    // Called on logout — clears memory and calls backend to revoke cookie
    const logout = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (_) {}
        setAccessToken(null);
        setUser(null);
    };

    // Listen for forced logout dispatched by fetchWithAuth when both tokens are expired
    useEffect(() => {
        const handleForceLogout = () => logout();
        window.addEventListener('auth:logout', handleForceLogout);
        return () => window.removeEventListener('auth:logout', handleForceLogout);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, getRedirectPath }}>
            {children}
        </AuthContext.Provider>
    );
}
