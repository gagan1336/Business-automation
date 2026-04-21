import { useState } from 'react';
import { X, Save, MessageCircle, Info } from 'lucide-react';

function InstagramIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

export default function ConnectChannelModal({ onClose, onSave, initialData }) {
  const [platform, setPlatform] = useState(initialData?.platform || 'whatsapp');
  
  // WhatsApp Fields
  const [phoneNumberId, setPhoneNumberId] = useState(initialData?.phoneNumberId || '');
  const [accessToken, setAccessToken] = useState(initialData?.accessToken || '');
  const [verifyToken, setVerifyToken] = useState(initialData?.verifyToken || '');
  const [waPhoneNumber, setWaPhoneNumber] = useState(initialData?.waPhoneNumber || '');

  // Instagram Fields
  const [igUserId, setIgUserId] = useState(initialData?.igUserId || '');
  const [igAccessToken, setIgAccessToken] = useState(initialData?.igAccessToken || '');
  const [igUsername, setIgUsername] = useState(initialData?.igUsername || '');
  const [appSecret, setAppSecret] = useState(initialData?.appSecret || '');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        platform,
      };
      
      if (platform === 'whatsapp') {
        Object.assign(payload, { phoneNumberId, accessToken, verifyToken, waPhoneNumber });
      } else {
        Object.assign(payload, { igUserId, igAccessToken, igUsername, appSecret });
      }

      await onSave(payload, initialData?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? 'Edit Channel' : 'Connect Channel'}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Platform Selector (Only if new) */}
        {!initialData && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button 
              className="btn" 
              style={{ flex: 1, justifyContent: 'center', background: platform === 'whatsapp' ? '#25D36615' : 'var(--color-surface-2)', border: `1px solid ${platform === 'whatsapp' ? '#25D366' : 'var(--color-border)'}`, color: platform === 'whatsapp' ? '#25D366' : 'var(--text-primary)' }}
              onClick={() => setPlatform('whatsapp')}
            >
              <MessageCircle size={18} /> WhatsApp API
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, justifyContent: 'center', background: platform === 'instagram' ? '#E1306C15' : 'var(--color-surface-2)', border: `1px solid ${platform === 'instagram' ? '#E1306C' : 'var(--color-border)'}`, color: platform === 'instagram' ? '#E1306C' : 'var(--text-primary)' }}
              onClick={() => setPlatform('instagram')}
            >
              <InstagramIcon size={18} /> Instagram
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {platform === 'whatsapp' ? (
            <>
              <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10 }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-primary-light)' }} />
                You need a Meta Developer App with the WhatsApp product configured. Enter your API credentials below.
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number (Display Name)</label>
                <input type="text" className="form-input" placeholder="+1 234 567 8900" value={waPhoneNumber} onChange={e => setWaPhoneNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number ID *</label>
                <input type="text" className="form-input" placeholder="e.g. 1018223887187" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">System User Access Token *</label>
                <input type="password" className="form-input" placeholder="EAAG..." value={accessToken} onChange={e => setAccessToken(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Webhook Verify Token</label>
                <input type="text" className="form-input" placeholder="Your custom secret token" value={verifyToken} onChange={e => setVerifyToken(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10 }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-primary-light)' }} />
                Connect your Instagram Professional account via the Meta Graph API.
              </div>
              <div className="form-group">
                <label className="form-label">Instagram Username / Page Name</label>
                <input type="text" className="form-input" placeholder="@yourbusiness" value={igUsername} onChange={e => setIgUsername(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Instagram User ID *</label>
                <input type="text" className="form-input" placeholder="e.g. 178414..." value={igUserId} onChange={e => setIgUserId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Page Access Token *</label>
                <input type="password" className="form-input" placeholder="EAAG..." value={igAccessToken} onChange={e => setIgAccessToken(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">App Secret (For Webhooks)</label>
                <input type="password" className="form-input" placeholder="Enter App Secret" value={appSecret} onChange={e => setAppSecret(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, justifyContent: 'center' }} 
            onClick={handleSave}
            disabled={saving || (platform === 'whatsapp' ? (!phoneNumberId || !accessToken) : (!igUserId || !igAccessToken))}
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Save size={15} /> Save Channel</>}
          </button>
        </div>
      </div>
    </div>
  );
}
