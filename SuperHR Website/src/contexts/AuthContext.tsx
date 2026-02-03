import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/alumni';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithMicrosoft: () => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = localStorage.getItem('alumniconnect_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('alumniconnect_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // For demo purposes, accept any email with password "password123"
    // or find a user from mockUsers
    const foundUser = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser && password === '123') {
      setUser(foundUser);
      localStorage.setItem('alumniconnect_user', JSON.stringify(foundUser));
      setLoading(false);
      return true;
    }
    
    // Create a default user if email contains '@'
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
      localStorage.setItem('alumniconnect_user', JSON.stringify(newUser));
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    // Simulate OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const googleUser: User = {
      id: crypto.randomUUID(),
      name: 'Google User',
      email: 'user@gmail.com',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
      permissions: ['read', 'write'],
      lastActive: new Date().toISOString(),
    };
    
    setUser(googleUser);
    localStorage.setItem('alumniconnect_user', JSON.stringify(googleUser));
    setLoading(false);
    return true;
  };

  const loginWithMicrosoft = async (): Promise<boolean> => {
    setLoading(true);
    // Simulate OAuth flow
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
    localStorage.setItem('alumniconnect_user', JSON.stringify(msUser));
    setLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('alumniconnect_user');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    loginWithGoogle,
    loginWithMicrosoft,
    logout,
    loading,
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
