import { useState, useEffect } from 'react';
import { Plus, Search, X, Clock, Calendar, Edit2, Trash2, UserPlus } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

function StaffModal({ staff, onClose, onSave, isNew }) {
  const [form, setForm] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    role: staff?.role || 'staff',
    workingHours: staff?.workingHours || {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '09:00', end: '17:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' },
    },
    active: staff?.active !== false,
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updHours = (day, field, val) => setForm(p => ({
    ...p,
    workingHours: {
      ...p.workingHours,
      [day]: { ...(p.workingHours[day] || {}), [field]: val },
    },
  }));

  const toggleDay = (day) => setForm(p => ({
    ...p,
    workingHours: {
      ...p.workingHours,
      [day]: p.workingHours[day] ? undefined : { start: '09:00', end: '17:00' },
    },
  }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3 className="modal-title">{isNew ? 'Add Team Member' : 'Edit Team Member'}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input type="text" className="form-input" placeholder="Full name" value={form.name} onChange={e => upd('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => upd('role', e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="email@example.com" value={form.email} onChange={e => upd('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+1..." value={form.phone} onChange={e => upd('phone', e.target.value)} />
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <label className="form-label" style={{ marginBottom: 10 }}>Working Hours</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DAYS.map(day => {
                const hours = form.workingHours?.[day];
                const isWorking = !!hours;
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: 120, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={isWorking} onChange={() => toggleDay(day)} style={{ accentColor: 'var(--color-primary)' }} />
                      {DAY_LABELS[day]}
                    </label>
                    {isWorking ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="time" className="form-input" style={{ width: 120, padding: '6px 10px', fontSize: '0.8rem' }} value={hours.start || '09:00'} onChange={e => updHours(day, 'start', e.target.value)} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                        <input type="time" className="form-input" style={{ width: 120, padding: '6px 10px', fontSize: '0.8rem' }} value={hours.end || '17:00'} onChange={e => updHours(day, 'end', e.target.value)} />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day off</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave(form)}>
            {isNew ? 'Add Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Team() {
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/staff');
      setStaff(data.staff || []);
    } catch (err) {
      toast('Failed to load team', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    if (!form.name) { toast('Name is required', 'error'); return; }
    try {
      if (editingStaff) {
        await api.patch(`/api/staff/${editingStaff.id}`, form);
        toast(`${form.name} updated!`, 'success');
      } else {
        await api.post('/api/staff', form);
        toast(`${form.name} added to team!`, 'success');
      }
      setEditingStaff(null);
      setShowAdd(false);
      loadStaff();
    } catch (err) {
      toast(err.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name} from your team?`)) return;
    try {
      await api.delete(`/api/staff/${id}`);
      toast(`${name} removed from team`, 'success');
      loadStaff();
    } catch (err) {
      toast(err.message || 'Failed to remove', 'error');
    }
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleColors = {
    owner: { bg: 'var(--color-primary-glow)', color: 'var(--color-primary-light)' },
    manager: { bg: 'var(--color-purple-glow)', color: 'var(--color-purple)' },
    staff: { bg: 'var(--color-accent-glow)', color: 'var(--color-accent)' },
  };

  return (
    <>
      <Topbar title="Team" subtitle="Manage your team members and schedules" />
      <div className="page-content">
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 38 }} placeholder="Search team members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {loading ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <div className="empty-state-icon"><UserPlus size={28} /></div>
                <div style={{ fontWeight: 600 }}>No team members yet</div>
                <p style={{ fontSize: '0.85rem' }}>Add your first team member to start scheduling.</p>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  <UserPlus size={16} /> Add Member
                </button>
              </div>
            </div>
          ) : filtered.map(s => {
            const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const rc = roleColors[s.role] || roleColors.staff;
            const workingDays = s.workingHours ? Object.keys(s.workingHours).filter(d => s.workingHours[d]) : [];
            return (
              <div className="card" key={s.id} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: '1rem', background: s.avatarColor + '25', color: s.avatarColor }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</div>
                    <span className="badge" style={{ background: rc.bg, color: rc.color, textTransform: 'capitalize', marginTop: 4 }}>{s.role}</span>
                  </div>
                  {!s.active && <span className="badge badge-neutral">Inactive</span>}
                </div>
                {s.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>📧 {s.email}</div>}
                {s.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>📱 {s.phone}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {workingDays.length > 0 ? `${workingDays.length} days/week` : 'No schedule set'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {s._count?.bookings || 0} bookings
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingStaff(s)}><Edit2 size={13} /> Edit</button>
                  {s.role !== 'owner' && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(s.id, s.name)}><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(showAdd || editingStaff) && (
        <StaffModal
          staff={editingStaff}
          isNew={!editingStaff}
          onClose={() => { setShowAdd(false); setEditingStaff(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
