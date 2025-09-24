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


class DentalServiceService:
    """Servicio para operaciones CRUD de servicios odontológicos"""
    
    def __init__(self, db: Session, user_id: Optional[int] = None, user_ip: str = "unknown"):
        self.db = db
        self.user_id = user_id
        self.user_ip = user_ip

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
        
        self.db.add(dental_service)
        self.db.commit()
        self.db.refresh(dental_service)
        
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
        
        # Actualizar campos proporcionados
        update_data = service_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == 'name' and value:
                setattr(dental_service, field, value.strip().title())
            elif field == 'description' and value:
                setattr(dental_service, field, value.strip())
            else:
                setattr(dental_service, field, value)
        
        self.db.commit()
        self.db.refresh(dental_service)
        
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




def get_dental_service_service(db: Session, user_id: Optional[int] = None, user_ip: str = "unknown") -> DentalServiceService:
    """Factory function para crear instancia del servicio"""
    return DentalServiceService(db, user_id, user_ip)