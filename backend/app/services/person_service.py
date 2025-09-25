from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import date, datetime
from app.models.person_models import Person, DocumentTypeEnum
from app.schemas.person_schema import PersonCreate, PersonUpdate
from app.services.auditoria_service import AuditoriaService


def serialize_for_audit(data):
    """Convierte enums, fechas y otros objetos no serializables a JSON"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if hasattr(value, 'value'):  # Es un Enum
                result[key] = value.value
            elif isinstance(value, (date, datetime)):  # Es una fecha
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_for_audit(value)
            elif isinstance(value, list):
                result[key] = [serialize_for_audit(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    elif isinstance(data, (date, datetime)):
        return data.isoformat()
    elif hasattr(data, 'value'):  # Es un Enum
        return data.value
    return data

class PersonService:
    
    def __init__(self, db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None):
        self.db = db
        self.user_id = user_id or "system"
        self.user_ip = user_ip
        self.auditoria_service = AuditoriaService()
    
    def create_person(self, person_data: PersonCreate, allow_duplicate_email: bool = False, allow_duplicate_phone: bool = False) -> Person:
        """
        Crear una nueva persona
        
        Args:
            person_data: Datos de la persona
            allow_duplicate_email: Permite emails duplicados (útil para tutores legales)
            allow_duplicate_phone: Permite teléfonos duplicados (útil para tutores legales)
        """
        # Verificar que no exista otra persona con el mismo documento
        existing_person = self.get_person_by_document(person_data.document_number)
        if existing_person:
            raise ValueError(f"Ya existe una persona con el documento {person_data.document_number}")
        
        # Verificar email solo si no se permite duplicado
        if person_data.email and not allow_duplicate_email:
            existing_email = self.get_person_by_email(person_data.email)
            if existing_email:
                raise ValueError(f"Ya existe una persona con el email {person_data.email}")
        
        # Verificar teléfono solo si no se permite duplicado
        if person_data.phone and not allow_duplicate_phone:
            existing_phone = self.get_person_by_phone(person_data.phone)
            if existing_phone:
                raise ValueError(f"Ya existe una persona con el teléfono {person_data.phone}")
        
        # VALIDACIÓN CRÍTICA: Verificar coherencia entre tipo de documento y edad
        self.validate_document_type_by_age(person_data.document_type, person_data.birthdate)
        
        try:
            person = Person(**person_data.model_dump())
            self.db.add(person)
            self.db.commit()
            self.db.refresh(person)
            
            # Registrar evento de auditoría
            try:
                # Convertir enums a strings para serialización JSON
                audit_data = serialize_for_audit(person_data.model_dump())
                
                self.auditoria_service.registrar_evento(
                    db=self.db,
                    usuario_id=self.user_id,
                    tipo_evento="CREATE",
                    registro_afectado_id=str(person.id),
                    registro_afectado_tipo="persons",
                    descripcion_evento=f"Nueva persona creada: {person.first_name} {person.first_surname}",
                    detalles_cambios=audit_data,
                    ip_origen=self.user_ip
                )
            except Exception as audit_error:
                print(f"Error en auditoría: {audit_error}")
                # No falla la operación principal si falla la auditoría
            
            return person
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_person_by_id(self, person_id: int) -> Optional[Person]:
        """Obtener persona por ID"""
        return self.db.query(Person).filter(Person.id == person_id).first()
    
    def get_person_by_document(self, document_number: str) -> Optional[Person]:
        """Obtener persona por número de documento"""
        return self.db.query(Person).filter(Person.document_number == document_number).first()
    
    def get_person_by_email(self, email: str) -> Optional[Person]:
        """Obtener persona por email"""
        return self.db.query(Person).filter(Person.email == email).first()
    
    def get_person_by_phone(self, phone: str) -> Optional[Person]:
        """Obtener persona por teléfono"""
        return self.db.query(Person).filter(Person.phone == phone).first()
    
    def get_persons(
        self, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        document_type: Optional[DocumentTypeEnum] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None
    ) -> List[Person]:
        """Obtener lista de personas con filtros"""
        query = self.db.query(Person)
        
        # Filtro por tipo de documento
        if document_type:
            query = query.filter(Person.document_type == document_type)
        
        # Filtros por edad (calculada desde birthdate)
        if min_age is not None or max_age is not None:
            from datetime import date, timedelta
            today = date.today()
            
            if min_age is not None:
                max_birth_date = today - timedelta(days=min_age * 365.25)
                query = query.filter(Person.birthdate <= max_birth_date)
            
            if max_age is not None:
                min_birth_date = today - timedelta(days=(max_age + 1) * 365.25)
                query = query.filter(Person.birthdate >= min_birth_date)
        
        # Filtro de búsqueda por texto
        if search:
            search_filter = or_(
                Person.first_name.ilike(f"%{search}%"),
                Person.first_surname.ilike(f"%{search}%"),
                Person.second_surname.ilike(f"%{search}%"),
                Person.middle_name.ilike(f"%{search}%"),
                Person.document_number.ilike(f"%{search}%"),
                Person.email.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.offset(skip).limit(limit).all()
    
    def update_person(self, person_id: int, person_data: PersonUpdate) -> Optional[Person]:
        """Actualizar persona"""
        person = self.get_person_by_id(person_id)
        if not person:
            return None
        
        # Guardar datos anteriores para auditoría
        datos_anteriores = {
            "document_type": person.document_type.value if person.document_type else None,
            "document_number": person.document_number,
            "first_name": person.first_name,
            "first_surname": person.first_surname,
            "second_surname": person.second_surname,
            "middle_name": person.middle_name,
            "email": person.email,
            "phone": person.phone,
            "birthdate": person.birthdate.isoformat() if person.birthdate else None
        }
        
        try:
            update_data = person_data.model_dump(exclude_unset=True)
            
            # Validar duplicados antes de actualizar
            if 'document_number' in update_data and update_data['document_number'] != person.document_number:
                existing_document = self.get_person_by_document(update_data['document_number'])
                if existing_document and existing_document.id != person_id:
                    raise ValueError(f"Ya existe una persona con el documento {update_data['document_number']}")
            
            if 'email' in update_data and update_data['email'] and update_data['email'] != person.email:
                existing_email = self.get_person_by_email(update_data['email'])
                if existing_email and existing_email.id != person_id:
                    raise ValueError(f"Ya existe una persona con el email {update_data['email']}")
            
            if 'phone' in update_data and update_data['phone'] and update_data['phone'] != person.phone:
                existing_phone = self.get_person_by_phone(update_data['phone'])
                if existing_phone and existing_phone.id != person_id:
                    raise ValueError(f"Ya existe una persona con el teléfono {update_data['phone']}")
            
            # VALIDACIÓN CRÍTICA: Verificar coherencia entre tipo de documento y edad cuando se actualice cualquiera de los dos
            new_document_type = update_data.get('document_type', person.document_type)
            new_birthdate = update_data.get('birthdate', person.birthdate)
            
            # Si se actualiza el tipo de documento o la fecha de nacimiento, validar coherencia
            if 'document_type' in update_data or 'birthdate' in update_data:
                self.validate_document_type_by_age(new_document_type, new_birthdate)
            
            for field, value in update_data.items():
                setattr(person, field, value)
            
            self.db.commit()
            self.db.refresh(person)
            
            # Registrar evento de auditoría
            self.auditoria_service.registrar_evento(
                db=self.db,
                usuario_id=self.user_id,
                tipo_evento="UPDATE",
                registro_afectado_id=str(person.id),
                registro_afectado_tipo="persons",
                descripcion_evento=f"Persona actualizada: {person.first_name} {person.first_surname}",
                detalles_cambios={
                    "antes": datos_anteriores,
                    "despues": serialize_for_audit(update_data)
                },
                ip_origen=self.user_ip
            )
            
            return person
        except Exception as e:
            self.db.rollback()
            raise e
    
    def calculate_age(self, birthdate: date) -> int:
        """Calcular edad en años"""
        today = date.today()
        return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
    
    def validate_document_type_by_age(self, document_type: DocumentTypeEnum, birthdate: date) -> None:

        age = self.calculate_age(birthdate)
        
        if document_type == DocumentTypeEnum.TI and age >= 18:
            raise ValueError(
                f"Una persona de {age} años no puede tener Tarjeta de Identidad (TI). "
                "Las TI son solo para menores de 18 años. Use CC (Cédula de Ciudadanía)."
            )
        
        if document_type == DocumentTypeEnum.CC and age < 18:
            raise ValueError(
                f"Una persona de {age} años no puede tener Cédula de Ciudadanía (CC). "
                "Las CC son solo para mayores de 18 años. Use TI (Tarjeta de Identidad) o RC (Registro Civil)."
            )
        
        if document_type == DocumentTypeEnum.CE and age < 18:
            raise ValueError(
                f"Una persona de {age} años no puede tener Cédula de Extranjería (CE). "
                "Las CE son solo para extranjeros mayores de 18 años. Use PA (Pasaporte) para menores extranjeros."
            )
        
        if document_type == DocumentTypeEnum.RC and age >= 7:
            raise ValueError(
                f"Una persona de {age} años no puede tener Registro Civil (RC). "
                "El RC es solo para menores de 7 años. Use TI para menores de 18 años o CC para mayores de 18 años."
            )

def get_person_service(db: Session, user_id: Optional[str] = None, user_ip: Optional[str] = None) -> PersonService:
    """Factory para obtener instancia del servicio"""
    return PersonService(db, user_id, user_ip)