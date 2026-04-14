import { useState } from 'react';
import { User, Building, Phone, Mail, Globe, Save, CreditCard, Bell, Shield, Check } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const plans = [
  { name: 'Starter', price: '₹999/mo', features: ['50 bookings/mo', '1 staff', 'WhatsApp'], color: '#94a3b8' },
  { name: 'Pro', price: '₹2,499/mo', features: ['Unlimited bookings', '5 staff', 'WhatsApp + Instagram', 'Analytics'], color: '#6366f1', current: true },
  { name: 'Business', price: '₹5,999/mo', features: ['Everything', '20 staff', 'White-label', 'API'], color: '#a855f7' },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('business');

  const [businessForm, setBusinessForm] = useState({
    businessName: user?.businessName || 'HairCraft Pro',
    ownerName: user?.name || 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: user?.email || 'rahul@haircraft.com',
    address: '123 MG Road, Bangalore, Karnataka',
    website: 'haircraft.in',
    category: 'Salon & Spa',
  });

  const [notifForm, setNotifForm] = useState({
    bookingConfirmation: true,
    bookingReminder: true,
    paymentReceived: true,
    newMessage: true,
    walkinEntry: false,
    weeklyReport: true,
  });

  const tabs = [
    { key: 'business', label: 'Business', icon: Building },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { key: 'security', label: 'Security', icon: Shield },
  ];

  const updBiz = (k, v) => setBusinessForm(p => ({ ...p, [k]: v }));
  const updNotif = (k) => setNotifForm(p => ({ ...p, [k]: !p[k] }));

  const saveSettings = () => {
    toast('Settings saved successfully!', 'success');
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your business profile and preferences" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          {/* Sidebar Tabs */}
          <div className="card" style={{ padding: 8, height: 'fit-content' }}>
            {tabs.map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  background: activeTab === tab.key ? 'var(--color-primary-glow)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  transition: 'all 0.15s', marginBottom: 2,
                }}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'business' && (
              <div className="card">
                <div style={{ marginBottom: 24 }}>
                  <h3>Business Profile</h3>
                  <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Update your business information displayed to customers</p>
                </div>

                {/* Logo/Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    {businessForm.businessName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{businessForm.businessName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{businessForm.category}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { k: 'businessName', label: 'Business Name', icon: Building, type: 'text' },
                    { k: 'ownerName', label: 'Owner Name', icon: User, type: 'text' },
                    { k: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
                    { k: 'email', label: 'Email', icon: Mail, type: 'email' },
                    { k: 'website', label: 'Website', icon: Globe, type: 'text' },
                    { k: 'category', label: 'Business Category', icon: Building, type: 'text', isSelect: true, opts: ['Salon & Spa', 'Barbershop', 'Fitness', 'Yoga', 'Medical', 'Restaurant', 'Other'] },
                  ].map(({ k, label, icon: Icon, type, isSelect, opts }) => (
                    <div className="form-group" key={k}>
                      <label className="form-label">{label}</label>
                      <div style={{ position: 'relative' }}>
                        <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                        {isSelect ? (
                          <select className="form-select" style={{ paddingLeft: 36 }} value={businessForm[k]} onChange={e => updBiz(k, e.target.value)}>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={type} className="form-input" style={{ paddingLeft: 36 }} value={businessForm[k]} onChange={e => updBiz(k, e.target.value)} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" value={businessForm.address} onChange={e => updBiz('address', e.target.value)} style={{ minHeight: 70 }} />
                </div>

                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={saveSettings}>
                  <Save size={15} /> Save Changes
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <div style={{ marginBottom: 24 }}>
                  <h3>Notification Preferences</h3>
                  <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Choose which events trigger notifications</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { k: 'bookingConfirmation', label: 'Booking Confirmation', desc: 'When a new booking is confirmed' },
                    { k: 'bookingReminder', label: 'Booking Reminder', desc: '2 hours before each appointment' },
                    { k: 'paymentReceived', label: 'Payment Received', desc: 'When a payment is completed' },
                    { k: 'newMessage', label: 'New Message', desc: 'When a customer sends a message' },
                    { k: 'walkinEntry', label: 'Walk-in Entry', desc: 'When a new walk-in is logged' },
                    { k: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly business summary every Monday' },
                  ].map(({ k, label, desc }, i, arr) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={notifForm[k]} onChange={() => updNotif(k)} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={saveSettings}>
                  <Save size={15} /> Save Preferences
                </button>
              </div>
            )}

            {activeTab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card">
                  <h3 style={{ marginBottom: 4 }}>Current Plan</h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>You are on the <strong style={{ color: 'var(--color-primary-light)' }}>Pro</strong> plan</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {plans.map(plan => (
                      <div key={plan.name} style={{
                        border: `2px solid ${plan.current ? plan.color : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-lg)', padding: 20,
                        background: plan.current ? plan.color + '12' : 'transparent',
                      }}>
                        <div style={{ fontWeight: 800, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>{plan.price}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                          {plan.features.map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                              <Check size={12} style={{ color: plan.color, flexShrink: 0 }} /> {f}
                            </div>
                          ))}
                        </div>
                        {plan.current ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>Current Plan</span>
                        ) : (
                          <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'center' }}>Switch</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: 16 }}>Payment Method</h3>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <CreditCard size={24} style={{ color: 'var(--color-primary-light)' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>•••• •••• •••• 4242</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expires 12/27</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Update</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Security Settings</h3>
                <p style={{ fontSize: '0.875rem', marginBottom: 24 }}>Manage your password and account security</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div className="form-group" key={label}>
                      <label className="form-label">{label}</label>
                      <input type="password" className="form-input" placeholder="••••••••" />
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={() => toast('Password changed!', 'success')}>
                    <Shield size={15} /> Update Password
                  </button>
                </div>
                <div className="divider" style={{ margin: '28px 0' }} />
                <div>
                  <h4 style={{ marginBottom: 4, color: 'var(--color-danger)' }}>Danger Zone</h4>
                  <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>These actions are irreversible</p>
                  <button className="btn btn-danger btn-sm" onClick={() => toast('Please contact support to delete your account', 'info')}>
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
