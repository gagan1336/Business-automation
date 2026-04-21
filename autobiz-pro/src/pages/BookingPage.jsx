import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, Phone, Mail, Check, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function BookingPage() {
  const { businessSlug: slug } = useParams();
  const { toast } = useToast();
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [step, setStep] = useState(1); // 1=service, 2=datetime, 3=details, 4=confirm
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [form, setForm] = useState({ serviceId: '', date: '', time: '', name: '', phone: '', email: '' });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const selectedService = services.find(s => s.id === form.serviceId);

  useEffect(() => {
    loadBusiness();
  }, [slug]);

  const loadBusiness = async () => {
    try {
      const { data } = await api.get(`/api/public/business/${slug}`);
      setBusiness(data.business);
      setServices(data.business.services || []);
    } catch (err) {
      console.error('Load business error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.date || !form.time) {
      toast('Please fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/public/bookings', {
        businessSlug: slug,
        customerName: form.name,
        phone: form.phone,
        email: form.email || undefined,
        serviceId: form.serviceId || undefined,
        date: form.date,
        time: form.time,
      });
      setBookingResult(data.booking);
      setStep(4);
      toast('Booking confirmed! 🎉', 'success');
    } catch (err) {
      toast(err.message || 'Failed to submit booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Group services by category
  const grouped = services.reduce((acc, s) => {
    const cat = s.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Generate available time slots
  const timeSlots = [];
  for (let h = 9; h <= 20; h++) {
    ['00', '30'].forEach(m => timeSlots.push(`${String(h).padStart(2, '0')}:${m}`));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2>Business Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>The booking page for "{slug}" doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'grid', placeItems: 'center' }}>
                <Sparkles size={22} color="#fff" />
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{business.name}</h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{business.category}</div>
            </div>
          </div>
          {business.address && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>📍 {business.address}</p>}
        </div>

        {/* Progress Steps */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28, justifyContent: 'center' }}>
            {['Service', 'Date & Time', 'Details'].map((s, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 700,
                    background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: isDone || isActive ? '#fff' : 'var(--text-secondary)',
                  }}>
                    {isDone ? <Check size={14} /> : stepNum}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', marginRight: 10 }}>{s}</span>
                  {i < 2 && <div style={{ width: 40, height: 2, background: isDone ? 'var(--color-success)' : 'var(--color-border)', marginRight: 10, borderRadius: 2 }} />}
                </div>
              );
            })}
          </div>
        )}

        <div className="card" style={{ padding: 28 }}>
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <>
              <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Choose a Service</h2>
              {Object.entries(grouped).map(([category, svcs]) => (
                <div key={category} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{category}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {svcs.map(s => (
                      <label key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)',
                        border: `2px solid ${form.serviceId === s.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: form.serviceId === s.id ? 'var(--color-primary-glow)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <input type="radio" name="service" value={s.id} checked={form.serviceId === s.id} onChange={() => upd('serviceId', s.id)} style={{ display: 'none' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>⏱ {s.durationMin} min</div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>₹{s.price}</div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {services.length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>No services available</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => setStep(2)}>
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Choose Date & Time</h2>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => upd('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Time *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => upd('time', t)} style={{
                      padding: '8px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${form.time === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: form.time === t ? 'var(--color-primary-glow)' : 'transparent', color: form.time === t ? 'var(--color-primary-light)' : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: form.time === t ? 700 : 400, transition: 'all 0.15s',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                <button className="btn btn-primary" onClick={() => { if (!form.date || !form.time) { toast('Please select date and time', 'error'); return; } setStep(3); }}>Next <ArrowRight size={15} /></button>
              </div>
            </>
          )}

          {/* Step 3: Contact Details */}
          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Your Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" style={{ paddingLeft: 36 }} placeholder="Your name" value={form.name} onChange={e => upd('name', e.target.value)} required />
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
                  <label className="form-label">Email (optional)</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="email" className="form-input" style={{ paddingLeft: 36 }} placeholder="your@email.com" value={form.email} onChange={e => upd('email', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.85rem' }}>Booking Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { icon: Clock, label: selectedService?.name || 'General Appointment' },
                    { icon: Calendar, label: `${form.date} at ${form.time}` },
                    selectedService && { icon: null, label: `₹${selectedService.price}` },
                  ].filter(Boolean).map(({ icon: Icon, label }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                      {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
                      {!Icon && <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{label}</span>}
                      {Icon && <span>{label}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Booking...</> : <><Check size={15} /> Confirm Booking</>}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && bookingResult && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-glow)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <Check size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <h2 style={{ marginBottom: 8 }}>Booking Confirmed!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem' }}>
                Your appointment at <strong>{business.name}</strong> has been confirmed. You'll receive a WhatsApp confirmation shortly.
              </p>
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 20, textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SERVICE</span><div style={{ fontWeight: 600 }}>{bookingResult.service}</div></div>
                  <div><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DATE & TIME</span><div style={{ fontWeight: 600 }}>{bookingResult.date} at {bookingResult.time}</div></div>
                  {bookingResult.amount > 0 && <div><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AMOUNT</span><div style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{bookingResult.amount}</div></div>}
                </div>
              </div>
              <button className="btn btn-secondary w-full" style={{ marginTop: 24, justifyContent: 'center' }} onClick={() => { setStep(1); setForm({ serviceId: '', date: '', time: '', name: '', phone: '', email: '' }); setBookingResult(null); }}>
                Book Another Appointment
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Powered by <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>AutoBiz Pro</span>
        </div>
      </div>
    </div>
  );
}
