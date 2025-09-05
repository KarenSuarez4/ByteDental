import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import InputPassword from '../components/InputPassword';
import Button from '../components/Button';
import GoogleSignIn from '../components/GoogleSignIn';
import LoadingScreen from '../components/LoadingScreen';
import { loginWithGoogle } from '../Firebase/client';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- Lógica de Manejo de Entradas y Validación  ---
  const handleUsernameChange = (event) => {
    const value = event.target.value;
    setUsername(value);

    if (!value.includes('@') || !value.includes('.')) {
      setUsernameError('Ingrese un correo electrónico válido');
    } else {
      setUsernameError('');
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value.length < 8) {
      setPasswordError('"La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula y un número."');
    } else {
      setPasswordError('');
    }
  };

  // --- Funciones Placeholder para la Autenticación de Firebase ---
  const handleLogin = async () => {
    // Validaciones finales antes de intentar el login
    if (usernameError || passwordError ||!username ||!password) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }

    console.log('Intentando iniciar sesión con:', { username, password });
    // Aquí iría la lógica de autenticación con Firebase (ej. signInWithEmailAndPassword)
    try {
      // const userCredential = await signInWithEmailAndPassword(auth, username, password);
      // console.log('Usuario autenticado:', userCredential.user);
      alert('Inicio de sesión exitoso (simulado)!');
      // Redirigir al usuario, etc.
    } catch (error) {
      console.error('Error de inicio de sesión (simulado):', error.message);
      alert('Error de inicio de sesión: ' + error.message);
    }
  };


  // Manejar clic en "¿Olvidó su contraseña?"
  const handleForgotPasswordClick = () => {
    setLoading(true); // Mostrar pantalla de carga
    setTimeout(() => {
      setLoading(false); 
      navigate('/PasswordReset'); // Redirigir
    }, 2000);
  };

  // Deshabilita el botón si hay errores o campos vacíos
  const isFormValid =!usernameError &&!passwordError && username.length > 0 && password.length > 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen **w-full** flex flex-col overflow-hidden">
      <div className="flex flex-col-reverse md:flex-row flex-1">
        {/* Lado izquierdo: Formulario de Login */}
        <main className="flex-1 flex flex-col items-center justify-center bg-[#FBFCFB]">
          {/* Título "Inicio de Sesión" con icono arroba */}
          <div className="flex flex-col items-center mb-7">
            <img src="./images/bytedental-logoAzul.png" alt="Icono arroba" className="size-20 w-37 mb-5 mt-3" />
            <h1 className="text-header-blue text-46 font-bold font-poppins">
              Inicio de Sesión
            </h1>
          </div>

          {/* Campo de Usuario con validación de email */}
          <div className="mb-5 w-[338px]">
            <label htmlFor="username" className="block text-header-blue text-sm font-poppins mb-1 font-bold">
              Usuario
            </label>
            <Input
              id="username"
              placeholder="Ingrese su correo electrónico"
              value={username}
              onChange={handleUsernameChange}
              error={!!usernameError}
            />
            {usernameError && (
              <p className="text-red-500 text-xs font-poppins mt-0">{usernameError}</p>
            )}
          </div>

          {/* Campo de Contraseña */}
          <div className="mb-8 w-[338px]">
            <label htmlFor="password" className="block text-header-blue text-sm font-poppins mb-1 font-bold">
              Contraseña
            </label>
            <InputPassword
              id="password"
              placeholder="************"
              value={password}
              onChange={handlePasswordChange}
              error={!!passwordError}
            />
            {passwordError && (
              <p className="text-red-500 text-xs font-poppins mt-2">{passwordError}</p>
            )}
          </div>

          {/* Enlace ¿Olvidó su contraseña? */}
          <a
            onClick={handleForgotPasswordClick}
            className="text-header-blue hover:underline text-sm font-poppins mb-5 self-start ml-[calc(50%-169px)] font-bold cursor-pointer" 
          >
              ¿Olvidó su contraseña?
          </a>

          {/* Botón de Ingresar */}
          <Button onClick={handleLogin} className="shadow-md mb-5" disabled={!isFormValid}>
            Ingresar
          </Button>

          {/* Divisor "O inicia sesión con" */}
          <div className="flex items-center w-[338px] mb-6">
            <hr className="flex-grow border-t border-gray-line" />
            <span className="px-4 text-gray-500 text-sm font-poppins">O</span>
            <hr className="flex-grow border-t border-gray-line" />
          </div>

          {/* Botón de Google Sign-In */}
          <GoogleSignIn onClick={loginWithGoogle} className="shadow-md mb-2" />
        </main>

        {/* Lado derecho: Imagen grande */}
        <div className="flex-1 bg-gray-200">
          <img
            src="./images/digital-tooth.png"
            alt="Imagen de fondo de inicio de sesión"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;