import { useState } from 'react';
import { Search, Users, MessageSquare, Calendar, TrendingUp, X, Phone, Mail, Clock } from 'lucide-react';
import Topbar from '../components/Topbar';
import { mockCustomers } from '../data/mockData';
import { useToast } from '../context/ToastContext';

function CustomerModal({ customer, onClose }) {
  if (!customer) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Customer Profile</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
          <div className="avatar" style={{ width: 60, height: 60, fontSize: '1.2rem', background: customer.avatarColor + '25', color: customer.avatarColor }}>{customer.avatar}</div>
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
            { icon: Calendar, label: 'Total Visits', value: customer.totalVisits },
            { icon: TrendingUp, label: 'Total Spent', value: `₹${customer.totalSpent.toLocaleString()}` },
            { icon: Clock, label: 'Last Visit', value: customer.lastVisit },
            { icon: TrendingUp, label: 'Avg Spend', value: `₹${Math.round(customer.totalSpent / customer.totalVisits).toLocaleString()}` },
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}>
            <MessageSquare size={14} /> Send Message
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}>
            <Calendar size={14} /> Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('totalSpent');

  const filtered = mockCustomers
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      const matchFilter = filter === 'all' || c.status === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => sortBy === 'totalSpent' ? b.totalSpent - a.totalSpent : sortBy === 'visits' ? b.totalVisits - a.totalVisits : a.name.localeCompare(b.name));

  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter(c => c.status === 'active').length;
  const totalRevenue = mockCustomers.reduce((a, c) => a + c.totalSpent, 0);
  const avgSpend = Math.round(totalRevenue / totalCustomers);

  return (
    <>
      <Topbar title="Customers" subtitle={`${totalCustomers} total customers in your CRM`} />
      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Customers', value: totalCustomers, icon: Users, color: 'var(--color-primary-light)', bg: 'var(--gradient-primary)' },
            { label: 'Active', value: activeCustomers, icon: TrendingUp, color: 'var(--color-success)', bg: 'var(--gradient-success)' },
            { label: 'Total Revenue', value: `₹${(totalRevenue/1000).toFixed(1)}k`, icon: TrendingUp, color: 'var(--color-accent)', bg: 'var(--gradient-accent)' },
            { label: 'Avg Spend/Customer', value: `₹${avgSpend.toLocaleString()}`, icon: TrendingUp, color: 'var(--color-purple)', bg: 'var(--gradient-purple)' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-icon" style={{ background: s.bg }}>
                <s.icon size={18} color="#fff" />
              </div>
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
            <option value="all">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="totalSpent">Sort by Spend</option>
            <option value="visits">Sort by Visits</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Last Visit</th>
                  <th>Total Visits</th>
                  <th>Total Spent</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Users size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No customers found</div>
                    </div>
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: c.avatarColor + '25', color: c.avatarColor }}>{c.avatar}</div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td style={{ fontSize: '0.85rem' }}>{c.lastVisit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: 600 }}>{c.totalVisits}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{c.totalSpent.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); toast(`Message sent to ${c.name}`, 'success'); }} title="Send message">
                          <MessageSquare size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(c); }}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {mockCustomers.length} customers
        </div>
      </div>

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
