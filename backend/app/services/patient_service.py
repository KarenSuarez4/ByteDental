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
        
        # Calcular si requiere guardian basado en la edad Y discapacidad ANTES de crear la persona
        age = self.person_service.calculate_age(patient_data.person.birthdate)
        requires_guardian = age < 18 or age > 64 or patient_data.has_disability
        
        # VALIDACIONES PREVIAS - antes de crear cualquier registro
        guardian_id = None
        guardian_created = False  # Flag para tracking
        
        # VALIDACIÓN DE DISCAPACIDAD
        if patient_data.has_disability and not patient_data.disability_description:
            raise ValueError("La descripción de la discapacidad es requerida cuando el paciente tiene una discapacidad")
        
        if not patient_data.has_disability and patient_data.disability_description:
            raise ValueError("No debe proporcionar descripción de discapacidad cuando el paciente no tiene una discapacidad")
        
        try:
            if hasattr(patient_data, 'guardian_id') and patient_data.guardian_id:
                # Verificar que el guardian existe si se proporciona
                guardian = self.db.query(Guardian).filter(
                    and_(Guardian.id == patient_data.guardian_id, Guardian.is_active == True)
                ).first()
                if not guardian:
                    raise ValueError(f"El guardian con ID {patient_data.guardian_id} no existe o no está activo")
                guardian_id = patient_data.guardian_id
                
            elif hasattr(patient_data, 'guardian') and patient_data.guardian:
                # Crear un guardian nuevo
                from app.services.guardian_service import GuardianService
                guardian_service = GuardianService(self.db, self.user_id, self.user_ip)
                
                # Verificar que no exista otra persona con el mismo documento del guardian
                existing_guardian_person = self.person_service.get_person_by_document(
                    patient_data.guardian.person.document_number
                )
                if existing_guardian_person:
                    raise ValueError(f"Ya existe una persona con el documento {patient_data.guardian.person.document_number}")
                
                # Crear el guardian (permitiendo email y teléfono duplicado para tutores legales)
                from app.schemas.guardian_schema import GuardianCreate
                guardian_create_data = GuardianCreate(
                    person=patient_data.guardian.person,
                    relationship_type=patient_data.guardian.relationship_type
                )
                
                # Crear guardian permitiendo duplicados de email/teléfono para tutores legales
                new_guardian = guardian_service.create_guardian(
                    guardian_create_data, 
                    allow_duplicate_contact=True
                )
                guardian_id = new_guardian.id
                guardian_created = True
            
            # VALIDACIÓN: Si el paciente requiere guardián, debe proporcionarse uno válido
            if requires_guardian and guardian_id is None:
                # Determinar la razón por la que requiere guardián
                reasons = []
                if age < 18:
                    reasons.append("menor de 18 años")
                if age > 64:
                    reasons.append("mayor de 64 años")
                if patient_data.has_disability:
                    reasons.append("tiene una discapacidad")
                
                age_reason = " y ".join(reasons)
                raise ValueError(f"El paciente {age_reason}. Debe proporcionar un acudiente")

            # VALIDACIÓN: Si no requiere guardián, no debe asignarse uno
            if not requires_guardian and guardian_id is not None:
                raise ValueError(f"El paciente tiene {age} años, no tiene discapacidades y no requiere guardián. No debe proporcionar guardian_id")

            # Crear la persona del paciente 
            # Solo permitir email duplicado si se está creando un guardian junto con el paciente (casos familiares)
            allow_duplicate_contact = guardian_created  # True solo si se creó un guardian nuevo
            person = self.person_service.create_person(
                patient_data.person,
                allow_duplicate_email=allow_duplicate_contact,
                allow_duplicate_phone=allow_duplicate_contact
            )
            
            # Crear el paciente
            patient = Patient(
                person_id=person.id,
                occupation=patient_data.occupation,
                guardian_id=guardian_id,
                requires_guardian=requires_guardian,
                has_disability=patient_data.has_disability,
                disability_description=patient_data.disability_description
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
                        "requires_guardian": requires_guardian,
                        "has_disability": patient_data.has_disability,
                        "disability_description": patient_data.disability_description
                    },
                    "guardian_created": guardian_created
                },
                ip_origen=self.user_ip
            )
            
            # Cargar la relación con person y guardian
            patient = self.get_patient_by_id(getattr(patient, 'id'), include_person=True, include_guardian=True)
            return patient
            
        except Exception as e:
            # Rollback automático en caso de cualquier error
            self.db.rollback()
            raise e
    
    def get_patient_by_id(self, patient_id: int, include_person: bool = True, include_guardian: bool = False) -> Optional[Patient]:
        """Obtener paciente por ID con verificación automática de requirements"""
        query = self.db.query(Patient)
        
        if include_person:
            query = query.options(joinedload(Patient.person))
        
        if include_guardian:
            # Usar outerjoin para manejar casos donde guardian es NULL
            query = query.options(
                joinedload(Patient.guardian, innerjoin=False).joinedload(Guardian.person, innerjoin=False)
            )
        
        patient = query.filter(Patient.id == patient_id).first()
        
        # Verificación automática de requirements al leer
        if patient and patient.is_active:
            self._verify_and_update_guardian_requirements_for_patient(patient)
            
        return patient
    
    def get_patient_by_document(self, document_number: str) -> Optional[Patient]:
        """Obtener paciente por número de documento con verificación automática de requirements"""
        patient = self.db.query(Patient).join(Person).filter(
            Person.document_number == document_number
        ).options(joinedload(Patient.person)).first()
        
        # Verificación automática de requirements al leer
        if patient and patient.is_active:
            self._verify_and_update_guardian_requirements_for_patient(patient)
            
        return patient
    
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
            joinedload(Patient.guardian, innerjoin=False).joinedload(Guardian.person, innerjoin=False)
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
                updated_person = self.person_service.update_person(patient.person.id, patient_data.person)
            
            # Actualizar datos específicos del paciente
            patient_fields = patient_data.model_dump(exclude_unset=True, exclude={'person', 'guardian'})
            print(f"DEBUG: patient_fields = {patient_fields}")
            
            # VALIDACIONES DE DISCAPACIDAD para campos siendo actualizados
            if 'has_disability' in patient_fields or 'disability_description' in patient_fields:
                has_disability = patient_fields.get('has_disability', getattr(patient, 'has_disability', False))
                disability_description = patient_fields.get('disability_description', getattr(patient, 'disability_description'))
                
                # Si tiene discapacidad, debe proporcionar descripción
                if has_disability and not disability_description:
                    raise ValueError("La descripción de la discapacidad es requerida cuando has_disability=True")
                
                # Si no tiene discapacidad, la descripción debe ser None
                if not has_disability and disability_description:
                    raise ValueError("No debe proporcionar descripción de discapacidad cuando has_disability=False")
                    
                # Si se actualiza has_disability, asegurar que disability_description se actualice apropiadamente
                if 'has_disability' in patient_fields:
                    if has_disability and not disability_description:
                        # Si cambia a has_disability=True pero no hay descripción, debe proporcionarla
                        if 'disability_description' not in patient_fields:
                            raise ValueError("Debe proporcionar disability_description cuando cambia has_disability a True")
                    elif not has_disability and disability_description:
                        # Si cambia a has_disability=False, limpiar la descripción automáticamente
                        patient_fields['disability_description'] = None
            
            # VALIDACIONES DE ESTADO Y MOTIVO DE DESACTIVACIÓN
            if 'is_active' in patient_fields or 'deactivation_reason' in patient_fields:
                is_active = patient_fields.get('is_active', getattr(patient, 'is_active', True))
                deactivation_reason = patient_fields.get('deactivation_reason', getattr(patient, 'deactivation_reason'))
                
                # Si se está desactivando, debe proporcionar motivo
                if not is_active and not deactivation_reason:
                    raise ValueError("El motivo de desactivación es requerido cuando se desactiva un paciente")
                
                # Si se está activando, limpiar el motivo automáticamente
                if is_active and deactivation_reason:
                    patient_fields['deactivation_reason'] = None
                elif is_active and 'deactivation_reason' not in patient_fields:
                    # Asegurar que se limpie el motivo al activar
                    patient_fields['deactivation_reason'] = None
            
            # Manejar guardian si se proporciona
            if hasattr(patient_data, 'guardian') and patient_data.guardian:
                from app.services.guardian_service import GuardianService
                guardian_service = GuardianService(self.db, self.user_id, self.user_ip)
                
                current_guardian_id = getattr(patient, 'guardian_id')
                
                # Si el paciente ya tiene un guardian, actualizarlo
                if current_guardian_id:
                    # Actualizar guardian existente
                    from app.schemas.guardian_schema import GuardianUpdate
                    from app.schemas.person_schema import PersonUpdate
                    
                    # Convertir PersonCreate a PersonUpdate
                    person_update_data = PersonUpdate(
                        document_type=patient_data.guardian.person.document_type,
                        document_number=patient_data.guardian.person.document_number,
                        first_name=patient_data.guardian.person.first_name,
                        middle_name=patient_data.guardian.person.middle_name,
                        first_surname=patient_data.guardian.person.first_surname,
                        second_surname=patient_data.guardian.person.second_surname,
                        email=patient_data.guardian.person.email,
                        phone=patient_data.guardian.person.phone,
                        birthdate=patient_data.guardian.person.birthdate
                    )
                    
                    guardian_update_data = GuardianUpdate(
                        person=person_update_data,
                        relationship_type=patient_data.guardian.relationship_type
                    )
                    updated_guardian = guardian_service.update_guardian(
                        current_guardian_id, 
                        guardian_update_data,
                        allow_duplicate_contact=True
                    )
                else:
                    # Crear nuevo guardian (permitiendo email/teléfono duplicado para casos familiares)
                    from app.schemas.guardian_schema import GuardianCreate
                    guardian_create_data = GuardianCreate(
                        person=patient_data.guardian.person,
                        relationship_type=patient_data.guardian.relationship_type
                    )
                    new_guardian = guardian_service.create_guardian(
                        guardian_create_data,
                        allow_duplicate_contact=True
                    )
                    patient_fields['guardian_id'] = new_guardian.id
            
            # Validar guardian_id si se proporciona directamente
            elif 'guardian_id' in patient_fields and patient_fields['guardian_id']:
                guardian = self.db.query(Guardian).filter(
                    and_(Guardian.id == patient_fields['guardian_id'], Guardian.is_active == True)
                ).first()
                if not guardian:
                    raise ValueError(f"El guardian con ID {patient_fields['guardian_id']} no existe o no está activo")
            
            # Recalcular requires_guardian si se actualiza la fecha de nacimiento o discapacidad
            person_data_dict = patient_data.person.model_dump(exclude_unset=True) if patient_data.person else {}
            should_recalculate = (
                person_data_dict.get('birthdate') or 
                'has_disability' in patient_fields
            )
            
            if should_recalculate:
                # Usar nueva fecha de nacimiento si se actualiza, sino la actual
                birthdate = person_data_dict.get('birthdate') or patient.person.birthdate
                age = self.person_service.calculate_age(birthdate)
                
                # Usar nuevo valor de has_disability si se actualiza, sino el actual
                has_disability = patient_fields.get('has_disability', getattr(patient, 'has_disability', False))
                
                new_requires_guardian = age < 18 or age > 64 or has_disability
                patient_fields['requires_guardian'] = new_requires_guardian
                
                # Si el paciente ya no requiere guardian, remover el guardian_id
                current_guardian_id = getattr(patient, 'guardian_id')
                if not new_requires_guardian and current_guardian_id:
                    patient_fields['guardian_id'] = None
            
            # VALIDACIÓN: Verificar consistencia entre requires_guardian y guardian_id
            # Obtener los valores actuales o los que se van a actualizar
            current_requires_guardian = patient_fields.get('requires_guardian', getattr(patient, 'requires_guardian'))
            current_guardian_id = patient_fields.get('guardian_id', getattr(patient, 'guardian_id'))
            
            # Si se está actualizando requires_guardian o guardian_id, validar consistencia
            if 'requires_guardian' in patient_fields or 'guardian_id' in patient_fields:
                if current_requires_guardian and current_guardian_id is None:
                    # Calcular edad y discapacidad actual para el mensaje
                    age = self.person_service.calculate_age(patient.person.birthdate)
                    has_disability = patient_fields.get('has_disability', getattr(patient, 'has_disability', False))
                    
                    # Determinar la razón por la que requiere guardián
                    reasons = []
                    if age < 18:
                        reasons.append("menor de 18 años")
                    if age > 64:
                        reasons.append("mayor de 64 años")
                    if has_disability:
                        reasons.append("tiene una discapacidad")
                    
                    age_reason = " y ".join(reasons)
                    raise ValueError(f"El paciente {age_reason}. Debe proporcionar un acudiente")
                
                if not current_requires_guardian and current_guardian_id is not None:
                    age = self.person_service.calculate_age(patient.person.birthdate)
                    has_disability = patient_fields.get('has_disability', getattr(patient, 'has_disability', False))
                    raise ValueError(f"El paciente tiene {age} años, no tiene discapacidades y no requiere guardián. No debe tener guardian_id asignado")
            
            print(f"DEBUG: Actualizando paciente con campos: {patient_fields}")
            for field, value in patient_fields.items():
                print(f"DEBUG: Estableciendo {field} = {value}")
                setattr(patient, field, value)
            
            self.db.commit()
            self.db.refresh(patient)
            
            return self.get_patient_by_id(getattr(patient, 'id'), include_person=True, include_guardian=True)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_guardian_requirements_by_age(self) -> dict:
        """
        Actualizar requirements de guardian basado en edad actual de todos los pacientes.
        También desasigna automáticamente guardianes cuando ya no son necesarios.
        """
        updated_patients = []
        unassigned_guardians = []
        
        patients = self.db.query(Patient).join(Person).options(
            joinedload(Patient.person),
            joinedload(Patient.guardian, innerjoin=False).joinedload(Guardian.person, innerjoin=False)
        ).filter(Patient.is_active == True).all()
        
        for patient in patients:
            current_age = self.person_service.calculate_age(patient.person.birthdate)
            has_disability = getattr(patient, 'has_disability', False)
            should_require_guardian = current_age < 18 or current_age > 64 or has_disability
            
            # Acceder al valor real de la propiedad
            current_requires_guardian = getattr(patient, 'requires_guardian')
            current_guardian_id = getattr(patient, 'guardian_id')
            patient_name = f"{patient.person.first_name} {patient.person.first_surname}"
            
            changes_made = False
            
            # 1. Actualizar requires_guardian si ha cambiado
            if current_requires_guardian != should_require_guardian:
                setattr(patient, 'requires_guardian', should_require_guardian)
                changes_made = True
                
                updated_patients.append({
                    "id": patient.id,
                    "name": patient_name,
                    "age": current_age,
                    "previous_requires_guardian": current_requires_guardian,
                    "now_requires_guardian": should_require_guardian,
                    "reason": "Cambio de edad automático"
                })
                
                # Registrar evento de auditoría para cambio de requirements
                self.auditoria_service.registrar_evento(
                    db=self.db,
                    usuario_id=self.user_id,
                    tipo_evento="AUTO_UPDATE",
                    registro_afectado_id=str(patient.id),
                    registro_afectado_tipo="patients",
                    descripcion_evento=f"Requirements de guardián actualizados automáticamente para {patient_name} (edad: {current_age})",
                    detalles_cambios={
                        "requires_guardian": {
                            "antes": current_requires_guardian,
                            "despues": should_require_guardian
                        },
                        "trigger": "automatic_age_verification",
                        "age": current_age
                    },
                    ip_origen=self.user_ip
                )
            
            # 2. Desasignar guardián automáticamente si ya no es necesario
            if not should_require_guardian and current_guardian_id is not None:
                guardian_info = "N/A"
                if patient.guardian and patient.guardian.person:
                    guardian_info = f"{patient.guardian.person.first_name} {patient.guardian.person.first_surname}"
                
                setattr(patient, 'guardian_id', None)
                changes_made = True
                
                unassigned_guardians.append({
                    "patient_id": patient.id,
                    "patient_name": patient_name,
                    "patient_age": current_age,
                    "unassigned_guardian_id": current_guardian_id,
                    "unassigned_guardian_name": guardian_info,
                    "reason": f"Paciente cumplió {current_age} años - Ya no requiere guardián"
                })
                
                # Registrar evento de auditoría para desasignación automática
                self.auditoria_service.registrar_evento(
                    db=self.db,
                    usuario_id=self.user_id,
                    tipo_evento="AUTO_UNASSIGN_GUARDIAN",
                    registro_afectado_id=str(patient.id),
                    registro_afectado_tipo="patients",
                    descripcion_evento=f"Guardián desasignado automáticamente de {patient_name} - Edad: {current_age} años",
                    detalles_cambios={
                        "guardian_id": {
                            "antes": current_guardian_id,
                            "despues": None
                        },
                        "guardian_info": guardian_info,
                        "trigger": "automatic_age_verification",
                        "age": current_age,
                        "reason": "Paciente alcanzó mayoría de edad"
                    },
                    ip_origen=self.user_ip
                )
        
        # Confirmar cambios en la base de datos
        if updated_patients or unassigned_guardians:
            self.db.commit()
        
        return {
            "requirements_updated_count": len(updated_patients),
            "guardians_unassigned_count": len(unassigned_guardians),
            "updated_patients": updated_patients,
            "unassigned_guardians": unassigned_guardians,
            "total_processed": len(patients),
            "summary": f"Procesados {len(patients)} pacientes activos: {len(updated_patients)} actualizaciones de requirements, {len(unassigned_guardians)} guardianes desasignados automáticamente"
        }
    
    def change_patient_status(self, patient_id: int, new_status: bool, deactivation_reason: Optional[str] = None) -> dict:
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
        previous_status = getattr(patient, 'is_active')
        person_info = f"{patient.person.first_name} {patient.person.first_surname}" if patient.person else "N/A"
        
        # Validar transición de estado
        if previous_status == new_status:
            status_text = "activo" if new_status else "inactivo"
            raise ValueError(f"El paciente ya está {status_text}")
        
        # Validar motivo para desactivación
        if not new_status and not deactivation_reason:
            raise ValueError("El motivo es requerido para desactivar un paciente")
        
        if new_status and deactivation_reason:
            raise ValueError("No se debe proporcionar motivo al activar un paciente")
        
        try:
            # Actualizar estado y motivo de desactivación
            setattr(patient, 'is_active', new_status)
            
            # Actualizar deactivation_reason según el nuevo estado
            if new_status:
                # Si se está activando, limpiar el motivo de desactivación
                setattr(patient, 'deactivation_reason', None)
            else:
                # Si se está desactivando, guardar el motivo
                setattr(patient, 'deactivation_reason', deactivation_reason)
            
            # LÓGICA DE GUARDIAN: Manejar estado del guardian basado en sus pacientes asociados
            guardian_status_changes = []
            if patient.guardian_id:
                guardian_status_changes = self._handle_guardian_status_on_patient_change(
                    patient.guardian_id, new_status, deactivation_reason, patient_id
                )
            
            self.db.commit()
            
            # Preparar detalles para auditoría
            change_details: dict = {
                "is_active": {
                    "antes": previous_status,
                    "despues": new_status
                },
                "deactivation_reason": {
                    "antes": getattr(patient, 'deactivation_reason', None) if not new_status else None,
                    "despues": deactivation_reason if not new_status else None
                }
            }
            
            # Agregar información de cambios del guardian a la auditoría
            if guardian_status_changes:
                change_details["guardian_auto_changes"] = guardian_status_changes

            # Preparar descripción del evento
            if new_status:
                event_description = f"Paciente reactivado: {person_info}"
                event_type = "REACTIVATE"
            else:
                event_description = f"Paciente desactivado: {person_info} - Motivo: {deactivation_reason}"
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
            
            result = {
                "patient_id": patient_id,
                "patient_name": person_info,
                "previous_status": "activo" if previous_status else "inactivo",
                "new_status": "activo" if new_status else "inactivo",
                "deactivation_reason": deactivation_reason,
                "message": f"Paciente {'activado' if new_status else 'desactivado'} correctamente"
            }
            
            # Agregar información de cambios del guardian si los hay
            if guardian_status_changes:
                result["guardian_auto_changes"] = guardian_status_changes
                
                # Agregar mensaje adicional sobre el guardian
                for change in guardian_status_changes:
                    if change["action"] == "deactivated":
                        result["message"] += f" - Guardian {change['guardian_id']} también fue desactivado automáticamente"
                    elif change["action"] == "reactivated":
                        result["message"] += f" - Guardian {change['guardian_id']} también fue reactivado automáticamente"
                    elif change["action"] == "kept_active":
                        result["message"] += f" - Guardian {change['guardian_id']} se mantiene activo ({change['reason']})"
            
            return result
            
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
        
        # VALIDACIÓN DE EDAD Y DISCAPACIDAD: Solo pacientes menores de 18, mayores de 64 o con discapacidad pueden tener guardián
        if patient.person and patient.person.birthdate:
            age = self.person_service.calculate_age(patient.person.birthdate)
            has_disability = getattr(patient, 'has_disability', False)
            if not (age < 18 or age > 64 or has_disability):
                reasons = []
                if not (age < 18):
                    reasons.append("no es menor de 18 años")
                if not (age > 64):
                    reasons.append("no es mayor de 64 años") 
                if not has_disability:
                    reasons.append("no tiene discapacidades")
                reason_text = " y ".join(reasons)
                raise ValueError(f"El paciente tiene {age} años, {reason_text}. Solo se puede asignar guardián a menores de 18 años, mayores de 64 años o pacientes con discapacidades")
        
        # Verificar que el paciente requiere guardián según el sistema
        current_requires_guardian = getattr(patient, 'requires_guardian')
        if not current_requires_guardian:
            raise ValueError("Este paciente no requiere guardián según su perfil")
        
        old_guardian_id = getattr(patient, 'guardian_id')
        setattr(patient, 'guardian_id', guardian_id)
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
        current_requires_guardian = getattr(patient, 'requires_guardian')
        if current_requires_guardian:
            raise ValueError("No se puede desasignar el guardian de un paciente que requiere supervisión")
        
        old_guardian_id = getattr(patient, 'guardian_id')
        setattr(patient, 'guardian_id', None)
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
    
    def _verify_and_update_guardian_requirements_for_patient(self, patient: Patient) -> bool:
        """
        Verificar y actualizar automáticamente los requirements de guardián para un paciente específico.
        Se ejecuta automáticamente en operaciones de lectura para mantener datos actualizados.
        
        Args:
            patient: Instancia del paciente a verificar
            
        Returns:
            bool: True si se realizaron cambios, False si no
        """
        if not patient or not patient.person or not patient.person.birthdate:
            return False
            
        current_age = self.person_service.calculate_age(patient.person.birthdate)
        # Incluir discapacidad en el cálculo de requirements
        has_disability = getattr(patient, 'has_disability', False)
        should_require_guardian = current_age < 18 or current_age > 64 or has_disability
        
        current_requires_guardian = getattr(patient, 'requires_guardian')
        current_guardian_id = getattr(patient, 'guardian_id')
        
        changes_made = False
        patient_name = f"{patient.person.first_name} {patient.person.first_surname}"
        
        # 1. Actualizar requires_guardian si ha cambiado
        if current_requires_guardian != should_require_guardian:
            setattr(patient, 'requires_guardian', should_require_guardian)
            changes_made = True
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="AUTO_UPDATE",
                registro_afectado_id=str(patient.id),
                registro_afectado_tipo="patients",
                descripcion_evento=f"Requirements de guardián actualizados automáticamente para {patient_name} (edad: {current_age})",
                detalles_cambios={
                    "requires_guardian": {
                        "antes": current_requires_guardian,
                        "despues": should_require_guardian
                    },
                    "trigger": "automatic_read_verification",
                    "age": current_age
                },
                ip_origen=self.user_ip
            )
        
        # 2. Desasignar guardián automáticamente si ya no es necesario
        if not should_require_guardian and current_guardian_id is not None:
            # Obtener info del guardián antes de desasignarlo
            guardian_info = "N/A"
            try:
                guardian = self.db.query(Guardian).options(
                    joinedload(Guardian.person)
                ).filter(Guardian.id == current_guardian_id).first()
                
                if guardian and guardian.person:
                    guardian_info = f"{guardian.person.first_name} {guardian.person.first_surname}"
            except Exception:
                pass  # Si hay error obteniendo info del guardián, continuar con "N/A"
            
            setattr(patient, 'guardian_id', None)
            changes_made = True
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="AUTO_UNASSIGN_GUARDIAN",
                registro_afectado_id=str(patient.id),
                registro_afectado_tipo="patients",
                descripcion_evento=f"Guardián desasignado automáticamente de {patient_name} - Edad: {current_age} años",
                detalles_cambios={
                    "guardian_id": {
                        "antes": current_guardian_id,
                        "despues": None
                    },
                    "guardian_info": guardian_info,
                    "trigger": "automatic_read_verification",
                    "age": current_age,
                    "reason": "Paciente alcanzó mayoría de edad"
                },
                ip_origen=self.user_ip
            )
        
        # Confirmar cambios si se hicieron
        if changes_made:
            try:
                self.db.commit()
                self.db.refresh(patient)
            except Exception as e:
                self.db.rollback()
                # Log del error pero no fallar la operación de lectura
                print(f"Warning: Error al actualizar automáticamente requirements del paciente {patient.id}: {e}")
                
        return changes_made
    
    def _handle_guardian_status_on_patient_change(self, guardian_id: int, patient_new_status: bool, deactivation_reason: str, current_patient_id: int) -> list:
        """
        Maneja automáticamente el estado del guardian cuando cambia el estado de un paciente.
        
        Lógica:
        - Si el paciente se DESACTIVA: verificar si el guardian tiene otros pacientes activos
          - Si NO tiene otros pacientes activos: desactivar guardian automáticamente
          - Si SÍ tiene otros pacientes activos: mantener guardian activo
        - Si el paciente se ACTIVA: activar guardian automáticamente si estaba inactivo
        
        Args:
            guardian_id: ID del guardian a evaluar
            patient_new_status: Nuevo estado del paciente (True=activo, False=inactivo)
            deactivation_reason: Motivo de desactivación (solo si patient_new_status=False)
            
        Returns:
            list: Lista de cambios realizados al guardian para auditoría
        """
        from app.models.guardian_models import Guardian
        
        # Obtener el guardian
        guardian = self.db.query(Guardian).filter(Guardian.id == guardian_id).first()
        if not guardian:
            return []
        
        changes = []
        
        # Obtener todos los pacientes activos asociados a este guardian (excluyendo el actual que está cambiando)
        other_active_patients = self.db.query(Patient).filter(
            and_(
                Patient.guardian_id == guardian_id,
                Patient.is_active == True,
                Patient.id != current_patient_id  # Excluir paciente actual
            )
        ).count()
        
        if not patient_new_status:
            # PACIENTE SE DESACTIVA: verificar si guardian debe desactivarse
            if other_active_patients == 0:
                # No hay otros pacientes activos, desactivar guardian
                if getattr(guardian, 'is_active', True):  # Solo si está activo
                    setattr(guardian, 'is_active', False)
                    
                    # Registrar auditoría del cambio automático del guardian
                    self.auditoria_service.registrar_evento(
                        db=self.db,
                        usuario_id=self.user_id,
                        tipo_evento="AUTO_DEACTIVATE",
                        registro_afectado_id=str(guardian_id),
                        registro_afectado_tipo="guardians",
                        descripcion_evento=f"Guardian desactivado automáticamente - Último paciente asociado fue desactivado",
                        detalles_cambios={
                            "is_active": {"antes": True, "despues": False},
                            "trigger": "patient_deactivation",
                            "trigger_reason": deactivation_reason
                        },
                        ip_origen=self.user_ip
                    )
                    
                    changes.append({
                        "guardian_id": guardian_id,
                        "action": "deactivated",
                        "reason": "No tiene pacientes activos asociados",
                        "trigger_reason": deactivation_reason
                    })
            else:
                # Hay otros pacientes activos, mantener guardian activo
                changes.append({
                    "guardian_id": guardian_id,
                    "action": "kept_active",
                    "reason": f"Tiene {other_active_patients} paciente(s) activo(s) restante(s)"
                })
        
        else:
            # PACIENTE SE ACTIVA: activar guardian si estaba inactivo
            if not getattr(guardian, 'is_active', True):  # Solo si está inactivo
                setattr(guardian, 'is_active', True)
                
                # Registrar auditoría del cambio automático del guardian
                self.auditoria_service.registrar_evento(
                    db=self.db,
                    usuario_id=self.user_id,
                    tipo_evento="AUTO_REACTIVATE",
                    registro_afectado_id=str(guardian_id),
                    registro_afectado_tipo="guardians", 
                    descripcion_evento=f"Guardian reactivado automáticamente - Paciente asociado fue reactivado",
                    detalles_cambios={
                        "is_active": {"antes": False, "despues": True},
                        "trigger": "patient_reactivation"
                    },
                    ip_origen=self.user_ip
                )
                
                changes.append({
                    "guardian_id": guardian_id,
                    "action": "reactivated",
                    "reason": "Paciente asociado fue reactivado"
                })
        
        return changes

def get_patient_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> PatientService:
    """Factory para obtener instancia del servicio"""
    return PatientService(db, user_id, user_ip)
