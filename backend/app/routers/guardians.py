from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.guardian_service import get_guardian_service
from app.models.guardian_models import PatientRelationshipEnum
from app.utils.audit_context import get_user_context
from app.middleware.auth_middleware import (
    require_guardian_read, 
    require_guardian_write
)
from app.schemas.guardian_schema import (
    GuardianCreate, 
    GuardianUpdate, 
    GuardianResponse, 
    GuardianWithPatients
)

router = APIRouter(
    prefix="/guardians",
    tags=["guardians"],
    responses={404: {"description": "Guardian not found"}}
)

@router.post("/", response_model=GuardianResponse, status_code=201)
def create_guardian(
    guardian_data: GuardianCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_write)  # Solo ASSISTANT
):
    """Crear un nuevo guardian (incluye crear la persona)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_guardian_service(db, user_id, user_ip)
    
    try:
        return service.create_guardian(guardian_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/", response_model=List[GuardianResponse])
def get_guardians(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    active_only: bool = Query(True, description="Solo guardianes activos"),
    search: Optional[str] = Query(None, description="Buscar en nombre, apellido, documento o email"),
    relationship: Optional[PatientRelationshipEnum] = Query(None, description="Filtrar por tipo de relación"),
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_read)  # ASSISTANT y DENTIST
):
    """Obtener lista de guardianes con filtros"""
    service = get_guardian_service(db)
    return service.get_guardians(
        skip=skip, 
        limit=limit,
        active_only=active_only,
        search=search,
        relationship=relationship
    )

@router.get("/{guardian_id}", response_model=GuardianWithPatients)
def get_guardian(
    guardian_id: int,
    include_all: bool = Query(True, description="Incluir información completa (persona y pacientes)"),
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_read)  # ASSISTANT y DENTIST
):
    """Obtener guardian por ID"""
    service = get_guardian_service(db)
    guardian = service.get_guardian_by_id(guardian_id, include_all=include_all)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    return guardian
    
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    
    return guardian

@router.put("/{guardian_id}", response_model=GuardianResponse)
def update_guardian(
    guardian_id: int,
    guardian_data: GuardianUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_write)  # Solo ASSISTANT
):
    """Actualizar guardian (puede incluir datos de persona)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_guardian_service(db, user_id, user_ip)
    
    try:
        updated_guardian = service.update_guardian(guardian_id, guardian_data)
        
        if not updated_guardian:
            raise HTTPException(status_code=404, detail="Guardian no encontrado")
        
        return updated_guardian
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{guardian_id}")
def delete_guardian(
    guardian_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_write)  # Solo ASSISTANT
):
    """Eliminar guardian (eliminación lógica - soft delete)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_guardian_service(db, user_id, user_ip)
    
    try:
        success = service.delete_guardian(guardian_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Guardian no encontrado")
        
        return {"message": "Guardian desactivado correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.patch("/{guardian_id}/activate")

def activate_guardian(
    guardian_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_guardian_write)  # Solo ASSISTANT
):
    """Reactivar guardian (activar un guardian previamente desactivado)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_guardian_service(db, user_id, user_ip)
    
    try:
        success = service.activate_guardian(guardian_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Guardian no encontrado")
        
        return {"message": "Guardian reactivado correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")