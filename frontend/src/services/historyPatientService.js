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

    console.error("❌ historyPatientService handleResponse error:", {
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

/**
 * Crear una nueva historia clínica
 * @param {Object} historyData - Datos de la historia clínica
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Respuesta de la API con la historia creada
 */
export const createClinicalHistory = async (historyData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/clinical-histories/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(historyData),
    });

    return handleResponse(response);
  } catch (error) {
    console.error("❌ [createClinicalHistory] Error capturado:", error);
    console.error("❌ [createClinicalHistory] Error name:", error.name);
    console.error("❌ [createClinicalHistory] Error message:", error.message);
    console.error("❌ [createClinicalHistory] Error stack:", error.stack);
    throw error;
  }
};

/**
 * Buscar historias clínicas con filtros y paginación
 * @param {Object} params - Parámetros de búsqueda
 * @param {number} [params.patient_id] - ID del paciente
 * @param {string} [params.name] - Nombre del paciente
 * @param {number} [params.page=1] - Número de página
 * @param {number} [params.limit=10] - Límite de resultados por página
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Lista paginada de historias clínicas
 */
export const searchClinicalHistories = async (params = {}, token) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params.name) queryParams.append("name", params.name);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${API_URL}/api/clinical-histories/?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  } catch (error) {
    console.error("❌ Error en searchClinicalHistories:", error);
    throw error;
  }
};

/**
 * Obtener una historia clínica por ID
 * @param {number} historyId - ID de la historia clínica
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Datos de la historia clínica
 */
export const getClinicalHistoryById = async (historyId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/api/clinical-histories/${historyId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return handleResponse(response);
  } catch (error) {
    console.error("❌ Error en getClinicalHistoryById:", error);
    throw error;
  }
};

/**
 * Obtener todas las historias clínicas (sin filtros)
 * @param {string} token - Token de autenticación
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=10] - Límite de resultados por página
 * @returns {Promise<Object>} Lista paginada de todas las historias clínicas
 */
export const getAllClinicalHistories = async (token, page = 1, limit = 10) => {
  return searchClinicalHistories({ page, limit }, token);
};

/**
 * Obtener historias clínicas de un paciente específico
 * @param {number} patientId - ID del paciente
 * @param {string} token - Token de autenticación
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=10] - Límite de resultados por página
 * @returns {Promise<Object>} Lista paginada de historias del paciente
 */
export const getClinicalHistoriesByPatient = async (
  patientId,
  token,
  page = 1,
  limit = 10
) => {
  return searchClinicalHistories({ patient_id: patientId, page, limit }, token);
};

/**
 * Buscar historias clínicas por nombre de paciente
 * @param {string} patientName - Nombre del paciente
 * @param {string} token - Token de autenticación
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=10] - Límite de resultados por página
 * @returns {Promise<Object>} Lista paginada de historias que coinciden con el nombre
 */
export const searchClinicalHistoriesByPatientName = async (
  patientName,
  token,
  page = 1,
  limit = 10
) => {
  return searchClinicalHistories({ name: patientName, page, limit }, token);
};

/**
 * Validar los datos de una historia clínica antes de enviar
 * @param {Object} historyData - Datos a validar
 * @returns {Object} Resultado de la validación
 */
export const validateClinicalHistoryData = (historyData) => {
  const errors = [];

  // Validaciones requeridas
  if (!historyData.patient_id) {
    errors.push("El ID del paciente es requerido");
  }

  if (!historyData.reason || historyData.reason.trim() === "") {
    errors.push("El motivo de consulta es requerido");
  }

  if (!historyData.symptoms || historyData.symptoms.trim() === "") {
    errors.push("Los síntomas son requeridos");
  }

  if (
    !historyData.doctor_signature ||
    historyData.doctor_signature.trim() === ""
  ) {
    errors.push("La firma del doctor es requerida");
  }

  if (
    !historyData.medical_history ||
    typeof historyData.medical_history !== "object"
  ) {
    errors.push("El historial médico debe ser un objeto válido");
  }

  if (!historyData.treatments || !Array.isArray(historyData.treatments)) {
    errors.push("Los tratamientos deben ser un array");
  } else {
    // Validar cada tratamiento
    historyData.treatments.forEach((treatment, index) => {
      if (!treatment.dental_service_id) {
        errors.push(
          `El servicio dental es requerido para el tratamiento ${index + 1}`
        );
      }
      if (!treatment.treatment_date) {
        errors.push(
          `La fecha de tratamiento es requerida para el tratamiento ${
            index + 1
          }`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Formatear los datos de historia clínica para el envío al backend
 * @param {Object} formData - Datos del formulario
 * @returns {Object} Datos formateados para la API
 */
export const formatClinicalHistoryData = (formData) => {
  // ✅ Asegurarse de que treatments tenga la estructura correcta
  const treatments = (formData.treatments || []).map((treatment) => {
    // Si treatment ya es un objeto con la estructura correcta, usarlo directamente
    if (typeof treatment === "object" && treatment.dental_service_id) {
      return {
        dental_service_id: parseInt(treatment.dental_service_id),
        treatment_date: treatment.treatment_date,
        notes: treatment.notes?.trim() || null,
      };
    }

    // Si treatment es solo un ID (string o número), crear la estructura
    return {
      dental_service_id: parseInt(treatment),
      treatment_date: new Date().toISOString(),
      notes: null,
    };
  });

  const formatted = {
    patient_id: parseInt(formData.patient_id),
    reason: formData.reason?.trim() || "",
    symptoms: formData.symptoms?.trim() || "",
    medical_history: formData.medical_history || {},
    findings: formData.findings?.trim() || null,
    doctor_signature: formData.doctor_signature?.trim() || "",
    treatments: treatments,
  };

  return formatted;
};

/**
 * Verificar si un paciente tiene historias clínicas (solo verificación)
 * @param {number} patientId - ID del paciente
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Resultado de la verificación
 */
export const checkPatientHasHistory = async (patientId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/api/clinical-histories/patient/${patientId}/exists`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return handleResponse(response);
  } catch (error) {
    console.error("❌ Error en checkPatientHasHistory:", error);
    throw error;
  }
};

/**
 * Agregar un nuevo tratamiento a una historia clínica existente
 * @param {number} historyId - ID de la historia clínica
 * @param {Object} treatmentData - Datos del tratamiento
 * @param {number} treatmentData.dental_service_id - ID del servicio dental
 * @param {string} treatmentData.treatment_date - Fecha del tratamiento (ISO format)
 * @param {string} [treatmentData.notes] - Notas opcionales del tratamiento
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Respuesta de la API con el tratamiento creado
 */
export const addTreatmentToHistory = async (
  historyId,
  treatmentData,
  token
) => {
  try {
    const response = await fetch(
      `${API_URL}/api/clinical-histories/${historyId}/treatments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(treatmentData),
      }
    );

    const result = await handleResponse(response);
    return result;
  } catch (error) {
    console.error("❌ Error en addTreatmentToHistory:", error);
    throw error;
  }
};

/**
 * Cambiar el estado de una historia clínica (activa/inactiva)
 * @param {number} historyId - ID de la historia clínica
 * @param {boolean} isActive - Estado activo/inactivo
 * @param {string} [closureReason] - Motivo de cierre (opcional, requerido si inactiva)
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Respuesta de la API con el estado actualizado
 */
export const changeClinicalHistoryStatus = async (
  historyId,
  isActive,
  closureReason,
  token
) => {
  try {
    const body = {
      is_active: isActive,
      closure_reason: isActive ? undefined : closureReason,
    };

    const response = await fetch(
      `${API_URL}/api/clinical-histories/${historyId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Error al cambiar el estado de la historia clínica"
      );
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};
