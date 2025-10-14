import React from 'react';
import { clsx } from 'clsx';
import Button from './Button';

/**
 * LegalConfirmationModal Component
 * 
 * Modal dialog for confirming digital signature and legal responsibility
 * when submitting clinical history forms.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onConfirm - Callback when user confirms
 * @param {Function} props.onCancel - Callback when user cancels
 * @param {string} props.doctorName - Name of the responsible doctor
 * @param {string} props.doctorLicense - Doctor's license/document number
 * @returns {JSX.Element|null} The modal component or null if closed
 */
const LegalConfirmationModal = ({
    isOpen,
    onConfirm,
    onCancel,
    doctorName,
    doctorLicense
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
        >
            <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-xl font-poppins">
                {/* Modal Header */}
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 bg-red-100 rounded-full p-3 mr-3">
                        <svg
                            className="w-6 h-6 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path 
                                fillRule="evenodd" 
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                                clipRule="evenodd" 
                            />
                        </svg>
                    </div>
                    <div>
                        <h3
                            id="modal-title"
                            className="text-lg font-bold text-gray-900 font-poppins"
                        >
                            Confirmación de Firma Digital
                        </h3>
                    </div>
                </div>

                {/* Modal Content */}
                <div id="modal-description" className="mb-6">
                    {/* Doctor Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-blue-900 font-poppins mb-2">
                            Profesional Responsable:
                        </h4>
                        <p className="text-blue-800 font-poppins">
                            <strong>Dr. {doctorName}</strong>
                            {doctorLicense && (
                                <span className="block text-sm text-blue-700">
                                    Documento: {doctorLicense}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Legal Responsibility Notice */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 font-poppins mb-2">
                            ⚖️ Responsabilidad Legal
                        </h4>
                        <p className="text-sm text-red-700 font-poppins leading-relaxed mb-3">
                            Al confirmar su firma digital, usted declara bajo juramento que:
                        </p>
                        <ul className="text-xs text-red-700 font-poppins space-y-1 mb-3">
                            <li>• Asume la responsabilidad profesional y legal del contenido</li>
                            <li>• La información registrada es veraz y completa</li>
                            <li>• Ha examinado personalmente al paciente</li>
                            <li>• Cumple con las normativas médicas vigentes</li>
                        </ul>
                        <p className="text-xs text-red-800 font-semibold font-poppins">
                            Esta firma tiene validez legal equivalente a su firma manuscrita.
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-6">
                    <Button
                        onClick={onCancel}
                        className="bg-header-blue hover:bg-header-blue-hover text-white px-6 py-2 rounded-[40px] font-bold text-18"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="bg-primary-blue hover:bg-primary-blue-hover text-white px-6 py-2 rounded-[40px] font-bold text-18"
                    >
                        Confirmar Firma
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LegalConfirmationModal;