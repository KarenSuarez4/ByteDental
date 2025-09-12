import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  GoogleAuthProvider, 
  getAuth, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";

const PROVIDER_GOOGLE = new GoogleAuthProvider();
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configurar proveedor de Google
PROVIDER_GOOGLE.setCustomParameters({
  prompt: 'select_account'
});

// Función para iniciar sesión con Google
export function loginWithGoogle() {
  return signInWithPopup(auth, PROVIDER_GOOGLE)
    .then((result) => {
      return result.user;
    })
    .catch((error) => {
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Función para mapear errores de Firebase a mensajes personalizados
function getCustomErrorMessage(firebaseError) {
  const errorMessages = {
    'auth/wrong-password': 'Error 401: Credenciales inválidas',
    'auth/user-not-found': 'Error 404: Usuario no encontrado',
    'auth/invalid-email': 'Error 400: Formato de email inválido',
    'auth/user-disabled': 'Error 403: Usuario deshabilitado',
    'auth/too-many-requests': 'Error 429: Demasiados intentos fallidos. Intenta más tarde',
    'auth/email-already-in-use': 'Error 409: El email ya está registrado',
    'auth/weak-password': 'Error 400: La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-credential': 'Error 401: Credenciales inválidas',
    'auth/network-request-failed': 'Error 500: Error de conexión. Verifica tu internet',
    'auth/popup-closed-by-user': 'Error 400: Ventana de autenticación cerrada',
    'auth/cancelled-popup-request': 'Error 400: Proceso de autenticación cancelado'
  };

  return errorMessages[firebaseError.code] || `Error: ${firebaseError.message}`;
}

// Función para iniciar sesión con email y contraseña
export function loginWithEmailAndPassword(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      return userCredential.user;
    })
    .catch((error) => {
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Función para registrar usuario con email y contraseña
export function registerWithEmailAndPassword(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      return userCredential.user;
    })
    .catch((error) => {
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Función para enviar email de restablecimiento de contraseña
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
    .then(() => {
      console.log("Password reset email sent successfully");
      return true;
    })
    .catch((error) => {
      console.error("Error sending password reset email:", error);
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Función para cerrar sesión
export function logout() {
  return signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
      return true;
    })
    .catch((error) => {
      console.error("Error during sign out:", error);
      throw error;
    });
}

// Función para observar cambios en el estado de autenticación
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Función para obtener el usuario actual
export function getCurrentUser() {
  return auth.currentUser;
}

// Función para cambiar contraseña (requiere re-autenticación)
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error("Error 401: No hay usuario autenticado");
  }

  // Re-autenticar usuario
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  
  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    console.log("Password updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating password:", error);
    const customError = new Error(getCustomErrorMessage(error));
    customError.code = error.code;
    customError.originalError = error;
    throw customError;
  }
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated() {
  return auth.currentUser !== null;
}

// Función para verificar código de restablecimiento de contraseña
export function verifyPasswordResetCodeCustom(oobCode) {
  return verifyPasswordResetCode(auth, oobCode)
    .then((email) => {
      console.log("Password reset code verified for:", email);
      return email;
    })
    .catch((error) => {
      console.error("Error verifying password reset code:", error);
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Función para confirmar restablecimiento de contraseña
export function confirmPasswordResetCustom(oobCode, newPassword) {
  return confirmPasswordReset(auth, oobCode, newPassword)
    .then(() => {
      console.log("Password reset successful");
      return true;
    })
    .catch((error) => {
      console.error("Error confirming password reset:", error);
      const customError = new Error(getCustomErrorMessage(error));
      customError.code = error.code;
      customError.originalError = error;
      throw customError;
    });
}

// Exportar la instancia de auth para uso en otras partes de la aplicación
export { auth };

console.log("Firebase initialized:", app);
