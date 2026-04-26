import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function Terms() {
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

        <h1 style={{ marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ marginBottom: 32, fontSize: '0.85rem' }}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="card" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
          <h3 style={{ marginBottom: 12 }}>1. Acceptance of Terms</h3>
          <p style={{ marginBottom: 20 }}>
            By accessing or using AutoBiz Pro ("the Platform"), you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the Platform.
          </p>

          <h3 style={{ marginBottom: 12 }}>2. Description of Service</h3>
          <p style={{ marginBottom: 20 }}>
            AutoBiz Pro provides a SaaS booking, client management, and automation platform for service-based businesses.
            Features include online booking, team scheduling, client CRM, automated reminders, and analytics.
          </p>

          <h3 style={{ marginBottom: 12 }}>3. User Accounts</h3>
          <p style={{ marginBottom: 20 }}>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to provide accurate information and to update it as necessary.
            You are responsible for all activities under your account.
          </p>

          <h3 style={{ marginBottom: 12 }}>4. Subscription & Payments</h3>
          <p style={{ marginBottom: 20 }}>
            Paid plans are billed monthly or annually as selected. All fees are non-refundable except as required by law.
            We may change pricing with 30 days' notice. Free trials convert to paid plans unless cancelled before the trial ends.
          </p>

          <h3 style={{ marginBottom: 12 }}>5. Data Ownership</h3>
          <p style={{ marginBottom: 20 }}>
            You retain full ownership of your business data, customer data, and content. We do not claim ownership
            of any data you input into the Platform. You grant us a limited license to process your data
            solely to provide the service.
          </p>

          <h3 style={{ marginBottom: 12 }}>6. Acceptable Use</h3>
          <p style={{ marginBottom: 20 }}>
            You agree not to: send unsolicited marketing without recipient consent, use the Platform for illegal activities,
            attempt to access other users' data, reverse engineer the Platform, or use automated scraping tools.
          </p>

          <h3 style={{ marginBottom: 12 }}>7. Service Availability</h3>
          <p style={{ marginBottom: 20 }}>
            We aim for 99.9% uptime but do not guarantee uninterrupted service. We may perform
            scheduled maintenance with advance notice. We are not liable for downtime or data loss
            caused by factors beyond our control.
          </p>

          <h3 style={{ marginBottom: 12 }}>8. Limitation of Liability</h3>
          <p style={{ marginBottom: 20 }}>
            To the maximum extent permitted by law, our total liability shall not exceed the amount
            you paid for the service in the preceding 12 months. We are not liable for indirect,
            incidental, or consequential damages.
          </p>

          <h3 style={{ marginBottom: 12 }}>9. Termination</h3>
          <p style={{ marginBottom: 20 }}>
            Either party may terminate the agreement at any time. Upon termination, you may export
            your data within 30 days. After 30 days, we will delete or anonymize your data.
          </p>

          <h3 style={{ marginBottom: 12 }}>10. Contact</h3>
          <p>
            For questions about these terms, contact us at <strong>legal@autobizpro.app</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
