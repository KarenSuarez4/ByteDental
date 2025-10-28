"""
Router de reportes para ByteDental
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from ..database import get_db
from ..services.report_service import ReportService
from ..schemas.report_shema import ConsolidatedActivitiesResponse, ConsolidatedActivityItem, ReportErrorResponse
from ..middleware.auth_middleware import get_current_admin_user
from ..models.user_models import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["Reportes"]
)

@router.get(
    "/consolidated-activities",
    summary="Obtener consolidado de actividades odontológicas",
    description="Genera un reporte de los tratamientos realizados en un rango de fechas. Solo accesible por administradores.",
    responses={
        200: {
            "description": "Reporte generado exitosamente (JSON o PDF)",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Reporte generado exitosamente",
                        "data": [],
                        "total": 0,
                        "period": {
                            "startDate": "2025-10-01",
                            "endDate": "2025-10-31"
                        }
                    }
                },
                "application/pdf": {
                    "schema": {
                        "type": "string",
                        "format": "binary"
                    }
                }
            }
        },
        400: {"description": "Parámetros inválidos"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado (no es administrador)"}
    }
)
async def get_consolidated_activities(
    startDate: str = Query(..., description="Fecha de inicio (formato YYYY-MM-DD)", pattern=r'^\d{4}-\d{2}-\d{2}$'),
    endDate: str = Query(..., description="Fecha de fin (formato YYYY-MM-DD)", pattern=r'^\d{4}-\d{2}-\d{2}$'),
    format: str = Query("pdf", description="Formato del reporte (pdf)", pattern=r'^(pdf)$'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Obtiene el consolidado de actividades odontológicas en un rango de fechas.
    
    **Parámetros:**
    - **startDate**: Fecha de inicio en formato YYYY-MM-DD
    - **endDate**: Fecha de fin en formato YYYY-MM-DD
    - **format**: Formato del reporte. Actualmente solo soporta "pdf"
    
    **Autenticación:**
    - Solo usuarios con rol Administrator pueden acceder a este endpoint
    
    **Respuesta:**
    - Si format="pdf": Retorna un archivo PDF descargable
    - Si format="json": Retorna los datos en formato JSON (próximamente)
    """
    try:
        # Validar que las fechas no estén vacías (ya validado por Query required)
        if not startDate or not endDate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe especificar el rango de fechas"
            )
        
        # Validar formato de fechas
        try:
            start_date_obj = datetime.strptime(startDate, "%Y-%m-%d")
            end_date_obj = datetime.strptime(endDate, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido. Use YYYY-MM-DD"
            )
        
        # Validar que la fecha de inicio no sea posterior a la fecha de fin
        if start_date_obj > end_date_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser posterior a la fecha de fin"
            )
        
        # Validar formato del reporte
        if format not in ["pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato inválido. Solo se acepta 'pdf'"
            )
        
        # Obtener datos del reporte
        logger.info(f"Usuario {current_user.email} solicitó reporte consolidado del {startDate} al {endDate}")
        data = ReportService.get_consolidated_activities(db, startDate, endDate)
        
        # Si no hay datos, retornar respuesta vacía
        if not data:
            logger.info(f"No se encontraron registros para el periodo {startDate} - {endDate}")
            return {
                "success": True,
                "message": "No se encontraron registros en el periodo especificado",
                "data": [],
                "total": 0,
                "period": {
                    "startDate": startDate,
                    "endDate": endDate
                }
            }
        
        # Generar PDF
        if format == "pdf":
            pdf_buffer = ReportService.generate_consolidated_activities_pdf(data, startDate, endDate)
            
            # Nombre del archivo con la fecha de generación
            generation_date = datetime.now().strftime("%Y%m%d")
            filename = f"consolidado_actividades_{generation_date}.pdf"
            
            logger.info(f"PDF generado exitosamente: {filename}")
            
            # Retornar el PDF como respuesta
            return StreamingResponse(
                pdf_buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar reporte consolidado: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el reporte: {str(e)}"
        )
