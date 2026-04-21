import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, DollarSign, MessageSquare, Users, TrendingUp, TrendingDown,
  Plus, UserPlus, Clock, ChevronRight, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const statusColors = {
  confirmed: { color: 'var(--color-success)', bg: 'var(--color-success-glow)' },
  pending:   { color: 'var(--color-warning)', bg: 'var(--color-warning-glow)' },
  completed: { color: 'var(--color-accent)', bg: 'var(--color-accent-glow)' },
  cancelled: { color: 'var(--color-danger)', bg: 'var(--color-danger-glow)' },
};

function AddBookingModal({ onClose, onSave, services }) {
  const [form, setForm] = useState({ customer: '', phone: '', serviceId: '', time: '', date: '', amount: '' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Add New Booking</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input type="text" className="form-input" placeholder="Priya Mehta" value={form.customer} onChange={e => upd('customer', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => upd('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Service</label>
            <select className="form-select" value={form.serviceId} onChange={e => {
              const svc = services.find(s => s.id === e.target.value);
              upd('serviceId', e.target.value);
              if (svc) upd('amount', svc.price.toString());
            }}>
              <option value="">Select service...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — ₹{s.price}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.date} onChange={e => upd('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input type="time" className="form-input" value={form.time} onChange={e => upd('time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-input" placeholder="800" value={form.amount} onChange={e => upd('amount', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave(form)}>Confirm Booking</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [todayBookings, setTodayBookings] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [stats, setStats] = useState({ todayBookings: 0, revenue: 0, pendingPayments: 0, unreadMessages: 0, revenueTrend: 0 });
  const [services, setServices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [bookingsRes, analyticsRes, todayStatsRes, servicesRes, automationsRes] = await Promise.allSettled([
        api.get(`/api/bookings?date=${today}`),
        api.get('/api/analytics?days=7'),
        api.get('/api/analytics/today'),
        api.get('/api/services'),
        api.get('/api/automations'),
      ]);

      if (bookingsRes.status === 'fulfilled') setTodayBookings(bookingsRes.value.data.bookings || []);
      if (servicesRes.status === 'fulfilled') setServices(servicesRes.value.data.services || []);
      if (automationsRes.status === 'fulfilled') setAutomations(automationsRes.value.data.automations || []);

      if (todayStatsRes.status === 'fulfilled') {
        setStats(todayStatsRes.value.data);
      }

      if (analyticsRes.status === 'fulfilled') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = (analyticsRes.value.data.analytics || []).map(d => ({
          day: days[new Date(d.date).getDay()],
          revenue: d.revenue,
          bookings: d.bookingCount,
        }));
        setRevenueData(chartData.length > 0 ? chartData : [{ day: 'Today', revenue: 0, bookings: 0 }]);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const pending = todayBookings.filter(b => b.status === 'pending').length;
  const revenue = todayBookings.filter(b => b.status !== 'cancelled').reduce((a, b) => a + b.amount, 0);

  const dashStats = [
    { label: "Today's Bookings", value: stats.todayBookings || todayBookings.length, icon: Calendar, gradient: 'var(--gradient-primary)', trend: `${stats.revenueTrend >= 0 ? '+' : ''}${stats.revenueTrend}%`, up: stats.revenueTrend >= 0 },
    { label: 'Revenue Today', value: `₹${(stats.revenue || revenue).toLocaleString()}`, icon: DollarSign, gradient: 'var(--gradient-success)', trend: `${stats.revenueTrend >= 0 ? '+' : ''}${stats.revenueTrend}%`, up: stats.revenueTrend >= 0 },
    { label: 'Pending', value: stats.pendingPayments || pending, icon: Clock, gradient: 'var(--gradient-warning)', trend: '', up: false },
    { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, gradient: 'var(--gradient-accent)', trend: '', up: true },
  ];

  const handleSaveBooking = async (form) => {
    if (!form.customer || !form.date || !form.time) { toast('Please fill customer, date and time', 'error'); return; }
    try {
      await api.post('/api/bookings', {
        customerName: form.customer,
        phone: form.phone,
        serviceId: form.serviceId || undefined,
        date: form.date,
        time: form.time,
        amount: form.amount || 0,
      });
      toast(`Booking added for ${form.customer}!`, 'success');
      setShowAddBooking(false);
      loadDashboardData();
    } catch (err) {
      toast(err.message || 'Failed to create booking', 'error');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ color: 'var(--color-primary-light)' }}>₹{payload[0].value.toLocaleString()}</div>
          {payload[1] && <div style={{ color: 'var(--text-muted)' }}>{payload[1].value} bookings</div>}
        </div>
      );
    }
    return null;
  };

  const activeAutomations = automations.filter(a => a.active);

  return (
    <>
      <Topbar
        title={`Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle={`${user?.businessName || 'Your Business'} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />
      <div className="page-content">
        {/* Stats */}
        <div className="dashboard-stats">
          {dashStats.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-card-icon" style={{ background: s.gradient }}>
                <s.icon size={20} color="#fff" />
              </div>
              <div className="stat-card-value" style={{ background: s.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}
              </div>
              <div className="stat-card-label">{s.label}</div>
              {s.trend && (
                <div className="stat-trend">
                  {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span className={s.up ? 'trend-up' : 'trend-down'}>{s.trend}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs yesterday</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <div className="quick-actions">
            <button className="btn btn-primary" onClick={() => setShowAddBooking(true)}>
              <Plus size={16} /> Add Booking
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/app/walkins')}>
              <UserPlus size={16} /> Add Walk-in
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/app/inbox')}>
              <MessageSquare size={16} /> View Inbox
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Left: Chart + Bookings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Revenue Chart */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Revenue This Week</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Total: ₹{revenueData.reduce((a, b) => a + (b.revenue || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Today's Bookings Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
                <div className="section-header" style={{ marginBottom: 0 }}>
                  <div className="section-title">Today's Schedule</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/bookings')}>
                    View All <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayBookings.length === 0 ? (
                      <tr><td colSpan={5}>
                        <div className="empty-state" style={{ padding: 30 }}>
                          <div style={{ fontWeight: 600 }}>{loadingData ? 'Loading...' : 'No bookings today'}</div>
                        </div>
                      </td></tr>
                    ) : todayBookings.map(b => {
                      const sc = statusColors[b.status] || statusColors.pending;
                      const name = b.customer?.name || 'Walk-in';
                      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="avatar" style={{ background: (b.customer?.avatarColor || '#6366f1') + '25', color: b.customer?.avatarColor || '#6366f1' }}>{initials}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.customer?.phone || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>{b.service?.name || '-'}</td>
                          <td><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} style={{ color: 'var(--text-muted)' }} /> {b.time}</span></td>
                          <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{b.amount}</td>
                          <td>
                            <span className="badge" style={{ background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Automation Status */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Automation</div>
                <span className="badge badge-success">{activeAutomations.length} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeAutomations.slice(0, 3).map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(activeAutomations.length, 3) - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{a.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.runs} runs</span>
                  </div>
                ))}
                {activeAutomations.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '12px 0' }}>No active automations</div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 14, justifyContent: 'center' }} onClick={() => navigate('/app/automation')}>
                Manage Automations
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddBooking && <AddBookingModal onClose={() => setShowAddBooking(false)} onSave={handleSaveBooking} services={services} />}
    </>
  );
}
