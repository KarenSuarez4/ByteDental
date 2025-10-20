const API_URL = import.meta.env.VITE_API_URL;

// Función genérica para manejar las respuestas de la API
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: "Error desconocido en el servidor" };
    }

    // Crear un error con estructura completa para debugging
    const error = new Error(
      errorData.detail || errorData.message || `Error ${response.status}`
    );
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };

    console.error("❌ patientService handleResponse error:", {
      status: response.status,
      statusText: response.statusText,
      errorData,
      url: response.url,
    });

    // Log específico del detail si es array
    if (errorData.detail && Array.isArray(errorData.detail)) {
      console.error("❌ Errores de validación específicos:", errorData.detail);
      errorData.detail.forEach((error, index) => {
        console.error(`  Error ${index + 1}:`, {
          field: error.loc?.join("."),
          message: error.msg,
          type: error.type,
          input: error.input,
        });
      });
    }

    throw error;
  }
  return response.json();
};

// Crear un nuevo paciente
export const createPatient = async (patientData, token) => {
  const response = await fetch(`${API_URL}/api/patients/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patientData),
  });
  return handleResponse(response);
};

// Obtener todos los pacientes
export const getAllPatients = async (token) => {
  const response = await fetch(`${API_URL}/api/patients/?active_only=false`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

export const getActivePatients = async (token) => {
  const response = await fetch(`${API_URL}/api/patients/?active_only=True`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Obtener un paciente por ID
export const getPatientById = async (patientId, token) => {
  const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Actualizar un paciente
export const updatePatient = async (patientId, patientData, token) => {
  const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patientData),
  });
  return handleResponse(response);
};

// Cambiar estado de un paciente (activar/desactivar) con motivo
export const changePatientStatus = async (
  patientId,
  isActive,
  deactivationReason,
  token
) => {
  const body = { is_active: isActive };

  // Solo incluir deactivation_reason si se está desactivando
  if (!isActive && deactivationReason) {
    body.deactivation_reason = deactivationReason;
  }

  const response = await fetch(`${API_URL}/api/patients/${patientId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

// Desactivar un paciente con motivo (soft delete)
export const deactivatePatient = async (
  patientId,
  deactivationReason,
  token
) => {
  return changePatientStatus(patientId, false, deactivationReason, token);
};

// Activar un paciente
export const activatePatient = async (patientId, token) => {
  return changePatientStatus(patientId, true, null, token);
};
