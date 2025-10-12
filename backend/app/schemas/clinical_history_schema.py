from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TreatmentCreate(BaseModel):
    dental_service_id: int
    treatment_date: datetime
    notes: Optional[str]

class TreatmentResponse(BaseModel):
    date: datetime
    name: str
    doctor_name: str
    notes: Optional[str]

class ClinicalHistoryCreate(BaseModel):
    patient_id: int
    reason: str
    symptoms: str
    medical_history: dict
    findings: Optional[str]  
    doctor_signature: str
    treatments: List[TreatmentCreate]  

class ClinicalHistoryResponse(BaseModel):
    id: int
    patient_id: int
    reason: str
    symptoms: str
    medical_history: dict
    treatments: List[TreatmentResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class PaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: List[ClinicalHistoryResponse]