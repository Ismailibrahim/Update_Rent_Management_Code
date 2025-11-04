'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  legacy_role: string;
  is_active: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role_id?: number;
  legacy_role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await authAPI.getMe();
            setUser(response.data.user);
          } catch (error) {
            console.error('Auth initialization error:', error);
            localStorage.removeItem('token');
            // Don't show error toast on initial load
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      
      const { token, user: userData } = response.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
      setUser(userData);
      
      // Delay toast to prevent interference with navigation
      setTimeout(() => {
        toast.success('Login successful!');
      }, 100);
      return { success: true };
    } catch (error: unknown) {
      const errorObj = error as { message?: string; code?: string; response?: { data?: { message?: string }; status?: number } };
      
      // If it's a 429 error, show a more helpful message
      if (errorObj.response?.status === 429) {
        toast.error('Too many login attempts. Please wait a moment before trying again.');
        return { success: false, message: 'Rate limit exceeded. Please wait before trying again.' };
      }
      
      const message = errorObj.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
      setUser(newUser);
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      // Redirect to login page after logout
      window.location.href = '/login';
    }
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
