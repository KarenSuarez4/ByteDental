import React from 'react';
import { FaClipboardList, FaSearch, FaEye } from 'react-icons/fa';

const ConsultationReason = ({
    reason,
    symptoms,
    findings,
    className = "",
    showFindings = true
}) => {
    return (
        <section className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 min-h-[300px] lg:min-h-[200px] ${className}`}>
            <h2 className="text-xl font-semibold text-primary-blue-hover mb-4 flex items-center border-b border-gray-100 pb-2 font-poppins">
                Información de Consulta
            </h2>

            {/* Contenedor con scroll interno para manejar overflow */}
            <div className="space-y-4 h-full overflow-y-auto">
                {/* Motivo de consulta */}
                <div className="space-y-2">
                    <h3 className="font-medium text-primary-blue text-sm tracking-wider flex items-center font-poppins">
                        <FaClipboardList className="mr-2 text-primary-blue text-sm" />
                        Motivo de Consulta
                    </h3>
                    <div className="text-gray-700 text-sm p-3 rounded-lg border-l-4 border-primary-blue shadow-sm font-poppins transition-all duration-300 hover:shadow-md"
                        style={{ backgroundColor: 'rgba(72, 164, 214, 0.1)' }}>
                        <p className="min-h-[20px] whitespace-pre-line">
                            {reason || (
                                <span className="text-gray-400 italic">No especificado</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Síntomas */}
                <div className="space-y-2">
                    <h3 className="font-medium text-primary-blue text-sm tracking-wider flex items-center font-poppins">
                        <FaSearch className="mr-2 text-primary-blue-hover text-sm" />
                        Síntomas Presentados
                    </h3>
                    <div className="text-gray-700 text-sm p-3 rounded-lg border-l-4 border-primary-blue-hover shadow-sm font-poppins transition-all duration-300 hover:shadow-md"
                        style={{ backgroundColor: 'rgba(58, 139, 184, 0.1)' }}>
                        <p className="min-h-[20px] whitespace-pre-line">
                            {symptoms || (
                                <span className="text-gray-400 italic">No especificados</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Hallazgos clínicos */}
                {showFindings && (
                    <div className="space-y-2">
                        <h3 className="font-medium text-primary-blue text-sm tracking-wider flex items-center font-poppins">
                            <FaEye className="mr-2 text-primary-blue text-sm" />
                            Hallazgos Clínicos
                        </h3>
                        <div className={`p-3 rounded-lg border-l-4 shadow-sm text-sm font-poppins transition-all duration-300 hover:shadow-md ${findings
                            ? 'text-gray-700 border-primary-blue'
                            : 'text-gray-400 bg-gray-50 border-gray-300'
                            }`}
                            style={findings ? { backgroundColor: 'rgba(28, 98, 140, 0.1)' } : {}}>
                            <p className="min-h-[20px] whitespace-pre-line">
                                {findings || (
                                    <span className="italic">No se han registrado hallazgos específicos</span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ConsultationReason;