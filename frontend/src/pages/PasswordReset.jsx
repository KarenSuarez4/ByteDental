// src/pages/PasswordReset.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LoadingScreen from '../components/LoadingScreen';
import Button from '../components/Button';
import Input from '../components/Input';
import ProgressIndicator from '../components/ProgressIndicator';
import { otpService } from '../services/otpService';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);

    if (!value.includes('@') ||!value.includes('.')) {
      setEmailError('Ingrese un correo electrónico válido');
    } else {
      setEmailError('');
    }
  };

  const handleButtonClick = async () => {
    if (emailError || !email) {
      setResetError('Por favor, ingrese un correo electrónico válido antes de continuar.');
      return;
    }

    setLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      // Usar el nuevo servicio OTP
      const result = await otpService.sendOTP(email);
      
      if (result.success) {
        setResetSuccess(true);
        
        // Guardar el email en localStorage para usarlo en la siguiente página
        localStorage.setItem('resetEmail', email);
        
        // Esperar un momento y luego redirigir a la siguiente página
        setTimeout(() => {
          setLoading(false);
          navigate('/PasswordReset2');
        }, 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error al enviar código OTP:', error);
      
      let errorMessage = 'Error al enviar el código de verificación';
      
      if (error.message.includes('correo')) {
        errorMessage = 'No existe una cuenta con este correo electrónico';
      } else if (error.message.includes('inválido')) {
        errorMessage = 'Correo electrónico inválido';
      } else if (error.message.includes('intentos')) {
        errorMessage = 'Demasiados intentos. Intenta más tarde';
      } else {
        errorMessage = error.message || 'Error al enviar el código';
      }
      
      setResetError(errorMessage);
      setLoading(false);
    }
  };

  const isEmailValid =!emailError && email.length > 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 mb-11">
        <ProgressIndicator step={1} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-15">
          Restablecer contraseña
        </h1>
        
        {/* Mostrar mensaje de éxito */}
        {resetSuccess && (
          <div className="mb-4 w-150 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center">
            ¡Código de verificación enviado exitosamente! Revisa tu bandeja de entrada.
          </div>
        )}

        {/* Mostrar error si existe */}
        {resetError && (
          <div className="mb-4 w-150 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
            {resetError}
          </div>
        )}

        <Input 
          placeholder="Ingrese su correo electrónico"
          className="w-150 mb-4"
          value={email}
          onChange={handleEmailChange}
          error={!!emailError} // El `!!` convierte la cadena de error a booleano
          disabled={resetSuccess} // Deshabilitar si ya se envió exitosamente
        />
        {emailError && (
          <p className="text-red-500 text-xs font-poppins mb-5">{emailError}</p>
        )}
        <Button 
          onClick={handleButtonClick} 
          className="shadow-md mb-4 mt-9" 
          disabled={!isEmailValid || resetSuccess || loading}
        >
          {resetSuccess ? 'Código enviado' : 'Enviar código'}
        </Button>
        <a onClick={() => navigate('/')} className="mt-15 text-header-blue hover:underline font-bold cursor-pointer">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset;