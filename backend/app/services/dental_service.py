"""
Servicio para manejo de servicios odontológicos
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from fastapi import HTTPException, status

from app.models.dental_service_models import DentalService
from app.schemas.dental_service_schema import (
    DentalServiceCreate, 
    DentalServiceUpdate, 
    DentalServiceStatusChange
)
from app.services.auditoria_service import AuditoriaService


class DentalServiceService:
    """Servicio para operaciones CRUD de servicios odontológicos"""
    
    def __init__(self, db: Session, user_id: Optional[str] = None, user_ip: str = "unknown"):
        self.db = db
        self.user_ip = user_ip
        
        # Solo proceder si tenemos un user_id válido
        if user_id:
            self.user_id = user_id
            # Obtener rol y email del usuario para auditoría
            self.user_role, self.user_email = AuditoriaService._obtener_datos_usuario(db, self.user_id)
        else:
            # Si no hay usuario autenticado, no permitir operaciones de auditoría
            raise ValueError("No se puede realizar operaciones sin usuario autenticado")

    def create_dental_service(self, service_data: DentalServiceCreate) -> DentalService:
        """Crear un nuevo servicio odontológico"""
        
        # Verificar que no exista un servicio con el mismo nombre
        existing_service = self.db.query(DentalService).filter(
            DentalService.name.ilike(service_data.name.strip())
        ).first()
        
        if existing_service:
            raise ValueError(f"Ya existe un servicio odontológico con el nombre '{service_data.name}'")
        
        # Crear el servicio
        dental_service = DentalService(
            name=service_data.name.strip().title(),
            description=service_data.description.strip() if service_data.description else None,
            value=service_data.value,
            is_active=service_data.is_active
        )
        
        # Registrar auditoría usando la misma transacción
        try:
            # Primero, agregamos el servicio y generamos el ID
            self.db.add(dental_service)
            self.db.flush()  # Genera el ID sin hacer commit
            
            # Registramos la auditoría en la MISMA transacción
            AuditoriaService.registrar_evento_sin_commit(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="CREATE",
                registro_afectado_id=str(dental_service.id),
                registro_afectado_tipo="dental_services",
                descripcion_evento=f"Servicio odontológico creado: {dental_service.name}",
                detalles_cambios={
                    "accion": "crear_servicio_dental",
                    "datos_nuevos": {
                        "name": dental_service.name,
                        "description": dental_service.description,
                        "value": float(dental_service.value),
                        "is_active": dental_service.is_active
                    }
                },
                ip_origen=self.user_ip,
                usuario_rol=self.user_role,
                usuario_email=self.user_email
            )
            
            # Commit de TODO junto
            self.db.commit()
            self.db.refresh(dental_service)
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return dental_service

    def get_dental_service(self, service_id: int) -> DentalService:
        """Obtener un servicio odontológico por ID"""
        dental_service = self.db.query(DentalService).filter(
            DentalService.id == service_id
        ).first()
        
        if not dental_service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Servicio odontológico con ID {service_id} no encontrado"
            )
        
        return dental_service

    def get_dental_services(
        self, 
        skip: int = 0, 
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> List[DentalService]:
        """Obtener lista de servicios odontológicos con filtros múltiples"""
        
        query = self.db.query(DentalService)
        
        # Filtrar por estado activo/inactivo
        if is_active is not None:
            query = query.filter(DentalService.is_active == is_active)
        
        # Buscar por nombre o descripción
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    DentalService.name.ilike(search_term),
                    DentalService.description.ilike(search_term)
                )
            )
        
        # Filtrar por rango de precios
        if min_price is not None and max_price is not None:
            if min_price < 0 or max_price < 0:
                raise ValueError("Los precios no pueden ser negativos")
            if min_price > max_price:
                raise ValueError("El precio mínimo no puede ser mayor al precio máximo")
            query = query.filter(
                and_(
                    DentalService.value >= min_price,
                    DentalService.value <= max_price
                )
            )
        elif min_price is not None:
            if min_price < 0:
                raise ValueError("El precio mínimo no puede ser negativo")
            query = query.filter(DentalService.value >= min_price)
        elif max_price is not None:
            if max_price < 0:
                raise ValueError("El precio máximo no puede ser negativo")
            query = query.filter(DentalService.value <= max_price)
        
        # Ordenar por nombre
        query = query.order_by(DentalService.name)
        
        return query.offset(skip).limit(limit).all()

    def update_dental_service(self, service_id: int, service_data: DentalServiceUpdate) -> DentalService:
        """Actualizar un servicio odontológico"""
        
        dental_service = self.get_dental_service(service_id)
        
        # Verificar nombre único si se está actualizando
        if service_data.name:
            existing_service = self.db.query(DentalService).filter(
                and_(
                    DentalService.name.ilike(service_data.name.strip()),
                    DentalService.id != service_id
                )
            ).first()
            
            if existing_service:
                raise ValueError(f"Ya existe otro servicio odontológico con el nombre '{service_data.name}'")
        
        # Guardar datos anteriores para auditoría
        datos_anteriores = {
            "name": dental_service.name,
            "description": dental_service.description,
            "value": float(dental_service.value),
            "is_active": dental_service.is_active
        }
        
        # Actualizar campos proporcionados
        update_data = service_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == 'name' and value:
                setattr(dental_service, field, value.strip().title())
            elif field == 'description' and value:
                setattr(dental_service, field, value.strip())
            else:
                setattr(dental_service, field, value)
        
        # Preparar datos nuevos para auditoría
        datos_nuevos = {
            "name": dental_service.name,
            "description": dental_service.description,
            "value": float(dental_service.value),
            "is_active": dental_service.is_active
        }
        
        # Registrar auditoría usando la misma transacción
        try:
            # Registramos la auditoría en la MISMA transacción
            AuditoriaService.registrar_evento_sin_commit(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="UPDATE",
                registro_afectado_id=str(dental_service.id),
                registro_afectado_tipo="dental_services",
                descripcion_evento=f"Servicio odontológico actualizado: {dental_service.name}",
                detalles_cambios={
                    "accion": "actualizar_servicio_dental",
                    "datos_anteriores": datos_anteriores,
                    "datos_nuevos": datos_nuevos,
                    "campos_actualizados": list(update_data.keys())
                },
                ip_origen=self.user_ip,
                usuario_rol=self.user_role,
                usuario_email=self.user_email
            )
            
            # Commit de TODO junto
            self.db.commit()
            self.db.refresh(dental_service)
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return dental_service

    def delete_dental_service(self, service_id: int) -> dict:
        """Eliminar un servicio odontológico (soft delete - marcar como inactivo)"""
        
        dental_service = self.get_dental_service(service_id)
        
        # Verificar si ya está inactivo
        if not dental_service.is_active:
            return {
                "success": False,
                "message": f"El servicio '{dental_service.name}' ya estaba inactivo",
                "service_id": dental_service.id,
                "service_name": dental_service.name
            }
        
        # Soft delete - marcar como inactivo en lugar de eliminar
        dental_service.is_active = False
        
        self.db.commit()
        
        # Registrar evento de auditoría DESPUÉS del commit exitoso
        try:
            from app.database import SessionLocal
            audit_db = SessionLocal()
            try:
                AuditoriaService.registrar_evento(
                    db=audit_db,
                    usuario_id=self.user_id,
                    tipo_evento="DELETE",
                    registro_afectado_id=str(dental_service.id),
                    registro_afectado_tipo="dental_services",
                    descripcion_evento=f"Servicio odontológico eliminado (soft delete): {dental_service.name}",
                    detalles_cambios={
                        "accion": "eliminar_servicio_dental",
                        "is_active": {"antes": True, "despues": False},
                        "datos_servicio": {
                            "name": dental_service.name,
                            "description": dental_service.description,
                            "value": float(dental_service.value)
                        }
                    },
                    ip_origen=self.user_ip,
                    usuario_rol=self.user_role,
                    usuario_email=self.user_email
                )
            finally:
                audit_db.close()
        except Exception as audit_error:
            print(f"ERROR: Fallo al registrar auditoría DELETE: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return {
            "success": True,
            "message": f"Servicio '{dental_service.name}' eliminado exitosamente (marcado como inactivo)",
            "service_id": dental_service.id,
            "service_name": dental_service.name
        }

    def change_service_status(self, service_id: int, status_data: DentalServiceStatusChange) -> dict:
        """Cambiar el estado de un servicio odontológico"""
        
        dental_service = self.get_dental_service(service_id)
        
        # Guardar estado anterior
        previous_status = dental_service.is_active
        new_status = status_data.is_active
        
        # Verificar si el estado es el mismo
        if previous_status == new_status:
            return {
                "success": False,
                "message": f"El servicio '{dental_service.name}' ya tenía el estado {'activo' if new_status else 'inactivo'}",
                "previous_status": previous_status,
                "new_status": new_status,
                "service": dental_service
            }
        
        # Actualizar estado
        dental_service.is_active = status_data.is_active
        
        self.db.commit()
        self.db.refresh(dental_service)
        
        # Registrar evento de auditoría usando método genérico
        event_type = "REACTIVATE" if new_status else "DEACTIVATE"
        action_text = "reactivado" if new_status else "desactivado"
        
        descripcion_evento = f"Servicio odontológico {action_text}: {dental_service.name}"
        if status_data.reason:
            descripcion_evento += f" - Razón: {status_data.reason}"
        
        detalles_cambios = {
            "accion": f"{action_text}_servicio_dental",
            "is_active": {"antes": previous_status, "despues": new_status},
            "datos_servicio": {
                "name": dental_service.name,
                "description": dental_service.description,
                "value": float(dental_service.value)
            }
        }
        
        if status_data.reason:
            detalles_cambios["razon"] = status_data.reason
        
        AuditoriaService.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento=event_type,
            registro_afectado_id=str(dental_service.id),
            registro_afectado_tipo="dental_services",
            descripcion_evento=descripcion_evento,
            detalles_cambios=detalles_cambios,
            ip_origen=self.user_ip,
            usuario_rol=self.user_role,
            usuario_email=self.user_email
        )
        
        # Determinar mensaje de éxito
        action = "activado" if new_status else "desactivado"
        message = f"Servicio '{dental_service.name}' {action} exitosamente"
        if status_data.reason:
            message += f". Razón: {status_data.reason}"
        
        return {
            "success": True,
            "message": message,
            "previous_status": previous_status,
            "new_status": new_status,
            "service": dental_service
        }

    def get_active_services(self) -> List[DentalService]:
        """Obtener solo los servicios activos"""
        return self.get_dental_services(is_active=True)




def get_dental_service_service(db: Session, user_id: Optional[str] = None, user_ip: str = "unknown") -> DentalServiceService:
    """Factory function para crear instancia del servicio"""
    return DentalServiceService(db, user_id, user_ip)