import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import { getUserById } from '../services/userService';
import { auth } from '../Firebase/client';
// Importa la función getAuthToken
import { getAuthToken } from '../services/getToken';

const Dashboard = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        const token = await getAuthToken();
        if (!token) {
          throw new Error('Usuario no autenticado');
        }

        const userData = await getUserById(currentUser.uid, token);
        setUser(userData);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!user) return <p>No se encontró el usuario</p>;

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
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-bold text-header-blue mb-4">
            Funcionalidades del Sistema
          </h2>
          {user.role_name === 'ADMINISTRADOR' && (
            <div className="mb-4">
              <Link 
                to="/admin/statistics" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Ver Dashboard de Estadísticas
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-bold text-header-blue mb-4">
            Detalles del Usuario
          </h2>
          <p><strong>Nombre:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Documento:</strong> {user.document_type} {user.document_number}</p>
          <p><strong>Rol:</strong> {user.role_name}</p>
          <p><strong>Estado:</strong> {user.is_active ? 'Activo' : 'Inactivo'}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
