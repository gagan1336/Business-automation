import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 32 }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div className="logo-icon"><Sparkles size={20} color="#fff" /></div>
          <span className="logo-text" style={{ fontSize: '1.15rem' }}>AutoBiz Pro</span>
        </div>

        <h1 style={{ marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ marginBottom: 32, fontSize: '0.85rem' }}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="card" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
          <h3 style={{ marginBottom: 12 }}>1. Information We Collect</h3>
          <p style={{ marginBottom: 20 }}>
            We collect information you provide directly: name, email, phone number, business details, and payment information.
            We also collect usage data including IP addresses, browser type, pages visited, and interaction patterns to improve our service.
          </p>

          <h3 style={{ marginBottom: 12 }}>2. How We Use Your Information</h3>
          <p style={{ marginBottom: 20 }}>
            We use collected information to: provide and maintain our platform, process bookings and payments,
            send transactional notifications (booking confirmations, reminders), improve our services,
            and communicate about product updates. Marketing communications are only sent with explicit consent.
          </p>

          <h3 style={{ marginBottom: 12 }}>3. Data Sharing</h3>
          <p style={{ marginBottom: 20 }}>
            We do not sell personal data. We share data only with: payment processors (Stripe) for transactions,
            communication providers (SendGrid, Twilio, Meta) for notifications, and cloud infrastructure providers
            for hosting. All third parties are bound by data processing agreements.
          </p>

          <h3 style={{ marginBottom: 12 }}>4. Data Retention</h3>
          <p style={{ marginBottom: 20 }}>
            We retain personal data for as long as your account is active or as needed to provide services.
            Upon account deletion, we anonymize personal data within 30 days. Aggregated analytics data
            (non-personally identifiable) may be retained indefinitely.
          </p>

          <h3 style={{ marginBottom: 12 }}>5. Your Rights (GDPR / CCPA)</h3>
          <p style={{ marginBottom: 20 }}>
            You have the right to: access your personal data, request data portability (export),
            request correction of inaccurate data, request deletion/anonymization of your data,
            withdraw consent for marketing communications, and opt out of data processing.
            Business owners can export and anonymize customer data directly from the platform.
          </p>

          <h3 style={{ marginBottom: 12 }}>6. Marketing Communications</h3>
          <p style={{ marginBottom: 20 }}>
            Marketing messages (promotions, rebooking reminders) are sent only with explicit consent.
            Transactional messages (booking confirmations, appointment reminders) are sent as part of
            the service and do not require marketing consent. You can unsubscribe from marketing
            communications at any time.
          </p>

          <h3 style={{ marginBottom: 12 }}>7. Security</h3>
          <p style={{ marginBottom: 20 }}>
            We implement industry-standard security measures including encryption in transit (TLS),
            encrypted storage, access controls, regular security audits, and compliance monitoring.
            All financial transactions are processed through PCI-DSS compliant payment processors.
          </p>

          <h3 style={{ marginBottom: 12 }}>8. Cookies</h3>
          <p style={{ marginBottom: 20 }}>
            We use essential cookies for authentication and session management. Analytics cookies
            are only used with your consent. You can manage cookie preferences in your browser settings.
          </p>

          <h3 style={{ marginBottom: 12 }}>9. Contact Us</h3>
          <p>
            For privacy-related inquiries, data access requests, or to exercise your rights,
            please contact us at <strong>privacy@autobizpro.app</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
