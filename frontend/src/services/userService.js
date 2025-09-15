/**
 * Servicio para gestionar usuarios desde el frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Obtener información de un usuario por su UID
 * @param {string} userUid - UID del usuario
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Datos del usuario o null en caso de error
 */
export const getUserById = async (userUid, token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }

    // Añadir el prefijo '/api' a la URL
    const response = await fetch(`${API_BASE_URL}/api/users/${userUid}`, {
      method: "GET",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Error obteniendo información del usuario"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error obteniendo usuario por ID:", error);
    throw error;
  }
};

/**
 * Obtener lista de todos los usuarios
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Array>} - Lista de usuarios o array vacío en caso de error
 */
export const getAllUsers = async (token) => {
  try {
    if (!token) {
      throw new Error("Se requiere un token de autenticación");
    }
    const response = await fetch(`${API_BASE_URL}/api/users?include_inactive=true`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error obteniendo lista de usuarios");
    }
    return await response.json();
  } catch (error) {
    console.error("Error obteniendo lista de usuarios:", error);
    throw error;
  }
};

/**
 * Crear un nuevo usuario
 * @param {Object} userData - Datos del usuario a crear
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Datos del usuario creado
 */
export const createUser = async (userData, token) => {
  const response = await fetch(`${API_BASE_URL}/api/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Token del admin
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Error al crear usuario");
  }
  return await response.json();
};

/**
 * Obtener lista de roles
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Array>} - Lista de roles
 */
export const getRoles = async (token) => {
  const response = await fetch(`${API_BASE_URL}/api/users/roles/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error backend roles:", errorData);
    throw new Error("Error obteniendo roles");
  }
  const data = await response.json();
  return data;
};

/**
 * Desactivar usuario (soft delete)
 * @param {string} userUid - UID del usuario a desactivar
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Respuesta del backend
 */
export const deactivateUser = async (userUid, token) => {
  const response = await fetch(`${API_BASE_URL}/api/users/${userUid}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Error al desactivar usuario");
  }
  return await response.json();
};

/**
 * Actualizar usuario
 * @param {string} userUid - UID del usuario
 * @param {Object} userData - Datos a actualizar
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Usuario actualizado
 */
export const updateUser = async (userUid, userData, token) => {
  const response = await fetch(`${API_BASE_URL}/api/users/${userUid}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Error al actualizar usuario");
  }
  return await response.json();
};

/**
 * Activar usuario
 * @param {string} userUid - UID del usuario a activar
 * @param {string} token - Token de autenticación Firebase
 * @returns {Promise<Object>} - Respuesta del backend
 */
export const activateUser = async (userUid, token) => {
  const response = await fetch(`${API_BASE_URL}/api/users/${userUid}/activate`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Error al activar usuario");
  }
  return await response.json();
};