import { useState, useRef, useEffect } from 'react';
import { Send, Link2, MessageCircle, Search, MoreVertical, AtSign } from 'lucide-react';

// Custom Instagram icon since lucide-react may not include it
function InstagramIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

import Topbar from '../components/Topbar';
import { mockMessages } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const platformIcons = {
  whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
};

export default function Inbox() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState(mockMessages);
  const [activeConvId, setActiveConvId] = useState(1);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, activeConv?.messages?.length]);

  const sendMessage = () => {
    if (!text.trim()) return;
    setConversations(convs => convs.map(c =>
      c.id === activeConvId
        ? { ...c, messages: [...c.messages, { id: Date.now(), text: text.trim(), from: 'business', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }], unread: 0, lastTime: 'Just now' }
        : c
    ));
    setText('');
  };

  const sendBookingLink = () => {
    const link = 'https://autobiz.app/book/haircraft';
    setConversations(convs => convs.map(c =>
      c.id === activeConvId
        ? { ...c, messages: [...c.messages, { id: Date.now(), text: `📅 Book your appointment here:\n${link}`, from: 'business', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }], lastTime: 'Just now' }
        : c
    ));
    toast('Booking link sent!', 'success');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const markRead = (id) => {
    setConversations(convs => convs.map(c => c.id === id ? { ...c, unread: 0 } : c));
    setActiveConvId(id);
  };

  const filtered = conversations.filter(c => c.customer.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  return (
    <>
      <Topbar title="Inbox" subtitle={`${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`} />
      <div className="page-content" style={{ padding: '24px 32px 24px' }}>
        <div className="inbox-layout">
          {/* Conversation List */}
          <div className="inbox-list">
            <div className="inbox-search">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" style={{ paddingLeft: 32, fontSize: '0.8rem' }} placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {filtered.map(conv => {
              const PlatformIcon = platformIcons[conv.platform]?.icon || MessageCircle;
              const platformColor = platformIcons[conv.platform]?.color || '#6366f1';
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <div key={conv.id} className={`inbox-item${conv.id === activeConvId ? ' active' : ''}`} onClick={() => markRead(conv.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <div className="avatar" style={{ background: conv.avatarColor + '25', color: conv.avatarColor, width: 40, height: 40 }}>{conv.avatar}</div>
                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: platformColor, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)' }}>
                        <PlatformIcon size={8} color="#fff" />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="inbox-item-name">{conv.customer}</span>
                        <span className="inbox-item-time">{conv.lastTime}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className="inbox-item-preview" style={{ flex: 1 }}>{lastMsg?.text || '...'}</span>
                        {conv.unread > 0 && (
                          <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{conv.unread}</span>
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
              {/* Chat Header */}
              <div className="inbox-chat-header">
                <div className="avatar" style={{ background: activeConv.avatarColor + '25', color: activeConv.avatarColor, width: 40, height: 40 }}>{activeConv.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeConv.customer}</div>
                  <div style={{ fontSize: '0.75rem', color: platformIcons[activeConv.platform]?.color }}>
                    via {platformIcons[activeConv.platform]?.label}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={sendBookingLink} title="Send booking link">
                  <Link2 size={14} /> Send Booking Link
                </button>
                <button className="btn btn-ghost btn-icon"><MoreVertical size={16} /></button>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {activeConv.messages.map((msg, i) => (
                  <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'business' ? 'flex-end' : 'flex-start' }}>
                    <div className={`message ${msg.from === 'business' ? 'message-outgoing' : 'message-incoming'}`}
                      style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                    <div className="message-time">{msg.time}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <textarea
                  className="chat-input"
                  placeholder="Type a message... (Enter to send)"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button className="btn btn-primary btn-icon" onClick={sendMessage} disabled={!text.trim()} style={{ padding: '10px 14px' }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><MessageCircle size={32} /></div>
              <div style={{ fontWeight: 600 }}>Select a conversation</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
