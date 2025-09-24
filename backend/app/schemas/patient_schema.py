from pydantic import BaseModel, Field, validator
from typing import Optional
from app.schemas.person_schema import PersonResponse, PersonCreate, PersonUpdate
from app.models.guardian_models import PatientRelationshipEnum

class GuardianCreateEmbedded(BaseModel):
    """Schema para crear un guardian junto con un paciente"""
    person: PersonCreate
    relationship_type: PatientRelationshipEnum = Field(..., description="Tipo de relación con el paciente")

class PatientBase(BaseModel):
    occupation: Optional[str] = Field(None, max_length=50, description="Ocupación")
    requires_guardian: bool = Field(default=False, description="Requiere tutor/guardian")
    guardian_id: Optional[int] = Field(None, description="ID del guardian asignado")

class PatientCreate(BaseModel):
    """Schema para crear un paciente (incluye datos de persona)"""
    # Datos de la persona
    person: PersonCreate
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50, description="Ocupación")
    guardian_id: Optional[int] = Field(None, description="ID del guardian asignado (si ya existe)")
    # Datos del guardian nuevo (si se va a crear)
    guardian: Optional['GuardianCreateEmbedded'] = Field(None, description="Datos para crear un guardian nuevo")

class PatientUpdate(BaseModel):
    """Schema para actualizar un paciente"""
    # Datos de la persona (opcionales)
    person: Optional[PersonUpdate] = None
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50)
    guardian_id: Optional[int] = None
    requires_guardian: Optional[bool] = None
    is_active: Optional[bool] = None
    # Datos del guardian nuevo (si se va a crear o actualizar)
    guardian: Optional['GuardianCreateEmbedded'] = Field(None, description="Datos para crear o actualizar guardian")

class PatientStatusChange(BaseModel):
    """Schema para cambiar el estado de un paciente"""
    is_active: bool = Field(..., description="True para activar, False para desactivar")
    reason: Optional[str] = Field(None, max_length=200, description="Motivo de desactivación (requerido solo para desactivar)")
    
    @validator('reason')
    def validate_reason_for_deactivation(cls, v, values):
        # Si is_active es False (desactivar), reason es requerido
        if 'is_active' in values and not values['is_active'] and not v:
            raise ValueError('El motivo es requerido para desactivar un paciente')
        # Si is_active es True (activar), reason no debe proporcionarse
        if 'is_active' in values and values['is_active'] and v:
            raise ValueError('No se debe proporcionar motivo al activar un paciente')
        return v

class PatientResponse(PatientBase):
    """Schema para respuesta de paciente"""
    id: int
    person_id: int
    is_active: bool
    
    # Datos de la persona incluidos
    person: PersonResponse
    
    class Config:
        from_attributes = True

class PatientWithGuardian(PatientResponse):
    """Schema para paciente con su guardian"""
    guardian: Optional['GuardianBasicInfo'] = None
    
    class Config:
        from_attributes = True

class GuardianBasicInfo(BaseModel):
    """Información básica del guardian para el paciente"""
    id: int
    person_id: int
    relationship_type: str
    is_active: bool
    person: PersonResponse
    
    class Config:
        from_attributes = True

# Importación diferida para evitar circular imports
from app.schemas.guardian_schema import GuardianResponse
PatientWithGuardian.model_rebuild()
