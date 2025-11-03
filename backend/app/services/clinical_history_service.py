import hashlib
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.models.clinical_history_models import ClinicalHistory
from app.models.patient_models import Patient
from app.models.person_models import Person
from app.models.guardian_models import Guardian
from app.models.treatment_models import Treatment
from app.models.user_models import User
from app.models.dental_service_models import DentalService
from app.schemas.clinical_history_schema import ClinicalHistoryCreate
from fastapi import HTTPException, Request, status
from app.services.auditoria_service import AuditoriaService
from app.services.firebase_service import FirebaseService  

def get_client_ip(request: Request) -> str:
    """Obtener la IP del cliente"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def hash_doctor_signature(signature: str) -> str:
    """
    Genera un hash SHA-256 de la firma del doctor para mayor seguridad
    """
    if not signature:
        return None
    
    # Usar SHA-256 para hashear la firma
    signature_hash = hashlib.sha256(signature.encode('utf-8')).hexdigest()
    return signature_hash

class ClinicalHistoryService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user

    def create_clinical_history(self, data: ClinicalHistoryCreate, request: Request) -> dict:
        patient = self.db.query(Patient).filter(Patient.id == data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        existing_history = self.db.query(ClinicalHistory).filter(
            ClinicalHistory.patient_id == data.patient_id
        ).first()

        if existing_history:
            raise HTTPException(
                status_code=400,
                detail="El paciente ya tiene una historia clínica registrada."
            )

        # ✅ VALIDAR CONTRASEÑA DEL DOCTOR (Firma Digital)
        if not self.current_user or not self.current_user.email:
            raise HTTPException(
                status_code=401,
                detail="No se pudo identificar al usuario actual"
            )
        
        # Verificar contraseña con Firebase
        is_password_valid = FirebaseService.verify_password(
            email=self.current_user.email,
            password=data.doctor_password
        )
        
        if not is_password_valid:
            raise HTTPException(
                status_code=403,
                detail="Contraseña incorrecta. La firma digital no pudo ser verificada."
            )

        try:
            # Hash de la contraseña como firma digital
            hashed_signature = hash_doctor_signature(data.doctor_password)
            
            clinical_history = ClinicalHistory(
                patient_id=data.patient_id,
                reason=data.reason,
                symptoms=data.symptoms,
                medical_history=str(data.medical_history),
                findings=data.findings,
                doctor_signature=hashed_signature,  # Usar la firma hasheada
                is_active=patient.is_active,  # Heredar el estado del paciente
            )
            self.db.add(clinical_history)
            self.db.commit()
            self.db.refresh(clinical_history)

            if not clinical_history.updated_at:
                clinical_history.updated_at = clinical_history.created_at
                self.db.commit()
                self.db.refresh(clinical_history)

            treatments_response = self.create_treatments(clinical_history.id, data.treatments, self.current_user.uid)

            ip_cliente = get_client_ip(request)

            if self.current_user:
                AuditoriaService.registrar_creacion_historia_clinica(
                    db=self.db,
                    usuario_id=str(self.current_user.uid),
                    clinical_history_id=clinical_history.id,
                    ip_origen=ip_cliente
                )
            
            history_response = {
                "id": clinical_history.id,
                "patient_id": clinical_history.patient_id,
                "reason": clinical_history.reason,
                "symptoms": clinical_history.symptoms,
                "medical_history": eval(clinical_history.medical_history) if isinstance(clinical_history.medical_history, str) else clinical_history.medical_history,
                "findings": clinical_history.findings,
                "doctor_signature": clinical_history.doctor_signature,  
                "created_at": clinical_history.created_at,
                "updated_at": clinical_history.updated_at,
                "treatments": treatments_response
            }

            return {
                "message": "La historia clínica ha sido registrada exitosamente.",
                "clinical_history": history_response,
                "clinical_history_id": clinical_history.id  
            }

        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error al guardar la historia clínica: {str(e)}"
            )
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error inesperado: {str(e)}"
            )

    def create_treatments(self, clinical_history_id: int, treatments_data: list, doctor_id: str):
        treatments_response = []
        
        for treatment_data in treatments_data:
            if not treatment_data.dental_service_id or not treatment_data.treatment_date or not treatment_data.reason:
                raise HTTPException(
                    status_code=400,
                    detail="Datos de tratamiento incompletos. Se requiere servicio dental, fecha y motivo de consulta."
                )

            # Obtener el servicio dental
            dental_service = self.db.query(DentalService).filter(
                DentalService.id == treatment_data.dental_service_id
            ).first()

            if not dental_service:
                raise HTTPException(
                    status_code=404,
                    detail=f"Servicio dental con ID {treatment_data.dental_service_id} no encontrado"
                )

            treatment = Treatment(
                clinical_history_id=clinical_history_id,
                dental_service_id=treatment_data.dental_service_id,
                doctor_id=doctor_id,
                treatment_date=treatment_data.treatment_date,
                reason=treatment_data.reason,  # Agregar motivo de consulta
                notes=treatment_data.notes
            )
            self.db.add(treatment)
            
            # Preparar respuesta
            treatments_response.append({
                "date": treatment_data.treatment_date,
                "name": dental_service.name,
                "doctor_name": f"{self.current_user.first_name} {self.current_user.last_name}",
                "reason": treatment_data.reason,  # Incluir en la respuesta
                "notes": treatment_data.notes
            })

        self.db.commit()
        return treatments_response

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
                        "reason": treatment.reason,  # Agregar motivo de consulta
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
                "name": service_name,
                "doctor_name": doctor_name,
                "reason": treatment.reason,  # Agregar motivo de consulta
                "notes": treatment.notes
            })

            previous_treatments.append({
                "date": treatment.treatment_date,
                "service_name": service_name,
                "doctor_name": doctor_name
            })

        return previous_treatments

    def get_clinical_history_by_id(self, history_id: int, request: Request = None) -> dict:
        """
        Obtener una historia clínica por su ID con toda la información relacionada
        """
        try:
            # Buscar la historia clínica con joins para obtener toda la información
            clinical_history = self.db.query(ClinicalHistory)\
                .join(Patient, ClinicalHistory.patient_id == Patient.id)\
                .join(Person, Patient.person_id == Person.id)\
                .filter(ClinicalHistory.id == history_id)\
                .first()

            if not clinical_history:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Historia clínica no encontrada"
                )

            # ✅ Obtener el paciente con información completa incluyendo guardian
            patient = self.db.query(Patient)\
                .options(
                    joinedload(Patient.person),
                    joinedload(Patient.guardian).joinedload(Guardian.person)
                )\
                .filter(Patient.id == clinical_history.patient_id)\
                .first()

            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Paciente no encontrado"
                )

            # Obtener los tratamientos asociados
            treatments = self.db.query(Treatment)\
                .outerjoin(DentalService, Treatment.dental_service_id == DentalService.id)\
                .filter(Treatment.clinical_history_id == history_id)\
                .all()

            # Obtener información del doctor para cada tratamiento
            treatment_list = []
            for treatment in treatments:
                doctor = self.db.query(User).filter(User.uid == treatment.doctor_id).first()
                doctor_name = f"{doctor.first_name} {doctor.last_name}" if doctor else "Doctor no especificado"
                
                treatment_list.append({
                    "id": treatment.id,
                    "date": treatment.treatment_date,
                    "treatment_date": treatment.treatment_date,
                    "name": treatment.dental_service.name if treatment.dental_service else "Servicio no especificado",
                    "doctor_name": doctor_name,
                    "reason": treatment.reason,  # Agregar motivo de consulta
                    "notes": treatment.notes,
                    "dental_service": {
                        "id": treatment.dental_service.id if treatment.dental_service else None,
                        "name": treatment.dental_service.name if treatment.dental_service else None
                    }
                })

            # Parsear medical_history si es un string JSON
            medical_history_data = clinical_history.medical_history
            if isinstance(medical_history_data, str):
                try:
                    import json
                    medical_history_data = json.loads(medical_history_data.replace("'", '"'))
                except Exception as e:
                    medical_history_data = {}
            elif medical_history_data is None:
                medical_history_data = {}

            # MAPEO CORRECTO - Mantener los nombres originales y estructura
            def safe_get_field(data, possible_keys, default="No especificado"):
                """Helper function to get values with multiple possible keys"""
                if not isinstance(data, dict):
                    return default
                
                for key in possible_keys:
                    if key in data:
                        value = data[key]
                        
                        # Manejar arrays correctamente
                        if isinstance(value, list):
                            if len(value) == 0:
                                return default
                            # Filtrar valores vacíos y mapear a texto legible
                            filtered_values = []
                            for item in value:
                                clean_item = str(item).lower().strip()
                                if clean_item not in ['ninguno', 'ninguna', '', 'none', 'null']:
                                    # Mapear a texto legible
                                    readable_item = get_readable_medical_term(clean_item, key)
                                    filtered_values.append(readable_item)
                        
                            if not filtered_values:
                                return default
                            return ', '.join(filtered_values)
                        
                        # Manejar strings
                        if isinstance(value, str):
                            value_clean = value.lower().strip()
                            if value_clean in ['ninguno', 'ninguna', '', 'none', 'null']:
                                return default
                            return get_readable_medical_term(value_clean, key)
                        
                        # Manejar booleanos
                        if isinstance(value, bool):
                            return value
                            
                        return str(value)
                return default

            def get_readable_medical_term(value, field_type):
                """Convert medical term codes to readable Spanish text"""
                medical_terms = {
                    'general_pathologies': {
                        'ninguno': 'Sin antecedentes médicos',
                        'hipertension': 'Hipertensión arterial',
                        'diabetes': 'Diabetes',
                        'cardiopatia': 'Cardiopatías',
                        'hepatitis': 'Hepatitis',
                        'cancer': 'Cáncer',
                        'enfermedades_respiratorias': 'Enfermedades respiratorias',
                        'enfermedades_renales': 'Enfermedades renales',
                        'trastornos_neurologicos': 'Trastornos neurológicos',
                        'osteoporosis': 'Osteoporosis',
                        'hipotension': 'Hipotensión',
                        'otros': 'Otros'
                    },
                    'anesthesia_tolerance': {
                        'excelente': 'Excelente - Sin reacciones adversas',
                        'buena': 'Buena - Tolerancia normal',
                        'regular': 'Regular - Algunas molestias',
                        'mala': 'Mala - Reacciones adversas',
                        'alergica': 'Alérgica - Contraindicación',
                        'no_evaluada': 'No evaluada'
                    },
                    'breathing_condition': {
                        'normal': 'Normal - Sin dificultad',
                        'disnea_leve': 'Disnea Leve',
                        'disnea_moderada': 'Disnea Moderada',
                        'disnea_severa': 'Disnea Severa',
                        'asma_controlada': 'Asma Controlada',
                        'asma_no_controlada': 'Asma No Controlada',
                        'no_evaluada': 'No evaluada'
                    },
                    'coagulation_condition': {
                        'normal': 'Normal - Sin alteraciones',
                        'anticoagulado': 'Anticoagulado',
                        'trastorno_coagulacion': 'Trastorno de coagulación',
                        'no_evaluado': 'No evaluado'
                    },
                    'current_medication': {
                        'ninguna': 'Sin medicación actual',
                        'antihipertensivos': 'Antihipertensivos',
                        'antidiabeticos': 'Antidiabéticos',
                        'anticoagulantes': 'Anticoagulantes',
                        'antiinflamatorios': 'Antiinflamatorios',
                        'antibioticos': 'Antibióticos',
                        'analgesicos': 'Analgésicos',
                        'otros': 'Otros medicamentos'
                    },
                    'previous_treatments': {
                        'ninguno': 'Sin tratamientos previos',
                        'limpiezas': 'Limpiezas dentales',
                        'obturaciones': 'Obturaciones/Resinas',
                        'extracciones': 'Extracciones dentales',
                        'endodoncias': 'Endodoncias',
                        'coronas': 'Coronas o prótesis',
                        'implantes': 'Implantes dentales',
                        'ortodoncia': 'Ortodoncia'
                    },
                    'allergies': {
                        'ninguna': 'Sin alergias conocidas',
                        'penicilina': 'Penicilina',
                        'latex': 'Látex',
                        'ibuprofeno': 'Ibuprofeno/AINEs',
                        'anestesia_local': 'Anestesia local',
                        'metales': 'Metales (níquel, cromo)',
                        'otras': 'Otras alergias'
                    }
                }
                
                # Buscar el término en el diccionario correspondiente
                if field_type in medical_terms and value in medical_terms[field_type]:
                    return medical_terms[field_type][value]
                
                # Si no se encuentra, devolver el valor original capitalizado
                return value.replace('_', ' ').title()

            # MAPEAR CORRECTAMENTE todos los campos del medical_history
            mapped_medical_history = {
                # Usar los nombres de campo originales
                "general_pathologies": safe_get_field(medical_history_data, 
                    ['general_pathologies', 'previous_conditions'], 
                    "Sin antecedentes médicos"),
                    
                "allergies": safe_get_field(medical_history_data, 
                    ['allergies', 'alergias'], 
                    "Sin alergias conocidas"),
                    
                "current_medication": safe_get_field(medical_history_data, 
                    ['current_medication', 'medications', 'medicamentos_actuales'], 
                    "Sin medicación actual"),
                    
                "anesthesia_tolerance": safe_get_field(medical_history_data, 
                    ['anesthesia_tolerance', 'tolerance_to_anesthesia'], 
                    "Excelente - Sin reacciones adversas"),
                    
                # AGREGAR campos que faltaban
                "breathing_condition": safe_get_field(medical_history_data, 
                    ['breathing_condition', 'condicion_respiratoria'], 
                    "Normal - Sin dificultad"),
                    
                "coagulation_condition": safe_get_field(medical_history_data, 
                    ['coagulation_condition', 'condicion_coagulacion'], 
                    "Normal - Sin alteraciones"),
                    
                "previous_treatments": safe_get_field(medical_history_data, 
                    ['previous_treatments', 'tratamientos_previos'], 
                    "Sin tratamientos previos")
            }

            if not hasattr(patient, 'person') or not patient.person:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Información de persona no encontrada para el paciente"
                )

            # ✅ Construir información del guardian si existe
            guardian_data = None
            if patient.guardian and patient.guardian.person:
                guardian_data = {
                    "id": patient.guardian.id,
                    "relationship_type": patient.guardian.relationship_type.value if hasattr(patient.guardian.relationship_type, 'value') else str(patient.guardian.relationship_type),
                    "person": {
                        "id": patient.guardian.person.id,
                        "first_name": patient.guardian.person.first_name,
                        "first_surname": patient.guardian.person.first_surname,
                        "second_surname": patient.guardian.person.second_surname,
                        "document_type": patient.guardian.person.document_type,
                        "document_number": patient.guardian.person.document_number,
                        "birthdate": patient.guardian.person.birthdate,
                        "phone": patient.guardian.person.phone,
                        "email": patient.guardian.person.email
                    }
                }

            # Construir la respuesta
            response_data = {
                "id": clinical_history.id,
                "patient_id": clinical_history.patient_id,
                "reason": clinical_history.reason,
                "symptoms": clinical_history.symptoms,
                "findings": clinical_history.findings,
                "doctor_signature": clinical_history.doctor_signature,
                "created_at": clinical_history.created_at,
                "medical_history": mapped_medical_history,  # Usar el mapeo corregido
                "patient": {
                    "id": patient.id,
                    "first_name": patient.person.first_name,
                    "first_surname": patient.person.first_surname,
                    "second_surname": patient.person.second_surname,
                    "document_type": patient.person.document_type,
                    "document_number": patient.person.document_number,
                    "birthdate": patient.person.birthdate,
                    "phone": patient.person.phone,
                    "email": patient.person.email,
                    "blood_group": getattr(patient, 'blood_group', None),
                    "has_disability": patient.has_disability,
                    "is_active": getattr(patient, 'is_active', True),
                    "occupation": getattr(patient, 'occupation', None),
                    "created_at": patient.created_at if hasattr(patient, 'created_at') else None,
                    "person": {
                        "first_name": patient.person.first_name,
                        "first_surname": patient.person.first_surname,
                        "second_surname": patient.person.second_surname,
                        "document_type": patient.person.document_type,
                        "document_number": patient.person.document_number,
                        "birthdate": patient.person.birthdate,
                        "phone": patient.person.phone,
                        "email": patient.person.email
                    },
                    "guardian": guardian_data  # Guardian ya estaba bien
                },
                "treatments": treatment_list,
                "is_active": clinical_history.is_active,
                "closure_reason": clinical_history.closure_reason,
                "closed_at": clinical_history.closed_at,
            }

            # Registrar auditoría
            if self.current_user:
                ip_cliente = get_client_ip(request) if request else None
                
                AuditoriaService.registrar_evento(
                    db=self.db,
                    usuario_id=str(self.current_user.uid),
                    tipo_evento="READ",
                    registro_afectado_id=str(history_id),
                    registro_afectado_tipo="clinical_histories",
                    descripcion_evento=f"Consulta de historia clínica ID: {history_id}",
                    detalles_cambios={
                        "accion": "consultar_historia_clinica",
                        "patient_id": clinical_history.patient_id,
                        "patient_name": f"{patient.person.first_name} {patient.person.first_surname}",
                        "has_guardian": guardian_data is not None
                    },
                    ip_origen=ip_cliente,
                    usuario_rol=self.current_user.role.name if self.current_user.role else None,
                    usuario_email=self.current_user.email
                )

            return response_data

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno del servidor: {str(e)}"
            )
    
    def add_treatment_to_history(self, history_id: int, treatment_data: dict, request: Request) -> dict:
        """
        Agregar un nuevo tratamiento a una historia clínica existente
        """
        try:
            # ✅ VALIDAR CONTRASEÑA DEL DOCTOR (Firma Digital)
            doctor_password = treatment_data.get('doctor_password')
            
            if not doctor_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La contraseña del doctor es requerida para firmar el tratamiento"
                )
            
            if not self.current_user or not self.current_user.email:
                raise HTTPException(
                    status_code=401,
                    detail="No se pudo identificar al usuario actual"
                )
            
            # Verificar contraseña con Firebase
            is_password_valid = FirebaseService.verify_password(
                email=self.current_user.email,
                password=doctor_password
            )
            
            if not is_password_valid:
                raise HTTPException(
                    status_code=403,
                    detail="Contraseña incorrecta. La firma digital no pudo ser verificada."
                )
            
            # Verificar que la historia clínica existe
            clinical_history = self.db.query(ClinicalHistory).filter(
                ClinicalHistory.id == history_id
            ).first()
            
            if not clinical_history:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Historia clínica no encontrada"
                )
            
            # Verificar que el servicio dental existe
            dental_service = self.db.query(DentalService).filter(
                DentalService.id == treatment_data.get('dental_service_id')
            ).first()
            
            if not dental_service:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio dental no encontrado"
                )
            
            # Crear el nuevo tratamiento
            new_treatment = Treatment(
                clinical_history_id=history_id,
                dental_service_id=treatment_data.get('dental_service_id'),
                doctor_id=self.current_user.uid,
                treatment_date=treatment_data.get('treatment_date'),
                reason=treatment_data.get('reason'),  # Agregar motivo de consulta
                notes=treatment_data.get('notes')
            )
            
            self.db.add(new_treatment)
            self.db.commit()
            self.db.refresh(new_treatment)
            
            # Actualizar el motivo de consulta de la historia clínica
            clinical_history.reason = treatment_data.get('reason')
            self.db.commit()
            self.db.refresh(clinical_history)
            
            # Obtener IP del cliente
            ip_cliente = get_client_ip(request)
            
            # Registrar en auditoría
            if self.current_user:
                AuditoriaService.registrar_evento(
                    db=self.db,
                    usuario_id=str(self.current_user.uid),
                    tipo_evento="UPDATE",
                    registro_afectado_id=str(history_id),
                    registro_afectado_tipo="clinical_histories",
                    descripcion_evento=f"Tratamiento agregado a historia clínica ID {history_id}: {dental_service.name}",
                    detalles_cambios={
                        "accion": "agregar_tratamiento",
                        "clinical_history_id": history_id,
                        "treatment_id": new_treatment.id,
                        "dental_service_name": dental_service.name,
                        "treatment_date": str(treatment_data.get('treatment_date')),
                        "reason": treatment_data.get('reason'),  # Incluir motivo en auditoría
                        "notes": treatment_data.get('notes'),
                        "digital_signature_verified": True  # Indicar que se verificó la firma
                    },
                    ip_origen=ip_cliente,
                    usuario_rol=self.current_user.role.name if self.current_user.role else None,
                    usuario_email=self.current_user.email
                )
            
            return {
                "message": "Tratamiento agregado exitosamente",
                "treatment": {
                    "id": new_treatment.id,
                    "date": new_treatment.treatment_date,
                    "name": dental_service.name,
                    "doctor_name": f"{self.current_user.first_name} {self.current_user.last_name}",
                    "reason": new_treatment.reason,  # Incluir en la respuesta
                    "notes": new_treatment.notes
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al agregar tratamiento: {str(e)}"
            )
    
    def change_clinical_history_status(
        self, 
        history_id: int, 
        new_status: bool, 
        closure_reason: Optional[str],
        request: Request
    ) -> dict:
        """
        Cambiar estado de historia clínica (cerrar/reabrir) con validación y auditoría
        
        Args:
            history_id: ID de la historia clínica
            new_status: True para activa, False para cerrada
            closure_reason: Motivo de cierre (requerido si new_status=False)
            request: Request para obtener IP del cliente
        
        Returns:
            dict con información del cambio realizado
        
        Raises:
            HTTPException: Si las validaciones fallan
        """
        try:
            # Verificar que la historia clínica existe
            clinical_history = self.db.query(ClinicalHistory).filter(
                ClinicalHistory.id == history_id
            ).first()
            
            if not clinical_history:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Historia clínica no encontrada"
                )
            
            # Obtener información del paciente
            patient = self.db.query(Patient).filter(
                Patient.id == clinical_history.patient_id
            ).first()
            
            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Paciente no encontrado"
                )
            
            # Guardar estado anterior para auditoría
            previous_status = clinical_history.is_active
            previous_closure_reason = clinical_history.closure_reason
            patient_name = f"{patient.person.first_name} {patient.person.first_surname}"
            
            # Validar transición de estado
            if previous_status == new_status:
                status_text = "activa" if new_status else "cerrada"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La historia clínica ya está {status_text}"
                )
            
            # Validar motivo para cierre
            if not new_status and not closure_reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El motivo de cierre es requerido para cerrar una historia clínica"
                )
            
            if new_status and closure_reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se debe proporcionar motivo al reabrir una historia clínica"
                )
            
            # Actualizar estado y motivo de cierre
            clinical_history.is_active = new_status
            
            if new_status:
                # Si se está reabriendo, limpiar el motivo y fecha de cierre
                clinical_history.closure_reason = None
                clinical_history.closed_at = None
            else:
                # Si se está cerrando, guardar el motivo y fecha de cierre
                from datetime import datetime
                clinical_history.closure_reason = closure_reason
                clinical_history.closed_at = datetime.now()
            
            self.db.commit()
            self.db.refresh(clinical_history)
            
            # Obtener IP del cliente
            ip_cliente = get_client_ip(request)
            
            # Preparar detalles para auditoría
            change_details = {
                "is_active": {
                    "antes": previous_status,
                    "despues": new_status
                },
                "closure_reason": {
                    "antes": previous_closure_reason,
                    "despues": closure_reason if not new_status else None
                },
                "closed_at": {
                    "antes": None,
                    "despues": str(clinical_history.closed_at) if clinical_history.closed_at else None
                }
            }
            
            # Preparar descripción del evento
            if new_status:
                event_description = f"Historia clínica reabierta - Paciente: {patient_name}"
                event_type = "REACTIVATE"
            else:
                event_description = f"Historia clínica cerrada - Paciente: {patient_name} - Motivo: {closure_reason}"
                event_type = "DEACTIVATE"
            
            # Registrar evento de auditoría
            if self.current_user:
                AuditoriaService.registrar_evento(
                    db=self.db,
                    usuario_id=str(self.current_user.uid),
                    tipo_evento=event_type,
                    registro_afectado_id=str(history_id),
                    registro_afectado_tipo="clinical_histories",
                    descripcion_evento=event_description,
                    detalles_cambios=change_details,
                    ip_origen=ip_cliente,
                    usuario_rol=self.current_user.role.name if self.current_user.role else None,
                    usuario_email=self.current_user.email
                )
            
            return {
                "clinical_history_id": history_id,
                "patient_id": clinical_history.patient_id,
                "patient_name": patient_name,
                "previous_status": "activa" if previous_status else "cerrada",
                "new_status": "activa" if new_status else "cerrada",
                "closure_reason": closure_reason if not new_status else None,
                "closed_at": clinical_history.closed_at,
                "message": f"Historia clínica {'reabierta' if new_status else 'cerrada'} correctamente"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al cambiar estado de historia clínica: {str(e)}"
            )
    
    def auto_close_inactive_histories(self, request: Request) -> dict:
        """
        Cierra automáticamente las historias clínicas que no tienen tratamientos
        registrados en los últimos 5 años.
        
        Este método:
        1. Identifica historias activas sin tratamientos en > 5 años
        2. Las deshabilita automáticamente
        3. Registra el motivo y fecha de cierre
        4. Genera auditoría para cada cierre
        
        Args:
            request: Request de FastAPI para obtener IP
            
        Returns:
            dict: Información sobre las historias cerradas
            
        Raises:
            HTTPException: Si hay error en el proceso
        """
        try:
            from datetime import datetime, timedelta
            from sqlalchemy import and_, not_, exists
            from app.models.treatment_models import Treatment
            
            # Calcular fecha límite (5 años atrás desde hoy)
            five_years_ago = datetime.now() - timedelta(days=5*365)
            
            # Buscar historias activas que:
            # 1. Están activas (is_active = True)
            # 2. NO tienen tratamientos posteriores a la fecha límite
            # 3. O no tienen ningún tratamiento
            
            # Subconsulta: IDs de historias que SÍ tienen tratamientos recientes
            recent_treatments_subquery = (
                self.db.query(Treatment.clinical_history_id)
                .filter(Treatment.treatment_date >= five_years_ago)
                .subquery()
            )
            
            # Query principal: historias activas SIN tratamientos recientes
            inactive_histories = (
                self.db.query(ClinicalHistory)
                .filter(
                    and_(
                        ClinicalHistory.is_active == True,
                        ClinicalHistory.id.notin_(
                            self.db.query(recent_treatments_subquery.c.clinical_history_id)
                        )
                    )
                )
                .all()
            )
            
            closed_histories = []
            
            # Cerrar cada historia inactiva
            for history in inactive_histories:
                try:
                    # Obtener último tratamiento (si existe) para el mensaje
                    last_treatment = (
                        self.db.query(Treatment)
                        .filter(Treatment.clinical_history_id == history.id)
                        .order_by(Treatment.treatment_date.desc())
                        .first()
                    )
                    
                    # Datos del estado anterior
                    old_is_active = history.is_active
                    old_closure_reason = history.closure_reason
                    old_closed_at = history.closed_at
                    
                    # Actualizar estado de la historia
                    history.is_active = False
                    history.closed_at = datetime.now()
                    
                    if last_treatment:
                        days_inactive = (datetime.now() - last_treatment.treatment_date).days
                        history.closure_reason = (
                            f"Cierre automático por inactividad de {days_inactive} días "
                            f"(último tratamiento: {last_treatment.treatment_date.strftime('%Y-%m-%d')})"
                        )
                    else:
                        history.closure_reason = (
                            "Cierre automático por inactividad - sin tratamientos registrados"
                        )
                    
                    # Obtener información del paciente
                    patient = self.db.query(Patient).filter(Patient.id == history.patient_id).first()
                    
                    # Registrar en auditoría
                    self.auditoria_service.registrar_evento(
                        tipo_evento="DEACTIVATE",
                        descripcion=f"Cierre automático de historia clínica por inactividad superior a 5 años",
                        registro_afectado_tipo="clinical_histories",
                        registro_afectado_id=history.id,
                        detalles_cambios={
                            "is_active": {"old": old_is_active, "new": False},
                            "closure_reason": {"old": old_closure_reason, "new": history.closure_reason},
                            "closed_at": {"old": old_closed_at, "new": history.closed_at.isoformat()},
                            "patient_id": patient.id if patient else None,
                            "patient_name": f"{patient.person.first_name} {patient.person.last_name}" if patient and patient.person else None,
                            "last_treatment_date": last_treatment.treatment_date.isoformat() if last_treatment else None,
                            "auto_closed": True
                        },
                        usuario=self.current_user,
                        request=request
                    )
                    
                    # Agregar a la lista de cerradas
                    closed_histories.append({
                        "history_id": history.id,
                        "patient_id": history.patient_id,
                        "patient_name": f"{patient.person.first_name} {patient.person.last_name}" if patient and patient.person else "N/A",
                        "closure_reason": history.closure_reason,
                        "closed_at": history.closed_at.isoformat(),
                        "last_treatment_date": last_treatment.treatment_date.isoformat() if last_treatment else None
                    })
                    
                except Exception as e:
                    # Si falla una historia individual, continuar con las demás
                    print(f"Error al cerrar historia {history.id}: {str(e)}")
                    continue
            
            # Commit de todos los cambios
            self.db.commit()
            
            return {
                "success": True,
                "total_closed": len(closed_histories),
                "closed_histories": closed_histories,
                "execution_date": datetime.now().isoformat(),
                "criteria": "Sin tratamientos en los últimos 5 años",
                "message": f"Se cerraron automáticamente {len(closed_histories)} historia(s) clínica(s) por inactividad"
            }
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en el proceso de cierre automático: {str(e)}"
            )
