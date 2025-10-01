from pydantic import BaseModel, Field, field_validator
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
    has_disability: bool = Field(default=False, description="Indica si el paciente tiene alguna discapacidad")
    disability_description: Optional[str] = Field(None, description="Descripción de la discapacidad")

class PatientCreate(BaseModel):
    """Schema para crear un paciente (incluye datos de persona)"""
    # Datos de la persona
    person: PersonCreate
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50, description="Ocupación")
    guardian_id: Optional[int] = Field(None, description="ID del guardian asignado (si ya existe)")
    has_disability: bool = Field(default=False, description="Indica si el paciente tiene alguna discapacidad")
    disability_description: Optional[str] = Field(None, description="Descripción de la discapacidad")
    # Datos del guardian nuevo (si se va a crear)
    guardian: Optional['GuardianCreateEmbedded'] = Field(None, description="Datos para crear un guardian nuevo")

    # NOTE: Disabled complex validators temporarily to fix Pydantic v2 compatibility
    # These validations are now handled in the service layer

class PatientUpdate(BaseModel):
    """Schema para actualizar un paciente"""
    # Datos de la persona (opcionales)
    person: Optional[PersonUpdate] = None
    # Datos específicos del paciente
    occupation: Optional[str] = Field(None, max_length=50)
    guardian_id: Optional[int] = None
    requires_guardian: Optional[bool] = None
    has_disability: Optional[bool] = None
    disability_description: Optional[str] = None
    is_active: Optional[bool] = None
    deactivation_reason: Optional[str] = Field(None, max_length=200, description="Motivo de desactivación")
    # Datos del guardian nuevo (si se va a crear o actualizar)
    guardian: Optional['GuardianCreateEmbedded'] = Field(None, description="Datos para crear o actualizar guardian")

    # NOTE: Disabled complex validators temporarily to fix Pydantic v2 compatibility
    # These validations are now handled in the service layer

class PatientStatusChange(BaseModel):
    """Schema para cambiar el estado de un paciente"""
    is_active: bool = Field(..., description="True para activar, False para desactivar")
    deactivation_reason: Optional[str] = Field(None, max_length=200, description="Motivo de desactivación (requerido solo para desactivar)")
    
    # NOTE: Disabled complex validators temporarily to fix Pydantic v2 compatibility
    # These validations are now handled in the service layer

class PatientResponse(PatientBase):
    """Schema para respuesta de paciente"""
    id: int
    person_id: int
    is_active: bool
    deactivation_reason: Optional[str] = None
    
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
