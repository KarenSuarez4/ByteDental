import React from 'react';
import {
    FaIdCard,
    FaHashtag,
    FaTint,
    FaWheelchair,
    FaPhone,
    FaEnvelope,
    FaUser,
    FaBriefcase,
    FaShieldAlt,
    FaHeart,
    FaCheckCircle,
    FaTimesCircle,
    FaCalendarAlt
} from 'react-icons/fa';
import { shouldShowGuardianInfo, calculateAge } from '../utils/patientUtils';

/**
 * PatientProfileCard Component
 * 
 * A comprehensive patient information card that displays:
 * - Basic patient information (name, document, age, etc.)
 * - Contact information
 * - Disability status and description
 * - Guardian/Legal tutor information (when applicable)
 * - Patient status (active/inactive)
 * 
 * @param {Object} props - Component props
 * @param {Object} props.patient - Patient data object
 * @returns {JSX.Element} Patient profile card component
 */
const PatientProfileCard = ({ patient }) => {
    // Component color constants using custom palette
    const COLORS = {
        primary: 'text-primary-blue',
        primaryHover: 'text-primary-blue-hover',
        header: 'text-header-blue',
        headerBg: 'bg-header-blue',
        primaryBg: 'bg-primary-blue',
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-orange-600',
        purple: 'text-indigo-600',
        purpleBg: 'bg-blue-50',
        lightBlueBg: 'bg-blue-50'
    };

    /**
     * Format date string to Colombian locale
     * @param {string} dateString - Date string in ISO format
     * @returns {string} Formatted date string
     */
    const formatDate = (dateString) => {
        if (!dateString) return 'No especificada';

        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/\./g, '');
    };

    /**
     * Get readable text for guardian relationship type
     * @param {string} relationshipType - Guardian relationship enum value
     * @returns {string} Human-readable relationship text in Spanish
     */
    const getRelationshipText = (relationshipType) => {
        const relationships = {
            "Father": "Padre",
            "Mother": "Madre",
            "Grandfather": "Abuelo",
            "Grandmother": "Abuela",
            "Son": "Hijo",
            "Daughter": "Hija",
            "Legal_Guardian": "Tutor Legal",
            "Brother": "Hermano",
            "Sister": "Hermana",
            "Other": "Otro"
        };
        return relationships[relationshipType] || relationshipType;
    };

    /**
     * Status Badge Component
     * @param {Object} props - Component props
     * @param {boolean} props.isActive - Patient active status
     * @returns {JSX.Element} Status badge with icon and text
     */
    const StatusBadge = ({ isActive }) => (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${isActive
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
            {isActive ? (
                <>
                    <FaCheckCircle className="mr-1 text-xs" />
                    Activo
                </>
            ) : (
                <>
                    <FaTimesCircle className="mr-1 text-xs" />
                    Inactivo
                </>
            )}
        </div>
    );

    /**
     * Detail Item Component
     * Reusable component for displaying labeled information with icon
     * @param {Object} props - Component props
     * @param {React.Component} props.icon - React icon component
     * @param {string} props.label - Field label
     * @param {string} props.value - Field value
     * @param {string} props.valueColor - CSS class for value text color
     * @returns {JSX.Element} Detail item with icon, label and value
     */
    const DetailItem = ({
        icon: Icon,
        label,
        value,
        valueColor = "text-gray-800"
    }) => (
        <div className="flex items-start text-sm mb-3 sm:mb-4">
            <Icon
                className={`text-lg sm:text-xl ${COLORS.primary} mr-2 w-5 flex-shrink-0 mt-0.5`}
                aria-hidden="true"
            />
            <div className="flex-grow min-w-0">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`text-sm font-medium ${valueColor} break-words leading-relaxed`}>
                    {value}
                </p>
            </div>
        </div>
    );

    /**
     * Guardian Reason Badge Component
     * Shows why the patient needs a guardian
     * @param {number} age - Patient's age
     * @param {boolean} hasDisability - Whether patient has disability
     * @returns {JSX.Element} Reason badge
     */
    const GuardianReasonBadge = ({ age, hasDisability }) => {
        const reason = age < 18 ? 'Menor de edad'
            : age > 64 ? 'Adulto mayor'
                : hasDisability ? 'Discapacidad'
                    : '';

        const bgColor = age < 18 ? 'bg-blue-100 text-blue-700'
            : age > 64 ? 'bg-orange-100 text-orange-700'
                : hasDisability ? 'bg-blue-100 text-blue-700'
                    : '';
        return (
            <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${bgColor} border border-opacity-20`}>
                {reason}
            </span>
        );
    };

    // Early return if no patient data
    if (!patient) {
        return (
            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 font-poppins">
                <div className="text-center text-gray-500">
                    <FaUser className="text-4xl text-gray-300 mx-auto mb-4" />
                    <p className="text-sm">Información del paciente no disponible</p>
                </div>
            </div>
        );
    }

    // Build patient full name with fallbacks
    const fullName = [
        patient.person?.first_name || patient.first_name,
        patient.person?.middle_name,
        patient.person?.first_surname || patient.first_surname,
        patient.person?.second_surname
    ].filter(Boolean).join(' ').trim() || 'N/A';

    // Build guardian full name if exists
    const guardianFullName = patient.guardian ? [
        patient.guardian.person?.first_name,
        patient.guardian.person?.middle_name,
        patient.guardian.person?.first_surname,
        patient.guardian.person?.second_surname
    ].filter(Boolean).join(' ').trim() : null;

    // Calculate patient age
    const patientAge = calculateAge(patient.person?.birthdate || patient.birthdate);

    // Debug logging for development
    React.useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            if (patient?.has_disability && !patient?.guardian) {
                console.log('⚠️ Patient has disability but no guardian data');
            }
        }
    }, [patient]);

    return (
        <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden font-poppins transition-transform duration-300 hover:shadow-2xl">
            {/* Header Section: Avatar, name and status */}
            <div className={`pt-6 pb-4 px-4 sm:px-6 ${COLORS.lightBlueBg} rounded-t-xl text-center relative overflow-hidden`}>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full -ml-8 -mb-8"></div>

                <div className="relative z-10">
                    {/* Avatar circle */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-lg">
                        <FaUser className={`${COLORS.primary} text-3xl sm:text-4xl`} aria-hidden="true" />
                    </div>

                    {/* Patient full name */}
                    <h2 className="text-gray-800 text-lg sm:text-xl font-semibold leading-tight mb-3 px-2">
                        {fullName}
                    </h2>

                    {/* Patient status */}
                    <div className="mb-3">
                        <StatusBadge isActive={patient.is_active} />
                    </div>

                    {/* Patient age */}
                    <p className="text-gray-600 text-sm font-medium">
                        {patientAge ? `${patientAge} años` : 'Edad no disponible'}
                    </p>
                </div>
            </div>

            {/* Main Information Section */}
            <div className="p-4 sm:p-6">
                {/* Basic Information */}
                <div className="space-y-1">
                    <DetailItem
                        icon={FaIdCard}
                        label="Tipo de Documento"
                        value={patient.person?.document_type || patient.document_type || 'N/A'}
                    />

                    <DetailItem
                        icon={FaHashtag}
                        label="Número de Documento"
                        value={patient.person?.document_number || patient.document_number || 'N/A'}
                    />

                    <DetailItem
                        icon={FaCalendarAlt}
                        label="Fecha de Nacimiento"
                        value={formatDate(patient.person?.birthdate || patient.birthdate)}
                    />

                    {/* Occupation (if available) */}
                    {patient.occupation && (
                        <DetailItem
                            icon={FaBriefcase}
                            label="Ocupación"
                            value={patient.occupation}
                        />
                    )}

                    {/* Blood group (if available) */}
                    {patient.blood_group && (
                        <DetailItem
                            icon={FaTint}
                            label="Grupo Sanguíneo"
                            value={patient.blood_group}
                        />
                    )}

                    {/* Disability status */}
                    <DetailItem
                        icon={FaWheelchair}
                        label="¿Tiene discapacidad?"
                        value={patient.has_disability !== undefined
                            ? (patient.has_disability ? 'Sí' : 'No')
                            : 'No especificado'}
                        valueColor={patient.has_disability ? COLORS.error : COLORS.success}
                    />

                    {/* Disability description (if exists) */}
                    {patient.has_disability && patient.disability_description && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                            <p className="text-xs text-gray-500 font-medium mb-1">
                                Descripción de la discapacidad
                            </p>
                            <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                {patient.disability_description}
                            </p>
                        </div>
                    )}

                    {/* Contact Information */}
                    {(patient.person?.phone || patient.phone) && (
                        <DetailItem
                            icon={FaPhone}
                            label="Teléfono"
                            value={patient.person?.phone || patient.phone}
                        />
                    )}

                    {(patient.person?.email || patient.email) && (
                        <DetailItem
                            icon={FaEnvelope}
                            label="Correo Electrónico"
                            value={patient.person?.email || patient.email}
                        />
                    )}
                </div>
            </div>

            {/* Guardian/Legal Tutor Section */}
            {shouldShowGuardianInfo(patient) && (
                <div className="border-t border-gray-200">
                    {/* Guardian header */}
                    <div className={`${COLORS.purpleBg} px-4 sm:px-6 py-3`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <FaShieldAlt className={`text-primary-blue-hover mr-2 text-lg`} /> {/* ✅ Usar clase directa */}
                                <h3 className="text-sm font-semibold text-primary-blue-hover"> {/* ✅ Usar clase directa */}
                                    Tutor Legal
                                </h3>
                            </div>
                            <GuardianReasonBadge
                                age={patientAge}
                                hasDisability={patient.has_disability}
                            />
                        </div>
                    </div>

                    {/* Guardian information */}
                    <div className="p-4 sm:p-6 space-y-1">
                        <DetailItem
                            icon={FaUser}
                            label="Nombre Completo"
                            value={guardianFullName || 'No especificado'}
                        />

                        <DetailItem
                            icon={FaIdCard}
                            label="Documento"
                            value={`${patient.guardian.person?.document_type || 'N/A'} - ${patient.guardian.person?.document_number || 'N/A'}`}
                        />

                        {/* Guardian relationship */}
                        <div className="flex items-start text-sm mb-3 sm:mb-4">
                            <FaHeart className={`text-lg sm:text-xl ${COLORS.primary} mr-2 w-5 flex-shrink-0 mt-0.5`} />
                            <div className="flex-grow min-w-0">
                                <p className="text-xs text-gray-500 font-medium">Relación</p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"> {/* ✅ Cambiado de purple a indigo */}
                                    {getRelationshipText(patient.guardian.relationship_type)}
                                </span>
                            </div>
                        </div>

                        {/* Guardian age */}
                        <DetailItem
                            icon={FaCalendarAlt}
                            label="Edad"
                            value={`${calculateAge(patient.guardian.person?.birthdate) || 'N/A'} años`}
                        />

                        {/* Guardian contact information */}
                        {patient.guardian.person?.phone && (
                            <DetailItem
                                icon={FaPhone}
                                label="Teléfono del Tutor"
                                value={patient.guardian.person.phone}
                            />
                        )}

                        {patient.guardian.person?.email && (
                            <DetailItem
                                icon={FaEnvelope}
                                label="Correo del Tutor"
                                value={patient.guardian.person.email}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Footer: Registration date */}
            <div className="pt-3 pb-4 px-4 sm:px-6 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center font-medium">
                    Registrado {formatDate(patient.created_at)}
                </p>
                {patient.updated_at && patient.updated_at !== patient.created_at && (
                    <p className="text-xs text-gray-400 text-center mt-1">
                        Actualizado {formatDate(patient.updated_at)}
                    </p>
                )}
            </div>
        </div>
    );
};

export default PatientProfileCard;