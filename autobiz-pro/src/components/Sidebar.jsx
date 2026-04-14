import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, MessageSquare, Zap, UserPlus,
  Users, Settings, LogOut, Sparkles
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Bookings', icon: Calendar, path: '/app/bookings', badge: null },
  { label: 'Inbox', icon: MessageSquare, path: '/app/inbox', badge: 3 },
  { label: 'Automation', icon: Zap, path: '/app/automation' },
  { label: 'Walk-ins', icon: UserPlus, path: '/app/walkins' },
  { label: 'Customers', icon: Users, path: '/app/customers' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Sparkles size={20} color="#fff" />
        </div>
        <span className="logo-text">AutoBiz Pro</span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Main Menu</span>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}

        <span className="nav-section-label" style={{ marginTop: 8 }}>Account</span>
        <NavLink to="/app/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Logout">
          <div className="user-avatar">{user?.avatar || 'U'}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-plan">✦ {user?.plan || 'Free'} Plan</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
