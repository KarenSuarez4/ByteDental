from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.clinical_history_schema import ClinicalHistoryCreate, ClinicalHistoryResponse
from app.services.clinical_history_service import ClinicalHistoryService
from app.middleware.auth_middleware import require_roles, RolePermissions
from app.models.clinical_history_models import ClinicalHistory
from app.models.treatment_models import Treatment
from app.models.patient_models import Patient
from app.models.dental_service_models import DentalService
from app.middleware.auth_middleware import get_current_user
from app.models.user_models import User

router = APIRouter(
    tags=["clinical-histories"],
    responses={404: {"description": "Historia clínica no encontrada"}}
)

@router.post("/", response_model=ClinicalHistoryResponse, status_code=201, dependencies=[Depends(require_roles([RolePermissions.DENTIST]))])
def create_clinical_history(
    data: ClinicalHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crear una nueva historia clínica (Solo Doctor)"""
    service = ClinicalHistoryService(db, current_user=current_user)
    return service.create_clinical_history(data)

@router.get("/", response_model=List[ClinicalHistoryResponse])
def search_clinical_histories(
    patient_id: Optional[int] = None,
    name: Optional[str] = None,
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=100, description="Cantidad de resultados por página"),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([RolePermissions.DENTIST]))
):
    """Buscar historias clínicas con paginación (Solo Doctor)"""
    service = ClinicalHistoryService(db)
    return service.search_clinical_histories(
        patient_id=patient_id,
        name=name,
        page=page,
        limit=limit
    )

@router.post("/", response_model=ClinicalHistoryResponse)
def create_clinical_history(
    clinical_history_data: ClinicalHistoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Validar que el paciente exista
    patient = db.query(Patient).filter(Patient.id == clinical_history_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Construir previous_treatments
    previous_treatments = []
    treatments_query = db.query(Treatment).filter(Treatment.clinical_history_id == patient.id).all()
    for treatment in treatments_query:
        previous_treatments.append({
            "date": treatment.treatment_date,
            "service_name": treatment.dental_service.name if treatment.dental_service else None,
            "doctor_name": treatment.doctor_id
        })

    # Crear medical_history con previous_treatments
    medical_history = clinical_history_data.medical_history
    medical_history["previous_treatments"] = previous_treatments

    # Crear la historia clínica
    clinical_history = ClinicalHistory(
        patient_id=clinical_history_data.patient_id,
        reason=clinical_history_data.reason,
        symptoms=clinical_history_data.symptoms,
        medical_history=medical_history,
        findings=clinical_history_data.findings,
        doctor_signature=clinical_history_data.doctor_signature
    )
    db.add(clinical_history)
    db.commit()
    db.refresh(clinical_history)

    # Guardar tratamientos actuales
    for treatment_data in clinical_history_data.treatments:
        treatment = Treatment(
            clinical_history_id=clinical_history.id,
            dental_service_id=treatment_data.dental_service_id,
            doctor_id=current_user["uid"],  # UID del doctor logueado
            treatment_date=treatment_data.treatment_date,
            notes=treatment_data.notes
        )
        db.add(treatment)
    db.commit()

    return clinical_history

@router.get("/{id}", response_model=ClinicalHistoryResponse)
def get_clinical_history(id: int, db: Session = Depends(get_db)):
    history = db.query(ClinicalHistory).filter(ClinicalHistory.id == id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
    return history