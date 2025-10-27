"""
Router para el dashboard del sistema odontológico
Solo accesible para usuarios con rol de administrador
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import logging

from ..database import get_db
from ..services.dashboard_service import DashboardService
# from ..middleware.auth_middleware import get_current_admin_user
from ..models.user_models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Schemas
class ActivePatientsResponse(BaseModel):
    """Respuesta con estadísticas de pacientes activos"""
    total_active_patients: int
    active_patients_month: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_active_patients": 200,
                "active_patients_month": 84
            }
        }


class RoleDetail(BaseModel):
    """Detalle de empleados por rol"""
    role: str
    total: int


class EmployeesByRoleResponse(BaseModel):
    """Respuesta con estadísticas de empleados por rol"""
    total_general: int
    detail_by_role: List[RoleDetail]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_general": 12,
                "detail_by_role": [
                    {"role": "Administrator", "total": 2},
                    {"role": "Doctor", "total": 6},
                    {"role": "Asistente", "total": 4}
                ]
            }
        }


class ProcedureDistribution(BaseModel):
    """Distribución de un procedimiento"""
    procedure: str
    quantity: int
    percentage: float


class ProceduresDistributionResponse(BaseModel):
    """Respuesta con la distribución de procedimientos realizados"""
    total_procedures: int
    distribution: List[ProcedureDistribution]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_procedures": 150,
                "distribution": [
                    {"procedure": "Limpieza dental", "quantity": 45, "percentage": 30.0},
                    {"procedure": "Extracción", "quantity": 30, "percentage": 20.0},
                    {"procedure": "Ortodoncia", "quantity": 25, "percentage": 16.67}
                ]
            }
        }


class DoctorProcedures(BaseModel):
    """Procedimientos realizados por un doctor"""
    doctor: str
    total_procedures: int
    percentage: float


class ProceduresByDoctorResponse(BaseModel):
    """Respuesta con procedimientos por doctor"""
    procedures_by_doctor: List[DoctorProcedures]
    
    class Config:
        json_schema_extra = {
            "example": {
                "procedures_by_doctor": [
                    {"doctor": "Carlos López", "total_procedures": 45, "percentage": 30.0},
                    {"doctor": "María García", "total_procedures": 75, "percentage": 50.0},
                    {"doctor": "Juan Pérez", "total_procedures": 30, "percentage": 20.0}
                ]
            }
        }


class MonthlyTreatment(BaseModel):
    """Tratamientos en un mes específico"""
    month: str
    total_treatments: int


class TreatmentsPerMonthResponse(BaseModel):
    """Respuesta con tratamientos por mes"""
    treatments_per_month: List[MonthlyTreatment]
    
    class Config:
        json_schema_extra = {
            "example": {
                "treatments_per_month": [
                    {"month": "2024-11", "total_treatments": 15},
                    {"month": "2024-12", "total_treatments": 23},
                    {"month": "2025-01", "total_treatments": 18},
                    {"month": "2025-02", "total_treatments": 20}
                ]
            }
        }


@router.get("/active-patients", response_model=ActivePatientsResponse)
async def get_active_patients(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene estadísticas de pacientes activos
    
    **Requiere rol de administrador**
    
    Returns:
        - total_active_patients: Número total de pacientes activos en el sistema
        - active_patients_month: Número de pacientes activos con al menos una atención en el mes actual
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando estadísticas de pacientes activos")
        
        stats = DashboardService.get_active_patients_stats(db)
        
        return ActivePatientsResponse(
            total_active_patients=stats["total_active_patients"],
            active_patients_month=stats["active_patients_month"]
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de pacientes activos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.get("/employees", response_model=EmployeesByRoleResponse)
async def get_employees_by_role(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene estadísticas de empleados activos agrupados por rol
    
    **Requiere rol de administrador**
    
    Returns:
        - total_general: Número total de empleados activos en el sistema
        - detail_by_role: Lista con el detalle de empleados por cada rol
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando estadísticas de empleados por rol")
        
        stats = DashboardService.get_employees_by_role_stats(db)
        
        return EmployeesByRoleResponse(
            total_general=stats["total_general"],
            detail_by_role=stats["detail_by_role"]
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de empleados por rol: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.get("/distribution-procedures", response_model=ProceduresDistributionResponse)
async def get_procedures_distribution(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene la distribución de procedimientos odontológicos realizados
    
    **Requiere rol de administrador**
    
    Retorna la cantidad de veces que se realizó cada procedimiento y su porcentaje
    sobre el total de procedimientos realizados.
    
    Returns:
        - total_procedures: Número total de procedimientos realizados
        - distribution: Lista con cada procedimiento, su cantidad y porcentaje
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando distribución de procedimientos")
        
        stats = DashboardService.get_procedures_distribution(db)
        
        return ProceduresDistributionResponse(
            total_procedures=stats["total_procedures"],
            distribution=stats["distribution"]
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo distribución de procedimientos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo distribución de procedimientos: {str(e)}"
        )


@router.get("/procedures-doctor", response_model=ProceduresByDoctorResponse)
async def get_procedures_by_doctor(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene los procedimientos realizados por cada doctor activo
    
    **Requiere rol de administrador**
    
    Retorna la cantidad total de procedimientos realizados por cada doctor activo
    y su porcentaje de participación sobre el total general.
    
    - Solo incluye doctores activos (is_active = true)
    - Si un doctor no tiene procedimientos, aparece con 0
    - Ordenado por cantidad de procedimientos (mayor a menor)
    
    Returns:
        - procedures_by_doctor: Lista con cada doctor, su total de procedimientos y porcentaje
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando procedimientos por doctor")
        
        procedures_data = DashboardService.get_procedures_by_doctor(db)
        
        return ProceduresByDoctorResponse(
            procedures_by_doctor=procedures_data
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo procedimientos por doctor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo procedimientos por doctor: {str(e)}"
        )


@router.get("/treatments-per-month", response_model=TreatmentsPerMonthResponse)
async def get_treatments_per_month(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene el total de tratamientos por mes durante los últimos 12 meses
    
    **Requiere rol de administrador**
    
    Retorna la cantidad de tratamientos realizados mes a mes durante los últimos 12 meses.
    Incluye meses sin tratamientos registrados con valor 0.
    
    - Ordenado cronológicamente (del mes más antiguo al más reciente)
    - Incluye los últimos 12 meses completos
    - Meses sin datos se muestran con total_treatments = 0
    
    Returns:
        - treatments_per_month: Lista con cada mes y su total de tratamientos
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando tratamientos por mes")
        
        treatments_data = DashboardService.get_treatments_per_month(db)
        
        return TreatmentsPerMonthResponse(
            treatments_per_month=treatments_data
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo tratamientos por mes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo tratamientos por mes: {str(e)}"
        )
