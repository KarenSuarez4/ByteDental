import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import PasswordReset from './pages/PasswordReset.jsx';
import PasswordReset2 from './pages/PasswordReset2.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/PasswordReset" element={<PasswordReset />} />
        <Route path="/PasswordReset2" element={<PasswordReset2 />} />
      </Routes>
    </Router>
  );
}

export default App;