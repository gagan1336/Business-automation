import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading AutoBiz Pro...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If user signed in via Google but hasn't registered their business yet
  if (user.needsRegistration) return <Navigate to="/register" replace />;

  return children;
}
