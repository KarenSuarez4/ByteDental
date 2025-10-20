/**
 * Servicio para integrar eventos de autenticación con el backend
 * para el registro de auditoría
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Registrar evento de login en el backend para auditoría
 * @param {string} email - Email del usuario
 * @param {boolean} success - Si el login fue exitoso
 * @param {string} errorMessage - Mensaje de error (opcional)
 * @param {string} firebaseUid - UID de Firebase (opcional)
 */
export const registerLoginEvent = async (email, success, errorMessage = null, firebaseUid = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        success,
        error_message: errorMessage,
        firebase_uid: firebaseUid
      })
    });

    if (!response.ok) {
      // Si hay un error, intentar parsear el detalle del error
      const errorData = await response.json().catch(() => null);
      const error = new Error(errorData?.detail?.message || 'Error al registrar evento de login');
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Re-lanzar el error para que el frontend lo pueda manejar
    throw error;
  }
};

/**
 * Registrar evento de logout en el backend para auditoría
 * @param {string} firebaseUid - UID del usuario en Firebase
 */
export const registerLogoutEvent = async (firebaseUid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebase_uid: firebaseUid
      })
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Verificar el estado del usuario en el backend
 * @param {string} firebaseUid - UID del usuario en Firebase
 */
export const getUserStatus = async (firebaseUid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/user-status/${firebaseUid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Verificar si un usuario está activo antes de permitir el login
 * @param {string} firebaseUid - UID del usuario en Firebase
 * @returns {boolean|null} - true si está activo, false si está inactivo, null si hay error
 */
export const checkUserActiveStatus = async (firebaseUid) => {
  try {
    const userStatus = await getUserStatus(firebaseUid);
    if (userStatus === null) {
      // Error de conexión o usuario no encontrado
      return null;
    }
    return userStatus.is_active;
  } catch (error) {
    return null;
  }
};

/**
 * Verificar si una cuenta está bloqueada por email
 * @param {string} email - Email del usuario
 * @returns {Object} - { is_locked: boolean, message: string }
 */
export const checkLockStatus = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/check-lock-status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return { is_locked: false, message: 'OK' };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return { is_locked: false, message: 'OK' };
  }
};
