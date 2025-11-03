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
        self.user_ip = user_ip
        self.auditoria_service = AuditoriaService()
        
        # Solo proceder si tenemos un user_id válido
        if user_id:
            self.user_id = user_id
            # Obtener rol y email del usuario para auditoría
            self.user_role, self.user_email = AuditoriaService._obtener_datos_usuario(db, self.user_id)
        else:
            # Si no hay usuario autenticado, no permitir operaciones de auditoría
            raise ValueError("No se puede realizar operaciones sin usuario autenticado")
            
        self.person_service = PersonService(db, user_id, user_ip)
    
    def create_guardian(self, guardian_data: GuardianCreate, allow_duplicate_contact: bool = False) -> Guardian:
        """
        Crear un nuevo guardian (incluye crear la persona)
        
        Args:
            guardian_data: Datos del guardian
            allow_duplicate_contact: Permite emails y teléfonos duplicados para tutores legales
        """
        
        # Verificar que no exista otra persona con el mismo documento
        existing_person = self.person_service.get_person_by_document(
            guardian_data.person.document_number
        )
        if existing_person:
            # Verificar si ya es guardian activo
            existing_guardian = self.db.query(Guardian).filter(
                and_(
                    Guardian.person_id == existing_person.id,
                    Guardian.is_active == True
                )
            ).first()
            if existing_guardian:
                # Obtener información del guardian para el mensaje
                guardian_person = existing_guardian.person
                raise ValueError(
                    f"La persona {guardian_person.first_name} {guardian_person.first_surname} "
                    f"ya está registrada como guardian activo"
                )
            
            # Usar la persona existente
            person = existing_person
        else:
            # Crear nueva persona (permitiendo duplicados de contacto si es tutor legal)
            person = self.person_service.create_person(
                guardian_data.person, 
                allow_duplicate_email=allow_duplicate_contact,
                allow_duplicate_phone=allow_duplicate_contact
            )
        
        # Verificar que el guardian sea mayor de edad
        age = self.person_service.calculate_age(person.birthdate)
        if age < 18:
            raise ValueError("El guardian debe ser mayor de edad")
        
        try:
            # Crear el guardian
            guardian = Guardian(
                person_id=person.id,
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
                descripcion_evento=f"Nuevo guardian creado: {person.first_name} {person.first_surname}",
                detalles_cambios={
                    "person_data": serialize_for_audit(guardian_data.person.model_dump()) if hasattr(guardian_data, 'person') else None,
                    "guardian_data": {
                        "relationship_type": guardian_data.relationship_type.value
                    },
                    "allow_duplicate_contact": allow_duplicate_contact
                },
                ip_origen=self.user_ip,
                usuario_rol=self.user_role,
                usuario_email=self.user_email
            )
            
            # Cargar las relaciones básicas para evitar problemas
            return self.get_guardian_by_id(guardian.id, include_person=True)
            
        except Exception as e:
            self.db.rollback()
            print(f"Error en create_guardian: {str(e)}")
            raise e
    
    def get_guardian_by_id(
        self, 
        guardian_id: int, 
        include_person: bool = True, 
        include_patients: bool = False,
        include_all: bool = False
    ) -> Optional[Guardian]:
        """Obtener guardian por ID"""
        query = self.db.query(Guardian)
        
        if include_all or include_person:
            query = query.options(joinedload(Guardian.person))
        
        if include_all or include_patients:
            query = query.options(joinedload(Guardian.patients).joinedload(Patient.person))
        
        return query.filter(Guardian.id == guardian_id).first()
    
    def get_guardians(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None,
        relationship: Optional[PatientRelationshipEnum] = None
    ) -> List[Guardian]:
        """Obtener lista de guardianes con filtros"""
        query = self.db.query(Guardian).join(Person).options(
            joinedload(Guardian.person),
            joinedload(Guardian.patients).joinedload(Patient.person)
        )
        
        if active_only:
            query = query.filter(Guardian.is_active == True)
        
        if relationship:
            query = query.filter(Guardian.relationship_type == relationship)
        
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
    
    def update_guardian(self, guardian_id: int, guardian_data: GuardianUpdate, allow_duplicate_contact: bool = False) -> Optional[Guardian]:
        """
        Actualizar guardian (puede incluir datos de persona)
        
        Args:
            guardian_id: ID del guardian a actualizar
            guardian_data: Datos para actualizar
            allow_duplicate_contact: Permite emails y teléfonos duplicados para casos familiares
        """
        guardian = self.get_guardian_by_id(guardian_id, include_person=True)
        if not guardian:
            return None
        
        try:
            # Actualizar datos de la persona si se proporcionan
            if guardian_data.person:
                self.person_service.update_person(
                    guardian.person_id, 
                    guardian_data.person,
                    allow_duplicate_email=allow_duplicate_contact,
                    allow_duplicate_phone=allow_duplicate_contact
                )
                
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
        guardian = self.get_guardian_by_id(guardian_id, include_person=True, include_patients=True)
        if not guardian:
            return False
        
        # Verificar si tiene pacientes asignados que requieren guardian
        patients_requiring_guardian = self.db.query(Patient).filter(
            and_(
                Patient.guardian_id == guardian_id,
                Patient.requires_guardian == True,
                Patient.is_active == True
            )
        ).all()
        
        if patients_requiring_guardian:
            patient_names = [f"{p.person.first_name} {p.person.first_surname}" for p in patients_requiring_guardian]
            raise ValueError(
                f"No se puede desactivar este guardián porque tiene pacientes que requieren supervisión: "
                f"{', '.join(patient_names)}. Primero asigne otro guardián a estos pacientes."
            )
        
        # Guardar datos para auditoría antes del cambio
        person_info = f"{guardian.person.first_name} {guardian.person.first_surname}" if guardian.person else "N/A"
        
        guardian.is_active = False
        
        # Desasignar de todos los pacientes
        patients_to_unassign = self.db.query(Patient).filter(Patient.guardian_id == guardian_id).all()
        for patient in patients_to_unassign:
            patient.guardian_id = None
        
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="DELETE",
            registro_afectado_id=str(guardian.id),
            registro_afectado_tipo="guardians",
            descripcion_evento=f"Guardian desactivado: {person_info}",
            detalles_cambios={"is_active": {"antes": True, "despues": False}},
            ip_origen=self.user_ip,
            usuario_rol=self.user_role,
            usuario_email=self.user_email
        )
        
        return True
    
    def activate_guardian(self, guardian_id: int) -> bool:
        """Reactivar guardian (cambiar is_active a True)"""
        guardian = self.get_guardian_by_id(guardian_id, include_person=True)
        if not guardian:
            return False
        
        if guardian.is_active:
            raise ValueError("El guardián ya está activo")
        
        # Guardar datos para auditoría antes del cambio
        person_info = f"{guardian.person.first_name} {guardian.person.first_surname}" if guardian.person else "N/A"
        
        guardian.is_active = True
        self.db.commit()
        
        # Registrar evento de auditoría
        self.auditoria_service.registrar_evento(
            db=self.db,
            usuario_id=self.user_id,
            tipo_evento="UPDATE",
            registro_afectado_id=str(guardian.id),
            registro_afectado_tipo="guardians",
            descripcion_evento=f"Guardian reactivado: {person_info}",
            detalles_cambios={"is_active": {"antes": False, "despues": True}},
            ip_origen=self.user_ip,
            usuario_rol=self.user_role,
            usuario_email=self.user_email
        )
        
        return True
    
def get_guardian_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> GuardianService:
    """Factory para obtener instancia del servicio"""
    return GuardianService(db, user_id, user_ip)