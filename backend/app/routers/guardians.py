from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.guardian_service import get_guardian_service
from app.models.guardian_models import PatientRelationshipEnum
from app.utils.audit_context import get_user_context
from app.schemas.guardian_schema import (
    GuardianCreate, 
    GuardianUpdate, 
    GuardianResponse, 
    GuardianWithPatient
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
    db: Session = Depends(get_db)
):
    """Crear un nuevo guardian (incluye crear la persona)"""
    user_id, user_ip = get_user_context(request)
    service = get_guardian_service(db, user_id, user_ip)
    
    try:
        return service.create_guardian(guardian_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/assign-existing", response_model=GuardianResponse)
def assign_existing_person_as_guardian(
    person_id: int,
    patient_id: int,
    relationship_type: PatientRelationshipEnum,
    db: Session = Depends(get_db)
):
    """Asignar una persona existente como guardian de un paciente"""
    service = get_guardian_service(db)
    
    try:
        guardian = service.assign_existing_person_as_guardian(
            person_id=person_id,
            patient_id=patient_id,
            relationship_type=relationship_type
        )
        return guardian
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
    relationship_type: Optional[PatientRelationshipEnum] = Query(None, description="Filtrar por tipo de relación"),
    db: Session = Depends(get_db)
):
    """Obtener lista de guardianes con filtros"""
    service = get_guardian_service(db)
    return service.get_guardians(
        skip=skip, 
        limit=limit,
        active_only=active_only,
        search=search,
        relationship_type=relationship_type
    )

@router.get("/count")
def get_guardian_count(
    active_only: bool = Query(True, description="Solo guardianes activos"),
    db: Session = Depends(get_db)
):
    """Obtener conteo total de guardianes"""
    service = get_guardian_service(db)
    count = service.get_guardian_count(active_only=active_only)
    return {"count": count}

@router.get("/by-relationship/{relationship_type}", response_model=List[GuardianResponse])
def get_guardians_by_relationship(
    relationship_type: PatientRelationshipEnum,
    db: Session = Depends(get_db)
):
    """Obtener guardianes por tipo de relación"""
    service = get_guardian_service(db)
    return service.get_guardians_by_relationship(relationship_type)

@router.get("/patient/{patient_id}", response_model=List[GuardianResponse])
def get_guardians_by_patient(
    patient_id: int,
    active_only: bool = Query(True, description="Solo guardianes activos"),
    db: Session = Depends(get_db)
):
    """Obtener todos los guardianes de un paciente"""
    service = get_guardian_service(db)
    return service.get_guardians_by_patient(patient_id, active_only=active_only)

@router.get("/person/{person_id}", response_model=List[GuardianResponse])
def get_guardians_by_person(
    person_id: int,
    active_only: bool = Query(True, description="Solo guardianes activos"),
    db: Session = Depends(get_db)
):
    """Obtener todos los pacientes que una persona guarda"""
    service = get_guardian_service(db)
    return service.get_guardians_by_person(person_id, active_only=active_only)

@router.get("/{guardian_id}", response_model=GuardianWithPatient)
def get_guardian(
    guardian_id: int,
    include_all: bool = Query(True, description="Incluir información completa (persona y paciente)"),
    db: Session = Depends(get_db)
):
    """Obtener guardian por ID"""
    service = get_guardian_service(db)
    guardian = service.get_guardian_by_id(guardian_id, include_all=include_all)
    
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    
    return guardian

@router.get("/document/{document_number}/patient/{patient_id}", response_model=GuardianResponse)
def get_guardian_by_document_and_patient(
    document_number: str,
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Obtener guardian por documento y paciente"""
    service = get_guardian_service(db)
    guardian = service.get_guardian_by_document_and_patient(document_number, patient_id)
    
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    
    return guardian

@router.put("/{guardian_id}", response_model=GuardianResponse)
def update_guardian(
    guardian_id: int,
    guardian_data: GuardianUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar guardian (puede incluir datos de persona)"""
    service = get_guardian_service(db)
    
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
    db: Session = Depends(get_db)
):
    """Eliminar guardian (eliminación lógica - soft delete)"""
    service = get_guardian_service(db)
    
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
    db: Session = Depends(get_db)
):
    """Reactivar guardian (activar un guardian previamente desactivado)"""
    service = get_guardian_service(db)
    
    try:
        success = service.activate_guardian(guardian_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Guardian no encontrado")
        
        return {"message": "Guardian reactivado correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/{guardian_id}/audit")
def get_guardian_audit_trail(
    guardian_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener historial de auditoría de un guardian específico"""
    from app.services.auditoria_service import AuditoriaService
    
    auditoria_service = AuditoriaService()
    
    # Verificar que el guardian existe
    service = get_guardian_service(db)
    guardian = service.get_guardian_by_id(guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(guardian_id),
        tipo_registro="guardians",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(guardian_id),
        tipo_registro="guardians"
    )
    
    return {
        "guardian_id": guardian_id,
        "audit_trail": audit_records,
        "total_records": total_records,
        "returned_records": len(audit_records)
    }
