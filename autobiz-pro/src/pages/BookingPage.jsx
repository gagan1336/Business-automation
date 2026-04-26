import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles, MapPin, Phone, Calendar, Clock, Check,
  ChevronLeft, ChevronRight, User, ArrowRight
} from 'lucide-react';
import api from '../api/client';

const STEP_LABELS = ['Service', 'Team', 'Date & Time', 'Your Details', 'Confirm'];

export default function BookingPage() {
  const { businessSlug } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', marketingConsent: false });

  useEffect(() => {
    loadBusiness();
  }, [businessSlug]);

  const loadBusiness = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/public/business/${businessSlug}`);
      setBusiness(data.business);
    } catch (err) {
      console.error('Failed to load business:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (date, staffId) => {
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({ date, businessSlug });
      if (staffId) params.append('staffId', staffId);
      const { data } = await api.get(`/api/public/availability?${params}`);
      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.error('Failed to load availability:', err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    loadAvailability(date, selectedStaff?.id);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/public/bookings', {
        businessSlug,
        customerName: form.name,
        phone: form.phone,
        email: form.email || undefined,
        serviceId: selectedService?.id,
        staffMemberId: selectedStaff?.id || undefined,
        date: selectedDate,
        time: selectedTime,
        marketingConsent: form.marketingConsent,
      });
      setBookingResult(data);
    } catch (err) {
      alert(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const settings = business?.settings || {};
  const currency = settings.currencySymbol || '$';
  const brandColor = settings.brandColor || '#6366f1';

  const formatPrice = (cents) => `${currency}${(cents / 100).toFixed(2)}`;

  // Generate available dates (next N days)
  const bookingWindow = settings.bookingWindowDays || 30;
  const dates = [];
  for (let i = 0; i < Math.min(bookingWindow, 14); i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      value: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0,
    });
  }

  // Get staff who can perform the selected service
  const availableStaff = selectedService?.staff?.map(s => s.staffMember) || business?.staff || [];

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    if (settings.clockFormat === '24h') return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
        <h2>Business not found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>The booking page you're looking for doesn't exist.</p>
      </div>
    );
  }

  // Booking confirmed
  if (bookingResult) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${brandColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={32} style={{ color: brandColor }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Booking Confirmed! 🎉</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your appointment has been confirmed. You'll receive a confirmation message shortly.
          </p>
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '16px 20px', textAlign: 'left', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Service</span>
              <span style={{ fontWeight: 600 }}>{bookingResult.booking?.service || 'Appointment'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Date</span>
              <span style={{ fontWeight: 600 }}>{bookingResult.booking?.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Time</span>
              <span style={{ fontWeight: 600 }}>{bookingResult.booking?.time}</span>
            </div>
            {bookingResult.booking?.amountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(bookingResult.booking.amountCents)}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 20 }}>
            Thank you for choosing {business.name}!
          </p>
        </div>
      </div>
    );
  }

  // Group services by category
  const servicesByCategory = {};
  (business.services || []).forEach(s => {
    const cat = s.category || 'General';
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ padding: '32px 24px 24px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${brandColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} style={{ color: brandColor }} />
            </div>
          )}
          <h1 style={{ fontSize: '1.4rem' }}>{business.name}</h1>
        </div>
        {business.address && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <MapPin size={13} /> {business.address}
          </div>
        )}

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i <= step ? brandColor : 'var(--color-surface-2)',
                color: i <= step ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
              }}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ width: 24, height: 2, background: i < step ? brandColor : 'var(--color-border)', transition: 'background 0.3s ease' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>{STEP_LABELS[step]}</div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>

        {/* Step 0: Service */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Choose a Service</h3>
            {Object.entries(servicesByCategory).map(([cat, svcs]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {svcs.map(s => (
                    <button key={s.id} onClick={() => { setSelectedService(s); setStep(1); }} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                      background: selectedService?.id === s.id ? `${brandColor}15` : 'var(--color-surface)',
                      border: `1px solid ${selectedService?.id === s.id ? brandColor : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s ease',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          <Clock size={12} style={{ display: 'inline', verticalAlign: -1 }} /> {s.durationMin} min
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: brandColor, fontSize: '1rem' }}>{formatPrice(s.priceCents)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Staff */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Choose a Team Member</h3>
            <button onClick={() => { setSelectedStaff(null); setStep(2); }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', width: '100%',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s ease',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Preference</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Any available team member</div>
              </div>
            </button>
            {availableStaff.map(s => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); setStep(2); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', width: '100%',
                background: selectedStaff?.id === s.id ? `${brandColor}15` : 'var(--color-surface)',
                border: `1px solid ${selectedStaff?.id === s.id ? brandColor : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: (s.avatarColor || brandColor) + '20', color: s.avatarColor || brandColor, fontWeight: 700, fontSize: '0.85rem',
                }}>
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Pick a Date & Time</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
              {dates.map(d => (
                <button key={d.value} onClick={() => handleDateChange(d.value)} style={{
                  minWidth: 68, padding: '12px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                  background: selectedDate === d.value ? brandColor : 'var(--color-surface)',
                  border: `1px solid ${selectedDate === d.value ? brandColor : 'var(--color-border)'}`,
                  color: selectedDate === d.value ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.7 }}>{d.day}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{d.date}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>{d.month}</div>
                </button>
              ))}
            </div>

            {selectedDate && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Available Times</div>
                {slotsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
                ) : availableSlots.filter(s => s.available).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No available slots on this date</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                    {availableSlots.filter(s => s.available).map(s => (
                      <button key={s.time} onClick={() => { setSelectedTime(s.time); setStep(3); }} style={{
                        padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                        background: selectedTime === s.time ? brandColor : 'var(--color-surface)',
                        border: `1px solid ${selectedTime === s.time ? brandColor : 'var(--color-border)'}`,
                        color: selectedTime === s.time ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                      }}>
                        {formatTime(s.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Your Details */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Your Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" placeholder="Your name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input type="tel" className="form-input" placeholder="+1 555 123 4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              {settings.marketingConsentRequired && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.marketingConsent} onChange={e => setForm(p => ({ ...p, marketingConsent: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: brandColor }} />
                  I'd like to receive occasional promotions, special offers, and updates from {business.name}. You can unsubscribe at any time.
                </label>
              )}
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 24, justifyContent: 'center', background: brandColor }}
              onClick={() => { if (form.name && form.phone) setStep(4); }}>
              Review Booking <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Review & Confirm</h3>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 20 }}>
              {[
                { label: 'Service', value: selectedService?.name || 'Appointment' },
                { label: 'Team Member', value: selectedStaff?.name || 'Any available' },
                { label: 'Date', value: new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) },
                { label: 'Time', value: formatTime(selectedTime) },
                { label: 'Price', value: selectedService ? formatPrice(selectedService.priceCents) : 'Free' },
                { label: 'Name', value: form.name },
                { label: 'Phone', value: form.phone },
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem', background: brandColor }}
              onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Confirming...</> : 'Confirm Booking ✓'}
            </button>
          </div>
        )}

        {/* Navigation */}
        {step > 0 && !bookingResult && (
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setStep(step - 1)}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Powered by <a href="/" style={{ color: brandColor, fontWeight: 600 }}>AutoBiz Pro</a>
      </div>
    </div>
  );
}
