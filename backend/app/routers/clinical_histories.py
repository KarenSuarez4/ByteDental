from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.clinical_history_schema import (
    ClinicalHistoryCreate, 
    ClinicalHistoryResponse,
    ClinicalHistoryCreateResponse
)
from app.services.clinical_history_service import ClinicalHistoryService
from app.middleware.auth_middleware import RolePermissions
from app.models.clinical_history_models import ClinicalHistory
from app.models.treatment_models import Treatment
from app.models.patient_models import Patient
from app.models.dental_service_models import DentalService
from app.middleware.auth_middleware import get_current_user
from app.models.user_models import User
from ..services.auditoria_service import AuditoriaService


router = APIRouter(
    tags=["clinical-histories"],
    responses={404: {"description": "Historia clínica no encontrada"}}
)

def get_client_ip(request: Request) -> str:
    """Obtener la IP del cliente"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/", response_model=ClinicalHistoryCreateResponse, status_code=201)
def create_clinical_history(
    data: ClinicalHistoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crear una nueva historia clínica (Solo Doctor)"""
    # Verificar rol
    if not current_user.role or current_user.role.name != RolePermissions.DENTIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para realizar esta acción"
        )    
    service = ClinicalHistoryService(db, current_user=current_user)
    try:
        created_history = service.create_clinical_history(data, request)
        return created_history
    except Exception as e:
        print(f"❌ Error en router: {str(e)}")
        raise

@router.get("/", response_model=List[ClinicalHistoryResponse])
def search_clinical_histories(
    patient_id: Optional[int] = None,
    name: Optional[str] = None,
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=100, description="Cantidad de resultados por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar historias clínicas con paginación (Solo Doctor)"""
    service = ClinicalHistoryService(db, current_user=current_user)
    return service.search_clinical_histories(
        patient_id=patient_id,
        name=name,
        page=page,
        limit=limit
    )

@router.get("/{id}", response_model=dict)
async def get_clinical_history(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener una historia clínica específica por ID"""
    
    service = ClinicalHistoryService(db, current_user)
    
    # ✅ Pasar el request al servicio para obtener la IP
    return service.get_clinical_history_by_id(id, request)

@router.get("/patient/{patient_id}/exists", response_model=dict)
def check_patient_has_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verificar si un paciente tiene historias clínicas"""
    
    # Verificar que el paciente existe
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # ✅ Obtener la historia clínica completa
    history = db.query(ClinicalHistory).filter(
        ClinicalHistory.patient_id == patient_id
    ).first()
    
    return {
        "patient_id": patient_id,
        "has_history": history is not None,
        "history_id": history.id if history else None,  
        "patient_name": f"{patient.person.first_name} {patient.person.first_surname}"
    }

@router.post("/{history_id}/treatments", response_model=dict, status_code=201)
def add_treatment_to_history(
    history_id: int,
    treatment_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Agregar un nuevo tratamiento a una historia clínica existente"""
    
    # Verificar rol
    if not current_user.role or current_user.role.name != RolePermissions.DENTIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para realizar esta acción"
        )
    
    service = ClinicalHistoryService(db, current_user=current_user)
    return service.add_treatment_to_history(history_id, treatment_data, request)
