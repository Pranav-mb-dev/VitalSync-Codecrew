'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const AlertContext = createContext();

const mapSosAlert = (alert) => ({
  id: alert.id,
  type: 'sos',
  message: alert.triggerReason || 'SOS triggered',
  time: alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Just now',
  read: Boolean(alert.resolved),
  raw: alert,
});

export const AlertProvider = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);

  const refreshAlerts = async () => {
    if (!user || user.role !== 'caregiver') {
      setAlerts([]);
      return;
    }

    try {
      const data = await api.get('/sos/history');
      setAlerts(data.map(mapSosAlert));
    } catch {
      setAlerts([]);
    }
  };

  useEffect(() => {
    refreshAlerts();
  }, [user?.id, user?.role]);

  const addAlert = (alert) => {
    setAlerts((prev) => [{ id: alert.id || Date.now(), ...alert, read: false }, ...prev]);
  };

  const markRead = async (id) => {
    const current = alerts.find((alert) => alert.id === id);
    if (current?.type === 'sos') {
      try {
        await api.patch(`/sos/${id}/resolve`, {});
      } catch {
        return;
      }
    }
    setAlerts((prev) => prev.map((alert) => alert.id === id ? { ...alert, read: true } : alert));
  };

  const clearAll = async () => {
    await Promise.all(
      alerts.filter((alert) => !alert.read && alert.type === 'sos').map((alert) => api.patch(`/sos/${alert.id}/resolve`, {}))
    ).catch(() => {});
    setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
  };

  const unreadCount = alerts.filter((alert) => !alert.read).length;

  return (
    <AlertContext.Provider value={{ alerts, addAlert, markRead, clearAll, unreadCount, refreshAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => useContext(AlertContext);
