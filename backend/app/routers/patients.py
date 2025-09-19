from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.patient_service import get_patient_service
from app.utils.audit_context import get_user_context
from app.schemas.patient_schema import (
    PatientCreate, 
    PatientUpdate, 
    PatientResponse, 
    PatientWithGuardians
)

router = APIRouter(
    prefix="/patients",
    tags=["patients"],
    responses={404: {"description": "Patient not found"}}
)

@router.post("/", response_model=PatientResponse, status_code=201)
def create_patient(
    patient_data: PatientCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Crear un nuevo paciente (incluye crear la persona)"""
    user_id, user_ip = get_user_context(request)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        return service.create_patient(patient_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error detallado en create_patient: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/", response_model=List[PatientResponse])
def get_patients(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    active_only: bool = Query(True, description="Solo pacientes activos"),
    search: Optional[str] = Query(None, description="Buscar en nombre, apellido, documento o email"),
    requires_guardian: Optional[bool] = Query(None, description="Filtrar por requerimiento de guardian"),
    db: Session = Depends(get_db)
):
    """Obtener lista de pacientes con filtros"""
    service = get_patient_service(db)
    return service.get_patients(
        skip=skip, 
        limit=limit, 
        active_only=active_only, 
        search=search,
        requires_guardian=requires_guardian
    )

@router.get("/count")
def get_patient_count(
    active_only: bool = Query(True, description="Solo pacientes activos"),
    db: Session = Depends(get_db)
):
    """Obtener conteo total de pacientes"""
    service = get_patient_service(db)
    count = service.get_patient_count(active_only=active_only)
    return {"count": count}

@router.get("/requiring-guardians", response_model=List[PatientResponse])
def get_patients_requiring_guardians(db: Session = Depends(get_db)):
    """Obtener pacientes que requieren guardian"""
    service = get_patient_service(db)
    return service.get_patients_requiring_guardians()

@router.get("/without-guardians", response_model=List[PatientResponse])
def get_patients_without_guardians(db: Session = Depends(get_db)):
    """Obtener pacientes que requieren guardian pero no tienen ninguno"""
    service = get_patient_service(db)
    return service.get_patients_without_guardians()

@router.get("/{patient_id}", response_model=PatientWithGuardians)
def get_patient(
    patient_id: int,
    include_guardians: bool = Query(True, description="Incluir información de guardianes"),
    db: Session = Depends(get_db)
):
    """Obtener paciente por ID"""
    service = get_patient_service(db)
    patient = service.get_patient_by_id(patient_id, include_person=True, include_guardians=include_guardians)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return patient

@router.get("/document/{document_number}", response_model=PatientResponse)
def get_patient_by_document(
    document_number: str,
    db: Session = Depends(get_db)
):
    """Obtener paciente por número de documento"""
    service = get_patient_service(db)
    patient = service.get_patient_by_document(document_number)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Actualizar paciente (puede incluir datos de persona)"""
    user_id, user_ip = get_user_context(request)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        updated_patient = service.update_patient(patient_id, patient_data)
        
        if not updated_patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        return updated_patient
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Eliminar paciente (eliminación lógica - soft delete)"""
    user_id, user_ip = get_user_context(request)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        success = service.delete_patient(patient_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        return {"message": "Paciente desactivado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.patch("/{patient_id}/activate")
def activate_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Reactivar paciente"""
    service = get_patient_service(db)
    patient_data = PatientUpdate(is_active=True)
    updated_patient = service.update_patient(patient_id, patient_data)
    
    if not updated_patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return {"message": "Paciente activado correctamente"}

@router.patch("/update-guardian-requirements")
def update_guardian_requirements_by_age(db: Session = Depends(get_db)):
    """Actualizar requirements de guardian basado en edad actual"""
    service = get_patient_service(db)
    result = service.update_guardian_requirements_by_age()
    return {
        "message": "Requirements de guardian actualizados",
        **result
    }

@router.get("/{patient_id}/audit")
def get_patient_audit_trail(
    patient_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener historial de auditoría de un paciente específico"""
    from app.services.auditoria_service import AuditoriaService
    
    auditoria_service = AuditoriaService()
    
    # Verificar que el paciente existe
    service = get_patient_service(db)
    patient = service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(patient_id),
        tipo_registro="patients",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(patient_id),
        tipo_registro="patients"
    )
    
    return {
        "patient_id": patient_id,
        "audit_trail": audit_records,
        "total_records": total_records,
        "returned_records": len(audit_records)
    }
