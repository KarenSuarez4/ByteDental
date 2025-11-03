/**
 * Servicio para gestionar servicios odontológicos desde el frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Crear un nuevo servicio odontológico
 * @param {Object} serviceData - Datos del servicio a crear
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Datos del servicio creado
 */
export const createDentalService = async (serviceData, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const response = await fetch(`${API_BASE_URL}/api/dental-services/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(serviceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error creando servicio odontológico"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error creando servicio odontológico:", error);
    throw error;
  }
};

/**
 * Obtener lista de servicios odontológicos con filtros
 * @param {string} token - Token de autenticación Firebase
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} - Lista de servicios odontológicos
 */
export const getDentalServices = async (token, filters = {}) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const queryParams = new URLSearchParams();
    
    if (filters.skip !== undefined) queryParams.append('skip', filters.skip);
    if (filters.limit !== undefined) queryParams.append('limit', filters.limit);
    if (filters.is_active !== undefined && filters.is_active !== null) {
      queryParams.append('is_active', filters.is_active);
    }
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.min_price !== undefined && filters.min_price !== null) {
      queryParams.append('min_price', filters.min_price);
    }
    if (filters.max_price !== undefined && filters.max_price !== null) {
      queryParams.append('max_price', filters.max_price);
    }

    const url = `${API_BASE_URL}/api/dental-services/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error obteniendo servicios odontológicos"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo servicios odontológicos:", error);
    throw error;
  }
};

/**
 * Obtener un servicio odontológico por ID
 * @param {number} serviceId - ID del servicio
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Datos del servicio
 */
export const getDentalServiceById = async (serviceId, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const response = await fetch(`${API_BASE_URL}/api/dental-services/${serviceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error obteniendo servicio odontológico"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo servicio odontológico por ID:", error);
    throw error;
  }
};

/**
 * Actualizar un servicio odontológico
 * @param {number} serviceId - ID del servicio a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Datos del servicio actualizado
 */
export const updateDentalService = async (serviceId, updateData, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const response = await fetch(`${API_BASE_URL}/api/dental-services/${serviceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error actualizando servicio odontológico"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error actualizando servicio odontológico:", error);
    throw error;
  }
};

/**
 * Cambiar el estado de un servicio odontológico
 * @param {number} serviceId - ID del servicio
 * @param {Object} statusData - Datos del cambio de estado
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Respuesta del cambio de estado
 */
export const changeServiceStatus = async (serviceId, statusData, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const response = await fetch(`${API_BASE_URL}/api/dental-services/${serviceId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(statusData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error cambiando estado del servicio"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error cambiando estado del servicio:", error);
    throw error;
  }
};

/**
 * Eliminar un servicio odontológico (soft delete)
 * @param {number} serviceId - ID del servicio a eliminar
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Respuesta de la eliminación
 */
export const deleteDentalService = async (serviceId, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    const response = await fetch(`${API_BASE_URL}/api/dental-services/${serviceId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error eliminando servicio odontológico"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error eliminando servicio odontológico:", error);
    throw error;
  }
};