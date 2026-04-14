import { useState } from 'react';
import { Sparkles, Clock, Check, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { mockServices } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];
const unavailable = ['10:00 AM', '11:30 AM', '2:30 PM'];

export default function BookingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [booked, setBooked] = useState(false);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleBook = () => {
    if (!form.name || !form.phone) { toast('Please fill Name and Phone', 'error'); return; }
    setBooked(true);
  };

  if (booked) {
    return (
      <div className="booking-page">
        <div className="booking-card" style={{ textAlign: 'center' }}>
          <div className="booking-header">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem' }}>✓</div>
            <h2 style={{ color: '#fff', marginBottom: 6 }}>Booking Confirmed!</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>You'll receive a WhatsApp confirmation shortly</p>
          </div>
          <div className="booking-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Service', value: selectedService?.name },
                { label: 'Date', value: selectedDate || 'Today' },
                { label: 'Time', value: selectedTime },
                { label: 'Duration', value: `${selectedService?.duration} min` },
                { label: 'Amount', value: `₹${selectedService?.price}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: 12 }} onClick={() => { setBooked(false); setStep(1); setSelectedService(null); setSelectedTime(null); }}>
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-card">
        {/* Header */}
        <div className="booking-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
            <div className="logo-icon"><Sparkles size={18} color="#fff" /></div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>HairCraft Pro</span>
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Book Your Appointment</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginTop: 4 }}>123 MG Road, Bangalore</p>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: s === step ? 24 : 8, height: 8, borderRadius: 99,
                background: s <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        <div className="booking-body">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <>
              <h4 style={{ marginBottom: 4 }}>Choose a Service</h4>
              <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>Select the service you'd like to book</p>
              <div className="services-list">
                {mockServices.map(svc => (
                  <div key={svc.id} className={`service-item${selectedService?.id === svc.id ? ' selected' : ''}`}
                    onClick={() => setSelectedService(svc)}>
                    <div>
                      <div className="service-name">{svc.name}</div>
                      <div className="service-details">
                        <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{svc.duration} min · {svc.category}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="service-price">₹{svc.price}</div>
                      {selectedService?.id === svc.id && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary w-full" style={{ marginTop: 16, justifyContent: 'center', padding: 12 }}
                disabled={!selectedService} onClick={() => setStep(2)}>
                Next: Pick a Time <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep(1)}>
                <ChevronLeft size={15} /> Back
              </button>
              <h4 style={{ marginBottom: 4 }}>Select Date & Time</h4>
              <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>Service: <strong>{selectedService?.name}</strong></p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Available Times</label>
                <div className="time-slots">
                  {timeSlots.map(t => (
                    <div key={t}
                      className={`time-slot${unavailable.includes(t) ? ' unavailable' : ''}${selectedTime === t ? ' selected' : ''}`}
                      onClick={() => !unavailable.includes(t) && setSelectedTime(t)}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {selectedTime && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--color-primary-glow)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.85rem' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: 6 }} />
                  Selected: <strong>{selectedTime}</strong>
                </div>
              )}

              <button className="btn btn-primary w-full" style={{ marginTop: 16, justifyContent: 'center', padding: 12 }}
                disabled={!selectedTime} onClick={() => setStep(3)}>
                Next: Your Details <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Step 3: Customer Details & Confirm */}
          {step === 3 && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setStep(2)}>
                <ChevronLeft size={15} /> Back
              </button>
              <h4 style={{ marginBottom: 4 }}>Your Details</h4>

              {/* Summary */}
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.875rem' }}>Booking Summary</div>
                {[
                  { label: 'Service', value: selectedService?.name },
                  { label: 'Time', value: selectedTime },
                  { label: 'Amount', value: `₹${selectedService?.price}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { k: 'name', label: 'Full Name', type: 'text', ph: 'Your full name', required: true },
                  { k: 'phone', label: 'WhatsApp Number', type: 'tel', ph: '+91 98765 43210', required: true },
                  { k: 'email', label: 'Email (optional)', type: 'email', ph: 'your@email.com', required: false },
                ].map(({ k, label, type, ph, required }) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{label}{required && ' *'}</label>
                    <input type={type} className="form-input" placeholder={ph} value={form[k]} onChange={e => upd(k, e.target.value)} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(2)}>
                  Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: 12 }} onClick={handleBook}>
                  <Check size={16} /> Confirm & Book
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                By booking you agree to our terms. A WhatsApp confirmation will be sent.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
