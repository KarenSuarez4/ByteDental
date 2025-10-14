import React from 'react';
import { clsx } from 'clsx';
import ProgressBar from './ProgressBar';
import { FaHospitalUser, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import { LuBotMessageSquare, LuSignature } from "react-icons/lu";
import { SiGoogledocs } from "react-icons/si";
import { MdMedicalInformation } from "react-icons/md";

// Mapa de iconos
const iconMap = {
    FaHospitalUser: FaHospitalUser,
    LuBotMessageSquare: LuBotMessageSquare,
    SiGoogledocs: SiGoogledocs,
    FaSearch: FaSearch,
    MdMedicalInformation: MdMedicalInformation,
    LuSignature: LuSignature,
};

const FormNavigationBar = ({
    progress,
    sections,
    className = "",
    showProgressBar = true,
    showLabels = true,
    hasAttemptedSubmit = false // ✅ Nueva prop
}) => {
    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const yOffset = -120;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const renderIcon = (iconName) => {
        const IconComponent = iconMap[iconName];
        return IconComponent ? <IconComponent /> : null;
    };

    return (
        <div
            className={clsx(
                "sticky top-0 z-50 bg-gray-50 w-full py-2 sm:py-3 md:py-4 border-b border-gray-200 backdrop-blur-sm",
                className
            )}
            role="region"
            aria-label="Navegación del formulario"
            aria-live="polite"
        >
            <div className="max-w-[900px] px-3 sm:px-4 mx-auto">
                <div className="flex flex-col items-center gap-2 mb-3">
                    {showProgressBar && (
                        <ProgressBar
                            progress={progress}
                            aria-valuenow={progress}
                            aria-valuemin="0"
                            aria-valuemax="100"
                        />
                    )}

                    <nav className="flex justify-center gap-3 sm:gap-4 md:gap-5" role="navigation">
                        {sections.map((section, index) => (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => scrollToSection(section.id)}
                                className={clsx(
                                    "flex flex-col items-center text-xs transition-all duration-300 cursor-pointer hover:scale-105",
                                    "focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 rounded-lg p-2",
                                    section.completed ? 'opacity-100' : 'opacity-60',
                                    section.showError && 'animate-pulse' // ✅ Animación para errores
                                )}
                                title={`${section.label}: ${section.completed ? 'Completada' : section.showError ? 'Incompleta - Requerida' : 'Pendiente'} - Click para navegar`}
                                aria-label={`Ir a sección ${section.label} - ${section.completed ? 'Completada' : section.showError ? 'Incompleta - Requerida' : 'Pendiente'}`}
                            >
                                {/* Icono con estados múltiples */}
                                <div className={clsx(
                                    "relative p-2 sm:p-3 rounded-full mb-2 transition-all duration-300 transform",
                                    section.completed
                                        ? 'bg-primary-blue text-white shadow-lg scale-110'
                                        : section.showError
                                            ? 'bg-red-500 text-white shadow-lg scale-110 ring-2 ring-red-300' // ✅ Estado de error
                                            : 'bg-gray-100 text-gray-400 shadow-sm hover:bg-gray-200'
                                )}>
                                    <div className="text-sm sm:text-base md:text-lg">
                                        {renderIcon(section.iconName)}
                                    </div>

                                    {/* Overlay para estados */}
                                    {section.completed && !section.showError && (
                                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                                            <svg
                                                className="w-2.5 h-2.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    )}

                                    {/* ✅ Overlay de error */}
                                    {section.showError && (
                                        <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5">
                                            <FaExclamationTriangle className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </div>

                                {/* Label con colores dinámicos */}
                                {showLabels && (
                                    <span className={clsx(
                                        "hidden sm:block text-xs font-medium transition-colors font-poppins",
                                        section.completed
                                            ? 'text-primary-blue'
                                            : section.showError
                                                ? 'text-red-600 font-bold' // ✅ Color rojo para errores
                                                : 'text-gray-500'
                                    )}>
                                        {section.label}
                                    </span>
                                )}

                                {/* Indicador de progreso con colores dinámicos */}
                                <div className={clsx(
                                    "mt-1 w-6 h-1 rounded-full transition-all duration-300",
                                    section.completed
                                        ? 'bg-primary-blue'
                                        : section.showError
                                            ? 'bg-red-500' // ✅ Indicador rojo para errores
                                            : 'bg-gray-300'
                                )} />
                            </button>
                        ))}
                    </nav>

                    {/* ✅ Mensaje de ayuda cuando hay errores */}
                    {hasAttemptedSubmit && sections.some(s => s.showError) && (
                        <div className="mt-2 text-xs text-red-600 font-medium text-center font-poppins">
                            <FaExclamationTriangle className="inline w-3 h-3 mr-1" />
                            Las secciones en rojo requieren completarse antes de guardar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormNavigationBar;