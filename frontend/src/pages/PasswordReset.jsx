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

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleButtonClick();
    }
  };

  const handleButtonClick = async () => {
    console.log('🔄 [PasswordReset] Iniciando proceso de recuperación de contraseña');
    console.log('📧 [PasswordReset] Email ingresado:', email);
    console.log('🌐 [PasswordReset] Environment:', import.meta.env.MODE);
    console.log('🔗 [PasswordReset] API URL:', import.meta.env.VITE_API_URL);
    
    if (emailError || !email) {
      console.log('❌ [PasswordReset] Error de validación - emailError:', emailError, 'email:', email);
      setResetError('Por favor, ingrese un correo electrónico válido antes de continuar.');
      return;
    }

    console.log('⏳ [PasswordReset] Estableciendo estado de carga...');
    setLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      console.log('🚀 [PasswordReset] Llamando a otpService.sendOTP con email:', email);
      console.log('📍 [PasswordReset] Timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      const result = await otpService.sendOTP(email);
      const endTime = performance.now();
      
      console.log('✅ [PasswordReset] Respuesta de sendOTP recibida');
      console.log('⏱️ [PasswordReset] Tiempo de respuesta:', (endTime - startTime).toFixed(2), 'ms');
      console.log('📦 [PasswordReset] Resultado completo:', result);
      
      if (result.success) {
        console.log('✅ [PasswordReset] Envío exitoso - estableciendo success state');
        setResetSuccess(true);
        
        // Guardar el email en localStorage para usarlo en la siguiente página
        localStorage.setItem('resetEmail', email);
        console.log('💾 [PasswordReset] Email guardado en localStorage');
        
        setTimeout(() => {
          console.log('🔄 [PasswordReset] Navegando a PasswordReset2');
          setLoading(false);
          navigate('/PasswordReset2');
        }, 2000);
      } else {
        console.log('❌ [PasswordReset] sendOTP falló - result.success = false');
        console.log('🔍 [PasswordReset] Mensaje de error:', result.message);
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ [PasswordReset] Error completo capturado:', error);
      console.error('🔍 [PasswordReset] Error name:', error.name);
      console.error('🔍 [PasswordReset] Error message:', error.message);
      console.error('🔍 [PasswordReset] Error stack:', error.stack);
      
      // Log adicional para errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 [PasswordReset] Error de red detectado - posible problema de conectividad');
      }
      
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
      
      console.log('💬 [PasswordReset] Mensaje de error final:', errorMessage);
      setResetError(errorMessage);
      setLoading(false);
    }
  };

  const isEmailValid =!emailError && email.length > 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className=" max-h-[calc(100vh-94px)] w-full flex flex-col">
      <main className="flex-1 flex flex-col items-center bg-gray-50 mt-10">
        <ProgressIndicator step={1} />
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-12">
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
          className="w-150 mb-2 text-18"
          value={email}
          onChange={handleEmailChange}
          onKeyPress={handleKeyPress}
          error={!!emailError} // El `!!` convierte la cadena de error a booleano
          disabled={resetSuccess} // Deshabilitar si ya se envió exitosamente
        />
        {emailError && (
          <p className="text-red-500 text-18 font-poppins mb-5">{emailError}</p>
        )}
        <Button 
          onClick={handleButtonClick} 
          className="shadow-md mb-2 mt-9 text-18" 
          disabled={!isEmailValid || resetSuccess || loading}
        >
          {resetSuccess ? 'Código enviado' : 'Enviar código'}
        </Button>
        <a onClick={() => navigate('/')} className="mt-13 text-header-blue hover:underline font-bold cursor-pointer text-18">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset;