import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Phone, Briefcase, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [step, setStep] = useState(1); // 1 = Google sign-in, 2 = business details
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', category: 'Salon & Spa' });
  const [loading, setLoading] = useState(false);
  const { user, loginWithGoogle, registerBusiness } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Only bump to step 2 if they land here and need registration,
  // do not force navigate away to prevent unmounting during async tasks.
  useEffect(() => {
    if (user && user.needsRegistration && step === 1) {
      setStep(2);
      setForm(prev => ({ ...prev, ownerName: user.name || prev.ownerName }));
    }
  }, [user, step]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // If user is already signed in with Google but needs registration, go to step 2
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.isNewUser) {
        toast('You already have an account! Redirecting...', 'info');
        navigate('/app/dashboard');
        return;
      }
      // Pre-fill name from Google profile
      setForm(prev => ({
        ...prev,
        ownerName: result.user.displayName || '',
      }));
      setStep(2);
    } catch (err) {
      toast(err.message || 'Sign-in failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.businessName || !form.ownerName || !form.phone) {
      toast('Please fill all required fields', 'error');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      toast('Please enter a valid phone number', 'error');
      return;
    }
    setLoading(true);
    try {
      await registerBusiness({
        businessName: form.businessName,
        ownerName: form.ownerName,
        phone: form.phone,
        category: form.category,
      });
      toast('Business registered! Welcome to AutoBiz Pro! 🎉', 'success');
      navigate('/app/dashboard');
    } catch (err) {
      toast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'businessName', label: 'Business Name *', type: 'text', icon: Briefcase, placeholder: 'HairCraft Salon' },
    { key: 'ownerName', label: 'Owner Name *', type: 'text', icon: User, placeholder: 'Rahul Sharma' },
    { key: 'phone', label: 'Phone Number *', type: 'tel', icon: Phone, placeholder: '+91 98765 43210' },
  ];

  const categories = ['Salon & Spa', 'Barbershop', 'Fitness', 'Yoga', 'Medical', 'Restaurant', 'Other'];

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

        {step === 1 ? (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start your 14-day free trial — no credit card required</p>

            <div className="auth-form" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', padding: '14px', gap: 10, fontSize: '0.95rem' }}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /> Connecting...</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Set up your business</h1>
            <p className="auth-subtitle">Tell us about your business — takes 30 seconds</p>

            {user?.photoURL && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginTop: 12, marginBottom: 4 }}>
                <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                </div>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {fields.map(({ key, label, type, icon: Icon, placeholder }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <div style={{ position: 'relative' }}>
                    <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={type}
                      className="form-input"
                      style={{ paddingLeft: 38 }}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={e => update(key, e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}

              <div className="form-group">
                <label className="form-label">Business Category</label>
                <div style={{ position: 'relative' }}>
                  <Building size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <select className="form-select" style={{ paddingLeft: 38 }} value={form.category} onChange={e => update('category', e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '12px' }} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : 'Create Free Account'}
              </button>
            </form>
          </>
        )}

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
