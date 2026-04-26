import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, X, Clock, Check, ChevronLeft, ChevronRight, Plus, XCircle, UserX } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const statusColors = {
  confirmed: { color: 'var(--color-success)', bg: 'var(--color-success-glow)' },
  pending:   { color: 'var(--color-warning)', bg: 'var(--color-warning-glow)' },
  completed: { color: 'var(--color-accent)', bg: 'var(--color-accent-glow)' },
  cancelled: { color: 'var(--color-danger)', bg: 'var(--color-danger-glow)' },
  no_show:   { color: 'var(--color-danger)', bg: 'var(--color-danger-glow)' },
};

export default function Bookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState('$');

  useEffect(() => { loadBookings(); }, [selectedDate, statusFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const { data } = await api.get(`/api/bookings?${params}`);
      setBookings(data.bookings || []);
      setTotal(data.total || 0);

      // Get currency from settings
      try {
        const { data: meData } = await api.get('/api/auth/me');
        setCurrency(meData.business?.settings?.currencySymbol || '$');
      } catch {}
    } catch (err) {
      toast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/bookings/${id}`, { status });
      toast(`Booking ${status === 'no_show' ? 'marked as no-show' : status}!`, 'success');
      loadBookings();
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      toast('Booking deleted', 'success');
      loadBookings();
    } catch (err) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const changeDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filtered = bookings.filter(b => {
    const name = b.customer?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <>
      <Topbar title="Bookings" subtitle={`${total} appointments · ${dateLabel}`} />
      <div className="page-content">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '4px 8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeDate(-1)}><ChevronLeft size={16} /></button>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', padding: '4px 8px', cursor: 'pointer' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => changeDate(1)}><ChevronRight size={16} /></button>
          </div>
          {!isToday && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>Today</button>
          )}
          <select className="form-select" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 32, fontSize: '0.8rem' }} placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Team</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <div className="empty-state-icon"><Calendar size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No bookings found</div>
                      <p style={{ fontSize: '0.8rem' }}>No appointments for this date and filter combination.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(b => {
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
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{b.customer?.phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{b.service?.name || '-'}</td>
                      <td>
                        {b.staffMember ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: (b.staffMember.avatarColor || '#6366f1') + '25', color: b.staffMember.avatarColor || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                              {b.staffMember.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span style={{ fontSize: '0.8rem' }}>{b.staffMember.name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {b.time}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.85rem' }}>
                        {currency}{b.amount || (b.amountCents ? (b.amountCents / 100).toFixed(2) : '0.00')}
                      </td>
                      <td>
                        <span className="badge" style={{ background: sc.bg, color: sc.color, textTransform: 'capitalize', fontSize: '0.72rem' }}>
                          {b.status === 'no_show' ? 'No Show' : b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {b.status === 'pending' && (
                            <button className="btn btn-ghost btn-sm" title="Confirm" onClick={() => updateStatus(b.id, 'confirmed')}><Check size={13} style={{ color: 'var(--color-success)' }} /></button>
                          )}
                          {(b.status === 'confirmed' || b.status === 'pending') && (
                            <>
                              <button className="btn btn-ghost btn-sm" title="Complete" onClick={() => updateStatus(b.id, 'completed')}><Check size={13} /></button>
                              <button className="btn btn-ghost btn-sm" title="No Show" onClick={() => updateStatus(b.id, 'no_show')}><UserX size={13} style={{ color: 'var(--color-warning)' }} /></button>
                              <button className="btn btn-ghost btn-sm" title="Cancel" onClick={() => updateStatus(b.id, 'cancelled')}><XCircle size={13} style={{ color: 'var(--color-danger)' }} /></button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDelete(b.id)}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
