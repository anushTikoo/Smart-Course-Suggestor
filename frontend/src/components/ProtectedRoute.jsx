import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectPath } from '../utils/auth';

/**
 * Wraps protected routes.
 * - Not logged in → redirect to /signup
 * - Logged in but wrong role → redirect to their correct destination
 * - Logged in, correct role, but not onboarded (when requireOnboarded=true) → redirect to onboarding
 * - Correct role → render the page
 *
 * @param {string[]} allowedRoles - array of roles allowed to view this route (e.g. ['student'])
 * @param {boolean}  requireOnboarded - if true, blocks access until the user has completed onboarding
 */
export default function ProtectedRoute({ children, allowedRoles, requireOnboarded, requireNotOnboarded }) {
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

    // Logged in but wrong role for this route → redirect to where they should be
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    // Correct role but hasn't finished onboarding → send them to their onboarding page
    if (requireOnboarded && !user.is_onboarded) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    // Correct role but already finished onboarding → send them to their dashboard
    if (requireNotOnboarded && user.is_onboarded) {
        return <Navigate to={getRedirectPath(user)} replace />;
    }

    return children;
}
