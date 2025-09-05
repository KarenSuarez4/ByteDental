// src/pages/PasswordReset.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LoadingScreen from '../components/LoadingScreen';
import Button from '../components/Button';
import Input from '../components/Input';
import ProgressIndicator from '../components/ProgressIndicator';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
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

  const handleButtonClick = () => {
    if (emailError ||!email) {
      alert('Por favor, ingrese un correo electrónico válido antes de continuar.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/PasswordReset2');
    }, 1000);
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
        <Input 
          placeholder="Ingrese su correo electrónico"
          className="w-150 mb-4"
          value={email}
          onChange={handleEmailChange}
          error={!!emailError} // El `!!` convierte la cadena de error a booleano
        />
        {emailError && (
          <p className="text-red-500 text-xs font-poppins mb-5">{emailError}</p>
        )}
        <Button onClick={handleButtonClick} className="shadow-md mb-4 mt-9" disabled={!isEmailValid}>
          Enviar correo
        </Button>
        <a onClick={() => navigate('/')} className="mt-15 text-header-blue hover:underline font-bold cursor-pointer">
          Volver a Inicio de sesión
        </a>
      </main>
    </div>
  );
};

export default PasswordReset;