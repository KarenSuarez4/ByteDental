from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.guardian_models import PatientRelationshipEnum
from app.schemas.person_schema import PersonResponse, PersonCreate, PersonUpdate

class GuardianBase(BaseModel):
    relationship_type: PatientRelationshipEnum = Field(..., description="Relación con el paciente")

class GuardianCreate(BaseModel):
    """Schema para crear un guardian"""
    # Datos de la persona
    person: PersonCreate
    # Datos específicos del guardian
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
    is_active: bool
    
    # Datos de la persona incluidos
    person: PersonResponse
    
    class Config:
        from_attributes = True

class GuardianWithPatients(GuardianResponse):
    """Schema para guardian con información de los pacientes que cuida"""
    patients: List['PatientBasicInfo'] = Field(default_factory=list, description="Lista de pacientes bajo su cuidado")
    
    class Config:
        from_attributes = True

class PatientBasicInfo(BaseModel):
    """Información básica del paciente para el guardian"""
    id: int
    person_id: int
    occupation: Optional[str]
    requires_guardian: bool
    is_active: bool
    
    class Config:
        from_attributes = True

# Importación diferida para evitar circular imports
from app.schemas.patient_schema import PatientResponse
GuardianWithPatients.model_rebuild()
