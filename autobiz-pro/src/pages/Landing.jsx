import { Link } from 'react-router-dom';
import {
  Sparkles, MessageSquare, Calendar, Zap, Users, BarChart3,
  Check, ArrowRight, Star, Shield, Globe, Clock, CreditCard, Bot
} from 'lucide-react';

const features = [
  { icon: '📅', title: 'Online Booking', desc: 'Let clients book appointments 24/7 with instant confirmation and smart scheduling.', color: '#6366f1' },
  { icon: '👥', title: 'Client CRM', desc: 'Track every client\'s history, spending, preferences, and notes for personalized service.', color: '#10b981' },
  { icon: '🤖', title: 'AI Automation', desc: 'Smart reminders, follow-ups, and review requests — powered by AI, not templates.', color: '#f59e0b' },
  { icon: '📊', title: 'Business Analytics', desc: 'Real-time dashboards to track revenue, team performance, and growth metrics.', color: '#a855f7' },
  { icon: '💬', title: 'Unified Inbox', desc: 'Manage WhatsApp & Instagram messages in one place with AI-powered replies.', color: '#06b6d4' },
  { icon: '👔', title: 'Team Management', desc: 'Staff schedules, working hours, breaks, and time off — all in one place.', color: '#ec4899' },
];

const verticals = [
  { emoji: '💇', label: 'Salons & Barbershops' },
  { emoji: '💅', label: 'Nail Studios' },
  { emoji: '🧖', label: 'Spas & Wellness' },
  { emoji: '💪', label: 'Fitness & Personal Training' },
  { emoji: '🏥', label: 'Clinics & Health' },
  { emoji: '📸', label: 'Photography Studios' },
  { emoji: '🎓', label: 'Tutoring & Coaching' },
  { emoji: '🐾', label: 'Pet Services' },
];

const plans = [
  {
    name: 'Starter', price: '$29', period: '/month',
    features: ['Up to 50 bookings/month', '1 team member', 'WhatsApp integration', 'AI-powered reminders', 'Client CRM'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Pro', price: '$79', period: '/month',
    features: ['Unlimited bookings', '5 team members', 'WhatsApp + Instagram', 'AI automation suite', 'Advanced CRM', 'Revenue analytics', 'Priority support'],
    cta: 'Get Started',
    featured: true,
  },
  {
    name: 'Business', price: '$149', period: '/month',
    features: ['Unlimited everything', '20 team members', 'All integrations', 'Custom AI automations', 'Advanced CRM', 'White-label booking', 'Dedicated support', 'API access'],
    cta: 'Contact Sales',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon"><Sparkles size={20} color="#fff" /></div>
          <span className="logo-text" style={{ fontSize: '1.15rem' }}>AutoBiz Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero" style={{ paddingTop: 100, paddingBottom: 80 }}>
        <div className="hero-glow" />
        <div className="hero-badge">
          <Star size={12} fill="currentColor" /> Trusted by thousands of businesses worldwide
        </div>
        <h1>
          Run Your Business on{' '}
          <span className="hero-gradient-text">Autopilot</span>
        </h1>
        <p>
          The all-in-one platform for bookings, client management, and AI-powered automation —
          so you can focus on delivering great service.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">
            Start Free 14-Day Trial <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            View Demo
          </Link>
        </div>
        <div style={{ marginTop: 48, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: Shield, label: 'No credit card required' },
            { icon: Bot, label: 'AI-powered automation' },
            { icon: BarChart3, label: 'Real-time analytics' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Icon size={15} style={{ color: 'var(--color-primary-light)' }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Verticals */}
      <div style={{ textAlign: 'center', padding: '48px 24px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
          Built for every appointment-based business
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 700, margin: '0 auto' }}>
          {verticals.map(v => (
            <div key={v.label} style={{
              padding: '8px 18px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', fontSize: '0.85rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{v.emoji}</span> {v.label}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="features">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="section-tag">Everything You Need</div>
          <h2 style={{ fontSize: '2rem' }}>One Platform, Infinite Possibilities</h2>
          <p style={{ marginTop: 12, maxWidth: 500, margin: '12px auto 0' }}>
            From booking to billing, messaging to management — run your entire business from one dashboard.
          </p>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon" style={{ background: `${f.color}20`, fontSize: '1.6rem' }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="pricing">
        <div className="section-tag">Pricing</div>
        <h2 style={{ fontSize: '2rem' }}>Simple, Transparent Pricing</h2>
        <p style={{ marginTop: 12 }}>Start free for 14 days, then choose the plan that fits your business.</p>
        <div className="pricing-grid">
          {plans.map(plan => (
            <div key={plan.name} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
              <div className="pricing-plan">{plan.name}</div>
              <div className="pricing-price">
                {plan.price}<span>{plan.period}</span>
              </div>
              <ul className="pricing-features">
                {plan.features.map(f => (
                  <li key={f}>
                    <Check size={15} className="pricing-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`btn w-full ${plan.featured ? '' : 'btn-secondary'}`}
                style={plan.featured ? { background: 'white', color: '#4f46e5', justifyContent: 'center', fontWeight: 700 } : { justifyContent: 'center' }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ textAlign: 'center', padding: '80px 48px', borderTop: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Ready to Grow Your Business?</h2>
        <p style={{ marginBottom: 28 }}>Join thousands of businesses already running smarter with AutoBiz Pro.</p>
        <Link to="/register" className="btn btn-primary btn-lg">
          Start Your Free Trial <ArrowRight size={18} />
        </Link>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-icon" style={{ width: 28, height: 28 }}><Sparkles size={14} color="#fff" /></div>
          <span>AutoBiz Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--text-muted)' }}>Terms of Service</Link>
        </div>
        <span>© {new Date().getFullYear()} AutoBiz Pro. All rights reserved.</span>
      </div>
    </div>
  );
}
