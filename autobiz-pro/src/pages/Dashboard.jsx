import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, DollarSign, MessageSquare, Users, TrendingUp, TrendingDown,
  Plus, UserPlus, Clock, ChevronRight, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Topbar from '../components/Topbar';
import { mockBookings, mockRevenueData } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const statusColors = {
  confirmed: { color: 'var(--color-success)', bg: 'var(--color-success-glow)' },
  pending:   { color: 'var(--color-warning)', bg: 'var(--color-warning-glow)' },
  completed: { color: 'var(--color-accent)', bg: 'var(--color-accent-glow)' },
  cancelled: { color: 'var(--color-danger)', bg: 'var(--color-danger-glow)' },
};

function AddBookingModal({ onClose, onSave }) {
  const [form, setForm] = useState({ customer: '', service: '', time: '', date: '', amount: '' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Add New Booking</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { k: 'customer', label: 'Customer Name', type: 'text', ph: 'Priya Mehta' },
            { k: 'service', label: 'Service', type: 'text', ph: 'Hair Cut & Style' },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'time', label: 'Time', type: 'time' },
            { k: 'amount', label: 'Amount (₹)', type: 'number', ph: '800' },
          ].map(({ k, label, type, ph }) => (
            <div className="form-group" key={k}>
              <label className="form-label">{label}</label>
              <input type={type} className="form-input" placeholder={ph} value={form[k]} onChange={e => upd(k, e.target.value)} />
            </div>
          ))}
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

  const todayBookings = mockBookings.filter(b => b.date === '2026-04-11');
  const pending = todayBookings.filter(b => b.status === 'pending').length;
  const revenue = todayBookings.filter(b => b.status !== 'cancelled').reduce((a, b) => a + b.amount, 0);

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, icon: Calendar, gradient: 'var(--gradient-primary)', trend: '+12%', up: true },
    { label: 'Revenue Today', value: `₹${revenue.toLocaleString()}`, icon: DollarSign, gradient: 'var(--gradient-success)', trend: '+8%', up: true },
    { label: 'Pending Payments', value: pending, icon: Clock, gradient: 'var(--gradient-warning)', trend: '-2', up: false },
    { label: 'Unread Messages', value: 3, icon: MessageSquare, gradient: 'var(--gradient-accent)', trend: 'New', up: true },
  ];

  const handleSaveBooking = (form) => {
    if (!form.customer || !form.service) { toast('Please fill customer and service', 'error'); return; }
    toast(`Booking added for ${form.customer}!`, 'success');
    setShowAddBooking(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ color: 'var(--color-primary-light)' }}>₹{payload[0].value.toLocaleString()}</div>
          <div style={{ color: 'var(--text-muted)' }}>{payload[1]?.value} bookings</div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Topbar
        title={`Good ${new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, ${user?.name?.split(' ')[0]} 👋`}
        subtitle={`${user?.businessName} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />
      <div className="page-content">
        {/* Stats */}
        <div className="dashboard-stats">
          {stats.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-card-icon" style={{ background: s.gradient }}>
                <s.icon size={20} color="#fff" />
              </div>
              <div className="stat-card-value" style={{ background: s.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-trend">
                {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className={s.up ? 'trend-up' : 'trend-down'}>{s.trend}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs yesterday</span>
              </div>
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
                    Total: ₹{mockRevenueData.reduce((a, b) => a + b.revenue, 0).toLocaleString()}
                  </div>
                </div>
                <span className="badge badge-success">+18% vs last week</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mockRevenueData}>
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
                    {todayBookings.map(b => {
                      const sc = statusColors[b.status] || statusColors.pending;
                      return (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="avatar" style={{ background: b.avatarColor + '25', color: b.avatarColor }}>{b.avatar}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.customer}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>{b.service}</td>
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
            {/* Upcoming */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Upcoming Reminders</div>
              </div>
              {[
                { label: 'Send reminder to Priya Mehta', time: '30 min', color: 'var(--color-primary)' },
                { label: 'Follow-up with Sneha Patel', time: '2 hours', color: 'var(--color-warning)' },
                { label: 'Payment pending: Arjun Singh', time: 'Today', color: 'var(--color-danger)' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.85rem' }}>{r.label}</div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{r.time}</span>
                </div>
              ))}
            </div>

            {/* Top Services */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Top Services</div>
                <span className="badge badge-accent">This week</span>
              </div>
              {[
                { name: 'Haircut & Style', count: 24, pct: 85 },
                { name: 'Hair Color', count: 18, pct: 65 },
                { name: 'Beard Trim', count: 15, pct: 55 },
                { name: 'Facial', count: 10, pct: 35 },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.count} bookings</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.pct}%`, background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Automation Status */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Automation</div>
                <span className="badge badge-success">4 Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'Price Enquiry Reply', runs: 48, active: true },
                  { name: 'Booking Confirmation', runs: 124, active: true },
                  { name: '24h Follow-up', runs: 32, active: true },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{a.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.runs} runs</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 14, justifyContent: 'center' }} onClick={() => navigate('/app/automation')}>
                Manage Automations
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddBooking && <AddBookingModal onClose={() => setShowAddBooking(false)} onSave={handleSaveBooking} />}
    </>
  );
}
