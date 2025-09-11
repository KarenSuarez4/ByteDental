import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUser, logout } from '../Firebase/client';
import { registerLogoutEvent } from '../services/authAuditService';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      // Registrar logout en auditoría antes de cerrar sesión
      if (currentUser) {
        await registerLogoutEvent(currentUser.uid);
      }
      
      await logout();
      setCurrentUser(null);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signOut,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
