import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserHeader from './components/UserHeader';
import Header from './components/Header';
import Login from './pages/Login.jsx';
import PasswordReset from './pages/PasswordReset.jsx';
import PasswordReset2 from './pages/PasswordReset2.jsx';
import PasswordReset3 from './pages/PasswordReset3.jsx';
import ForcePasswordChange from './pages/ForcePasswordChange.jsx';
import RegisterUser from './pages/Admin/RegisterUser';
import AuditLog from './pages/Auditor/AuditLog.jsx';
import DummyPage from './pages/DummyPage';

function AppContent() {
  const { isAuthenticated, userRole, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Cargando...</div>;

  // Si el usuario está autenticado pero debe cambiar contraseña y no está en la página de cambio
  if (isAuthenticated && mustChangePassword && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  const isLoginPage = location.pathname === '/login' || location.pathname === '/';
  const isForcePasswordChangePage = location.pathname === '/force-password-change';

  return (
    <div className="min-h-screen w-full flex flex-col">
      {!isLoginPage && !isForcePasswordChangePage && (isAuthenticated ? <UserHeader userRole={userRole} /> : <Header />)}

      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<PasswordReset />} />
        <Route path="/PasswordReset2" element={<PasswordReset2 />} />
        <Route path="/PasswordReset3" element={<PasswordReset3 />} />
        <Route path="/force-password-change" element={<ForcePasswordChange />} />

        {/* Rutas protegidas por rol */}
        {isAuthenticated && userRole === "Administrador" && (
          <>
            <Route path="/users/register" element={
              <ProtectedRoute>
                <RegisterUser />
              </ProtectedRoute>
            } />
            <Route path="/users/manage" element={
              <ProtectedRoute>
                <DummyPage title="Gestión de usuarios" />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <DummyPage title="Reportes" />
              </ProtectedRoute>
            } />
            <Route path="/services" element={
              <ProtectedRoute>
                <DummyPage title="Catálogo de servicios" />
              </ProtectedRoute>
            } />
          </>
        )}
        {isAuthenticated && userRole === "Asistente" && (
          <>
            <Route path="/patients" element={
              <ProtectedRoute>
                <DummyPage title="Gestión de pacientes" />
              </ProtectedRoute>
            } />
          </>
        )}
        {isAuthenticated && userRole === "Doctor" && (
          <>
            <Route path="/patients" element={
              <ProtectedRoute>
                <DummyPage title="Gestión de pacientes" />
              </ProtectedRoute>
            } />
            <Route path="/clinical-history" element={
              <ProtectedRoute>
                <DummyPage title="Historial Clínico" />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute>
                <DummyPage title="Seguimiento de citas" />
              </ProtectedRoute>
            } />
          </>
        )}
        {isAuthenticated && userRole === "Auditor" && (
          <>
            <Route path="/audit-logs" element={
              <ProtectedRoute>
                <AuditLog />
              </ProtectedRoute>
            } />
            <Route path="/user-activity" element={
              <ProtectedRoute>
                <DummyPage title="Actividad de Usuarios" />
              </ProtectedRoute>
            } />
          </>
        )}

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to={
          isAuthenticated ? (
            mustChangePassword ? "/force-password-change" : 
            userRole === "Administrador" ? "/users/register" :
            userRole === "Doctor" || userRole === "Asistente" ? "/patients" :
            userRole === "Auditor" ? "/audit-logs" :
            "/login"
          ) : "/login"
        } />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;