import React from 'react';
import { FaHospitalUser, FaRegIdCard, FaCalendarDay, FaPhone } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import { MdWork } from "react-icons/md";

// Función para calcular edad
const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};

const PatientInfoCard = ({
    patientDetails,
    showHeader = true,
    showActions = true,
    className = "",
    onEmailClick,
    onPhoneClick
}) => {
    if (!patientDetails) return null;

    const { person, occupation, id } = patientDetails;

    const handleEmailClick = () => {
        if (onEmailClick) {
            onEmailClick(person.email);
        } else {
            window.open(`mailto:${person.email}`, '_blank');
        }
    };

    const handlePhoneClick = () => {
        if (onPhoneClick) {
            onPhoneClick(person.phone);
        } else {
            window.open(`tel:${person.phone}`, '_blank');
        }
    };

    return (
        <article
            className={`bg-gradient-to-br from-primary-blue/10 via-white to-header-blue/5 rounded-[16px] sm:rounded-[20px] p-5 sm:p-7 border border-primary-blue/20 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
            aria-label="Información del paciente seleccionado"
        >
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center">
                        <div className="bg-gradient-to-r from-primary-blue to-primary-blue-hover p-3 rounded-full mr-4 shadow-md" aria-hidden="true">
                            <span className="text-xl sm:text-2xl">
                                <FaHospitalUser color="white" />
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-24 font-bold font-poppins text-gray-800 mb-1">
                                Información del Paciente
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                                Datos verificados y actualizados
                            </p>
                        </div>
                    </div>

                    {/* Badge de estado */}
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        ✓ Verificado
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Nombre Completo - Destacado */}
                <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md border-l-4 border-primary-blue">
                    <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-primary-blue rounded-full mr-2"></div>
                        <label className="text-sm sm:text-base font-semibold text-gray-700 font-poppins">
                            Nombre Completo
                        </label>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 font-poppins break-words">
                        {person.first_name} {person.middle_name ? `${person.middle_name} ` : ''}{person.first_surname} {person.second_surname || ''}
                    </p>
                </div>

                {/* Documento con icono */}
                <div className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center mb-2">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <FaRegIdCard className="w-4 h-4 text-primary-blue" />
                        </div>
                        <label className="text-sm font-semibold text-gray-700 font-poppins">
                            Documento de Identidad
                        </label>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-gray-900 font-poppins">
                        {person.document_type}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">
                        {person.document_number}
                    </p>
                </div>

                {/* Edad con indicador visual */}
                <div className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center mb-2">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <FaCalendarDay className="w-4 h-4 text-primary-blue text-lg" />
                        </div>
                        <label className="text-sm font-semibold text-gray-700 font-poppins">
                            Edad
                        </label>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 font-poppins">
                        {calculateAge(person.birthdate)} años
                    </p>
                    <p className="text-xs text-gray-500">
                        {new Date(person.birthdate).toLocaleDateString('es-CO')}
                    </p>
                </div>

                {/* Email */}
                {person.email && (
                    <div className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center mb-2">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                                <IoIosMail className="text-primary-blue text-lg" />
                            </div>
                            <label className="text-sm font-semibold text-gray-700 font-poppins">
                                Correo Electrónico
                            </label>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-gray-900 font-poppins break-all">
                            {person.email}
                        </p>
                        {showActions && (
                            <button
                                type="button"
                                onClick={handleEmailClick}
                                className="text-xs text-primary-blue hover:text-primary-blue-hover font-medium mt-1 transition-colors"
                            >
                                Enviar correo →
                            </button>
                        )}
                    </div>
                )}

                {/* Teléfono */}
                {person.phone && (
                    <div className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center mb-2">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                                <FaPhone className="w-4 h-4 text-primary-blue" />
                            </div>
                            <label className="text-sm font-semibold text-gray-700 font-poppins">
                                Teléfono
                            </label>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-gray-900 font-poppins">
                            {person.phone}
                        </p>
                        {showActions && (
                            <button
                                type="button"
                                onClick={handlePhoneClick}
                                className="text-xs text-primary-blue hover:text-primary-blue-hover font-medium mt-1 transition-colors"
                            >
                                Llamar →
                            </button>
                        )}
                    </div>
                )}

                {/* Ocupación */}
                {occupation && (
                    <div className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center mb-2">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                                <MdWork className="w-4 h-4 text-primary-blue text-lg" />
                            </div>
                            <label className="text-sm font-semibold text-gray-700 font-poppins">
                                Ocupación
                            </label>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-gray-900 font-poppins">
                            {occupation}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer informativo */}
            <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        Información sincronizada
                    </span>
                    <span>
                        ID: #{id}
                    </span>
                </div>
            </div>
        </article>
    );
};

export default PatientInfoCard;