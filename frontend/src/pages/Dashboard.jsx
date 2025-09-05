import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const Dashboard = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-header-blue mb-4">
            ¡Bienvenido al Dashboard!
          </h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Información del Usuario:</h2>
            <p><strong>Email:</strong> {currentUser?.email}</p>
            <p><strong>UID:</strong> {currentUser?.uid}</p>
            <p><strong>Proveedor:</strong> {currentUser?.providerId || 'Email/Password'}</p>
            <p><strong>Última conexión:</strong> {currentUser?.metadata?.lastSignInTime}</p>
          </div>

          <Button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600">
            Cerrar Sesión
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-header-blue mb-4">
            Funcionalidades del Sistema
          </h2>
          <p className="text-gray-600">
            Aquí puedes agregar las funcionalidades específicas de tu aplicación ByteDental.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
