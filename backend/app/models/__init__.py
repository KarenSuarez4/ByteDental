# Archivo __init__.py para el paquete models

# Importar en orden para evitar dependencias circulares
from app.database import Base
from .user_models import User
from .rol_models import Role
from .person_models import Person, DocumentTypeEnum
from .patient_models import Patient
from .guardian_models import Guardian, PatientRelationshipEnum
from .otp_models import OTPRequest
from .email_models import EmailRequest, EmailResponse, EmailType
from .auditoria_models import Audit

__all__ = [
    "Base",
    "Person",
    "DocumentTypeEnum", 
    "Patient",
    "Guardian", 
    "PatientRelationshipEnum",
    "User",
    "Role", 
    "OTPRequest",
    "EmailRequest",
    "EmailResponse", 
    "EmailType",
    "Audit"
]
