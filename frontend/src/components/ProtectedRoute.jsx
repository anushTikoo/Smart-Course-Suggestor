import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectPath } from '../utils/auth';

/**
 * Wraps protected routes.
 * - Not logged in → redirect to /signup
 * - Logged in but not onboarded (when requireOnboarded=true) → redirect to onboarding
 * - Logged in and already onboarded (when requireNotOnboarded=true) → redirect to dashboard
 * - Otherwise → render the page
 */
export default function ProtectedRoute({ children, requireOnboarded, requireNotOnboarded }) {
    const { user, loading } = useAuth();

    // Wait for session restore before deciding
    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-surface">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not logged in → send to signup
    if (!user) {
        return <Navigate to="/signup" replace />;
    }

    // Correct but hasn't finished onboarding → send to onboarding
    if (requireOnboarded && !user.is_onboarded) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    // Already finished onboarding → send to dashboard
    if (requireNotOnboarded && user.is_onboarded) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    return children;
}
