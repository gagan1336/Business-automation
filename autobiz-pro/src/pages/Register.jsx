import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Mail, Lock, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', businessName: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.businessName || !form.password) {
      toast('Please fill all fields', 'error'); return;
    }
    if (form.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    setTimeout(() => {
      register(form.name, form.email, form.businessName, form.password);
      toast('Account created successfully! 🎉', 'success');
      navigate('/app/dashboard');
      setLoading(false);
    }, 900);
  };

  const fields = [
    { key: 'name', label: 'Full Name', type: 'text', icon: User, placeholder: 'Rahul Sharma' },
    { key: 'email', label: 'Email Address', type: 'email', icon: Mail, placeholder: 'you@business.com' },
    { key: 'businessName', label: 'Business Name', type: 'text', icon: Briefcase, placeholder: 'HairCraft Salon' },
    { key: 'password', label: 'Password', type: 'password', icon: Lock, placeholder: 'Min. 6 characters' },
  ];

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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start your 14-day free trial — no credit card required</p>

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

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Create Free Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
