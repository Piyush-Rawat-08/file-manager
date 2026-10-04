import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import AuthPage from './pages/AuthPage';
import Files from './pages/Files';
import SharePage from './pages/SharePage';

function Protected({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <p className="status">Loading…</p>;
  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/s/:token" element={<SharePage />} />
      <Route path="/" element={<Protected><Files /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
