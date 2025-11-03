import React from 'react';

const TreatmentsTable = ({ treatments }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
        });
    };

    const formatTreatmentNumber = (index) => {
        return String(index + 1).padStart(2, '0');
    };

    // Verificar si treatments existe y es un array
    if (!treatments || !Array.isArray(treatments) || treatments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="font-poppins text-16">No hay tratamientos registrados para este paciente.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Vista Desktop */}
            <div className="hidden lg:block overflow-x-auto">
                <table
                    className="w-full table-auto text-primary-blue-hover bg-white rounded-lg overflow-hidden shadow-sm"
                    role="table"
                    aria-label="Historial de tratamientos del paciente"
                >
                    <thead>
                        <tr className="bg-gradient-to-r from-primary-blue to-header-blue text-white">
                            <th className="px-4 py-4 text-center text-22 font-semibold font-poppins" scope="col">
                                Número de Cita
                            </th>
                            <th className="px-4 py-4 text-center text-24 font-semibold font-poppins" scope="col">
                                Fecha
                            </th>
                            <th className="px-4 py-4 text-center text-24 font-semibold font-poppins" scope="col">
                                Motivo
                            </th>
                            <th className="px-4 py-4 text-center text-24    font-semibold font-poppins" scope="col">
                                Nombre del Tratamiento
                            </th>
                            <th className="px-4 py-4 text-center text-24 font-semibold font-poppins" scope="col">
                                Doctor
                            </th>
                            <th className="px-4 py-4 text-center text-24 font-semibold font-poppins" scope="col">
                                Observaciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {treatments.map((treatment, index) => (
                            <tr
                                key={treatment.id || index}
                                className={`border-b border-gray-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                            >
                                <td className="text-center px-4 py-4 text-18 text-header-blue font-medium font-poppins">
                                    {formatTreatmentNumber(index)}
                                </td>
                                <td className="text-center px-4 py-4 text-18 text-gray-600 font-poppins">
                                    {formatDate(treatment.date)}
                                </td>
                                <td className="text-center px-4 py-4 text-18 text-gray-800 font-poppins">
                                    {treatment.reason || 'N/A'}
                                </td>
                                <td className="text-center px-4 py-4 text-18 text-gray-800 font-poppins">
                                    {treatment.name || 'N/A'}
                                </td>
                                <td className="text-center px-4 py-4 text-18 text-primary-blue font-medium font-poppins">
                                    {treatment.doctor_name || 'N/A'}
                                </td>
                                <td className="text-left px-4 py-4 text-18 text-gray-600 font-poppins">
                                    <div className="max-w-md">
                                        <p className="text-wrap leading-relaxed">
                                            {treatment.notes || 'Sin observaciones'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista Mobile/Tablet */}
            <div className="lg:hidden space-y-4">
                {treatments.map((treatment, index) => (
                    <div
                        key={treatment.id || index}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
                    >
                        {/* Header de la card */}
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <span className="bg-primary-blue text-white px-3 py-1 rounded-full text-12 font-bold font-poppins">
                                    Cita #{formatTreatmentNumber(index)}
                                </span>
                                <span className="text-16 text-gray-600 font-poppins">
                                    {formatDate(treatment.date)}
                                </span>
                            </div>
                        </div>

                        {/* Contenido de la card */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-18 font-medium text-gray-500 mb-1 font-poppins">
                                    Tratamiento
                                </label>
                                <p className="text-16 text-gray-800 font-poppins font-medium">
                                    {treatment.name || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-18  font-medium text-gray-500 mb-1 font-poppins">
                                    Doctor
                                </label>
                                <p className="text-16 text-primary-blue font-medium font-poppins">
                                    {treatment.doctor_name || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-18 font-medium text-gray-500 mb-1 font-poppins">
                                    Observaciones
                                </label>
                                <p className="text-16 text-gray-600 font-poppins leading-relaxed text-justify">
                                    {treatment.notes || 'Sin observaciones'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TreatmentsTable;