from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerification(BaseModel):
    email: EmailStr
    otp_code: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_at: Optional[datetime] = None

class OTPStore:
    """Clase simple para almacenar códigos OTP en memoria"""
    def __init__(self):
        self._otps = {}  # {email: {"code": str, "expires_at": datetime}}
    
    def store_otp(self, email: str, code: str, expires_at: datetime):
        """Almacena un código OTP para un email"""
        self._otps[email] = {
            "code": code,
            "expires_at": expires_at
        }
    
    def verify_otp(self, email: str, code: str) -> bool:
        """Verifica si un código OTP es válido y no ha expirado"""
        if email not in self._otps:
            return False
        
        stored_data = self._otps[email]
        current_time = datetime.now()
        
        # Verificar si el código no ha expirado
        if current_time > stored_data["expires_at"]:
            # Limpiar código expirado
            del self._otps[email]
            return False
        
        # Verificar si el código coincide
        if stored_data["code"] == code:
            # Código válido, limpiar después de uso
            del self._otps[email]
            return True
        
        return False
    
    def remove_otp(self, email: str):
        """Remueve un código OTP"""
        if email in self._otps:
            del self._otps[email]
    
    def get_otp_info(self, email: str) -> Optional[dict]:
        """Obtiene información del OTP sin verificarlo"""
        return self._otps.get(email)

# Instancia global del almacén OTP
otp_store = OTPStore()
