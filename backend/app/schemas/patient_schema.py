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

    @field_validator('disability_description')
    @classmethod
    def validate_disability_description(cls, v, values):
        has_disability = values.get('has_disability', False)
        
        # Si tiene discapacidad, debe proporcionar descripción
        if has_disability and not v:
            raise ValueError('La descripción de la discapacidad es requerida cuando el paciente tiene alguna discapacidad')
        
        # Si no tiene discapacidad, la descripción debe ser None
        if not has_disability and v:
            raise ValueError('No debe proporcionar descripción de discapacidad cuando has_disability=False')
        
        return v

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

    @field_validator('disability_description')
    @classmethod
    def validate_disability_description(cls, v, values):
        has_disability = values.get('has_disability')
        
        # Solo validar si has_disability está siendo actualizado
        if has_disability is not None:
            # Si tiene discapacidad, debe proporcionar descripción
            if has_disability and not v:
                raise ValueError('La descripción de la discapacidad es requerida cuando el paciente tiene alguna discapacidad')
            
            # Si no tiene discapacidad, la descripción debe ser None
            if not has_disability and v:
                raise ValueError('No debe proporcionar descripción de discapacidad cuando has_disability=False')
        
        return v

    @field_validator('deactivation_reason')
    @classmethod
    def validate_deactivation_reason(cls, v, values):
        is_active = values.get('is_active')
        
        # Solo validar si is_active está siendo actualizado
        if is_active is not None:
            # Si se está desactivando, debe proporcionar motivo
            if not is_active and not v:
                raise ValueError('El motivo de desactivación es requerido cuando se desactiva un paciente')
            
            # Si se está activando, no debe proporcionar motivo
            if is_active and v:
                raise ValueError('No se debe proporcionar motivo de desactivación cuando se activa un paciente')
        
        return v

class PatientStatusChange(BaseModel):
    """Schema para cambiar el estado de un paciente"""
    is_active: bool = Field(..., description="True para activar, False para desactivar")
    deactivation_reason: Optional[str] = Field(None, max_length=200, description="Motivo de desactivación (requerido solo para desactivar)")
    
    @field_validator('deactivation_reason')
    @classmethod
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
