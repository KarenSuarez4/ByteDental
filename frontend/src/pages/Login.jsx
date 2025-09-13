import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import InputPassword from '../components/InputPassword';
import Button from '../components/Button';
import GoogleSignIn from '../components/GoogleSignIn';
import LoadingScreen from '../components/LoadingScreen';
import { loginWithGoogle, loginWithEmailAndPassword, logout } from '../Firebase/client';
import { 
  registerLoginEvent, 
  checkUserActiveStatus 
} from '../services/authAuditService';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, userRole, mustChangePassword } = useAuth();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (isAuthenticated && userRole) {
      console.log('Login: Usuario ya autenticado, redirigiendo...', { userRole, mustChangePassword });
      if (mustChangePassword) {
        navigate('/force-password-change');
      } else {
        // Redirigir según el rol
        if (userRole === "Administrador") {
          navigate('/users/register');
        } else if (userRole === "Doctor" || userRole === "Asistente") {
          navigate('/patients');
        } else if (userRole === "Auditor") {
          navigate('/audit-logs');
        } else {
          navigate('/login');
        }
      }
    }
  }, [isAuthenticated, userRole, mustChangePassword, navigate]);

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
    setPasswordError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid) {
        handleLogin();
      }
    }
  };

  // Función para manejar el envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      handleLogin();
    }
  };

  // --- Funciones de Autenticación con Firebase ---
  const handleLogin = async () => {
    if (usernameError || !username || !password) {
      setLoginError('Por favor, completa todos los campos correctamente.');
      return;
    }

    setLoading(true);
    setLoginError('');

    let user = null;
    let loginSuccessful = false;

    try {
      // Intentar login con Firebase
      const userCredential = await loginWithEmailAndPassword(username, password);
      
      // Verificar si userCredential es directamente el usuario o contiene una propiedad user
      user = userCredential.user || userCredential;
      
      // Verificar que el usuario se haya obtenido correctamente
      if (!user || !user.uid) {
        throw new Error('No se pudo obtener la información del usuario de Firebase');
      }
      
      loginSuccessful = true;
      
      // Verificar si el usuario está activo en el backend
      try {
        const isActive = await checkUserActiveStatus(user.uid);
        if (isActive === false) {
          // Usuario existe pero está desactivado
          await registerLoginEvent(username, false, "Usuario desactivado", user.uid);
          await logout();
          setLoginError('Tu cuenta ha sido desactivada. Contacta al administrador.');
          return;
        } else if (isActive === null) {
          // Error al verificar estado - continuar con el login pero registrar warning
        }
      } catch (statusError) {
        // Continuar con el login aunque no se pueda verificar el estado
      }
      
      // Registrar login exitoso en auditoría
      try {
        await registerLoginEvent(username, true, null, user.uid);
      } catch (auditError) {
        // No bloquear el login por errores de auditoría
      }
      
      // Verificar si el usuario necesita cambiar contraseña
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Si debe cambiar contraseña, redirigir a ForcePasswordChange
          if (userData.must_change_password) {
            navigate('/force-password-change');
            return;
          }
        }
      } catch (userInfoError) {
        console.error('Error obteniendo información del usuario:', userInfoError);
        // Continuar con redirección automática - App.jsx manejará la redirección
      }
      
      // App.jsx se encarga de la redirección automática basada en el estado de autenticación
      
    } catch (error) {
      // Solo registrar como LOGIN_FAILED si realmente falló el login de Firebase
      if (!loginSuccessful) {
        try {
          await registerLoginEvent(username, false, error.message);
        } catch (auditError) {
          // Error registrando en auditoría - continuar
        }
      }
      
      // Mostrar error al usuario
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejar inicio de sesión con Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setLoginError('');

    let user = null;
    let loginSuccessful = false;

    try {
      // Intentar login con Google
      const googleUser = await loginWithGoogle();
      
      // Verificar si googleUser es directamente el usuario o contiene una propiedad user
      user = googleUser.user || googleUser;
      
      // Verificar que el usuario se haya obtenido correctamente
      if (!user || !user.uid || !user.email) {
        throw new Error('No se pudo obtener la información del usuario de Google');
      }
      
      loginSuccessful = true;
      
      // Verificar si el usuario está activo en el backend
      try {
        const isActive = await checkUserActiveStatus(user.uid);
        if (isActive === false) {
          // Usuario existe pero está desactivado
          await registerLoginEvent(user.email, false, "Usuario desactivado", user.uid);
          await logout();
          setLoginError('Tu cuenta ha sido desactivada. Contacta al administrador.');
          return;
        } else if (isActive === null) {
          // Error al verificar estado - continuar con el login pero registrar warning
        }
      } catch (statusError) {
        // Continuar con el login aunque no se pueda verificar el estado
      }
      
      // Registrar login exitoso en auditoría
      try {
        await registerLoginEvent(user.email, true, null, user.uid);
      } catch (auditError) {
        // No bloquear el login por errores de auditoría
      }
      
      // Verificar si el usuario necesita cambiar contraseña
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Si debe cambiar contraseña, redirigir a ForcePasswordChange
          if (userData.must_change_password) {
            navigate('/force-password-change');
            return;
          }
        }
      } catch (userInfoError) {
        console.error('Error obteniendo información del usuario:', userInfoError);
        // Continuar con redirección automática - App.jsx manejará la redirección
      }
      
      // App.jsx se encarga de la redirección automática basada en el estado de autenticación
      
    } catch (error) {
      // Solo registrar como LOGIN_FAILED si realmente falló el login de Google
      if (!loginSuccessful) {
        try {
          await registerLoginEvent('google-signin-attempt', false, error.message);
        } catch (auditError) {
          // Error registrando en auditoría - continuar
        }
      }
      
      let errorMessage = 'Error al iniciar sesión con Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Inicio de sesión cancelado';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup bloqueado por el navegador';
          break;
        default:
          errorMessage = error.message;
      }
      
      setLoginError(errorMessage);
    } finally {
      setLoading(false);
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
  const isFormValid = !usernameError && username.length > 0 && password.length > 0;

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

          {/* Formulario de Login */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            {/* Mostrar error de login si existe */}
            {loginError && (
              <div className="mb-4 w-[338px] p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {loginError}
              </div>
            )}

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
                onKeyDown={handleKeyPress}
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
                onKeyDown={handleKeyPress}
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
            <Button type="submit" onClick={handleLogin} className="shadow-md mb-5" disabled={!isFormValid}>
              Ingresar
            </Button>
          </form>

          {/* Divisor "O inicia sesión con" */}
          <div className="flex items-center w-[338px] mb-6">
            <hr className="flex-grow border-t border-gray-line" />
            <span className="px-4 text-gray-500 text-sm font-poppins">O</span>
            <hr className="flex-grow border-t border-gray-line" />
          </div>

          {/* Botón de Google Sign-In */}
          <GoogleSignIn onClick={handleGoogleLogin} className="shadow-md mb-2" />
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