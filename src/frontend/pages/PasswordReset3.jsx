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
  const [passwordStrength, setPasswordStrength] = useState("weak");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      return;
    }
    navigate("/password-reset-success");
  };

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    // Validación de longitud mínima
    if (value.length < 6) {
      setNewPasswordError("La contraseña debe tener al menos 6 caracteres");
      setPasswordStrength("weak");
    } else {
      setNewPasswordError("");
      // Evaluar la fuerza de la contraseña
      if (value.length >= 6 && value.length < 10) {
        setPasswordStrength("medium");
      } else if (value.length >= 10) {
        setPasswordStrength("strong");
      }
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value !== newPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
    } else {
      setConfirmPasswordError("");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <ProgressIndicator step={3} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
          Restablecer contraseña
        </h1>
        <form onSubmit={handleSubmit} className="w-[338px]">
          <div className="mb-4">
            <InputPassword
              label="Nueva Contraseña"
              value={newPassword}
              onChange={handleNewPasswordChange}
              error={newPasswordError}
            />
            <SafetyMeter strength={passwordStrength} />
          </div>
          <div className="mb-4">
            <InputPassword
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              error={confirmPasswordError}
            />
          </div>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
        <a
          onClick={() => navigate("/")}
          className="mt-8 text-header-blue hover:underline font-bold cursor-pointer"
        >
          Volver a inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset3;