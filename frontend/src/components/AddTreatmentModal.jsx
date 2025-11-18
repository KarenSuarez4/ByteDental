import { useState, useEffect, useMemo, useContext } from 'react';
import { FaTimes, FaSave, FaCalendarAlt, FaNotesMedical, FaStethoscope } from 'react-icons/fa';
import Button from './Button';
import Select from './Select';
import DateInput from './DateInput';
import SignatureCredentialField from './SignatureCredentialField';
import { useAuth } from '../contexts/AuthContext';

/**
 * AddTreatmentModal Component
 * 
 * Modal to add a new treatment to an existing clinical history.
 * Follows the RegisterPatientFirstHistory design with form validation.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSubmit - Function to handle form submission
 * @param {Array} props.dentalServices - List of available dental services
 * @param {boolean} props.loading - Loading state during submission
 * @param {boolean} props.allowPerTreatmentPassword - Allow password per treatment
 * @param {string} props.globalDoctorPassword - Global doctor password
 * @returns {JSX.Element} Modal to add treatment
 */
const AddTreatmentModal = ({
    isOpen,
    onClose,
    onSubmit,
    dentalServices = [],
    loading = false,
    allowPerTreatmentPassword = false, // <-- nuevo prop opcional
    globalDoctorPassword = "" // <-- nuevo prop opcional (contraseña global desde el formulario)
}) => {
    // obtener usuario y token con el hook que ya usa el proyecto
    const auth = useAuth() || {};
    const currentUser = auth.currentUser || auth.user || {};
    const token = auth.token || auth?.accessToken || null;

    // info del doctor proveniente del backend (igual que en la creación de historia)
    const [doctorBackendInfo, setDoctorBackendInfo] = useState(null);

    useEffect(() => {
        if (!token) return;

        // Solicitar /api/users/me (mismo endpoint que usan otras páginas)
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!res.ok) {
                    // no interrumpir si falla; fallback a currentUser
                    console.warn('No se pudo cargar users/me:', res.status);
                    return;
                }
                const data = await res.json();
                setDoctorBackendInfo(data);
            } catch (err) {
                console.warn('Error cargando información del doctor:', err);
            }
        })();
    }, [token]);

    // construir nombre y licencia preferiendo la info del backend (igual que en RegisterPatientFirstHistory)
    const doctorDisplayName = doctorBackendInfo
        ? `${doctorBackendInfo.first_name || ''} ${doctorBackendInfo.last_name || ''}`.trim()
        : `${currentUser?.first_name || currentUser?.firstName || ''} ${currentUser?.last_name || currentUser?.lastName || ''}`.trim();

    const doctorLicense = doctorBackendInfo?.document_number || currentUser?.document_number || currentUser?.documentNumber || '';

    // Calculate minimum and maximum dates only once
    const dateConstraints = useMemo(() => {
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return {
            today: today.toISOString().split('T')[0],
            oneYearAgo: oneYearAgo.toISOString().split('T')[0],
            todayDate: today,
            oneYearAgoDate: oneYearAgo
        };
    }, []);

    const [formData, setFormData] = useState({
        dental_service_id: '',
        treatment_date: '',
        reason: '', // Nuevo campo
        notes: '',
        doctor_password: '' // <-- agregar campo de contraseña por tratamiento (opcional)
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                dental_service_id: '',
                treatment_date: dateConstraints.today, // ✅ Current date by default
                reason: '', // Nuevo campo
                notes: '',
                doctor_password: '' // <-- reset
            });
            setErrors({});
            setTouched({});
        }
    }, [isOpen, dateConstraints.today]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, loading, onClose]);

    /**
     * Validate a specific field
     */
    const validateField = (name, value) => {
        switch (name) {
            case 'dental_service_id':
                if (!value) return 'Debe seleccionar un servicio dental';
                break;
            case 'treatment_date':
                if (!value) return 'La fecha del tratamiento es requerida';

                const selectedDate = new Date(value);
                const today = new Date(dateConstraints.today);
                today.setHours(23, 59, 59, 999);

                // Validate that the date is not in the future
                if (selectedDate > today) {
                    return 'La fecha no puede ser futura';
                }

                // Validate that the date is not more than one year in the past
                const oneYearAgo = new Date(dateConstraints.oneYearAgo);
                oneYearAgo.setHours(0, 0, 0, 0);

                if (selectedDate < oneYearAgo) {
                    return 'La fecha no puede ser mayor a un año en el pasado';
                }
                break;
            case 'reason':
                if (!value || value.trim() === '') return 'El motivo de la consulta es obligatorio';
                break;
            case 'doctor_password':
                // validar solo si se requiere ingreso por tratamiento
                if (allowPerTreatmentPassword && (!value || value.trim() === '')) {
                    return 'La contraseña del doctor es requerida';
                }
                break;
            default:
                break;
        }
        return '';
    };

    /**
     * Validate the entire form
     */
    const validateForm = () => {
        const newErrors = {};

        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form field changes
     */
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Mark the field as touched when it changes
        setTouched(prev => ({
            ...prev,
            [name]: true
        }));

        // Validate the field
        const error = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    /**
     * Handle field blur
     */
    const handleBlur = (e) => {
        const { name, value } = e.target;

        setTouched(prev => ({
            ...prev,
            [name]: true
        }));

        const error = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    /**
     * Handle form submission
     */
    const handleSubmit = (e) => {
        e.preventDefault();

        // Mark all fields as touched
        setTouched({
            dental_service_id: true,
            treatment_date: true,
            reason: true,
            notes: true,
            doctor_password: allowPerTreatmentPassword ? true : false
        });

        if (validateForm()) {
            // Format data to send — uso de radix explícito y logic de doctor_password
            const treatmentData = {
                dental_service_id: parseInt(formData.dental_service_id, 10),
                treatment_date: new Date(formData.treatment_date).toISOString(),
                reason: formData.reason.trim(),
                notes: formData.notes.trim() || null,
                // enviar doctor_password solo si existe: preferir lo ingresado en modal, si no usar globalDoctorPassword
                ...(formData.doctor_password && formData.doctor_password.trim()
                    ? { doctor_password: formData.doctor_password.trim() }
                    : (globalDoctorPassword && globalDoctorPassword.trim() ? { doctor_password: globalDoctorPassword.trim() } : {}))
            };

            onSubmit(treatmentData);
        }
    };

    // Don't render if modal is closed
    if (!isOpen) return null;

    // Calculate character count status for notes
    const notesLength = formData.notes.length;
    const maxNotesLength = 500;
    const notesPercentage = (notesLength / maxNotesLength) * 100;
    const notesCountColor = notesPercentage > 90 ? 'text-red-500' : notesPercentage > 75 ? 'text-orange-500' : 'text-gray-500';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-opacity-100 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all duration-300 scale-100 animate-slideUp"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white px-6 py-5 rounded-t-2xl flex justify-between items-center shadow-lg">
                        <h2 id="modal-title" className="text-2xl font-bold font-poppins flex items-center">
                            <FaNotesMedical className="mr-3 text-3xl" />
                            Agregar Tratamiento
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
                            disabled={loading}
                            aria-label="Cerrar modal"
                        >
                            <FaTimes size={24} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Fecha del Tratamiento */}
                        <div className="group">
                            <label
                                htmlFor="treatment_date"
                                className="flex items-center text-sm font-semibold text-gray-700 mb-2"
                            >
                                <FaCalendarAlt className="mr-2 text-primary-blue" />
                                Fecha del Tratamiento <span className="text-red-500 ml-1">*</span>
                            </label>

                            <DateInput
                                name="treatment_date"
                                value={formData.treatment_date}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                minDate={dateConstraints.oneYearAgoDate}
                                maxDate={dateConstraints.todayDate}
                                className="w-full"
                                error={!!errors.treatment_date}
                            />
                            {errors.treatment_date && (
                                <p className="text-red-500 text-sm font-poppins mt-1">{errors.treatment_date}</p>
                            )}
                        </div>

                        {/* Motivo de la consulta */}
                        <div className="group">
                            <label
                                htmlFor="reason"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                                Motivo de la consulta <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                id="reason"
                                name="reason"
                                type="text"
                                value={formData.reason}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Ingrese el motivo de la consulta"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue transition-all duration-200"
                                disabled={loading}
                                required
                            />
                            {errors.reason && touched.reason && (
                                <p className="text-red-500 text-sm mt-2 flex items-center animate-fadeIn">
                                    {errors.reason}
                                </p>
                            )}
                        </div>
                        {/* Servicio Dental */}
                        <div className="group">
                            <label
                                htmlFor="dental_service_id"
                                className="flex items-center text-sm font-semibold text-gray-700 mb-2"
                            >
                                <FaStethoscope className="mr-2 text-primary-blue" />
                                Servicio Dental <span className="text-red-500 ml-1">*</span>
                            </label>
                            <Select
                                id="dental_service_id"
                                name="dental_service_id"
                                value={formData.dental_service_id}
                                onChange={handleChange}
                                error={!!(errors.dental_service_id && touched.dental_service_id)}
                                placeholder="Seleccione un servicio dental"
                                disabled={loading}
                            >
                                <option value="">Seleccione un servicio dental</option>
                                {dentalServices.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - ${(service.cost || service.value)?.toLocaleString('es-CO')}
                                    </option>
                                ))}
                            </Select>
                            {errors.dental_service_id && touched.dental_service_id && (
                                <p className="text-red-500 text-sm mt-2 flex items-center animate-fadeIn">
                                    <span className="mr-1">⚠️</span>
                                    {errors.dental_service_id}
                                </p>
                            )}
                        </div>

                        {/* Notas/Observaciones */}
                        <div className="group">
                            <label
                                htmlFor="notes"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                                Observaciones <span className="text-gray-400 font-normal">(Opcional)</span>
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                maxLength={maxNotesLength}
                                rows={4}
                                placeholder="Ingrese observaciones adicionales sobre el tratamiento..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue transition-all duration-200 resize-none hover:border-gray-400"
                                disabled={loading}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <p className={`text-sm font-medium transition-colors ${notesCountColor}`}>
                                    {notesLength}/{maxNotesLength} caracteres
                                </p>
                                {notesPercentage > 75 && (
                                    <p className="text-xs text-orange-500 animate-fadeIn">
                                        {notesPercentage > 90 ? '¡Casi al límite!' : 'Acercándose al límite'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Firma Digital Profesional (misma UI usada en creación de historia) */}
                        <div className="group">
                            <SignatureCredentialField
                                value={formData.doctor_password}
                                onChange={(e) => {
                                    const val = (e.target?.value || '').slice(0, 12);
                                    setFormData(prev => ({ ...prev, doctor_password: val }));
                                    setTouched(prev => ({ ...prev, doctor_password: true }));
                                    setErrors(prev => ({ ...prev, doctor_password: validateField('doctor_password', val) }));
                                }}
                                error={errors.doctor_password}
                                doctorName={doctorDisplayName}
                                doctorLicense={doctorLicense}
                                disabled={loading}
                            />
                        </div>

                        {/* Footer - Botones */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="secondary"
                                disabled={loading}
                                className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="mr-2" />
                                        Guardar Tratamiento
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddTreatmentModal;
