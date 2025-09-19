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
            
            # Crear el paciente
            patient = Patient(
                person_id=person.id,
                occupation=patient_data.occupation,
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
                        "requires_guardian": requires_guardian
                    }
                },
                ip_origen=self.user_ip
            )
            
            # Cargar la relación con person
            patient = self.get_patient_by_id(patient.id, include_person=True)
            return patient
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_patient_by_id(self, patient_id: int, include_person: bool = True, include_guardians: bool = False) -> Optional[Patient]:
        """Obtener paciente por ID"""
        query = self.db.query(Patient)
        
        if include_person:
            query = query.options(joinedload(Patient.person))
        
        if include_guardians:
            query = query.options(joinedload(Patient.guardians).joinedload(Guardian.person))
        
        return query.filter(Patient.id == patient_id).first()
    
    def get_patient_by_person_id(self, person_id: int) -> Optional[Patient]:
        """Obtener paciente por ID de persona"""
        return self.db.query(Patient).filter(Patient.person_id == person_id).first()
    
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
        requires_guardian: Optional[bool] = None
    ) -> List[Patient]:
        """Obtener lista de pacientes con filtros"""
        query = self.db.query(Patient).join(Person).options(joinedload(Patient.person))
        
        if active_only:
            query = query.filter(Patient.is_active == True)
        
        if requires_guardian is not None:
            query = query.filter(Patient.requires_guardian == requires_guardian)
        
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
            patient_fields = patient_data.dict(exclude_unset=True, exclude={'person'})
            
            # Recalcular requires_guardian si se actualiza la fecha de nacimiento
            if patient_data.person and patient_data.person.birthdate:
                age = self.person_service.calculate_age(patient_data.person.birthdate)
                patient_fields['requires_guardian'] = age < 18 or age > 64
            
            for field, value in patient_fields.items():
                setattr(patient, field, value)
            
            self.db.commit()
            self.db.refresh(patient)
            
            return self.get_patient_by_id(patient.id, include_person=True)
            
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
    
    def hard_delete_patient(self, patient_id: int) -> bool:
        """Eliminar paciente permanentemente (incluye persona)"""
        patient = self.get_patient_by_id(patient_id, include_person=True)
        if not patient:
            return False
        
        try:
            # Eliminar el paciente (la persona se elimina por CASCADE)
            self.db.delete(patient)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_patients_requiring_guardians(self) -> List[Patient]:
        """Obtener pacientes que requieren guardian"""
        return self.db.query(Patient).join(Person).filter(
            and_(
                Patient.requires_guardian == True,
                Patient.is_active == True
            )
        ).options(joinedload(Patient.person)).all()
    
    def get_patients_without_guardians(self) -> List[Patient]:
        """Obtener pacientes que requieren guardian pero no tienen ninguno"""
        return self.db.query(Patient).join(Person).filter(
            and_(
                Patient.requires_guardian == True,
                Patient.is_active == True,
                ~Patient.guardians.any(Guardian.is_active == True)
            )
        ).options(joinedload(Patient.person)).all()
    
    def get_patient_count(self, active_only: bool = True) -> int:
        """Obtener conteo total de pacientes"""
        query = self.db.query(Patient)
        if active_only:
            query = query.filter(Patient.is_active == True)
        return query.count()
    
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

def get_patient_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> PatientService:
    """Factory para obtener instancia del servicio"""
    return PatientService(db, user_id, user_ip)
