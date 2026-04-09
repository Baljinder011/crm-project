import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('crm_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('crm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [bootLoading, setBootLoading] = useState(Boolean(localStorage.getItem('crm_token')));

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setBootLoading(false);
        return;
      }

      try {
        const response = await authApi.me(token);
        setUser(response.user);
        localStorage.setItem('crm_user', JSON.stringify(response.user));
      } catch (error) {
        console.error('Auth bootstrap failed:', error);
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setToken('');
        setUser(null);
      } finally {
        setBootLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  const login = ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('crm_token', nextToken);
    localStorage.setItem('crm_user', JSON.stringify(nextUser));
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: Boolean(token && user),
      bootLoading,
    }),
    [token, user, bootLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}