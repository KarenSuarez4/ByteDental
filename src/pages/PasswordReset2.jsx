import React, { useState } from 'react';
import Header from '../components/Header';
import ProgressIndicator from '../components/ProgressIndicator';
import Button from '../components/Button';
import OtpInput from '../components/Otpinput';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';

function cn(...args) {
  return twMerge(clsx(args));
}

const PasswordReset2 = () => {
  const navigate = useNavigate();
  const [otpCode, setOtpCode] = useState('');
  const [showError, setShowError] = useState(false);

  const handleOtpComplete = (code) => {
    setOtpCode(code);
    console.log('Código OTP completado:', code);
    if (code === '1234') {
      setShowError(false);
      console.log('Código validado. Procediendo a cambiar contraseña.');
      navigate('/PasswordReset3');
    } else {
      setShowError(true);
      console.log('Código incorrecto.');
    }
  };

  const handleVerify = () => {
    if (otpCode.length === 4) {
      alert(`Verificando código: ${otpCode}`);
    } else {
      alert('Por favor, ingresa el código completo de 4 dígitos.');
    }
  };

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
          {showError && (
            <p className="text-red-500 text-xs font-poppins mt-2 text-center">
              Código incorrecto.
            </p>
          )}
        </div>

        <Button onClick={handleVerify} disabled={otpCode.length !== 4}>
          Verificar
        </Button>
        <a href="#" className="text-primary-blue hover:underline mt-4">
          Reenviar código
        </a>
        <a onClick={() => navigate('/')} className="mt-8 text-header-blue hover:underline font-bold cursor-pointer">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset2;