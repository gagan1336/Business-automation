import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User, Phone, MapPin, Globe, CreditCard, Shield, Palette,
  Clock, DollarSign, Calendar, Bell, Save, ExternalLink
} from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../api/client';

const TABS = [
  { id: 'profile', label: 'Business Profile', icon: User },
  { id: 'localization', label: 'Localization', icon: Globe },
  { id: 'automations', label: 'Automation', icon: Bell },
  { id: 'billing', label: 'Subscription', icon: CreditCard },
  { id: 'compliance', label: 'Privacy & Compliance', icon: Shield },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
  { code: 'SGD', symbol: '$', label: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
];

const PLANS = [
  { id: 'Free', name: 'Free', price: '$0', features: ['50 bookings/month', '1 team member', 'Basic CRM'], envKey: null },
  { id: 'Starter', name: 'Starter', price: '$29/mo', features: ['Unlimited bookings', '1 team member', 'WhatsApp', 'AI Reminders'], envKey: 'STRIPE_PRICE_STARTER' },
  { id: 'Pro', name: 'Pro', price: '$79/mo', features: ['Unlimited bookings', '5 team members', 'All integrations', 'AI automation'], envKey: 'STRIPE_PRICE_PRO', featured: true },
  { id: 'Business', name: 'Business', price: '$149/mo', features: ['Unlimited everything', '20 team members', 'White-label', 'API access'], envKey: 'STRIPE_PRICE_BUSINESS' },
];

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(null);

  const [profile, setProfile] = useState({
    name: user?.businessName || '', ownerName: user?.name || '',
    phone: user?.phone || '', address: user?.address || '',
    website: user?.website || '', category: user?.category || 'Service Business',
  });

  const [settings, setSettings] = useState({
    timezone: 'America/New_York', currency: 'USD', currencySymbol: '$',
    locale: 'en-US', dateFormat: 'MM/DD/YYYY', clockFormat: '12h',
    bufferMinutes: 10, bookingWindowDays: 30, brandColor: '#6366f1',
    marketingConsentRequired: true,
    autoReminder24h: true, autoReminder2h: true,
    autoReviewRequest: true, autoRebookingNudgeDays: 0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      const b = data.business;
      if (b) {
        setProfile({
          name: b.name || '', ownerName: b.ownerName || '',
          phone: b.phone || '', address: b.address || '',
          website: b.website || '', category: b.category || 'Service Business',
        });
        if (b.settings) setSettings(prev => ({ ...prev, ...b.settings }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.patch('/api/auth/profile', profile);
      toast('Profile updated!', 'success');
      refreshProfile?.();
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await api.patch('/api/auth/settings', settings);
      toast('Settings saved!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBilling = async (planId) => {
    setBillingLoading(planId);
    try {
      const { data } = await api.post('/api/billing/checkout', { plan: planId.toLowerCase() });
      if (data.url) window.location.href = data.url;
      else toast('Checkout session created', 'info');
    } catch (err) {
      toast(err.message || 'Billing error', 'error');
    } finally {
      setBillingLoading(null);
    }
  };

  const categories = ['Service Business', 'Salon & Beauty', 'Health & Wellness', 'Fitness & Training', 'Professional Services', 'Education & Coaching', 'Pet Services', 'Photography & Creative', 'Other'];

  const upd = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const updS = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your business settings and preferences" />
      <div className="page-content">
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto', paddingBottom: 4, borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map(t => (
            <button key={t.id} className={`btn ${tab === t.id ? '' : 'btn-ghost'} btn-sm`}
              style={tab === t.id ? { background: 'var(--color-surface-2)', color: 'var(--text-primary)', borderBottom: '2px solid var(--color-primary)' } : { borderBottom: '2px solid transparent' }}
              onClick={() => setTab(t.id)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Business Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input className="form-input" value={profile.name} onChange={e => upd('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" value={profile.ownerName} onChange={e => upd('ownerName', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={profile.phone} onChange={e => upd('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={profile.category} onChange={e => upd('category', e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={profile.address} onChange={e => upd('address', e.target.value)} placeholder="123 Main St, City, State" />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" value={profile.website} onChange={e => upd('website', e.target.value)} placeholder="https://yourbusiness.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Booking Page</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="form-input" readOnly value={`${window.location.origin}/book/${user?.slug || 'your-business'}`} style={{ flex: 1, color: 'var(--color-primary-light)' }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${user?.slug || ''}`); toast('Link copied!', 'success'); }}>Copy</button>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={saveProfile} disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* LOCALIZATION TAB */}
        {tab === 'localization' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Regional & Booking Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label"><Globe size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Timezone</label>
                  <select className="form-select" value={settings.timezone} onChange={e => updS('timezone', e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><DollarSign size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Currency</label>
                  <select className="form-select" value={settings.currency} onChange={e => {
                    const curr = CURRENCIES.find(c => c.code === e.target.value);
                    updS('currency', e.target.value);
                    if (curr) updS('currencySymbol', curr.symbol);
                  }}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label"><Calendar size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Date Format</label>
                  <select className="form-select" value={settings.dateFormat} onChange={e => updS('dateFormat', e.target.value)}>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><Clock size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Clock Format</label>
                  <select className="form-select" value={settings.clockFormat} onChange={e => updS('clockFormat', e.target.value)}>
                    <option value="12h">12-hour (1:00 PM)</option>
                    <option value="24h">24-hour (13:00)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Buffer Between Bookings (min)</label>
                  <input type="number" className="form-input" min={0} max={60} value={settings.bufferMinutes} onChange={e => updS('bufferMinutes', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Booking Window (days ahead)</label>
                  <input type="number" className="form-input" min={1} max={365} value={settings.bookingWindowDays} onChange={e => updS('bookingWindowDays', Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Palette size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Brand Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="color" value={settings.brandColor} onChange={e => updS('brandColor', e.target.value)} style={{ width: 48, height: 38, border: 'none', cursor: 'pointer', borderRadius: 8, background: 'none' }} />
                  <input className="form-input" value={settings.brandColor} onChange={e => updS('brandColor', e.target.value)} style={{ width: 120 }} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={saveSettings} disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* AUTOMATION TAB */}
        {tab === 'automations' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Automation Preferences</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              These settings control AI-powered automations. Messages are generated contextually using AI for each customer.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'autoReminder24h', label: '24-Hour Reminder', desc: 'Send a reminder message 24 hours before the appointment' },
                { key: 'autoReminder2h', label: '2-Hour Reminder', desc: 'Send a brief reminder 2 hours before the appointment' },
                { key: 'autoReviewRequest', label: 'Review Request', desc: 'Ask for a review 24 hours after the appointment' },
                { key: 'marketingConsentRequired', label: 'Require Marketing Consent', desc: 'Require customers to opt-in before sending marketing messages' },
              ].map(toggle => (
                <label key={toggle.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <input type="checkbox" checked={settings[toggle.key]} onChange={e => updS(toggle.key, e.target.checked)}
                    style={{ marginTop: 3, accentColor: 'var(--color-primary)', width: 18, height: 18 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toggle.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{toggle.desc}</div>
                  </div>
                </label>
              ))}
              <div className="form-group">
                <label className="form-label">Rebooking Nudge (days after last visit, 0 = disabled)</label>
                <input type="number" className="form-input" min={0} max={90} value={settings.autoRebookingNudgeDays} onChange={e => updS('autoRebookingNudgeDays', Number(e.target.value))} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={saveSettings} disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Automation Settings'}
            </button>
          </div>
        )}

        {/* BILLING TAB */}
        {tab === 'billing' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 4 }}>Current Plan: <span style={{ color: 'var(--color-primary-light)' }}>{user?.plan || 'Free'}</span></h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Choose a plan that fits your business needs.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {PLANS.map(plan => {
                const isCurrent = (user?.plan || 'Free') === plan.id;
                return (
                  <div key={plan.id} className="card" style={{
                    borderColor: plan.featured ? 'var(--color-primary)' : undefined,
                    position: 'relative',
                  }}>
                    {plan.featured && (
                      <div style={{ position: 'absolute', top: -10, right: 16, background: 'var(--gradient-primary)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>Most Popular</div>
                    )}
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{plan.name}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>{plan.price}</div>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, fontSize: '0.8rem' }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--color-success)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`btn w-full ${isCurrent ? 'btn-ghost' : plan.featured ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ justifyContent: 'center' }}
                      disabled={isCurrent || billingLoading === plan.id}
                      onClick={() => handleBilling(plan.id)}
                    >
                      {isCurrent ? 'Current Plan' : billingLoading === plan.id ? 'Loading...' : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={async () => {
              try {
                const { data } = await api.post('/api/billing/portal');
                if (data.url) window.location.href = data.url;
              } catch (err) {
                toast('Portal not available', 'error');
              }
            }}>
              <ExternalLink size={14} /> Manage Billing in Stripe
            </button>
          </div>
        )}

        {/* COMPLIANCE TAB */}
        {tab === 'compliance' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Privacy & Compliance</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
              Manage data privacy, consent, and compliance settings. Your platform is GDPR-ready with built-in consent tracking, data export, and anonymization.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={15} /> Customer Data Export
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Export all data associated with a customer (GDPR Art. 20 — Data Portability). Available per-customer from the Customers page.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={15} /> Customer Anonymization
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Anonymize a customer's personal data while keeping aggregated analytics (GDPR Art. 17 — Right to Erasure). Available per-customer from the Customers page.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={15} /> Consent Tracking
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Marketing consent is tracked per-customer with timestamped logs. Toggle "Require Marketing Consent" in the Automation tab to enforce opt-in for marketing messages.
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={15} /> Audit Logs
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  All privacy-sensitive actions (data exports, anonymizations, consent changes) are automatically logged with timestamps, IP addresses, and actor information.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <a href="/privacy" target="_blank" className="btn btn-ghost btn-sm"><ExternalLink size={13} /> Privacy Policy</a>
              <a href="/terms" target="_blank" className="btn btn-ghost btn-sm"><ExternalLink size={13} /> Terms of Service</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
