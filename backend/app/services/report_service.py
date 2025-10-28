# app/services/report_service.py
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status
from app.models.treatment_models import Treatment
from app.models.clinical_history_models import ClinicalHistory
from app.models.patient_models import Patient
from app.models.person_models import Person
from app.models.dental_service_models import DentalService
from app.models.user_models import User
from app.schemas.report_schema import ActivityReport, MonthlyReport


class ReportService:
    """Capa de negocio encargada de generar reportes clínicos y mensuales."""

    def __init__(self, db: Session):
        self.db = db

    def generate_activity_report(
        self,
        start_date: datetime,
        end_date: datetime,
        generated_by: str = "Administrador"  
    ) -> ActivityReport:
        """Genera un reporte de actividades odontológicas entre dos fechas."""
        query = self.db.query(
            Treatment.treatment_date,
            Person.first_name,
            Person.first_surname,
            Person.document_number,
            Person.phone,
            DentalService.name.label('procedure_name'),
            User.first_name.label('doctor_first_name'),
            User.last_name.label('doctor_last_name')
        ).join(
            ClinicalHistory, Treatment.clinical_history_id == ClinicalHistory.id
        ).join(
            Patient, ClinicalHistory.patient_id == Patient.id
        ).join(
            Person, Patient.person_id == Person.id
        ).join(
            DentalService, Treatment.dental_service_id == DentalService.id
        ).join(
            User, Treatment.doctor_id == User.uid
        ).filter(
            and_(
                Treatment.treatment_date >= start_date,
                Treatment.treatment_date <= end_date
            )
        ).order_by(Treatment.treatment_date)

        results = query.all()

        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron actividades en el período especificado"
            )

        activities = [
            {
                "treatment_date": r.treatment_date,
                "patient_name": f"{r.first_name} {r.first_surname}",
                "document_number": r.document_number,
                "phone": r.phone,
                "procedure_name": r.procedure_name,
                "doctor_name": f"{r.doctor_first_name} {r.doctor_last_name}"
            }
            for r in results
        ]

        return ActivityReport(
            start_date=start_date,
            end_date=end_date,
            generated_by=generated_by,
            activities=activities,
            total_activities=len(activities)
        )


    def generate_monthly_report(self, report_date: datetime, generated_by: str = "Administrador") -> MonthlyReport:
        """Genera un reporte mensual agrupado por tipo de procedimiento."""
        end_date = report_date or datetime.now()
        start_date = end_date.replace(day=1)

        query = self.db.query(
            DentalService.name.label('procedure_name'),
            func.count(Treatment.id).label('patient_count')
        ).join(
            Treatment, Treatment.dental_service_id == DentalService.id
        ).filter(
            and_(
                Treatment.treatment_date >= start_date,
                Treatment.treatment_date <= end_date
            )
        ).group_by(DentalService.name)

        results = query.all()
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron actividades en el período especificado"
            )

        procedures = [
            {"procedure_name": r.procedure_name, "patient_count": r.patient_count}
            for r in results
        ]
        total_patients = sum(p["patient_count"] for p in procedures)

        return MonthlyReport(
            generated_by=generated_by,
            month=end_date.month,
            year=end_date.year,
            start_date=start_date,
            end_date=end_date,
            procedures=procedures,
            total_patients=total_patients
        )
