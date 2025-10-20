import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import Input from './Input';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SearchIcon = () => (
    <FaSearch className="w-4 h-4 text-gray-400 transition-colors" />
);

// Icono de Limpiar
const ClearIcon = () => (
    <FaTimes className="w-4 h-4 text-gray-400 transition-colors" />
);


// Icono de Usuario Seleccionado
const UserCheckIcon = ({ className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 10 16 16l-3-3" />
    </svg>
);


// --- SEARCHINPUT COMPONENT (Fusionado) ---
// Se ha simplificado para usar <input> directamente en lugar de importar otro componente <Input>
const SearchInput = ({
    value = '',
    onChange,
    onClear,
    placeholder = 'Buscar...',
    className = '',
    showClearButton = true,
    disabled = false,
    ariaLabel = 'Campo de búsqueda',
    ...props
}) => {
    const [error, setError] = useState('');
    const allowedPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]*$/;

    const handleChange = (e) => {
        const inputValue = e.target.value;

        if (!allowedPattern.test(inputValue)) {
            setError('Caracter no permitido');
            return;
        }

        setError('');
        if (onChange) onChange(e);
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            const syntheticEvent = { target: { value: '' } };
            onChange(syntheticEvent);
        }
    };

    return (
        <div className={`relative inline-flex flex-col ${className}`}>
            <div className="relative inline-flex items-center w-full">
                {/* Icono de búsqueda */}
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                    <div className="text-gray-400 transition-colors w-4 h-4">
                        <SearchIcon />
                    </div>
                </div>


                <Input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    className={clsx(
                        'w-full',
                        'h-[45px]',
                        'rounded-xl',
                        'border',
                        'pl-12',
                        'rounded-[20px]',
                        'border-gray-300 focus:ring-2 focus:ring-primary-blue focus:border-b-primary-blue-hover',
                        showClearButton && value ? 'pr-12' : 'pr-8',
                        disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60',
                        error && 'border border-red-400  ring-red-200'
                    )}
                    {...props}
                />

                {/* Botón de Limpiar */}
                {showClearButton && value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none z-10 w-4 h-4 p-0 m-0"
                        aria-label="Limpiar búsqueda"
                        title="Limpiar búsqueda"
                    >
                        <ClearIcon />
                    </button>
                )}
            </div>

            {error && (
                <span className="text-red-500 text-sm mt-1 pl-2">
                    {error}
                </span>
            )}
        </div>
    );
};


// --- PATIENTSEARCHSELECT COMPONENT (Principal) ---
/**
 * Componente Select con Búsqueda para Pacientes (Combobox).
 * Reemplaza el <Select> nativo con una funcionalidad de búsqueda activa.
 * * @param {Object[]} patients - Array completo de objetos de pacientes.
 * @param {number|null} selectedPatientId - ID del paciente actualmente seleccionado.
 * @param {Function} onSelectPatient - Callback cuando un paciente es seleccionado (recibe patientId).
 * @param {string|null} error - Mensaje de error de validación.
 * @param {boolean} disabled - Deshabilita el componente (ej. cuando patientId está en la URL).
 */
const PatientSearchSelect = ({
    patients,
    selectedPatientId,
    onSelectPatient,
    error,
    disabled
}) => {
    // 1. Estado de la Búsqueda
    const [searchValue, setSearchValue] = useState('');

    // Buscar paciente seleccionado (si existe) para mostrar su nombre en el input
    const selectedPatient = useMemo(() =>
        patients.find(p => p.id === selectedPatientId)
        , [patients, selectedPatientId]);

    // 2. Lógica de Filtrado
    const filteredPatients = useMemo(() => {
        // No mostramos resultados si el valor de búsqueda está vacío
        if (searchValue.trim().length < 2) return [];

        const lowerSearch = searchValue.toLowerCase();

        return patients.filter(patient => {
            // Aseguramos que patient.person existe para evitar errores
            if (!patient.person) return false;

            const { first_name, first_surname, document_number } = patient.person;
            // Combina todos los nombres y apellidos para una búsqueda robusta
            const fullName = `${first_name || ''} ${first_surname || ''} ${patient.person.second_name || ''} ${patient.person.second_surname || ''}`.toLowerCase();

            return fullName.includes(lowerSearch) || (document_number && document_number.includes(lowerSearch));
        }).slice(0, 10); // Limita a 10 resultados para no sobrecargar la UI
    }, [patients, searchValue]);

    // 3. Manejar Selección
    const handlePatientSelection = (patient) => {
        onSelectPatient(patient.id);
        // Mostrar el paciente seleccionado en el input para confirmar
        setSearchValue(`${patient.person.first_name} ${patient.person.first_surname} (${patient.person.document_number})`);
        // Ocultar la lista de resultados forzando que el término de búsqueda se considere "seleccionado"

    };

    // 4. Resetear la Búsqueda / Limpiar Selección
    const handleClear = () => {
        setSearchValue('');
        onSelectPatient(null); // Deselecciona al paciente
    };

    // Si hay un paciente seleccionado y el componente está deshabilitado (ej. modo edición), 
    // mostramos el nombre del paciente y no permitimos la interacción con el SearchInput.
    if (disabled && selectedPatient) {
        return (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-medium flex items-center gap-2">
                <UserCheckIcon className="text-blue-600" />
                <span>
                    **Paciente Seleccionado:** {selectedPatient.person.first_name} {selectedPatient.person.first_surname} - {selectedPatient.person.document_number}
                </span>
            </div>
        );
    }

    // Determinamos si mostrar el dropdown de resultados
    const showResultsDropdown = searchValue.trim().length > 0 &&
        filteredPatients.length > 0 &&
        (selectedPatientId === null || searchValue !== `${selectedPatient?.person.first_name} ${selectedPatient?.person.first_surname} (${selectedPatient?.person.document_number})`);


    return (
        <div className="relative w-full">
            <SearchInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={handleClear}
                placeholder="Buscar paciente por nombre completo o número de  documento"
                ariaLabel="Búsqueda de paciente"
                className="w-full"
                // Deshabilitar la limpieza si ya hay un paciente seleccionado y no estamos buscando
                showClearButton={!disabled}
                disabled={disabled && !!selectedPatientId}
            />

            {/* Display de Resultados de Búsqueda */}
            {showResultsDropdown && (
                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={() => handlePatientSelection(patient)}
                            className="p-3 cursor-pointer hover:bg-gray-100 transition-colors duration-150 flex flex-col"
                        >
                            <span className="font-semibold text-gray-800">
                                {patient.person.first_name} {patient.person.first_surname} {patient.person.second_surname}
                            </span>
                            <span className="text-sm text-gray-500">
                                {patient.person.document_type}: {patient.person.document_number}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Manejo de error y mensajes */}
            {error && (
                <span className="text-red-500 text-sm mt-1 pl-2" id="patient_id-error">
                    {error}
                </span>
            )}
            {/* Mensaje si no se encuentran resultados */}
            {(searchValue.trim().length > 2 && filteredPatients.length === 0 && !selectedPatient) && (
                <div className="p-3 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg shadow-md mt-1">
                    No se encontraron coincidencias. Intente con otro nombre o número de documento.
                </div>
            )}
        </div>
    );
};

export default PatientSearchSelect;