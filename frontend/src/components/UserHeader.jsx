import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';
import StyledLogoutButton from './StyledLogoutButton'; 
import UserProfileModal from './UserProfileModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

// Estilos para ocultar la barra de scroll
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;     /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;             /* Chrome, Safari and Opera */
  }
`;

function cn(...args) {
  return twMerge(clsx(args));
}

const UserHeader = ({ userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, token } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const navLinks = {
    'Administrador': [
      { path: "/users/register", label: "Registrar usuarios" },
      { path: "/users/manage", label: "Gestión de usuarios" },
      { path: "/dental-services/register", label: "Crear servicios" },
      { path: "/dental-services/manage", label: "Gestionar servicios" },
      { path: "/reports", label: "Reportes" },
    ],
    'Asistente': [
      { path: "/patients/register", label: "Registrar paciente" },
      { path: "/patients", label: "Gestión de pacientes" },
    ],
    'Doctor': [
      { path: "/patients", label: "Gestión de pacientes" },
      { path: "/clinical-history", label: "Historial Clínico" },
      // { path: "/appointments", label: "Seguimiento de citas" },
    ],
    'Auditor': [
      { path: "/audit-logs", label: "Registros de Auditoría" },
      { path: "/user-activity", label: "Actividad de Usuarios" },
    ],
  };

  const getNavLinkClass = (path) => {
    const baseClasses = "px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-poppins text-sm sm:text-16 lg:text-18 rounded-[30px] sm:rounded-[35px] lg:rounded-[40px] transition-all duration-300 whitespace-nowrap flex-shrink-0";
    const activeClasses = "bg-primary-blue text-white shadow-md";
    const inactiveClasses = "text-white hover:bg-white hover:bg-opacity-20";
    
    // Lógica mejorada para el match de rutas
    const isActive = () => {
      // Para rutas más específicas, hacer match exacto
      if (path.includes('/register') || path.includes('/manage')) {
        return location.pathname === path;
      }
      // Para rutas generales, usar startsWith pero evitar conflictos
      return location.pathname === path || 
             (location.pathname.startsWith(path) && 
              !location.pathname.includes('/register') && 
              !location.pathname.includes('/manage'));
    };
    
    return cn(baseClasses, isActive() ? activeClasses : inactiveClasses);
  };

  const currentNavLinks = navLinks[userRole] || [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const fetchUserData = async () => {
    console.log('🔍 Fetching user data...');
    setLoadingUserData(true);
    try {
      console.log('🔑 Token from context:', token ? 'Present' : 'Missing');
      if (!token) {
        console.error('❌ No token found in context');
        return;
      }

      const url = `${import.meta.env.VITE_API_URL}/api/users/me`;
      console.log('🌐 Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User data received:', data);
        setUserData(data);
        setIsProfileModalOpen(true);
        console.log('🎭 Modal should be open now');
      } else {
        console.error('❌ Error fetching user data:', response.statusText);
      }
    } catch (error) {
      console.error('💥 Exception:', error);
    } finally {
      setLoadingUserData(false);
      console.log('✅ Fetch completed');
    }
  };

  const handleUserIconClick = () => {
    console.log('👆 User icon clicked');
    console.log('📊 Current state:', { userData: !!userData, loadingUserData, isProfileModalOpen });
    
    if (!userData && !loadingUserData) {
      console.log('➡️ Fetching user data...');
      fetchUserData();
    } else if (userData) {
      console.log('➡️ Opening modal with existing data');
      setIsProfileModalOpen(true);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyles }} />
      <header className="bg-header-blue w-full min-h-[70px] flex flex-col lg:flex-row lg:items-center px-2 sm:px-4 lg:px-6 py-2 relative z-10">
      {/* Logo y User info en móvil */}
      <div className="flex items-center justify-between w-full lg:w-auto mb-2 lg:mb-0">
        <Link to="/" className="flex-shrink-0">
          <img src="/images/bytedental-logo.png" alt="ByteDental Logo" className="w-[50px] sm:w-[60px] lg:w-[80px] h-auto" />
        </Link>
        
        {/* User info - visible en móvil, oculto en desktop */}
        <div className="flex items-center gap-2 text-white font-poppins lg:hidden">
          <button 
            onClick={handleUserIconClick}
            className="hover:opacity-80 transition-opacity duration-200"
            disabled={loadingUserData}
            aria-label="Ver perfil de usuario"
          >
            <FontAwesomeIcon 
              icon={faUserCircle} 
              className={`text-white text-xl ${loadingUserData ? 'animate-pulse' : ''}`} 
            />
          </button>
          <span className="font-semibold text-15">{userRole}</span>
          <StyledLogoutButton onClick={handleSignOut} />
        </div>
      </div>

      {/* Navegación con scroll horizontal mejorado */}
      <div className="flex-1 min-w-0 lg:mx-4">
        <nav className="w-full overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 min-w-max px-1 lg:justify-center">
            {currentNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={getNavLinkClass(link.path)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* User info - visible solo en desktop */}
      <div className="hidden lg:flex items-center gap-3 text-white font-poppins flex-shrink-0">
        <button 
          onClick={handleUserIconClick}
          className="hover:opacity-80 transition-opacity duration-200"
          disabled={loadingUserData}
          aria-label="Ver perfil de usuario"
        >
          <FontAwesomeIcon 
            icon={faUserCircle} 
            className={`text-white text-3xl ${loadingUserData ? 'animate-pulse' : ''}`} 
          />
        </button>
        <span className="font-semibold text-18 whitespace-nowrap">{userRole}</span>
        <StyledLogoutButton onClick={handleSignOut} />
      </div>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userData={userData}
      />
    </header>
    </>
  );
};

export default UserHeader;
