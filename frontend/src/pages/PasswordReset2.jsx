import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProgressIndicator from '../components/ProgressIndicator';
import Button from '../components/Button';
import OtpInput from '../components/Otpinput';
import LoadingScreen from '../components/LoadingScreen';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';
import { otpService } from '../services/otpService';

function cn(...args) {
  return twMerge(clsx(args));
}

const PasswordReset2 = () => {
  const navigate = useNavigate();
  const [otpCode, setOtpCode] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Obtener el email del localStorage
    const storedEmail = localStorage.getItem('resetEmail');
    if (!storedEmail) {
      // Si no hay email, redirigir al primer paso
      navigate('/PasswordReset');
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  const handleOtpComplete = async (code) => {
    setOtpCode(code);
    setLoading(true);
    setShowError(false);
    setErrorMessage('');

    try {
      const result = await otpService.verifyOTP(email, code);
      
      if (result.success) {
        console.log('Código validado. Procediendo a cambiar contraseña.');
        // Guardar que el OTP fue verificado
        localStorage.setItem('otpVerified', 'true');
        navigate('/PasswordReset3');
      } else {
        setShowError(true);
        // Personalizar el mensaje según el tipo de error
        if (result.message.includes('incorrecto') || result.message.includes('inválido') || result.message.includes('invalid')) {
          setErrorMessage('El código no coincide. Verifica e intenta nuevamente.');
        } else if (result.message.includes('expirado') || result.message.includes('expired')) {
          setErrorMessage('El código ha expirado. Solicita un nuevo código.');
        } else {
          setErrorMessage('El código no coincide. Verifica e intenta nuevamente.');
        }
        console.log('Código incorrecto.');
      }
    } catch (error) {
      console.error('Error verificando OTP:', error);
      setShowError(true);
      setErrorMessage('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length === 4) {
      await handleOtpComplete(otpCode);
    } else {
      setShowError(true);
      setErrorMessage('Por favor, ingresa los 4 dígitos del código.');
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setShowError(false);
    setErrorMessage('');

    try {
      const result = await otpService.sendOTP(email);
      
      if (result.success) {
        // Mostrar mensaje de éxito temporal
        setErrorMessage('Código reenviado exitosamente');
        setShowError(false);
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => {
          setErrorMessage('');
        }, 3000);
      } else {
        setShowError(true);
        setErrorMessage(result.message || 'Error reenviando el código');
      }
    } catch (error) {
      console.error('Error reenviando código:', error);
      setShowError(true);
      setErrorMessage('Error reenviando el código. Intenta nuevamente.');
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <ProgressIndicator step={2} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-2">
          Restablecer contraseña
        </h1>
        <p className="text-center w-[338px] mb-3 font-poppins">
          Se acaba de enviar un código de verificación de cuatro dígitos a su correo electrónico. Ingréselo a continuación
        </p>

        <div className="mb-8">
          <OtpInput onComplete={handleOtpComplete} />
          {showError && errorMessage && (
            <p className="text-red-500 text-xs font-poppins mt-2 text-center">
              {errorMessage}
            </p>
          )}
          {!showError && errorMessage && (
            <p className="text-green-500 text-xs font-poppins mt-2 text-center">
              {errorMessage}
            </p>
          )}
        </div>

        <Button 
          onClick={handleVerify} 
          disabled={otpCode.length !== 4 || loading}
        >
          {loading ? 'Verificando...' : 'Verificar'}
        </Button>
        
        <button 
          onClick={handleResendCode}
          disabled={resendLoading}
          className="text-primary-blue hover:underline mt-4 disabled:opacity-50"
        >
          {resendLoading ? 'Reenviando...' : 'Reenviar código'}
        </button>
        <a onClick={() => navigate('/')} className="mt-8 text-header-blue hover:underline font-bold cursor-pointer">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset2;