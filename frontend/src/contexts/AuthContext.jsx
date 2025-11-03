import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUser, logout } from '../Firebase/client';
import { registerLogoutEvent } from '../services/authAuditService';

const AuthContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROLE_MAP = {
  "Administrator": "Administrador",
  "Auditor": "Auditor",
  "Doctor": "Doctor",
  "Assistant": "Asistente",
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Función para refrescar el token
  const refreshToken = async (user) => {
    if (user) {
      try {
        const newToken = await user.getIdToken(true); // force refresh
        setToken(newToken);
        return newToken;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        const token = await user.getIdToken();
        setToken(token);
        const uid = user.uid;
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const backendUser = await response.json();
          setMustChangePassword(backendUser.must_change_password);
          setUserRole(ROLE_MAP[backendUser.role_name] || backendUser.role_name);
        } else {
          setUserRole(null);
          setMustChangePassword(false);
        }
      } else {
        setUserRole(null);
        setMustChangePassword(false);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Refrescar token automáticamente cada 50 minutos (antes de que expire)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      console.log('🔄 Refreshing Firebase token...');
      await refreshToken(currentUser);
    }, 50 * 60 * 1000); // 50 minutos

    return () => clearInterval(interval);
  }, [currentUser]);

  const signOut = async () => {
    try {
      // Registrar logout en auditoría antes de cerrar sesión
      if (currentUser) {
        await registerLogoutEvent(currentUser.uid);
      }
      
      await logout();
      setCurrentUser(null);
      setToken(null);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    userRole,
    mustChangePassword,
    token,
    loading,
    signOut,
    refreshToken: () => refreshToken(currentUser),
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Cargando autenticación...</div> : children}
    </AuthContext.Provider>
  );
}