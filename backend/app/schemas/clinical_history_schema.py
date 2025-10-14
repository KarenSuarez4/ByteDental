from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TreatmentCreate(BaseModel):
    dental_service_id: int
    treatment_date: datetime
    notes: Optional[str] = None

class TreatmentResponse(BaseModel):
    date: datetime
    name: str
    doctor_name: str
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