from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from ..database import get_db
from ..models.user_models import User
from ..services.auditoria_service import AuditoriaService

router = APIRouter(prefix="/auth", tags=["authentication"])

# Schemas para autenticación
class LoginEventRequest(BaseModel):
    email: EmailStr
    success: bool
    error_message: Optional[str] = None
    firebase_uid: Optional[str] = None

class LogoutEventRequest(BaseModel):
    firebase_uid: str

class LoginEventResponse(BaseModel):
    message: str
    audit_id: str
    user_uid: Optional[str] = None
    user_name: Optional[str] = None

def get_client_ip(request: Request) -> str:
    """Obtener la IP del cliente"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/login-event", response_model=LoginEventResponse)
async def register_login_event(
    login_data: LoginEventRequest, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    Registrar evento de login en auditoría
    
    Este endpoint debe ser llamado desde el frontend cuando:
    - Un usuario hace login exitoso
    - Un usuario falla en el login
    """
    
    try:
        # Buscar el usuario por email o por firebase_uid
        user = None
        user_uid = "unknown"
        user_name = "Usuario desconocido"
        
        if login_data.success and login_data.firebase_uid:
            # Login exitoso - buscar por firebase_uid
            user = db.query(User).filter(User.uid == login_data.firebase_uid).first()
        else:
            # Login fallido o sin firebase_uid - buscar por email
            user = db.query(User).filter(User.email == login_data.email).first()
        
        if user:
            user_uid = str(user.uid)
            user_name = f"{user.first_name} {user.last_name}"
            
            # Verificar si el usuario está temporalmente bloqueado
            from datetime import datetime, timezone
            locked_until_value = getattr(user, 'locked_until', None)
            if locked_until_value is not None:
                now_utc = datetime.now(timezone.utc)
                if locked_until_value > now_utc:  # type: ignore
                    tiempo_restante = int((locked_until_value - now_utc).total_seconds() / 60)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": f"Cuenta bloqueada temporalmente. Intenta nuevamente en {tiempo_restante} minuto(s).",
                            "locked_until": locked_until_value.isoformat(),
                            "attempts": getattr(user, 'failed_login_attempts', 0)
                        }
                    )
                
                # Si el bloqueo expiró, resetear los intentos
                setattr(user, 'failed_login_attempts', 0)
                setattr(user, 'locked_until', None)
                db.commit()
            
            # Verificar si el usuario está activo
            if user.is_active is False:
                # Usuario desactivado intentando hacer login
                audit_record = AuditoriaService.registrar_login(
                    db=db,
                    usuario_id=str(user.uid),
                    exitoso=False,
                    ip_origen=get_client_ip(request)
                )
                
                return LoginEventResponse(
                    message="Login de usuario desactivado registrado",
                    audit_id=str(audit_record.id),
                    user_uid=str(user.uid),
                    user_name=user_name
                )
        
        # Registrar evento de login normal
        audit_record = AuditoriaService.registrar_login(
            db=db,
            usuario_id=user_uid,
            exitoso=login_data.success,
            ip_origen=get_client_ip(request),
            usuario_email=login_data.email if not login_data.success else None
        )
        
        # Manejar intentos fallidos y bloqueo de cuenta
        if not login_data.success and user:
            from datetime import datetime, timezone, timedelta
            
            # Incrementar contador de intentos fallidos
            current_attempts = getattr(user, 'failed_login_attempts', 0)
            new_attempts = current_attempts + 1
            setattr(user, 'failed_login_attempts', new_attempts)
            db.commit()
            
            # Si alcanzó 3 intentos, bloquear por 15 minutos
            if new_attempts >= 3:  # type: ignore
                lock_time = datetime.now(timezone.utc) + timedelta(minutes=15)
                setattr(user, 'locked_until', lock_time)
                db.commit()
                
                # Registrar el bloqueo en auditoría
                AuditoriaService.registrar_evento(
                    db=db,
                    usuario_id=user_uid,
                    tipo_evento="ACCOUNT_LOCKED",
                    registro_afectado_id=user_uid,
                    registro_afectado_tipo="users",
                    descripcion_evento=f"Cuenta bloqueada temporalmente por intentos fallidos: {user_name}",
                    detalles_cambios={
                        "accion": "account_locked",
                        "failed_attempts": new_attempts,
                        "locked_until": lock_time.isoformat(),
                        "email": login_data.email
                    },
                    ip_origen=get_client_ip(request),
                    usuario_rol=user.role.name if user.role else None,
                    usuario_email=login_data.email
                )
                
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "message": "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en 15 minutos.",
                        "locked_until": lock_time.isoformat(),
                        "attempts": new_attempts,
                        "is_locked": True
                    }
                )
            else:
                # Si aún no llega a 3 intentos, informar intentos restantes
                remaining_attempts = 3 - new_attempts
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "message": f"Credenciales incorrectas. Intentos restantes: {remaining_attempts}",
                        "attempts": new_attempts,
                        "remaining": remaining_attempts,
                        "is_locked": False
                    }
                )
        
        # Si el login fue exitoso, resetear intentos fallidos
        if login_data.success and user:
            setattr(user, 'failed_login_attempts', 0)
            setattr(user, 'locked_until', None)
            db.commit()
        
        # Si el login falló, guardar SIEMPRE el email ingresado
        if not login_data.success and login_data.error_message:
            user_role = user.role.name if user and user.role else None
            # SIEMPRE usar el email ingresado por el usuario
            user_email = login_data.email
            
            audit_record_with_error = AuditoriaService.registrar_evento(
                db=db,
                usuario_id=user_uid,
                tipo_evento="LOGIN_FAILED_DETAILED",
                registro_afectado_id=user_uid,
                registro_afectado_tipo="users",
                descripcion_evento=f"Login fallido: {user_name if user else 'Usuario desconocido'}",
                detalles_cambios={
                    "accion": "login_failed",
                    "error_message": login_data.error_message,
                    "email": login_data.email,
                    "failed_attempts": getattr(user, 'failed_login_attempts', 0) if user else 0
                },
                ip_origen=get_client_ip(request),
                usuario_rol=user_role,
                usuario_email=user_email
            )
        
        message = "Login exitoso registrado" if login_data.success else "Login fallido registrado"
        
        return LoginEventResponse(
            message=message,
            audit_id=str(audit_record.id),
            user_uid=user_uid if user else None,
            user_name=user_name if user else None
        )
        
    except Exception as e:
        logging.error(f"Error registrando evento de login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar evento de login: {str(e)}"
        )

@router.post("/logout-event")
async def register_logout_event(
    logout_data: LogoutEventRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registrar evento de logout en auditoría
    """
    
    try:
        # Buscar el usuario
        user = db.query(User).filter(User.uid == logout_data.firebase_uid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Registrar evento de logout
        audit_record = AuditoriaService.registrar_logout(
            db=db,
            usuario_id=str(user.uid),
            ip_origen=get_client_ip(request)
        )
        
        return {
            "message": "Logout registrado exitosamente",
            "audit_id": str(audit_record.id),
            "user_uid": str(user.uid)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error registrando evento de logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar evento de logout: {str(e)}"
        )

@router.get("/user-status/{firebase_uid}")
async def get_user_status(firebase_uid: str, db: Session = Depends(get_db)):
    """
    Verificar el estado del usuario (activo/inactivo)
    Útil para el frontend antes de permitir el login
    """
    
    try:
        user = db.query(User).filter(User.uid == firebase_uid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return {
            "uid": str(user.uid),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": bool(user.is_active),
            "role_id": user.role_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error obteniendo estado del usuario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado del usuario: {str(e)}"
        )

@router.get("/check-lock-status")
async def check_lock_status(email: str, db: Session = Depends(get_db)):
    """
    Verificar si una cuenta está bloqueada por email
    Útil para verificar antes de intentar el login
    """
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # No revelamos si el usuario existe o no por seguridad
            return {
                "is_locked": False,
                "message": "OK"
            }
        
        # Verificar si el usuario está temporalmente bloqueado
        from datetime import datetime, timezone
        locked_until_value = getattr(user, 'locked_until', None)
        if locked_until_value is not None:
            now_utc = datetime.now(timezone.utc)
            if locked_until_value > now_utc:  # type: ignore
                tiempo_restante = int((locked_until_value - now_utc).total_seconds() / 60)
                return {
                    "is_locked": True,
                    "message": f"Cuenta bloqueada temporalmente. Intenta nuevamente en {tiempo_restante} minuto(s).",
                    "locked_until": locked_until_value.isoformat(),
                    "attempts": getattr(user, 'failed_login_attempts', 0)
                }
        
        return {
            "is_locked": False,
            "message": "OK"
        }
        
    except Exception as e:
        logging.error(f"Error verificando estado de bloqueo: {e}")
        # No revelamos errores internos
        return {
            "is_locked": False,
            "message": "OK"
        }
