import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.auditoria_models import Audit
from ..models.user_models import User
from ..models.rol_models import Role

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))


class AuditoriaService:
    """Servicio para gestionar auditoría de cambios en el sistema"""
    
    @staticmethod
    def convertir_a_hora_colombia(timestamp_utc):
        """
        Convertir un timestamp UTC a hora de Colombia
        
        Args:
            timestamp_utc: datetime object en UTC
            
        Returns:
            datetime object en zona horaria de Colombia
        """
        if timestamp_utc and hasattr(timestamp_utc, 'astimezone'):
            return timestamp_utc.astimezone(COLOMBIA_TZ)
        return timestamp_utc
    
    @staticmethod
    def _obtener_datos_usuario(db: Session, usuario_id: str) -> tuple[Optional[str], Optional[str]]:
        """
        Obtener rol y email de un usuario
        
        Returns:
            tuple (rol_name, email) o (None, None) si no se encuentra
        """
        try:
            user = db.query(User).join(Role).filter(User.uid == usuario_id).first()
            if user and user.role:
                return str(user.role.name), str(user.email)
            return None, None
        except Exception:
            return None, None
    
    @staticmethod
    def registrar_evento(
        db: Session,
        usuario_id: str,
        tipo_evento: str,
        registro_afectado_id: str,
        registro_afectado_tipo: str,
        descripcion_evento: Optional[str] = None,
        detalles_cambios: Optional[Dict[str, Any]] = None,
        ip_origen: Optional[str] = None,
        usuario_rol: Optional[str] = None,
        usuario_email: Optional[str] = None
    ) -> Audit:
        """
        Registrar un evento de auditoría
        
        Args:
            db: Sesión de base de datos
            usuario_id: ID del usuario que realizó la acción
            tipo_evento: Tipo de evento (CREATE, UPDATE, DELETE, LOGIN, etc.)
            registro_afectado_id: ID del registro afectado
            registro_afectado_tipo: Tipo de entidad afectada (usuarios, roles, etc.)
            descripcion_evento: Descripción opcional del evento
            detalles_cambios: Detalles de los cambios en formato dict
            ip_origen: IP desde donde se originó la acción
            usuario_rol: Rol del usuario que realizó la acción
            usuario_email: Email del usuario que realizó la acción
            
        Returns:
            Objeto Audit creado
        """
        
        # Generar UUID para el evento
        evento_id = str(uuid.uuid4())
        
        # Obtener hora actual de Colombia
        hora_colombia = datetime.now(COLOMBIA_TZ)
        
        # Crear hash de integridad usando hora de Colombia
        datos_hash = f"{usuario_id}:{tipo_evento}:{registro_afectado_id}:{hora_colombia.isoformat()}"
        hash_integridad = hashlib.sha256(datos_hash.encode()).hexdigest()
        
        # Crear registro de auditoría con timestamp explícito de Colombia
        auditoria = Audit(
            id=evento_id,
            user_id=usuario_id,
            user_role=usuario_rol,
            user_email=usuario_email,
            event_type=tipo_evento,
            event_description=descripcion_evento,
            affected_record_id=registro_afectado_id,
            affected_record_type=registro_afectado_tipo,
            change_details=detalles_cambios,
            integrity_hash=hash_integridad,
            source_ip=ip_origen,
            event_timestamp=hora_colombia
        )
        
        db.add(auditoria)
        db.commit()
        db.refresh(auditoria)
        
        return auditoria
    
    @staticmethod
    def registrar_creacion_usuario(
        db: Session,
        usuario_admin_id: str,
        usuario_creado_id: str,
        datos_usuario: Dict[str, Any],
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar creación de usuario"""
        # Obtener rol y email del usuario admin
        admin_rol, admin_email = AuditoriaService._obtener_datos_usuario(db, usuario_admin_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_admin_id,
            tipo_evento="CREATE",
            registro_afectado_id=usuario_creado_id,
            registro_afectado_tipo="users",
            descripcion_evento=f"Usuario creado: {datos_usuario.get('first_name', 'N/A')} {datos_usuario.get('last_name', 'N/A')}",
            detalles_cambios={
                "accion": "crear_usuario",
                "datos_nuevos": datos_usuario
            },
            ip_origen=ip_origen,
            usuario_rol=admin_rol,
            usuario_email=admin_email
        )
    
    @staticmethod
    def registrar_actualizacion_usuario(
        db: Session,
        usuario_admin_id: str,
        usuario_actualizado_id: str,
        datos_anteriores: Dict[str, Any],
        datos_nuevos: Dict[str, Any],
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar actualización de usuario"""
        # Obtener rol y email del usuario admin
        admin_rol, admin_email = AuditoriaService._obtener_datos_usuario(db, usuario_admin_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_admin_id,
            tipo_evento="UPDATE",
            registro_afectado_id=usuario_actualizado_id,
            registro_afectado_tipo="users",
            descripcion_evento=f"Usuario actualizado: {datos_nuevos.get('first_name', 'N/A')} {datos_nuevos.get('last_name', 'N/A')}",
            detalles_cambios={
                "accion": "actualizar_usuario",
                "datos_anteriores": datos_anteriores,
                "datos_nuevos": datos_nuevos
            },
            ip_origen=ip_origen,
            usuario_rol=admin_rol,
            usuario_email=admin_email
        )
    
    @staticmethod
    def registrar_eliminacion_usuario(
        db: Session,
        usuario_admin_id: str,
        usuario_eliminado_id: str,
        datos_usuario: Dict[str, Any],
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar eliminación física de usuario"""
        # Obtener rol y email del usuario admin
        admin_rol, admin_email = AuditoriaService._obtener_datos_usuario(db, usuario_admin_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_admin_id,
            tipo_evento="DELETE",
            registro_afectado_id=usuario_eliminado_id,
            registro_afectado_tipo="users",
            descripcion_evento=f"Usuario eliminado físicamente: {datos_usuario.get('first_name', 'N/A')} {datos_usuario.get('last_name', 'N/A')}",
            detalles_cambios={
                "accion": "eliminar_usuario",
                "datos_eliminados": datos_usuario
            },
            ip_origen=ip_origen,
            usuario_rol=admin_rol,
            usuario_email=admin_email
        )
    
    @staticmethod
    def registrar_desactivacion_usuario(
        db: Session,
        usuario_admin_id: str,
        usuario_desactivado_id: str,
        datos_usuario: Dict[str, Any],
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar desactivación de usuario (soft delete)"""
        # Obtener datos del usuario que realiza la acción
        role_name, email = AuditoriaService._obtener_datos_usuario(db, usuario_admin_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_admin_id,
            tipo_evento="DEACTIVATE",
            registro_afectado_id=usuario_desactivado_id,
            registro_afectado_tipo="users",
            descripcion_evento=f"Usuario desactivado: {datos_usuario.get('first_name', 'N/A')} {datos_usuario.get('last_name', 'N/A')}",
            detalles_cambios={
                "accion": "desactivar_usuario",
                "estado_anterior": True,
                "estado_nuevo": False,
                "datos_usuario": datos_usuario
            },
            ip_origen=ip_origen,
            usuario_rol=role_name,
            usuario_email=email
        )
    
    @staticmethod
    def registrar_login(
        db: Session,
        usuario_id: str,
        exitoso: bool,
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar intento de login"""
        tipo_evento = "LOGIN_SUCCESS" if exitoso else "LOGIN_FAILED"
        descripcion = "Inicio de sesión exitoso" if exitoso else "Intento de inicio de sesión fallido"
        
        # Obtener datos del usuario solo si el login fue exitoso
        role_name, email = (None, None)
        if exitoso:
            role_name, email = AuditoriaService._obtener_datos_usuario(db, usuario_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_id,
            tipo_evento=tipo_evento,
            registro_afectado_id=usuario_id,
            registro_afectado_tipo="users",
            descripcion_evento=descripcion,
            detalles_cambios={
                "accion": "login",
                "exitoso": exitoso
            },
            ip_origen=ip_origen,
            usuario_rol=role_name,
            usuario_email=email
        )
    
    @staticmethod
    def registrar_logout(
        db: Session,
        usuario_id: str,
        ip_origen: Optional[str] = None
    ) -> Audit:
        """Registrar cierre de sesión"""
        # Obtener datos del usuario que realiza el logout
        role_name, email = AuditoriaService._obtener_datos_usuario(db, usuario_id)
        
        return AuditoriaService.registrar_evento(
            db=db,
            usuario_id=usuario_id,
            tipo_evento="LOGOUT",
            registro_afectado_id=usuario_id,
            registro_afectado_tipo="users",
            descripcion_evento="Cierre de sesión",
            detalles_cambios={
                "accion": "logout"
            },
            ip_origen=ip_origen,
            usuario_rol=role_name,
            usuario_email=email
        )
