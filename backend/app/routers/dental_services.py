"""
Router para servicios odontológicos con autenticación y autorización
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.dental_service import get_dental_service_service
from app.utils.audit_context import get_user_context
from app.middleware.auth_middleware import (
    require_dental_service_read,  # Solo ADMIN y ASSISTANT pueden leer
    require_dental_service_write,  # Solo ADMIN puede crear/actualizar/eliminar
)
from app.schemas.dental_service_schema import (
    DentalServiceCreate,
    DentalServiceUpdate,
    DentalServiceResponse,
    DentalServiceStatusChange,
    DentalServiceDeleteResponse,
    DentalServiceStatusResponse
)

router = APIRouter(
    prefix="/dental-services",
    tags=["dental-services"],
    responses={404: {"description": "Dental service not found"}}
)


@router.post("/", response_model=DentalServiceResponse, status_code=201)
def create_dental_service(
    service_data: DentalServiceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_write)  # Solo ADMIN
):
    """Crear un nuevo servicio odontológico (Solo ADMIN)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.create_dental_service(service_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.get("/", response_model=List[DentalServiceResponse])
def get_dental_services(
    request: Request,
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a retornar"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    search: Optional[str] = Query(None, description="Buscar por nombre o descripción"),
    min_price: Optional[float] = Query(None, ge=0, description="Precio mínimo"),
    max_price: Optional[float] = Query(None, ge=0, description="Precio máximo"),
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_read)  # Solo ADMIN y ASSISTANT
):
    """
    Obtener lista de servicios odontológicos con filtros múltiples:
    - is_active: Filtrar por estado activo/inactivo
    - search: Buscar por nombre o descripción
    - min_price/max_price: Filtrar por rango de precios
    - skip/limit: Paginación
    """
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.get_dental_services(
            skip=skip, 
            limit=limit, 
            is_active=is_active, 
            search=search,
            min_price=min_price,
            max_price=max_price
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/{service_id}", response_model=DentalServiceResponse)
def get_dental_service(
    service_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_read)  # Solo ADMIN y ASSISTANT
):
    """Obtener un servicio odontológico por ID"""
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.get_dental_service(service_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.put("/{service_id}", response_model=DentalServiceResponse)
def update_dental_service(
    service_id: int,
    service_data: DentalServiceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_write)  # Solo ADMIN
):
    """Actualizar un servicio odontológico (Solo ADMIN)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.update_dental_service(service_id, service_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.patch("/{service_id}/status", response_model=DentalServiceStatusResponse)
def change_service_status(
    service_id: int,
    status_data: DentalServiceStatusChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_write)  # Solo ADMIN
):
    """Cambiar el estado de un servicio odontológico (Solo ADMIN)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.change_service_status(service_id, status_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.delete("/{service_id}", response_model=DentalServiceDeleteResponse)
def delete_dental_service(
    service_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_dental_service_write)  # Solo ADMIN
):
    """Eliminar un servicio odontológico (soft delete - Solo ADMIN)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_dental_service_service(db, user_id, user_ip)
    
    try:
        return service.delete_dental_service(service_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
