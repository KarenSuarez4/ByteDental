import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login.jsx';
import PasswordReset from './pages/PasswordReset.jsx';
import PasswordReset2 from './pages/PasswordReset2.jsx';
import PasswordReset3 from './pages/PasswordReset3.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/PasswordReset" element={<PasswordReset />} />
          <Route path="/PasswordReset2" element={<PasswordReset2 />} />
          <Route path="/PasswordReset3" element={<PasswordReset3 />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;