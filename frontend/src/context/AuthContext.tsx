import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface User {
  username: string;
  name: string;
  role: string;
  unit?: string;
  access_level?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  logout: () => void;
}

const AUTH_TOKEN_KEY = 'cnis_session_token';
const AUTH_USER_KEY = 'cnis_user_data';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = sessionStorage.getItem(AUTH_USER_KEY);
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.username && (storedToken.startsWith('cnis_session_') || storedToken.startsWith('cnis_sec_session_'))) {
            setToken(storedToken);
            setUser(parsedUser);
          } else {
            sessionStorage.removeItem(AUTH_TOKEN_KEY);
            sessionStorage.removeItem(AUTH_USER_KEY);
          }
        }
      } catch (e) {
        console.error('Failed to restore authentication session:', e);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<User> => {
    const trimmedUser = usernameOrEmail.trim();
    if (!trimmedUser) {
      throw new Error('Please enter your email or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    try {
      const res = await api.login({ username: trimmedUser, password });
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        sessionStorage.setItem(AUTH_TOKEN_KEY, res.token);
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
        return res.user;
      }
      throw new Error('Unable to authenticate. Please verify your credentials and try again.');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        throw new Error(err.response.data.detail);
      }
      if (err.code === 'ERR_NETWORK' || !err.response) {
        throw new Error('Authentication service is unavailable. Please try again.');
      }
      throw new Error('Unable to authenticate. Please verify your credentials and try again.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
