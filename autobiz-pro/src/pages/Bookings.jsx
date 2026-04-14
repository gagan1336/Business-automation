import { useState } from 'react';
import { Plus, Search, Calendar, Clock, Filter, X, ChevronDown } from 'lucide-react';
import Topbar from '../components/Topbar';
import { mockBookings, mockServices } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const statusColors = {
  confirmed: { color: 'var(--color-success)', bg: 'var(--color-success-glow)', label: 'Confirmed' },
  pending:   { color: 'var(--color-warning)', bg: 'var(--color-warning-glow)', label: 'Pending' },
  completed: { color: 'var(--color-accent)', bg: 'var(--color-accent-glow)', label: 'Completed' },
  cancelled: { color: 'var(--color-danger)', bg: 'var(--color-danger-glow)', label: 'Cancelled' },
};

function BookingModal({ booking, onClose, onStatusChange }) {
  if (!booking) return null;
  const sc = statusColors[booking.status];
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Booking Details</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.1rem', background: booking.avatarColor + '25', color: booking.avatarColor }}>{booking.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{booking.customer}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{booking.phone}</div>
          </div>
          <span className="badge" style={{ background: sc.bg, color: sc.color, marginLeft: 'auto' }}>{sc.label}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Service', value: booking.service },
            { label: 'Amount', value: `₹${booking.amount}` },
            { label: 'Date', value: booking.date },
            { label: 'Time', value: booking.time },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['confirmed', 'completed', 'cancelled'].map(s => s !== booking.status && (
            <button key={s} className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger' : s === 'completed' ? 'btn-success' : 'btn-primary'}`}
              onClick={() => onStatusChange(booking.id, s)}>
              Mark {statusColors[s].label}
            </button>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function AddBookingModal({ onClose, onSave }) {
  const [form, setForm] = useState({ customer: '', phone: '', service: '', date: '', time: '', amount: '' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">New Booking</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input type="text" className="form-input" placeholder="Full name" value={form.customer} onChange={e => upd('customer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+91..." value={form.phone} onChange={e => upd('phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Service</label>
            <select className="form-select" value={form.service} onChange={e => {
              const svc = mockServices.find(s => s.name === e.target.value);
              upd('service', e.target.value);
              if (svc) upd('amount', svc.price.toString());
            }}>
              <option value="">Select service...</option>
              {mockServices.map(s => <option key={s.id} value={s.name}>{s.name} — ₹{s.price}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => upd('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input type="time" className="form-input" value={form.time} onChange={e => upd('time', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-input" placeholder="0" value={form.amount} onChange={e => upd('amount', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave(form)}>Confirm Booking</button>
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState(mockBookings);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const today = '2026-04-11';
  const tabs = [
    { key: 'all', label: 'All Bookings' },
    { key: 'today', label: "Today" },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  const filtered = bookings.filter(b => {
    const matchSearch = b.customer.toLowerCase().includes(search.toLowerCase()) || b.service.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchTab = activeTab === 'all' ? true : activeTab === 'today' ? b.date === today : b.date > today;
    return matchSearch && matchStatus && matchTab;
  });

  const handleStatusChange = (id, status) => {
    setBookings(bks => bks.map(b => b.id === id ? { ...b, status } : b));
    toast(`Booking marked as ${statusColors[status].label}`, 'success');
    setSelectedBooking(null);
  };

  const handleSave = (form) => {
    if (!form.customer || !form.service) { toast('Please fill required fields', 'error'); return; }
    const newB = {
      id: Date.now(), customer: form.customer, phone: form.phone, service: form.service,
      date: form.date || today, time: form.time || '12:00 PM', amount: parseInt(form.amount) || 0,
      status: 'confirmed', avatar: form.customer.slice(0, 2).toUpperCase(), avatarColor: '#6366f1',
    };
    setBookings(bks => [newB, ...bks]);
    toast(`Booking added for ${form.customer}!`, 'success');
    setShowAdd(false);
  };

  return (
    <>
      <Topbar title="Bookings" subtitle="Manage all your appointments" />
      <div className="page-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === t.key ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === t.key ? '#fff' : 'var(--text-secondary)' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 38 }} placeholder="Search customer or service..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(statusColors).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New Booking
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Calendar size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No bookings found</div>
                      <p style={{ fontSize: '0.85rem' }}>Adjust your filters or add a new booking.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(b => {
                  const sc = statusColors[b.status];
                  return (
                    <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedBooking(b)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ background: b.avatarColor + '25', color: b.avatarColor }}>{b.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.customer}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{b.service}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem' }}>
                          <Calendar size={12} style={{ color: 'var(--text-muted)' }} /> {b.date}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {b.time}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{b.amount}</td>
                      <td>
                        <span className="badge" style={{ background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{b.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedBooking(b); }}>Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {bookings.length} bookings
        </div>
      </div>

      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onStatusChange={handleStatusChange} />}
      {showAdd && <AddBookingModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </>
  );
}
