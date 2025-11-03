from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import date
from app.models.person_models import DocumentTypeEnum

class PersonBase(BaseModel):
    document_type: DocumentTypeEnum = Field(..., description="Tipo de documento")
    document_number: str = Field(..., min_length=1, max_length=30, description="Número de documento")
    first_surname: str = Field(..., min_length=1, max_length=50, description="Primer apellido")
    second_surname: Optional[str] = Field(None, max_length=50, description="Segundo apellido")
    first_name: str = Field(..., min_length=1, max_length=50, description="Primer nombre")
    middle_name: Optional[str] = Field(None, max_length=50, description="Segundo nombre")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono")
    birthdate: date = Field(..., description="Fecha de nacimiento")
    
    @field_validator('birthdate')
    @classmethod
    def validate_birthdate(cls, v):
        if v > date.today():
            raise ValueError('La fecha de nacimiento no puede ser futura')
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValueError('El teléfono debe contener solo números, espacios, guiones y el símbolo +')
        return v

class PersonCreate(PersonBase):
    """Schema para crear una persona"""
    pass

class PersonUpdate(BaseModel):
    """Schema para actualizar una persona - solo campos permitidos (documento NO editable)"""
    
    # Nombre completo
    first_surname: Optional[str] = Field(None, min_length=1, max_length=50, description="Primer apellido")
    second_surname: Optional[str] = Field(None, max_length=50, description="Segundo apellido")
    first_name: Optional[str] = Field(None, min_length=1, max_length=50, description="Primer nombre")
    middle_name: Optional[str] = Field(None, max_length=50, description="Segundo nombre")
    
    # Información de contacto
    email: Optional[EmailStr] = Field(None, description="Correo electrónico")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono")
    
    # Fecha de nacimiento
    birthdate: Optional[date] = Field(None, description="Fecha de nacimiento")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValueError('El teléfono debe contener solo números, espacios, guiones y el símbolo +')
        return v
    
    @field_validator('birthdate')
    @classmethod
    def validate_birthdate(cls, v):
        if v and v > date.today():
            raise ValueError('La fecha de nacimiento no puede ser futura')
        return v

class PersonResponse(PersonBase):
    """Schema para respuesta de persona"""
    id: int
    
    class Config:
        from_attributes = True