import { useState, useEffect } from 'react';
import { Search, Users, MessageSquare, Calendar, TrendingUp, X, Clock } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

function CustomerModal({ customer, onClose }) {
  if (!customer) return null;
  const initials = customer.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Customer Profile</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
          <div className="avatar" style={{ width: 60, height: 60, fontSize: '1.2rem', background: (customer.avatarColor || '#6366f1') + '25', color: customer.avatarColor || '#6366f1' }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{customer.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>{customer.phone}</div>
            <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop: 6 }}>
              {customer.status === 'active' ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            { icon: Calendar, label: 'Total Visits', value: customer.totalVisits || 0 },
            { icon: TrendingUp, label: 'Total Spent', value: `₹${(customer.totalSpent || 0).toLocaleString()}` },
            { icon: Clock, label: 'Last Visit', value: customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never' },
            { icon: TrendingUp, label: 'Avg Spend', value: customer.totalVisits > 0 ? `₹${Math.round((customer.totalSpent || 0) / customer.totalVisits).toLocaleString()}` : '₹0' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon size={13} style={{ color: 'var(--color-primary-light)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('totalSpent');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/customers?limit=100');
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      const matchFilter = filter === 'all' || c.status === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => sortBy === 'totalSpent' ? (b.totalSpent || 0) - (a.totalSpent || 0) : sortBy === 'visits' ? (b.totalVisits || 0) - (a.totalVisits || 0) : a.name.localeCompare(b.name));

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalRevenue = customers.reduce((a, c) => a + (c.totalSpent || 0), 0);
  const avgSpend = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

  return (
    <>
      <Topbar title="Customers" subtitle={`${total} total customers in your CRM`} />
      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Customers', value: totalCustomers, icon: Users, bg: 'var(--gradient-primary)' },
            { label: 'Active', value: activeCustomers, icon: TrendingUp, bg: 'var(--gradient-success)' },
            { label: 'Total Revenue', value: `₹${(totalRevenue/1000).toFixed(1)}k`, icon: TrendingUp, bg: 'var(--gradient-accent)' },
            { label: 'Avg Spend/Customer', value: `₹${avgSpend.toLocaleString()}`, icon: TrendingUp, bg: 'var(--gradient-purple)' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-icon" style={{ background: s.bg }}><s.icon size={18} color="#fff" /></div>
              <div className="stat-card-value" style={{ background: s.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '1.6rem' }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 38 }} placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Customers</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="totalSpent">Sort by Spend</option><option value="visits">Sort by Visits</option><option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Customer</th><th>Phone</th><th>Last Visit</th><th>Total Visits</th><th>Total Spent</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="spinner" style={{ width: 24, height: 24 }} /></div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon"><Users size={28} /></div><div style={{ fontWeight: 600 }}>No customers found</div></div></td></tr>
                ) : filtered.map(c => {
                  const initials = c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="avatar" style={{ background: (c.avatarColor || '#6366f1') + '25', color: c.avatarColor || '#6366f1' }}>{initials}</div><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</span></div></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.phone}</td>
                      <td style={{ fontSize: '0.85rem' }}>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '-'}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ fontWeight: 600 }}>{c.totalVisits || 0}</span></div></td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{(c.totalSpent || 0).toLocaleString()}</td>
                      <td><span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{c.status}</span></td>
                      <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(c); }}>View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Showing {filtered.length} of {total} customers</div>
      </div>
      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
