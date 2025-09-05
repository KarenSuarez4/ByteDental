import React, { useState } from "react";
import Header from "../components/Header";
import ProgressIndicator from "../components/ProgressIndicator";
import InputPassword from "../components/InputPassword";
import Button from "../components/Button";
import SafetyMeter from "../components/SafetyMeter";
import { useNavigate } from "react-router-dom";

const PasswordReset3 = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("none"); // Estado inicial

  const handleSubmit = (e) => {
    e.preventDefault();

    let hasErrors = false;

    // Validación de la nueva contraseña
    if (newPassword.length < 6) {
      setNewPasswordError("La contraseña debe tener al menos 6 caracteres.");
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
    // Aquí iría la llamada a la API o a Firebase para actualizar la contraseña.
    alert("Contraseña actualizada con éxito (simulado)!");
    navigate("/");
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
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !newPasswordError &&
    !confirmPasswordError;

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
        <ProgressIndicator step={3} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
          Restablecer contraseña
        </h1>
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
            Guardar
          </Button>
        </form>
        <a
          onClick={() => navigate("/")}
          className="mt-4 text-header-blue hover:underline font-bold cursor-pointer"
        >
          Volver a inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset3;