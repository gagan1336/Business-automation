import { useState } from 'react';
import { UserPlus, Clock, Phone, Scissors, DollarSign, Check, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import { mockWalkins, mockServices } from '../data/mockData';
import { useToast } from '../context/ToastContext';

export default function Walkins() {
  const { toast } = useToast();
  const [walkins, setWalkins] = useState(mockWalkins);
  const [form, setForm] = useState({ name: '', phone: '', service: '', amount: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleServiceChange = (svcName) => {
    const svc = mockServices.find(s => s.name === svcName);
    upd('service', svcName);
    if (svc) upd('amount', svc.price.toString());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.service) { toast('Please fill Name, Phone and Service', 'error'); return; }
    setLoading(true);
    setTimeout(() => {
      const newWalkin = {
        id: Date.now(),
        name: form.name,
        phone: form.phone,
        service: form.service,
        amount: parseInt(form.amount) || 0,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: '2026-04-11',
      };
      setWalkins(ws => [newWalkin, ...ws]);
      setForm({ name: '', phone: '', service: '', amount: '', notes: '' });
      toast(`Walk-in saved! Thank-you SMS sent to ${form.name} 📱`, 'success');
      setLoading(false);
    }, 700);
  };

  const today = '2026-04-11';
  const todayWalkins = walkins.filter(w => w.date === today);
  const totalRevenue = todayWalkins.reduce((a, w) => a + w.amount, 0);

  return (
    <>
      <Topbar title="Walk-in Entry" subtitle="Log walk-in customers and send thank-you messages" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 28 }}>
          {/* Entry Form */}
          <div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>New Walk-in</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fill in the customer details</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <div style={{ position: 'relative' }}>
                    <UserPlus size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" style={{ paddingLeft: 36 }} placeholder="Full name" value={form.name} onChange={e => upd('name', e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="tel" className="form-input" style={{ paddingLeft: 36 }} placeholder="+91 98765 43210" value={form.phone} onChange={e => upd('phone', e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Service *</label>
                  <div style={{ position: 'relative' }}>
                    <Scissors size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                    <select className="form-select" style={{ paddingLeft: 36 }} value={form.service} onChange={e => handleServiceChange(e.target.value)} required>
                      <option value="">Select service...</option>
                      {mockServices.map(s => <option key={s.id} value={s.name}>{s.name} — ₹{s.price} ({s.duration} min)</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="number" className="form-input" style={{ paddingLeft: 36 }} placeholder="0" value={form.amount} onChange={e => upd('amount', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-textarea" placeholder="Any special requirements..." value={form.notes} onChange={e => upd('notes', e.target.value)} style={{ minHeight: 70 }} />
                </div>

                <div style={{ background: 'var(--color-success-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: '0.8rem', color: 'var(--color-success)' }}>
                  ✓ A thank-you WhatsApp message will be automatically sent after saving
                </div>

                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: 13 }} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : <><Check size={16} /> Save Walk-in</>}
                </button>
              </form>
            </div>
          </div>

          {/* Today's Walk-ins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'var(--gradient-primary)' }}><UserPlus size={18} color="#fff" /></div>
                <div className="stat-card-value" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{todayWalkins.length}</div>
                <div className="stat-card-label">Walk-ins Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'var(--gradient-success)' }}><DollarSign size={18} color="#fff" /></div>
                <div className="stat-card-value" style={{ background: 'var(--gradient-success)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>₹{totalRevenue.toLocaleString()}</div>
                <div className="stat-card-label">Revenue (Walk-ins)</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700 }}>Today's Walk-ins</div>
              </div>
              {todayWalkins.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon"><UserPlus size={24} /></div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No walk-ins today</div>
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Time</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayWalkins.map(w => (
                        <tr key={w.id}>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.phone}</div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.875rem' }}>{w.service}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem' }}>
                              <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {w.time}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{w.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
