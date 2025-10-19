// src/services/otpService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Debug de variables de entorno (v2.0)
console.log('🔧 [otpService] Variables de entorno:');
console.log('🔧 [otpService] import.meta.env.MODE:', import.meta.env.MODE);
console.log('🔧 [otpService] import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔧 [otpService] API_BASE_URL final:', API_BASE_URL);
console.log('🔧 [otpService] Todas las variables VITE_:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
console.log('🔧 [otpService] Timestamp de deploy:', new Date().toISOString());

export const otpService = {
  // Enviar código OTP
  async sendOTP(email) {
    console.log('🚀 [otpService.sendOTP] Iniciando envío de OTP');
    console.log('📧 [otpService.sendOTP] Email:', email);
    console.log('🔗 [otpService.sendOTP] API_BASE_URL:', API_BASE_URL);
    console.log('🌐 [otpService.sendOTP] Full URL:', `${API_BASE_URL}/api/otp/send-otp`);
    
    try {
      const requestBody = { email };
      console.log('📦 [otpService.sendOTP] Request body:', requestBody);
      console.log('📍 [otpService.sendOTP] Timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      
      console.log('🔄 [otpService.sendOTP] Ejecutando fetch...');
      const response = await fetch(`${API_BASE_URL}/api/otp/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const endTime = performance.now();
      console.log('⏱️ [otpService.sendOTP] Fetch completado en:', (endTime - startTime).toFixed(2), 'ms');
      console.log('📊 [otpService.sendOTP] Response status:', response.status);
      console.log('📊 [otpService.sendOTP] Response statusText:', response.statusText);
      console.log('📊 [otpService.sendOTP] Response ok:', response.ok);
      console.log('🔗 [otpService.sendOTP] Response URL:', response.url);
      
      // Log headers de respuesta
      console.log('📋 [otpService.sendOTP] Response headers:');
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });

      console.log('📄 [otpService.sendOTP] Parseando respuesta JSON...');
      const data = await response.json();
      console.log('📦 [otpService.sendOTP] Data recibida:', data);

      if (!response.ok) {
        console.log('❌ [otpService.sendOTP] Response no ok - lanzando error');
        console.log('🔍 [otpService.sendOTP] Error detail:', data.detail);
        throw new Error(data.detail || 'Error enviando código OTP');
      }

      console.log('✅ [otpService.sendOTP] Envío exitoso');
      return {
        success: true,
        message: data.message,
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('❌ [otpService.sendOTP] Error completo:', error);
      console.error('🔍 [otpService.sendOTP] Error name:', error.name);
      console.error('🔍 [otpService.sendOTP] Error message:', error.message);
      console.error('🔍 [otpService.sendOTP] Error stack:', error.stack);
      
      // Información específica sobre el tipo de error
      if (error instanceof TypeError) {
        console.error('🌐 [otpService.sendOTP] TypeError detectado - posible problema de red/CORS');
        console.error('🔍 [otpService.sendOTP] TypeError details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      if (error.name === 'SyntaxError') {
        console.error('📄 [otpService.sendOTP] SyntaxError - posible respuesta no-JSON del servidor');
      }
      
      return {
        success: false,
        message: error.message || 'Error enviando código OTP'
      };
    }
  },

  // Verificar código OTP
  async verifyOTP(email, otpCode) {
    console.log('🔍 [otpService.verifyOTP] Iniciando verificación de OTP');
    console.log('📧 [otpService.verifyOTP] Email:', email);
    console.log('🔢 [otpService.verifyOTP] OTP Code:', otpCode);
    console.log('🔗 [otpService.verifyOTP] Full URL:', `${API_BASE_URL}/api/otp/verify-otp`);
    
    try {
      const requestBody = { 
        email, 
        otp_code: otpCode 
      };
      console.log('📦 [otpService.verifyOTP] Request body:', requestBody);
      console.log('📍 [otpService.verifyOTP] Timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      
      const response = await fetch(`${API_BASE_URL}/api/otp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = performance.now();
      console.log('⏱️ [otpService.verifyOTP] Fetch completado en:', (endTime - startTime).toFixed(2), 'ms');
      console.log('📊 [otpService.verifyOTP] Response status:', response.status);
      console.log('📊 [otpService.verifyOTP] Response ok:', response.ok);

      const data = await response.json();
      console.log('📦 [otpService.verifyOTP] Data recibida:', data);

      if (!response.ok) {
        console.log('❌ [otpService.verifyOTP] Verificación falló');
        console.log('🔍 [otpService.verifyOTP] Error detail:', data.detail);
        throw new Error(data.detail || 'Código OTP inválido');
      }

      console.log('✅ [otpService.verifyOTP] Verificación exitosa');
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('❌ [otpService.verifyOTP] Error completo:', error);
      console.error('🔍 [otpService.verifyOTP] Error name:', error.name);
      console.error('🔍 [otpService.verifyOTP] Error message:', error.message);
      
      return {
        success: false,
        message: error.message || 'Error verificando código OTP'
      };
    }
  },

  // Obtener estado del OTP
  async getOTPStatus(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/otp-status/${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error('Error obteniendo estado del OTP');
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo estado OTP:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }
};
