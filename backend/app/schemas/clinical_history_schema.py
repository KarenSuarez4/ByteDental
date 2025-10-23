from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TreatmentCreate(BaseModel):
    dental_service_id: int
    treatment_date: datetime
    reason: str  # Motivo de consulta del tratamiento (obligatorio)
    notes: Optional[str] = None

class TreatmentResponse(BaseModel):
    date: datetime
    name: str
    doctor_name: str
    reason: str  # Motivo de consulta del tratamiento
    notes: Optional[str] = None

class ClinicalHistoryCreate(BaseModel):
    patient_id: int
    reason: str
    symptoms: str
    medical_history: dict
    findings: Optional[str] = None  
    doctor_signature: str
    treatments: List[TreatmentCreate]  

class ClinicalHistoryResponse(BaseModel):
    id: int
    patient_id: int
    reason: str
    symptoms: str
    medical_history: dict
    findings: Optional[str] = None
    doctor_signature: str
    treatments: List[TreatmentResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClinicalHistoryCreateResponse(BaseModel):
    message: str
    clinical_history: ClinicalHistoryResponse

class PaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: List[ClinicalHistoryResponse]

class ClinicalHistoryStatusChange(BaseModel):
    """Schema para cambiar el estado (cerrar/reabrir) de una historia clínica"""
    is_active: bool
    closure_reason: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_active": False,
                "closure_reason": "Historia clínica cerrada por finalización de tratamiento completo"
            }
        }