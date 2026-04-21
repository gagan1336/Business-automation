// src/context/AuthContext.jsx — Firebase Google Auth + Business Profile
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user
  const [business, setBusiness] = useState(null); // Business profile from API
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch business profile from backend
  const fetchBusinessProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setBusiness(data.business);
      return data.business;
    } catch (err) {
      // 404 means user hasn't registered yet
      if (err.response?.status === 404) {
        setBusiness(null);
        return null;
      }
      console.error('[Auth] Profile fetch error:', err.message);
      throw err;
    }
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    if (!auth) {
      // Firebase not configured — use demo mode
      console.warn('[Auth] Firebase not configured — auth disabled');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in — fetch their business profile
          await fetchBusinessProfile();
        } else {
          setBusiness(null);
        }
      } catch (err) {
        console.error('[Auth] Failed to fetch profile after auth state change:', err);
      } finally {
        setUser(firebaseUser); // Evaluate combinedUser state after business profile check is complete
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchBusinessProfile]);

  // Google Sign-In
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      setAuthError('Firebase not configured. Please set up Firebase credentials.');
      throw new Error('Firebase not configured');
    }
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // After sign-in, fetch or create business profile
      const biz = await fetchBusinessProfile();
      return { user: result.user, business: biz, isNewUser: !biz };
    } catch (err) {
      console.error('[Auth] Google sign-in error:', err.message);
      setAuthError(err.message);
      throw err;
    }
  };

  // Register business (called after Google sign-in for new users)
  const registerBusiness = async ({ businessName, ownerName, phone, category }) => {
    try {
      const { data } = await api.post('/api/auth/register', {
        businessName,
        ownerName,
        phone,
        category,
      });
      setBusiness(data.business);
      return data.business;
    } catch (err) {
      console.error('[Auth] Register error:', err.message);
      throw err;
    }
  };

  // Update business profile
  const updateProfile = async (updates) => {
    try {
      const { data } = await api.patch('/api/auth/profile', updates);
      setBusiness(data.business);
      return data.business;
    } catch (err) {
      console.error('[Auth] Profile update error:', err.message);
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.error('[Auth] Sign-out error:', err.message);
    }
    setUser(null);
    setBusiness(null);
  };

  // Expose a combined user object for backward compatibility
  const combinedUser = user && business ? {
    id: business.id,
    name: business.ownerName,
    email: user.email,
    businessName: business.name,
    plan: business.plan,
    avatar: business.ownerName?.slice(0, 2).toUpperCase() || 'AB',
    slug: business.slug,
    phone: business.phone,
    address: business.address,
    website: business.website,
    category: business.category,
    photoURL: user.photoURL,
    firebaseUid: user.uid,
  } : user ? {
    // Signed in but no business registered yet
    id: null,
    name: user.displayName || 'New User',
    email: user.email,
    businessName: null,
    plan: null,
    avatar: user.displayName?.slice(0, 2).toUpperCase() || 'NU',
    photoURL: user.photoURL,
    firebaseUid: user.uid,
    needsRegistration: true,
  } : null;

  return (
    <AuthContext.Provider value={{
      user: combinedUser,
      firebaseUser: user,
      business,
      loading,
      authError,
      loginWithGoogle,
      registerBusiness,
      updateProfile,
      logout,
      refreshProfile: fetchBusinessProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
