import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/contact';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  orgSetupCompleted: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithMicrosoft: () => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  refreshFromToken: (token?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgSetupCompleted, setOrgSetupCompleted] = useState(false);

  // Backend API base URL – adjust if your FastAPI server runs elsewhere
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

  const refreshFromToken = async (token?: string) => {
    const effectiveToken = token || localStorage.getItem('crm_token');
    if (!effectiveToken) return;

    setLoading(true);
    try {
      const [meRes, setupRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        }),
        fetch(`${API_BASE_URL}/auth/setup-status`, {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        }),
      ]);

      if (!meRes.ok) {
        throw new Error('Failed to fetch current user');
      }

      const backendUser = await meRes.json();
      const setupStatus = setupRes.ok ? await setupRes.json() : { setup_completed: false };

      const mappedUser: User = {
        id: String(backendUser.user_id ?? backendUser.id ?? ''),
        name:
          backendUser.first_name || backendUser.last_name
            ? `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim()
            : backendUser.email,
        email: backendUser.email,
        role: (backendUser.role || 'user') as User['role'],
        avatar: undefined,
        permissions:
          backendUser.role === 'admin'
            ? ['read', 'write', 'send-communications']
            : backendUser.role === 'manager'
            ? ['read', 'write']
            : ['read'],
        lastActive: new Date().toISOString(),
      };

      setUser(mappedUser);
      localStorage.setItem('crm_user', JSON.stringify(mappedUser));
      setOrgSetupCompleted(Boolean(setupStatus.setup_completed));
    } catch {
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('crm_user');
    const storedToken = localStorage.getItem('crm_token');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('crm_user');
      }
    }

    if (storedToken) {
      // Always refresh from backend so org setup status stays in sync,
      // even if we already had a cached user.
      refreshFromToken(storedToken);
      return;
    }

    setLoading(false);
  }, [API_BASE_URL]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser && password === 'password123') {
      setUser(foundUser);
      localStorage.setItem('crm_user', JSON.stringify(foundUser));
      setLoading(false);
      return true;
    }
    
    if (email.includes('@') && password.length >= 6) {
      const newUser: User = {
        id: crypto.randomUUID(),
        name: email.split('@')[0],
        email: email,
        role: 'user',
        permissions: ['read'],
        lastActive: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem('crm_user', JSON.stringify(newUser));
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    // Hand control over to the backend Google OAuth flow.
    // The backend `GET /auth/google/login` will redirect to Google and then back to your API.
    window.location.href = `${API_BASE_URL}/auth/google/login`;
    return true;
  };

  const loginWithMicrosoft = async (): Promise<boolean> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const msUser: User = {
      id: crypto.randomUUID(),
      name: 'Microsoft User',
      email: 'user@outlook.com',
      role: 'manager',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=150&h=150&fit=crop&crop=face',
      permissions: ['read', 'write', 'send-communications'],
      lastActive: new Date().toISOString(),
    };
    
    setUser(msUser);
    localStorage.setItem('crm_user', JSON.stringify(msUser));
    setLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    setOrgSetupCompleted(false);
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_token');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    orgSetupCompleted,
    login,
    loginWithGoogle,
    loginWithMicrosoft,
    logout,
    loading,
    refreshFromToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
