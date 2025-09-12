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
import RegisterUser from './pages/Admin/RegisterUser';
import DummyPage from './pages/DummyPage';

function AppContent() {
  const { isAuthenticated, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Cargando...</div>;

  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <div className="min-h-screen w-full flex flex-col">
      {!isLoginPage && (isAuthenticated ? <UserHeader userRole={userRole} /> : <Header />)}

      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<PasswordReset />} />
        <Route path="/PasswordReset2" element={<PasswordReset2 />} />
        <Route path="/PasswordReset3" element={<PasswordReset3 />} />

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
                <DummyPage title="Registros de Auditoría" />
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
        <Route path="*" element={<Navigate to={isAuthenticated ? "/users/manage" : "/login"} />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;