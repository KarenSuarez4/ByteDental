const API_URL = import.meta.env.VITE_API_URL;

// Función genérica para manejar las respuestas de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(errorData.detail || `Error ${response.status}`);
  }
  return response.json();
};

// Crear un nuevo paciente
export const createPatient = async (patientData, token) => {
  const response = await fetch(`${API_URL}/api/patients/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(patientData),
  });
  return handleResponse(response);
};

// Obtener todos los pacientes
export const getAllPatients = async (token) => {
  const response = await fetch(`${API_URL}/api/patients/?active_only=false`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Obtener un paciente por ID
export const getPatientById = async (patientId, token) => {
  const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Actualizar un paciente
export const updatePatient = async (patientId, patientData, token) => {
  const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(patientData),
  });
  return handleResponse(response);
};

// Desactivar un paciente (soft delete)
export const deactivatePatient = async (patientId, token) => {
    const response = await fetch(`${API_URL}/api/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: false, reason: "Desactivado desde el frontend" }),
    });
    return handleResponse(response);
  };
  
  // Activar un paciente
  export const activatePatient = async (patientId, token) => {
    const response = await fetch(`${API_URL}/api/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: true }),
    });
    return handleResponse(response);
  };
