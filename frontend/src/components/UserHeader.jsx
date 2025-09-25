import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';
import StyledLogoutButton from './StyledLogoutButton'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

function cn(...args) {
  return twMerge(clsx(args));
}

const UserHeader = ({ userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

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
      { path: "/appointments", label: "Seguimiento de citas" },
    ],
    'Auditor': [
      { path: "/audit-logs", label: "Registros de Auditoría" },
      { path: "/user-activity", label: "Actividad de Usuarios" },
    ],
  };

  const getNavLinkClass = (path) => {
    const baseClasses = "px-8 py-4 font-poppins text-18 rounded-[40px] transition-all duration-300";
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

  return (
    <header className="bg-header-blue w-full min-h-[70px] flex flex-col md:flex-row md:items-center px-2 md:px-10 py-2 relative z-10">
      <div className="flex items-center justify-between w-full md:w-auto">
        <Link to="/">
          <img src="/images/bytedental-logo.png" alt="ByteDental Logo" className="w-[60px] md:w-[100px] h-auto mr-2 md:mr-6" />
        </Link>
      </div>
      <nav
        className="w-full min-w-0 max-w-full overflow-x-auto whitespace-nowrap flex items-center justify-center gap-2 md:gap-6 text-xs sm:text-sm md:text-16 font-poppins font-semibold mx-auto mt-2 md:mt-0 hide-scrollbar pl-12"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {currentNavLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={getNavLinkClass(link.path)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-center gap-1 md:gap-3 text-white font-poppins mt-2 md:mt-0 ml-0 md:ml-auto">
        <FontAwesomeIcon icon={faUserCircle} className="text-white text-xl md:text-3xl" />
        <span className="font-semibold text-[0.95rem] md:text-18">{userRole}</span>
        <StyledLogoutButton onClick={handleSignOut} />
      </div>
    </header>
  );
};

export default UserHeader;
