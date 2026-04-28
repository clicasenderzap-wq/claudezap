import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const code = err.response?.data?.code;
      localStorage.removeItem('token');
      localStorage.removeItem('auth');
      if (code === 'SESSION_REPLACED') {
        sessionStorage.setItem('auth_notice', 'Sua sessão foi encerrada pois sua conta foi acessada em outro lugar.');
      }
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
