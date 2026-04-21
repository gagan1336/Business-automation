import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { user, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Navigate strictly based on explicit user action rather than mounting hooks to prevent race conditions
  useEffect(() => {
    if (user && !user.needsRegistration) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.isNewUser) {
        toast('Welcome! Let\'s set up your business.', 'info');
        navigate('/register');
      } else {
        toast('Welcome back! 🎉', 'success');
        navigate('/app/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast(err.message || 'Sign-in failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon"><Sparkles size={20} color="#fff" /></div>
            <span className="logo-text">AutoBiz Pro</span>
          </div>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your AutoBiz Pro account</p>

        <div className="auth-form" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '14px', gap: 10, fontSize: '0.95rem' }}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 20 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Secure Sign-In:</strong> We use Google Authentication — no passwords to remember.
        </div>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  );
}
