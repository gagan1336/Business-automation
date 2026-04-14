import { useState } from 'react';
import { Plus, Zap, Trash2, ChevronRight, X, Play, BarChart2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { mockAutomations } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const triggerOptions = [
  'Message contains "price"',
  'Message contains "book"',
  'Message contains "hours"',
  'Booking confirmed',
  'Booking completed',
  'No reply for 24 hours',
  'Walk-in entry saved',
  '2 hours before booking',
  'Customer not visited in 30 days',
];

const actionOptions = [
  'Send price list + booking link',
  'Send booking confirmation',
  'Send appointment reminder',
  'Send follow-up message',
  'Send thank you message',
  'Send review request',
  'Send promotional offer',
];

function CreateRuleModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', trigger: '', action: '', customTrigger: '', customAction: '' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Create Automation Rule</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Rule Name</label>
            <input type="text" className="form-input" placeholder="e.g. Price Enquiry Auto-Reply" value={form.name} onChange={e => upd('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Trigger (When...)</label>
            <select className="form-select" value={form.trigger} onChange={e => upd('trigger', e.target.value)}>
              <option value="">Select trigger...</option>
              {triggerOptions.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="custom">Custom trigger...</option>
            </select>
            {form.trigger === 'custom' && (
              <input type="text" className="form-input" style={{ marginTop: 8 }} placeholder="Describe your trigger..." value={form.customTrigger} onChange={e => upd('customTrigger', e.target.value)} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <ChevronRight size={16} />
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Action (Then...)</label>
            <select className="form-select" value={form.action} onChange={e => upd('action', e.target.value)}>
              <option value="">Select action...</option>
              {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="custom">Custom action...</option>
            </select>
            {form.action === 'custom' && (
              <textarea className="form-textarea" style={{ marginTop: 8 }} placeholder="Describe the action / message to send..." value={form.customAction} onChange={e => upd('customAction', e.target.value)} />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave(form)}>
            <Zap size={15} /> Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Automation() {
  const { toast } = useToast();
  const [rules, setRules] = useState(mockAutomations);
  const [showCreate, setShowCreate] = useState(false);

  const toggleRule = (id) => {
    setRules(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const rule = rules.find(r => r.id === id);
    toast(`${rule.name} ${rule.active ? 'disabled' : 'enabled'}`, 'success');
  };

  const deleteRule = (id) => {
    const rule = rules.find(r => r.id === id);
    setRules(rs => rs.filter(r => r.id !== id));
    toast(`"${rule.name}" deleted`, 'info');
  };

  const handleSave = (form) => {
    if (!form.name || !form.trigger || !form.action) { toast('Please fill all fields', 'error'); return; }
    const trigger = form.trigger === 'custom' ? form.customTrigger : form.trigger;
    const action = form.action === 'custom' ? form.customAction : form.action;
    if (!trigger || !action) { toast('Please complete trigger and action', 'error'); return; }
    const newRule = { id: Date.now(), name: form.name, trigger, action, active: true, runs: 0 };
    setRules(rs => [newRule, ...rs]);
    toast(`Automation "${form.name}" created!`, 'success');
    setShowCreate(false);
  };

  const activeCount = rules.filter(r => r.active).length;
  const totalRuns = rules.reduce((a, r) => a + r.runs, 0);

  return (
    <>
      <Topbar title="Automation" subtitle="Set up triggers and automatic responses" />
      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Active Rules', value: activeCount, color: 'var(--color-success)', icon: Zap },
            { label: 'Total Rules', value: rules.length, color: 'var(--color-primary-light)', icon: Play },
            { label: 'Total Runs', value: totalRuns, color: 'var(--color-accent)', icon: BarChart2 },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-icon" style={{ background: s.color + '20' }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="stat-card-value" style={{ color: s.color, fontSize: '1.8rem' }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="section-header">
          <div>
            <div className="section-title">Automation Rules</div>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Rules run automatically when conditions are met</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Rule
          </button>
        </div>

        <div className="automation-rules">
          {rules.map(rule => (
            <div className="rule-card" key={rule.id} style={{ opacity: rule.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: rule.active ? 'var(--color-success)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rule.name}</span>
                  {rule.runs > 0 && (
                    <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{rule.runs} runs</span>
                  )}
                </div>
                <div className="rule-flow">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>WHEN</span>
                  <span className="rule-trigger">{rule.trigger}</span>
                  <ChevronRight size={14} className="rule-arrow" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>THEN</span>
                  <span className="rule-action">{rule.action}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <label className="toggle" title={rule.active ? 'Disable' : 'Enable'}>
                  <input type="checkbox" checked={rule.active} onChange={() => toggleRule(rule.id)} />
                  <span className="toggle-slider" />
                </label>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteRule(rule.id)} title="Delete rule">
                  <Trash2 size={15} style={{ color: 'var(--color-danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {rules.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Zap size={28} /></div>
            <div style={{ fontWeight: 600 }}>No automation rules yet</div>
            <p style={{ fontSize: '0.85rem' }}>Create your first rule to start automating your business.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Rule</button>
          </div>
        )}

        {/* Built-in Templates */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '1rem' }}>Quick Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[
              { trigger: 'Message contains "price"', action: 'Send price list + booking link', label: 'Price Enquiry' },
              { trigger: 'No reply for 24 hours', action: 'Send follow-up message', label: '24h Follow-up' },
              { trigger: 'Booking confirmed', action: 'Send appointment reminder', label: 'Booking Reminder' },
              { trigger: 'Customer not visited in 30 days', action: 'Send promotional offer', label: 'Win-Back Campaign' },
            ].map(tmpl => (
              <div key={tmpl.label} className="card" style={{ padding: 16, cursor: 'pointer' }}
                onClick={() => { setShowCreate(true); }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>{tmpl.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem' }}><span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>When:</span> <span style={{ color: 'var(--text-secondary)' }}>{tmpl.trigger}</span></span>
                  <span style={{ fontSize: '0.75rem' }}><span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Then:</span> <span style={{ color: 'var(--text-secondary)' }}>{tmpl.action}</span></span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreate && <CreateRuleModal onClose={() => setShowCreate(false)} onSave={handleSave} />}
    </>
  );
}
