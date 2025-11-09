import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserById } from '../../services/userService';
import { getAuthToken } from '../../services/getToken';
import { statisticsService } from '../../services/statisticsService';
import ProcedureDistributionChart from '../../components/Charts/ProcedureDistributionChart';
import ProceduresByDoctorChart from '../../components/Charts/ProceduresByDoctorChart';
import TreatmentsByMonthChart from '../../components/Charts/TreatmentsByMonthChart';

const StatisticsDashboard = () => {
  const { currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calcular fechas por defecto: últimos 30 días
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  
  // Estados para los datos de estadísticas
  const [procedureDistribution, setProcedureDistribution] = useState({ total_procedures: 0, distribution: [] });
  const [proceduresByDoctor, setProceduresByDoctor] = useState({ procedures_by_doctor: [] });
  const [treatmentsByMonth, setTreatmentsByMonth] = useState({ treatments_per_month: [] });
  const [activePatientsCount, setActivePatientsCount] = useState({ total_active_patients: 0, active_patients_period: 0 });
  const [employeesCount, setEmployeesCount] = useState({ total_general: 0, detail_by_role: [] });
  
  // Estados para datos de filtros
  const [activeDoctors, setActiveDoctors] = useState([]);
  
  // Estados para filtros - SIN fechas predefinidas
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    doctorId: ''
  });

  // Estado específico para el año de la gráfica de tratamientos
  const [selectedYear, setSelectedYear] = useState(null);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);

  const loadFilterData = async () => {
    try {
      const doctorsData = await statisticsService.getActiveDoctorsList();
      setActiveDoctors(doctorsData || []);
    } catch (error) {
      setActiveDoctors([]);
    }
  };

  const loadStatisticsData = async () => {
    try {
      // Obtener pacientes activos del sistema (sin filtros de fecha)
      const totalPatientsData = await statisticsService.getActivePatientsCount({});

      const [
        distributionData,
        doctorData,
        employeesData
      ] = await Promise.all([
        statisticsService.getProcedureDistribution(filters),
        statisticsService.getProceduresByDoctor(filters),
        statisticsService.getEmployeesCount({ isActive: true })
      ]);

      setProcedureDistribution(distributionData || { total_procedures: 0, distribution: [] });
      setProceduresByDoctor(doctorData || { procedures_by_doctor: [] });
      setActivePatientsCount(totalPatientsData || { total_active_patients: 0, active_patients_period: 0 });
      setEmployeesCount(employeesData || { total_general: 0, detail_by_role: [] });
      
    } catch (error) {
      setError('Error al cargar las estadísticas');
    }
  };

  // Función separada para cargar datos de tratamientos por mes
  const loadTreatmentsData = async (year = null) => {
    try {
      setTreatmentsLoading(true);
      const treatmentsFilters = {
        ...filters,
        year: year
      };
      
      const monthlyData = await statisticsService.getTreatmentsByMonth(treatmentsFilters);
      setTreatmentsByMonth(monthlyData || { treatments_per_month: [] });
    } catch (error) {
      console.error('Error cargando tratamientos por mes:', error);
    } finally {
      setTreatmentsLoading(false);
    }
  };

  // Manejar cambio de año
  const handleYearChange = (year) => {
    setSelectedYear(year);
    loadTreatmentsData(year);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        const token = await getAuthToken();
        if (!token) {
          throw new Error('Usuario no autenticado');
        }

        const userData = await getUserById(currentUser.uid, token);
        setUser(userData);

        // Cargar datos de filtros y estadísticas con fechas por defecto
        await loadFilterData();
        await loadStatisticsData();
        await loadTreatmentsData();

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      
      // Obtener pacientes activos del sistema (sin filtros de fecha)
      const totalPatientsData = await statisticsService.getActivePatientsCount({});

      const [
        distributionData,
        doctorData,
        employeesData
      ] = await Promise.all([
        statisticsService.getProcedureDistribution(filters),
        statisticsService.getProceduresByDoctor(filters),
        statisticsService.getEmployeesCount({ isActive: true })
      ]);

      setProcedureDistribution(distributionData || { total_procedures: 0, distribution: [] });
      setProceduresByDoctor(doctorData || { procedures_by_doctor: [] });
      setActivePatientsCount(totalPatientsData || { total_active_patients: 0, active_patients_period: 0 });
      setEmployeesCount(employeesData || { total_general: 0, detail_by_role: [] });
      
      setTreatmentsLoading(true);
      const treatmentsFilters = {
        ...filters,
        year: selectedYear
      };
      
      const monthlyData = await statisticsService.getTreatmentsByMonth(treatmentsFilters);
      setTreatmentsByMonth(monthlyData || { treatments_per_month: [] });
      setTreatmentsLoading(false);
      
    } catch (error) {
      setError('Error al aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    const clearedFilters = {
      startDate: '',
      endDate: '',
      doctorId: ''
    };
    
    setFilters(clearedFilters);
    setSelectedYear(null);
    
    try {
      setLoading(true);
      
      // Obtener pacientes activos del sistema (sin filtros de fecha)
      const totalPatientsData = await statisticsService.getActivePatientsCount({});

      const [
        distributionData,
        doctorData,
        employeesData
      ] = await Promise.all([
        statisticsService.getProcedureDistribution(clearedFilters),
        statisticsService.getProceduresByDoctor(clearedFilters),
        statisticsService.getEmployeesCount({ isActive: true })
      ]);

      setProcedureDistribution(distributionData || { total_procedures: 0, distribution: [] });
      setProceduresByDoctor(doctorData || { procedures_by_doctor: [] });
      setActivePatientsCount(totalPatientsData || { total_active_patients: 0, active_patients_period: 0 });
      setEmployeesCount(employeesData || { total_general: 0, detail_by_role: [] });
      
      setTreatmentsLoading(true);
      const monthlyData = await statisticsService.getTreatmentsByMonth(clearedFilters);
      setTreatmentsByMonth(monthlyData || { treatments_per_month: [] });
      setTreatmentsLoading(false);
      
    } catch (error) {
      setError('Error al limpiar filtros');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeCountByRole = (role) => {
    const roleData = employeesCount.detail_by_role?.find(item => item.role === role);
    return roleData ? roleData.total : 0;
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!user) return <p>No se encontró el usuario</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Filtros</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doctor ({activeDoctors.length} disponibles)
              </label>
              <select
                value={filters.doctorId}
                onChange={(e) => handleFilterChange('doctorId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los doctores</option>
                {activeDoctors.map(doctor => (
                  <option key={doctor.uid} value={doctor.uid}>
                    Dr. {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button 
              onClick={handleApplyFilters}
              disabled={loading}
              className="px-6 py-2 bg-primary-blue hover:bg-header-blue text-white rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aplicando...' : 'Aplicar Filtros'}
            </button>
            
            <button 
              onClick={handleClearFilters}
              disabled={loading}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Pacientes Activos</h3>
            <p className="text-3xl font-bold text-gray-900">{activePatientsCount.total_active_patients}</p>
            <p className="text-sm text-gray-500 mt-1">Total del sistema</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Doctores</h3>
            <p className="text-3xl font-bold text-gray-900">{getEmployeeCountByRole('Doctor')}</p>
            <p className="text-sm text-gray-500 mt-1">Activos</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Asistentes</h3>
            <p className="text-3xl font-bold text-gray-900">{getEmployeeCountByRole('Asistente')}</p>
            <p className="text-sm text-gray-500 mt-1">Activos</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Administradores</h3>
            <p className="text-3xl font-bold text-gray-900">{getEmployeeCountByRole('Administrator')}</p>
            <p className="text-sm text-gray-500 mt-1">Activos</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Distribución de Procedimientos Realizados
              {filters.doctorId && activeDoctors.find(d => d.uid === filters.doctorId) && (
                <span className="text-sm font-normal text-gray-600 block">
                  Dr. {activeDoctors.find(d => d.uid === filters.doctorId)?.first_name} {activeDoctors.find(d => d.uid === filters.doctorId)?.last_name}
                </span>
              )}
            </h3>
            <ProcedureDistributionChart 
              data={procedureDistribution.distribution} 
              totalProcedures={procedureDistribution.total_procedures}
            />
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Procedimientos por Doctor
              {filters.startDate || filters.endDate ? (
                <span className="text-sm font-normal text-gray-600 block">
                  {filters.startDate && filters.endDate 
                    ? `Período: ${filters.startDate} - ${filters.endDate}`
                    : filters.startDate 
                    ? `Desde: ${filters.startDate}`
                    : `Hasta: ${filters.endDate}`
                  }
                </span>
              ) : null}
            </h3>
            <ProceduresByDoctorChart 
              data={proceduresByDoctor.procedures_by_doctor}
            />
          </div>
        </div>

        {/* Gráfica de tratamientos por mes - Pantalla completa con más altura */}
        <div className="bg-white p-8 rounded-lg shadow-md mb-6 min-h-[600px]">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">
            Total de Tratamientos
            {filters.doctorId && activeDoctors.find(d => d.uid === filters.doctorId) && (
              <span className="text-sm font-normal text-gray-600 block">
                Dr. {activeDoctors.find(d => d.uid === filters.doctorId)?.first_name} {activeDoctors.find(d => d.uid === filters.doctorId)?.last_name}
              </span>
            )}
          </h3>
          <div className="h-96">
            <TreatmentsByMonthChart 
              data={treatmentsByMonth.treatments_per_month}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              loading={treatmentsLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;