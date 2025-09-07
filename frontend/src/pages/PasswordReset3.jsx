import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ProgressIndicator from "../components/ProgressIndicator";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { auth } from "../Firebase/client";
import { 
  sendPasswordResetEmail
} from "firebase/auth";

const PasswordReset3 = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");

  useEffect(() => {
    const otpVerified = localStorage.getItem('otpVerified');
    const storedEmail = localStorage.getItem('resetEmail');
    
    if (!otpVerified || !storedEmail) {
      // Si no verificó el OTP, redirigir al primer paso
      navigate('/PasswordReset');
      return;
    }
    
    setEmail(storedEmail);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");

    try {
      // Enviar email de restablecimiento de Firebase
      await sendPasswordResetEmail(auth, email);
      
      // Mostrar mensaje de éxito y instrucciones
      setSuccessMessage(
        "Te hemos enviado un enlace de restablecimiento de contraseña por email. " +
        "Por favor, revisa tu bandeja de entrada y sigue las instrucciones para completar el cambio de contraseña."
      );
      
      // Limpiar datos del OTP del localStorage
      localStorage.removeItem('otpVerified');
      localStorage.removeItem('resetEmail');
      
      // Redirigir después de 8 segundos
      setTimeout(() => {
        navigate("/");
      }, 8000);
      
    } catch (error) {
      console.error("Error al enviar email de restablecimiento:", error);
      setNewPasswordError("Error al procesar la solicitud. Por favor, intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mt-2">
        <ProgressIndicator step={3} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-4">
          Restablecer contraseña
        </h1>
        
        {!successMessage ? (
          <>
            <p className="text-gray-600 text-sm font-poppins mb-6 text-center max-w-md">
              Hemos verificado tu identidad. Ahora te enviaremos un enlace seguro de Firebase 
              para que puedas cambiar tu contraseña.
            </p>
            
            {/* Mostrar error si existe */}
            {newPasswordError && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg w-[400px]">
                <p className="text-sm font-poppins">{newPasswordError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="w-[338px]">
              {/* Botón para enviar enlace */}
              <Button 
                type="submit" 
                className="w-full mb-4" 
                disabled={isLoading}
              >
                {isLoading ? "Enviando enlace..." : "Enviar enlace de restablecimiento"}
              </Button>
            </form>
          </>
        ) : (
          <div className="w-[400px] text-center">
            <div className="mb-6 p-6 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <h2 className="text-lg font-bold font-poppins mb-2">¡Enlace enviado!</h2>
              <p className="text-sm font-poppins">{successMessage}</p>
            </div>
          </div>
        )}
        
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