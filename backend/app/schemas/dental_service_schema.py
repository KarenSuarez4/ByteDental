from pydantic import BaseModel, Field, field_validator
from typing import Optional
from decimal import Decimal


class DentalServiceBase(BaseModel):
    """Schema base para servicios odontológicos"""
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del servicio odontológico")
    description: str = Field(..., min_length=1, max_length=1000, description="Descripción detallada del servicio")
    value: Decimal = Field(..., gt=0, decimal_places=2, description="Valor del servicio en pesos colombianos")
    is_active: bool = Field(True, description="Si el servicio está activo o no")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('El nombre del servicio no puede estar vacío')
        return v.strip().title()

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if not v or not v.strip():
            raise ValueError('La descripción del servicio no puede estar vacía')
        return v.strip()

    @field_validator('value')
    @classmethod
    def validate_value(cls, v):
        if v <= 0:
            raise ValueError('El valor del servicio debe ser mayor a 0')
        if v > 999999999.99:
            raise ValueError('El valor del servicio no puede exceder 999,999,999.99')
        return v


class DentalServiceCreate(DentalServiceBase):
    """Schema para crear un nuevo servicio odontológico"""
    description: str = Field(..., min_length=1, max_length=1000, description="Descripción detallada del servicio (obligatoria)")


class DentalServiceUpdate(BaseModel):
    """Schema para actualizar un servicio odontológico existente"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del servicio odontológico")
    description: Optional[str] = Field(None, max_length=1000, description="Descripción detallada del servicio")
    value: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Valor del servicio en pesos colombianos")
    is_active: Optional[bool] = Field(None, description="Si el servicio está activo o no")

    @field_validator('name')
    @classmethod   
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('El nombre del servicio no puede estar vacío')
            return v.strip().title()
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError('La descripción del servicio no puede estar vacía')
            return v.strip()
        return v

    @field_validator('value')
    @classmethod
    def validate_value(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError('El valor del servicio debe ser mayor a 0')
            if v > 999999999.99:
                raise ValueError('El valor del servicio no puede exceder 999,999,999.99')
        return v


class DentalServiceResponse(BaseModel):
    """Schema de respuesta para servicios odontológicos"""
    id: int
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del servicio odontológico")
    description: Optional[str] = Field(None, max_length=1000, description="Descripción detallada del servicio")
    value: Decimal = Field(..., gt=0, decimal_places=2, description="Valor del servicio en pesos colombianos")
    is_active: bool = Field(True, description="Si el servicio está activo o no")

    class Config:
        from_attributes = True


class DentalServiceStatusChange(BaseModel):
    """Schema para cambiar el estado de un servicio odontológico"""
    is_active: bool = Field(..., description="Nuevo estado del servicio (activo/inactivo)")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio de estado")


class DentalServiceDeleteResponse(BaseModel):
    """Schema de respuesta para eliminación de servicio odontológico"""
    success: bool = Field(..., description="Si la operación fue exitosa")
    message: str = Field(..., description="Mensaje descriptivo de la operación")
    service_id: int = Field(..., description="ID del servicio eliminado")
    service_name: str = Field(..., description="Nombre del servicio eliminado")


class DentalServiceStatusResponse(BaseModel):
    """Schema de respuesta para cambio de estado de servicio odontológico"""
    success: bool = Field(..., description="Si la operación fue exitosa")
    message: str = Field(..., description="Mensaje descriptivo de la operación")
    previous_status: bool = Field(..., description="Estado anterior del servicio")
    new_status: bool = Field(..., description="Nuevo estado del servicio")
    service: DentalServiceResponse = Field(..., description="Datos actualizados del servicio")
