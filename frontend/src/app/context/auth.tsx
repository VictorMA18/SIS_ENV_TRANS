import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loginApi, loginWithGoogleApi, registerApi } from '../lib/auth-api';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../lib/auth-storage';
import { setUnauthorizedHandler } from '../lib/api';

export type UserRole = 'client' | 'transporter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  googleLinked?: boolean;
  vehicleType?: string;
  rating?: number;
  completedShipments?: number;
  phone?: string;
  document?: string;
  dni?: string;
  ruc?: string;
  licenseNumber?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<User>;
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    role: UserRole,
  ) => Promise<User>;
  loginWithGoogle: (idToken: string, role: UserRole) => Promise<User>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.user) {
      setUser(stored.user);
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredAuth();
      setUser(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    const result = await loginApi(email, password, role);
    setUser(result.user);
    setStoredAuth({ access: result.access, refresh: result.refresh, user: result.user });
    return result.user;
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    role: UserRole,
  ) => {
    const result = await registerApi(fullName, email, password, confirmPassword, role);
    setUser(result.user);
    setStoredAuth({ access: result.access, refresh: result.refresh, user: result.user });
    return result.user;
  };

  const loginWithGoogle = async (idToken: string, role: UserRole) => {
    const result = await loginWithGoogleApi(idToken, role);
    setUser(result.user);
    setStoredAuth({ access: result.access, refresh: result.refresh, user: result.user });
    return result.user;
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) =>
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      const stored = getStoredAuth();
      if (stored) {
        setStoredAuth({ ...stored, user: next });
      }
      return next;
    });

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
