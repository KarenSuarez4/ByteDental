import React from 'react';
import Select from './Select';
import DateInput from './DateInput';
import Button from './Button';

const StatisticsFilters = ({ 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  onClearFilters,
  doctors = [],
  procedureTypes = []
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Filtros</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DateInput
          label="Fecha Inicio"
          value={filters.startDate}
          onChange={(value) => onFilterChange('startDate', value)}
          placeholder="Seleccionar fecha"
        />
        
        <DateInput
          label="Fecha Fin"
          value={filters.endDate}
          onChange={(value) => onFilterChange('endDate', value)}
          placeholder="Seleccionar fecha"
        />
        
        <Select
          label="Doctor"
          value={filters.doctorId}
          onChange={(value) => onFilterChange('doctorId', value)}
          options={[
            { value: '', label: 'Todos los doctores' },
            ...doctors.map(doctor => ({
              value: doctor.id,
              label: `${doctor.nombre} ${doctor.apellido}`
            }))
          ]}
        />
        
        <Select
          label="Tipo de Procedimiento"
          value={filters.procedureType}
          onChange={(value) => onFilterChange('procedureType', value)}
          options={[
            { value: '', label: 'Todos los procedimientos' },
            ...procedureTypes.map(type => ({
              value: type.id,
              label: type.nombre
            }))
          ]}
        />
      </div>
      
      <div className="flex gap-3 mt-4">
        <Button 
          onClick={onApplyFilters}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Aplicar Filtros
        </Button>
        <Button 
          onClick={onClearFilters}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
};

export default StatisticsFilters;