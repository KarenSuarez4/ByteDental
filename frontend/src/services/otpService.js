// src/services/otpService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const otpService = {
  // Enviar código OTP
  async sendOTP(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error enviando código OTP');
      }

      return {
        success: true,
        message: data.message,
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('Error enviando OTP:', error);
      return {
        success: false,
        message: error.message || 'Error enviando código OTP'
      };
    }
  },

  // Verificar código OTP
  async verifyOTP(email, otpCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp_code: otpCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Código OTP inválido');
      }

      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error verificando OTP:', error);
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
