"""
Schemas para reportes de ByteDental
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ConsolidatedActivityItem(BaseModel):
    """Schema para un item del reporte consolidado"""
    fecha: str = Field(..., description="Fecha del tratamiento")
    paciente: str = Field(..., description="Nombre del paciente")
    documento: str = Field(..., description="Número de documento del paciente")
    telefono: str = Field(..., description="Teléfono del paciente")
    procedimiento: str = Field(..., description="Nombre del procedimiento realizado")
    doctor: str = Field(..., description="Nombre del doctor que realizó el tratamiento")

class ConsolidatedActivitiesResponse(BaseModel):
    """Schema para la respuesta del reporte consolidado"""
    success: bool = Field(..., description="Indica si la operación fue exitosa")
    message: str = Field(..., description="Mensaje descriptivo de la operación")
    data: List[ConsolidatedActivityItem] = Field(..., description="Lista de actividades consolidadas")
    total: int = Field(..., description="Total de registros encontrados")
    period: dict = Field(..., description="Periodo del reporte")

class ReportErrorResponse(BaseModel):
    """Schema para respuestas de error"""
    detail: str = Field(..., description="Mensaje de error")
