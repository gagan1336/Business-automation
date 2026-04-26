import { useState, useEffect } from 'react';
import { Search, Users, Download, UserX, Phone, Mail, DollarSign, CalendarDays, MoreVertical, StickyNote } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('$');

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/customers');
      setCustomers(data.customers || []);
      try {
        const { data: meData } = await api.get('/api/auth/me');
        setCurrency(meData.business?.settings?.currencySymbol || '$');
      } catch {}
    } catch (err) {
      toast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (customerId, name) => {
    try {
      const { data } = await api.get(`/api/compliance/export/${customerId}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_data_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Data exported for ${name}`, 'success');
    } catch (err) {
      toast(err.message || 'Export failed', 'error');
    }
  };

  const handleAnonymize = async (customerId, name) => {
    if (!confirm(`⚠️ Permanently anonymize ${name}'s data? This action cannot be undone. Aggregated analytics will be preserved.`)) return;
    try {
      await api.delete(`/api/compliance/anonymize/${customerId}`);
      toast(`${name}'s data has been anonymized`, 'success');
      loadCustomers();
    } catch (err) {
      toast(err.message || 'Anonymization failed', 'error');
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar title="Customers" subtitle={`${customers.length} total clients`} />
      <div className="page-content">
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 38 }} placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Visits</th>
                  <th>Total Spent</th>
                  <th>Last Visit</th>
                  <th>Consent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <div className="empty-state-icon"><Users size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No customers found</div>
                      <p style={{ fontSize: '0.8rem' }}>Customers are added automatically when they book or walk in.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(c => {
                  const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const spent = c.totalSpentCents !== undefined ? c.totalSpentCents / 100 : (c.totalSpent || 0);
                  const isAnonymized = c.name === 'Anonymized Customer';
                  return (
                    <tr key={c.id} style={isAnonymized ? { opacity: 0.5 } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ background: (c.avatarColor || '#6366f1') + '25', color: c.avatarColor || '#6366f1' }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                            {c.notes && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <StickyNote size={10} /> {c.notes.slice(0, 40)}{c.notes.length > 40 ? '...' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} style={{ color: 'var(--text-muted)' }} /> {c.phone}</div>
                          {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Mail size={11} style={{ color: 'var(--text-muted)' }} /> {c.email}</div>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.totalVisits || 0}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{currency}{spent.toFixed(2)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${c.marketingConsent ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                          {c.marketingConsent ? 'Opted In' : 'No Consent'}
                        </span>
                      </td>
                      <td>
                        {!isAnonymized && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" title="Export data (GDPR)" onClick={() => handleExport(c.id, c.name)}>
                              <Download size={13} />
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Anonymize (GDPR)" onClick={() => handleAnonymize(c.id, c.name)} style={{ color: 'var(--color-danger)' }}>
                              <UserX size={13} />
                            </button>
                          </div>
                        )}
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
