import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthRedirect from './components/AuthRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundRedirect from './components/NotFoundRedirect';

import Landing from './pages/Landing';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import StudentOnboarding from './pages/StudentOnboarding';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes — redirect away if already logged in */}
          <Route path="/" element={<AuthRedirect><Landing /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

          {/* Student routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute requireOnboarded>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/onboarding" element={
            <ProtectedRoute requireNotOnboarded>
              <StudentOnboarding />
            </ProtectedRoute>
          } />

          {/* Catch-all: redirect unknown routes based on auth state */}
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;