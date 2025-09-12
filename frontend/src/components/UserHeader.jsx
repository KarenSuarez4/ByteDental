import React from "react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const UserHeader = ({ userRole }) => {
  const location = useLocation();

  const navLinks = {
    'Administrador': [
      { path: "/users/register", label: "Registrar usuarios" },
      { path: "/users/manage", label: "Gestión de usuarios" },
      { path: "/reports", label: "Reportes" },
      { path: "/services", label: "Catálogo de servicios" },
      { path: "/audit", label: "Auditoría de usuarios" },
    ],
    'Asistente': [
      /*{ path: "/schedule", label: "Agendamiento de citas" },*/
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
    const baseClasses = "px-8 py-4 font-poppins text-lg rounded-[40px] transition-all duration-300";
    const activeClasses = "bg-primary-blue text-white shadow-md";
    const inactiveClasses = "text-white hover:bg-white hover:bg-opacity-20";
    return cn(baseClasses, location.pathname.startsWith(path) ? activeClasses : inactiveClasses);
  };

  const currentNavLinks = navLinks[userRole] || [];

  return (
    <header className="bg-header-blue w-full h-[145px] flex items-center justify-between px-10 relative">
      <div className="flex items-center">
        <Link to="/">
          <img src="/images/bytedental-logo.png" alt="ByteDental Logo" className="w-[100px] h-auto mr-8" />
        </Link>
        <nav className="flex items-center space-x-8 text-white font-poppins text-lg">
          {currentNavLinks.map((link) => (
            <Link key={link.path} to={link.path} className={getNavLinkClass(link.path)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center space-x-3 text-white font-poppins">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="7" r="3.5" stroke="white" strokeWidth="2" />
          <path d="M12 17c-2.76 0-5 2.24-5 5h10c0-2.76-2.24-5-5-5z" stroke="white" strokeWidth="2" />
        </svg>
        <span className="font-semibold">{userRole}</span>
      </div>
    </header>
  );
};

export default UserHeader;
