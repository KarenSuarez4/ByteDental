from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy import func, and_
import logging

from app.models.treatment_models import Treatment
from app.models.dental_service_models import DentalService
from app.schemas.report_schema import MonthlyReport

logger = logging.getLogger(__name__)

class ReportService:
    """Capa de negocio encargada de generar reportes clínicos y mensuales."""

    def __init__(self, db):
        self.db = db

    def generate_monthly_report(self, report_date: datetime, generated_by: str = "Administrador") -> MonthlyReport:
        """
        Genera un reporte mensual agrupado por tipo de procedimiento.
        Incluye todos los tratamientos realizados entre el primer y último día del mes.
        """
        try:
            if not report_date:
                report_date = datetime.now()

            start_date = report_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            end_date = next_month - timedelta(seconds=1)

            logger.info(
                f"[ReportService] Generando reporte mensual del "
                f"{start_date.strftime('%Y-%m-%d')} al {end_date.strftime('%Y-%m-%d')} "
                f"por {generated_by}"
            )

            query = (
                self.db.query(
                    DentalService.name.label("procedure_name"),
                    func.count(Treatment.id).label("patient_count")
                )
                .join(Treatment, Treatment.dental_service_id == DentalService.id)
                .filter(
                    and_(
                        Treatment.treatment_date >= start_date,
                        Treatment.treatment_date <= end_date
                    )
                )
                .group_by(DentalService.name)
            )

            results = query.all()

            if not results:
                logger.warning(
                    f"[ReportService] No se encontraron tratamientos en el periodo "
                    f"{start_date.strftime('%Y-%m-%d')} a {end_date.strftime('%Y-%m-%d')}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No se encontraron actividades en el período especificado"
                )

            procedures = [
                {"procedure_name": r.procedure_name, "patient_count": r.patient_count}
                for r in results
            ]
            total_patients = sum(p["patient_count"] for p in procedures)

            logger.info(
                f"[ReportService] Reporte mensual generado con {len(procedures)} procedimientos "
                f"y {total_patients} pacientes atendidos."
            )

            return MonthlyReport(
                generated_by=generated_by,
                month=start_date.month,
                year=start_date.year,
                start_date=start_date,
                end_date=end_date,
                procedures=procedures,
                total_patients=total_patients
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ReportService] Error al generar el reporte mensual: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno al generar el reporte mensual"
            )
