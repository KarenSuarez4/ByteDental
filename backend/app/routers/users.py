from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
import secrets
import string

from ..database import get_db
from ..models.user_models import User
from ..models.rol_models import Role
from ..services.firebase_service import FirebaseService
from ..services.auditoria_service import AuditoriaService
from ..services.email_service import EmailService
from ..middleware.auth_middleware import get_current_admin_user, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

def generate_temporary_password(length: int = 12) -> str:
    """Generar contraseña temporal segura para nuevos usuarios"""
    # Asegurar que tenga al menos una mayúscula, minúscula, número y símbolo
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    symbols = "!@#$%&*"
    
    # Garantizar al menos un carácter de cada tipo
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(symbols)
    ]
    
    # Completar el resto de la contraseña
    all_characters = lowercase + uppercase + digits + symbols
    for _ in range(length - 4):
        password.append(secrets.choice(all_characters))
    
    # Mezclar la contraseña
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)

# Schemas de Pydantic actualizados con nombres en inglés
class UserCreate(BaseModel):
    document_number: str
    document_type: str  # CC, TI, CE, PP
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    role_id: int
    specialty: Optional[str] = None
    # Nota: password será generada automáticamente por el sistema

class UserUpdate(BaseModel):
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    specialty: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    uid: str
    document_number: str
    document_type: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    role_id: int
    specialty: Optional[str]
    is_active: bool
    must_change_password: bool
    created_at: str
    updated_at: str
    role_name: Optional[str] = None

    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    """Schema para cambio de contraseña normal"""
    current_password: str
    new_password: str

class ForcePasswordChange(BaseModel):
    """Schema para cambio obligatorio de contraseña en primer login"""
    new_password: str
    confirm_password: str

def user_to_dict(user: User) -> Dict[str, Any]:
    """Convierte un objeto User a diccionario"""
    return {
        "uid": user.uid,
        "document_number": user.document_number,
        "document_type": user.document_type,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "role_id": user.role_id,
        "specialty": user.specialty,
        "is_active": user.is_active,
        "must_change_password": user.must_change_password,
        "created_at": user.created_at.isoformat() if user.created_at is not None else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at is not None else None,
        "role_name": user.role.name if hasattr(user, 'role') and user.role else None
    }

def get_client_ip(request: Request) -> str:
    """Obtener la IP del cliente"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Crear un nuevo usuario - Solo ADMINISTRADORES"""
    
    # Verificar si el email ya existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Verificar si el documento ya existe
    existing_doc = db.query(User).filter(User.document_number == user_data.document_number).first()
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento ya está registrado"
        )
    
    # Verificar que el rol existe
    role = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol especificado no existe"
        )
    
    firebase_uid = None
    temporal_password = None
    try:
        # Generar contraseña temporal para el nuevo usuario
        temporal_password = generate_temporary_password()
        
        # Crear usuario en Firebase
        try:
            firebase_uid = FirebaseService.create_firebase_user(
                email=user_data.email,
                password=temporal_password,
                display_name=f"{user_data.first_name} {user_data.last_name}",
                phone_number=user_data.phone
            )
        except Exception as firebase_error:
            error_message = str(firebase_error)
            if "EMAIL_EXISTS" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El email ya está registrado en el sistema de autenticación"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error al crear usuario en Firebase: {error_message}"
                )
        
        if not firebase_uid:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al crear usuario en Firebase"
            )
        
        # Crear usuario en la base de datos
        db_user = User(
            uid=firebase_uid,
            document_number=user_data.document_number,
            document_type=user_data.document_type,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            email=user_data.email,
            phone=user_data.phone,
            role_id=user_data.role_id,
            specialty=user_data.specialty,
            is_active=True,
            must_change_password=True  # Usuario debe cambiar contraseña en primer login
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_creacion_usuario(
            db=db,
            usuario_admin_id=str(current_user.uid),
            usuario_creado_id=firebase_uid,
            datos_usuario=user_to_dict(db_user),
            ip_origen=ip_cliente
        )
        
        # Enviar email de bienvenida con credenciales temporales
        try:
            email_service = EmailService()
            await email_service.send_welcome_email(
                to_email=user_data.email,
                user_name=f"{user_data.first_name} {user_data.last_name}",
                temporal_password=temporal_password,
                role_name=str(role.name)
            )
        except Exception as e:
            # Log el error pero no falla la creación del usuario
            print(f"Error enviando email de bienvenida: {e}")
        
        # Agregar rol para la respuesta
        db_user.role = role
        
        return UserResponse(**user_to_dict(db_user))
        
    except HTTPException:
        # Re-lanzar HTTPExceptions específicas
        raise
    except Exception as e:
        # Si hay error, limpiar Firebase si se creó
        if firebase_uid:
            try:
                FirebaseService.delete_firebase_user(firebase_uid)
            except:
                pass  # Ignorar errores al limpiar
        
        db.rollback()
        
        # Manejo específico de errores comunes
        error_message = str(e)
        if "EMAIL_EXISTS" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear usuario: {error_message}"
            )

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtener lista de usuarios - Solo ADMINISTRADORES
    
    Args:
        skip: Número de registros a saltar
        limit: Límite de registros a retornar
        include_inactive: Si incluir usuarios inactivos (por defecto False)
    """
    query = db.query(User).join(Role)
    
    # Filtrar por estado activo si no se solicita incluir inactivos
    if not include_inactive:
        query = query.filter(User.is_active == True)
    
    users = query.offset(skip).limit(limit).all()
    
    return [UserResponse(**user_to_dict(user)) for user in users]

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Obtener información del usuario actual autenticado"""
    user_dict = user_to_dict(current_user)
    # Agregar nombre del rol
    if current_user.role:
        user_dict["role_name"] = current_user.role.name
    return UserResponse(**user_dict)

@router.get("/{user_uid}", response_model=UserResponse)
def get_user(
    user_uid: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Obtener un usuario por UID - Solo ADMINISTRADORES"""
    user = db.query(User).join(Role).filter(User.uid == user_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return UserResponse(**user_to_dict(user))

@router.put("/{user_uid}", response_model=UserResponse)
def update_user(
    user_uid: str, 
    user_data: UserUpdate, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Actualizar un usuario - Solo ADMINISTRADORES"""
    user = db.query(User).filter(User.uid == user_uid).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Guardar datos anteriores para auditoría
    datos_anteriores = user_to_dict(user)
    
    # Verificar email único (si se está actualizando)
    if user_data.email and user_data.email != user.email:
        existing_email = db.query(User).filter(
            User.email == user_data.email, 
            User.uid != user_uid
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está en uso"
            )
    
    # Verificar documento único (si se está actualizando)
    if user_data.document_number and user_data.document_number != user.document_number:
        existing_doc = db.query(User).filter(
            User.document_number == user_data.document_number, 
            User.uid != user_uid
        ).first()
        if existing_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El documento ya está en uso"
            )
    
    # Verificar que el rol existe (si se está actualizando)
    role = None
    if user_data.role_id:
        role = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El rol especificado no existe"
            )
    
    try:
        # Actualizar datos en Firebase si es necesario
        firebase_updates = {}
        if user_data.first_name or user_data.last_name:
            display_name = f"{user_data.first_name or user.first_name} {user_data.last_name or user.last_name}"
            firebase_updates['display_name'] = display_name
        if user_data.email:
            firebase_updates['email'] = user_data.email
        if user_data.phone:
            firebase_updates['phone_number'] = user_data.phone
        
        if firebase_updates:
            FirebaseService.update_firebase_user(str(user.uid), **firebase_updates)
        
        # Actualizar en la base de datos
        for field, value in user_data.dict(exclude_unset=True).items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_actualizacion_usuario(
            db=db,
            usuario_admin_id=str(current_user.uid),
            usuario_actualizado_id=user_uid,
            datos_anteriores=datos_anteriores,
            datos_nuevos=user_to_dict(user),
            ip_origen=ip_cliente
        )
        
        # Obtener el rol actualizado
        if not role:
            role = db.query(Role).filter(Role.id == user.role_id).first()
        user.role = role
        
        return UserResponse(**user_to_dict(user))
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar usuario: {str(e)}"
        )

@router.delete("/{user_uid}")
def delete_user(
    user_uid: str, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Desactivar un usuario (soft delete) - Solo ADMINISTRADORES"""
    user = db.query(User).filter(User.uid == user_uid).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya está desactivado"
        )
    
    # Guardar datos para auditoría
    datos_usuario = user_to_dict(user)
    
    try:
        # Desactivar usuario en la base de datos (soft delete)
        setattr(user, 'is_active', False)
        db.commit()
        db.refresh(user)
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_desactivacion_usuario(
            db=db,
            usuario_admin_id=str(current_user.uid),
            usuario_desactivado_id=user_uid,
            datos_usuario=datos_usuario,
            ip_origen=ip_cliente
        )
        
        return {"message": "Usuario desactivado exitosamente", "user_uid": user_uid, "is_active": False}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al desactivar usuario: {str(e)}"
        )

@router.patch("/{user_uid}/activate")
def activate_user(
    user_uid: str, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Reactivar un usuario - Solo ADMINISTRADORES"""
    user = db.query(User).filter(User.uid == user_uid).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if user.is_active is True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya está activo"
        )
    
    # Guardar datos para auditoría
    datos_usuario = user_to_dict(user)
    
    try:
        # Reactivar usuario en la base de datos
        setattr(user, 'is_active', True)
        db.commit()
        db.refresh(user)
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_evento(
            db=db,
            usuario_id=str(current_user.uid),
            tipo_evento="ACTIVATE",
            registro_afectado_id=user_uid,
            registro_afectado_tipo="users",
            descripcion_evento=f"Usuario reactivado: {datos_usuario.get('first_name', 'N/A')} {datos_usuario.get('last_name', 'N/A')}",
            detalles_cambios={
                "accion": "reactivar_usuario",
                "estado_anterior": False,
                "estado_nuevo": True,
                "datos_usuario": datos_usuario
            },
            ip_origen=ip_cliente
        )
        
        return {"message": "Usuario reactivado exitosamente", "user_uid": user_uid, "is_active": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al reactivar usuario: {str(e)}"
        )

@router.get("/roles/", response_model=List[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener lista de roles disponibles - Para usuarios autenticados"""
    roles = db.query(Role).filter(Role.is_active == True).all()
    return roles

@router.put("/me/change-password", response_model=dict)
async def change_password(
    current_password: str,
    new_password: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cambiar contraseña del usuario actual"""
    try:
        # Actualizar contraseña en Firebase
        FirebaseService.update_firebase_user(str(current_user.uid), password=new_password)
        
        # Si es el primer cambio de contraseña, actualizar el flag
        if current_user.must_change_password is True:
            setattr(current_user, 'must_change_password', False)
            db.commit()
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_evento(
            db=db,
            usuario_id=str(current_user.uid),
            tipo_evento="PASSWORD_CHANGE",
            registro_afectado_id=str(current_user.uid),
            registro_afectado_tipo="users",
            descripcion_evento="Usuario cambió su contraseña",
            detalles_cambios={"message": "Contraseña actualizada", "must_change_password_updated": True},
            ip_origen=ip_cliente
        )
        
        return {"message": "Contraseña actualizada exitosamente", "must_change_password": current_user.must_change_password}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar contraseña: {str(e)}"
        )

@router.post("/force-password-change")
async def force_password_change(
    password_data: ForcePasswordChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint para cambio obligatorio de contraseña en primer login
    Solo funciona si must_change_password=True
    """
    try:
        # Verificar que el usuario debe cambiar contraseña
        if current_user.must_change_password is not True:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No es necesario cambiar la contraseña"
            )
        
        # Validar que las contraseñas coincidan
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Las contraseñas no coinciden"
            )
        
        # Validar complejidad de contraseña
        if len(password_data.new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 8 caracteres"
            )
        
        # Actualizar contraseña en Firebase
        FirebaseService.update_firebase_user(str(current_user.uid), password=password_data.new_password)
        
        # Marcar que ya no necesita cambiar contraseña
        setattr(current_user, 'must_change_password', False)
        db.commit()
        
        # Registrar en auditoría
        ip_cliente = get_client_ip(request)
        AuditoriaService.registrar_evento(
            db=db,
            usuario_id=str(current_user.uid),
            tipo_evento="FORCE_PASSWORD_CHANGE",
            registro_afectado_id=str(current_user.uid),
            registro_afectado_tipo="users",
            descripcion_evento="Usuario completó cambio obligatorio de contraseña",
            detalles_cambios={"message": "Primer cambio de contraseña completado"},
            ip_origen=ip_cliente
        )
        
        return {
            "message": "Contraseña actualizada exitosamente. Ya puedes usar el sistema",
            "must_change_password": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar contraseña: {str(e)}"
        )

