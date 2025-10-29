"""
Router para el dashboard del sistema odontológico
Solo accesible para usuarios con rol de administrador
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
import logging

from ..database import get_db
from ..services.dashboard_service import DashboardService
from ..middleware.auth_middleware import get_current_admin_user
from ..models.user_models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Roles válidos en el sistema
VALID_ROLES = ["Administrator", "Auditor", "Doctor", "Asistente"]


# Schemas
class ActivePatientsResponse(BaseModel):
    """Respuesta con estadísticas de pacientes activos"""
    total_active_patients: int
    active_patients_period: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_active_patients": 200,
                "active_patients_period": 84
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
    start_date: Optional[date] = Query(None, description="Fecha de inicio para filtrar pacientes activos (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Fecha de fin para filtrar pacientes activos (YYYY-MM-DD)"),
    doctor_id: Optional[str] = Query(None, description="UID del doctor para filtrar pacientes atendidos"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene estadísticas de pacientes activos
    
    **Requiere rol de administrador**
    
    **Parámetros opcionales:**
    - **start_date**: Fecha de inicio para filtrar. Si solo se proporciona esta, filtra desde esta fecha hasta hoy
    - **end_date**: Fecha de fin para filtrar. Si solo se proporciona esta, filtra desde el inicio hasta esta fecha
    - **doctor_id**: Filtrar por pacientes atendidos por un doctor específico
    
    **Lógica de filtros de fecha:**
    - Solo start_date: Filtra desde esa fecha hasta hoy
    - Solo  end_date: Filtra desde el inicio hasta esa fecha
    - Ambos: Filtra el rango específico
    - Ninguno: Mes actual por defecto
    
    Returns:
        - total_active_patients: Número total de pacientes activos en el sistema
        - active_patients_period: Número de pacientes activos con al menos una atención en el período especificado
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando estadísticas de pacientes activos")
        
        # Validar fechas
        today = datetime.now().date()
        
        if start_date and start_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de inicio no puede ser mayor a la fecha actual ({today})"
            )
        
        if end_date and end_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de fin no puede ser mayor a la fecha actual ({today})"
            )
        
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser mayor a la fecha de fin"
            )
        
        stats = DashboardService.get_active_patients_stats(
            db, 
            start_date=start_date,
            end_date=end_date,
            doctor_id=doctor_id
        )
        
        return ActivePatientsResponse(
            total_active_patients=stats["total_active_patients"],
            active_patients_period=stats["active_patients_period"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de pacientes activos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.get("/employees", response_model=EmployeesByRoleResponse)
async def get_employees_by_role(
    role: Optional[str] = Query(None, description="Filtrar por rol específico (Doctor, Asistente, Administrator, Auditor)"),
    is_active: Optional[bool] = Query(True, description="Filtrar por estado activo/inactivo (true/false)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene estadísticas de empleados agrupados por rol
    
    **Requiere rol de administrador**
    
    **Parámetros opcionales:**
    - **role**: Filtrar por rol específico (Doctor, Asistente, Administrator, Auditor)
    - **is_active**: Incluir solo empleados activos (default: true)
    
    Returns:
        - total_general: Número total de empleados en el sistema
        - detail_by_role: Lista con el detalle de empleados por cada rol
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando estadísticas de empleados por rol")
        
        # Validar que el rol sea válido si se proporciona
        if role and role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Rol inválido '{role}'. Los roles válidos son: {', '.join(VALID_ROLES)}"
            )
        
        stats = DashboardService.get_employees_by_role_stats(
            db,
            role=role,
            is_active=is_active
        )
        
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
    start_date: Optional[date] = Query(None, description="Fecha de inicio para filtrar procedimientos (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Fecha de fin para filtrar procedimientos (YYYY-MM-DD)"),
    doctor_id: Optional[str] = Query(None, description="UID del doctor para filtrar procedimientos"),
    procedure_id: Optional[int] = Query(None, description="ID del procedimiento dental específico"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene la distribución de procedimientos odontológicos realizados
    
    **Requiere rol de administrador**
    
    **Parámetros opcionales:**
    - **start_date**: Fecha de inicio para filtrar. Si solo se proporciona esta, filtra desde esta fecha en adelante
    - **end_date**: Fecha de fin para filtrar. Si solo se proporciona esta, filtra hasta esta fecha
    - **doctor_id**: Filtrar por procedimientos de un doctor específico
    - **procedure_id**: Filtrar por tipo de procedimiento específico
    
    **Lógica de filtros de fecha:**
    - Solo start_date: Filtra desde esa fecha en adelante
    - Solo end_date: Filtra hasta esa fecha
    - Ambos: Filtra el rango específico
    - Ninguno: Todos los procedimientos históricos
    
    Retorna la cantidad de veces que se realizó cada procedimiento y su porcentaje
    sobre el total de procedimientos realizados.
    
    Returns:
        - total_procedures: Número total de procedimientos realizados
        - distribution: Lista con cada procedimiento, su cantidad y porcentaje
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando distribución de procedimientos")
        
        # Validar fechas
        today = datetime.now().date()
        
        if start_date and start_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de inicio no puede ser mayor a la fecha actual ({today})"
            )
        
        if end_date and end_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de fin no puede ser mayor a la fecha actual ({today})"
            )
        
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser mayor a la fecha de fin"
            )
        
        stats = DashboardService.get_procedures_distribution(
            db,
            start_date=start_date,
            end_date=end_date,
            doctor_id=doctor_id,
            procedure_id=procedure_id
        )
        
        return ProceduresDistributionResponse(
            total_procedures=stats["total_procedures"],
            distribution=stats["distribution"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo distribución de procedimientos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo distribución de procedimientos: {str(e)}"
        )


@router.get("/procedures-doctor", response_model=ProceduresByDoctorResponse)
async def get_procedures_by_doctor(
    start_date: Optional[date] = Query(None, description="Fecha de inicio para contar procedimientos (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Fecha de fin para contar procedimientos (YYYY-MM-DD)"),
    procedure_id: Optional[int] = Query(None, description="ID del procedimiento dental para filtrar"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene los procedimientos realizados por cada doctor activo
    
    **Requiere rol de administrador**
    
    **Parámetros opcionales:**
    - **start_date**: Fecha de inicio para contar procedimientos. Si solo se proporciona esta, filtra desde esta fecha en adelante
    - **end_date**: Fecha de fin para contar procedimientos. Si solo se proporciona esta, filtra hasta esta fecha
    - **procedure_id**: Filtrar por tipo de procedimiento específico (ej: solo implantes)
    
    **Lógica de filtros de fecha:**
    - Solo start_date: Filtra desde esa fecha en adelante
    - Solo end_date: Filtra hasta esa fecha
    - Ambos: Filtra el rango específico
    - Ninguno: Todos los procedimientos históricos
    
    Retorna la cantidad total de procedimientos realizados por cada doctor activo
    y su porcentaje de participación sobre el total general.
    
    - Solo incluye doctores activos (is_active = true)
    - Si un doctor no tiene procedimientos en el período, aparece con 0
    - Ordenado por cantidad de procedimientos (mayor a menor)
    
    Returns:
        - procedures_by_doctor: Lista con cada doctor, su total de procedimientos y porcentaje
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando procedimientos por doctor")
        
        # Validar fechas
        today = datetime.now().date()
        
        if start_date and start_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de inicio no puede ser mayor a la fecha actual ({today})"
            )
        
        if end_date and end_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de fin no puede ser mayor a la fecha actual ({today})"
            )
        
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser mayor a la fecha de fin"
            )
        
        procedures_data = DashboardService.get_procedures_by_doctor(
            db,
            start_date=start_date,
            end_date=end_date,
            procedure_id=procedure_id
        )
        
        return ProceduresByDoctorResponse(
            procedures_by_doctor=procedures_data
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo procedimientos por doctor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo procedimientos por doctor: {str(e)}"
        )


@router.get("/treatments-per-month", response_model=TreatmentsPerMonthResponse)
async def get_treatments_per_month(
    year: Optional[int] = Query(None, description="Año específico para filtrar (YYYY), por defecto últimos 12 meses"),
    doctor_id: Optional[str] = Query(None, description="UID del doctor para filtrar tratamientos"),
    procedure_id: Optional[int] = Query(None, description="ID del procedimiento dental para filtrar"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene el total de tratamientos por mes durante los últimos 12 meses o un año específico
    
    **Requiere rol de administrador**
    
    **Parámetros opcionales:**
    - **year**: Año específico para generar el gráfico (por defecto: últimos 12 meses)
    - **doctor_id**: Filtrar por tratamientos de un doctor específico
    - **procedure_id**: Filtrar por tipo de procedimiento específico (ej: empastes)
    
    Retorna la cantidad de tratamientos realizados mes a mes.
    Incluye meses sin tratamientos registrados con valor 0.
    
    - Ordenado cronológicamente (del mes más antiguo al más reciente)
    - Si se especifica year: muestra los 12 meses de ese año
    - Si no se especifica year: muestra los últimos 12 meses
    - Meses sin datos se muestran con total_treatments = 0
    
    Returns:
        - treatments_per_month: Lista con cada mes y su total de tratamientos
    """
    try:
        # logger.info(f"Usuario admin {current_user.email} solicitando tratamientos por mes")
        
        # Validar que el año no sea mayor al actual
        if year is not None:
            current_year = datetime.now().year
            
            if year > current_year:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El año {year} no puede ser mayor al año actual ({current_year})"
                )
            
            # Validación adicional: año mínimo razonable (ej: 2000)
            if year < 2000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El año {year} no es válido. Debe ser mayor o igual a 2000"
                )
        
        treatments_data = DashboardService.get_treatments_per_month(
            db,
            year=year,
            doctor_id=doctor_id,
            procedure_id=procedure_id
        )
        
        return TreatmentsPerMonthResponse(
            treatments_per_month=treatments_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo tratamientos por mes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo tratamientos por mes: {str(e)}"
        )
