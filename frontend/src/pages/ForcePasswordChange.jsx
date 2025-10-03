import React, { useState, useEffect } from "react";
import InputPassword from "../components/InputPassword";
import Button from "../components/Button";
import SafetyMeter from "../components/SafetyMeter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../Firebase/client";

const ForcePasswordChange = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("none");
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Verificar que el usuario esté autenticado y necesite cambiar contraseña
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // Obtener token del usuario
        const token = await user.getIdToken();
        
        // Consultar información del usuario actual
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserInfo(userData);
          
          // Si no necesita cambiar contraseña, redirigir al dashboard
          if (!userData.must_change_password) {
            navigate("/dashboard");
            return;
          }
        } else {
          throw new Error('Error al obtener información del usuario');
        }
      } catch (error) {
        console.error("Error verificando estado del usuario:", error);
        setGeneralError("Error al verificar tu estado. Por favor, inicia sesión nuevamente.");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    checkUserStatus();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let hasErrors = false;

    // Validación de la nueva contraseña
    if (newPassword.length < 8) {
      setNewPasswordError("La contraseña debe tener al menos 8 caracteres.");
      hasErrors = true;
    } else {
      setNewPasswordError("");
    }

    // Validación de la coincidencia
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden.");
      hasErrors = true;
    } else {
      setConfirmPasswordError("");
    }

    if (hasErrors) {
      return;
    }

    setLoading(true);
    setGeneralError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      // Obtener token actualizado
      const token = await user.getIdToken();

      // Llamar al endpoint de cambio forzoso de contraseña
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/force-password-change`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      if (response.ok) {
        
        // Mostrar mensaje de éxito y iniciar redirección
        setPasswordChangeSuccess(true);
        setGeneralError("");
        
        // Iniciar contador de redirección al login
        setRedirectCountdown(5);
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Cerrar sesión antes de redirigir
              signOut().then(() => {
                navigate("/login");
              }).catch(() => {
                navigate("/login"); // Redirigir aunque falle el logout
              });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al cambiar la contraseña');
      }
      
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      
      if (error.message.includes("no coinciden")) {
        setConfirmPasswordError("Las contraseñas no coinciden.");
      } else if (error.message.includes("8 caracteres")) {
        setNewPasswordError("La contraseña debe tener al menos 8 caracteres.");
      } else {
        setGeneralError(error.message || "Error al cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    let strength = "none";
    if (value.length > 0) {
      if (value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
        strength = "strong";
      } else if (value.length >= 6) {
        strength = "medium";
      } else {
        strength = "weak";
      }
    }
    setPasswordStrength(strength);

    if (value.length < 8) {
      setNewPasswordError("La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula y un número.");
    } else {
      setNewPasswordError("");
    }
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden.");
    } else if (confirmPassword) {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (newPassword !== value) {
      setConfirmPasswordError("Las contraseñas no coinciden.");
    } else {
      setConfirmPasswordError("");
    }
  };

  const isFormValid =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !newPasswordError &&
    !confirmPasswordError &&
    !loading &&
    !passwordChangeSuccess;

  // Si hay un error general, mostrar mensaje de error
  if (generalError && !userInfo) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
          <div className="w-[338px] text-center">
            <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
              Error
            </h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-poppins">{generalError}</p>
            </div>
            <Button onClick={() => navigate("/login")} className="w-full">
              Volver al Login
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Si aún está cargando la información del usuario
  if (!userInfo && !generalError) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
          <div className="w-[338px] text-center">
            <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
              Verificando...
            </h1>
            <p className="text-gray-600 font-poppins">
              Validando tu información...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Si la contraseña fue cambiada exitosamente
  if (passwordChangeSuccess) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
          <div className="w-[400px] text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-6">
              <div className="text-green-600 text-6xl mb-4">🎉</div>
              <h1 className="text-green-800 text-2xl font-bold font-poppins mb-4">
                ¡Contraseña actualizada!
              </h1>
              <p className="text-green-700 text-sm font-poppins mb-4">
                Tu contraseña ha sido cambiada correctamente. Por seguridad, debes iniciar sesión nuevamente.
              </p>
              {redirectCountdown !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 text-sm font-poppins">
                    Redirigiendo al login en {redirectCountdown}s...
                  </p>
                </div>
              )}
            </div>
            <Button 
              onClick={() => {
                signOut().then(() => {
                  navigate("/login");
                }).catch(() => {
                  navigate("/login");
                });
              }} 
              className="w-full"
            >
              Iniciar Sesión
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-2">
          Configurar nueva contraseña
        </h1>
        
        {/* Información de bienvenida */}
        {userInfo && (
          <div className="w-[400px] bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h2 className="text-blue-800 text-lg font-bold font-poppins mb-2">
                ¡Hola {userInfo.first_name}! 👋
              </h2>
              <p className="text-blue-700 text-sm font-poppins mb-2">
                Bienvenido a <strong>ByteDental</strong>. Tu rol es: <strong>{userInfo.role_name}</strong>
              </p>
              <p className="text-blue-600 text-xs font-poppins">
                Por seguridad, debes crear una nueva contraseña antes de continuar.
              </p>
            </div>
          </div>
        )}

        {/* Error general */}
        {generalError && userInfo && (
          <div className="w-[400px] bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm font-poppins">{generalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-[400px]">
          {/* Nueva Contraseña */}
          <div className="mb-4">
            <label
              htmlFor="newPassword"
              className="block text-gray-700 text-sm font-poppins mb-1 font-semibold"
            >
              Nueva Contraseña *
            </label>
            <InputPassword
              id="newPassword"
              placeholder="************"
              value={newPassword}
              onChange={handleNewPasswordChange}
              error={!!newPasswordError}
            />
            {newPasswordError && (
              <p className="text-red-500 text-xs mt-2 font-poppins">
                {newPasswordError}
              </p>
            )}
            <SafetyMeter strength={passwordStrength} />
          </div>

          {/* Confirmar Contraseña */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 text-sm font-poppins mb-1 font-semibold"
            >
              Confirmar Contraseña *
            </label>
            <InputPassword
              id="confirmPassword"
              placeholder="************"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              error={!!confirmPasswordError}
            />
            {confirmPasswordError && (
              <p className="text-red-500 text-xs mt-1 font-poppins">
                {confirmPasswordError}
              </p>
            )}
          </div>

          {/* Botón Actualizar */}
          <Button type="submit" className="w-full" disabled={!isFormValid}>
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </Button>
        </form>
        
        {/* Información de seguridad */}
        <div className="w-[400px] mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-xs font-poppins text-center">
            <strong>⚠️ Requisitos de seguridad:</strong><br />
            Mínimo 8 caracteres, incluye una mayúscula y un número.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ForcePasswordChange;
