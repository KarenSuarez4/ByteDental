from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.guardian_models import PatientRelationshipEnum
from app.schemas.person_schema import PersonResponse, PersonCreate, PersonUpdate

class GuardianBase(BaseModel):
    relationship_type: PatientRelationshipEnum = Field(..., description="Relación con el paciente")

class GuardianCreate(BaseModel):
    """Schema para crear un guardian"""
    # Datos de la persona
    person: PersonCreate
    # Datos específicos del guardian
    patient_id: int = Field(..., description="ID del paciente")
    relationship_type: PatientRelationshipEnum = Field(..., description="Relación con el paciente")

class GuardianUpdate(BaseModel):
    """Schema para actualizar un guardian"""
    # Datos de la persona (opcionales)
    person: Optional[PersonUpdate] = None
    # Datos específicos del guardian
    relationship_type: Optional[PatientRelationshipEnum] = None
    is_active: Optional[bool] = None

class GuardianResponse(GuardianBase):
    """Schema para respuesta de guardian"""
    id: int
    person_id: int
    patient_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Datos de la persona incluidos
    person: PersonResponse
    
    class Config:
        from_attributes = True

class GuardianWithPatient(GuardianResponse):
    """Schema para guardian con información del paciente"""
    patient: 'PatientResponse'
    
    class Config:
        from_attributes = True

# Importación diferida para evitar circular imports
from app.schemas.patient_schema import PatientResponse
GuardianWithPatient.model_rebuild()
