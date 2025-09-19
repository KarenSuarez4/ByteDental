from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List
from app.models.person_models import Person
from app.models.patient_models import Patient
from app.models.guardian_models import Guardian, PatientRelationshipEnum
from app.schemas.guardian_schema import GuardianCreate, GuardianUpdate
from app.services.person_service import PersonService, serialize_for_audit
from app.services.auditoria_service import AuditoriaService

class GuardianService:
    
    def __init__(self, db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None):
        self.db = db
        self.user_id = user_id or "system"
        self.user_ip = user_ip
        self.person_service = PersonService(db, user_id, user_ip)
        self.auditoria_service = AuditoriaService()
    
    def create_guardian(self, guardian_data: GuardianCreate) -> Guardian:
        """Crear un nuevo guardian (incluye crear la persona)"""
        # Verificar que el paciente existe
        patient = self.db.query(Patient).filter(Patient.id == guardian_data.patient_id).first()
        if not patient:
            raise ValueError(f"El paciente con ID {guardian_data.patient_id} no existe")
        
        # Verificar que el paciente no tenga ya un guardián activo (solo un tutor por paciente)
        existing_guardian = self.db.query(Guardian).filter(
            and_(
                Guardian.patient_id == guardian_data.patient_id,
                Guardian.is_active == True
            )
        ).first()
        if existing_guardian:
            raise ValueError(f"El paciente ya tiene un guardián activo. Solo se permite un guardián por paciente.")
        
        # Verificar que el paciente requiera guardián (validación de negocio)
        if not patient.requires_guardian:
            # Calcular edad para el mensaje
            from app.services.person_service import PersonService
            person_service = PersonService(self.db)
            person = person_service.get_person_by_id(patient.person_id)
            age = person_service.calculate_age(person.birthdate) if person else "desconocida"
            
            raise ValueError(
                f"El paciente no requiere guardián según su edad ({age} años). "
                f"Los guardianes solo son obligatorios para menores de 18 años o mayores de 64 años. "
                f"Si necesita asignar un guardián por circunstancias especiales, "
                f"contacte al administrador para actualizar el campo requires_guardian."
            )
        
        # Verificar que no exista otra persona con el mismo documento
        existing_person = self.person_service.get_person_by_document(
            guardian_data.person.document_number
        )
        if existing_person:
            # Si ya existe la persona, verificar que no sea ya guardian del mismo paciente
            existing_guardian = self.get_guardian_by_person_and_patient(
                existing_person.id, guardian_data.patient_id
            )
            if existing_guardian:
                raise ValueError(
                    f"La persona con documento {guardian_data.person.document_number} "
                    f"ya es guardian de este paciente"
                )
            
            # Usar la persona existente
            person = existing_person
        else:
            # Crear nueva persona
            person = self.person_service.create_person(guardian_data.person)
        
        # Verificar que el guardian sea mayor de edad
        age = self.person_service.calculate_age(person.birthdate)
        if age < 18:
            raise ValueError("El guardian debe ser mayor de edad")
        
        try:
            # Crear el guardian
            guardian = Guardian(
                person_id=person.id,
                patient_id=guardian_data.patient_id,
                relationship_type=guardian_data.relationship_type
            )
            
            self.db.add(guardian)
            self.db.commit()
            self.db.refresh(guardian)
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="CREATE",
                registro_afectado_id=str(guardian.id),
                registro_afectado_tipo="guardians",
                descripcion_evento=f"Nuevo guardian creado: {person.first_name} {person.first_surname} para paciente ID {guardian_data.patient_id}",
                detalles_cambios={
                    "person_data": serialize_for_audit(guardian_data.person.model_dump()) if hasattr(guardian_data, 'person') else None,
                    "guardian_data": {
                        "patient_id": guardian_data.patient_id,
                        "relationship_type": guardian_data.relationship_type.value
                    }
                },
                ip_origen=self.user_ip
            )
            
            # Cargar las relaciones básicas para evitar problemas
            try:
                guardian = self.get_guardian_by_id(guardian.id, include_person=True, include_patient=False)
                return guardian
            except Exception as load_error:
                print(f"Error al cargar guardian después de crearlo: {str(load_error)}")
                # Si falla cargar las relaciones, devolver el guardian básico
                return guardian
            
        except Exception as e:
            self.db.rollback()
            print(f"Error en create_guardian: {str(e)}")
            print(f"Tipo de error: {type(e)}")
            import traceback
            traceback.print_exc()
            raise e
    
    def get_guardian_by_id(
        self, 
        guardian_id: int, 
        include_person: bool = True, 
        include_patient: bool = False,
        include_all: bool = False
    ) -> Optional[Guardian]:
        """Obtener guardian por ID"""
        query = self.db.query(Guardian)
        
        if include_all or include_person:
            query = query.options(joinedload(Guardian.person))
        
        if include_all or include_patient:
            query = query.options(joinedload(Guardian.patient).joinedload(Patient.person))
        
        return query.filter(Guardian.id == guardian_id).first()
    
    def get_guardian_by_person_and_patient(self, person_id: int, patient_id: int) -> Optional[Guardian]:
        """Obtener guardian por ID de persona y paciente"""
        return self.db.query(Guardian).filter(
            and_(
                Guardian.person_id == person_id,
                Guardian.patient_id == patient_id
            )
        ).first()
    
    def get_guardians_by_patient(self, patient_id: int, active_only: bool = True) -> List[Guardian]:
        """Obtener todos los guardianes de un paciente"""
        query = self.db.query(Guardian).options(joinedload(Guardian.person)).filter(
            Guardian.patient_id == patient_id
        )
        
        if active_only:
            query = query.filter(Guardian.is_active == True)
        
        return query.all()
    
    def get_guardians_by_person(self, person_id: int, active_only: bool = True) -> List[Guardian]:
        """Obtener todos los pacientes que una persona guarda"""
        query = self.db.query(Guardian).options(
            joinedload(Guardian.patient).joinedload(Patient.person)
        ).filter(Guardian.person_id == person_id)
        
        if active_only:
            query = query.filter(Guardian.is_active == True)
        
        return query.all()
    
    def get_guardian_by_document_and_patient(self, document_number: str, patient_id: int) -> Optional[Guardian]:
        """Obtener guardian por documento y paciente"""
        return self.db.query(Guardian).join(Person).filter(
            and_(
                Person.document_number == document_number,
                Guardian.patient_id == patient_id
            )
        ).options(joinedload(Guardian.person)).first()
    
    def get_guardians(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None,
        relationship_type: Optional[PatientRelationshipEnum] = None
    ) -> List[Guardian]:
        """Obtener lista de guardianes con filtros"""
        query = self.db.query(Guardian).join(Person).options(
            joinedload(Guardian.person),
            joinedload(Guardian.patient).joinedload(Patient.person)
        )
        
        if active_only:
            query = query.filter(Guardian.is_active == True)
        
        if relationship_type:
            query = query.filter(Guardian.relationship_type == relationship_type)
        
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
    
    def update_guardian(self, guardian_id: int, guardian_data: GuardianUpdate) -> Optional[Guardian]:
        """Actualizar guardian (puede incluir datos de persona)"""
        guardian = self.get_guardian_by_id(guardian_id, include_person=True)
        if not guardian:
            return None
        
        try:
            # Actualizar datos de la persona si se proporcionan
            if guardian_data.person:
                self.person_service.update_person(guardian.person_id, guardian_data.person)
                
                # Verificar que siga siendo mayor de edad
                updated_person = self.person_service.get_person_by_id(guardian.person_id)
                age = self.person_service.calculate_age(updated_person.birthdate)
                if age < 18:
                    raise ValueError("El guardian debe ser mayor de edad")
            
            # Actualizar datos específicos del guardian
            guardian_fields = guardian_data.model_dump(exclude_unset=True, exclude={'person'})
            
            for field, value in guardian_fields.items():
                setattr(guardian, field, value)
            
            self.db.commit()
            self.db.refresh(guardian)
            
            return self.get_guardian_by_id(guardian.id, include_all=True)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_guardian(self, guardian_id: int) -> bool:
        """Eliminar guardian (soft delete)"""
        guardian = self.get_guardian_by_id(guardian_id, include_person=True, include_patient=True)
        if not guardian:
            return False
        
        # Verificar si es el último guardián activo del paciente
        if guardian.patient and guardian.patient.requires_guardian:
            active_guardians_count = self.db.query(Guardian).filter(
                and_(
                    Guardian.patient_id == guardian.patient_id,
                    Guardian.is_active == True,
                    Guardian.id != guardian_id  # Excluir el que se va a desactivar
                )
            ).count()
            
            if active_guardians_count == 0:
                # Calcular edad para el mensaje
                from app.services.person_service import PersonService
                person_service = PersonService(self.db)
                person = person_service.get_person_by_id(guardian.patient.person_id)
                age = person_service.calculate_age(person.birthdate) if person else "desconocida"
                
                raise ValueError(
                    f"No se puede desactivar este guardián porque es el único guardián activo "
                    f"de un paciente que requiere supervisión (edad: {age} años). "
                    f"Para proceder, primero asigne otro guardián al paciente o "
                    f"actualice el campo requires_guardian si corresponde."
                )
        
        # Guardar datos para auditoría antes del cambio
        person_info = f"{guardian.person.first_name} {guardian.person.first_surname}" if guardian.person else "N/A"
        patient_info = f"{guardian.patient.person.first_name} {guardian.patient.person.first_surname}" if guardian.patient and guardian.patient.person else "N/A"
        
        guardian.is_active = False
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="DELETE",
            registro_afectado_id=str(guardian.id),
            registro_afectado_tipo="guardians",
            descripcion_evento=f"Guardian desactivado: {person_info} (paciente: {patient_info})",
            detalles_cambios={"is_active": {"antes": True, "despues": False}},
            ip_origen=self.user_ip
        )
        
        return True
    
    def activate_guardian(self, guardian_id: int) -> bool:
        """Reactivar guardian (cambiar is_active a True)"""
        guardian = self.get_guardian_by_id(guardian_id, include_person=True, include_patient=True)
        if not guardian:
            return False
        
        if guardian.is_active:
            raise ValueError("El guardián ya está activo")
        
        # Verificar que el paciente no tenga ya otro guardián activo (regla de un guardián por paciente)
        if guardian.patient:
            existing_active = self.db.query(Guardian).filter(
                and_(
                    Guardian.patient_id == guardian.patient_id,
                    Guardian.is_active == True,
                    Guardian.id != guardian_id
                )
            ).first()
            
            if existing_active:
                raise ValueError(
                    f"No se puede reactivar este guardián porque el paciente ya tiene "
                    f"otro guardián activo. Solo se permite un guardián activo por paciente."
                )
        
        # Guardar datos para auditoría antes del cambio
        person_info = f"{guardian.person.first_name} {guardian.person.first_surname}" if guardian.person else "N/A"
        patient_info = f"{guardian.patient.person.first_name} {guardian.patient.person.first_surname}" if guardian.patient and guardian.patient.person else "N/A"
        
        guardian.is_active = True
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="UPDATE",
            registro_afectado_id=str(guardian.id),
            registro_afectado_tipo="guardians",
            descripcion_evento=f"Guardian reactivado: {person_info} (paciente: {patient_info})",
            detalles_cambios={"is_active": {"antes": False, "despues": True}},
            ip_origen=self.user_ip
        )
        
        return True
    
    def hard_delete_guardian(self, guardian_id: int, delete_person: bool = False) -> bool:
        """Eliminar guardian permanentemente"""
        guardian = self.get_guardian_by_id(guardian_id, include_person=True)
        if not guardian:
            return False
        
        try:
            person_id = guardian.person_id
            
            # Eliminar el guardian
            self.db.delete(guardian)
            
            # Opcionalmente eliminar la persona si no tiene otros roles
            if delete_person:
                # Verificar que la persona no sea paciente o guardian de otros
                other_guardians = self.db.query(Guardian).filter(
                    and_(
                        Guardian.person_id == person_id,
                        Guardian.id != guardian_id
                    )
                ).count()
                
                is_patient = self.db.query(Patient).filter(Patient.person_id == person_id).count() > 0
                
                if other_guardians == 0 and not is_patient:
                    self.person_service.hard_delete_person(person_id)
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_guardians_by_relationship(self, relationship_type: PatientRelationshipEnum) -> List[Guardian]:
        """Obtener guardianes por tipo de relación"""
        return self.db.query(Guardian).options(
            joinedload(Guardian.person),
            joinedload(Guardian.patient).joinedload(Patient.person)
        ).filter(
            and_(
                Guardian.relationship_type == relationship_type,
                Guardian.is_active == True
            )
        ).all()
    
    def get_guardian_count(self, active_only: bool = True) -> int:
        """Obtener conteo total de guardianes"""
        query = self.db.query(Guardian)
        if active_only:
            query = query.filter(Guardian.is_active == True)
        return query.count()
    
    def assign_existing_person_as_guardian(
        self,
        person_id: int,
        patient_id: int,
        relationship_type: PatientRelationshipEnum
    ) -> Guardian:
        """Asignar una persona existente como guardian de un paciente"""
        # Verificar que la persona existe
        person = self.person_service.get_person_by_id(person_id)
        if not person:
            raise ValueError(f"La persona con ID {person_id} no existe")
        
        # Verificar que el paciente existe
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"El paciente con ID {patient_id} no existe")
        
        # Verificar que el paciente no tenga ya un guardián activo (solo un tutor por paciente)
        existing_guardian = self.db.query(Guardian).filter(
            and_(
                Guardian.patient_id == patient_id,
                Guardian.is_active == True
            )
        ).first()
        if existing_guardian:
            raise ValueError(f"El paciente ya tiene un guardián activo. Solo se permite un guardián por paciente.")
        
        # Verificar que el paciente requiera guardián (validación de negocio)
        if not patient.requires_guardian:
            # Calcular edad para el mensaje
            person_patient = self.person_service.get_person_by_id(patient.person_id)
            age = self.person_service.calculate_age(person_patient.birthdate) if person_patient else "desconocida"
            
            raise ValueError(
                f"El paciente no requiere guardián según su edad ({age} años). "
                f"Los guardianes solo son obligatorios para menores de 18 años o mayores de 64 años. "
                f"Si necesita asignar un guardián por circunstancias especiales, "
                f"contacte al administrador para actualizar el campo requires_guardian."
            )
        
        # Verificar que no sea ya guardian del mismo paciente
        existing = self.get_guardian_by_person_and_patient(person_id, patient_id)
        if existing:
            raise ValueError("Esta persona ya es guardian de este paciente")
        
        # Verificar que sea mayor de edad
        age = self.person_service.calculate_age(person.birthdate)
        if age < 18:
            raise ValueError("El guardian debe ser mayor de edad")
        
        try:
            guardian = Guardian(
                person_id=person_id,
                patient_id=patient_id,
                relationship_type=relationship_type
            )
            
            self.db.add(guardian)
            self.db.commit()
            self.db.refresh(guardian)
            
            return self.get_guardian_by_id(guardian.id, include_all=True)
            
        except Exception as e:
            self.db.rollback()
            raise e

def get_guardian_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> GuardianService:
    """Factory para obtener instancia del servicio"""
    return GuardianService(db, user_id, user_ip)
