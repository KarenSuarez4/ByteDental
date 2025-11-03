import { getAuthToken } from './getToken';
import { getAllUsers } from './userService'; // Importar la función que usa UserManagement

// Usar la misma variable que UserHeader para consistencia
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const statisticsService = {
  // Obtener distribución de procedimientos
  getProcedureDistribution: async (filters = {}) => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      
      // Mapear los filtros del frontend a los parámetros del backend
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.doctorId) params.append('doctor_id', filters.doctorId);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/dashboard/distribution-procedures${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { total_procedures: 0, distribution: [] };
      }
      
      return await response.json();
    } catch (error) {
      return { total_procedures: 0, distribution: [] };
    }
  },

  // Obtener procedimientos por doctor
  getProceduresByDoctor: async (filters = {}) => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/dashboard/procedures-doctor${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { procedures_by_doctor: [] };
      }
      return await response.json();
    } catch (error) {
      return { procedures_by_doctor: [] };
    }
  },

  // Obtener tratamientos por mes
  getTreatmentsByMonth: async (filters = {}) => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.doctorId) params.append('doctor_id', filters.doctorId);
      if (filters.year) params.append('year', filters.year); // Agregar parámetro year
      if (filters.procedureId) params.append('procedure_id', filters.procedureId);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/dashboard/treatments-per-month${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { treatments_per_month: [] };
      }
      return await response.json();
    } catch (error) {
      return { treatments_per_month: [] };
    }
  },

  // Obtener total de pacientes activos
  getActivePatientsCount: async (filters = {}) => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.doctorId) params.append('doctor_id', filters.doctorId);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/dashboard/active-patients${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { total_active_patients: 0, active_patients_period: 0 };
      }
      return await response.json();
    } catch (error) {
      return { total_active_patients: 0, active_patients_period: 0 };
    }
  },

  // Obtener cantidad de empleados por rol
  getEmployeesCount: async (filters = {}) => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      
      if (filters.role) params.append('role', filters.role);
      if (filters.isActive !== undefined) params.append('is_active', filters.isActive);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/dashboard/employees${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { total_general: 0, detail_by_role: [] };
      }
      return await response.json();
    } catch (error) {
      return { total_general: 0, detail_by_role: [] };
    }
  },

  // Obtener lista detallada de doctores activos - USANDO EL MISMO ENDPOINT QUE UserManagement
  getActiveDoctorsList: async () => {
    try {
      const token = await getAuthToken();
      
      // Usar la misma función que UserManagement para obtener todos los usuarios
      const allUsers = await getAllUsers(token);
      
      // Filtrar solo doctores activos (mismo criterio que UserManagement)
      const activeDoctors = allUsers.filter(user => 
        user.role_name === 'Doctor' && 
        user.is_active === true
      );
      
      return activeDoctors;
    } catch (error) {
      return [];
    }
  }
};