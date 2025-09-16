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
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

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
  const [otpValidated, setOtpValidated] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  useEffect(() => {
    // Obtener el email del localStorage
    const storedEmail = localStorage.getItem('resetEmail');
    if (!storedEmail) {
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
        console.log('Código OTP validado. Enviando email de restablecimiento de Firebase...');
        const auth = getAuth();
        
        try {
          // Firebase manejará la URL automáticamente basándose en la configuración del console
          await sendPasswordResetEmail(auth, email);
          
          console.log('Email de restablecimiento enviado exitosamente');
          setOtpValidated(true);
          
          // Mostrar mensaje de éxito
          setErrorMessage('Código validado. Se ha enviado un enlace de restablecimiento a tu correo.');
          setShowError(false);
          
          // Guardar que el OTP fue verificado y que se envió el email
          localStorage.setItem('otpVerified', 'true');
          localStorage.setItem('firebaseEmailSent', 'true');
          
          // Esperar un poco para que el usuario lea el mensaje y luego informar sobre el enlace
          setTimeout(() => {
            setErrorMessage('Revisa tu correo y haz clic en el enlace para crear tu nueva contraseña.');
            
            // Iniciar contador de redirección a login
            setRedirectCountdown(10);
            const countdownInterval = setInterval(() => {
              setRedirectCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  navigate('/'); // Redirigir al login
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }, 2000);
          
        } catch (firebaseError) {
          console.error('Error enviando email de Firebase:', firebaseError);
          setShowError(true);
          if (firebaseError.code === 'auth/user-not-found') {
            setErrorMessage('No existe una cuenta con este correo electrónico.');
          } else if (firebaseError.code === 'auth/invalid-email') {
            setErrorMessage('El correo electrónico no es válido.');
          } else {
            setErrorMessage('Error enviando el enlace de restablecimiento. Intenta nuevamente.');
          }
        }
        
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
    <div className="max-h-[calc(100vh-94px)] w-full flex flex-col">
      <main className="flex-1 flex flex-col items-center bg-gray-50 mt-10">
        <ProgressIndicator step={2} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-6">
          Restablecer contraseña
        </h1>
        
        {/* Mostrar contenido diferente según si el OTP fue validado */}
        {!otpValidated ? (
          <>
            <p className="text-center w-[338px] font-poppins text-18">
              Se acaba de enviar un código de verificación de cuatro dígitos a su correo electrónico. Ingréselo a continuación
            </p>

            <div className="mb-8">
              <OtpInput onComplete={setOtpCode} />
              {showError && errorMessage && (
                <p className="text-red-500 text-18 font-poppins mt-2 text-center">
                  {errorMessage}
                </p>
              )}
            </div>

            <Button 
              className='text-18'
              onClick={handleVerify} 
              disabled={otpCode.length !== 4 || loading}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
            
            <button 
              onClick={handleResendCode}
              disabled={resendLoading}
              className="text-primary-blue hover:underline mt-4 disabled:opacity-50 text-18 "
            >
              {resendLoading ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </>
        ) : (
          <>
            <div className="w-[338px] text-center mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="text-green-600 text-4xl mb-4">✅</div>
                <h2 className="text-green-800 text-xl font-semibold font-poppins mb-2">
                  ¡Código validado exitosamente!
                </h2>
                <p className="text-green-700 text-base font-poppins mb-2">
                  Se ha enviado un enlace de restablecimiento a tu correo electrónico (<strong>{email}</strong>).<br />
                  <span className="text-blue-700">Revisa tu bandeja de entrada y la carpeta de spam.</span>
                </p>
                <p className="text-gray-600 text-xs font-poppins">
                  Haz clic en el enlace recibido para crear tu nueva contraseña.
                </p>
                {redirectCountdown !== null && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm font-poppins">
                      🔄 Redirigiendo al login en {redirectCountdown}s...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Mensaje de error general (solo cuando hay error y no se validó OTP) */}
        {!otpValidated && !showError && errorMessage && (
          <p className="text-green-500 text-xs font-poppins mt-2 text-center">
            {errorMessage}
          </p>
        )}
        <a onClick={() => navigate('/')} className="mt-6 text-header-blue hover:underline font-bold cursor-pointer text-18">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset2;