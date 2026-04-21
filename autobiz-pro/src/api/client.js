// src/api/client.js — Axios instance with Firebase auth interceptor
import axios from 'axios';

// In dev, Vite proxy handles /api -> localhost:3001 so no baseURL needed
// In production, set VITE_API_URL to your deployed backend URL
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Firebase ID token on every request
api.interceptors.request.use(
  async (config) => {
    try {
      // Dynamically import to avoid circular deps
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API] Could not attach auth token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        console.warn('[API] Unauthorized — token may be expired');
        // Could trigger re-auth here
      }
      const message = data?.error || data?.message || `Request failed (${status})`;
      error.message = message;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please try again.';
    } else {
      error.message = 'Network error. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

export default api;
