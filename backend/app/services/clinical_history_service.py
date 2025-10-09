from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from typing import Optional
from app.models.clinical_history_models import ClinicalHistory
from app.models.patient_models import Patient
from app.schemas.clinical_history_schema import ClinicalHistoryCreate
from fastapi import HTTPException, status
from app.services.auditoria_service import AuditoriaService
from app.models.treatment_models import Treatment
from app.models.user_models import User

class ClinicalHistoryService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user

    def create_clinical_history(self, data: ClinicalHistoryCreate) -> ClinicalHistory:
        # Validar que el paciente existe
        patient = self.db.query(Patient).filter(Patient.id == data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")

        # Verificar si el paciente ya tiene una historia clínica
        existing_history = self.db.query(ClinicalHistory).filter(
            ClinicalHistory.patient_id == data.patient_id
        ).first()

        if existing_history:
            raise HTTPException(
                status_code=400,
                detail="El paciente ya tiene una historia clínica registrada."
            )

        # Construir previous_treatments
        previous_treatments = self.build_previous_treatments(data.patient_id)

        # Validar y crear medical_history con previous_treatments
        if not isinstance(data.medical_history, dict):
            raise HTTPException(
                status_code=400,
                detail="El campo medical_history debe ser un diccionario válido."
            )

        medical_history = data.medical_history
        medical_history["previous_treatments"] = previous_treatments

        # Crear la historia clínica
        try:
            clinical_history = ClinicalHistory(
                patient_id=data.patient_id,
                reason=data.reason,
                symptoms=data.symptoms,
                medical_history=str(medical_history),
                findings=data.findings,
                doctor_signature=self.current_user.first_name + " " + self.current_user.last_name,  # Usar current_user
            )
            self.db.add(clinical_history)
            self.db.commit()
            self.db.refresh(clinical_history)

            # Crear tratamientos
            self.create_treatments(clinical_history.id, data.treatments, self.current_user.uid)

            # Registrar en auditoría
            AuditoriaService().registrar_evento(
                db=self.db,
                usuario_id=self.current_user.uid,
                tipo_evento="CREATE",
                registro_afectado_id=clinical_history.id,
                registro_afectado_tipo="ClinicalHistory",
                descripcion_evento="Creación de historia clínica",
                detalles_cambios={
                    "patient_id": data.patient_id,
                    "reason": data.reason,
                    "symptoms": data.symptoms,
                    "findings": data.findings
                }
            )

            return {
                "message": "La historia clínica ha sido registrada exitosamente.",
                "clinical_history": clinical_history
            }

        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error al guardar la historia clínica: {str(e)}"
            )

    def search_clinical_histories(self, patient_id: Optional[int] = None, name: Optional[str] = None, page: int = 1, limit: int = 10):
        query = self.db.query(ClinicalHistory).join(Patient)

        if patient_id:
            query = query.filter(ClinicalHistory.patient_id == patient_id)

        if name:
            query = query.filter(Patient.name.ilike(f"%{name}%"))

        # Paginación
        total = query.count()
        results = query.offset((page - 1) * limit).limit(limit).all()

        if not results:
            raise HTTPException(
                status_code=404,
                detail="No se encontraron historias clínicas coincidentes."
            )

        # Formatear la respuesta
        formatted_results = [
            {
                "id": history.id,
                "patient_name": history.patient.name,
                "reason": history.reason,
                "symptoms": history.symptoms,
                "medical_history": history.medical_history,
                "findings": history.findings,
                "treatments": [
                    {
                        "date": treatment.treatment_date,
                        "name": treatment.dental_service.name,
                        "doctor_name": treatment.doctor_id,
                        "notes": treatment.notes
                    }
                    for treatment in history.treatments
                ]
            }
            for history in results
        ]

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "results": formatted_results
        }

    def check_database_connection(self):
        try:
            self.db.execute("SELECT 1")
        except SQLAlchemyError:
            raise HTTPException(
                status_code=500,
                detail="No se pudo conectar a la base de datos. Intente nuevamente más tarde."
            )

    def build_previous_treatments(self, patient_id: int):
        treatments = self.db.query(Treatment).join(ClinicalHistory).filter(ClinicalHistory.patient_id == patient_id).all()
        previous_treatments = []

        for treatment in treatments:
            service_name = treatment.dental_service.name if treatment.dental_service else "Servicio desconocido"
            doctor_name = f"{treatment.doctor.first_name} {treatment.doctor.last_name}" if treatment.doctor else "Doctor desconocido"

            previous_treatments.append({
                "date": treatment.treatment_date,
                "service_name": service_name,
                "doctor_name": doctor_name
            })

        return previous_treatments

    def create_treatments(self, clinical_history_id: int, treatments_data: list, doctor_id: str):
        for treatment_data in treatments_data:
            if not treatment_data.dental_service_id or not treatment_data.treatment_date:
                raise HTTPException(
                    status_code=400,
                    detail="Datos de tratamiento incompletos."
                )

            treatment = Treatment(
                clinical_history_id=clinical_history_id,
                dental_service_id=treatment_data.dental_service_id,
                doctor_id=doctor_id,
                treatment_date=treatment_data.treatment_date,
                notes=treatment_data.notes
            )
            self.db.add(treatment)
        self.db.commit()