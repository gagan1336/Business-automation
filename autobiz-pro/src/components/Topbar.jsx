import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, subtitle }) {
  const [query, setQuery] = useState('');
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="notif-btn">
          <Bell size={16} />
          <span className="notif-dot" />
        </div>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer' }} />
        ) : (
          <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem', cursor: 'pointer' }}>
            {user?.avatar || 'U'}
          </div>
        )}
      </div>
    </header>
  );
}
