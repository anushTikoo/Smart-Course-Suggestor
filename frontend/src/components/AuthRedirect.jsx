import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectPath } from '../utils/auth';

/**
 * Wraps public-only routes (/ and /signup).
 * If the user is already authenticated, redirects them to the correct page.
 * While session restore is in-flight, renders nothing (prevents flash).
 */
export default function AuthRedirect({ children }) {
    const { user, loading } = useAuth();

    // Don't render anything until we know the auth state
    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-surface">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If logged in, redirect away from public pages
    if (user) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    // Not logged in — render the public page normally
    return children;
}
