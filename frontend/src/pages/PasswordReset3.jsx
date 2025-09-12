import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ProgressIndicator from "../components/ProgressIndicator";
import InputPassword from "../components/InputPassword";
import Button from "../components/Button";
import SafetyMeter from "../components/SafetyMeter";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

const PasswordReset3 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("none");
  const [loading, setLoading] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [email, setEmail] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  const auth = getAuth();
  const oobCode = searchParams.get("oobCode");

  // Verificar el código cuando se monta el componente
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setGeneralError("Código de restablecimiento no válido. Por favor, solicita un nuevo enlace.");
        return;
      }

      try {
        // Verificar que el código sea válido y obtener el email
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setIsValidCode(true);
      } catch (error) {
        console.error("Error verificando código:", error);
        setGeneralError("El enlace de restablecimiento ha expirado o no es válido. Por favor, solicita uno nuevo.");
      }
    };

    verifyCode();
  }, [oobCode, auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidCode || !oobCode) {
      setGeneralError("Código de restablecimiento no válido.");
      return;
    }

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
      // Confirmar el cambio de contraseña con Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      // Mostrar mensaje de éxito y iniciar redirección
      setPasswordResetSuccess(true);
      setGeneralError("");
      
      // Iniciar contador de redirección
      setRedirectCountdown(5);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate("/"); // Redirigir al login
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      
      if (error.code === 'auth/weak-password') {
        setNewPasswordError("La contraseña es muy débil.");
      } else if (error.code === 'auth/expired-action-code') {
        setGeneralError("El enlace de restablecimiento ha expirado. Por favor, solicita uno nuevo.");
      } else if (error.code === 'auth/invalid-action-code') {
        setGeneralError("El código de restablecimiento no es válido.");
      } else {
        setGeneralError("Error al actualizar la contraseña. Inténtalo de nuevo.");
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
    isValidCode &&
    !loading &&
    !passwordResetSuccess;

  // Si hay un error general (código inválido), mostrar mensaje de error
  if (generalError && !isValidCode) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
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

  // Si aún está verificando el código
  if (!isValidCode && !generalError) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
          <div className="w-[338px] text-center">
            <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
              Verificando...
            </h1>
            <p className="text-gray-600 font-poppins">
              Validando el enlace de restablecimiento...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Si la contraseña fue cambiada exitosamente
  if (passwordResetSuccess) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
          <div className="w-[400px] text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-6">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h1 className="text-green-800 text-2xl font-bold font-poppins mb-4">
                ¡Contraseña actualizada con éxito!
              </h1>
              <p className="text-green-700 text-sm font-poppins mb-4">
                Tu contraseña ha sido cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              {redirectCountdown !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 text-sm font-poppins">
                    Redirigiendo al login en {redirectCountdown}s...
                  </p>
                </div>
              )}
            </div>
            <Button onClick={() => navigate("/")} className="w-full">
              Ir al Login ahora
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
        <ProgressIndicator step={3} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
          Restablecer contraseña
        </h1>
        
        {/* Mostrar email para el que se está restableciendo */}
        {email && (
          <p className="text-gray-600 font-poppins mb-4 text-center">
            Estableciendo nueva contraseña para: <strong>{email}</strong>
          </p>
        )}

        {/* Error general */}
        {generalError && isValidCode && (
          <div className="w-[338px] bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm font-poppins">{generalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-[338px]">
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

          {/* Botón Guardar */}
          <Button type="submit" className="w-full" disabled={!isFormValid}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </form>
        <a
          onClick={() => navigate("/login")}
          className="mt-4 text-header-blue hover:underline font-bold cursor-pointer"
        >
          Volver a inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset3;