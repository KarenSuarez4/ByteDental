from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import date, datetime
from app.models.person_models import Person
from app.models.patient_models import Patient
from app.models.guardian_models import Guardian
from app.schemas.patient_schema import PatientCreate, PatientUpdate
from app.services.person_service import PersonService, serialize_for_audit
from app.services.auditoria_service import AuditoriaService

class PatientService:
    
    def __init__(self, db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None):
        self.db = db
        self.user_id = user_id or "system"
        self.user_ip = user_ip
        self.person_service = PersonService(db, user_id, user_ip)
        self.auditoria_service = AuditoriaService()
    
    def create_patient(self, patient_data: PatientCreate) -> Patient:
        """Crear un nuevo paciente (incluye crear la persona)"""
        # Verificar que no exista otra persona con el mismo documento
        existing_person = self.person_service.get_person_by_document(
            patient_data.person.document_number
        )
        if existing_person:
            raise ValueError(f"Ya existe una persona con el documento {patient_data.person.document_number}")
        
        try:
            # Crear la persona primero
            person = self.person_service.create_person(patient_data.person)
            
            # Calcular si requiere guardian basado en la edad (menores de 18 o mayores de 64)
            age = self.person_service.calculate_age(person.birthdate)
            requires_guardian = age < 18 or age > 64
            
            # Verificar que el guardian existe si se proporciona
            guardian_id = None
            if hasattr(patient_data, 'guardian_id') and patient_data.guardian_id:
                guardian = self.db.query(Guardian).filter(
                    and_(Guardian.id == patient_data.guardian_id, Guardian.is_active == True)
                ).first()
                if not guardian:
                    raise ValueError(f"El guardian con ID {patient_data.guardian_id} no existe o no está activo")
                guardian_id = patient_data.guardian_id
            
            # Crear el paciente
            patient = Patient(
                person_id=person.id,
                occupation=patient_data.occupation,
                guardian_id=guardian_id,
                requires_guardian=requires_guardian
            )
            
            self.db.add(patient)
            self.db.commit()
            self.db.refresh(patient)
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="CREATE",
                registro_afectado_id=str(patient.id),
                registro_afectado_tipo="patients",
                descripcion_evento=f"Nuevo paciente creado: {person.first_name} {person.first_surname}",
                detalles_cambios={
                    "person_data": serialize_for_audit(patient_data.person.model_dump()),
                    "patient_data": {
                        "occupation": patient_data.occupation,
                        "guardian_id": guardian_id,
                        "requires_guardian": requires_guardian
                    }
                },
                ip_origen=self.user_ip
            )
            
            # Cargar la relación con person y guardian
            patient = self.get_patient_by_id(patient.id, include_person=True, include_guardian=True)
            return patient
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_patient_by_id(self, patient_id: int, include_person: bool = True, include_guardian: bool = False) -> Optional[Patient]:
        """Obtener paciente por ID"""
        query = self.db.query(Patient)
        
        if include_person:
            query = query.options(joinedload(Patient.person))
        
        if include_guardian:
            query = query.options(joinedload(Patient.guardian).joinedload(Guardian.person))
        
        return query.filter(Patient.id == patient_id).first()
    
    def get_patient_by_document(self, document_number: str) -> Optional[Patient]:
        """Obtener paciente por número de documento"""
        return self.db.query(Patient).join(Person).filter(
            Person.document_number == document_number
        ).options(joinedload(Patient.person)).first()
    
    def get_patients(
        self, 
        skip: int = 0, 
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None,
        requires_guardian: Optional[bool] = None,
        has_guardian: Optional[bool] = None
    ) -> List[Patient]:
        """Obtener lista de pacientes con filtros"""
        query = self.db.query(Patient).join(Person).options(
            joinedload(Patient.person),
            joinedload(Patient.guardian).joinedload(Guardian.person)
        )
        
        if active_only:
            query = query.filter(Patient.is_active == True)
        
        if requires_guardian is not None:
            query = query.filter(Patient.requires_guardian == requires_guardian)
        
        if has_guardian is not None:
            if has_guardian:
                query = query.filter(Patient.guardian_id.isnot(None))
            else:
                query = query.filter(Patient.guardian_id.is_(None))
        
        if search:
            search_filter = or_(
                Person.first_name.ilike(f"%{search}%"),
                Person.first_surname.ilike(f"%{search}%"),
                Person.second_surname.ilike(f"%{search}%"),
                Person.document_number.ilike(f"%{search}%"),
                Person.email.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.offset(skip).limit(limit).all()
    
    def update_patient(self, patient_id: int, patient_data: PatientUpdate) -> Optional[Patient]:
        """Actualizar paciente (puede incluir datos de persona)"""
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            return None
        
        try:
            # Actualizar datos de la persona si se proporcionan
            if patient_data.person:
                self.person_service.update_person(patient.person_id, patient_data.person)
            
            # Actualizar datos específicos del paciente
            patient_fields = patient_data.model_dump(exclude_unset=True, exclude={'person'})
            
            # Validar guardian_id si se proporciona
            if 'guardian_id' in patient_fields and patient_fields['guardian_id']:
                guardian = self.db.query(Guardian).filter(
                    and_(Guardian.id == patient_fields['guardian_id'], Guardian.is_active == True)
                ).first()
                if not guardian:
                    raise ValueError(f"El guardian con ID {patient_fields['guardian_id']} no existe o no está activo")
            
            # Recalcular requires_guardian si se actualiza la fecha de nacimiento
            if patient_data.person and patient_data.person.birthdate:
                age = self.person_service.calculate_age(patient_data.person.birthdate)
                patient_fields['requires_guardian'] = age < 18 or age > 64
            
            for field, value in patient_fields.items():
                setattr(patient, field, value)
            
            self.db.commit()
            self.db.refresh(patient)
            
            return self.get_patient_by_id(patient.id, include_person=True, include_guardian=True)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_patient(self, patient_id: int) -> bool:
        """Eliminar paciente (soft delete)"""
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            return False
        
        # Guardar datos para auditoría antes del cambio
        person_info = f"{patient.person.first_name} {patient.person.first_surname}" if patient.person else "N/A"
        
        patient.is_active = False
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="DELETE",
            registro_afectado_id=str(patient.id),
            registro_afectado_tipo="patients",
            descripcion_evento=f"Paciente desactivado: {person_info}",
            detalles_cambios={"is_active": {"antes": True, "despues": False}},
            ip_origen=self.user_ip
        )
        
        return True
    
    def update_guardian_requirements_by_age(self) -> dict:
        """
        Actualizar requirements de guardian basado en edad actual de todos los pacientes.
        """
        updated_patients = []
        patients = self.db.query(Patient).join(Person).options(joinedload(Patient.person)).filter(
            Patient.is_active == True
        ).all()
        
        for patient in patients:
            current_age = self.person_service.calculate_age(patient.person.birthdate)
            should_require_guardian = current_age < 18 or current_age > 64
            
            if patient.requires_guardian != should_require_guardian:
                patient.requires_guardian = should_require_guardian
                updated_patients.append({
                    "id": patient.id,
                    "name": f"{patient.person.first_name} {patient.person.first_surname}",
                    "age": current_age,
                    "now_requires_guardian": should_require_guardian
                })
        
        if updated_patients:
            self.db.commit()
        
        return {
            "updated_count": len(updated_patients),
            "updated_patients": updated_patients
        }
    
    def change_patient_status(self, patient_id: int, new_status: bool, reason: Optional[str] = None) -> dict:
        """
        Cambiar estado de paciente con validación y auditoría completa
        
        Args:
            patient_id: ID del paciente
            new_status: True para activo, False para inactivo
            reason: Motivo de desactivación (requerido si new_status=False)
        
        Returns:
            dict con información del cambio realizado
        
        Raises:
            ValueError: Si las validaciones fallan
        """
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            raise ValueError("Paciente no encontrado")
        
        # Guardar estado anterior para auditoría
        previous_status = patient.is_active
        person_info = f"{patient.person.first_name} {patient.person.first_surname}" if patient.person else "N/A"
        
        # Validar transición de estado
        if previous_status == new_status:
            status_text = "activo" if new_status else "inactivo"
            raise ValueError(f"El paciente ya está {status_text}")
        
        # Validar motivo para desactivación
        if not new_status and not reason:
            raise ValueError("El motivo es requerido para desactivar un paciente")
        
        if new_status and reason:
            raise ValueError("No se debe proporcionar motivo al activar un paciente")
        
        try:
            # Actualizar estado
            patient.is_active = new_status
            self.db.commit()
            
            # Preparar detalles para auditoría
            change_details = {
                "is_active": {
                    "antes": previous_status,
                    "despues": new_status
                }
            }
            
            if reason:
                change_details["motivo_desactivacion"] = reason
            
            # Preparar descripción del evento
            if new_status:
                event_description = f"Paciente reactivado: {person_info}"
                event_type = "REACTIVATE"
            else:
                event_description = f"Paciente desactivado: {person_info} - Motivo: {reason}"
                event_type = "DEACTIVATE"
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento=event_type,
                registro_afectado_id=str(patient.id),
                registro_afectado_tipo="patients",
                descripcion_evento=event_description,
                detalles_cambios=change_details,
                ip_origen=self.user_ip
            )
            
            return {
                "patient_id": patient_id,
                "patient_name": person_info,
                "previous_status": "activo" if previous_status else "inactivo",
                "new_status": "activo" if new_status else "inactivo",
                "reason": reason,
                "message": f"Paciente {'activado' if new_status else 'desactivado'} correctamente"
            }
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def assign_guardian(self, patient_id: int, guardian_id: int) -> bool:
        """Asignar un guardian a un paciente"""
        # Verificar que el paciente existe
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            raise ValueError(f"El paciente con ID {patient_id} no existe")
        
        # Verificar que el guardian existe y está activo
        guardian = self.db.query(Guardian).filter(
            and_(Guardian.id == guardian_id, Guardian.is_active == True)
        ).first()
        if not guardian:
            raise ValueError(f"El guardian con ID {guardian_id} no existe o no está activo")
        
        old_guardian_id = patient.guardian_id
        patient.guardian_id = guardian_id
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="UPDATE",
            registro_afectado_id=str(patient_id),
            registro_afectado_tipo="patients",
            descripcion_evento=f"Guardian asignado al paciente {patient.person.first_name} {patient.person.first_surname}",
            detalles_cambios={"guardian_id": {"antes": old_guardian_id, "despues": guardian_id}},
            ip_origen=self.user_ip
        )
        
        return True
    
    def unassign_guardian(self, patient_id: int) -> bool:
        """Desasignar guardian de un paciente"""
        # Verificar que el paciente existe
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            raise ValueError(f"El paciente con ID {patient_id} no existe")
        
        # Verificar que el paciente no requiera guardian
        if patient.requires_guardian:
            raise ValueError("No se puede desasignar el guardian de un paciente que requiere supervisión")
        
        old_guardian_id = patient.guardian_id
        patient.guardian_id = None
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="UPDATE",
            registro_afectado_id=str(patient_id),
            registro_afectado_tipo="patients",
            descripcion_evento=f"Guardian desasignado del paciente {patient.person.first_name} {patient.person.first_surname}",
            detalles_cambios={"guardian_id": {"antes": old_guardian_id, "despues": None}},
            ip_origen=self.user_ip
        )
        
        return True

def get_patient_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> PatientService:
    """Factory para obtener instancia del servicio"""
    return PatientService(db, user_id, user_ip)
