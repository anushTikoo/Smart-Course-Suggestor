import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectPath } from '../utils/auth';

/**
 * Catch-all for any undefined route.
 * - While auth is loading → show spinner
 * - Logged in → redirect to role-appropriate destination via getRedirectPath
 * - Not logged in → redirect to /signup
 */
export default function NotFoundRedirect() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-surface">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <Navigate to={getRedirectPath(user)} replace />;
}
