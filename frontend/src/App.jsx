import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage     from './pages/HomePage';
import ProfilePage  from './pages/ProfilePage';
import ShowcasePage       from './pages/ShowcasePage';
import ProjectDetailPage  from './pages/ProjectDetailPage';
import SubmitProjectPage  from './pages/SubmitProjectPage';
import ChallengePage       from './pages/ChallengePage';
import ChallengeDetailPage from './pages/ChallengeDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import RadarPage from './pages/RadarPage';
import IdeaGaragePage from './pages/IdeaGaragePage';
import ShowdownsPage from './pages/ShowdownsPage';
const PrivateRoute = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuthStore();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuthStore();
  if (isLoading) return null;
  return !isLoggedIn ? children : <Navigate to="/" replace />;
};

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f1f1f',
            color:      '#f8f8f8',
            border:     '1px solid #2e2e2e',
            borderRadius: '8px',
            fontSize:   '14px',
          },
          success: { iconTheme: { primary: '#ff6154', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/"         element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/showcase"         element={<ShowcasePage />} />
        <Route path="/projects/:id"     element={<ProjectDetailPage />} />
        <Route path="/projects/submit"  element={<PrivateRoute><SubmitProjectPage /></PrivateRoute>} />
        <Route path="/challenges"     element={<ChallengePage />} />
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/ideas" element={<IdeaGaragePage />} />
        <Route path="/showdowns" element={<ShowdownsPage />} />
      </Routes>
    </BrowserRouter>
  );
}