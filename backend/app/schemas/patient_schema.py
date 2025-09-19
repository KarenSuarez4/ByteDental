from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.person_schema import PersonResponse, PersonCreate, PersonUpdate

class PatientBase(BaseModel):
    occupation: Optional[str] = Field(None, max_length=50, description="Ocupación")
    requires_guardian: bool = Field(default=False, description="Requiere tutor/guardian")

class PatientCreate(BaseModel):
    """Schema para crear un paciente (incluye datos de persona)"""
    # Datos de la persona
    person: PersonCreate
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50, description="Ocupación")

class PatientUpdate(BaseModel):
    """Schema para actualizar un paciente"""
    # Datos de la persona (opcionales)
    person: Optional[PersonUpdate] = None
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50)
    requires_guardian: Optional[bool] = None
    is_active: Optional[bool] = None

class PatientResponse(PatientBase):
    """Schema para respuesta de paciente"""
    id: int
    person_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Datos de la persona incluidos
    person: PersonResponse
    
    class Config:
        from_attributes = True

class PatientWithGuardians(PatientResponse):
    """Schema para paciente con sus guardianes"""
    guardians: List['GuardianResponse'] = []
    
    class Config:
        from_attributes = True

# Importación diferida para evitar circular imports
from app.schemas.guardian_schema import GuardianResponse
PatientWithGuardians.model_rebuild()
