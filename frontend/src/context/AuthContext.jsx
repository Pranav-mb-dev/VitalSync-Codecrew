'use client';
import React, { createContext, useContext, useState } from 'react';
import api, { storage } from '../services/api';

const AuthContext = createContext();

const normalizeUser = (auth, profile) => ({
  id: auth?.userId || profile?.userId || profile?.id || null,
  email: auth?.email || profile?.email || '',
  role: (auth?.role || profile?.role || '').toLowerCase(),
  name: profile?.fullName || auth?.fullName || '',
  phone: profile?.phoneNumber || '',
  blood: profile?.bloodType || '',
  pairCode: profile?.pairCode || '',
  conditions: profile?.medicalConditions
    ? profile.medicalConditions.split(',').map((item) => item.trim()).filter(Boolean)
    : [],
  language: profile?.language || 'en',
  dateOfBirth: profile?.dateOfBirth || null,
  emergencyContacts: profile?.emergencyContacts || [],
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const storedUser = storage.getUser();
    if (storedUser && storedUser.role) {
      storedUser.role = storedUser.role.toLowerCase();
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const syncUser = async (authResponse) => {
    storage.setToken(authResponse.token);
    const profile = await api.get('/profile');
    const normalizedUser = normalizeUser(authResponse, profile);
    setUser(normalizedUser);
    storage.setUser(normalizedUser);
    return normalizedUser;
  };

  const login = async (email, password, role) => {
    setLoading(true);
    try {
      const authResponse = await api.post('/auth/login', { email, password });
      const normalizedUser = await syncUser(authResponse);

      if (role && normalizedUser.role !== role) {
        storage.clearAuth();
        setUser(null);
        return { success: false, error: `This account is registered as ${normalizedUser.role}.` };
      }

      return { success: true, user: normalizedUser };
    } catch (err) {
      storage.clearAuth();
      setUser(null);
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data) => {
    setLoading(true);
    try {
      const authResponse = await api.post('/auth/register', {
        fullName: data.name,
        email: data.email,
        password: data.password,
        role: data.role.toUpperCase(),
        pairCode: data.pairCode || '',
        language: data.language || 'en',
      });

      const normalizedUser = await syncUser(authResponse);
      return { success: true, user: normalizedUser };
    } catch (err) {
      storage.clearAuth();
      setUser(null);
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    storage.clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
