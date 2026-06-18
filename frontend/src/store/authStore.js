import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user:        null,
  token:       localStorage.getItem('accessToken') || null,
  isLoading:   true,
  isLoggedIn:  false,

  // Called on app boot — verify token and load user
  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isLoggedIn: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, isLoggedIn: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      set({ user: null, token: null, isLoggedIn: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    set({ user: data.user, token: data.accessToken, isLoggedIn: true });
    return data;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    set({ user: null, token: null, isLoggedIn: false });
    window.location.href = '/login';
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;