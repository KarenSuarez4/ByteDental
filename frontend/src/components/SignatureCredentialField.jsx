import React, { useState } from 'react';
import FormField from './FormField';
import Input from './Input';
import AlertMessage from './AlertMessage';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { LuSignature, LuEye, LuEyeOff, LuShield } from 'react-icons/lu';
import { FaUserMd, FaLock } from 'react-icons/fa';

const SignatureCredentialField = ({
    value,
    onChange,
    error,
    doctorName,
    doctorLicense = null,
    disabled = false
}) => {
    const [showSignature, setShowSignature] = useState(false);

    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        if (inputValue.length > 12) return;
        onChange(e);
    };

    return (
        <article
            className="bg-gradient-to-br from-primary-blue/10 via-white to-header-blue/5 rounded-[16px] sm:rounded-[20px] p-5 sm:p-7 border border-primary-blue/20 shadow-lg hover:shadow-xl transition-all duration-300"
            role="region"
            aria-labelledby="signature-section-title"
            aria-describedby="signature-section-description"
        >
            {/* Header */}
            <header className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                    <div
                        className="bg-gradient-to-r from-primary-blue to-primary-blue-hover p-3 rounded-full mr-4 shadow-md"
                        aria-hidden="true"
                    >
                        <LuSignature className="text-xl sm:text-2xl text-white" />
                    </div>
                    <div>
                        <h3
                            id="signature-section-title"
                            className="text-xl sm:text-24 font-bold text-gray-800 font-poppins mb-1"
                        >
                            Firma Digital Profesional
                        </h3>
                        <p
                            id="signature-section-description"
                            className="text-sm text-gray-600 font-medium font-poppins"
                        >
                            Validación y responsabilidad médica
                        </p>
                    </div>
                </div>

                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">
                    <span className="flex items-center font-poppins">
                        <LuShield className="w-3 h-3 mr-1" aria-hidden="true" />
                        <span>Seguro</span>
                    </span>
                </div>
            </header>

            {/* Información del doctor */}
            <section
                className="bg-white rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 mb-6 shadow-md border-l-4 border-primary-blue relative overflow-hidden"
                aria-labelledby="doctor-info-title"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-blue via-primary-blue-hover to-header-blue"></div>

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                        <div className="bg-gradient-to-br from-primary-blue/20 to-header-blue/20 p-3 rounded-xl mr-3 border border-primary-blue/30">
                            <FaUserMd className="text-xl text-primary-blue" aria-hidden="true" />
                        </div>
                        <div>
                            <span
                                id="doctor-info-title"
                                className="text-sm font-semibold text-gray-600 uppercase tracking-wide font-poppins block"
                            >
                                Profesional Responsable
                            </span>
                            <p className="font-bold text-gray-900 text-xl font-poppins">
                                Dr. {doctorName}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div
                            className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200 font-poppins"
                            role="status"
                            aria-label="Doctor verificado"
                        >
                            <span aria-hidden="true">✓</span> Verificado
                        </div>
                    </div>
                </div>

                {doctorLicense && (
                    <div className="flex items-center mt-3 pt-3 border-t border-gray-200">
                        <FaLock className="w-4 h-4 text-gray-500 mr-2" aria-hidden="true" />
                        <span className="text-sm text-gray-600 font-poppins">
                            <span className="font-semibold">Documento de identidad:</span>
                            <span className="ml-1 font-medium">{doctorLicense}</span>
                        </span>
                    </div>
                )}
            </section>

            {/* Instrucciones */}
            <AlertMessage
                type="info"
                message="Ingrese su código de firma profesional personal. Este código debe ser único, seguro y asociado únicamente a su práctica profesional."
                className="mb-4"
            />

            {/* Campo de firma */}
            <FormField
                label="Código de Firma Digital Profesional"
                required
                error={error}
                className="mb-4 w-full"
            >
                <div className="relative">
                    <Input
                        type={showSignature ? "text" : "password"}
                        name="doctor_signature"
                        id="doctor_signature"
                        value={value}
                        onChange={handleInputChange}
                        placeholder="Ingrese su código de firma"
                        error={!!error}
                        disabled={disabled}
                        autoComplete="new-password"
                        className="w-full pr-12 font-poppins focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                        minLength={4}
                        maxLength={12}
                        aria-describedby="signature-help signature-requirements"
                        aria-required="true"
                        aria-invalid={!!error}
                    />
                    <button
                        type="button"
                        onClick={() => setShowSignature(!showSignature)}
                        disabled={disabled}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-primary-blue disabled:hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1 rounded p-1 transition-colors duration-200"
                        aria-label={showSignature ? "Ocultar código de firma" : "Mostrar código de firma"}
                        tabIndex={disabled ? -1 : 0}
                    >
                        {showSignature ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                    </button>
                </div>

                <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-500 font-poppins">
                        <p id="signature-help">
                            Código de 4-12 caracteres
                        </p>
                        <p id="signature-requirements" className="text-xs mt-1">
                            Incluya letras, números y símbolos para mayor seguridad
                        </p>
                    </div>
                    <span
                        className={`text-xs font-medium font-poppins transition-colors duration-200 ${value.length >= 4 ? 'text-green-600' : 'text-gray-400'
                            }`}
                        aria-label={`${value.length} de 12 caracteres ingresados`}
                    >
                        {value.length}/12
                    </span>
                </div>

                <PasswordStrengthMeter
                    value={value}
                    label="Seguridad del código:"
                    className="mt-4 w-full"
                />
            </FormField>

            {/* Estado de la firma */}
            {value && value.length >= 4 && (
                <AlertMessage
                    type="success"
                    message="Código de firma ingresado. La responsabilidad legal se confirmará al guardar la historia clínica."
                    className="mt-4"
                />
            )}

            {/* Mensaje de error */}
            {error && (
                <AlertMessage
                    type="error"
                    message={error}
                    className="mt-4"
                />
            )}
        </article>
    );
};

export default SignatureCredentialField;