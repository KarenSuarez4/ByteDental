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
    ASSISTANT = "Asistente"
    
    # Permisos de gestión de usuarios (solo ADMIN)
    USER_MANAGEMENT = [ADMIN]
    
    # Permisos de auditoría (solo AUDITOR)
    AUDIT_ACCESS = [AUDITOR]
    
    # Permisos básicos (todos los roles autenticados)
    BASIC_ACCESS = [ADMIN, AUDITOR, DENTIST, ASSISTANT]
    
    # Permisos para pacientes, guardianes y personas
    # CRUD completo: Solo ASSISTANT
    # Solo lectura: DENTIST
    # ADMIN NO tiene acceso a información clínica
    PATIENT_WRITE = [ASSISTANT]  # Solo ASSISTANT puede crear, actualizar, eliminar pacientes
    PATIENT_READ = [ASSISTANT, DENTIST]  # ASSISTANT y DENTIST pueden leer información de pacientes
    
    GUARDIAN_WRITE = [ASSISTANT]  # Solo ASSISTANT puede crear, actualizar, eliminar guardianes
    GUARDIAN_READ = [ASSISTANT, DENTIST]  # ASSISTANT y DENTIST pueden leer información de guardianes
    
    PERSON_WRITE = [ASSISTANT]  # Solo ASSISTANT puede crear, actualizar, eliminar personas
    PERSON_READ = [ASSISTANT, DENTIST]  # ASSISTANT y DENTIST pueden leer información de personas

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

def require_roles(allowed_roles: List[str]):
    """
    Dependency factory para validar que el usuario tenga uno de los roles permitidos
    """
    async def role_checker(request: Request, db: Session = Depends(get_db)) -> User:
        user = await get_current_user(request, db)
        
        # Log para depuración del rol
        user_role = user.role.name if user.role else "Sin rol asignado"
        logger.info(f"--- DEBUG AUTH --- Usuario: {user.email}, Rol detectado: '{user_role}', Roles permitidos: {allowed_roles}")

        if not user.role or user.role.name not in allowed_roles:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {roles_str}"
            )
        
        return user
    return role_checker

# Dependencies específicas para pacientes
async def require_patient_read(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to read patient data"""
    return await require_roles(RolePermissions.PATIENT_READ)(request, db)

async def require_patient_write(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to write patient data"""
    return await require_roles(RolePermissions.PATIENT_WRITE)(request, db)

# Dependencies específicas para guardianes
async def require_guardian_read(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to read guardian data"""
    return await require_roles(RolePermissions.GUARDIAN_READ)(request, db)

async def require_guardian_write(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to write guardian data"""
    return await require_roles(RolePermissions.GUARDIAN_WRITE)(request, db)

# Dependencies específicas para personas
async def require_person_read(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to read person data"""
    return await require_roles(RolePermissions.PERSON_READ)(request, db)

async def require_person_write(request: Request, db: Session = Depends(get_db)) -> User:
    """Require permissions to write person data"""
    return await require_roles(RolePermissions.PERSON_WRITE)(request, db)

# Dependencies generales
async def require_basic_access(request: Request, db: Session = Depends(get_db)) -> User:
    """Require basic access permissions (all authenticated roles)"""
    return await require_roles(RolePermissions.BASIC_ACCESS)(request, db)

async def require_user_management(request: Request, db: Session = Depends(get_db)) -> User:
    """Require user management permissions (only ADMIN)"""
    return await require_roles(RolePermissions.USER_MANAGEMENT)(request, db)

def get_user_context(request: Request, db: Session = Depends(get_db)) -> tuple[Optional[int], str]:
    """
    Obtener contexto del usuario actual para auditoría
    Retorna (user_id, user_ip)
    """
    try:
        # Obtener IP del request
        user_ip = request.client.host if request.client else "unknown"
        
        # Intentar obtener usuario actual
        user = get_current_user_from_header(request, db)
        user_id = user.id if user else None
        
        return user_id, user_ip
        
    except Exception as e:
        logger.error(f"Error obteniendo contexto de usuario: {e}")
        return None, request.client.host if request.client else "unknown"
