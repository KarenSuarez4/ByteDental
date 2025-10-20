import React from 'react';
import ReactDOM from 'react-dom';

/**
 * UserProfileModal Component
 * 
 * Modal to display user personal information in read-only mode.
 * Shows details like name, email, phone, document, role, and specialty.
 * Follows the same design structure as EditUserModal from UserManagement.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.userData - User data from /api/users/me endpoint
 * @returns {JSX.Element|null} Modal component or null if closed
 */
const UserProfileModal = ({ isOpen, onClose, userData }) => {
    console.log('🎭 UserProfileModal rendered:', { isOpen, hasUserData: !!userData, userData });
    
    if (!isOpen || !userData) {
        console.log('❌ Modal not showing - isOpen:', isOpen, 'userData:', !!userData);
        return null;
    }

    console.log('✅ Modal should be visible now');

    const documentTypes = {
        'CC': 'Cédula de Ciudadanía',
        'TI': 'Tarjeta de Identidad',
        'CE': 'Cédula de Extranjería',
        'PP': 'Pasaporte'
    };

    const modalContent = (
        <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
        >
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto">
                {/* Header del modal */}
                <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-28 h-28 bg-white opacity-10 rounded-full -ml-14 -mb-14"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full">
                                👤
                            </div>
                            <div>
                                <h2 className="text-26 font-bold font-poppins">Mi Información Personal</h2>
                                <p className="text-16 opacity-90 font-poppins">Detalles de tu cuenta en ByteDental</p>
                            </div>
                        </div>
                        <button
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200"
                            onClick={onClose}
                        >
                            ✖️
                        </button>
                    </div>
                </div>

                {/* Contenido del modal */}
                <div className="p-6">
                    <div className="space-y-6">
                        {/* Información del usuario en grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Nombre */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Nombre
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {userData.first_name}
                                </div>
                            </div>

                            {/* Apellido */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Apellido
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {userData.last_name}
                                </div>
                            </div>

                            {/* Tipo de documento */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Tipo de documento
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {documentTypes[userData.document_type] || userData.document_type}
                                </div>
                            </div>

                            {/* Número de documento */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Número de documento
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {userData.document_number}
                                </div>
                            </div>

                            {/* Correo electrónico */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Correo electrónico
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800 break-all">
                                    {userData.email}
                                </div>
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {userData.phone || 'No registrado'}
                                </div>
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="block font-poppins font-medium text-gray-700 mb-2">
                                    Rol
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                    {userData.role_name || 'No asignado'}
                                </div>
                            </div>

                            {/* Especialidad (solo si existe) */}
                            {userData.specialty && (
                                <div>
                                    <label className="block font-poppins font-medium text-gray-700 mb-2">
                                        Especialidad
                                    </label>
                                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[10px] font-poppins text-16 text-gray-800">
                                        {userData.specialty}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Estado de la cuenta */}
                        <div className={`p-4 rounded-lg border-l-4 ${userData.is_active ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${userData.is_active ? 'bg-green-500' : 'bg-red-500'} animate-pulse mr-3`}></div>
                                <p className="font-poppins text-16">
                                    Estado de la cuenta: <span className={`font-semibold ${userData.is_active ? 'text-green-700' : 'text-red-700'}`}>
                                        {userData.is_active ? 'Activa' : 'Inactiva'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Advertencia de cambio de contraseña (si aplica) */}
                        {userData.must_change_password && (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-yellow-800 font-poppins text-16">
                                        Debes cambiar tu contraseña temporal en el próximo inicio de sesión.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Render modal using React Portal to ensure it's on top of everything
    return ReactDOM.createPortal(modalContent, document.body);
};

export default UserProfileModal;
