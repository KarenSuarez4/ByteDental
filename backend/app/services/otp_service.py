import random
import string
from datetime import datetime, timedelta
from typing import Optional
import logging
from app.models.otp_models import otp_store, OTPResponse
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

class OTPService:
    def __init__(self):
        self.otp_length = 4  # Códigos de 4 dígitos
        self.otp_expiry_minutes = 10  # Los códigos expiran en 10 minutos
    
    def generate_otp_code(self) -> str:
        """Genera un código OTP de 4 dígitos"""
        return ''.join(random.choices(string.digits, k=self.otp_length))
    
    async def send_otp_email(self, email: str) -> OTPResponse:
        """
        Genera y envía un código OTP por email
        """
        try:
            print(f"🐛 [OTP SERVICE] Iniciando send_otp_email para: {email}")
            
            # Generar código OTP
            print(f"🐛 [OTP SERVICE] Generando código OTP...")
            otp_code = self.generate_otp_code()
            print(f"🐛 [OTP SERVICE] Código generado: {otp_code}")
            
            # Calcular tiempo de expiración
            print(f"🐛 [OTP SERVICE] Calculando tiempo de expiración...")
            expires_at = datetime.now() + timedelta(minutes=self.otp_expiry_minutes)
            print(f"🐛 [OTP SERVICE] Expira en: {expires_at}")
            
            # Almacenar el código OTP
            print(f"🐛 [OTP SERVICE] Almacenando código en memoria...")
            otp_store.store_otp(email, otp_code, expires_at)
            print(f"🐛 [OTP SERVICE] Código almacenado exitosamente")
            
            # Enviar email con el código OTP
            print(f"🐛 [OTP SERVICE] Llamando a _send_otp_email...")
            success = await self._send_otp_email(email, otp_code)
            print(f"🐛 [OTP SERVICE] Resultado de _send_otp_email: {success}")
            
            if success:
                print(f"✅ [OTP SERVICE] Email enviado exitosamente")
                logger.info(f"Código OTP enviado exitosamente a {email}")
                return OTPResponse(
                    success=True,
                    message="Código OTP enviado exitosamente",
                    expires_at=expires_at
                )
            else:
                # Si falla el envío, limpiar el código almacenado
                print(f"❌ [OTP SERVICE] Fallo en envío, limpiando código...")
                otp_store.remove_otp(email)
                logger.error(f"Error enviando código OTP a {email}")
                return OTPResponse(
                    success=False,
                    message="Error enviando el código OTP"
                )
                
        except Exception as e:
            print(f"💥 [OTP SERVICE] Excepción capturada: {type(e).__name__}: {e}")
            import traceback
            print(f"💥 [OTP SERVICE] Stack trace: {traceback.format_exc()}")
            logger.error(f"Error generando/enviando OTP para {email}: {e}")
            return OTPResponse(
                success=False,
                message="Error interno del servidor"
            )
    
    def verify_otp_code(self, email: str, code: str) -> OTPResponse:
        """
        Verifica un código OTP
        """
        try:
            is_valid = otp_store.verify_otp(email, code)
            
            if is_valid:
                logger.info(f"Código OTP verificado exitosamente para {email}")
                return OTPResponse(
                    success=True,
                    message="Código OTP verificado exitosamente"
                )
            else:
                logger.warning(f"Código OTP inválido o expirado para {email}")
                return OTPResponse(
                    success=False,
                    message="Código OTP inválido o expirado"
                )
                
        except Exception as e:
            logger.error(f"Error verificando OTP para {email}: {e}")
            return OTPResponse(
                success=False,
                message="Error interno del servidor"
            )
    
    async def _send_otp_email(self, email: str, otp_code: str) -> bool:
        """
        Envía el email con el código OTP usando el template
        """
        try:
            print(f"🐛 [OTP _send_otp_email] Iniciando envío de email OTP")
            print(f"🐛 [OTP _send_otp_email] Email: {email}")
            print(f"🐛 [OTP _send_otp_email] Código: {otp_code}")
            
            template_data = {
                "otp_code": otp_code,
                "app_name": "ByteDental",
                "expiry_minutes": self.otp_expiry_minutes
            }
            
            print(f"🐛 [OTP _send_otp_email] Template data preparado: {template_data}")
            print(f"🐛 [OTP _send_otp_email] Llamando a email_service.send_email...")
            
            success = await email_service.send_email(
                to_email=email,
                subject="Código de verificación - ByteDental",
                body="",  # Se generará desde el template
                template_name="otp_email.html",
                template_data=template_data
            )
            
            print(f"🐛 [OTP _send_otp_email] Resultado de email_service: {success}")
            return success
            
        except Exception as e:
            print(f"💥 [OTP _send_otp_email] Excepción: {type(e).__name__}: {e}")
            import traceback
            print(f"💥 [OTP _send_otp_email] Stack trace: {traceback.format_exc()}")
            logger.error(f"Error enviando email OTP: {e}")
            return False
    
    def get_otp_status(self, email: str) -> Optional[dict]:
        """
        Obtiene el estado de un OTP sin verificarlo
        """
        otp_info = otp_store.get_otp_info(email)
        if otp_info:
            current_time = datetime.now()
            is_expired = current_time > otp_info["expires_at"]
            time_remaining = (otp_info["expires_at"] - current_time).total_seconds()
            
            return {
                "exists": True,
                "is_expired": is_expired,
                "time_remaining_seconds": max(0, time_remaining),
                "expires_at": otp_info["expires_at"]
            }
        
        return {"exists": False}

# Instancia global del servicio OTP
otp_service = OTPService()
