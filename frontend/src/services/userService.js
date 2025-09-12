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

    // Añadir el prefijo '/api' a la URL
    const response = await fetch(`${API_BASE_URL}/api/users`, {
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
