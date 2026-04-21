import { useState, useEffect, useRef } from 'react';
import { Send, Link2, MessageCircle, Search, MoreVertical, Trash2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import ConnectChannelModal from '../components/ConnectChannelModal';

function InstagramIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

const platformIcons = {
  whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
};

export default function Inbox() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Channels state
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'channels'
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  useEffect(() => { 
    loadConversations(); 
    loadChannels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/conversations');
      setConversations(data.conversations || []);
      if (data.conversations?.length > 0 && !activeConvId) {
        selectConversation(data.conversations[0].id);
      }
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (id) => {
    setActiveConvId(id);
    try {
      const { data } = await api.get(`/api/conversations/${id}/messages`);
      setMessages(data.messages || []);
      // Mark as read locally
      setConversations(convs => convs.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const { data } = await api.get('/api/channels');
      setChannels(data.channels || []);
    } catch (err) {
      console.error('Load channels error:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSaveChannel = async (payload, id) => {
    try {
      if (id) {
        const { data } = await api.patch(`/api/channels/${id}`, payload);
        setChannels(prev => prev.map(c => c.id === id ? data.channel : c));
        toast('Channel updated', 'success');
      } else {
        const { data } = await api.post('/api/channels', payload);
        setChannels(prev => [data.channel, ...prev]);
        toast('Channel connected!', 'success');
      }
      setShowConnectModal(false);
      setEditingChannel(null);
    } catch (err) {
      toast(err.message || 'Failed to save channel', 'error');
    }
  };

  const handleDeleteChannel = async (id) => {
    try {
      await api.delete(`/api/channels/${id}`);
      setChannels(prev => prev.filter(c => c.id !== id));
      toast('Channel disconnected', 'info');
    } catch (err) {
      toast(err.message || 'Failed to disconnect', 'error');
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeConvId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/conversations/${activeConvId}/messages`, { text: text.trim() });
      setMessages(prev => [...prev, data.message]);
      setText('');
      // Update conversation list
      setConversations(convs => convs.map(c =>
        c.id === activeConvId
          ? { ...c, lastMessageAt: new Date().toISOString(), messages: [{ text: text.trim(), fromRole: 'business' }] }
          : c
      ));
    } catch (err) {
      toast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const sendBookingLink = async () => {
    const slug = user?.slug || 'business';
    const link = `${window.location.origin}/book/${slug}`;
    setText(`📅 Book your appointment here:\n${link}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const filtered = conversations.filter(c => (c.customerName || '').toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((a, c) => a + (c.unreadCount || 0), 0);

  return (
    <>
      <Topbar title="Inbox" subtitle={`${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`} />
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 20, padding: '16px 32px 0', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
        <button 
          onClick={() => setActiveTab('messages')}
          style={{ 
            padding: '8px 4px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'messages' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'messages' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'messages' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Messages
        </button>
        <button 
          onClick={() => setActiveTab('channels')}
          style={{ 
            padding: '8px 4px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'channels' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'channels' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'channels' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Channels Setup
        </button>
      </div>

      <div className="page-content" style={{ padding: '24px 32px 24px' }}>
        {activeTab === 'messages' ? (
          channels.length === 0 && !loadingChannels ? (
            <div className="empty-state" style={{ marginTop: 40, background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
              <div className="empty-state-icon"><MessageCircle size={32} /></div>
              <div style={{ fontWeight: 600 }}>No Channels Connected</div>
              <p style={{ fontSize: '0.85rem' }}>You need to connect WhatsApp or Instagram to start receiving messages.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('channels')}>
                Go to Channels Setup
              </button>
            </div>
          ) : (
            <div className="inbox-layout">
              {/* Conversation List */}
          <div className="inbox-list">
            <div className="inbox-search">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" style={{ paddingLeft: 32, fontSize: '0.8rem' }} placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No conversations yet</div>
            ) : filtered.map(conv => {
              const PlatformIcon = platformIcons[conv.platform]?.icon || MessageCircle;
              const platformColor = platformIcons[conv.platform]?.color || '#6366f1';
              const lastMsg = conv.messages?.[0];
              const initials = (conv.customerName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const avatarColor = conv.customer?.avatarColor || '#6366f1';
              return (
                <div key={conv.id} className={`inbox-item${conv.id === activeConvId ? ' active' : ''}`} onClick={() => selectConversation(conv.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <div className="avatar" style={{ background: avatarColor + '25', color: avatarColor, width: 40, height: 40 }}>{initials}</div>
                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: platformColor, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)' }}>
                        <PlatformIcon size={8} color="#fff" />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="inbox-item-name">{conv.customerName || 'Unknown'}</span>
                        <span className="inbox-item-time">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className="inbox-item-preview" style={{ flex: 1 }}>{lastMsg?.text || '...'}</span>
                        {(conv.unreadCount || 0) > 0 && (
                          <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Area */}
          {activeConv ? (
            <div className="inbox-chat">
              <div className="inbox-chat-header">
                <div className="avatar" style={{ background: (activeConv.customer?.avatarColor || '#6366f1') + '25', color: activeConv.customer?.avatarColor || '#6366f1', width: 40, height: 40 }}>
                  {(activeConv.customerName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeConv.customerName || 'Unknown'}</div>
                  <div style={{ fontSize: '0.75rem', color: platformIcons[activeConv.platform]?.color }}>
                    via {platformIcons[activeConv.platform]?.label || activeConv.platform}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={sendBookingLink} title="Send booking link">
                  <Link2 size={14} /> Send Booking Link
                </button>
              </div>

              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.fromRole === 'business' ? 'flex-end' : 'flex-start' }}>
                    <div className={`message ${msg.fromRole === 'business' ? 'message-outgoing' : 'message-incoming'}`} style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                    <div className="message-time">{new Date(msg.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <textarea className="chat-input" placeholder="Type a message... (Enter to send)" value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
                <button className="btn btn-primary btn-icon" onClick={sendMessage} disabled={!text.trim() || sending} style={{ padding: '10px 14px' }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><MessageCircle size={32} /></div>
              <div style={{ fontWeight: 600 }}>{loading ? 'Loading...' : 'Select a conversation'}</div>
            </div>
          )}
        </div>
          )
        ) : (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Messaging Channels</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Connect your WhatsApp API and Instagram accounts to AutoBiz Pro.</p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => { setEditingChannel(null); setShowConnectModal(true); }}
              >
                Connect New
              </button>
            </div>

            {loadingChannels ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
            ) : channels.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No channels connected yet.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => { setEditingChannel(null); setShowConnectModal(true); }}>
                    <MessageCircle size={16} /> Connect WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                {channels.map(ch => {
                  const isWa = ch.platform === 'whatsapp';
                  return (
                    <div key={ch.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 12, 
                        background: isWa ? '#25D36615' : '#E1306C15', 
                        color: isWa ? '#25D366' : '#E1306C',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isWa ? <MessageCircle size={24} /> : <InstagramIcon size={24} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize' }}>{ch.platform}</span>
                          {ch.active ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Active</span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Inactive</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {isWa ? `Phone Number ID: ${ch.phoneNumberId}` : `IG User ID: ${ch.igUserId}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingChannel(ch); setShowConnectModal(true); }}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteChannel(ch.id)}>
                          <Trash2 size={16} style={{ color: 'var(--color-danger)' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ marginTop: 40, padding: 20, background: 'var(--color-surface-2)', borderRadius: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Webhook Configuration</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Copy and paste these URLs into your Meta Developer Dashboard to receive incoming messages.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 80, fontSize: '0.8rem', fontWeight: 600 }}>WhatsApp</div>
                  <code style={{ flex: 1, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 6, fontSize: '0.8rem' }}>
                    {window.location.origin}/api/webhooks/whatsapp
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 80, fontSize: '0.8rem', fontWeight: 600 }}>Instagram</div>
                  <code style={{ flex: 1, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 6, fontSize: '0.8rem' }}>
                    {window.location.origin}/api/webhooks/instagram
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showConnectModal && (
        <ConnectChannelModal 
          initialData={editingChannel} 
          onClose={() => { setShowConnectModal(false); setEditingChannel(null); }} 
          onSave={handleSaveChannel} 
        />
      )}
    </>
  );
}
