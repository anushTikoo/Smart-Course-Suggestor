import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthRedirect from './components/AuthRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundRedirect from './components/NotFoundRedirect';

import Landing from './pages/Landing';
import Signup from './pages/Signup';
import SelectRole from './pages/Selectrole';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';
import StudentOnboarding from './pages/StudentOnboarding';
import MentorOnboarding from './pages/MentorOnboarding';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes — redirect away if already logged in */}
          <Route path="/" element={<AuthRedirect><Landing /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

          {/* Any authenticated user with role=pending */}
          <Route path="/select-role" element={
            <ProtectedRoute allowedRoles={['pending']}>
              <SelectRole />
            </ProtectedRoute>
          } />

          {/* Student-only routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={['student']} requireOnboarded>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/onboarding" element={
            <ProtectedRoute allowedRoles={['student']} requireNotOnboarded>
              <StudentOnboarding />
            </ProtectedRoute>
          } />

          {/* Mentor-only routes */}
          <Route path="/mentor/dashboard" element={
            <ProtectedRoute allowedRoles={['mentor']} requireOnboarded>
              <MentorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/mentor/onboarding" element={
            <ProtectedRoute allowedRoles={['mentor']} requireNotOnboarded>
              <MentorOnboarding />
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