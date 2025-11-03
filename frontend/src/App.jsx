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
import UserManagement from './pages/Admin/UserManagement.jsx';
import RegisterDentalService from './pages/Admin/RegisterDentalService';
import DentalServiceManagement from './pages/Admin/DentalServiceManagement';
import Reports from './pages/Admin/Reports';
import AuditLog from './pages/Auditor/AuditLog.jsx';
import RegisterPatient from './pages/Asistente/RegisterPatient';
import PatientManagement from './pages/Asistente/PatientManagement';
import DummyPage from './pages/DummyPage';
import RegisterPatientFirstHistory from './pages/Doctor/RegisterPatientFirstHistory.jsx';
import HistoryManagement from './pages/Doctor/HistoryManagement.jsx';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StatisticsDashboard from './pages/Admin/StatisticsDashboard';

function AppContent() {
  const { isAuthenticated, userRole, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Cargando...</div>;

  if (isAuthenticated && mustChangePassword && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  const isLoginPage = location.pathname === '/login' || location.pathname === '/';
  const isForcePasswordChangePage = location.pathname === '/force-password-change';

  return (
    <div className="min-h-screen w-full flex flex-col">
      {!isLoginPage && !isForcePasswordChangePage && (isAuthenticated ? <UserHeader userRole={userRole} /> : <Header />)}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/PasswordReset" element={<PasswordReset />} />
        <Route path="/PasswordReset2" element={<PasswordReset2 />} />
        <Route path="/PasswordReset3" element={<PasswordReset3 />} />
        <Route path="/force-password-change" element={<ForcePasswordChange />} />
        {isAuthenticated && userRole === "Administrador" && (
          <>
            <Route path="/users/register" element={<ProtectedRoute><RegisterUser /></ProtectedRoute>} />
            <Route path="/users/manage" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/dental-services/register" element={<ProtectedRoute><RegisterDentalService /></ProtectedRoute>} />
            <Route path="/dental-services/manage" element={<ProtectedRoute><DentalServiceManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/admin/statistics" element={<ProtectedRoute><StatisticsDashboard /></ProtectedRoute>} />
          </>
        )}
        {isAuthenticated && userRole === "Asistente" && (
          <>
            <Route path="/patients" element={<ProtectedRoute><PatientManagement /></ProtectedRoute>} />
            <Route path="/patients/register" element={<ProtectedRoute><RegisterPatient /></ProtectedRoute>} />
          </>
        )}
        {isAuthenticated && userRole === "Doctor" && (
          <>
            <Route path="/patients" element={<ProtectedRoute><PatientManagement /></ProtectedRoute>} />
            <Route path="/clinical-history" element={<ProtectedRoute><RegisterPatientFirstHistory /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><HistoryManagement /></ProtectedRoute>} />
            <Route path="/doctor/register-first-history/:patientId?" element={<ProtectedRoute><RegisterPatientFirstHistory /></ProtectedRoute>} />
            <Route path="/history-management" element={<HistoryManagement />} />
            <Route path="/doctor/history-management/:historyId" element={<HistoryManagement />} />
          </>
        )}
        {isAuthenticated && userRole === "Auditor" && (
          <>
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
            <Route path="/user-activity" element={<ProtectedRoute><DummyPage title="Actividad de Usuarios" /></ProtectedRoute>} />
          </>
        )}
        <Route path="*" element={<Navigate to={isAuthenticated ? (mustChangePassword ? "/force-password-change" : userRole === "Administrador" ? "/users/register" : userRole === "Doctor" || userRole === "Asistente" ? "/patients" : userRole === "Auditor" ? "/audit-logs" : "/login") : "/login"} replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
