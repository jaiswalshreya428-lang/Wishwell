import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/endpoints';
import { setAuthToken, getAuthToken } from '../api/client';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    showToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out. In-memory credentials cleared.',
    });
  }, [showToast]);

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await api.auth.getMe();
      setUser(me);
    } catch {
      // Token expired or invalid
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
      showToast({
        type: 'success',
        title: 'Welcome back',
        message: `Signed in as ${res.user.full_name} (${res.user.role}).`,
      });
      return res.user;
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Invalid credentials or account locked.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await api.auth.register(payload);
      // Auto-login after registration
      await login(payload.email, payload.password);
      return newUser;
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Could not complete registration.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Login for instant examiner/technical evaluation role switching
  const quickDemoLogin = async (role: UserRole) => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      admin: { email: 'admin@wishwell.org', pass: 'Password123!' },
      verifier: { email: 'verifier@wishwell.org', pass: 'Password123!' },
      institution: { email: 'contact@stmarys.org', pass: 'Password123!' },
      donor: { email: 'sarah.jenkins@example.com', pass: 'Password123!' },
    };
    const cred = credentials[role];
    await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        quickDemoLogin,
        refreshUser,
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

