import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEMO_USER = {
  id: '1',
  name: 'Rahul Sharma',
  email: 'rahul@haircraft.com',
  businessName: 'HairCraft Pro',
  plan: 'Pro',
  avatar: 'RS',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('autobiz_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('autobiz_user'); }
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Demo: accept any credentials
    const loggedUser = { ...DEMO_USER, email };
    localStorage.setItem('autobiz_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return true;
  };

  const register = (name, email, businessName, password) => {
    const newUser = { id: Date.now().toString(), name, email, businessName, plan: 'Free', avatar: name.slice(0, 2).toUpperCase() };
    localStorage.setItem('autobiz_user', JSON.stringify(newUser));
    setUser(newUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('autobiz_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
