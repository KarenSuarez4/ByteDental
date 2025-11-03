
from fastapi import (
    APIRouter, Depends, Request, Response, HTTPException, status, Query
)
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging
import re
from pydantic import Field

from app.database import get_db
from app.schemas.report_schema import (
    ActivityReportFilters, MonthlyReportFilters,
    ActivityReport, MonthlyReport
)
from app.services.report_service import ReportService
from app.utils.pdf_generator import generate_activity_pdf, generate_monthly_pdf
from app.middleware.auth_middleware import get_current_admin_user as require_admin
from app.models.user_models import User

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {
            "description": "No autenticado - Se requieren credenciales de administrador",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not validate credentials"}
                }
            }
        },
        403: {
            "description": "Sin autorización - El usuario no tiene permisos de administrador",
            "content": {
                "application/json": {
                    "example": {"detail": "User does not have admin privileges"}
                }
            }
        },
        404: {
            "description": "No se encontraron datos para el período especificado",
            "content": {
                "application/json": {
                    "example": {"detail": "No se encontraron actividades en el período especificado"}
                }
            }
        },
        500: {
            "description": "Error interno del servidor",
            "content": {
                "application/json": {
                    "example": {"detail": "Error interno al generar el reporte"}
                }
            }
        }
    }
)


async def validate_date_range(start_date: datetime, end_date: datetime):
    """
    Validates date range constraints for reports.
    
    Args:
        start_date (datetime): Initial date for the report period
        end_date (datetime): End date for the report period
        
    Raises:
        HTTPException: If date validation fails
    """
    # Ensure dates are not in the future
    now = datetime.now(timezone.utc)
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    
    if start_date > now or end_date > now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las fechas no pueden ser futuras"
        )
    
    # Ensure start_date is before end_date
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha inicial debe ser anterior a la fecha final"
        )
    
    # Limit report range to 1 year
    date_diff = end_date - start_date
    if date_diff.days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rango de fechas no puede exceder 1 año"
        )


def validate_output_format(format: str):
    """
    Validates the requested output format.
    
    Args:
        format (str): Requested output format (json/pdf)
        
    Raises:
        HTTPException: If format is invalid
    """
    if format.lower() not in ['json', 'pdf']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no válido. Use 'json' o 'pdf'"
        )


@router.post(
    "/activities",
    response_model=ActivityReport,
    summary="Generar reporte de actividades odontológicas",
    description="""
    Genera un reporte detallado de actividades odontológicas para un período específico.
    
    El reporte incluye:
    - Listado de tratamientos realizados
    - Información de pacientes
    - Detalles del procedimiento
    - Doctor responsable
    
    El reporte puede generarse en formato JSON o PDF.
    
    Se requieren permisos de administrador.
    """,
    responses={
        200: {
            "description": "Reporte generado exitosamente",
            "content": {
                "application/json": {
                    "example": {
                        "start_date": "2025-01-01T00:00:00",
                        "end_date": "2025-01-31T23:59:59",
                        "generated_by": "Admin User",
                        "activities": [
                            {
                                "treatment_date": "2025-01-15T10:30:00",
                                "patient_name": "Juan Pérez",
                                "document_number": "123456789",
                                "phone": "3165181414",
                                "procedure_name": "Limpieza Dental",
                                "doctor_name": "Dr. Carlos Moreno"
                            }
                        ],
                        "total_activities": 1
                    }
                },
                "application/pdf": {
                    "example": "Binary PDF data"
                }
            }
        }
    }
)
async def get_activities_report(
    filters: ActivityReportFilters,
    response: Response,
    format: str = Query(
        default="json",
        regex="^(json|pdf)$",
        description="Formato de salida del reporte (json/pdf)"
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """
    Endpoint para generar reportes de actividades odontológicas.
    
    Args:
        filters (ActivityReportFilters): Filtros de fecha para el reporte
        response (Response): Objeto response de FastAPI
        format (str): Formato de salida (json/pdf)
        db (Session): Sesión de base de datos
        current_admin (User): Usuario administrador autenticado
    
    Returns:
        Union[ActivityReport, Response]: Reporte en formato JSON o PDF
    """
    try:
        # Validate date range
        await validate_date_range(filters.start_date, filters.end_date)
        validate_output_format(format)
        
        # Log report generation attempt
        logger.info(
            f"Generando reporte de actividades - Admin: {current_admin.email} - "
            f"Período: {filters.start_date} a {filters.end_date}"
        )
        
        # Generate report data
        admin_full_name = f"{current_admin.first_name} {current_admin.last_name}"
        service = ReportService(db)
        report_data = service.generate_activity_report(
            filters.start_date,
            filters.end_date,
            generated_by=admin_full_name
        )    

        # Return PDF if requested
        if format.lower() == "pdf":
            pdf_bytes = generate_activity_pdf(report_data)
            filename = f"actividades_{filters.start_date.strftime('%Y%m%d')}_{filters.end_date.strftime('%Y%m%d')}.pdf"
            response.headers["Content-Disposition"] = f"attachment; filename={filename}"
            logger.info(f"Reporte PDF generado exitosamente: {filename}")
            return Response(content=pdf_bytes, media_type="application/pdf")

        # Log successful JSON generation
        logger.info("Reporte JSON generado exitosamente")
        return report_data
        
    except HTTPException as he:
        # Re-raise HTTP exceptions for proper status codes
        logger.warning(f"Error de validación: {str(he)}")
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Error generando reporte: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al generar el reporte"
        )


@router.post(
    "/monthly",
    response_model=MonthlyReport,
    summary="Generar reporte mensual consolidado",
    description="""
    Genera un reporte mensual consolidado de actividades odontológicas.
    
    El reporte incluye:
    - Resumen de procedimientos realizados
    - Conteo de pacientes por tipo de procedimiento
    - Total de pacientes atendidos
    
    El reporte puede generarse en formato JSON o PDF.
    
    Se requieren permisos de administrador.
    """,
    responses={
        200: {
            "description": "Reporte generado exitosamente",
            "content": {
                "application/json": {
                    "example": {
                        "generated_by": "Admin User",
                        "month": 1,
                        "year": 2025,
                        "start_date": "2025-01-01T00:00:00",
                        "end_date": "2025-01-31T23:59:59",
                        "procedures": [
                            {
                                "procedure_name": "Limpieza Dental",
                                "patient_count": 15
                            }
                        ],
                        "total_patients": 15
                    }
                },
                "application/pdf": {
                    "example": "Binary PDF data"
                }
            }
        }
    }
)
async def get_monthly_report(
    request: Request,
    filters: MonthlyReportFilters,
    response: Response,
    format: str = Query(
        default="json",
        regex="^(json|pdf)$",
        description="Formato de salida del reporte (json/pdf)"
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """
    Endpoint para generar reportes mensuales consolidados.
    
    Args:
        request (Request): Objeto request de FastAPI
        filters (MonthlyReportFilters): Filtros para el reporte mensual
        response (Response): Objeto response de FastAPI
        format (str): Formato de salida (json/pdf)
        db (Session): Sesión de base de datos
        current_admin (User): Usuario administrador autenticado
    
    Returns:
        Union[MonthlyReport, Response]: Reporte en formato JSON o PDF
    """
    try:
        validate_output_format(format)
        report_date = filters.report_date or datetime.now()
        
        # Log report generation attempt
        logger.info(
            f"Generando reporte mensual - Admin: {current_admin.email} - "
            f"Mes: {report_date.month}/{report_date.year}"
        )
        
        # Generate report data
        admin_full_name = f"{current_admin.first_name} {current_admin.last_name}"
        service = ReportService(db)
        report_data = service.generate_monthly_report(
            report_date,
            generated_by=admin_full_name
        )

        # Return PDF if requested
        if format.lower() == "pdf":
            pdf_bytes = generate_monthly_pdf(report_data)
            filename = f"reporte_mensual_{report_date.strftime('%Y%m')}.pdf"
            response.headers["Content-Disposition"] = f"attachment; filename={filename}"
            logger.info(f"Reporte PDF generado exitosamente: {filename}")
            return Response(content=pdf_bytes, media_type="application/pdf")

        # Log successful JSON generation
        logger.info("Reporte mensual JSON generado exitosamente")
        return report_data
        
    except HTTPException as he:
        # Re-raise HTTP exceptions for proper status codes
        logger.warning(f"Error de validación: {str(he)}")
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Error generando reporte mensual: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al generar el reporte mensual"
        )