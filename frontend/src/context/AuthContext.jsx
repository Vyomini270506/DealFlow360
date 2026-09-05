import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'sonner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('dealflow_token');
      if (token) {
        try {
          const { data } = await API.get('/auth/me');
          setUser(data);
        } catch (err) {
          console.error('Session verification failed:', err);
          localStorage.removeItem('dealflow_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('dealflow_token', data.token);
      setUser(data);
      toast.success(`Welcome back, ${data.name}! Logged in as ${data.role}`);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check credentials.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const sendOtp = async (email, type = 'REGISTER') => {
    try {
      const { data } = await API.post('/auth/send-otp', { email, type });
      toast.success(`🔐 Verification OTP sent to ${email}! Please check your inbox.`);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP code.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await API.post('/auth/register', userData);
      localStorage.setItem('dealflow_token', data.token);
      setUser(data);
      toast.success(`🎉 Account created! Welcome, ${data.name}`);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Check details.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const loginWithOtp = async (email, otp) => {
    try {
      const { data } = await API.post('/auth/login-otp', { email, otp });
      localStorage.setItem('dealflow_token', data.token);
      setUser(data);
      toast.success(`Welcome back, ${data.name}! Logged in via OTP verification.`);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'OTP verification failed.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const { data } = await API.post('/auth/reset-password', { email, otp, newPassword });
      toast.success(data.message || 'Password reset successfully!');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // Quick Demo Login for Hackathon Evaluators
  const quickLogin = async (role) => {
    const demoAccounts = {
      ADMIN: 'admin@dealflow360.com',
      SALES_MANAGER: 'manager@dealflow360.com',
      SALES_REP: 'rahul@dealflow360.com',
      FINANCE_OPERATIONS: 'finance@dealflow360.com',
      CUSTOMER: 'customer@acmecorp.com'
    };

    const email = demoAccounts[role];
    if (!email) return;

    return await login(email, 'password123');
  };

  const logout = () => {
    localStorage.removeItem('dealflow_token');
    setUser(null);
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, sendOtp, register, loginWithOtp, resetPassword, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
