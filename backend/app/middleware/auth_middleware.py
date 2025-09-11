"""
Middleware de autenticación y autorización por roles
"""
from functools import wraps
from fastapi import HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..database import get_db
from ..models.user_models import User
from ..models.rol_models import Role
from ..services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)

class RolePermissions:
    """Definición de permisos por rol"""
    
    # Roles del sistema (nombres que existen en la BD)
    ADMIN = "Administrator"
    AUDITOR = "Auditor"
    DENTIST = "Doctor"
    ASSISTANT = "Assistant"
    RECEPTIONIST = "Receptionist"  # Por si se agrega después
    
    # Permisos de gestión de usuarios (solo ADMIN)
    USER_MANAGEMENT = [ADMIN]
    
    # Permisos de auditoría (solo AUDITOR)
    AUDIT_ACCESS = [AUDITOR]
    
    # Permisos básicos (todos los roles autenticados)
    BASIC_ACCESS = [ADMIN, AUDITOR, DENTIST, ASSISTANT, RECEPTIONIST]

def get_current_user_from_header(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """
    Obtener usuario actual desde el header Authorization
    """
    try:
        # Obtener token del header Authorization
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return None
        
        token = authorization.split("Bearer ")[1]
        
        # Verificar token con Firebase
        decoded_token = FirebaseService.verify_token(token)
        if not decoded_token:
            return None
        
        firebase_uid = decoded_token.get("uid")
        if not firebase_uid:
            return None
        
        # Buscar usuario en la base de datos
        user = db.query(User).join(Role).filter(
            User.uid == firebase_uid,
            User.is_active == True
        ).first()
        
        return user
        
    except Exception as e:
        logger.error(f"Error obteniendo usuario actual: {e}")
        return None

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency para obtener el usuario actual autenticado
    """
    user = get_current_user_from_header(request, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización requerido"
        )
    
    return user

async def get_current_admin_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency para obtener el usuario actual que debe ser administrador
    """
    user = await get_current_user(request, db)
    
    if not user.role or user.role.name != RolePermissions.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de administrador"
        )
    
    return user

async def get_current_auditor_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency para obtener el usuario actual que debe ser auditor
    """
    user = await get_current_user(request, db)
    
    if not user.role or user.role.name != RolePermissions.AUDITOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de auditor"
        )
    
    return user
