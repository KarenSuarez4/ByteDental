import { auth } from "../Firebase/client";

/**
 * Obtener el token de autenticación del usuario actual
 * @returns {Promise<string>} Token de autenticación o null si no hay usuario
 */
export const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    return await currentUser.getIdToken();
  } catch (error) {
    console.error("Error obteniendo token:", error);
    return null;
  }
};
