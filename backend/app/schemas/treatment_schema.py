from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TreatmentCreate(BaseModel):
    dental_service_id: int = Field(..., description="ID del servicio dental asociado al tratamiento")
    treatment_date: datetime = Field(..., description="Fecha del tratamiento")
    notes: Optional[str] = Field(None, description="Observaciones específicas del tratamiento")

class TreatmentResponse(BaseModel):
    id: int
    clinical_history_id: int
    dental_service_id: int
    doctor_id: str
    treatment_date: datetime
    notes: Optional[str]

    class Config:
        orm_mode = True